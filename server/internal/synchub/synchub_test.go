package synchub

import (
	"fmt"
	"strings"
	"testing"
	"time"
)

func TestHub_IdleTimeoutEvaluation(t *testing.T) {
	cur := time.Date(2026, 11, 28, 12, 0, 0, 0, time.UTC)
	hub := New(Options{
		Now:         func() time.Time { return cur },
		IdleTimeout: 8 * time.Second,
	})

	hub.StartSync("natgeo", "preparing", 0)
	snap := hub.Snapshot(0)
	if !snap.IsActive || snap.Username != "natgeo" || snap.Stage != "preparing" {
		t.Fatalf("expected active sync for natgeo, got %+v", snap)
	}

	// Within timeout window -> still active
	cur = cur.Add(5 * time.Second)
	if !hub.Snapshot(0).IsActive {
		t.Fatalf("expected sync to remain active within idle timeout")
	}

	// Past timeout window, but activeDownloads > 0 -> still active
	cur = cur.Add(10 * time.Second)
	if !hub.Snapshot(1).IsActive {
		t.Fatalf("expected sync to remain active while downloads are in flight")
	}

	// Past timeout window with activeDownloads == 0 -> transitions to inactive
	if hub.Snapshot(0).IsActive {
		t.Fatalf("expected sync to become inactive after idle timeout with 0 active downloads")
	}
}

func TestHub_LiveLogRingBufferAndUpdates(t *testing.T) {
	cur := time.Date(2026, 11, 28, 12, 0, 0, 0, time.UTC)
	hub := New(Options{
		Now:         func() time.Time { return cur },
		MaxLiveLogs: 15,
	})

	// Add 18 distinct items; buffer should cap at last 15
	for i := 1; i <= 18; i++ {
		cur = cur.Add(time.Second)
		hub.RecordProgress("alice", fmt.Sprintf("SC%d", i), fmt.Sprintf("file_%d.jpg", i), "downloading", 0, "", 1)
	}

	snap := hub.Snapshot(1)
	if len(snap.LiveLogs) != 15 {
		t.Fatalf("expected ring buffer of 15 entries, got %d", len(snap.LiveLogs))
	}
	if snap.LiveLogs[0].Filename != "file_4.jpg" || snap.LiveLogs[14].Filename != "file_18.jpg" {
		t.Fatalf("unexpected ring buffer bounds: first=%q last=%q", snap.LiveLogs[0].Filename, snap.LiveLogs[14].Filename)
	}

	// Updating an existing filename modifies in place rather than appending
	hub.RecordProgress("alice", "SC18", "file_18.jpg", "completed", 4096, "", 0)
	snap2 := hub.Snapshot(0)
	if len(snap2.LiveLogs) != 15 {
		t.Fatalf("expected 15 entries after in-place update, got %d", len(snap2.LiveLogs))
	}
	last := snap2.LiveLogs[14]
	if last.Status != "completed" || last.Size != 4096 {
		t.Fatalf("expected updated status=completed size=4096, got %+v", last)
	}
}

func TestHub_SSEFanOutAndUnsubscribe(t *testing.T) {
	hub := New(Options{})

	ch1, unsub1 := hub.Subscribe()
	ch2, unsub2 := hub.Subscribe()
	defer unsub2()

	hub.StartSync("nasa", "", 0)

	select {
	case msg := <-ch1:
		s := string(msg)
		if !strings.Contains(s, "event: sync") || !strings.Contains(s, `"username":"nasa"`) || !strings.Contains(s, `"stage":"preparing"`) {
			t.Fatalf("unexpected SSE payload on ch1: %s", s)
		}
	case <-time.After(time.Second):
		t.Fatalf("timed out waiting for SSE message on ch1")
	}

	select {
	case msg := <-ch2:
		if !strings.Contains(string(msg), `"username":"nasa"`) {
			t.Fatalf("unexpected SSE payload on ch2: %s", string(msg))
		}
	case <-time.After(time.Second):
		t.Fatalf("timed out waiting for SSE message on ch2")
	}

	unsub1()
	hub.Broadcast("sync", map[string]any{"databaseImported": true})

	select {
	case msg := <-ch1:
		t.Fatalf("unsubscribed client ch1 should not receive events, got %s", string(msg))
	default:
	}

	select {
	case msg := <-ch2:
		if !strings.Contains(string(msg), `"databaseImported":true`) {
			t.Fatalf("unexpected broadcast payload on ch2: %s", string(msg))
		}
	case <-time.After(time.Second):
		t.Fatalf("timed out waiting for broadcast on ch2")
	}
}
