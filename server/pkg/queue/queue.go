package queue

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	"instavault-server/pkg/domain"
	"instavault-server/pkg/downloader"
	"instavault-server/pkg/events"
	"instavault-server/pkg/storage"
)

type DownloadTask struct {
	JobID   string
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
	activeMap map[string]*sync.Mutex
	jobs      map[string]domain.Job
	cancels   map[string]context.CancelFunc
	paused    bool
	stopped   bool
	pauseCond *sync.Cond
	nextJobID atomic.Uint64

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
		activeMap:       make(map[string]*sync.Mutex),
		jobs:            make(map[string]domain.Job),
		cancels:         make(map[string]context.CancelFunc),
		baseDir:         baseDir,
		folderStructure: folderStructure,
	}

	qm.pauseCond = sync.NewCond(&qm.mu)
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
	qm.mu.Lock()
	if qm.stopped {
		qm.mu.Unlock()
		return
	}
	qm.stopped = true
	qm.paused = false
	for _, cancel := range qm.cancels {
		cancel()
	}
	qm.pauseCond.Broadcast()
	qm.mu.Unlock()
	close(qm.taskChan)
	qm.wg.Wait()
}

func (qm *QueueManager) Enqueue(req domain.DownloadRequest, force bool) (string, error) {
	if req.URL == "" || req.Shortcode == "" || req.Username == "" {
		return "", errors.New("url, shortcode and username are required")
	}

	jobID := req.ID
	if jobID == "" {
		jobID = fmt.Sprintf("job-%d-%d", time.Now().UnixMilli(), qm.nextJobID.Add(1))
	}
	now := time.Now().UTC()
	qm.mu.Lock()
	if qm.stopped {
		qm.mu.Unlock()
		return "", errors.New("queue is stopped")
	}
	if existing, ok := qm.jobs[jobID]; ok {
		qm.mu.Unlock()
		return existing.ID, nil
	}
	qm.jobs[jobID] = domain.Job{ID: jobID, State: domain.JobQueued, Request: req, CreatedAt: now, UpdatedAt: now}
	task := DownloadTask{JobID: jobID, Request: req, Force: force}
	select {
	case qm.taskChan <- task:
		qm.mu.Unlock()
		qm.publishJobEvent(events.EventDownloadQueued, jobID, map[string]any{"jobId": jobID, "state": domain.JobQueued})
		return jobID, nil
	default:
		delete(qm.jobs, jobID)
		qm.mu.Unlock()
		return "", errors.New("download queue is full")
	}
}

func (qm *QueueManager) Pause() {
	qm.mu.Lock()
	qm.paused = true
	qm.mu.Unlock()
}

func (qm *QueueManager) Resume() {
	qm.mu.Lock()
	qm.paused = false
	qm.pauseCond.Broadcast()
	qm.mu.Unlock()
}

func (qm *QueueManager) Cancel(jobID string) bool {
	qm.mu.Lock()
	job, ok := qm.jobs[jobID]
	if !ok || job.State == domain.JobCompleted || job.State == domain.JobSkipped || job.State == domain.JobFailed || job.State == domain.JobCanceled {
		qm.mu.Unlock()
		return false
	}
	cancel := qm.cancels[jobID]
	if cancel != nil {
		cancel()
	}
	job.State = domain.JobCanceled
	job.UpdatedAt = time.Now().UTC()
	qm.jobs[jobID] = job
	qm.mu.Unlock()
	if cancel == nil && qm.eventBus != nil {
		qm.eventBus.Publish(events.Event{Type: events.EventDownloadCanceled, Payload: domain.DownloadResult{
			JobID: jobID, Status: "canceled", Shortcode: job.Request.Shortcode, Filename: job.Request.Filename, Message: "download canceled",
		}})
	}
	return true
}

func (qm *QueueManager) Snapshot() domain.QueueSnapshot {
	qm.mu.Lock()
	defer qm.mu.Unlock()
	snapshot := domain.QueueSnapshot{Paused: qm.paused, Jobs: make([]domain.Job, 0, len(qm.jobs))}
	for _, job := range qm.jobs {
		snapshot.Jobs = append(snapshot.Jobs, job)
		switch job.State {
		case domain.JobQueued:
			snapshot.Queued++
		case domain.JobRunning:
			snapshot.Running++
		}
	}
	sort.Slice(snapshot.Jobs, func(i, j int) bool { return snapshot.Jobs[i].CreatedAt.Before(snapshot.Jobs[j].CreatedAt) })
	return snapshot
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
	return qm.processItem(context.Background(), "", req, force)
}

func (qm *QueueManager) workerLoop(workerID int) {
	defer qm.wg.Done()
	for task := range qm.taskChan {
		qm.mu.Lock()
		for qm.paused && !qm.stopped {
			qm.pauseCond.Wait()
		}
		job := qm.jobs[task.JobID]
		if job.State == domain.JobCanceled || qm.stopped {
			qm.mu.Unlock()
			continue
		}
		ctx, cancel := context.WithCancel(context.Background())
		qm.cancels[task.JobID] = cancel
		job.State = domain.JobRunning
		job.UpdatedAt = time.Now().UTC()
		qm.jobs[task.JobID] = job
		qm.mu.Unlock()

		res := qm.processItem(ctx, task.JobID, task.Request, task.Force)
		cancel()
		qm.mu.Lock()
		delete(qm.cancels, task.JobID)
		job = qm.jobs[task.JobID]
		if job.State != domain.JobCanceled {
			job.Result = &res
			job.UpdatedAt = time.Now().UTC()
			switch res.Status {
			case "downloaded":
				job.State = domain.JobCompleted
			case "skipped":
				job.State = domain.JobSkipped
			default:
				job.State = domain.JobFailed
				job.Error = res.Message
			}
			qm.jobs[task.JobID] = job
		}
		qm.mu.Unlock()
	}
}

func (qm *QueueManager) processItem(ctx context.Context, jobID string, req domain.DownloadRequest, force bool) domain.DownloadResult {
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
	key := req.Shortcode + "\x00" + filename
	keyLock := qm.activeMap[key]
	if keyLock == nil {
		keyLock = &sync.Mutex{}
		qm.activeMap[key] = keyLock
	}
	qm.mu.Unlock()
	keyLock.Lock()
	defer keyLock.Unlock()

	qm.updateLiveLog(req.Username, req.Shortcode, filename, "downloading", 0, "")

	if qm.eventBus != nil {
		qm.eventBus.Publish(events.Event{
			Type: events.EventDownloadStarted,
			Payload: map[string]any{
				"jobId":     jobID,
				"shortcode": req.Shortcode,
				"username":  req.Username,
				"filename":  filename,
			},
		})
	}

	userDir, localPath := downloader.GetTargetPath(baseDir, folderStruct, req.Username, filename, req.FileExt)
	if err := os.MkdirAll(userDir, 0755); err != nil {
		return domain.DownloadResult{JobID: jobID, Status: "error", Shortcode: req.Shortcode, Filename: filename, Message: err.Error()}
	}

	if force {
		_ = qm.repo.DeleteDownloadByShortcodeAndFilename(req.Shortcode, filename)
	} else {
		if already, existingPath := qm.repo.IsAlreadyDownloaded(req.Shortcode, filename); already {
			_ = qm.repo.RecordSkip(req.Shortcode, req.Username, filename, existingPath)
			qm.updateLiveLog(req.Username, req.Shortcode, filename, "skipped", 0, "")

			res := domain.DownloadResult{
				JobID:     jobID,
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
	size, err := qm.downloader.DownloadFile(ctx, req.URL, localPath, func(bytesDownloaded, totalBytes int64) {
		if time.Since(lastProgressTime) > 250*time.Millisecond && qm.eventBus != nil {
			lastProgressTime = time.Now()
			percent := float64(0)
			if totalBytes > 0 {
				percent = (float64(bytesDownloaded) / float64(totalBytes)) * 100.0
			}
			qm.eventBus.Publish(events.Event{
				Type: events.EventDownloadProgress,
				Payload: map[string]any{
					"jobId":           jobID,
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
		if errors.Is(err, context.Canceled) {
			res := domain.DownloadResult{JobID: jobID, Status: "canceled", Shortcode: req.Shortcode, Filename: filename, Message: "download canceled"}
			if qm.eventBus != nil {
				qm.eventBus.Publish(events.Event{Type: events.EventDownloadCanceled, Payload: res})
			}
			return res
		}
		qm.updateLiveLog(req.Username, req.Shortcode, filename, "failed", 0, err.Error())
		res := domain.DownloadResult{
			JobID:     jobID,
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
		JobID:     jobID,
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

func (qm *QueueManager) publishJobEvent(eventType events.EventType, jobID string, payload any) {
	if qm.eventBus != nil {
		qm.eventBus.Publish(events.Event{Type: eventType, Payload: payload})
	}
}
