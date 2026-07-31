package downloader_test

import (
	"os"
	"path/filepath"
	"testing"

	"instavault-server/pkg/downloader"
)

func TestSanitize(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"hello/world", "hello_world"},
		{"user:name?", "user_name_"},
		{"..secret..", "secret"},
		{"   valid_name   ", "valid_name"},
		{"", "unnamed"},
	}

	for _, tt := range tests {
		got := downloader.Sanitize(tt.input)
		if got != tt.expected {
			t.Errorf("Sanitize(%q) = %q; want %q", tt.input, got, tt.expected)
		}
	}
}

func TestGetTargetPathSecurityBoundary(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "instavault_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Attempt path traversal via username and filename
	targetDir, fullPath := downloader.GetTargetPath(tempDir, "profile", "../../../etc", "../../../passwd", "txt")

	cleanTemp := filepath.Clean(tempDir)
	rel, err := filepath.Rel(cleanTemp, fullPath)
	if err != nil || rel == ".." || len(rel) >= 2 && rel[:2] == ".." {
		t.Errorf("Security breach! Path escaped base directory: %s", fullPath)
	}
	_ = targetDir
}
