# Isolated local test environment

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
