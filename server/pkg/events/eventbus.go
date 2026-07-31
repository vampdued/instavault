package events

import "sync"

type EventType string

const (
	EventDownloadQueued    EventType = "event.download.queued"
	EventDownloadStarted   EventType = "event.download.started"
	EventDownloadProgress  EventType = "event.download.progress"
	EventDownloadCompleted EventType = "event.download.completed"
	EventDownloadSkipped   EventType = "event.download.skipped"
	EventDownloadFailed    EventType = "event.download.failed"
	EventDownloadCanceled  EventType = "event.download.canceled"
	EventLogUpdate         EventType = "event.log.update"
)

type Event struct {
	Sequence uint64    `json:"sequence"`
	Type     EventType `json:"type"`
	Payload  any       `json:"payload"`
}

type EventHandler func(event Event)

type EventBus struct {
	mu          sync.RWMutex
	subscribers map[EventType]map[uint64]EventHandler
	globalSubs  map[uint64]EventHandler
	nextID      uint64
	sequence    uint64
}

func NewEventBus() *EventBus {
	return &EventBus{
		subscribers: make(map[EventType]map[uint64]EventHandler),
		globalSubs:  make(map[uint64]EventHandler),
	}
}

func (eb *EventBus) Subscribe(eventType EventType, handler EventHandler) func() {
	eb.mu.Lock()
	eb.nextID++
	id := eb.nextID
	if eb.subscribers[eventType] == nil {
		eb.subscribers[eventType] = make(map[uint64]EventHandler)
	}
	eb.subscribers[eventType][id] = handler
	eb.mu.Unlock()
	return func() {
		eb.mu.Lock()
		delete(eb.subscribers[eventType], id)
		eb.mu.Unlock()
	}
}

func (eb *EventBus) SubscribeAll(handler EventHandler) func() {
	eb.mu.Lock()
	eb.nextID++
	id := eb.nextID
	eb.globalSubs[id] = handler
	eb.mu.Unlock()
	return func() {
		eb.mu.Lock()
		delete(eb.globalSubs, id)
		eb.mu.Unlock()
	}
}

func (eb *EventBus) Publish(event Event) {
	eb.mu.Lock()
	eb.sequence++
	event.Sequence = eb.sequence
	handlers := make([]EventHandler, 0, len(eb.globalSubs)+len(eb.subscribers[event.Type]))
	for _, handler := range eb.subscribers[event.Type] {
		handlers = append(handlers, handler)
	}
	for _, handler := range eb.globalSubs {
		handlers = append(handlers, handler)
	}
	eb.mu.Unlock()

	for _, handler := range handlers {
		handler(event)
	}
}
