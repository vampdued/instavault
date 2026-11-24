<#
.SYNOPSIS
  InstaVault Temporary Database Backup & Restore Utility
.DESCRIPTION
  Safely backups or restores the SQLite database for InstaVault.
  Gracefully stops the running daemon (via loopback API), copies/restores
  the database files (including SQLite WAL & SHM), creates safety snapshots
  before restoring, and restarts the daemon automatically.
.EXAMPLE
  .\backup-restore.ps1
  (Opens interactive menu)
.EXAMPLE
  .\backup-restore.ps1 -Backup
  (Creates a timestamped backup in .\backups)
.EXAMPLE
  .\backup-restore.ps1 -Restore
  (Presents a list of available backups to restore)
.EXAMPLE
  .\backup-restore.ps1 -Restore -FilePath .\backups\instavault-backup-20261122-120000.zip
#>

[CmdletBinding(DefaultParameterSetName = "Interactive")]
param (
    [Parameter(ParameterSetName = "Backup")]
    [switch]$Backup,

    [Parameter(ParameterSetName = "Restore")]
    [switch]$Restore,

    [Parameter(ParameterSetName = "List")]
    [switch]$List,

    [string]$FilePath,
    [string]$BackupDir,
    [switch]$Dev,
    [switch]$NoRestart,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

function Get-InstaVaultConfig {
    $port = if ($Dev) { 19202 } else { 19201 }
    $root = Join-Path $env:LOCALAPPDATA "InstaVault"
    $dataDir = if ($Dev) { Join-Path $root "dev-data" } else { Join-Path $root "data" }
    
    $repoExe = Join-Path $PSScriptRoot "server\instavault-server.exe"
    $binPath = if ($Dev -and (Test-Path $repoExe)) {
        $repoExe
    } else {
        Join-Path $root "bin\instavault-server.exe"
    }

    $resolvedBackupDir = if ($BackupDir) {
        $BackupDir
    } else {
        Join-Path $PSScriptRoot "backups"
    }

    [PSCustomObject]@{
        Port      = $port
        Root      = $root
        DataDir   = $dataDir
        DbPath    = Join-Path $dataDir "instavault.db"
        WalPath   = Join-Path $dataDir "instavault.db-wal"
        ShmPath   = Join-Path $dataDir "instavault.db-shm"
        PidPath   = Join-Path $dataDir "instavault.pid"
        BinPath   = $binPath
        BackupDir = $resolvedBackupDir
        Mode      = if ($Dev) { "Development" } else { "Production" }
    }
}

function Test-DaemonRunning {
    param ([PSCustomObject]$Cfg)
    # Check via REST API first
    try {
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:$($Cfg.Port)/api/version" -TimeoutSec 2 -ErrorAction Stop
        if ($resp -and $resp.version -and ($null -eq $resp.port -or $resp.port -eq $Cfg.Port)) {
            $owningPid = $null
            if (Test-Path $Cfg.PidPath) {
                $pidVal = Get-Content $Cfg.PidPath -ErrorAction SilentlyContinue
                if ($pidVal -and ($pidVal -match '^\d+$')) { $owningPid = [int]$pidVal }
            }
            return [PSCustomObject]@{ Running = $true; Pid = $owningPid }
        }
    } catch {}

    # If HTTP check failed, inspect the PID file specific to this data directory
    if (Test-Path $Cfg.PidPath) {
        $pidVal = Get-Content $Cfg.PidPath -ErrorAction SilentlyContinue
        if ($pidVal -and ($pidVal -match '^\d+$')) {
            $p = Get-Process -Id ([int]$pidVal) -ErrorAction SilentlyContinue
            if ($p -and $p.ProcessName -eq "instavault-server") {
                return [PSCustomObject]@{ Running = $true; Pid = [int]$pidVal }
            }
        }
    }

    return [PSCustomObject]@{ Running = $false; Pid = $null }
}

function Stop-InstaVaultDaemon {
    param ([PSCustomObject]$Cfg)
    $status = Test-DaemonRunning -Cfg $Cfg

    if (-not $status.Running) {
        Write-Host "• InstaVault daemon is not currently running ($($Cfg.Mode))." -ForegroundColor DarkGray
        return $false
    }

    Write-Host "• Gracefully stopping InstaVault daemon ($($Cfg.Mode) on port $($Cfg.Port))..." -ForegroundColor Yellow
    try {
        $headers = @{ "Origin" = "http://localhost" }
        Invoke-RestMethod -Method Post -Uri "http://localhost:$($Cfg.Port)/api/shutdown?reason=backup" -Headers $headers -TimeoutSec 3 -ErrorAction SilentlyContinue | Out-Null
    } catch {
        # Ignore network errors as the server closes connection immediately upon shutdown
    }

    # Wait up to 6 seconds for process to exit
    $stopped = $false
    for ($i = 0; $i -lt 6; $i++) {
        Start-Sleep -Seconds 1
        $current = Test-DaemonRunning -Cfg $Cfg
        if (-not $current.Running) {
            $stopped = $true
            break
        }
    }

    if (-not $stopped) {
        $targetPid = $status.Pid
        if ($targetPid) {
            Write-Host "• Stopping specific process directly (PID $targetPid)..." -ForegroundColor Yellow
            $p = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
            if ($p -and $p.ProcessName -eq "instavault-server") {
                $p | Stop-Process -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 1
            }
        }
    }

    Write-Host "• Daemon stopped safely." -ForegroundColor Green
    return $true
}

function Start-InstaVaultDaemon {
    param ([PSCustomObject]$Cfg)
    if ($NoRestart) {
        Write-Host "• Skipping daemon restart (-NoRestart requested)." -ForegroundColor DarkGray
        return
    }

    if (-not (Test-Path $Cfg.BinPath)) {
        Write-Host "• Cannot restart daemon: binary not found at $($Cfg.BinPath)" -ForegroundColor Yellow
        return
    }

    Write-Host "• Restarting InstaVault daemon ($($Cfg.Mode))..." -ForegroundColor Cyan
    $binDir = Split-Path -Parent $Cfg.BinPath
    $argList = @()
    if ($Dev) {
        $argList += "-dev"
    }

    Start-Process -FilePath $Cfg.BinPath -ArgumentList $argList -WorkingDirectory $binDir

    # Verify daemon started
    $healthy = $false
    for ($i = 0; $i -lt 10; $i++) {
        Start-Sleep -Milliseconds 500
        try {
            $resp = Invoke-RestMethod -Uri "http://localhost:$($Cfg.Port)/api/version" -TimeoutSec 1 -ErrorAction Stop
            if ($resp -and $resp.version) {
                $healthy = $true
                break
            }
        } catch {}
    }

    if ($healthy) {
        Write-Host "• InstaVault is running and healthy on http://localhost:$($Cfg.Port)" -ForegroundColor Green
    } else {
        Write-Host "• Notice: Daemon launched, but health check is taking longer than usual." -ForegroundColor Yellow
    }
}

function Backup-Database {
    param (
        [PSCustomObject]$Cfg,
        [string]$TargetFile,
        [switch]$IsSafetySnapshot
    )

    if (-not (Test-Path $Cfg.DbPath)) {
        Write-Host "❌ Error: Database file not found at $($Cfg.DbPath)" -ForegroundColor Red
        return $null
    }

    if (-not (Test-Path $Cfg.BackupDir)) {
        New-Item -ItemType Directory -Path $Cfg.BackupDir -Force | Out-Null
    }

    $timestamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
    $prefix = if ($IsSafetySnapshot) { "pre-restore-safety-backup" } else { "instavault-backup" }
    
    $destZip = if ($TargetFile) {
        $TargetFile
    } else {
        Join-Path $Cfg.BackupDir "$prefix-$timestamp.zip"
    }

    $wasRunning = Stop-InstaVaultDaemon -Cfg $Cfg

    try {
        Write-Host "• Creating backup archive: $destZip" -ForegroundColor Cyan

        # Collect DB and SQLite WAL/SHM files if present
        $filesToBackup = @($Cfg.DbPath)
        if (Test-Path $Cfg.WalPath) { $filesToBackup += $Cfg.WalPath }
        if (Test-Path $Cfg.ShmPath) { $filesToBackup += $Cfg.ShmPath }

        # Staging directory for clean archive root
        $tempStage = Join-Path $env:TEMP "iv-backup-$([guid]::NewGuid().ToString().Substring(0,8))"
        New-Item -ItemType Directory -Path $tempStage -Force | Out-Null
        try {
            foreach ($f in $filesToBackup) {
                Copy-Item -Path $f -Destination $tempStage -Force
            }
            if (Test-Path $destZip) { Remove-Item -Path $destZip -Force }
            Compress-Archive -Path "$tempStage\*" -DestinationPath $destZip -Force
        } finally {
            Remove-Item -Path $tempStage -Recurse -Force -ErrorAction SilentlyContinue
        }

        $size = (Get-Item $destZip).Length
        $sizeMB = [math]::Round($size / 1MB, 2)
        Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
        Write-Host "  File: $destZip ($sizeMB MB)" -ForegroundColor DarkGray
        return $destZip
    } catch {
        Write-Host "❌ Backup failed: $_" -ForegroundColor Red
        throw $_
    } finally {
        if ($wasRunning -and -not $IsSafetySnapshot) {
            Start-InstaVaultDaemon -Cfg $Cfg
        }
    }
}

function Get-BackupList {
    param ([PSCustomObject]$Cfg)
    if (-not (Test-Path $Cfg.BackupDir)) {
        return @()
    }
    return Get-ChildItem -Path $Cfg.BackupDir -Filter "*.zip" | Sort-Object LastWriteTime -Descending
}

function List-Backups {
    param ([PSCustomObject]$Cfg)
    Write-Host "`n=== InstaVault Backups ($($Cfg.BackupDir)) ===" -ForegroundColor Cyan
    $backups = Get-BackupList -Cfg $Cfg

    if ($backups.Count -eq 0) {
        Write-Host "No backups found in $($Cfg.BackupDir)." -ForegroundColor Yellow
        return
    }

    $index = 1
    foreach ($b in $backups) {
        $sizeMB = [math]::Round($b.Length / 1MB, 2)
        Write-Host (" [{0}] {1}  ({2} MB - {3})" -f $index, $b.Name, $sizeMB, $b.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss"))
        $index++
    }
}

function Restore-Database {
    param (
        [PSCustomObject]$Cfg,
        [string]$SourceFile
    )

    $selectedBackup = $SourceFile

    if (-not $selectedBackup) {
        $backups = Get-BackupList -Cfg $Cfg
        if ($backups.Count -eq 0) {
            Write-Host "❌ No backups found in $($Cfg.BackupDir) to restore." -ForegroundColor Red
            return
        }

        Write-Host "`nSelect a backup to restore:" -ForegroundColor Cyan
        $index = 1
        foreach ($b in $backups) {
            $sizeMB = [math]::Round($b.Length / 1MB, 2)
            Write-Host (" [{0}] {1}  ({2} MB - {3})" -f $index, $b.Name, $sizeMB, $b.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss"))
            $index++
        }

        $choice = Read-Host "`nEnter backup number [1-$($backups.Count)] (or 'q' to cancel)"
        if ($choice -eq "q" -or [string]::IsNullOrWhiteSpace($choice)) {
            Write-Host "Restore cancelled." -ForegroundColor Yellow
            return
        }

        $num = 0
        if (-not [int]::TryParse($choice, [ref]$num) -or $num -lt 1 -or $num -gt $backups.Count) {
            Write-Host "❌ Invalid selection." -ForegroundColor Red
            return
        }

        $selectedBackup = $backups[$num - 1].FullName
    }

    if (-not (Test-Path $selectedBackup)) {
        Write-Host "❌ Backup file not found: $selectedBackup" -ForegroundColor Red
        return
    }

    Write-Host "`n⚠️  Ready to restore from: $selectedBackup" -ForegroundColor Yellow
    Write-Host "Target: $($Cfg.DbPath)" -ForegroundColor DarkGray

    if (-not $Force) {
        $confirm = Read-Host "Are you sure you want to restore? This will overwrite the current active database (y/N)"
        if ($confirm -ne "y" -and $confirm -ne "Y") {
            Write-Host "Restore cancelled." -ForegroundColor Yellow
            return
        }
    }

    # Track whether daemon was running before pre-restore snapshot stops it
    $wasRunning = (Test-DaemonRunning -Cfg $Cfg).Running

    # Step 1: Pre-restore safety snapshot of the active database
    Write-Host "`n• Creating pre-restore safety snapshot of the active database..." -ForegroundColor Cyan
    $safetyBak = Backup-Database -Cfg $Cfg -IsSafetySnapshot
    if ($safetyBak) {
        Write-Host "  Safety snapshot created: $safetyBak" -ForegroundColor DarkGray
    }

    # Step 2: Ensure daemon is fully stopped before file operations
    Stop-InstaVaultDaemon -Cfg $Cfg | Out-Null

    try {
        Write-Host "• Restoring database files..." -ForegroundColor Cyan

        # Remove active DB and WAL/SHM to prevent mix-and-match corruption
        if (Test-Path $Cfg.DbPath)  { Remove-Item -Path $Cfg.DbPath -Force }
        if (Test-Path $Cfg.WalPath) { Remove-Item -Path $Cfg.WalPath -Force }
        if (Test-Path $Cfg.ShmPath) { Remove-Item -Path $Cfg.ShmPath -Force }

        if ($selectedBackup.EndsWith(".zip", [System.StringComparison]::OrdinalIgnoreCase)) {
            # Extract zip directly into Data directory
            Expand-Archive -Path $selectedBackup -DestinationPath $Cfg.DataDir -Force
        } else {
            # Single .db or .bak file
            Copy-Item -Path $selectedBackup -Destination $Cfg.DbPath -Force
        }

        Write-Host "✅ Database restored successfully!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Restore failed: $_" -ForegroundColor Red
        throw $_
    } finally {
        if ($wasRunning) {
            Start-InstaVaultDaemon -Cfg $Cfg
        }
    }
}

function Show-Menu {
    param ([PSCustomObject]$Cfg)

    while ($true) {
        Write-Host "`n==========================================" -ForegroundColor Cyan
        Write-Host "      InstaVault Database Manager         " -ForegroundColor Cyan
        Write-Host "      Mode: $($Cfg.Mode) (Port $($Cfg.Port))" -ForegroundColor DarkGray
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host " 1. Backup Database"
        Write-Host " 2. Restore Database"
        Write-Host " 3. List Available Backups"
        Write-Host " 4. Exit"
        Write-Host "------------------------------------------"

        $opt = Read-Host "Select an option [1-4]"
        switch ($opt) {
            "1" { Backup-Database -Cfg $Cfg }
            "2" { Restore-Database -Cfg $Cfg }
            "3" { List-Backups -Cfg $Cfg }
            "4" { return }
            Default { Write-Host "Invalid option. Please enter 1-4." -ForegroundColor Yellow }
        }
    }
}

# --- Entry Point ---
$cfg = Get-InstaVaultConfig

switch ($PSCmdlet.ParameterSetName) {
    "Backup" {
        Backup-Database -Cfg $cfg -TargetFile $FilePath
    }
    "Restore" {
        Restore-Database -Cfg $cfg -SourceFile $FilePath
    }
    "List" {
        List-Backups -Cfg $cfg
    }
    Default {
        Show-Menu -Cfg $cfg
    }
}
