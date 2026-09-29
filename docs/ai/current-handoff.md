# Current AI handoff

Last reconciled: 2026-09-28. Implementation baseline: `92c3b38` (pre-Payment Booking). Read [project context and startup sequence](project-context.md) before editing; check current Git status rather than assuming this baseline is still HEAD.

## Current milestone

Customer frontend feature development is frozen after final preview QA. Backend Auth/Profile, Movie/Genre, Discovery, Seat/Hold and **pre-Payment Booking** slices are implemented and verified. Current Flyway head: **V6**. Historical migrations are immutable.

Latest Booking verification: **144 tests PASS, zero failures/errors/skips**, `mvn verify`, PostgreSQL integration, fresh/V5 upgrade and concurrency coverage. Frontend final QA: TypeScript/lint/build/visual checks PASS, 49 unit tests and 73 Playwright tests PASS. These are recorded results, not new runs during handoff creation.

## Exact next task

**Backend Concession + Promotion pre-Payment composition slice**

1. Read the relevant Booking/Concession/Promotion SRS sections, physical dictionary and integrity design; complete workflow traceability/convention/conflict checks before implementation.
2. Implement approved Concession catalog and Booking Concession composition. Add only necessary approved persistence/contracts; do not infer administrative UI or unrelated operations.
3. Recalculate authoritative Booking totals server-side; preserve Seat snapshots and whole COUPLE units. Add-on quantity changes use approved snapshot semantics, not frontend demo prices.
4. Allow composition edits only while Booking is eligible, PENDING, unexpired and has never initiated Payment. Preserve the earliest original deadline, ownership and aggregate lock order. Existing V6 guards intentionally prevent such edits; evolve them in a forward migration with complete assertions and protected writers, not by bypassing them.
5. Implement Promotion only where approved policy is sufficient. **Resolve discount basis, usage consumption timing and release policy before enabling ambiguous behavior.** Progress independently on approved Concession work; document unresolved Promotion decisions instead of guessing.
6. Verify PostgreSQL aggregate/concurrency/ownership behavior, schema upgrade and regression coverage; publish the required contract/report and reconcile this handoff.

### Explicit next-task exclusions

- Do **not** implement Payment, mark PAID, consume Holds or write `booking_seats.sold_at`.
- Do **not** issue Tickets or Booking QR, or create a premature sale/finalization escape hatch.
- Do **not** invent Promotion policy or copy frontend demo codes/discount/rounding rules into production.
- Do **not** add inventory, warehouse, supplier, kitchen, POS, loyalty, wallet or unrelated admin functionality.
- Do **not** reopen Customer UI feature development, replace adapters with fake APIs, alter historical migrations or silently change requirements.

## Contracts and evidence to open

| Read | Why |
|---|---|
| [Booking contract v1.0](../api/booking-contract-v1.0.md) / [Booking report](../reports/2026-09-28_booking-backend_report.md) | Current APIs, immutable Seat composition, zero add-ons/discount staging, 144-test evidence and dependencies |
| [Seat/Hold v1.1](../api/seat-hold-contract-v1.1.md) plus [v1.0](../api/seat-hold-contract-v1.0.md) / [Hold report](../reports/2026-09-28_seat-hold-backend_report.md) | Current delta and base contract; authority, deadlines, roles and origin protection |
| [Discovery contract](../api/customer-discovery-contract-v1.0.md) / [report](../reports/2026-09-28_customer-discovery-backend_report.md) | Visibility and Showtime start/cutoff rules that writes must preserve |
| [Database decisions](../db/database-design-decisions-v1.0.md), [dictionary](../db/physical-data-dictionary-v1.0.md), [integrity design](../db/integrity-enforcement-design-v1.0.md) | Concession/Promotion columns, snapshot arithmetic, guarded mutations, freeze and unresolved Promotion policy |
| [SRS v1.2](../srs/srs-v1.2.md) | FR-BOOKING-008/013–018, Concession/Promotion requirements and data integrity; use actual IDs only |
| [Final frontend QA](../reports/2026-09-28_customer-frontend-final-qa_report.md), [frontend plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md) | Frozen preview baseline and integration gaps; preview is not policy |

Other stable sources, Movie/Genre contracts, the screen map and all six migration links are indexed in [project context](project-context.md). Latest code is under `backend/src/main/java/com/smartcinema/booking/` and `seat/`; V6 contains current stage checks and aggregate guards.

## Active decisions and limitations

- Modular monolith; PostgreSQL authority; protected domain routines and restricted runtime role. All Hold/Booking commands share the existing Showtime gate and ordered locks. Redis is optional.
- One COUPLE Seat Unit = two guests, one Hold, one Booking Seat and one future Ticket. Price now = one Showtime base_price; no approved type adjustments.
- PENDING Booking attaches ACTIVE Holds; no consumption or sale. Only backend-verified Payment SUCCESS may atomically establish PAID + sold_at + CONSUMED + Tickets + exactly one reusable Booking QR. Ticket statuses/check-in are independent; no per-Ticket QR.
- First actual Payment initiation is the permanent composition-freeze boundary. Previews and pre-Payment Booking creation do not set that marker.
- V6 sold predicate/index is preparatory. Real sold-seat rejection and paid no-double-sale verification are deferred to Payment; never fake those checks with disabled guards.
- Frontend Movie/Genre/Auth/Profile use existing real APIs where implemented; downstream adapters still use local fixtures despite available Discovery/Hold/Booking backends. Legacy Auth numeric userId is a known string-safety gap.
- Promotion basis/usage/release, currency/provider contract, history list, real checkout integration, realtime updates and production load/role provisioning remain open. Seat layout has labels, not complete physical geometry.

## Verification and handoff maintenance

For backend work, use `mvn verify` from `backend/` with a dedicated PostgreSQL database configured through existing DB settings. Enable `BOOKING_DB_TESTS`, `SEAT_DB_TESTS`, `MOVIE_DB_TESTS` and `DISCOVERY_DB_TESTS` as `true`; disabled flags skip integration coverage. The last full run used `SEAT_HOLD_CLEANUP_ENABLED=false` for deterministic tests and tested expiry routines directly. Read the report for exact setup; never put credentials into this file or assume disposable test data is production data.

After the next slice: update current milestone, migration head, contract/report links, actual test results, unresolved decisions and exact next task. Update stable context only when justified by approved decisions. Generate a new report with Convention Compliance; preserve prior reports. No commit is implied by these instructions.
