# InstaVault Windows uninstaller.
# Removes Native Messaging and application runtime files while preserving user data.

$ErrorActionPreference = "Continue"

$TaskName = "InstaVaultServer"
$RunDir = "$env:USERPROFILE\mass-downloader-for-instagram\server"
$StartupPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\InstaVault.lnk"

Write-Host "[InstaVault] Starting automated uninstallation..." -ForegroundColor Cyan

# 1. Stop and remove Task Scheduler task (if registered in previous steps)
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($ExistingTask) {
    $IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if ($IsAdmin) {
        Write-Host "   - Stopping background task in Task Scheduler..."
        Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue | Out-Null
        Write-Host "   - Removing background task..."
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false | Out-Null
        Write-Host "[OK] Background task successfully removed from Task Scheduler." -ForegroundColor Green
    } else {
        Write-Warning "   - Found Scheduled Task '$TaskName' but uninstallation requires Administrator privileges to remove it."
        Write-Host "     (To remove it, please run uninstall.ps1 from an Administrator PowerShell window)" -ForegroundColor Yellow
    }
}

# 2. Remove Startup Folder shortcut & Native Messaging Registry Keys
if (Test-Path $StartupPath) {
    Write-Host "   - Removing background startup shortcut..."
    Remove-Item -Path $StartupPath -Force
    Write-Host "[OK] Startup shortcut successfully removed." -ForegroundColor Green
} else {
    Write-Host "   - Background startup shortcut not found."
}

$RegPaths = @(
    "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.instavault.downloader",
    "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.instavault.downloader",
    "HKCU:\Software\Chromium\NativeMessagingHosts\com.instavault.downloader",
    "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.instavault.downloader",
    "HKCU:\Software\Vivaldi\NativeMessagingHosts\com.instavault.downloader"
)
foreach ($RegPath in $RegPaths) {
    if (Test-Path $RegPath) {
        Remove-Item -Path $RegPath -Recurse -Force
        Write-Host "[OK] Removed Native Messaging Registry key: $RegPath" -ForegroundColor Green
    }
}

# 3. Terminate any running server processes
Write-Host "   - Checking for running server processes..."
$Processes = Get-Process -Name "instavault-server" -ErrorAction SilentlyContinue
if ($Processes) {
    Write-Host "   - Terminating running instavault-server process(es)..."
    Stop-Process -Name "instavault-server" -Force
    Write-Host "[OK] Running processes terminated." -ForegroundColor Green
} else {
    Write-Host "   - No running server processes found."
}

# 4. Clean up operational binary and UI files
if (Test-Path $RunDir) {
    Write-Host "   - Cleaning up binary and UI assets from $RunDir..."
    
    # Remove binary
    if (Test-Path "$RunDir\instavault-server.exe") {
        Remove-Item -Path "$RunDir\instavault-server.exe" -Force
    }
    
    # Remove VBScript helper
    if (Test-Path "$RunDir\start_instavault_hidden.vbs") {
        Remove-Item -Path "$RunDir\start_instavault_hidden.vbs" -Force
    }

    # Remove generated Native Messaging manifest
    if (Test-Path "$RunDir\com.instavault.downloader.json") {
        Remove-Item -Path "$RunDir\com.instavault.downloader.json" -Force
    }

    # Remove detached agent diagnostics
    if (Test-Path "$RunDir\instavault-agent.log") {
        Remove-Item -Path "$RunDir\instavault-agent.log" -Force
    }
    
    # Remove UI assets
    if (Test-Path "$RunDir\ui") {
        Remove-Item -Path "$RunDir\ui" -Recurse -Force
    }
    
    Write-Host "[OK] Binary, native manifest, agent log, VBScript helper, and UI folder successfully removed." -ForegroundColor Green
    Write-Host "[Notice] Database (instavault.db) and downloaded media directories have been retained to prevent data loss." -ForegroundColor Yellow
}

Write-Host "`n[SUCCESS] [InstaVault] Uninstallation completed successfully!" -ForegroundColor Green
