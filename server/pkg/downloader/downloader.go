package downloader

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

type Downloader struct {
	client      *http.Client
	validateURL bool
}

func NewDownloader() *Downloader {
	d := &Downloader{validateURL: true}
	d.client = &http.Client{
		Timeout: 60 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 10 {
				return fmt.Errorf("too many redirects")
			}
			return ValidateMediaURL(req.URL.String())
		},
	}
	return d
}

func ValidateMediaURL(rawURL string) error {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Scheme != "https" || parsed.Hostname() == "" || parsed.User != nil {
		return fmt.Errorf("media URL must be an absolute HTTPS URL")
	}
	if parsed.Port() != "" && parsed.Port() != "443" {
		return fmt.Errorf("media URL uses an unsupported port")
	}
	hostname := strings.ToLower(strings.TrimSuffix(parsed.Hostname(), "."))
	if net.ParseIP(hostname) != nil {
		return fmt.Errorf("media URL IP literals are not allowed")
	}
	for _, allowed := range []string{"cdninstagram.com", "fbcdn.net", "instagram.com"} {
		if hostname == allowed || strings.HasSuffix(hostname, "."+allowed) {
			return nil
		}
	}
	return fmt.Errorf("media URL host is not allowed")
}

func Sanitize(name string) string {
	re := regexp.MustCompile(`[<>:"/\\|?*\x00-\x1f]`)
	s := re.ReplaceAllString(name, "_")
	s = strings.TrimSpace(s)
	s = strings.Trim(s, ".")
	if s == "" {
		s = "unnamed"
	}
	return s
}

func GetTargetPath(baseDir, folderStructure, username, filename, fileExt string) (string, string) {
	safeUser := Sanitize(username)
	var targetDir string
	switch folderStructure {
	case "flat":
		targetDir = baseDir
	case "profile_type":
		mediaType := "photos"
		ext := strings.ToLower(fileExt)
		if ext == "" {
			dotIdx := strings.LastIndex(filename, ".")
			if dotIdx != -1 {
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

	// Security check: ensure target directory stays strictly within baseDir boundary
	relTarget, errTarget := filepath.Rel(cleanBaseDir, cleanTargetDir)
	if errTarget != nil || strings.HasPrefix(relTarget, "..") || relTarget == ".." {
		cleanTargetDir = cleanBaseDir
	}

	safeFilename := Sanitize(filename)
	fullPath := filepath.Clean(filepath.Join(cleanTargetDir, safeFilename))

	// Security check: ensure final file path stays strictly within cleanBaseDir boundary
	relFull, errFull := filepath.Rel(cleanBaseDir, fullPath)
	if errFull != nil || strings.HasPrefix(relFull, "..") || relFull == ".." {
		fullPath = filepath.Join(cleanBaseDir, filepath.Base(safeFilename))
	}

	return cleanTargetDir, fullPath
}

func (d *Downloader) DownloadFile(ctx context.Context, url, destPath string, progressCallback func(bytesDownloaded, totalBytes int64)) (int64, error) {
	if d.validateURL {
		if err := ValidateMediaURL(url); err != nil {
			return 0, err
		}
	}
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return 0, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
	req.Header.Set("Referer", "https://www.instagram.com/")

	resp, err := d.client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	tempPath := destPath + ".instavault-part"
	out, err := os.Create(tempPath)
	if err != nil {
		return 0, err
	}
	committed := false
	defer func() {
		_ = out.Close()
		if !committed {
			_ = os.Remove(tempPath)
		}
	}()

	if progressCallback == nil {
		n, copyErr := io.Copy(out, resp.Body)
		if copyErr != nil {
			return n, copyErr
		}
		if err := out.Close(); err != nil {
			return n, err
		}
		if err := os.Rename(tempPath, destPath); err != nil {
			return n, err
		}
		committed = true
		return n, nil
	}

	// Stream with progress reporting
	buf := make([]byte, 32*1024)
	var downloaded int64
	total := resp.ContentLength

	for {
		nr, er := resp.Body.Read(buf)
		if nr > 0 {
			nw, ew := out.Write(buf[0:nr])
			if nw > 0 {
				downloaded += int64(nw)
				progressCallback(downloaded, total)
			}
			if ew != nil {
				err = ew
				break
			}
			if nr != nw {
				err = io.ErrShortWrite
				break
			}
		}
		if er != nil {
			if er != io.EOF {
				err = er
			}
			break
		}
	}

	if err != nil {
		return downloaded, err
	}
	if err := out.Close(); err != nil {
		return downloaded, err
	}
	if err := os.Rename(tempPath, destPath); err != nil {
		return downloaded, err
	}
	committed = true
	return downloaded, nil
}
