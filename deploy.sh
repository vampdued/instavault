#!/usr/bin/env bash

# InstaVault Automation Deployment Script
# Compiles code, syncs files to active runtime path, restarts daemon, and verifies health.

set -euo pipefail

# Define operational paths
WORKSPACE_DIR="/home/vampdued/Documents/mass-downloader-for-instagram"
RUN_DIR="/home/vampdued/mass-downloader-for-instagram/server"

# Define operational host and port from environment (with defaults)
PORT="${INSTAVAULT_PORT:-${PORT:-19201}}"
HOST="${INSTAVAULT_HOST:-${HOST:-localhost}}"

echo "🚀 [InstaVault] Starting automated build and deployment..."

# 1. Compile the Golang Server
echo "📦 [1/5] Compiling Go server binary..."
if go build -C "${WORKSPACE_DIR}/server" -o instavault-server main.go; then
    echo "✅ [1/5] Compilation succeeded!"
else
    echo "❌ [1/5] Compilation failed! Check Go environment."
    exit 1
fi

# 2. Sync Binary to Active Runtime Folder
echo "🔄 [2/5] Syncing compiled binary to operational path..."
mkdir -p "${RUN_DIR}"
cp -f "${WORKSPACE_DIR}/server/instavault-server" "${RUN_DIR}/instavault-server"
echo "✅ [2/5] Binary synchronized."

# 3. Sync Web UI Assets
echo "🎨 [3/5] Syncing front-end assets (HTML, CSS, JS)..."
mkdir -p "${RUN_DIR}/ui"
cp -rf "${WORKSPACE_DIR}/server/ui/"* "${RUN_DIR}/ui/"
echo "✅ [3/5] UI assets synchronized."

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
Description=InstaVault Server (Instagram Mass Downloader)
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
