package update

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// UpdateStatus describes the persistent status of an update cycle.
type UpdateStatus struct {
	Timestamp     string `json:"timestamp"`
	Stage         string `json:"stage"`  // "idle", "downloading", "verifying", "swapping", "complete", "rollback"
	Result        string `json:"result"` // "in_progress", "success", "failed"
	TargetVersion string `json:"targetVersion,omitempty"`
	NewVersion    string `json:"newVersion,omitempty"`
	Error         string `json:"error,omitempty"`
}

// SaveUpdateStatus writes update-status.json into dataDir.
func SaveUpdateStatus(dataDir string, status UpdateStatus) error {
	status.Timestamp = time.Now().Format(time.RFC3339)
	data, err := json.MarshalIndent(status, "", "  ")
	if err != nil {
		return err
	}
	target := filepath.Join(dataDir, "update-status.json")
	return os.WriteFile(target, data, 0644)
}

// ReadUpdateStatus reads update-status.json from dataDir.
func ReadUpdateStatus(dataDir string) (*UpdateStatus, error) {
	target := filepath.Join(dataDir, "update-status.json")
	data, err := os.ReadFile(target)
	if err != nil {
		return nil, err
	}
	var st UpdateStatus
	if err := json.Unmarshal(data, &st); err != nil {
		return nil, err
	}
	return &st, nil
}

// RunPreflightCheck ensures updating is permitted given the runtime environment.
func RunPreflightCheck(currentExePath, currentVersion, targetVersion string, force bool) error {
	if force {
		return nil
	}

	if currentVersion == "dev" {
		return fmt.Errorf("refusing to update development build (version is 'dev'). Use -force to override")
	}

	if CompareSemver(targetVersion, currentVersion) <= 0 {
		return fmt.Errorf("target version (%s) is not newer than current version (%s)", targetVersion, currentVersion)
	}

	// Verify installation path is under %LOCALAPPDATA%\InstaVault\bin
	localAppData := os.Getenv("LOCALAPPDATA")
	if localAppData != "" {
		expectedBinDir := filepath.Clean(filepath.Join(localAppData, "InstaVault", "bin"))
		cleanExeDir := filepath.Clean(filepath.Dir(currentExePath))

		if !strings.EqualFold(cleanExeDir, expectedBinDir) {
			return fmt.Errorf("InstaVault is running from %s (expected %s). Pass -force to update in-place", cleanExeDir, expectedBinDir)
		}
	}

	return nil
}

// ApplyPaths groups filesystem paths used during helper swap and rollback.
type ApplyPaths struct {
	NewExe     string
	TargetExe  string
	ExtZip     string
	ExtDir     string
	DataDir    string
	LogsDir    string
	BackupsDir string
	DBPath     string
}

// ApplyRuntime groups process, port, schema, and verification parameters.
type ApplyRuntime struct {
	WaitPID            int
	Port               int
	ExpectedVersion    string
	InitialSchemaVer   int
	HealthCheckTimeout time.Duration
}

// ApplyAdapters groups injectable OS, HTTP, and WAL-safe DB snapshot adapters.
type ApplyAdapters struct {
	Spawn      func(cmd *exec.Cmd) error
	WaitPID    func(pid int, timeout time.Duration) error
	SnapshotDB func(dbPath, backupPath string) error
	HTTPClient *http.Client
}

// ApplyUpdateOptions holds cohesive configuration for the updater helper.
type ApplyUpdateOptions struct {
	Paths    ApplyPaths
	Runtime  ApplyRuntime
	Adapters ApplyAdapters
}

// ExecuteApplyUpdate coordinates the swap, health check verification, and automatic rollback.
func ExecuteApplyUpdate(opts ApplyUpdateOptions) error {
	logFile := filepath.Join(opts.Paths.LogsDir, "update.log")
	_ = os.MkdirAll(opts.Paths.LogsDir, 0755)

	logMsg := func(format string, args ...any) {
		msg := fmt.Sprintf("[%s] ", time.Now().Format("2006-01-02 15:04:05")) + fmt.Sprintf(format, args...) + "\n"
		f, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err == nil {
			_, _ = f.WriteString(msg)
			_ = f.Close()
		}
		fmt.Print(msg)
	}

	logMsg("Starting update swap to v%s", opts.Runtime.ExpectedVersion)
	_ = SaveUpdateStatus(opts.Paths.DataDir, UpdateStatus{
		Stage:         "swapping",
		Result:        "in_progress",
		TargetVersion: opts.Runtime.ExpectedVersion,
	})

	// 1. Wait for old daemon process to exit if specified
	if opts.Runtime.WaitPID > 0 && opts.Adapters.WaitPID != nil {
		logMsg("Waiting for old PID %d to terminate...", opts.Runtime.WaitPID)
		if err := opts.Adapters.WaitPID(opts.Runtime.WaitPID, 30*time.Second); err != nil {
			logMsg("Warning waiting for PID %d: %v", opts.Runtime.WaitPID, err)
		}
	}

	// 2. Take final WAL-safe VACUUM INTO rollback Safety Snapshot of live DB
	var rollbackDbBackup string
	if opts.Paths.DBPath != "" {
		if _, err := os.Stat(opts.Paths.DBPath); err == nil {
			_ = os.MkdirAll(opts.Paths.BackupsDir, 0755)
			rollbackDbBackup = filepath.Join(opts.Paths.BackupsDir, fmt.Sprintf("instavault.db.rollback.%s.bak", time.Now().Format("20060102-150405")))
			snapFn := opts.Adapters.SnapshotDB
			if snapFn == nil {
				snapFn = vacuumBackup
			}
			if errSnap := snapFn(opts.Paths.DBPath, rollbackDbBackup); errSnap != nil {
				errWrap := fmt.Errorf("failed creating post-shutdown rollback DB safety snapshot: %w", errSnap)
				logMsg("FATAL: %v", errWrap)
				_ = SaveUpdateStatus(opts.Paths.DataDir, UpdateStatus{
					Stage:  "swapping",
					Result: "failed",
					Error:  errWrap.Error(),
				})
				return errWrap
			}
			logMsg("Created clean post-shutdown VACUUM INTO rollback DB backup at: %s", rollbackDbBackup)
		}
	}

	// 3. Stage and swap extension files if provided
	var oldExtBackup string
	if opts.Paths.ExtZip != "" && opts.Paths.ExtDir != "" {
		if _, err := os.Stat(opts.Paths.ExtZip); err == nil {
			stagedExt := filepath.Join(filepath.Dir(opts.Paths.ExtZip), "staged_extension")
			_ = os.RemoveAll(stagedExt)
			if errExt := SafeExtractZip(opts.Paths.ExtZip, stagedExt); errExt == nil {
				if _, errStat := os.Stat(opts.Paths.ExtDir); errStat == nil {
					oldExtBackup = opts.Paths.ExtDir + ".old"
					_ = os.RemoveAll(oldExtBackup)
					_ = os.Rename(opts.Paths.ExtDir, oldExtBackup)
				}
				if errMv := os.Rename(stagedExt, opts.Paths.ExtDir); errMv != nil {
					logMsg("Warning: failed moving staged extension into place: %v", errMv)
				} else {
					logMsg("Staged updated extension into: %s", opts.Paths.ExtDir)
				}
			}
		}
	}

	// 4. Swap binary
	oldExeBackup := opts.Paths.TargetExe + ".old"
	_ = os.Remove(oldExeBackup)
	if err := os.Rename(opts.Paths.TargetExe, oldExeBackup); err != nil {
		errWrap := fmt.Errorf("failed renaming installed binary %s -> %s: %w", opts.Paths.TargetExe, oldExeBackup, err)
		logMsg("FATAL: %v", errWrap)
		_ = SaveUpdateStatus(opts.Paths.DataDir, UpdateStatus{
			Stage:  "swapping",
			Result: "failed",
			Error:  errWrap.Error(),
		})
		return errWrap
	}

	if err := copyFile(opts.Paths.NewExe, opts.Paths.TargetExe); err != nil {
		// Undo binary rename immediately
		_ = os.Rename(oldExeBackup, opts.Paths.TargetExe)
		errWrap := fmt.Errorf("failed copying new binary into %s: %w", opts.Paths.TargetExe, err)
		logMsg("FATAL: %v", errWrap)
		_ = SaveUpdateStatus(opts.Paths.DataDir, UpdateStatus{
			Stage:  "swapping",
			Result: "failed",
			Error:  errWrap.Error(),
		})
		return errWrap
	}

	// 5. Spawn new daemon detached
	logMsg("Spawning new daemon: %s (port %d)", opts.Paths.TargetExe, opts.Runtime.Port)
	cmd := exec.Command(opts.Paths.TargetExe, "-port", strconv.Itoa(opts.Runtime.Port), "-data-dir", opts.Paths.DataDir)
	if opts.Adapters.Spawn != nil {
		if err := opts.Adapters.Spawn(cmd); err != nil {
			logMsg("Failed to spawn new daemon: %v. Initiating rollback...", err)
			return rollback(opts, oldExeBackup, oldExtBackup, rollbackDbBackup, err)
		}
	} else {
		if err := cmd.Start(); err != nil {
			logMsg("Failed to start new daemon: %v. Initiating rollback...", err)
			return rollback(opts, oldExeBackup, oldExtBackup, rollbackDbBackup, err)
		}
	}

	// 6. Poll /api/version health check (up to 20 seconds)
	logMsg("Verifying health check on http://localhost:%d/api/version...", opts.Runtime.Port)
	healthOK := false
	versionURL := fmt.Sprintf("http://localhost:%d/api/version", opts.Runtime.Port)
	client := opts.Adapters.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 2 * time.Second}
	}

	timeout := opts.Runtime.HealthCheckTimeout
	if timeout <= 0 {
		timeout = 20 * time.Second
	}
	startTime := time.Now()
	for time.Since(startTime) < timeout {
		time.Sleep(500 * time.Millisecond)

		req, reqErr := http.NewRequest(http.MethodGet, versionURL, nil)
		if reqErr != nil {
			continue
		}
		req.Header.Set("User-Agent", "InstaVault-Update-Verifier")

		resp, err := client.Do(req)
		if err != nil {
			continue
		}

		if resp.StatusCode == http.StatusOK {
			var body struct {
				Status  string `json:"status"`
				Version string `json:"version"`
			}
			decodeErr := json.NewDecoder(resp.Body).Decode(&body)
			_ = resp.Body.Close()

			if decodeErr == nil && body.Status == "ok" {
				if opts.Runtime.ExpectedVersion == "" || strings.EqualFold(body.Version, opts.Runtime.ExpectedVersion) {
					healthOK = true
					break
				}
				logMsg("Server reported version %q, expected %q", body.Version, opts.Runtime.ExpectedVersion)
			}
		} else {
			_ = resp.Body.Close()
		}
	}

	if !healthOK {
		logMsg("Health check failed or timed out. Initiating rollback...")
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
		return rollback(opts, oldExeBackup, oldExtBackup, rollbackDbBackup, fmt.Errorf("health check timeout for v%s", opts.Runtime.ExpectedVersion))
	}

	// 7. Cleanup .old backups on success
	logMsg("Health check verified successfully! Finalizing update.")
	_ = os.Remove(oldExeBackup)
	if oldExtBackup != "" {
		_ = os.RemoveAll(oldExtBackup)
	}

	_ = SaveUpdateStatus(opts.Paths.DataDir, UpdateStatus{
		Stage:      "complete",
		Result:     "success",
		NewVersion: opts.Runtime.ExpectedVersion,
	})
	logMsg("Update to v%s complete.", opts.Runtime.ExpectedVersion)
	return nil
}

func rollback(opts ApplyUpdateOptions, oldExeBackup, oldExtBackup, rollbackDbBackup string, cause error) error {
	logMsg := func(format string, args ...any) {
		msg := fmt.Sprintf("[%s] [ROLLBACK] ", time.Now().Format("2006-01-02 15:04:05")) + fmt.Sprintf(format, args...) + "\n"
		logFile := filepath.Join(opts.Paths.LogsDir, "update.log")
		f, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err == nil {
			_, _ = f.WriteString(msg)
			_ = f.Close()
		}
		fmt.Print(msg)
	}

	logMsg("Rolling back update due to error: %v", cause)

	// 1. Restore executable
	if _, err := os.Stat(oldExeBackup); err == nil {
		_ = os.Remove(opts.Paths.TargetExe)
		_ = os.Rename(oldExeBackup, opts.Paths.TargetExe)
		logMsg("Restored previous binary: %s", opts.Paths.TargetExe)
	}

	// 2. Restore extension
	if oldExtBackup != "" {
		if _, err := os.Stat(oldExtBackup); err == nil {
			_ = os.RemoveAll(opts.Paths.ExtDir)
			_ = os.Rename(oldExtBackup, opts.Paths.ExtDir)
			logMsg("Restored previous extension: %s", opts.Paths.ExtDir)
		}
	}

	// 3. Conditional DB Rollback: only restore DB if user_version was bumped by new binary
	if opts.Paths.DBPath != "" && rollbackDbBackup != "" {
		currentSchemaVer := getDbSchemaVersion(opts.Paths.DBPath)
		if currentSchemaVer > opts.Runtime.InitialSchemaVer {
			logMsg("Schema version bumped (%d > %d). Restoring DB from rollback backup...", currentSchemaVer, opts.Runtime.InitialSchemaVer)
			_ = os.Remove(opts.Paths.DBPath + "-wal")
			_ = os.Remove(opts.Paths.DBPath + "-shm")
			_ = copyFile(rollbackDbBackup, opts.Paths.DBPath)
		} else {
			logMsg("Schema version unchanged (%d). Preserving live DB.", currentSchemaVer)
		}
	}

	// 4. Restart previous daemon
	logMsg("Restarting previous daemon from: %s", opts.Paths.TargetExe)
	rollbackCmd := exec.Command(opts.Paths.TargetExe, "-port", strconv.Itoa(opts.Runtime.Port), "-data-dir", opts.Paths.DataDir)
	if opts.Adapters.Spawn != nil {
		_ = opts.Adapters.Spawn(rollbackCmd)
	} else {
		_ = rollbackCmd.Start()
	}

	_ = SaveUpdateStatus(opts.Paths.DataDir, UpdateStatus{
		Stage:  "rollback",
		Result: "failed",
		Error:  cause.Error(),
	})

	return fmt.Errorf("update failed and was rolled back: %w", cause)
}

func getDbSchemaVersion(dbPath string) int {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return 0
	}
	defer db.Close()
	var ver int
	_ = db.QueryRow("PRAGMA user_version").Scan(&ver)
	return ver
}

func vacuumBackup(dbPath, backupPath string) error {
	if err := os.MkdirAll(filepath.Dir(backupPath), 0755); err != nil {
		return err
	}
	_ = os.Remove(backupPath)

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return err
	}
	defer db.Close()

	_, _ = db.Exec("PRAGMA busy_timeout=5000;")
	safePath := strings.ReplaceAll(backupPath, "'", "''")
	if _, err := db.Exec(fmt.Sprintf("VACUUM INTO '%s'", safePath)); err != nil {
		return fmt.Errorf("VACUUM INTO failed: %w", err)
	}
	return nil
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
