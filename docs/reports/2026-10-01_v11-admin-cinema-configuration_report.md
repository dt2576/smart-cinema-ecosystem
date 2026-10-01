# Smart Cinema implementation report — V11 Admin configuration

## 1. Task Information

Task: V11 Guarded Admin Cinema/Hall/Seat Configuration + Admin Management.
Date: 2026-10-01 task entry; completed 2026-10-02 (Asia/Ho_Chi_Minh).
Module: Admin physical configuration, backend/PostgreSQL/frontend.
Type: Implementation, migration, regression and live development verification.
Status: COMPLETE — implementation, automated regression, live Neon and documentation verification PASS.

## 2. Requested Work

Implement the approved Cinema → Hall → whole Seat Unit hierarchy through guarded
V11 writers and real Admin APIs/forms. Preserve V1–V10, seeds, transactional
history, capacity and concurrency. Fix the existing transient-loading browser
test deterministically. Verify all automated checks before normal Neon rollout.
No Showtime Management, Delete, domain repricing or Payment changes.

## 3. Documents Reviewed

- [Development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md),
  [conventions](../development/project-conventions.md), backend/frontend workflows,
  coding/document/traceability/UI rules and frontend-local AGENTS/Next page guide.
- [Current handoff](../ai/current-handoff.md), [project context](../ai/project-context.md),
  [live Admin preflight](2026-10-01_live-neon-admin-and-cinema-management-preflight_report.md).
- [SRS v1.2](../srs/srs-v1.2.md) §§3.3/3.5, [BRD v1.2](../brd/brd-v1.2.md)
  Cinema/Hall/Seat rules, [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md),
  [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx).
- [Dictionary](../db/physical-data-dictionary-v1.0.md), [database decisions](../db/database-design-decisions-v1.0.md),
  [integrity design](../db/integrity-enforcement-design-v1.0.md) and [V10 addendum](../db/integrity-enforcement-design-v1.2.md).
- V1–V10, actual V5 guards/initializers, current Discovery/Hold/Booking/Payment
  implementations and demo seed; [Discovery](../api/customer-discovery-contract-v1.0.md),
  [Seat/Hold](../api/seat-hold-contract-v1.1.md), [Booking](../api/booking-contract-v1.3.md),
  [Admin Movie contract](../api/admin-movie-contract-v1.0.md).
- Existing Admin shell/design tokens and Stitch inventory: no dedicated approved
  Admin Cinema screen exists, so this extends the existing basic Admin design.

## 4. Requirements Traceability

| Requirement | Source and implementation | Applicable | Result |
|---|---|---|---|
| FR-AUTH-007 | SRS v1.2 §3.1; ADMIN JWT + current ACTIVE database authority | Yes | PASS automated |
| FR-CINEMA-003/004/005 | SRS §3.3; create/full update/status, public visibility | Yes | PASS automated |
| FR-CINEMA-006/007/008 | SRS §3.3; Admin Hall create/edit/status, permanent parent | Yes | PASS automated; Manager slice deferred |
| FR-CINEMA-009 | SRS §3.3; guest-capacity initialization and capacity guard | Yes | PASS automated |
| FR-SEAT-002/003/017 | SRS §3.5; physical config/status and whole approved types | Yes | PASS automated; scoped Manager deferred |
| BR-008–011 | BRD v1.2 §4.3; branch/room/layout management, existing availability guards | Yes | PASS within Admin slice |
| Showtime authoring and unrelated Admin modules | Explicit task exclusions | No | NOT APPLICABLE |

The user approved V11 and the exact slice; no new FR/BR/UC identifiers or BRD/SRS
changes. Capacity and whole COUPLE interpretation come from approved design.

## 5. Implementation Summary

### V11 and privilege boundary

[V11](../../backend/src/main/resources/db/migration/V11__guard_admin_cinema_configuration.sql)
adds only helpers/configuration functions and narrow execution/guard evolution.
No columns, tables, indexes or historical migrations changed. Separate NOLOGIN
configuration definer owns routines, not Seat tables. Existing hold runtime has
only configuration EXECUTE, no direct Seat mutation, owner membership or direct
deployment-initializer EXECUTE. Fixed search_path and schema-qualified bodies
apply in both public deployment and isolated migration-test schemas.

No trigger is dropped/disabled. Deployment-owner INSERT remains compatible; the
Seat trigger permits only the isolated controlled UPDATE path and enforces
identity/reference/capacity invariants. Showtime Seat mutations remain protected.
HTTP never sets an owner role or executes caller SQL.

### Cinema, Hall and Seat

Real JDBC repositories/services/controllers with strict inputs and safe
ProblemDetail errors implement list/detail/create/update/status. Cinema statuses
remain ACTIVE/TEMPORARILY_CLOSED/INACTIVE; Hall and physical Seat statuses remain
ACTIVE/MAINTENANCE/INACTIVE. Hall type is approved configured text. Neither Cinema
nor Hall name uniqueness is invented. No DELETE exists.

Hall belongs permanently to Cinema. Complete empty-Hall initialization delegates
to the protected initializer and rolls back on mismatch/duplicate/invalid layout.
Initialized capacity is immutable. STANDARD/VIP contribute one guest; COUPLE
contributes two as **one row/identity**. Capacity counts every physical unit,
independent of status. No implicit append/removal or half-seat configuration.

Recognized numeric labels/ranges reject overlap and reversed ranges. Opaque labels
retain exact normalized uniqueness; no coordinates or invented geometry model.
Unreferenced metadata edits preserve guest capacity; any Showtime membership/Hold/
Booking Seat reference protects row/number/type. Physical status is still editable.
Existing schedules, origins, financial snapshots, deadlines, sale, Tickets and QR
are never rewritten, cancelled, refunded or repriced as side effects.

Actor → Cinema → Hall-exclusive → Seat ordering serializes configuration before
existing Showtime/Hold/settlement gates. Tests prove competing initialization,
resize versus initialization, and blocked configuration under a held Hall gate.
After-commit actor/resource/action logs match the existing Admin Movie pattern;
rollback never emits successful audit. No payload or credentials are logged.

### Backend endpoints and frontend routes

Exact operations and DTO fields are in the new
[contract](../api/admin-cinema-configuration-contract-v1.0.md).
GET/POST `/api/v1/admin/cinemas`, GET/PUT Cinema detail,
GET/POST Cinema Halls, GET/PUT Hall detail, GET/POST Hall Seats,
GET/PUT Seat detail. IDs remain decimal strings, including above 2^53.
All reads/writes independently require active database Admin authority.

Frontend adds `/admin/cinemas`, `/new`, `/[cinemaId]/edit`,
`/[cinemaId]/halls`, `/[cinemaId]/halls/new`, plus
`/admin/halls/[hallId]/edit` and `/seats`. Reuses verified shell/API/client/design
tokens. Only Cinemas is added beside existing Home/Movies navigation. Responsive
forms and whole-unit grid provide loading/empty/error/retry/saving feedback;
capacity/structural restrictions are visible and independently enforced server-side.

### Playwright synchronization

The old Showtime loading assertion raced the local 350ms adapter. The test now
holds **only adapter timers** using an injected test controller, asserts loading
while the request is held, releases it and checks options. React/navigation timers
remain real. Reload/back context also explicitly releases pending fixture timers.
No production delay, removed assertion or retry masking. A targeted run PASS.
Two new test assertions were scoped to main content to exclude Next's route
announcer; no application alert behavior was weakened.

## 6. Files Created

- [backend/src/main/java/com/smartcinema/admin/AdminConfigurationController.java](../../backend/src/main/java/com/smartcinema/admin/AdminConfigurationController.java)
- [backend/src/main/java/com/smartcinema/admin/AdminConfigurationException.java](../../backend/src/main/java/com/smartcinema/admin/AdminConfigurationException.java)
- [backend/src/main/java/com/smartcinema/admin/AdminConfigurationExceptionHandler.java](../../backend/src/main/java/com/smartcinema/admin/AdminConfigurationExceptionHandler.java)
- [backend/src/main/java/com/smartcinema/admin/AdminConfigurationRepository.java](../../backend/src/main/java/com/smartcinema/admin/AdminConfigurationRepository.java)
- [backend/src/main/java/com/smartcinema/admin/AdminConfigurationRequest.java](../../backend/src/main/java/com/smartcinema/admin/AdminConfigurationRequest.java)
- [backend/src/main/java/com/smartcinema/admin/AdminConfigurationService.java](../../backend/src/main/java/com/smartcinema/admin/AdminConfigurationService.java)
- [backend/src/main/resources/db/migration/V11__guard_admin_cinema_configuration.sql](../../backend/src/main/resources/db/migration/V11__guard_admin_cinema_configuration.sql)
- [backend/src/test/java/com/smartcinema/admin/AdminConfigurationPostgresTests.java](../../backend/src/test/java/com/smartcinema/admin/AdminConfigurationPostgresTests.java)
- [docs/api/admin-cinema-configuration-contract-v1.0.md](../../docs/api/admin-cinema-configuration-contract-v1.0.md)
- [docs/development/admin-cinema-configuration.md](../../docs/development/admin-cinema-configuration.md)
- [docs/reports/2026-10-01_v11-admin-cinema-configuration_report.md](../../docs/reports/2026-10-01_v11-admin-cinema-configuration_report.md)
- [frontend/src/app/admin/cinemas/[cinemaId]/edit/page.tsx](../../frontend/src/app/admin/cinemas/[cinemaId]/edit/page.tsx)
- [frontend/src/app/admin/cinemas/[cinemaId]/halls/new/page.tsx](../../frontend/src/app/admin/cinemas/[cinemaId]/halls/new/page.tsx)
- [frontend/src/app/admin/cinemas/[cinemaId]/halls/page.tsx](../../frontend/src/app/admin/cinemas/[cinemaId]/halls/page.tsx)
- [frontend/src/app/admin/cinemas/new/page.tsx](../../frontend/src/app/admin/cinemas/new/page.tsx)
- [frontend/src/app/admin/cinemas/page.tsx](../../frontend/src/app/admin/cinemas/page.tsx)
- [frontend/src/app/admin/halls/[hallId]/edit/page.tsx](../../frontend/src/app/admin/halls/[hallId]/edit/page.tsx)
- [frontend/src/app/admin/halls/[hallId]/seats/page.tsx](../../frontend/src/app/admin/halls/[hallId]/seats/page.tsx)
- [frontend/src/features/admin/admin-configuration-screen.tsx](../../frontend/src/features/admin/admin-configuration-screen.tsx)
- [frontend/src/features/admin/admin-configuration.test.ts](../../frontend/src/features/admin/admin-configuration.test.ts)
- [frontend/src/features/admin/admin-configuration.types.ts](../../frontend/src/features/admin/admin-configuration.types.ts)
- [frontend/test/e2e/admin-configuration.spec.ts](../../frontend/test/e2e/admin-configuration.spec.ts)

## 7. Files Modified

- [backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java](../../backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java)
- [backend/src/test/java/com/smartcinema/admin/AdminMoviePostgresTests.java](../../backend/src/test/java/com/smartcinema/admin/AdminMoviePostgresTests.java)
- [backend/src/test/java/com/smartcinema/payment/VnpayMigrationPostgresTests.java](../../backend/src/test/java/com/smartcinema/payment/VnpayMigrationPostgresTests.java)
- [backend/src/test/java/com/smartcinema/SmartCinemaApplicationTests.java](../../backend/src/test/java/com/smartcinema/SmartCinemaApplicationTests.java)
- [docs/ai/current-handoff.md](../../docs/ai/current-handoff.md)
- [docs/ai/project-context.md](../../docs/ai/project-context.md)
- [frontend/package.json](../../frontend/package.json)
- [frontend/src/features/admin/admin-api.ts](../../frontend/src/features/admin/admin-api.ts)
- [frontend/src/features/admin/admin-home.tsx](../../frontend/src/features/admin/admin-home.tsx)
- [frontend/src/features/admin/admin-shell.tsx](../../frontend/src/features/admin/admin-shell.tsx)
- [frontend/test/e2e/admin-movies.spec.ts](../../frontend/test/e2e/admin-movies.spec.ts)
- [frontend/test/e2e/showtime-selection.spec.ts](../../frontend/test/e2e/showtime-selection.spec.ts)

The existing preflight report
was present at task entry and remains unchanged. One existing Payment migration
test assertion changes only its latest migration head from 10 to 11; its historical
V9→V10 upgrade/result tests and all Payment application code remain unchanged.

## 8. Verification

| Check | Result / evidence |
|---|---|
| Maven verify | PASS: 278 tests, zero failures/errors/skips; PostgreSQL 18.4, package build; final corrected-V11 run ended 2026-10-02 00:01:20 +07 |
| New Admin PostgreSQL tests | PASS: 13; API/auth/strict input/whole units/status/reference/rollback/permissions/concurrency/upgrade |
| Fresh V11 and populated V10 upgrade | PASS; exactly one forward upgrade, existing rows and ten checksums retained |
| V1–V10 files | PASS; ten task-entry SHA-256 comparisons unchanged, no repair/history rewrite |
| TypeScript | PASS after resolving test-only browser/Node timeout overload typing |
| ESLint | PASS |
| Unit tests | PASS: 57, zero failed/skipped |
| Production build | PASS final current-tree `pnpm build`, exit 0 |
| Full Playwright | PASS: 87/87, installed Edge, one worker, no retries; 8.7 minutes |
| Authorization | PASS automated: anonymous401, CUSTOMER/STAFF/MANAGER403, stale/blocked Admin403; active Admin allowed |
| Direct protected mutation | PASS automated: runtime Seat INSERT/UPDATE/DELETE rejected; no initializer or configuration-owner membership |
| Admin Movie / Customer / seed / Payment / Ticket regression | PASS Maven and full browser regression; live Admin Movie read PASS |
| Real Neon V11 migration | PASS normal `mvn spring-boot:run`, exactly one migration at 2026-10-02 00:02:31 +07; Hibernate validate/startup PASS |
| Live Admin hierarchy / Customer visibility | PASS normal login/JWT and real APIs; details below |
| Real desktop/mobile review | PASS computer-use, 1440×1000 and 390×844, no mobile overflow, keyboard Tab, initialized capacity disabled |
| Development Admin provisioning | PASS `pnpm admin:dev`, UNCHANGED existing account, BUILD SUCCESS |
| Documentation/link/whitespace/handoff | PASS final reconciliation; scope, links, new/modified whitespace and secret checks included |

Early targeted fixture failures used separate clock_timestamp calls and leaked a
test connection search_path after temporary-schema verification. Fixed fixtures
use one statement timestamp and reset their path; final complete Maven verify is
green. These were test issues, not weakened integrity constraints.

### Live Neon evidence and deployment correction

Initial managed-database rollout correctly rolled back: unlike local superuser
verification, the migration principal lacked SET privilege to transfer new
function ownership. The final V11 uses temporary transactional SET/schema-CREATE
bootstrap grants and revokes them before commit. Full Maven verify was rerun
against fresh `smart_cinema_v11_accepted_20261001` before the successful rollout.
Do not repair/reuse the earlier local candidate database as final evidence.

The first Admin create probe then exposed missing inherited hold_runtime access
in the existing development login; it failed before creating a Cinema. Deployment
enrollment in the **existing restricted runtime role**, with INHERIT TRUE and SET
FALSE, resolved execution. No broad Seat grants, owner inheritance/SET access or
application role switching was added. Managed PostgreSQL retained creator ADMIN-
only membership, with inheritance/SET disabled; hold runtime remains entirely
outside the configuration-owner role. Production must use a separate restricted
runtime login rather than development migration credentials.

Normal signed Admin JWT created exactly one hierarchy:

| Record | Live result |
|---|---|
| Cinema | ID `4`, `Verification Cinema 20261002-000800` |
| Hall | ID `7`, `Verification Hall`, parent Cinema `4`, capacity four guests |
| Seat Units | `271` STANDARD, `272` VIP, `273` whole COUPLE `B1-2`; three units/four guests |
| Persistence | Admin detail/layout rereads PASS; capacity 4→5 rejected 409 |
| Public visibility | ACTIVE detail/plain collection PASS; excluded from Movie-filtered collection without Showtime; INACTIVE detail404 |
| Final verification status | Cinema, Hall and all three units INACTIVE; no Delete/Showtime created |
| Seed reads | Normal Admin APIs read all original three Cinemas/six Halls/270 units; every guest total matches Hall |
| Preservation | Read-only pre/post snapshots verify seeded Cinema/Hall/Seat/Showtime/membership and Movie/transactional tables unchanged; V1–V10 checksums unchanged |

Real browser sign-in entered the verified Admin shell, navigated Cinemas → Halls
→ Seats and saved the existing verification COUPLE through the UI. Server reread
preserved one unit/two guests and INACTIVE status. Mobile had no horizontal
overflow; keyboard Tab from Seat row reached Seat number, and initialized Hall
capacity remained disabled. Screenshots are ignored local evidence:
`frontend/test-results/live-neon-admin-seats-desktop.png` and
`frontend/test-results/live-neon-admin-seats-mobile.png`. No intercepted/fake API
was used in live verification. Repeating admin:dev returned UNCHANGED.

## 9. Requirement Reconciliation

Automated, full browser and live evidence PASS for approved Admin configuration
and restrictions. Manager scope, Showtime
management, arbitrary reshape/Delete and other Admin modules remain excluded.

## 10. Deviations / Conflicts

No business-policy or naming exceptions. Existing basic Admin visual design is
extended because Stitch inventory has no dedicated Admin hierarchy reference.
The task explicitly resolves the prior V5 migration authorization block.
Historical contracts/reports and BRD/SRS are preserved. Migration-head test
assertion and Admin navigation count necessarily follow the newly approved slice.
Legacy Auth numeric userId remains a documented pre-existing exception outside
this task; new hierarchy IDs are string-safe.

## Convention Compliance

Validated against [project conventions](../development/project-conventions.md).

| Area | Result | Notes |
|---|---|---|
| Folder/file naming | PASS | Existing Java package, kebab-case feature files; Next dynamic route exception |
| Code/domain terminology | PASS | Cinema/Hall/Seat; existing serialized statuses; whole COUPLE |
| Routes/imports/API | PASS | Resource nouns `/api/v1/admin`; frontend alias; methods/IDs documented |
| Database naming | PASS | Snake_case V11 routines; Flyway filename category preserved |
| Documentation/report | PASS | Correct dated report/versioned contract, final links/whitespace and handoff reconciled |
| Requirements/environment | PASS | No invented IDs, no requirements changes, secrets remain local |

## 11. Known Limitations

- No Showtime management/membership creation through Admin UI; Customer map
  requires future approved schedule membership. Active plain Cinema discovery
  differs from Movie-filtered discovery requiring eligible future Showtimes.
- No layout append/delete/reshape or guest-capacity-changing type edit after
  initialization. Referenced identity remains protected even for past screenings.
- No assigned Manager authoring; no operational maintenance/refund workflow.
- Durable searchable administrative audit retention remains deferred; existing
  after-commit technical audit logs are used. Financial audit persistence unchanged.
- Complete small Admin collections have no pagination/search contract yet.
- No real VNPAY interaction, merchant provisioning, external charge or deployment.
  Existing disabled integration confirmation gates remain unchanged.

## 12. Next Recommended Step

Exact next task: **Admin Showtime Management**. Do not begin
that next slice automatically. Customer downstream mock adapter replacement and
real VNPAY interoperability remain separate tasks.
