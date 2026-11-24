package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
)

func setupTestEnv(t *testing.T) string {
	t.Helper()
	tmp := t.TempDir()
	dbPath := filepath.Join(tmp, "test.db")
	mediaDir := filepath.Join(tmp, "media")
	if err := os.MkdirAll(mediaDir, 0755); err != nil {
		t.Fatalf("mkdir media: %v", err)
	}
	if err := initDB(dbPath, ""); err != nil {
		t.Fatalf("initDB: %v", err)
	}
	configMu.Lock()
	baseDir = mediaDir
	folderStructure = "profile"
	configMu.Unlock()

	t.Cleanup(func() {
		if db != nil {
			_ = db.Close()
		}
	})
	return mediaDir
}

func TestIsAlreadyDownloaded_ExactAndWebPDedup(t *testing.T) {
	mediaDir := setupTestEnv(t)
	userDir := filepath.Join(mediaDir, "natgeo")
	if err := os.MkdirAll(userDir, 0755); err != nil {
		t.Fatal(err)
	}

	webpPath := filepath.Join(userDir, "natgeo_C8xABC123.webp")
	if err := os.WriteFile(webpPath, []byte("fake-webp"), 0644); err != nil {
		t.Fatal(err)
	}
	recordDownload("C8xABC123", "natgeo", "natgeo_C8xABC123.webp", webpPath, 9)

	// Exact match
	if ok, p := isAlreadyDownloaded("C8xABC123", "natgeo_C8xABC123.webp"); !ok || p != webpPath {
		t.Fatalf("expected exact dedup match, got ok=%v path=%q", ok, p)
	}

	// Stem match when extension requests .jpg but saved file was rewritten to .webp
	if ok, p := isAlreadyDownloaded("C8xABC123", "natgeo_C8xABC123.jpg"); !ok || p != webpPath {
		t.Fatalf("expected .jpg -> .webp stem dedup match, got ok=%v path=%q", ok, p)
	}

	// Different carousel slide stem must NOT false-match
	if ok, _ := isAlreadyDownloaded("C8xABC123", "natgeo_C8xABC123_2.jpg"); ok {
		t.Fatalf("unexpected dedup match for distinct carousel slide")
	}

	// Missing file on disk should still prevent duplicate downloads (DB-authoritative dedup for cross-PC backups)
	_ = os.Remove(webpPath)
	if ok, _ := isAlreadyDownloaded("C8xABC123", "natgeo_C8xABC123.jpg"); !ok {
		t.Fatalf("expected true even when saved file was removed from disk")
	}
}

func TestHandleDeleteDownload(t *testing.T) {
	mediaDir := setupTestEnv(t)
	p := filepath.Join(mediaDir, "a.jpg")
	recordDownload("SC1", "user1", "a.jpg", p, 100)

	var id int
	if err := db.QueryRow(`SELECT id FROM downloads WHERE shortcode='SC1'`).Scan(&id); err != nil {
		t.Fatalf("query inserted id: %v", err)
	}

	// Valid DELETE -> 200
	req := httptest.NewRequest(http.MethodDelete, "/api/downloads/"+strconv.Itoa(id), nil)
	rec := httptest.NewRecorder()
	handleDeleteDownload(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	// Deleting same ID again -> 404
	req2 := httptest.NewRequest(http.MethodDelete, "/api/downloads/"+strconv.Itoa(id), nil)
	rec2 := httptest.NewRecorder()
	handleDeleteDownload(rec2, req2)
	if rec2.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for missing id, got %d", rec2.Code)
	}

	// Invalid ID -> 400
	req3 := httptest.NewRequest(http.MethodDelete, "/api/downloads/abc", nil)
	rec3 := httptest.NewRecorder()
	handleDeleteDownload(rec3, req3)
	if rec3.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid id, got %d", rec3.Code)
	}
}

func TestCORSAndOriginValidation(t *testing.T) {
	validOrigins := []string{
		"http://localhost:19201",
		"http://127.0.0.1:19202",
		"chrome-extension://abcdefghijklmnopabcdefghijklmnop",
	}
	for _, o := range validOrigins {
		if !isAllowedOrigin(o) {
			t.Errorf("expected origin %q to be allowed", o)
		}
	}

	invalidOrigins := []string{
		"",
		"https://evil.example",
		"http://localhost.evil.com",
		"chrome-extension://not-a-valid-id",
		"javascript://localhost",
	}
	for _, o := range invalidOrigins {
		if isAllowedOrigin(o) {
			t.Errorf("expected origin %q to be rejected", o)
		}
	}

	handler := withCORS(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Allowed origin gets echoed (never "*")
	reqOK := httptest.NewRequest(http.MethodGet, "/api/stats", nil)
	reqOK.Header.Set("Origin", "http://localhost:19201")
	recOK := httptest.NewRecorder()
	handler(recOK, reqOK)
	if got := recOK.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:19201" {
		t.Fatalf("expected echoed origin, got %q", got)
	}

	// Disallowed origin gets no ACAO header on GET and 403 on OPTIONS
	reqBad := httptest.NewRequest(http.MethodGet, "/api/stats", nil)
	reqBad.Header.Set("Origin", "https://evil.example")
	recBad := httptest.NewRecorder()
	handler(recBad, reqBad)
	if got := recBad.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("expected empty ACAO for evil origin, got %q", got)
	}

	reqOpt := httptest.NewRequest(http.MethodOptions, "/api/stats", nil)
	reqOpt.Header.Set("Origin", "https://evil.example")
	recOpt := httptest.NewRecorder()
	handler(recOpt, reqOpt)
	if recOpt.Code != http.StatusForbidden {
		t.Fatalf("expected 403 on evil OPTIONS preflight, got %d", recOpt.Code)
	}
}

func TestIsAllowedMediaURL(t *testing.T) {
	allowed := []string{
		"https://scontent-iad3-1.cdninstagram.com/v/t51.2885-15/abc.jpg",
		"https://video.fbcdn.net/v/t50.2886-16/reel.mp4",
		"https://www.instagram.com/media/foo.jpg",
	}
	for _, u := range allowed {
		if !isAllowedMediaURL(u) {
			t.Errorf("expected media URL %q to be allowed", u)
		}
	}

	blocked := []string{
		"http://scontent.cdninstagram.com/a.jpg",
		"http://127.0.0.1:8080/secret",
		"https://169.254.169.254/latest/meta-data/",
		"https://cdninstagram.com.evil.com/x.jpg",
		"file:///etc/passwd",
	}
	for _, u := range blocked {
		if isAllowedMediaURL(u) {
			t.Errorf("expected media URL %q to be blocked", u)
		}
	}
}

func TestMediaPathTraversalGuard(t *testing.T) {
	mediaDir := setupTestEnv(t)
	safeFile := filepath.Join(mediaDir, "ok.txt")
	if err := os.WriteFile(safeFile, []byte("hello"), 0644); err != nil {
		t.Fatal(err)
	}

	mediaHandler := func(w http.ResponseWriter, r *http.Request) {
		cleanBaseDir := filepath.Clean(getBaseDir())
		relReq := filepath.FromSlash(strings.TrimPrefix(r.URL.Path, "/api/media/"))
		if filepath.IsAbs(relReq) {
			http.Error(w, "Access Denied", http.StatusForbidden)
			return
		}
		fullPath := filepath.Clean(filepath.Join(cleanBaseDir, relReq))
		rel, err := filepath.Rel(cleanBaseDir, fullPath)
		if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) || filepath.IsAbs(rel) {
			http.Error(w, "Access Denied", http.StatusForbidden)
			return
		}
		http.ServeFile(w, r, fullPath)
	}

	// Traversal must be rejected with 403
	reqBad := httptest.NewRequest(http.MethodGet, "/api/media/../../etc/passwd", nil)
	recBad := httptest.NewRecorder()
	mediaHandler(recBad, reqBad)
	if recBad.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for traversal, got %d", recBad.Code)
	}

	// Valid file inside baseDir must succeed with 200
	reqOK := httptest.NewRequest(http.MethodGet, "/api/media/ok.txt", nil)
	recOK := httptest.NewRecorder()
	mediaHandler(recOK, reqOK)
	if recOK.Code != http.StatusOK || recOK.Body.String() != "hello" {
		t.Fatalf("expected 200 'hello', got %d %q", recOK.Code, recOK.Body.String())
	}
}

func TestSSEBroadcastAndSyncStart(t *testing.T) {
	_ = setupTestEnv(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sseReq := httptest.NewRequest(http.MethodGet, "/api/events", nil).WithContext(ctx)
	sseRec := httptest.NewRecorder()

	done := make(chan struct{})
	go func() {
		handleEvents(sseRec, sseReq)
		close(done)
	}()

	// Give SSE handler a moment to subscribe
	time.Sleep(40 * time.Millisecond)

	body := bytes.NewBufferString(`{"username":"natgeo","stage":"preparing"}`)
	startReq := httptest.NewRequest(http.MethodPost, "/api/sync/start", body)
	startRec := httptest.NewRecorder()
	handleSyncStart(startRec, startReq)
	if startRec.Code != http.StatusOK {
		t.Fatalf("expected 200 from /api/sync/start, got %d", startRec.Code)
	}

	time.Sleep(40 * time.Millisecond)
	cancel()
	<-done

	out := sseRec.Body.String()
	if !strings.Contains(out, "event: sync") || !strings.Contains(out, `"username":"natgeo"`) || !strings.Contains(out, `"stage":"preparing"`) {
		t.Fatalf("expected SSE stream to contain preparing sync event for natgeo, got: %s", out)
	}
}

func TestHandleVerifyDir(t *testing.T) {
	existing := t.TempDir()
	child := filepath.Join(existing, "new_vault_folder")

	check := func(p string) map[string]any {
		raw, _ := json.Marshal(map[string]string{"path": p})
		req := httptest.NewRequest(http.MethodPost, "/api/settings/verify-dir", bytes.NewReader(raw))
		rec := httptest.NewRecorder()
		handleVerifyDir(rec, req)
		var resp map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("decode verify-dir response: %v", err)
		}
		return resp
	}

	if r := check(existing); r["valid"] != true || r["exists"] != true {
		t.Fatalf("expected existing dir valid=true exists=true, got %+v", r)
	}
	if r := check(child); r["valid"] != true || r["exists"] != false {
		t.Fatalf("expected creatable child dir valid=true exists=false, got %+v", r)
	}
	if r := check("relative/path"); r["valid"] != false {
		t.Fatalf("expected relative path valid=false, got %+v", r)
	}
}
