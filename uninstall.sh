#!/usr/bin/env bash

# InstaVault Systemd Service Uninstaller
# Stops, disables, and deletes the systemd user service cleanly.

set -euo pipefail

SERVICE_FILE="${HOME}/.config/systemd/user/instavault.service"
NATIVE_MANIFEST_NAME="com.instavault.downloader.json"

echo "🗑️ [InstaVault] Starting uninstallation of systemd service..."

if [ -f "${SERVICE_FILE}" ]; then
    echo "🛑 Stopping instavault.service..."
    systemctl --user stop instavault.service || true
    
    echo "🚫 Disabling instavault.service..."
    systemctl --user disable instavault.service || true
    
    echo "🔥 Removing service configuration file..."
    rm -f "${SERVICE_FILE}"
    
    echo "⚙️ Reloading systemd user daemon..."
    systemctl --user daemon-reload
    
    echo "✅ [InstaVault] systemd user service has been successfully uninstalled!"
else
    echo "ℹ️ [InstaVault] No systemd user service was found at ${SERVICE_FILE}."
fi

for manifest_dir in \
    "${HOME}/.config/google-chrome/NativeMessagingHosts" \
    "${HOME}/.config/chromium/NativeMessagingHosts" \
    "${HOME}/.config/microsoft-edge/NativeMessagingHosts"; do
    rm -f "${manifest_dir}/${NATIVE_MANIFEST_NAME}"
done
echo "✅ Native Messaging host manifests removed."
