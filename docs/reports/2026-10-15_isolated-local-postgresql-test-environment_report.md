# Isolated Local PostgreSQL Test Environment

## 1. Task Information

- Date: **2026-10-15**, Asia/Saigon. Type: environment preparation/readiness verification.
- Final status: **LOCAL TEST ENVIRONMENT READY** for migration, application startup, actual proxy and anonymous API checks. Authenticated Staff business workflow is NOT RUN and remains a separate task.
- New dedicated database: **smartcinema_phase4e_test** on **127.0.0.1:5432**, PostgreSQL18.4. Runtime role **smartcinema_phase4e_app**; database owner/migration role **smartcinema_phase4e_migrator**. No passwords/keys/tokens in this report.
- Existing remote Neon connection/settings were not changed or used, including read-only diagnostics. No commit/staging/push/deployment.

## 2. Requested Work

Prepare only a dedicated local environment, preserve existing resources, create a separate fail-closed configuration, apply unchanged migrations through V14 using normal Spring startup, verify real backend/frontend/database and anonymous access. Do not provision ADMIN/Staff, seed catalogue or perform Staff/SMTP/Check-in workflows.

## 3. Documents Reviewed

[AGENTS](../../AGENTS.md), [Development Workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), Backend/Frontend workflows and applicable Coding/Document/Requirement Traceability rules, [project conventions](../development/project-conventions.md), [report template](templates/TASK_REPORT_TEMPLATE.md), frontend-local AGENTS.

[README local workflow](../../README.md#local-development), [ADMIN provisioning](../development/development-admin-provisioning.md), [Staff foundation](../development/staff-onboarding-and-checkin-foundation.md), [Gmail SMTP](../development/gmail-smtp-setup.md), [Staff contract v1.0](../api/staff-invitation-administration-contract-v1.0.md), [prior blocked smoke report](2026-10-14_admin-staff-management-local-integration-smoke-test_report.md), relevant [BRD v1.2](../brd/brd-v1.2.md)/[SRS v1.2](../srs/srs-v1.2.md).

Actual [application properties](../../backend/src/main/resources/application.properties), V1–V14 migration/role/ACL logic, normal Spring Boot entrypoint, authorization, scheduled components and [frontend rewrite](../../frontend/next.config.ts) inspected before setup. Database administrative access used only documented existing localhost defaults read privately from application properties; no remote environment credential import or password guess/reset.

## 4. Requirements Traceability

| Actual requirement / scope | Reconciliation |
|---|---|
| User environment task §§2–7 | PASS: local identity before startup, separate database, no Neon fallback, V14, real proxy, no accounts/seed/workflow |
| BRD BR-002/004; SRS FR-AUTH-007 | PASS preservation and actual anonymous401; authenticated role enforcement not retested |
| SRS NFR-SEC-010/011 | PASS local secret handling/fixed errors; no credentials in arguments/screenshots/report |
| Staff administration contract v1.0 | Existing fields/statuses/security authority preserved; only prerequisites configured, no business command |
| Business workflows/BR assignment/check-in validation | NOT APPLICABLE to environment implementation; NOT RUN as functional tests |

No invented BR/FR/UC/NFR ID or modified business requirement.

## 5. Preparation and Isolation

### Database and privileges

Independent existing psql read-only preflight returned database `postgres`, physical server **127.0.0.1**, port5432, and verified local administrative capability. Proposed database and two login roles did not exist. Created only those new resources, using template0 and independent cryptographically random local credentials. PUBLIC CONNECT/TEMPORARY on the new database and PUBLIC CREATE on its schema were revoked; the runtime role receives only its required connection/schema rights.

The new migration login was temporarily SUPERUSER solely because unchanged migrations transfer ownership to protected cluster NOLOGIN roles and perform guarded grants. The application datasource always used the separate non-superuser runtime role. After successful V14 startup, the new migration login became **NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOREPLICATION/NOBYPASSRLS**. Runtime has the same restrictions and no protected-owner/shared-runtime membership.

Runtime permissions copy existing runtime ACL **only in the dedicated database**, plus narrow User/Refresh Token auth permissions, catalogue reads and Flyway-history SELECT. An initial grant of shared runtime membership to the new role was replaced with these direct database-local grants before final verification, avoiding inherited privileges in other local databases. Existing role attributes and memberships between pre-existing roles match their preflight SHA-256 snapshot. Protected functions/owners and existing databases/schemas/data were not edited or reset.

### Configuration safeguards

Private ignored `backend/.env.local-test` replaces the full ConfigData location, with no imports, literal loopback datasource/Flyway URL and profile `local-test`. It contains locally generated test DB/JWT/AES values; ACL restricted to current Windows user. Existing backend/.env and frontend/.env.local SHA-256 remain unchanged. No global PostgreSQL configuration, HBA, existing role password or production authentication change.

Launcher rejects conflicting Spring/DB/provider/mail/JVM/Maven environment overrides and verifies **both** datasource identities before Maven/Spring startup: exact loopback URL/database, returned server address/port, runtime identity, dedicated database owner and privilege flags. Initial migration requires an empty newly created schema. Restart requires V14/all14 successful rows/five Staff tables/restricted migration role and audited V1–V14 source head; no repair/clean/baseline/reset/fallback action exists.

Hold cleanup false removes the sole scheduling-enabling configuration. Staff delivery false; VNPAY disabled/confirmations false/system datasource blank. SMTP is loopback1027 with no Gmail credentials and sending disabled. Local invitation key and HTTPS loopback target are syntactically configured, without creating any invitation. JVM devtools restart/debug/trace explicitly disabled; frontend telemetry disabled. Secrets are read from the private file, not command-line arguments; launcher redacts secret values from output.

## 6. Files Created

- [LocalTestEnvironment.java](../../backend/scripts/LocalTestEnvironment.java): prepare/preflight/restrict/verify tooling outside application source, fixed local target, role snapshots and guarded grants.
- [local-test-environment.ps1](../../backend/scripts/local-test-environment.ps1): isolated backend startup/actions and conflict/logging safeguards.
- [start-local-test.ps1](../../frontend/scripts/start-local-test.ps1): loopback frontend startup and existing API rewrite override.
- [Local environment guide](../development/local-test-environment.md) and this new dated report.
- **Ignored/private:** backend/.env.local-test; role-state snapshots under backend/target/local-test-environment-2026-10-15.
- **Ignored browser evidence:** [readiness.json](../../frontend/target/local-test-environment-2026-10-15/readiness.json), [anonymous Staff screenshot](../../frontend/target/local-test-environment-2026-10-15/staff-anonymous-local.png), diagnostic Playwright helper under the same target directory.

## 7. Files Modified

Current handoff receives an additive environment milestone. No application Java/React/API source, migration, dependency, existing environment file, historical contract/report or Stitch modification. Incoming Phase4E dirty work preserved. No existing database/schema/role/record deletion or automatic reuse.

## 8. Actual Verification

| Check | Result / evidence |
|---|---|
| Local service/identity | PASS: physical127.0.0.1:5432, dedicated database/owner/role checked through real JDBC connections before startup |
| New database/roles | PASS: absent before setup; created with unique dedicated names, no overwrite |
| Normal initial Flyway migration | PASS: Spring Boot4.1.1 `mvn spring-boot:run`, all V1–V14 applied to new local public schema |
| Flyway history / restart | PASS:14 successful,0 failed; subsequent normal startup validates14 checksums and reports version14/up-to-date |
| Required Staff tables | PASS:5/5 exist; unchanged V13/V14 guards/functions retained |
| Spring/Hibernate/schema | PASS: runtime Hikari connects to local database; ddl-auto=validate and EntityManagerFactory complete; normal restart Started in6.465s, Tomcat8080 |
| Runtime/migration privileges | PASS: no superuser/CREATEDB/CREATEROLE at completion; runtime no protected owner/shared-runtime membership; existing role state unchanged |
| Frontend startup | PASS: existing Next16.3.5 dev command, explicit127.0.0.1:3000, ready in5.1s |
| Actual direct GET8080 `/api/v1/genres` | PASS:200, empty array; real database-backed read |
| Actual proxy GET3000 `/api/v1/genres` | PASS:200, empty array; real Spring proxy connectivity |
| Actual direct/proxy Staff GET without JWT | PASS:401/no-store on both8080/3000, no role bypass or fabricated response |
| Actual browser `/admin/staff` | PASS:HTTP200 and Vietnamese anonymous login guard, inspected1440×1000 PNG; no mock/session injection |
| Environment guard negative check | PASS: conflicting synthetic DB_URL rejected before Java/application startup; no remote connection attempted |
| Data preservation | PASS: Users0/Cinemas0 after checks; no ADMIN/Staff/seed/business command; pre-existing roles/state and ignored environment hashes preserved |
| Outbound verification | Backend established sockets observed only loopback, including its PostgreSQL pool. Neither runtime nor Flyway URL/import can select Neon in this launch; no Neon diagnostic ran |
| External mail/provider/workflow | NOT RUN; disabled, no mail transport or business callbacks invoked |
| Full Maven/frontend regressions | NOT RUN; no application behavior source change. Maven run performs compile/testCompile, not test execution; previous410 backend/230 unit/366 browser counts are historical only |

**Five real browser/HTTP assertions** completed through installed Edge/Playwright without route mocking: direct/proxy catalogue reads, direct/proxy anonymous Staff rejection and anonymous UI. This is environment readiness, not authenticated Phase4E or mail end-to-end success.

After verification, both task-owned application processes were stopped with Ctrl+C. Ports3000/8080 are no longer listening; the pre-existing PostgreSQL service remains running. A final read-only check after teardown still confirms the persisted V14/schema/role/data readiness. Intentional stop exit codes are not startup failures. Use the safe restart commands below when needed.

Two initial tooling issues were fixed before migration: PowerShell executable alias absent (used the existing PowerShell shell's direct script invocation) and inet-to-text retained a mask suffix (normalized using PostgreSQL host()). No migration failure/repair/reset occurred. First startup devtools logging was too verbose; secret output remained redacted, and restart/debug/trace were explicitly disabled for the verified normal restart. Role grants were tightened as described above without business mutations.

## 9. Requirement Reconciliation

**LOCAL TEST ENVIRONMENT READY**: actual local datasource, V14/Hibernate startup, real API proxy and unchanged anonymous authorization verified. No readiness claim for ADMIN/Staff provisioning, invitation delivery, password activation or Check-in. Scope ends at preparation.

## 10. Deviations / Conflicts

No new production/business rule or schema alteration beyond authorized unchanged migrations. Temporary bootstrap privilege was necessary for existing guarded-owner migrations; only the newly created migrator was elevated and then restricted. Dedicated runtime uses database-local direct ACL rather than a cluster-wide shared role. No approval exception or requirement change needed.

Existing historical file names and incoming lint warnings remain unchanged. Default root runner still uses the remote environment; do not use it for local testing. New scripts select an explicit private local configuration instead of overwriting that runner or its settings.

## Convention Compliance

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | scripts folders kebab-case, Java PascalCase file/class, dated kebab-task report |
| Identifiers/property conventions | PASS | English Java/PowerShell identifiers; framework Spring property keys and uppercase process variables |
| Domain/API/status | PASS preservation | no new role/business API/status; existing `/api/v1` rewrite unchanged |
| Database | PASS | dedicated snake_case identifiers; unchanged V1–V14; no destructive commands |
| Secret/environment | PASS | ignored file, restricted ACL, output redaction, fixed target/no remote import |
| Documentation/history | PASS | additive guide/report/handoff; links and UTF-8 checked; historical reports retained |
| Application/source/Git | PASS | application source unchanged; no dependency migration/staging/commit/deploy |

## 11. Remaining Prerequisites

Database contains no ADMIN or Cinema. Authenticated Phase4E requires a separately approved dedicated ADMIN identity/credential/provisioning step, test Staff recipient and safe Cinema test data if assignments are tested. Do not copy DEV_ADMIN credentials from the remote input automatically.

The configured `https://127.0.0.1:8443/staff/activate` is a **local-only test configuration value**, not an operating HTTPS site: no listener/certificate has been installed. SMTP delivery remains disabled; Mailpit/Gmail/password redemption/real Staff admission were not run. HTTPS/capture/mailbox setup needs separate authorization if that later workflow is desired. Local configuration is developer-machine private and not packaged/deployed.

## 12. Exact Safe Restart / Next Step

From repository root, two separate PowerShell terminals:

```powershell
& .\backend\scripts\local-test-environment.ps1 -Action Verify
& .\backend\scripts\local-test-environment.ps1 -Action Start
```

```powershell
& .\frontend\scripts\start-local-test.ps1
```

No secrets in commands. Stop with Ctrl+C. Do not rerun Prepare/InitialMigration as a reset or invoke root pnpm dev/admin:dev/seed:demo for this task. See [guide](../development/local-test-environment.md) for bootstrap history and safety.

Recommended next task: explicitly authorized local ADMIN provisioning and controlled Phase4E authenticated smoke testing against this dedicated database. **Do not begin automatically.**
