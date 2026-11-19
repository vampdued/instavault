#!/usr/bin/env bash
# InstaVault Unified Installer for Linux & macOS (Local Source or Direct GitHub Release)
# Usage:
#   Direct from GitHub: curl -fsSL https://raw.githubusercontent.com/vampdued/instavault/main/scripts/install.sh | bash
#   From local clone:   ./scripts/install.sh

set -euo pipefail

REPO="${INSTAVAULT_REPO:-vampdued/instavault}"
VERSION="${INSTAVAULT_VERSION:-latest}"
PORT="${INSTAVAULT_PORT:-19201}"
HOST="${INSTAVAULT_HOST:-localhost}"

INSTALL_ROOT="${HOME}/.local/share/instavault"
BIN_DIR="${INSTALL_ROOT}/bin"
EXT_DIR="${INSTALL_ROOT}/extension"
TARGET_BIN="${BIN_DIR}/instavault-server"

SCRIPT_DIR=""
REPO_ROOT=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
    SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
    CANDIDATE="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
    if [ -d "${CANDIDATE}/server" ] && [ -d "${CANDIDATE}/extension" ]; then
        REPO_ROOT="${CANDIDATE}"
    fi
fi

echo "=== InstaVault Installer (Linux / macOS) ==="
mkdir -p "${BIN_DIR}" "${EXT_DIR}"

if [ -n "${REPO_ROOT}" ]; then
    echo "• Building from local source: ${REPO_ROOT}"
    (cd "${REPO_ROOT}/server" && CGO_ENABLED=0 go build -ldflags "-s -w" -o "${TARGET_BIN}" .)
    rm -rf "${EXT_DIR:?}"/*
    cp -R "${REPO_ROOT}/extension/." "${EXT_DIR}/"
else
    OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
    ARCH="$(uname -m)"
    case "${ARCH}" in
        x86_64|amd64) ARCH="amd64" ;;
        arm64|aarch64) ARCH="arm64" ;;
        *) echo "Unsupported architecture: ${ARCH}"; exit 1 ;;
    esac

    ASSET_NAME="instavault-${OS}-${ARCH}.tar.gz"
    API_URL="https://api.github.com/repos/${REPO}/releases/latest"
    [ "${VERSION}" != "latest" ] && API_URL="https://api.github.com/repos/${REPO}/releases/tags/${VERSION}"

    echo "• Fetching ${VERSION} release (${ASSET_NAME}) from github.com/${REPO}..."
    TMP_DIR="$(mktemp -d)"
    trap 'rm -rf "${TMP_DIR}"' EXIT

    RELEASE_JSON="$(curl -fsSL -H "Accept: application/vnd.github+json" "${API_URL}")"
    BIN_URL="$(printf '%s' "${RELEASE_JSON}" | python3 -c "import json,sys; d=json.load(sys.stdin); print(next((a['browser_download_url'] for a in d.get('assets',[]) if a['name']=='${ASSET_NAME}'), ''))")"
    EXT_URL="$(printf '%s' "${RELEASE_JSON}" | python3 -c "import json,sys; d=json.load(sys.stdin); print(next((a['browser_download_url'] for a in d.get('assets',[]) if a['name']=='instavault-extension.zip'), ''))")"

    if [ -z "${BIN_URL}" ] || [ -z "${EXT_URL}" ]; then
        echo "Release assets (${ASSET_NAME} / instavault-extension.zip) not found."
        exit 1
    fi

    curl -fsSL "${BIN_URL}" -o "${TMP_DIR}/${ASSET_NAME}"
    curl -fsSL "${EXT_URL}" -o "${TMP_DIR}/instavault-extension.zip"

    tar -xzf "${TMP_DIR}/${ASSET_NAME}" -C "${BIN_DIR}"
    chmod +x "${TARGET_BIN}"

    rm -rf "${EXT_DIR:?}"/*
    unzip -q -o "${TMP_DIR}/instavault-extension.zip" -d "${EXT_DIR}"
fi

echo "• Installed binary: ${TARGET_BIN}"
echo "• Staged extension: ${EXT_DIR}"

# Configure systemd user service on Linux if available
if command -v systemctl >/dev/null 2>&1 && systemctl --user status >/dev/null 2>&1; then
    SERVICE_DIR="${HOME}/.config/systemd/user"
    SERVICE_FILE="${SERVICE_DIR}/instavault.service"
    mkdir -p "${SERVICE_DIR}"
    cat <<EOF > "${SERVICE_FILE}"
[Unit]
Description=InstaVault Local Archiver
After=network.target

[Service]
ExecStart=${TARGET_BIN} -host ${HOST} -port ${PORT}
Restart=always
WorkingDirectory=${INSTALL_ROOT}

[Install]
WantedBy=default.target
EOF
    systemctl --user daemon-reload
    systemctl --user enable --now instavault.service
    echo "• Started systemd user service (instavault.service)"
else
    echo "• Start manually with: ${TARGET_BIN} -host ${HOST} -port ${PORT}"
fi

echo ""
echo "Web Dashboard:    http://${HOST}:${PORT}"
echo "Chrome Extension: chrome://extensions -> Load unpacked -> ${EXT_DIR}"
