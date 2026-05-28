#!/usr/bin/env bash

# InstaVault Automation Deployment Script
# Compiles code, syncs files to active runtime path, restarts daemon, and verifies health.

set -euo pipefail

# Define operational paths
WORKSPACE_DIR="/home/vampdued/Documents/mass-downloader-for-instagram"
RUN_DIR="/home/vampdued/mass-downloader-for-instagram/server"

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

# 4. Restart the systemd user service
echo "⚡ [4/5] Reloading instavault.service daemon..."
if systemctl --user restart instavault.service; then
    echo "✅ [4/5] systemd service restarted successfully!"
else
    echo "❌ [4/5] Failed to restart systemd user service."
    exit 1
fi

# 5. Live Endpoint Health Check Verification
echo "🔍 [5/5] Performing live endpoint health check..."
HEALTH_URL="http://localhost:19201/api/stats"
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
    echo "🎉 [InstaVault] Deployment complete! UI is available at http://localhost:19201"
else
    echo "❌ [5/5] Health check failed! App is not responding on port 19201."
    echo "⚠️ Fetching systemd service status and logs:"
    systemctl --user status instavault.service || true
    echo "⚠️ Recent logs from journalctl:"
    journalctl --user -u instavault.service -n 25 --no-pager || true
    exit 1
fi
