package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"instavault-server/internal/downloader"
	"instavault-server/internal/synchub"
	"instavault-server/internal/thumbs"
	"instavault-server/internal/update"
	"instavault-server/internal/vault"
)

type testServerHarness struct {
	handler    http.Handler
	store      *vault.Store
	dl         *downloader.Downloader
	hub        *synchub.Hub
	mediaDir   string
	shutdownCh chan struct{}
}

func newTestServerHarness(t *testing.T, urlValidator func(string) bool) *testServerHarness {
	t.Helper()
	tmp := t.TempDir()
	dbPath := filepath.Join(tmp, "test.db")
	mediaDir := filepath.Join(tmp, "media")
	backupsDir := filepath.Join(tmp, "backups")
	if err := os.MkdirAll(mediaDir, 0755); err != nil {
		t.Fatalf("mkdir media: %v", err)
	}

	store, err := vault.Open(vault.Options{
		DBPath:          dbPath,
		BackupsDir:      backupsDir,
		DefaultBaseDir:  mediaDir,
		FolderStructure: "profile",
		AppVersion:      "1.0.0",
	})
	if err != nil {
		t.Fatalf("vault.Open: %v", err)
	}
	t.Cleanup(func() {
		_ = store.Close()
	})

	hub := synchub.New(synchub.Options{})
	dl := downloader.New(downloader.Options{
		Store:        store,
		Progress:     hub,
		URLValidator: urlValidator,
	})
	updater := update.NewManager(update.ManagerConfig{
		CurrentVersion: "1.0.0",
		DataDir:        tmp,
	})

	shutdownCh := make(chan struct{}, 1)
	handler := NewServer(ServerConfig{
		Host:                "localhost",
		Port:                19201,
		Version:             "1.0.0",
		MinExtensionVersion: "1.0.0",
		DataDir:             tmp,
		UIFS:                uiFS,
		OnShutdown: func() {
			select {
			case shutdownCh <- struct{}{}:
			default:
			}
		},
	}, store, dl, hub, updater)

	return &testServerHarness{
		handler:    handler,
		store:      store,
		dl:         dl,
		hub:        hub,
		mediaDir:   mediaDir,
		shutdownCh: shutdownCh,
	}
}

func TestServer_HostValidationMiddleware(t *testing.T) {
	h := newTestServerHarness(t, nil)

	reqEvil := httptest.NewRequest(http.MethodGet, "http://evil.example/api/ping", nil)
	reqEvil.Host = "evil.example:19201"
	recEvil := httptest.NewRecorder()
	h.handler.ServeHTTP(recEvil, reqEvil)
	if recEvil.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for invalid Host header, got %d", recEvil.Code)
	}

	reqOK := httptest.NewRequest(http.MethodGet, "http://localhost:19201/api/ping", nil)
	recOK := httptest.NewRecorder()
	h.handler.ServeHTTP(recOK, reqOK)
	if recOK.Code != http.StatusOK {
		t.Fatalf("expected 200 for localhost Host header, got %d", recOK.Code)
	}
}

func TestServer_CSRFAndCORS(t *testing.T) {
	h := newTestServerHarness(t, nil)

	// Evil Origin on POST -> 403
	reqBadOrigin := httptest.NewRequest(http.MethodPost, "http://localhost:19201/api/sync/start", bytes.NewBufferString(`{"username":"natgeo"}`))
	reqBadOrigin.Header.Set("Origin", "https://evil.example")
	recBadOrigin := httptest.NewRecorder()
	h.handler.ServeHTTP(recBadOrigin, reqBadOrigin)
	if recBadOrigin.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for evil Origin on POST, got %d", recBadOrigin.Code)
	}

	// Non-loopback POST without Origin -> 403
	reqNonLoopback := httptest.NewRequest(http.MethodPost, "http://localhost:19201/api/sync/start", bytes.NewBufferString(`{"username":"natgeo"}`))
	reqNonLoopback.RemoteAddr = "198.51.100.10:54321"
	recNonLoopback := httptest.NewRecorder()
	h.handler.ServeHTTP(recNonLoopback, reqNonLoopback)
	if recNonLoopback.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for non-loopback POST without Origin, got %d", recNonLoopback.Code)
	}

	// Allowed Origin echoed on GET (never "*")
	reqCORS := httptest.NewRequest(http.MethodGet, "http://localhost:19201/api/stats", nil)
	reqCORS.Header.Set("Origin", "http://localhost:19201")
	recCORS := httptest.NewRecorder()
	h.handler.ServeHTTP(recCORS, reqCORS)
	if recCORS.Code != http.StatusOK || recCORS.Header().Get("Access-Control-Allow-Origin") != "http://localhost:19201" {
		t.Fatalf("expected 200 with echoed ACAO, got %d %q", recCORS.Code, recCORS.Header().Get("Access-Control-Allow-Origin"))
	}

	// Evil OPTIONS preflight -> 403
	reqOpt := httptest.NewRequest(http.MethodOptions, "http://localhost:19201/api/stats", nil)
	reqOpt.Header.Set("Origin", "https://evil.example")
	recOpt := httptest.NewRecorder()
	h.handler.ServeHTTP(recOpt, reqOpt)
	if recOpt.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for evil OPTIONS preflight, got %d", recOpt.Code)
	}
}

func TestServer_MediaPathTraversalGuard(t *testing.T) {
	h := newTestServerHarness(t, nil)

	safeFile := filepath.Join(h.mediaDir, "ok.txt")
	if err := os.WriteFile(safeFile, []byte("hello"), 0644); err != nil {
		t.Fatal(err)
	}

	// Traversal must be rejected directly by NewServer with 403 Forbidden
	reqBad := httptest.NewRequest(http.MethodGet, "http://localhost:19201/api/media/../../etc/passwd", nil)
	recBad := httptest.NewRecorder()
	h.handler.ServeHTTP(recBad, reqBad)
	if recBad.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for /api/media/ traversal, got %d", recBad.Code)
	}

	// Valid file inside baseDir must succeed with 200
	reqOK := httptest.NewRequest(http.MethodGet, "http://localhost:19201/api/media/ok.txt", nil)
	recOK := httptest.NewRecorder()
	h.handler.ServeHTTP(recOK, reqOK)
	if recOK.Code != http.StatusOK || recOK.Body.String() != "hello" {
		t.Fatalf("expected 200 'hello', got %d %q", recOK.Code, recOK.Body.String())
	}
}

func TestServer_ShutdownBusyAndDrainingConflict(t *testing.T) {
	started := make(chan struct{})
	release := make(chan struct{})
	mediaServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		close(started)
		<-release
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write([]byte("img"))
	}))
	defer mediaServer.Close()

	h := newTestServerHarness(t, func(string) bool { return true })

	// Start an in-flight download via /api/download
	var dlStatus atomic.Int32
	dlDone := make(chan struct{})
	go func() {
		defer close(dlDone)
		body, _ := json.Marshal(downloader.Request{
			Username:  "alice",
			Shortcode: "SC_BUSY",
			URL:       mediaServer.URL + "/a.jpg",
			Filename:  "a.jpg",
		})
		req := httptest.NewRequest(http.MethodPost, "http://localhost:19201/api/download", bytes.NewReader(body))
		req.RemoteAddr = "127.0.0.1:12345"
		rec := httptest.NewRecorder()
		h.handler.ServeHTTP(rec, req)
		dlStatus.Store(int32(rec.Code))
	}()

	<-started

	// Shutdown with reason=update must return 409 Conflict while download is active
	reqBusy := httptest.NewRequest(http.MethodPost, "http://localhost:19201/api/shutdown?reason=update", nil)
	reqBusy.RemoteAddr = "127.0.0.1:12345"
	recBusy := httptest.NewRecorder()
	h.handler.ServeHTTP(recBusy, reqBusy)
	if recBusy.Code != http.StatusConflict {
		t.Fatalf("expected 409 Conflict during active download, got %d: %s", recBusy.Code, recBusy.Body.String())
	}

	// Let download finish
	close(release)
	<-dlDone
	if dlStatus.Load() != http.StatusOK {
		t.Fatalf("expected in-flight download to succeed with 200, got %d", dlStatus.Load())
	}

	// Now idle: shutdown with reason=update succeeds and puts server into draining mode
	reqIdle := httptest.NewRequest(http.MethodPost, "http://localhost:19201/api/shutdown?reason=update", nil)
	reqIdle.RemoteAddr = "127.0.0.1:12345"
	recIdle := httptest.NewRecorder()
	h.handler.ServeHTTP(recIdle, reqIdle)
	if recIdle.Code != http.StatusOK {
		t.Fatalf("expected 200 for idle shutdown, got %d: %s", recIdle.Code, recIdle.Body.String())
	}

	// Subsequent /api/download while draining must be rejected with 503
	body2, _ := json.Marshal(downloader.Request{
		Username:  "alice",
		Shortcode: "SC_AFTER",
		URL:       mediaServer.URL + "/b.jpg",
		Filename:  "b.jpg",
	})
	reqAfter := httptest.NewRequest(http.MethodPost, "http://localhost:19201/api/download", bytes.NewReader(body2))
	reqAfter.RemoteAddr = "127.0.0.1:12345"
	recAfter := httptest.NewRecorder()
	h.handler.ServeHTTP(recAfter, reqAfter)
	if recAfter.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 while draining, got %d: %s", recAfter.Code, recAfter.Body.String())
	}
}

func TestServer_SSEAndSyncStart(t *testing.T) {
	h := newTestServerHarness(t, nil)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sseReq := httptest.NewRequest(http.MethodGet, "http://localhost:19201/api/events", nil).WithContext(ctx)
	sseRec := httptest.NewRecorder()

	done := make(chan struct{})
	go func() {
		h.handler.ServeHTTP(sseRec, sseReq)
		close(done)
	}()

	time.Sleep(40 * time.Millisecond)

	startReq := httptest.NewRequest(http.MethodPost, "http://localhost:19201/api/sync/start", bytes.NewBufferString(`{"username":"natgeo","stage":"preparing"}`))
	startReq.RemoteAddr = "127.0.0.1:12345"
	startRec := httptest.NewRecorder()
	h.handler.ServeHTTP(startRec, startReq)
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

func TestServer_DeleteDownloadAndVerifyDir(t *testing.T) {
	h := newTestServerHarness(t, nil)

	_ = h.store.RecordDownload("SC1", "user1", "a.jpg", filepath.Join(h.mediaDir, "a.jpg"), 100)
	list, err := h.store.ListDownloads("user1", 1, 10)
	if err != nil || len(list) != 1 {
		t.Fatalf("expected 1 download, got %v err=%v", list, err)
	}
	idStr := strconv.Itoa(list[0].ID)

	// Valid DELETE -> 200
	req := httptest.NewRequest(http.MethodDelete, "http://localhost:19201/api/downloads/"+idStr, nil)
	req.RemoteAddr = "127.0.0.1:12345"
	rec := httptest.NewRecorder()
	h.handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	// Second DELETE -> 404
	req2 := httptest.NewRequest(http.MethodDelete, "http://localhost:19201/api/downloads/"+idStr, nil)
	req2.RemoteAddr = "127.0.0.1:12345"
	rec2 := httptest.NewRecorder()
	h.handler.ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec2.Code)
	}

	// Invalid ID -> 400
	req3 := httptest.NewRequest(http.MethodDelete, "http://localhost:19201/api/downloads/abc", nil)
	req3.RemoteAddr = "127.0.0.1:12345"
	rec3 := httptest.NewRecorder()
	h.handler.ServeHTTP(rec3, req3)
	if rec3.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec3.Code)
	}

	// Verify-dir endpoint
	existing := t.TempDir()
	raw, _ := json.Marshal(map[string]string{"path": existing})
	reqDir := httptest.NewRequest(http.MethodPost, "http://localhost:19201/api/settings/verify-dir", bytes.NewReader(raw))
	reqDir.RemoteAddr = "127.0.0.1:12345"
	recDir := httptest.NewRecorder()
	h.handler.ServeHTTP(recDir, reqDir)
	var resp map[string]any
	if err := json.Unmarshal(recDir.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode verify-dir: %v", err)
	}
	if resp["valid"] != true || resp["exists"] != true {
		t.Fatalf("expected valid=true exists=true, got %+v", resp)
	}
}

func TestServer_DatabaseExportAndImportHTTP(t *testing.T) {
	h := newTestServerHarness(t, nil)
	_ = h.store.RecordDownload("EXP1", "natgeo", "natgeo_1.jpg", filepath.Join(h.mediaDir, "natgeo", "natgeo_1.jpg"), 42)

	// Export
	reqExp := httptest.NewRequest(http.MethodGet, "http://localhost:19201/api/database/export", nil)
	recExp := httptest.NewRecorder()
	h.handler.ServeHTTP(recExp, reqExp)
	if recExp.Code != http.StatusOK {
		t.Fatalf("expected 200 on export, got %d: %s", recExp.Code, recExp.Body.String())
	}
	exportedBytes, _ := io.ReadAll(recExp.Body)
	if !bytes.HasPrefix(exportedBytes, vault.SQLiteFileMagic) {
		t.Fatalf("expected SQLite magic header on export")
	}

	// Import into a fresh server
	h2 := newTestServerHarness(t, nil)
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	_ = mw.WriteField("mode", "replace")
	fw, err := mw.CreateFormFile("file", "backup.db")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = fw.Write(exportedBytes)
	_ = mw.Close()

	reqImp := httptest.NewRequest(http.MethodPost, "http://localhost:19201/api/database/import", &buf)
	reqImp.RemoteAddr = "127.0.0.1:12345"
	reqImp.Header.Set("Content-Type", mw.FormDataContentType())
	recImp := httptest.NewRecorder()
	h2.handler.ServeHTTP(recImp, reqImp)
	if recImp.Code != http.StatusOK {
		t.Fatalf("expected 200 on import, got %d: %s", recImp.Code, recImp.Body.String())
	}
	var impRes vault.ImportResult
	if err := json.Unmarshal(recImp.Body.Bytes(), &impRes); err != nil {
		t.Fatal(err)
	}
	if impRes.TotalDownloads != 1 {
		t.Fatalf("expected 1 imported download, got %+v", impRes)
	}
}

type stubThumbExtractor struct {
	payload []byte
	err     error
}

func (s *stubThumbExtractor) ExtractFrame(_ context.Context, _, outThumbPath string) error {
	if s.err != nil {
		return s.err
	}
	return os.WriteFile(outThumbPath, s.payload, 0644)
}

func TestServer_MediaHeadAndThumbEndpoint(t *testing.T) {
	h := newTestServerHarness(t, nil)

	videoRel := "alice/clip.mp4"
	videoPath := filepath.Join(h.mediaDir, filepath.FromSlash(videoRel))
	if err := os.MkdirAll(filepath.Dir(videoPath), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(videoPath, []byte("fake-mp4-bytes"), 0644); err != nil {
		t.Fatal(err)
	}

	// HEAD /api/media/ must succeed with 200 and Content-Length, empty body
	reqHead := httptest.NewRequest(http.MethodHead, "http://localhost:19201/api/media/"+videoRel, nil)
	recHead := httptest.NewRecorder()
	h.handler.ServeHTTP(recHead, reqHead)
	if recHead.Code != http.StatusOK {
		t.Fatalf("expected 200 for HEAD /api/media/, got %d", recHead.Code)
	}
	if recHead.Header().Get("Content-Length") != strconv.Itoa(len("fake-mp4-bytes")) {
		t.Fatalf("expected Content-Length=%d, got %q", len("fake-mp4-bytes"), recHead.Header().Get("Content-Length"))
	}
	if recHead.Body.Len() != 0 {
		t.Fatalf("expected empty body for HEAD, got %d bytes", recHead.Body.Len())
	}

	// POST /api/media/ -> 405
	reqPost := httptest.NewRequest(http.MethodPost, "http://localhost:19201/api/media/"+videoRel, nil)
	reqPost.RemoteAddr = "127.0.0.1:12345"
	recPost := httptest.NewRecorder()
	h.handler.ServeHTTP(recPost, reqPost)
	if recPost.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405 for POST /api/media/, got %d", recPost.Code)
	}

	// Traversal on /api/thumb/ -> 403
	reqBad := httptest.NewRequest(http.MethodGet, "http://localhost:19201/api/thumb/../../etc/passwd", nil)
	recBad := httptest.NewRecorder()
	h.handler.ServeHTTP(recBad, reqBad)
	if recBad.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for /api/thumb/ traversal, got %d", recBad.Code)
	}

	// Default harness has Thumbs == nil -> 501 Not Implemented
	reqNoThumb := httptest.NewRequest(http.MethodGet, "http://localhost:19201/api/thumb/"+videoRel, nil)
	recNoThumb := httptest.NewRecorder()
	h.handler.ServeHTTP(recNoThumb, reqNoThumb)
	if recNoThumb.Code != http.StatusNotImplemented {
		t.Fatalf("expected 501 when Thumbs nil, got %d", recNoThumb.Code)
	}

	// Harness with stubbed Extractor returning ErrUnavailable -> 501
	unavailHandler := NewServer(ServerConfig{
		Host:   "localhost",
		Port:   19201,
		Thumbs: thumbs.New(thumbs.Options{CacheDir: t.TempDir(), Extractor: &stubThumbExtractor{err: thumbs.ErrUnavailable}}),
	}, h.store, h.dl, h.hub, update.NewManager(update.ManagerConfig{DataDir: t.TempDir()}))
	reqUnavail := httptest.NewRequest(http.MethodGet, "http://localhost:19201/api/thumb/"+videoRel, nil)
	recUnavail := httptest.NewRecorder()
	unavailHandler.ServeHTTP(recUnavail, reqUnavail)
	if recUnavail.Code != http.StatusNotImplemented {
		t.Fatalf("expected 501 on ErrUnavailable, got %d", recUnavail.Code)
	}

	// Harness with working Extractor -> 200 image/jpeg and 404 on missing source
	okHandler := NewServer(ServerConfig{
		Host:   "localhost",
		Port:   19201,
		Thumbs: thumbs.New(thumbs.Options{CacheDir: t.TempDir(), Extractor: &stubThumbExtractor{payload: []byte("\xff\xd8\xff\xe0jpeg")}}),
	}, h.store, h.dl, h.hub, update.NewManager(update.ManagerConfig{DataDir: t.TempDir()}))

	reqThumb := httptest.NewRequest(http.MethodGet, "http://localhost:19201/api/thumb/"+videoRel, nil)
	recThumb := httptest.NewRecorder()
	okHandler.ServeHTTP(recThumb, reqThumb)
	if recThumb.Code != http.StatusOK || recThumb.Header().Get("Content-Type") != "image/jpeg" || !bytes.Equal(recThumb.Body.Bytes(), []byte("\xff\xd8\xff\xe0jpeg")) {
		t.Fatalf("expected 200 image/jpeg thumb, got %d %q %q", recThumb.Code, recThumb.Header().Get("Content-Type"), recThumb.Body.String())
	}

	reqMiss := httptest.NewRequest(http.MethodGet, "http://localhost:19201/api/thumb/alice/missing.mp4", nil)
	recMiss := httptest.NewRecorder()
	okHandler.ServeHTTP(recMiss, reqMiss)
	if recMiss.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for missing media thumb, got %d", recMiss.Code)
	}
}
