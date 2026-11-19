<#
.SYNOPSIS
  InstaVault Uninstaller for Windows
#>

[CmdletBinding()]
param (
    [switch]$PurgeData
)

$ErrorActionPreference = "Continue"

$InstallRoot = Join-Path $env:LOCALAPPDATA "InstaVault"
$BinDir      = Join-Path $InstallRoot "bin"
$ExtDir      = Join-Path $InstallRoot "extension"
$DataDir     = Join-Path $InstallRoot "data"
$StartupLnk  = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup\InstaVault.lnk"

Write-Host "`n=== InstaVault Uninstaller (Windows) ===" -ForegroundColor Cyan

$procs = Get-Process -Name "instavault-server" -ErrorAction SilentlyContinue
if ($procs) {
    Stop-Process -Name "instavault-server" -Force
    Write-Host "• Stopped instavault-server" -ForegroundColor Yellow
}

if (Test-Path $StartupLnk) { Remove-Item -Path $StartupLnk -Force; Write-Host "• Removed Startup shortcut" -ForegroundColor Green }
if (Test-Path $BinDir)     { Remove-Item -Recurse -Force $BinDir;  Write-Host "• Removed $BinDir" -ForegroundColor Green }
if (Test-Path $ExtDir)     { Remove-Item -Recurse -Force $ExtDir;  Write-Host "• Removed $ExtDir" -ForegroundColor Green }

if ($PurgeData) {
    if (Test-Path $InstallRoot) {
        Remove-Item -Recurse -Force $InstallRoot
        Write-Host "• Purged all InstaVault data and logs from $InstallRoot" -ForegroundColor Yellow
    }
} else {
    Write-Host "`nUser data preserved at: $DataDir" -ForegroundColor DarkGray
    Write-Host "Pass -PurgeData to also remove the database, settings, and logs." -ForegroundColor DarkGray
}

Write-Host "`nUninstall complete." -ForegroundColor Green
