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
$process = Start-Process -FilePath $node -ArgumentList 'scripts/start-server.mjs' -WorkingDirectory $release -WindowStyle Hidden -PassThru -Wait -RedirectStandardOutput (Join-Path $logDir "app-$stamp.log") -RedirectStandardError (Join-Path $logDir "app-$stamp.error.log")
exit $process.ExitCode
