package update

import (
	"archive/zip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// Asset represents a release asset from GitHub or an update server.
type Asset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
}

// ReleaseInfo represents a GitHub release.
type ReleaseInfo struct {
	TagName     string    `json:"tag_name"`
	Name        string    `json:"name"`
	Draft       bool      `json:"draft"`
	Prerelease  bool      `json:"prerelease"`
	PublishedAt time.Time `json:"published_at"`
	Body        string    `json:"body"`
	Assets      []Asset   `json:"assets"`
}

// SemVer holds parsed major, minor, patch numbers.
type SemVer struct {
	Major int
	Minor int
	Patch int
}

var semverRegex = regexp.MustCompile(`^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?`)

// ParseSemver parses a string into SemVer components. Returns error if invalid.
func ParseSemver(v string) (SemVer, error) {
	v = strings.TrimSpace(v)
	matches := semverRegex.FindStringSubmatch(v)
	if len(matches) < 2 || matches[1] == "" {
		return SemVer{}, fmt.Errorf("invalid semver string: %q", v)
	}

	major, _ := strconv.Atoi(matches[1])
	minor := 0
	if len(matches) > 2 && matches[2] != "" {
		minor, _ = strconv.Atoi(matches[2])
	}
	patch := 0
	if len(matches) > 3 && matches[3] != "" {
		patch, _ = strconv.Atoi(matches[3])
	}

	return SemVer{Major: major, Minor: minor, Patch: patch}, nil
}

// CompareSemver returns:
//  -1 if v1 < v2
//   0 if v1 == v2
//   1 if v1 > v2
func CompareSemver(v1, v2 string) int {
	s1, err1 := ParseSemver(v1)
	s2, err2 := ParseSemver(v2)

	if err1 != nil && err2 != nil {
		return 0
	}
	if err1 != nil {
		return -1
	}
	if err2 != nil {
		return 1
	}

	if s1.Major != s2.Major {
		if s1.Major < s2.Major {
			return -1
		}
		return 1
	}
	if s1.Minor != s2.Minor {
		if s1.Minor < s2.Minor {
			return -1
		}
		return 1
	}
	if s1.Patch != s2.Patch {
		if s1.Patch < s2.Patch {
			return -1
		}
		return 1
	}
	return 0
}

// IsValidReleaseTag checks if tag is a production stable release (no rc, beta, alpha).
func IsValidReleaseTag(tag string) bool {
	tag = strings.TrimSpace(tag)
	if tag == "" {
		return false
	}
	if strings.Contains(tag, "-") {
		return false
	}
	_, err := ParseSemver(tag)
	return err == nil
}

// FetchLatestRelease queries the GitHub releases API or customURL, filtering out drafts and prereleases.
func FetchLatestRelease(client *http.Client, repoOwner, repoName, customURL string) (*ReleaseInfo, error) {
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}

	url := customURL
	if url == "" {
		url = fmt.Sprintf("https://api.github.com/repos/%s/%s/releases", repoOwner, repoName)
	}

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request failed: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "InstaVault-Updater")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("release check failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("release check returned HTTP %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Response might be a single release object (if customURL targets /latest) or an array
	var releases []ReleaseInfo
	if err := json.Unmarshal(bodyBytes, &releases); err != nil {
		var single ReleaseInfo
		if errSingle := json.Unmarshal(bodyBytes, &single); errSingle != nil {
			return nil, fmt.Errorf("failed to parse release JSON: %w", err)
		}
		releases = []ReleaseInfo{single}
	}

	var latest *ReleaseInfo
	for i := range releases {
		rel := &releases[i]
		if rel.Draft || rel.Prerelease {
			continue
		}
		if !IsValidReleaseTag(rel.TagName) {
			continue
		}

		if latest == nil || CompareSemver(rel.TagName, latest.TagName) > 0 {
			latest = rel
		}
	}

	if latest == nil {
		return nil, fmt.Errorf("no stable releases found")
	}

	return latest, nil
}

// VerifySHA256 checks if the file matches the expected hex checksum.
func VerifySHA256(filePath, expectedHex string) error {
	expectedHex = strings.TrimSpace(strings.ToLower(expectedHex))
	f, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer f.Close()

	hasher := sha256.New()
	if _, err := io.Copy(hasher, f); err != nil {
		return err
	}

	actualHex := hex.EncodeToString(hasher.Sum(nil))
	if actualHex != expectedHex {
		return fmt.Errorf("checksum mismatch: expected %s, got %s", expectedHex, actualHex)
	}
	return nil
}

// SafeExtractZip unpacks a zip archive into destDir with strict protection against Zip-Slip attacks.
func SafeExtractZip(zipPath, destDir string) error {
	destDir = filepath.Clean(destDir)
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return fmt.Errorf("open zip failed: %w", err)
	}
	defer r.Close()

	for _, f := range r.File {
		cleanName := filepath.Clean(f.Name)
		targetPath := filepath.Join(destDir, cleanName)

		// Guard against Zip-Slip: ensure targetPath is within destDir
		rel, err := filepath.Rel(destDir, targetPath)
		if err != nil || strings.HasPrefix(rel, "..") || rel == ".." {
			return fmt.Errorf("zip-slip attempt detected in archive path: %s", f.Name)
		}

		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(targetPath, 0755); err != nil {
				return err
			}
			continue
		}

		if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			return err
		}

		out, err := os.OpenFile(targetPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, f.Mode())
		if err != nil {
			rc.Close()
			return err
		}

		_, copyErr := io.Copy(out, rc)
		closeErr := rc.Close()
		outCloseErr := out.Close()

		if copyErr != nil {
			return copyErr
		}
		if closeErr != nil {
			return closeErr
		}
		if outCloseErr != nil {
			return outCloseErr
		}
	}

	return nil
}
