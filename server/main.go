package main

import (
	"context"
	"embed"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"instavault-server/internal/downloader"
	"instavault-server/internal/synchub"
	"instavault-server/internal/thumbs"
	"instavault-server/internal/update"
	"instavault-server/internal/vault"
)

// Version is populated at build time via -ldflags "-X main.Version=..."
var Version = "1.0.0"

// CurrentSchemaVersion defines the supported SQLite database schema version.
const CurrentSchemaVersion = vault.CurrentSchemaVersion

// MinExtensionVersion defines the minimum Chrome extension version expected.
const MinExtensionVersion = "1.0.0"

//go:embed ui
var uiFS embed.FS

// sanitize delegates to downloader.Sanitize for platform helpers (e.g. proc_unix.go).
func sanitize(name string) string {
	return downloader.Sanitize(name)
}

func getAppDataBaseDir() string {
	if localAppData := os.Getenv("LOCALAPPDATA"); localAppData != "" {
		return filepath.Join(localAppData, "InstaVault")
	}
	if home, err := os.UserHomeDir(); err == nil {
		return filepath.Join(home, ".instavault")
	}
	return "instavault_data"
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

	devMode := *devFlag

	// Configure base directories
	baseRoot := getAppDataBaseDir()
	var dataDir string
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
	backupsDir := filepath.Join(baseRoot, "backups")

	_ = os.MkdirAll(dataDir, 0755)
	_ = os.MkdirAll(logsDir, 0755)
	_ = os.MkdirAll(backupsDir, 0755)

	targetDbPath := filepath.Join(dataDir, "instavault.db")

	// Port configuration
	port := 19201
	if *portFlag > 0 {
		port = *portFlag
	} else if envPort := os.Getenv("INSTAVAULT_PORT"); envPort != "" {
		if p, err := strconv.Atoi(envPort); err == nil {
			port = p
		}
	} else if devMode {
		port = 19202
	}

	// ── Helper Mode (-apply-update) ───────────────────────────────────────────
	if *applyUpdateFlag {
		var initialSchema int
		if *dbPathFlag != "" {
			if ver, err := vault.ReadSchemaVersion(*dbPathFlag); err == nil {
				initialSchema = ver
			}
		}

		opts := update.ApplyUpdateOptions{
			Paths: update.ApplyPaths{
				NewExe:     *newExeFlag,
				TargetExe:  *targetExeFlag,
				ExtZip:     *extZipFlag,
				ExtDir:     *extDirFlag,
				DataDir:    dataDir,
				LogsDir:    logsDir,
				BackupsDir: backupsDir,
				DBPath:     *dbPathFlag,
			},
			Runtime: update.ApplyRuntime{
				WaitPID:          *waitPidFlag,
				Port:             port,
				ExpectedVersion:  *expectedVerFlag,
				InitialSchemaVer: initialSchema,
			},
			Adapters: update.ApplyAdapters{
				Spawn:      spawnDetachedProcess,
				WaitPID:    waitForProcessExit,
				SnapshotDB: vault.CreateVacuumBackup,
			},
		}

		if err := update.ExecuteApplyUpdate(opts); err != nil {
			fmt.Fprintf(os.Stderr, "Apply update failed: %v\n", err)
			os.Exit(1)
		}
		return
	}

	// ── CLI Update Workflow (-update) ─────────────────────────────────────────
	if *updateFlag {
		customURL := ""
		if *allowCustomUpdateURL || devMode {
			customURL = os.Getenv("INSTAVAULT_UPDATE_URL")
		}
		mgr := update.NewManager(update.ManagerConfig{
			CurrentVersion: Version,
			DataDir:        dataDir,
			DBPath:         targetDbPath,
			CustomURL:      customURL,
			Port:           port,
			SnapshotDB:     vault.CreateVacuumBackup,
			ConfigureCmd:   noWindowCmd,
		})
		if err := mgr.RunCLIUpdate(update.CLIUpdateOptions{Force: *forceFlag}); err != nil {
			fmt.Fprintf(os.Stderr, "%v\n", err)
			if errors.Is(err, update.ErrAlreadyUpToDate) {
				os.Exit(0)
			}
			os.Exit(1)
		}
		return
	}

	// ── Normal Daemon Execution ───────────────────────────────────────────────

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

		store, err := vault.Open(vault.Options{
			DBPath:     testDbPath,
			AppVersion: Version,
		})
		if err != nil {
			log.Fatalf("[SELFCHECK] FAIL: DB initialization/migration failed: %v", err)
		}
		if err := store.VerifyHealth(); err != nil {
			_ = store.Close()
			log.Fatalf("[SELFCHECK] FAIL: Query test failed: %v", err)
		}
		_ = store.Close()
		log.Println("[SELFCHECK] PASS: Database, migrations, and binary health verified successfully.")
		return
	}

	host := *hostFlag
	if envHost := os.Getenv("INSTAVAULT_HOST"); envHost != "" {
		host = envHost
	}

	home, _ := os.UserHomeDir()
	defaultBaseDir := filepath.Join(home, "Downloads", "Instagram")

	vault.MigrateLegacyDB(targetDbPath)

	store, err := vault.Open(vault.Options{
		DBPath:          targetDbPath,
		BackupsDir:      backupsDir,
		DefaultBaseDir:  defaultBaseDir,
		FolderStructure: "profile",
		AppVersion:      Version,
	})
	if err != nil {
		log.Fatalf("DB init failed: %v", err)
	}
	defer store.Close()

	_ = os.MkdirAll(store.BaseDir(), 0755)

	pidFile := writePidFile(dataDir)
	defer removePidFile(pidFile)

	log.Printf("InstaVault v%s (schema v%d, dev=%t) starting — dataDir: %s, baseDir: %s", Version, CurrentSchemaVersion, devMode, dataDir, store.BaseDir())

	var devUIDir string
	if devMode {
		cwd, _ := os.Getwd()
		candidates := []string{
			filepath.Join(cwd, "ui"),
			filepath.Join(cwd, "server", "ui"),
		}
		for _, c := range candidates {
			if fi, err := os.Stat(c); err == nil && fi.IsDir() {
				devUIDir = c
				break
			}
		}
		if devUIDir != "" {
			log.Printf("[DEV] Hot-reloading UI directly from disk: %s", devUIDir)
		}
	}

	customUpdateURL := ""
	if devMode {
		customUpdateURL = os.Getenv("INSTAVAULT_UPDATE_URL")
	}

	hub := synchub.New(synchub.Options{})
	dl := downloader.New(downloader.Options{
		Store:        store,
		Progress:     hub,
		ConfigureCmd: noWindowCmd,
	})
	updater := update.NewManager(update.ManagerConfig{
		CurrentVersion: Version,
		DataDir:        dataDir,
		DBPath:         targetDbPath,
		CustomURL:      customUpdateURL,
		Port:           port,
		SnapshotDB:     vault.CreateVacuumBackup,
		ConfigureCmd:   noWindowCmd,
	})

	thumbGen := thumbs.New(thumbs.Options{
		CacheDir:     filepath.Join(dataDir, "thumbs"),
		ConfigureCmd: noWindowCmd,
	})

	addr := fmt.Sprintf("%s:%d", host, port)
	var httpServer *http.Server
	handler := NewServer(ServerConfig{
		Host:                host,
		Port:                port,
		Version:             Version,
		MinExtensionVersion: MinExtensionVersion,
		DataDir:             dataDir,
		DevMode:             devMode,
		DevUIDir:            devUIDir,
		UIFS:                uiFS,
		Thumbs:              thumbGen,
		OnShutdown: func() {
			time.Sleep(200 * time.Millisecond)
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if httpServer != nil {
				_ = httpServer.Shutdown(ctx)
			}
		},
	}, store, dl, hub, updater)

	httpServer = &http.Server{
		Addr:    addr,
		Handler: handler,
	}

	if host == "0.0.0.0" {
		log.Printf("UI available at http://localhost:%d and on your local network", port)
	} else {
		log.Printf("UI available at http://%s", addr)
	}

	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}
