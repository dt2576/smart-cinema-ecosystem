# STAFF POS Counter Ticket Sales Contract v1.0

Date: 2026-10-30. Backend-only extension explicitly approved by the user, including
the subsequent CASH/VNPAY decision. Authority: [BRD v1.3](../brd/brd-v1.3.md)
BR-038 and existing Booking/Ticket/assignment rules;
[SRS v1.3](../srs/srs-v1.3.md) approved counter-sales revision. Historical Customer
and VNPAY contracts remain applicable to their own routes. No frontend is installed.

## Deployment and authorization

Base path `/api/v1/staff/pos`. JWT STAFF plus current ACTIVE STAFF database account
and effective ACTIVE STAFF assignment to the selected Cinema on every request.
ADMIN/MANAGER/CUSTOMER do not inherit POS. Owned counter commands/receipts require
`selling_staff_id` equal to the authenticated actor and the selected Cinema to
match the actual Showtime → Hall → Cinema. No sale handover between operators is
introduced. Use existing GET `/api/v1/staff/cinema-assignments` for current context.

Catalog/map reads work on V18. All counter-sale/Hold/Payment/receipt operations
fail closed with 503 until the separately reviewed V19 proposal is installed.
The proposal currently lives only in
`backend/src/test/resources/pos-migration/V19__enable_staff_counter_sales.sql`;
normal startup scans only `src/main/resources/db/migration` and remains V18.
No automatic migration, account provisioning or default credentials.

## Endpoints

All IDs are canonical positive bigint decimal **strings**, never JSON numbers.
Money is an exact decimal string, up to four places and less than 10^15.
All responses/errors use no-store. Query parameters are exact single values;
unknown/repeated fields and body properties are rejected. POST/PUT JSON rejects
duplicate keys/trailing content and is bounded to 64 KiB before binding.
Actor, status, price, method result, expiry or timestamps cannot be supplied.

| Method / suffix | Exact query or JSON body | Response |
|---|---|---|
| GET `/movies` | query `cinemaId` | `{serverTime,items:[{id,title}]}` ordered by numeric Movie ID |
| GET `/showtimes` | query `cinemaId,movieId`, optional `date=YYYY-MM-DD` | Existing ShowtimeSchedule: timeZone, serverTime, date, dates, items |
| GET `/showtimes/{showtimeId}/seats` | query `cinemaId` | Existing authoritative SeatMapResponse |
| GET `/showtimes/{showtimeId}/seat-holds` | query `cinemaId` | Existing SeatHoldBatch; own live unattached Holds only |
| POST `/showtimes/{showtimeId}/seat-holds` | `{cinemaId,seatIds:string[]}` | SeatHoldBatch |
| DELETE `/showtimes/{showtimeId}/seat-holds/{holdId}` | query `cinemaId` | 204; original safe release semantics |
| POST `/bookings` | `{cinemaId,showtimeId,holdIds:string[]}` | Existing BookingResponse; 200 also on exact live Hold-set replay |
| GET `/bookings/{bookingId}` | query `cinemaId` | Counter Receipt below; recovery read |
| DELETE `/bookings/{bookingId}` | query `cinemaId` | 204; existing pending cancellation/no financial override |
| PUT `/bookings/{bookingId}/promotion` | `{cinemaId,code}` | Existing BookingResponse |
| DELETE `/bookings/{bookingId}/promotion` | query `cinemaId` | Existing BookingResponse |
| POST `/bookings/{bookingId}/payment-transactions` | `{cinemaId}` | Receipt with known attempt list; INITIATED is not payment success |
| POST `/bookings/{bookingId}/payment-transactions/{paymentId}/cash-confirmations` | `{cinemaId,expectedAmount:string}` | Receipt after atomic authorized CASH confirmation |
| POST `/bookings/{bookingId}/payment-transactions/{paymentId}/vnpay-submission` | `{cinemaId}` | Existing VnpayRedirectResponse / allowlisted Sandbox hosted URL |

Movie/Showtime eligibility reuses Customer discovery: PUBLISHED Movie, ACTIVE
Cinema/Hall, OPEN_FOR_BOOKING Showtime, startsAt and cut-off after database time.
Date defaults to the existing discovery timezone's current day. A foreign or
unavailable movie schedule yields no sellable results; no global catalog leaks.
A well-formed unknown/foreign Showtime under an authorized selected Cinema is 404.
The seat map is a read projection, not a reservation or price quote.

## Walk-in ownership, prices and lifecycle

Walk-in sale needs no CUSTOMER account: `customer_id=null`, `selling_staff_id=actor`.
A generated internal owner key preserves the existing Hold/Booking ownership FK;
Customer rows keep customer_id and have no selling_staff_id. Exactly one identity
source is required. Customer history and Customer payment URLs remain customer-owned.
There is no public customer-ID selection, anonymous Customer seed or optional PII
storage in this iteration; no existing approved walk-in-contact contract exists.

The shared protected functions handle Hold locking, eligibility, original TTL,
expiry/release/cancellation, authoritative base-price snapshots, aggregate totals,
Promotion validation/usage locks and first-attempt permanent composition freeze.
COUPLE is one Seat Unit / one purchased line / one Ticket / two guests. No client
price, VAT, fee, extra per-guest multiplier, deadline extension or new status.
Concession edits are outside this iteration.

## CASH confirmation authority

The named confirmation resource expresses an explicit receipt-of-cash command,
not a generic status setter. STAFF must have actually received the full amount;
`expectedAmount` is compared to the frozen backend total and selected attempt
amount. It does not set or override price or specify cash tender/change.

Only a known unbound INITIATED attempt can become CASH. Under current actor/scope
locks and the same ordered sale resources/promotion/payment locks, validate the
original deadline, authoritative amount and settlement eligibility. Persist
CASH/VND/COUNTER, SUCCESS and database completed_at, append-only CASH evidence
(server-generated SHA-256 receipt digest), `CASH_RECEIVED` audit with actor, amount,
currency, Booking/Payment identity and database timestamp. The shared internal
finalizer atomically marks Booking PAID, sells units, consumes Holds and issues
one Booking QR and one Ticket per Seat Unit, with SALE_FINALIZED audit.
Any guard/audit/issuance/commit failure rolls back everything.

Exact replay for the same successful CASH attempt and amount returns the existing
receipt after current authorization; no second payment/evidence/audit/issuance.
Wrong amount, expired sale, wrong attempt, reconciliation or bound VNPAY fails.
An unresolved VNPAY attempt cannot be converted to CASH. Existing explicit
replacement policy applies only after verified FAILED/CANCELLED, preserving the
first freeze and original expiry. Do not automatically retry uncertain commands.

## VNPAY and recovery

Reuse existing backend submission readiness gates, strict HTTPS Sandbox hosted
URL, amount/window rules, signing and protected result verification. No secrets,
merchant configuration or confirmation flags are changed. Existing provider IPN
and QueryDR verify outcomes; browser return parameters never establish PAID.
The existing backend return route remains unchanged and carries no new POS
identity authority; after return/reopen use the POS scoped receipt GET with the
known Booking identity. There is no POS frontend return screen in this task.

The single internal finalizer serves both authoritative confirmation mechanisms;
runtime cannot execute it directly or perform Payment/Ticket table DML. VNPAY
late evidence, duplicate callbacks, negative outcomes and reconciliation retain
their previous rules. No manual VNPAY success or evidence injection HTTP API.

Reload/lost initiation response: receipt GET returns the actual ordered attempt
list for that owned counter Booking. Lost Booking response: explicit exact Hold-set
replay can recover the same still-live Booking using the original shared rule.
If original identities are lost or expired, do not guess or silently create a sale.

## Receipt projection and reporting compatibility

```text
Receipt {
  booking: BookingResponse,
  payments: [{ id, status, amount, currency, method,
               initiatedAt, completedAt, reconciliationRequired }],
  tickets: StaffBookingResponse.Ticket[],
  bookingQr: string | null
}
```

`method` is backend provider CASH/VNPAY or null before binding. An unpaid/effectively
expired Booking returns no Tickets/QR. Paid receipts require coherent authoritative
Payment/amount and complete issued-seat aggregate; inconsistencies fail 503.
Ticket/QR text is printable purchase/admission data, not a tax invoice, local QR
issuance, automatic check-in, stock receipt or concession pickup authorization.
Receipt diagnostics redact QR; never log/export QR/auth payloads to analytics.

ADMIN/MANAGER summary adds separate `cashTotals` under reporting contract v1.1.
Existing VNPAY metrics/period metadata/daily/ranking/product cohorts retain their
meaning; no CASH revenue is mislabeled VNPAY Sandbox. Existing reporting frontend
does not render the additive field yet. Future UI/report extensions are separate.

## Errors and verification boundary

400 malformed input; 401 missing/invalid authentication; 403 wrong role/current
account/selected assignment; generic 404 unknown/foreign/other-operator resource;
409 current-state/amount/payment conflict; 429 existing admission-receipt read
budget where applicable; 503 uninstalled capability, database/timeout/inconsistent
aggregate/provider not ready or uncertain commit. Errors contain no raw SQL,
signature, callback payload or Customer information. Refresh scoped GET after
uncertain results before any explicit subsequent command.

Isolated PostgreSQL fixtures and signed fixture callbacks are not actual VNPAY
Sandbox interoperability or real PRIMARY STAFF login/payment proof. PRIMARY V19,
runtime grants and live business writes require separate explicit approval.
