[CmdletBinding()]
param(
    [ValidateSet('Start', 'Status', 'Backend', 'Frontend', 'Monitor')]
    [string]$Action = 'Start',
    [switch]$ApproveMigrations
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$projectRoot = Split-Path $PSScriptRoot -Parent
$backendRoot = Join-Path $projectRoot 'backend'
$stateRoot = Join-Path $backendRoot 'target/local-dev'

function Assert-CleanEnvironment {
    $conflicts = @(Get-ChildItem Env: | Where-Object { $_.Value -and $_.Name -match '^(SPRING[._]|DB_|VNPAY_|STAFF_|SMTP_|MAIL_|SEAT_HOLD_|JWT_|SERVER_|DEV_ADMIN_)|^(JAVA_TOOL_OPTIONS|JAVA_OPTS|JDK_JAVA_OPTIONS|MAVEN_OPTS|MAVEN_ARGS)$' })
    if ($conflicts.Count) { throw ('Conflicting process overrides: ' + (($conflicts | Select-Object -ExpandProperty Name) -join ', ') + '; values withheld. Use a clean terminal.') }
}
function Initialize-DatabaseTool {
    New-Item -ItemType Directory -Force -Path $stateRoot | Out-Null
    $classpathPath = Join-Path $stateRoot 'classpath.txt'
    $sources = @((Join-Path $backendRoot 'scripts/LocalDatabase.java'), (Join-Path $backendRoot 'scripts/LocalTestEnvironment.java'))
    $classes = Join-Path $stateRoot 'classes'
    $compiled = Join-Path $classes 'LocalDatabase.class'
    $needsClasspath = -not (Test-Path -LiteralPath $classpathPath)
    if (-not $needsClasspath) { $needsClasspath = (Get-Item (Join-Path $backendRoot 'pom.xml')).LastWriteTimeUtc -gt (Get-Item $classpathPath).LastWriteTimeUtc }
    if ($needsClasspath) {
        & mvn -o -q dependency:build-classpath '-DincludeScope=runtime' '-Dmdep.outputFile=target/local-dev/classpath.txt'
        if ($LASTEXITCODE -ne 0) { throw 'Cannot resolve installed backend dependencies offline. No services or migration started.' }
    }
    $script:databaseClasspath = $classes + ';' + [IO.File]::ReadAllText($classpathPath).Trim()
    $needsCompile = -not (Test-Path -LiteralPath $compiled)
    if (-not $needsCompile) {
        $compiledAt = (Get-Item $compiled).LastWriteTimeUtc
        $needsCompile = @($sources | Where-Object { (Get-Item $_).LastWriteTimeUtc -gt $compiledAt }).Count -gt 0 -or (Get-Item $classpathPath).LastWriteTimeUtc -gt $compiledAt
    }
    if ($needsCompile) {
        New-Item -ItemType Directory -Force -Path $classes | Out-Null
        & javac -encoding UTF-8 -cp ([IO.File]::ReadAllText($classpathPath).Trim()) -d $classes @sources
        if ($LASTEXITCODE -ne 0) { throw 'Local database tool compilation failed; no services or migration started.' }
    }
}
function Invoke-DatabaseTool([string[]]$ToolArguments) {
    & java -cp $script:databaseClasspath LocalDatabase @ToolArguments
    if ($LASTEXITCODE -ne 0) { throw 'Database check/migration failed. See the exact diagnostic above; application startup stopped.' }
}
function Read-Status { return (Get-Content -Raw -LiteralPath (Join-Path $stateRoot 'status.json') | ConvertFrom-Json) }
function ConvertTo-PropertyValue([string]$Value) {
    return $Value.Replace('\', '\\').Replace("`r", '\r').Replace("`n", '\n').Replace('=', '\=').Replace(':', '\:').Replace(' ', '\ ')
}
function Ensure-MigrationCredential {
    $credentialPath = Join-Path $backendRoot '.env.local-test-migration'
    if (Test-Path -LiteralPath $credentialPath) { return }
    Write-Host 'First use only: existing LOCAL PostgreSQL administrator. Credentials stay in an ignored owner-only file; never used by Spring Boot.'
    $operatorName = Read-Host 'Administrator username (Enter for postgres)'
    if (-not $operatorName) { $operatorName = 'postgres' }
    $securePassword = Read-Host 'Existing local administrator password' -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    try {
        $operatorPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        if (-not $operatorPassword) { throw 'An existing administrator password is required; no password was invented.' }
        # Create and restrict the file before writing any credential, never overwrite an existing input.
        $stream = [IO.File]::Open($credentialPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
        $stream.Dispose()
        $identity = [Security.Principal.WindowsIdentity]::GetCurrent().User
        $acl = New-Object Security.AccessControl.FileSecurity
        $acl.SetOwner($identity)
        $acl.SetAccessRuleProtection($true, $false)
        $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', 'Allow')))
        Set-Acl -LiteralPath $credentialPath -AclObject $acl
        [IO.File]::WriteAllLines($credentialPath, @(
            'url=jdbc\:postgresql\://127.0.0.1\:5432/smartcinema_phase4e_test?sslmode\=disable&connectTimeout\=5&socketTimeout\=15',
            ('user=' + (ConvertTo-PropertyValue $operatorName)),
            ('password=' + (ConvertTo-PropertyValue $operatorPassword))
        ), (New-Object Text.UTF8Encoding($false)))
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        $operatorPassword = $null
        $securePassword.Dispose()
    }
}

Push-Location $backendRoot
try {
    Assert-CleanEnvironment
    if ($Action -eq 'Frontend') {
        & (Join-Path $projectRoot 'frontend/scripts/start-local-test.ps1')
        return
    }
    if ($Action -eq 'Monitor') {
        $deadline = [DateTime]::UtcNow.AddSeconds(180)
        $ready = $false
        while ([DateTime]::UtcNow -lt $deadline) {
            try {
                $backend = Invoke-WebRequest 'http://127.0.0.1:8080/api/v1/genres' -UseBasicParsing -TimeoutSec 3
                $frontend = Invoke-WebRequest 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 5
                $proxy = Invoke-WebRequest 'http://127.0.0.1:3000/api/v1/genres' -UseBasicParsing -TimeoutSec 3
                if ($backend.StatusCode -eq 200 -and $frontend.StatusCode -eq 200 -and $proxy.StatusCode -eq 200 -and $backend.Content.Trim() -eq $proxy.Content.Trim()) { $ready = $true; break }
            } catch { }
            Start-Sleep -Seconds 1
        }
        if (-not $ready) { throw 'Service readiness timed out: backend/frontend/proxy did not all return successful real HTTP responses.' }
        $status = Read-Status
        Write-Host "READY: DATABASE=$($status.installed); SOURCE=$($status.latest); PENDING=$($status.pending); FAILED=$($status.failed)"
        Write-Host 'BACKEND=PASS http://127.0.0.1:8080; FRONTEND=PASS http://127.0.0.1:3000; REAL_API_PROXY=PASS'
        Write-Host 'Smart Cinema is running. Ctrl+C stops all three supervised processes.'
        while ($true) { Start-Sleep -Seconds 5 }
    }
    Initialize-DatabaseTool
    Invoke-DatabaseTool @('status')
    if ($Action -eq 'Status') { return }
    $status = Read-Status
    if ($Action -eq 'Backend') {
        if ($status.pending -ne 0 -or $status.runtimeGrantNeeded) { throw 'Backend worker requires a fully migrated database and runtime grant. Run the main startup command.' }
        Invoke-DatabaseTool @('runtime-profile')
        $runtimePath = Join-Path $stateRoot 'private/runtime.properties'
        $secretValues = [IO.File]::ReadAllLines($runtimePath) | Where-Object { $_ -match '^[^#]*(password|secret|encryption-keys)=' } | ForEach-Object { (($_ -split '=', 2)[1]).Replace('\:', ':').Replace('\=', '=') }
        $env:SPRING_CONFIG_LOCATION = ([Uri]$runtimePath).AbsoluteUri + '[.properties]'
        $env:SPRING_PROFILES_ACTIVE = 'local-test'
        try {
            & mvn spring-boot:run '-Dspring-boot.run.jvmArguments=-Dspring.devtools.restart.enabled=false -Ddebug=false -Dtrace=false -Dlogging.level.root=INFO' 2>&1 | ForEach-Object {
                $line = $_.ToString()
                foreach ($secretValue in $secretValues) { if ($secretValue) { $line = $line.Replace($secretValue, '<redacted>') } }
                if ($line -match 'Using generated security password:') { $line = 'Generated security credential withheld.' }
                Write-Output $line
            }
            if ($LASTEXITCODE -ne 0) { throw 'Spring Boot exited unsuccessfully; other local services will stop.' }
        } finally { Remove-Item Env:SPRING_CONFIG_LOCATION,Env:SPRING_PROFILES_ACTIVE -ErrorAction SilentlyContinue }
        return
    }
    $occupied = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in @(8080, 3000) })
    if ($occupied.Count) { throw 'Port 8080 or 3000 is already in use. Stop the existing service; this command will not kill an unrelated process.' }
    if ($status.pending -gt 0 -or $status.runtimeGrantNeeded) {
        Write-Host 'Privileged plan: apply the displayed pending Flyway files in this database; grant protected Concession/Promotion wrapper EXECUTE and Promotion SELECT to the local app when installed. No direct catalog DML, role changes, reset or repair.'
        if (-not $ApproveMigrations) {
            $confirmation = Read-Host 'Type MIGRATE to authorize this local migration operation, or Enter to stop'
            if ($confirmation -cne 'MIGRATE') { throw 'Migration not authorized; no privileged operation or service startup performed.' }
        }
        Ensure-MigrationCredential
        Invoke-DatabaseTool @('migrate', '--approved')
    } else {
        Invoke-DatabaseTool @('migrate')
    }
    Set-Location $projectRoot
    # Node's existing concurrently API avoids PowerShell 5.1 splitting nested Windows quotes.
    & node (Join-Path $PSScriptRoot 'local-dev-runner.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'A supervised local service exited. Review its diagnostic above; all owned services were stopped.' }
} finally { Pop-Location }
