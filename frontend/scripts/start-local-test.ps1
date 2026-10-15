$ErrorActionPreference = 'Stop'
$frontendRoot = Split-Path $PSScriptRoot -Parent
$previousOrigin = $env:BACKEND_API_ORIGIN
$previousTelemetry = $env:NEXT_TELEMETRY_DISABLED
Push-Location $frontendRoot
try {
    # Existing rewrite contract, explicitly pinned to the local backend.
    $env:BACKEND_API_ORIGIN = 'http://127.0.0.1:8080'
    $env:NEXT_TELEMETRY_DISABLED = '1'
    & pnpm dev --hostname 127.0.0.1 --port 3000
    if ($LASTEXITCODE -ne 0) { throw 'Local frontend exited unsuccessfully.' }
} finally { $env:BACKEND_API_ORIGIN = $previousOrigin; $env:NEXT_TELEMETRY_DISABLED = $previousTelemetry; Pop-Location }
