package queue

import (
	"path/filepath"
	"testing"

	"instavault-server/pkg/domain"
	"instavault-server/pkg/events"
	"instavault-server/pkg/storage"
)

func TestQueueLifecycleWithoutStartingTransfer(t *testing.T) {
	tempDir := t.TempDir()
	repo, err := storage.NewRepository(filepath.Join(tempDir, "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer repo.Close()

	bus := events.NewEventBus()
	manager := NewQueueManager(1, repo, bus, tempDir, "profile")
	manager.Pause()
	defer manager.Stop()

	jobID, err := manager.Enqueue(domain.DownloadRequest{
		ID: "request-1", Username: "account", Shortcode: "ABC123", URL: "https://example.invalid/media.jpg", Filename: "media.jpg",
	}, false)
	if err != nil {
		t.Fatal(err)
	}
	if jobID != "request-1" {
		t.Fatalf("jobID = %q", jobID)
	}
	snapshot := manager.Snapshot()
	if !snapshot.Paused || snapshot.Queued != 1 || len(snapshot.Jobs) != 1 {
		t.Fatalf("unexpected snapshot: %+v", snapshot)
	}
	if !manager.Cancel(jobID) {
		t.Fatal("expected queued job to be cancelable")
	}
	snapshot = manager.Snapshot()
	if snapshot.Jobs[0].State != domain.JobCanceled {
		t.Fatalf("state = %s", snapshot.Jobs[0].State)
	}
}

func TestQueueRejectsIncompleteRequest(t *testing.T) {
	manager := NewQueueManager(1, nil, nil, t.TempDir(), "profile")
	defer manager.Stop()
	if _, err := manager.Enqueue(domain.DownloadRequest{}, false); err == nil {
		t.Fatal("expected validation error")
	}
}
