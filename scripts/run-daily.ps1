$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

New-Item -ItemType Directory -Force -Path (Join-Path $root "data") | Out-Null
& node --env-file=.env --import tsx scripts/daily-if-missing.mjs *>> (Join-Path $root "data\daily.log")
exit $LASTEXITCODE
