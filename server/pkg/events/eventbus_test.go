package events

import "testing"

func TestEventSequenceAndUnsubscribe(t *testing.T) {
	bus := NewEventBus()
	var sequences []uint64
	unsubscribe := bus.SubscribeAll(func(event Event) {
		sequences = append(sequences, event.Sequence)
	})
	bus.Publish(Event{Type: EventDownloadQueued})
	bus.Publish(Event{Type: EventDownloadStarted})
	unsubscribe()
	bus.Publish(Event{Type: EventDownloadCompleted})

	if len(sequences) != 2 || sequences[0] != 1 || sequences[1] != 2 {
		t.Fatalf("sequences = %v; want [1 2]", sequences)
	}
}
