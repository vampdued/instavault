package vault

import (
	"bytes"
	"database/sql"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
)

// MaxImportUploadBytes is the maximum allowed Vault Backup upload size (256 MiB).
const MaxImportUploadBytes = 256 << 20

// SQLiteFileMagic is the 16-byte SQLite 3 database header prefix.
var SQLiteFileMagic = []byte("SQLite format 3\x00")

// ImportResult summarizes the outcome of a Vault Backup import operation.
type ImportResult struct {
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

// ExportToPath creates an atomic, WAL-safe Vault Backup at destPath using VACUUM INTO.
func (s *Store) ExportToPath(destPath string) error {
	s.dbMu.Lock()
	defer s.dbMu.Unlock()

	safePath := strings.ReplaceAll(destPath, "'", "''")
	if _, err := s.db.Exec(fmt.Sprintf("VACUUM INTO '%s'", safePath)); err != nil {
		return fmt.Errorf("VACUUM INTO failed: %w", err)
	}
	return nil
}

// ValidateAndPrepareBackup verifies the SQLite magic header, runs PRAGMA quick_check,
// enforces PRAGMA user_version compatibility, checks required InstaVault tables, and
// migrates older schema versions in place on the staged backup file.
func ValidateAndPrepareBackup(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("%w: cannot open uploaded file: %v", ErrInvalidBackup, err)
	}
	header := make([]byte, len(SQLiteFileMagic))
	n, readErr := io.ReadFull(f, header)
	_ = f.Close()
	if readErr != nil || n < len(SQLiteFileMagic) || !bytes.Equal(header, SQLiteFileMagic) {
		return fmt.Errorf("%w: file is not a valid SQLite database", ErrInvalidBackup)
	}

	src, err := sql.Open("sqlite", path)
	if err != nil {
		return fmt.Errorf("%w: failed to open SQLite database: %v", ErrInvalidBackup, err)
	}
	defer src.Close()

	var quickCheck string
	if err := src.QueryRow("PRAGMA quick_check").Scan(&quickCheck); err != nil || strings.ToLower(quickCheck) != "ok" {
		return fmt.Errorf("%w: SQLite integrity check failed", ErrInvalidBackup)
	}

	var userVersion int
	if err := src.QueryRow("PRAGMA user_version").Scan(&userVersion); err != nil {
		return fmt.Errorf("%w: failed to read database schema version: %v", ErrInvalidBackup, err)
	}
	if userVersion > CurrentSchemaVersion {
		return fmt.Errorf("%w: backup schema version (%d) is newer than supported by this version of InstaVault (%d); please update InstaVault first", ErrInvalidBackup, userVersion, CurrentSchemaVersion)
	}

	tables := map[string]bool{}
	rows, err := src.Query(`SELECT name FROM sqlite_master WHERE type='table'`)
	if err != nil {
		return fmt.Errorf("%w: failed to inspect database tables: %v", ErrInvalidBackup, err)
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
			return fmt.Errorf("%w: backup database is missing required InstaVault tables", ErrInvalidBackup)
		}
		if _, err := src.Exec(schemaDDL); err != nil {
			return fmt.Errorf("%w: failed to migrate older backup schema: %v", ErrInvalidBackup, err)
		}
		if _, err := src.Exec(fmt.Sprintf("PRAGMA user_version = %d;", CurrentSchemaVersion)); err != nil {
			return fmt.Errorf("%w: failed to update backup schema version: %v", ErrInvalidBackup, err)
		}
	} else {
		for _, reqTable := range []string{"downloads", "skipped", "settings"} {
			if !tables[reqTable] {
				return fmt.Errorf("%w: backup database is missing required table %q", ErrInvalidBackup, reqTable)
			}
		}
	}

	return nil
}

// ImportBackup validates a staged SQLite backup file, takes a pre-import Safety Snapshot
// via VACUUM INTO (when backupsDir is configured), and applies it in "replace" or "merge" mode.
// If isBusy is non-nil and returns true under the vault lock, ErrBusy is returned.
func (s *Store) ImportBackup(srcPath, mode string, overwriteBaseDir bool, isBusy func() bool) (*ImportResult, error) {
	mode = strings.ToLower(strings.TrimSpace(mode))
	if mode == "" {
		mode = "replace"
	}
	if mode != "replace" && mode != "merge" {
		return nil, fmt.Errorf("%w: Invalid mode: must be \"replace\" or \"merge\".", ErrInvalidBackup)
	}
	if mode == "merge" {
		overwriteBaseDir = false
	}

	if err := ValidateAndPrepareBackup(srcPath); err != nil {
		return nil, err
	}

	s.dbMu.Lock()
	defer s.dbMu.Unlock()

	if isBusy != nil && isBusy() {
		return nil, ErrBusy
	}

	var safetySnapshotName string
	if s.backupsDir != "" {
		bakPath, errBak := createSafetySnapshot(s.db, s.backupsDir, CurrentSchemaVersion, s.appVersion)
		if errBak != nil {
			log.Printf("[IMPORT] Pre-import safety snapshot failed: %v", errBak)
			return nil, fmt.Errorf("Could not create pre-import safety snapshot: %w", errBak)
		}
		safetySnapshotName = filepath.Base(bakPath)
		log.Printf("[IMPORT] Created pre-import safety snapshot: %s", bakPath)
	}

	result, err := s.applyDatabaseImportLocked(srcPath, mode, overwriteBaseDir)
	if err != nil {
		return nil, err
	}
	result.SafetySnapshot = safetySnapshotName
	return result, nil
}

func (s *Store) applyDatabaseImportLocked(srcPath, mode string, overwriteBaseDir bool) (*ImportResult, error) {
	src, err := sql.Open("sqlite", srcPath)
	if err != nil {
		return nil, err
	}
	defer src.Close()

	curBaseDir, curStructure := s.Config()

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

	tx, err := s.db.Begin()
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
			localPath, rebased = RebaseLocalPath(localPath, srcBaseDir, curBaseDir)
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
			localPath, rebased = RebaseLocalPath(localPath, srcBaseDir, curBaseDir)
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

	s.configMu.Lock()
	if newBaseDir != "" {
		s.baseDir = newBaseDir
	}
	if newStructure != "" {
		s.folderStructure = newStructure
	}
	s.configMu.Unlock()

	var totalDownloads, totalSkipped int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM downloads`).Scan(&totalDownloads)
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM skipped`).Scan(&totalSkipped)

	finalBaseDir, finalStructure := s.Config()
	return &ImportResult{
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

// RebaseLocalPath rewrites a stored local_path from srcBaseDir to dstBaseDir,
// handling cross-OS path separators and case-insensitive Windows drive prefixes.
func RebaseLocalPath(localPath, srcBaseDir, dstBaseDir string) (string, bool) {
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
