#!/usr/bin/env bash

# InstaVault Automation Deployment Script
# Compiles code, syncs files to active runtime path, and restarts daemon.

set -euo pipefail

# Define operational paths
WORKSPACE_DIR="/home/vampdued/Documents/mass-downloader-for-instagram"
RUN_DIR="/home/vampdued/mass-downloader-for-instagram/server"

echo "🚀 [InstaVault] Starting automated build and deployment..."

# 1. Compile the Golang Server
echo "📦 [1/4] Compiling Go server binary..."
if go build -C "${WORKSPACE_DIR}/server" -o instavault-server main.go; then
    echo "✅ [1/4] Compilation succeeded!"
else
    echo "❌ [1/4] Compilation failed! Check Go environment."
    exit 1
fi

# 2. Sync Binary to Active Runtime Folder
echo "🔄 [2/4] Syncing compiled binary to operational path..."
mkdir -p "${RUN_DIR}"
cp -f "${WORKSPACE_DIR}/server/instavault-server" "${RUN_DIR}/instavault-server"
echo "✅ [2/4] Binary synchronized."

# 3. Sync Web UI Assets
echo "🎨 [3/4] Syncing front-end assets (HTML, CSS, JS)..."
mkdir -p "${RUN_DIR}/ui"
cp -rf "${WORKSPACE_DIR}/server/ui/"* "${RUN_DIR}/ui/"
echo "✅ [3/4] UI assets synchronized."

# 4. Restart the systemd user service
echo "⚡ [4/4] Reloading instavault.service daemon..."
if systemctl --user restart instavault.service; then
    echo "✅ [4/4] systemd service restarted successfully!"
else
    echo "❌ [4/4] Failed to restart systemd user service."
    exit 1
fi

echo "🎉 [InstaVault] Deployment complete! UI is available at http://localhost:19201"
