# Customer Booking History and Ticket/QR Read Contract v1.0

Date: 2026-10-11. Scope: Phase 3B additive owned reads approved by the task, following the [Phase 3A audit](../reports/2026-10-11_customer-booking-history-ticket-qr-contract-audit_report.md). Existing [Booking v1.3](booking-contract-v1.3.md) and [VNPAY v1.1](vnpay-sandbox-payment-contract-v1.1.md) remain unchanged. This contract is published before source implementation.

## 1. Authentication and common behavior

Both GET endpoints require a valid Bearer JWT with CUSTOMER role and a current database user whose role is CUSTOMER and status ACTIVE. Identity comes only from the authenticated subject. No customerId override is accepted. Responses, including safe application errors, use `Cache-Control: no-store`; security rejection retains Spring Security's default no-store cache headers.

IDs serialize as canonical positive-bigint decimal strings, never JSON numbers. Path IDs use the existing Booking parser: 1–19 ASCII digits, parsed value 1 through 9223372036854775807; leading zeros are accepted and normalized in the response. Money is the persisted numeric(19,4) value in plain exact decimal text, with four fractional digits. UTC timestamps serialize as ISO instants. Counts and pagination metadata serialize as JSON integers.

No GET creates/changes a Booking, Payment, Ticket, QR, Hold, freeze marker or expiry. All owned reads use read-only REPEATABLE_READ. Their statements share one snapshot and one serverTime. Separate HTTP requests can observe different snapshots; clients must re-read discrepant projections rather than infer issuance or PAID.

## 2. GET `/api/v1/bookings`

Only `page` and `size` are supported. Each may occur once and must contain nonempty ASCII digits. Signs, whitespace, fractions, blank/repeated/unknown parameters are rejected. Leading zeros follow existing numeric query conventions.

| Parameter | Default | Bounds |
|---|---|---|
| page | 0 | 0–2147483647, zero-based |
| size | 20 | 1–100 |

Fixed ordering is `createdAt DESC, id ASC`. Offset is calculated as a long; an out-of-range page returns an empty items array with the same total count. Counts and items use the same subject ownership predicate and transaction snapshot. Pages may shift when another request creates a Booking; no cursor-stability guarantee is made. No search, status filter, arbitrary sort or global entrance counters are supported.

Response: HTTP 200, typed `BookingHistoryResponse`:

```text
items: BookingHistoryItem[]
page, size: integers
totalElements, totalPages: nonnegative integers
serverTime: UTC instant

BookingHistoryItem:
  id, bookingCode, status
  movieId, movieTitle, cinemaId, cinemaName, hallId, hallName, showtimeId
  startsAt, createdAt, expiresAt, paymentStartedAt (nullable)
  seatUnitCount, guestCount
  finalAmount
```

All IDs above are strings; `bookingCode`, titles/names and `status` are strings; timestamps are UTC strings; counts are integers; `finalAmount` is an exact decimal string. History contains no QR, Ticket rows, Payment attempt identifiers, provider metadata or personal Customer fields. Labels are current owned Booking references, not new historical label snapshots. No public publication/activity filter is applied to Movie/Cinema/Hall/Showtime; hidden/inactive catalog remains historically readable.

Effective status is the same as existing owned detail: if persisted status is PENDING and original `expiresAt <= serverTime`, return EXPIRED; otherwise return persisted PENDING/PAID/EXPIRED/CANCELLED. The read never performs cleanup. `paymentStartedAt` preserves the first-attempt freeze marker and implies neither provider submission nor success. Seat Unit count counts purchased units; guest count counts COUPLE as two and STANDARD/VIP as one.

## 3. GET `/api/v1/bookings/{bookingId}/tickets`

No query parameter is supported. No Payment attempt ID is accepted or needed. Ownership is checked before entitlement access; foreign and nonexistent Bookings return the same safe 404.

Response: HTTP 200, typed `BookingTicketsResponse`:

```text
bookingId: positive-bigint string
bookingStatus: PENDING | PAID | EXPIRED | CANCELLED (effective Booking status)
serverTime: UTC instant
bookingQr: opaque string | null
tickets: CustomerTicket[]

CustomerTicket:
  id, bookingSeatId, seatId: positive-bigint strings
  ticketCode: persisted unique string
  status: VALID | CHECKED_IN | EXPIRED | CANCELLED
  seatType: STANDARD | VIP | COUPLE
  guestCount: integer, COUPLE=2; STANDARD/VIP=1
```

Ticket order is ascending numeric Ticket ID. Non-PAID returns null QR and an empty array. PAID returns the exact persisted Booking QR and complete persisted Ticket set: one Ticket per purchased Booking Seat Unit, with unique Ticket IDs/codes, Booking Seat IDs and Seat IDs. Purchased-unit snapshots determine seatType/guestCount. Issued Ticket time and sold-unit time must match the Booking paid timestamp. No partial/synthetic aggregate is returned: a missing/invalid token, missing/duplicate/invalid Ticket, invalid Seat Unit snapshot or inconsistent issuance yields safe HTTP 503 with no entitlement fields.

Entitlement depends on the paid Booking aggregate, not a selected Payment attempt or browser financial outcome. An older failed attempt does not remove Tickets issued by a later eligible settlement. Financial SUCCESS without fulfillment still has no Booking entitlements. Original Booking expiry is a pre-sale deadline: once paid, crossing it does not hide QR/Tickets or become a new admission deadline.

## 4. QR representation and sensitive data

`bookingQr` is an opaque server-issued token, preserved exactly. Encode **the returned token itself as UTF-8 text** for the QR payload. Do not prepend a URI scheme, prefix, JSON wrapper or Booking ID. Do not trim, rotate, regenerate, sign or infer tokens. Rendering is deferred to Phase 3C.

The current writer produces 64 lowercase hexadecimal characters; storage allows a nonblank token up to 128 characters. The read accepts an intact nonblank, at-most-128-character token without control characters and does not assume a hash/signature format or rewrite stored data. Clients must treat it as opaque rather than depend on the current writer's format.

This is the approved Customer rendering representation, **not** an implemented Staff scanner/QR resolver contract. Display does not establish admission eligibility or perform Check-in. Each Ticket retains its independent backend status; COUPLE is one Ticket for two guests. Ticket status transitions/scanning remain outside this phase.

Do not put QR tokens in URLs, analytics, logs, errors, DTO string representations or history collection responses. Do not return Staff identities, Check-in audit details, signatures, provider references or internal financial evidence. Existing Payment DTOs stay unchanged.

## 5. Safe errors

| HTTP | Meaning |
|---|---|
| 400 | Invalid path ID or unsupported/repeated/invalid query; safe fixed validation text, no supplied values echoed |
| 401 | Missing/invalid authentication, existing Spring Security behavior |
| 403 | Non-Customer role, invalid subject or current inactive/non-Customer database account |
| 404 | Booking unavailable; same response for foreign and missing Booking |
| 503 | Read/database failure or inconsistent issued aggregate; fixed safe service-unavailable detail; no partial QR/Ticket payload |

Application failures use `application/problem+json`, `title`, `status` and `detail`. No raw callback, query values, SQL diagnostics or entitlement data appears in errors. No 503 recheck changes data or initiates Payment. Ordinary framework/transport failures retain existing security behavior.

## 6. Traceability and implementation boundaries

BRD v1.2 BR-032, BR-043–047; SRS v1.2 FR-BOOKING-009/010, FR-AUTH-009, FR-TICKET-001–004/007–009 and NFR-SEC-009; Business Analysis v2.1 INV-05–08/13/14; System Analysis UC-CUS-020/021/023/024. These reads consume existing authoritative issuance; they do not replace or implement Staff FR-TICKET-005 resolution/Check-in.

No changes to settlement, VNPAY verification, Payment contracts, composition freeze, original expiry, Ticket guards, migrations, frontend or provider/environment configuration. V12 remains migration head. Regression uses the documented dedicated local test database, never production Neon. Live provider/admission interoperability is not claimed.

Implementation and exact regression evidence: [Phase 3B report](../reports/2026-10-11_customer-booking-history-ticket-qr-backend_report.md).
