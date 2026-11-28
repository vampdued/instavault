package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"instavault-server/internal/downloader"
	"instavault-server/internal/synchub"
	"instavault-server/internal/thumbs"
	"instavault-server/internal/update"
	"instavault-server/internal/vault"
)

// StatsResponse is the JSON payload returned by GET /api/stats.
type StatsResponse struct {
	TotalDownloads      int                     `json:"totalDownloads"`
	TotalSkipped        int                     `json:"totalSkipped"`
	UniqueAccounts      int                     `json:"uniqueAccounts"`
	ActiveDownloads     int64                   `json:"activeDownloads"`
	ActiveSync          synchub.ActiveSyncState `json:"activeSync"`
	DiskTotal           uint64                  `json:"diskTotal"`
	DiskFree            uint64                  `json:"diskFree"`
	Version             string                  `json:"version"`
	DataDir             string                  `json:"dataDir"`
	MinExtensionVersion string                  `json:"minExtensionVersion"`
	Draining            bool                    `json:"draining"`
}

// ServerConfig holds runtime configuration and hooks for NewServer.
type ServerConfig struct {
	Host                string
	Port                int
	Version             string
	MinExtensionVersion string
	DataDir             string
	DevMode             bool
	DevUIDir            string
	UIFS                fs.FS
	Thumbs              *thumbs.Generator
	DiskUsage           func(path string) (total uint64, free uint64, err error)
	OnShutdown          func()
}

type serverDeps struct {
	cfg       ServerConfig
	store     *vault.Store
	dl        *downloader.Downloader
	hub       *synchub.Hub
	updater   *update.Manager
	thumbs    *thumbs.Generator
	diskUsage func(path string) (uint64, uint64, error)
}

// NewServer assembles the HTTP handler stack (Host validation, CSRF protection, CORS,
// media traversal guard, API routes, and UI asset handler) over the deepened internal modules.
func NewServer(
	cfg ServerConfig,
	store *vault.Store,
	dl *downloader.Downloader,
	hub *synchub.Hub,
	updater *update.Manager,
) http.Handler {
	diskFn := cfg.DiskUsage
	if diskFn == nil {
		diskFn = getDiskUsage
	}
	if cfg.Version == "" {
		cfg.Version = Version
	}
	if cfg.MinExtensionVersion == "" {
		cfg.MinExtensionVersion = MinExtensionVersion
	}

	s := &serverDeps{
		cfg:       cfg,
		store:     store,
		dl:        dl,
		hub:       hub,
		updater:   updater,
		thumbs:    cfg.Thumbs,
		diskUsage: diskFn,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/ping", withCORS(s.handlePing))
	mux.HandleFunc("/api/version", withCORS(s.handlePing))
	mux.HandleFunc("/api/check-update", withCORS(s.handleCheckUpdate))
	mux.HandleFunc("/api/download", withCORS(s.handleDownload))
	mux.HandleFunc("/api/force-download", withCORS(s.handleForceDownload))
	mux.HandleFunc("/api/skipped", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			s.handleDeleteAllSkipped(w, r)
		} else {
			s.handleListSkipped(w, r)
		}
	}))
	mux.HandleFunc("/api/skipped/", withCORS(s.handleSkippedItem))
	mux.HandleFunc("/api/downloads", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			s.handleDeleteAllDownloads(w, r)
		} else {
			s.handleListDownloads(w, r)
		}
	}))
	mux.HandleFunc("/api/downloads/", withCORS(s.handleDeleteDownload))
	mux.HandleFunc("/api/events", withCORS(s.handleEvents))
	mux.HandleFunc("/api/sync/start", withCORS(s.handleSyncStart))
	mux.HandleFunc("/api/stats", withCORS(s.handleStats))
	mux.HandleFunc("/api/accounts", withCORS(s.handleAccounts))
	mux.HandleFunc("/api/settings", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			s.handleSaveSettings(w, r)
		} else {
			s.handleGetSettings(w, r)
		}
	}))
	mux.HandleFunc("/api/settings/verify-dir", withCORS(s.handleVerifyDir))
	mux.HandleFunc("/api/database/export", withCORS(s.handleExportDatabase))
	mux.HandleFunc("/api/database/import", withCORS(s.handleImportDatabase))
	mux.HandleFunc("/api/shutdown", withCORS(s.handleShutdown))
	mux.HandleFunc("/", s.handleUI)

	// Intercept /api/media/ and /api/thumb/ before http.ServeMux so path-traversal requests
	// receive an immediate 403 Forbidden rather than a ServeMux 301 path-cleaning redirect.
	mediaWrapped := withCORS(s.handleMedia)
	thumbWrapped := withCORS(s.handleMediaThumb)
	router := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/media/") {
			mediaWrapped(w, r)
			return
		}
		if strings.HasPrefix(r.URL.Path, "/api/thumb/") {
			thumbWrapped(w, r)
			return
		}
		mux.ServeHTTP(w, r)
	})

	return validateHostMiddleware(cfg.Host, csrfMiddleware(router))
}

// ─── Middleware & Security ────────────────────────────────────────────────────

func isAllowedOrigin(origin string) bool {
	origin = strings.ToLower(strings.TrimSpace(origin))
	if origin == "" {
		return false
	}
	if strings.HasPrefix(origin, "chrome-extension://") {
		extID := strings.TrimSuffix(strings.TrimPrefix(origin, "chrome-extension://"), "/")
		if pinned := strings.ToLower(strings.TrimSpace(os.Getenv("INSTAVAULT_EXTENSION_ID"))); pinned != "" {
			return extID == pinned
		}
		if len(extID) != 32 {
			return false
		}
		for i := 0; i < len(extID); i++ {
			if extID[i] < 'a' || extID[i] > 'p' {
				return false
			}
		}
		return true
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return false
	}
	hostname := strings.ToLower(u.Hostname())
	return hostname == "localhost" || hostname == "127.0.0.1" || hostname == "::1"
}

func isLoopbackAddr(remoteAddr string) bool {
	remoteHost, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		remoteHost = remoteAddr
	}
	return remoteHost == "127.0.0.1" || remoteHost == "::1" || remoteHost == "localhost"
}

// csrfMiddleware protects mutating requests against CSRF and cross-site attacks.
func csrfMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost || r.Method == http.MethodPut || r.Method == http.MethodPatch || r.Method == http.MethodDelete {
			origin := r.Header.Get("Origin")
			if origin != "" {
				if !isAllowedOrigin(origin) {
					http.Error(w, "Forbidden: Invalid Origin header (CSRF protection)", http.StatusForbidden)
					return
				}
			} else if !isLoopbackAddr(r.RemoteAddr) {
				http.Error(w, "Forbidden: Origin header required for non-loopback requests", http.StatusForbidden)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func validateHostMiddleware(allowedHost string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host := r.Host
		if h, _, err := net.SplitHostPort(host); err == nil {
			host = h
		}
		host = strings.ToLower(strings.TrimSpace(host))

		isAllowed := host == "localhost" || host == "127.0.0.1" || host == "::1" || host == "[::1]"
		if allowedHost != "" && allowedHost != "0.0.0.0" {
			if strings.EqualFold(host, allowedHost) {
				isAllowed = true
			}
		} else if allowedHost == "0.0.0.0" {
			isAllowed = true
		}

		if !isAllowed {
			http.Error(w, "Forbidden: Invalid Host header (DNS rebinding protection)", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			if isAllowedOrigin(origin) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Origin")
			} else if r.Method == http.MethodOptions {
				http.Error(w, "Forbidden: Invalid Origin header", http.StatusForbidden)
				return
			}
		}
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

// ─── API Handlers ─────────────────────────────────────────────────────────────

func (s *serverDeps) handlePing(w http.ResponseWriter, r *http.Request) {
	jsonResp(w, http.StatusOK, map[string]any{
		"status":              "ok",
		"version":             s.cfg.Version,
		"schemaVersion":       vault.CurrentSchemaVersion,
		"minExtensionVersion": s.cfg.MinExtensionVersion,
		"baseDir":             s.store.BaseDir(),
		"dataDir":             s.cfg.DataDir,
		"port":                s.cfg.Port,
		"dev":                 s.cfg.DevMode,
		"draining":            s.dl.IsDraining(),
	})
}

func resolveSafeMediaPath(baseDir, rawRel string) (relSlash, fullPath string, ok bool) {
	cleanBaseDir := filepath.Clean(baseDir)
	relReq := filepath.FromSlash(rawRel)
	if filepath.IsAbs(relReq) {
		return "", "", false
	}
	full := filepath.Clean(filepath.Join(cleanBaseDir, relReq))
	rel, err := filepath.Rel(cleanBaseDir, full)
	if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) || filepath.IsAbs(rel) {
		return "", "", false
	}
	return filepath.ToSlash(rel), full, true
}

func (s *serverDeps) handleMedia(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	_, fullPath, ok := resolveSafeMediaPath(s.store.BaseDir(), strings.TrimPrefix(r.URL.Path, "/api/media/"))
	if !ok {
		http.Error(w, "Access Denied", http.StatusForbidden)
		return
	}
	http.ServeFile(w, r, fullPath)
}

func (s *serverDeps) handleMediaThumb(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	relSlash, fullPath, ok := resolveSafeMediaPath(s.store.BaseDir(), strings.TrimPrefix(r.URL.Path, "/api/thumb/"))
	if !ok {
		http.Error(w, "Access Denied", http.StatusForbidden)
		return
	}
	if s.thumbs == nil {
		http.Error(w, "thumbnail generation unavailable", http.StatusNotImplemented)
		return
	}

	thumbPath, err := s.thumbs.Thumbnail(r.Context(), relSlash, fullPath)
	if err != nil {
		switch {
		case errors.Is(err, os.ErrNotExist):
			http.NotFound(w, r)
		case errors.Is(err, thumbs.ErrUnavailable):
			http.Error(w, "thumbnail generation unavailable", http.StatusNotImplemented)
		case errors.Is(err, context.Canceled):
			return
		default:
			http.Error(w, "thumbnail generation failed", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "image/jpeg")
	w.Header().Set("Cache-Control", "no-cache")
	http.ServeFile(w, r, thumbPath)
}

func (s *serverDeps) handleDownload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if s.dl.IsDraining() {
		jsonResp(w, http.StatusServiceUnavailable, downloader.Result{
			Status:  "error",
			Message: downloader.ErrDraining.Error(),
		})
		return
	}

	var req downloader.Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonResp(w, http.StatusBadRequest, downloader.Result{Status: "error", Message: "invalid JSON"})
		return
	}

	res, err := s.dl.Download(r.Context(), req, downloader.ModeNormal)
	if err != nil {
		switch {
		case errors.Is(err, downloader.ErrDraining):
			jsonResp(w, http.StatusServiceUnavailable, res)
		case errors.Is(err, downloader.ErrMissingFields), errors.Is(err, downloader.ErrDisallowedURL):
			jsonResp(w, http.StatusBadRequest, res)
		default:
			jsonResp(w, http.StatusInternalServerError, res)
		}
		return
	}
	jsonResp(w, http.StatusOK, res)
}

func (s *serverDeps) handleForceDownload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if s.dl.IsDraining() {
		jsonResp(w, http.StatusServiceUnavailable, map[string]string{
			"error": downloader.ErrDraining.Error(),
		})
		return
	}

	var req downloader.Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonResp(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}

	res, err := s.dl.Download(r.Context(), req, downloader.ModeForce)
	if err != nil {
		switch {
		case errors.Is(err, downloader.ErrDraining):
			jsonResp(w, http.StatusServiceUnavailable, map[string]string{"error": err.Error()})
		case errors.Is(err, downloader.ErrMissingFields), errors.Is(err, downloader.ErrDisallowedURL):
			jsonResp(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		default:
			jsonResp(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}
		return
	}
	jsonResp(w, http.StatusOK, map[string]string{"status": "downloaded", "localPath": res.LocalPath})
}

func (s *serverDeps) handleListSkipped(w http.ResponseWriter, r *http.Request) {
	page := 1
	limit := 50
	_, _ = fmt.Sscanf(r.URL.Query().Get("page"), "%d", &page)
	_, _ = fmt.Sscanf(r.URL.Query().Get("limit"), "%d", &limit)

	entries, err := s.store.ListSkipped(page, limit)
	if err != nil {
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	jsonResp(w, http.StatusOK, entries)
}

func (s *serverDeps) handleSkippedItem(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodDelete:
		id := strings.TrimPrefix(r.URL.Path, "/api/skipped/")
		_ = s.store.DeleteSkipped(id)
		jsonResp(w, http.StatusOK, map[string]string{"status": "deleted"})
	case http.MethodPost:
		var req downloader.Request
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonResp(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
			return
		}
		res, err := s.dl.Download(r.Context(), req, downloader.ModeSkipRetry)
		if err != nil {
			switch {
			case errors.Is(err, downloader.ErrDraining):
				jsonResp(w, http.StatusServiceUnavailable, map[string]string{"error": err.Error()})
			case errors.Is(err, downloader.ErrMissingFields), errors.Is(err, downloader.ErrDisallowedURL):
				jsonResp(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			default:
				jsonResp(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			}
			return
		}
		jsonResp(w, http.StatusOK, map[string]string{"status": "downloaded", "localPath": res.LocalPath})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *serverDeps) handleDeleteAllSkipped(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	_ = s.store.DeleteAllSkipped()
	jsonResp(w, http.StatusOK, map[string]string{"status": "cleared"})
}

func (s *serverDeps) handleListDownloads(w http.ResponseWriter, r *http.Request) {
	page := 1
	limit := 50
	_, _ = fmt.Sscanf(r.URL.Query().Get("page"), "%d", &page)
	_, _ = fmt.Sscanf(r.URL.Query().Get("limit"), "%d", &limit)
	username := r.URL.Query().Get("username")

	entries, err := s.store.ListDownloads(username, page, limit)
	if err != nil {
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	jsonResp(w, http.StatusOK, entries)
}

func (s *serverDeps) handleDeleteAllDownloads(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	_ = s.store.DeleteAllDownloads()
	jsonResp(w, http.StatusOK, map[string]string{"status": "cleared"})
}

func (s *serverDeps) handleDeleteDownload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	idStr := strings.TrimPrefix(r.URL.Path, "/api/downloads/")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		jsonResp(w, http.StatusBadRequest, map[string]string{"error": "invalid download id"})
		return
	}
	deleted, err := s.store.DeleteDownload(id)
	if err != nil {
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if !deleted {
		jsonResp(w, http.StatusNotFound, map[string]string{"error": "download record not found"})
		return
	}
	jsonResp(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (s *serverDeps) handleStats(w http.ResponseWriter, r *http.Request) {
	counts, _ := s.store.Counts()
	activeCount := s.dl.ActiveDownloads()
	diskTotal, diskFree, _ := s.diskUsage(s.store.BaseDir())

	resp := StatsResponse{
		TotalDownloads:      counts.TotalDownloads,
		TotalSkipped:        counts.TotalSkipped,
		UniqueAccounts:      counts.UniqueAccounts,
		ActiveDownloads:     activeCount,
		ActiveSync:          s.hub.Snapshot(activeCount),
		DiskTotal:           diskTotal,
		DiskFree:            diskFree,
		Version:             s.cfg.Version,
		DataDir:             s.cfg.DataDir,
		MinExtensionVersion: s.cfg.MinExtensionVersion,
		Draining:            s.dl.IsDraining(),
	}
	jsonResp(w, http.StatusOK, resp)
}

func (s *serverDeps) handleAccounts(w http.ResponseWriter, r *http.Request) {
	accounts, err := s.store.ListAccounts()
	if err != nil {
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	jsonResp(w, http.StatusOK, accounts)
}

func (s *serverDeps) handleGetSettings(w http.ResponseWriter, r *http.Request) {
	settings, _ := s.store.Settings()
	if settings == nil {
		settings = map[string]string{}
	}
	settings["dataDir"] = s.cfg.DataDir
	settings["version"] = s.cfg.Version
	jsonResp(w, http.StatusOK, settings)
}

func (s *serverDeps) handleSaveSettings(w http.ResponseWriter, r *http.Request) {
	var body map[string]string
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonResp(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}

	curBaseDir, curStructure, err := s.store.SaveSettings(body["baseDir"], body["folderStructure"])
	if err != nil {
		jsonResp(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	jsonResp(w, http.StatusOK, map[string]string{
		"status":          "saved",
		"baseDir":         curBaseDir,
		"folderStructure": curStructure,
	})
}

func (s *serverDeps) handleVerifyDir(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Path string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonResp(w, http.StatusBadRequest, map[string]any{"valid": false, "message": "Invalid JSON request"})
		return
	}
	p := strings.TrimSpace(req.Path)
	if p == "" || !filepath.IsAbs(p) {
		jsonResp(w, http.StatusOK, map[string]any{"valid": false, "message": "Path must be an absolute directory path"})
		return
	}
	cleanPath := filepath.Clean(p)
	if fi, err := os.Stat(cleanPath); err == nil {
		if !fi.IsDir() {
			jsonResp(w, http.StatusOK, map[string]any{"valid": false, "message": "Path points to a file, not a folder"})
			return
		}
		probe, err := os.CreateTemp(cleanPath, ".iv-write-check-*")
		if err != nil {
			jsonResp(w, http.StatusOK, map[string]any{"valid": false, "message": "Folder exists but is not writable: " + err.Error()})
			return
		}
		probeName := probe.Name()
		_ = probe.Close()
		_ = os.Remove(probeName)
		jsonResp(w, http.StatusOK, map[string]any{"valid": true, "exists": true, "writable": true, "message": "Folder exists and is writable"})
		return
	}
	parent := filepath.Dir(cleanPath)
	for {
		if fi, err := os.Stat(parent); err == nil {
			if !fi.IsDir() {
				jsonResp(w, http.StatusOK, map[string]any{"valid": false, "message": "Parent path is not a folder"})
				return
			}
			probe, err := os.CreateTemp(parent, ".iv-write-check-*")
			if err != nil {
				jsonResp(w, http.StatusOK, map[string]any{"valid": false, "message": "Parent folder is not writable: " + err.Error()})
				return
			}
			probeName := probe.Name()
			_ = probe.Close()
			_ = os.Remove(probeName)
			jsonResp(w, http.StatusOK, map[string]any{"valid": true, "exists": false, "writable": true, "message": "Folder will be created on save (parent is writable)"})
			return
		}
		nextParent := filepath.Dir(parent)
		if nextParent == parent {
			break
		}
		parent = nextParent
	}
	jsonResp(w, http.StatusOK, map[string]any{"valid": false, "message": "Drive or root path does not exist"})
}

func (s *serverDeps) handleEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	ch, unsubscribe := s.hub.Subscribe()
	defer unsubscribe()

	active := s.dl.ActiveDownloads()
	snapshot := s.hub.Snapshot(active)
	if initData, err := json.Marshal(map[string]any{
		"activeSync":      snapshot,
		"activeDownloads": active,
	}); err == nil {
		_, _ = w.Write([]byte("event: sync\ndata: " + string(initData) + "\n\n"))
		flusher.Flush()
	}

	keepAlive := time.NewTicker(20 * time.Second)
	defer keepAlive.Stop()
	for {
		select {
		case msg := <-ch:
			_, _ = w.Write(msg)
			flusher.Flush()
		case <-keepAlive.C:
			_, _ = w.Write([]byte(": ping\n\n"))
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}

func (s *serverDeps) handleSyncStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Username string `json:"username"`
		Stage    string `json:"stage"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	s.hub.StartSync(req.Username, req.Stage, s.dl.ActiveDownloads())
	jsonResp(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *serverDeps) handleCheckUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	resp := s.updater.CheckForUpdate()
	jsonResp(w, http.StatusOK, resp)
}

func (s *serverDeps) handleExportDatabase(w http.ResponseWriter, r *http.Request) {
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

	if err := s.store.ExportToPath(exportPath); err != nil {
		log.Printf("[EXPORT] VACUUM INTO failed: %v", err)
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": "failed to export database: " + err.Error()})
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

func (s *serverDeps) handleImportDatabase(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if s.dl.ActiveDownloads() > 0 {
		jsonResp(w, http.StatusConflict, map[string]string{
			"error": "Cannot import while downloads are active. Wait for active downloads to finish and try again.",
		})
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, vault.MaxImportUploadBytes+(2<<20))
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

	written, copyErr := io.Copy(dst, io.LimitReader(file, vault.MaxImportUploadBytes+1))
	closeErr := dst.Close()
	if copyErr != nil || closeErr != nil {
		jsonResp(w, http.StatusInternalServerError, map[string]string{"error": "Failed to save uploaded backup."})
		return
	}
	if written == 0 {
		jsonResp(w, http.StatusBadRequest, map[string]string{"error": "Uploaded backup file is empty."})
		return
	}
	if written > vault.MaxImportUploadBytes {
		jsonResp(w, http.StatusRequestEntityTooLarge, map[string]string{"error": "Backup file exceeds the 256 MB size limit."})
		return
	}

	result, importErr := s.store.ImportBackup(tempDBPath, mode, overwriteBaseDir, func() bool {
		return s.dl.ActiveDownloads() > 0
	})
	if importErr != nil {
		switch {
		case errors.Is(importErr, vault.ErrBusy):
			jsonResp(w, http.StatusConflict, map[string]string{
				"error": "Cannot import while downloads are active. Wait for active downloads to finish and try again.",
			})
		case errors.Is(importErr, vault.ErrInvalidBackup):
			msg := strings.TrimPrefix(importErr.Error(), vault.ErrInvalidBackup.Error()+": ")
			jsonResp(w, http.StatusBadRequest, map[string]string{"error": msg})
		default:
			log.Printf("[IMPORT] Failed (%s): %v", mode, importErr)
			jsonResp(w, http.StatusInternalServerError, map[string]string{"error": "Import failed: " + importErr.Error()})
		}
		return
	}

	log.Printf("[IMPORT] Completed (%s): +%d downloads, +%d skipped, %d paths rebased (totals: %d downloads, %d skipped)",
		result.Mode, result.DownloadsAdded, result.SkippedAdded, result.PathsRebased, result.TotalDownloads, result.TotalSkipped)

	s.hub.Broadcast("sync", map[string]any{
		"databaseImported": true,
		"mode":             result.Mode,
		"totalDownloads":   result.TotalDownloads,
		"totalSkipped":     result.TotalSkipped,
	})

	jsonResp(w, http.StatusOK, result)
}

func (s *serverDeps) handleShutdown(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !isLoopbackAddr(r.RemoteAddr) {
		http.Error(w, "Forbidden: shutdown only allowed from loopback", http.StatusForbidden)
		return
	}

	reason := r.URL.Query().Get("reason")
	if reason == "update" {
		if active, ok := s.dl.BeginDraining(); !ok {
			jsonResp(w, http.StatusConflict, map[string]any{
				"error":           fmt.Sprintf("Active downloads in progress (%d); please wait or cancel", active),
				"activeDownloads": active,
			})
			return
		}
	}

	jsonResp(w, http.StatusOK, map[string]any{
		"status": "shutting_down",
		"pid":    os.Getpid(),
		"reason": reason,
	})
	if s.cfg.OnShutdown != nil {
		go s.cfg.OnShutdown()
	}
}

func (s *serverDeps) handleUI(w http.ResponseWriter, r *http.Request) {
	reqPath := strings.TrimPrefix(r.URL.Path, "/")
	if reqPath == "" {
		reqPath = "index.html"
	}

	var data []byte
	var readErr error

	if s.cfg.DevUIDir != "" {
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")

		diskPath := filepath.Join(s.cfg.DevUIDir, filepath.FromSlash(reqPath))
		data, readErr = os.ReadFile(diskPath)
		if readErr != nil {
			data, readErr = os.ReadFile(filepath.Join(s.cfg.DevUIDir, "index.html"))
		}
	} else if s.cfg.UIFS != nil {
		embedPath := "ui/" + reqPath
		data, readErr = fs.ReadFile(s.cfg.UIFS, embedPath)
		if readErr != nil {
			data, readErr = fs.ReadFile(s.cfg.UIFS, "ui/index.html")
		}
	} else {
		readErr = os.ErrNotExist
	}

	if readErr != nil {
		http.NotFound(w, r)
		return
	}

	switch {
	case strings.HasSuffix(reqPath, ".css"):
		w.Header().Set("Content-Type", "text/css")
	case strings.HasSuffix(reqPath, ".js"):
		w.Header().Set("Content-Type", "application/javascript")
	case strings.HasSuffix(reqPath, ".html"):
		w.Header().Set("Content-Type", "text/html")
	}
	_, _ = w.Write(data)
}
