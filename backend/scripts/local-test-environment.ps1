param(
    [ValidateSet('Prepare', 'Verify', 'Audit', 'RestrictMigration', 'Start', 'ProvisionAdmin')]
    [string]$Action = 'Verify',
    [switch]$InitialMigration
)
$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path $PSScriptRoot -Parent
$profilePath = Join-Path $backendRoot '.env.local-test'
$conflictingNames = Get-ChildItem Env: | Where-Object { $_.Value -and $_.Name -match '^(SPRING[._]|DB_|VNPAY_|STAFF_|SMTP_|MAIL_|SEAT_HOLD_|JWT_|SERVER_|DEV_ADMIN_)|^(JAVA_TOOL_OPTIONS|JAVA_OPTS|JDK_JAVA_OPTIONS|MAVEN_OPTS|MAVEN_ARGS)$' } | Select-Object -ExpandProperty Name
foreach ($conflictingName in $conflictingNames) {
    throw "Conflicting process override $conflictingName exists; value withheld. Use a clean process."
}
$postgresJar = Join-Path $env:USERPROFILE '.m2/repository/org/postgresql/postgresql/42.7.13/postgresql-42.7.13.jar'
if (-not (Test-Path -LiteralPath $postgresJar)) { throw 'Installed PostgreSQL JDBC dependency42.7.13 missing; no automatic installation.' }
Push-Location $backendRoot
try {
    $mode = switch ($Action) { 'Prepare' { 'prepare' }; 'Audit' { 'audit' }; 'RestrictMigration' { 'restrict' }; 'Start' { if ($InitialMigration) { 'initial' } else { 'start-preflight' } }; 'ProvisionAdmin' { 'start-preflight' }; default { 'verify' } }
    & java --class-path $postgresJar (Join-Path $PSScriptRoot 'LocalTestEnvironment.java') $mode
    if ($LASTEXITCODE -ne 0) { throw 'Local datasource preflight/action failed; backend not launched.' }
    if ($Action -in @('Start', 'ProvisionAdmin')) {
        # Replace the entire ConfigData location, rather than importing the remote .env.
        $env:SPRING_CONFIG_LOCATION = ([Uri]$profilePath).AbsoluteUri + '[.properties]'
        $env:SPRING_PROFILES_ACTIVE = 'local-test'
        $secretValues = [IO.File]::ReadAllLines($profilePath) | Where-Object { $_ -match '^(spring\.(datasource|flyway)\.password|auth\.jwt\.secret|staff\.invitations\.encryption-keys)=' } | ForEach-Object { (($_ -split '=',2)[1]).Replace('\:',':').Replace('\=','=') }
        try {
            $runArguments = @('spring-boot:run', '-Dspring-boot.run.jvmArguments=-Dspring.devtools.restart.enabled=false -Ddebug=false -Dtrace=false -Dlogging.level.root=INFO')
            if ($Action -eq 'ProvisionAdmin') {
                # Test-only input: never import the remote .env or put a password in argv.
                $credentialPath = Join-Path $backendRoot '.env.local-test-admin'
                if (-not (Test-Path -LiteralPath $credentialPath)) {
                    New-Item -ItemType File -Path $credentialPath | Out-Null
                    $windowsIdentity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
                    & icacls $credentialPath /inheritance:r /grant:r "${windowsIdentity}:(F)" | Out-Null
                    if ($LASTEXITCODE -ne 0) { throw 'Private credential ACL setup failed; no credentials written.' }
                    $randomBytes = New-Object byte[] 32
                    $randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
                    try { $randomGenerator.GetBytes($randomBytes) } finally { $randomGenerator.Dispose() }
                    $testPassword = -join ($randomBytes | ForEach-Object { $_.ToString('x2') })
                    $testEmail = 'phase4e-admin-' + [Guid]::NewGuid().ToString('N') + '@example.test'
                    [IO.File]::WriteAllLines($credentialPath, @("DEV_ADMIN_EMAIL=$testEmail", "DEV_ADMIN_PASSWORD=$testPassword", 'DEV_ADMIN_NAME=Phase4E Local Admin', 'DEV_ADMIN_PHONE=0910000001'))
                }
                $credentialLines = [IO.File]::ReadAllLines($credentialPath)
                if ($credentialLines.Count -ne 4) { throw 'Unexpected private test credential format.' }
                foreach ($credentialName in @('DEV_ADMIN_EMAIL','DEV_ADMIN_PASSWORD','DEV_ADMIN_NAME','DEV_ADMIN_PHONE')) {
                    $matches = @($credentialLines | Where-Object { $_.StartsWith($credentialName + '=') })
                    if ($matches.Count -ne 1) { throw 'Missing or duplicate private credential field.' }
                    $credentialValue = ($matches[0] -split '=',2)[1]
                    if (-not $credentialValue -or ($credentialName -eq 'DEV_ADMIN_EMAIL' -and -not $credentialValue.EndsWith('@example.test')) -or ($credentialName -eq 'DEV_ADMIN_PASSWORD' -and $credentialValue -notmatch '^[0-9a-f]{64}$')) { throw 'Invalid synthetic test credential input.' }
                    [Environment]::SetEnvironmentVariable($credentialName, $credentialValue, 'Process')
                    if ($credentialName -eq 'DEV_ADMIN_PASSWORD') { $secretValues += $credentialValue }
                }
                $runArguments += @('-Dspring-boot.run.main-class=com.smartcinema.development.DevelopmentAdminApplication', '-Dspring-boot.run.arguments=--development.admin.confirm=development-only')
            }
            & mvn @runArguments 2>&1 | ForEach-Object {
                $safeLine = $_.ToString()
                foreach ($secretValue in $secretValues) { if ($secretValue) { $safeLine = $safeLine.Replace($secretValue,'<redacted>') } }
                if ($safeLine -match 'Using generated security password:') { $safeLine = 'Generated security credential withheld.' }
                Write-Output $safeLine
            }
            if ($LASTEXITCODE -ne 0) { throw 'Local backend startup exited unsuccessfully; no migration repair/retry.' }
        } finally {
            Remove-Item Env:SPRING_CONFIG_LOCATION,Env:SPRING_PROFILES_ACTIVE -ErrorAction SilentlyContinue
            if ($Action -eq 'ProvisionAdmin') { foreach ($credentialName in @('DEV_ADMIN_EMAIL','DEV_ADMIN_PASSWORD','DEV_ADMIN_NAME','DEV_ADMIN_PHONE')) { [Environment]::SetEnvironmentVariable($credentialName, $null, 'Process') } }
        }
    }
} finally { Pop-Location }
