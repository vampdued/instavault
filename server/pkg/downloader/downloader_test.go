package downloader

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
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
		got := Sanitize(tt.input)
		if got != tt.expected {
			t.Errorf("Sanitize(%q) = %q; want %q", tt.input, got, tt.expected)
		}
	}
}

func TestDownloadFileCommitsAtomically(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("media-data"))
	}))
	defer server.Close()

	tempDir := t.TempDir()
	destination := filepath.Join(tempDir, "media.jpg")
	size, err := (&Downloader{client: server.Client()}).DownloadFile(context.Background(), server.URL, destination, nil)
	if err != nil {
		t.Fatalf("DownloadFile: %v", err)
	}
	if size != int64(len("media-data")) {
		t.Fatalf("size = %d", size)
	}
	if _, err := os.Stat(destination + ".instavault-part"); !os.IsNotExist(err) {
		t.Fatalf("partial file still exists: %v", err)
	}
	data, err := os.ReadFile(destination)
	if err != nil || string(data) != "media-data" {
		t.Fatalf("destination = %q, err=%v", data, err)
	}
}

func TestGetTargetPathSecurityBoundary(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "instavault_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Attempt path traversal via username and filename
	targetDir, fullPath := GetTargetPath(tempDir, "profile", "../../../etc", "../../../passwd", "txt")

	cleanTemp := filepath.Clean(tempDir)
	rel, err := filepath.Rel(cleanTemp, fullPath)
	if err != nil || rel == ".." || len(rel) >= 2 && rel[:2] == ".." {
		t.Errorf("Security breach! Path escaped base directory: %s", fullPath)
	}
	_ = targetDir
}

func TestValidateMediaURL(t *testing.T) {
	allowed := []string{
		"https://scontent.cdninstagram.com/media.jpg",
		"https://instagram.fdel1-1.fna.fbcdn.net/video.mp4?token=abc",
		"https://www.instagram.com/media/image.jpg",
	}
	for _, candidate := range allowed {
		if err := ValidateMediaURL(candidate); err != nil {
			t.Errorf("ValidateMediaURL(%q): %v", candidate, err)
		}
	}
	rejected := []string{
		"http://scontent.cdninstagram.com/media.jpg",
		"https://127.0.0.1/secret",
		"https://cdninstagram.com.example.test/media.jpg",
		"file:///etc/passwd",
	}
	for _, candidate := range rejected {
		if err := ValidateMediaURL(candidate); err == nil {
			t.Errorf("ValidateMediaURL(%q) should reject the URL", candidate)
		}
	}
}
