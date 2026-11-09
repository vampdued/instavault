<#
.SYNOPSIS
  InstaVault Development & Release Automation Script
.DESCRIPTION
  Provides streamlined one-command dev workflow, test execution, production packaging, and updates.
.EXAMPLE
  .\dev.ps1 run      # Run dev daemon (port 19202, hot-reloading UI, dev data dir)
  .\dev.ps1 build    # Compile production Windows binary with -H=windowsgui
  .\dev.ps1 test     # Run all Go unit tests
  .\dev.ps1 pack     # Build production zip packages and SHA256 checksums in dist/
  .\dev.ps1 check    # Run database selfcheck verification
  .\dev.ps1 update   # Check for releases via CLI
#>

[CmdletBinding()]
param (
    [Parameter(Position = 0)]
    [ValidateSet("run", "build", "test", "pack", "check", "update", "clean")]
    [string]$Task = "run",

    [Parameter(Position = 1)]
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot
$ServerDir = Join-Path $RepoRoot "server"
$DistDir = Join-Path $RepoRoot "dist"

if (-not $Version) {
    try {
        $gitTag = git describe --tags --always 2>$null
        if ($gitTag -and $gitTag -notmatch "^fatal") {
            $Version = $gitTag.Trim().TrimStart("v")
        } else {
            $Version = "1.0.0"
        }
    } catch {
        $Version = "1.0.0"
    }
}

function Show-Header([string]$title) {
    Write-Host "`n=== InstaVault: $title (v$Version) ===" -ForegroundColor Cyan
}

switch ($Task) {
    "run" {
        Show-Header "Starting Development Daemon"
        Write-Host "• Server Port: 19202" -ForegroundColor DarkGray
        Write-Host "• UI Mode: Hot-reloading from disk (server/ui)" -ForegroundColor DarkGray
        Write-Host "• Data Dir: %LOCALAPPDATA%\InstaVault\dev-data" -ForegroundColor DarkGray
        Write-Host "Press Ctrl+C to terminate.`n" -ForegroundColor Yellow

        Push-Location $ServerDir
        try {
            go run . -dev
        } finally {
            Pop-Location
        }
    }

    "build" {
        Show-Header "Building Production Binary"
        Push-Location $ServerDir
        try {
            $ldflags = "-s -w -H=windowsgui -X main.Version=$Version"
            $outputExe = Join-Path $ServerDir "instavault-server.exe"
            Write-Host "Compiling $outputExe with -ldflags '$ldflags'..." -ForegroundColor DarkGray
            go build -v -ldflags "$ldflags" -o $outputExe .
            Write-Host "Build successful: $outputExe" -ForegroundColor Green
        } finally {
            Pop-Location
        }
    }

    "test" {
        Show-Header "Running Unit Tests"
        Push-Location $ServerDir
        try {
            go test -v ./...
            Write-Host "`nAll tests passed successfully!" -ForegroundColor Green
        } finally {
            Pop-Location
        }
    }

    "check" {
        Show-Header "Running Database Self-Check"
        Push-Location $ServerDir
        try {
            go run . -selfcheck -dev
            Write-Host "`nSelfcheck passed!" -ForegroundColor Green
        } finally {
            Pop-Location
        }
    }

    "pack" {
        Show-Header "Packaging Distribution Bundles"
        if (Test-Path $DistDir) {
            Remove-Item -Recurse -Force $DistDir
        }
        New-Item -ItemType Directory -Force -Path $DistDir | Out-Null

        # 1. Compile production binary
        Push-Location $ServerDir
        try {
            $ldflags = "-s -w -H=windowsgui -X main.Version=$Version"
            $prodExe = Join-Path $DistDir "instavault-server.exe"
            Write-Host "• Building Windows binary..." -ForegroundColor DarkGray
            $env:CGO_ENABLED = "0"
            go build -ldflags "$ldflags" -o $prodExe .
        } finally {
            Pop-Location
        }

        # 2. Package Binary Zip
        $binZip = Join-Path $DistDir "instavault-windows-amd64.zip"
        Write-Host "• Archiving binary to $binZip..." -ForegroundColor DarkGray
        Compress-Archive -Path $prodExe -DestinationPath $binZip -Force
        Remove-Item -Force $prodExe

        # 3. Package Chrome Extension Zip
        $extDir = Join-Path $RepoRoot "extension"
        $extZip = Join-Path $DistDir "instavault-extension.zip"
        Write-Host "• Archiving Chrome extension to $extZip..." -ForegroundColor DarkGray
        
        # Collect extension files excluding hidden/tmp files
        $extItems = Get-ChildItem -Path $extDir | Where-Object { $_.Name -notmatch "^\." } | ForEach-Object { $_.FullName }
        Compress-Archive -Path $extItems -DestinationPath $extZip -Force

        # 4. Generate SHA256 Checksums
        Write-Host "• Computing SHA256 checksums..." -ForegroundColor DarkGray
        $checksumFile = Join-Path $DistDir "checksums.txt"
        $hashes = @()
        Get-ChildItem -Path $DistDir -Filter *.zip | ForEach-Object {
            $h = Get-FileHash -Path $_.FullName -Algorithm SHA256
            $hashes += "$($h.Hash.ToLower())  $($_.Name)"
        }
        $hashes | Out-File -FilePath $checksumFile -Encoding utf8

        Write-Host "`nPackages created in dist/:" -ForegroundColor Green
        Get-ChildItem -Path $DistDir | Select-Object Name, Length | Format-Table -AutoSize
        Write-Host "Checksums:" -ForegroundColor Cyan
        Get-Content $checksumFile
    }

    "update" {
        Show-Header "Checking for Updates"
        Push-Location $ServerDir
        try {
            go run . -update -force
        } finally {
            Pop-Location
        }
    }

    "clean" {
        Show-Header "Cleaning Build Artifacts"
        if (Test-Path $DistDir) {
            Remove-Item -Recurse -Force $DistDir
            Write-Host "Removed $DistDir" -ForegroundColor DarkGray
        }
        $testExe = Join-Path $ServerDir "instavault-server-test.exe"
        if (Test-Path $testExe) {
            Remove-Item -Force $testExe
        }
        Write-Host "Clean complete." -ForegroundColor Green
    }
}

