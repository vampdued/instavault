package synchub

import (
	"encoding/json"
	"sync"
	"time"
)

const (
	defaultMaxLiveLogs = 15
	defaultIdleTimeout = 8 * time.Second
)

// LiveLogEntry represents a single real-time download event in the live-log ring buffer.
type LiveLogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Username  string    `json:"username"`
	Filename  string    `json:"filename"`
	Shortcode string    `json:"shortcode"`
	Status    string    `json:"status"` // "downloading", "completed", "skipped", "failed"
	Size      int64     `json:"size,omitempty"`
	Error     string    `json:"error,omitempty"`
}

// ActiveSyncState represents the current active scraping/download state exposed via SSE and /api/stats.
type ActiveSyncState struct {
	LastActive time.Time      `json:"lastActive"`
	Username   string         `json:"username"`
	IsActive   bool           `json:"isActive"`
	Stage      string         `json:"stage,omitempty"`
	LiveLogs   []LiveLogEntry `json:"liveLogs"`
}

// Options configures a Sync Hub.
type Options struct {
	Now         func() time.Time
	IdleTimeout time.Duration
	MaxLiveLogs int
}

// Hub owns active sync state, the live-log ring buffer, deterministic idle-timeout
// evaluation, and SSE client subscription/broadcast fan-out.
type Hub struct {
	now         func() time.Time
	idleTimeout time.Duration
	maxLiveLogs int

	stateMu sync.Mutex
	state   ActiveSyncState

	clientsMu sync.Mutex
	clients   map[chan []byte]struct{}
}

// New creates a new Sync Hub with optional clock, idle timeout, and ring-buffer size overrides.
func New(opts Options) *Hub {
	nowFn := opts.Now
	if nowFn == nil {
		nowFn = time.Now
	}
	idle := opts.IdleTimeout
	if idle <= 0 {
		idle = defaultIdleTimeout
	}
	maxLogs := opts.MaxLiveLogs
	if maxLogs <= 0 {
		maxLogs = defaultMaxLiveLogs
	}
	return &Hub{
		now:         nowFn,
		idleTimeout: idle,
		maxLiveLogs: maxLogs,
		clients:     make(map[chan []byte]struct{}),
	}
}

// StartSync marks a sync session active for username/stage and broadcasts the updated state.
func (h *Hub) StartSync(username, stage string, activeDownloads int64) {
	if stage == "" {
		stage = "preparing"
	}

	h.stateMu.Lock()
	h.state.LastActive = h.now()
	h.state.IsActive = true
	h.state.Stage = stage
	if username != "" {
		h.state.Username = username
	}
	snapshot := cloneState(h.state)
	h.stateMu.Unlock()

	h.Broadcast("sync", map[string]any{
		"activeSync":      snapshot,
		"activeDownloads": activeDownloads,
	})
}

// RecordProgress updates or appends a live-log entry in the ring buffer and broadcasts a sync SSE event.
func (h *Hub) RecordProgress(username, shortcode, filename, status string, size int64, errStr string, activeDownloads int64) {
	now := h.now()

	h.stateMu.Lock()
	h.state.LastActive = now
	h.state.Username = username
	h.state.IsActive = true
	h.state.Stage = ""

	found := false
	for i := range h.state.LiveLogs {
		if h.state.LiveLogs[i].Filename == filename {
			h.state.LiveLogs[i].Status = status
			if size > 0 {
				h.state.LiveLogs[i].Size = size
			}
			if errStr != "" {
				h.state.LiveLogs[i].Error = errStr
			}
			h.state.LiveLogs[i].Timestamp = now
			found = true
			break
		}
	}

	if !found {
		entry := LiveLogEntry{
			Timestamp: now,
			Username:  username,
			Filename:  filename,
			Shortcode: shortcode,
			Status:    status,
			Size:      size,
			Error:     errStr,
		}
		h.state.LiveLogs = append(h.state.LiveLogs, entry)
		if len(h.state.LiveLogs) > h.maxLiveLogs {
			h.state.LiveLogs = h.state.LiveLogs[len(h.state.LiveLogs)-h.maxLiveLogs:]
		}
	}

	snapshot := cloneState(h.state)
	h.stateMu.Unlock()

	h.Broadcast("sync", map[string]any{
		"activeSync":      snapshot,
		"activeDownloads": activeDownloads,
		"latest": map[string]any{
			"timestamp": now,
			"username":  username,
			"shortcode": shortcode,
			"filename":  filename,
			"status":    status,
			"size":      size,
			"error":     errStr,
		},
	})
}

// Snapshot returns a copy of the current ActiveSyncState after deterministically
// evaluating the idle timeout against activeDownloads.
func (h *Hub) Snapshot(activeDownloads int64) ActiveSyncState {
	h.stateMu.Lock()
	defer h.stateMu.Unlock()

	if h.state.IsActive && activeDownloads == 0 && h.now().Sub(h.state.LastActive) > h.idleTimeout {
		h.state.IsActive = false
	}
	return cloneState(h.state)
}

// Subscribe registers an SSE subscriber channel and returns a receive-only channel
// alongside an unsubscribe cleanup function.
func (h *Hub) Subscribe() (<-chan []byte, func()) {
	ch := make(chan []byte, 32)
	h.clientsMu.Lock()
	h.clients[ch] = struct{}{}
	h.clientsMu.Unlock()

	unsubscribe := func() {
		h.clientsMu.Lock()
		delete(h.clients, ch)
		h.clientsMu.Unlock()
	}
	return ch, unsubscribe
}

// Broadcast serializes payload as JSON and fans it out as a Server-Sent Event
// to all subscribed clients without blocking on slow consumers.
func (h *Hub) Broadcast(event string, payload any) {
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}
	msg := []byte("event: " + event + "\ndata: " + string(data) + "\n\n")

	h.clientsMu.Lock()
	for ch := range h.clients {
		select {
		case ch <- msg:
		default:
		}
	}
	h.clientsMu.Unlock()
}

func cloneState(s ActiveSyncState) ActiveSyncState {
	out := s
	if s.LiveLogs != nil {
		out.LiveLogs = make([]LiveLogEntry, len(s.LiveLogs))
		copy(out.LiveLogs, s.LiveLogs)
	}
	return out
}
