# Isolated local test environment

## Current Windows startup and database status — 2026-10-25

Verified on2026-10-25: actual/source **V15**, pending0/failed0, checksums valid;
real backend/frontend/API proxy startup passed. See the
[execution report](../reports/2026-10-25_local-startup-migration-workflow_report.md).
Always run Status for the current state rather than relying on this dated note.

From the repository root:

```powershell
.\scripts\local-dev.ps1
```

Database status only (read-only, no administrator credentials or services):

```powershell
.\scripts\local-dev.ps1 -Action Status
```

Both commands pin every connection to **127.0.0.1:5432/smartcinema_phase4e_test**.
They print installed/source Flyway versions, pending filenames, failed migrations
and real Flyway history/checksum validation. The source head is discovered from
the migration directory; no manual V15/V16 version setting is required.
Missing, changed, failed or future applied migrations stop startup. Only pending
source migrations are allowed during pre-migration validation; they must all be
installed before Spring Boot starts. No clean/repair/baseline or retry is used.

If pending migrations exist, review the displayed files and enter **MIGRATE**.
On first use, enter the **existing local PostgreSQL administrator** credentials
at the secure prompt. They are stored separately in ignored
`backend/.env.local-test-migration`, protected by an owner-only Windows ACL.
The file has Java-properties `url`, `user` and `password` fields; it must never
target another server/database. It is not an application environment file.
`-ApproveMigrations` is available only for an already explicitly approved operation;
it does not invent credentials or elevate roles. Future pending batches require
a new interactive confirmation when using the normal command.

The administrator installs migrations in a short-lived standalone Flyway process.
The only extra local runtime provisioning statement grants EXECUTE on the
protected ADMIN Concession wrapper to `smartcinema_phase4e_app`, whose database
ACL is separate from the shared runtime role. No role membership, owner CREATE,
table DML, raw configure grant, seed, account provisioning or external integration
is performed. The original local role-snapshot/isolation preflight remains active.

If the database is current, migration is skipped and the administrator file is not
loaded. Spring Boot receives a generated, owner-only `target/local-dev/private/runtime.properties`
profile with **app credentials for both datasource and read-only Flyway validation**.
No administrator credentials reach Spring. Provider/delivery/cleanup stay disabled;
remote `.env` is never imported. Existing private base inputs are not overwritten.

Spring Boot binds8080, Next.js binds3000, both on127.0.0.1. Readiness requires actual
backend public GET, frontend HTTP200 and matching API proxy response, not just an
open port. A clear READY line reports final database/source versions and all three
checks. Press Ctrl+C to stop the supervised services; a child failure stops its
siblings. Busy ports are reported without killing an existing process. PostgreSQL
itself must already be running; this script never creates/resets a database.

Required installed tools: Windows PowerShell, Java21/Javac, Maven, Node22+, pnpm,
the repository's existing dependencies and PostgreSQL. Dependency classpath is
resolved from the current POM using Maven offline, then cached under target;
missing cached dependencies produce an explicit error rather than auto-installing.
Console migration errors preserve the underlying cause with credential redaction.
After any uncertain result, run Status and inspect it; do not replay a failed
migration blindly. Interrupted startup does not undo committed migrations.

This workflow implements the user's separately approved local administrator
migration access and supersedes the **historical blocked V15 startup** notes
below. It does not itself run feature tests or grant owner membership.

## ADMIN Concession verification — 2026-10-26

The test-only `LocalConcessionTestSupport` now uses the existing private operator
connection for approved fixture/audit setup. Concession commands continue through
the restricted app connection; app and migrator are explicitly checked to have
no protected-owner SET authority or role membership. Every connection is pinned
to this database. Pre-existing rows/history/guards are checked after each class.

Only after explicit approval for the synthetic fixture/audit/fault-trigger scope,
start the normal local application, then from `backend/` run:

```powershell
$env:ADMIN_CONCESSION_DB_TESTS = 'true'
$env:ADMIN_CONCESSION_OPERATOR_APPROVED = 'true'
try {
    mvn -o '-Dtest=AdminConcessionPostgresTests,AdminConcessionHttpPostgresTests' test
} finally {
    Remove-Item Env:ADMIN_CONCESSION_DB_TESTS,Env:ADMIN_CONCESSION_OPERATOR_APPROVED
}
```

There are12 SQL cases and3 unmocked HTTP cases. Real HTTP login uses the existing
approved synthetic ADMIN credential file; new wrong-role/blocked/Customer accounts
are synthetic fixtures. JSON evidence contains method/path/status only, never
passwords/tokens/response bodies. Fixtures are retained; only the test's own new
unreferenced deleted-actor User and temporary item-scoped fault trigger/function
are removed. No role grants, guard disabling, migration, financial success or
Ticket issuance is performed. Do not run older PostgreSQL suites that manufacture
PAID/SUCCESS/issued Ticket fixtures as part of this verification.

## Phase 5B-1 migration preflight — 2026-10-25

Backend source now includes V15 ADMIN Concession commands; the actual dedicated database remains **V14**. V15 was **not applied**. Read-only preflight verified the exact target and restricted runtime/migration identities, then found `pg_has_role(migration_user,'smart_cinema_hold_owner','SET')=false`. No role/grant/bootstrap or data change was attempted. See the [implementation report](../reports/2026-10-25_admin-concession-management-backend_report.md).

The base launcher now reports sourceV15/databaseV14 as `PENDING_NOT_APPLIED`; Start/ProvisionAdmin stop before Spring/Flyway when required protected-owner authority is absent. After an approved migration, startup also requires the dedicated runtime's narrow wrapper EXECUTE grant. Do not use another launcher/root command or superuser to bypass this block. A DBA/operator must review approved migration execution and the one database-scoped runtime grant; preserve existing roles/records and V1–V14. No permanent owner membership or raw deployment configure grant is needed for application runtime.

`LocalConcessionVerification.java verify` is read-only and prints no credentials. Its `prepare` action creates only an ignored owner-ACL private unit-test profile under backend/target; it does not prepare/reset/provision a database. Current non-DB verification used that profile and `mvn '-Dtest=*Tests,!*PostgresTests' verify`:169 PASS,0 failures/errors/skips. PostgreSQL suites were explicitly excluded/BLOCKED, not counted as passed. New opt-in AdminConcessionPostgresTests requires an already verified/applied V15 and narrow runtime permission; it never runs migration, modifies roles, disables guards or creates financial outcomes. If separately enabled after review, it retains its synthetic local records and removes only its own unreferenced deleted-actor fixture/new fault-trigger/function; no existing history cleanup.

Historical V14 preparation/onboarding notes below remain preserved. Their completion does not establish current V15 runtime readiness.

Prepared2026-10-15 for Phase4E readiness. This is separate from the unchanged remote configuration in `backend/.env`. **Use these launchers, not root `pnpm dev`, for the local test database.**

## Completed Staff onboarding update — 2026-10-15

**PHASE4E ONBOARDING E2E VERIFIED** with real local Mailpit/HTTPS/browser/backend: one delivered invitation, public204, consumed-token400, separate ADMIN Activate200, actual STAFF login200, future-scope exclusion/RBAC403, ADMIN Block200, existing-token operational403 and fresh-login401. [Onboarding report](../reports/2026-10-15_staff-onboarding-local-e2e_report.md). Staff2 now remains BLOCKED with passwordSetupCompleted=true; future assignment1 is unchanged. Prior partial/empty-data notes below are historical.

New `backend/scripts/local-staff-onboarding.ps1` supports Prepare/Verify/Mailpit/Start. Prepare already created ignored ACL-restricted `.env.local-test-onboarding`, identical to base except delivery=true and local-onboarding profile. Base `.env.local-test` remains unchanged/deliveryfalse. The source-launched test bootstrap enables the real delivery scheduler while Hold cleanup/VNPAY stay disabled; it verifies the actual loopback SMTP/Mailpit before launch. It uses the existing portable Mailpit and cached backend runtime classes/dependencies, without installation or remote env import.

For separately authorized future local inspection, start `-Action Mailpit`, then `-Action Start`; separately run the unchanged frontend local launcher and `node scripts/local-onboarding-https.mjs` from frontend. Mailpit binds127.0.0.1:1027/8027; HTTPS proxy8443 forwards only to3000 and includes Next dev WebSocket support and activation no-store/no-referrer headers. Private TLS key/certificate/capture data remain under `backend/target/staff-onboarding-local-e2e-2026-10-15/private/`; no OS trust was installed. Certificate lifetime is two days. Read the report's exact manual certificate review instructions before opening invitation links.

Synthetic Staff credentials are only in ignored ACL-restricted `.env.local-test-staff`; never paste them, raw captured MIME/links or session data into logs/reports/screenshots. `staff-onboarding-local-e2e.mjs` is a completed guarded one-shot workflow, not a resettable seed. Its preflight/delivered recovery modes stop once any password attempt begins. Do not replay it against the completed account or clear its journal. Positive Ticket Check-in was NOT RUN; no issued Booking/Ticket was fabricated. All four test processes were stopped; PostgreSQL and minimal data/private capture were retained.

## Identity and credentials

### Authenticated testing update — 2026-10-15

The explicitly authorized real Phase4E test has now provisioned one ACTIVE synthetic ADMIN (ID1), one BLOCKED synthetic STAFF (ID2) and one ACTIVE synthetic Cinema (ID1). Assignment1 remains ACTIVE with future original effectiveAt; two invitations are revoked, delivery attempts0. This supersedes the historical empty-data readiness description below. See the [real integration report](../reports/2026-10-15_admin-staff-management-real-local-integration_report.md).

`local-test-environment.ps1 -Action ProvisionAdmin` is an explicit local-only wrapper of the existing DevelopmentAdminApplication/Service. It verifies isolation first and generates or reads ignored, ACL-restricted `.env.local-test-admin`, then passes input privately through temporary process variables; it does not promote/reset existing accounts. Provisioning has completed: do not rerun merely for readiness. `-Action Audit` performs only dedicated-database read-only metadata queries and never reads invitation tokens/digests/payloads. Normal Verify now checks cluster role catalogues from the dedicated database, without opening the local postgres maintenance database.

The real browser harness is `frontend/scripts/phase4e-local-integration.mjs`. With both services running, `node scripts/phase4e-local-integration.mjs read` from frontend verifies local isolation and logs in normally using the private synthetic ADMIN input. It reads Staff/Cinema state and opens/cancels dialogs, without Staff/Cinema mutations. Authentication still creates its normal session records. Evidence stays in ignored `frontend/target/phase4e-real-local-2026-10-15/`.

`write`, `continue` and `block` were explicit one-shot phases for this authorized test and refuse replay using the existing journal. Do not delete the journal or reset the database to rerun them. Actual SMTP/password setup/activation/Check-in remain unverified; mail delivery must stay disabled until separately authorized. Both application services were stopped after the real test.

- PostgreSQL: `127.0.0.1:5432`.
- Dedicated database: `smartcinema_phase4e_test`, public schema, V14.
- Runtime login: `smartcinema_phase4e_app`, no superuser/CREATEDB/CREATEROLE/replication/BYPASSRLS, no protected-owner or shared runtime-role membership.
- Migration login/database owner: `smartcinema_phase4e_migrator`, now NOSUPERUSER/NOCREATEDB/NOCREATEROLE. Privileged bootstrap was limited to the new migration role during initial unchanged V1–V14 installation.
- Private `backend/.env.local-test` contains independently generated local passwords/JWT/invitation AES key. Git ignores it; its ACL allows the current Windows user. Never print, commit or paste it.

Runtime grants mirror only this database's existing `smart_cinema_hold_runtime` table/column/function ACL, with narrow existing User/Refresh Token authentication permissions, catalogue reads and Flyway-history SELECT. It does not inherit that cluster-wide role's permissions on other databases. Protected financial/Staff/Check-in owners and functions remain unchanged.

## Safe restart commands

Open two PowerShell terminals at repository root:

```powershell
& .\backend\scripts\local-test-environment.ps1 -Action Verify
& .\backend\scripts\local-test-environment.ps1 -Action Start
```

```powershell
& .\frontend\scripts\start-local-test.ps1
```

Backend binds `127.0.0.1:8080`; frontend binds `127.0.0.1:3000`. Frontend process override preserves the existing `/api/v1` rewrite and pins its destination to the local backend. Close with Ctrl+C. Do not invoke `pnpm admin:dev`, seed commands or Staff writes merely to check readiness.

The backend launcher replaces the **whole** Spring ConfigData location with the private local file and sets only profile `local-test`. It does not import backend/.env, use its credentials or fall back remotely. It checks both runtime and Flyway connection hostname, database, physical server address/port, owner and role before application launch. Conflicting Spring/DB/provider/mail/JVM/Maven process overrides fail closed with values withheld. Restart requires all14 successful migrations, five Staff tables and a restricted migration role; changed source migration head requires review. It keeps normal Flyway validation and Hibernate `ddl-auto=validate`.

The launcher depends on the already installed Java21/Maven and PostgreSQL JDBC42.7.13 in the local Maven cache. It does not silently install dependencies or switch a database if they are missing.

## Initial preparation history

These commands have already completed; **do not rerun them as a reset**:

```powershell
& .\backend\scripts\local-test-environment.ps1 -Action Prepare
& .\backend\scripts\local-test-environment.ps1 -Action Start -InitialMigration
# In another terminal, only after successful V14 startup:
& .\backend\scripts\local-test-environment.ps1 -Action RestrictMigration
```

Prepare refuses an existing private config/database/role rather than overwriting it. InitialMigration permits only the newly created empty schema. RestrictMigration reduces only the new migration role's privileges and applies runtime grants only in the new database; it verifies existing role attributes/memberships against the initial snapshot. No clean/repair/baseline/reset command is available. A failure requires inspection; never delete the database/configuration and rerun blindly.

## External effects

- Hold cleanup false excludes the sole `@EnableScheduling` configuration; Staff invitation delivery and all VNPAY confirmation/enabled flags also remain false.
- No remote provider datasource; no Gmail credentials. SMTP target is loopback1027, delivery disabled. Mailpit has not been started; the application does not send mail.
- Invitation configuration has a locally generated AES key and syntactically valid loopback HTTPS target `https://127.0.0.1:8443/staff/activate`. **No HTTPS listener/certificate is installed by this task**; this is not working mail click-through evidence.
- Authentication/authorization are not bypassed. Private JWT signing material is independent of existing remote input. No ADMIN/Staff account or seed/business data has been provisioned.
- Development restart and debug/trace logging are explicitly disabled for backend startup. Frontend telemetry is disabled in its launcher. No secrets go in command arguments.

## Verified readiness and next prerequisites

Real Spring Boot starts with local PostgreSQL18.4 and validates14 migrations/Hibernate. Real GET `/api/v1/genres` returns200 and an empty array, directly and through frontend; unauthenticated Staff GET returns401/no-store both ways. Anonymous Staff List renders the real login guard. User/Cinema counts remain0.

Both application processes were stopped after readiness verification; the dedicated database/configuration persists and PostgreSQL remains running. Start them with the two launcher commands above.

For future authenticated Phase4E testing, separately authorize a dedicated ADMIN's identity/credential setup and its provisioning, a test Staff recipient, and safe Cinema test data if assignments are needed. Mail/password activation additionally requires approved local HTTPS/capture configuration. Do not copy credentials from the remote `.env`, enable Gmail or start a full Staff/Check-in workflow automatically.

See the [dated readiness report](../reports/2026-10-15_isolated-local-postgresql-test-environment_report.md) for actual evidence and limits.
