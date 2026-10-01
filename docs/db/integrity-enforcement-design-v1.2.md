# Integrity enforcement design v1.2 — V10 implementation

Date: 2026-09-30. Additive implementation record for
[v1.1](integrity-enforcement-design-v1.1.md) and the
[VNPAY contract v1.1](../api/vnpay-sandbox-payment-contract-v1.1.md).
Historical migrations/contracts/design revisions remain unchanged.

## 1. Migration and physical additions

[V10](../../backend/src/main/resources/db/migration/V10__integrate_sandbox_payment_finalization.sql)
evolves V9 forward; no bulk provider/currency backfill is performed.

| Storage | Implementation |
|---|---|
| payment_transactions | Existing exact numeric(19,4) amount and immutable internal identity; merchant_code varchar(8), environment varchar(10), merchant_reference varchar(100), submitted_amount numeric(12,0), provider_created_at/provider_expires_at/next_query_at timestamptz, return_url varchar(255), client_ip varchar(45), reconciliation_required boolean |
| provider_metadata | Immutable non-secret order_type binding after initial provider assignment; JSON object, no raw gateway payload |
| payment_evidence | bigint identity PK, payment FK, source/result/codes, SHA-256 digest, optional external reference, observation time; unique payment/source/digest, append-only |
| payment_reconciliations | bigint identity PK, payment FK, reason, optional evidence FK, first/last observation, nullable resolved timestamp/operator/note; unique payment/reason; reopens on new relevant evidence |
| tickets | Approved dictionary fields: unique booking_seat FK, unique ticket_code, status, issued/check-in fields; one unit -> one Ticket; no per-Ticket QR |
| audit_records | Approved actor/action/resource/time/object metadata; system actor required when user actor absent; append-only |

No cascading delete is introduced. All binding timestamps and domain amounts are
server-owned. Original provider dates retain second precision for protocol formatting;
domain timestamps retain PostgreSQL timestamptz precision. Unbound historical rows
remain INITIATED with null provider fields. Bound rows require VNPAY/SANDBOX/VND,
valid merchant/reference and exact positive whole-VND scaled amount. Terminal
financial results require completion time. External identity uniqueness is scoped
by provider/environment/merchant; evidence retains conflicting claims separately.

## 2. Guard evolution

- `assert_payment_freeze` requires the marker to match the earliest persisted
  attempt and every attempt amount to match the frozen Booking. At most one
  INITIATED/PENDING attempt remains enforced by the existing partial unique index.
- Payment insert/update guards preserve identity and one-time binding. Protected
  result commands require evidence before terminal transitions; Customer role
  cannot execute that result writer or write tables directly.
- Existing Booking/Seat/Hold insert, snapshot and cancellation guards remain;
  narrow paid transition branches coordinate with new deferred paid assertions.
- `assert_paid_aggregate` requires matching SUCCESS, all sold timestamps, consumed
  exact origins, exactly one Ticket per Booking Seat and sale audit. Existing
  Booking checks require paid_at/freeze/unique QR. Non-PAID forbids sold/Ticket/
  consumed state. The existing sold-pair unique index prevents double sale.
- `payment_settlement_eligible` is distinct from the unfrozen composition helper.
  It preserves original cutoff/expiry/current resource/ownership checks without
  applying later account BLOCKED as a settlement veto or reading current prices.
- Frozen Promotion terms remain untouched; current usage count/limit is checked
  under Promotion lock before PAID. Financial SUCCESS can be stored without PAID.
- Cases/audit are durable. Operator resolution is privileged, attributed and cannot
  mark a payment refunded, issue entitlement or erase the original evidence.

## 3. Locking and grants

The v1.1 runtime order remains User for new actions -> Cinema -> Hall -> Showtime
-> Movie -> Seats -> Showtime Seat pairs -> Bookings -> Holds -> applicable
Concession resources -> Promotion -> Payment -> Tickets/audit. System settlement
does not impersonate Customer or run ACTIVE-account authorization. It uses the
same parent/resource gate with dedicated post-freeze eligibility.

Query claims are isolated scheduling transactions taking only Payment rows with
SKIP LOCKED, then committing before any network request. They never acquire an
earlier domain lock while holding that row. A later verified result independently
enters the full hierarchy. Positive delay/horizon configuration bounds polling;
the horizon creates operator reconciliation, not a financial failure.

`smart_cinema_payment_system` is NOLOGIN and receives schema usage, required reads
and EXECUTE on protected result/query/operator commands. Deploy a separate login
member for it; no fallback to normal runtime credentials. Normal hold runtime
receives submission EXECUTE, Ticket reads and limited evidence-column reads for
recovery; it cannot write evidence, call the result function, or directly mutate
paid state. Internal helpers remain ungranted; functions use schema qualification
and safe search_path. Owner role is still NOLOGIN.

## 4. Verification limits

The [report](../reports/2026-09-30_vnpay-sandbox-payment-backend_report.md) separates
PostgreSQL atomicity/races, local signed-fixture tests and actual provider testing.
No check-in mutation, production payment, automatic refund or notification sender
is installed. Ticket lifecycle fields prepare the existing model; admission work
remains a future slice. The per-Showtime gate is intentionally conservative;
production load measurements and a general operator UI remain deferred.
