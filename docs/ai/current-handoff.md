# Current AI handoff

Last reconciled: 2026-09-29, after functional Promotion composition. Task-entry commit: `09b39c8`. Read [project context](project-context.md) and current Git status before editing. No commit is implied.

## Current milestone

Customer frontend remains frozen after final preview QA. Backend Auth/Profile, Movie/Genre, Discovery, Seat/Hold, pre-Payment Booking, Concession and **Promotion composition** are implemented. Flyway head: **V8**, [migration](../../backend/src/main/resources/db/migration/V8__enable_promotion_composition.sql). Historical migrations, reports and contracts remain unchanged.

Latest verification: **178 tests PASS, zero failures/errors/skips**, Maven verify with all PostgreSQL suites enabled, fresh V8 and V7 upgrade. Evidence: [Promotion report](../reports/2026-09-29_promotion-composition-backend_report.md). Frontend remains the earlier QA baseline (49 unit / 73 Playwright tests); it was not changed or retested for V8.

## Exact next task

**Payment initiation + atomic first-payment composition freeze**

1. Read [Promotion Payment prerequisites](../api/promotion-composition-contract-v1.0.md#required-payment-integration), Booking revisions and integrity design.
2. Finalize provider/currency/minor-unit, idempotency, attempt identity, amount acceptance and timeout/reconciliation contracts before enabling charges. Percentage discount uses whole VND; existing numeric(19,4) prices/fixed values can be fractional and are not silently rounded here.
3. Under existing ordered locks, revalidate owned eligible aggregate/Holds, original expiry/cutoff and current Promotion immediately before initiation. Invalid/expired/ineligible Promotion blocks initiation until removed/replaced.
4. Atomically persist the first real Payment attempt and permanent payment_started_at with accepted composition/discount. Never create a freeze marker alone. Later edits must fail; retries retain frozen terms despite master changes.
5. Test initiation-versus-composition races, frozen snapshots, retries/idempotency and expiry.
6. Initiation is not success. Usage consumption, PAID/sold_at/CONSUMED/Ticket/one Booking QR require backend-verified SUCCESS. Resolve limited-Promotion exhaustion versus provider settlement before charges; applying does not reserve usage.
7. Generate a new report and reconcile contracts/context/handoff.

### Protected boundaries

- No Payment, paid writer, Hold consumption, sold_at, Ticket or QR exists yet. Do not drop stage guards in isolation.
- Preserve historical migrations; no unrelated Admin CRUD, inventory/POS, wallet/loyalty, fake APIs or frontend expansion.
- One COUPLE Seat Unit = two guests, one Hold/Booking Seat/future Ticket; one paid Booking QR and independent Ticket check-in. Unit price remains Showtime base_price, without invented type adjustments.

## Contracts and evidence

| Read | Why |
|---|---|
| [Promotion v1.0](../api/promotion-composition-contract-v1.0.md) / [V8 report](../reports/2026-09-29_promotion-composition-backend_report.md) | Apply/remove, policy, snapshots, usage and locks |
| [Booking v1.2](../api/booking-contract-v1.2.md), [v1.1](../api/booking-contract-v1.1.md), [v1.0](../api/booking-contract-v1.0.md) | Additive changes plus original ownership/expiry contract |
| [Concession v1.0](../api/concession-composition-contract-v1.0.md) / [V7 report](../reports/2026-09-29_concession-composition-backend_report.md) | Concession snapshots; former disabled Promotion boundary superseded by V8 |
| [Seat/Hold v1.1](../api/seat-hold-contract-v1.1.md), [v1.0](../api/seat-hold-contract-v1.0.md) | Authority, origins, deadline, roles and sale prohibition |
| [Discovery](../api/customer-discovery-contract-v1.0.md) | Visibility, cutoff, timezone |
| [Decisions](../db/database-design-decisions-v1.0.md), [dictionary](../db/physical-data-dictionary-v1.0.md), [integrity design](../db/integrity-enforcement-design-v1.0.md) | Existing model; old unresolved Promotion policy resolved by explicit task approval and V8 contract |
| [SRS v1.2](../srs/srs-v1.2.md) | FR-PROMO-002–006; FR-BOOKING-008/013–018 |
| [Final frontend QA](../reports/2026-09-28_customer-frontend-final-qa_report.md) | Frozen preview coverage/integration gaps |

## Active decisions and limitations

- PostgreSQL authority, protected routines/restricted runtime role; Showtime gate and ordered locks. Promotion lock follows aggregate locks; master administration never locks Bookings afterward.
- Whole subtotal is discount/minimum basis. PERCENTAGE floors whole VND with cap; FIXED_AMOUNT cannot exceed subtotal. One Promotion. Global usage counts PAID Bookings only; PENDING application/cancellation/expiry consume nothing.
- Reads preserve snapshots; accepted pre-Payment composition edits refresh current eligible terms and discount. Invalid applied Promotion rolls back Concession edits until removed/replaced. Cancellation/expiry retain history.
- V8 translates FIXED to FIXED_AMOUNT and adds cap/term snapshots. No production codes are seeded. Runtime cannot administer Promotion masters.
- Actual paid-count exhaustion/finalization and first-payment freeze races are future Payment tests; no fake paid records or usage counter exist.
- Downstream frontend adapters remain local. Legacy Auth numeric userId remains a string-safety gap.
- Provider integration, real checkout/history, realtime, production role provisioning/load and complete Seat geometry remain outstanding.

## Developer workflow and verification

Run **`pnpm dev` at root** for both apps: [README](../../README.md#local-development), [workflow report](../reports/2026-09-29_root-development-command_report.md).

Backend: `mvn verify` from `backend/` against a dedicated PostgreSQL database using existing DB settings. Set PROMOTION_DB_TESTS, CONCESSION_DB_TESTS, BOOKING_DB_TESTS, SEAT_DB_TESTS, MOVIE_DB_TESTS and DISCOVERY_DB_TESTS=true; SEAT_HOLD_CLEANUP_ENABLED=false for deterministic tests. Expiry routines are tested directly. Never store credentials here. Final counts are in the V8 report.

Reconcile handoff links, migration head, status and exact next task during documentation checks. Stable context now includes approved Promotion rules; preserve historical evidence.
