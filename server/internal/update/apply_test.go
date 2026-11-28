package update

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	_ "modernc.org/sqlite"
)

func TestRunPreflightCheck(t *testing.T) {
	// dev version without force
	if err := RunPreflightCheck("C:\\app\\bin\\instavault.exe", "dev", "1.1.0", false); err == nil {
		t.Errorf("expected error for dev build without force")
	}

	// dev version with force
	if err := RunPreflightCheck("C:\\app\\bin\\instavault.exe", "dev", "1.1.0", true); err != nil {
		t.Errorf("expected success for dev build with force, got: %v", err)
	}

	// older or equal target version
	if err := RunPreflightCheck("C:\\app\\bin\\instavault.exe", "1.2.0", "1.1.0", false); err == nil {
		t.Errorf("expected error for downgrading without force")
	}

	// newer target version
	if err := RunPreflightCheck("C:\\app\\bin\\instavault.exe", "1.0.0", "1.1.0", true); err != nil {
		t.Errorf("expected success, got: %v", err)
	}
}

func TestUpdateStatusPersistence(t *testing.T) {
	tmpDir := t.TempDir()
	status := UpdateStatus{
		Stage:         "swapping",
		Result:        "in_progress",
		TargetVersion: "1.2.0",
	}

	if err := SaveUpdateStatus(tmpDir, status); err != nil {
		t.Fatalf("SaveUpdateStatus failed: %v", err)
	}

	read, err := ReadUpdateStatus(tmpDir)
	if err != nil {
		t.Fatalf("ReadUpdateStatus failed: %v", err)
	}

	if read.Stage != "swapping" || read.TargetVersion != "1.2.0" {
		t.Errorf("ReadUpdateStatus mismatch: %+v", read)
	}
}

func TestExecuteApplyUpdate_Success(t *testing.T) {
	tmpDir := t.TempDir()

	targetExe := filepath.Join(tmpDir, "instavault-server.exe")
	newExe := filepath.Join(tmpDir, "instavault-new.exe")
	extDir := filepath.Join(tmpDir, "extension")
	dataDir := filepath.Join(tmpDir, "data")
	logsDir := filepath.Join(tmpDir, "logs")
	backupsDir := filepath.Join(tmpDir, "backups")
	dbPath := filepath.Join(dataDir, "instavault.db")

	_ = os.MkdirAll(extDir, 0755)
	_ = os.MkdirAll(dataDir, 0755)
	_ = os.WriteFile(targetExe, []byte("target-v1.0.0"), 0755)
	_ = os.WriteFile(newExe, []byte("new-v1.1.0"), 0755)
	_ = os.WriteFile(filepath.Join(extDir, "manifest.json"), []byte(`{"version":"1.0.0"}`), 0644)

	// Create a real SQLite DB in WAL mode to verify the SnapshotDB adapter is invoked
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatal(err)
	}
	_, _ = db.Exec("PRAGMA journal_mode=WAL;")
	_, _ = db.Exec("CREATE TABLE downloads (id INT); INSERT INTO downloads VALUES (1);")
	_ = db.Close()

	// Mock HTTP version server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok","version":"1.1.0"}`))
	}))
	defer ts.Close()

	u, _ := url.Parse(ts.URL)
	port, _ := strconv.Atoi(u.Port())

	snapshotCalled := false
	opts := ApplyUpdateOptions{
		Paths: ApplyPaths{
			NewExe:     newExe,
			TargetExe:  targetExe,
			ExtDir:     extDir,
			DataDir:    dataDir,
			LogsDir:    logsDir,
			BackupsDir: backupsDir,
			DBPath:     dbPath,
		},
		Runtime: ApplyRuntime{
			Port:            port,
			ExpectedVersion: "1.1.0",
		},
		Adapters: ApplyAdapters{
			HTTPClient: ts.Client(),
			SnapshotDB: func(src, dst string) error {
				snapshotCalled = true
				return vacuumBackup(src, dst)
			},
			Spawn: func(cmd *exec.Cmd) error {
				return nil
			},
		},
	}

	if err := ExecuteApplyUpdate(opts); err != nil {
		t.Fatalf("ExecuteApplyUpdate failed: %v", err)
	}

	if !snapshotCalled {
		t.Errorf("expected post-shutdown SnapshotDB adapter to be called")
	}

	// Verify targetExe now contains new binary content
	content, err := os.ReadFile(targetExe)
	if err != nil {
		t.Fatal(err)
	}
	if string(content) != "new-v1.1.0" {
		t.Errorf("expected targetExe to contain new-v1.1.0, got %q", string(content))
	}

	// Verify .old was cleaned up
	if _, err := os.Stat(targetExe + ".old"); err == nil {
		t.Errorf("expected .old backup to be removed on success")
	}

	// Verify update-status.json
	status, err := ReadUpdateStatus(dataDir)
	if err != nil {
		t.Fatal(err)
	}
	if status.Stage != "complete" || status.Result != "success" {
		t.Errorf("expected complete/success status, got %+v", status)
	}
}

func TestExecuteApplyUpdate_Rollback(t *testing.T) {
	tmpDir := t.TempDir()

	targetExe := filepath.Join(tmpDir, "instavault-server.exe")
	newExe := filepath.Join(tmpDir, "instavault-broken.exe")
	dataDir := filepath.Join(tmpDir, "data")
	logsDir := filepath.Join(tmpDir, "logs")
	backupsDir := filepath.Join(tmpDir, "backups")
	dbPath := filepath.Join(dataDir, "instavault.db")

	_ = os.MkdirAll(dataDir, 0755)
	_ = os.WriteFile(targetExe, []byte("target-v1.0.0"), 0755)
	_ = os.WriteFile(newExe, []byte("broken-binary"), 0755)

	// Create test DB with schema version 1 in WAL mode
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatal(err)
	}
	_, _ = db.Exec("PRAGMA journal_mode=WAL;")
	_, _ = db.Exec("PRAGMA user_version = 1;")
	_, _ = db.Exec("CREATE TABLE test (id INT);")
	_ = db.Close()

	// Mock server that returns 500 error (simulating broken binary)
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "internal server error", http.StatusInternalServerError)
	}))
	defer ts.Close()

	u, _ := url.Parse(ts.URL)
	port, _ := strconv.Atoi(u.Port())

	restartedOldDaemon := false
	spawnCount := 0
	opts := ApplyUpdateOptions{
		Paths: ApplyPaths{
			NewExe:     newExe,
			TargetExe:  targetExe,
			DataDir:    dataDir,
			LogsDir:    logsDir,
			BackupsDir: backupsDir,
			DBPath:     dbPath,
		},
		Runtime: ApplyRuntime{
			Port:               port,
			ExpectedVersion:    "2.0.0",
			InitialSchemaVer:   1,
			HealthCheckTimeout: 1500 * time.Millisecond,
		},
		Adapters: ApplyAdapters{
			HTTPClient: ts.Client(),
			Spawn: func(cmd *exec.Cmd) error {
				spawnCount++
				if spawnCount == 1 {
					// First spawn is the new binary; simulate it migrating schema to 2
					dbBump, _ := sql.Open("sqlite", dbPath)
					_, _ = dbBump.Exec("PRAGMA user_version = 2;")
					_ = dbBump.Close()
				} else {
					// Subsequent spawn is rollback restarting the previous daemon
					restartedOldDaemon = true
				}
				return nil
			},
		},
	}

	err = ExecuteApplyUpdate(opts)
	if err == nil {
		t.Fatalf("expected ExecuteApplyUpdate to fail and rollback, but got nil")
	}

	// Verify targetExe was rolled back to original
	content, err := os.ReadFile(targetExe)
	if err != nil {
		t.Fatal(err)
	}
	if string(content) != "target-v1.0.0" {
		t.Errorf("expected targetExe to be rolled back to target-v1.0.0, got %q", string(content))
	}

	// Verify schema version was rolled back to 1 via VACUUM INTO snapshot
	dbCheck, _ := sql.Open("sqlite", dbPath)
	var ver int
	_ = dbCheck.QueryRow("PRAGMA user_version").Scan(&ver)
	_ = dbCheck.Close()
	if ver != 1 {
		t.Errorf("expected DB schema version to be rolled back to 1, got %d", ver)
	}

	if !restartedOldDaemon {
		t.Errorf("expected old daemon to be restarted during rollback")
	}

	// Verify update-status.json is "failed"
	status, err := ReadUpdateStatus(dataDir)
	if err != nil {
		t.Fatal(err)
	}
	if status.Stage != "rollback" || status.Result != "failed" {
		t.Errorf("expected rollback/failed status, got %+v", status)
	}
}
