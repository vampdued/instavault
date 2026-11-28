package vault

import (
	"bytes"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func openTestStore(t *testing.T) (*Store, string, string) {
	t.Helper()
	tmp := t.TempDir()
	dbPath := filepath.Join(tmp, "instavault.db")
	mediaDir := filepath.Join(tmp, "media")
	backupsDir := filepath.Join(tmp, "backups")
	if err := os.MkdirAll(mediaDir, 0755); err != nil {
		t.Fatalf("mkdir media: %v", err)
	}

	store, err := Open(Options{
		DBPath:          dbPath,
		BackupsDir:      backupsDir,
		DefaultBaseDir:  mediaDir,
		FolderStructure: "profile",
		AppVersion:      "1.0.0",
	})
	if err != nil {
		t.Fatalf("Open store: %v", err)
	}
	t.Cleanup(func() {
		_ = store.Close()
	})
	return store, mediaDir, backupsDir
}

func buildSeedBackupFile(t *testing.T, schemaVersion int, baseDirVal, folderStructVal string) string {
	t.Helper()
	p := filepath.Join(t.TempDir(), "seed.db")
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
	return p
}

func TestOpen_RejectsFutureSchemaVersion(t *testing.T) {
	futurePath := buildSeedBackupFile(t, CurrentSchemaVersion+1, "/tmp/m", "profile")
	_, err := Open(Options{
		DBPath:         futurePath,
		DefaultBaseDir: t.TempDir(),
	})
	if err == nil {
		t.Fatalf("expected Open to reject schema version %d", CurrentSchemaVersion+1)
	}
}

func TestIsAlreadyDownloaded_ExactAndWebPDedup(t *testing.T) {
	store, mediaDir, _ := openTestStore(t)
	userDir := filepath.Join(mediaDir, "natgeo")
	if err := os.MkdirAll(userDir, 0755); err != nil {
		t.Fatal(err)
	}

	webpPath := filepath.Join(userDir, "natgeo_C8xABC123.webp")
	if err := os.WriteFile(webpPath, []byte("fake-webp"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := store.RecordDownload("C8xABC123", "natgeo", "natgeo_C8xABC123.webp", webpPath, 9); err != nil {
		t.Fatalf("RecordDownload: %v", err)
	}

	// Exact match
	if ok, p := store.IsAlreadyDownloaded("C8xABC123", "natgeo_C8xABC123.webp"); !ok || p != webpPath {
		t.Fatalf("expected exact dedup match, got ok=%v path=%q", ok, p)
	}

	// Stem match when extension requests .jpg but saved file was rewritten to .webp
	if ok, p := store.IsAlreadyDownloaded("C8xABC123", "natgeo_C8xABC123.jpg"); !ok || p != webpPath {
		t.Fatalf("expected .jpg -> .webp stem dedup match, got ok=%v path=%q", ok, p)
	}

	// Different carousel slide stem must NOT false-match
	if ok, _ := store.IsAlreadyDownloaded("C8xABC123", "natgeo_C8xABC123_2.jpg"); ok {
		t.Fatalf("unexpected dedup match for distinct carousel slide")
	}

	// Missing file on disk should still prevent duplicate downloads (DB-authoritative dedup)
	_ = os.Remove(webpPath)
	if ok, _ := store.IsAlreadyDownloaded("C8xABC123", "natgeo_C8xABC123.jpg"); !ok {
		t.Fatalf("expected true even when saved file was removed from disk")
	}
}

func TestDownloadsSkippedAccountsAndSettings(t *testing.T) {
	store, mediaDir, _ := openTestStore(t)

	p1 := filepath.Join(mediaDir, "alice", "a1.jpg")
	p2 := filepath.Join(mediaDir, "alice", "a2.jpg")
	p3 := filepath.Join(mediaDir, "bob", "b1.mp4")

	_ = store.RecordDownload("SC1", "alice", "a1.jpg", p1, 100)
	_ = store.RecordDownload("SC2", "alice", "a2.jpg", p2, 200)
	_ = store.RecordDownload("SC3", "bob", "b1.mp4", p3, 300)
	_ = store.RecordSkip("SC4", "carol", "c1.jpg", filepath.Join(mediaDir, "carol", "c1.jpg"))

	counts, err := store.Counts()
	if err != nil {
		t.Fatalf("Counts: %v", err)
	}
	if counts.TotalDownloads != 3 || counts.TotalSkipped != 1 || counts.UniqueAccounts != 2 {
		t.Fatalf("unexpected counts: %+v", counts)
	}

	accounts, err := store.ListAccounts()
	if err != nil {
		t.Fatalf("ListAccounts: %v", err)
	}
	if len(accounts) != 2 || accounts[0].Username != "alice" || accounts[0].Count != 2 {
		t.Fatalf("unexpected accounts: %+v", accounts)
	}

	aliceList, err := store.ListDownloads("alice", 1, 10)
	if err != nil {
		t.Fatalf("ListDownloads: %v", err)
	}
	if len(aliceList) != 2 {
		t.Fatalf("expected 2 downloads for alice, got %d", len(aliceList))
	}

	deleted, err := store.DeleteDownload(aliceList[0].ID)
	if err != nil || !deleted {
		t.Fatalf("expected DeleteDownload true, got deleted=%v err=%v", deleted, err)
	}
	deletedAgain, err := store.DeleteDownload(aliceList[0].ID)
	if err != nil || deletedAgain {
		t.Fatalf("expected second DeleteDownload false, got deleted=%v err=%v", deletedAgain, err)
	}

	newDir := filepath.Join(t.TempDir(), "custom-vault")
	gotDir, gotStruct, err := store.SaveSettings(newDir, "profile_type")
	if err != nil {
		t.Fatalf("SaveSettings: %v", err)
	}
	if gotDir != newDir || gotStruct != "profile_type" {
		t.Fatalf("unexpected saved settings: dir=%q struct=%q", gotDir, gotStruct)
	}
}

func TestExportAndValidateBackup(t *testing.T) {
	store, mediaDir, _ := openTestStore(t)
	_ = store.RecordDownload("EXP1", "natgeo", "natgeo_1.jpg", filepath.Join(mediaDir, "natgeo", "natgeo_1.jpg"), 42)

	exportPath := filepath.Join(t.TempDir(), "exported.db")
	if err := store.ExportToPath(exportPath); err != nil {
		t.Fatalf("ExportToPath: %v", err)
	}

	data, err := os.ReadFile(exportPath)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(data, SQLiteFileMagic) {
		t.Fatalf("exported file does not start with SQLite magic header")
	}

	if err := ValidateAndPrepareBackup(exportPath); err != nil {
		t.Fatalf("exported DB failed validation: %v", err)
	}
}

func TestImportBackup_ReplacePreservesBaseDirAndRebases(t *testing.T) {
	store, mediaDir, _ := openTestStore(t)
	_ = store.RecordDownload("OLD_LOCAL", "localuser", "old.jpg", filepath.Join(mediaDir, "localuser", "old.jpg"), 10)

	seedPath := buildSeedBackupFile(t, CurrentSchemaVersion, `C:\Users\OldPC\Downloads\Instagram`, "profile_type")
	res, err := store.ImportBackup(seedPath, "replace", false, nil)
	if err != nil {
		t.Fatalf("ImportBackup replace: %v", err)
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

	ok, gotPath := store.IsAlreadyDownloaded("SC_BACKUP_1", "alice_1.jpg")
	wantPath := filepath.Join(mediaDir, "alice", "alice_1.jpg")
	if !ok || gotPath != wantPath {
		t.Fatalf("expected rebased path %q, got ok=%v path=%q", wantPath, ok, gotPath)
	}
}

func TestImportBackup_MergeConflictRules(t *testing.T) {
	store, mediaDir, _ := openTestStore(t)

	localSharedPath := filepath.Join(mediaDir, "bob", "local_winner.jpg")
	_ = store.RecordDownload("SC_SHARED", "bob", "bob_shared.jpg", localSharedPath, 999)
	_ = store.RecordDownload("SC_LOCAL_DL", "dave", "dave_1.jpg", filepath.Join(mediaDir, "dave", "dave_1.jpg"), 100)
	_ = store.RecordSkip("SC_BACKUP_1", "alice", "alice_1.jpg", filepath.Join(mediaDir, "alice", "alice_1.jpg"))

	seedPath := buildSeedBackupFile(t, CurrentSchemaVersion, "/old/pc/media", "flat")
	res, err := store.ImportBackup(seedPath, "merge", false, nil)
	if err != nil {
		t.Fatalf("ImportBackup merge: %v", err)
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

	ok, sharedPath := store.IsAlreadyDownloaded("SC_SHARED", "bob_shared.jpg")
	if !ok || sharedPath != localSharedPath {
		t.Fatalf("merge overwrote local download row: got %q, want %q", sharedPath, localSharedPath)
	}
}

func TestImportBackup_Guardrails(t *testing.T) {
	store, _, _ := openTestStore(t)

	// 1. Non-SQLite file rejected with ErrInvalidBackup
	badFile := filepath.Join(t.TempDir(), "fake.db")
	_ = os.WriteFile(badFile, []byte("hello world"), 0644)
	if _, err := store.ImportBackup(badFile, "replace", false, nil); !errors.Is(err, ErrInvalidBackup) {
		t.Fatalf("expected ErrInvalidBackup for non-SQLite file, got %v", err)
	}

	// 2. Future schema version rejected with ErrInvalidBackup
	futurePath := buildSeedBackupFile(t, CurrentSchemaVersion+1, "/old", "profile")
	if _, err := store.ImportBackup(futurePath, "replace", false, nil); !errors.Is(err, ErrInvalidBackup) {
		t.Fatalf("expected ErrInvalidBackup for future schema version, got %v", err)
	}

	// 3. Active downloads busy check returns ErrBusy
	validPath := buildSeedBackupFile(t, CurrentSchemaVersion, "/old", "profile")
	if _, err := store.ImportBackup(validPath, "replace", false, func() bool { return true }); !errors.Is(err, ErrBusy) {
		t.Fatalf("expected ErrBusy when downloads are active, got %v", err)
	}
}

func TestSafetySnapshotAndPruning(t *testing.T) {
	store, _, backupsDir := openTestStore(t)

	for i := 0; i < 7; i++ {
		p, err := store.CreateSafetySnapshot(CurrentSchemaVersion)
		if err != nil {
			t.Fatalf("CreateSafetySnapshot %d: %v", i, err)
		}
		// Stagger modtimes slightly for deterministic pruning order
		ts := time.Now().Add(time.Duration(i) * time.Second)
		_ = os.Chtimes(p, ts, ts)
	}

	entries, err := os.ReadDir(backupsDir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 5 {
		t.Fatalf("expected 5 retained safety snapshots after pruning, got %d", len(entries))
	}
}

func TestRebaseLocalPath(t *testing.T) {
	got, ok := RebaseLocalPath(`c:\users\old\instagram\natgeo\a.jpg`, `C:\Users\Old\Instagram`, `/home/new/ig`)
	if !ok || got != filepath.Join(`/home/new/ig`, "natgeo", "a.jpg") {
		t.Fatalf("case-insensitive Windows rebase failed: ok=%v got=%q", ok, got)
	}

	unchanged, ok2 := RebaseLocalPath(`/other/dir/a.jpg`, `/old/base`, `/new/base`)
	if ok2 || unchanged != `/other/dir/a.jpg` {
		t.Fatalf("non-matching path should remain unchanged: ok=%v got=%q", ok2, unchanged)
	}
}
