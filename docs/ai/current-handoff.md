# Current AI handoff

Last reconciled: 2026-09-29, after V7 Concession composition. Task-entry baseline: `d44999a`; implementation changes were not committed by the agent. Read [project context and startup sequence](project-context.md) before editing and check current Git status. Project context retains its dated V6 implementation snapshot because no stable architecture/domain decision changed; this handoff and the latest report govern current delivery status.

## Current milestone

Customer frontend feature development remains frozen after final preview QA. Backend Auth/Profile, Movie/Genre, Discovery, Seat/Hold, pre-Payment Booking and **Concession catalog/composition** are implemented and verified. Current Flyway head: **V7** ([migration](../../backend/src/main/resources/db/migration/V7__create_concession_composition.sql)). Promotion schema/FK exists; application/removal is disabled until policy is approved. Historical migrations are immutable.

Latest backend verification: **163 tests PASS, zero failures/errors/skips**, `mvn verify`, PostgreSQL integration, fresh/V6 upgrade, immutable snapshots, quantity edits, aggregate totals and concurrent edit/cancellation coverage. Promotion runtime eligibility/application tests remain DEFERRED. Frontend final QA remains the earlier TypeScript/lint/build/visual PASS, 49 unit tests and 73 Playwright tests; frontend was not changed or retested for V7.

## Exact next task

**Resolve Promotion business policy and finalize its pre-Payment composition contract**

1. Read SRS §3.8, integrity design §6 and the unresolved-decision checklist in [Concession composition contract §7](../api/concession-composition-contract-v1.0.md).
2. Obtain explicit decisions for discount target/minimum basis, currency/rounding/caps, usage consumption/counting/release, and revalidation after composition or catalog changes. Do not infer production policy from frontend demonstrations.
3. Define authoritative apply/remove responses, one-Promotion behavior, discount snapshot and concurrency validation. Keep application disabled until those decisions and guarded writers/assertions are approved and implemented together.
4. Preserve completed Concession behavior: only new additions require ACTIVE items; quantity edits retain immutable name/category/price snapshots; totals recalculate from retained lines. Preserve Seat/Hold ownership and original deadline.
5. Keep Payment initiation/first-payment freeze as the subsequent dependency: decide provider/currency contracts and atomically establish the first attempt/freeze before enabling any charge. This next policy task does not authorize Payment implementation.
6. Publish the decision/contract report, then update this handoff with the exact authorized implementation task.

### Explicit next-task exclusions

- Do **not** implement Payment, mark PAID, consume Holds or write `booking_seats.sold_at`.
- Do **not** issue Tickets or Booking QR, or create a premature sale/finalization escape hatch.
- Do **not** invent Promotion policy or copy frontend demo codes/discount/rounding rules into production.
- Do **not** add inventory, warehouse, supplier, kitchen, POS, loyalty, wallet or unrelated admin functionality.
- Do **not** reopen Customer UI feature development, replace adapters with fake APIs, alter historical migrations or silently change requirements.

## Contracts and evidence to open

| Read | Why |
|---|---|
| [Concession composition v1.0](../api/concession-composition-contract-v1.0.md) / [V7 report](../reports/2026-09-29_concession-composition-backend_report.md) | Implemented add/update/remove/catalog, 163-test evidence, Promotion schema-only boundary and unresolved policy |
| [Booking v1.1](../api/booking-contract-v1.1.md) plus [v1.0](../api/booking-contract-v1.0.md) / [V6 report](../reports/2026-09-28_booking-backend_report.md) | Current additive response/total changes and original creation/ownership/expiry contract; old zero-add-on restriction superseded by V7 |
| [Seat/Hold v1.1](../api/seat-hold-contract-v1.1.md) plus [v1.0](../api/seat-hold-contract-v1.0.md) / [Hold report](../reports/2026-09-28_seat-hold-backend_report.md) | Current delta and base contract; authority, deadlines, roles and origin protection |
| [Discovery contract](../api/customer-discovery-contract-v1.0.md) / [report](../reports/2026-09-28_customer-discovery-backend_report.md) | Visibility and Showtime start/cutoff rules that writes must preserve |
| [Database decisions](../db/database-design-decisions-v1.0.md), [dictionary](../db/physical-data-dictionary-v1.0.md), [integrity design](../db/integrity-enforcement-design-v1.0.md) | Concession/Promotion columns, snapshot arithmetic, guarded mutations, freeze and unresolved Promotion policy |
| [SRS v1.2](../srs/srs-v1.2.md) | FR-BOOKING-008/013–018, Concession/Promotion requirements and data integrity; use actual IDs only |
| [Final frontend QA](../reports/2026-09-28_customer-frontend-final-qa_report.md), [frontend plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md) | Frozen preview baseline and integration gaps; preview is not policy |

Other stable sources, Movie/Genre contracts, screen map and V1–V6 links are indexed in [project context](project-context.md); V7 is linked above. Current code is in `booking/`, `seat/` and `concession/` under `backend/src/main/java/com/smartcinema/`. V7 evolves header/child guards and deferred totals without weakening pre-Payment sale prohibitions.

## Active decisions and limitations

- Modular monolith; PostgreSQL authority; protected domain routines and restricted runtime role. All Hold/Booking commands share the existing Showtime gate and ordered locks. Redis is optional.
- One COUPLE Seat Unit = two guests, one Hold, one Booking Seat and one future Ticket. Price now = one Showtime base_price; no approved type adjustments.
- PENDING Booking attaches ACTIVE Holds; no consumption or sale. Only backend-verified Payment SUCCESS may atomically establish PAID + sold_at + CONSUMED + Tickets + exactly one reusable Booking QR. Ticket statuses/check-in are independent; no per-Ticket QR.
- First actual Payment initiation is the permanent composition-freeze boundary. Previews and pre-Payment Booking creation do not set that marker.
- Concession catalog and owned composition now use real backend persistence/APIs; frontend adapters are still local. Distinct POSTs create distinct lines, not automatic merges or replay-safe requests. No new catalog Admin HTTP API was added; deployment-only configuration is protected.
- Promotion persistence has only approved static constraints. Booking promotion_id remains NULL and discount zero; stored ACTIVE does not enable application. No policy decision changed, so `project-context.md` was intentionally left unchanged.
- V6 sold predicate/index is preparatory. Real sold-seat rejection and paid no-double-sale verification are deferred to Payment; never fake those checks with disabled guards.
- Frontend Movie/Genre/Auth/Profile use existing real APIs where implemented; downstream adapters still use local fixtures despite available Discovery/Hold/Booking backends. Legacy Auth numeric userId is a known string-safety gap.
- Promotion basis/usage/release, currency/provider contract, history list, real checkout integration, realtime updates and production load/role provisioning remain open. Seat layout has labels, not complete physical geometry.

## Verification and handoff maintenance

For backend work, use `mvn verify` from `backend/` with a dedicated PostgreSQL database configured through existing DB settings. Enable `CONCESSION_DB_TESTS`, `BOOKING_DB_TESTS`, `SEAT_DB_TESTS`, `MOVIE_DB_TESTS` and `DISCOVERY_DB_TESTS` as `true`; disabled flags skip integration coverage. The last full run used `SEAT_HOLD_CLEANUP_ENABLED=false` for deterministic tests and tested expiry routines directly. Read the report for exact setup; never put credentials into this file or assume disposable test data is production data.

After the next slice: update current milestone, migration head, contract/report links, actual test results, unresolved decisions and exact next task. Update stable context only when justified by approved decisions. Generate a new report with Convention Compliance; preserve prior reports. No commit is implied by these instructions.
