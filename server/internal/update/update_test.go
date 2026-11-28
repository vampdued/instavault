package update

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"
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

	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)

	w, err := zw.Create("subfolder/file.txt")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = w.Write([]byte("instavault content"))
	_ = zw.Close()

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

	// Test zip-slip rejection
	maliciousBuf := new(bytes.Buffer)
	maliciousZw := zip.NewWriter(maliciousBuf)
	mw, err := maliciousZw.Create("../evil.txt")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = mw.Write([]byte("evil payload"))
	_ = maliciousZw.Close()

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
		_, _ = w.Write([]byte(mockResponse))
	}))
	defer server.Close()

	rel, err := FetchLatestRelease(server.Client(), "owner", "repo", server.URL)
	if err != nil {
		t.Fatalf("FetchLatestRelease failed: %v", err)
	}

	if rel.TagName != "v1.1.0" {
		t.Errorf("expected v1.1.0, got %s", rel.TagName)
	}
}

func TestManager_CheckForUpdateCache(t *testing.T) {
	var hits atomic.Int32
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"tag_name":"v1.5.0","draft":false,"prerelease":false,"published_at":"2026-11-28T00:00:00Z"}`))
	}))
	defer ts.Close()

	cur := time.Date(2026, 11, 28, 10, 0, 0, 0, time.UTC)
	mgr := NewManager(ManagerConfig{
		CurrentVersion: "1.0.0",
		CustomURL:      ts.URL,
		HTTPClient:     ts.Client(),
		CacheTTL:       12 * time.Hour,
		Now:            func() time.Time { return cur },
	})

	resp1 := mgr.CheckForUpdate()
	if !resp1.UpdateAvailable || resp1.LatestVersion != "v1.5.0" {
		t.Fatalf("unexpected first check response: %+v", resp1)
	}
	if hits.Load() != 1 {
		t.Fatalf("expected 1 upstream fetch, got %d", hits.Load())
	}

	// Within 12h -> served from cache
	cur = cur.Add(6 * time.Hour)
	resp2 := mgr.CheckForUpdate()
	if !resp2.UpdateAvailable || hits.Load() != 1 {
		t.Fatalf("expected cached response without refetch, hits=%d", hits.Load())
	}

	// Past 12h -> refetches
	cur = cur.Add(7 * time.Hour)
	_ = mgr.CheckForUpdate()
	if hits.Load() != 2 {
		t.Fatalf("expected refetch after cache expiry, hits=%d", hits.Load())
	}
}

func buildTestZipBytes(t *testing.T, name string, content []byte) []byte {
	t.Helper()
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	w, err := zw.Create(name)
	if err != nil {
		t.Fatal(err)
	}
	_, _ = w.Write(content)
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func sha256Hex(data []byte) string {
	h := sha256.Sum256(data)
	return hex.EncodeToString(h[:])
}

func TestManager_RunCLIUpdate_RejectsBadExtensionChecksum(t *testing.T) {
	binZip := buildTestZipBytes(t, "instavault-server", []byte("new-binary"))
	extZip := buildTestZipBytes(t, "manifest.json", []byte(`{"version":"2.0.0"}`))

	var ts *httptest.Server
	ts = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/releases":
			w.Header().Set("Content-Type", "application/json")
			_, _ = fmt.Fprintf(w, `{
				"tag_name": "v2.0.0",
				"published_at": "2026-11-28T00:00:00Z",
				"assets": [
					{"name": "instavault-test.zip", "browser_download_url": "%s/bin.zip"},
					{"name": "instavault-extension.zip", "browser_download_url": "%s/ext.zip"},
					{"name": "checksums.txt", "browser_download_url": "%s/checksums.txt"}
				]
			}`, ts.URL, ts.URL, ts.URL)
		case "/bin.zip":
			_, _ = w.Write(binZip)
		case "/ext.zip":
			_, _ = w.Write(extZip)
		case "/checksums.txt":
			// Valid binary hash, intentionally mismatched extension hash
			_, _ = fmt.Fprintf(w, "%s instavault-test.zip\n%s instavault-extension.zip\n",
				sha256Hex(binZip), strings.Repeat("0", 64))
		default:
			http.NotFound(w, r)
		}
	}))
	defer ts.Close()

	exePath := filepath.Join(t.TempDir(), "instavault-server")
	_ = os.WriteFile(exePath, []byte("old-bin"), 0755)

	mgr := NewManager(ManagerConfig{
		CurrentVersion: "1.0.0",
		CustomURL:      ts.URL + "/releases",
		HTTPClient:     ts.Client(),
		Stdout:         io.Discard,
	})

	err := mgr.RunCLIUpdate(CLIUpdateOptions{
		ExePath:   exePath,
		Force:     true,
		TempDir:   filepath.Join(t.TempDir(), "upd"),
		AssetName: "instavault-test.zip",
		BinName:   "instavault-server",
	})
	if err == nil || !strings.Contains(err.Error(), "extension SHA256 mismatch") {
		t.Fatalf("expected extension SHA256 mismatch error, got %v", err)
	}
}

func TestManager_RunCLIUpdate_PropagatesPreSelfcheckSnapshotError(t *testing.T) {
	binZip := buildTestZipBytes(t, "instavault-server", []byte("new-binary"))

	var ts *httptest.Server
	ts = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/releases":
			w.Header().Set("Content-Type", "application/json")
			_, _ = fmt.Fprintf(w, `{
				"tag_name": "v2.0.0",
				"published_at": "2026-11-28T00:00:00Z",
				"assets": [
					{"name": "instavault-test.zip", "browser_download_url": "%s/bin.zip"},
					{"name": "checksums.txt", "browser_download_url": "%s/checksums.txt"}
				]
			}`, ts.URL, ts.URL)
		case "/bin.zip":
			_, _ = w.Write(binZip)
		case "/checksums.txt":
			_, _ = fmt.Fprintf(w, "%s instavault-test.zip\n", sha256Hex(binZip))
		default:
			http.NotFound(w, r)
		}
	}))
	defer ts.Close()

	tmp := t.TempDir()
	exePath := filepath.Join(tmp, "instavault-server")
	dbPath := filepath.Join(tmp, "instavault.db")
	_ = os.WriteFile(exePath, []byte("old-bin"), 0755)
	_ = os.WriteFile(dbPath, []byte("dummy-db"), 0644)

	snapErr := errors.New("disk full during VACUUM INTO")
	mgr := NewManager(ManagerConfig{
		CurrentVersion: "1.0.0",
		DBPath:         dbPath,
		CustomURL:      ts.URL + "/releases",
		HTTPClient:     ts.Client(),
		Stdout:         io.Discard,
		SnapshotDB: func(dbPath, backupPath string) error {
			return snapErr
		},
	})

	err := mgr.RunCLIUpdate(CLIUpdateOptions{
		ExePath:   exePath,
		Force:     true,
		TempDir:   filepath.Join(tmp, "upd"),
		AssetName: "instavault-test.zip",
		BinName:   "instavault-server",
	})
	if !errors.Is(err, snapErr) {
		t.Fatalf("expected pre-selfcheck snapshot error to be returned, got %v", err)
	}
}
