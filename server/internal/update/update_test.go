package update

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestCompareSemver(t *testing.T) {
	tests := []struct {
		v1       string
		v2       string
		expected int
	}{
		{"1.0.0", "1.0.0", 0},
		{"v1.0.0", "1.0.0", 0},
		{"1.1.0", "1.0.9", 1},
		{"1.0.9", "1.1.0", -1},
		{"v2.0.0", "v1.99.99", 1},
		{"1.0.10", "1.0.2", 1},
		{"1.2.3", "1.2.4", -1},
		{"0.9.0", "1.0.0", -1},
	}

	for _, tc := range tests {
		got := CompareSemver(tc.v1, tc.v2)
		if got != tc.expected {
			t.Errorf("CompareSemver(%q, %q) = %d; want %d", tc.v1, tc.v2, got, tc.expected)
		}
	}
}

func TestIsValidReleaseTag(t *testing.T) {
	if !IsValidReleaseTag("v1.2.3") {
		t.Errorf("expected v1.2.3 to be valid")
	}
	if !IsValidReleaseTag("1.0.0") {
		t.Errorf("expected 1.0.0 to be valid")
	}
	if IsValidReleaseTag("v1.0.0-rc1") {
		t.Errorf("expected v1.0.0-rc1 to be rejected as prerelease")
	}
	if IsValidReleaseTag("v1.0.0-beta.2") {
		t.Errorf("expected v1.0.0-beta.2 to be rejected as prerelease")
	}
	if IsValidReleaseTag("invalid-tag") {
		t.Errorf("expected invalid-tag to be rejected")
	}
}

func TestVerifySHA256(t *testing.T) {
	tmpDir := t.TempDir()
	filePath := filepath.Join(tmpDir, "testfile.bin")
	data := []byte("hello InstaVault release verification")
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	h := sha256.Sum256(data)
	expectedHex := hex.EncodeToString(h[:])

	if err := VerifySHA256(filePath, expectedHex); err != nil {
		t.Errorf("expected valid SHA256, got: %v", err)
	}

	if err := VerifySHA256(filePath, "0000000000000000000000000000000000000000000000000000000000000000"); err == nil {
		t.Errorf("expected error for mismatched SHA256, got nil")
	}
}

func TestSafeExtractZip(t *testing.T) {
	tmpDir := t.TempDir()
	zipPath := filepath.Join(tmpDir, "test.zip")
	destDir := filepath.Join(tmpDir, "extracted")

	// 1. Create a valid zip
	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)

	w, err := zw.Create("subfolder/file.txt")
	if err != nil {
		t.Fatal(err)
	}
	w.Write([]byte("instavault content"))
	zw.Close()

	if err := os.WriteFile(zipPath, buf.Bytes(), 0644); err != nil {
		t.Fatal(err)
	}

	if err := SafeExtractZip(zipPath, destDir); err != nil {
		t.Fatalf("SafeExtractZip failed: %v", err)
	}

	extractedContent, err := os.ReadFile(filepath.Join(destDir, "subfolder", "file.txt"))
	if err != nil {
		t.Fatalf("failed to read extracted file: %v", err)
	}
	if string(extractedContent) != "instavault content" {
		t.Errorf("extracted content mismatch, got %q", string(extractedContent))
	}

	// 2. Test zip-slip rejection
	maliciousBuf := new(bytes.Buffer)
	maliciousZw := zip.NewWriter(maliciousBuf)
	mw, err := maliciousZw.Create("../evil.txt")
	if err != nil {
		t.Fatal(err)
	}
	mw.Write([]byte("evil payload"))
	maliciousZw.Close()

	maliciousZipPath := filepath.Join(tmpDir, "malicious.zip")
	if err := os.WriteFile(maliciousZipPath, maliciousBuf.Bytes(), 0644); err != nil {
		t.Fatal(err)
	}

	maliciousDest := filepath.Join(tmpDir, "malicious_dest")
	if err := SafeExtractZip(maliciousZipPath, maliciousDest); err == nil {
		t.Errorf("expected error for zip-slip, got nil")
	}
}

func TestFetchLatestRelease(t *testing.T) {
	mockResponse := `[
		{
			"tag_name": "v1.0.0",
			"draft": false,
			"prerelease": false,
			"assets": [{"name": "instavault-windows-amd64.zip", "browser_download_url": "http://example.com/v1.0.0.zip", "size": 1234}]
		},
		{
			"tag_name": "v1.2.0-rc1",
			"draft": false,
			"prerelease": true,
			"assets": [{"name": "instavault-windows-amd64.zip", "browser_download_url": "http://example.com/rc.zip", "size": 1234}]
		},
		{
			"tag_name": "v1.1.0",
			"draft": false,
			"prerelease": false,
			"assets": [{"name": "instavault-windows-amd64.zip", "browser_download_url": "http://example.com/v1.1.0.zip", "size": 5678}]
		},
		{
			"tag_name": "v2.0.0-draft",
			"draft": true,
			"prerelease": false,
			"assets": []
		}
	]`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(mockResponse))
	}))
	defer server.Close()

	rel, err := FetchLatestRelease(server.Client(), "owner", "repo", server.URL)
	if err != nil {
		t.Fatalf("FetchLatestRelease failed: %v", err)
	}

	// Should choose v1.1.0 (skipping prerelease v1.2.0-rc1, skipping draft v2.0.0, higher than v1.0.0)
	if rel.TagName != "v1.1.0" {
		t.Errorf("expected v1.1.0, got %s", rel.TagName)
	}
}

