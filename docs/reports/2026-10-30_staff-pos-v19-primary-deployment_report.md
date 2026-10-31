# STAFF POS V19 PRIMARY deployment

Date: 2026-10-30. Status: **V19 INSTALLED — STARTUP AND SAFE API CHECKS VERIFIED**.
Positive live STAFF POS transactions remain NOT RUN; no ACTIVE STAFF/test sale was
authorized. The user explicitly approved the complete scoped operation in chat.

## Implementation and actual state

- Promoted the exact tested V19 into
  [normal Flyway migrations](../../backend/src/main/resources/db/migration/V19__enable_staff_counter_sales.sql).
  Removed its previous test-resource location by moving the file, without edits.
  SHA-256: `E528550DD23B4658D4C457E21032EFA3C16F0AE788659A5788E163202CCA0E1E`;
  tested Flyway checksum: `163697808`.
- Updated the migration test's canonical path/evidence folder. Its late-failure
  injection now uses a single isolated migration location and verifies execution
  reaches the injected final statement, avoiding a duplicate-file validation error.
- Reused the established separate-login Flyway installer and prepared its existing
  operator helper for the exact V19 permissions in the
  [current operator plan](../development/neon-staff-pos-v19-migration-plan.md).
  Created the approved temporary login/private owner-only credential file, applied
  the exact narrow grants, installed V19, then revoked only the temporary grants
  and dropped that login/deleted that file. Original role memberships were restored.
- Actual PRIMARY server settings identify project `delicate-moon-53589977`, branch
  `br-frosty-waterfall-b38x5xm2`, endpoint `ep-divine-snow-b3gho69n`, database
  `neondb`, schema `public`. **Installed V19 / source V19**, pending=0, failed=0,
  all 19 checksums valid. Flyway executed exactly one migration at 23:40:28 +07:00;
  the installer reported SQL execution time 0.676s, without retry.

## Verification performed

| Command/evidence | Actual result |
|---|---|
| `pnpm db:migrate --approved` | Actual PRIMARY V19 installed once through independent minimum-privilege login; V19 checksum 163697808 |
| Final `pnpm db:status` | Real PRIMARY, read-only; **V19/V19**, zero pending/failed, all checksums valid |
| `mvn -Dmaven.compiler.useIncrementalCompilation=false verify` with STAFF_POS_DB_TESTS, STAFF_POS_MIGRATION_REVIEW_TESTS and STAFF_POS_INSTALLER_DB_TESTS=true | After-install BUILD SUCCESS; 673 discovered, **304 executed PASS**, 369 existing opt-in skips, zero failures/errors. The pre-install full run also passed |
| V19/POS subset in that complete run | **42/42 PASS**, zero skips: installer 6, populated migration 9, POS PostgreSQL 23, request 4 |
| `pnpm test:dev` | **4/4 PASS**, zero skips; unapproved/invalid-target startup guards remain enforced |
| Root `pnpm dev` before approval | Actual command executed; startup correctly STOPPED at pending-migration guard. Spring Boot/Next.js were not started |
| Root `pnpm dev` after cleanup | **PASS**; migration skipped because schema current, migration credentials not loaded; Spring Boot started, Next.js ready, health monitor confirms backend/frontend/API proxy PASS |
| Real API smoke | **29/29 PASS**: public Customer catalog, ADMIN/MANAGER login/read/logout, separate CASH reporting, existing MANAGER scope, anonymous 401 and wrong-role 403 |
| Real authenticated STAFF POS sale / authenticated Customer owned flow | NOT RUN: no ACTIVE STAFF or approved Customer credentials; no account or financial fixtures created |

Populated isolated PostgreSQL tests cover pre-existing CUSTOMER/VNPAY Bookings,
Tickets/QR/check-in, ADMIN/MANAGER metrics/scope and STAFF CASH, minimal migration
login, data/snapshot preservation, lock timeout, transactional late rollback,
duplicate/replay and protected privilege boundaries. These are LOCAL fixtures,
not PRIMARY transactions or VNPAY Sandbox interoperability.

## Preservation, scope and remaining action

Read-only post-install verification preserves all 27 original table fingerprints,
projecting Booking onto its original 21 columns and comparing only original
V1–V18 history rows. The generated owner matches the existing Customer; constraints
and indexes are valid. All 16 affected/new function definitions match the tested
isolated V19 after schema normalization; old function owners/ACLs remain intact.
Runtime has no new audit SELECT/direct financial DML/internal-finalizer EXECUTE.
Only the three approved permanent grants remain; original role flags/memberships
are unchanged and the temporary login/file no longer exist.

After HTTP smoke: original non-auth data and original auth sessions remain
unchanged; exactly two new ordinary ADMIN/MANAGER login sessions were created and
both revoked by logout. The original 3 Bookings, users, MANAGER 5/Cinema 1 assignment,
Payment/Ticket/audit rows remain intact. No STAFF, counter Booking or payment was
created. Existing CUSTOMER/VNPAY/Ticket financial flows were exercised only in
isolated tests; public Customer APIs and actual ADMIN/MANAGER reads passed live.

No installation blocker remains. The local frontend is running at
`http://localhost:3000`, backend at `http://localhost:8080`. STAFF positive-path
acceptance and provider interoperability need separate authorized test inputs;
they are not inferred from schema readiness, fixture callbacks or zero CASH totals.
Provider backup/restore coverage remains unverified; no backup claim or new
resource/recovery phase is introduced by this deployment continuation.

Files changed in this task: migration move, migration review test, current operator
plan, additive current handoff and this report. Runtime business logic, API
contracts, V1–V18, frontend, dependencies and environment files preserved.

## Convention Compliance

PASS: followed AGENTS/development/backend workflows and
[project conventions](../development/project-conventions.md); conventional Flyway
name, Java test location and dated report. Traceability remains approved BRD v1.3
BR-038/039/044/046/053/059 and SRS v1.3 FR-AUTH-007/008, FR-ORG-005,
FR-REPORT-001/002; no requirements changed. Historical reports retained. No commit,
push, deployment of other modules or frontend implementation.
Final checks: 1,050 unrelated pre-existing files byte-identical; exact V19 move,
three authorized existing-file edits and one new report only. Original handoff
body and Git HEAD/index preserved; UTF-8, relative links, secret scan and diff
checks PASS. Migration credentials are absent from the final working tree.

Evidence: [full regression](../../backend/target/staff-pos-v19-deployment-2026-10-30/backend-verify.log),
[after-install regression](../../backend/target/staff-pos-v19-deployment-2026-10-30/backend-verify-after-install.log),
[installation](../../backend/target/staff-pos-v19-deployment-2026-10-30/flyway-v19-install.log),
[cleanup](../../backend/target/staff-pos-v19-deployment-2026-10-30/operator-cleanup.log),
[final Flyway status](../../backend/target/staff-pos-v19-deployment-2026-10-30/db-status-final.log),
[actual startup](../../backend/target/staff-pos-v19-deployment-2026-10-30/dev-after-install.log),
[29 API checks](../../backend/target/staff-pos-v19-deployment-2026-10-30/real-api-smoke.json),
[post-install preservation](../../backend/target/staff-pos-v19-deployment-2026-10-30/post-migration-verification.log),
[post-HTTP preservation](../../backend/target/staff-pos-v19-deployment-2026-10-30/post-http-preservation.log),
[source preservation](../../backend/target/staff-pos-v19-deployment-2026-10-30/source-preservation.txt).
