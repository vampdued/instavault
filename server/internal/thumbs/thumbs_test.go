package thumbs

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

type stubExtractor struct {
	calls     atomic.Int32
	inFlight  atomic.Int32
	maxActive atomic.Int32
	delay     time.Duration
	err       error
	payload   []byte
}

func (s *stubExtractor) ExtractFrame(ctx context.Context, mediaPath, outThumbPath string) error {
	cur := s.inFlight.Add(1)
	for {
		prev := s.maxActive.Load()
		if cur <= prev || s.maxActive.CompareAndSwap(prev, cur) {
			break
		}
	}
	defer s.inFlight.Add(-1)

	s.calls.Add(1)
	if s.delay > 0 {
		select {
		case <-time.After(s.delay):
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	if s.err != nil {
		return s.err
	}
	data := s.payload
	if len(data) == 0 {
		data = []byte("fake-jpeg-data")
	}
	return os.WriteFile(outThumbPath, data, 0644)
}

func TestGenerator_CachesAndInvalidatesOnModTimeOrSize(t *testing.T) {
	tmp := t.TempDir()
	cacheDir := filepath.Join(tmp, "thumbs")
	mediaPath := filepath.Join(tmp, "alice_1.mp4")

	if err := os.WriteFile(mediaPath, []byte("video-v1"), 0644); err != nil {
		t.Fatal(err)
	}

	ext := &stubExtractor{payload: []byte("thumb-v1")}
	gen := New(Options{CacheDir: cacheDir, Extractor: ext})

	p1, err := gen.Thumbnail(context.Background(), "alice/alice_1.mp4", mediaPath)
	if err != nil {
		t.Fatalf("first Thumbnail: %v", err)
	}
	if ext.calls.Load() != 1 {
		t.Fatalf("expected 1 extraction call, got %d", ext.calls.Load())
	}

	// Second call hits disk cache without invoking extractor.
	p2, err := gen.Thumbnail(context.Background(), "alice/alice_1.mp4", mediaPath)
	if err != nil {
		t.Fatalf("cached Thumbnail: %v", err)
	}
	if p2 != p1 || ext.calls.Load() != 1 {
		t.Fatalf("expected cache hit at %q with 1 total call, got %q (%d calls)", p1, p2, ext.calls.Load())
	}

	// Simulate force re-download (new size and modTime): cache key must change and re-extract.
	ext.payload = []byte("thumb-v2")
	if err := os.WriteFile(mediaPath, []byte("video-v2-longer"), 0644); err != nil {
		t.Fatal(err)
	}
	future := time.Now().Add(2 * time.Second)
	_ = os.Chtimes(mediaPath, future, future)

	p3, err := gen.Thumbnail(context.Background(), "alice/alice_1.mp4", mediaPath)
	if err != nil {
		t.Fatalf("invalidated Thumbnail: %v", err)
	}
	if p3 == p1 {
		t.Fatalf("expected new cache path after file update, still got %q", p3)
	}
	if ext.calls.Load() != 2 {
		t.Fatalf("expected 2 extraction calls after invalidation, got %d", ext.calls.Load())
	}
	got, _ := os.ReadFile(p3)
	if string(got) != "thumb-v2" {
		t.Fatalf("expected updated thumbnail bytes, got %q", string(got))
	}
}

func TestGenerator_DeduplicatesInFlightSameKey(t *testing.T) {
	tmp := t.TempDir()
	cacheDir := filepath.Join(tmp, "thumbs")
	mediaPath := filepath.Join(tmp, "clip.mp4")
	if err := os.WriteFile(mediaPath, []byte("video"), 0644); err != nil {
		t.Fatal(err)
	}

	ext := &stubExtractor{delay: 50 * time.Millisecond}
	gen := New(Options{CacheDir: cacheDir, Extractor: ext, MaxConcurrent: 4})

	const callers = 8
	var wg sync.WaitGroup
	paths := make([]string, callers)
	errs := make([]error, callers)

	for i := 0; i < callers; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			paths[idx], errs[idx] = gen.Thumbnail(context.Background(), "user/clip.mp4", mediaPath)
		}(i)
	}
	wg.Wait()

	if ext.calls.Load() != 1 {
		t.Fatalf("expected per-key dedup to run extractor once, got %d", ext.calls.Load())
	}
	for i := 0; i < callers; i++ {
		if errs[i] != nil {
			t.Fatalf("caller %d failed: %v", i, errs[i])
		}
		if paths[i] != paths[0] {
			t.Fatalf("caller %d got path %q, want %q", i, paths[i], paths[0])
		}
	}
}

func TestGenerator_BoundsConcurrencyAcrossDistinctKeys(t *testing.T) {
	tmp := t.TempDir()
	cacheDir := filepath.Join(tmp, "thumbs")

	ext := &stubExtractor{delay: 40 * time.Millisecond}
	gen := New(Options{CacheDir: cacheDir, Extractor: ext, MaxConcurrent: 2})

	const count = 6
	var wg sync.WaitGroup
	for i := 0; i < count; i++ {
		name := "clip_" + string(rune('a'+i)) + ".mp4"
		p := filepath.Join(tmp, name)
		if err := os.WriteFile(p, []byte(name), 0644); err != nil {
			t.Fatal(err)
		}
		wg.Add(1)
		go func(rel, full string) {
			defer wg.Done()
			if _, err := gen.Thumbnail(context.Background(), rel, full); err != nil {
				t.Errorf("Thumbnail(%s): %v", rel, err)
			}
		}(name, p)
	}
	wg.Wait()

	if ext.calls.Load() != count {
		t.Fatalf("expected %d extractions, got %d", count, ext.calls.Load())
	}
	if ext.maxActive.Load() > 2 {
		t.Fatalf("concurrency semaphore exceeded limit 2: max active was %d", ext.maxActive.Load())
	}
}

func TestFFmpegExtractor_UnavailableReturnsErrUnavailable(t *testing.T) {
	ext := &FFmpegExtractor{
		LookPath: func(string) (string, error) {
			return "", errors.New("executable file not found in %PATH%")
		},
	}
	err := ext.ExtractFrame(context.Background(), "a.mp4", filepath.Join(t.TempDir(), "out.jpg"))
	if !errors.Is(err, ErrUnavailable) {
		t.Fatalf("expected ErrUnavailable, got %v", err)
	}
}
