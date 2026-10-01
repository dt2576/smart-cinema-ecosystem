# Smart Cinema report — Admin Showtime Management preflight

## 1. Task Information

Task: Implement Admin Showtime Management on the completed V11 foundation.
Date: 2026-10-02, Asia/Ho_Chi_Minh.
Module: Admin Showtime authoring, scheduling and membership.
Type: Domain/source audit and read-only PostgreSQL preflight.
Status: STOPPED AT V12 AUTHORIZATION GATE — audit complete; implementation deferred.

The user's task §11 and final gate explicitly require **STOP BEFORE CREATING V12**
if a safe database writer requires DDL. That condition is confirmed in source and
on the configured Neon development database. No V12, application change, Admin
Showtime API/UI or verification Showtime was created. This report is a proposal
and evidence, not an approved API contract or completed implementation.

## 2. Requested Work

Implement global ACTIVE ADMIN Showtime list/filter/detail/create/safe edit and
approved lifecycle changes, atomic Hall Seat membership, real Customer API
integration, overlap/concurrency protection, tests and live API/browser proof.
Preserve V1–V11, seeded schedules/layouts and all transactional history. First
audit the domain and observe the explicit migration gate.

## 3. Documents Reviewed

- [AGENTS.md](../../AGENTS.md), [development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md),
  [backend workflow](../../.agent/workflows/BACKEND_WORKFLOW.md),
  [frontend workflow](../../.agent/workflows/FRONTEND_WORKFLOW.md),
  [project conventions](../development/project-conventions.md), applicable coding,
  documentation, UI and traceability rules; [frontend AGENTS](../../frontend/AGENTS.md).
- [Project context](../ai/project-context.md), [current handoff](../ai/current-handoff.md),
  [COMPLETE V11 report](2026-10-01_v11-admin-cinema-configuration_report.md).
- [SRS v1.2](../srs/srs-v1.2.md) §§3.4, 3.5, 3.15, 4.2, 5.7, 6.4 and data integrity;
  [BRD v1.2](../brd/brd-v1.2.md) §3.1.6 and BR-012–016;
  [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md) §§17–19.
- [Physical dictionary](../db/physical-data-dictionary-v1.0.md) §§2, 3.10/3.11, 5;
  [database decisions](../db/database-design-decisions-v1.0.md),
  [logical ERD](../db/erd/smart-cinema-logical-erd.md),
  [integrity v1.0](../db/integrity-enforcement-design-v1.0.md) §§3/4/7 and
  [v1.1 lock-order addendum](../db/integrity-enforcement-design-v1.1.md),
  [V10 integrity addendum](../db/integrity-enforcement-design-v1.2.md).
- [Discovery v1.0](../api/customer-discovery-contract-v1.0.md),
  [Seat/Hold v1.0](../api/seat-hold-contract-v1.0.md) and
  [v1.1](../api/seat-hold-contract-v1.1.md),
  [Booking v1.3](../api/booking-contract-v1.3.md),
  [Admin Movie](../api/admin-movie-contract-v1.0.md),
  [Admin configuration](../api/admin-cinema-configuration-contract-v1.0.md).
- Current V1–V11, Discovery/Seat/Booking/Payment source, Admin authorization and
  audit implementation, demo seed, Admin shell and Customer mock adapter usages.

## 4. Requirements Traceability

| Requirement | Actual source and preflight conclusion | Result |
|---|---|---|
| FR-AUTH-007 | SRS §3.1; JWT ADMIN plus current ACTIVE database role, global Admin scope | Audited; implementation deferred |
| FR-SHOWTIME-001/002/003 | SRS §3.4; valid parents, edits that preserve history, disable without deleting history | Writer/lifecycle boundary required |
| FR-SHOWTIME-004/005 | SRS §3.4; Hall occupied interval and Movie duration/buffer | Existing exclusion confirmed; authoring policy incomplete |
| FR-SHOWTIME-006/007/008 | SRS §3.4; Movie/Cinema/date queries and server cutoff | Existing Movie-first API audited; Cinema-first contract remains separate |
| FR-SHOWTIME-009/010 | SRS §3.4; nonnegative base price and available Hall | Existing storage/eligibility audited |
| FR-SEAT-001/004 | SRS §3.5; authoritative per-Showtime map/derived availability | Membership writer required; existing map retained |
| FR-AUDIT-002 | SRS §3.15; actor/time/resource for Showtime changes | Reuse after-commit technical audit after authorization |
| NFR-CONC-005/007 | SRS §4 concurrency; bounded timeout and deterministic contention errors | Required future writer/test obligations |
| BR-012–016 | BRD §4.4; schedule creation, non-overlap, duration and discovery | Audited; no BRD changes |
| DR-003/005/013 | SRS data integrity; Movie/Hall identity, Seat Hall relationship, valid interval | Existing FK/check model retained |
| Manager authoring, Delete/refund, other Admin modules | Explicit task exclusions | NOT APPLICABLE |

No requirement IDs, statuses, domain fields or business policy were invented.

## 5. Domain Audit and Migration Decision

### 5.1 Actual stored Showtime model

[V4](../../backend/src/main/resources/db/migration/V4__create_customer_discovery_tables.sql)
is the authoritative implemented structure; the earlier dictionary is design
context. All nine fields are non-null.

| Column | PostgreSQL type | Meaning/constraint |
|---|---|---|
| id | bigint identity | PK; API projection must be a decimal string |
| movie_id | bigint | FK movies.id, NO ACTION |
| hall_id | bigint | FK halls.id, NO ACTION; unique candidate key (id,hall_id) |
| start_time | timestamp(6) with time zone | Finite scheduled instant |
| end_time | timestamp(6) with time zone | Stored end; strictly later than start |
| occupied_until | timestamp(6) with time zone | Stored end plus accepted buffer; at least end |
| base_price | numeric(19,4) | Exact nonnegative amount, less than 1000000000000000 |
| status | varchar(30) | DRAFT, SCHEDULED, OPEN_FOR_BOOKING, STARTED, ENDED, CANCELLED |
| booking_cut_off | timestamp(6) with time zone | Finite instant, no later than start |

Cinema is derived through Hall; there is no Showtime cinema_id, currency, format,
popularity, physical coordinate, seat count, sold-out status or separate Admin store.
No Showtime JPA mapping/write service exists; Discovery uses JDBC read projections.

### 5.2 Time, duration, buffer and price

- Current pooled PostgreSQL sessions use UTC. Discovery uses a UTC Clock and
  `DISCOVERY_TIME_ZONE`, default `Asia/Ho_Chi_Minh`, for local calendar dates.
  API instants end in Z; day selection uses local midnight to next local midnight,
  converted to instants. Crossing-midnight screenings belong to their start date.
- Future Admin UI must identify the configured cinema zone, convert its entered
  local date/time explicitly and submit an unambiguous instant. Browser-local
  datetime parsing is not an accepted substitute. Reuse the configured zone,
  including when its value differs from the Vietnam default.
- Movie duration is a positive stored integer in minutes. Dictionary requires
  server calculation/validation of end at authoring; later Movie changes must not
  rewrite saved schedule times. V4 itself only checks interval ordering, not the
  cross-table duration equality.
- BRD permits buffer **if configured**. Business Analysis's 15-minute buffer is
  an example. Demo seed's 15-minute occupancy buffer and 15-minute early cutoff
  are fixture rules, not an approved production authoring configuration. No current
  production scheduling buffer/cutoff configuration was found.
- Booking currently snapshots the exact base price for every whole Seat Unit.
  STANDARD/VIP/COUPLE adjustments remain unapproved. Money must use BigDecimal/
  decimal input, retaining four places without floating-point coercion, rounding,
  or VNPAY-specific whole-VND restrictions at Showtime persistence.

### 5.3 Existing overlap authority and locking

`ex_showtimes_hall_occupancy` already excludes equal Hall with overlapping
`[start_time,occupied_until)` GiST ranges for **every non-CANCELLED status**,
including DRAFT. Exact touching boundaries are allowed; different Halls can overlap.
Cancelled rows release occupancy. There is no need for a new overlap index,
constraint, extension or SELECT-then-INSERT workaround.

Authoring must nevertheless use Admin User SHARE → Cinema SHARE → Hall UPDATE →
affected Showtime UPDATE → Movie SHARE → Seat/pair resources in stable ID order.
Re-read discovered identities after parent locks and sample server time after
waiting. Hall-exclusive coordination serializes against V11 layout/status writers
and existing customer/settlement Hall-share gates before later resource locks.
An initial MVP should keep Hall identity permanent after membership initialization,
avoiding pair deletion/reparenting and a two-Hall lock protocol.

### 5.4 Membership and authoritative Seat behavior

[V5 initializer](../../backend/src/main/resources/db/migration/V5__create_seats_and_authoritative_holds.sql)
`initialize_showtime_seats(bigint,bigint[])` takes Cinema SHARE → Hall UPDATE →
Showtime UPDATE. It rejects existing membership, an empty physical layout,
duplicate/foreign selected IDs and null selection. It inserts **all** physical Hall
units once; the passed ID subset determines is_sellable. It does not itself prove
current people capacity, physical ACTIVE selection or Admin authority.

Membership uses unique (showtime_id,seat_id) and two same-Hall composite FKs.
COUPLE remains one physical identity, one membership and two guests. A safe outer
Admin writer must validate complete physical capacity, select eligible units from
the locked Hall, delegate the initializer and commit schedule + membership together.
Inactive/maintenance units remain represented, with unsellability and current
physical status checked independently. No runtime pair-edit/Delete interface is
required for this minimum proposal.

[SeatRepository](../../backend/src/main/java/com/smartcinema/seat/SeatRepository.java)
returns physical units joined to membership. BOOKED has precedence when sold_at
exists; otherwise missing/unsellable/non-ACTIVE pairs are UNAVAILABLE, valid Hold
is HELD, and the rest AVAILABLE. An eligible Showtime without membership can be
listed by Discovery while its map has unavailable units; Discovery metadata alone
does not prove readiness. The new writer must close that authoring gap atomically.

### 5.5 History and lifecycle safety gaps

V5 `trg_showtimes_hold_history` rejects changes to Movie, Hall, start/end and cutoff
after **any** Hold history, including expired/released Holds. Composite membership
FKs also prevent casually changing Hall after pair creation. The trigger does
**not** cover occupied_until, base_price or status. It is not a complete safe edit
or lifecycle authorizer.

Bookings, sold Booking Seats, Payment attempts and Tickets depend on this context;
Ticket lineage is through Booking Seat/Booking. V10 settlement checks current
OPEN_FOR_BOOKING, future start/cutoff, physical parents/pairs and exact origin Holds.
Disabling a Showtime with a pending submitted Payment can therefore leave a
financial SUCCESS unfulfillable. PAID snapshots/Tickets are never to be rewritten.

Minimum safe proposal: reject timing/Movie/price/occupancy/lifecycle edits after
any Hold or Booking history; preserve Hall/membership permanently once initialized.
Operational cancellation after transactions needs a separately approved workflow,
not an implicit refund, release, reschedule or financial rewrite. This conservative
policy is a proposal pending the authoring contract, not a claim about existing V11.
No approved general Showtime transition matrix or lifecycle worker currently exists.

### 5.6 Confirmed database block

On the configured **real Neon development database**, a read-only JDBC catalog
probe using local ignored configuration returned:

| Observation | Actual result |
|---|---|
| Flyway head / successful versioned migrations | 11 / 11 |
| showtime_seats guard | Enabled O, guard_seat_configuration |
| Showtime history guard | Enabled O, guard_hold_parent |
| Membership initializer | SECURITY DEFINER, owner smart_cinema_hold_owner |
| hold_runtime initializer EXECUTE | false |
| configuration_owner initializer EXECUTE | false |
| hold_runtime Showtime INSERT / UPDATE | false / false |
| hold_runtime membership INSERT / UPDATE / DELETE | false / false / false |
| Existing Hall occupancy exclusion | Present, same half-open non-CANCELLED definition |
| V11 guard's configuration-owner branch | Only physical seats UPDATE, not membership |
| Initialized Hall people capacity | All existing initialized layouts match |

V11 preserves membership INSERT only for hold_owner, and rejects arbitrary runtime
membership writes. Its configuration definer has no delegated Showtime initializer.
Using the privileged development migration login for ordinary SQL would hide this
permission gap; it is not an acceptable production/runtime solution. HTTP SET ROLE,
startup grants/replacing functions, disabled triggers and broad runtime DML are
expressly excluded. Java transaction logic alone cannot grant these missing rights.

**Decision: safe Admin Showtime creation requires forward database DDL. STOP here
under user task §11.** No partial Admin endpoints/routes or read-only placeholder
Showtimes navigation were added while the required write slice is gated.

### 5.7 Minimum proposed V12 — authorization required

One additive migration, provisionally named
`V12__guard_admin_showtime_configuration.sql`, with these concrete changes:

1. Add narrowly exposed Admin create/update writer routines, preferably extending
   the existing separate `smart_cinema_configuration_owner` definer. Reuse active
   Admin actor validation from V11; actor comes solely from verified backend JWT.
   Writer validates parents, time, duration/accepted buffer, exact price, status,
   readiness and reference history under the existing lock order.
2. Grant that definer only required Showtime INSERT/approved-column UPDATE and
   identity-sequence usage, parent/reference reads and minimum row-lock privileges.
   Delegate `initialize_showtime_seats` EXECUTE to the definer **only**. Runtime
   receives EXECUTE on the Admin writers, no initializer/owner membership or direct
   Showtime/Seat/membership DML. No new table owner role is required.
3. Add/evolve a narrowly scoped Showtime update guard to cover occupied interval,
   price, identity/timing and the approved lifecycle/history restrictions missing
   from V5. Preserve the existing enabled membership guard and both composite FKs;
   nested initializer execution already supplies the permitted INSERT identity.
   Preserve deployment/demo initialization; do not grant a caller-controlled bypass.
4. Create schedule and all authoritative memberships in one transaction; opening
   cannot commit an incomplete layout. Keep the existing GiST exclusion as the
   backstop and map overlap/history/concurrency conflicts to safe 409 ProblemDetail.
5. Use schema-qualified bodies and fixed search_path. Revoke PUBLIC EXECUTE, keep
   helpers private, and apply the V11 managed-PostgreSQL ownership bootstrap/revoke
   pattern transactionally. No lasting definer SET/inheritance or schema CREATE.

No new table/column/index/status, constraint removal, pair reshape/Delete, historical
backfill, snapshot repricing, Payment result write, Ticket/QR mutation or additional
module is proposed. Validate existing historical schedules without rewriting them.
Exact grant/guard definitions must be tested during the authorized V12 rollout.

### 5.8 Remaining authoring decisions to settle explicitly

| Decision | Source supports | Recommended minimum, still proposed |
|---|---|---|
| Movie authoring eligibility | Existing valid FK; public discovery requires PUBLISHED; no explicit DRAFT/UNPUBLISHED scheduling rule | PUBLISHED-only creation/opening; confirm whether private DRAFT scheduling is needed rather than infer it |
| Buffer/cutoff authoring | Duration-based end; optional configured buffer; cutoff <= start | No fixed fixture 15 minutes; absent configured buffer use end as occupied_until, cutoff=start, or approve explicit server settings |
| Allowed transitions | Six stored values, public OPEN_FOR_BOOKING only, disable preserves history | Define explicit future/unreferenced create/open/disable operations; no unrestricted status dropdown, reopening CANCELLED or manual started/ended impersonation |
| Editing and Hall choice | Historical identity protection and immutable memberships | Permanent Hall after initialization; freeze all commercial/schedule fields after any Hold/Booking history; no operational paid cancellation |

These recommendations do not change BRD/SRS or establish stable policy. Resolve
them in the approved Admin Showtime contract before enabling writes. Keep existing
non-bookable/past states readable in Admin without making them customer-visible.

### 5.9 Proposed API/UI and real Customer integration boundary

After authorization, implement `/api/v1/admin/showtimes` GET/POST and
`/api/v1/admin/showtimes/{showtimeId}` GET/PUT, with strict supported filters such
as date/Movie/Cinema/Hall/status, deterministic start/id ordering and no Delete.
All operations independently validate current ACTIVE ADMIN; anonymous401, other
roles/stale Admin403. Reuse no-store, strict decimal-string IDs and existing safe
ProblemDetail errors. Do not expose database internals or invented fields.

Proposed UI: `/admin/showtimes`, `/admin/showtimes/new`,
`/admin/showtimes/[showtimeId]/edit`; add Showtimes navigation only when implemented.
Reuse real Movie/Cinema/Hall choices, reset stale Hall when Cinema changes, identify
time zone, prevent duplicate submits and use exact decimal money text. Follow
existing after-commit actor/resource/action audit; rollback emits no success audit.
No durable new audit subsystem or Manager scope module.

The same committed row must reach existing public `GET /api/v1/cinemas?movieId=...`,
`GET /api/v1/showtimes?movieId=...&cinemaId=...&date=...`, Showtime detail and
`GET /api/v1/showtimes/{id}/seats`. Eligibility remains PUBLISHED Movie, ACTIVE
Cinema/Hall, OPEN_FOR_BOOKING, start>serverTime and cutoff>serverTime; equality closes.

**Task §28 has an additional implementation conflict:** current Customer Cinema,
Showtime and Seat screens explicitly instantiate local mock services. A new Neon
schedule cannot appear in those normal browser screens merely by adding Admin APIs.
Real public API proof and real Admin browser proof are distinct from a real Customer
UI journey. A separately agreed read-adapter integration boundary is needed to
satisfy that browser criterion; do not claim mock IDs/screens prove Neon discovery
or silently expand this into checkout/Hold/Booking/Payment frontend integration.

## 6. Files Created

- [This preflight report](2026-10-02_admin-showtime-management-preflight_report.md).

The read-only JDBC verification helper/log and task-entry preservation baseline
were kept outside the repository in the local temporary directory. They are not
application code, a migration, credentials or an additional committed tool.

## 7. Files Modified

- [Current handoff](../ai/current-handoff.md): latest gate/report and exact next task.

Project context, application files, historical contracts/reports, V1–V11, seeded
data, database grants/schema and Stitch references were not modified. No approved
new stable architecture/domain decision requires a project-context change.

## 8. Verification

| Check | Result and scope |
|---|---|
| Task/source/domain audit | PASS; real fields, statuses, constraints, references, locks and gaps documented |
| Real Neon catalog inspection | PASS; read-only connection/transaction, rollback, head11 and missing runtime writer grants confirmed |
| V1–V11/source/requirements/history preservation | PASS; task-entry file comparison; only current handoff changed |
| Seed preservation | PASS for no-write scope; no seed rerun, API mutation or verification Showtime; layout capacity read confirms consistency |
| Documentation/local links/whitespace/handoff | PASS; new report included in final verification |
| Secret hygiene | PASS; .env remains ignored; no credentials, JWT or hashes in report/changes |
| Maven verify | NOT RUN in this task; stopped before implementation under explicit gate |
| TypeScript / ESLint / unit / production build | NOT RUN; no source/configuration change |
| Full Playwright | NOT RUN; no new UI or production change |
| Admin Showtime concurrency/membership/API tests | DEFERRED until authorized V12 + implementation |
| Live Admin create/edit → Customer API → Seat map | DEFERRED; no verification record created at gate |
| Real Admin/Customer desktop/mobile browser proof | DEFERRED; API/UI not implemented; Customer read-adapter conflict documented |

**Historical baseline only:** the COMPLETE V11 report records 278 backend tests,
57 frontend unit tests and 87/87 Playwright PASS, with TypeScript/lint/build and
live Neon hierarchy PASS. Those counts are not new runs by this preflight task.
No application/schema regression result is manufactured from catalog inspection.

After authorization, run the full requested regression, fresh V12 and V11 upgrade,
permissions, exact touching/buffer overlap, different-Hall and concurrent schedules,
layout-init/configuration races, all historical edit guards, UTC/local midnight,
precise money, string-safe IDs, active/stale Admin access and Customer API/map tests.
Then create exactly one safe future non-conflicting Neon schedule through normal
Admin API/UI, preserve existing seed/transactions, and use only an approved safe
unreferenced lifecycle operation for cleanup. No real Booking/Payment or VNPAY call.

## 9. Requirement Reconciliation

PASS for domain audit, migration-gate compliance, source/data preservation and
read-only blocker evidence. Admin authoring/list/filter/UI, atomic initialization,
new lifecycle/history/concurrency tests and live authoring verification are
DEFERRED, not COMPLETE. The existing exclusion and public eligibility are verified
as present, not newly implemented by this task.

## 10. Deviations / Conflicts

- Required safe membership authoring cannot use current runtime permissions;
  user §11 deliberately stops the task before V12 authorization.
- Valid Movie scheduling policy, production buffer/cutoff values and lifecycle
  transitions are not established by read APIs or demo seed. No policy was guessed.
- Real Customer browser flow conflicts with the still-mock read adapters. Record
  and agree the integration scope instead of claiming an API test is UI proof.
- Older dictionary/ERD headers describe persistence as proposed; actual V4–V11 and
  current additive contracts establish what is implemented. Historical docs stay intact.
- Existing Auth numeric userId exception remains out of scope; new domain IDs must
  stay string-safe. No new convention exception or naming violation introduced.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md).

| Area | Result | Evidence |
|---|---|---|
| Files/folders/report naming | PASS | New dated kebab-case report in docs/reports |
| Domain/status/requirement terminology | PASS | Actual Showtime/Hall/Seat values and existing IDs only |
| Documentation/links/history | PASS | Local links checked, handoff reconciled, prior reports/contracts preserved |
| Database/API naming | PASS proposal | Existing snake_case roles/functions and resource routes; no executable DDL/API added |
| Code/routes/import implementation | NOT APPLICABLE | No application changes at authorization gate |
| Environment/secrets | PASS | Ignored local inputs, read-only verification, no secret output or tracked credential |

## 11. Known Limitations

- Admin Showtime Management remains unimplemented; migration head remains V11.
- No safe existing runtime authoring/membership writer. Current history trigger
  alone does not cover price, occupancy and lifecycle effects.
- No approved general transition matrix or production buffer/cutoff configuration;
  demo policies must not be copied silently.
- Customer downstream read adapters remain local previews; no real Customer UI
  schedule/Seat integration was performed here.
- Manager scope, paid operational cancellation/refund, membership reshape/Delete,
  other Admin modules and provider interoperability remain separate work.

## 12. Exact Next Recommended Step

**Authorize one forward V12 for the guarded Admin Showtime writer, delegated
membership initializer and complete edit/history guard described in §5.7; settle
the authoring decisions in §5.8 and Customer read-adapter verification scope in
§5.9, then resume Admin Showtime Management with full verification.**

Do not create V12 or start another module until that explicit authorization exists.
