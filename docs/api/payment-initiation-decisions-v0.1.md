# Payment initiation decisions v0.1

Date: 2026-09-30. Status: DRAFT; required scope/amount answers pending. This is
not an implemented API contract and does not authorize a provider or payment charge.

## Established decisions

Sources: [database decisions §6](../db/database-design-decisions-v1.0.md),
[integrity design §6](../db/integrity-enforcement-design-v1.0.md),
[Promotion contract](promotion-composition-contract-v1.0.md), and the current task.

| Concern | Established behavior |
|---|---|
| Atomicity | First persisted INITIATED attempt and permanent payment_started_at commit together, with one captured initiation timestamp |
| Authority | Owned eligible PENDING Booking, original Holds/deadline/cutoff, server totals and current Promotion revalidated under ordered locks |
| Amount changes | Revalidation must not silently change the Customer-reviewed amount; return revised-summary/conflict before creating attempt/freeze |
| Identity | Immutable unique internal_reference identifies one attempt; never manufacture a provider external reference |
| Retry | Return the existing unresolved attempt; only definitive FAILED/CANCELLED permits another attempt before original expiry |
| Freeze | All composition/amount/currency snapshots stay immutable after first initiation, including retries |
| Network boundary | Commit local attempt/freeze before contacting gateway; no network request while holding transaction locks |
| Timeout | Unknown provider outcome is unresolved, not FAILED; no automatic replacement attempt or deadline extension |
| Reconciliation | Resume/query using original attempt reference and provider idempotency; unverified frontend redirect is not evidence |
| Terminal Booking | Cancel/expiry does not erase freeze or financial history, manufacture provider cancellation, or enable fulfillment |
| Success | Deferred; no PAID/paid_at, usage consumption, CONSUMED Hold, sold_at, Ticket or QR in initiation slice |

Implementation detail proposed within these rules: Booking-scoped serialization
and a database uniqueness constraint enforce at most one unresolved attempt.
The attempt's generated internal reference supplies retry/recovery identity;
a client token must not be treated as authority for amount or ownership.

## Required decisions pending user response

### 1. Gateway scope and provider identity

No implemented provider adapter/configuration was found. SRS FR-PAYMENT-003
requires a configured sandbox provider; the dictionary requires an immutable
provider namespace associated with an account/reference scope.

Options presented to the user:

- Persist a real internal INITIATED attempt and freeze in this slice, without
  gateway submission. Implement adapter/submission later. This is not a simulated
  success or a claim that the provider has accepted payment.
- Include sandbox submission now; user must identify the provider. Consult that
  provider's official contract before choosing namespace, request identity,
  external reference, redirect, timeouts or reconciliation calls.

Even with submission deferred, the production namespace must be explicitly
configured and documented; do not seed a fictitious provider. Missing configuration
must not freeze Customer Bookings. Tests may use an isolated test namespace only.
No merchant secrets should be requested in chat or committed.

### 2. Currency and payable amount

Promotion percentage rounding is approved as whole VND. Existing Seat/Concession
and fixed-discount amounts are numeric(19,4), so that does not settle gateway
amount acceptance. Zero total is possible after an approved full discount.

Proposal presented to the user: VND only; accept strictly positive integral totals,
reject fractional/zero totals without silently rounding or changing stored prices.
This proposal is **not yet approved**. Alternatives require explicit rounding or
zero-value checkout policy; neither is inferred from fixtures.

## Implementation plan after resolution

1. Publish Payment initiation contract with resolved decisions and HTTP shape,
   deterministic retry/conflict semantics and explicit gateway limitations.
2. Add V9 payment_transactions, protected initiation routine, paired immediate
   guards/deferred assertions and narrow runtime grants. Keep sale/issuance blocked.
3. Add Customer controller/service/repository and additive Booking contract; preserve
   original ordered locks and frozen historical snapshots.
4. Test fresh/V8 upgrade, atomic failure, concurrency, retry, ownership, strict
   inputs, post-freeze mutation rejection and all no-success prohibitions using PostgreSQL.
5. Run Maven verify, preserve checksums/history, generate implementation report and
   reconcile context/handoff. Do not label implementation complete before this work.

After initiation is verified, anticipated next task remains backend-verified
Payment SUCCESS + atomic sale finalization, with any missing provider adapter work
explicitly included as a prerequisite.
