package main

import (
	"bytes"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync/atomic"
	"time"
)

const maxImportUploadBytes = 256 << 20 // 256 MiB

var sqliteFileMagic = []byte("SQLite format 3\x00")

type ImportDatabaseResult struct {
	Status           string `json:"status"`
	Mode             string `json:"mode"`
	DownloadsAdded   int    `json:"downloadsAdded"`
	SkippedAdded     int    `json:"skippedAdded"`
	TotalDownloads   int    `json:"totalDownloads"`
	TotalSkipped     int    `json:"totalSkipped"`
	PathsRebased     int    `json:"pathsRebased"`
	BaseDirPreserved bool   `json:"baseDirPreserved"`
	BaseDir          string `json:"baseDir"`
	FolderStructure  string `json:"folderStructure"`
	SafetySnapshot   string `json:"safetySnapshot,omitempty"`
}

// GET /api/database/export — creates an atomic SQLite Vault Backup via VACUUM INTO and streams it.
func handleExportDatabase(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tmpDir, err := os.MkdirTemp("", "instavault-export-*")
	if err != nil {
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": "failed to prepare export workspace"})
		return
	}
	defer os.RemoveAll(tmpDir)

	filename := fmt.Sprintf("instavault-backup-%s.db", time.Now().Format("20060102-150405"))
	exportPath := filepath.Join(tmpDir, filename)

	dbMu.Lock()
	safePath := strings.ReplaceAll(exportPath, "'", "''")
	_, vacuumErr := db.Exec(fmt.Sprintf("VACUUM INTO '%s'", safePath))
	dbMu.Unlock()

	if vacuumErr != nil {
		log.Printf("[EXPORT] VACUUM INTO failed: %v", vacuumErr)
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": "failed to export database: " + vacuumErr.Error()})
		return
	}

	f, err := os.Open(exportPath)
	if err != nil {
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": "failed to open exported backup"})
		return
	}
	defer f.Close()

	info, err := f.Stat()
	if err != nil {
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": "failed to stat exported backup"})
		return
	}

	w.Header().Set("Content-Type", "application/x-sqlite3")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.Header().Set("Content-Length", strconv.FormatInt(info.Size(), 10))
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, f)
}

// POST /api/database/import — validates and applies a Vault Backup in replace or merge mode.
func handleImportDatabase(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if atomic.LoadInt64(&activeDownloads) > 0 {
		jsonResp(w, http.StatusConflict, map[string]string{
			"error": "Cannot import while downloads are active. Wait for active downloads to finish and try again.",
		})
		return
	}

	// Enforce upload limit with small headroom for multipart boundaries/fields.
	r.Body = http.MaxBytesReader(w, r.Body, maxImportUploadBytes+(2<<20))
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) || strings.Contains(strings.ToLower(err.Error()), "request body too large") {
			jsonResp(w, http.StatusRequestEntityTooLarge, map[string]string{
				"error": "Backup file exceeds the 256 MB size limit.",
			})
			return
		}
		jsonResp(w, http.StatusBadRequest, map[string]string{"error": "Invalid multipart upload: " + err.Error()})
		return
	}
	if r.MultipartForm != nil {
		defer r.MultipartForm.RemoveAll()
	}

	mode := strings.ToLower(strings.TrimSpace(r.FormValue("mode")))
	if mode == "" {
		mode = "replace"
	}
	if mode != "replace" && mode != "merge" {
		jsonResp(w, http.StatusBadRequest, map[string]string{"error": `Invalid mode: must be "replace" or "merge".`})
		return
	}

	overwriteBaseDir := r.FormValue("overwriteBaseDir") == "true" || r.FormValue("overwriteBaseDir") == "1"
	if mode == "merge" {
		overwriteBaseDir = false
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		jsonResp(w, http.StatusBadRequest, map[string]string{"error": "Missing backup file in upload."})
		return
	}
	defer file.Close()

	tmpDir, err := os.MkdirTemp("", "instavault-import-*")
	if err != nil {
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": "Failed to prepare import workspace."})
		return
	}
	defer os.RemoveAll(tmpDir)

	tempDBPath := filepath.Join(tmpDir, "upload.db")
	dst, err := os.Create(tempDBPath)
	if err != nil {
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": "Failed to stage uploaded backup."})
		return
	}

	written, copyErr := io.Copy(dst, io.LimitReader(file, maxImportUploadBytes+1))
	closeErr := dst.Close()
	if copyErr != nil || closeErr != nil {
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": "Failed to save uploaded backup."})
		return
	}
	if written == 0 {
		jsonResp(w, http.StatusBadRequest, map[string]string{"error": "Uploaded backup file is empty."})
		return
	}
	if written > maxImportUploadBytes {
		jsonResp(w, http.StatusRequestEntityTooLarge, map[string]string{"error": "Backup file exceeds the 256 MB size limit."})
		return
	}

	if err := validateAndPrepareImportDB(tempDBPath); err != nil {
		jsonResp(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	dbMu.Lock()
	if atomic.LoadInt64(&activeDownloads) > 0 {
		dbMu.Unlock()
		jsonResp(w, http.StatusConflict, map[string]string{
			"error": "Cannot import while downloads are active. Wait for active downloads to finish and try again.",
		})
		return
	}

	var safetySnapshotName string
	if backupsDir != "" {
		bakPath, errBak := createBackup(db, backupsDir, CurrentSchemaVersion)
		if errBak != nil {
			dbMu.Unlock()
			log.Printf("[IMPORT] Pre-import safety snapshot failed: %v", errBak)
			jsonResp(w, http.StatusInternalServerError, map[string]string{
				"error": "Could not create pre-import safety snapshot: " + errBak.Error(),
			})
			return
		}
		safetySnapshotName = filepath.Base(bakPath)
		log.Printf("[IMPORT] Created pre-import safety snapshot: %s", bakPath)
	}

	result, importErr := applyDatabaseImportLocked(tempDBPath, mode, overwriteBaseDir)
	dbMu.Unlock()

	if importErr != nil {
		log.Printf("[IMPORT] Failed (%s): %v", mode, importErr)
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": "Import failed: " + importErr.Error()})
		return
	}

	result.SafetySnapshot = safetySnapshotName
	log.Printf("[IMPORT] Completed (%s): +%d downloads, +%d skipped, %d paths rebased (totals: %d downloads, %d skipped)",
		result.Mode, result.DownloadsAdded, result.SkippedAdded, result.PathsRebased, result.TotalDownloads, result.TotalSkipped)

	broadcastSSE("sync", map[string]any{
		"databaseImported": true,
		"mode":             result.Mode,
		"totalDownloads":   result.TotalDownloads,
		"totalSkipped":     result.TotalSkipped,
	})

	jsonResp(w, http.StatusOK, result)
}

func validateAndPrepareImportDB(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("cannot open uploaded file: %w", err)
	}
	header := make([]byte, len(sqliteFileMagic))
	n, readErr := io.ReadFull(f, header)
	_ = f.Close()
	if readErr != nil || n < len(sqliteFileMagic) || !bytes.Equal(header, sqliteFileMagic) {
		return fmt.Errorf("file is not a valid SQLite database")
	}

	src, err := sql.Open("sqlite", path)
	if err != nil {
		return fmt.Errorf("failed to open SQLite database: %w", err)
	}
	defer src.Close()

	var quickCheck string
	if err := src.QueryRow("PRAGMA quick_check").Scan(&quickCheck); err != nil || strings.ToLower(quickCheck) != "ok" {
		return fmt.Errorf("SQLite integrity check failed")
	}

	var userVersion int
	if err := src.QueryRow("PRAGMA user_version").Scan(&userVersion); err != nil {
		return fmt.Errorf("failed to read database schema version: %w", err)
	}
	if userVersion > CurrentSchemaVersion {
		return fmt.Errorf("backup schema version (%d) is newer than supported by this version of InstaVault (%d); please update InstaVault first", userVersion, CurrentSchemaVersion)
	}

	tables := map[string]bool{}
	rows, err := src.Query(`SELECT name FROM sqlite_master WHERE type='table'`)
	if err != nil {
		return fmt.Errorf("failed to inspect database tables: %w", err)
	}
	for rows.Next() {
		var name string
		if scanErr := rows.Scan(&name); scanErr == nil {
			tables[name] = true
		}
	}
	_ = rows.Close()

	if userVersion < CurrentSchemaVersion {
		if !tables["downloads"] {
			return fmt.Errorf("backup database is missing required InstaVault tables")
		}
		schema := `
		CREATE TABLE IF NOT EXISTS downloads (
			id            INTEGER PRIMARY KEY AUTOINCREMENT,
			shortcode     TEXT NOT NULL,
			username      TEXT NOT NULL,
			filename      TEXT NOT NULL,
			local_path    TEXT NOT NULL,
			file_size     INTEGER DEFAULT 0,
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
		if _, err := src.Exec(schema); err != nil {
			return fmt.Errorf("failed to migrate older backup schema: %w", err)
		}
		if _, err := src.Exec(fmt.Sprintf("PRAGMA user_version = %d;", CurrentSchemaVersion)); err != nil {
			return fmt.Errorf("failed to update backup schema version: %w", err)
		}
	} else {
		for _, reqTable := range []string{"downloads", "skipped", "settings"} {
			if !tables[reqTable] {
				return fmt.Errorf("backup database is missing required table %q", reqTable)
			}
		}
	}

	return nil
}

func applyDatabaseImportLocked(srcPath, mode string, overwriteBaseDir bool) (*ImportDatabaseResult, error) {
	src, err := sql.Open("sqlite", srcPath)
	if err != nil {
		return nil, err
	}
	defer src.Close()

	curBaseDir, curStructure := getConfig()

	srcSettings := map[string]string{}
	if sRows, err := src.Query(`SELECT key, value FROM settings`); err == nil {
		for sRows.Next() {
			var k, v string
			if err := sRows.Scan(&k, &v); err == nil {
				srcSettings[k] = v
			}
		}
		_ = sRows.Close()
	}

	srcBaseDir := srcSettings["baseDir"]
	preserveBaseDir := mode == "merge" || !overwriteBaseDir || srcBaseDir == ""
	shouldRebase := preserveBaseDir && srcBaseDir != "" && curBaseDir != "" && !sameBaseDir(srcBaseDir, curBaseDir)

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	downloadsAdded := 0
	skippedAdded := 0
	pathsRebased := 0

	if mode == "replace" {
		if _, err := tx.Exec(`DELETE FROM downloads`); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`DELETE FROM skipped`); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`DELETE FROM settings`); err != nil {
			return nil, err
		}
	}

	// Import downloads
	dlRows, err := src.Query(`SELECT shortcode, username, filename, local_path, file_size, downloaded_at FROM downloads`)
	if err != nil {
		return nil, fmt.Errorf("reading backup downloads: %w", err)
	}
	for dlRows.Next() {
		var shortcode, username, filename, localPath, downloadedAt string
		var fileSize int64
		if err := dlRows.Scan(&shortcode, &username, &filename, &localPath, &fileSize, &downloadedAt); err != nil {
			_ = dlRows.Close()
			return nil, err
		}
		rebased := false
		if shouldRebase {
			localPath, rebased = rebaseLocalPath(localPath, srcBaseDir, curBaseDir)
		}

		var res sql.Result
		if mode == "replace" {
			res, err = tx.Exec(
				`INSERT OR REPLACE INTO downloads(shortcode,username,filename,local_path,file_size,downloaded_at) VALUES(?,?,?,?,?,?)`,
				shortcode, username, filename, localPath, fileSize, downloadedAt,
			)
		} else {
			res, err = tx.Exec(
				`INSERT OR IGNORE INTO downloads(shortcode,username,filename,local_path,file_size,downloaded_at) VALUES(?,?,?,?,?,?)`,
				shortcode, username, filename, localPath, fileSize, downloadedAt,
			)
		}
		if err != nil {
			_ = dlRows.Close()
			return nil, err
		}
		if n, _ := res.RowsAffected(); n > 0 {
			downloadsAdded++
			if rebased {
				pathsRebased++
			}
		}
		if mode == "merge" {
			// Imported download supersedes any stale local skipped record.
			if _, err := tx.Exec(`DELETE FROM skipped WHERE shortcode=? AND filename=?`, shortcode, filename); err != nil {
				_ = dlRows.Close()
				return nil, err
			}
		}
	}
	_ = dlRows.Close()

	// Import skipped
	skRows, err := src.Query(`SELECT shortcode, username, filename, local_path, skipped_at FROM skipped`)
	if err != nil {
		return nil, fmt.Errorf("reading backup skipped: %w", err)
	}
	for skRows.Next() {
		var shortcode, username, filename, localPath, skippedAt string
		if err := skRows.Scan(&shortcode, &username, &filename, &localPath, &skippedAt); err != nil {
			_ = skRows.Close()
			return nil, err
		}
		rebased := false
		if shouldRebase {
			localPath, rebased = rebaseLocalPath(localPath, srcBaseDir, curBaseDir)
		}

		var res sql.Result
		if mode == "replace" {
			res, err = tx.Exec(
				`INSERT OR IGNORE INTO skipped(shortcode,username,filename,local_path,skipped_at) VALUES(?,?,?,?,?)`,
				shortcode, username, filename, localPath, skippedAt,
			)
		} else {
			res, err = tx.Exec(
				`INSERT OR IGNORE INTO skipped(shortcode,username,filename,local_path,skipped_at)
				 SELECT ?,?,?,?,?
				 WHERE NOT EXISTS (SELECT 1 FROM downloads WHERE shortcode=? AND filename=?)`,
				shortcode, username, filename, localPath, skippedAt, shortcode, filename,
			)
		}
		if err != nil {
			_ = skRows.Close()
			return nil, err
		}
		if n, _ := res.RowsAffected(); n > 0 {
			skippedAdded++
			if rebased {
				pathsRebased++
			}
		}
	}
	_ = skRows.Close()

	// Import settings
	newBaseDir := curBaseDir
	newStructure := curStructure

	if mode == "replace" {
		for k, v := range srcSettings {
			if k == "baseDir" && preserveBaseDir {
				continue
			}
			if _, err := tx.Exec(`INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)`, k, v); err != nil {
				return nil, err
			}
		}
		if preserveBaseDir {
			if curBaseDir != "" {
				if _, err := tx.Exec(`INSERT OR REPLACE INTO settings(key,value) VALUES('baseDir',?)`, curBaseDir); err != nil {
					return nil, err
				}
			}
		} else if srcBaseDir != "" {
			newBaseDir = srcBaseDir
			_ = os.MkdirAll(newBaseDir, 0755)
		}
		if fs := srcSettings["folderStructure"]; fs == "profile" || fs == "flat" || fs == "profile_type" {
			newStructure = fs
		}
	} else {
		// Merge mode: never overwrite existing local settings; only fill in missing non-baseDir keys.
		for k, v := range srcSettings {
			if k == "baseDir" && curBaseDir != "" {
				continue
			}
			if _, err := tx.Exec(`INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)`, k, v); err != nil {
				return nil, err
			}
		}
		if curStructure == "" {
			if fs := srcSettings["folderStructure"]; fs == "profile" || fs == "flat" || fs == "profile_type" {
				newStructure = fs
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	configMu.Lock()
	if newBaseDir != "" {
		baseDir = newBaseDir
	}
	if newStructure != "" {
		folderStructure = newStructure
	}
	configMu.Unlock()

	var totalDownloads, totalSkipped int
	_ = db.QueryRow(`SELECT COUNT(*) FROM downloads`).Scan(&totalDownloads)
	_ = db.QueryRow(`SELECT COUNT(*) FROM skipped`).Scan(&totalSkipped)

	finalBaseDir, finalStructure := getConfig()
	return &ImportDatabaseResult{
		Status:           "ok",
		Mode:             mode,
		DownloadsAdded:   downloadsAdded,
		SkippedAdded:     skippedAdded,
		TotalDownloads:   totalDownloads,
		TotalSkipped:     totalSkipped,
		PathsRebased:     pathsRebased,
		BaseDirPreserved: preserveBaseDir,
		BaseDir:          finalBaseDir,
		FolderStructure:  finalStructure,
	}, nil
}

func normalizeSlashPath(p string) string {
	s := strings.ReplaceAll(strings.TrimSpace(p), "\\", "/")
	for strings.Contains(s, "//") {
		s = strings.ReplaceAll(s, "//", "/")
	}
	s = strings.TrimRight(s, "/")
	return s
}

func looksLikeWindowsPath(p string) bool {
	return len(p) >= 2 && p[1] == ':' && ((p[0] >= 'A' && p[0] <= 'Z') || (p[0] >= 'a' && p[0] <= 'z'))
}

func sameBaseDir(a, b string) bool {
	na := normalizeSlashPath(a)
	nb := normalizeSlashPath(b)
	if looksLikeWindowsPath(na) || looksLikeWindowsPath(nb) {
		return strings.EqualFold(na, nb)
	}
	return na == nb
}

func rebaseLocalPath(localPath, srcBaseDir, dstBaseDir string) (string, bool) {
	if localPath == "" || srcBaseDir == "" || dstBaseDir == "" {
		return localPath, false
	}
	srcNorm := normalizeSlashPath(srcBaseDir)
	pathNorm := normalizeSlashPath(localPath)
	if srcNorm == "" || pathNorm == "" {
		return localPath, false
	}

	prefix := srcNorm + "/"
	caseInsensitive := looksLikeWindowsPath(srcNorm) || looksLikeWindowsPath(pathNorm)

	var matched bool
	if caseInsensitive {
		matched = len(pathNorm) > len(prefix) && strings.EqualFold(pathNorm[:len(prefix)], prefix)
	} else {
		matched = strings.HasPrefix(pathNorm, prefix)
	}
	if !matched {
		return localPath, false
	}

	rel := pathNorm[len(prefix):]
	if rel == "" {
		return localPath, false
	}
	return filepath.Join(dstBaseDir, filepath.FromSlash(rel)), true
}
