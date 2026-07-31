package storage_test

import (
	"os"
	"path/filepath"
	"testing"

	"instavault-server/pkg/storage"
)

func TestRepositoryOperations(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "instavault_db_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "test.db")
	repo, err := storage.NewRepository(dbPath)
	if err != nil {
		t.Fatalf("Failed to create repository: %v", err)
	}
	defer repo.Close()

	// Test settings
	err = repo.SaveSetting("baseDir", "/tmp/instagram")
	if err != nil {
		t.Fatalf("SaveSetting failed: %v", err)
	}

	settings, err := repo.GetSettings("/default", "profile")
	if err != nil {
		t.Fatalf("GetSettings failed: %v", err)
	}
	if settings.BaseDir != "/tmp/instagram" {
		t.Errorf("GetSettings BaseDir = %q; want %q", settings.BaseDir, "/tmp/instagram")
	}

	// Create dummy local file for deduplication test
	dummyFile := filepath.Join(tempDir, "test.jpg")
	_ = os.WriteFile(dummyFile, []byte("fake image data"), 0644)

	// Record download
	err = repo.RecordDownload("CODE123", "testuser", "test.jpg", dummyFile, 15)
	if err != nil {
		t.Fatalf("RecordDownload failed: %v", err)
	}

	// Check deduplication
	already, path := repo.IsAlreadyDownloaded("CODE123", "test.jpg")
	if !already {
		t.Errorf("IsAlreadyDownloaded = false; want true")
	}
	if path != dummyFile {
		t.Errorf("IsAlreadyDownloaded path = %q; want %q", path, dummyFile)
	}

	// Check stats
	totalDownloads, totalSkipped, uniqueAccounts, err := repo.GetStats()
	if err != nil {
		t.Fatalf("GetStats failed: %v", err)
	}
	if totalDownloads != 1 || uniqueAccounts != 1 {
		t.Errorf("Stats unexpected: downloads=%d, accounts=%d", totalDownloads, uniqueAccounts)
	}
	_ = totalSkipped
}
