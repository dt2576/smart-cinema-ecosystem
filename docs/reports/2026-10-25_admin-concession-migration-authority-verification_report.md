# Phase 5B-2 — Protected migration authority and local PostgreSQL verification

## 1. Task Information

- Date: **2026-10-25**, Asia/Saigon. Module: ADMIN Concession; database integration preparation and read-only verification.
- Decision: **BLOCKED — OPERATOR APPROVAL REQUIRED**.
- Actual database remains **V14**, source head V15. V15 and its runtime grant were **not installed**. PostgreSQL feature tests: **0 executed; all 12 authored cases NOT RUN**, not reported as passing or skipped.
- No privileged connection, SET ROLE, grant/revoke, ownership change, migration, application-data mutation, service startup, seed, Neon connection, financial fixture, commit or deployment occurred.

## 2. Requested Work

Diagnose the protected-migration authority blocker, compare alternatives, prepare a separately reviewable operator procedure, and stop at the user's §3 approval gate. Real mutation/integration verification depends on approval **and completion** of that procedure; this report does not authorize it.

## 3. Documents Reviewed

[AGENTS](../../AGENTS.md), [Development Workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), Backend Workflow, requirement/document/coding rules, [project conventions](../development/project-conventions.md), report template, [current handoff](../ai/current-handoff.md), [local guide](../development/local-test-environment.md), [Phase 5A](2026-10-25_admin-concession-management-preparation_report.md), [Phase 5B-1](2026-10-25_admin-concession-management-backend_report.md), [ADMIN Concession contract v1.0](../api/admin-concession-management-contract-v1.0.md), relevant BRD/SRS v1.2 Concession requirements, database ownership/integrity decisions and existing ADMIN Cinema provisioning guidance.

Source inspected: [V7](../../backend/src/main/resources/db/migration/V7__create_concession_composition.sql), [V10](../../backend/src/main/resources/db/migration/V10__integrate_sandbox_payment_finalization.sql), V13 audit guard, [V14](../../backend/src/main/resources/db/migration/V14__extend_staff_operational_rate_limits.sql), [V15](../../backend/src/main/resources/db/migration/V15__guard_admin_concession_catalog.sql), [LocalTestEnvironment](../../backend/scripts/LocalTestEnvironment.java), PowerShell launcher, [LocalConcessionVerification](../../backend/scripts/LocalConcessionVerification.java), and [12 PostgreSQL tests](../../backend/src/test/java/com/smartcinema/admin/AdminConcessionPostgresTests.java).

## 4. Requirements Traceability

| Requirement/source | Applicable check | Result |
|---|---|---|
| BRD v1.2 BR-065/066/067; SRS v1.2 SR-CONCESSION-01–04 | Preserve catalog compatibility, snapshots, totals and freeze | Source unchanged; existing local Booking/Concession records absent; new behavioral tests BLOCKED |
| SRS v1.2 FR-CONCESSION-001–006 | Existing approved five-endpoint catalog slice | Contract/source preserved; real persistence NOT VERIFIED |
| SRS v1.2 FR-AUDIT-006 | Atomic catalog price/status audit | Ownership/guard reviewed; execution/rollback tests NOT RUN |
| Integrity design v1.0 §2; contract v1.0 §3 | NOLOGIN definer, fixed search_path, narrow runtime EXECUTE, no direct DML | Existing ACL/owner/guard verified read-only; proposed V15 installation remains gated |
| User Phase 5B-2 §§2–4 | Exact local target; explicit approval before privilege operations | PASS; no privileged operation executed |
| User §§5–6 | Twelve real PostgreSQL tests, migration checks, handoff/report | PARTIAL: diagnostic evidence/report complete; migration and tests blocked |

No new requirement IDs or business behavior introduced. No BRD/SRS, API contract or migration source edited.

## 5. Findings and Root Cause

### 5.1 Physical identity and current state

Both existing configuration URLs and both live connections were verified against **127.0.0.1:5432/smartcinema_phase4e_test**, PostgreSQL **18.4**, schema `public`. JDBC `readOnlyMode=always`, connection read-only and server `transaction_read_only=on` were checked before diagnostic queries. Passwords remained in the ignored local properties input; none were printed or supplied on command lines. Remote `.env` was not imported.

| Identity/object | Observed state |
|---|---|
| Database owner / migration login | `smartcinema_phase4e_migrator`; LOGIN, NOINHERIT, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS |
| Runtime | `smartcinema_phase4e_app`; LOGIN, same restricted privilege flags; no protected-owner/shared-runtime membership |
| Protected owner | `smart_cinema_hold_owner`; NOLOGIN, no superuser/CREATEDB/CREATEROLE/replication/BYPASSRLS |
| Shared runtime grant role | `smart_cinema_hold_runtime`; NOLOGIN, same restricted flags |
| Relevant membership edges | **0**: no membership into hold owner/shared runtime, and no memberships of either dedicated login; hence no SET/INHERIT/ADMIN option grant to reuse |
| Migration login capabilities | Database CREATE=true; public USAGE/CREATE=true; SET hold owner=false |
| Protected owner capabilities | public USAGE=true; **public CREATE=false**; database CREATE=false |
| Runtime capabilities | public USAGE=true; public CREATE=false; SET hold owner=false |
| Schema owner | `pg_database_owner`; public USAGE, no public CREATE |
| Flyway | Versions 1–14, **14 successful / 0 failed**; V15 wrapper absent |

`concession_items`, `booking_concessions` and `audit_records` are owned by `smart_cinema_hold_owner`. The deployment function `configure_concession_item(bigint,text,text,text,numeric,text,text)` is SECURITY DEFINER, owned by that role, search_path=`pg_catalog, pg_temp`, with EXECUTE only for its owner. The existing catalog guard is enabled and owned by the same protected role; it is an invoker trigger function. Booking composition and append-only audit guards remain enabled. V13's audit guard explicitly permits the hold owner to insert catalog audit events; runtime is not an authorized substitute.

### 5.2 V15 requires more than the originally reported SET permission

V15 creates one SECURITY DEFINER wrapper, transfers ownership to hold owner, revokes PUBLIC EXECUTE and grants wrapper EXECUTE to the shared runtime role. It performs no catalog/backfill/Booking/financial writes.

For an ordinary non-superuser executor, ownership transfer requires both the ability to SET the target owner and **CREATE for the target owner on the containing schema**. Both are absent here. PostgreSQL explicitly documents the superuser exception to these ownership restrictions. [PostgreSQL 18 ALTER FUNCTION](https://www.postgresql.org/docs/18/sql-alterfunction.html).

Merely granting SET membership is therefore insufficient. The executor must also retain authority for V15's REVOKE/GRANT after transfer. SET capability does not itself switch the execution role; the current migration login is NOINHERIT. [PostgreSQL 18 role membership](https://www.postgresql.org/docs/18/role-membership.html).

**Root cause:** the local environment deliberately restricted its original bootstrap migrator after V1–V14, while V15 now needs a new protected-definition installation. Existing CREATE authority cannot replace protected-owner authority. This is not evidence of a PostgreSQL outage or failed V15 SQL execution: V15 was never executed.

### 5.3 Runtime ACL and separate test-harness dependency

Live ACL inspection found runtime INSERT/UPDATE/DELETE/TRUNCATE on `concession_items` **all false**, raw deployment-function EXECUTE=false, owner SET=false and shared-runtime membership=false. The new wrapper is absent, so its post-install grant cannot yet be verified.

This local environment copies ACLs per database instead of giving its app login shared-role membership. V15 grants the shared role; the dedicated app additionally needs the **one function-level grant in §6.3**. No table DML or raw configure grant is needed.

The 12 authored tests independently require migration-login SET hold owner in `@BeforeAll`, use SET LOCAL ROLE for protected audit reads/fixture initialization, and create/remove a new item-scoped audit fault trigger. Installing V15 alone does **not** satisfy this prerequisite. A grant made just to satisfy those tests would change cluster-wide authority and fail the existing unchanged-role snapshot check. Do not silently remove or bypass either preflight. Approval of the migration procedure below is **not approval of test-time escalation**.

### 5.4 Existing operator workflow

The local guide documents completed initial Prepare/InitialMigration/RestrictMigration, explicitly says not to replay them, and forbids a superuser bypass of the current startup gate. General ADMIN documentation distinguishes privileged deployment and restricted runtime connections, but does not approve an operator identity or V15 installer for this isolated database. No approved reusable operator credential/workflow was identified. No additional credential was searched for or used.

## 6. Proposed Resolution — NOT EXECUTED; Approval Required

### 6.1 Alternatives and recommendation

| Alternative | Assessment |
|---|---|
| Give app protected-owner membership, direct DML or raw configure EXECUTE | REJECTED: violates runtime boundary |
| Permanently elevate migrator or replay historical bootstrap | REJECTED: conflicts with documented restrictions |
| Temporarily grant migrator SET membership plus owner schema CREATE | Not recommended: role membership is cluster-wide; SET alone also misses post-transfer execution authority; changed memberships conflict with existing snapshot preflight. Revocation cannot undo misuse during the exposure window |
| **Separately authorized operator installs unchanged V15 once through Flyway; grants only the dedicated app's wrapper EXECUTE** | **Recommended minimum installation scope**: no existing role attributes/memberships or owner schema CREATE changes; preserves runtime/preflight boundaries |
| Do nothing pending an approved operator | Current safe state; V14 and blocked verification remain |

The recommended route requires an operator who **already has independently approved authority** to create the function, transfer it despite the target owner's missing CREATE, manage its ACL, and append the Flyway history row. In the observed configuration this calls for an explicitly approved privileged DBA session; it does **not** authorize changing either dedicated login to SUPERUSER. No operator identity has been selected or authenticated. If this scope is not acceptable or such an operator is unavailable, keep the database unchanged.

### 6.2 Operator migration action

Required target: exactly the local URL below, `public`, current V14. Required role: the operator identity approved separately by the user/DBA, **not** the app and **not** an escalated migrator. The operator supplies credentials privately; historical bootstrap/discovered environment credentials are not permission to proceed.

Proposed approved workflow is a **standalone Flyway-only process**, using the project's installed Flyway12.4.0/PostgreSQL dependencies, not Spring startup. A reviewable launcher with the following configuration must be prepared after approval; none was created or executed in this task:

```java
// Proposed API sequence; operatorUser/operatorPassword come from approved private input.
// Run with backend as cwd. No Spring application, seed, scheduler or remote .env import.
String url = "jdbc:postgresql://127.0.0.1:5432/smartcinema_phase4e_test?sslmode=disable&connectTimeout=5&socketTimeout=15";
Flyway flyway = Flyway.configure()
    .dataSource(url, operatorUser, operatorPassword)
    .defaultSchema("public").schemas("public").createSchemas(false)
    .locations("filesystem:src/main/resources/db/migration")
    .target("15").outOfOrder(false).baselineOnMigrate(false)
    .cleanDisabled(true).validateOnMigrate(true).skipDefaultCallbacks(true)
    .initSql(targetGuardSql).load();
flyway.validate();
// Require current V14, 14 successes/0 failures, exact reviewed hashes and sole pending V15.
// Abort on any discrepancy; no clean/repair/baseline, command retry or history INSERT.
flyway.migrate();
```

`targetGuardSql` must execute on every Flyway connection; the separately approved launcher must also compare authenticated session identity to the approved operator and recheck the original local preflight/config isolation without weakening it. Guard SQL:

```sql
DO $guard$
BEGIN
 IF current_database() <> 'smartcinema_phase4e_test'
    OR host(inet_server_addr()) IS DISTINCT FROM '127.0.0.1'
    OR inet_server_port() IS DISTINCT FROM 5432
    OR current_schema() IS DISTINCT FROM 'public' THEN
  RAISE EXCEPTION 'Approved local target required';
 END IF;
END $guard$;
```

The only migration SQL to install is the existing [V15 file](../../backend/src/main/resources/db/migration/V15__guard_admin_concession_catalog.sql), SHA-256 **53d706364afc62712633c0416bfc27daa29143aa1b0f1af66b675a7daec6d83a**. Review its CREATE/SECURITY DEFINER/OWNER/REVOKE/GRANT as one forward-only migration. Flyway must manage history and checksum; do not execute the file by hand and manufacture its history entry. Existing restricted startup preflight remains in place and is not used to smuggle operator credentials into Spring.

No GRANT CREATE on public or role-membership change is proposed in this recommended route. The operator's existing elevated authority is used only for the reviewed installation. This is a **new operator procedure proposed for explicit review**, not an already authorized workflow or a claim that a runnable operator tool exists.

### 6.3 Dedicated runtime grant

Only after read-only checks confirm V15 history, unchanged V1–V14 checksums, correct wrapper ownership/SECURITY DEFINER/search_path and no PUBLIC EXECUTE, the same approved operator performs this target-guarded transaction:

```sql
BEGIN;
DO $guard$
BEGIN
 IF current_database() <> 'smartcinema_phase4e_test'
    OR host(inet_server_addr()) IS DISTINCT FROM '127.0.0.1'
    OR inet_server_port() IS DISTINCT FROM 5432 THEN
  RAISE EXCEPTION 'Approved local target required';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.flyway_schema_history
                WHERE version='15' AND success)
    OR EXISTS (SELECT 1 FROM public.flyway_schema_history WHERE NOT success) THEN
  RAISE EXCEPTION 'Verified V15 required';
 END IF;
END $guard$;
GRANT EXECUTE ON FUNCTION public.admin_configure_concession_item(
 bigint,bigint,text,text,text,text,numeric,text
) TO smartcinema_phase4e_app;
COMMIT;
```

Necessity: the dedicated login intentionally does not inherit `smart_cinema_hold_runtime`. Expected change is only EXECUTE on this new wrapper in this database. No WITH GRANT OPTION, default privileges, schema/table privileges, raw configuration access or role membership.

### 6.4 Isolation, recovery and test-operator decision

- Fixed host/port/database and server identity guards apply to every connection; no other database connection, global role mutation or remote fallback. Database-local function/history/ACL changes cannot grant privileges on another database. The operator credential itself is powerful, so process review, target pinning and explicit authorization are still required.
- Take read-only history/ACL/record fingerprints before and after installation. Preserve all existing records and source migrations. Application tables should be unchanged by V15; history adds exactly V15. Preserve a private operator backup if required by local policy; this task did not create one.
- PostgreSQL transactional V15 failure should roll back its function/ACL definition. Inspect real history/function state after any error or lost response; do not assume rollback or auto-replay. Do not repair checksums, delete history or drop data. If V15 committed but the app grant did not, keep services stopped and re-read ACL before an explicitly approved completion action.
- If access must be withdrawn after a committed installation, an operator may **separately approve** `REVOKE EXECUTE ON FUNCTION public.admin_configure_concession_item(bigint,bigint,text,text,text,text,numeric,text) FROM smartcinema_phase4e_app;`. Leave history intact; further corrections use reviewed forward-only changes. No automatic down migration or function drop is proposed.
- **Test authority is a second review item.** The current 12 tests cannot run under unchanged migrator permissions even after operator installation. Recommend reviewing a test-only, operator-managed fixture/audit channel that keeps the existing runtime/migrator identity, isolation, role-snapshot and denied-DML checks intact. Its executable whitelist and cleanup must be reviewed before privileged use. No such channel or test-preflight change is implemented or implicitly approved here. If unavailable, those tests remain BLOCKED; do not grant a cluster-wide owner membership as an automatic workaround.

### 6.5 Read-only verification commands after approved completion

From repository root:

```powershell
& .\backend\scripts\local-test-environment.ps1 -Action Verify
# From backend cwd:
& java --class-path (Join-Path $env:USERPROFILE '.m2/repository/org/postgresql/postgresql/42.7.13/postgresql-42.7.13.jar') ./scripts/LocalConcessionVerification.java verify
```

Target-pinned read-only operator inspection must also run:

```sql
SELECT installed_rank,version,script,checksum,success
FROM public.flyway_schema_history ORDER BY installed_rank;
SELECT p.oid::regprocedure,pg_get_userbyid(p.proowner),p.prosecdef,p.proconfig,p.proacl
FROM pg_proc p
WHERE p.oid=to_regprocedure('public.admin_configure_concession_item(bigint,bigint,text,text,text,text,numeric,text)');
SELECT has_function_privilege('smartcinema_phase4e_app',
 'public.admin_configure_concession_item(bigint,bigint,text,text,text,text,numeric,text)','EXECUTE'),
 has_function_privilege('smartcinema_phase4e_app',
 'public.configure_concession_item(bigint,text,text,text,numeric,text,text)','EXECUTE');
SELECT has_table_privilege('smartcinema_phase4e_app','public.concession_items','INSERT'),
 has_table_privilege('smartcinema_phase4e_app','public.concession_items','UPDATE'),
 has_table_privilege('smartcinema_phase4e_app','public.concession_items','DELETE'),
 has_table_privilege('smartcinema_phase4e_app','public.concession_items','TRUNCATE'),
 pg_has_role('smartcinema_phase4e_app','smart_cinema_hold_owner','SET');
```

Expected: history V1–V15 successful, original checksums identical; wrapper hold-owner/definer/safe search_path, PUBLIC absent, app EXECUTE=true; raw configure=false; all four DML privileges and owner SET=false; original role membership/attributes unchanged. Compare record fingerprints and enabled guards as well. Do not invoke mutation functions merely to check ACL.

## 7. Files Created / Modified and Actual Operations

- Created this report; prepended one additive entry to [current handoff](../ai/current-handoff.md), preserving all earlier text.
- Created an **ignored diagnostic artifact**, [ReadOnlyAuthority.java](../../backend/target/phase5b2-authority-2026-10-25/ReadOnlyAuthority.java), under existing backend/target. It accepts no arbitrary target, reads only the dedicated local config, verifies physical identity/read-only mode and performs SELECTs only; no SET ROLE or privilege command. Its record output contains only counts/server-side hashes, no row content, invitation data or credentials.
- Existing source, helpers, environment inputs, tests, migrations, contracts and historical reports unchanged. No app/backend/frontend code changes and no Git index operation.
- Actual DB operations: read-only connections/SELECTs and transaction rollback/close only. **No operator action was authorized or performed.**

## 8. Verification Evidence

| Check / command | Actual result |
|---|---|
| Existing PowerShell `-Action Verify` | PASS: exact local target, V14/14 successful/0 failed, five Staff tables, existing-role snapshot unchanged |
| Existing `LocalConcessionVerification.java verify` | PASS for both restricted local identities; missing SET authority confirmed |
| Additional read-only diagnostic | PASS after correcting a diagnostic-only table-name lookup; full final results retained |
| V1–V14 source/history comparison | **14/14 checksum matches**; calculated with UTF-8 line CRC32, checked against installed Flyway12.4.0 ChecksumCalculator bytecode; this is not a Flyway migrate/validate execution |
| Existing data | Users2, Cinemas1, refresh_tokens10; staff_onboarding1, staff_invitations3, cinema_assignments1; Concession items/lines, Bookings/Seats/Holds, Payments and Tickets all0 |
| Data preservation | Repeated read-only fingerprints/counts and history/owner/ACL/membership outputs unchanged; no historical Booking snapshot exists locally to exercise preservation behavior |
| Audit records | Ownership/ACL/guard metadata inspected; row count/fingerprint unavailable to the two restricted identities; no elevation for inspection |
| V15 migration / protected wrapper runtime command | **NOT RUN — approval gate** |
| Authored PostgreSQL tests | **0 executed / 12 NOT RUN**; no passing, failing or skipped-test count fabricated |
| Typecheck/lint/build/non-DB regression | NOT RUN in this documentation/diagnostic phase; no application source change. Prior 169/169 is historical Phase5B-1 evidence only |
| HTTP/browser/frontend/provider/Neon | NOT RUN; outside authorized diagnostic stage |

Evidence: [initial read-only metadata](../../backend/target/phase5b2-authority-2026-10-25/read-only-before.log), [expanded final diagnostic](../../backend/target/phase5b2-authority-2026-10-25/read-only-expanded.log), [repeat diagnostic](../../backend/target/phase5b2-authority-2026-10-25/read-only-after.log). These are ignored local artifacts, not a committed evidence archive. Initial expanded lookup incorrectly used `user_cinema_assignments`; the SELECT failed read-only, then the helper was corrected to actual `cinema_assignments` with an existence guard. It caused no database write or permission change.

After installation and separately approved test-authority resolution, execute exactly the 12 opt-in cases with `ADMIN_CONCESSION_DB_TESTS=true` and `mvn '-Dtest=AdminConcessionPostgresTests' test` from backend, under the documented explicit local ConfigData isolation. Keep legacy PostgreSQL suites that fabricate PAID/SUCCESS/Tickets excluded. Safe regression selection must be source-reviewed first. Do not run the present test command now: its V15/authority preflight is unsatisfied.

## 9. Requirement Reconciliation

PASS: read-only diagnosis, exact target, real identity/ACL/owner/checksum findings, no secret exposure, existing guards/data/roles preserved, concrete operator proposal and approval stop. PARTIAL/BLOCKED: V15 execution, new wrapper ownership/ACL postconditions, audit rollback, actual ADMIN/public API persistence, snapshots/freeze/concurrency and 12 real PostgreSQL cases. No claim of backend verification or frontend readiness.

## 10. Deviations / Conflicts

- The original Phase5B-1 SET-only blocker description was incomplete: protected owner schema CREATE is also missing. Historical report preserved; new finding documented here.
- Current tests' protected fixture/audit authority conflicts with unchanged migration-role membership. This must be resolved through a reviewed verification workflow; it is not runtime authority and does not justify widening application rights.
- Existing bootstrap/general root commands are historical or use a different configuration path; not approved for this task. No exceptions to database safety were approved. Legacy filenames/formatting retained without renaming unrelated files.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md), including this report.

| Area | Result | Evidence |
|---|---|---|
| Folder/file/document naming | PASS | New dated lowercase kebab-case report; existing handoff path; diagnostic PascalCase Java under ignored target |
| Code naming | PASS | Java diagnostic English names; no production change |
| Domain terminology/status/API | PASS | Existing Concession/Booking/Payment identifiers and contracts preserved; no new API/status |
| Database naming/security | PASS | Existing snake_case objects; SQL is an unexecuted reviewed proposal, no role/data mutations |
| Documentation preservation/links | PASS | New report, additive handoff; historical reports/requirements unchanged; links checked |
| Source/unrelated work preservation | PASS | All 821 input files unchanged except additive handoff; empty index preserved |

## 11. Remaining Risks and Frontend Readiness

V15 SQL behavior is still unexecuted, and the real catalog audit/concurrency/freeze guarantees are unverified. Approved operator credentials/workflow are unavailable. Twelve-test execution also needs a separately reviewed protected fixture/audit authority path. Empty local Booking data cannot establish historical snapshot compatibility through observation. The existing ACL snapshot/preflight must continue to reject unapproved elevation. **Frontend design readiness is not granted by this phase.**

## 12. Next Recommended Step

Request explicit approval for **§6.2–6.3 operator-only V15 installation and the single database-local app EXECUTE grant**, with the operator identity/access method supplied safely. Separately review the test-authority issue in §6.4 before promising all 12 tests can run. No permission is inferred from credentials, elapsed time or this report. Keep the database at V14 and stop pending approval; do not start frontend, Stitch, VNPAY or deployment.
