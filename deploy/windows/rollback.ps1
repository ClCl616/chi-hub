param([string]$RuntimeRoot = 'C:\Services\chi-hub-runtime', [string]$TaskName = 'CHI-HUB-App')
$ErrorActionPreference = 'Stop'
$previous = Join-Path $RuntimeRoot 'previous.txt'
if (-not (Test-Path $previous)) { throw 'No previous release recorded.' }
$target = (Get-Content $previous -Raw).Trim()
$root = [IO.Path]::GetFullPath((Join-Path $RuntimeRoot 'releases')) + '\'
if (-not ([IO.Path]::GetFullPath($target)).StartsWith($root,[StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid previous release path.' }
if (-not (Test-Path (Join-Path $target 'dist\standalone\server.js'))) { throw 'Previous build missing.' }
Stop-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 2
$active = Join-Path $RuntimeRoot 'active.txt'
$current = Get-Content $active -Raw
[IO.File]::WriteAllText($active,$target)
[IO.File]::WriteAllText($previous,$current)
Start-ScheduledTask -TaskName $TaskName
Write-Output 'Previous release selected. Verify http://127.0.0.1:3000/api/health.'
