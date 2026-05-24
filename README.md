# 📸 InstaVault — Instagram Mass Downloader & Server

InstaVault is a high-performance, self-hosted media archiving system designed specifically for Instagram. It consists of an **Instagram Mass Downloader Chrome Extension** that grabs assets in real-time, paired with a lightweight **Go Backend Server & SQLite Database** that manages your offline media vault.

---

## ✨ Features

- **🚀 Concurrent Connection Pooling:** Shared HTTP client transport reuses active TCP/TLS connections for super-fast mass downloads.
- **⚡ Bounded Concurrency Control:** Limits simultaneous active downloads to 3 threads, reducing exposure to Instagram anti-bot rate-limiting and preventing local bandwidth saturation.
- **🎬 Instagram-Style Post Grouping:** Automatically groups separate image/video carousel slides under their original parent `shortcode` (post). Carousels are displayed as a single post item in the gallery with overlay indicators.
- **🔄 Pre-Fetching Infinite Scroll:** Removes legacy pagination in favor of an optimized `IntersectionObserver` infinite scroll. Automatically fetches next pages 150px before reaching the bottom for a seamless browsing experience.
- **📟 Live Server Logs Terminal:** A real-time system logs console panel streamed from the Go backend via **Server-Sent Events (SSE)**. Colorizes log flags (`[DL]` in emerald, `[SKIP]` in yellow, `[ERR]` in red) with copy and autoscroll controls.
- **🖼️ Split-Panel Lightbox Carousel:** A redesigned modal viewer with split panels: high-fidelity media on the left, and metadata details (filename, file size, local directory path, and download timestamp) on the right. Cycle through carousel slides with arrows or **keyboard left/right shortcut keys**.
- **🔒 Directory Traversal Protection:** Strong, platform-independent path security using strict relative-path validations (`filepath.Rel`).
- **📦 Atomic Stage-Renaming:** staged `.tmp` file downloads prevent incomplete/corrupt files from registering as successful downloads.
- **💾 SQLite WAL Engine:** Enabled Write-Ahead Logging (WAL) and 5-second busy timeouts for lock-free, concurrent database reads and writes.
- **🎨 Glassmorphic Dual-Theme Dashboard:** A beautiful modern Web UI supporting **Light & Dark modes** with a toggler that persists your preferences.

---

## 🛠️ Server Installation & Autostart Guide

The Go backend runs on **port 19201** by default.

### 🐧 Linux Setup

#### 1. Manual Execution
Navigate to the `server/` directory and run the compiled binary:
```bash
cd server
./instavault-server
```

#### 2. Autostart via systemd (Recommended)
You can configure a user-space systemd service that starts automatically on user login and keeps the server running in the background without root/sudo access:

1. Create a service file at `~/.config/systemd/user/instavault.service`:
   ```ini
   [Unit]
   Description=InstaVault Server (Instagram Mass Downloader)
   After=network.target

   [Service]
   ExecStart=/home/YOUR_USERNAME/mass-downloader-for-instagram/server/instavault-server
   Restart=always
   WorkingDirectory=/home/YOUR_USERNAME/mass-downloader-for-instagram/server

   [Install]
   WantedBy=default.target
   ```
2. Reload systemd, enable, and start the service:
   ```bash
   systemctl --user daemon-reload
   systemctl --user enable instavault.service
   systemctl --user start instavault.service
   ```
3. To view logs:
   ```bash
   systemctl --user status instavault.service
   ```

---

### 🪟 Windows Setup

#### 1. Manual Execution
Navigate to the `server/` folder and double-click `instavault-server.exe` or execute it from PowerShell:
```powershell
cd server
.\instavault-server.exe
```

#### 2. Autostart via Windows Startup Folder (Simple)
To launch the server automatically on Windows startup:
1. Press `Win + R`, type `shell:startup`, and press Enter. This opens your Startup folder.
2. Right-click inside the folder, select **New > Shortcut**.
3. Browse to the path of your `instavault-server.exe` file and complete the wizard.
4. Right-click the newly created shortcut, select **Properties**, and set **Start in** to the absolute path of your `server` directory (e.g. `C:\mass-downloader-for-instagram\server`) to ensure database files generate in the correct folder.

#### 3. Autostart via Windows Task Scheduler (Recommended)
To run the server silently in the background on login:
1. Open **Task Scheduler** and click **Create Basic Task** in the right pane.
2. Name the task `InstaVaultServer` and set the Trigger to **When I log on**.
3. Set the Action to **Start a program** and browse to `instavault-server.exe`.
4. In the **Start in (optional)** field, paste the absolute path to your `server` folder (essential for loading configuration settings!).
5. Click **Finish**. To make it run completely in the background without a command prompt window popping up, double-click the task under Task Scheduler Library, choose **Run whether user is logged on or not**, and check **Do not store password**.

---

### 🍏 macOS Setup

#### 1. Manual Execution
Run the compiled macOS binary inside `server/` (if compiled) or execute using Go:
```bash
cd server
go run main.go
```

#### 2. Autostart via launchd Agent (Recommended)
To run the server in the background as a LaunchAgent on login:
1. Create a plist file at `~/Library/LaunchAgents/com.vampdued.instavault.plist`:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
       <key>Label</key>
       <string>com.vampdued.instavault</string>
       <key>ProgramArguments</key>
       <array>
           <string>/Users/YOUR_USERNAME/mass-downloader-for-instagram/server/instavault-server</string>
       </array>
       <key>WorkingDirectory</key>
       <string>/Users/YOUR_USERNAME/mass-downloader-for-instagram/server</string>
       <key>RunAtLoad</key>
       <true/>
       <key>KeepAlive</key>
       <true/>
   </dict>
   </plist>
   ```
2. Load and start the agent:
   ```bash
   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.vampdued.instavault.plist
   ```

---

## 🧩 Chrome Extension Installation

To link your browser to the local storage server:

1. Open your browser and navigate to **Extensions** (`chrome://extensions`).
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the root folder of this repository (`mass-downloader-for-instagram/`).
5. Open Instagram and you will find the mass downloader widgets active! Downloaded media will be organized beautifully inside folders by Instagram username in your designated download directory.

---

## 🎨 Web UI Dashboard
Open your web browser and go to **[http://localhost:19201](http://localhost:19201)** to manage and browse your offline repository:
- **Dashboard:** Inspect overall storage stats, see the top active profiles table, and monitor live streaming background logs via the interactive terminal window.
- **Media Gallery:** An Instagram-mode media vault grouping carousels and reels with debounced searches, active tabs, and endless, pre-fetched infinite scroll.
- **Downloads Log:** Review detailed records (filenames, download times, file sizes, and exact local paths).
- **Skipped:** Clean duplicates history to reset deduplication filters for designated files.
- **Settings:** Change your base storage directory easily.
