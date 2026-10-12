# Staff QR Resolution and Ticket Check-in Contract v1.0

Date: 2026-10-12. Approved by Phase 4B-1/resume decisions. This additive contract preserves Customer/Booking/Payment/VNPAY contracts. **Operational HTTP endpoints below are reserved for Phase 4B-2 and are not installed by Phase 4B-1.** Database transitions/foundation are separately implemented and tested.

## Common rules

Authenticated JWT STAFF plus current database ACTIVE/STAFF and effective ACTIVE STAFF Cinema assignment. ADMIN/MANAGER do not inherit admission. Identifiers are canonical positive bigint decimal strings (1–9223372036854775807), never numbers or leading zeros. Requests reject unknown/repeated/duplicate properties and query fields. No owner/actor/state/time override. All responses/errors no-store, fixed safe ProblemDetail, no Customer PII, Payment/provider/financial details or raw QR. No automatic command retries.

Admission is separate from sale: PAID complete issuance, Cinema ACTIVE, Hall ACTIVE, Showtime OPEN_FOR_BOOKING or STARTED, inclusive `start_time - 30 minutes <= database time <= start_time + 15 minutes`. DRAFT/SCHEDULED/ENDED/CANCELLED fail closed. SCHEDULED is pre-opening; existing paid sale originates in OPEN_FOR_BOOKING and normal authoring cannot revert a historical Showtime. No automatic STARTED requirement, Movie publication or Customer status veto, sold-seat availability check, Booking payment expiry, automatic Ticket expiry or financial mutation.

## GET /api/v1/staff/cinema-assignments

No query/body. Current effective ACTIVE STAFF assignments only, ordered numeric assignment ID; empty collection means unassigned. Typed envelope `{ serverTime, assignments: [{ id, cinemaId, cinemaName, effectiveAt }] }`. One read-only REPEATABLE_READ snapshot; no persistent role claim authorizes scope.

## POST /api/v1/staff/booking-qr-resolutions

Exact body `{ cinemaId: string, bookingQr: string }`; no query. Token is the exact opaque UTF-8 Customer QR payload, nonblank ≤128 Unicode code points, no controls/unpaired surrogates. Never trim/normalize/case-fold/wrap or fetch token URLs. Transport in confidential JSON body, never URL/log/analytics. POST is a logical read-only REPEATABLE_READ operation; no Check-in, issuance, token rotation or mutation.

Verify selected current scope and actual Booking→Showtime→Hall→Cinema. Well-formed unknown/foreign/inaccessible QR is the same safe 404. Complete typed response is StaffBookingResponse. Repeated scans return fresh complete committed snapshots, not admission side effects.

## GET /api/v1/staff/bookings/{bookingId}?cinemaId={cinemaId}

Exactly one canonical `cinemaId` parameter. Independent current STAFF/scope validation, complete operational projection, no QR input/output. Read-only REPEATABLE_READ. Safe after reload/lost command response; ID/context hints are untrusted. Nonpaid Booking has no Ticket entitlements and admissionAllowed=false. Missing/foreign Booking shares safe 404.

## POST /api/v1/staff/bookings/{bookingId}/check-ins

Exact body `{ cinemaId: string, ticketIds: string[] }`, no query. Nonempty canonical unique IDs, all belonging to Booking and VALID. Bounded JSON body **1 MiB** is a technical transport limit, not a business maximum Ticket count. Phase 4B-2 must stream-enforce this bound before binding. Validate entire selection under ordered locks; any invalid/foreign/missing/already-used/non-VALID unit fails the whole batch. Only backend-committed VALID→CHECKED_IN and exactly one immutable audit per Ticket produce 200 `{ checkedInTicketIds: string[], booking: StaffBookingResponse }`.

Booking remains PAID; QR, issuance, prices, sold markers and unselected Tickets remain unchanged. COUPLE is one Ticket/two guests/one success. Repeated command can return 409; state-effect idempotency, not identical-response replay. No auto retry, including transport timeout after a possible commit; recover via owned operational GET/rescan and explicitly reselect.

## Typed projection

```text
StaffBookingResponse:
 bookingId, bookingCode, bookingStatus
 movieId, movieTitle, cinemaId, cinemaName, hallId, hallName, showtimeId
 startsAt, endsAt, showtimeStatus, serverTime
 admissionAllowed: boolean
 admissionReason: null | NOT_PAID | CONTEXT_UNAVAILABLE | OUTSIDE_ADMISSION_WINDOW
 tickets: StaffTicket[] (ascending numeric Ticket ID)
 concessions: [{ name, category, quantity }]
StaffTicket:
 id, bookingSeatId, seatId, ticketCode, row, number, seatType, guestCount
 status: VALID | CHECKED_IN | EXPIRED | CANCELLED
 checkedInAt: UTC instant | null
 canCheckIn: boolean
```

Money/provider/Customer identity fields, raw QR, audit operator IDs and unapproved counters are omitted. Reason codes are computed response explanations, not persisted domain states. Snapshot seatType/guestCount and full one-to-one purchased-unit aggregate must validate. Concessions represent purchase, not pickup. Read-time eligibility is advisory; command revalidates after all waits using fresh database time.

## Errors, limits, privacy and concurrency

400 malformed/unknown/repeated/oversized/canonical-ID/token/selection inputs (fixed text); 401 auth; 403 inactive/current wrong role or selected assignment unavailable; generic 404 inaccessible Booking/QR/Ticket; 409 already-used/invalid Ticket or ineligible paid context/window; 429 rate limit with Retry-After; 503 inconsistent aggregate/database/timeout/temporarily unavailable. No supplied values or diagnostics reflected. Phase 4B-2 operational limiter: per-current-actor 60 requests/minute for reads/resolution, 30/minute for commands, shared durable buckets; these are technical bounds subject to deployment tuning, not Ticket business limits.

Database command takes actor User SHARE, parent Cinema/Hall SHARE, Showtime UPDATE, Movie SHARE, ordered Seats/pairs/Bookings/Holds, then selected Tickets UPDATE/audit; actor administration takes User UPDATE before scope mutation. No Ticket-first inversion. Single transaction/fresh database time; bounded lock/statement timeouts, no network work under locks. Existing frozen composition, pre-sale expiry and protected issuance are untouched.

Traceability: BRD v1.2 BR-002–004/043–053/062; SRS FR-AUTH-007/008, FR-TICKET-002–006/010, FR-CHECKIN-001–013, FR-ORG-005, FR-AUDIT-004, NFR-CONC-003/005/007, NFR-SEC-003/006/009–012; UC-STF-004 and BRULE-TICKET-001–009. New phase decisions narrow historical Admin/conditional Manager admission and select the exact inclusive window.
