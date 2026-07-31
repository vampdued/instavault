package nativehost

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"sync"

	"instavault-server/pkg/domain"
	"instavault-server/pkg/events"
	"instavault-server/pkg/queue"
	"instavault-server/pkg/storage"
)

type MessageFrame struct {
	ID      string          `json:"id,omitempty"`
	Type    string          `json:"type"`
	Status  string          `json:"status,omitempty"`
	Payload json.RawMessage `json:"payload,omitempty"`
	Error   string          `json:"error,omitempty"`
}

type NativeHost struct {
	repo     *storage.Repository
	queue    *queue.QueueManager
	eventBus *events.EventBus
	writeMu  sync.Mutex
}

func NewNativeHost(repo *storage.Repository, qm *queue.QueueManager, eb *events.EventBus) *NativeHost {
	nh := &NativeHost{
		repo:     repo,
		queue:    qm,
		eventBus: eb,
	}

	// Subscribe to eventbus to forward asynchronous progress/completed events to stdout
	if eb != nil {
		eb.SubscribeAll(func(event events.Event) {
			nh.sendEvent(string(event.Type), event.Payload)
		})
	}

	return nh
}

func (nh *NativeHost) ListenAndServe() error {
	reader := os.Stdin
	var length uint32

	for {
		err := binary.Read(reader, binary.LittleEndian, &length)
		if err != nil {
			if err == io.EOF {
				return nil
			}
			return fmt.Errorf("failed reading message length: %w", err)
		}

		if length == 0 || length > 4*1024*1024 {
			return fmt.Errorf("invalid payload length: %d", length)
		}

		buf := make([]byte, length)
		_, err = io.ReadFull(reader, buf)
		if err != nil {
			return fmt.Errorf("failed reading payload: %w", err)
		}

		var frame MessageFrame
		if err := json.Unmarshal(buf, &frame); err != nil {
			nh.sendError("", "protocol_error", "Invalid JSON frame: "+err.Error())
			continue
		}

		go nh.handleFrame(frame)
	}
}

func (nh *NativeHost) handleFrame(frame MessageFrame) {
	switch frame.Type {
	case "system.handshake":
		nh.sendResponse(frame.ID, "system.handshake", "success", map[string]any{
			"version":      "1.8.0",
			"protocol":     "native-messaging-v1",
			"capabilities": []string{"download", "queue", "history", "settings", "events"},
		})

	case "system.ping":
		nh.sendResponse(frame.ID, "system.ping", "success", map[string]any{
			"status": "online",
		})

	case "download.create":
		var req domain.DownloadRequest
		if err := json.Unmarshal(frame.Payload, &req); err != nil {
			nh.sendError(frame.ID, "invalid_request", err.Error())
			return
		}
		// Enqueue item asynchronously or process
		res := nh.queue.ProcessSynchronous(req, false)
		nh.sendResponse(frame.ID, "download.create", "success", res)

	case "download.batch":
		var reqs []domain.DownloadRequest
		if err := json.Unmarshal(frame.Payload, &reqs); err != nil {
			nh.sendError(frame.ID, "invalid_request", err.Error())
			return
		}
		for _, r := range reqs {
			nh.queue.Enqueue(r, false)
		}
		nh.sendResponse(frame.ID, "download.batch", "success", map[string]any{
			"enqueuedCount": len(reqs),
		})

	case "settings.get":
		s, err := nh.repo.GetSettings("", "")
		if err != nil {
			nh.sendError(frame.ID, "storage_error", err.Error())
			return
		}
		nh.sendResponse(frame.ID, "settings.get", "success", s)

	case "settings.set":
		var s map[string]string
		if err := json.Unmarshal(frame.Payload, &s); err != nil {
			nh.sendError(frame.ID, "invalid_request", err.Error())
			return
		}
		if newDir, ok := s["baseDir"]; ok && newDir != "" {
			_ = nh.repo.SaveSetting("baseDir", newDir)
		}
		if newStruct, ok := s["folderStructure"]; ok && newStruct != "" {
			_ = nh.repo.SaveSetting("folderStructure", newStruct)
		}
		nh.sendResponse(frame.ID, "settings.set", "success", s)

	case "history.get":
		var query struct {
			Page     int    `json:"page"`
			Limit    int    `json:"limit"`
			Username string `json:"username"`
		}
		_ = json.Unmarshal(frame.Payload, &query)
		if query.Limit <= 0 {
			query.Limit = 50
		}
		downloads, err := nh.repo.ListDownloads(query.Page, query.Limit, query.Username, "")
		if err != nil {
			nh.sendError(frame.ID, "storage_error", err.Error())
			return
		}
		nh.sendResponse(frame.ID, "history.get", "success", downloads)

	default:
		nh.sendError(frame.ID, "unknown_command", "Unsupported command type: "+frame.Type)
	}
}

func (nh *NativeHost) sendResponse(id, msgType, status string, payload any) {
	rawPayload, _ := json.Marshal(payload)
	resp := MessageFrame{
		ID:      id,
		Type:    msgType,
		Status:  status,
		Payload: rawPayload,
	}
	nh.writeFrame(resp)
}

func (nh *NativeHost) sendEvent(eventType string, payload any) {
	rawPayload, _ := json.Marshal(payload)
	event := MessageFrame{
		ID:      "",
		Type:    eventType,
		Status:  "event",
		Payload: rawPayload,
	}
	nh.writeFrame(event)
}

func (nh *NativeHost) sendError(id, errCode, errMsg string) {
	resp := MessageFrame{
		ID:     id,
		Type:   "error",
		Status: errCode,
		Error:  errMsg,
	}
	nh.writeFrame(resp)
}

func (nh *NativeHost) writeFrame(frame MessageFrame) {
	nh.writeMu.Lock()
	defer nh.writeMu.Unlock()

	data, err := json.Marshal(frame)
	if err != nil {
		return
	}

	length := uint32(len(data))
	if err := binary.Write(os.Stdout, binary.LittleEndian, length); err != nil {
		return
	}
	_, _ = os.Stdout.Write(data)
}
