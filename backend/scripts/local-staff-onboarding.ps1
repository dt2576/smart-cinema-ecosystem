param([ValidateSet('Prepare','Verify','Mailpit','Start')][string]$Action = 'Verify')
$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$backendRoot = Join-Path $repositoryRoot 'backend'
& (Join-Path $PSScriptRoot 'local-test-environment.ps1') -Action Verify
if ($LASTEXITCODE -ne 0) { throw 'Base local verification failed.' }
$privateRoot = Join-Path $backendRoot 'target/staff-onboarding-local-e2e-2026-10-15/private'
$windowsIdentity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
if (-not (Test-Path -LiteralPath $privateRoot)) {
    New-Item -ItemType Directory -Path $privateRoot | Out-Null
    & icacls $privateRoot /inheritance:r /grant:r "${windowsIdentity}:(OI)(CI)(F)" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Private capture ACL setup failed.' }
}
$mailpitNames = @(Get-ChildItem Env: | Where-Object { $_.Value -and $_.Name -match '^MP_' })
if ($mailpitNames.Count) { throw 'Mailpit process overrides exist; values withheld, no launch.' }
if ($Action -eq 'Mailpit') {
    if (Get-NetTCPConnection -State Listen -LocalPort 1027,8027 -ErrorAction SilentlyContinue) { throw 'Capture ports already occupied; no replacement.' }
    $mailpitPath = Join-Path $backendRoot 'target/qa/staff-foundation-continuation-2026-10-12/mailpit/mailpit.exe'
    if (-not (Test-Path -LiteralPath $mailpitPath)) { throw 'Verified existing Mailpit binary unavailable.' }
    & $mailpitPath --listen '127.0.0.1:8027' --smtp '127.0.0.1:1027' --database (Join-Path $privateRoot 'capture.sqlite') --disable-version-check --smtp-disable-rdns --smtp-allowed-recipients '@example\.test$' --allowed-hosts '127.0.0.1,localhost' --quiet
    exit $LASTEXITCODE
}
$classpathPath = Join-Path $backendRoot 'target/qa/staff-foundation-continuation-2026-10-12/classpath.txt'
$classpath = [IO.File]::ReadAllText($classpathPath).Trim()
foreach ($dependencyPath in $classpath.Split(';')) { if (-not (Test-Path -LiteralPath $dependencyPath)) { throw 'Existing local runtime dependency missing; no download.' } }
$classpath = (Join-Path $backendRoot 'target/classes') + ';' + $classpath
$profilePath = Join-Path $backendRoot '.env.local-test-onboarding'
if ($Action -eq 'Prepare') {
    if (Test-Path -LiteralPath $profilePath) { throw 'Onboarding profile exists; no overwrite.' }
    New-Item -ItemType File -Path $profilePath | Out-Null
    & icacls $profilePath /inheritance:r /grant:r "${windowsIdentity}:(F)" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Private profile ACL setup failed.' }
}
Push-Location $backendRoot
try {
    $helperPath = Join-Path $PSScriptRoot 'LocalStaffOnboardingApplication.java'
    if ($Action -ne 'Start') {
        & java --class-path $classpath $helperPath $Action.ToLowerInvariant()
        if ($LASTEXITCODE -ne 0) { throw 'Onboarding profile verification failed; no retry/reset.' }
    } else {
        & java --class-path $classpath $helperPath verify
        if ($LASTEXITCODE -ne 0) { throw 'Onboarding preflight failed; backend not started.' }
        $env:SPRING_CONFIG_LOCATION = ([Uri]$profilePath).AbsoluteUri + '[.properties]'
        $env:SPRING_PROFILES_ACTIVE = 'local-test,local-onboarding'
        $secretValues = [IO.File]::ReadAllLines($profilePath) | Where-Object { $_ -match '^(spring\.(datasource|flyway)\.password|auth\.jwt\.secret|staff\.invitations\.encryption-keys)=' } | ForEach-Object { (($_ -split '=',2)[1]).Replace('\:',':').Replace('\=','=') }
        try {
            & java '-Ddebug=false' '-Dtrace=false' '-Dlogging.level.root=INFO' --class-path $classpath $helperPath start 2>&1 | ForEach-Object {
                $safeLine = $_.ToString()
                foreach ($secretValue in $secretValues) { if ($secretValue) { $safeLine = $safeLine.Replace($secretValue,'<redacted>') } }
                if ($safeLine -match 'Using generated security password:') { $safeLine = 'Generated security credential withheld.' }
                Write-Output $safeLine
            }
            if ($LASTEXITCODE -ne 0) { throw 'Local onboarding application exited unsuccessfully; no automatic restart.' }
        } finally { Remove-Item Env:SPRING_CONFIG_LOCATION,Env:SPRING_PROFILES_ACTIVE -ErrorAction SilentlyContinue }
    }
} finally { Pop-Location }
