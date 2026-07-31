#!/usr/bin/env bash

# InstaVault Linux uninstaller.
# Removes Native Messaging and runtime files while preserving SQLite and downloaded media.

set -euo pipefail

SERVICE_FILE="${HOME}/.config/systemd/user/instavault.service"
RUN_DIR="${HOME}/mass-downloader-for-instagram/server"
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

# Stop a detached native-only agent that is not managed by systemd.
pkill -f "${RUN_DIR}/instavault-server" 2>/dev/null || true

for manifest_dir in \
    "${HOME}/.config/google-chrome/NativeMessagingHosts" \
    "${HOME}/.config/chromium/NativeMessagingHosts" \
    "${HOME}/.config/microsoft-edge/NativeMessagingHosts" \
    "${HOME}/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts" \
    "${HOME}/.config/vivaldi/NativeMessagingHosts"; do
    rm -f "${manifest_dir}/${NATIVE_MANIFEST_NAME}"
done
echo "✅ Native Messaging host manifests removed."

rm -f "${RUN_DIR}/instavault-server"
rm -f "${RUN_DIR}/instavault-agent.log"
rm -f "${HOME}/.config/instavault/agent.sock"
rm -f "${HOME}/.config/instavault/agent.sock.lock"
rm -rf "${RUN_DIR}/ui"
echo "✅ Runtime binary and dashboard assets removed."
echo "ℹ️ SQLite data at ${RUN_DIR}/instavault.db and downloaded media were preserved."
