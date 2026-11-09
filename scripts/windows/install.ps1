<#
.SYNOPSIS
  InstaVault Automated Installer for Windows 11
.DESCRIPTION
  Installs InstaVault to %LOCALAPPDATA%\InstaVault\bin, configures background auto-start,
  stages the Chrome extension to %LOCALAPPDATA%\InstaVault\extension, and launches the daemon.
#>

[CmdletBinding()]
param (
    [string]$SourceDir
)

$ErrorActionPreference = "Stop"

if (-not $SourceDir) {
    $candidate = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
    if (Test-Path (Join-Path $candidate "server")) {
        $SourceDir = $candidate
    } else {
        $SourceDir = $PSScriptRoot
    }
}

$InstallRoot = Join-Path $env:LOCALAPPDATA "InstaVault"
$BinDir = Join-Path $InstallRoot "bin"
$DataDir = Join-Path $InstallRoot "data"
$ExtDir = Join-Path $InstallRoot "extension"
$LogsDir = Join-Path $InstallRoot "logs"
$BackupsDir = Join-Path $InstallRoot "backups"
$TargetExe = Join-Path $BinDir "instavault-server.exe"
$StartupLnk = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup\InstaVault.lnk"

Write-Host "`n=== InstaVault Windows Installation ===" -ForegroundColor Cyan
Write-Host "Installing to: $InstallRoot" -ForegroundColor DarkGray

# 1. Stop existing process if running
$existing = Get-Process -Name "instavault-server" -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "• Stopping running instavault-server process..." -ForegroundColor Yellow
    Stop-Process -Name "instavault-server" -Force
    Start-Sleep -Seconds 1
}

# 2. Create directories
foreach ($dir in @($BinDir, $DataDir, $ExtDir, $LogsDir, $BackupsDir)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
}

# 3. Locate source binary
$srcExe = Join-Path $SourceDir "server\instavault-server.exe"
if (-not (Test-Path $srcExe)) {
    $srcExe = Join-Path $SourceDir "instavault-server.exe"
}
if (-not (Test-Path $srcExe)) {
    Write-Host "• Compiling production binary..." -ForegroundColor DarkGray
    Push-Location (Join-Path $SourceDir "server")
    try {
        go build -ldflags "-s -w -H=windowsgui" -o $TargetExe .
    } finally {
        Pop-Location
    }
} else {
    Copy-Item -Path $srcExe -Destination $TargetExe -Force
}
Write-Host "• Installed binary to: $TargetExe" -ForegroundColor Green

# 4. Stage Chrome Extension
$srcExt = Join-Path $SourceDir "extension"
if (Test-Path $srcExt) {
    Copy-Item -Path "$srcExt\*" -Destination $ExtDir -Recurse -Force
    Write-Host "• Staged Chrome extension to: $ExtDir" -ForegroundColor Green
}

# 5. Create Startup Shortcut
$wscript = New-Object -ComObject WScript.Shell
$shortcut = $wscript.CreateShortcut($StartupLnk)
$shortcut.TargetPath = $TargetExe
$shortcut.WorkingDirectory = $BinDir
$shortcut.Description = "InstaVault Archival Daemon"
$shortcut.Save()
Write-Host "• Configured auto-start: $StartupLnk" -ForegroundColor Green

# 6. Start InstaVault Daemon
Write-Host "• Starting background daemon..." -ForegroundColor Cyan
Start-Process -FilePath $TargetExe -WorkingDirectory $BinDir

Start-Sleep -Seconds 2
try {
    $health = Invoke-RestMethod -Uri "http://localhost:19201/api/version" -TimeoutSec 3
    Write-Host "`nInstaVault v$($health.version) is running successfully on port $($health.port)!" -ForegroundColor Green
    Write-Host "Web Dashboard: http://localhost:19201" -ForegroundColor Cyan
    Write-Host "Chrome Extension: Load unpacked from '$ExtDir' in chrome://extensions" -ForegroundColor Yellow
} catch {
    Write-Host "`nDaemon started. Check log file at: $LogsDir\instavault.log" -ForegroundColor Yellow
}

