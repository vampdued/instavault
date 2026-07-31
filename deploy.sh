#!/usr/bin/env bash

# InstaVault Linux installer and upgrade script.
# Builds the app, registers Native Messaging, and runs the persistent agent on demand or with the optional dashboard.

set -euo pipefail

# Define operational paths
WORKSPACE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
RUN_DIR="${HOME}/mass-downloader-for-instagram/server"

# Define operational host and port from environment (with defaults)
PORT="${INSTAVAULT_PORT:-${PORT:-19201}}"
HOST="${INSTAVAULT_HOST:-${HOST:-localhost}}"
ENABLE_HTTP="${INSTAVAULT_ENABLE_HTTP:-1}"
ENABLE_DESKTOP="${INSTAVAULT_ENABLE_DESKTOP:-1}"

if [ "${ENABLE_HTTP}" != "0" ] && [ "${ENABLE_HTTP}" != "1" ]; then
    echo "❌ INSTAVAULT_ENABLE_HTTP must be 0 or 1."
    exit 1
fi
if [ "${ENABLE_DESKTOP}" != "0" ] && [ "${ENABLE_DESKTOP}" != "1" ]; then
    echo "INSTAVAULT_ENABLE_DESKTOP must be 0 or 1."
    exit 1
fi

echo "🚀 [InstaVault] Starting automated build and deployment..."

# 1. Compile the Golang Server
echo "📦 [1/5] Compiling Go server binary..."
if go build -C "${WORKSPACE_DIR}/server" -o instavault-server .; then
    echo "✅ [1/5] Compilation succeeded!"
else
    echo "❌ [1/5] Compilation failed! Check Go environment."
    exit 1
fi

if [ "${ENABLE_DESKTOP}" = "1" ]; then
    if ! command -v wails >/dev/null 2>&1; then
        echo "Installing the pinned Wails v2 build tool..."
        go install github.com/wailsapp/wails/v2/cmd/wails@v2.13.0
        export PATH="${PATH}:$(go env GOPATH)/bin"
    fi
    echo "Building the native Wails dashboard..."
    (
        cd "${WORKSPACE_DIR}/server/desktop"
        go mod download
        wails build -clean -m -nosyncgomod -skipbindings -platform "linux/$(go env GOARCH)" -o instavault-dashboard
    )
fi

# 2. Sync Binary to Active Runtime Folder
echo "🔄 [2/5] Syncing compiled binary to operational path..."
mkdir -p "${RUN_DIR}"
systemctl --user stop instavault.service 2>/dev/null || true
pkill -f "${RUN_DIR}/instavault-server" 2>/dev/null || true
pkill -f "${RUN_DIR}/instavault-dashboard" 2>/dev/null || true
cp -f "${WORKSPACE_DIR}/server/instavault-server" "${RUN_DIR}/instavault-server"
if [ "${ENABLE_DESKTOP}" = "1" ]; then
    cp -f "${WORKSPACE_DIR}/server/desktop/build/bin/instavault-dashboard" "${RUN_DIR}/instavault-dashboard"
    chmod 0755 "${RUN_DIR}/instavault-dashboard"
    mkdir -p "${HOME}/.local/share/applications"
    cat > "${HOME}/.local/share/applications/instavault.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=InstaVault
Comment=Native Instagram download dashboard
Exec=${RUN_DIR}/instavault-dashboard
Terminal=false
Categories=Utility;
EOF
fi
echo "✅ [2/5] Binary synchronized."

# Register the per-user Native Messaging host for common Chromium browsers.
EXTENSION_ID="${INSTAVAULT_EXTENSION_ID:-afnlmoodoblknnpaighehlejcgbeffeo}"
if [[ ! "${EXTENSION_ID}" =~ ^[a-p]{32}$ ]]; then
    echo "❌ INSTAVAULT_EXTENSION_ID must be a 32-character Chrome extension ID."
    exit 1
fi
NATIVE_MANIFEST_NAME="com.instavault.downloader.json"
NATIVE_MANIFEST_DIRS=(
    "${HOME}/.config/google-chrome/NativeMessagingHosts"
    "${HOME}/.config/chromium/NativeMessagingHosts"
    "${HOME}/.config/microsoft-edge/NativeMessagingHosts"
    "${HOME}/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts"
    "${HOME}/.config/vivaldi/NativeMessagingHosts"
)
for manifest_dir in "${NATIVE_MANIFEST_DIRS[@]}"; do
    mkdir -p "${manifest_dir}"
    cat > "${manifest_dir}/${NATIVE_MANIFEST_NAME}" <<EOF
{
  "name": "com.instavault.downloader",
  "description": "InstaVault Native Messaging Host",
  "path": "${RUN_DIR}/instavault-server",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://${EXTENSION_ID}/"]
}
EOF
done
echo "✅ Native Messaging host registered for supported Chromium profiles."

# 3. Sync Web UI Assets
echo "🎨 [3/5] Syncing front-end assets (HTML, CSS, JS)..."
mkdir -p "${RUN_DIR}/ui"
cp -rf "${WORKSPACE_DIR}/server/ui/"* "${RUN_DIR}/ui/"
echo "✅ [3/5] UI assets synchronized."

if [ "${ENABLE_HTTP}" = "0" ]; then
    if [ -f "${HOME}/.config/systemd/user/instavault.service" ]; then
        systemctl --user stop instavault.service || true
        systemctl --user disable instavault.service || true
        systemctl --user daemon-reload
    fi
    if [ "${ENABLE_DESKTOP}" = "1" ]; then
        echo "Launch InstaVault from your application menu; it will start the persistent agent automatically."
    else
        echo "The first extension request will start the persistent agent automatically."
    fi
    echo "✅ Native-only deployment complete. The localhost dashboard service is disabled."
    exit 0
fi

# 4. Restart or Install the systemd user service
echo "⚡ [4/5] Checking instavault.service status..."
SERVICE_FILE="${HOME}/.config/systemd/user/instavault.service"

if [ ! -f "${SERVICE_FILE}" ]; then
    echo "⚠️ [InstaVault] instavault.service was not found at ${SERVICE_FILE}!"
    
    # Prompt the user for confirmation (redirect stdin from /dev/tty for interactive shell environments)
    if read -rp "❓ Would you like to automatically install instavault as a systemd user service? [y/N]: " response < /dev/tty; then
        case "$response" in
            [yY]|[yY][eE][sS])
                echo "⚙️ Creating systemd user configuration directory..."
                mkdir -p "$(dirname "${SERVICE_FILE}")"
                
                echo "⚙️ Writing service file to ${SERVICE_FILE}..."
                cat <<EOF > "${SERVICE_FILE}"
[Unit]
Description=InstaVault Persistent Agent and HTTP Dashboard
After=network.target

[Service]
ExecStart=${RUN_DIR}/instavault-server -host ${HOST} -port ${PORT}
Restart=always
WorkingDirectory=${RUN_DIR}

[Install]
WantedBy=default.target
EOF
                
                echo "⚙️ Reloading systemd user daemon and enabling service..."
                systemctl --user daemon-reload
                systemctl --user enable instavault.service
                echo "✅ systemd user service successfully installed and enabled!"
                ;;
            *)
                echo "⚠️ Skipping systemd service installation."
                echo "👉 To run the server manually, execute: ${RUN_DIR}/instavault-server"
                ;;
        esac
    else
        echo "⚠️ Non-interactive terminal detected. Skipping systemd service installation."
    fi
fi

# Now check if the service is active/enabled to restart it
if [ -f "${SERVICE_FILE}" ]; then
    # Refresh executable paths, binding options, and service hardening on upgrades.
    cat <<EOF > "${SERVICE_FILE}"
[Unit]
Description=InstaVault Persistent Agent and HTTP Dashboard
After=network.target

[Service]
ExecStart=${RUN_DIR}/instavault-server -host ${HOST} -port ${PORT}
Restart=always
RestartSec=2
WorkingDirectory=${RUN_DIR}
NoNewPrivileges=true
PrivateTmp=true
UMask=0077

[Install]
WantedBy=default.target
EOF
    systemctl --user daemon-reload
    systemctl --user enable instavault.service
    echo "🔄 Restarting instavault.service daemon..."
    if systemctl --user restart instavault.service; then
        echo "✅ [4/5] systemd service restarted successfully!"
    else
        echo "❌ [4/5] Failed to restart systemd user service."
        exit 1
    fi
else
    echo "⚠️ [4/5] systemd service is not installed. Skipping daemon restart."
    echo "👉 You must run the server binary manually: ${RUN_DIR}/instavault-server"
    echo "✅ Native Messaging installation is complete; HTTP dashboard health check skipped."
    exit 0
fi

# 5. Live Endpoint Health Check Verification
echo "🔍 [5/5] Performing live endpoint health check..."
HEALTH_HOST="127.0.0.1"
if [ "${HOST}" != "0.0.0.0" ] && [ "${HOST}" != "localhost" ]; then
    HEALTH_HOST="${HOST}"
fi
HEALTH_URL="http://${HEALTH_HOST}:${PORT}/api/stats"
MAX_ATTEMPTS=5
SUCCESS=0

# Give the server a small moment to bind, then check
sleep 0.5

for ((i=1; i<=MAX_ATTEMPTS; i++)); do
    echo "   - Attempt $i/$MAX_ATTEMPTS: Pinging $HEALTH_URL..."
    if curl -s -f -o /dev/null "${HEALTH_URL}"; then
        SUCCESS=1
        break
    fi
    sleep 1
done

if [ "$SUCCESS" -eq 1 ]; then
    echo "✅ [5/5] App is alive and responding!"
    if [ "${HOST}" = "0.0.0.0" ]; then
        echo "🎉 [InstaVault] Deployment complete! UI is available at http://localhost:${PORT} and on your local network."
    else
        echo "🎉 [InstaVault] Deployment complete! UI is available at http://${HOST}:${PORT}"
    fi
else
    echo "❌ [5/5] Health check failed! App is not responding on ${HEALTH_HOST}:${PORT}."
    if [ -f "${SERVICE_FILE}" ]; then
        echo "⚠️ Fetching systemd service status and logs:"
        systemctl --user status instavault.service || true
        echo "⚠️ Recent logs from journalctl:"
        journalctl --user -u instavault.service -n 25 --no-pager || true
    else
        echo "👉 Please verify the server binary is running manually."
    fi
    exit 1
fi
