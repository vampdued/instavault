<#
.SYNOPSIS
  InstaVault Windows 11 Uninstallation Script
.DESCRIPTION
  Stops the background service, removes the Startup shortcut, cleans binary/extension files,
  and optionally cleans user data.
#>

[CmdletBinding()]
param (
    [switch]$PurgeData
)

$ErrorActionPreference = "Continue"

$InstallRoot = Join-Path $env:LOCALAPPDATA "InstaVault"
$BinDir = Join-Path $InstallRoot "bin"
$ExtDir = Join-Path $InstallRoot "extension"
$StartupLnk = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup\InstaVault.lnk"

Write-Host "`n=== InstaVault Windows Uninstallation ===" -ForegroundColor Cyan

# 1. Terminate running processes
$procs = Get-Process -Name "instavault-server" -ErrorAction SilentlyContinue
if ($procs) {
    Write-Host "• Stopping running instavault-server process..." -ForegroundColor Yellow
    Stop-Process -Name "instavault-server" -Force
}

# 2. Remove Startup Shortcut
if (Test-Path $StartupLnk) {
    Remove-Item -Path $StartupLnk -Force
    Write-Host "• Removed Startup shortcut: $StartupLnk" -ForegroundColor Green
}

# 3. Clean Binaries and Extension
if (Test-Path $BinDir) {
    Remove-Item -Recurse -Force $BinDir
    Write-Host "• Removed binary directory: $BinDir" -ForegroundColor Green
}
if (Test-Path $ExtDir) {
    Remove-Item -Recurse -Force $ExtDir
    Write-Host "• Removed extension directory: $ExtDir" -ForegroundColor Green
}

# 4. Handle Data Directory
$DataDir = Join-Path $InstallRoot "data"
if ($PurgeData) {
    if (Test-Path $InstallRoot) {
        Remove-Item -Recurse -Force $InstallRoot
        Write-Host "• Purged all InstaVault data and logs from: $InstallRoot" -ForegroundColor Yellow
    }
} else {
    Write-Host "`nUser data preserved at: $DataDir" -ForegroundColor DarkGray
    Write-Host "(Run '.\uninstall.ps1 -PurgeData' if you want to permanently delete downloads database and settings)" -ForegroundColor DarkGray
}

Write-Host "`nInstaVault uninstallation complete." -ForegroundColor Green
