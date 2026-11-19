# InstaVault Agent Instructions

Repository instructions and conventions for coding agents working on InstaVault.

## Environment & Commands

The project automation is centralized in [`dev.ps1`](file:///c:/Users/VampDued/Documents/mass-downloader-for-instagram/dev.ps1). Run commands via PowerShell from the workspace root:

- `.\dev.ps1 run`: Run development daemon on port **`19202`** (hot-reloads UI from disk `server/ui`, isolates data in `%LOCALAPPDATA%\InstaVault\dev-data`).
- `.\dev.ps1 test`: Run Go unit test suite (`go test -v ./...` in `server/`).
- `.\dev.ps1 check`: Run database self-check and schema migration test (`-selfcheck -dev`).
- `.\dev.ps1 build`: Compile production Windows executable (`server/instavault-server.exe`) with `-ldflags "-s -w -H=windowsgui"`.
- `.\dev.ps1 pack`: Package release bundles (`instavault-windows-amd64.zip`, `instavault-extension.zip`, `checksums.txt`) in `dist/`.
- `.\dev.ps1 install`: Install background service and stage extension to `%LOCALAPPDATA%\InstaVault` (runs [`scripts/windows/install.ps1`](file:///c:/Users/VampDued/Documents/mass-downloader-for-instagram/scripts/windows/install.ps1)).
- `.\dev.ps1 uninstall`: Remove background service and staged extension (runs [`scripts/windows/uninstall.ps1`](file:///c:/Users/VampDued/Documents/mass-downloader-for-instagram/scripts/windows/uninstall.ps1)).
- `.\dev.ps1 update`: Trigger CLI release check/update against GitHub releases.
- `.\dev.ps1 clean`: Clean build and distribution artifacts.

## Architectural Boundaries

1. **Port Separation**:
   - Production daemon: port `19201` (`Local\InstaVault_SingleInstance_Mutex`).
   - Dev mode (`-dev`): port `19202` (`Local\InstaVault_Dev_SingleInstance_Mutex`). Never bind dev to 19201 to prevent colliding with running user instances.
2. **Data & Config Decoupling**:
   - Root: `%LOCALAPPDATA%\InstaVault`
   - `bin/`: Installed executable (`instavault-server.exe`).
   - `data/`: SQLite DB (`instavault.db`), PID file (`instavault.pid`), update status (`update-status.json`).
   - `logs/`: Daemon logs (`instavault.log`, rotated at 10MB) and updater logs (`update.log`).
   - `backups/`: Rolling database backups (`*.bak`).
   - `extension/`: Staged unpacked Chrome extension.
3. **Database & Migrations**:
   - SQLite driver: pure-Go `modernc.org/sqlite` (`CGO_ENABLED=0`).
   - Schema version tracked via `PRAGMA user_version`.
   - Never modify live schema without an atomic `VACUUM INTO` backup first.
   - Refuse startup if database `user_version` exceeds binary's `CurrentSchemaVersion`.
4. **Windows Headless Execution**:
   - Production builds use `-H=windowsgui` to suppress console popups on Windows startup.
   - `server/proc_windows.go` redirects OS stdout/stderr handles (`windows.SetStdHandle`) to `instavault.log`.
   - Cross-platform stubs live in `server/proc_unix.go` (`//go:build !windows`).
5. **Security**:
   - Validate `Host` header against loopback/custom bind host on all requests.
   - Validate `Origin` header on all mutating requests (`POST`, `PUT`, `DELETE`). Allow missing Origin only when `RemoteAddr` is loopback.
   - Restrict `/api/shutdown` to loopback `RemoteAddr`.
6. **Updater Engine**:
   - Update logic lives in [`server/internal/update`](file:///c:/Users/VampDued/Documents/mass-downloader-for-instagram/server/internal/update).
   - Helper binary runs from `%TEMP%\instavault-updater\` to avoid in-use file locking on `%LOCALAPPDATA%\InstaVault\bin\instavault-server.exe`.
   - Automated rollback occurs if the new binary fails the `/api/version` health check within 20s.
