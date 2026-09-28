# Customer Booking Contract v1.0

Date: 2026-09-28. Status: implemented pre-Payment Booking slice, subject to the verification report below.

## 1. Authority and approved scope

Sources: [SRS v1.2](../srs/srs-v1.2.md) FR-BOOKING-001–007/010–012, FR-SEAT-012/016, [BRD v1.2](../brd/brd-v1.2.md) BR-026–031/035, [database decisions](../db/database-design-decisions-v1.0.md), [physical dictionary](../db/physical-data-dictionary-v1.0.md) and [integrity design](../db/integrity-enforcement-design-v1.0.md).

The user explicitly approved these delivery decisions on 2026-09-28:

- Create PENDING Booking, attach valid ACTIVE Holds, and cancel/expire the whole aggregate. Attachment is permanent, not consumption.
- **Only backend-verified Payment SUCCESS may atomically consume Holds, set sold_at and PAID, and issue Tickets/Booking QR.** This slice enables none of those writes.
- Each whole Seat Unit costs the current `showtimes.base_price`. STANDARD, VIP and COUPLE use the same source price; there is no type adjustment or automatic doubling for COUPLE.
- Booking Seat type and price, Booking amounts, owner, Showtime and deadline are persisted. The first-payment freeze remains future work; `payment_started_at` stays NULL.

V6 adds only `bookings` and `booking_seats`. Promotion reference is constrained NULL, Concession amount and discount are zero. No Concession/Promotion tables, catalog endpoints, payment attempt, Ticket or QR is added. The optional QR column exists as specified but can never receive a value in this stage.

## 2. Resources and authorization

| Method/resource | Access | Success |
|---|---|---|
| `POST /api/v1/bookings` | Authenticated active CUSTOMER | 200 BookingResponse, including exact-set retry |
| `GET /api/v1/bookings/{bookingId}` | Owning active CUSTOMER | 200 BookingResponse |
| `DELETE /api/v1/bookings/{bookingId}` | Owning active CUSTOMER | 204; cancel logical resource, retain history |

DELETE expresses owner cancellation, not physical deletion. It is idempotent for owned CANCELLED/EXPIRED history. If the deadline has passed, EXPIRED takes precedence over CANCELLED. This contract does not authorize deleting records or cancelling PAID Bookings.

JWT subject supplies Customer identity; no client owner ID is accepted. Current database role/status must also be CUSTOMER/ACTIVE. Missing authentication is 401, non-Customer credentials/inactive accounts are 403, and missing/foreign owned resources are indistinguishable 404 responses. Invalid supplied Bearer tokens retain existing security handling. All successful responses are `Cache-Control: no-store`. Query parameters are rejected. There is no Booking list API in this slice; Customer history integration remains pending.

## 3. Create request and retry

```json
{"showtimeId":"12","holdIds":["9007199254740993","9007199254740994"]}
```

Exactly these two fields are accepted. IDs must be JSON strings containing 1–19 ASCII digits, numeric value 1 through 9223372036854775807. Leading zeros normalize; duplicate normalized Hold IDs are rejected. Numeric JSON IDs, empty arrays, nulls, overflow, mixed Showtimes, client totals/prices, timestamps, status, type or owner fields are invalid or conflicting selections. All participating Holds must belong to the authenticated Customer and requested Showtime, be ACTIVE and unexpired, and refer to eligible sellable whole units.

Under the shared Showtime gate, the backend rechecks Movie publication, Cinema/Hall eligibility, Showtime status/start/cutoff and physical/unit eligibility using database time after waits. It snapshots the locked Showtime base price once per unit and attaches all requested Holds in one transaction. No partial Booking or partial attachment commits.

The Booking deadline is no later than the earliest participating Hold expiry or Showtime cutoff. Hold deadlines never change. Selecting two guests through one COUPLE identity creates one Booking Seat and uses one base price. Existing Seat lines are fixed for that Booking; selecting different units requires cancelling/expiring and starting a new flow.

An exact same-owner Hold-set retry while the Booking remains eligible, PENDING and unexpired returns the existing Booking, including its original price/deadline. A subset, superset or mixture involving attached Holds is a 409 conflict. A retry after cancellation/expiry cannot resurrect the Booking. Concurrent exact-set creates return one identity; overlapping distinct sets cannot create duplicate entitlements. No transport idempotency key or automatic database retry is introduced.

## 4. Owned detail and snapshots

BookingResponse contains:

| Field | Type/meaning |
|---|---|
| id, bookingCode | String identity and immutable public display code; code alone grants no access |
| status | PENDING, EXPIRED or CANCELLED in this stage |
| showtimeId, movieId, cinemaId, hallId | String IDs |
| movieTitle, cinemaName, hallName | Current referenced display metadata, not historical snapshots |
| startsAt | Stored Showtime start instant |
| createdAt, expiresAt, serverTime | UTC ISO-8601 instants, PostgreSQL authority |
| seatUnitCount, guestCount | Integer unit count and type-derived guest count; COUPLE contributes one unit/two guests |
| seatAmount, concessionAmount, subtotal, discount, finalAmount | Exact decimal strings from numeric(19,4); no floating-point totals |
| seats | Array of SeatLine, deterministic ascending numeric seatId |

SeatLine fields: `id`, `seatId`, `holdId`, `row`, `number`, `type`, `guestCount`, `unitPrice`, `finalPrice`. All IDs and prices are strings. Type and prices are immutable Booking Seat snapshots; row/number are referenced physical labels, which current Seat configuration guards make immutable. `finalPrice` is the line charge before Booking-level discount, currently equal to `unitPrice`.

For two units with base price 80000, including one COUPLE, `seatUnitCount=2`, `guestCount=3`, `seatAmount="160000.0000"`, `concessionAmount="0.0000"`, `discount="0.0000"` and `finalAmount="160000.0000"`. Later base-price changes do not rewrite the existing Booking, even on retry. No frontend preview price or discount is used.

Storage accepts the approved four fractional digits without an invented currency field, exchange rate or provider rounding. Payment must resolve configured currency/minor-unit validation before initiating a provider amount; this API is not authorization to charge arbitrary four-decimal values. Amounts must fit the dictionary's finite nonnegative numeric bounds, including aggregate totals.

Owned history remains readable after a Movie is unpublished or Cinema closes. Reads use a repeatable snapshot and report elapsed PENDING records as EXPIRED immediately, even if persistence cleanup is delayed. A read is not an expiry mutation; later commands/cleanup persist the whole transition. No payment status, Ticket collection or QR token is returned.

## 5. Lifecycle, expiry and Seat integration

```text
unattached ACTIVE Hold -> attached ACTIVE Hold + PENDING Booking
PENDING Booking -> CANCELLED + all attached ACTIVE Holds RELEASED
PENDING Booking at deadline -> EXPIRED + all attached ACTIVE Holds EXPIRED
```

Attachment never changes Hold owner, pair, creation or deadline. Individual Hold release rejects attached Holds; cancellation/expiry works on the entire Booking. A later-deadline Hold in an expired Booking expires with the Booking's earliest deadline. Old Booking cancellation/cleanup uses exact identities and cannot release a later replacement Hold.

The existing scheduled Seat Hold cleanup now invokes aggregate-aware expiry; acquisition also retires elapsed affected ownership under the same gate. Expiry correctness does not depend on the worker. Whole-Booking availability is computed using both parent deadline/state and Hold deadline. Attached Holds are omitted from GET own unattached Holds; Booking detail supplies their origin IDs instead.

See [Seat/Hold v1.1 changes](seat-hold-contract-v1.1.md). Availability and acquisition include the real `booking_seats.sold_at IS NOT NULL` predicate. The partial sold-pair unique index is installed, but guards/stage constraints reject all writes to sold_at in this slice. Therefore no successful sale is produced and no real BOOKED fixture is claimed to exist. Paid-sale integration tests remain deferred to Payment, without disabling guards or inserting temporary markers to simulate success.

## 6. Database enforcement and concurrency

New tables follow the approved dictionary: bigint identities, timestamp(6) with time zone, numeric(19,4), varchar status CHECKs, finite timestamps/nonnegative money, immutable codes, totals checks and NO ACTION reference policies. Composite FKs bind Booking/Showtime/Customer/Seat identities. A deferred origin-line FK and deferred aggregate assertions prevent empty Bookings, missing/mismatched origins, inconsistent totals, independently released attached lines or deadline inflation. A unique Booking/Seat origin prevents reuse across lines.

The existing NOLOGIN owner and runtime grant role are reused. Runtime has SELECT plus protected create/cancel execution, without table DML/TRUNCATE, trigger disabling or internal helper execution. Fixed-search-path routines qualify the actual schema. Production still requires separate migration/runtime credentials; local superuser tests are supplemented by restricted-role execution/denial checks.

Writes use READ COMMITTED and the existing User → Cinema → Hall → Showtime gate, followed by ascending physical Seats, Showtime Seat pairs, Bookings and Holds. This MVP locks all pairs and Booking/Hold history for the target Showtime before aggregate mutation; the conservative scope prevents expanding a pair set after later locks. It is a correctness choice, not measured high-throughput capacity. Publication is protected by the existing Movie lock. No remote call occurs inside the transaction.

Existing configurable Hold lock/statement/idle timeouts also bound Booking transactions. `clock_timestamp()` is sampled after locks and checked again before accepting creation. Constraint/timeout failures roll back the whole command. No frontend deadline is trusted. Parent/history protections and stage constraints preserve the future first-payment boundary.

## 7. ProblemDetail errors

| Condition | HTTP/title |
|---|---|
| Invalid body/IDs/normalized duplicates/query parameters | 400 / Invalid request |
| Missing/invalid authentication | 401 / existing security ProblemDetail |
| Wrong role or inactive Customer | 403 / Access denied |
| Missing/foreign Booking or ineligible Showtime | 404 / Resource unavailable |
| Expired/released/foreign/mixed/already attached Hold selection, uniqueness conflict | 409 / Booking conflict |
| Bounded timeout/deadlock/serialization conflict | 409 / Booking contention |
| Other database/service failure | 503 / Booking service unavailable |

Responses contain safe detail, with field errors for parsed input where applicable. SQL, owner identity and internal constraint details are not exposed. Retry requires fresh authoritative context; no fallback Booking is created when PostgreSQL is unavailable.

## 8. Remaining dependencies

- Concessions/Promotion: add approved item/line persistence and Promotion references; resolve discount basis/usage lifecycle, guarded PENDING composition edits and aggregate totals. No mock preview discount becomes a production rule.
- Payment: add attempts and trusted verification, first-initiation freeze, currency/rounding, atomic SUCCESS → PAID + sold markers + CONSUMED + Tickets/one Booking QR + required audit. Replace stage guards and strengthen all aggregate assertions together before enabling finalization.
- Prove real sold-Seat rejection, paid no-double-sale races and sale-versus-expiry behavior in that future slice. Current tests prove exclusive pre-Payment ownership and prohibition of premature sale, not successful-payment correctness.
- Frontend/history: connect real Hold/Booking APIs through adapters, consume authoritative decimal totals/deadlines, and implement the separately scoped history read contract. Frontend remains unchanged.

Verification: [Booking backend report](../reports/2026-09-28_booking-backend_report.md).
