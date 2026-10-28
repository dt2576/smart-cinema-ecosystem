# Current AI handoff

## PRIMARY Neon startup repair - 2026-10-28 - PASS

[Report](../reports/2026-10-28_neon-flyway-v14-startup-fix_report.md),
[operator SQL/workflow and approval history](../development/neon-migration-workflow.md).
PRIMARY Neon `neondb` is now **V18/V18, pending 0, failed 0, all 18 checksums valid**.
V14 ownership failure came from Staff owner membership lacking INHERIT/SET;
Configuration owner had the same migration-authority gap. Protected ownership
and original runtime privileges remain intact. No local database substitution.

Project startup now checks PRIMARY connectivity/history/checksums before launching
Spring/Next. `pnpm db:status` reports real state; normal `pnpm dev` skips migration
when current and verifies actual backend/frontend/API-proxy readiness. Pending DDL
requires a separate reviewed operator connection and `pnpm db:migrate --approved`.
Spring Flyway stays enabled/read-only. No clean/repair/baseline or automatic retry.

User explicitly approved the documented temporary-role/grant/install/cleanup plan.
Two approved SCRAM-verifier setup attempts failed at COMMIT and fully rolled back;
Neon reported that password input must be plaintext. A separately approved third
setup used a privately generated password over required-TLS JDBC with server SCRAM
storage; logging settings were checked, not changed. Setup PASS. One Flyway run
installed original V14-V18 in order. Cleanup PASS: temporary login/credential file
removed, temporary grants revoked, original role/membership/schema ACL restored.
No runtime owner membership expansion, historical migration edit or business DML.

**Verification:** startup CLI negative tests 4/4 PASS; protected-function checks
7/7 PASS; actual `pnpm dev` Spring/Next/proxy READY; real Edge/HTTP smoke 7/7 groups
PASS, 15 responses, 0 browser errors. Existing PRIMARY ADMIN login/identity/logout,
anonymous Manager 401, ADMIN-to-Manager 403 and safe forbidden UI verified.
PRIMARY has 1 ACTIVE ADMIN, 3 ACTIVE CUSTOMER and no MANAGER: positive assigned-
Manager workflow NOT RUN; no account/assignment was created to manufacture proof.
Full Maven/frontend feature regressions NOT RUN for this startup-only repair.

All 26 original business-table fingerprints matched after migration/cleanup.
After normal auth smoke, original refresh rows still matched; exactly one new
session was created and revoked by logout. Other business rows, original history,
function ACL and roles/schema remained preserved. Migration-defined routines and
five new history entries are the intended changes. Provider/mail and expired-Hold
cleanup were disabled only in the QA process environment, not persistently edited.
Owned QA services stopped afterward. Private smoke-auth input deleted.

Scope: 4 original files modified, 5 new files; 953/957 originals unchanged;
V1-V18, frontend, HEAD/index preserved. No commit/push/deployment. Primary evidence
is independent of prior local-test reports. Requested repair complete; do not
start another feature or recreate migration authority on the current database.

## MANAGER Staff Management frontend — 2026-10-28

**PASS — scoped Staff assignment UI implemented and verified.**
[Report](../reports/2026-10-28_manager-staff-management-frontend_report.md),
[existing API v1.0](../api/manager-staff-management-contract-v1.0.md).
Existing `/manager/staff` and Cinema Staff list extended with history, effective
date, local filters and detail links. Added
`/manager/cinemas/[cinemaId]/staff/[staffId]`, minimal profile and scoped history;
assign-to-another-owned-Cinema, deactivate and reactivate dialogs. Existing five
Staff reads/writes integrated with strict bigint/parent/receipt validation.
Current/future/inactive assignments are distinct; immutable timestamps, other
memberships and account state preserved. No global Staff account/invitation/HR
controls. Existing ADMIN Staff source and Manager operations remain unchanged.
Manager navigation and exact detail login resume updated; backend is authority.
No optimistic status or automatic writes/retries; per-tab ID-only review hints,
owned source/destination reads and explicit acknowledgement recover uncertain writes.

**306/306 unit PASS** (287+19); typecheck/build PASS; lint0 errors,12 existing
warnings in ignored historical audit scripts. **160/160 selected Edge regression
PASS in one complete run**,135 baseline+25 new,0 failures/skips/retries.
Initial63/65 plus selector-label fix and affected2/2 are documented in the report.
**12 real functional groups +15 screen/width checks PASS**,390/768/1440,112 real
management responses,0 browser errors. Real login/resume, current/future writes,
other-membership integrity, same-JWT revocation, foreign404, ADMIN preservation
and role denial tested separately from HTTP fixtures.

Local workflow/startup/proxy PASS; installed/source **V18**,pending0,failed0,
18 valid checksums; no migration or grant changes. Approved fresh QA only; managed
Staff protected invitation intent/revocation, delivery disabled. Original23-table
rows/history/functions/ACL/roles/financial/catalog counts preserved. Fresh QA
fixtures retained; no operational account/assignment or financial data changes.
Backend/API/migrations/Stitch/auth implementation/env/dependencies unchanged.
Owned services stopped after QA. No Neon/SMTP/provider, commit/push/deploy.
Backend Maven and unrelated full cross-module browser suite NOT RUN for this slice.
Do not start another module automatically.
Final scope/encoding/links/whitespace PASS:6 scoped original edits,8 new files,
943/949 originals byte-identical; HEAD/index unchanged. Ports8080/3000/3100 free;
after-shutdown database preservation PASS.

## MANAGER Staff Management backend — 2026-10-28

**PASS — scoped Staff assignment backend implemented and verified.**
[Report](../reports/2026-10-28_manager-staff-management-backend_report.md),
[API v1.0](../api/manager-staff-management-contract-v1.0.md).
Four additive routes under `/api/v1/manager/cinemas/{cinemaId}`: GET
`/staff-assignments`, GET `/staff/{staffId}`, POST
`/staff/{staffId}/cinema-assignments`, PUT
`/staff/{staffId}/cinema-assignments/{assignmentId}/status`.
Minimal profile and Cinema-specific history; existing current-only Staff GET
unchanged. Source Staff relation and destination Manager scope independently
checked; exact assignment path prevents multi-Cinema escalation. Canonical string
IDs, immutable effectiveAt/history, future semantics and no automatic account
activation. No global directory, invitation/account/profile/status/role writes by
Manager; initial unrelated Staff placement stays ADMIN. No frontend implemented.

User explicitly approved V18/operator/new QA scope before mutations. Existing local
postgres installed forward-onlyV18, private shared Staff assignment core plus
Manager wrapper; existing ADMIN authorization/owner/ACL preserved. App received
only EXECUTE on new wrapper, not internal core/DML/owner authority. Original domain
body exact; other original functions/guards unchanged. Final installed/source
**V18**,pending0,failed0,18 valid checksums. Actual backend/frontend/API proxy health
PASS. No changes to startup/env/schema tables/roles/memberships or V1–V17.

**243 distinct selected tests PASS =227 non-DB +12 real PostgreSQL +4 real HTTP**,
0 failures/errors/skips;216 baseline plus27 new. Initial11 SQL cases included in12,
not counted twice.68 real management HTTP calls with signed JWT; foreign/nested,
wrong-role/blocked/future/revoked scope, duplicates, rollback/audit and actual
revocation lock orderings verified. ADMIN reissue/private password/activation
regression passed; delivery disabled and no email success fabricated.
Original23-table rows/history/financial counts/roles/ACL preserved except approved
ADMIN wrapper body; new QA fixtures retained. No Hold/Booking/Payment/Ticket data
created. Full historical destructive PostgreSQL suites/frontend tests NOT RUN for
this backend slice. No Neon, Stitch, frontend, commit/push/deploy. Next Manager
Staff frontend scope requires separate approval; do not start another module.
Owned backend/frontend startup stopped after verification; ports8080/3000 closed.
After-shutdown preservation PASS. Final scope/UTF-8/links/whitespace checks PASS;
935 original files unchanged,3 original files modified,11 new; HEAD/index unchanged.

## MANAGER Cinema Operations frontend — 2026-10-28

**IMPLEMENTED & VERIFIED — PASS for the requested frontend slice.**
[Report](../reports/2026-10-28_manager-cinema-operations-frontend_report.md).
Five Manager interfaces plus ADMIN Manager Assignment implemented. `/manager`
redirects to `/manager/cinemas`; scoped Cinema/Hall dialogs, operational whole-Seat
grid/initial layout/maintenance, Showtime list/new/edit, read-only Cinema Staff.
`/admin/managers` belongs to AdminShell only. All15 Manager+4 ADMIN assignment
endpoints integrated exactly; public Movie and existing ADMIN Cinema GETs reused.
Shared Nocturne tokens/types/validators/dialogs/auth retained; optional dialog
initialFocus, Manager account-menu entry and strict role-specific login resume.
Backend current account/assignment remains authorization authority. IDs/money are
strings, time input uses server zone/explicit assignmentGMT+7, immutable instants
and frozen structures preserved. No optimistic writes or automatic replay;
uncertain commands require authenticated manual GET review, including reload hints.

Typecheck/lint/build PASS, **287/287 unit PASS** (269+18new),0 skips.
**Final complete selected regression:135/135 PASS in one Edge run**,2026-10-28,
2.4 minutes,1 worker,0 failures/skips/retries,exit0. Includes all88 ADMIN cases,
21 Manager cases,shared UI foundation and Customer final QA. No code/test/config
fix required in the closing verification. This supersedes the earlier134/135 plus
ADMIN Movie9/9 limitation; prior failures/fixes remain in the report as history.
**14 real functional groups PASS**,136 recorded Manager/ADMIN responses across
completed stages; **21 real screen/width checks PASS** at390/768/1440 with keyboard,
dialog/focus/overflow and≥44px/≥16px Manager primary controls. Fixture-backed adverse
and positive Staff scenarios remain separate; real scoped Staff list was empty.

Normal local workflow/backend/frontend/proxy PASS. Installed/source **V17**,pending0,
failed0,17 valid checksums. Approved fresh QA fixture scope reused; four synthetic
role accounts,two Cinemas,new Hall/layout/Showtime and assignments retained. Only
new QA assignments/configuration changed; original23-table rows/history/functions/
roles and financial/catalog counts unchanged. No Hold/Booking/Payment/Ticket
creation, Neon, provider/SMTP, schema/migration/backend/API/env/dependency change.
No commit/push/deploy. Full cross-module browser suite/backend Maven NOT RUN for
this frontend slice. Manager Staff writes/Booking/Reporting/Dashboard remain
excluded. Do not automatically start another module; require separate scope.
QA processes stopped;8080/3000/3100 free. Final read-only DB preservation and
scope/UTF-8/link/whitespace checks PASS:905/913 original files unchanged,8 scoped
original edits,25 new files;backend/contracts/V1–V17 and Git HEAD/index preserved.

## MANAGER Cinema Operations backend — 2026-10-28

**IMPLEMENTED & VERIFIED — PASS for the approved backend slice.**
[Report](../reports/2026-10-27_manager-cinema-operations-backend_report.md),
[API contract](../api/manager-cinema-operations-contract-v1.0.md).
Implementation/tests2026-10-27; final status/preservation and documentation2026-10-28.
15 MANAGER operations: assigned Cinema reads, Hall/layout/Seat management,
Showtime list/detail/create/update and scoped read-only current Staff. Four minimal
ADMIN operations list existing MANAGER accounts and grant/list/deactivate/reactivate
Cinema assignments. No Manager account creation, Cinema/Movie authoring, Staff
mutation, Booking history, reporting/dashboard or frontend added.

JWT role plus current ACTIVE account/effective ACTIVE MANAGER assignment enforced
in scoped queries and locked protected writers. Missing effective scope403;
foreign/nonexistent resource404 after valid scope. Future grants do not authorize
immediate access; revoke/reassign/blocked-account checks work with existing JWT.
Assignment identity/type/effectiveAt immutable; history retained. Canonical positive
bigint-string IDs, exact decimal strings, existing Hall/Seat/Showtime rules reused.
Shared read-only REPEATABLE READ; writes lock/recheck scope and append atomic audit.

User explicitly approved V17 and fresh labeled QA fixture scope before privileged
operations. Existing private local postgres installed forward-onlyV17 and granted
runtime only EXECUTE on new Manager assignment wrapper; no new role/membership,
runtime direct DML or owner authority. Final installed/source **V17**,pending0,
failed0,17 valid checksums. Original23-table rows/V1–V16 history/financial counts/
role attributes/memberships preserved; only five approved existing function bodies
changed plus additive protected helpers. Fresh QA accounts/catalog/assignments and
unpaid Booking retained; no PAID/SUCCESS/Ticket/provider evidence fabricated.

Actual final **216 non-DB +13 PostgreSQL +5 real HTTP =234 distinct PASS**,
zero final failures/errors/skips;197 baseline plus37 new. Stronger two-case lock
rerun included in13. Signed-JWT HTTP suite115 calls exercises all19 endpoints,
foreign/nested/role/status/revocation/validation cases and existing ADMIN behavior.
Actual local backend/frontend/proxy startup verified via existing workflow;
startup when alreadyV17 applies no further migration. Initial fixture/Mockito
failures fixed and rerun without guard bypass or retry masking; details in report.
Full historical destructive PostgreSQL suites and frontend tests NOT RUN for this
backend slice. No Neon, new database, historical migration edit, unrelated source
change, staging/commit/push/deploy. No further feature automatically authorized.

## ADMIN Reporting & Dashboard frontend — 2026-10-27

**IMPLEMENTED & VERIFIED — PASS.**
[Report](../reports/2026-10-27_admin-reporting-dashboard-frontend_report.md).
Real `/admin` Dashboard and `/admin/reports`, all4 existing GET APIs,4/5 respective
KPI cards, dynamic Vietnamese Today/7days/month-to-date, inclusive form dates mapped
to half-open API boundaries, URL/reload recovery, daily chart with accessible table,
CINEMA/MOVIE/SHOWTIME paginated breakdowns. Exact strings for amounts/counts/IDs;
BigInt only for bounded chart geometry, no financial inference. Null occupancy is
unavailable, not zero. Typed response/period/page checks, existing authenticated
AdminShell gate, abort/stale protection, manual retry and safe feedback. One new
Reporting navigation link; old quick-navigation Dashboard replaced. No unsupported
sync/forecast/exports. Nocturne/shared primitives and Vietnamese copy preserved.

Actual final **269/269 unit PASS** (256 baseline+13 new), typecheck/build PASS,
lint0 errors/12 historical artifact warnings; **88/88 distinct ADMIN Playwright
PASS** (67 existing+21 new), final focused21/21 included, not additional. No skips
or retry masking; initial harness failures documented. Actual local browser:
**12/12 groups PASS**,53 ADMIN GET200 responses,9 final masked screenshots,
390/768/1440px,≥44px targets/≥16px primary controls/focus/overflow checks, real
pagination and Dashboard/Reporting agreement. Positive amounts/error/role fixtures
are separate from real evidence. Local real revenue remains0; no financial fixtures
persisted. V16 source/installed,16 checksums valid, no pending/failed migration;
16-table/Flyway/function row hashes preserved. Normal approved ADMIN login only
adds refresh-session state. Source backend/auth/configuration, DB, Stitch, Manager,
deployment and Git index/HEAD unchanged. No commit/push. Existing native date
format follows OS; applied range is explicit DD/MM/YYYY. No provider/real-positive
financial proof or full cross-module browser/Maven rerun claimed for this task.
Next feature requires separate selection; do not proceed automatically.

## ADMIN Reporting & Dashboard backend — 2026-10-27

**IMPLEMENTED & VERIFIED — PASS (backend API slice).**
[Report](../reports/2026-10-27_admin-reporting-dashboard-backend_report.md),
[API contract](../api/admin-reporting-dashboard-contract-v1.0.md).
Four ADMIN GETs: `/api/v1/admin/dashboard`, `/api/v1/admin/reports/summary`,
`/api/v1/admin/reports/daily`, `/api/v1/admin/reports/breakdowns` with
CINEMA/MOVIE/SHOWTIME dimensions. Shared exact aggregation, half-open Vietnamese
calendar periods, intersected bigint filters, bounded paging, current ACTIVE ADMIN
check and read-only REPEATABLE READ. Existing mutation locking checks unchanged.
Revenue requires coherent PAID issuance plus verified, non-reconciliation SUCCESS;
response explicitly SANDBOX. Booking amounts stay frozen, Concession amount is
gross before Booking discount. Occupancy uses Showtime-date frozen Seat Units,
separate from payment-date sales. No financial finalization or refund inference.

Actual local startup/backend/frontend/proxy PASS; installed/source **V16**, no
pending/failed migration,16 checksums valid; no operator credentials or grants.
Final **197 non-DB +12 read-only PostgreSQL +3 real HTTP tests =212 distinct PASS**,
zero final failures/errors/skips.187 baseline preserved. Financial-positive cases
are isolated VALUES CTE SELECT fixtures, never persisted PAID/SUCCESS/Ticket data.
Live October data:20 created Bookings,20 Showtimes,20 sellable units, zero revenue/
issued Tickets.30 real authenticated/invalid/anonymous GET checks; no business writes.
16-table row hashes/Flyway/function definitions preserved. Normal ADMIN login only
adds refresh-session state. Live wrong-role logins were not provisioned; MVC role
security plus actual current-account SQL denial verified. Small-data EXPLAIN only,
production load and positive operational financial proof remain unverified.

No frontend, Manager, Stitch, schema/migration/configuration, Neon, deployment,
staging/commit/push. Next task requires review and separate approval; do not start
Dashboard/Reporting frontend automatically. Earlier handoff entries remain historical.

## ADMIN Promotion Management frontend — 2026-10-27

**IMPLEMENTED & VERIFIED — PASS.** [Report](../reports/2026-10-27_admin-promotion-management-frontend_report.md).
Four real `/admin/promotions` list/new/detail/edit routes, five existing APIs, one
AdminShell link, simplified Vietnamese Nocturne UI. Existing components/auth reused;
no campaign/analytics/preview/delete/pagination/technical fields. Code immutable,
status changes separate, conditional percentage cap, exact amounts/string IDs,
Vietnamese GMT+7 dates with original seconds/microseconds retained when unchanged.
Explicit locked commands/no replay, typed receipts/safe errors, per-tab untrusted
review hints, authenticated GET/manual acknowledgment after uncertain outcomes.

Read-only Stitch recheck: List/Detail exports updated,Create old,Edit mixed/legacy2025.
Approved screenshot/UX fallback used immediately; no Computer Use or more Stitch edits.
Final typecheck/lint/build PASS (0lint errors/12 historical warnings), **256/256 unit
PASS**, **69/69 existing +16/16 final new browser cases PASS** (85distinct selected,
not full suite), **9/9 actual local browser groups PASS** with33 screenshots and
390/768/1440 keyboard/focus/≥44px/16px/overflow checks. Historical initial datetime/
generated-cache/test-focus failures disclosed; no skips/retries masking.

Real UI retained one synthetic Promotion **37**, `QAUI-20261027-047E1B95`, ACTIVE,
FIXED_AMOUNT12345.6789. Create/edit/disable/enable plus final no-op date round-trip
verified; all32 original Promotion records unchanged. Real five-API workflow is
separate from adverse HTTP fixtures. No Booking/Payment/Ticket/provider mutation.
Actual/sourceV16,pending0/failed0/checksums/old-role snapshot valid. QA services stopped.
No backend/migration/configuration/privilege/Stitch/environment change, Neon, new
dependency, staging/commit/push/deploy. Historical reports/incoming work preserved.
Full Playwright/backend regression and physical AT not run; no version/idempotency
capability invented. Stop; no further module automatically.

## ADMIN Promotion Management backend — 2026-10-27

**PASS.** [Implementation report](../reports/2026-10-27_admin-promotion-management-backend_report.md),
[verified contract v1.0](../api/admin-promotion-management-contract-v1.0.md).
Five real `/api/v1/admin/promotions` list/detail/create/term-update/status APIs;
current ACTIVE ADMIN checked in service and protected actor-aware command. Existing
two discount types, immutable unique code, global PAID-count policy, exact amounts,
period/minimum/cap/status, Customer snapshots and first-attempt freeze preserved.
No delete, stacking, new eligibility, Customer features or financial writer.

User explicitly approved V16/local operator/labelled fixture/audit-fault scope before
privileged execution. Existing Windows workflow installed exactly V16; actual/source
V16, pending0/failed0/checksums valid; migration application-data fingerprint unchanged.
Wrapper owned hold owner, fixed search_path, no PUBLIC execution; app only wrapper
EXECUTE/Promotion SELECT, raw configure/direct DML/owner SET denied. No role changes,
reset or historical migration edits. Startup commands remain unchanged; narrow local
wrapper readiness/provisioning extended. Concession fixture head check now discovers
source versions, preserving compatibility without manual V15/V16 tracking.

Final **187/187 non-DB +13/13 Promotion PostgreSQL +3/3 real HTTP +12/12 existing
Concession PostgreSQL PASS**,215 distinct selected tests, zero final failures/errors/
skips; JAR build PASS. Final HTTP batch74 actual requests, all five APIs, real backend
login/current blocked-role denial, validation/precision/audit, Customer ownership,
changed-terms review then real INITIATED/freeze. SQL verifies audit rollback/two actual
row-lock races/policy boundaries/snapshots/original expiry. First SQL/HTTP batches also
passed; final16 rerun follows helper correction. Historical test compilation/context
setup failures are disclosed, no skip/retry masking. Full legacy backend/financial
fixture suites and frontend regression not run in this backend-only task.

Spring8080/Next3000/real proxy startup PASS; QA services stopped, listeners0. Final
read-only totals32 Promotions/20 Bookings/8 Payments/0 Tickets, PAID0/SUCCESS0; approved
synthetic fixtures retained, original table rows/history/guards and old-role snapshot
preserved. Usage helper count tests are not actual PAID redemption/provider proof.
No Neon, SMTP/provider activation, frontend/Stitch implementation, staging/commit/
push/deploy. HEAD/index preserved. Next separate task may implement ADMIN Promotion
frontend using the verified contract; do not start automatically.

## ADMIN Concession Management frontend — 2026-10-27

**PASS.** [Implementation report](../reports/2026-10-27_admin-concession-management-frontend_report.md). Four real routes under `/admin/concession-items` (list/new/detail/edit), Bắp nước navigation, exact five verified APIs. Simple Vietnamese essential fields/actions, local name/category filtering/pagination, decimal-string prices and explicit initial status; content edit excludes status/image/read-only fields. Existing AdminShell/shared components/Nocturne preserved, no unsupported SKU/POS/stock/VAT/analytics/upload/delete.

Four live Stitch HTML/PNG references inspected read-only: list849d5f08b7e54d56a59a8f0152b41133, create d5e4ffdc8faa4059825865bff9c4845c, edit5d4cbea69e224a5d8de48dbdb4756792, detail c67f51f62d9b4a538e7279968a226385. Adapted for390/768/1440 without prototype state boards. Two accessible confirmation dialogs, focus/keyboard/≥44px feature controls, contextual loading/empty/errors. Typed validated receipts, bounded explicit writes/no replay, per-tab untrusted review hints, GET/manual acknowledgement for uncertainty. Unknown create outcome still requires manual list review; no idempotency or guessed identity.

Final tsc/lint/build PASS (lint0 errors/12 historical ignored-script warnings); **242/242 unit PASS** (230 retained +12), **13/13 new +75/75 relevant existing Playwright PASS**, no retries/skips. Full Playwright suite not run. **7/7 actual local browser groups PASS**, all five endpoints against PostgreSQLV15 plus read-only polish check.18 initial responsive screenshots +3 final form captures; real focus/overflow/touch-target checks at all widths. One retained UI test product ID36, `QA Bắp nước 2026-10-27 c5a843b9`, ACTIVE/65000.4321; four successful explicit writes, pre-existing catalog records identical. Customer public visibility checked before/after status changes.

Existing local workflow used unchanged; post-check V15/sourceV15/pending0/failed0, checksums/role snapshot valid. No backend/migration/operator fixture change, new dependency, Neon, deployment, staging/commit/push. Existing unrelated staged Staff work preserved. Auth credentials/tokens not exported in evidence; QA app processes stopped after verification, DB/test product remain. Stop; no next module automatically.

## ADMIN Concession backend verification — completed 2026-10-27

**PASS.** [Report](../reports/2026-10-27_admin-concession-backend-verification_report.md); tests executed26/10, completion rechecked27/10 after interruption. Existing local startup used unchanged. All five ADMIN endpoints verified against real server/PostgreSQL, including exact price bounds, duplicate names, validation, anonymous/tampered401, CUSTOMER/STAFF/MANAGER/current blocked ADMIN403, no-op and durable audit.

**12/12 PostgreSQL +3/3 HTTP +169/169 regression PASS**, no final failures/errors/skips; JAR build PASS. HTTP passes are2-case batch plus affected1-case Customer pass,99 real requests. Customer POST/PATCH/DELETE, ownership404, snapshots after catalog change/deactivation, original expiry, inactive ADD409 and permanent INITIATED freeze409 verified. Audit fault rollback and two actual row-lock races passed. Initial harness errors and sandbox-stalled regression are disclosed, not hidden by retries.

User explicitly approved fixture/audit/fault-trigger/new-unreferenced-actor scope before operator access. New test-only LocalConcessionTestSupport uses existing private operator input; Concession commands/runtime remain restricted, both app/migrator without owner SET/membership. Original rows/history/guard fingerprints and role snapshot preserved; no grants, guard disabling or migration. Fixed fixture clock drift, test HTTP negotiation and Ticket assertion join; production business implementation unchanged.

Final read-only check27/10: actual/sourceV15, pending0/failed0/checksums valid, memberships0. Retained counts35 Concession items/4 lines/5 Bookings/3 INITIATED Payments/0 Tickets; PAID Bookings0/SUCCESS Payments0. QA services no longer listen on3000/8080; database/fixtures remain. Changes limited to three test files, test guide, handoff and report. No startup rewrite, frontend feature, contract/migration/environment change, Neon, new environment, reset, seed, commit/push/deploy. Historical fixture-permission blocker below is resolved for the explicitly approved opt-in test workflow. Stop; frontend/design only on a new request.

## Windows local startup/migration workflow — 2026-10-25

**IMPLEMENTED AND VERIFIED for startup scope.** [Report](../reports/2026-10-25_local-startup-migration-workflow_report.md), [current guide](../development/local-test-environment.md). From root run `.\scripts\local-dev.ps1`; database-only status is `.\scripts\local-dev.ps1 -Action Status`. Both pin127.0.0.1:5432/smartcinema_phase4e_test; source head is discovered dynamically and real Flyway history/checksums/pending/failed files are shown. Pending batches require MIGRATE confirmation; current schema starts without loading administrator credentials.

User explicitly approved existing local postgres/private credential input/V15/narrow app EXECUTE **before privileged access**. Standalone Flyway applied exactly1 migration; actual/source **V15**, pending0/failed0, checksum886021656; V1–V14 unchanged. All application-table fingerprint unchanged across migration, original-role snapshot unchanged, relevant memberships0. Protected owner/definer/search_path/ACL verified; runtime direct catalog DML/raw configure/owner SET remain denied. No role elevation, owner CREATE or bootstrap replay. Admin input is ignored `.env.local-test-migration`, owner-only ACL; generated Spring profile uses app credentials/read-only Flyway only. Base environments unchanged; remote .env never imported.

Three successful current-schema service starts, real backend/frontend/proxy HTTP readiness, anonymous ADMIN401 and real Edge page PASS. Service-failure supervision and Ctrl+C free both ports. Three safe negative checks PASS: datasource override, unapproved migration and copied-fixture checksum mismatch. Windows quoting defect fixed via existing concurrently Node API; no new dependency. QA services stopped after verification; PostgreSQL/data remain. No full regression or twelve protected PostgreSQL feature-test claim: their separate fixture/audit authority remains unresolved and runtime was not expanded for them.

Changes limited to tooling/docs/report, preserving incoming work and V1–V15/business source/history. No Neon, financial outcome, reset, seed, new DB/role, frontend feature, staging/commit/push/deploy. Earlier Phase5B-2 blocked installation finding below is historical; startup/migration is now resolved. Stop after this task.

## Phase 5B-2 protected migration authority — 2026-10-25

**BLOCKED — OPERATOR APPROVAL REQUIRED.** [Diagnostic report and exact operator proposal](../reports/2026-10-25_admin-concession-migration-authority-verification_report.md). Read-only connections independently verified PostgreSQL18.4 at127.0.0.1:5432/smartcinema_phase4e_test, restricted app/migrator identities, V14/14 successful/0 failed and14/14 source/history checksum matches. V15 wrapper is absent. Additional root cause: migrator SET hold owner=false **and protected owner public CREATE=false**; SET membership alone would not resolve ordinary ownership transfer. Runtime Concession INSERT/UPDATE/DELETE/TRUNCATE/raw configure EXECUTE/owner SET remain false, relevant memberships0, guards enabled, existing-role snapshot unchanged.

Recommended minimum installation is a **separately authorized operator-only Flyway V15 operation**, followed by one database-scoped app wrapper EXECUTE grant. No permanent/temporary migrator elevation, owner CREATE, shared-runtime membership, old bootstrap replay or startup-preflight bypass is authorized. No approved operator identity/workflow has been supplied; the proposed standalone installer is not implemented or executed. Existing private credentials are not permission to escalate.

Separate verification issue: the12 authored PostgreSQL tests currently require migrator SET owner for protected audit/fixtures/fault-trigger work; V15 installation alone will not make them runnable. Review an operator-managed test authority path separately, keeping existing isolation/role/denied-DML preflights intact. **0 PostgreSQL tests executed;12 NOT RUN**. Prior169 non-DB passes are historical only. Do not grant membership automatically or run financial-fixture suites.

Repeated read-only data/history/ACL fingerprints unchanged; Users2/Cinemas1, existing Staff onboarding/invitation/assignment history retained; Concession/Booking/Payment/Ticket tables inspected are empty, so snapshot preservation is not behaviorally verified. Only this additive handoff, a new report and ignored read-only diagnostic artifacts were created/updated. All application source, migrations, tests, environments and earlier reports preserved. No DB/privilege mutation, service start, Neon, seed, financial outcome, frontend/Stitch/provider work, staging/commit/push/deploy. **STOP pending explicit approval of the concrete operator plan; backend/frontend readiness not granted.**

## Phase 5B-1 ADMIN Concession backend — 2026-10-25

**IMPLEMENTED WITH BLOCKED VERIFICATION.** [Implementation report](../reports/2026-10-25_admin-concession-management-backend_report.md), [published contract v1.0](../api/admin-concession-management-contract-v1.0.md). Source implements five ADMIN list/detail/create/content-update/status endpoints, scoped strict UTF-8/duplicate-key parser, exact prices/string IDs, no-store/safe errors and narrow Bearer CSRF matcher. Existing images preserved/new null, explicit status, three flat categories, duplicate names/no DELETE, no-op/no audit and documented last-write-wins/no idempotency. V15 source adds actor-aware hold-owner wrapper reusing deployment configure internally plus atomic catalog audit; no Customer snapshots/freeze/expiry/pricing logic changed.

Final selected **non-DB** `mvn '-Dtest=*Tests,!*PostgresTests' verify`:169/169 PASS in32 suites,0fail/error/skip (147 retained +22 new), executable JAR/repackage PASS. New12 PostgreSQL cases compile but **NOT RUN**. Initial14 HTTP-context errors (one missing test filter mock) and one Mockito re-stub error were fixed; historical failure evidence retained. No retry/skip masking; full PostgreSQL/backend integration is not claimed.

Actual read-only preflight: exact127.0.0.1:5432/smartcinema_phase4e_test, restricted app/migration roles, actualheadV14, unchanged pre-existing role attributes/memberships. Migration role `pg_has_role(...,'smart_cinema_hold_owner','SET')=false`; therefore **V15 NOT APPLIED**, no privilege/data changes, no backend launched. Base launcher reports pendingV15 and Start/ProvisionAdmin fail before Flyway; after approved migration runtime needs only the new database-scoped wrapper EXECUTE grant. No superuser/bootstrap/raw configure grant/owner membership workaround. Private ignored owner-ACL profile used only for isolated non-DB regression; remote config unchanged. SourceheadV15 differs from actualDBV14 deliberately; historical head statements below remain dated evidence.

Next requires approved DBA/operator migration/ACL review, then real local audit/rollback/snapshot/concurrency/freeze tests; source build is not proof of SQL semantics. Preserve existing data/V1–V14 and incoming Phase4F/5A/progress work. No frontend/Stitch, financial-success/Ticket fixture, VNPAY/SMTP/Neon, commit/push/deploy. Do not start frontend automatically; await review.

## Phase 5A ADMIN Concession preparation — 2026-10-25

**READY WITH APPROVALS REQUIRED.** [Preparation report](../reports/2026-10-25_admin-concession-management-preparation_report.md). Repository/requirements/live Stitch audit only: Customer catalog/composition/snapshots and deployment-only guarded catalog writer already exist; ADMIN catalog HTTP/UI and durable catalog price/status audit are missing. Proposed minimal five ADMIN resources cover list/detail/create/content-update/status with existing exact amounts/string IDs/three categories, explicit initial status, duplicate names allowed and no DELETE. Master changes must never rewrite purchased/frozen snapshots or original Booking expiry.

Approval needed for new contract and future protected actor-aware wrapper/atomic FR-AUDIT-006 audit/narrow EXECUTE migration (tentativeV15 only ifV14 remains head). No new domain table/column needed; V1–V14 retained. Runtime must not gain raw deployment configure privilege or DML/owner membership. Existing local launcher pinsV14 and needs a separately reviewed head/ACL update during authorized backend work. Image writes await reference-policy decision; recommended first slice returns/preserves images and creates with null. Dynamic categories/recipe combos/Cinema stock/POS excluded. Proposed last-write-wins/no idempotency limits are explicit.

Live Stitch read-only MCP returned48 resources; inspected Customer Food HTML/screenshot and Staff Admin reference; no dedicated approved ADMIN Concession design found. New Nocturne/AdminShell catalog/forms/dialog design required before frontend; backend can proceed independently after contract/migration approval. No source/migration/database/environment/Stitch changes or services/tests/provider calls/commit/deploy. Smallest next task: separately authorize Phase5B-1 backend contract + audited catalog APIs and isolated local regression at127.0.0.1:5432/smartcinema_phase4e_test. Do not start automatically. Prior Phase4F/progress evidence and pending work preserved.

## Phase 4F real local Staff Check-in — 2026-10-15

**PHASE 4F STAFF CHECK-IN PARTIALLY VERIFIED.** [Report](../reports/2026-10-15_staff-qr-checkin-real-local-e2e_report.md). Real local negative browser/API run8 grouped PASS/0FAIL,25 sanitized responses,6 screenshots390/768/1440: anonymous four operational endpoints401, ADMIN four endpoints403, blocked Staff login401, real access guards and keyboard navigation. Positive booking/payment/issuance/Check-in **BLOCKED / NOT RUN**: no approved local payment simulator or supported local confirmation API; existing issuance requires verified VNPAY/system writer, disabled in this authorized profile. Synthetic PostgreSQL settlement helpers are not E2E financial authority; none used.

Dedicated127.0.0.1:5432/smartcinema_phase4e_test verified V14; all14 permitted domain fingerprints unchanged, Users2/Cinema1/assignment1 preserved, Movie/Hall/Showtime/Booking/Payment/Ticket0, Staff2 remains BLOCKED/setuptrue and assignment1 future original2026-10-21T18:24:00Z. One normal ADMIN refresh session added. Runtime cannot read audit_records; no successful audit claim or grant escalation. New read-only Java evidence helper and negative-only browser harness; no application/environment/contract/migration changes. Owned frontend/backend processes stopped; no Neon, provider, mail, commit or deploy. Resolve legitimate financial test authority in a separately approved task before attempting positive Check-in; do not fabricate PAID/SUCCESS or replay onboarding. Earlier milestones below remain historical.

## Phase 4E complete local Staff onboarding — 2026-10-15

**PHASE 4E ONBOARDING E2E VERIFIED.** [Onboarding report](../reports/2026-10-15_staff-onboarding-local-e2e_report.md). Real Mailpit SMTP capture1 (SENT/attempt1), captured-link public password setup204, consumed-token reuse400, account remains BLOCKED until separate ADMIN Activate200, actual STAFF login200, STAFF→ADMIN403, future assignment omitted by backend/scope403, real ADMIN ACTIVE→BLOCKED200, already-issued STAFF JWT operational403 and fresh-login401. Existing Staff2/Cinema1/assignment1 reused; no recreation or direct DML. Final Staff2 BLOCKED/setuptrue, assignment1 unchanged at2026-10-21T18:24:00Z; invitation history3,revoked2,consumed1,delivery attempts1. Positive Check-in NOT RUN: no legitimate issued Booking/Ticket created or financial success fabricated.

Final real browser execution13/13 PASS,19 safe screenshots390/768/1440 with keyboard/focus/privacy/overflow; cumulative19PASS executions/3 disclosed earlier infra/harness failures,55 sanitized API records. One actual reissue only; pre-password read-validated recoveries reused the same captured link, no automatic mutations/replay. New test-only source bootstrap/PS launcher and HTTPS proxy/harness; private derived profile enables local delivery/scheduler while base config remains deliveryfalse. Mailpit reused verified installedv1.31.5, binds127.0.0.1:1027/8027; HTTPS8443 fixed upstream3000. TLS strict Node validation and browser exact-SPKI local exception, no global TLS bypass/OS trust installation. Proxy now forwards Next dev WebSockets and enforces activation no-store/no-referrer. New Staff password/capture/cert key stay only in ignored ACL-restricted files; no raw token/MIME/secret export.

TypeScript, focused ESLint/Node syntax/PowerShell parser PASS. No application source changed; no repeated fixture suite/full build/backend regression claim. Existing799-file baseline preserved except additive guide/handoff notes; old reports/contracts/env/migrations unchanged, V14 retained, same HEAD/empty index. All PostgreSQL operations in this task stayed in the dedicated local database; no Neon/Gmail/provider connection or database reset. All four owned app/proxy/capture processes stopped; PostgreSQL/minimal data remain. Do not replay completed onboarding or delete journal. Future positive Check-in requires independently verified legitimate paid/issued data and separate authorization; stop here. Earlier milestones are historical.

## Phase 4E real local authenticated integration — 2026-10-15

**PHASE 4E LOCAL INTEGRATION PARTIALLY VERIFIED.** [Real integration report](../reports/2026-10-15_admin-staff-management-real-local-integration_report.md). User explicitly authorized minimal synthetic data in `127.0.0.1:5432/smartcinema_phase4e_test`: ADMIN1 ACTIVE through existing JPA/BCrypt provisioning; Cinema1 ACTIVE through real ADMIN API; Staff2 BLOCKED/setupfalse through browser Create201. Actual frontend Login obtained backend JWT; no mock Staff response or injected session. Eight Staff API paths exercised: list/detail/assignments200, create201, reissue200, ACTIVE-before-setup409, supported idempotent BLOCKED200, add201, assignment INACTIVE/ACTIVE200. Duplicate email/ACTIVE membership409, invalid phone/IDs400, absent ID404, anonymous401 and ADMIN denied Staff operational GET403 verified.

Assignment1 retains original `2026-10-21T18:24:00Z` and future badge/history. Reissue revoked the previous invitation; final BLOCKED command revoked the latest. Read-only DB metadata confirms two exact24h invitations, consumed0/delivery attempts0, final revoked2/queued0. Actual redemption invalidation, SMTP/inbox, HTTPS, successful password setup/activation and ACTIVE→BLOCKED browser dialogs remain BLOCKED/NOT RUN; no raw-token extraction or prerequisite bypass. Real STAFF login/admission not tested.

Real responsive390/768/1440 List/Detail/dialog keyboard/overflow and latency/offline GET recovery PASS. Final dedicated-database read phase11/11 PASS. Cumulative journal50PASS executions/2 disclosed corrected harness assertion failures across25 distinct names; successful mutations never replayed.28 distinct safe PNGs/70 captures,197 sanitized HTTP records. TypeScript/lint PASS (12 historical warnings), unit230/230 PASS; full build/fixture Playwright/backend regression NOT RUN this test-only task. Existing application source/private env/migrations/contracts/reports preserved; V14 unchanged, index empty and HEAD unchanged.

Local scripts add explicit guarded ProvisionAdmin and read-only Audit; private synthetic credentials live only in ignored ACL-restricted `.env.local-test-admin`. Inherited preflight initially inspected cluster role metadata via local postgres maintenance DB; corrected to restricted read-only dedicated DB and reran verification. No Neon/real email/provider connection or business write outside dedicated DB. Both app processes stopped; PostgreSQL and minimal records retained. Restart only with safe local launchers; use harness `read` for known-state checks, never replay write phases/reset. Next task requires separately authorized legitimate local invitation capture/HTTPS/onboarding, not token decryption. No commit/push/deployment; stop here. Earlier milestones below are historical.

## Isolated local test environment — 2026-10-15

**LOCAL TEST ENVIRONMENT READY for preparation/readiness scope only.** [Readiness report](../reports/2026-10-15_isolated-local-postgresql-test-environment_report.md), [safe local guide](../development/local-test-environment.md). Dedicated127.0.0.1:5432 database `smartcinema_phase4e_test`, runtime `smartcinema_phase4e_app`, migration/database owner `smartcinema_phase4e_migrator`; no credentials in docs. New private ignored/ACL-restricted backend/.env.local-test replaces all Spring ConfigData locations, no import of remote backend/.env. Neon was never connected during this task, even read-only; its settings and existing frontend environment hashes remain unchanged.

Normal isolated Spring startup applied V1–V14, then restarted with restricted migration login and validated14/14 successful/checksummed migrations and Hibernate. Source migrations/entities/business authority unchanged. New bootstrap migrator temporary superuser was removed; final runtime/migrator NOSUPERUSER/NOCREATEDB/NOCREATEROLE, runtime no protected owner/shared runtime-role membership. Runtime ACL copied only inside the new database, no inherited other-database privileges; pre-existing role attributes/memberships preserved. No existing database/schema/record reset, seed, ADMIN/Staff account, invitation, SMTP/provider command or Check-in. Users0/Cinemas0.

Safe commands from root: `& .\backend\scripts\local-test-environment.ps1 -Action Verify`, then `-Action Start`; separately `& .\frontend\scripts\start-local-test.ps1`. **Do not use root pnpm dev/admin:dev/seed:demo for this local scope**: default remote input remains untouched. Launchers reject conflicting overrides, verify physical datasource/Flyway identities, disable cleanup/delivery/provider/restart/debug/telemetry side effects and preserve the existing API rewrite pinned to127.0.0.1:8080. Configured HTTPS8443 activation target is a local-only test value, not an installed TLS service; mail delivery is disabled.

Actual local Spring8080/Next3000 startup and five real non-mocked browser/HTTP assertions PASS: direct/proxy public catalogue200 empty, direct/proxy anonymous Staff401/no-store, anonymous real UI guard. Database V14/five Staff tables/role/isolation/negative environment override checks PASS. This is not authenticated Staff/mail end-to-end proof; prior regression counts remain historical. See report for teardown/restart and evidence.

Next task requires separate authorization for dedicated local ADMIN credential/provisioning and controlled Phase4E Staff smoke workflow/test recipient/Cinema data. Do not start automatically, copy remote credentials, connect Neon, enable Gmail, commit or deploy. Prior milestones below remain preserved history.

## Phase 4E — ADMIN Staff Management frontend — 2026-10-14

**PHASE 4E IMPLEMENTED & VERIFIED for authorized frontend scope.** [Implementation report](../reports/2026-10-14_admin-staff-management-frontend-implementation_report.md), [frontend guide](../development/admin-staff-management-frontend.md), unchanged [Staff administration contract v1.0](../api/staff-invitation-administration-contract-v1.0.md). User explicitly approved the current seven Stitch designs and React correction of minor/moderate UI issues; no renewed design gate or Stitch write. Real `/admin/staff` and `/admin/staff/[staffId]` reuse AdminShell/current backend ADMIN verification, existing auth/logout and Nocturne/shared components. List/pagination/Create, Detail/setup/invitation delivery, account Reissue/Activate/Block and Cinema Add/Deactivate/Reactivate are implemented with all eight exact Staff endpoints plus existing Admin Cinema catalogue GET.

Canonical positive-bigint IDs remain strings; typed runtime DTO/identity/status/order/parent checks drop extras. Existing Vietnamese phone formats and150/254/30 limits, no company email/HR/POS/permission fields. Creation confirms BLOCKED; private password setup and explicit ADMIN activation remain separate. Delivery SENT means SMTP acceptance, not inbox success. UTC effectiveAt is submitted from explicit GMT+7 wall time, original time/history is immutable on status changes, future-effective badges confer no permission. No invented ACTIVE-only Cinema selection or past-time ban; backend enforces real access and conflicts. Returned non-STAFF assignment history is read-only.

Explicit commands only, synchronous duplicate gate, disabled controls/15-second write timeout, safe400/401/403/404/409/429/503/network/malformed handling and Retry-After countdown with no polling or automatic retry. Per-tab non-PII nonce/optional Staff-ID hints are untrusted navigation/review only. Unknown/interrupted writes block new commands for explicit GET review plus manual acknowledgement; there is no email lookup/operation completion endpoint, guessed ID or command replay. Reads cannot rule out delayed commits; separate tabs rely on backend constraints. Storage-denied reload persistence and client-clock future labels are documented limitations. Token/resource/unmounted guards reject stale view updates.

Native accessible dialogs include Tab/Shift+Tab containment, Escape/busy-close protection, focus restoration and associated labels/errors. Responsive390/768/1440 screenshots and keyboard/overflow checks PASS; tablet list uses cards. Final TypeScript/lint/build PASS; lint has0 errors and12 unchanged historical target-script warnings. **230/230 unit PASS** (215 retained +15), focused19/19 browser PASS before final layout refinement; final **366/366 full Playwright PASS**,13.3m,27 files (347 retained +19),0 failures/skips/retries. Initial focus/type defects and obsolete four-link navigation assertion were fixed with failure/partial-run history disclosed; current navigation test asserts all five approved labels and Staff href. Unmocked historical public-read proxy refusal logs are disclosed, not live integration proof.

Backend/DB/migrations and financial/Booking/Staff operational logic remain unchanged; **V14** remains head. Seven incoming audit reports preserved byte-for-byte; BRD/SRS/contracts/Stitch/environment unchanged. Backend tests, Neon/live Staff provisioning, HTTPS/Gmail delivery/password setup/activation/admission and physical browser/AT QA NOT RUN; historical410 backend tests are not claimed current. No staging/commit/push/deployment.

Next recommendation: separately authorize controlled real end-to-end onboarding and effective Cinema scope verification in an approved environment. Do not enable credentials, manufacture live data, commit/deploy or start another phase automatically. STOP. Prior milestones below are preserved history.

## Phase 4D — Staff invitation/password setup frontend — 2026-10-13

**COMPLETE for authorized Phase 4D frontend scope; all frontend regressions PASS.** [Implementation report](../reports/2026-10-13_staff-invitation-activation-frontend_report.md), [development guide](../development/staff-invitation-activation-frontend.md), unchanged [onboarding contract](../api/staff-invitation-administration-contract-v1.0.md). Public `/staff/activate` uses existing auth layout without JWT requirement, exact canonical43-character fragment capture/private memory, early URL scrub and route-local fixed canonical redirect for any query. No query-token fallback/arbitrary return destination, server token prop/hidden input/browser persistence/logging or mount redemption. Actual environment has no activation-base value; example HTTPS `/staff/activate` verified, real origin/mail deployment dependency remains.

Two accessible native password fields/visibility toggles mirror actual Java minimum8 UTF-16 units/nonblank/well-formed encoding and maximum72 UTF-8 bytes, exact confirmation/no trimming or normalization. One explicit public POST `/api/v1/staff/password-setups` with `{token,password}`, no Authorization/cookie/CSRF header, no-store/no-referrer/rejected redirects/15-second abort. Only204 confirms password setup; **still awaits explicit ADMIN activation**, no ACTIVE/session/login/Check-in redirect or polling. Generic public4xx invitation/password rejection,429 Retry-After guidance,5xx/lost/interrupted/misleading2xx uncertain outcome; no command replay/resend/reset/status API invented.

Private token erased at submission/disposal; fields clear on send/pagehide/navigation/identity changes. Generations/abort ignore late results. StrictMode synchronous reattachment avoids losing scrubbed token; paired popstate/hashchange handled without double-clearing; reload/back/forward requires reopening valid invitation. Existing auth session remains untouched. Vietnamese Nocturne/shared UI at390/768/1440, current Stitch auth exports inspected; no dedicated activation design exists in live41-resource inventory.

TypeScript/lint/build PASS; **215/215 unit PASS** (all192 +23), **38/38 focused Playwright PASS**,0 skips/retries. Full **347/347 Playwright PASS**,11.2 minutes,26 files (all309 +38),0 failures/skips/retries; final source includes fixed keyboard skip anchor and explicit native POST method. Initial strip-only constructor and two real query-history/hash-event failures fixed without weakening assertions; history disclosed in report. Backend historical410/410 is not rerun. Actual HTTPS/Gmail invitation delivery/redemption/ADMIN activation/login, Neon/production data and physical browser/AT matrix NOT RUN. V14/backend/Phase4C/Customer/Admin/Manager auth, financial/domain source, environment and Stitch unchanged. No commit/staging/push/deployment.

Next recommendation: separately authorize legitimate HTTPS/Gmail end-to-end Staff onboarding verification; Admin Staff management frontend requires its own scope/contract/design audit. Do not enable credentials/flags, redeem production invitations, commit or begin another phase automatically. Prior milestones below are preserved history.

## Phase 4C — Staff Check-in frontend — 2026-10-13

**COMPLETE for authorized Phase 4C frontend scope; all frontend regressions PASS.** [Implementation report](../reports/2026-10-13_staff-checkin-frontend_report.md), [frontend guide](../development/staff-checkin-frontend.md), unchanged [Staff operational contract](../api/staff-qr-checkin-contract-v1.0.md). Real `/staff/check-in` uses existing login/session/logout with STAFF-only navigation and narrow resume, authenticated current Cinema assignment selection, real ZXing camera/manual exact opaque UTF-8 resolution, minimal authoritative Booking/Ticket/purchased Concession data, whole-unit eligible Ticket selection, explicit confirmed command and safe known-Booking GET recovery. No optimistic admission, automatic Check-in/replay, QR URL/storage/logging, Customer/Admin/Manager admission or new backend authority. COUPLE remains one Ticket/two guests and independent batches remain explicit.

Owned memory state/generations/abort reject stale replies; 401/403/context/logout/navigation/hidden cleanup clears sensitive state and stops all media, including delayed permission. Known uncertain/409/malformed outcomes lock selection for current GET; 429 respects Retry-After. Explicit/event-driven coalesced foreground reads only, no polling. Reload/direct entry/cleared tab state requires rescan because no operational identity/QR/selection is persisted. Server policy, scope and atomic commit remain authoritative.

TypeScript/lint/build PASS; **192/192 unit PASS** (151 retained +41 new), **37/37 focused Playwright PASS** before final Unicode refinement; final full **309/309 Playwright PASS**,11.3 minutes (272 retained +37 new),0 failures/skips/retries. Actual Java isBlank QR boundary and the added NBSP/blank browser assertions are included in the final full run. One obsolete shared navigation assertion is updated to positively expect only the approved STAFF links and prohibit unsupported Staff/Manager routes; baseline cases retained. Full failure/partial-run history is disclosed in report. Live Stitch Staff HTML/PNG inspected, Vietnamese Nocturne UI checked at390/768/1440. Real decoder uses generated fake-camera video; physical camera, real Staff/live admission/Neon, HTTPS/Gmail onboarding and financial provider verification NOT RUN. Backend historical Phase4B-2 410/410 is not rerun or claimed as current.

Backend/database/migrations/source head **V14**, Payment/VNPAY/issuance/freeze/original expiry, Stitch and environment/deployment remain unchanged. No commit/stage/deploy. Staff activation page is still absent: audit documents the contract-defined HTTPS base-path setting (deployment value not verified), fragment-token isolation, explicit password-setups POST and still BLOCKED awaiting ADMIN activation. Next recommended task is separately authorized Staff invitation/password-setup activation frontend and independently approved physical/live QA; do not start automatically. Prior milestones below are historical and preserved.

## Phase4B-2 — Staff operational backend APIs — 2026-10-13

**COMPLETE for authorized backend scope:** [implementation report](../reports/2026-10-13_staff-qr-checkin-backend-apis_report.md), [integration guide](../development/staff-qr-checkin-backend-apis.md), unchanged authoritative [Staff v1.0 contract](../api/staff-qr-checkin-contract-v1.0.md). Implemented GET current cinema-assignments, confidential POST booking-qr-resolutions, cinemaId-scoped GET bookings/{bookingId} recovery and explicit POST bookings/{bookingId}/check-ins. JWT STAFF plus current ACTIVE/STAFF and effective ACTIVE STAFF actual Cinema assignment; ADMIN/MANAGER denied. Exact opaque UTF-8/no QR echo/logging, canonical bigint strings, minimal coherent read-only REPEATABLE_READ projection, safe no-store errors, explicit READ_COMMITTED V13 writer only. Complete PAID/VALID/context/inclusive−30/+15-minute policy, selected atomic transition/audit, COUPLE one Ticket/two guests and unchanged Booking PAID/QR/freeze/financial snapshots. Lost command response recovers by scoped GET/rescan; no automatic command/retry.

Source migration head **V14** adds only durable per-actor shared read60/minute and Check-in30/minute buckets. V1–V13 source/checksums, existing Check-in writer/owner/ACL and invitation limits preserved. Applied only in dedicated local QA/isolated schemas; no Neon, live Gmail/provider or production admission. Entry clean commit783b7d2 independently baseline365/365; final **410/410 PASS in56 suites**,0 failures/errors/skips, `mvn verify`/JAR/repackage PASS,1:52, finished2026-10-13T03:55:30+07:00. Added36 HTTP/DB+9 unit cases; all365 retained. Focused43 then44 PASS and final unit9 PASS. One final-source full run had410/2fail due environment clock leaps1h38m/42m; failed SeatHold/time-window evidence retained, entire unchanged suite rerun PASS without weakening tests/policy or retry masking. Source/document/preservation/convention checks PASS; frontend/contracts/historical reports unchanged. No frontend test counts claimed as current.

Next recommendation is separately authorized **Phase4C Staff frontend** against actual exports/contracts: real assignment/context, exact-token scanner/manual input, explicit Ticket selection, safe uncertain-result GET recovery, stale/session/context handling, camera/privacy/accessibility/responsive Vietnamese QA. No scanner/workspace/activation/Admin frontend, unsupported gate/history/KPI/pickup/offline/undo, commit or deployment implemented. Real onboarding HTTPS/Gmail and production migration remain separately authorized work. STOP; no automatic Phase4C. Prior milestones below are historical and preserved.

## Phase 4B-1 continuation — 2026-10-12

**COMPLETE for backend/database foundation:** [continuation report](../reports/2026-10-12_staff-checkin-foundation-implementation-continuation_report.md). Resume approves ADMIN-created BLOCKED STAFF, secure emailed one-time invitation/private password setup, still BLOCKED until explicit ADMIN activation. [Onboarding/Admin contract](../api/staff-invitation-administration-contract-v1.0.md), [Staff operational contract](../api/staff-qr-checkin-contract-v1.0.md), [foundation guide](../development/staff-onboarding-and-checkin-foundation.md), [Gmail setup](../development/gmail-smtp-setup.md). Implemented protected administration/public setup, purpose-bound 256-bit digest/AES-GCM outbox, exact24h/reissue/consumption, durable bounded SMTP retry and designed current Cinema assignments. Gmail defaults are configuration only; delivery disabled until configured, real Gmail NOT VERIFIED. Local capture and Mailpit v1.31.5 PASS; no external-recipient sends.

Source head now **V13**, V1–V12 preserved; protected NOLOGIN owner/narrow VALID→CHECKED_IN writer, immutable per-Ticket audit, parent-first locks, live STAFF/assignment/active-context and inclusive −30/+15-minute admission checks. Existing Booking/Payment/VNPAY/issuance/freeze/expiry and Customer frontend unchanged. Baseline317/317, final365/365 backend tests in54 suites, 0 failures/errors/skips; focused48/48. Local QA unreleased-V13 checksum/function synchronization is fully disclosed in report; no old checksum/business data/Neon change. No frontend tests or live Gmail/provider/admission proof claimed.

Four Staff operational HTTP controllers, scanner/workspace/password-setup/Admin frontend remain unimplemented by phase boundary. Next recommendation: separately approve Phase 4B-2 HTTP integration against published contract; no automatic continuation, commit or deployment. Historical preflight/blocked and accepted milestones below are retained unchanged.

## Phase 4B-1 preflight — 2026-10-12

**BLOCKED before implementation**, per the task's explicit §7 credential/activation STOP gate: [blocking decision report](../reports/2026-10-12_staff-checkin-contract-database-foundation_report.md). Admission window (−30/+15 minutes, inclusive), atomic selected batches, STAFF-only admission, ADMIN-only provisioning/assignment management and safe Staff Booking recovery are approved. Existing contracts do not settle initial STAFF password establishment/delivery, initial account activation or first-login credential behavior. Resolve that decision before resuming Phase 4B-1; do not infer an invitation, temporary password, forced reset or initial ACTIVE/BLOCKED workflow.

Source head rechecked at V12. No Staff API contract, Java/controller/test, V13, assignment persistence or protected Check-in writer was implemented; no database/provider commands or tests ran. Previous regression counts below remain historical. Incoming untracked Phase 3A/4A reports and all application sources are preserved. No commit/deployment or Phase 4B-2 work.

Prior accepted milestone context:

Last reconciled: 2026-10-11, Asia/Ho_Chi_Minh. **Phase 3C Customer My Bookings/Tickets/Booking QR COMPLETE — implementation and full frontend regression PASS.** Primary frontend language: **Vietnamese**. Prior Payment, Booking and shared UI milestones remain accepted. No commit is implied. Read [project context](project-context.md), [AGENTS.md](../../AGENTS.md), workflows/conventions and Git status first.

## Current milestone

Phase 3C: [implementation report](../reports/2026-10-11_customer-my-bookings-ticket-qr-frontend_report.md). `/my-bookings` and `/my-bookings/[bookingId]` now use real authenticated owned GET history/detail/Ticket aggregates from the [Phase 3B contract](../api/customer-booking-history-ticket-qr-contract-v1.0.md), independently of Payment attempt identity. No production mock fallback. Complete unique Tickets must match purchased Seat Units before one exact UTF-8 Booking QR is rendered. COUPLE remains one Ticket/two guests. All four Ticket states are read-only; VALID alone does not establish admission eligibility. Original pre-sale expiry does not hide a paid Booking.

Known inconsistencies, stale/malformed/unavailable reads and session changes suppress Ticket/QR display. Account/token/resource keys and aborted requests isolate data; no QR token goes into URL/storage/analytics. Narrow safe login resume covers only the two canonical history routes. Explicit and throttled focus/tab/pageshow recovery use GET only; no polling, automatic Payment initiation, financial finalization, Ticket issuance or Customer Check-in. Existing Summary/return freeze and known/unknown Payment policies remain unchanged.

Phase 3B backend evidence is separately recorded in its [report](../reports/2026-10-11_customer-booking-history-ticket-qr-backend_report.md): 317/317 tests and V12 head. Phase 3C final TypeScript/lint/build and 151/151 unit cases passed; focused Playwright 35/35 and full Playwright 272/272 passed, with no failures/skips/retries. Backend was not rerun; its sources remain unchanged. Browser fixtures do not prove live provider settlement, actual paid entitlements, Neon or Staff admission. No live database/provider action was performed.

Next recommendation: independent Staff QR resolution/per-Ticket Check-in API, authorization and admission-contract audit before Phase 4. Do not start automatically; no commit/deployment authorized by this handoff.

### Prior milestone — Payment return/status/recovery

Real Payment return/status/recovery: [current guide](../development/customer-payment-return-status-recovery-frontend.md) and [dated report](../reports/2026-10-10_customer-payment-return-status-recovery-frontend_report.md). Fixed `/payments/vnpay/return` uses the existing backend 303-to-configured-HTTPS contract; backend forwards no IDs/query and return never settles. A matching per-tab known-attempt pointer selects authenticated owned Booking/Payment GET only. Callback/query values are discarded without interpretation or forwarding. The mounted landing cannot switch attempt if its hint changes. Lost identity stays blocked: no list/latest/Customer-query endpoint exists, and no blind POST is permitted.

Owned Summary and return show truthful Vietnamese pending, verified successful, failed/cancelled, reconciliation and uncertain states. Financial SUCCESS and Booking PAID are separate; late/unfulfillable SUCCESS is described with reconciliation and no fulfillment promise. IDs and exact amounts remain strings. Frozen composition/original expiry/first marker cannot change on later reads; stale projections require review, and prior server-read SUCCESS is not downgraded within the mounted session. Six bounded visible 30-second interval reads, event/explicit GET refresh and one expiry read preserve backend authority; automatic reads stop on authorization/not-found/rate-limit/read-timeout errors. No automatic initiation/submission/reopen, frontend IPN/query/signature/financial finalization, Ticket/QR/history/check-in/admin or deployment work is added. Existing explicit Sandbox submission still uses backend confirmation/reopen gates and strict hosted HTTPS allowlist.

Exact next recommended task: **Real Customer Ticket/Booking QR and My Bookings integration, but only after independently verified backend PAID/issuance contracts are audited. Do not start automatically.** Stop after this task; no further feature is authorized. Final full regression, requirement reconciliation and Convention Compliance PASS.

### Prior initiation milestone — preserved context

Real Payment initiation: [current guide](../development/customer-payment-initiation-frontend.md) and [dated report](../reports/2026-10-07_customer-payment-initiation-frontend_report.md). Existing owned Summary embeds explicit first POST `{}`, backend exact amount/original expiry/composition freeze, known-ID owned GET recovery, Vietnamese uncertain/unknown-identity review and separate explicit safe VNPAY Sandbox submission under existing backend gates. One gate serializes Summary reads, Promotion writes and Payment actions; no automatic POST/reopen on render/reload/login/navigation. Per-tab hints contain identity/review intent only. Backend V10 reuses INITIATED/PENDING but may replace definitive-negative attempts, so frozen unknown identity never triggers a recovery POST; no latest/list lookup exists. Ticket/QR fields are dropped from lookup projection. No callback/result/finalization or financial success authority is added.

The initiation slice's next recommendation is fulfilled by the current return/status/recovery continuation. Its own historical regression, requirement reconciliation and Convention Compliance remain PASS; provider interoperability was never claimed.

Prior accepted Promotion implementation: [current guide](../development/customer-promotion-composition-frontend.md) and [dated report](../reports/2026-10-05_customer-promotion-composition-frontend_report.md). Inline owned Summary code entry, authenticated PUT apply/replace/reapply and DELETE removal; no public Promotion list. Stored code/ID/discount and exact totals, original Seat origins/deadline, uncertain-result review and freeze remain authoritative. Concession edits revalidate current Promotion; invalid terms roll back the whole edit until explicit removal/replacement. Payment initiation was separately authorized in the current continuation; prior evidence remains historical.

Prior accepted Concession implementation: [current guide](../development/customer-concession-composition-frontend.md) and [dated report](../reports/2026-10-05_customer-concession-composition-frontend_report.md). `/bookings/{bookingId}/concessions` has real active catalog and owned add/quantity/remove. Immutable line snapshots, exact server totals and original expiry remain; frozen/terminal read-only. Its accepted evidence is preserved separately below.

Localization evidence: [dated report](../reports/2026-10-03_frontend-vietnamese-localization_report.md) and [current guide](../development/frontend-vietnamese-localization.md). Existing API/status/role/seat-type values remain unchanged; shared display labels map to Vietnamese. Exact Booking money and explicit UTC remain authoritative. Preview VND formatting is Vietnamese. Safe errors, validation and accessible names are localized. Final-source TypeScript, ESLint, production build, **84/84 unit tests**, full **115/115 Playwright scenarios** (one worker, no retries/skips) and backend **294 tests** passed. Desktop/mobile production screenshots and existing keyboard/overflow checks passed. Prior Booking evidence below is preserved separately.

Flyway head: **V12**, [migration](../../backend/src/main/resources/db/migration/V12__guard_admin_showtime_configuration.sql). **No migration or backend change in this frontend task; no V13.** All V1–V12 source/applied Neon checksums and historical contracts/reports/requirements/Stitch are unchanged.

Latest evidence: [Booking frontend report](../reports/2026-10-02_customer-booking-creation-frontend_report.md),
[current guide](../development/customer-booking-creation-frontend.md),
[screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md),
[implementation plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md).
Read [Booking v1.0](../api/booking-contract-v1.0.md) plus additive
[v1.1](../api/booking-contract-v1.1.md), [v1.2](../api/booking-contract-v1.2.md),
[v1.3](../api/booking-contract-v1.3.md), and both
[Seat/Hold v1.0](../api/seat-hold-contract-v1.0.md) and [v1.1](../api/seat-hold-contract-v1.1.md).

- Movie/Genre → Cinema → Showtime → Seat map remain real public reads. Existing
  authenticated Customer Holds remain PostgreSQL-authoritative, atomic whole-set,
  separate owned GET/exact-ID release, server deadline and reload reconciliation.
- Primary **Tạo đơn đặt vé & xem thông tin** freshly confirms exact owned Hold origins,
  POSTs the complete Showtime/Hold set once, then opens real
  `/bookings/{bookingId}/summary` only after the server confirms identity.
  No client owner/role/status/price/time authority, fake API or mock fallback.
- Server whole-unit type/prices/totals and Booking expiry are authoritative.
  STANDARD/VIP one unit/guest; COUPLE one Booking Seat/two guests. Exact
  numeric(19,4) strings retain zero/fractions. Current screening labels are
  referenced metadata; the response supplies no currency/display timezone.
  Summary uses explicit UTC and never guesses a local query date from UTC.
- Owned GET restores direct/reloaded Summary even if public catalog hides the
  screening. Normal Customer login safely resumes the validated local Summary.
  Backend current role/account/ownership rules remain authoritative.
- Attached Holds remain ACTIVE with original expiry, excluded from standalone
  owned reads and forbidden individual release/reuse. Back shows HELD/disabled
  units, Vietnamese Booking recovery/return links, with no automatic writes/renewal.
- Pending/unknown creation gates changes. No automatic Booking POST retry.
  Explicit Recover Booking uses only the exact saved complete set under the
  existing eligible-unexpired-PENDING same-owner contract. A per-tab untrusted
  hint grants no ownership; unknown identity cannot be rediscovered once that
  recovery window expires because no Booking list endpoint exists.
- Real Summary supports its owned Concession editor, inline Promotion and explicit first Payment initiation/known recovery/backend-gated Sandbox submission. First actual attempt freezes all composition. Separate secondary Preview Concessions retains static demonstration only; its quantities/codes/prices never modify a real Booking. This frontend does not decide SUCCESS/PAID, consume Holds, set sold_at or issue Ticket/Booking QR.

**Admin Showtime Management and real Customer READ integration are implemented.**
Read the [latest contract](../api/admin-showtime-contract-v1.0.md),
[development guide](../development/admin-showtime-management.md) and
[implementation report](../reports/2026-10-02_admin-showtime-management_report.md).
The [historical preflight](../reports/2026-10-02_admin-showtime-management-preflight_report.md)
stopped at authorization; the separate accepted task resolved that gate and approved policy.

- ACTIVE ADMIN independently required on list/detail/create/update. No Delete or Manager authoring. `/admin/showtimes`, `/new`, `/{showtimeId}/edit` use real JWT APIs.
- New authoring: PUBLISHED Movie, ACTIVE Cinema/Hall, complete physical guest-capacity layout. Hall is permanent. Atomic Showtime plus all membership; maintenance/inactive units remain represented and nonsellable. COUPLE = one unit/membership, two guests.
- New/retimed end comes from persisted Movie duration; occupied_until=end; booking_cut_off=start. Exact nonnegative numeric(19,4), including zero/fractions. Price/status-only edits preserve saved times. Half-open existing Hall exclusion remains the concurrency backstop.
- Create DRAFT/SCHEDULED/OPEN_FOR_BOOKING. DRAFT→SCHEDULED/OPEN_FOR_BOOKING/CANCELLED, SCHEDULED→OPEN_FOR_BOOKING/CANCELLED, OPEN_FOR_BOOKING→CANCELLED. Same-state safe future edits only. Any Hold/Booking history freezes commercial/schedule/lifecycle. No Admin STARTED/ENDED, regressions or cancelled reopening.
- Runtime gets only guarded configuration writer EXECUTE. No direct Showtime/membership DML, initializer execution, configuration-owner inheritance/SET, HTTP role switching or disabled trigger. Managed bootstrap SET/schema CREATE is revoked before commit. After-commit technical audit follows existing Admin pattern.
- Customer READ remains as implemented in the Admin Showtime slice. Subsequent Hold frontend integration replaces local acquisition/countdown; Booking creation/owned Summary, Concession/Promotion, Payment initiation and known-attempt return/status are now real clients. History/Ticket/QR integration remains separate; actual Sandbox interoperability is NOT RUN.

## Verification and live data

Current return/status verification: backend **294/294**, 50 suites, zero failures/errors/skips; **138/138 unit** (all 118 baseline plus 20 new), final TypeScript/ESLint/production build PASS. Final complete installed-Edge Playwright **219/219 PASS (9.2m, exit 0)**, all 182 baseline cases retained unchanged plus 37 new fixture scenarios, one worker, zero failures/skips/retries. A preliminary full run was stopped after 74 passed/no failed cases for identity-lock/expiry-rate-limit corrections. The first completed full run had 218 passed/1 failed: an overbroad new guard rejected an unfrozen Booking lifecycle read. It was restricted to frozen Bookings, a unit regression was added, and the unchanged original browser case passed 1/1 before the full passing rerun. Failed evidence is retained. Scope/strict UTF-8/130 local Markdown links/whitespace/report/Convention Compliance PASS: 21 authorized files (11 modified/10 new), 638/649 incoming tracked files and all 19 original E2E files unchanged; all original unit commands retained, dependencies and empty index unchanged. Final desktop/mobile fixture screenshots were visually reviewed. See current report for evidence and limitations.

Fresh read-only Neon at **2026-10-09T23:35:57.810598Z** (2026-10-10 local): V12, 73 Showtimes, latest start 2026-10-09T16:17:00Z, zero future OPEN_FOR_BOOKING/cutoff-valid rows; Payment/Ticket rows zero. Merchant/secret/return configuration absent, all confirmations false. A. fixture browser status/recovery and B. actual isolated backend status/query tests are distinct from C. actual Sandbox return, D. actual signed provider callback, E. actual live Payment SUCCESS and F. actual live Booking PAID: **C–F NOT RUN**. Postflight confirms all 19 business/history/financial fingerprints and V1–V12 applied checksums unchanged, no new Booking/Concession data. No scheduling/catalog/Promotion/financial data manufactured, no merchant activation or real-money transaction.

### Prior Payment initiation verification — preserved historical context

Payment verification: final TypeScript, ESLint, production build, **118/118 unit tests**, backend **294 tests** and full installed-Edge **182/182 Playwright** passed (8.9m, exit 0); all 148 existing plus 34 new Payment scenarios, one worker, no retries/skips. Scope/strict UTF-8/local Markdown links/whitespace/report inventory/Convention Compliance PASS for 22 files; 627/639 baseline tracked files and 22/23 original E2E files unchanged. The remaining original E2E file changes only the required placeholder assertion; all scenarios are retained. Index unchanged. Fresh read-only Neon preflight at 2026-10-06T22:06:08Z (2026-10-07 local) found 73 Showtimes, latest start 2026-10-09T16:17:00Z, but zero future open/cutoff-valid Showtimes. New live Booking/Payment initiation is NOT RUN. Merchant/secret are absent; all confirmation flags remain false, so live URL/provider acceptance/signed callback/SUCCESS/PAID/issuance are NOT RUN. Actual no-interception production browser with ordinary Customer login read existing owned CANCELLED Booking 1; Payment disabled/original expiry/reload/desktop/mobile/keyboard passed, no overflow/page errors/business writes. Final postflight confirms all 19 original business/history/financial fingerprints and V1–V12 applied checksums unchanged. Owned verification processes were stopped. No schedule/catalog/Promotion/history manipulation, seed/provisioning, backend/migration/configuration change or deployment.

### Prior Promotion verification — preserved historical context

Promotion verification: TypeScript, ESLint, production build, **104/104 unit tests** and backend **294 tests** passed. Full installed-Edge **148/148 Playwright** regression passed (7.7m, exit 0), including all 18 new scenarios, one worker, normal timeouts, no retries/skips. Read-only Neon preflight again found no future eligible open Showtime; full live Booking/Promotion writes are NOT RUN for that dependency. Actual no-interception production browser with ordinary Customer login read existing CANCELLED Booking 1, persisted state/deadline, reload/read-only/desktop/mobile/keyboard; zero page errors/business writes. All 19 original domain/history/financial fingerprints and V1–V12 applied checksums are unchanged. Scope/UTF-8/134 local Markdown links/whitespace/report/Convention Compliance PASS; 621/631 original files and all 21 original E2E files unchanged. Payment initiation is recommendation only.

### Prior Concession verification — preserved historical context

Concession verification: TypeScript, ESLint, production build, **94/94 unit tests**, full installed-Edge **130/130 Playwright scenarios** (6.9 minutes, one worker, no retries/skips, exit 0) and backend **294 tests** passed. All fifteen new browser scenarios passed in the full run. Scope, strict UTF-8, documentation links, whitespace, report inventory and Convention Compliance passed; 612/621 original files and all 19 original E2E files are unchanged. Live Neon validates V12 and has five active catalog items, but no future OPEN_FOR_BOOKING/cutoff-valid Showtime among 73 existing rows. Full new Booking/composition write proof is NOT RUN for that data dependency; no scheduling/catalog edits were made. No-interception real production-browser proof used ordinary QA Customer login, existing CANCELLED Booking 1 and real catalog; read-only/reload/desktop/mobile/keyboard passed, zero page errors. Original 19 domain/history/financial fingerprints and all V1–V12 applied checksums are unchanged. No new business writes or cleanup; expected Auth token activity is separate.

### Prior localization verification — preserved historical context

Localization verification: final-source TypeScript/ESLint/build PASS, unit **84/84 PASS**, full installed-Edge Playwright **115/115 PASS**, retries=0, one worker and normal timeouts. Backend `mvn verify` **294 PASS**, zero failures/errors/skips, completed 2026-10-02T19:42:54+07:00 using the existing dedicated local database and integration flags. Strict UTF-8/authorized-scope checks passed for all 118 changed/created files; 54 local Markdown links and whitespace/report/convention reconciliation passed. No backend, migration, API, requirement, historical-report or Stitch change. Browser localization QA renders the actual production frontend with isolated API fixtures; no new live Neon transaction or deployment occurred. Localization is accepted; stop before Concession integration.

### Prior Booking verification and live data — preserved historical context

Prior full `mvn verify`: **294 PASS**, 50 suites, zero failures/errors/skips,
dedicated local PostgreSQL regression with all existing integration flags,
jar/repackage PASS, completed 2026-10-02 16:14:17 +07. No backend edits.
Final-source TypeScript/ESLint/build and **81/81 unit tests PASS**. Accepted full
Playwright **115/115 PASS**, installed Edge, one worker, retries=0, 6.4 minutes.
Fourteen new Booking browser scenarios plus all prior Customer/Admin regression.
After the final type-only test-helper import convention correction, TypeScript,
ESLint and the 14 Booking scenarios passed again, retries=0, 20.7 seconds;
application runtime source was unchanged.
Final docs/link/whitespace/report/handoff checks PASS. **320 protected original
backend/contract/design/requirement/Stitch/report/stable-context files unchanged.**
HTTP test simulators are separate from actual no-interception live proof.

**Real Neon V12 PASS:** normal `.env` startup validated twelve migrations,
required no migration/reseed and passed Hibernate validate. Verification-only
process overrides disabled Hold cleanup/VNPAY to preserve original history;
application defaults/source are unchanged. Existing isolated normal QA Customers
were reused through ordinary login; no Admin credentials or database bypass.

Normal real browser Home → Movies → Movie Detail → Cinema → Showtime → Seat →
owned Holds → **one server Booking** → Summary. Existing Showtime **12**, Movie
**4**, Cinema **1**, Hall **1**, 2026-10-04 19:00 Asia/Ho_Chi_Minh:

- STANDARD Seat **1/A1**, VIP **31/D1**, whole COUPLE **41/E1-2**, atomically
  acquired as Holds **6/7/8**, then attached by one normal UI create operation to
  Booking **1**, initially PENDING. **3 Seat Units / 4 guests**; each saved price
  `90000.0000`, aggregate `270000.0000`; no Concessions/Promotion/Payment.
- Exact original Hold/Booking expiry **2026-10-02T10:09:36.316360Z** retained
  after owned Summary reload and mobile browser Back/keyboard Return to Booking.
  Own independent Hold GET omitted attached origins; map HELD; all three units
  and fresh Create disabled on Back. Attached individual release **409**, foreign
  Customer detail **404**, anonymous **401**, owned GET **200**.
- Desktop 1440×1000/mobile 390×844 visual/keyboard checks PASS; no document
  overflow, complete COUPLE and exact amounts/deadline. Browser console errors
  empty. Live screenshots are linked in the report under ignored verification
  output, with initial PENDING and final retained terminal-state evidence.
- Safe cleanup used existing owned **DELETE Booking** (logical cancellation,
  **204**, no physical delete). Final Booking **1 CANCELLED**, three snapshots
  retained, Holds **6/7/8 RELEASED** with identical original expiry/attachment,
  Seats **1/31/41 AVAILABLE**. Exactly one verification Booking remains.
- Final read-only audit: original catalog/hierarchy/schedules/membership,
  prior Holds/Bookings/Seat lines and all financial/Payment/Ticket/Promotion/
  Concession/evidence/reconciliation/audit fingerprints plus V1–V12 checksums
  unchanged. No payment_started_at/paid_at/sold_at/CONSUMED/usage/Ticket/QR,
  provider/external financial activity or destructive cleanup. Expected Auth
  login/token activity is separate. Earlier five verification Holds are unchanged.

### Prior Admin Showtime evidence — preserved historical context

Normal Admin browser login/signed JWT created exactly one Showtime **73** on existing Movie **9** (`[DEMO] Clockwork Garden`), Cinema **1**, Hall **1**. Local start **2026-10-09 23:17 Asia/Ho_Chi_Minh**, end/occupied **2026-10-10 01:27**, cutoff=start. Exact price `90000.1234` safely edited to `90001.4321` without changing times. Public Cinema/schedule/detail/map and normal Customer browser reached the same **45 units, 50 guests, five whole COUPLE**. Desktop/mobile, keyboard and read-only preview disclosure passed without interception. No Hold/Booking/Payment created.

Final verification Showtime is **CANCELLED**, Admin read-only; Customer query omits it and public detail returns 404. All original catalog/hierarchy/schedule/membership/Booking/Hold/Payment/Ticket/Promotion/Concession/evidence/reconciliation/audit row fingerprints and V1–V11 checksums are unchanged. Auth login/token activity is expected, separate from that preservation check. Runtime ACL and non-superuser managed bootstrap checks PASS.

## Exact next recommended task — not authorization

**Real Customer Ticket/Booking QR and My Bookings integration, but only after independently verified backend PAID/issuance contracts are audited. Do not start automatically.** Read the current Payment return/status guide/report, VNPAY v1.1 and actual backend PAID/issuance/ownership contracts before planning that independently authorized slice. No history/list or issuance contract is invented here.

## Remaining limitations and dependencies

- Seat/Hold, Booking creation/owned Summary, Concession, Promotion, Payment initiation and known-attempt return/status/recovery now use authoritative APIs. Separate static Payment previews remain unchanged; My Bookings/Tickets/QR remain previews. VIP Booking snapshots are real; old Summary demo pricing supports STANDARD/COUPLE only and must never determine persisted prices. Actual Sandbox return/callback/SUCCESS/PAID is NOT RUN; fixed HTTPS routing configuration is future deployment work.
- No bulk-release/replacement endpoint exists: clear uses sequential exact-ID releases, stops on failure and reconciles remaining ownership. No implicit release or renewal on navigation. Polling/operations reconcile rather than realtime push; reads are not a final Booking guarantee. Downstream previews carry original expiry but cannot prove continuing ownership.
- Automatic STARTED/ENDED progression, operational cancellation with history/refunds, Manager scoped authoring, Delete, layout reshaping and durable searchable Admin audit remain outside this task. Cinema-first behavioral contract remains unresolved; Movie-first real discovery is implemented.
- Legacy Auth response/session userId is numeric; new domain IDs are decimal strings. Do not claim global ID safety.
- Development datasource is a privileged migration login. Restricted runtime ACL is verified, but production must use separate deployment/runtime credentials. No deployment performed.
- VNPAY Sandbox merchant interoperability remains **DEFERRED and disabled by default**. No provider changes, external calls/charge, Payment result or Ticket/QR activity occurred in this task. Follow the current confirmation register only under separate authorization.

## Contracts and historical evidence

| Read | Boundary |
|---|---|
| [Admin Showtime v1.0](../api/admin-showtime-contract-v1.0.md), [latest report](../reports/2026-10-02_admin-showtime-management_report.md) | Current V12 authoring plus Customer real READ slice |
| [Admin configuration](../api/admin-cinema-configuration-contract-v1.0.md), [V11 report](../reports/2026-10-01_v11-admin-cinema-configuration_report.md) | Protected Cinema/Hall/Seat; final historical verification Cinema 4/Hall 7/Seats 271–273 remain INACTIVE |
| [Admin Movie](../api/admin-movie-contract-v1.0.md), [live Movie report](../reports/2026-10-01_live-neon-admin-and-cinema-management-preflight_report.md) | Existing management; historical verification Movie 12 remains UNPUBLISHED |
| [Discovery v1.0](../api/customer-discovery-contract-v1.0.md), [Seat/Hold v1.0](../api/seat-hold-contract-v1.0.md), [v1.1 delta](../api/seat-hold-contract-v1.1.md), [Hold frontend report](../reports/2026-10-02_customer-authoritative-seat-hold-frontend_report.md) | Real Customer read/Hold and Booking frontend; latest evidence/guide above |
| [Booking v1.3](../api/booking-contract-v1.3.md), [Payment initiation](../api/payment-initiation-contract-v1.0.md), [return/status guide](../development/customer-payment-return-status-recovery-frontend.md) | Permanent first-attempt freeze, explicit initiation, known-ID owned result/recovery and fixed return landing; Sandbox submission/interoperability remains gated |
| [Promotion v1.1](../api/promotion-composition-contract-v1.1.md), [Concession](../api/concession-composition-contract-v1.0.md) | Authoritative pre-Payment backend composition |
| [VNPAY v1.1](../api/vnpay-sandbox-payment-contract-v1.1.md), [v1.0](../api/vnpay-sandbox-payment-contract-v1.0.md), [report](../reports/2026-09-30_vnpay-sandbox-payment-backend_report.md) | Local protected result/finalization paths; real merchant certification pending |
| [Integrity v1.2](../db/integrity-enforcement-design-v1.2.md), [v1.1](../db/integrity-enforcement-design-v1.1.md), [dictionary](../db/physical-data-dictionary-v1.0.md) | Ordered guards, snapshots, protected paid finalization |
| [Demo seed](../development/demo-seed.md), [seed report](../reports/2026-10-01_development-demo-seed_report.md) | Historical 72 Showtimes/3240 memberships unchanged; never reseed for verification |
| [Final Customer QA](../reports/2026-09-28_customer-frontend-final-qa_report.md) | Historical preview milestone; Discovery/map/Hold descriptions superseded by current integration reports |
| [Development Admin provisioning](../development/development-admin-provisioning.md) | Existing opt-in non-web CLI, ignored local inputs; no account reset/promotion |

## Developer workflow

Run **`pnpm dev` from root**; see [README](../../README.md#local-development). Backend `.env` is Git-ignored and loaded as optional properties; never commit/print credentials. Keep Hibernate `ddl-auto=validate` and Flyway enabled. `pnpm admin:dev` remains opt-in; no seed/provisioning rerun was needed here.

Use dedicated local PostgreSQL for destructive isolated-schema tests, never Neon. Current regression DB: `smart_cinema_v11_accepted_20261001`; enable MOVIE_DB_TESTS, DISCOVERY_DB_TESTS, SEAT_DB_TESTS, BOOKING_DB_TESTS, CONCESSION_DB_TESTS, PROMOTION_DB_TESTS, PAYMENT_DB_TESTS, VNPAY_DB_TESTS and DEMO_DB_TESTS; deterministic test cleanup=false. Frontend uses installed Edge via `PLAYWRIGHT_CHANNEL=msedge`. Keep provider gates false until actual approved merchant evidence exists. No further migration, commit or feature is authorized by this handoff.
