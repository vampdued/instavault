# InstaVault Windows 11 Automation Setup Script
# Compiles Go backend, syncs files, registers background task in Startup Folder, and verifies health.

$ErrorActionPreference = "Stop"

# Define paths
$WorkspaceDir = $PSScriptRoot
$RunDir = "$env:USERPROFILE\mass-downloader-for-instagram\server"
$StartupPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\InstaVault.lnk"

# Ports/Hosts
$Port = 19201
$HostAddr = "localhost"

# Override from environment variables if present
if ($env:INSTAVAULT_PORT) { $Port = $env:INSTAVAULT_PORT }
elseif ($env:PORT) { $Port = $env:PORT }

if ($env:INSTAVAULT_HOST) { $HostAddr = $env:INSTAVAULT_HOST }
elseif ($env:HOST) { $HostAddr = $env:HOST }

Write-Host "[InstaVault] Starting Windows 11 automated setup and deployment..." -ForegroundColor Cyan

# 1. Check and Install Go
Write-Host "`n[1/5] Checking Go environment..." -ForegroundColor Blue
$GoPath = (Get-Command go -ErrorAction SilentlyContinue) | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue
if (-not $GoPath -and (Test-Path "C:\Program Files\Go\bin\go.exe")) {
    $GoPath = "C:\Program Files\Go\bin\go.exe"
}

if (-not $GoPath) {
    Write-Host "[WARN] Go is not found on your path. Attempting auto-installation using winget..." -ForegroundColor Yellow
    
    # Check if winget is available
    $WingetCheck = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $WingetCheck) {
        Write-Error "[ERROR] winget is not available on this system. Please install winget or install Go manually from https://go.dev/dl/"
        exit 1
    }
    
    Write-Host "Installing Go (Golang) via winget, please wait..." -ForegroundColor Yellow
    Start-Process -FilePath "winget" -ArgumentList "install -e --id GoLang.Go --accept-source-agreements --accept-package-agreements" -NoNewWindow -Wait
    
    # Verify the installation path
    $GoPath = "C:\Program Files\Go\bin\go.exe"
    if (-not (Test-Path $GoPath)) {
        Write-Error "[ERROR] Go installation failed or requires a system restart. Please install Go manually and rerun this script."
        exit 1
    }
    Write-Host "[OK] Go installed successfully via winget!" -ForegroundColor Green
} else {
    Write-Host "[OK] Go compiler found: $GoPath" -ForegroundColor Green
}

# Update temporary PATH for the current session to ensure Go is usable
$GoDir = Split-Path $GoPath
if ($env:Path -notlike "*$GoDir*") {
    $env:Path += ";$GoDir"
}

# 2. Compile Golang Server
Write-Host "`n[2/5] Compiling Go server binary..." -ForegroundColor Blue
Push-Location "$WorkspaceDir\server"
try {
    Write-Host "   - Fetching Go modules..."
    & go mod download
    Write-Host "   - Compiling executable..."
    & go build -o instavault-server.exe
    Write-Host "[OK] Compilation succeeded!" -ForegroundColor Green
} catch {
    Write-Error "[ERROR] Go compilation failed! Please check your Go installation."
    Pop-Location
    exit 1
}
Pop-Location

# 3. Sync Binary and Assets
Write-Host "`n[3/5] Syncing compiled files to runtime path..." -ForegroundColor Blue
if (-not (Test-Path $RunDir)) {
    New-Item -ItemType Directory -Force -Path $RunDir | Out-Null
}
Copy-Item -Path "$WorkspaceDir\server\instavault-server.exe" -Destination "$RunDir\instavault-server.exe" -Force

# Front-end Assets sync
$UiDest = "$RunDir\ui"
if (-not (Test-Path $UiDest)) {
    New-Item -ItemType Directory -Force -Path $UiDest | Out-Null
}
Copy-Item -Path "$WorkspaceDir\server\ui\*" -Destination $UiDest -Recurse -Force
Write-Host "[OK] Files synchronized to operational folder: $RunDir" -ForegroundColor Green

# 4. Register background task in Startup Folder
Write-Host "`n[4/5] Checking and registering background startup shortcut..." -ForegroundColor Blue

# Clean up existing Task Scheduler task if it was registered previously to prevent conflicts
$ExistingTask = Get-ScheduledTask -TaskName "InstaVaultServer" -ErrorAction SilentlyContinue
if ($ExistingTask) {
    Write-Host "   - Removing deprecated Task Scheduler task..."
    Stop-ScheduledTask -TaskName "InstaVaultServer" -ErrorAction SilentlyContinue | Out-Null
    Unregister-ScheduledTask -TaskName "InstaVaultServer" -Confirm:$false | Out-Null
}

# Clean up existing startup shortcut if present
if (Test-Path $StartupPath) {
    Write-Host "   - Removing existing startup shortcut..."
    Remove-Item -Path $StartupPath -Force
}

Write-Host "   - Creating silent background startup shortcut..."
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($StartupPath)
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-WindowStyle Hidden -Command `"Start-Process -FilePath '$RunDir\instavault-server.exe' -ArgumentList '-host $HostAddr -port $Port' -WorkingDirectory '$RunDir' -NoNewWindow`""
$Shortcut.WindowStyle = 7 # Minimized/Hidden
$Shortcut.Save()
Write-Host "[OK] Background startup shortcut successfully registered!" -ForegroundColor Green

# Stop any running process first to ensure fresh restart
$Processes = Get-Process -Name "instavault-server" -ErrorAction SilentlyContinue
if ($Processes) {
    Write-Host "   - Terminating running instances..."
    Stop-Process -Name "instavault-server" -Force
}

# Start the task now so it runs immediately
Write-Host "   - Launching daemon..."
Start-Process -FilePath "powershell.exe" -ArgumentList "-WindowStyle Hidden -Command `"Start-Process -FilePath '$RunDir\instavault-server.exe' -ArgumentList '-host $HostAddr -port $Port' -WorkingDirectory '$RunDir' -NoNewWindow`""

# 5. Extension load helpers and health checks
Write-Host "`n[5/5] Checking endpoint health and opening extension..." -ForegroundColor Blue

# Attempt to launch Google Chrome extensions page
$ChromePath = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $ChromePath)) { $ChromePath = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe" }
if (-not (Test-Path $ChromePath)) { $ChromePath = "$env:LocalAppData\Google\Chrome\Application\chrome.exe" }

if (Test-Path $ChromePath) {
    Write-Host "   - Opening Chrome to extensions page..."
    Start-Process -FilePath $ChromePath -ArgumentList "chrome://extensions/"
} else {
    Write-Host "[INFO] Please open Chrome and navigate to: chrome://extensions/" -ForegroundColor Yellow
}

# Open workspace folder in explorer so the user can easily drag-and-drop
Write-Host "   - Opening extension source folder in File Explorer..."
Start-Process -FilePath "explorer.exe" -ArgumentList "`"$WorkspaceDir`""
Write-Host "[INFO] Inside Chrome extensions page: enable 'Developer mode' (top right), then drag and drop the folder into Chrome!" -ForegroundColor Yellow

# Endpoint health check
$HealthHost = "127.0.0.1"
if ($HostAddr -ne "0.0.0.0" -and $HostAddr -ne "localhost") {
    $HealthHost = $HostAddr
}
$HealthUrl = "http://${HealthHost}:${Port}/api/stats"
$MaxAttempts = 10
$Success = $false

# Small pause to allow the daemon to spin up
Start-Sleep -Milliseconds 800

for ($i = 1; $i -le $MaxAttempts; $i++) {
    Write-Host "   - Pinging $HealthUrl (Attempt $i/$MaxAttempts)..."
    try {
        $Response = Invoke-RestMethod -Uri $HealthUrl -Method Get -TimeoutSec 2 -ErrorAction Stop
        if ($Response) {
            $Success = $true
            break
        }
    } catch {
        # Retry
    }
    Start-Sleep -Seconds 1
}

if ($Success) {
    Write-Host "`n[SUCCESS] [InstaVault] App is alive and responding!" -ForegroundColor Green
    if ($HostAddr -eq "0.0.0.0") {
        Write-Host "[INFO] Deployment complete! UI is available at http://localhost:${Port} and on your local network." -ForegroundColor Green
    } else {
        Write-Host "[INFO] Deployment complete! UI is available at http://${HostAddr}:${Port}" -ForegroundColor Green
    }
} else {
    Write-Warning "`n[ERROR] [InstaVault] Health check failed! The server is not responding at ${HealthHost}:${Port}."
    Write-Host "[INFO] To debug, try starting the server manually from: $RunDir\instavault-server.exe" -ForegroundColor Yellow
}
