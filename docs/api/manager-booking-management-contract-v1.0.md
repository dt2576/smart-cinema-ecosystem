# MANAGER Booking Management contract v1.0

Date: 2026-10-29. Additive, cinema-scoped read-only operations. No migration.

## Authority and scope

Traceability: SRS v1.2 §3.1 FR-AUTH-007/008, §3.6 FR-BOOKING-004/005/006/010/014,
§6.3 Booking View; BRD v1.2 Manager actor scope, BR-029/030/031/047/066.
The current user request authorizes these read-only list/detail capabilities.
Existing ManagerScope and current ACTIVE MANAGER / ACTIVE MANAGER assignment,
`effective_at <= clock_timestamp()`, are checked on every request and repeated in
every data query. Cinema status does not erase historical management visibility.
JWT role alone does not grant access; no Customer/Staff/Admin namespace behavior changes.

## Endpoints

| Method | Route | Response |
|---|---|---|
| GET | `/api/v1/manager/bookings` | Page of assigned-Cinema Bookings |
| GET | `/api/v1/manager/bookings/{bookingId}` | Scoped Booking details |

Both return `Cache-Control: no-store`. No mutations, cancellation, refund,
payment confirmation/reconciliation, Ticket issuance/check-in or QR retrieval.

## List query

All filters optional and AND-combined; unknown/repeated/blank parameters fail 400.

| Parameter | Meaning / validation |
|---|---|
| `cinemaId` | Canonical positive signed-bigint decimal ID; explicitly scoped Cinema |
| `showtimeId` | Same ID rules; explicitly scoped Showtime |
| `bookingId` | Exact Booking ID search within the authorized result set |
| `bookingCode` | Exact case-sensitive stored Booking code, nonblank, ≤40 Unicode code points, no control characters; not a wildcard search |
| `status` | Effective Booking state: PENDING, PAID, EXPIRED, CANCELLED |
| `paymentStatus` | **Latest attempt only**: INITIATED, PENDING, SUCCESS, FAILED, CANCELLED |
| `createdFrom` / `createdTo` | Booking creation period `[from,to)`; independent optional explicit-offset ISO instants, years 1–9999, ≤microsecond precision; from must precede to when both supplied |
| `page` | Zero-based, default 0, canonical integer 0–2147483647 |
| `size` | Default 20; canonical integer 1–100 |

Order: Booking `created_at DESC, id ASC`, fixed server order and stable ID tiebreak.
Latest Payment: `initiated_at DESC, id DESC`. Historical failed attempts do not
match `paymentStatus=FAILED` when a newer PENDING attempt exists. No attempt yields
`latestPayment:null`, never an invented Payment status. Dates are instants, not
implicit cinema-local calendar dates. Page offsets use 64-bit arithmetic.

## Responses and precision

Page: `items`, numeric `page`, `size`, `totalElements`, `totalPages`, `serverTime`.
Empty or beyond-last page: 200, empty items and scoped totals; zero total means
zero pages. Separate requests may reflect legitimate concurrent data changes;
count/items within each request share a REPEATABLE READ transaction.

Item fields:

- `id`, `bookingCode`, `status`, `storedStatus`.
- `cinemaId`, `cinemaName`, `hallId`, `hallName`, `movieId`, `movieTitle`,
  `showtimeId`, `startsAt`, `createdAt`, original `expiresAt`, `paymentStartedAt`, `paidAt`.
- `seatUnitCount`, `guestCount`, `issuedTicketCount`, `finalAmount`, `latestPayment`.

`status` uses the existing Customer read projection: stored PENDING at/past
expiresAt is displayed EXPIRED without an UPDATE. `storedStatus` preserves the
actual database value. No new state or financial transition is introduced.

Payment projection: `id`, `status`, `amount`, nullable `currency`/`provider`,
`initiatedAt`, nullable `completedAt`, `reconciliationRequired`. This flag is
existing backend uncertainty, not a resolution command or verified-success claim.

Detail: `booking` (same item), `amounts` (`seatAmount`, `concessionAmount`,
`subtotal`, `discount`, `finalAmount`), `seats`, `concessions`, `payments`, `tickets`,
`serverTime`. No amount is recalculated or rounded by this module.

- Seat: `id` (Booking Seat), `seatId`, live `row`/`number`, snapshot `type`,
  `guestCount`, snapshot `unitPrice`, `finalPrice`. One COUPLE record = two guests.
- Concession: `id`, `itemId`, snapshot `name`/`category`, `quantity`, snapshot
  `unitPrice`, `totalPrice`.
- Payments: all stored attempts, latest first. Payment SUCCESS does not override
  Booking or imply issuance.
- Ticket: actual `id`, `bookingSeatId`, `seatId`, stored `status`, `issuedAt`,
  nullable `checkedInAt`; ID ascending. `issuedTicketCount` counts actual rows,
  independent of payment state. Missing rows remain absent; no new issuance enum
  or computed issuance-complete promise. This is an operational projection, not
  Customer admission/QR eligibility or financial verification.

All identity values and exact decimal amounts are **JSON strings**. Timestamps
serialize as instants. Counts/pagination remain numeric. Labels/context are live
references, not newly invented historical snapshots.

## Data isolation, minimization and errors

No Customer ID/name/email/phone, Hold token/ID, Ticket code, Booking QR token,
provider/internal references, raw metadata, signature or audit payload is selected.
Each child read repeats the same Booking-to-Cinema scope predicate; unknown and
foreign detail IDs both return the same safe 404. Booking search for inaccessible
IDs/codes returns an empty scoped page. Explicit foreign Cinema/Showtime filters
return 404; a Manager with no valid effective assignment/current account returns 403.
Filters never grant scope, nor reveal global counts or pagination metadata.

401 anonymous/invalid authentication; 403 wrong JWT role or current access denial;
400 malformed IDs/query; 404 missing/foreign resource. Existing Manager safe
ProblemDetail mapping handles persistence failures (503; existing concurrency/
timeout mapping can return 409), without SQL or internal details. Unsupported
HTTP mutation methods have no handler. Detail accepts no query parameters.

Service is `readOnly=true`, REPEATABLE READ, 10-second transaction; existing Manager
5-second statement / 2-second lock limits apply. No row locks/writers, financial
validators, database roles/grants or V1–V18 files change. Revocation/role changes
committed before the next request are observed under the existing scope model.
