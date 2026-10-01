# Smart Cinema implementation report — Admin Showtime Management

## 1. Task Information

Task: Authorize V12 and complete Admin Showtime Management + real Customer READ integration.
Date: 2026-10-02, Asia/Ho_Chi_Minh.
Module: Admin Showtime, Customer discovery and authoritative Seat-map reads.
Type: Backend/database/frontend implementation and local/live verification.
Status: **COMPLETE** — implementation, final full regression, live Neon API/browser proof and preservation checks PASS.

The separate user task explicitly approved exactly one V12 and existing public
Customer READ integration, resolving the earlier preflight gate. No further
feature, commit, provider integration or production deployment is implied.

## 2. Requested Work

Guarded global ACTIVE ADMIN schedule authoring with exact times/money,
conservative lifecycle/history protection, complete atomic membership, Hall
overlap protection and narrow privileges. Provide real list/create/edit UI;
replace only Customer Cinema/Showtime/detail/Seat-map READ mocks with existing
public APIs. Run full regression, migrate Neon normally, create exactly one
verification Showtime through normal Admin browser and reach it through normal
Customer browser. Preserve original seeds, financial history and V1–V11.

## 3. Documents Reviewed

- [AGENTS](../../AGENTS.md), [workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md),
  backend/frontend workflows and coding/document/traceability/UI rules;
  [conventions](../development/project-conventions.md), [frontend instructions](../../frontend/AGENTS.md)
  and bundled Next.js documentation; [context](../ai/project-context.md) and [handoff](../ai/current-handoff.md).
- [SRS v1.2](../srs/srs-v1.2.md) §§3.1, 3.4, 3.5, 3.15, concurrency/data integrity;
  [BRD v1.2](../brd/brd-v1.2.md) §4.4;
  [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md) §§17–19;
  [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx).
- [Preflight](2026-10-02_admin-showtime-management-preflight_report.md),
  [V11 report](2026-10-01_v11-admin-cinema-configuration_report.md),
  [Admin configuration](../api/admin-cinema-configuration-contract-v1.0.md),
  [Admin Movie](../api/admin-movie-contract-v1.0.md),
  [Discovery](../api/customer-discovery-contract-v1.0.md),
  [Seat/Hold base](../api/seat-hold-contract-v1.0.md) and [v1.1](../api/seat-hold-contract-v1.1.md).
- [Dictionary](../db/physical-data-dictionary-v1.0.md),
  [decisions](../db/database-design-decisions-v1.0.md),
  [logical ERD](../db/erd/smart-cinema-logical-erd.md),
  [integrity](../db/integrity-enforcement-design-v1.0.md),
  [lock-order addendum](../db/integrity-enforcement-design-v1.1.md) and [V10 addendum](../db/integrity-enforcement-design-v1.2.md).
- V1–V11, actual Discovery/Seat/Booking/Payment guards, Admin auth/audit,
  seed initialization, current Customer screens and approved UI references.
  Requirements, historical contracts/reports and Stitch remain unchanged.

## 4. Requirements Traceability

| Requirement/source | Implemented boundary/evidence | Result |
|---|---|---|
| FR-AUTH-007, SRS §3.1 | JWT ADMIN plus independent current ACTIVE DB check; other roles/stale/blocked denied | PASS |
| FR-SHOWTIME-001/002/003, SRS §3.4 | Atomic create, safe future edit/forward lifecycle/cancel; no Delete or historical mutation | PASS for approved Admin subset |
| FR-SHOWTIME-004/005, SRS §3.4 | Existing Hall exclusion, touching/different-Hall/concurrent tests; persisted duration calculation | PASS |
| FR-SHOWTIME-006/007/008, SRS §3.4 | Existing Movie→Cinema/date schedule + real Customer reads; server start/cutoff retained | PASS for Movie-first flow; Cinema-first deferred |
| FR-SHOWTIME-009/010, SRS §3.4 | Exact nonnegative price, active valid Hall/Cinema, complete capacity | PASS |
| FR-CINEMA-001/002, SRS §3.3 | Real public Cinema list/detail adapter | PASS |
| FR-SEAT-001/003/004/017, SRS §3.5 | Real per-Showtime map; whole STANDARD/VIP/COUPLE; derived availability and nonsellable physical units | PASS for READ scope |
| FR-AUDIT-002, SRS §3.15 | Existing after-commit actor/resource/action technical audit; no success log on rollback | PASS for established audit pattern |
| NFR-CONC-005/007, SRS §4 | Ordered locks, bounded timeout, safe conflict responses and PostgreSQL races | PASS |
| BR-012–016, BRD §4.4 | Approved creation, non-overlap, duration and discovery behavior | PASS within authoring scope |
| DR-003/005/013, SRS integrity | Existing Movie/Hall/Seat identity checks/FKs and valid intervals retained | PASS |
| Hold/Booking/Payment frontend writes, Manager authoring, time progression, Delete/refunds | Explicit exclusions, no implementation in this task | NOT APPLICABLE |

No new BR/FR/UC/NFR/data-rule IDs or business states were invented. The user
resolved authoring buffer/cutoff and Movie eligibility directly; BRD/SRS were
not rewritten to make implementation appear compliant.

## 5. Implementation Summary

### 5.1 Accepted policy and lifecycle

New authoring requires PUBLISHED Movie and ACTIVE Cinema/Hall with a complete
physical layout matching guest capacity. Historical non-PUBLISHED schedules stay
readable without changing Movie publication. Hall is permanent after membership.
Server derives end from persisted duration; new/retimed occupied_until=end and
booking_cut_off=start. No demo 15-minute policy is adopted. Price/status-only
edits preserve stored end/occupancy/cutoff, including original seed values;
later Movie runtime edits do not rewrite schedules. Price is exact
numeric(19,4)/BigDecimal: zero and fractions allowed, nonnegative and below 1e15.
No floating point or VNPAY conversion rules enter persistence.

| Current | Approved next |
|---|---|
| New | DRAFT, SCHEDULED, OPEN_FOR_BOOKING |
| DRAFT | SCHEDULED, OPEN_FOR_BOOKING, CANCELLED |
| SCHEDULED | OPEN_FOR_BOOKING, CANCELLED |
| OPEN_FOR_BOOKING | CANCELLED |
| STARTED, ENDED, CANCELLED | None |

Same-state edits require a future, unreferenced eligible schedule. OPEN requires
sellable membership and future cutoff. No regressions/reopening or Admin
STARTED/ENDED. Any Hold/Booking history, including released/expired Holds,
freezes schedule, price, membership and lifecycle. Safe cancellation of a future
unreferenced row preserves stored content and can still work after a parent
became ineligible; it releases/refunds nothing.

### 5.2 V12 security, atomicity and concurrency

[V12](../../backend/src/main/resources/db/migration/V12__guard_admin_showtime_configuration.sql)
adds `configure_showtime` and a complete history guard under the existing
separate NOLOGIN configuration owner. Fixed search_path, schema-qualified
bodies, revoked PUBLIC execution and temporary managed ownership/bootstrap
grants revoked before commit. Runtime receives only intended writer EXECUTE,
no direct Showtime/membership DML, private initializer execution, owner
membership/SET authority or broad Seat privileges. No HTTP role switching,
caller SQL, disabled trigger, startup replacement or new overlap index.

Order: actor → Cinema SHARE → Hall exclusive → existing Showtime UPDATE →
Movie SHARE → ordered Seats SHARE → ordered membership UPDATE. The new row
and private membership initialization occur in one transaction under those
parent gates. Every physical unit is represented; inactive/maintenance units
are nonsellable. COUPLE remains one row/membership for two guests. Existing
V5 guards/FKs and `ex_showtimes_hall_occupancy` are retained. Half-open intervals
allow exact touching, reject same-Hall overlap and permit different-Hall overlap.
Conflicting concurrent creates leave only a safe committed state. Clock checks
are repeated after resource waits; runtime cannot bypass authoritative checks.

### 5.3 Admin APIs and frontend

GET collection/detail, POST collection and PUT detail at
`/api/v1/admin/showtimes`; no DELETE. Strict date/movieId/cinemaId/hallId/status
filters, unknown/repeated-query rejection and deterministic start/ID ordering.
Write accepts only string movieId/hallId/startsAt/basePrice/status; derived values
and actor cannot be supplied. IDs and exact money remain strings; time requires
an explicit offset and supported precision. Existing safe ProblemDetail behavior:
400 input, 401 anonymous, 403 authority, 404 missing resource, 409 overlap/history/
transition/readiness/time/contention, safe 503 unexpected database failure.

Admin navigation and `/admin/showtimes`, `/new`, `/{showtimeId}/edit` provide real
list/filter/loading/empty/retry, dependent Movie→Cinema→Hall controls, configured
zone display/explicit wall-time conversion, exact price text and forward lifecycle
only. Cinema changes clear stale Hall. Initialized Hall is disabled. Busy/ref gates
prevent duplicate submission. History/terminal detail stays readable without
mutation. Keyboard/mobile tests and actual browser review passed.

### 5.4 Real Customer READ boundary

New discovery adapter calls only existing public GET cinemas, Cinema detail,
Showtimes, Showtime detail and per-Showtime Seats. IDs/context are preserved,
responses are noncached and abort/error/retry aware. Public discovery still
requires PUBLISHED Movie + ACTIVE parents + OPEN_FOR_BOOKING + future start and
cutoff. Server dates/IANA zone govern display; no fabricated free Seat counts,
format, pricing or sold-out Showtime flags. Movie entry's obsolete Preview badge
is removed because Cinema browsing now reads the real catalog.

Seat map projects sorted row/number labels into a scrollable visual grid, without
claiming persisted coordinates. AVAILABLE/HELD/BOOKED/UNAVAILABLE and VIP are
shown distinctly. COUPLE is one spanning selectable control. UI explicitly
says selection/countdown is local and creates no server Hold/reservation.
Concession onward and My Bookings/Tickets/QR remain preview adapters. No
transactional endpoint/provider was connected. Test-only HTTP fixtures use
actual read contract shapes; they are not evidence of live integration.

## 6. Files Created

- Backend Admin `AdminShowtimeRequest`, `AdminShowtimeRepository`,
  `AdminShowtimeService`, `AdminShowtimeController`, `AdminShowtimeExceptionHandler`.
- V12 guarded migration and `AdminShowtimePostgresTests`.
- Frontend Admin Showtime routes, `admin-showtime-screen.tsx`,
  `admin-showtime.types.ts`, `admin-showtime.test.ts`.
- Frontend `features/discovery/discovery-api.ts` and its unit tests;
  `test/e2e/admin-showtimes.spec.ts` and Customer discovery HTTP-fixture helper.
- [Contract](../api/admin-showtime-contract-v1.0.md),
  [development guide](../development/admin-showtime-management.md), this report.

## 7. Files Modified

- Auth security: existing Admin Bearer/CSRF pattern for the new guarded writes.
- Backend application/mock wiring, current-head assertions and Booking/Concession/
  Promotion/Payment PostgreSQL fixtures. Old tests that directly changed Showtime
  after history now assert protection or use fresh unreferenced fixtures. A
  V10→V11 historical upgrade test remains explicitly pinned to 11. Production
  Booking/Payment/VNPAY source and V1–V11 are unchanged.
- Admin API client, shell/navigation/home, Customer Cinema/Showtime/Seat screens,
  shared read/preview types, Seat handoff cutoff guard and Movie entry label.
  Summary demo price type excludes unapproved VIP fixture pricing; no new price
  rule or transactional behavior is introduced.
- Frontend unit command and existing E2E setup/expectations for actual read DTOs.
  Loading tests control HTTP completion; Payment preview allowlists permit only
  newly authorized GET reads and still reject provider/transaction calls.
- README, current Admin configuration guide, project context and current handoff.
  Historical reports/contracts, requirements, Stitch, secrets/templates and
  package lockfiles are unchanged. No dependency or port change.

## 8. Verification

| Check | Result / evidence |
|---|---|
| Full Maven `mvn verify` | PASS — 294 tests, zero failures/errors/skips; package/repackage; 2026-10-02 02:12:58 +07:00 |
| PostgreSQL local integration | PASS — PG18.4, all nine existing DB-suite flags enabled, isolated schemas on dedicated local DB |
| Fresh V1→V12 and populated V11→V12 | PASS — one forward upgrade, old checksums/seed timing unchanged, deployment/demo initialization compatible |
| Backend guarded Showtime tests | PASS — 16 new tests: strict input/auth/time/price/parents/layout/lifecycle/history, overlap/concurrency/gates, public reads/map, privileges and large IDs |
| TypeScript `pnpm exec tsc --noEmit` | PASS |
| ESLint `pnpm lint` | PASS |
| Unit `pnpm test` | PASS — 62, zero failures/skips |
| Production `pnpm build` | PASS — all Customer/Admin routes built |
| Full `pnpm test:e2e` | PASS — final tree 94/94, Edge, one worker, retries=0, 6.9 minutes; verified by 2026-10-02 02:56 +07:00 |
| Desktop/mobile/keyboard | PASS — automated coverage plus normal real Admin/Customer browser review, 390×844 mobile, no page overflow; map scroll intentional |
| Neon normal Flyway/Hibernate startup | PASS — PG18.6, V11→V12 only, validation/startup 2026-10-02 02:25:34 +07:00 |
| Real Admin API/browser | PASS — normal login/JWT, create/list/detail, exact safe price edit, terminal cancellation/read-only |
| Real Customer API/browser | PASS — same Movie/Cinema/Showtime/map identities without interception, 45-unit API/UI match, COUPLE selected/deselected whole |
| Runtime grants/managed bootstrap | PASS — local attempted denial tests and live read-only ACL/non-superuser/revoked SET checks |
| Seed/history/checksum preservation | PASS — complete pre-existing row fingerprints unchanged, V1–V11 applied checksums unchanged |
| Documentation/links/whitespace/handoff/secrets | PASS — 171 local links, UTF-8/new-file whitespace/EOF and Git diff checks; 110 protected historical files preserved; ignored .env/private-value scan; reconciled head/contracts/report/next task |
| Real Hold/Booking/Payment/frontend/provider operations | NOT RUN — explicitly outside scope; no writes performed |

Initial verification failures were resolved: guarded-history fixtures could no
longer modify referenced schedules; E2E mock read shapes/selectors/loading races
were reconciled with real read adapters. Default Chromium was absent on this host;
the complete suite used installed Edge. No retries or removed assertions mask
failures. A corrected Admin fixture now derives end/occupancy/cutoff after retime;
its five tests additionally passed before live verification. Final production
label cleanup triggered another full frontend verification. That run found a
test selector matching both read-only and Hall-loading status messages; the
selector now targets the intended read-only message without dropping the
disabled-write assertion. The subsequent complete final-tree run passed all
94 tests with no retries. TypeScript/lint also passed after the selector fix.

### 8.1 Live Neon proof and final state

Before startup, a read-only baseline captured V1–V11 applied checksums and full
row fingerprints for catalog/hierarchy/schedules/membership and all existing
Booking/Hold/Payment/Ticket/Promotion/Concession/evidence/reconciliation/audit
tables. No reseed or alternate migration writer. Verification startup disabled
only cleanup for that process to avoid unrelated expiry mutations; defaults remain.

Exactly one new Showtime: **73**, Movie **9** `[DEMO] Clockwork Garden`, Cinema
**1** `[DEMO] Smart Cinema Central`, Hall **1** `Demo Hall 1`. Browser selected
existing seed parents and created OPEN_FOR_BOOKING at **2026-10-09 23:17** in
`Asia/Ho_Chi_Minh`; UTC start `2026-10-09T16:17:00Z`, end/occupied
`2026-10-09T18:27:00Z`, cutoff=start, persisted Movie duration 130 minutes.
Price `90000.1234` safely changed to **`90001.4321`**, preserving all times.

Normal signed login/API list/detail, public Cinema query, schedule for 9 October,
Showtime detail and map passed. Customer browser followed catalog→Movie 9→Cinema
1→date→Showtime 73→Seats, no interception or replacement data. All **45** unique
API Seat Units matched UI labels: 30 STANDARD, 10 VIP, five whole COUPLE,
**50 guests**. Selecting E1-2 gave one unit/two guests; deselection gave zero/zero.
Desktop/mobile and keyboard focus worked; truthful no-Hold messaging remained.
Local selection made no Hold/Booking/Payment write.

Admin browser then safely set **CANCELLED**. Final detail is read-only; Admin
filtered list still contains 73; public schedule excludes it and public detail is
404. Customer browser shows no Showtimes for that date and disabled Continue.
No Delete or seed schedule/layout edit. Post-check excluded only new Showtime 73
and its 45 memberships and matched every original row fingerprint/checksum.
Expected normal Auth login/refresh-token activity is separate from those tables.
Task-owned servers/tabs are closed after verification; no credentials/JWT are
logged in this report. Local screenshots are ignored verification artifacts.

## 9. Requirement Reconciliation

PASS: approved PUBLISHED authoring, stored duration snapshots, no buffer/cutoff
invention, exact money, permanent Hall, full membership, atomic COUPLE, conservative
matrix, full history freeze, narrow runtime boundary, overlapping races,
authorization, existing public eligibility and real Customer READ integration.
PASS: no out-of-scope checkout/provider/admin module, no historical migration or
requirement rewrite, seed/financial preservation. All final frontend/documentation
checks are green; the approved COMPLETE gate is satisfied. No unresolved failure
within this slice remains.

## 10. Deviations / Conflicts

- Earlier preflight prohibition on V12/read integration was resolved by the explicit
  accepted task. It remains unchanged as historical evidence; this is the new report.
- Demo seed buffer/cutoff are preserved data, not authoring policy. Conservative
  lifecycle is documented in the new contract; Manager/time-progression/operational
  cancellation remain outside scope rather than inferred from general requirements.
- Existing Auth numeric userId/session exception remains; new domain IDs are strings.
- Runtime role ACL is narrow. The local development datasource remains the existing
  privileged migration login, not a production deployment model; production must
  separate runtime/deployment credentials. No credential/grant workaround was added.
- Existing historical document filenames follow their established exceptions;
  no mass rename. No new convention exception is required.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md).

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | Existing feature/package locations; kebab-case TS/docs; framework route/page and Java PascalCase exceptions |
| Code/import naming | PASS | PascalCase classes/components/types, camelCase functions, existing `@/` alias; no new dependencies |
| Domain/status terminology | PASS | Showtime/Hall/Seat Unit, existing six stored statuses and four derived Seat availability values |
| API/routes | PASS | `/api/v1/admin/showtimes`, resource GET/POST/PUT; plural existing Customer GETs, string IDs, no Delete/fake API |
| Database | PASS | Sole snake_case V12, guarded fixed-path functions and existing named exclusion; V1–V11 unchanged |
| Time/money/security | PASS | Explicit configured-zone conversion, exact decimal text/BigDecimal, server locks, no client authority or secret output |
| Documentation/report | PASS | New dated kebab-case report, additive contract, reconciled current context/handoff, verified relative links/whitespace; historical preservation and report itself rechecked |

## 11. Known Limitations

- Customer read availability is a snapshot. Real authenticated Hold/release/expiry
  UI and subsequent Booking/Payment integration are not implemented here.
- VIP map display works; existing downstream Summary demo pricing supports only
  STANDARD/COUPLE fixtures. No VIP price policy is fabricated. Production checkout
  must use server Hold/Booking totals rather than those preview prices.
- Ordered row/number labels are a visual projection; real physical coordinates
  are not in the existing public contract. Numeric Seat labels retain backend
  lexical ordering (for example A1, A10, A2), without changing persistence.
- Automatic STARTED/ENDED, history-bearing operational cancellation/refunds,
  Manager authoring, Delete, other Admin modules, layout reshaping and durable
  searchable Admin audit remain outside the approved slice.
- Real VNPAY merchant certification stays DEFERRED/default disabled, unchanged.
  No provider calls, charge, Payment result, Ticket or QR issued during live proof.
- Legacy Auth numeric IDs and separate production runtime/deployment credentials
  remain known dependencies. Cinema-first contract behavior remains unresolved.

## 12. Next Recommended Step

**Customer authoritative Seat Hold frontend integration using existing Seat/Hold
v1.0 + v1.1.** Replace local acquisition/release/countdown with authenticated owned
atomic Hold behavior and server expiresAt, preserving real reads, whole COUPLE,
cutoff/conflict handling and original deadlines. Keep Booking/Payment frontend
integration separately authorized. Current handoff points to this exact task;
do not begin it automatically. STOP after this task; no commit requested.
