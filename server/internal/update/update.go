package update

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
)

const defaultCacheTTL = 12 * time.Hour

// ErrAlreadyUpToDate indicates that the installed version is already equal to or newer than the latest release.
var ErrAlreadyUpToDate = errors.New("already up to date")

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

// CheckUpdateResponse is the JSON shape returned by GET /api/check-update.
type CheckUpdateResponse struct {
	CurrentVersion   string        `json:"currentVersion"`
	UpdateAvailable  bool          `json:"updateAvailable"`
	Command          string        `json:"command"`
	LatestVersion    string        `json:"latestVersion,omitempty"`
	PublishedAt      string        `json:"publishedAt,omitempty"`
	Error            string        `json:"error,omitempty"`
	LastUpdateStatus *UpdateStatus `json:"lastUpdateStatus,omitempty"`
}

// ManagerConfig configures an update Manager.
type ManagerConfig struct {
	CurrentVersion string
	DataDir        string
	DBPath         string
	RepoOwner      string
	RepoName       string
	CustomURL      string
	Port           int
	HTTPClient     *http.Client
	CacheTTL       time.Duration
	Now            func() time.Time
	SnapshotDB     func(dbPath, backupPath string) error
	ConfigureCmd   func(*exec.Cmd)
	RunSelfCheck   func(newExePath, dbPath string) error
	RunHelper      func(helperPath string, args []string) error
	Stdout         io.Writer
}

// CLIUpdateOptions configures a CLI -update invocation.
type CLIUpdateOptions struct {
	ExePath   string
	Force     bool
	TempDir   string
	AssetName string
	BinName   string
}

// Manager owns the 12-hour cached update notice check and the full CLI -update orchestration.
type Manager struct {
	cfg        ManagerConfig
	httpClient *http.Client
	now        func() time.Time
	cacheTTL   time.Duration
	stdout     io.Writer

	cacheMu sync.Mutex
	cached  *CheckUpdateResponse
	cacheAt time.Time
}

// NewManager creates an update Manager with safe defaults.
func NewManager(cfg ManagerConfig) *Manager {
	if cfg.RepoOwner == "" {
		cfg.RepoOwner = "vampdued"
	}
	if cfg.RepoName == "" {
		cfg.RepoName = "instavault"
	}
	client := cfg.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 90 * time.Second}
	}
	nowFn := cfg.Now
	if nowFn == nil {
		nowFn = time.Now
	}
	ttl := cfg.CacheTTL
	if ttl <= 0 {
		ttl = defaultCacheTTL
	}
	out := cfg.Stdout
	if out == nil {
		out = os.Stdout
	}
	return &Manager{
		cfg:        cfg,
		httpClient: client,
		now:        nowFn,
		cacheTTL:   ttl,
		stdout:     out,
	}
}

// ExpectedBinaryName returns the platform-specific server binary filename.
func ExpectedBinaryName() string {
	if runtime.GOOS == "windows" {
		return "instavault-server.exe"
	}
	return "instavault-server"
}

// ExpectedBinaryAssetName returns the platform-specific release archive filename.
func ExpectedBinaryAssetName() string {
	if runtime.GOOS == "windows" {
		return fmt.Sprintf("instavault-windows-%s.zip", runtime.GOARCH)
	}
	return fmt.Sprintf("instavault-%s-%s.tar.gz", runtime.GOOS, runtime.GOARCH)
}

// CheckForUpdate returns the cached (default 12h) read-only update check response.
func (m *Manager) CheckForUpdate() CheckUpdateResponse {
	m.cacheMu.Lock()
	defer m.cacheMu.Unlock()

	if m.cached != nil && m.now().Sub(m.cacheAt) < m.cacheTTL {
		return *m.cached
	}

	resp := CheckUpdateResponse{
		CurrentVersion:  m.cfg.CurrentVersion,
		UpdateAvailable: false,
		Command:         ExpectedBinaryName() + " -update",
	}

	rel, err := FetchLatestRelease(m.httpClient, m.cfg.RepoOwner, m.cfg.RepoName, m.cfg.CustomURL)
	if err == nil && rel != nil {
		resp.LatestVersion = rel.TagName
		resp.PublishedAt = rel.PublishedAt.Format(time.RFC3339)
		if CompareSemver(rel.TagName, m.cfg.CurrentVersion) > 0 {
			resp.UpdateAvailable = true
		}
	} else if err != nil {
		resp.Error = err.Error()
	}

	if m.cfg.DataDir != "" {
		if st, errStatus := ReadUpdateStatus(m.cfg.DataDir); errStatus == nil && st != nil {
			resp.LastUpdateStatus = st
		}
	}

	copyResp := resp
	m.cached = &copyResp
	m.cacheAt = m.now()
	return resp
}

// RunCLIUpdate executes the full CLI update workflow: release discovery, pre-flight checks,
// asset downloads, strict SHA256 verification (both binary and extension), extraction,
// WAL-safe pre-selfcheck Safety Snapshot, self-check, graceful daemon shutdown, and helper handoff.
func (m *Manager) RunCLIUpdate(opts CLIUpdateOptions) error {
	fmt.Fprintf(m.stdout, "=== InstaVault CLI Updater (Current: v%s) ===\n", m.cfg.CurrentVersion)

	exePath := opts.ExePath
	if exePath == "" {
		var err error
		exePath, err = os.Executable()
		if err != nil {
			return fmt.Errorf("locating executable: %w", err)
		}
	}

	fmt.Fprintln(m.stdout, "• Checking GitHub for latest release...")
	rel, err := FetchLatestRelease(m.httpClient, m.cfg.RepoOwner, m.cfg.RepoName, m.cfg.CustomURL)
	if err != nil {
		return fmt.Errorf("update check failed: %w", err)
	}

	targetVer := rel.TagName
	cleanTargetVer := strings.TrimPrefix(targetVer, "v")

	if err := RunPreflightCheck(exePath, m.cfg.CurrentVersion, cleanTargetVer, opts.Force); err != nil {
		if CompareSemver(cleanTargetVer, m.cfg.CurrentVersion) <= 0 && !opts.Force {
			return fmt.Errorf("%w: %v", ErrAlreadyUpToDate, err)
		}
		return fmt.Errorf("pre-flight check: %w", err)
	}

	fmt.Fprintf(m.stdout, "• New version available: v%s -> %s (Published: %s)\n", m.cfg.CurrentVersion, targetVer, rel.PublishedAt.Format("2006-01-02"))

	tempDir := opts.TempDir
	if tempDir == "" {
		tempDir = filepath.Join(os.TempDir(), "instavault-updater")
	}
	_ = os.RemoveAll(tempDir)
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return fmt.Errorf("create temp dir: %w", err)
	}

	assetName := opts.AssetName
	if assetName == "" {
		assetName = ExpectedBinaryAssetName()
	}
	binName := opts.BinName
	if binName == "" {
		binName = ExpectedBinaryName()
	}

	var binAsset, extAsset, checksumAsset *Asset
	for i := range rel.Assets {
		a := &rel.Assets[i]
		switch a.Name {
		case assetName:
			binAsset = a
		case "instavault-extension.zip":
			extAsset = a
		case "checksums.txt":
			checksumAsset = a
		}
	}

	if binAsset == nil {
		return fmt.Errorf("release %s does not contain %s", targetVer, assetName)
	}

	binZipPath := filepath.Join(tempDir, binAsset.Name)
	fmt.Fprintf(m.stdout, "• Downloading %s...\n", binAsset.Name)
	if err := m.downloadToFile(binAsset.BrowserDownloadURL, binZipPath); err != nil {
		return fmt.Errorf("failed downloading binary asset: %w", err)
	}

	var extZipPath string
	if extAsset != nil {
		extZipPath = filepath.Join(tempDir, extAsset.Name)
		fmt.Fprintf(m.stdout, "• Downloading %s...\n", extAsset.Name)
		if err := m.downloadToFile(extAsset.BrowserDownloadURL, extZipPath); err != nil {
			return fmt.Errorf("failed downloading extension asset: %w", err)
		}
	}

	if checksumAsset != nil {
		checksumPath := filepath.Join(tempDir, checksumAsset.Name)
		if err := m.downloadToFile(checksumAsset.BrowserDownloadURL, checksumPath); err != nil {
			return fmt.Errorf("failed downloading checksums.txt: %w", err)
		}
		fmt.Fprintln(m.stdout, "• Verifying SHA256 checksums...")
		lines, err := os.ReadFile(checksumPath)
		if err != nil {
			return fmt.Errorf("failed reading checksums.txt: %w", err)
		}
		for _, line := range strings.Split(string(lines), "\n") {
			parts := strings.Fields(line)
			if len(parts) < 2 {
				continue
			}
			hash, name := parts[0], parts[1]
			if name == binAsset.Name {
				if err := VerifySHA256(binZipPath, hash); err != nil {
					return fmt.Errorf("binary SHA256 mismatch: %w", err)
				}
			}
			if extAsset != nil && name == extAsset.Name {
				if err := VerifySHA256(extZipPath, hash); err != nil {
					return fmt.Errorf("extension SHA256 mismatch: %w", err)
				}
			}
		}
	}

	extractedBinDir := filepath.Join(tempDir, "extracted_bin")
	var extractErr error
	if strings.HasSuffix(binZipPath, ".tar.gz") {
		extractErr = SafeExtractTarGz(binZipPath, extractedBinDir)
	} else {
		extractErr = SafeExtractZip(binZipPath, extractedBinDir)
	}
	if extractErr != nil {
		return fmt.Errorf("failed extracting binary archive: %w", extractErr)
	}
	newExePath := filepath.Join(extractedBinDir, binName)

	fmt.Fprintln(m.stdout, "• Running pre-flight self-check on new binary...")
	earlyBackupPath := filepath.Join(tempDir, "early_selfcheck.db")
	if m.cfg.DBPath != "" {
		if _, statErr := os.Stat(m.cfg.DBPath); statErr == nil {
			snapFn := m.cfg.SnapshotDB
			if snapFn == nil {
				snapFn = vacuumBackup
			}
			if err := snapFn(m.cfg.DBPath, earlyBackupPath); err != nil {
				return fmt.Errorf("pre-selfcheck safety snapshot failed: %w", err)
			}
		}
	}

	if m.cfg.RunSelfCheck != nil {
		if err := m.cfg.RunSelfCheck(newExePath, earlyBackupPath); err != nil {
			return fmt.Errorf("new binary self-check failed: %w", err)
		}
	} else {
		selfCheckCmd := exec.Command(newExePath, "-selfcheck", "-selfcheck-db", earlyBackupPath)
		if m.cfg.ConfigureCmd != nil {
			m.cfg.ConfigureCmd(selfCheckCmd)
		}
		if out, err := selfCheckCmd.CombinedOutput(); err != nil {
			return fmt.Errorf("new binary self-check failed: %w\nOutput: %s", err, string(out))
		}
	}
	fmt.Fprintln(m.stdout, "• Self-check passed!")

	// Determine if daemon is running and request graceful shutdown if so
	var daemonPid int
	if m.cfg.Port > 0 {
		pingResp, errPing := m.httpClient.Get(fmt.Sprintf("http://localhost:%d/api/version", m.cfg.Port))
		if errPing == nil && pingResp.StatusCode == http.StatusOK {
			_ = pingResp.Body.Close()

			fmt.Fprintf(m.stdout, "• Requesting running daemon on port %d to shutdown...\n", m.cfg.Port)
			shutdownReq, _ := http.NewRequest(http.MethodPost, fmt.Sprintf("http://localhost:%d/api/shutdown?reason=update", m.cfg.Port), nil)
			shutdownReq.Header.Set("Origin", "http://localhost")
			shutClient := &http.Client{Timeout: 5 * time.Second}
			resp, errShut := shutClient.Do(shutdownReq)
			if errShut != nil {
				fmt.Fprintf(m.stdout, "Notice: could not reach shutdown endpoint: %v\n", errShut)
			} else {
				defer resp.Body.Close()
				if resp.StatusCode == http.StatusConflict {
					var errBody struct {
						Error string `json:"error"`
					}
					_ = json.NewDecoder(resp.Body).Decode(&errBody)
					return fmt.Errorf("update rejected: %s", errBody.Error)
				}
				var shutBody struct {
					PID int `json:"pid"`
				}
				_ = json.NewDecoder(resp.Body).Decode(&shutBody)
				daemonPid = shutBody.PID
			}
		} else if pingResp != nil {
			_ = pingResp.Body.Close()
		}
	}

	// Stage helper in temp directory
	helperName := "instavault-helper"
	if runtime.GOOS == "windows" {
		helperName = "instavault-helper.exe"
	}
	helperPath := filepath.Join(tempDir, helperName)
	if err := copyFile(exePath, helperPath); err != nil {
		return fmt.Errorf("failed copying updater helper: %w", err)
	}

	extInstalledDir := filepath.Join(filepath.Dir(filepath.Dir(exePath)), "extension")
	helperArgs := []string{
		"-apply-update",
		"-new-exe", newExePath,
		"-target-exe", exePath,
		"-ext-zip", extZipPath,
		"-ext-dir", extInstalledDir,
		"-wait-pid", strconv.Itoa(daemonPid),
		"-port", strconv.Itoa(m.cfg.Port),
		"-data-dir", m.cfg.DataDir,
		"-db-path", m.cfg.DBPath,
		"-expected-ver", cleanTargetVer,
	}

	fmt.Fprintln(m.stdout, "• Handing over to updater helper...")
	if m.cfg.RunHelper != nil {
		if err := m.cfg.RunHelper(helperPath, helperArgs); err != nil {
			return fmt.Errorf("update failed: %w", err)
		}
	} else {
		helperCmd := exec.Command(helperPath, helperArgs...)
		helperCmd.Stdout = m.stdout
		helperCmd.Stderr = os.Stderr
		if m.cfg.ConfigureCmd != nil {
			m.cfg.ConfigureCmd(helperCmd)
		}
		if err := helperCmd.Run(); err != nil {
			return fmt.Errorf("update failed: %w", err)
		}
	}

	fmt.Fprintf(m.stdout, "\nSUCCESS: InstaVault updated to v%s!\n", cleanTargetVer)
	fmt.Fprintln(m.stdout, "Notice: If extension files were updated, please click ↺ Reload on chrome://extensions.")
	return nil
}

func (m *Manager) downloadToFile(rawURL, destPath string) error {
	resp, err := m.httpClient.Get(rawURL)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	out, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, resp.Body)
	return err
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
			_ = rc.Close()
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

// SafeExtractTarGz unpacks a .tar.gz archive into destDir with strict protection against Tar-Slip attacks.
func SafeExtractTarGz(tarGzPath, destDir string) error {
	destDir = filepath.Clean(destDir)
	f, err := os.Open(tarGzPath)
	if err != nil {
		return fmt.Errorf("open tar.gz failed: %w", err)
	}
	defer f.Close()

	gzr, err := gzip.NewReader(f)
	if err != nil {
		return fmt.Errorf("gzip reader failed: %w", err)
	}
	defer gzr.Close()

	tr := tar.NewReader(gzr)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("read tar entry failed: %w", err)
		}

		cleanName := filepath.Clean(hdr.Name)
		targetPath := filepath.Join(destDir, cleanName)
		rel, err := filepath.Rel(destDir, targetPath)
		if err != nil || strings.HasPrefix(rel, "..") || rel == ".." {
			return fmt.Errorf("tar-slip attempt detected in archive path: %s", hdr.Name)
		}

		switch hdr.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(targetPath, 0755); err != nil {
				return err
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
				return err
			}
			mode := os.FileMode(hdr.Mode)
			if mode == 0 {
				mode = 0755
			}
			out, err := os.OpenFile(targetPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, mode)
			if err != nil {
				return err
			}
			_, copyErr := io.Copy(out, tr)
			closeErr := out.Close()
			if copyErr != nil {
				return copyErr
			}
			if closeErr != nil {
				return closeErr
			}
		}
	}
	return nil
}
