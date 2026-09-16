# Run once in an elevated PowerShell after deploy.ps1 has prepared a release.
param([string]$RuntimeRoot = 'C:\Services\chi-hub-runtime', [string]$TaskName = 'CHI-HUB-App')
$ErrorActionPreference = 'Stop'
if (-not (Test-Path (Join-Path $RuntimeRoot 'active.txt'))) { throw 'Run deploy.ps1 first.' }
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    throw 'CHI-HUB-App already exists. Use deploy.ps1 to update the release.'
}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'run-app.ps1') -Destination $RuntimeRoot
$runner = Join-Path $RuntimeRoot 'run-app.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$runner`" -RuntimeRoot `"$RuntimeRoot`"" -WorkingDirectory $RuntimeRoot
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
# Dedicated non-administrator service identity; never run the web app as SYSTEM.
$principal = New-ScheduledTaskPrincipal -UserId 'NT AUTHORITY\LOCAL SERVICE' -LogonType ServiceAccount
& icacls.exe $RuntimeRoot /grant '*S-1-5-19:(OI)(CI)RX' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not grant runtime read access.' }
$logDir = Join-Path $RuntimeRoot 'logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
& icacls.exe $logDir /grant '*S-1-5-19:(OI)(CI)M' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not grant log write access.' }
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal | Out-Null
Start-ScheduledTask -TaskName $taskName
Write-Output 'CHI-HUB-App registered and started; check /api/health and runtime logs.'
