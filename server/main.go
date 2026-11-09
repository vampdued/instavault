package main

import (
	"context"
	"database/sql"
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"instavault-server/internal/update"

	_ "modernc.org/sqlite"
)

// Version is populated at build time via -ldflags "-X main.Version=..."
var Version = "1.0.0"

// CurrentSchemaVersion defines the supported SQLite database schema version
const CurrentSchemaVersion = 1

// MinExtensionVersion defines the minimum Chrome extension version expected
const MinExtensionVersion = "1.8.0"

// ─── Embedded UI assets ───────────────────────────────────────────────────────

//go:embed ui
var uiFS embed.FS

// ─── Types ────────────────────────────────────────────────────────────────────

type DownloadRequest struct {
	Username   string `json:"username"`
	AccountID  string `json:"accountId"`
	Shortcode  string `json:"shortcode"`
	URL        string `json:"url"`
	Filename   string `json:"filename"`
	FileExt    string `json:"fileExt"`
	TakenAt    int64  `json:"takenAt"`
	IsThumb    bool   `json:"isThumb"`
	PageType   string `json:"pageType"`
	MediaIndex int    `json:"index"` // for carousel items
}

type DownloadResult struct {
	Status    string `json:"status"` // "downloaded", "skipped", "error"
	Message   string `json:"message,omitempty"`
	LocalPath string `json:"localPath,omitempty"`
	Shortcode string `json:"shortcode"`
}

type SkipEntry struct {
	ID        int    `json:"id"`
	Shortcode string `json:"shortcode"`
	Username  string `json:"username"`
	Filename  string `json:"filename"`
	LocalPath string `json:"localPath"`
	SkippedAt string `json:"skippedAt"`
}

type DownloadEntry struct {
	ID           int    `json:"id"`
	Shortcode    string `json:"shortcode"`
	Username     string `json:"username"`
	Filename     string `json:"filename"`
	LocalPath    string `json:"localPath"`
	FileSize     int64  `json:"fileSize"`
	Downloaded   string `json:"downloadedAt"`
	RelativePath string `json:"relativePath"`
}

type LiveLogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Username  string    `json:"username"`
	Filename  string    `json:"filename"`
	Shortcode string    `json:"shortcode"`
	Status    string    `json:"status"` // "downloading", "completed", "skipped", "failed"
	Size      int64     `json:"size,omitempty"`
	Error     string    `json:"error,omitempty"`
}

type ActiveSyncState struct {
	LastActive time.Time      `json:"lastActive"`
	Username   string         `json:"username"`
	IsActive   bool           `json:"isActive"`
	LiveLogs   []LiveLogEntry `json:"liveLogs"`
}

type StatsResponse struct {
	TotalDownloads      int             `json:"totalDownloads"`
	TotalSkipped        int             `json:"totalSkipped"`
	UniqueAccounts      int             `json:"uniqueAccounts"`
	ActiveDownloads     int64           `json:"activeDownloads"`
	ActiveSync          ActiveSyncState `json:"activeSync"`
	DiskTotal           uint64          `json:"diskTotal"`
	DiskFree            uint64          `json:"diskFree"`
	Version             string          `json:"version"`
	DataDir             string          `json:"dataDir"`
	MinExtensionVersion string          `json:"minExtensionVersion"`
	Draining            bool            `json:"draining"`
}

// ─── Global state ─────────────────────────────────────────────────────────────

var (
	db                *sql.DB
	dbMu              sync.Mutex
	baseDir           string
	dataDir           string
	backupsDir        string
	folderStructure   = "profile"
	port              = 19201
	devMode           = false
	activeDownloads   int64
	isDraining        atomic.Bool
	activeSyncState   ActiveSyncState
	activeSyncStateMu sync.Mutex

	updateCache   map[string]any
	updateCacheAt time.Time
	updateCacheMu sync.Mutex
)

func updateLiveLog(username, shortcode, filename, status string, size int64, errStr string) {
	activeSyncStateMu.Lock()
	defer activeSyncStateMu.Unlock()

	activeSyncState.LastActive = time.Now()
	activeSyncState.Username = username
	activeSyncState.IsActive = true

	found := false
	for i := range activeSyncState.LiveLogs {
		if activeSyncState.LiveLogs[i].Filename == filename {
			activeSyncState.LiveLogs[i].Status = status
			if size > 0 {
				activeSyncState.LiveLogs[i].Size = size
			}
			if errStr != "" {
				activeSyncState.LiveLogs[i].Error = errStr
			}
			activeSyncState.LiveLogs[i].Timestamp = time.Now()
			found = true
			break
		}
	}

	if !found {
		entry := LiveLogEntry{
			Timestamp: time.Now(),
			Username:  username,
			Filename:  filename,
			Shortcode: shortcode,
			Status:    status,
			Size:      size,
			Error:     errStr,
		}
		activeSyncState.LiveLogs = append(activeSyncState.LiveLogs, entry)
		if len(activeSyncState.LiveLogs) > 15 {
			activeSyncState.LiveLogs = activeSyncState.LiveLogs[len(activeSyncState.LiveLogs)-15:]
		}
	}
}

// ─── Backups & DB init ────────────────────────────────────────────────────────

func createBackup(database *sql.DB, bDir string, oldSchemaVer int) (string, error) {
	if err := os.MkdirAll(bDir, 0755); err != nil {
		return "", err
	}
	timestamp := time.Now().Format("20060102-150405")
	backupName := fmt.Sprintf("instavault.db.v%d.app%s.%s.bak", oldSchemaVer, sanitize(Version), timestamp)
	backupPath := filepath.Join(bDir, backupName)

	safePath := strings.ReplaceAll(backupPath, "'", "''")
	_, err := database.Exec(fmt.Sprintf("VACUUM INTO '%s'", safePath))
	if err != nil {
		return "", fmt.Errorf("VACUUM INTO failed: %w", err)
	}

	pruneOldBackups(bDir, 5)
	return backupPath, nil
}

func createDbVacuumBackup(dbFilePath, backupPath string) error {
	database, err := sql.Open("sqlite", dbFilePath)
	if err != nil {
		return err
	}
	defer database.Close()
	safePath := strings.ReplaceAll(backupPath, "'", "''")
	_, err = database.Exec(fmt.Sprintf("VACUUM INTO '%s'", safePath))
	return err
}

func pruneOldBackups(bDir string, keepCount int) {
	entries, err := os.ReadDir(bDir)
	if err != nil {
		return
	}

	type fileMeta struct {
		name    string
		modTime time.Time
	}
	var backups []fileMeta
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".bak") {
			continue
		}
		info, err := entry.Info()
		if err == nil {
			backups = append(backups, fileMeta{name: entry.Name(), modTime: info.ModTime()})
		}
	}

	if len(backups) <= keepCount {
		return
	}

	sort.Slice(backups, func(i, j int) bool {
		return backups[i].modTime.Before(backups[j].modTime)
	})

	toDelete := len(backups) - keepCount
	for i := 0; i < toDelete; i++ {
		_ = os.Remove(filepath.Join(bDir, backups[i].name))
	}
}

func initDB(path, bDir string) error {
	var err error
	db, err = sql.Open("sqlite", path)
	if err != nil {
		return err
	}

	// Optimize SQLite for robust concurrency and WAL safety
	_, _ = db.Exec("PRAGMA journal_mode=WAL;")
	_, _ = db.Exec("PRAGMA busy_timeout=5000;")

	var userVersion int
	err = db.QueryRow("PRAGMA user_version").Scan(&userVersion)
	if err != nil {
		return fmt.Errorf("failed reading user_version: %w", err)
	}

	// Safety gate: refuse to run if DB is newer than binary supported schema
	if userVersion > CurrentSchemaVersion {
		return fmt.Errorf("database schema version (%d) is newer than supported by this binary (%d); please update InstaVault", userVersion, CurrentSchemaVersion)
	}

	if userVersion < CurrentSchemaVersion {
		// If tables already exist in legacy DB (version 0), take VACUUM INTO backup before applying migrations
		var tableCount int
		_ = db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('downloads', 'skipped', 'settings')").Scan(&tableCount)
		if tableCount > 0 && bDir != "" {
			bakPath, errBackup := createBackup(db, bDir, userVersion)
			if errBackup != nil {
				log.Printf("[WARN] Pre-migration backup failed: %v", errBackup)
			} else {
				log.Printf("[BACKUP] Created pre-migration backup at: %s", bakPath)
			}
		}

		schema := `
		CREATE TABLE IF NOT EXISTS downloads (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			shortcode   TEXT NOT NULL,
			username    TEXT NOT NULL,
			filename    TEXT NOT NULL,
			local_path  TEXT NOT NULL,
			file_size   INTEGER DEFAULT 0,
			downloaded_at TEXT NOT NULL
		);
		CREATE UNIQUE INDEX IF NOT EXISTS idx_shortcode_filename ON downloads(shortcode, filename);

		CREATE TABLE IF NOT EXISTS skipped (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			shortcode   TEXT NOT NULL,
			username    TEXT NOT NULL,
			filename    TEXT NOT NULL,
			local_path  TEXT NOT NULL,
			skipped_at  TEXT NOT NULL
		);
		CREATE UNIQUE INDEX IF NOT EXISTS idx_skip_shortcode_filename ON skipped(shortcode, filename);

		CREATE TABLE IF NOT EXISTS settings (
			key   TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);
		`
		if _, err := db.Exec(schema); err != nil {
			return fmt.Errorf("schema migration failed: %w", err)
		}

		if _, err := db.Exec(fmt.Sprintf("PRAGMA user_version = %d;", CurrentSchemaVersion)); err != nil {
			return fmt.Errorf("failed setting user_version: %w", err)
		}
		log.Printf("[DB] Database migrated to schema version %d", CurrentSchemaVersion)
	}

	return nil
}

// ─── Legacy DB Migration & PID Management ─────────────────────────────────────

func migrateLegacyDB(targetDbPath string) {
	if _, err := os.Stat(targetDbPath); err == nil {
		return // target DB already exists, no migration needed
	}

	exePath, _ := os.Executable()
	candidates := []string{}
	if exePath != "" {
		candidates = append(candidates, filepath.Join(filepath.Dir(exePath), "instavault.db"))
	}
	cwd, _ := os.Getwd()
	if cwd != "" {
		candidates = append(candidates, filepath.Join(cwd, "instavault.db"))
		candidates = append(candidates, filepath.Join(cwd, "server", "instavault.db"))
	}

	for _, cand := range candidates {
		cand = filepath.Clean(cand)
		if cand == filepath.Clean(targetDbPath) {
			continue
		}
		if fi, err := os.Stat(cand); err == nil && !fi.IsDir() && fi.Size() > 0 {
			log.Printf("[MIGRATE] Found legacy database at: %s. Migrating to: %s", cand, targetDbPath)
			if err := copyFile(cand, targetDbPath); err != nil {
				log.Printf("[WARN] Failed to copy legacy database: %v", err)
			} else {
				log.Printf("[MIGRATE] Legacy database successfully copied to: %s", targetDbPath)
			}
			return
		}
	}
}

func writePidFile(dDir string) string {
	pidPath := filepath.Join(dDir, "instavault.pid")
	_ = os.WriteFile(pidPath, []byte(strconv.Itoa(os.Getpid())), 0644)
	return pidPath
}

func removePidFile(pidPath string) {
	if pidPath != "" {
		_ = os.Remove(pidPath)
	}
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}

func downloadToFile(rawURL, destPath string) error {
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Get(rawURL)
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

func getAppDataBaseDir() string {
	if localAppData := os.Getenv("LOCALAPPDATA"); localAppData != "" {
		return filepath.Join(localAppData, "InstaVault")
	}
	if home, err := os.UserHomeDir(); err == nil {
		return filepath.Join(home, ".instavault")
	}
	return "instavault_data"
}

func getTargetPath(username, filename, fileExt string) (string, string) {
	safeUser := sanitize(username)
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

	relTarget, errTarget := filepath.Rel(cleanBaseDir, cleanTargetDir)
	if errTarget != nil || strings.HasPrefix(relTarget, "..") || relTarget == ".." {
		cleanTargetDir = cleanBaseDir
	}

	safeFilename := sanitize(filename)
	fullPath := filepath.Clean(filepath.Join(cleanTargetDir, safeFilename))

	relFull, errFull := filepath.Rel(cleanBaseDir, fullPath)
	if errFull != nil || strings.HasPrefix(relFull, "..") || relFull == ".." {
		fullPath = filepath.Join(cleanBaseDir, filepath.Base(safeFilename))
	}

	return cleanTargetDir, fullPath
}

func sanitize(name string) string {
	re := regexp.MustCompile(`[<>:"/\\|?*\x00-\x1f]`)
	s := re.ReplaceAllString(name, "_")
	s = strings.TrimSpace(s)
	s = strings.Trim(s, ".")
	if s == "" {
		s = "unnamed"
	}
	return s
}

func isAlreadyDownloaded(shortcode, filename string) (bool, string) {
	dbMu.Lock()
	defer dbMu.Unlock()
	var localPath string
	err := db.QueryRow(
		`SELECT local_path FROM downloads WHERE shortcode=? AND filename=?`,
		shortcode, filename,
	).Scan(&localPath)
	if err == sql.ErrNoRows {
		return false, ""
	}
	if err != nil {
		return false, ""
	}
	if _, statErr := os.Stat(localPath); statErr != nil {
		return false, ""
	}
	return true, localPath
}

func recordDownload(shortcode, username, filename, localPath string, size int64) {
	dbMu.Lock()
	defer dbMu.Unlock()
	_, _ = db.Exec(
		`INSERT OR REPLACE INTO downloads(shortcode,username,filename,local_path,file_size,downloaded_at) VALUES(?,?,?,?,?,?)`,
		shortcode, username, filename, localPath, size, time.Now().Format(time.RFC3339),
	)
	_, _ = db.Exec(`DELETE FROM skipped WHERE shortcode=? AND filename=?`, shortcode, filename)
}

func recordSkip(shortcode, username, filename, localPath string) {
	dbMu.Lock()
	defer dbMu.Unlock()
	_, _ = db.Exec(
		`INSERT OR IGNORE INTO skipped(shortcode,username,filename,local_path,skipped_at) VALUES(?,?,?,?,?)`,
		shortcode, username, filename, localPath, time.Now().Format(time.RFC3339),
	)
}

func downloadFile(url, destPath string) (int64, error) {
	client := &http.Client{Timeout: 60 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
	req.Header.Set("Referer", "https://www.instagram.com/")

	resp, err := client.Do(req)
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

	n, err := io.Copy(out, resp.Body)
	return n, err
}

// ─── Middleware & Security ────────────────────────────────────────────────────

func isAllowedOrigin(origin string) bool {
	origin = strings.ToLower(strings.TrimSpace(origin))
	if strings.HasPrefix(origin, "chrome-extension://") {
		return true
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	hostname := strings.ToLower(u.Hostname())
	return hostname == "localhost" || hostname == "127.0.0.1" || hostname == "::1"
}

// csrfMiddleware protects mutating requests against CSRF and cross-site attacks
func csrfMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost || r.Method == http.MethodPut || r.Method == http.MethodPatch || r.Method == http.MethodDelete {
			origin := r.Header.Get("Origin")
			if origin != "" {
				if !isAllowedOrigin(origin) {
					http.Error(w, "Forbidden: Invalid Origin header (CSRF protection)", http.StatusForbidden)
					return
				}
			} else {
				// No Origin header: verify that RemoteAddr is loopback (allows CLI, curl, local tests)
				remoteHost, _, err := net.SplitHostPort(r.RemoteAddr)
				if err != nil {
					remoteHost = r.RemoteAddr
				}
				if remoteHost != "127.0.0.1" && remoteHost != "::1" && remoteHost != "localhost" {
					http.Error(w, "Forbidden: Origin header required for non-loopback requests", http.StatusForbidden)
					return
				}
			}
		}
		next.ServeHTTP(w, r)
	})
}

func validateHostMiddleware(allowedHost string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host := r.Host
		if h, _, err := net.SplitHostPort(host); err == nil {
			host = h
		}
		host = strings.ToLower(strings.TrimSpace(host))

		isAllowed := host == "localhost" || host == "127.0.0.1" || host == "::1" || host == "[::1]"
		if allowedHost != "" && allowedHost != "0.0.0.0" {
			if strings.EqualFold(host, allowedHost) {
				isAllowed = true
			}
		} else if allowedHost == "0.0.0.0" {
			isAllowed = true
		}

		if !isAllowed {
			http.Error(w, "Forbidden: Invalid Host header (DNS rebinding protection)", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Origin")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		h(w, r)
	}
}

func jsonResp(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

// ─── API handlers ─────────────────────────────────────────────────────────────

func handlePing(w http.ResponseWriter, r *http.Request) {
	jsonResp(w, http.StatusOK, map[string]any{
		"status":              "ok",
		"version":             Version,
		"schemaVersion":       CurrentSchemaVersion,
		"minExtensionVersion": MinExtensionVersion,
		"baseDir":             baseDir,
		"dataDir":             dataDir,
		"port":                port,
		"dev":                 devMode,
		"draining":            isDraining.Load(),
	})
}

func handleDownload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if isDraining.Load() {
		jsonResp(w, http.StatusServiceUnavailable, DownloadResult{
			Status:  "error",
			Message: "Server is draining for update; downloads temporarily refused",
		})
		return
	}

	var req DownloadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonResp(w, http.StatusBadRequest, DownloadResult{Status: "error", Message: "invalid JSON"})
		return
	}

	if req.URL == "" || req.Shortcode == "" || req.Username == "" {
		jsonResp(w, http.StatusBadRequest, DownloadResult{Status: "error", Message: "missing required fields"})
		return
	}

	atomic.AddInt64(&activeDownloads, 1)
	defer atomic.AddInt64(&activeDownloads, -1)

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

	updateLiveLog(req.Username, req.Shortcode, filename, "downloading", 0, "")

	userDir, localPath := getTargetPath(req.Username, filename, req.FileExt)
	if err := os.MkdirAll(userDir, 0755); err != nil {
		jsonResp(w, http.StatusInternalServerError, DownloadResult{Status: "error", Message: err.Error()})
		return
	}

	// Check dedup
	if already, existingPath := isAlreadyDownloaded(req.Shortcode, filename); already {
		recordSkip(req.Shortcode, req.Username, filename, existingPath)
		updateLiveLog(req.Username, req.Shortcode, filename, "skipped", 0, "")
		log.Printf("[SKIP] %s/%s (already in DB+disk)", req.Username, filename)
		jsonResp(w, http.StatusOK, DownloadResult{
			Status:    "skipped",
			Shortcode: req.Shortcode,
			LocalPath: existingPath,
			Message:   "already downloaded",
		})
		return
	}

	// Download
	log.Printf("[DL]   %s/%s", req.Username, filename)
	size, err := downloadFile(req.URL, localPath)
	if err != nil {
		log.Printf("[ERR]  %s/%s: %v", req.Username, filename, err)
		updateLiveLog(req.Username, req.Shortcode, filename, "failed", 0, err.Error())
		jsonResp(w, http.StatusInternalServerError, DownloadResult{
			Status:    "error",
			Shortcode: req.Shortcode,
			Message:   err.Error(),
		})
		return
	}

	recordDownload(req.Shortcode, req.Username, filename, localPath, size)
	updateLiveLog(req.Username, req.Shortcode, filename, "completed", size, "")
	jsonResp(w, http.StatusOK, DownloadResult{
		Status:    "downloaded",
		Shortcode: req.Shortcode,
		LocalPath: localPath,
	})
}

func handleForceDownload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if isDraining.Load() {
		jsonResp(w, http.StatusServiceUnavailable, map[string]string{
			"error": "Server is draining for update; downloads temporarily refused",
		})
		return
	}

	var req DownloadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonResp(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}

	atomic.AddInt64(&activeDownloads, 1)
	defer atomic.AddInt64(&activeDownloads, -1)

	dbMu.Lock()
	_, _ = db.Exec(`DELETE FROM downloads WHERE shortcode=? AND filename=?`, req.Shortcode, req.Filename)
	_, _ = db.Exec(`DELETE FROM skipped WHERE shortcode=? AND filename=?`, req.Shortcode, req.Filename)
	dbMu.Unlock()

	userDir, localPath := getTargetPath(req.Username, req.Filename, "")
	_ = os.MkdirAll(userDir, 0755)

	size, err := downloadFile(req.URL, localPath)
	if err != nil {
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	recordDownload(req.Shortcode, req.Username, req.Filename, localPath, size)
	log.Printf("[FORCE] %s/%s re-downloaded", req.Username, req.Filename)
	jsonResp(w, http.StatusOK, map[string]string{"status": "downloaded", "localPath": localPath})
}

func handleListSkipped(w http.ResponseWriter, r *http.Request) {
	page := 1
	limit := 50
	fmt.Sscanf(r.URL.Query().Get("page"), "%d", &page)
	fmt.Sscanf(r.URL.Query().Get("limit"), "%d", &limit)
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	dbMu.Lock()
	defer dbMu.Unlock()

	rows, err := db.Query(
		`SELECT id,shortcode,username,filename,local_path,skipped_at FROM skipped ORDER BY id DESC LIMIT ? OFFSET ?`,
		limit, offset,
	)
	if err != nil {
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	var entries []SkipEntry
	for rows.Next() {
		var e SkipEntry
		_ = rows.Scan(&e.ID, &e.Shortcode, &e.Username, &e.Filename, &e.LocalPath, &e.SkippedAt)
		entries = append(entries, e)
	}
	if entries == nil {
		entries = []SkipEntry{}
	}
	jsonResp(w, http.StatusOK, entries)
}

func handleListDownloads(w http.ResponseWriter, r *http.Request) {
	page := 1
	limit := 50
	fmt.Sscanf(r.URL.Query().Get("page"), "%d", &page)
	fmt.Sscanf(r.URL.Query().Get("limit"), "%d", &limit)
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit
	username := r.URL.Query().Get("username")

	dbMu.Lock()
	defer dbMu.Unlock()

	var rows *sql.Rows
	var err error
	if username != "" {
		rows, err = db.Query(
			`SELECT id,shortcode,username,filename,local_path,file_size,downloaded_at FROM downloads WHERE username=? ORDER BY id DESC LIMIT ? OFFSET ?`,
			username, limit, offset,
		)
	} else {
		rows, err = db.Query(
			`SELECT id,shortcode,username,filename,local_path,file_size,downloaded_at FROM downloads ORDER BY id DESC LIMIT ? OFFSET ?`,
			limit, offset,
		)
	}
	if err != nil {
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	var entries []DownloadEntry
	for rows.Next() {
		var e DownloadEntry
		_ = rows.Scan(&e.ID, &e.Shortcode, &e.Username, &e.Filename, &e.LocalPath, &e.FileSize, &e.Downloaded)
		rel, err := filepath.Rel(baseDir, e.LocalPath)
		if err == nil {
			e.RelativePath = rel
		} else {
			e.RelativePath = e.Filename
		}
		entries = append(entries, e)
	}
	if entries == nil {
		entries = []DownloadEntry{}
	}
	jsonResp(w, http.StatusOK, entries)
}

func handleStats(w http.ResponseWriter, r *http.Request) {
	dbMu.Lock()
	defer dbMu.Unlock()

	var s StatsResponse
	_ = db.QueryRow(`SELECT COUNT(*) FROM downloads`).Scan(&s.TotalDownloads)
	_ = db.QueryRow(`SELECT COUNT(*) FROM skipped`).Scan(&s.TotalSkipped)
	_ = db.QueryRow(`SELECT COUNT(DISTINCT username) FROM downloads`).Scan(&s.UniqueAccounts)

	activeSyncStateMu.Lock()
	if activeSyncState.IsActive {
		if time.Since(activeSyncState.LastActive) > 8*time.Second {
			activeSyncState.IsActive = false
		}
	}
	s.ActiveSync = activeSyncState
	activeSyncStateMu.Unlock()

	s.ActiveDownloads = atomic.LoadInt64(&activeDownloads)
	s.Version = Version
	s.DataDir = dataDir
	s.MinExtensionVersion = MinExtensionVersion
	s.Draining = isDraining.Load()

	diskTotal, diskFree, _ := getDiskUsage(baseDir)
	s.DiskTotal = diskTotal
	s.DiskFree = diskFree

	jsonResp(w, http.StatusOK, s)
}

func handleAccounts(w http.ResponseWriter, r *http.Request) {
	dbMu.Lock()
	defer dbMu.Unlock()

	rows, err := db.Query(`SELECT username, COUNT(*) as cnt FROM downloads GROUP BY username ORDER BY cnt DESC`)
	if err != nil {
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	type Account struct {
		Username string `json:"username"`
		Count    int    `json:"count"`
	}
	var accounts []Account
	for rows.Next() {
		var a Account
		_ = rows.Scan(&a.Username, &a.Count)
		accounts = append(accounts, a)
	}
	if accounts == nil {
		accounts = []Account{}
	}
	jsonResp(w, http.StatusOK, accounts)
}

func handleGetSettings(w http.ResponseWriter, r *http.Request) {
	dbMu.Lock()
	defer dbMu.Unlock()
	settings := map[string]string{
		"baseDir":         baseDir,
		"folderStructure": folderStructure,
		"dataDir":         dataDir,
		"version":         Version,
	}
	rows, _ := db.Query(`SELECT key, value FROM settings`)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var k, v string
			_ = rows.Scan(&k, &v)
			settings[k] = v
		}
	}
	jsonResp(w, http.StatusOK, settings)
}

func handleSaveSettings(w http.ResponseWriter, r *http.Request) {
	var body map[string]string
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonResp(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}

	dbMu.Lock()
	defer dbMu.Unlock()

	if newDir, ok := body["baseDir"]; ok && newDir != "" {
		if err := os.MkdirAll(newDir, 0755); err != nil {
			jsonResp(w, http.StatusBadRequest, map[string]string{"error": "cannot create directory: " + err.Error()})
			return
		}
		baseDir = newDir
		_, _ = db.Exec(`INSERT OR REPLACE INTO settings(key,value) VALUES('baseDir',?)`, newDir)
	}

	if newStruct, ok := body["folderStructure"]; ok && newStruct != "" {
		if newStruct == "profile" || newStruct == "flat" || newStruct == "profile_type" {
			folderStructure = newStruct
			_, _ = db.Exec(`INSERT OR REPLACE INTO settings(key,value) VALUES('folderStructure',?)`, newStruct)
		}
	}

	jsonResp(w, http.StatusOK, map[string]string{
		"status":          "saved",
		"baseDir":         baseDir,
		"folderStructure": folderStructure,
	})
}

func handleDeleteSkip(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/api/skipped/")
	dbMu.Lock()
	_, _ = db.Exec(`DELETE FROM skipped WHERE id=?`, id)
	dbMu.Unlock()
	jsonResp(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func handleDeleteAllSkipped(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	dbMu.Lock()
	_, _ = db.Exec(`DELETE FROM skipped`)
	dbMu.Unlock()
	jsonResp(w, http.StatusOK, map[string]string{"status": "cleared"})
}

func handleDeleteAllDownloads(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	dbMu.Lock()
	_, _ = db.Exec(`DELETE FROM downloads`)
	dbMu.Unlock()
	jsonResp(w, http.StatusOK, map[string]string{"status": "cleared"})
}

// GET /api/check-update (12-hour cached read-only update notice)
func handleCheckUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	updateCacheMu.Lock()
	defer updateCacheMu.Unlock()

	if time.Since(updateCacheAt) < 12*time.Hour && updateCache != nil {
		jsonResp(w, http.StatusOK, updateCache)
		return
	}

	customURL := ""
	if devMode {
		customURL = os.Getenv("INSTAVAULT_UPDATE_URL")
	}

	resp := map[string]any{
		"currentVersion":  Version,
		"updateAvailable": false,
		"command":         "instavault-server.exe -update",
	}

	rel, err := update.FetchLatestRelease(nil, "vampdued", "mass-downloader-for-instagram", customURL)
	if err == nil && rel != nil {
		resp["latestVersion"] = rel.TagName
		resp["publishedAt"] = rel.PublishedAt.Format(time.RFC3339)
		if update.CompareSemver(rel.TagName, Version) > 0 {
			resp["updateAvailable"] = true
		}
	} else if err != nil {
		resp["error"] = err.Error()
	}

	if st, errStatus := update.ReadUpdateStatus(dataDir); errStatus == nil && st != nil {
		resp["lastUpdateStatus"] = st
	}

	updateCache = resp
	updateCacheAt = time.Now()

	jsonResp(w, http.StatusOK, resp)
}

// ─── Logging Setup ────────────────────────────────────────────────────────────

func setupLogging(logsDir string, isDev bool) (*os.File, error) {
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		return nil, err
	}
	logPath := filepath.Join(logsDir, "instavault.log")

	// Rotate log if it exceeds 10MB
	if fi, err := os.Stat(logPath); err == nil && fi.Size() > 10*1024*1024 {
		rotatedPath := filepath.Join(logsDir, "instavault.log.1")
		_ = os.Remove(rotatedPath)
		_ = os.Rename(logPath, rotatedPath)
	}

	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil, err
	}

	if isDev {
		mw := io.MultiWriter(os.Stdout, logFile)
		log.SetOutput(mw)
	} else {
		_ = redirectStdHandles(logFile)
		log.SetOutput(logFile)
	}

	return logFile, nil
}

// ─── Main ─────────────────────────────────────────────────────────────────────

func main() {
	var (
		hostFlag             = flag.String("host", "localhost", "host address to bind to (use 0.0.0.0 to allow LAN access)")
		portFlag             = flag.Int("port", 0, "port to listen on (default 19201 in prod, 19202 in dev)")
		devFlag              = flag.Bool("dev", false, "run in development mode (hot-reloads UI from disk, port 19202)")
		dataDirFlag          = flag.String("data-dir", "", "override data directory (defaults to %LOCALAPPDATA%\\InstaVault)")
		waitPidFlag          = flag.Int("wait-pid", 0, "PID to wait for exit before acquiring mutex or listening")
		selfcheckFlag        = flag.Bool("selfcheck", false, "verify DB migrations and health, then exit 0")
		selfcheckDbFlag      = flag.String("selfcheck-db", "", "path to SQLite file to test with -selfcheck")
		allowCustomUpdateURL = flag.Bool("allow-custom-update-url", false, "allow custom update endpoint from INSTAVAULT_UPDATE_URL")
		updateFlag           = flag.Bool("update", false, "check and apply updates via CLI")
		forceFlag            = flag.Bool("force", false, "bypass version/path pre-flight checks during update")
		applyUpdateFlag      = flag.Bool("apply-update", false, "internal updater helper mode (skips mutex)")
		newExeFlag           = flag.String("new-exe", "", "internal: path to new binary for helper swap")
		targetExeFlag        = flag.String("target-exe", "", "internal: path to installed target binary")
		extZipFlag           = flag.String("ext-zip", "", "internal: path to new extension zip")
		extDirFlag           = flag.String("ext-dir", "", "internal: path to unpacked extension folder")
		dbPathFlag           = flag.String("db-path", "", "internal: path to live SQLite database")
		expectedVerFlag      = flag.String("expected-ver", "", "internal: expected target version string")
		versionFlag          = flag.Bool("version", false, "print version and exit")
	)
	flag.Parse()

	if *versionFlag {
		fmt.Printf("InstaVault v%s (schema v%d)\n", Version, CurrentSchemaVersion)
		return
	}

	devMode = *devFlag

	// Configure base directories
	baseRoot := getAppDataBaseDir()
	if *dataDirFlag != "" {
		dataDir = *dataDirFlag
	} else if envData := os.Getenv("INSTAVAULT_DATA_DIR"); envData != "" {
		dataDir = envData
	} else if devMode {
		dataDir = filepath.Join(baseRoot, "dev-data")
	} else {
		dataDir = filepath.Join(baseRoot, "data")
	}

	logsDir := filepath.Join(baseRoot, "logs")
	backupsDir = filepath.Join(baseRoot, "backups")

	_ = os.MkdirAll(dataDir, 0755)
	_ = os.MkdirAll(logsDir, 0755)
	_ = os.MkdirAll(backupsDir, 0755)

	targetDbPath := filepath.Join(dataDir, "instavault.db")

	// Port configuration
	if *portFlag > 0 {
		port = *portFlag
	} else if envPort := os.Getenv("INSTAVAULT_PORT"); envPort != "" {
		if p, err := strconv.Atoi(envPort); err == nil {
			port = p
		}
	} else if devMode {
		port = 19202
	} else {
		port = 19201
	}

	// ── Helper Mode (-apply-update) ───────────────────────────────────────────
	if *applyUpdateFlag {
		// Runs out of temp directory, skips single-instance mutex
		var initialSchema int
		if *dbPathFlag != "" {
			if d, err := sql.Open("sqlite", *dbPathFlag); err == nil {
				_ = d.QueryRow("PRAGMA user_version").Scan(&initialSchema)
				_ = d.Close()
			}
		}

		opts := update.ApplyUpdateOptions{
			NewExePath:       *newExeFlag,
			TargetExePath:    *targetExeFlag,
			ExtZipPath:       *extZipFlag,
			ExtDirPath:       *extDirFlag,
			WaitPID:          *waitPidFlag,
			Port:             port,
			DataDir:          dataDir,
			LogsDir:          logsDir,
			BackupsDir:       backupsDir,
			DBPath:           *dbPathFlag,
			ExpectedVersion:  *expectedVerFlag,
			InitialSchemaVer: initialSchema,
			SpawnFunc:        spawnDetachedProcess,
			WaitPIDFunc:      waitForProcessExit,
		}

		if err := update.ExecuteApplyUpdate(opts); err != nil {
			fmt.Fprintf(os.Stderr, "Apply update failed: %v\n", err)
			os.Exit(1)
		}
		return
	}

	// ── CLI Update Workflow (-update) ─────────────────────────────────────────
	if *updateFlag {
		fmt.Printf("=== InstaVault CLI Updater (Current: v%s) ===\n", Version)
		exePath, err := os.Executable()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error locating executable: %v\n", err)
			os.Exit(1)
		}

		customURL := ""
		if *allowCustomUpdateURL || devMode {
			customURL = os.Getenv("INSTAVAULT_UPDATE_URL")
		}

		fmt.Println("• Checking GitHub for latest release...")
		rel, err := update.FetchLatestRelease(nil, "vampdued", "mass-downloader-for-instagram", customURL)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Update check failed: %v\n", err)
			os.Exit(1)
		}

		targetVer := rel.TagName
		cleanTargetVer := strings.TrimPrefix(targetVer, "v")

		if err := update.RunPreflightCheck(exePath, Version, cleanTargetVer, *forceFlag); err != nil {
			fmt.Fprintf(os.Stderr, "Pre-flight check: %v\n", err)
			if update.CompareSemver(cleanTargetVer, Version) <= 0 {
				os.Exit(0)
			}
			os.Exit(1)
		}

		fmt.Printf("• New version available: v%s -> %s (Published: %s)\n", Version, targetVer, rel.PublishedAt.Format("2006-01-02"))

		tempDir := filepath.Join(os.TempDir(), "instavault-updater")
		_ = os.RemoveAll(tempDir)
		_ = os.MkdirAll(tempDir, 0755)

		var binAsset, extAsset, checksumAsset *update.Asset
		for i := range rel.Assets {
			a := &rel.Assets[i]
			switch a.Name {
			case "instavault-windows-amd64.zip":
				binAsset = a
			case "instavault-extension.zip":
				extAsset = a
			case "checksums.txt":
				checksumAsset = a
			}
		}

		if binAsset == nil {
			fmt.Fprintf(os.Stderr, "Release %s does not contain instavault-windows-amd64.zip\n", targetVer)
			os.Exit(1)
		}

		binZipPath := filepath.Join(tempDir, binAsset.Name)
		fmt.Printf("• Downloading %s...\n", binAsset.Name)
		if err := downloadToFile(binAsset.BrowserDownloadURL, binZipPath); err != nil {
			fmt.Fprintf(os.Stderr, "Failed downloading binary asset: %v\n", err)
			os.Exit(1)
		}

		var extZipPath string
		if extAsset != nil {
			extZipPath = filepath.Join(tempDir, extAsset.Name)
			fmt.Printf("• Downloading %s...\n", extAsset.Name)
			_ = downloadToFile(extAsset.BrowserDownloadURL, extZipPath)
		}

		if checksumAsset != nil {
			checksumPath := filepath.Join(tempDir, checksumAsset.Name)
			if err := downloadToFile(checksumAsset.BrowserDownloadURL, checksumPath); err == nil {
				fmt.Println("• Verifying SHA256 checksums...")
				lines, _ := os.ReadFile(checksumPath)
				for _, line := range strings.Split(string(lines), "\n") {
					parts := strings.Fields(line)
					if len(parts) >= 2 {
						hash, name := parts[0], parts[1]
						if name == binAsset.Name {
							if err := update.VerifySHA256(binZipPath, hash); err != nil {
								fmt.Fprintf(os.Stderr, "Binary SHA256 mismatch: %v\n", err)
								os.Exit(1)
							}
						}
						if extAsset != nil && name == extAsset.Name {
							_ = update.VerifySHA256(extZipPath, hash)
						}
					}
				}
			}
		}

		extractedBinDir := filepath.Join(tempDir, "extracted_bin")
		if err := update.SafeExtractZip(binZipPath, extractedBinDir); err != nil {
			fmt.Fprintf(os.Stderr, "Failed extracting binary zip: %v\n", err)
			os.Exit(1)
		}
		newExePath := filepath.Join(extractedBinDir, "instavault-server.exe")

		fmt.Println("• Running pre-flight self-check on new binary...")
		earlyBackupPath := filepath.Join(tempDir, "early_selfcheck.db")
		_ = createDbVacuumBackup(targetDbPath, earlyBackupPath)

		selfCheckCmd := exec.Command(newExePath, "-selfcheck", "-selfcheck-db", earlyBackupPath)
		if out, err := selfCheckCmd.CombinedOutput(); err != nil {
			fmt.Fprintf(os.Stderr, "New binary self-check failed: %v\nOutput: %s\n", err, string(out))
			os.Exit(1)
		}
		fmt.Println("• Self-check passed!")

		// Determine if daemon is running
		daemonRunning := false
		var daemonPid int

		pingResp, errPing := http.Get(fmt.Sprintf("http://localhost:%d/api/version", port))
		if errPing == nil && pingResp.StatusCode == http.StatusOK {
			daemonRunning = true
			_ = pingResp.Body.Close()
		}

		if daemonRunning {
			fmt.Printf("• Requesting running daemon on port %d to shutdown...\n", port)
			shutdownReq, _ := http.NewRequest(http.MethodPost, fmt.Sprintf("http://localhost:%d/api/shutdown?reason=update", port), nil)
			shutdownReq.Header.Set("Origin", "http://localhost")
			client := &http.Client{Timeout: 5 * time.Second}
			resp, errShut := client.Do(shutdownReq)
			if errShut != nil {
				fmt.Printf("Notice: could not reach shutdown endpoint: %v\n", errShut)
			} else {
				defer resp.Body.Close()
				if resp.StatusCode == http.StatusConflict {
					var errBody struct {
						Error string `json:"error"`
					}
					_ = json.NewDecoder(resp.Body).Decode(&errBody)
					fmt.Fprintf(os.Stderr, "\nUpdate rejected: %s\n", errBody.Error)
					os.Exit(1)
				}
				var shutBody struct {
					PID int `json:"pid"`
				}
				_ = json.NewDecoder(resp.Body).Decode(&shutBody)
				daemonPid = shutBody.PID
			}
		}

		// Stage helper in temp directory
		helperPath := filepath.Join(tempDir, "instavault-helper.exe")
		if err := copyFile(exePath, helperPath); err != nil {
			fmt.Fprintf(os.Stderr, "Failed copying updater helper: %v\n", err)
			os.Exit(1)
		}

		extInstalledDir := filepath.Join(filepath.Dir(filepath.Dir(exePath)), "extension")

		fmt.Println("• Handing over to updater helper...")
		helperCmd := exec.Command(
			helperPath,
			"-apply-update",
			"-new-exe", newExePath,
			"-target-exe", exePath,
			"-ext-zip", extZipPath,
			"-ext-dir", extInstalledDir,
			"-wait-pid", strconv.Itoa(daemonPid),
			"-port", strconv.Itoa(port),
			"-data-dir", dataDir,
			"-db-path", targetDbPath,
			"-expected-ver", cleanTargetVer,
		)
		helperCmd.Stdout = os.Stdout
		helperCmd.Stderr = os.Stderr

		if err := helperCmd.Run(); err != nil {
			fmt.Fprintf(os.Stderr, "Update failed: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("\nSUCCESS: InstaVault updated to v%s!\n", cleanTargetVer)
		fmt.Println("Notice: If extension files were updated, please click ↺ Reload on chrome://extensions.")
		return
	}

	// ── Normal Daemon Execution ───────────────────────────────────────────────

	// Wait for prior process exit if requested (used during updates / restarts)
	if *waitPidFlag > 0 {
		_ = waitForProcessExit(*waitPidFlag, 30*time.Second)
	}

	// Single instance mutex check (skipped in -selfcheck and -apply-update modes)
	if !*selfcheckFlag && !*applyUpdateFlag {
		mutexName := "Local\\InstaVault_SingleInstance_Mutex"
		if devMode {
			mutexName = "Local\\InstaVault_Dev_SingleInstance_Mutex"
		}
		acquired, err := acquireSingleInstanceMutex(mutexName)
		if err != nil {
			log.Printf("[WARN] Mutex check error: %v", err)
		} else if !acquired {
			fmt.Fprintf(os.Stderr, "InstaVault is already running (another instance holds %s).\n", mutexName)
			os.Exit(1)
		}
		defer releaseSingleInstanceMutex()
	}

	// Setup logging
	logFile, errLog := setupLogging(logsDir, devMode)
	if errLog == nil && logFile != nil {
		defer logFile.Close()
	}

	// Self-check mode
	if *selfcheckFlag {
		testDbPath := *selfcheckDbFlag
		if testDbPath == "" {
			tmpDir, err := os.MkdirTemp("", "instavault-selfcheck-*")
			if err != nil {
				log.Fatalf("[SELFCHECK] Failed creating temp dir: %v", err)
			}
			defer os.RemoveAll(tmpDir)
			testDbPath = filepath.Join(tmpDir, "selfcheck.db")
		}

		if err := initDB(testDbPath, ""); err != nil {
			log.Fatalf("[SELFCHECK] FAIL: DB initialization/migration failed: %v", err)
		}
		var testCount int
		if err := db.QueryRow("SELECT COUNT(*) FROM downloads").Scan(&testCount); err != nil {
			log.Fatalf("[SELFCHECK] FAIL: Query test failed: %v", err)
		}
		_ = db.Close()
		log.Println("[SELFCHECK] PASS: Database, migrations, and binary health verified successfully.")
		return
	}

	host := *hostFlag
	if envHost := os.Getenv("INSTAVAULT_HOST"); envHost != "" {
		host = envHost
	}

	// Determine default base dir for media
	home, _ := os.UserHomeDir()
	baseDir = filepath.Join(home, "Downloads", "Instagram")

	// Target DB path and legacy migration
	migrateLegacyDB(targetDbPath)

	if err := initDB(targetDbPath, backupsDir); err != nil {
		log.Fatalf("DB init failed: %v", err)
	}
	defer db.Close()

	// Write PID file for CLI-to-daemon tracking
	pidFile := writePidFile(dataDir)
	defer removePidFile(pidFile)

	// Restore saved settings
	var savedDir string
	if err := db.QueryRow(`SELECT value FROM settings WHERE key='baseDir'`).Scan(&savedDir); err == nil && savedDir != "" {
		baseDir = savedDir
	}
	var savedStruct string
	if err := db.QueryRow(`SELECT value FROM settings WHERE key='folderStructure'`).Scan(&savedStruct); err == nil && savedStruct != "" {
		folderStructure = savedStruct
	}
	_ = os.MkdirAll(baseDir, 0755)

	log.Printf("InstaVault v%s (schema v%d, dev=%t) starting — dataDir: %s, baseDir: %s", Version, CurrentSchemaVersion, devMode, dataDir, baseDir)

	// Determine UI asset directory for dev hot-reloading
	var devUiDir string
	if devMode {
		cwd, _ := os.Getwd()
		candidates := []string{
			filepath.Join(cwd, "ui"),
			filepath.Join(cwd, "server", "ui"),
		}
		for _, c := range candidates {
			if fi, err := os.Stat(c); err == nil && fi.IsDir() {
				devUiDir = c
				break
			}
		}
		if devUiDir != "" {
			log.Printf("[DEV] Hot-reloading UI directly from disk: %s", devUiDir)
		}
	}

	// ── Routes ──────────────────────────────────────────────────────────────
	mux := http.NewServeMux()

	mux.HandleFunc("/api/ping", withCORS(handlePing))
	mux.HandleFunc("/api/version", withCORS(handlePing))
	mux.HandleFunc("/api/check-update", withCORS(handleCheckUpdate))
	mux.HandleFunc("/api/media/", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		filePath := strings.TrimPrefix(r.URL.Path, "/api/media/")
		safePath := filepath.Clean(filePath)
		if strings.HasPrefix(safePath, "..") || strings.HasPrefix(safePath, "/") {
			http.Error(w, "Access Denied", http.StatusForbidden)
			return
		}
		fullPath := filepath.Join(baseDir, safePath)
		http.ServeFile(w, r, fullPath)
	}))
	mux.HandleFunc("/api/download", withCORS(handleDownload))
	mux.HandleFunc("/api/force-download", withCORS(handleForceDownload))
	mux.HandleFunc("/api/skipped", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			handleDeleteAllSkipped(w, r)
		} else {
			handleListSkipped(w, r)
		}
	}))
	mux.HandleFunc("/api/downloads", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			handleDeleteAllDownloads(w, r)
		} else {
			handleListDownloads(w, r)
		}
	}))
	mux.HandleFunc("/api/stats", withCORS(handleStats))
	mux.HandleFunc("/api/accounts", withCORS(handleAccounts))
	mux.HandleFunc("/api/settings", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handleSaveSettings(w, r)
		} else {
			handleGetSettings(w, r)
		}
	}))

	// Route /api/skipped/{id}
	mux.HandleFunc("/api/skipped/", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			handleDeleteSkip(w, r)
		} else if r.Method == http.MethodPost {
			body := struct {
				URL       string `json:"url"`
				Username  string `json:"username"`
				Filename  string `json:"filename"`
				Shortcode string `json:"shortcode"`
			}{}
			_ = json.NewDecoder(r.Body).Decode(&body)
			dbMu.Lock()
			_, _ = db.Exec(`DELETE FROM skipped WHERE shortcode=? AND filename=?`, body.Shortcode, body.Filename)
			_, _ = db.Exec(`DELETE FROM downloads WHERE shortcode=? AND filename=?`, body.Shortcode, body.Filename)
			dbMu.Unlock()

			userDir, localPath := getTargetPath(body.Username, body.Filename, "")
			_ = os.MkdirAll(userDir, 0755)
			size, err := downloadFile(body.URL, localPath)
			if err != nil {
				jsonResp(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			recordDownload(body.Shortcode, body.Username, body.Filename, localPath, size)
			jsonResp(w, http.StatusOK, map[string]string{"status": "downloaded", "localPath": localPath})
		} else {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	// HTTP Server & Middleware Stack
	addr := fmt.Sprintf("%s:%d", host, port)
	handler := validateHostMiddleware(host, csrfMiddleware(mux))
	server := &http.Server{
		Addr:    addr,
		Handler: handler,
	}

	// Loopback & CSRF-protected shutdown endpoint
	mux.HandleFunc("/api/shutdown", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		remoteHost, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			remoteHost = r.RemoteAddr
		}
		if remoteHost != "127.0.0.1" && remoteHost != "::1" && remoteHost != "localhost" {
			http.Error(w, "Forbidden: shutdown only allowed from loopback", http.StatusForbidden)
			return
		}

		reason := r.URL.Query().Get("reason")
		if reason == "update" {
			isDraining.Store(true)
			active := atomic.LoadInt64(&activeDownloads)
			if active > 0 {
				isDraining.Store(false)
				jsonResp(w, http.StatusConflict, map[string]any{
					"error":           fmt.Sprintf("Active downloads in progress (%d); please wait or cancel", active),
					"activeDownloads": active,
				})
				return
			}
		}

		jsonResp(w, http.StatusOK, map[string]any{
			"status": "shutting_down",
			"pid":    os.Getpid(),
			"reason": reason,
		})
		go func() {
			time.Sleep(200 * time.Millisecond)
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_ = server.Shutdown(ctx)
		}()
	}))

	// UI Handler (FS in Dev, embed in Prod)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}

		var data []byte
		var readErr error

		if devUiDir != "" {
			w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
			w.Header().Set("Pragma", "no-cache")
			w.Header().Set("Expires", "0")

			diskPath := filepath.Join(devUiDir, path)
			data, readErr = os.ReadFile(diskPath)
			if readErr != nil {
				data, readErr = os.ReadFile(filepath.Join(devUiDir, "index.html"))
			}
		} else {
			embedPath := "ui/" + path
			data, readErr = uiFS.ReadFile(embedPath)
			if readErr != nil {
				data, readErr = uiFS.ReadFile("ui/index.html")
			}
		}

		if readErr != nil {
			http.NotFound(w, r)
			return
		}

		switch {
		case strings.HasSuffix(path, ".css"):
			w.Header().Set("Content-Type", "text/css")
		case strings.HasSuffix(path, ".js"):
			w.Header().Set("Content-Type", "application/javascript")
		case strings.HasSuffix(path, ".html"):
			w.Header().Set("Content-Type", "text/html")
		}
		_, _ = w.Write(data)
	})

	if host == "0.0.0.0" {
		log.Printf("UI available at http://localhost:%d and on your local network", port)
	} else {
		log.Printf("UI available at http://%s", addr)
	}

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}
