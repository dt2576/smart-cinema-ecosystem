# Customer Booking Contract v1.2

Date: 2026-09-29. Status: V8 pre-Payment Promotion composition enabled.

Read [v1.0](booking-contract-v1.0.md), [v1.1](booking-contract-v1.1.md) and this delta.
Creation, ownership, Seat snapshots, Hold attachment, cancellation, expiry, IDs
and Concession behavior remain, except the disabled/zero-discount Promotion rule.

## Response and totals

BookingResponse adds nullable `promotion` with `id`, `code`, `type`, `value`,
`minimumOrderAmount`, `maxDiscountAmount`; IDs and decimal values are strings.
Terms are Booking snapshots. No Promotion is represented by null. `discount` is
now authoritative calculated discount, and `finalAmount = subtotal - discount`.
Seat and Concession totals remain their pre-discount sums, without discount allocation.

## Composition

Owned CUSTOMER PUT/DELETE `/api/v1/bookings/{bookingId}/promotion` apply/replace
or remove the single Promotion. Read [Promotion composition v1.0](promotion-composition-contract-v1.0.md)
for exact validation, rounding, snapshots, locks and errors.
Concession edits revalidate current applied Promotion and recalculate; failure
rolls back the whole edit until Promotion is removed/replaced. Reads do not refresh
snapshots from master terms. No edit extends the original deadline.

## Stage boundary

V8 permits Promotion reference/snapshots and nonzero discount while preserving
the no-Payment stage. PAID, payment_started_at, CONSUMED, sold_at, Tickets and QR
remain unavailable. Usage is consumed only by future backend-verified SUCCESS,
never application/cancellation/expiry. First real Payment initiation must atomically
revalidate and freeze the accepted composition; that implementation is next.

Historical contracts/migrations are preserved. [Implementation evidence](../reports/2026-09-29_promotion-composition-backend_report.md).
