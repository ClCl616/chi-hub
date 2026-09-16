# Prepare HTTPS service. Run Start-Service CHI-HUB-Caddy after router forwarding is ready.
param([switch]$Resume)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = 'C:\Services\chi-hub-caddy'
if (Get-Service 'CHI-HUB-Caddy' -ErrorAction SilentlyContinue) { throw 'Service already exists; preserve it and review before updating.' }
if ((Test-Path $root) -and -not $Resume) { throw 'Caddy directory already exists; review it before explicitly using -Resume.' }
New-Item -ItemType Directory -Force -Path $root,(Join-Path $root 'data'),(Join-Path $root 'logs') | Out-Null
$version = '2.11.4'
$archive = "caddy_${version}_windows_amd64.zip"
$base = "https://github.com/caddyserver/caddy/releases/download/v$version"
$zip = Join-Path $root $archive
Invoke-WebRequest "$base/$archive" -OutFile $zip -UseBasicParsing
$checksums = (Invoke-WebRequest "$base/caddy_${version}_checksums.txt" -UseBasicParsing).Content
if ($checksums -is [byte[]]) { $checksums = [Text.Encoding]::UTF8.GetString($checksums) }
$line = $checksums -split "`n" | Where-Object { $_.Trim().EndsWith($archive) }
if (@($line).Count -ne 1) { throw 'Cannot locate official checksum.' }
$expected = ($line.Trim() -split '\s+')[0]
if ($expected.Length -ne 128 -or (Get-FileHash $zip -Algorithm SHA512).Hash -ne $expected) { throw 'Caddy checksum mismatch.' }
Expand-Archive -LiteralPath $zip -DestinationPath $root -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Caddyfile') -Destination $root
$exe = Join-Path $root 'caddy.exe'
$config = Join-Path $root 'Caddyfile'
& $exe validate --config $config --adapter caddyfile
if ($LASTEXITCODE -ne 0) { throw 'Caddy config validation failed.' }
& icacls.exe $root /grant '*S-1-5-19:(OI)(CI)RX' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Caddy read permissions failed.' }
foreach ($dir in @('data','logs')) {
    & icacls.exe (Join-Path $root $dir) /inheritance:r /grant:r '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-18:(OI)(CI)F' '*S-1-5-19:(OI)(CI)M' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Caddy data permissions failed.' }
}
New-Service -Name 'CHI-HUB-Caddy' -DisplayName 'CHI Toolbox HTTPS' -BinaryPathName "`"$exe`" run --config `"$config`" --adapter caddyfile" -StartupType Automatic | Out-Null
& sc.exe config CHI-HUB-Caddy obj= 'NT AUTHORITY\LocalService'
if ($LASTEXITCODE -ne 0) { throw 'Failed to set service identity; do not start service.' }
& sc.exe failure CHI-HUB-Caddy reset= 86400 actions= restart/5000/restart/15000/restart/60000
if ($LASTEXITCODE -ne 0) { throw 'Failed to configure recovery.' }
Write-Output 'Caddy installed and validated (stopped). Configure router/firewall, then Start-Service CHI-HUB-Caddy.'
