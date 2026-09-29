# Customer Promotion Composition Contract v1.0

Date: 2026-09-29. Status: implemented pre-Payment in V8; Payment initiation and success remain absent.

## Sources and approved policy

[SRS v1.2](../srs/srs-v1.2.md) FR-PROMO-002–006, FR-BOOKING-008/018;
[BRD v1.2](../brd/brd-v1.2.md) BR-034/035; Business Analysis v2.1 §29;
[integrity design](../db/integrity-enforcement-design-v1.0.md) §§3/5/6.
The user's explicit Promotion policy approved on 2026-09-29 resolves the former
scope, discount and usage questions. This revision supersedes the disabled
Promotion boundary in [Concession v1.0](concession-composition-contract-v1.0.md)
and [Booking v1.1](booking-contract-v1.1.md); those historical contracts are preserved.

- Chain-wide Promotion; at most one per Booking, no stacking or Customer-specific quota.
- Eligible subtotal and minimum-order basis both equal Seat amount + Concession amount, before discount.
- PERCENTAGE: `min(subtotal, floor(min(subtotal * value / 100, configured cap or subtotal)))`.
  Discount is a whole VND amount, never above the optional cap; a fractional legacy-compatible cap also rounds down.
- FIXED_AMOUNT: `min(subtotal, value)`. No negative total. Existing numeric(19,4)
  precision is retained; this policy rounds percentage discount only, not fixed values or existing line prices.
- Final amount = subtotal − discount, calculated exclusively in PostgreSQL.
- ACTIVE and `valid_from <= server clock < valid_until`, minimum subtotal, valid
  type/value/cap and available global usage are mandatory.
- Usage is the count of PAID Bookings referencing the Promotion. PENDING applies
  do not reserve or consume it; cancellation/expiry before Payment consume nothing.
  There is no mutable usage counter or fabricated paid record.

## HTTP contract

| Method/resource | Request | Success |
|---|---|---|
| `PUT /api/v1/bookings/{bookingId}/promotion` | `{"code":"APPROVED-CODE"}` | 200 authoritative BookingResponse |
| `DELETE /api/v1/bookings/{bookingId}/promotion` | No body | 200 authoritative BookingResponse |

The example code is a placeholder, not a seed or production policy. No demo codes are imported.
Both routes require authenticated active CUSTOMER and ownership from JWT subject.
Foreign/missing Booking returns 404. Query parameters are rejected. PUT accepts
only a string code, strips surrounding whitespace, uppercases with Locale.ROOT,
then requires 1–50 characters. Numeric code, unknown fields and client discount are rejected.
Path IDs are positive bigint strings, including values above JavaScript's safe integer limit.
No public Promotion catalog or Admin CRUD API is added.

PUT replaces the single Promotion, or revalidates/recalculates a reapplication.
Failure leaves the prior snapshot intact. DELETE of an absent Promotion succeeds
while the Booking is eligible; it clears all Promotion snapshots and sets discount
to zero. An invalid/expired old Promotion does not prevent removal or replacement.
Identical requests may produce refreshed amounts if master configuration changed;
reload owned detail after an uncertain network result. Responses use no-store.

## Snapshot and edit behavior

[Booking v1.2](booking-contract-v1.2.md) adds nullable `promotion` containing string
`id`, `code`, `type`, exact decimal strings `value`, `minimumOrderAmount`, and
nullable decimal string `maxDiscountAmount`. Existing `discount` and `finalAmount`
are the persisted authoritative result. Reads use stored Booking snapshots, not
a join to mutable Promotion terms. Master changes do not rewrite history.

Before Payment, accepted apply/reapply or Concession edits revalidate current
Promotion policy and refresh its terms/discount. An ineligible Promotion causes
the whole edit to roll back; remove or replace it first. This conservative edit
behavior was communicated during implementation; it does not silently remove a
Promotion or accept an inconsistent total. Existing Seat/Concession unit-price
snapshots, quantities not being edited, owner, Holds and original expiry remain unchanged.

Cancel/expiry preserve the last accepted Promotion/discount as history. No edits
are allowed after expiry/cancel, failed ownership/eligibility, or a first-payment
marker. Actual first-payment markers are still prohibited in this migration.

## Persistence and enforcement

[V8](../../backend/src/main/resources/db/migration/V8__enable_promotion_composition.sql)
converts existing FIXED tokens to approved FIXED_AMOUNT without editing V7;
adds nullable max_discount_amount and Booking term snapshot columns; keeps the
existing `minimum_order` column as physical storage for minimum_order_amount.
Checks enforce cap/type/value bounds, complete all-or-none snapshot shape and
discount arithmetic. No new entity is introduced. Existing FK/index/delete
policies, numeric(19,4), timestamp timezone rules and subtotal bounds remain.

Protected edit routine uses the existing User → Cinema → Hall → Showtime →
Seat/pair → Booking/Hold lock order, then Promotion FOR UPDATE. The shared Booking
guard recalculates terms/discount for both Promotion and Concession writers,
checks database time after waits and preserves deferred line/aggregate assertions.
READ COMMITTED and existing bounded timeouts apply. Runtime receives only EXECUTE
on the new edit routine, not Promotion SELECT/DML, policy-helper or configuration
access. SECURITY DEFINER uses fixed search_path and schema-qualified objects.

Deployment-only `configure_promotion(id,code,type,value,from,until,minimum,limit,status,cap)`
uses the existing protected owner, no runtime grant or HTTP exposure. NULL id
creates; updates preserve id/code; over-four-digit precision is rejected. Master
configuration acquires only its Promotion row, never reverse-locks Bookings.
No seeds, per-user limits, expiry lifecycle tokens or usage reservations exist.

## Errors

| Status | Meaning |
|---|---|
| 400 | Invalid JSON/code/path/query |
| 401 | Missing/invalid authentication |
| 403 | Wrong role or inactive Customer |
| 404 | Missing/foreign Booking |
| 409 | Ineligible Booking, bounded contention, or Promotion unavailable |
| 503 | Unexpected persistence failure |

ProblemDetail title `Promotion unavailable` covers unknown, inactive, future,
expired, below-minimum and exhausted Promotions without leaking SQL or ownership.
Failed writes roll back the full transaction. Safe generic conflict messages
retain existing Booking conventions.

## Required Payment integration

Next task: **Payment initiation + atomic first-payment composition freeze**.
Under the same lock order, revalidate the owned aggregate and Promotion immediately
before its first initiation. Invalid/expired/ineligible Promotion must block
initiation until removed/replaced. Persist an actual first attempt and permanent
payment_started_at together, freezing accepted terms/discount and all composition.
Do not reprice frozen snapshots on retry or master changes.

Later backend-verified SUCCESS must serialize on the Promotion row, recheck global
usage availability and atomically consume usage through the PAID transition with
the approved sale/Hold/issuance boundary. Multiple PENDING applies can exceed a
usage limit; they are not guaranteed redemptions. Provider payment-versus-exhaustion
reconciliation and amount acceptance must be designed before enabling charges.
This slice has no Payment endpoint, paid writer, consumed Hold, sold_at, Ticket or QR.
Real exhaustion against PAID data and freeze-versus-edit races remain Payment tests;
current tests exercise the policy count boundary without manufacturing PAID.

Evidence: [implementation report](../reports/2026-09-29_promotion-composition-backend_report.md).
