package nativehost

import (
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"

	"instavault-server/pkg/domain"
	"instavault-server/pkg/events"
	"instavault-server/pkg/queue"
	"instavault-server/pkg/storage"
)

const (
	ProtocolVersion    = "instavault/1"
	ApplicationVersion = "1.8.0"
	maxInboundMessage  = 8 * 1024 * 1024
	maxOutboundMessage = 1024 * 1024
)

type ProtocolError struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	Retryable bool   `json:"retryable"`
}

type Envelope struct {
	Protocol string          `json:"protocol"`
	ID       string          `json:"id,omitempty"`
	Kind     string          `json:"kind"`
	Type     string          `json:"type"`
	OK       *bool           `json:"ok,omitempty"`
	Sequence uint64          `json:"sequence,omitempty"`
	Payload  json.RawMessage `json:"payload,omitempty"`
	Error    *ProtocolError  `json:"error,omitempty"`
}

type NativeHost struct {
	repo        *storage.Repository
	queue       *queue.QueueManager
	eventBus    *events.EventBus
	reader      io.Reader
	writer      io.Writer
	writeMu     sync.Mutex
	unsubscribe func()
}

func New(repo *storage.Repository, qm *queue.QueueManager, eb *events.EventBus, reader io.Reader, writer io.Writer) *NativeHost {
	host := &NativeHost{repo: repo, queue: qm, eventBus: eb, reader: reader, writer: writer}
	if eb != nil {
		host.unsubscribe = eb.SubscribeAll(func(event events.Event) {
			host.sendEvent(strings.TrimPrefix(string(event.Type), "event."), event.Sequence, event.Payload)
		})
	}
	return host
}

func NewStdio(repo *storage.Repository, qm *queue.QueueManager, eb *events.EventBus) *NativeHost {
	return New(repo, qm, eb, os.Stdin, os.Stdout)
}

func (host *NativeHost) Close() {
	if host.unsubscribe != nil {
		host.unsubscribe()
		host.unsubscribe = nil
	}
}

func (host *NativeHost) ListenAndServe() error {
	defer host.Close()
	for {
		frame, err := readFrame(host.reader)
		if errors.Is(err, io.EOF) {
			return nil
		}
		if err != nil {
			return err
		}
		host.handle(frame)
	}
}

func readFrame(reader io.Reader) (Envelope, error) {
	var length uint32
	if err := binary.Read(reader, binary.LittleEndian, &length); err != nil {
		return Envelope{}, err
	}
	if length == 0 || length > maxInboundMessage {
		return Envelope{}, fmt.Errorf("invalid native message length: %d", length)
	}
	data := make([]byte, length)
	if _, err := io.ReadFull(reader, data); err != nil {
		return Envelope{}, fmt.Errorf("read native message: %w", err)
	}
	var frame Envelope
	if err := json.Unmarshal(data, &frame); err != nil {
		return Envelope{}, fmt.Errorf("decode native message: %w", err)
	}
	return frame, nil
}

func (host *NativeHost) handle(frame Envelope) {
	if frame.Kind != "request" {
		host.sendError(frame.ID, frame.Type, "PROTOCOL_INVALID_KIND", "kind must be request", false)
		return
	}
	if frame.ID == "" {
		host.sendError("", frame.Type, "PROTOCOL_MISSING_ID", "request id is required", false)
		return
	}
	if frame.Protocol != ProtocolVersion && frame.Type != "session.hello" {
		host.sendError(frame.ID, frame.Type, "PROTOCOL_VERSION_UNSUPPORTED", "unsupported protocol version", false)
		return
	}

	switch frame.Type {
	case "session.hello":
		host.sendResponse(frame.ID, frame.Type, map[string]any{
			"protocol":     ProtocolVersion,
			"version":      ApplicationVersion,
			"capabilities": []string{"downloads", "batch", "queue", "cancel", "pause", "history", "settings", "events"},
		})
	case "app.version":
		host.sendResponse(frame.ID, frame.Type, map[string]string{"version": ApplicationVersion})
	case "health.get":
		host.sendResponse(frame.ID, frame.Type, map[string]any{"status": "ok", "queue": host.queueSnapshot()})
	case "download.create":
		if host.queue == nil {
			host.sendError(frame.ID, frame.Type, "APP_UNAVAILABLE", "download service is unavailable", true)
			return
		}
		var req domain.DownloadRequest
		if err := decodePayload(frame.Payload, &req); err != nil {
			host.sendError(frame.ID, frame.Type, "INVALID_REQUEST", err.Error(), false)
			return
		}
		if req.ID == "" {
			req.ID = frame.ID
		}
		jobID, err := host.queue.Enqueue(req, false)
		if err != nil {
			host.sendError(frame.ID, frame.Type, "QUEUE_REJECTED", err.Error(), true)
			return
		}
		host.sendResponse(frame.ID, frame.Type, map[string]any{"jobId": jobID, "state": domain.JobQueued})
	case "download.batch.create":
		if host.queue == nil {
			host.sendError(frame.ID, frame.Type, "APP_UNAVAILABLE", "download service is unavailable", true)
			return
		}
		var reqs []domain.DownloadRequest
		if err := decodePayload(frame.Payload, &reqs); err != nil {
			host.sendError(frame.ID, frame.Type, "INVALID_REQUEST", err.Error(), false)
			return
		}
		if len(reqs) == 0 || len(reqs) > 500 {
			host.sendError(frame.ID, frame.Type, "INVALID_BATCH_SIZE", "batch must contain 1 to 500 items", false)
			return
		}
		jobIDs := make([]string, 0, len(reqs))
		for index, req := range reqs {
			if req.ID == "" {
				req.ID = fmt.Sprintf("%s-%d", frame.ID, index+1)
			}
			jobID, err := host.queue.Enqueue(req, false)
			if err != nil {
				host.sendError(frame.ID, frame.Type, "QUEUE_REJECTED", err.Error(), true)
				return
			}
			jobIDs = append(jobIDs, jobID)
		}
		host.sendResponse(frame.ID, frame.Type, map[string]any{"jobIds": jobIDs, "enqueued": len(jobIDs)})
	case "download.cancel":
		var payload struct {
			JobID string `json:"jobId"`
		}
		if err := decodePayload(frame.Payload, &payload); err != nil || payload.JobID == "" {
			host.sendError(frame.ID, frame.Type, "INVALID_REQUEST", "jobId is required", false)
			return
		}
		if !host.queue.Cancel(payload.JobID) {
			host.sendError(frame.ID, frame.Type, "JOB_NOT_CANCELABLE", "job was not found or is already terminal", false)
			return
		}
		host.sendResponse(frame.ID, frame.Type, map[string]any{"jobId": payload.JobID, "state": domain.JobCanceled})
	case "queue.get":
		host.sendResponse(frame.ID, frame.Type, host.queueSnapshot())
	case "queue.pause":
		host.queue.Pause()
		host.sendResponse(frame.ID, frame.Type, host.queueSnapshot())
	case "queue.resume":
		host.queue.Resume()
		host.sendResponse(frame.ID, frame.Type, host.queueSnapshot())
	case "activity.get":
		if host.queue == nil {
			host.sendError(frame.ID, frame.Type, "APP_UNAVAILABLE", "activity service is unavailable", true)
			return
		}
		host.sendResponse(frame.ID, frame.Type, host.queue.GetActiveSyncState())
	case "settings.get":
		if host.repo == nil {
			host.sendError(frame.ID, frame.Type, "APP_UNAVAILABLE", "storage is unavailable", true)
			return
		}
		settings, err := host.repo.GetSettings("", "profile")
		if err != nil {
			host.sendError(frame.ID, frame.Type, "STORAGE_ERROR", err.Error(), true)
			return
		}
		host.sendResponse(frame.ID, frame.Type, settings)
	case "settings.update":
		host.updateSettings(frame)
	case "history.list":
		host.listHistory(frame)
	default:
		host.sendError(frame.ID, frame.Type, "COMMAND_UNKNOWN", "unsupported command type", false)
	}
}

func (host *NativeHost) queueSnapshot() domain.QueueSnapshot {
	if host.queue == nil {
		return domain.QueueSnapshot{Jobs: []domain.Job{}}
	}
	return host.queue.Snapshot()
}

func (host *NativeHost) updateSettings(frame Envelope) {
	if host.repo == nil || host.queue == nil {
		host.sendError(frame.ID, frame.Type, "APP_UNAVAILABLE", "settings service is unavailable", true)
		return
	}
	var settings domain.Settings
	if err := decodePayload(frame.Payload, &settings); err != nil {
		host.sendError(frame.ID, frame.Type, "INVALID_REQUEST", err.Error(), false)
		return
	}
	current, _ := host.repo.GetSettings("", "profile")
	if settings.BaseDir != "" {
		if err := os.MkdirAll(settings.BaseDir, 0755); err != nil {
			host.sendError(frame.ID, frame.Type, "INVALID_BASE_DIR", err.Error(), false)
			return
		}
		if err := host.repo.SaveSetting("baseDir", settings.BaseDir); err != nil {
			host.sendError(frame.ID, frame.Type, "STORAGE_ERROR", err.Error(), true)
			return
		}
		current.BaseDir = settings.BaseDir
	}
	if settings.FolderStructure != "" {
		if settings.FolderStructure != "profile" && settings.FolderStructure != "flat" && settings.FolderStructure != "profile_type" {
			host.sendError(frame.ID, frame.Type, "INVALID_FOLDER_STRUCTURE", "unsupported folder structure", false)
			return
		}
		if err := host.repo.SaveSetting("folderStructure", settings.FolderStructure); err != nil {
			host.sendError(frame.ID, frame.Type, "STORAGE_ERROR", err.Error(), true)
			return
		}
		current.FolderStructure = settings.FolderStructure
	}
	host.queue.UpdateSettings(current.BaseDir, current.FolderStructure)
	host.sendResponse(frame.ID, frame.Type, current)
}

func (host *NativeHost) listHistory(frame Envelope) {
	if host.repo == nil {
		host.sendError(frame.ID, frame.Type, "APP_UNAVAILABLE", "storage is unavailable", true)
		return
	}
	var query struct {
		Page     int    `json:"page"`
		Limit    int    `json:"limit"`
		Username string `json:"username"`
	}
	if len(frame.Payload) > 0 {
		_ = json.Unmarshal(frame.Payload, &query)
	}
	if query.Page < 1 {
		query.Page = 1
	}
	if query.Limit < 1 {
		query.Limit = 50
	}
	if query.Limit > 500 {
		query.Limit = 500
	}
	settings, _ := host.repo.GetSettings("", "profile")
	entries, err := host.repo.ListDownloads(query.Page, query.Limit, query.Username, settings.BaseDir)
	if err != nil {
		host.sendError(frame.ID, frame.Type, "STORAGE_ERROR", err.Error(), true)
		return
	}
	host.sendResponse(frame.ID, frame.Type, entries)
}

func decodePayload(payload json.RawMessage, target any) error {
	if len(payload) == 0 {
		return errors.New("payload is required")
	}
	if err := json.Unmarshal(payload, target); err != nil {
		return fmt.Errorf("invalid payload: %w", err)
	}
	return nil
}

func (host *NativeHost) sendResponse(id, messageType string, payload any) {
	ok := true
	host.write(Envelope{Protocol: ProtocolVersion, ID: id, Kind: "response", Type: messageType, OK: &ok, Payload: marshalPayload(payload)})
}

func (host *NativeHost) sendError(id, messageType, code, message string, retryable bool) {
	ok := false
	host.write(Envelope{Protocol: ProtocolVersion, ID: id, Kind: "response", Type: messageType, OK: &ok, Error: &ProtocolError{Code: code, Message: message, Retryable: retryable}})
}

func (host *NativeHost) sendEvent(messageType string, sequence uint64, payload any) {
	host.write(Envelope{Protocol: ProtocolVersion, Kind: "event", Type: messageType, Sequence: sequence, Payload: marshalPayload(payload)})
}

func marshalPayload(payload any) json.RawMessage {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil
	}
	return data
}

func (host *NativeHost) write(frame Envelope) {
	data, err := json.Marshal(frame)
	if err != nil || len(data) > maxOutboundMessage {
		return
	}
	host.writeMu.Lock()
	defer host.writeMu.Unlock()
	_ = binary.Write(host.writer, binary.LittleEndian, uint32(len(data)))
	_, _ = host.writer.Write(data)
}
