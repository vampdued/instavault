package downloader

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const defaultUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

var (
	// ErrDraining is returned when the server is draining for an update and refuses new downloads.
	ErrDraining = errors.New("Server is draining for update; downloads temporarily refused")

	// ErrMissingFields is returned when required request fields are absent.
	ErrMissingFields = errors.New("missing required fields")

	// ErrDisallowedURL is returned when a media URL fails the host/scheme allowlist.
	ErrDisallowedURL = errors.New("disallowed media URL host")

	sanitizeRe = regexp.MustCompile(`[<>:"/\\|?*\x00-\x1f]`)
)

// Mode controls deduplication and pre-download cleanup behavior.
type Mode int

const (
	// ModeNormal checks deduplication and skips items already present in the vault.
	ModeNormal Mode = iota
	// ModeForce deletes prior download/skipped records and re-downloads unconditionally.
	ModeForce
	// ModeSkipRetry deletes prior skipped/download records and retries the download.
	ModeSkipRetry
)

// Request represents a media download request from the browser extension or dashboard.
type Request struct {
	Username     string `json:"username"`
	AccountID    string `json:"accountId"`
	Shortcode    string `json:"shortcode"`
	URL          string `json:"url"`
	DashVideoURL string `json:"dashVideoUrl,omitempty"`
	DashAudioURL string `json:"dashAudioUrl,omitempty"`
	Filename     string `json:"filename"`
	FileExt      string `json:"fileExt"`
	TakenAt      int64  `json:"takenAt"`
	IsThumb      bool   `json:"isThumb"`
	PageType     string `json:"pageType"`
	MediaIndex   int    `json:"index"` // for carousel items
}

// Result is the JSON-serializable outcome of a download request.
type Result struct {
	Status    string `json:"status"` // "downloaded", "skipped", "error"
	Message   string `json:"message,omitempty"`
	LocalPath string `json:"localPath,omitempty"`
	Shortcode string `json:"shortcode"`
}

// VaultStore is the persistence interface required by Downloader.
type VaultStore interface {
	Config() (baseDir string, folderStructure string)
	IsAlreadyDownloaded(shortcode, filename string) (bool, string)
	RecordDownload(shortcode, username, filename, localPath string, size int64) error
	RecordSkip(shortcode, username, filename, localPath string) error
	DeleteForRedownload(shortcode, filename string) error
}

// ProgressSink receives real-time live-log updates for the Sync Hub.
type ProgressSink interface {
	RecordProgress(username, shortcode, filename, status string, size int64, errStr string, activeDownloads int64)
}

// Muxer combines separate DASH video and optional audio files into a single output file.
type Muxer interface {
	Mux(ctx context.Context, videoPath, audioPath, destPath string) error
}

// FFmpegMuxer is the default Muxer implementation invoking ffmpeg losslessly.
type FFmpegMuxer struct {
	ConfigureCmd func(*exec.Cmd)
}

// Mux remuxes videoPath (and optional audioPath) into destPath via ffmpeg (-c copy -movflags +faststart).
func (m *FFmpegMuxer) Mux(ctx context.Context, videoPath, audioPath, destPath string) error {
	ffmpegPath, err := exec.LookPath("ffmpeg")
	if err != nil {
		return fmt.Errorf("ffmpeg not found on PATH: %w", err)
	}

	args := []string{"-y", "-hide_banner", "-loglevel", "error", "-i", videoPath}
	if audioPath != "" {
		args = append(args, "-i", audioPath)
	}
	args = append(args, "-c", "copy", "-movflags", "+faststart", destPath)

	muxCtx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(muxCtx, ffmpegPath, args...)
	if m.ConfigureCmd != nil {
		m.ConfigureCmd(cmd)
	}
	if out, err := cmd.CombinedOutput(); err != nil {
		_ = os.Remove(destPath)
		return fmt.Errorf("ffmpeg mux failed: %v (%s)", err, strings.TrimSpace(string(out)))
	}
	return nil
}

// Options configures a Downloader instance.
type Options struct {
	Store        VaultStore
	Progress     ProgressSink
	Muxer        Muxer
	HTTPClient   *http.Client
	URLValidator func(string) bool
	ConfigureCmd func(*exec.Cmd)
}

// Downloader owns the unified media ingestion pipeline for normal, force, and skip-retry modes.
type Downloader struct {
	store        VaultStore
	progress     ProgressSink
	muxer        Muxer
	httpClient   *http.Client
	urlValidator func(string) bool

	activeDownloads atomic.Int64
	draining        atomic.Bool
}

// New constructs a Downloader with production defaults for any omitted optional adapters.
func New(opts Options) *Downloader {
	client := opts.HTTPClient
	if client == nil {
		client = &http.Client{
			Timeout: 90 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        32,
				MaxIdleConnsPerHost: 16,
				IdleConnTimeout:     60 * time.Second,
			},
		}
	}
	muxer := opts.Muxer
	if muxer == nil {
		muxer = &FFmpegMuxer{ConfigureCmd: opts.ConfigureCmd}
	}
	validator := opts.URLValidator
	if validator == nil {
		validator = IsAllowedMediaURL
	}
	return &Downloader{
		store:        opts.Store,
		progress:     opts.Progress,
		muxer:        muxer,
		httpClient:   client,
		urlValidator: validator,
	}
}

// BeginDraining attempts to enter draining mode for an update shutdown.
// If any downloads are currently active, draining is reverted and (active, false) is returned.
func (d *Downloader) BeginDraining() (int64, bool) {
	d.draining.Store(true)
	if active := d.activeDownloads.Load(); active > 0 {
		d.draining.Store(false)
		return active, false
	}
	return 0, true
}

// IsDraining reports whether the downloader is currently refusing new downloads.
func (d *Downloader) IsDraining() bool {
	return d.draining.Load()
}

// ActiveDownloads returns the number of currently in-flight downloads.
func (d *Downloader) ActiveDownloads() int64 {
	return d.activeDownloads.Load()
}

// Download executes the unified media ingestion pipeline for ModeNormal, ModeForce, or ModeSkipRetry.
func (d *Downloader) Download(ctx context.Context, req Request, mode Mode) (Result, error) {
	if d.draining.Load() {
		return Result{
			Status:    "error",
			Shortcode: req.Shortcode,
			Message:   ErrDraining.Error(),
		}, ErrDraining
	}

	if mode == ModeNormal && (req.URL == "" || req.Shortcode == "" || req.Username == "") {
		return Result{
			Status:    "error",
			Shortcode: req.Shortcode,
			Message:   ErrMissingFields.Error(),
		}, ErrMissingFields
	}

	if !d.urlValidator(req.URL) ||
		(req.DashVideoURL != "" && !d.urlValidator(req.DashVideoURL)) ||
		(req.DashAudioURL != "" && !d.urlValidator(req.DashAudioURL)) {
		return Result{
			Status:    "error",
			Shortcode: req.Shortcode,
			Message:   ErrDisallowedURL.Error(),
		}, ErrDisallowedURL
	}

	d.activeDownloads.Add(1)
	defer d.activeDownloads.Add(-1)

	filename := req.Filename
	if filename == "" {
		filename = req.Shortcode
		if req.MediaIndex > 0 {
			filename = fmt.Sprintf("%s_%d", req.Shortcode, req.MediaIndex)
		}
		ext := req.FileExt
		if ext == "" {
			ext = "jpg"
		}
		filename = filename + "." + ext
	}

	if mode == ModeForce || mode == ModeSkipRetry {
		_ = d.store.DeleteForRedownload(req.Shortcode, filename)
	}

	d.reportProgress(req.Username, req.Shortcode, filename, "downloading", 0, "")

	baseDir, folderStructure := d.store.Config()
	userDir, localPath := TargetPath(baseDir, folderStructure, req.Username, filename, req.FileExt)
	if err := os.MkdirAll(userDir, 0755); err != nil {
		d.reportProgress(req.Username, req.Shortcode, filename, "failed", 0, err.Error())
		return Result{
			Status:    "error",
			Shortcode: req.Shortcode,
			Message:   err.Error(),
		}, err
	}

	if mode == ModeNormal {
		if already, existingPath := d.store.IsAlreadyDownloaded(req.Shortcode, filename); already {
			_ = d.store.RecordSkip(req.Shortcode, req.Username, filename, existingPath)
			d.reportProgress(req.Username, req.Shortcode, filename, "skipped", 0, "")
			log.Printf("[SKIP] %s/%s (already in DB+disk)", req.Username, filename)
			return Result{
				Status:    "skipped",
				Shortcode: req.Shortcode,
				LocalPath: existingPath,
				Message:   "already downloaded",
			}, nil
		}
	}

	var size int64
	var err error
	if req.DashVideoURL != "" {
		log.Printf("[DASH] %s/%s", req.Username, filename)
		size, err = d.downloadAndMuxDash(ctx, req.DashVideoURL, req.DashAudioURL, localPath)
		if err != nil {
			log.Printf("[DASH-FALLBACK] %s/%s: %v — falling back to progressive stream", req.Username, filename, err)
			localPath, size, err = d.downloadFileSmart(ctx, req.URL, localPath)
		}
	} else {
		log.Printf("[DL]   %s/%s", req.Username, filename)
		localPath, size, err = d.downloadFileSmart(ctx, req.URL, localPath)
	}
	if err != nil {
		log.Printf("[ERR]  %s/%s: %v", req.Username, filename, err)
		d.reportProgress(req.Username, req.Shortcode, filename, "failed", 0, err.Error())
		return Result{
			Status:    "error",
			Shortcode: req.Shortcode,
			Message:   err.Error(),
		}, err
	}

	filename = filepath.Base(localPath)
	_ = d.store.RecordDownload(req.Shortcode, req.Username, filename, localPath, size)
	d.reportProgress(req.Username, req.Shortcode, filename, "completed", size, "")

	if mode == ModeForce {
		log.Printf("[FORCE] %s/%s re-downloaded", req.Username, filename)
	}

	return Result{
		Status:    "downloaded",
		Shortcode: req.Shortcode,
		LocalPath: localPath,
	}, nil
}

func (d *Downloader) reportProgress(username, shortcode, filename, status string, size int64, errStr string) {
	if d.progress == nil {
		return
	}
	d.progress.RecordProgress(username, shortcode, filename, status, size, errStr, d.activeDownloads.Load())
}

// downloadFileSmart performs an atomic temp-file HTTP fetch and aligns the destination
// extension to the real Content-Type when an image defaults to .jpg/.jpeg but Instagram
// actually serves WebP, AVIF, PNG, etc.
func (d *Downloader) downloadFileSmart(ctx context.Context, mediaURL, destPath string) (string, int64, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, mediaURL, nil)
	if err != nil {
		return destPath, 0, err
	}
	req.Header.Set("User-Agent", defaultUserAgent)
	req.Header.Set("Referer", "https://www.instagram.com/")

	resp, err := d.httpClient.Do(req)
	if err != nil {
		return destPath, 0, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return destPath, 0, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	finalPath := destPath
	curExt := strings.ToLower(strings.TrimPrefix(filepath.Ext(destPath), "."))
	if realExt := ResolveExtFromContentType(resp.Header.Get("Content-Type")); realExt != "" && (curExt == "jpg" || curExt == "jpeg") && realExt != "jpg" && realExt != "mp4" && realExt != "mov" {
		finalPath = strings.TrimSuffix(destPath, filepath.Ext(destPath)) + "." + realExt
	}

	tmp, err := os.CreateTemp(filepath.Dir(finalPath), ".iv-dl-*.part")
	if err != nil {
		return finalPath, 0, err
	}
	tmpPath := tmp.Name()
	n, copyErr := io.Copy(tmp, resp.Body)
	closeErr := tmp.Close()
	if copyErr != nil {
		_ = os.Remove(tmpPath)
		return finalPath, 0, copyErr
	}
	if closeErr != nil {
		_ = os.Remove(tmpPath)
		return finalPath, 0, closeErr
	}
	if err := os.Rename(tmpPath, finalPath); err != nil {
		_ = os.Remove(tmpPath)
		return finalPath, 0, err
	}
	return finalPath, n, nil
}

func (d *Downloader) downloadFileRaw(ctx context.Context, mediaURL, destPath string) (int64, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, mediaURL, nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("User-Agent", defaultUserAgent)
	req.Header.Set("Referer", "https://www.instagram.com/")

	resp, err := d.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	tmp, err := os.CreateTemp(filepath.Dir(destPath), ".iv-dl-*.part")
	if err != nil {
		return 0, err
	}
	tmpPath := tmp.Name()
	n, copyErr := io.Copy(tmp, resp.Body)
	closeErr := tmp.Close()
	if copyErr != nil {
		_ = os.Remove(tmpPath)
		return 0, copyErr
	}
	if closeErr != nil {
		_ = os.Remove(tmpPath)
		return 0, closeErr
	}
	if err := os.Rename(tmpPath, destPath); err != nil {
		_ = os.Remove(tmpPath)
		return 0, err
	}
	return n, nil
}

func (d *Downloader) downloadAndMuxDash(ctx context.Context, videoURL, audioURL, destPath string) (int64, error) {
	dir := filepath.Dir(destPath)
	vTmp, err := os.CreateTemp(dir, ".iv-dash-v-*.mp4")
	if err != nil {
		return 0, err
	}
	vPath := vTmp.Name()
	_ = vTmp.Close()
	defer os.Remove(vPath)

	var aPath string
	if audioURL != "" {
		aTmp, err := os.CreateTemp(dir, ".iv-dash-a-*.m4a")
		if err != nil {
			return 0, err
		}
		aPath = aTmp.Name()
		_ = aTmp.Close()
		defer os.Remove(aPath)
	}

	var wg sync.WaitGroup
	var vErr, aErr error
	wg.Add(1)
	go func() {
		defer wg.Done()
		_, vErr = d.downloadFileRaw(ctx, videoURL, vPath)
	}()
	if audioURL != "" {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, aErr = d.downloadFileRaw(ctx, audioURL, aPath)
		}()
	}
	wg.Wait()

	if vErr != nil {
		return 0, fmt.Errorf("dash video fetch: %w", vErr)
	}
	if aErr != nil {
		return 0, fmt.Errorf("dash audio fetch: %w", aErr)
	}

	if err := d.muxer.Mux(ctx, vPath, aPath, destPath); err != nil {
		return 0, err
	}

	info, err := os.Stat(destPath)
	if err != nil {
		return 0, err
	}
	return info.Size(), nil
}

// IsAllowedMediaURL enforces HTTPS and Instagram CDN hostnames to prevent SSRF.
func IsAllowedMediaURL(rawURL string) bool {
	u, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || !strings.EqualFold(u.Scheme, "https") {
		return false
	}
	host := strings.ToLower(u.Hostname())
	if host == "" {
		return false
	}
	return host == "cdninstagram.com" || strings.HasSuffix(host, ".cdninstagram.com") ||
		host == "fbcdn.net" || strings.HasSuffix(host, ".fbcdn.net") ||
		host == "instagram.com" || strings.HasSuffix(host, ".instagram.com")
}

// Sanitize strips filesystem-unsafe characters and leading/trailing dots from a path segment.
func Sanitize(name string) string {
	s := sanitizeRe.ReplaceAllString(name, "_")
	s = strings.TrimSpace(s)
	s = strings.Trim(s, ".")
	if s == "" {
		s = "unnamed"
	}
	return s
}

// ResolveExtFromContentType maps an HTTP Content-Type header to a normalized file extension.
func ResolveExtFromContentType(ct string) string {
	mimeType := strings.ToLower(strings.TrimSpace(strings.Split(ct, ";")[0]))
	switch mimeType {
	case "image/jpeg", "image/jpg", "image/pjpeg":
		return "jpg"
	case "image/png":
		return "png"
	case "image/webp":
		return "webp"
	case "image/avif":
		return "avif"
	case "image/heic":
		return "heic"
	case "image/heif":
		return "heif"
	case "image/gif":
		return "gif"
	case "video/mp4":
		return "mp4"
	case "video/quicktime":
		return "mov"
	default:
		return ""
	}
}

// TargetPath computes the safe target directory and full file path under baseDir
// according to folderStructure ("profile", "flat", or "profile_type"), clamping
// any path traversal back inside baseDir.
func TargetPath(baseDir, folderStructure, username, filename, fileExt string) (string, string) {
	safeUser := Sanitize(username)
	var targetDir string
	switch folderStructure {
	case "flat":
		targetDir = baseDir
	case "profile_type":
		mediaType := "photos"
		ext := strings.ToLower(fileExt)
		if ext == "" {
			if dotIdx := strings.LastIndex(filename, "."); dotIdx != -1 {
				ext = strings.ToLower(filename[dotIdx+1:])
			}
		}
		if ext == "mp4" || ext == "mov" || ext == "m4v" || ext == "avi" {
			mediaType = "videos"
		}
		targetDir = filepath.Join(baseDir, safeUser, mediaType)
	default: // "profile"
		targetDir = filepath.Join(baseDir, safeUser)
	}

	cleanBaseDir := filepath.Clean(baseDir)
	cleanTargetDir := filepath.Clean(targetDir)

	relTarget, errTarget := filepath.Rel(cleanBaseDir, cleanTargetDir)
	if errTarget != nil || strings.HasPrefix(relTarget, "..") || relTarget == ".." {
		cleanTargetDir = cleanBaseDir
	}

	safeFilename := Sanitize(filename)
	fullPath := filepath.Clean(filepath.Join(cleanTargetDir, safeFilename))

	relFull, errFull := filepath.Rel(cleanBaseDir, fullPath)
	if errFull != nil || strings.HasPrefix(relFull, "..") || relFull == ".." {
		fullPath = filepath.Join(cleanBaseDir, filepath.Base(safeFilename))
	}

	return cleanTargetDir, fullPath
}
