package main

import (
	"database/sql"
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

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
	Status    string `json:"status"`           // "downloaded", "skipped", "error"
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
	ID         int    `json:"id"`
	Shortcode  string `json:"shortcode"`
	Username   string `json:"username"`
	Filename   string `json:"filename"`
	LocalPath  string `json:"localPath"`
	FileSize   int64  `json:"fileSize"`
	Downloaded string `json:"downloadedAt"`
}

type StatsResponse struct {
	TotalDownloads int `json:"totalDownloads"`
	TotalSkipped   int `json:"totalSkipped"`
	UniqueAccounts int `json:"uniqueAccounts"`
}

// ─── Global state ─────────────────────────────────────────────────────────────

var (
	db       *sql.DB
	dbMu     sync.Mutex
	baseDir  string
	port     = 19201
)

// ─── DB init ──────────────────────────────────────────────────────────────────

func initDB(path string) error {
	var err error
	db, err = sql.Open("sqlite", path)
	if err != nil {
		return err
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
	_, err = db.Exec(schema)
	return err
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func sanitize(name string) string {
	re := regexp.MustCompile(`[<>:"/\\|?*\x00-\x1f]`)
	s := re.ReplaceAllString(name, "_")
	return strings.TrimSpace(s)
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
	// Double-check file still exists on disk
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
	// Remove from skipped if it was there
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
	// Instagram requires a realistic UA
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

// ─── CORS middleware ──────────────────────────────────────────────────────────

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
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

// POST /api/download
// Called by the extension for each media file
func handleDownload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
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

	// Sanitize and build target path
	safeUser := sanitize(req.Username)
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

	userDir := filepath.Join(baseDir, safeUser)
	if err := os.MkdirAll(userDir, 0755); err != nil {
		jsonResp(w, http.StatusInternalServerError, DownloadResult{Status: "error", Message: err.Error()})
		return
	}

	localPath := filepath.Join(userDir, sanitize(filename))

	// Check dedup
	if already, existingPath := isAlreadyDownloaded(req.Shortcode, filename); already {
		recordSkip(req.Shortcode, req.Username, filename, existingPath)
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
		jsonResp(w, http.StatusInternalServerError, DownloadResult{
			Status:    "error",
			Shortcode: req.Shortcode,
			Message:   err.Error(),
		})
		return
	}

	recordDownload(req.Shortcode, req.Username, filename, localPath, size)
	jsonResp(w, http.StatusOK, DownloadResult{
		Status:    "downloaded",
		Shortcode: req.Shortcode,
		LocalPath: localPath,
	})
}

// POST /api/force-download  – force re-download a skipped item
func handleForceDownload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req DownloadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonResp(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}

	// Remove from downloads table so dedup won't block it
	dbMu.Lock()
	_, _ = db.Exec(`DELETE FROM downloads WHERE shortcode=? AND filename=?`, req.Shortcode, req.Filename)
	_, _ = db.Exec(`DELETE FROM skipped WHERE shortcode=? AND filename=?`, req.Shortcode, req.Filename)
	dbMu.Unlock()

	safeUser := sanitize(req.Username)
	userDir := filepath.Join(baseDir, safeUser)
	_ = os.MkdirAll(userDir, 0755)
	localPath := filepath.Join(userDir, sanitize(req.Filename))

	size, err := downloadFile(req.URL, localPath)
	if err != nil {
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	recordDownload(req.Shortcode, req.Username, req.Filename, localPath, size)
	log.Printf("[FORCE] %s/%s re-downloaded", req.Username, req.Filename)
	jsonResp(w, http.StatusOK, map[string]string{"status": "downloaded", "localPath": localPath})
}

// GET /api/skipped?page=1&limit=50
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

// GET /api/downloads?page=1&limit=50&username=
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
		entries = append(entries, e)
	}
	if entries == nil {
		entries = []DownloadEntry{}
	}
	jsonResp(w, http.StatusOK, entries)
}

// GET /api/stats
func handleStats(w http.ResponseWriter, r *http.Request) {
	dbMu.Lock()
	defer dbMu.Unlock()

	var s StatsResponse
	_ = db.QueryRow(`SELECT COUNT(*) FROM downloads`).Scan(&s.TotalDownloads)
	_ = db.QueryRow(`SELECT COUNT(*) FROM skipped`).Scan(&s.TotalSkipped)
	_ = db.QueryRow(`SELECT COUNT(DISTINCT username) FROM downloads`).Scan(&s.UniqueAccounts)
	jsonResp(w, http.StatusOK, s)
}

// GET /api/accounts - list unique accounts with counts
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

// GET /api/settings
func handleGetSettings(w http.ResponseWriter, r *http.Request) {
	dbMu.Lock()
	defer dbMu.Unlock()
	settings := map[string]string{"baseDir": baseDir}
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

// POST /api/settings
func handleSaveSettings(w http.ResponseWriter, r *http.Request) {
	var body map[string]string
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonResp(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}

	if newDir, ok := body["baseDir"]; ok && newDir != "" {
		if err := os.MkdirAll(newDir, 0755); err != nil {
			jsonResp(w, http.StatusBadRequest, map[string]string{"error": "cannot create directory: " + err.Error()})
			return
		}
		baseDir = newDir
		dbMu.Lock()
		_, _ = db.Exec(`INSERT OR REPLACE INTO settings(key,value) VALUES('baseDir',?)`, newDir)
		dbMu.Unlock()
	}
	jsonResp(w, http.StatusOK, map[string]string{"status": "saved", "baseDir": baseDir})
}

// DELETE /api/skipped/:id - remove a single skip entry
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

// DELETE /api/skipped/all - clear all skip history
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

// DELETE /api/downloads/all - clear all downloads history (does not delete files)
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

// GET /api/ping - health check for extension
func handlePing(w http.ResponseWriter, r *http.Request) {
	jsonResp(w, http.StatusOK, map[string]string{"status": "ok", "version": "1.0.0", "baseDir": baseDir})
}

// ─── Main ─────────────────────────────────────────────────────────────────────

func main() {
	// Determine default base dir
	home, _ := os.UserHomeDir()
	baseDir = filepath.Join(home, "Downloads", "Instagram")

	// DB path next to the binary
	exePath, _ := os.Executable()
	dbPath := filepath.Join(filepath.Dir(exePath), "instavault.db")

	if err := initDB(dbPath); err != nil {
		log.Fatalf("DB init failed: %v", err)
	}
	defer db.Close()

	// Restore saved baseDir if present
	var savedDir string
	if err := db.QueryRow(`SELECT value FROM settings WHERE key='baseDir'`).Scan(&savedDir); err == nil && savedDir != "" {
		baseDir = savedDir
	}
	_ = os.MkdirAll(baseDir, 0755)
	log.Printf("InstaVault Server starting — saving to: %s", baseDir)

	// ── Routes ──────────────────────────────────────────────────────────────
	mux := http.NewServeMux()

	// API
	mux.HandleFunc("/api/ping",           withCORS(handlePing))
	mux.HandleFunc("/api/download",       withCORS(handleDownload))
	mux.HandleFunc("/api/force-download", withCORS(handleForceDownload))
	mux.HandleFunc("/api/skipped",        withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			handleDeleteAllSkipped(w, r)
		} else {
			handleListSkipped(w, r)
		}
	}))
	mux.HandleFunc("/api/downloads",      withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			handleDeleteAllDownloads(w, r)
		} else {
			handleListDownloads(w, r)
		}
	}))
	mux.HandleFunc("/api/stats",          withCORS(handleStats))
	mux.HandleFunc("/api/accounts",       withCORS(handleAccounts))
	mux.HandleFunc("/api/settings",       withCORS(handleGetSettings))

	// Route /api/skipped/{id} for DELETE
	mux.HandleFunc("/api/skipped/", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			handleDeleteSkip(w, r)
		} else if r.Method == http.MethodPost {
			// POST /api/skipped/{id}/force  — force re-download from skip list
			body := struct {
				URL      string `json:"url"`
				Username string `json:"username"`
				Filename string `json:"filename"`
				Shortcode string `json:"shortcode"`
			}{}
			_ = json.NewDecoder(r.Body).Decode(&body)
			// Remove from skip, trigger download
			dbMu.Lock()
			_, _ = db.Exec(`DELETE FROM skipped WHERE shortcode=? AND filename=?`, body.Shortcode, body.Filename)
			_, _ = db.Exec(`DELETE FROM downloads WHERE shortcode=? AND filename=?`, body.Shortcode, body.Filename)
			dbMu.Unlock()

			safeUser := sanitize(body.Username)
			userDir := filepath.Join(baseDir, safeUser)
			_ = os.MkdirAll(userDir, 0755)
			localPath := filepath.Join(userDir, sanitize(body.Filename))
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

	// Serve embedded UI
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "ui/index.html"
		} else {
			path = "ui/" + path
		}
		data, err := uiFS.ReadFile(path)
		if err != nil {
			// Fallback to index for SPA routing
			data, err = uiFS.ReadFile("ui/index.html")
			if err != nil {
				http.NotFound(w, r)
				return
			}
		}
		// Basic content-type
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

	addr := fmt.Sprintf("localhost:%d", port)
	log.Printf("UI available at http://%s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
