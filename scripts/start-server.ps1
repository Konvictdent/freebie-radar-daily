$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$listening = Get-NetTCPConnection -LocalPort 8788 -State Listen -ErrorAction SilentlyContinue
if ($listening) { exit 0 }

$node = (Get-Command node).Source
if (-not $node) { exit 1 }

New-Item -ItemType Directory -Force -Path (Join-Path $root "data") | Out-Null

Start-Process -FilePath $node `
  -ArgumentList "--env-file=.env", "--import", "tsx", "src/server/index.ts" `
  -WorkingDirectory $root `
  -RedirectStandardOutput (Join-Path $root "data\server.log") `
  -RedirectStandardError (Join-Path $root "data\server.err.log") `
  -WindowStyle Hidden

exit 0
