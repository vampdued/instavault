package storage

import (
	"database/sql"
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"

	"instavault-server/pkg/domain"

	_ "modernc.org/sqlite"
)

type Repository struct {
	db *sql.DB
	mu sync.Mutex
}

func NewRepository(dbPath string) (*Repository, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	// Enable WAL mode and busy timeout for concurrent safety
	pragmas := `
	PRAGMA journal_mode=WAL;
	PRAGMA busy_timeout=5000;
	PRAGMA synchronous=NORMAL;
	`
	if _, err := db.Exec(pragmas); err != nil {
		// Log or ignore non-fatal pragma errors
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
	CREATE TABLE IF NOT EXISTS queue_jobs (
		id          TEXT PRIMARY KEY,
		job_json    TEXT NOT NULL,
		updated_at  TEXT NOT NULL
	);
	`
	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, err
	}

	return &Repository{db: db}, nil
}

func (r *Repository) SaveQueueJob(job domain.Job) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	data, err := json.Marshal(job)
	if err != nil {
		return err
	}
	_, err = r.db.Exec(
		`INSERT OR REPLACE INTO queue_jobs(id,job_json,updated_at) VALUES(?,?,?)`,
		job.ID, string(data), job.UpdatedAt.Format(time.RFC3339Nano),
	)
	return err
}

func (r *Repository) DeleteQueueJob(jobID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	_, err := r.db.Exec(`DELETE FROM queue_jobs WHERE id=?`, jobID)
	return err
}

func (r *Repository) ListQueueJobs() ([]domain.Job, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	rows, err := r.db.Query(`SELECT job_json FROM queue_jobs ORDER BY updated_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	jobs := make([]domain.Job, 0)
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return nil, err
		}
		var job domain.Job
		if err := json.Unmarshal([]byte(raw), &job); err != nil {
			return nil, err
		}
		jobs = append(jobs, job)
	}
	return jobs, rows.Err()
}

func (r *Repository) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.db != nil {
		return r.db.Close()
	}
	return nil
}

func (r *Repository) IsAlreadyDownloaded(shortcode, filename string) (bool, string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	var localPath string
	err := r.db.QueryRow(
		`SELECT local_path FROM downloads WHERE shortcode=? AND filename=?`,
		shortcode, filename,
	).Scan(&localPath)
	if err == sql.ErrNoRows {
		return false, ""
	}
	if err != nil {
		return false, ""
	}

	// Verify file still exists on disk
	if _, statErr := os.Stat(localPath); statErr != nil {
		return false, ""
	}
	return true, localPath
}

func (r *Repository) RecordDownload(shortcode, username, filename, localPath string, size int64) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	_, err := r.db.Exec(
		`INSERT OR REPLACE INTO downloads(shortcode,username,filename,local_path,file_size,downloaded_at) VALUES(?,?,?,?,?,?)`,
		shortcode, username, filename, localPath, size, time.Now().Format(time.RFC3339),
	)
	if err != nil {
		return err
	}
	_, _ = r.db.Exec(`DELETE FROM skipped WHERE shortcode=? AND filename=?`, shortcode, filename)
	return nil
}

func (r *Repository) RecordSkip(shortcode, username, filename, localPath string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	_, err := r.db.Exec(
		`INSERT OR IGNORE INTO skipped(shortcode,username,filename,local_path,skipped_at) VALUES(?,?,?,?,?)`,
		shortcode, username, filename, localPath, time.Now().Format(time.RFC3339),
	)
	return err
}

func (r *Repository) ListDownloads(page, limit int, username string, baseDir string) ([]domain.DownloadEntry, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	var rows *sql.Rows
	var err error
	if username != "" {
		rows, err = r.db.Query(
			`SELECT id,shortcode,username,filename,local_path,file_size,downloaded_at FROM downloads WHERE username=? ORDER BY id DESC LIMIT ? OFFSET ?`,
			username, limit, offset,
		)
	} else {
		rows, err = r.db.Query(
			`SELECT id,shortcode,username,filename,local_path,file_size,downloaded_at FROM downloads ORDER BY id DESC LIMIT ? OFFSET ?`,
			limit, offset,
		)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []domain.DownloadEntry
	for rows.Next() {
		var e domain.DownloadEntry
		if err := rows.Scan(&e.ID, &e.Shortcode, &e.Username, &e.Filename, &e.LocalPath, &e.FileSize, &e.Downloaded); err != nil {
			continue
		}
		rel, relErr := filepath.Rel(baseDir, e.LocalPath)
		if relErr == nil {
			e.RelativePath = rel
		} else {
			e.RelativePath = e.Filename
		}
		entries = append(entries, e)
	}
	if entries == nil {
		entries = []domain.DownloadEntry{}
	}
	return entries, nil
}

func (r *Repository) ListSkipped(page, limit int) ([]domain.SkipEntry, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	rows, err := r.db.Query(
		`SELECT id,shortcode,username,filename,local_path,skipped_at FROM skipped ORDER BY id DESC LIMIT ? OFFSET ?`,
		limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []domain.SkipEntry
	for rows.Next() {
		var e domain.SkipEntry
		if err := rows.Scan(&e.ID, &e.Shortcode, &e.Username, &e.Filename, &e.LocalPath, &e.SkippedAt); err != nil {
			continue
		}
		entries = append(entries, e)
	}
	if entries == nil {
		entries = []domain.SkipEntry{}
	}
	return entries, nil
}

func (r *Repository) GetStats() (totalDownloads int, totalSkipped int, uniqueAccounts int, err error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	_ = r.db.QueryRow(`SELECT COUNT(*) FROM downloads`).Scan(&totalDownloads)
	_ = r.db.QueryRow(`SELECT COUNT(*) FROM skipped`).Scan(&totalSkipped)
	_ = r.db.QueryRow(`SELECT COUNT(DISTINCT username) FROM downloads`).Scan(&uniqueAccounts)
	return totalDownloads, totalSkipped, uniqueAccounts, nil
}

func (r *Repository) GetAccounts() ([]domain.AccountStat, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	rows, err := r.db.Query(`SELECT username, COUNT(*) as cnt FROM downloads GROUP BY username ORDER BY cnt DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []domain.AccountStat
	for rows.Next() {
		var a domain.AccountStat
		if err := rows.Scan(&a.Username, &a.Count); err == nil {
			accounts = append(accounts, a)
		}
	}
	if accounts == nil {
		accounts = []domain.AccountStat{}
	}
	return accounts, nil
}

func (r *Repository) GetSettings(defaultBaseDir, defaultFolderStructure string) (domain.Settings, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	s := domain.Settings{
		BaseDir:         defaultBaseDir,
		FolderStructure: defaultFolderStructure,
	}

	rows, err := r.db.Query(`SELECT key, value FROM settings`)
	if err == nil && rows != nil {
		defer rows.Close()
		for rows.Next() {
			var k, v string
			if err := rows.Scan(&k, &v); err == nil {
				switch k {
				case "baseDir":
					if v != "" {
						s.BaseDir = v
					}
				case "folderStructure":
					if v != "" {
						s.FolderStructure = v
					}
				}
			}
		}
	}
	return s, nil
}

func (r *Repository) SaveSetting(key, value string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	_, err := r.db.Exec(`INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)`, key, value)
	return err
}

func (r *Repository) DeleteSkip(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	_, err := r.db.Exec(`DELETE FROM skipped WHERE id=?`, id)
	return err
}

func (r *Repository) DeleteAllSkipped() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	_, err := r.db.Exec(`DELETE FROM skipped`)
	return err
}

func (r *Repository) DeleteAllDownloads() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	_, err := r.db.Exec(`DELETE FROM downloads`)
	return err
}

func (r *Repository) DeleteDownloadByShortcodeAndFilename(shortcode, filename string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	_, _ = r.db.Exec(`DELETE FROM downloads WHERE shortcode=? AND filename=?`, shortcode, filename)
	_, _ = r.db.Exec(`DELETE FROM skipped WHERE shortcode=? AND filename=?`, shortcode, filename)
	return nil
}
