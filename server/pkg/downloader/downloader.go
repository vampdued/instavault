package downloader

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

type Downloader struct {
	client *http.Client
}

func NewDownloader() *Downloader {
	return &Downloader{
		client: &http.Client{Timeout: 60 * time.Second},
	}
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

func (d *Downloader) DownloadFile(url, destPath string, progressCallback func(bytesDownloaded, totalBytes int64)) (int64, error) {
	req, err := http.NewRequest("GET", url, nil)
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

	out, err := os.Create(destPath)
	if err != nil {
		return 0, err
	}
	defer out.Close()

	if progressCallback == nil {
		return io.Copy(out, resp.Body)
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

	return downloaded, err
}
