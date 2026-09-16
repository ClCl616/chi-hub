param([Parameter(Mandatory=$true)][string]$RuntimeRoot)
$ErrorActionPreference = 'Stop'
$release = (Get-Content -LiteralPath (Join-Path $RuntimeRoot 'active.txt') -Raw).Trim()
$releaseRoot = [IO.Path]::GetFullPath((Join-Path $RuntimeRoot 'releases')) + '\'
$release = [IO.Path]::GetFullPath($release)
if (-not $release.StartsWith($releaseRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Active release is outside the releases directory.'
}
Set-Location -LiteralPath $release
$node = (Get-Command node.exe -ErrorAction Stop).Source
$logDir = Join-Path $RuntimeRoot 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$entry = Join-Path $release 'scripts\start-server.mjs'
$process = Start-Process -FilePath $node -ArgumentList "`"$entry`"" -WorkingDirectory $release -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir "app-$stamp.log") -RedirectStandardError (Join-Path $logDir "app-$stamp.error.log")
@{ id = $process.Id; started = $process.StartTime.ToUniversalTime().Ticks.ToString(); entry = $entry } | ConvertTo-Json | Set-Content (Join-Path $logDir 'process.json')
$process.WaitForExit()
$process.Refresh()
exit $process.ExitCode
