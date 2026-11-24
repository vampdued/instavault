<#
.SYNOPSIS
  InstaVault Installer for Windows (Local Source or Direct GitHub Release)
.DESCRIPTION
  Auto-detects local repository source when run from a clone or via `.\dev.ps1 install`.
  Otherwise fetches the latest public GitHub release, verifies SHA256 checksums, installs
  the headless Go server to %LOCALAPPDATA%\InstaVault, stages the Chrome extension,
  configures Windows Startup auto-launch, and starts the background app.
#>

[CmdletBinding()]
param (
    [string]$SourceDir,
    [string]$Repo = "vampdued/instavault",
    [string]$Version = "latest",
    [string]$Token = $env:GITHUB_TOKEN
)

$ErrorActionPreference = "Stop"

# Ensure Go is accessible if not on PATH
if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
    foreach ($cand in @("C:\Program Files\Go\bin", "C:\Go\bin", "$env:LOCALAPPDATA\Programs\Go\bin")) {
        if (Test-Path (Join-Path $cand "go.exe")) {
            $env:PATH = "$cand;$env:PATH"
            break
        }
    }
}

# Auto-detect local repo source
$HasLocalSource = $false
if (-not $SourceDir -and $PSScriptRoot) {
    $candidate = Resolve-Path (Join-Path $PSScriptRoot "..") -ErrorAction SilentlyContinue
    if ($candidate -and (Test-Path (Join-Path $candidate.Path "server"))) {
        $SourceDir = $candidate.Path
        $HasLocalSource = $true
    }
} elseif ($SourceDir -and (Test-Path (Join-Path $SourceDir "server"))) {
    $HasLocalSource = $true
}

$InstallRoot = Join-Path $env:LOCALAPPDATA "InstaVault"
$BinDir      = Join-Path $InstallRoot "bin"
$DataDir     = Join-Path $InstallRoot "data"
$ExtDir      = Join-Path $InstallRoot "extension"
$LogsDir     = Join-Path $InstallRoot "logs"
$BackupsDir  = Join-Path $InstallRoot "backups"
$TargetExe   = Join-Path $BinDir "instavault-server.exe"
$StartupLnk  = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup\InstaVault.lnk"

Write-Host "`n=== InstaVault Installer (Windows) ===" -ForegroundColor Cyan
Write-Host "Destination: $InstallRoot" -ForegroundColor DarkGray

# 1. Stop running server if present
$existing = Get-Process -Name "instavault-server" -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "• Stopping running instavault-server..." -ForegroundColor Yellow
    Stop-Process -Name "instavault-server" -Force
    Start-Sleep -Seconds 1
}

# 2. Prepare directories
foreach ($dir in @($BinDir, $DataDir, $ExtDir, $LogsDir, $BackupsDir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

if ($HasLocalSource) {
    Write-Host "• Installing from local source: $SourceDir" -ForegroundColor DarkGray
    $srcExe = Join-Path $SourceDir "server\instavault-server.exe"
    if (Test-Path $srcExe) {
        Copy-Item -Path $srcExe -Destination $TargetExe -Force
    } else {
        Write-Host "• Compiling production binary..." -ForegroundColor DarkGray
        Push-Location (Join-Path $SourceDir "server")
        try {
            $env:CGO_ENABLED = "0"
            go build -ldflags "-s -w -H=windowsgui" -o $TargetExe .
        } finally {
            Pop-Location
        }
    }

    $srcExt = Join-Path $SourceDir "extension"
    if (Test-Path $srcExt) {
        Remove-Item -Path "$ExtDir\*" -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item -Path "$srcExt\*" -Destination $ExtDir -Recurse -Force
    }

    $srcBackup = Join-Path $SourceDir "backup-restore.ps1"
    if (Test-Path $srcBackup) {
        Copy-Item -Path $srcBackup -Destination (Join-Path $BinDir "backup-restore.ps1") -Force
        Write-Host "• Staged utility: $BinDir\backup-restore.ps1" -ForegroundColor DarkGray
    }
} else {
    Write-Host "• Fetching $Version release from github.com/$Repo..." -ForegroundColor DarkGray
    $tempDir = Join-Path $env:TEMP "instavault-install-$([guid]::NewGuid().ToString().Substring(0,8))"
    New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

    try {
        $apiUri = if ($Version -eq "latest") {
            "https://api.github.com/repos/$Repo/releases/latest"
        } else {
            "https://api.github.com/repos/$Repo/releases/tags/$Version"
        }
        $headers = @{ "Accept" = "application/vnd.github+json"; "User-Agent" = "InstaVault-Installer" }
        if ($Token) { $headers["Authorization"] = "Bearer $Token" }

        $release  = Invoke-RestMethod -Uri $apiUri -Headers $headers -TimeoutSec 20
        $binAsset = $release.assets | Where-Object { $_.name -eq "instavault-windows-amd64.zip" } | Select-Object -First 1
        $extAsset = $release.assets | Where-Object { $_.name -eq "instavault-extension.zip" }     | Select-Object -First 1
        $sumAsset = $release.assets | Where-Object { $_.name -eq "checksums.txt" }                | Select-Object -First 1

        if (-not $binAsset -or -not $extAsset) {
            throw "Release $($release.tag_name) is missing required Windows or extension zip assets."
        }

        $binZip = Join-Path $tempDir "instavault-windows-amd64.zip"
        $extZip = Join-Path $tempDir "instavault-extension.zip"
        Invoke-WebRequest -Uri $binAsset.browser_download_url -Headers @{ "User-Agent" = "InstaVault-Installer" } -OutFile $binZip
        Invoke-WebRequest -Uri $extAsset.browser_download_url -Headers @{ "User-Agent" = "InstaVault-Installer" } -OutFile $extZip

        if ($sumAsset) {
            $sumFile = Join-Path $tempDir "checksums.txt"
            Invoke-WebRequest -Uri $sumAsset.browser_download_url -Headers @{ "User-Agent" = "InstaVault-Installer" } -OutFile $sumFile
            $expected = @{}
            Get-Content $sumFile | ForEach-Object {
                if ($_ -match "^([0-9a-fA-F]{64})\s+(.+)$") { $expected[$Matches[2].Trim()] = $Matches[1].ToLower() }
            }
            foreach ($file in @($binZip, $extZip)) {
                $name = Split-Path $file -Leaf
                if ($expected.ContainsKey($name)) {
                    $actual = (Get-FileHash -Path $file -Algorithm SHA256).Hash.ToLower()
                    if ($actual -ne $expected[$name]) { throw "SHA256 mismatch for $name" }
                }
            }
            Write-Host "• Verified SHA256 checksums" -ForegroundColor Green
        }

        $binOut = Join-Path $tempDir "bin"
        Expand-Archive -Path $binZip -DestinationPath $binOut -Force
        Copy-Item -Path (Join-Path $binOut "instavault-server.exe") -Destination $TargetExe -Force
        $zipBackup = Join-Path $binOut "backup-restore.ps1"
        if (Test-Path $zipBackup) {
            Copy-Item -Path $zipBackup -Destination (Join-Path $BinDir "backup-restore.ps1") -Force
        }

        Remove-Item -Path "$ExtDir\*" -Recurse -Force -ErrorAction SilentlyContinue
        Expand-Archive -Path $extZip -DestinationPath $ExtDir -Force
    } finally {
        Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
    }
}

Write-Host "• Installed binary: $TargetExe" -ForegroundColor Green
Write-Host "• Staged extension: $ExtDir" -ForegroundColor Green

# 3. Configure Windows Startup auto-launch
$wscript  = New-Object -ComObject WScript.Shell
$shortcut = $wscript.CreateShortcut($StartupLnk)
$shortcut.TargetPath       = $TargetExe
$shortcut.WorkingDirectory = $BinDir
$shortcut.Description      = "InstaVault Background App"
$shortcut.Save()

# 4. Launch and verify health
Start-Process -FilePath $TargetExe -WorkingDirectory $BinDir
Start-Sleep -Seconds 2
try {
    $health = Invoke-RestMethod -Uri "http://localhost:19201/api/version" -TimeoutSec 3
    Write-Host "`nInstaVault v$($health.version) is running on http://localhost:$($health.port)" -ForegroundColor Green
    Write-Host "Load the extension in chrome://extensions -> Load unpacked -> $ExtDir" -ForegroundColor Yellow
} catch {
    Write-Host "`nInstaVault started. Check logs at: $LogsDir\instavault.log" -ForegroundColor Yellow
}
