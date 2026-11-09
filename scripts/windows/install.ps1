<#
.SYNOPSIS
  InstaVault Automated Installer for Windows 11
.DESCRIPTION
  Installs InstaVault to %LOCALAPPDATA%\InstaVault\bin, configures background auto-start,
  stages the Chrome extension to %LOCALAPPDATA%\InstaVault\extension, and launches the daemon.
#>

[CmdletBinding()]
param (
    [string]$SourceDir,
    [string]$Repo = "vampdued/instavault",
    [string]$Token = $env:GITHUB_TOKEN,
    [string]$Version = "latest"
)

$ErrorActionPreference = "Stop"

$HasLocalSource = $false
if (-not $SourceDir) {
    if ($PSScriptRoot) {
        $candidate = (Resolve-Path (Join-Path $PSScriptRoot "..\..") -ErrorAction SilentlyContinue)
        if ($candidate -and (Test-Path (Join-Path $candidate.Path "server"))) {
            $SourceDir = $candidate.Path
            $HasLocalSource = $true
        }
    }
} elseif (Test-Path (Join-Path $SourceDir "server")) {
    $HasLocalSource = $true
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

if ($HasLocalSource) {
    # 3. Locate source binary (Local Mode)
    $srcExe = Join-Path $SourceDir "server\instavault-server.exe"
    if (-not (Test-Path $srcExe)) {
        $srcExe = Join-Path $SourceDir "instavault-server.exe"
    }
    if (-not (Test-Path $srcExe)) {
        Write-Host "• Compiling production binary from local source..." -ForegroundColor DarkGray
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

    # 4. Stage Chrome Extension (Local Mode)
    $srcExt = Join-Path $SourceDir "extension"
    if (Test-Path $srcExt) {
        Copy-Item -Path "$srcExt\*" -Destination $ExtDir -Recurse -Force
        Write-Host "• Staged Chrome extension to: $ExtDir" -ForegroundColor Green
    }
} else {
    # Remote Release Mode (Standalone / One-Liner Install)
    Write-Host "• No local source found. Fetching release assets from GitHub ($Repo)..." -ForegroundColor Cyan
    $tempDir = Join-Path $env:TEMP "instavault-install-$([guid]::NewGuid().ToString().Substring(0,8))"
    New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

    $downloadSuccess = $false

    # Option A: GitHub CLI (gh)
    $ghPath = Get-Command gh -ErrorAction SilentlyContinue
    if ($ghPath) {
        Write-Host "• Checking GitHub CLI authentication..." -ForegroundColor DarkGray
        $ghAuth = & gh auth status 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "• Downloading release via GitHub CLI..." -ForegroundColor DarkGray
            & gh release download $Version --repo $Repo --pattern "instavault-windows-amd64.zip" --pattern "instavault-extension.zip" --dir $tempDir
            if ($LASTEXITCODE -eq 0 -and (Test-Path (Join-Path $tempDir "instavault-windows-amd64.zip"))) {
                $downloadSuccess = $true
            }
        }
    }

    # Option B: REST API with Token or unauthenticated fallback
    if (-not $downloadSuccess) {
        $apiUri = if ($Version -eq "latest") {
            "https://api.github.com/repos/$Repo/releases/latest"
        } else {
            "https://api.github.com/repos/$Repo/releases/tags/$Version"
        }

        $headers = @{ "Accept" = "application/vnd.github.v3+json"; "User-Agent" = "InstaVault-Installer" }
        if ($Token) {
            $headers["Authorization"] = "Bearer $Token"
        }

        $release = $null
        try {
            $release = Invoke-RestMethod -Uri $apiUri -Headers $headers -TimeoutSec 15
        } catch {
            if (-not $Token -and [Environment]::UserInteractive) {
                Write-Host "`n[Authentication Required] Could not access $Repo (it may be private)." -ForegroundColor Yellow
                $inputToken = Read-Host "Please enter a GitHub Personal Access Token (PAT) with repo scope"
                if ($inputToken) {
                    $Token = $inputToken.Trim()
                    $headers["Authorization"] = "Bearer $Token"
                    $release = Invoke-RestMethod -Uri $apiUri -Headers $headers -TimeoutSec 15
                }
            }
            if (-not $release) {
                throw "Failed to fetch release from $apiUri : $_"
            }
        }

        $binAsset = $release.assets | Where-Object { $_.name -eq "instavault-windows-amd64.zip" } | Select-Object -First 1
        $extAsset = $release.assets | Where-Object { $_.name -eq "instavault-extension.zip" } | Select-Object -First 1

        if (-not $binAsset -or -not $extAsset) {
            throw "Release $($release.tag_name) is missing required assets (instavault-windows-amd64.zip or instavault-extension.zip)."
        }

        $binZipPath = Join-Path $tempDir "instavault-windows-amd64.zip"
        $extZipPath = Join-Path $tempDir "instavault-extension.zip"
        $downloadHeaders = @{ "User-Agent" = "InstaVault-Installer" }

        Write-Host "• Downloading $($binAsset.name)..." -ForegroundColor DarkGray
        if ($Token) {
            $downloadHeaders["Authorization"] = "Bearer $Token"
            $downloadHeaders["Accept"] = "application/octet-stream"
            Invoke-RestMethod -Uri $binAsset.url -Headers $downloadHeaders -OutFile $binZipPath
        } else {
            Invoke-RestMethod -Uri $binAsset.browser_download_url -Headers $downloadHeaders -OutFile $binZipPath
        }

        Write-Host "• Downloading $($extAsset.name)..." -ForegroundColor DarkGray
        if ($Token) {
            Invoke-RestMethod -Uri $extAsset.url -Headers $downloadHeaders -OutFile $extZipPath
        } else {
            Invoke-RestMethod -Uri $extAsset.browser_download_url -Headers $downloadHeaders -OutFile $extZipPath
        }
    }

    # Extract binary and extension
    $extractedBinDir = Join-Path $tempDir "bin_extracted"
    Expand-Archive -Path (Join-Path $tempDir "instavault-windows-amd64.zip") -DestinationPath $extractedBinDir -Force
    Copy-Item -Path (Join-Path $extractedBinDir "instavault-server.exe") -Destination $TargetExe -Force
    Write-Host "• Installed binary to: $TargetExe" -ForegroundColor Green

    Expand-Archive -Path (Join-Path $tempDir "instavault-extension.zip") -DestinationPath $ExtDir -Force
    Write-Host "• Staged Chrome extension to: $ExtDir" -ForegroundColor Green

    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
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

