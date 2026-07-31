package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	goruntime "runtime"
	"sync"
	"time"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"

	"instavault-server/pkg/adapters/nativehost"
	"instavault-server/pkg/agent"
	"instavault-server/pkg/agentclient"
	"instavault-server/pkg/domain"
	"instavault-server/pkg/ipc"
)

type DashboardSnapshot struct {
	Connected bool                   `json:"connected"`
	Queue     domain.QueueSnapshot   `json:"queue"`
	Activity  domain.ActiveSyncState `json:"activity"`
	Settings  domain.Settings        `json:"settings"`
	History   []domain.DownloadEntry `json:"history"`
}

type DashboardEvent struct {
	Type     string `json:"type"`
	Sequence uint64 `json:"sequence"`
	Payload  any    `json:"payload,omitempty"`
}

type App struct {
	client          *agentclient.Client
	agentExecutable string
	ctx             context.Context
	cancel          context.CancelFunc
	ctxMu           sync.RWMutex
}

func NewApp() (*App, error) {
	endpoint, err := ipc.DefaultEndpoint()
	if err != nil {
		return nil, fmt.Errorf("prepare agent connection: %w", err)
	}
	agentExecutable := resolveAgentExecutable()
	app := &App{agentExecutable: agentExecutable}
	app.client = agentclient.New(endpoint, app.startAgent)
	return app, nil
}

func (app *App) startup(wailsContext context.Context) {
	ctx, cancel := context.WithCancel(wailsContext)
	app.ctxMu.Lock()
	app.ctx = ctx
	app.cancel = cancel
	app.ctxMu.Unlock()
	go app.forwardAgentMessages(ctx)
	go app.reconnectLoop(ctx)
}

func (app *App) shutdown(context.Context) {
	app.ctxMu.Lock()
	if app.cancel != nil {
		app.cancel()
	}
	app.ctxMu.Unlock()
	_ = app.client.Close()
}

func (app *App) focus() {
	ctx := app.context()
	if ctx == nil {
		return
	}
	wailsRuntime.WindowShow(ctx)
	wailsRuntime.WindowUnminimise(ctx)
}

func (app *App) GetSnapshot() (DashboardSnapshot, error) {
	ctx, cancel := app.requestContext(8 * time.Second)
	defer cancel()

	snapshot := DashboardSnapshot{
		Queue:   domain.QueueSnapshot{Jobs: []domain.Job{}},
		History: []domain.DownloadEntry{},
	}
	if err := app.client.Request(ctx, "queue.get", nil, &snapshot.Queue); err != nil {
		return snapshot, err
	}
	if err := app.client.Request(ctx, "activity.get", nil, &snapshot.Activity); err != nil {
		return snapshot, err
	}
	if err := app.client.Request(ctx, "settings.get", nil, &snapshot.Settings); err != nil {
		return snapshot, err
	}
	query := map[string]any{"page": 1, "limit": 25}
	if err := app.client.Request(ctx, "history.list", query, &snapshot.History); err != nil {
		return snapshot, err
	}
	snapshot.Connected = true
	return snapshot, nil
}

func (app *App) PauseQueue() (domain.QueueSnapshot, error) {
	return app.queueCommand("queue.pause", nil)
}

func (app *App) ResumeQueue() (domain.QueueSnapshot, error) {
	return app.queueCommand("queue.resume", nil)
}

func (app *App) CancelJob(jobID string) (domain.QueueSnapshot, error) {
	if jobID == "" {
		return domain.QueueSnapshot{}, errors.New("job ID is required")
	}
	ctx, cancel := app.requestContext(5 * time.Second)
	defer cancel()
	if err := app.client.Request(ctx, "download.cancel", map[string]string{"jobId": jobID}, nil); err != nil {
		return domain.QueueSnapshot{}, err
	}
	return app.queueCommandWithContext(ctx, "queue.get", nil)
}

func (app *App) SaveSettings(settings domain.Settings) (domain.Settings, error) {
	ctx, cancel := app.requestContext(8 * time.Second)
	defer cancel()
	var saved domain.Settings
	if err := app.client.Request(ctx, "settings.update", settings, &saved); err != nil {
		return domain.Settings{}, err
	}
	return saved, nil
}

func (app *App) ChooseDownloadFolder(current string) (string, error) {
	ctx := app.context()
	if ctx == nil {
		return "", errors.New("dashboard is not ready")
	}
	if current != "" {
		if info, err := os.Stat(current); err != nil || !info.IsDir() {
			current = ""
		}
	}
	return wailsRuntime.OpenDirectoryDialog(ctx, wailsRuntime.OpenDialogOptions{
		Title:                "Choose Instagram download folder",
		DefaultDirectory:     current,
		CanCreateDirectories: true,
	})
}

func (app *App) OpenDownloadsFolder() error {
	ctx, cancel := app.requestContext(5 * time.Second)
	defer cancel()
	var settings domain.Settings
	if err := app.client.Request(ctx, "settings.get", nil, &settings); err != nil {
		return err
	}
	if settings.BaseDir == "" {
		return errors.New("download folder is not configured")
	}
	return openFolder(settings.BaseDir)
}

func (app *App) queueCommand(messageType string, payload any) (domain.QueueSnapshot, error) {
	ctx, cancel := app.requestContext(5 * time.Second)
	defer cancel()
	return app.queueCommandWithContext(ctx, messageType, payload)
}

func (app *App) queueCommandWithContext(ctx context.Context, messageType string, payload any) (domain.QueueSnapshot, error) {
	var snapshot domain.QueueSnapshot
	if err := app.client.Request(ctx, messageType, payload, &snapshot); err != nil {
		return domain.QueueSnapshot{}, err
	}
	return snapshot, nil
}

func (app *App) forwardAgentMessages(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case status := <-app.client.Statuses():
			wailsRuntime.EventsEmit(ctx, "agent:status", status)
		case frame := <-app.client.Events():
			wailsRuntime.EventsEmit(ctx, "agent:event", dashboardEvent(frame))
		}
	}
}

func (app *App) reconnectLoop(ctx context.Context) {
	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()
	for {
		if !app.client.Connected() {
			connectCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
			_ = app.client.Connect(connectCtx)
			cancel()
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (app *App) startAgent() error {
	info, err := os.Stat(app.agentExecutable)
	if err != nil || info.IsDir() {
		return fmt.Errorf("agent executable not found at %s", app.agentExecutable)
	}
	logPath := filepath.Join(filepath.Dir(app.agentExecutable), "instavault-agent.log")
	return agent.StartDetached(app.agentExecutable, logPath)
}

func (app *App) context() context.Context {
	app.ctxMu.RLock()
	defer app.ctxMu.RUnlock()
	return app.ctx
}

func (app *App) requestContext(timeout time.Duration) (context.Context, context.CancelFunc) {
	ctx := app.context()
	if ctx == nil {
		ctx = context.Background()
	}
	return context.WithTimeout(ctx, timeout)
}

func dashboardEvent(frame nativehost.Envelope) DashboardEvent {
	event := DashboardEvent{Type: frame.Type, Sequence: frame.Sequence}
	if len(frame.Payload) > 0 {
		var payload any
		if json.Unmarshal(frame.Payload, &payload) == nil {
			event.Payload = payload
		}
	}
	return event
}

func resolveAgentExecutable() string {
	if configured := os.Getenv("INSTAVAULT_AGENT_EXECUTABLE"); configured != "" {
		return configured
	}
	name := "instavault-server"
	if goruntime.GOOS == "windows" {
		name += ".exe"
	}

	candidates := make([]string, 0, 5)
	if executable, err := os.Executable(); err == nil {
		candidates = append(candidates, filepath.Join(filepath.Dir(executable), name))
	}
	if workingDirectory, err := os.Getwd(); err == nil {
		candidates = append(candidates,
			filepath.Join(workingDirectory, name),
			filepath.Join(workingDirectory, "..", name),
			filepath.Join(workingDirectory, "server", name),
		)
	}
	for _, candidate := range candidates {
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			absolute, absoluteErr := filepath.Abs(candidate)
			if absoluteErr == nil {
				return absolute
			}
			return candidate
		}
	}
	if len(candidates) > 0 {
		return candidates[0]
	}
	return name
}
