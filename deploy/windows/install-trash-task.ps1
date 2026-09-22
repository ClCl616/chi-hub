param([string]$SourceRoot = 'C:\Services\chi-hub')
$ErrorActionPreference = 'Stop'
$node = (Get-Command node.exe -ErrorAction Stop).Source
$script = Join-Path $SourceRoot 'scripts\purge-trash.mjs'
if (!(Test-Path -LiteralPath $script)) { throw 'Trash cleanup script is missing.' }
if (!(Test-Path -LiteralPath 'C:\Services\chi-hub-maintenance\trash.env')) { throw 'Configure the protected maintenance/trash.env file first.' }
$action = New-ScheduledTaskAction -Execute $node -Argument ('"' + $script + '"') -WorkingDirectory $SourceRoot
$trigger = New-ScheduledTaskTrigger -Daily -At '04:00'
$principal = New-ScheduledTaskPrincipal -UserId 'NT AUTHORITY\LOCAL SERVICE' -LogonType ServiceAccount
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 20)
Register-ScheduledTask -TaskName 'CHI-HUB-Trash' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Host 'CHI-HUB-Trash registered. Verify server-only configuration and source ACL before running.'
