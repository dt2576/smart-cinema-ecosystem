# Customer Payment Initiation Contract v1.0

Date: 2026-09-30. Scope: real internal attempt persistence and atomic composition
freeze only. No gateway submission, sandbox, external charge or verified outcome.

## 1. Authority and resolved decisions

Sources: [SRS v1.2](../srs/srs-v1.2.md) FR-PAYMENT-001/002/010/011/012,
FR-BOOKING-018; [database decisions §6](../db/database-design-decisions-v1.0.md);
[integrity design §6](../db/integrity-enforcement-design-v1.0.md);
[Promotion contract](promotion-composition-contract-v1.0.md); explicit user answers
on 2026-09-30 superseding the proposals in [preflight draft](payment-initiation-decisions-v0.1.md).

| Decision | Implemented boundary |
|---|---|
| Provider | Not selected or invoked; nullable provider/external reference, no placeholder provider |
| Currency | Not selected; nullable currency, no inferred VND currency binding from percentage rounding |
| Amount | Exact server Booking final_amount, numeric(19,4); zero and fractional totals allowed unchanged |
| Client authority | Client cannot supply amount, currency, provider, timestamp, result or reference |
| Attempt identity | Server-generated globally unique immutable internal_reference plus bigint id |
| Idempotency | Booking-scoped single unresolved attempt; repeated/concurrent initiation returns same row/reference/amount/time |
| Timeout/crash | Transaction rollback means neither attempt nor freeze. Unknown HTTP response can be retried against same Booking |
| Provider reconciliation | Deferred; local INITIATED is not evidence of provider acceptance or failure |
| New attempt after terminal outcome | Deferred; no FAILED/CANCELLED/SUCCESS writer exists in this slice |

The physical dictionary's non-null provider/currency is intentionally deferred at
this staging boundary under the explicit user decision. V9 instead requires them
to remain null. A future reviewed migration must bind them under the chosen
provider contract before any external charge; never silently convert frozen amount
or fabricate historical provider evidence. Fractional/zero gateway constraints and
minor-unit conversion must be decided there.

## 2. HTTP resource

`POST /api/v1/bookings/{bookingId}/payment-transactions`

Authenticated active CUSTOMER, owned Booking only. Body must be an empty JSON
object `{}`. Unknown fields, query parameters, null/array/malformed JSON and
invalid positive-bigint path IDs return 400. There is no client amount or client
idempotency key; Booking identity and its single unresolved attempt establish
idempotency at the domain boundary. JWT subject supplies actor identity.

Successful first initiation and retry both return **200**, `Cache-Control: no-store`:

```json
{
  "id": "9007199254740994",
  "bookingId": "9007199254740993",
  "internalReference": "P-example-only",
  "status": "INITIATED",
  "amount": "123.4567",
  "currency": null,
  "provider": null,
  "initiatedAt": "2026-09-30T02:00:00Z",
  "expiresAt": "2026-09-30T02:05:00Z"
}
```

IDs and exact amount are JSON strings. UTC instants serialize existing timestamp
with timezone values. expiresAt is the unchanged Booking deadline, not a new
Payment TTL. Response has no checkout URL, provider reference, Ticket or QR.
INITIATED means stored locally, not submitted, charged or verified.

## 3. First initiation and review

Inside the existing READ COMMITTED transaction and lock protocol:

1. Resolve owned Booking; revalidate active Customer under the shared User →
   Cinema → Hall → Showtime → Seat/pair → Booking/Hold lock order.
2. Process elapsed aggregate expiry and validate PENDING, original earliest-Hold
   deadline, Showtime start/cutoff, current Movie/Cinema/Hall/Seat eligibility and
   exact attached ACTIVE Holds. No ownership or deadline renewal.
3. Reconcile stored Seat and Concession sums and final arithmetic. Preserve their
   unit-price snapshots; do not pull current master prices for existing lines.
4. Lock applied Promotion after aggregate resources; check current state/window,
   minimum, type/value/cap and paid-count usage. Ineligible code returns 409 until
   removed/replaced. Compare current terms/calculated discount to accepted Booking
   snapshot. Any difference returns `Composition review required` without changing
   totals, creating an attempt or freezing. Customer must reapply/remove and review.
5. Capture one timestamp, insert actual INITIATED Payment row with final_amount,
   and set payment_started_at to that exact timestamp in the same transaction.
   Recheck eligibility after lock waits. Commit only when all assertions hold.

No network I/O or provider request occurs. A returned success guarantees the local
transaction, not external money movement. As with any concurrent API, cancellation
may occur after that commit; clients must reload current Booking state.

## 4. Retry, immutable composition and terminal Bookings

Before original expiry, an owned active Customer retry on PENDING frozen Booking
returns the existing INITIATED attempt. It is recovery, not new charge authorization.
It does not refresh Promotion rules, prices, attempt time or expiry; master changes
cannot reprice frozen composition. There is no automatic retry counter, new attempt
or local timeout-to-FAILED transition. Booking GET exposes nullable paymentStartedAt.

After freeze, all Concession add/update/remove, Promotion apply/remove, Seat-line
changes and header amount changes fail through the shared database guards. Even
clearing/changing payment_started_at or mutating/deleting the attempt is forbidden.
The freeze remains permanent when Booking is cancelled or expires. Existing
cancel/expiry releases only origin Holds and retains attempt/snapshots unchanged.
Initiation on EXPIRED/CANCELLED or elapsed Booking returns 409, not a new attempt.
INITIATED may remain on a terminal Booking because no provider result is known.

## 5. Persistence and permissions

[V9](../../backend/src/main/resources/db/migration/V9__create_payment_initiation.sql)
adds payment_transactions using the existing physical model: bigint id/FK,
immutable reference, numeric(19,4), timestamp(6) with time zone, optional provider
fields and metadata. Current-stage CHECK requires INITIATED, null provider/currency/
external reference/completed_at and empty metadata. It enables neither fake result
states nor external submission. Ordinary reference uniqueness, provider/external
uniqueness for future binding, FK index and unresolved-Booking partial unique index
are present. Historical V1–V8 remain untouched.

Immediate guards verify initial attempt origin, amount and eligibility and require
an actual matching attempt before first marker update. Deferred assertions on
both tables require exactly one attempt with matching amount/instant whenever
marker is set, and no attempt if marker is null. Partial transactions cannot commit.
Existing aggregate assertions still protect Seat/Hold/Concession history.

Existing non-login owner owns new table/routines. Runtime receives SELECT and
EXECUTE on initiate_payment only, no DML/TRUNCATE, helper execution or result writer.
Fixed safe search_path and schema-qualified objects remain. No new locks are taken
in reverse order. Existing bounded lock/statement timeouts apply; contention rolls
back rather than partially freezing. No external timeout policy is invented.

## 6. ProblemDetail

| Status | Meaning |
|---|---|
| 400 | Invalid body/query/ID |
| 401 | Missing/invalid authentication |
| 403 | Non-Customer/inactive account |
| 404 | Missing or foreign Booking |
| 409 | Ineligible/expired/terminal Booking, unavailable Promotion, changed terms requiring review, or bounded contention |
| 503 | Unexpected database failure |

`Promotion unavailable` and `Composition review required` preserve safe actionable
messages without raw SQL or ownership disclosure. Failed initiation commits no
attempt/marker. Incidental expiry in a rejected transaction rolls back as in prior
Booking commands; read-time expiry and cleanup still enforce elapsed entitlement.

## 7. Deferred dependencies and next task

Next task: **backend-verified Payment SUCCESS + atomic sale finalization**, with
provider selection/integration and amount/currency binding resolved before enabling
any external charge or accepting success evidence. No client flag or frontend
redirect may invoke finalization as proof.

Required follow-up: provider/account namespace, sandbox authentication/signature,
exact amount/currency conversion and zero/fractional handling, idempotent submission/
query recovery, definitive failures/new attempts, late outcomes and audit evidence.
Reconcile usage-limit exhaustion versus settlement. Verified SUCCESS must atomically
record result, enforce eligible frozen Booking, consume Promotion through PAID,
set paid_at/sold_at, consume origin Holds and issue Tickets/one Booking QR with
full protected aggregate assertions. Tests requiring those writes remain DEFERRED.

Evidence: [implementation report](../reports/2026-09-30_payment-initiation-backend_report.md).
