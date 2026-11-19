#!/usr/bin/env bash
# InstaVault Uninstaller for Linux & macOS
# Pass --purge-data to also delete ~/.local/share/instavault

set -euo pipefail

PURGE=0
for arg in "$@"; do
    [ "${arg}" = "--purge-data" ] && PURGE=1
done

INSTALL_ROOT="${HOME}/.local/share/instavault"
SERVICE_FILE="${HOME}/.config/systemd/user/instavault.service"

echo "=== InstaVault Uninstaller ==="

if [ -f "${SERVICE_FILE}" ]; then
    systemctl --user disable --now instavault.service 2>/dev/null || true
    rm -f "${SERVICE_FILE}"
    systemctl --user daemon-reload 2>/dev/null || true
    echo "• Removed systemd user service"
fi

rm -rf "${INSTALL_ROOT}/bin" "${INSTALL_ROOT}/extension"
echo "• Removed binary and staged extension"

if [ "${PURGE}" -eq 1 ]; then
    rm -rf "${INSTALL_ROOT}"
    echo "• Purged all InstaVault data from ${INSTALL_ROOT}"
else
    echo "• Data preserved under ${INSTALL_ROOT} (pass --purge-data to remove everything)"
fi

echo "Uninstall complete."
