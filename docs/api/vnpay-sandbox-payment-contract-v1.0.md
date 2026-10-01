# VNPAY Sandbox Payment integration and finalization contract v1.0

Date: 2026-09-30. Status: **APPROVED DESIGN — READY WITH SANDBOX-CONFIRMATION ITEMS**.
Publication means repository-owned documentation, not deployment. Runtime remains
V9 internal initiation only. No provider integration or sale is implemented here.

## 1. Authority, scope and evidence categories

The user's approved decisions in this task resolve the policy proposals in
[preflight v1.1](payment-finalization-preflight-v1.1.md). In particular, subsequent
Customer BLOCKED status alone does not reject settlement of a legitimately
initiated Payment; this supersedes the contrary proposal in that historical file.

Read with [Payment initiation v1.0](payment-initiation-contract-v1.0.md),
[Booking v1.3](booking-contract-v1.3.md), [Promotion v1.1](promotion-composition-contract-v1.1.md),
[Concession v1.0](concession-composition-contract-v1.0.md),
[Seat/Hold v1.1](seat-hold-contract-v1.1.md) and their linked base contracts.
This is an explicit additive future-runtime delta; none of those files is rewritten.

Traceability: [BRD v1.2](../brd/brd-v1.2.md) BR-035–047, BR-064 and BC-03;
[SRS v1.2](../srs/srs-v1.2.md) FR-PAYMENT-001–015,
FR-BOOKING-012/018, FR-PROMO-003, FR-TICKET-001–009;
[database decisions](../db/database-design-decisions-v1.0.md),
[physical dictionary](../db/physical-data-dictionary-v1.0.md) §§3.18–3.20 and
[integrity addendum v1.1](../db/integrity-enforcement-design-v1.1.md).

| Category | Authority and interpretation |
|---|---|
| Verified protocol facts | Official evidence recorded in preflight v1.1 and summarized in §2; not a claim of merchant interoperability testing |
| Approved Smart Cinema policy | This task's decisions, formalized in §§3–11; binding design for the next slice |
| Operational configuration | §12; tunable deadlines/timeouts/backoff, not new pricing or entitlement rules |
| Unverified provider behavior | §13; confirmation/test gates, never silently assumed |

MVP is VNPAY PAY Sandbox/Test only. Production/real-money charge, automatic refunds,
Staff scanner/check-in implementation and unrelated admin CRUD are excluded.
No authorization/capture/void or funds reservation capability is assumed.

## 2. Established provider protocol and sources

Use the research's official sources, not frontend fixtures or third-party SDK
assumptions. [PAY](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html)
defines hosted GET redirect, HTTPS GET IPN and UX-only ReturnURL. Current web
documentation specifies VND, Amount scaled by 100 using at most 12 digits,
GMT+7 CreateDate/ExpireDate and an alphanumeric TxnRef unique within the day.
Its IPN acknowledgement codes 00/02 stop retries; 01/04/97/99 or timeout retry,
up to ten calls five minutes apart.

[Algorithm guidance](https://sandbox.vnpayment.vn/apis/docs/chuyen-doi-thuat-toan/changeTypeHash.html)
specifies 2.1.0/HMACSHA512 and encoded, sorted PAY parameters. The
[query/refund protocol](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html)
uses POST JSON and operation-specific ordered pipe-delimited checksum inputs.
Query response 00 describes successful query processing; TransactionStatus is
the financial outcome. Full/partial refund support does not imply instant refund
completion or approval to automate it.

[Error codes](https://sandbox.vnpayment.vn/apis/docs/bang-ma-loi/) and the
[technical specification](https://sandbox.vnpayment.vn/apis/files/VNPAY%20Payment%20Gateway_Techspec%202.1.0-VN.pdf)
must be read alongside preflight §2's conflicts: PDF currency coverage differs
from the PAY page; examples differ in success tests and encoding; special statuses
and query checksum/type notation need confirmation. This contract selects VND and
a conservative verification policy without claiming those conflicts are resolved.

## 3. Financial state is separate from fulfillment

| Payment state/evidence | Meaning and allowed effect |
|---|---|
| INITIATED | Persisted internal attempt; permanent freeze exists; no claim of provider receipt |
| PENDING | Submission bound/exposed and financial outcome unresolved; not proof of debit or guaranteed provider acceptance |
| SUCCESS | Authenticated, matched normal financial success; may coexist with an unfulfilled Booking requiring reconciliation |
| FAILED | Verified definitive negative result under a sandbox-confirmed mapping; not a timeout or missing response |
| CANCELLED | Verified definitive provider cancellation under that mapping; not local Booking cancellation or browser abandonment |
| Special/contradictory/uncertain evidence | Preserve evidence and reconciliation state; never invent UNKNOWN as a Payment enum or map all non-00 values to FAILED |

Booking independently remains PENDING, PAID, CANCELLED or EXPIRED. Only eligible
atomic completion changes it to PAID. Financial SUCCESS on an ineligible Booking
is still recorded truthfully, without entitlement. A later verified correction
from FAILED/CANCELLED to SUCCESS must preserve both observations and use the
reconciliation path; it never silently grants a sale after a replacement attempt.
Never downgrade previously verified SUCCESS because a stale failure arrives.

Normal mapping target: valid signature and matched binding/amount, response code
00 **and** transaction status 00, and payment transaction type where supplied.
This strict conjunction is Smart Cinema's acceptance rule, not adoption of the
inconsistent OR/one-field samples. Confirm it against real sandbox vectors.

| Observation | Handling |
|---|---|
| Verified query 00 + normal payment status 00 | Eligible SUCCESS path; query signature and all returned identity fields must match |
| Incomplete status 01 | PENDING; no sale or replacement attempt |
| Documented cancellation response 24 / error status 02 | Candidate CANCELLED/FAILED mappings only after confirmation of definitive combinations; retain unresolved state until then |
| PAY timeout code 11 | Do not equate a local timeout with this code; provider terminality still needs confirmed mapping |
| Reversal 04, fraud 07, refund-related 05/06/09, other special/unknown codes | Reconciliation; no automatic sale or fresh attempt |
| Query 91, transport error, signature failure, API processing error | No trusted terminal result; retry/query/escalate under operational policy |
| Refund accepted or operator reports refund requested | Audit only; never fabricate REFUNDED or assume reimbursement complete |

No verified terminal mapping means no terminal transition or new attempt on that
code. A disabled mapping is a safe pending condition, not a fabricated result.

## 4. Immutable identities and one-time binding

Retain `payment_transactions.id`, `booking_id`, `internal_reference`, `amount`,
`initiated_at` and the original `bookings.payment_started_at`. Existing V9
`P-` plus UUID-hex reference is not sent verbatim as an alphanumeric-only TxnRef.
Define merchant TxnRef as `P` plus that unchanged 32-hex suffix; persist and enforce
its uniqueness in the merchant/environment namespace. Reject an unexpected legacy
reference shape rather than guessing a mapping. All DTO identifiers are strings.

Each attempt has exactly one submission binding: provider VNPAY, environment
SANDBOX, configured merchant TmnCode, currency VND, TxnRef, exact wire amount,
provider CreateDate, provider ExpireDate, fixed ReturnURL and the non-secret inputs
needed to recover the same redirect. Merchant configuration changes cannot rebind
an old attempt. Query uses the original provider CreateDate, which can differ
from V9's earlier initiated_at. Persist UTC instants and format provider values
in Asia/Ho_Chi_Minh with second precision.

VNPAY TransactionNo is a distinct external reference, assigned from trusted
matched evidence, never a replacement for TxnRef. Placeholder/absent references
on failures must not become a shared unique real transaction ID. A different
non-placeholder reference later claiming the same attempt is an anomaly requiring
preserved evidence, not an overwrite. Scope external uniqueness by provider,
environment and merchant. Keep internal idempotency separate from provider behavior.

Only an eligible owned V9 INITIATED attempt may be bound once. Lock and revalidate
eligibility and amount before persisting binding; commit before exposing redirect.
Invalid conversion or configuration leaves the attempt unbound and frozen.
Never blanket-bind historical attempts. New protected customer actions still
require an ACTIVE Customer; verified result handling uses a separate system path.

## 5. Amount and deadline boundary

Checkout currency is VND. Domain persistence stays exact numeric(19,4), including
zero/fractional historical values. Provider submission requires amount > 0 and
no fractional VND. Use exact decimal arithmetic: wireAmount = frozenAmount × 100;
require an integer digit string of permitted length and confirmed merchant limits.
Never use binary floating point, round, truncate, surcharge or change snapshots.

| Frozen amount | Provider boundary |
|---|---|
| 10000.0000 | Submit 1000000 if other eligibility/limits pass |
| 10000.5000 | Reject fractional VND by approved Smart Cinema policy |
| 10000.1234 | Reject; fractional and not exactly encodable by the documented factor |
| 0.0000 | Reject submission; no synthetic SUCCESS/free Ticket |
| Encoded value longer than 12 digits or beyond confirmed merchant limits | Reject without changing domain amount |

An unpayable frozen Booking may be cancelled and recreated through existing
flows; never reopen its composition. Free-order fulfillment is deferred. Matching
IPN/query Amount must equal the persisted wire integer exactly. Currency is pinned
in the submission because the documented callback does not supply a currency field.

Provider expiry must be no later than the earliest Booking/origin Hold/Showtime
cutoff/start deadline, rounded down to provider second precision. Require positive
remaining duration and any confirmed provider minimum window. No redirect retry,
query or Payment attempt extends these deadlines. Re-evaluate current database
wall-clock time after acquiring locks; provider PayDate is evidence, not authority
to backdate entitlement after local expiry.

## 6. API and adapter boundaries for the next implementation

These are designed resources, not currently available endpoints. Resource naming
follows repository conventions; provider GET callbacks are protocol exceptions to
normal mutation verbs and must never be generic customer mutation endpoints.

| Resource | Access and contract |
|---|---|
| Existing POST `/api/v1/bookings/{bookingId}/payment-transactions` | Preserve `{}` and 200/no-store contract. First attempt/freeze remains atomic. Future recovery returns current unresolved attempt; new attempt only after confirmed FAILED/CANCELLED and original Booking eligibility. No automatic provider submission from this existing resource. |
| POST `/api/v1/bookings/{bookingId}/payment-transactions/{paymentId}/vnpay-submission` | Owning ACTIVE CUSTOMER; exact `{}`; creates/binds or recovers that single eligible submission, 200/no-store. Returns string paymentId/bookingId, status, provider, environment, currency, exact decimal amount, expiresAt and sandbox redirectUrl. Never exposes secret or accepts client amount/currency/provider/reference/time/result. |
| GET `/api/v1/bookings/{bookingId}/payment-transactions/{paymentId}` | Owning authorized Customer; read stored result/Booking status with no-store. Return reviewed financial state separately from bookingStatus and a reconciliationRequired boolean; no IPN payload, secrets or other customer's data. Reading does not query or create a Payment. Existing blocked-account read policy remains unchanged. |
| GET `/api/v1/payments/vnpay/return` | Public provider redirect; no financial/Booking mutation. Validate safely, navigate to fixed configured frontend result location showing backend read state; no customer-controlled redirect target or trusted client SUCCESS. Do not expose Booking data without ownership authentication. |
| GET `/api/v1/payments/vnpay/ipn` | Public transport endpoint authenticated by provider signature and binding, not Customer JWT. Fixed provider JSON acknowledgement contract in §7. No browser/session authorization shortcut. |

Provider adapter responsibilities: sandbox-only URL construction, canonical
signing/verification, typed IPN parsing, signed query request/response validation
and normalization into trusted observations. Application responsibilities:
ownership, orchestration, safe API errors and verified system-writer invocation.
PostgreSQL responsibilities: ordered serialization, stage/identity/amount guards,
complete aggregate assertions and idempotent audit/reconciliation persistence.

No public endpoint accepts a normalized SUCCESS object or arbitrary provider URL.
Query recovery is a bounded internal worker/operator operation, not an unowned
Customer query proxy. No refund endpoint or admin UI is introduced by this contract.
Owned Booking detail may add paidAt, one bookingQr and Tickets only after committed
PAID; unpaid detail has neither issued Tickets nor QR. Ticket statuses remain
independent; no check-in mutation is included.

Customer errors follow existing ProblemDetail: 400 malformed/unknown input,
401 missing/invalid credentials, 403 inactive/wrong role, 404 unknown/foreign
Booking/attempt, 409 ineligible/expired/terminal state or unsupported provider
amount, 503 unavailable/misconfigured sandbox adapter. Use safe stable titles,
never provider secrets/raw payloads. Infrastructure query errors do not become
financial FAILED. All IDs and exact monetary DTO values remain JSON strings.

## 7. IPN validation and acknowledgement

1. Enforce bounded input, single values, allowed protocol syntax and required
   fields. Validate HMACSHA512 with the pinned 2.1.0 encoding vectors, excluding
   signature fields. Constant-time comparison; no permissive fallback algorithm.
2. Match the immutable sandbox merchant/attempt binding and exact encoded amount.
   Verify allowed result mapping and stable external reference. An authentic
   message referencing another merchant/amount is not authority over this Booking.
3. Process trusted evidence through the protected gate. Consistent duplicate
   returns existing durable result. Contradictory evidence is appended and linked
   to a reconciliation case; never silently discarded as already processed.
4. Send acknowledgement only after durable result/evidence commit. On DB failure,
   acknowledge retryable error so provider retry/internal recovery can continue.

| RspCode | Smart Cinema condition |
|---|---|
| 00 | Durable acceptance of new verified result/evidence, including an unfulfillable financial success with reconciliation; does not mean Booking PAID |
| 02 | Consistent previously committed result/evidence; no new side effects |
| 01 | Unknown/unbound transaction reference; no manufactured attempt |
| 04 | Amount mismatch; no sale, retain bounded security/reconciliation evidence as appropriate |
| 97 | Invalid authentication/checksum or binding authenticity failure; no trusted transition |
| 99 | Invalid/unprocessable input or transient persistence failure; no claimed successful acceptance |

Return JSON RspCode/Message using VNPAY's protocol rather than ProblemDetail.
Merchant-binding error mapping and acknowledgements for accepted special evidence
must be exercised in sandbox before activation. Provider acknowledgement is receipt
of durable processing, not fulfillment approval. Missing retries cannot lose a
case: internal query reconciliation remains necessary.

## 8. Query, duplicate handling and retries

Build query from persisted merchant, TxnRef and original CreateDate; use a new
unique request identity for each actual query operation, distinct from Payment
attempt identity. Verify operation-specific response checksum and identity/amount/
type before accepting TransactionStatus. Successful HTTP or query ResponseCode
alone cannot finalize. No provider network operation holds database row locks.

On unknown network outcome, recover the original unresolved attempt. Reconstruct
only the same still-eligible redirect binding; do not regenerate its reference,
CreateDate or deadline. Same-URL replay's provider guarantees remain unverified:
the system must not claim exactly-once external debit, and anomalous second debits
require reconciliation. Do not automatically reopen payment URLs while uncertain;
customer recovery must show pending and query before offering further action.

New attempt/reference is permitted only when all previous attempts are definitively
negative, no unresolved or contradictory-success case exists, the Customer is
eligible for a new protected action and the original Booking remains eligible.
Preserve original freeze/amount/snapshots and deadlines. A blocked customer cannot
start a new retry, although an already legitimate payment can still finalize.

Local Booking cancel/expiry releases only original Holds and cannot cancel the
provider transaction by implication. Continue financial reconciliation after expiry.
Late SUCCESS, a correction after terminal failure or a distinct second SUCCESS
must not resell or issue additional entitlement. Preserve each observation and
existing financial truth; one fulfilled Booking is distinct from one financial event.

## 9. Fulfillment eligibility and the atomic commit

Use the addendum's existing resource gate; a result writer must not reuse the
pre-freeze-only `booking_composition_eligible` helper or ACTIVE-customer check as
its settlement authorization. Establish the attempt's legitimate origin and
preserve ownership. Later BLOCKED status alone is irrelevant to result acceptance.

After locks, revalidate PENDING Booking, original deadline/cutoff/start, current
Cinema/Hall/Movie/Showtime eligibility, physical Seat status and pair sellability,
the complete exact ACTIVE owner/Booking/Showtime-matching origin Hold set, and no
sold pair. Never replace missing/expired/released Holds. Verify frozen line sums,
discount and attempt amount without reading current prices to reprice them.

For Promotion, retain accepted code/type/value/minimum/cap/discount even if master
changes, deactivates or expires. Under the Promotion row lock, count PAID Bookings
using a fresh statement and enforce the current usage limit. Initiation did not
reserve usage. Two discounted payments can succeed financially with one remaining
use: only one sale wins; the other becomes a durable unfulfillable-success case.
Never remove Promotion, charge more or decrease the accepted discount to force sale.

For eligible normal SUCCESS, one transaction commits:

1. Trusted Payment result, matched external reference and safe evidence.
2. PAID and one accepted paid_at instant, with every line sold_at equal to it.
3. Consumption of every exact original Hold; no partial COUPLE/unit consumption.
4. Promotion usage represented by this PAID Booking, under the same lock.
5. One unique Ticket per booking_seat, initially VALID; COUPLE is one Ticket for
   two guests. Preserve existing dictionary's independent Ticket lifecycle.
6. Exactly one immutable, unique opaque Booking QR identity and required audit.

Deferred constraints reject any partial aggregate. Ticket/QR collision causes
rollback and bounded regeneration retry, with fresh eligibility checks. No separate
asynchronous issuance gap. Consistent replay returns the same Ticket/QR identities.
QR token possession alone does not authorize access or check-in; no per-Ticket QR.
Notifications run after commit and failure cannot roll back a valid sale.

If ineligible, durably store authenticated financial SUCCESS and reconciliation
evidence without PAID/sold/CONSUMED/Ticket/QR. Expire/release an elapsed PENDING
Booking through the original aggregate rules. No backdating, Seat reclamation,
fake failure or fake refund. After unexpected transactional failure, leave the
event unacknowledged and safely replay; do not commit partial sale as recovery.

## 10. Reconciliation, audit and security

Persist a durable case identity tied to the attempt/Booking and safe evidence for
late, unfulfillable, contradictory, duplicate-debit and special outcomes. A case
is operational state, not a new Payment/Booking lifecycle. Its minimum record is
reason, first/last observation, unresolved/resolved marker, evidence references,
responsible authorized operator when assigned, resolution time and attributed
resolution note/reference. Deduplicate the same observation/case reason, while
retaining contradictory evidence rather than overwriting it. Physical storage can
use typed Payment metadata plus append-only audit_records; do not require an
unrelated case-management subsystem or automatic refund ledger.

Audit records include system actor/authorized operator, attempt/Booking identity,
merchant/environment, source IPN/query, observation time, verification outcome,
normalized result codes, expected/received safe amounts, evidence digest and state
transition or withheld-fulfillment reason. Distinguish provider time from received
time and accepted sale time. Resolution must not erase evidence or mark money
refunded without supported evidence. Admin/operator handles sandbox reconciliation
through supported merchant tooling; automatic refund remains outside MVP.

Use least-privilege result writer and system attribution, no Customer-supplied
trusted flag. Runtime role has no broad DML/TRUNCATE; protected helpers are not
publicly executable. Separate Customer command and trusted result entry points.
Use safe search_path, schema-qualified SQL, no secrets in migration/source/tests,
no HashSecret/signature/QR/complete redirect URL in logs, no full raw banking payload.
Redact sensitive query parameters in reverse-proxy/access logs too. Pin configured
outbound sandbox hosts and fixed return URLs; never fetch callback-supplied URLs.

## 11. Forward migration and historical compatibility

V1–V9 remain byte-for-byte unchanged. Next available migration is expected V10,
subject to checking repository head at implementation; no file is created here.

- Add typed immutable submission binding (including merchant/environment/wire
  amount/TxnRef/provider dates), provider evidence/reconciliation storage and
  scoped unique references. Preserve unbound historical V9 rows unchanged.
- Replace V9's exactly-one-total-attempt assertion with immutable first-attempt
  freeze plus historical attempts; retain at most one INITIATED/PENDING attempt.
  Every retry amount matches frozen Booking; no unfreeze or first-time rewrite.
- Evolve insert-only Payment guards to narrowly authorized one-time binding and
  verified result transitions; expose no arbitrary result-write privilege.
- Replace pre-sale checks only together with paid aggregate/hold/sold/Ticket/QR
  assertions, ticket/audit persistence and protected result routines. Retain the
  existing partial sold-pair unique index as a backstop.
- Permit SUCCESS with unfulfilled reconciliation; require PAID to have matching
  successful evidence and the whole issued aggregate. Do not require the converse
  and do not prohibit multiple genuine SUCCESS observations for one Booking.
- Preserve Booking/Concession/Promotion freeze guards, ownership/composite keys,
  historical line snapshots and original Hold identity/deadline constraints.
- Add explicit system settlement eligibility independent of later Customer BLOCKED
  status, without weakening active-account checks on new Customer actions.

## 12. Sandbox inputs and operational configuration

Deployment needs sandbox TmnCode/HashSecret via secret configuration, a fixed
sandbox merchant/environment namespace, registered public HTTPS IPN and ReturnURL,
fixed frontend result URL, provider host allowlist, supported order category,
tested checksum vectors, trusted proxy/client-IP configuration and a reconciliation
operator/runbook. No real credentials or actual merchant calls in this task.

Configuration-only starting candidates: 3-second connect timeout, 10-second response
timeout, query no more frequently than every five minutes per attempt, 24-hour
automated recovery horizon then persistent operator escalation. These remain
tunable and conditional on confirmed provider throttling; they are not approved
business invariants or proof that VNPAY accepts that cadence. Bound retry/backoff,
worker concurrency and database timeouts separately. Reaching a polling horizon
does not set FAILED, delete evidence or end the obligation to reconcile.

Keep sandbox execution disabled until configured and tested; reject production
hosts/credentials rather than silently switching environments. A local signed URL
is not a successful gateway submission. No authorization/capture-based reservation
may be used to solve the Promotion usage race without a separate supported contract.

## 13. Provider confirmation gates

| Unverified item | Required evidence / safe behavior until confirmed |
|---|---|
| PAY and query encoding/signatures | Official merchant/sandbox vectors including spaces, plus/percent, empty optional promotion fields and response ordering; fail closed on unverified verification behavior |
| Definitive SUCCESS/FAILED/CANCELLED combinations | Tested matched code/type/status vectors; unconfirmed negative/special mappings remain unresolved, no replacement attempt |
| Duplicate/reopened URL | Merchant/sandbox evidence of reference reuse, concurrent opening and possible duplicate debit; no exactly-once claim or blind replacement |
| Query throttling and eventual visibility | Confirm rate-limit scope, query 91 timing and retry guidance; bounded scheduler, no failure inferred from absence |
| Special/reversal/refund statuses | Confirm evidence and correction semantics; preserve reconciliation, no automatic fulfillment/refund |
| Amount limits and payment window | Confirm merchant/bank min/max and minimum expiry window; reject outside confirmed adapter bounds |
| Fractional/zero acceptance | Not needed to permit them: approved policy already rejects both. Confirmation only needed if a future contract expands acceptance |
| IPN acknowledgement interoperability | Verify duplicate, mismatch, transient DB failure and durable unfulfillable-success acknowledgements in sandbox |

These are provider-validation items, not remaining business-policy approvals. They
can be addressed during implementation/testing; enabling the affected behavior
requires confirmation. Fabricated local fixtures are useful negative/unit tests,
but cannot be reported as actual sandbox confirmation.

## 14. Verification and completion gate

| Verification group | Required evidence in next implementation report |
|---|---|
| Migrations | Fresh schema and populated V9 upgrade, V1–V9 checksums unchanged, unbound historical attempts retained, Hibernate compatibility where applicable |
| Amount/binding | Whole/fractional/zero/overflow/limits, old eligible versus expired attempt, one binding under race, no reference/amount/freeze mutation |
| Security/API | Ownership, blocked new actions versus allowed later settlement, strict inputs, string IDs, ProblemDetail, sandbox host protection, runtime grants, no client result writer |
| Signatures/provider | Verified sandbox vectors, tampering, duplicate keys, wrong merchant/environment/ref/amount/type, ReturnURL cannot settle, IPN/query authority and acknowledgement |
| Recovery | Crash before/after binding exposure, lost return/IPN, query-not-found, network timeout, pending beyond Booking expiry, terminal retry and special-state refusal |
| Atomicity | No partial PAID/sold/CONSUMED/Ticket/QR/audit at commit; collision rollback; no Ticket/QR for unpaid/unfulfillable Booking |
| PostgreSQL races | Duplicate SUCCESS, different attempts, finalization versus cancel/expiry/Hold acquisition/Seat blocking, initiation versus composition edits, Promotion last-use across Showtimes |
| Frozen snapshots | Later Seat/Concession price and Promotion term/window/status changes never reprice; usage limit still enforced |
| Ticket/QR | Whole COUPLE gives one Ticket/two guests, one QR per PAID Booking, stable identities on replay, independent Ticket statuses |
| Operations | Late/contradictory/second financial success is durable, operator resolution audited, notification after commit and failure isolated |

Run Maven verify and real PostgreSQL integration/concurrency tests; separately
label real sandbox checks PASS/FAIL/DEFERRED with evidence. Historical 194-test V9
PASS proves none of these new behaviors. **Next task: implement this sandbox
contract and integrity addendum via forward migration, runtime adapter/system
writer and the above tests, resolving confirmation gates before enabling them.**
