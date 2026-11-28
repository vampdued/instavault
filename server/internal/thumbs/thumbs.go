package thumbs

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	defaultMaxConcurrent  = 3
	defaultExtractTimeout = 15 * time.Second
)

// ErrUnavailable is returned when ffmpeg is not installed or thumbnail extraction is disabled.
var ErrUnavailable = errors.New("thumbnail extractor unavailable (ffmpeg not found)")

// Extractor writes a JPEG thumbnail frame for mediaPath to outThumbPath.
type Extractor interface {
	ExtractFrame(ctx context.Context, mediaPath, outThumbPath string) error
}

// FFmpegExtractor extracts single JPEG poster frames using ffmpeg.
type FFmpegExtractor struct {
	ConfigureCmd func(*exec.Cmd)
	LookPath     func(file string) (string, error)
}

// ExtractFrame extracts a scaled first-frame JPEG from mediaPath to outThumbPath.
// It tries seeking slightly past potential black intro frames (-ss 0.1) and falls
// back to frame 0 for ultra-short clips.
func (e *FFmpegExtractor) ExtractFrame(ctx context.Context, mediaPath, outThumbPath string) error {
	lookPath := e.LookPath
	if lookPath == nil {
		lookPath = exec.LookPath
	}
	ffmpegPath, err := lookPath("ffmpeg")
	if err != nil {
		return fmt.Errorf("%w: %v", ErrUnavailable, err)
	}

	run := func(seek string) error {
		args := []string{"-y", "-hide_banner", "-loglevel", "error"}
		if seek != "" {
			args = append(args, "-ss", seek)
		}
		args = append(args,
			"-i", mediaPath,
			"-frames:v", "1",
			"-q:v", "4",
			"-vf", "scale='min(640,iw)':-2",
			"-f", "image2",
			"-vcodec", "mjpeg",
			outThumbPath,
		)
		cmd := exec.CommandContext(ctx, ffmpegPath, args...)
		if e.ConfigureCmd != nil {
			e.ConfigureCmd(cmd)
		}
		if out, runErr := cmd.CombinedOutput(); runErr != nil {
			return fmt.Errorf("ffmpeg failed: %v (%s)", runErr, strings.TrimSpace(string(out)))
		}
		st, statErr := os.Stat(outThumbPath)
		if statErr != nil || st.Size() == 0 {
			return fmt.Errorf("ffmpeg produced empty thumbnail")
		}
		return nil
	}

	if err := run("0.1"); err == nil {
		return nil
	}
	_ = os.Remove(outThumbPath)
	return run("")
}

// Options configures a thumbnail cache and generator.
type Options struct {
	CacheDir       string
	Extractor      Extractor
	MaxConcurrent  int
	ExtractTimeout time.Duration
	ConfigureCmd   func(*exec.Cmd)
}

type inflightCall struct {
	done chan struct{}
	path string
	err  error
}

// Generator produces and caches JPEG video thumbnails keyed on (relPath, modTime, size)
// with bounded concurrency and per-key in-flight deduplication.
type Generator struct {
	cacheDir       string
	extractor      Extractor
	extractTimeout time.Duration
	sem            chan struct{}

	mu       sync.Mutex
	inFlight map[string]*inflightCall
}

// New constructs a Generator with production defaults for omitted adapters.
func New(opts Options) *Generator {
	maxConc := opts.MaxConcurrent
	if maxConc <= 0 {
		maxConc = defaultMaxConcurrent
	}
	timeout := opts.ExtractTimeout
	if timeout <= 0 {
		timeout = defaultExtractTimeout
	}
	ext := opts.Extractor
	if ext == nil {
		ext = &FFmpegExtractor{ConfigureCmd: opts.ConfigureCmd}
	}
	return &Generator{
		cacheDir:       opts.CacheDir,
		extractor:      ext,
		extractTimeout: timeout,
		sem:            make(chan struct{}, maxConc),
		inFlight:       make(map[string]*inflightCall),
	}
}

// CacheKey computes the deterministic cache key hash for (relPath, modTime, size).
func CacheKey(relPath string, modTime time.Time, size int64) string {
	norm := strings.TrimPrefix(filepath.ToSlash(relPath), "/")
	h := sha256.New()
	_, _ = h.Write([]byte(norm))
	_, _ = h.Write([]byte{0})
	_, _ = h.Write([]byte(strconv.FormatInt(modTime.UnixNano(), 10)))
	_, _ = h.Write([]byte{0})
	_, _ = h.Write([]byte(strconv.FormatInt(size, 10)))
	return hex.EncodeToString(h.Sum(nil))
}

// Thumbnail returns the cached JPEG thumbnail path for mediaPath, generating it
// atomically if missing or stale. Concurrent requests for the same key share one extraction.
func (g *Generator) Thumbnail(ctx context.Context, relPath, mediaPath string) (string, error) {
	if g.cacheDir == "" {
		return "", fmt.Errorf("thumbnail cache directory not configured")
	}

	info, err := os.Stat(mediaPath)
	if err != nil {
		return "", err
	}
	if info.IsDir() {
		return "", os.ErrNotExist
	}

	key := CacheKey(relPath, info.ModTime(), info.Size())
	thumbPath := filepath.Join(g.cacheDir, key+".jpg")

	if st, statErr := os.Stat(thumbPath); statErr == nil && !st.IsDir() && st.Size() > 0 {
		return thumbPath, nil
	}

	g.mu.Lock()
	if call, ok := g.inFlight[key]; ok {
		g.mu.Unlock()
		select {
		case <-call.done:
			return call.path, call.err
		case <-ctx.Done():
			return "", ctx.Err()
		}
	}
	call := &inflightCall{done: make(chan struct{})}
	g.inFlight[key] = call
	g.mu.Unlock()

	go g.runExtraction(key, mediaPath, thumbPath, call)

	select {
	case <-call.done:
		return call.path, call.err
	case <-ctx.Done():
		return "", ctx.Err()
	}
}

func (g *Generator) runExtraction(key, mediaPath, thumbPath string, call *inflightCall) {
	defer func() {
		g.mu.Lock()
		delete(g.inFlight, key)
		g.mu.Unlock()
		close(call.done)
	}()

	g.sem <- struct{}{}
	defer func() { <-g.sem }()

	// Re-check cache after acquiring semaphore in case an earlier run just finished.
	if st, err := os.Stat(thumbPath); err == nil && !st.IsDir() && st.Size() > 0 {
		call.path = thumbPath
		return
	}

	if err := os.MkdirAll(g.cacheDir, 0755); err != nil {
		call.err = fmt.Errorf("create thumbnail cache dir: %w", err)
		return
	}

	tmp, err := os.CreateTemp(g.cacheDir, "."+key+"-*.tmp.jpg")
	if err != nil {
		call.err = fmt.Errorf("create temp thumbnail: %w", err)
		return
	}
	tmpPath := tmp.Name()
	_ = tmp.Close()

	extractCtx, cancel := context.WithTimeout(context.Background(), g.extractTimeout)
	defer cancel()

	if err := g.extractor.ExtractFrame(extractCtx, mediaPath, tmpPath); err != nil {
		_ = os.Remove(tmpPath)
		call.err = err
		return
	}

	st, err := os.Stat(tmpPath)
	if err != nil || st.Size() == 0 {
		_ = os.Remove(tmpPath)
		call.err = fmt.Errorf("extractor produced empty thumbnail")
		return
	}

	if err := os.Rename(tmpPath, thumbPath); err != nil {
		_ = os.Remove(tmpPath)
		call.err = fmt.Errorf("commit thumbnail: %w", err)
		return
	}

	call.path = thumbPath
}
