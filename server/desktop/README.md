# InstaVault Native Dashboard

This Wails v2 application is a presentation-only client for the persistent
InstaVault agent. It uses the same per-user named pipe or Unix socket as the
browser bridge. It never opens SQLite and does not expose a localhost server.

## Development

Build the agent once from `server`:

```powershell
go build -o instavault-server.exe .
```

Then run the dashboard from `server/desktop`:

```powershell
wails dev
```

For a production build:

```powershell
wails build -clean -m -nosyncgomod -skipbindings -o instavault-dashboard.exe
```

The plain HTML, CSS, and JavaScript frontend receives live agent activity via
Wails events. No React or Node package installation is required.
