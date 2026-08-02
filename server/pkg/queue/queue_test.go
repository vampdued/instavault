package queue

import (
	"path/filepath"
	"testing"
	"time"

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
	manager.updateJobProgress(jobID, 512, 1024)
	snapshot = manager.Snapshot()
	if snapshot.Jobs[0].Progress == nil || snapshot.Jobs[0].Progress.ProgressPercent != 50 {
		t.Fatalf("progress was not retained in snapshot: %+v", snapshot.Jobs[0].Progress)
	}
	persisted, err := repo.ListQueueJobs()
	if err != nil || len(persisted) != 1 || persisted[0].Progress == nil {
		t.Fatalf("queued job was not persisted: jobs=%+v err=%v", persisted, err)
	}
	if !manager.Cancel(jobID) {
		t.Fatal("expected queued job to be cancelable")
	}
	snapshot = manager.Snapshot()
	if snapshot.Jobs[0].State != domain.JobCanceled {
		t.Fatalf("state = %s", snapshot.Jobs[0].State)
	}
	persisted, err = repo.ListQueueJobs()
	if err != nil || len(persisted) != 0 {
		t.Fatalf("canceled job remained persisted: jobs=%+v err=%v", persisted, err)
	}
}

func TestRestoreJobsRequeuesInterruptedWork(t *testing.T) {
	tempDir := t.TempDir()
	repo, err := storage.NewRepository(filepath.Join(tempDir, "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer repo.Close()

	now := time.Now().UTC()
	interrupted := domain.Job{
		ID:    "restore-1",
		State: domain.JobRunning,
		Request: domain.DownloadRequest{
			ID: "restore-1", Username: "account", Shortcode: "RESTORE", URL: "https://example.invalid/media.jpg",
		},
		Force:     true,
		Progress:  &domain.JobProgress{BytesDownloaded: 512, TotalBytes: 1024, ProgressPercent: 50, StartedAt: now},
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := repo.SaveQueueJob(interrupted); err != nil {
		t.Fatal(err)
	}

	manager := &QueueManager{
		repo:     repo,
		taskChan: make(chan DownloadTask, 1),
		jobs:     make(map[string]domain.Job),
	}
	manager.restoreJobs()

	restored := manager.jobs[interrupted.ID]
	if restored.State != domain.JobQueued || restored.Progress != nil {
		t.Fatalf("interrupted job was not reset for recovery: %+v", restored)
	}
	select {
	case task := <-manager.taskChan:
		if task.JobID != interrupted.ID || !task.Force {
			t.Fatalf("unexpected restored task: %+v", task)
		}
	default:
		t.Fatal("restored job was not returned to the task queue")
	}
}

func TestQueueRejectsIncompleteRequest(t *testing.T) {
	manager := NewQueueManager(1, nil, nil, t.TempDir(), "profile")
	defer manager.Stop()
	if _, err := manager.Enqueue(domain.DownloadRequest{}, false); err == nil {
		t.Fatal("expected validation error")
	}
}
