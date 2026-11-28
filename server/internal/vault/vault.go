package vault

import (
	"database/sql"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

// CurrentSchemaVersion defines the supported SQLite database schema version.
const CurrentSchemaVersion = 1

const schemaDDL = `
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

var (
	// ErrBusy is returned when an exclusive vault operation (such as backup import)
	// cannot proceed because downloads are currently active.
	ErrBusy = errors.New("cannot import while downloads are active. Wait for active downloads to finish and try again.")

	// ErrInvalidBackup wraps backup validation errors (non-SQLite, corrupt, wrong schema, missing tables).
	ErrInvalidBackup = errors.New("invalid vault backup")

	sanitizePartRe = regexp.MustCompile(`[<>:"/\\|?*\x00-\x1f]`)
)

// SkipEntry represents a row in the skipped table.
type SkipEntry struct {
	ID        int    `json:"id"`
	Shortcode string `json:"shortcode"`
	Username  string `json:"username"`
	Filename  string `json:"filename"`
	LocalPath string `json:"localPath"`
	SkippedAt string `json:"skippedAt"`
}

// DownloadEntry represents a row in the downloads table.
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

// AccountSummary represents a distinct downloaded Instagram username and its count.
type AccountSummary struct {
	Username string `json:"username"`
	Count    int    `json:"count"`
}

// Counts holds aggregate counts across the vault tables.
type Counts struct {
	TotalDownloads int
	TotalSkipped   int
	UniqueAccounts int
}

// Options configures opening a Vault Store.
type Options struct {
	DBPath          string
	BackupsDir      string
	DefaultBaseDir  string
	FolderStructure string
	AppVersion      string
}

// Store owns the SQLite database connection, synchronization mutexes, schema migrations,
// settings, media records, safety snapshots, and Vault Backup export/import.
type Store struct {
	db              *sql.DB
	dbMu            sync.Mutex
	configMu        sync.RWMutex
	baseDir         string
	folderStructure string
	backupsDir      string
	appVersion      string
}

// Open initializes the SQLite database at opts.DBPath, runs PRAGMA user_version
// migrations (creating a VACUUM INTO safety snapshot first if migrating a legacy DB),
// and restores persisted settings.
func Open(opts Options) (*Store, error) {
	if opts.DBPath == "" {
		return nil, fmt.Errorf("vault: DBPath is required")
	}
	if err := os.MkdirAll(filepath.Dir(opts.DBPath), 0755); err != nil {
		return nil, fmt.Errorf("vault: create db dir: %w", err)
	}

	database, err := sql.Open("sqlite", opts.DBPath)
	if err != nil {
		return nil, err
	}

	// Optimize SQLite for robust concurrency and WAL safety.
	_, _ = database.Exec("PRAGMA journal_mode=WAL;")
	_, _ = database.Exec("PRAGMA busy_timeout=5000;")

	var userVersion int
	if err := database.QueryRow("PRAGMA user_version").Scan(&userVersion); err != nil {
		_ = database.Close()
		return nil, fmt.Errorf("failed reading user_version: %w", err)
	}

	// Safety gate: refuse to run if DB is newer than binary supported schema.
	if userVersion > CurrentSchemaVersion {
		_ = database.Close()
		return nil, fmt.Errorf("database schema version (%d) is newer than supported by this binary (%d); please update InstaVault", userVersion, CurrentSchemaVersion)
	}

	appVer := opts.AppVersion
	if appVer == "" {
		appVer = "1.0.0"
	}

	if userVersion < CurrentSchemaVersion {
		// If tables already exist in legacy DB (version 0), take VACUUM INTO safety snapshot before migrating.
		var tableCount int
		_ = database.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('downloads', 'skipped', 'settings')").Scan(&tableCount)
		if tableCount > 0 && opts.BackupsDir != "" {
			bakPath, errBackup := createSafetySnapshot(database, opts.BackupsDir, userVersion, appVer)
			if errBackup != nil {
				log.Printf("[WARN] Pre-migration backup failed: %v", errBackup)
			} else {
				log.Printf("[BACKUP] Created pre-migration backup at: %s", bakPath)
			}
		}

		if _, err := database.Exec(schemaDDL); err != nil {
			_ = database.Close()
			return nil, fmt.Errorf("schema migration failed: %w", err)
		}

		if _, err := database.Exec(fmt.Sprintf("PRAGMA user_version = %d;", CurrentSchemaVersion)); err != nil {
			_ = database.Close()
			return nil, fmt.Errorf("failed setting user_version: %w", err)
		}
		log.Printf("[DB] Database migrated to schema version %d", CurrentSchemaVersion)
	}

	folderStruct := opts.FolderStructure
	if folderStruct == "" {
		folderStruct = "profile"
	}

	s := &Store{
		db:              database,
		baseDir:         opts.DefaultBaseDir,
		folderStructure: folderStruct,
		backupsDir:      opts.BackupsDir,
		appVersion:      appVer,
	}

	// Restore saved settings if present.
	var savedDir string
	if err := s.db.QueryRow(`SELECT value FROM settings WHERE key='baseDir'`).Scan(&savedDir); err == nil && savedDir != "" {
		s.baseDir = savedDir
	}
	var savedStruct string
	if err := s.db.QueryRow(`SELECT value FROM settings WHERE key='folderStructure'`).Scan(&savedStruct); err == nil && savedStruct != "" {
		s.folderStructure = savedStruct
	}

	return s, nil
}

// Close closes the underlying SQLite connection.
func (s *Store) Close() error {
	s.dbMu.Lock()
	defer s.dbMu.Unlock()
	if s.db == nil {
		return nil
	}
	return s.db.Close()
}

// VerifyHealth checks that the downloads table is readable.
func (s *Store) VerifyHealth() error {
	s.dbMu.Lock()
	defer s.dbMu.Unlock()
	var count int
	return s.db.QueryRow("SELECT COUNT(*) FROM downloads").Scan(&count)
}

// BaseDir returns the current media base directory.
func (s *Store) BaseDir() string {
	s.configMu.RLock()
	defer s.configMu.RUnlock()
	return s.baseDir
}

// Config returns the current (baseDir, folderStructure) configuration.
func (s *Store) Config() (string, string) {
	s.configMu.RLock()
	defer s.configMu.RUnlock()
	return s.baseDir, s.folderStructure
}

// Settings returns all persisted settings merged with the active baseDir and folderStructure.
func (s *Store) Settings() (map[string]string, error) {
	s.dbMu.Lock()
	defer s.dbMu.Unlock()

	curBaseDir, curStructure := s.Config()
	settings := map[string]string{
		"baseDir":         curBaseDir,
		"folderStructure": curStructure,
	}

	rows, err := s.db.Query(`SELECT key, value FROM settings`)
	if err != nil {
		return settings, err
	}
	defer rows.Close()

	for rows.Next() {
		var k, v string
		if scanErr := rows.Scan(&k, &v); scanErr == nil {
			settings[k] = v
		}
	}
	return settings, nil
}

// SaveSettings validates and persists baseDir and/or folderStructure updates.
func (s *Store) SaveSettings(newBaseDir, newFolderStructure string) (string, string, error) {
	s.dbMu.Lock()
	defer s.dbMu.Unlock()

	if newBaseDir != "" {
		if err := os.MkdirAll(newBaseDir, 0755); err != nil {
			return "", "", fmt.Errorf("cannot create directory: %w", err)
		}
		s.configMu.Lock()
		s.baseDir = newBaseDir
		s.configMu.Unlock()
		if _, err := s.db.Exec(`INSERT OR REPLACE INTO settings(key,value) VALUES('baseDir',?)`, newBaseDir); err != nil {
			return "", "", err
		}
	}

	if newFolderStructure != "" {
		if newFolderStructure == "profile" || newFolderStructure == "flat" || newFolderStructure == "profile_type" {
			s.configMu.Lock()
			s.folderStructure = newFolderStructure
			s.configMu.Unlock()
			if _, err := s.db.Exec(`INSERT OR REPLACE INTO settings(key,value) VALUES('folderStructure',?)`, newFolderStructure); err != nil {
				return "", "", err
			}
		}
	}

	curBaseDir, curStructure := s.Config()
	return curBaseDir, curStructure, nil
}

// IsAlreadyDownloaded reports whether (shortcode, filename) is already recorded in the vault.
// It checks an exact match first, then falls back to matching the same shortcode + filename stem
// to handle Content-Type extension rewrites (e.g., .jpg -> .webp/.avif/.png).
func (s *Store) IsAlreadyDownloaded(shortcode, filename string) (bool, string) {
	s.dbMu.Lock()
	defer s.dbMu.Unlock()

	var localPath string
	err := s.db.QueryRow(
		`SELECT local_path FROM downloads WHERE shortcode=? AND filename=?`,
		shortcode, filename,
	).Scan(&localPath)
	if err == sql.ErrNoRows {
		ext := filepath.Ext(filename)
		if ext != "" {
			stem := strings.TrimSuffix(filename, ext)
			err = s.db.QueryRow(
				`SELECT local_path FROM downloads WHERE shortcode=? AND filename LIKE ? LIMIT 1`,
				shortcode, stem+".%",
			).Scan(&localPath)
		}
	}
	if err != nil {
		return false, ""
	}
	return true, localPath
}

// RecordDownload upserts a download record and removes any matching skipped entry.
func (s *Store) RecordDownload(shortcode, username, filename, localPath string, size int64) error {
	s.dbMu.Lock()
	defer s.dbMu.Unlock()

	if _, err := s.db.Exec(
		`INSERT OR REPLACE INTO downloads(shortcode,username,filename,local_path,file_size,downloaded_at) VALUES(?,?,?,?,?,?)`,
		shortcode, username, filename, localPath, size, time.Now().Format(time.RFC3339),
	); err != nil {
		return err
	}
	_, err := s.db.Exec(`DELETE FROM skipped WHERE shortcode=? AND filename=?`, shortcode, filename)
	return err
}

// RecordSkip records a skipped item if not already present.
func (s *Store) RecordSkip(shortcode, username, filename, localPath string) error {
	s.dbMu.Lock()
	defer s.dbMu.Unlock()

	_, err := s.db.Exec(
		`INSERT OR IGNORE INTO skipped(shortcode,username,filename,local_path,skipped_at) VALUES(?,?,?,?,?)`,
		shortcode, username, filename, localPath, time.Now().Format(time.RFC3339),
	)
	return err
}

// DeleteForRedownload clears any prior download and skipped records for (shortcode, filename).
func (s *Store) DeleteForRedownload(shortcode, filename string) error {
	s.dbMu.Lock()
	defer s.dbMu.Unlock()

	if _, err := s.db.Exec(`DELETE FROM downloads WHERE shortcode=? AND filename=?`, shortcode, filename); err != nil {
		return err
	}
	_, err := s.db.Exec(`DELETE FROM skipped WHERE shortcode=? AND filename=?`, shortcode, filename)
	return err
}

// ListDownloads returns paginated download records, optionally filtered by username.
func (s *Store) ListDownloads(username string, page, limit int) ([]DownloadEntry, error) {
	if page < 1 {
		page = 1
	}
	if limit <= 0 {
		limit = 50
	}
	offset := (page - 1) * limit

	s.dbMu.Lock()
	defer s.dbMu.Unlock()

	var rows *sql.Rows
	var err error
	if username != "" {
		rows, err = s.db.Query(
			`SELECT id,shortcode,username,filename,local_path,file_size,downloaded_at FROM downloads WHERE username=? ORDER BY id DESC LIMIT ? OFFSET ?`,
			username, limit, offset,
		)
	} else {
		rows, err = s.db.Query(
			`SELECT id,shortcode,username,filename,local_path,file_size,downloaded_at FROM downloads ORDER BY id DESC LIMIT ? OFFSET ?`,
			limit, offset,
		)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	curBaseDir := s.BaseDir()
	entries := []DownloadEntry{}
	for rows.Next() {
		var e DownloadEntry
		if err := rows.Scan(&e.ID, &e.Shortcode, &e.Username, &e.Filename, &e.LocalPath, &e.FileSize, &e.Downloaded); err != nil {
			return nil, err
		}
		if rel, err := filepath.Rel(curBaseDir, e.LocalPath); err == nil {
			e.RelativePath = rel
		} else {
			e.RelativePath = e.Filename
		}
		entries = append(entries, e)
	}
	return entries, nil
}

// ListSkipped returns paginated skipped records.
func (s *Store) ListSkipped(page, limit int) ([]SkipEntry, error) {
	if page < 1 {
		page = 1
	}
	if limit <= 0 {
		limit = 50
	}
	offset := (page - 1) * limit

	s.dbMu.Lock()
	defer s.dbMu.Unlock()

	rows, err := s.db.Query(
		`SELECT id,shortcode,username,filename,local_path,skipped_at FROM skipped ORDER BY id DESC LIMIT ? OFFSET ?`,
		limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entries := []SkipEntry{}
	for rows.Next() {
		var e SkipEntry
		if err := rows.Scan(&e.ID, &e.Shortcode, &e.Username, &e.Filename, &e.LocalPath, &e.SkippedAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

// DeleteDownload removes a download record by ID. Returns deleted=false if no row matched.
func (s *Store) DeleteDownload(id int) (bool, error) {
	s.dbMu.Lock()
	defer s.dbMu.Unlock()

	res, err := s.db.Exec(`DELETE FROM downloads WHERE id=?`, id)
	if err != nil {
		return false, err
	}
	affected, _ := res.RowsAffected()
	return affected > 0, nil
}

// DeleteAllDownloads clears all rows from the downloads table.
func (s *Store) DeleteAllDownloads() error {
	s.dbMu.Lock()
	defer s.dbMu.Unlock()

	_, err := s.db.Exec(`DELETE FROM downloads`)
	return err
}

// DeleteSkipped removes a skipped record by ID string.
func (s *Store) DeleteSkipped(id string) error {
	s.dbMu.Lock()
	defer s.dbMu.Unlock()

	_, err := s.db.Exec(`DELETE FROM skipped WHERE id=?`, id)
	return err
}

// DeleteAllSkipped clears all rows from the skipped table.
func (s *Store) DeleteAllSkipped() error {
	s.dbMu.Lock()
	defer s.dbMu.Unlock()

	_, err := s.db.Exec(`DELETE FROM skipped`)
	return err
}

// Counts returns total downloads, total skipped, and unique account counts.
func (s *Store) Counts() (Counts, error) {
	s.dbMu.Lock()
	defer s.dbMu.Unlock()

	var c Counts
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM downloads`).Scan(&c.TotalDownloads); err != nil {
		return c, err
	}
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM skipped`).Scan(&c.TotalSkipped); err != nil {
		return c, err
	}
	if err := s.db.QueryRow(`SELECT COUNT(DISTINCT username) FROM downloads`).Scan(&c.UniqueAccounts); err != nil {
		return c, err
	}
	return c, nil
}

// ListAccounts returns distinct downloaded usernames ordered by download count descending.
func (s *Store) ListAccounts() ([]AccountSummary, error) {
	s.dbMu.Lock()
	defer s.dbMu.Unlock()

	rows, err := s.db.Query(`SELECT username, COUNT(*) as cnt FROM downloads GROUP BY username ORDER BY cnt DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	accounts := []AccountSummary{}
	for rows.Next() {
		var a AccountSummary
		if err := rows.Scan(&a.Username, &a.Count); err != nil {
			return nil, err
		}
		accounts = append(accounts, a)
	}
	return accounts, nil
}

// CreateSafetySnapshot writes an atomic WAL-safe VACUUM INTO backup into the store's
// backups directory and prunes older snapshots beyond the retention limit (5).
func (s *Store) CreateSafetySnapshot(schemaVer int) (string, error) {
	s.dbMu.Lock()
	defer s.dbMu.Unlock()

	if s.backupsDir == "" {
		return "", fmt.Errorf("backups directory not configured")
	}
	return createSafetySnapshot(s.db, s.backupsDir, schemaVer, s.appVersion)
}

func createSafetySnapshot(database *sql.DB, bDir string, schemaVer int, appVersion string) (string, error) {
	if err := os.MkdirAll(bDir, 0755); err != nil {
		return "", err
	}
	timestamp := time.Now().Format("20060102-150405")
	backupName := fmt.Sprintf("instavault.db.v%d.app%s.%s.bak", schemaVer, sanitizePart(appVersion), timestamp)
	backupPath := filepath.Join(bDir, backupName)

	// Avoid collisions when multiple snapshots are created within the same second.
	if _, err := os.Stat(backupPath); err == nil {
		backupName = fmt.Sprintf("instavault.db.v%d.app%s.%s.%d.bak", schemaVer, sanitizePart(appVersion), timestamp, time.Now().UnixNano()%1000000)
		backupPath = filepath.Join(bDir, backupName)
	}

	safePath := strings.ReplaceAll(backupPath, "'", "''")
	if _, err := database.Exec(fmt.Sprintf("VACUUM INTO '%s'", safePath)); err != nil {
		return "", fmt.Errorf("VACUUM INTO failed: %w", err)
	}

	PruneOldBackups(bDir, 5)
	return backupPath, nil
}

// CreateVacuumBackup opens a standalone SQLite database file and creates a clean,
// WAL-safe single-file snapshot at backupPath using VACUUM INTO.
func CreateVacuumBackup(dbFilePath, backupPath string) error {
	if err := os.MkdirAll(filepath.Dir(backupPath), 0755); err != nil {
		return err
	}
	_ = os.Remove(backupPath)

	database, err := sql.Open("sqlite", dbFilePath)
	if err != nil {
		return err
	}
	defer database.Close()

	_, _ = database.Exec("PRAGMA busy_timeout=5000;")
	safePath := strings.ReplaceAll(backupPath, "'", "''")
	_, err = database.Exec(fmt.Sprintf("VACUUM INTO '%s'", safePath))
	if err != nil {
		return fmt.Errorf("VACUUM INTO failed: %w", err)
	}
	return nil
}

// ReadSchemaVersion reads PRAGMA user_version from a standalone SQLite database file.
func ReadSchemaVersion(dbFilePath string) (int, error) {
	database, err := sql.Open("sqlite", dbFilePath)
	if err != nil {
		return 0, err
	}
	defer database.Close()

	var ver int
	if err := database.QueryRow("PRAGMA user_version").Scan(&ver); err != nil {
		return 0, err
	}
	return ver, nil
}

// PruneOldBackups retains only the newest keepCount .bak files in bDir.
func PruneOldBackups(bDir string, keepCount int) {
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

// MigrateLegacyDB copies an older instavault.db from beside the executable or working directory
// into targetDbPath when targetDbPath does not yet exist.
func MigrateLegacyDB(targetDbPath string) {
	if _, err := os.Stat(targetDbPath); err == nil {
		return
	}

	exePath, _ := os.Executable()
	var candidates []string
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

func sanitizePart(name string) string {
	s := sanitizePartRe.ReplaceAllString(name, "_")
	s = strings.TrimSpace(s)
	s = strings.Trim(s, ".")
	if s == "" {
		s = "unnamed"
	}
	return s
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
