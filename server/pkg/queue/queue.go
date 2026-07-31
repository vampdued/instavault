package queue

import (
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"instavault-server/pkg/domain"
	"instavault-server/pkg/downloader"
	"instavault-server/pkg/events"
	"instavault-server/pkg/storage"
)

type DownloadTask struct {
	Request domain.DownloadRequest
	Force   bool
}

type QueueManager struct {
	repo       *storage.Repository
	downloader *downloader.Downloader
	eventBus   *events.EventBus

	taskChan  chan DownloadTask
	workers   int
	wg        sync.WaitGroup
	mu        sync.Mutex
	activeMap map[string]bool

	// Settings snapshot
	baseDir         string
	folderStructure string

	// Live logs
	activeSyncState   domain.ActiveSyncState
	activeSyncStateMu sync.Mutex
}

func NewQueueManager(workers int, repo *storage.Repository, eventBus *events.EventBus, baseDir, folderStructure string) *QueueManager {
	if workers <= 0 {
		workers = 4
	}
	qm := &QueueManager{
		repo:            repo,
		downloader:      downloader.NewDownloader(),
		eventBus:        eventBus,
		taskChan:        make(chan DownloadTask, 500),
		workers:         workers,
		activeMap:       make(map[string]bool),
		baseDir:         baseDir,
		folderStructure: folderStructure,
	}

	qm.Start()
	return qm
}

func (qm *QueueManager) UpdateSettings(baseDir, folderStructure string) {
	qm.mu.Lock()
	defer qm.mu.Unlock()
	qm.baseDir = baseDir
	qm.folderStructure = folderStructure
}

func (qm *QueueManager) Start() {
	for i := 0; i < qm.workers; i++ {
		qm.wg.Add(1)
		go qm.workerLoop(i)
	}
}

func (qm *QueueManager) Stop() {
	close(qm.taskChan)
	qm.wg.Wait()
}

func (qm *QueueManager) Enqueue(req domain.DownloadRequest, force bool) {
	task := DownloadTask{Request: req, Force: force}
	select {
	case qm.taskChan <- task:
	default:
		log.Printf("[QUEUE WARN] Task channel full, dropping request: %s", req.Shortcode)
	}
}

func (qm *QueueManager) updateLiveLog(username, shortcode, filename, status string, size int64, errStr string) {
	qm.activeSyncStateMu.Lock()
	defer qm.activeSyncStateMu.Unlock()

	qm.activeSyncState.LastActive = time.Now()
	qm.activeSyncState.Username = username
	qm.activeSyncState.IsActive = true

	found := false
	for i := range qm.activeSyncState.LiveLogs {
		if qm.activeSyncState.LiveLogs[i].Filename == filename {
			qm.activeSyncState.LiveLogs[i].Status = status
			if size > 0 {
				qm.activeSyncState.LiveLogs[i].Size = size
			}
			if errStr != "" {
				qm.activeSyncState.LiveLogs[i].Error = errStr
			}
			qm.activeSyncState.LiveLogs[i].Timestamp = time.Now()
			found = true
			break
		}
	}

	if !found {
		entry := domain.LiveLogEntry{
			Timestamp: time.Now(),
			Username:  username,
			Filename:  filename,
			Shortcode: shortcode,
			Status:    status,
			Size:      size,
			Error:     errStr,
		}
		qm.activeSyncState.LiveLogs = append(qm.activeSyncState.LiveLogs, entry)
		if len(qm.activeSyncState.LiveLogs) > 15 {
			qm.activeSyncState.LiveLogs = qm.activeSyncState.LiveLogs[len(qm.activeSyncState.LiveLogs)-15:]
		}
	}

	if qm.eventBus != nil {
		qm.eventBus.Publish(events.Event{
			Type:    events.EventLogUpdate,
			Payload: qm.activeSyncState,
		})
	}
}

func (qm *QueueManager) GetActiveSyncState() domain.ActiveSyncState {
	qm.activeSyncStateMu.Lock()
	defer qm.activeSyncStateMu.Unlock()

	if qm.activeSyncState.IsActive {
		if time.Since(qm.activeSyncState.LastActive) > 8*time.Second {
			qm.activeSyncState.IsActive = false
		}
	}
	return qm.activeSyncState
}

func (qm *QueueManager) ProcessSynchronous(req domain.DownloadRequest, force bool) domain.DownloadResult {
	return qm.processItem(req, force)
}

func (qm *QueueManager) workerLoop(workerID int) {
	defer qm.wg.Done()
	for task := range qm.taskChan {
		qm.processItem(task.Request, task.Force)
	}
}

func (qm *QueueManager) processItem(req domain.DownloadRequest, force bool) domain.DownloadResult {
	filename := req.Filename
	if filename == "" {
		filename = req.Shortcode
		if req.MediaIndex > 0 {
			filename = fmt.Sprintf("%s_%d", req.Shortcode, req.MediaIndex)
		}
		ext := req.FileExt
		if ext == "" {
			ext = "jpg"
		}
		filename = filename + "." + ext
	}

	qm.mu.Lock()
	baseDir := qm.baseDir
	folderStruct := qm.folderStructure
	qm.mu.Unlock()

	qm.updateLiveLog(req.Username, req.Shortcode, filename, "downloading", 0, "")

	if qm.eventBus != nil {
		qm.eventBus.Publish(events.Event{
			Type: events.EventDownloadStarted,
			Payload: map[string]any{
				"shortcode": req.Shortcode,
				"username":  req.Username,
				"filename":  filename,
			},
		})
	}

	userDir, localPath := downloader.GetTargetPath(baseDir, folderStruct, req.Username, filename, req.FileExt)
	_ = os.MkdirAll(userDir, 0755)

	if force {
		_ = qm.repo.DeleteDownloadByShortcodeAndFilename(req.Shortcode, filename)
	} else {
		if already, existingPath := qm.repo.IsAlreadyDownloaded(req.Shortcode, filename); already {
			_ = qm.repo.RecordSkip(req.Shortcode, req.Username, filename, existingPath)
			qm.updateLiveLog(req.Username, req.Shortcode, filename, "skipped", 0, "")

			res := domain.DownloadResult{
				Status:    "skipped",
				Shortcode: req.Shortcode,
				Filename:  filename,
				LocalPath: existingPath,
				Message:   "already downloaded",
			}
			if qm.eventBus != nil {
				qm.eventBus.Publish(events.Event{
					Type:    events.EventDownloadSkipped,
					Payload: res,
				})
			}
			return res
		}
	}

	// Download file
	lastProgressTime := time.Now()
	size, err := qm.downloader.DownloadFile(req.URL, localPath, func(bytesDownloaded, totalBytes int64) {
		if time.Since(lastProgressTime) > 250*time.Millisecond && qm.eventBus != nil {
			lastProgressTime = time.Now()
			percent := float64(0)
			if totalBytes > 0 {
				percent = (float64(bytesDownloaded) / float64(totalBytes)) * 100.0
			}
			qm.eventBus.Publish(events.Event{
				Type: events.EventDownloadProgress,
				Payload: map[string]any{
					"shortcode":       req.Shortcode,
					"filename":        filename,
					"bytesDownloaded": bytesDownloaded,
					"totalBytes":      totalBytes,
					"progressPercent": percent,
				},
			})
		}
	})

	if err != nil {
		qm.updateLiveLog(req.Username, req.Shortcode, filename, "failed", 0, err.Error())
		res := domain.DownloadResult{
			Status:    "error",
			Shortcode: req.Shortcode,
			Filename:  filename,
			Message:   err.Error(),
		}
		if qm.eventBus != nil {
			qm.eventBus.Publish(events.Event{
				Type:    events.EventDownloadFailed,
				Payload: res,
			})
		}
		return res
	}

	_ = qm.repo.RecordDownload(req.Shortcode, req.Username, filename, localPath, size)
	qm.updateLiveLog(req.Username, req.Shortcode, filename, "completed", size, "")

	res := domain.DownloadResult{
		Status:    "downloaded",
		Shortcode: req.Shortcode,
		Filename:  filename,
		LocalPath: localPath,
		FileSize:  size,
	}

	if qm.eventBus != nil {
		qm.eventBus.Publish(events.Event{
			Type:    events.EventDownloadCompleted,
			Payload: res,
		})
	}
	return res
}
