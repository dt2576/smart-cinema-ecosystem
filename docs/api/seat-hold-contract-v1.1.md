# Seat and Seat Hold Contract v1.1

Date: 2026-09-28. Status: implemented with V6 pre-Payment Booking integration.

This revision applies the changes below to [v1.0](seat-hold-contract-v1.0.md). All other request syntax, public/authenticated routes, eligibility, whole-unit semantics, errors, timing and deployment rules remain unchanged. The prior document remains the historical V5 contract.

## 1. Permanent Booking attachment

Eligible owned ACTIVE Holds can now be attached through [Booking creation](booking-contract-v1.0.md). Hold attachment does not consume, renew or change owner. The unattached-stage constraint is replaced by composite Booking owner/Showtime/line references, origin uniqueness, guards and deferred aggregate assertions.

GET `/api/v1/showtimes/{showtimeId}/seat-holds` now returns **only unattached** usable owned Holds. An attached origin appears in owned Booking detail. Acquisition cannot reuse attached Holds, even for the same owner. Individual release continues to reject them with 409; cancel the whole Booking instead.

CONSUMED remains prohibited by the pre-Payment stage. No Hold or Booking API grants sale authority.

## 2. Availability precedence

Within an otherwise visible/eligible Showtime, evaluate at sampled PostgreSQL serverTime:

1. A Booking Seat with matching Showtime/Seat and non-null `sold_at` → BOOKED.
2. Missing membership, explicit unsellability or non-ACTIVE physical Seat → UNAVAILABLE.
3. An unexpired ACTIVE Hold, either unattached or attached to an unexpired PENDING Booking → HELD.
4. Otherwise → AVAILABLE.

This uses the approved sold predicate, without a cached Seat status or synthetic sale flag. **V6 prohibits writing sold_at, PAID and CONSUMED.** Consequently legitimate V6 data cannot yet produce BOOKED; successful-sale behavior is a Payment integration dependency. The sold predicate and partial unique index are preparation, not a claim of completed paid-sale verification.

## 3. Aggregate-aware expiry

The Booking deadline uses the earliest participating Hold expiry. At that deadline, all its attached Holds stop blocking availability, even if some individual Hold timestamps are later. Acquisition and cleanup expire/release the whole elapsed Booking under the shared Showtime gate; they never expire only the requested attached line. Historical origins remain linked permanently. Releasing/cancelling an old identity cannot touch another Customer's replacement Hold.

The existing cleanup scheduler/settings are reused. It finds expired ACTIVE Hold candidates; every Booking deadline is derived from an origin Hold, so its earliest origin makes the Showtime a candidate. Reads use the parent deadline without waiting for cleanup. There is still no system-expiry HTTP endpoint or realtime event transport.

## 4. Transaction and deployment changes

The V6 helper locks all physical Seats, Showtime Seat pairs, Booking rows and Hold rows for the target Showtime in the existing global order before mutation. Whole-Booking expiry is then safe against lock-set expansion. Existing timeout configuration applies. This serializes more history under the already selected outer gate; production load testing remains outstanding.

The existing owner/runtime roles gain only the necessary new Booking table reads and protected create/cancel execution. Internal aggregate helpers remain ungranted. Historical V1–V5 migrations are unchanged. Future Payment must replace stage guards and install all paid aggregate assertions atomically before permitting sales.

Evidence and deferred verification: [Booking backend report](../reports/2026-09-28_booking-backend_report.md).
