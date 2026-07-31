package events

import (
	"sync"
)

type EventType string

const (
	EventDownloadStarted   EventType = "event.download.started"
	EventDownloadProgress  EventType = "event.download.progress"
	EventDownloadCompleted EventType = "event.download.completed"
	EventDownloadSkipped   EventType = "event.download.skipped"
	EventDownloadFailed    EventType = "event.download.failed"
	EventLogUpdate         EventType = "event.log.update"
)

type Event struct {
	Type    EventType `json:"type"`
	Payload any       `json:"payload"`
}

type EventHandler func(event Event)

type EventBus struct {
	mu          sync.RWMutex
	subscribers map[EventType][]EventHandler
	globalSubs  []EventHandler
}

func NewEventBus() *EventBus {
	return &EventBus{
		subscribers: make(map[EventType][]EventHandler),
		globalSubs:  make([]EventHandler, 0),
	}
}

func (eb *EventBus) Subscribe(eventType EventType, handler EventHandler) {
	eb.mu.Lock()
	defer eb.mu.Unlock()
	eb.subscribers[eventType] = append(eb.subscribers[eventType], handler)
}

func (eb *EventBus) SubscribeAll(handler EventHandler) {
	eb.mu.Lock()
	defer eb.mu.Unlock()
	eb.globalSubs = append(eb.globalSubs, handler)
}

func (eb *EventBus) Publish(event Event) {
	eb.mu.RLock()
	defer eb.mu.RUnlock()

	if handlers, ok := eb.subscribers[event.Type]; ok {
		for _, handler := range handlers {
			go handler(event)
		}
	}
	for _, handler := range eb.globalSubs {
		go handler(event)
	}
}
