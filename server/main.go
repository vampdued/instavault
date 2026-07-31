package main

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"instavault-server/pkg/agent"
	"instavault-server/pkg/domain"
	"instavault-server/pkg/events"
	"instavault-server/pkg/ipc"
	"instavault-server/pkg/queue"
	"instavault-server/pkg/storage"
)

//go:embed ui
var uiFS embed.FS

var (
	repo         *storage.Repository
	queueMgr     *queue.QueueManager
	eventBus     *events.EventBus
	baseDir      string
	folderStruct string
	port         = 19201
)

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowedOrigin := origin == "" || origin == "http://"+r.Host || strings.HasPrefix(origin, "chrome-extension://") || strings.HasPrefix(origin, "moz-extension://")
		if !allowedOrigin {
			http.Error(w, "origin not allowed", http.StatusForbidden)
			return
		}
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
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

func isNativeMessagingInvocation(args []string) bool {
	for _, arg := range args {
		if strings.HasPrefix(arg, "chrome-extension://") || strings.HasPrefix(arg, "moz-extension://") {
			return true
		}
	}
	return false
}

func positiveQueryInt(r *http.Request, key string, fallback int) int {
	value, err := strconv.Atoi(r.URL.Query().Get(key))
	if err != nil || value < 1 {
		return fallback
	}
	return value
}

func main() {
	var host string
	var portFlag int
	var agentMode bool
	nativeHostMode := isNativeMessagingInvocation(os.Args[1:])

	flag.StringVar(&host, "host", "localhost", "host address to bind to")
	flag.IntVar(&portFlag, "port", 19201, "port to listen on")
	flag.BoolVar(&nativeHostMode, "native-host", nativeHostMode, "run as a browser Native Messaging host (stdio)")
	flag.BoolVar(&agentMode, "agent", false, "run the persistent background agent without the dashboard")
	flag.Parse()

	// Env overrides
	if envHost := os.Getenv("INSTAVAULT_HOST"); envHost != "" {
		host = envHost
	} else if envHost := os.Getenv("HOST"); envHost != "" {
		host = envHost
	}

	if envPort := os.Getenv("INSTAVAULT_PORT"); envPort != "" {
		if p, err := strconv.Atoi(envPort); err == nil {
			portFlag = p
		}
	} else if envPort := os.Getenv("PORT"); envPort != "" {
		if p, err := strconv.Atoi(envPort); err == nil {
			portFlag = p
		}
	}
	port = portFlag

	exePath, err := os.Executable()
	if err != nil {
		log.Fatalf("Executable path lookup failed: %v", err)
	}
	endpoint, err := ipc.DefaultEndpoint()
	if err != nil {
		log.Fatalf("Agent endpoint setup failed: %v", err)
	}

	// A browser-launched process is only a Native Messaging-to-agent bridge.
	// It never opens SQLite or owns queue state.
	if nativeHostMode {
		log.SetOutput(os.Stderr)
		logPath := filepath.Join(filepath.Dir(exePath), "instavault-agent.log")
		if err := agent.Bridge(context.Background(), endpoint, os.Stdin, os.Stdout, func() error {
			return agent.StartDetached(exePath, logPath)
		}); err != nil {
			log.Fatalf("Native Messaging bridge failed: %v", err)
		}
		return
	}

	listener, err := ipc.Listen(endpoint)
	if err != nil {
		log.Fatalf("InstaVault agent is already running or unavailable: %v", err)
	}

	// The agent is the single owner of SQLite, queue state, and events.
	dbPath := filepath.Join(filepath.Dir(exePath), "instavault.db")

	repo, err = storage.NewRepository(dbPath)
	if err != nil {
		log.Fatalf("DB init failed: %v", err)
	}
	defer repo.Close()

	home, _ := os.UserHomeDir()
	defaultBaseDir := filepath.Join(home, "Downloads", "Instagram")
	settings, _ := repo.GetSettings(defaultBaseDir, "profile")
	baseDir = settings.BaseDir
	folderStruct = settings.FolderStructure

	_ = os.MkdirAll(baseDir, 0755)

	eventBus = events.NewEventBus()
	queueMgr = queue.NewQueueManager(4, repo, eventBus, baseDir, folderStruct)
	defer queueMgr.Stop()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	agentServer := agent.NewServer(listener, repo, queueMgr, eventBus)
	defer agentServer.Close()

	if agentMode {
		log.Printf("InstaVault agent listening on %s", endpoint)
		if err := agentServer.Serve(ctx); err != nil {
			log.Fatalf("Agent error: %v", err)
		}
		return
	}

	go func() {
		if err := agentServer.Serve(ctx); err != nil {
			log.Printf("Agent error: %v", err)
			stop()
		}
	}()

	log.Printf("InstaVault Server starting — saving to: %s (structure: %s)", baseDir, folderStruct)

	mux := http.NewServeMux()

	mux.HandleFunc("/api/ping", withCORS(func(w http.ResponseWriter, r *http.Request) {
		jsonResp(w, http.StatusOK, map[string]string{"status": "ok", "version": "1.8.0", "baseDir": baseDir})
	}))

	mux.HandleFunc("/api/download", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var req domain.DownloadRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonResp(w, http.StatusBadRequest, domain.DownloadResult{Status: "error", Message: "invalid JSON"})
			return
		}
		res := queueMgr.ProcessSynchronous(req, false)
		code := http.StatusOK
		if res.Status == "error" {
			code = http.StatusInternalServerError
		}
		jsonResp(w, code, res)
	}))

	mux.HandleFunc("/api/force-download", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var req domain.DownloadRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonResp(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
			return
		}
		res := queueMgr.ProcessSynchronous(req, true)
		jsonResp(w, http.StatusOK, res)
	}))

	mux.HandleFunc("/api/skipped", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			_ = repo.DeleteAllSkipped()
			jsonResp(w, http.StatusOK, map[string]string{"status": "cleared"})
		} else {
			entries, _ := repo.ListSkipped(positiveQueryInt(r, "page", 1), positiveQueryInt(r, "limit", 50))
			jsonResp(w, http.StatusOK, entries)
		}
	}))

	mux.HandleFunc("/api/skipped/", withCORS(func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/api/skipped/")
		if id == "" {
			http.Error(w, "missing skipped item id", http.StatusBadRequest)
			return
		}
		switch r.Method {
		case http.MethodDelete:
			if err := repo.DeleteSkip(id); err != nil {
				jsonResp(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			jsonResp(w, http.StatusOK, map[string]string{"status": "deleted"})
		case http.MethodPost:
			var req domain.DownloadRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				jsonResp(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
				return
			}
			result := queueMgr.ProcessSynchronous(req, true)
			code := http.StatusOK
			if result.Status == "error" {
				code = http.StatusInternalServerError
			}
			jsonResp(w, code, result)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	mux.HandleFunc("/api/downloads", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			_ = repo.DeleteAllDownloads()
			jsonResp(w, http.StatusOK, map[string]string{"status": "cleared"})
		} else {
			entries, _ := repo.ListDownloads(positiveQueryInt(r, "page", 1), positiveQueryInt(r, "limit", 50), r.URL.Query().Get("username"), baseDir)
			jsonResp(w, http.StatusOK, entries)
		}
	}))

	mux.HandleFunc("/api/stats", withCORS(func(w http.ResponseWriter, r *http.Request) {
		totDl, totSkip, unqAcc, _ := repo.GetStats()
		dt, df, _ := getDiskUsage(baseDir)
		res := domain.StatsResponse{
			TotalDownloads: totDl,
			TotalSkipped:   totSkip,
			UniqueAccounts: unqAcc,
			ActiveSync:     queueMgr.GetActiveSyncState(),
			DiskTotal:      dt,
			DiskFree:       df,
		}
		jsonResp(w, http.StatusOK, res)
	}))

	mux.HandleFunc("/api/accounts", withCORS(func(w http.ResponseWriter, r *http.Request) {
		accs, _ := repo.GetAccounts()
		jsonResp(w, http.StatusOK, accs)
	}))

	mux.HandleFunc("/api/settings", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			var body map[string]string
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				jsonResp(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
				return
			}
			if newDir, ok := body["baseDir"]; ok && newDir != "" {
				_ = os.MkdirAll(newDir, 0755)
				_ = repo.SaveSetting("baseDir", newDir)
				baseDir = newDir
			}
			if newStruct, ok := body["folderStructure"]; ok && newStruct != "" {
				if newStruct == "profile" || newStruct == "flat" || newStruct == "profile_type" {
					_ = repo.SaveSetting("folderStructure", newStruct)
					folderStruct = newStruct
				}
			}
			queueMgr.UpdateSettings(baseDir, folderStruct)
			jsonResp(w, http.StatusOK, map[string]string{
				"status":          "saved",
				"baseDir":         baseDir,
				"folderStructure": folderStruct,
			})
		} else {
			s, _ := repo.GetSettings(baseDir, folderStruct)
			jsonResp(w, http.StatusOK, s)
		}
	}))

	mux.HandleFunc("/api/media/", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		filePath := strings.TrimPrefix(r.URL.Path, "/api/media/")
		safePath := filepath.Clean(filePath)
		if strings.HasPrefix(safePath, "..") || strings.HasPrefix(safePath, "/") {
			http.Error(w, "Access Denied", http.StatusForbidden)
			return
		}
		fullPath := filepath.Join(baseDir, safePath)
		http.ServeFile(w, r, fullPath)
	}))

	// Embedded Web UI
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "ui/index.html"
		} else {
			path = "ui/" + path
		}
		data, err := uiFS.ReadFile(path)
		if err != nil {
			data, err = uiFS.ReadFile("ui/index.html")
			if err != nil {
				http.NotFound(w, r)
				return
			}
		}
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

	addr := fmt.Sprintf("%s:%d", host, port)
	log.Printf("Server listening on http://%s", addr)
	httpServer := &http.Server{Addr: addr, Handler: mux}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = httpServer.Shutdown(shutdownCtx)
	}()
	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("Server error: %v", err)
	}
}
