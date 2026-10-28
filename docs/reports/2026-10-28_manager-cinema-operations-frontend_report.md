# MANAGER Cinema Operations frontend implementation report

## 1. Task information

Date: 2026-10-28, Asia/Saigon. Frontend-only implementation using the verified
[Manager API v1.0](../api/manager-cinema-operations-contract-v1.0.md) and
[backend report](2026-10-27_manager-cinema-operations-backend_report.md).
**Outcome: PASS — implemented and verified for the requested frontend scope.**
No backend or contract change.

## 2. Implemented interfaces

| Interface | Real frontend routes | Behavior |
|---|---|---|
| Rạp được phân công | `/manager` redirects to `/manager/cinemas` | Backend-scoped Cinema cards, supported address/contact/status, detail navigation |
| Quản lý rạp | `/manager/cinemas/[cinemaId]` | Owned Cinema, Hall list, create/edit dialogs, supported physical statuses, fixed capacity after initialization |
| Quản lý tình trạng ghế | `/manager/seats`, `/manager/halls/[hallId]/seats` | Scoped Hall chooser, grouped row/Seat grid, whole COUPLE, detail, confirmed maintenance changes, complete initial layout |
| Quản lý suất chiếu | `/manager/showtimes`, `/manager/showtimes/new`, `/manager/showtimes/[showtimeId]/edit` | Supported filters, published Movie search/paging, scoped Cinema/Hall choices, create/edit/read-only historical detail |
| Nhân viên tại rạp | `/manager/staff`, `/manager/cinemas/[cinemaId]/staff` | Contact/account status/effective assignment only; read-only |
| Phân công Quản lý | `/admin/managers` | Existing Manager accounts, selected assignment history, one-Cinema grant, future effectiveAt, deactivate/reactivate confirmations |

Dedicated Manager shell uses Nocturne tokens/fonts, responsive navigation and skip
link. ADMIN assignment belongs only to existing AdminShell. Manager account-menu
entry and allowlisted login resume added; existing auth/session/renewal/logout
implementation is preserved. A stored role never authorizes data: Manager shell
requires the real scoped API and every operation remains server-authorized.

## 3. References and requirement reconciliation

Read AGENTS.md, frontend/canonical workflows, conventions and applicable rules;
current handoff, Project Scope v1.0 Manager scope, BRD/SRS v1.2, relevant System
Analysis use cases already traced by the backend report, existing ADMIN
configuration/Showtime/Staff/Reporting implementations and `.stitch/DESIGN.md`.
Read installed Next.js16.3.5 page/layout guides; React19.2.8, TypeScript5 and
Tailwind4 conventions retained. Working tree was clean at entry.

Live Stitch project `1208499799798658711`: listed current screens, retrieved all
six with get_screen, downloaded/read HTML and viewed exported images read-only.

| Stitch reference | Current screen ID |
|---|---|
| Rạp được phân công | `0f9b45c057214739ad0de8908dd0b850` |
| Quản lý rạp | `9eca84f2fdaf4cf69b1e68dc9180270c` |
| Sơ đồ ghế | `c3f01a57af1342789159f2b26b83b69c` |
| Quản lý suất chiếu | `bebce74a6c164c74915fb8f92f935042` |
| Nhân viên tại rạp | `5229c9ca853846e48a72c6e6f39abd44` |
| Phân công Quản lý | `dea397168b7b4527a441b68446718ea2` |

Used dark layered surfaces, amber actions, readable forms/statuses and operational
Seat-grid direction. Some images contain obscured/empty portions despite available
HTML. Unsupported sample statistics, IDs, HR/POS/shift fields, fake permissions,
notifications, assignment editing/multi-create and Manager-side ADMIN navigation
were omitted. Prototype JavaScript was not copied. Native responsive cards/forms
adapt desktop references; this is not a pixel-for-pixel recreation or a Stitch edit.

| Actual requirement | Reconciliation |
|---|---|
| BRD BR-002/003; SRS FR-AUTH-007/008, FR-ORG-005; NFR-SEC-002/003/006 | PASS: real backend role/scope gate, canonical IDs, typed responses, safe errors, no client authorization claims |
| BRD BR-009–011; SRS FR-CINEMA-006–009, FR-SEAT-002/003/017 | PASS: Hall/Seat operations within the existing writer contract; no booking/holding, deletion or layout replacement |
| BRD BR-012–015; SRS FR-SHOWTIME-001–010 | PASS for requested list/create/edit slice: existing backend pricing, scheduling/readiness/history authority retained; no new cancellation/running-state workflow |
| BRD BR-055; SRS FR-CINEMA-010 | PASS: Staff view is read-only and uses only actual response fields |
| BRD BR-054; SRS FR-ORG-001/003 | PASS: ADMIN assignment, immutable identity/effectiveAt, preserved history and current/future/inactive presentation |
| System Analysis v1.1 UC-MGR-002–015 | PASS for the approved operations supported by the backend; unsupported broader use-case actions omitted |
| Manager Staff writes, Booking management, Reporting/Dashboard | NOT APPLICABLE: explicitly excluded from this task |

## 4. Exact API integration and safe commands

All15 MANAGER endpoints are integrated under `/api/v1/manager`:

- GET `/cinemas`, `/cinemas/{cinemaId}`.
- GET/POST `/cinemas/{cinemaId}/halls`; GET/PUT `/halls/{hallId}`.
- GET/POST `/halls/{hallId}/seats`; GET/PUT `/seats/{seatId}`.
- GET `/cinemas/{cinemaId}/staff`.
- GET/POST `/showtimes`; GET/PUT `/showtimes/{showtimeId}`.

All4 ADMIN endpoints under `/api/v1/admin/managers`: GET base, GET/POST
`/{managerId}/cinema-assignments`, PUT
`/{managerId}/cinema-assignments/{assignmentId}/status`.
Existing GET `/api/v1/admin/cinemas` supplies ADMIN options; public GET
`/api/v1/movies` supplies paged published Movie options. No new endpoint.

Typed adapters validate IDs, parent/receipt identity, known enum fields, amounts,
UTC precision, arrays and assignment invariants. IDs and money remain strings;
capacity/page values alone use numbers. Reused existing configuration/Showtime
types, price validator, discovery API and time conversion helpers. Changed times
use the response IANA zone; unchanged Showtime instants retain original
microseconds. Assignment inputs explicitly use GMT+7 and submit UTC.

Commands require explicit user action, lock duplicate submissions, never update
optimistically or replay automatically. Abort/stale reads use the existing request
hook. Safe fixed Vietnamese errors handle400/401/403/404/409/429/5xx/network and
malformed receipts; backend text/SQL is not rendered. Writes respect Retry-After.
An untrusted per-tab review hint stores no credentials, PII, body or status and
survives interrupted navigation/reload. Uncertain/conflicting writes block further
commands until explicit server GET review. Unknown create recovery returns to the
refreshed Hall/Showtime list; it does not guess a resource ID or resend creation.

Seat status choices are exactly ACTIVE/MAINTENANCE/INACTIVE; no BROKEN status.
Frozen structure disables row/number/type editing. Before reference, only supported
same-capacity type changes are offered. Initial creation supplies the complete
layout with matching people capacity; draft rows are not persisted Seat append/
delete. Rows/labels are display ordering, not invented physical coordinates.
Hall status updates do not cancel shows, release Holds or refund Bookings.

## 5. Files created and modified

New feature files in `frontend/src/features/manager/`:
`manager-api.ts`, `manager-api.test.ts`, `manager-navigation.ts`,
`manager-shell.tsx`, `operations-ui.tsx`, `manager-cinema-screen.tsx`,
`manager-seat-screen.tsx`, `manager-showtime-screen.tsx`, `manager-staff-screen.tsx`.
New ADMIN screen: `features/admin/admin-manager-screen.tsx`.

Thin Next.js pages/layout under the routes in §2 (12 files). New
`test/e2e/manager-operations.spec.ts` and `test/fixtures/manager-operations.ts`.

Modified: `frontend/package.json` (append unit suite), `features/admin/admin-shell.tsx`
(one link), `features/auth/customer-account-menu.tsx` (Manager entry),
`features/auth/login-form.tsx` (role destination/strict resume),
`components/ui/dialog.tsx` (optional initialFocus after native showModal;
existing callers retain behavior), `docs/ai/current-handoff.md` (additive).
Existing `test/e2e/admin-movies.spec.ts` and `test/e2e/shared-ui-foundation.spec.ts`
retain all cases, with navigation expectations updated for the newly authorized
ADMIN and Manager links; other-role exclusion assertions remain explicit.
This report is new. No backend, historical report/contract, environment, dependency,
Flyway or database schema changes.

## 6. Verification

Baseline: TypeScript/lint PASS,269 unit tests PASS. Final commands from `frontend/`:

```powershell
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
$env:PLAYWRIGHT_CHANNEL='msedge'
pnpm exec playwright test 'admin-|manager-operations|shared-ui-foundation|customer-final-qa' --reporter=line
```

| Check | Actual result |
|---|---|
| `pnpm exec tsc --noEmit` | PASS, exit0; final test-source check also PASS |
| `pnpm lint` | PASS,0 errors/12 pre-existing ignored-artifact warnings |
| `pnpm test` | **287/287 PASS**,269 baseline+18 new;0 failures/skips |
| `pnpm build` | PASS, final production assets generated; all12 new route/layout files compile |
| New Manager browser cases | **21/21 PASS** in the latest broad run |
| Broad selected browser regression | Latest broad run **134 PASS/1 FAIL** out of135; the remaining failure was missing Dashboard fixture isolation |
| Final affected ADMIN Movie suite | **9/9 PASS** after fixing that fixture; includes the previously failing case |
| Distinct selected browser coverage | **135 cases have passing results across verified runs**;9 rerun cases are included, not added. A single final135/135 run is not claimed |
| Real functional/visual verification | **14/14 functional groups +21/21 screen/width comparisons PASS**, separate from HTTP fixtures |
| Database preservation/status | PASS, original rows/guards/history unchanged; source/installedV17 |
| Entire repository Playwright/backend Maven | NOT RUN: relevant frontend suites selected; no backend change |

Selected suites include all88 ADMIN cases,21 new Manager cases, Customer final QA
and shared UI/auth role regression. Default one worker and zero retries retained;
no cases skipped or removed. Final executed affected-suite command:

```powershell
pnpm exec playwright test admin-movies --reporter=line
```

Logs: `unit-complete.log`, `typecheck-verified.log`, `lint-verified.log`,
`build-final.log`, `playwright-final.log`, `playwright-admin-movies-verified.log`.
The initial failures remain recorded rather than being masked as successful runs.

### Real local execution, separate from HTTP fixtures

Executed root `scripts/local-dev.ps1 -Action Status` and normal
`scripts/local-dev.ps1`. Actual/source **V17**, pending0/failed0,17 checksums valid.
No migration/operator grant during startup. Real Spring Boot8080, Next3000 and
API proxy healthy. Backend source and API contracts were not changed.

Reused the previously explicitly approved fixed-local V17 QA fixture scope and
helper. Four fresh synthetic role accounts and two QA Cinemas were created;
credentials remain in an ignored owner-only file. No existing operational account
or assignment changed. Real browser used ordinary login and the UI, without API
interception or injected auth. Only newly created QA configuration/assignments
were mutated. One earlier empty QA Hall is retained alongside the final Hall.

**14 real functional groups PASS**,136 recorded Manager/ADMIN browser responses
across the completed stages:126×200,4×201,3×403,2×404,1×409. Evidence is combined
from completed initial groups and the continuation after the focus fix; no
mutation replay was used to resume. Real Hall92, whole-layout Seats, Showtime43,
Cinema95 and future Cinema96 assignment50 remain QA evidence. UI created/updated
real rows, overlap409 was rejected, referenced Seat structure froze, future grant
did not authorize immediate access, and same JWT lost/regained authority after
ADMIN deactivate/reactivate. Original assignment effectiveAt remained unchanged.
CUSTOMER/STAFF and Manager→ADMIN denial verified with real signed JWT logins.
Existing seven ADMIN modules loaded through real navigation. No page errors.

**21 real visual screen/width comparisons PASS**,390/768/1440, covering assigned
Cinemas, Hall list, Seat grid, Showtime list/editor, Staff and ADMIN assignments.
No horizontal overflow; Manager primary controls≥44px high and≥16px text.
Dialog focus/trap/Escape/restoration, visible focus and reduced-motion setting
verified. Vietnamese labels remain readable; native date widget formatting follows
the browser/OS while configured calendar zone is displayed explicitly.

Read-only before/after fingerprints across23 original tables, V1–V17 Flyway rows,
function definitions, roles/memberships and financial/catalog counts PASS.
No Hold/Booking/Payment/Ticket/evidence/reconciliation records added or modified.
No Neon, SMTP, VNPAY, destructive cleanup, reset/reseed or schema change.
Verification services were stopped afterward;8080/3000/3100 had no listeners.
A final read-only preservation check after shutdown also passed.

Ignored evidence directory: `frontend/target/manager-ui-2026-10-28/`:
baseline/verification logs, `real-evidence-complete.json`, `visual-qa.json`, masked
`visual-*.png`, `database-preservation.txt` and the local-only verification harnesses.
Private inputs are excluded from Git and not linked or printed in the report.

## 7. Defects fixed and limitations

- Fixed test imports/unsupported Node type-stripping syntax; no TypeScript target
  relaxation. All269 original unit cases retained.
- Added explicit select accessible names after browser tests exposed option text
  being included in implicit labels.
- Added opt-in post-showModal initial focus after three responsive focus tests
  correctly failed. Existing dialog defaults preserved; no skipped/retry masking.
- Fixed React render purity for future-assignment labels using read-time timestamp.
- Tightened unknown-create review to navigate back to authoritative list data.
- First broad regression132/135 passed; three historical assertions still required
  the pre-feature navigation or no Manager link. Updated exact expected navigation
  and role-specific inclusion/exclusion, then reran the complete selected suite.
- That rerun134/135 exposed an old auth-shell fixture leaking fake credentials to
  unmocked Dashboard endpoints. Real backend403 correctly removed the shell during
  navigation. Added zero-data HTTP fixtures for Dashboard/daily in that test only;
  all9 affected ADMIN Movie cases then passed. No production authorization change.
- Initial real harness interrupted during UI refinement; completed QA state was
  retained and later verification resumed with reads, not automatic POST replay.

Staff positive rows/adverse responses are HTTP fixtures; real newly isolated Cinema
Staff list was empty. These tests do not prove SMTP, onboarding, check-in or provider
interoperability. No manual screen-reader/physical-device or production load test.
Complete configuration arrays follow current APIs; no pagination capability invented.
No new cancellation UI, layout replacement, delete, Booking or Manager reporting.
Backend Maven suites were not rerun for this frontend-only slice;234 is historical
backend evidence, not a new test execution claim.

## Convention Compliance

Checked against the canonical [project conventions](../development/project-conventions.md).

| Area | Result | Evidence |
|---|---|---|
| Folder/file/routes | PASS | kebab-case feature files, canonical Next page/layout and camelCase dynamic parameters |
| Code/types/imports | PASS | English camelCase/PascalCase, existing alias and shared types; no new dependencies |
| Domain/API/status | PASS | Actual19 endpoints, string IDs/exact amounts, existing uppercase serialized enums |
| UI/design | PASS | Vietnamese, shared Nocturne tokens/primitives, native forms/buttons/dialogs |
| Documentation | PASS | New dated report, exact requirement IDs, additive handoff; historical documents preserved |
| Backend/database naming | NOT APPLICABLE | Source/schema unchanged |

Final check PASS:913 original files fingerprinted, exactly8 authorized originals
changed and905 others unchanged;25 new files. All backend source, API contracts
and17 migration sources preserved. Strict UTF-8, whitespace and local links PASS;
Git HEAD/index unchanged. Evidence: ignored `scope-check.json`. No convention
exception, commit, push or deployment.

## Next recommended step

Select and approve the next Manager slice independently. Do not automatically
start Manager Staff writes, Booking management, Reporting/Dashboard or another module.

## 8. Final complete selected regression — 2026-10-28

**PASS — 135/135 distinct cases passed in one complete Edge run.** This closes
the earlier134/135 plus affected-suite verification limitation; the implementation
results above remain historical evidence.

Exact command, executed from the repository root:

```powershell
cd frontend
$env:PLAYWRIGHT_CHANNEL='msedge'
pnpm exec playwright test 'admin-|manager-operations|shared-ui-foundation|customer-final-qa' --reporter=line
```

Result: **135 passed,0 failed,0 skipped,0 retries;1 worker;2.4 minutes;exit code0**.
Includes all88 ADMIN cases,21 Manager cases, shared UI foundation and Customer
final QA. Failure details: none; no application, test or configuration fix required.
The existing configuration and production build were used without modification.

Files modified in this verification task: this report and
`docs/ai/current-handoff.md` (single-run regression gate now verified). All incoming
source/test changes were preserved. No backend, Flyway, API contract, operational
database or Stitch changes; backend was not started and no database tools used.
No tests skipped, removed or weakened. No commit, push, deployment or extra feature.

Ignored execution evidence:
`frontend/target/manager-final-regression-2026-10-28/playwright-complete.log`,
`exit-code.txt`, `result.json` and the source-preservation snapshot. Existing report
content retained; convention, UTF-8, links, whitespace and scope rechecked.
**Final outcome: PASS — MANAGER frontend regression verification complete.**
