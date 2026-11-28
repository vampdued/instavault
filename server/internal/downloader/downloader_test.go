package downloader

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

type stubStore struct {
	mu              sync.Mutex
	baseDir         string
	folderStructure string
	downloads       map[string]string // "shortcode|filename" -> localPath
	skips           map[string]string
	deletedKeys     []string
}

func newStubStore(baseDir string) *stubStore {
	return &stubStore{
		baseDir:         baseDir,
		folderStructure: "profile",
		downloads:       make(map[string]string),
		skips:           make(map[string]string),
	}
}

func (s *stubStore) Config() (string, string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.baseDir, s.folderStructure
}

func (s *stubStore) IsAlreadyDownloaded(shortcode, filename string) (bool, string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if p, ok := s.downloads[shortcode+"|"+filename]; ok {
		return true, p
	}
	ext := filepath.Ext(filename)
	if ext != "" {
		stem := strings.TrimSuffix(filename, ext)
		prefix := shortcode + "|" + stem + "."
		for k, p := range s.downloads {
			if strings.HasPrefix(k, prefix) {
				return true, p
			}
		}
	}
	return false, ""
}

func (s *stubStore) RecordDownload(shortcode, username, filename, localPath string, size int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.downloads[shortcode+"|"+filename] = localPath
	delete(s.skips, shortcode+"|"+filename)
	return nil
}

func (s *stubStore) RecordSkip(shortcode, username, filename, localPath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.skips[shortcode+"|"+filename] = localPath
	return nil
}

func (s *stubStore) DeleteForRedownload(shortcode, filename string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := shortcode + "|" + filename
	s.deletedKeys = append(s.deletedKeys, key)
	delete(s.downloads, key)
	delete(s.skips, key)
	return nil
}

type progressEvent struct {
	username  string
	shortcode string
	filename  string
	status    string
	size      int64
	errStr    string
}

type stubProgress struct {
	mu     sync.Mutex
	events []progressEvent
}

func (p *stubProgress) RecordProgress(username, shortcode, filename, status string, size int64, errStr string, activeDownloads int64) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.events = append(p.events, progressEvent{
		username:  username,
		shortcode: shortcode,
		filename:  filename,
		status:    status,
		size:      size,
		errStr:    errStr,
	})
}

type stubMuxer struct {
	failErr error
	called  bool
}

func (m *stubMuxer) Mux(ctx context.Context, videoPath, audioPath, destPath string) error {
	m.called = true
	if m.failErr != nil {
		return m.failErr
	}
	vData, err := os.ReadFile(videoPath)
	if err != nil {
		return err
	}
	var aData []byte
	if audioPath != "" {
		aData, err = os.ReadFile(audioPath)
		if err != nil {
			return err
		}
	}
	return os.WriteFile(destPath, append(vData, aData...), 0644)
}

func allowAllURLs(string) bool { return true }

func TestIsAllowedMediaURL(t *testing.T) {
	allowed := []string{
		"https://scontent-iad3-1.cdninstagram.com/v/t51.2885-15/abc.jpg",
		"https://video.fbcdn.net/v/t50.2886-16/reel.mp4",
		"https://www.instagram.com/media/foo.jpg",
	}
	for _, u := range allowed {
		if !IsAllowedMediaURL(u) {
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
		if IsAllowedMediaURL(u) {
			t.Errorf("expected media URL %q to be blocked", u)
		}
	}
}

func TestDownloader_NormalAndDedup(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write([]byte("jpeg-bytes"))
	}))
	defer ts.Close()

	store := newStubStore(t.TempDir())
	prog := &stubProgress{}
	dl := New(Options{
		Store:        store,
		Progress:     prog,
		HTTPClient:   ts.Client(),
		URLValidator: allowAllURLs,
	})

	req := Request{
		Username:  "natgeo",
		Shortcode: "SC100",
		URL:       ts.URL + "/photo.jpg",
		Filename:  "natgeo_SC100.jpg",
	}

	res, err := dl.Download(context.Background(), req, ModeNormal)
	if err != nil {
		t.Fatalf("Download normal failed: %v", err)
	}
	if res.Status != "downloaded" {
		t.Fatalf("expected status=downloaded, got %+v", res)
	}
	gotBytes, err := os.ReadFile(res.LocalPath)
	if err != nil || string(gotBytes) != "jpeg-bytes" {
		t.Fatalf("unexpected saved file: err=%v content=%q", err, string(gotBytes))
	}

	// Second call with same shortcode+filename should dedup and skip
	res2, err := dl.Download(context.Background(), req, ModeNormal)
	if err != nil {
		t.Fatalf("Download dedup failed: %v", err)
	}
	if res2.Status != "skipped" || res2.LocalPath != res.LocalPath {
		t.Fatalf("expected skipped with existing path, got %+v", res2)
	}
}

func TestDownloader_WebPExtensionRewriteAndDedup(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/webp")
		_, _ = w.Write([]byte("RIFF-webp-payload"))
	}))
	defer ts.Close()

	store := newStubStore(t.TempDir())
	dl := New(Options{
		Store:        store,
		HTTPClient:   ts.Client(),
		URLValidator: allowAllURLs,
	})

	req := Request{
		Username:  "nasa",
		Shortcode: "SCWEBP",
		URL:       ts.URL + "/img.jpg",
		Filename:  "nasa_SCWEBP.jpg",
	}

	res, err := dl.Download(context.Background(), req, ModeNormal)
	if err != nil {
		t.Fatalf("Download webp failed: %v", err)
	}
	if !strings.HasSuffix(res.LocalPath, ".webp") {
		t.Fatalf("expected .jpg to be rewritten to .webp, got %q", res.LocalPath)
	}

	// Subsequent .jpg request should dedup against the saved .webp record
	res2, err := dl.Download(context.Background(), req, ModeNormal)
	if err != nil {
		t.Fatalf("Download webp dedup failed: %v", err)
	}
	if res2.Status != "skipped" || res2.LocalPath != res.LocalPath {
		t.Fatalf("expected webp stem dedup skip, got %+v", res2)
	}
}

func TestDownloader_ForceAndSkipRetry(t *testing.T) {
	payload := "v1"
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write([]byte(payload))
	}))
	defer ts.Close()

	store := newStubStore(t.TempDir())
	dl := New(Options{
		Store:        store,
		HTTPClient:   ts.Client(),
		URLValidator: allowAllURLs,
	})

	req := Request{
		Username:  "alice",
		Shortcode: "SCFORCE",
		URL:       ts.URL + "/a.jpg",
		Filename:  "alice_SCFORCE.jpg",
	}

	if _, err := dl.Download(context.Background(), req, ModeNormal); err != nil {
		t.Fatalf("initial download: %v", err)
	}

	// Force re-download overwrites with v2
	payload = "v2-forced"
	resForce, err := dl.Download(context.Background(), req, ModeForce)
	if err != nil || resForce.Status != "downloaded" {
		t.Fatalf("force download failed: res=%+v err=%v", resForce, err)
	}
	got, _ := os.ReadFile(resForce.LocalPath)
	if string(got) != "v2-forced" {
		t.Fatalf("expected v2-forced on disk, got %q", string(got))
	}

	// Skip-retry clears prior skip and downloads v3
	_ = store.RecordSkip(req.Shortcode, req.Username, req.Filename, resForce.LocalPath)
	payload = "v3-retried"
	resRetry, err := dl.Download(context.Background(), req, ModeSkipRetry)
	if err != nil || resRetry.Status != "downloaded" {
		t.Fatalf("skip-retry failed: res=%+v err=%v", resRetry, err)
	}
	got3, _ := os.ReadFile(resRetry.LocalPath)
	if string(got3) != "v3-retried" {
		t.Fatalf("expected v3-retried on disk, got %q", string(got3))
	}
}

func TestDownloader_DashMuxAndFallback(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/video.mp4":
			_, _ = w.Write([]byte("VIDEO-"))
		case "/audio.m4a":
			_, _ = w.Write([]byte("AUDIO"))
		case "/progressive.mp4":
			_, _ = w.Write([]byte("PROGRESSIVE-FALLBACK"))
		default:
			http.NotFound(w, r)
		}
	}))
	defer ts.Close()

	// 1. Successful DASH mux
	store := newStubStore(t.TempDir())
	muxerOK := &stubMuxer{}
	dl := New(Options{
		Store:        store,
		Muxer:        muxerOK,
		HTTPClient:   ts.Client(),
		URLValidator: allowAllURLs,
	})

	req := Request{
		Username:     "reeluser",
		Shortcode:    "SCDASH1",
		URL:          ts.URL + "/progressive.mp4",
		DashVideoURL: ts.URL + "/video.mp4",
		DashAudioURL: ts.URL + "/audio.m4a",
		Filename:     "reel1.mp4",
		FileExt:      "mp4",
	}
	res, err := dl.Download(context.Background(), req, ModeNormal)
	if err != nil || res.Status != "downloaded" || !muxerOK.called {
		t.Fatalf("expected successful DASH mux, got res=%+v err=%v called=%v", res, err, muxerOK.called)
	}
	data, _ := os.ReadFile(res.LocalPath)
	if string(data) != "VIDEO-AUDIO" {
		t.Fatalf("expected muxed VIDEO-AUDIO, got %q", string(data))
	}

	// 2. DASH mux failure falls back to progressive stream
	muxerFail := &stubMuxer{failErr: errors.New("ffmpeg unavailable")}
	dlFallback := New(Options{
		Store:        newStubStore(t.TempDir()),
		Muxer:        muxerFail,
		HTTPClient:   ts.Client(),
		URLValidator: allowAllURLs,
	})
	res2, err := dlFallback.Download(context.Background(), req, ModeNormal)
	if err != nil || res2.Status != "downloaded" || !muxerFail.called {
		t.Fatalf("expected DASH fallback to progressive stream, got res=%+v err=%v", res2, err)
	}
	data2, _ := os.ReadFile(res2.LocalPath)
	if string(data2) != "PROGRESSIVE-FALLBACK" {
		t.Fatalf("expected PROGRESSIVE-FALLBACK, got %q", string(data2))
	}
}

func TestDownloader_DrainingRejection(t *testing.T) {
	started := make(chan struct{})
	release := make(chan struct{})
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		close(started)
		<-release
		_, _ = w.Write([]byte("done"))
	}))
	defer ts.Close()

	dl := New(Options{
		Store:        newStubStore(t.TempDir()),
		HTTPClient:   ts.Client(),
		URLValidator: allowAllURLs,
	})

	req := Request{
		Username:  "alice",
		Shortcode: "SCSLOW",
		URL:       ts.URL + "/slow.jpg",
		Filename:  "slow.jpg",
	}

	done := make(chan error, 1)
	go func() {
		_, err := dl.Download(context.Background(), req, ModeNormal)
		done <- err
	}()

	<-started

	// BeginDraining must fail while a download is active
	if active, ok := dl.BeginDraining(); ok || active != 1 {
		t.Fatalf("expected BeginDraining to reject with active=1, got active=%d ok=%v", active, ok)
	}
	if dl.IsDraining() {
		t.Fatalf("expected IsDraining=false after rejected BeginDraining")
	}

	close(release)
	if err := <-done; err != nil {
		t.Fatalf("in-flight download failed: %v", err)
	}

	// Now idle -> BeginDraining succeeds
	if active, ok := dl.BeginDraining(); !ok || active != 0 {
		t.Fatalf("expected BeginDraining to succeed when idle, got active=%d ok=%v", active, ok)
	}

	// Subsequent download is rejected with ErrDraining
	_, err := dl.Download(context.Background(), req, ModeNormal)
	if !errors.Is(err, ErrDraining) {
		t.Fatalf("expected ErrDraining while draining, got %v", err)
	}
}
