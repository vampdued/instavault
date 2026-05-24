#!/usr/bin/env bash

# ==============================================================================
# InstaVault Developer Control Center & Autostart Management Utility
# ==============================================================================

# Custom Desaturated Terminal Palette
BOLD="\033[1m"
RESET="\033[0m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
MAGENTA="\033[35m"

# Get absolute directories
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="${ROOT_DIR}/server"
SYSTEMD_PATH="${HOME}/.config/systemd/user/instavault.service"

show_header() {
    clear
    echo -e "${BOLD}${CYAN}======================================================${RESET}"
    echo -e "${BOLD}${CYAN}             📸 InstaVault Control Center             ${RESET}"
    echo -e "${BOLD}${CYAN}======================================================${RESET}"
    echo -e " Root Directory: ${ROOT_DIR}"
    echo -e " SQLite Server:  http://localhost:19201"
    echo -e "${CYAN}------------------------------------------------------${RESET}"
}

wait_key() {
    echo ""
    read -rp "Press [Enter] key to return to menu..."
}

# --- Action: Build Server ---
build_server() {
    show_header
    echo -e "${BOLD}${YELLOW}[⚙️] Compiling Go Server Binary...${RESET}"
    cd "${SERVER_DIR}" || { echo -e "${RED}Error: Server directory not found.${RESET}"; wait_key; return; }
    
    if go build -o instavault-server main.go; then
        echo -e "${GREEN}${BOLD}✓ Success! Compiled successfully: ${SERVER_DIR}/instavault-server${RESET}"
    else
        echo -e "${RED}${BOLD}✗ Error: Go compilation failed. Check Go installations.${RESET}"
    fi
    wait_key
}

# --- Action: Configure Systemd (Helper for beginners) ---
setup_systemd() {
    show_header
    echo -e "${BOLD}${YELLOW}[⚙️] Writing Systemd User Service File...${RESET}"
    
    # Ensure config path exists
    mkdir -p "$(dirname "${SYSTEMD_PATH}")"
    
    cat > "${SYSTEMD_PATH}" <<EOF
[Unit]
Description=InstaVault Server (Instagram Mass Downloader)
After=network.target

[Service]
ExecStart=${SERVER_DIR}/instavault-server
Restart=always
WorkingDirectory=${SERVER_DIR}

[Install]
WantedBy=default.target
EOF

    echo -e "${GREEN}✓ Service configuration written to: ${SYSTEMD_PATH}${RESET}"
    echo -e "${BOLD}${YELLOW}[⚙️] Reloading Systemd Daemons...${RESET}"
    systemctl --user daemon-reload
    systemctl --user enable instavault.service
    echo -e "${GREEN}${BOLD}✓ Autostart service successfully created and enabled!${RESET}"
    wait_key
}

# --- Action: Start / Restart Server ---
restart_service() {
    show_header
    if [ ! -f "${SYSTEMD_PATH}" ]; then
        echo -e "${YELLOW}Systemd user service not configured yet.${RESET}"
        read -rp "Would you like to automatically configure the systemd background autostart? (y/n): " choice
        if [[ "$choice" =~ ^[Yy]$ ]]; then
            setup_systemd
        else
            echo -e "${BOLD}${YELLOW}[⚡] Starting server in current terminal instead...${RESET}"
            cd "${SERVER_DIR}" && ./instavault-server
            return
        fi
    fi
    
    echo -e "${BOLD}${YELLOW}[⚡] Restarting background service...${RESET}"
    systemctl --user restart instavault.service
    echo -e "${GREEN}${BOLD}✓ Service successfully restarted!${RESET}"
    
    # Fast check
    sleep 1.5
    if systemctl --user is-active --quiet instavault.service; then
        echo -e "${GREEN}✓ Server online and running in background.${RESET}"
    else
        echo -e "${RED}✗ Warning: Service failed to enter active status. Check logs.${RESET}"
    fi
    wait_key
}

# --- Action: Stop Service ---
stop_service() {
    show_header
    if systemctl --user is-active --quiet instavault.service 2>/dev/null; then
        echo -e "${BOLD}${YELLOW}[🛑] Stopping background service...${RESET}"
        systemctl --user stop instavault.service
        echo -e "${GREEN}✓ Service stopped successfully.${RESET}"
    else
        echo -e "${YELLOW}Service is not running in background.${RESET}"
    fi
    wait_key
}

# --- Action: Check Status ---
check_status() {
    show_header
    echo -e "${BOLD}${CYAN}[🔍] Health & Diagnostics Registry:${RESET}"
    
    # 1. Systemd status
    if systemctl --user is-active --quiet instavault.service 2>/dev/null; then
        echo -e " Background Service: ${GREEN}● Active (Running)${RESET}"
    else
        echo -e " Background Service: ${RED}○ Inactive (Stopped)${RESET}"
    fi
    
    # 2. HTTP Port Ping
    if curl -s -I http://localhost:19201 >/dev/null; then
        echo -e " Web interface:     ${GREEN}✓ Accessible at http://localhost:19201${RESET}"
    else
        echo -e " Web interface:     ${RED}✗ Offline (Refused Connection)${RESET}"
    fi
    
    # 3. Database Statistics
    DB_FILE="${SERVER_DIR}/instavault.db"
    if [ -f "${DB_FILE}" ]; then
        DB_SIZE=$(du -h "${DB_FILE}" | cut -f1)
        echo -e " Local Database:     ${GREEN}✓ SQLite Database Found (${DB_SIZE})${RESET}"
    else
        echo -e " Local Database:     ${YELLOW}○ Not generated yet (No downloads recorded)${RESET}"
    fi
    wait_key
}

# --- Action: Tail Logs ---
view_logs() {
    show_header
    echo -e "${BOLD}${CYAN}[📋] Streaming Background Server Logs (Press Ctrl+C to stop)...${RESET}"
    echo -e "${CYAN}------------------------------------------------------${RESET}"
    journalctl --user -u instavault.service -f -n 50
}

# --- Menu Loop ---
while true; do
    show_header
    echo -e " ${BOLD}1.${RESET} ${GREEN}Build Server${RESET}          (Compile static Go binaries)"
    echo -e " ${BOLD}2.${RESET} ${GREEN}Start / Restart${RESET}       (Bring background server online)"
    echo -e " ${BOLD}3.${RESET} ${GREEN}Stop Server${RESET}           (Power off background server)"
    echo -e " ${BOLD}4.${RESET} ${CYAN}Check Diagnostics${RESET}     (Verify health, database, and ports)"
    echo -e " ${BOLD}5.${RESET} ${CYAN}Tail Logs${RESET}             (View live journalctl streams)"
    echo -e " ${BOLD}6.${RESET} ${YELLOW}Configure Autostart${RESET}   (Generate systemd autostart units)"
    echo -e " ${BOLD}7.${RESET} ${RED}Exit${RESET}"
    echo -e "${CYAN}------------------------------------------------------${RESET}"
    
    read -rp "Select option [1-7]: " opt
    case $opt in
        1) build_server ;;
        2) restart_service ;;
        3) stop_service ;;
        4) check_status ;;
        5) view_logs ;;
        6) setup_systemd ;;
        7) 
            show_header
            echo -e "${GREEN}Thank you for using InstaVault! Goodbye.${RESET}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid selection.${RESET}"
            sleep 1
            ;;
    esac
done
