package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
)

func createMultipartImportRequest(t *testing.T, fileBytes []byte, filename, mode string, overwriteBaseDir bool) *http.Request {
	t.Helper()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	if mode != "" {
		_ = mw.WriteField("mode", mode)
	}
	if overwriteBaseDir {
		_ = mw.WriteField("overwriteBaseDir", "true")
	}
	fw, err := mw.CreateFormFile("file", filename)
	if err != nil {
		t.Fatalf("CreateFormFile: %v", err)
	}
	if _, err := fw.Write(fileBytes); err != nil {
		t.Fatalf("write file bytes: %v", err)
	}
	if err := mw.Close(); err != nil {
		t.Fatalf("close multipart: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/database/import", &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	return req
}

func buildSeedBackupBytes(t *testing.T, schemaVersion int, baseDirVal, folderStructVal string) []byte {
	t.Helper()
	tmp := t.TempDir()
	p := filepath.Join(tmp, "seed.db")
	d, err := sql.Open("sqlite", p)
	if err != nil {
		t.Fatalf("open seed db: %v", err)
	}
	defer d.Close()

	_, err = d.Exec(`
		CREATE TABLE downloads (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			shortcode TEXT NOT NULL,
			username TEXT NOT NULL,
			filename TEXT NOT NULL,
			local_path TEXT NOT NULL,
			file_size INTEGER DEFAULT 0,
			downloaded_at TEXT NOT NULL
		);
		CREATE UNIQUE INDEX idx_shortcode_filename ON downloads(shortcode, filename);
		CREATE TABLE skipped (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			shortcode TEXT NOT NULL,
			username TEXT NOT NULL,
			filename TEXT NOT NULL,
			local_path TEXT NOT NULL,
			skipped_at TEXT NOT NULL
		);
		CREATE UNIQUE INDEX idx_skip_shortcode_filename ON skipped(shortcode, filename);
		CREATE TABLE settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);
	`)
	if err != nil {
		t.Fatalf("seed schema: %v", err)
	}
	_, _ = d.Exec(`INSERT INTO downloads(shortcode,username,filename,local_path,file_size,downloaded_at) VALUES(?,?,?,?,?,?)`,
		"SC_BACKUP_1", "alice", "alice_1.jpg", baseDirVal+"/alice/alice_1.jpg", 1234, "2026-11-20T10:00:00Z")
	_, _ = d.Exec(`INSERT INTO downloads(shortcode,username,filename,local_path,file_size,downloaded_at) VALUES(?,?,?,?,?,?)`,
		"SC_SHARED", "bob", "bob_shared.jpg", baseDirVal+"/bob/bob_shared.jpg", 555, "2026-11-20T10:00:00Z")
	_, _ = d.Exec(`INSERT INTO skipped(shortcode,username,filename,local_path,skipped_at) VALUES(?,?,?,?,?)`,
		"SC_SKIP_NEW", "carol", "carol_1.jpg", baseDirVal+"/carol/carol_1.jpg", "2026-11-20T11:00:00Z")
	_, _ = d.Exec(`INSERT INTO skipped(shortcode,username,filename,local_path,skipped_at) VALUES(?,?,?,?,?)`,
		"SC_LOCAL_DL", "dave", "dave_1.jpg", baseDirVal+"/dave/dave_1.jpg", "2026-11-20T11:00:00Z")
	if baseDirVal != "" {
		_, _ = d.Exec(`INSERT INTO settings(key,value) VALUES('baseDir',?)`, baseDirVal)
	}
	if folderStructVal != "" {
		_, _ = d.Exec(`INSERT INTO settings(key,value) VALUES('folderStructure',?)`, folderStructVal)
	}
	_, _ = d.Exec(fmt.Sprintf("PRAGMA user_version = %d", schemaVersion))
	_ = d.Close()

	data, err := os.ReadFile(p)
	if err != nil {
		t.Fatalf("read seed db: %v", err)
	}
	return data
}

func TestHandleExportDatabase(t *testing.T) {
	mediaDir := setupTestEnv(t)
	recordDownload("EXP1", "natgeo", "natgeo_1.jpg", filepath.Join(mediaDir, "natgeo", "natgeo_1.jpg"), 42)

	req := httptest.NewRequest(http.MethodGet, "/api/database/export", nil)
	rec := httptest.NewRecorder()
	handleExportDatabase(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/x-sqlite3" {
		t.Fatalf("expected application/x-sqlite3, got %q", ct)
	}
	cd := rec.Header().Get("Content-Disposition")
	if !strings.Contains(cd, "instavault-backup-") || !strings.Contains(cd, ".db") {
		t.Fatalf("unexpected Content-Disposition: %q", cd)
	}
	body, _ := io.ReadAll(rec.Body)
	if !bytes.HasPrefix(body, sqliteFileMagic) {
		t.Fatalf("exported payload does not start with SQLite magic header")
	}

	outPath := filepath.Join(t.TempDir(), "exported.db")
	if err := os.WriteFile(outPath, body, 0644); err != nil {
		t.Fatal(err)
	}
	if err := validateAndPrepareImportDB(outPath); err != nil {
		t.Fatalf("exported DB failed validation: %v", err)
	}
}

func TestHandleImportDatabase_ReplacePreservesBaseDirAndRebases(t *testing.T) {
	mediaDir := setupTestEnv(t)
	backupsDir = filepath.Join(t.TempDir(), "backups")
	t.Cleanup(func() { backupsDir = "" })

	recordDownload("OLD_LOCAL", "localuser", "old.jpg", filepath.Join(mediaDir, "localuser", "old.jpg"), 10)
	backupBytes := buildSeedBackupBytes(t, CurrentSchemaVersion, `C:\Users\OldPC\Downloads\Instagram`, "profile_type")

	req := createMultipartImportRequest(t, backupBytes, "backup.db", "replace", false)
	rec := httptest.NewRecorder()
	handleImportDatabase(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var res ImportDatabaseResult
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if res.Mode != "replace" || !res.BaseDirPreserved || res.BaseDir != mediaDir {
		t.Fatalf("unexpected replace result: %+v", res)
	}
	if res.FolderStructure != "profile_type" {
		t.Fatalf("expected folderStructure=profile_type, got %q", res.FolderStructure)
	}
	if res.TotalDownloads != 2 || res.TotalSkipped != 2 {
		t.Fatalf("expected 2 downloads and 2 skipped, got %+v", res)
	}
	if res.PathsRebased != 4 {
		t.Fatalf("expected 4 rebased paths, got %d", res.PathsRebased)
	}
	if res.SafetySnapshot == "" {
		t.Fatalf("expected pre-import safety snapshot filename")
	}

	// Verify rebased path in DB
	var gotPath string
	if err := db.QueryRow(`SELECT local_path FROM downloads WHERE shortcode='SC_BACKUP_1'`).Scan(&gotPath); err != nil {
		t.Fatal(err)
	}
	wantPath := filepath.Join(mediaDir, "alice", "alice_1.jpg")
	if gotPath != wantPath {
		t.Fatalf("expected rebased path %q, got %q", wantPath, gotPath)
	}
}

func TestHandleImportDatabase_MergeConflictRules(t *testing.T) {
	mediaDir := setupTestEnv(t)
	backupsDir = filepath.Join(t.TempDir(), "backups")
	t.Cleanup(func() { backupsDir = "" })

	// Local has SC_SHARED (should win over backup), SC_LOCAL_DL (should prevent backup's skipped SC_LOCAL_DL),
	// and a stale skipped row for SC_BACKUP_1 (should be cleared when backup's download arrives).
	localSharedPath := filepath.Join(mediaDir, "bob", "local_winner.jpg")
	recordDownload("SC_SHARED", "bob", "bob_shared.jpg", localSharedPath, 999)
	recordDownload("SC_LOCAL_DL", "dave", "dave_1.jpg", filepath.Join(mediaDir, "dave", "dave_1.jpg"), 100)
	recordSkip("SC_BACKUP_1", "alice", "alice_1.jpg", filepath.Join(mediaDir, "alice", "alice_1.jpg"))

	backupBytes := buildSeedBackupBytes(t, CurrentSchemaVersion, "/old/pc/media", "flat")

	req := createMultipartImportRequest(t, backupBytes, "backup.db", "merge", false)
	rec := httptest.NewRecorder()
	handleImportDatabase(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var res ImportDatabaseResult
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatal(err)
	}
	if res.DownloadsAdded != 1 || res.TotalDownloads != 3 {
		t.Fatalf("expected 1 added download (3 total), got %+v", res)
	}
	if res.SkippedAdded != 1 || res.TotalSkipped != 1 {
		t.Fatalf("expected 1 added skipped (1 total), got %+v", res)
	}
	if res.FolderStructure != "profile" {
		t.Fatalf("merge must preserve local folderStructure=profile, got %q", res.FolderStructure)
	}

	var sharedPath string
	if err := db.QueryRow(`SELECT local_path FROM downloads WHERE shortcode='SC_SHARED'`).Scan(&sharedPath); err != nil {
		t.Fatal(err)
	}
	if sharedPath != localSharedPath {
		t.Fatalf("merge overwrote local download row: got %q, want %q", sharedPath, localSharedPath)
	}
}

func TestHandleImportDatabase_Guardrails(t *testing.T) {
	_ = setupTestEnv(t)

	// 1. Active download blocks import with 409
	atomic.StoreInt64(&activeDownloads, 1)
	reqBusy := createMultipartImportRequest(t, []byte("not-a-db"), "bad.db", "replace", false)
	recBusy := httptest.NewRecorder()
	handleImportDatabase(recBusy, reqBusy)
	atomic.StoreInt64(&activeDownloads, 0)
	if recBusy.Code != http.StatusConflict {
		t.Fatalf("expected 409 when downloads active, got %d", recBusy.Code)
	}

	// 2. Non-SQLite file rejected with 400
	reqBad := createMultipartImportRequest(t, []byte("hello world"), "fake.db", "replace", false)
	recBad := httptest.NewRecorder()
	handleImportDatabase(recBad, reqBad)
	if recBad.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for non-SQLite file, got %d", recBad.Code)
	}

	// 3. Future schema version rejected with 400
	futureBytes := buildSeedBackupBytes(t, CurrentSchemaVersion+1, "/old", "profile")
	reqFuture := createMultipartImportRequest(t, futureBytes, "future.db", "replace", false)
	recFuture := httptest.NewRecorder()
	handleImportDatabase(recFuture, reqFuture)
	if recFuture.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for future schema version, got %d: %s", recFuture.Code, recFuture.Body.String())
	}
}

func TestRebaseLocalPath(t *testing.T) {
	got, ok := rebaseLocalPath(`c:\users\old\instagram\natgeo\a.jpg`, `C:\Users\Old\Instagram`, `/home/new/ig`)
	if !ok || got != filepath.Join(`/home/new/ig`, "natgeo", "a.jpg") {
		t.Fatalf("case-insensitive Windows rebase failed: ok=%v got=%q", ok, got)
	}

	unchanged, ok2 := rebaseLocalPath(`/other/dir/a.jpg`, `/old/base`, `/new/base`)
	if ok2 || unchanged != `/other/dir/a.jpg` {
		t.Fatalf("non-matching path should remain unchanged: ok=%v got=%q", ok2, unchanged)
	}
}
