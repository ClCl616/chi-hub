param([string]$RuntimeRoot = 'C:\Services\chi-hub-runtime', [string]$TaskName = 'CHI-HUB-App')
$ErrorActionPreference = 'Stop'
$source = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
Set-Location -LiteralPath $source
$dirty = & git status --porcelain
if ($LASTEXITCODE -ne 0 -or $dirty) { throw 'Commit or preserve source changes before deploying; worktree must be clean.' }
if (-not (Test-Path '.env.local')) { throw 'Configure .env.local first.' }
# Keep one canonical environment file for reproducible builds and releases.
foreach ($file in @('.env.production.local', '.env.production', '.env')) {
    if (Test-Path $file) { throw "Consolidate production settings into .env.local; found $file." }
}
& npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci failed; active release unchanged.' }
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed; active release unchanged.' }
$sha = (& git rev-parse --short=12 HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Cannot identify source revision.' }
$release = Join-Path $RuntimeRoot ('releases\' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff') + '-' + $sha)
New-Item -ItemType Directory -Path (Join-Path $release 'dist') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $release 'scripts') -Force | Out-Null
Copy-Item -LiteralPath 'dist\standalone' -Destination (Join-Path $release 'dist') -Recurse
Copy-Item -LiteralPath 'scripts\start-server.mjs','scripts\environment.mjs' -Destination (Join-Path $release 'scripts')
Copy-Item -LiteralPath '.env.local' -Destination $release
# Only administrators, the deployment user and the service account can read releases/env.
$userSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls.exe $RuntimeRoot /inheritance:r /grant:r "*${userSid}:(OI)(CI)F" '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-18:(OI)(CI)F' '*S-1-5-19:(OI)(CI)RX' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not restrict runtime permissions.' }
$node = (Get-Command node.exe).Source
$previousPort = $env:PORT
$probe = $null
try {
    if (Get-NetTCPConnection -LocalPort 13000 -State Listen -ErrorAction SilentlyContinue) { throw 'Smoke-test port 13000 is already in use.' }
    $env:PORT = '13000'
    $probe = Start-Process -FilePath $node -ArgumentList 'scripts/start-server.mjs' -WorkingDirectory $release -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $release 'smoke.log') -RedirectStandardError (Join-Path $release 'smoke.error.log')
    $healthy = $false
    for ($i = 0; $i -lt 30; $i++) {
        if ($probe.HasExited) { throw 'Candidate exited; inspect smoke.error.log.' }
        try {
            $response = Invoke-RestMethod 'http://127.0.0.1:13000/api/health' -TimeoutSec 2
            if ($response.ok) { $healthy = $true; break }
        } catch { Start-Sleep -Seconds 1 }
    }
    if (-not $healthy) { throw 'Candidate health check failed; active release unchanged.' }
} finally {
    $env:PORT = $previousPort
    if ($probe -and -not $probe.HasExited) { Stop-Process -Id $probe.Id }
}
$active = Join-Path $RuntimeRoot 'active.txt'
if (Test-Path $active) { Copy-Item $active (Join-Path $RuntimeRoot 'previous.txt') -Force }
[IO.File]::WriteAllText($active, $release)
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
    & (Join-Path $PSScriptRoot 'stop-app.ps1') -RuntimeRoot $RuntimeRoot -TaskName $TaskName
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'run-app.ps1') -Destination $RuntimeRoot -Force
    Start-Sleep -Seconds 2
    Start-ScheduledTask -TaskName $TaskName
    $started = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            if ((Invoke-RestMethod 'http://127.0.0.1:3000/api/health' -TimeoutSec 2).ok) { $started = $true; break }
        } catch { Start-Sleep -Seconds 1 }
    }
    if (-not $started) {
        & (Join-Path $PSScriptRoot 'stop-app.ps1') -RuntimeRoot $RuntimeRoot -TaskName $TaskName
        $previous = Join-Path $RuntimeRoot 'previous.txt'
        if (Test-Path $previous) {
            Copy-Item $previous $active -Force
            Start-ScheduledTask -TaskName $TaskName
        }
        throw 'New task failed health check; previous release restored when available. Inspect logs.'
    }
}
Write-Output "Prepared release: $release"
Write-Output 'For first deployment, run install-app-task.ps1 next. Existing releases are retained for rollback.'
