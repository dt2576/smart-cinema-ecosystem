# Customer Booking Contract v1.1

Date: 2026-09-29. Status: V7 Concession composition enabled; Payment and Promotion application remain disabled.

This revision applies the following changes to [Booking v1.0](booking-contract-v1.0.md). Keep its ownership, creation/retry, expiry/cancel, Seat price/snapshot, string-ID and pre-Payment rules. The complete new add-on contract is [Concession composition v1.0](concession-composition-contract-v1.0.md).

## Response addition

BookingResponse now includes `concessions`, an array ordered by line ID. Each object has `id`, `itemId`, `name`, `category`, `quantity`, `unitPrice`, `totalPrice`. IDs and amounts are strings; quantity is a positive integer. Name/category/unitPrice are stored snapshots. Empty selection is `[]`.

The existing `concessionAmount` is now the authoritative sum of retained add-on lines; `subtotal` and `finalAmount` include it. `seatAmount`, Seat lines, guest count and original expiresAt remain unchanged. `discount` stays zero and no Promotion association is allowed. Creation still starts without add-ons; an exact Hold-set creation retry returns the current existing Booking, including any accepted Concession edits.

## New protected composition resources

- Public `GET /api/v1/concession-items` returns ACTIVE catalog data only.
- Owned Customer `POST /api/v1/bookings/{bookingId}/concessions` adds a line from an ACTIVE item.
- Owned Customer `PATCH /api/v1/bookings/{bookingId}/concessions/{lineId}` sets quantity using existing snapshots.
- Owned Customer `DELETE /api/v1/bookings/{bookingId}/concessions/{lineId}` removes a permitted pre-Payment add-on.

All edits require eligible, unexpired PENDING Booking with NULL payment_started_at; responses return the authoritative Booking. No new Seat edit is enabled. Duplicate item lines are distinct; POST is not automatically replay-safe. Read the full contract before choosing frontend retry behavior.

## Preserved boundary and migration

V7 adds Concession tables and Promotion schema/FK. It evolves the V6 guard and deferred totals assertion to permit Concession edits without weakening Seat/Hold history or earliest expiry. Cancellation/expiry retains add-on history. Historical V1–V6 remain immutable.

No Payment, PAID, CONSUMED, sold_at, Ticket or Booking QR write exists. No Promotion eligibility/application API exists until discount/usage policy is approved. The first actual Payment initiation remains the future atomic permanent freeze boundary. Static Promotion schema validation is not completed FR-PROMO application behavior.

Evidence, limitations and next task: [V7 implementation report](../reports/2026-09-29_concession-composition-backend_report.md).
