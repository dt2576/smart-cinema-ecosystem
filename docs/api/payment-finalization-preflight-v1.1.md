# Payment finalization preflight v1.1

Date: 2026-09-30. Status: research complete; remaining decisions require approval.
This is an additive revision of [v1.0](payment-finalization-preflight-v1.0.md).
VNPAY Payment Gateway is user-approved. Other recommendations below are proposals,
not implemented behavior or newly approved business requirements.

## 1. Current boundary and source precedence

[Payment initiation v1.0](payment-initiation-contract-v1.0.md) and
[Booking v1.3](booking-contract-v1.3.md) remain implemented contracts. V9 persists
an internal INITIATED attempt with a permanent composition freeze, exact
numeric(19,4) amount and null provider/currency. No charge, result writer, sale,
Hold/Promotion consumption, Ticket or Booking QR exists. No code or migration is
changed by this revision. Prior preflight guard/lock findings remain applicable.

The user's exact-decimal decision overrides older rounding assumptions. Selecting
VNPAY does not authorize conversion of historical values or enable external charge.
Provider documents establish protocol capabilities; Smart Cinema must separately
approve pricing currency, operational policies and exception handling.

## 2. Official research evidence

Sources accessed live on 2026-09-30. The published PAY protocol is version 2.1.0;
access date is not a claim that the documents were revised that day.

### PAY flow and callbacks

Merchant constructs a signed GET redirect URL at
`https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`; sandbox registration supplies
TmnCode and a secret. Omitting BankCode leaves method selection to VNPAY.
CreateDate/ExpireDate use GMT+7. TxnRef is alphanumeric, 1–100 characters, unique
within the day; TransactionNo is a separate provider identifier. The current web
table specifies VND and integer digits for Amount, maximum 12 digits, scaled by
100. It does not settle acceptable fractional-VND or zero payments.

IPN is an HTTPS server GET; ReturnURL is for display, not updating transactions.
IPN acknowledgements 00/02 stop delivery; 01/04/97/99 or timeout trigger retries,
at five-minute intervals, at most ten calls. Samples disagree on testing one versus
both success fields. [Official PAY documentation](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html).

### Cryptographic contract

VNPAY's migration guide recommends 2.1.0/HMACSHA512. PAY signs sorted parameter
names with URL-encoded key/value pairs joined by ampersands. Verification excludes
signature fields; v2.1.0 does not send SecureHashType. New examples encode signing
values, unlike older examples. [Official algorithm migration guide](https://sandbox.vnpayment.vn/apis/docs/chuyen-doi-thuat-toan/changeTypeHash.html).

Implementation requirement derived from this evidence: pin one tested encoding
contract, constant-time verification, reject duplicate parameter keys and never
copy sample client-supplied amounts, random short references or incomplete checks.
Keep secrets outside source/logs. Validate merchant/environment, mapped attempt,
exact submitted amount and status after authenticity. Callback currency is not a
listed field: validate against persisted VND submission binding, not an invented
callback field. Test spaces, plus signs, percent encoding, missing/empty optional
fields and altered values against sandbox fixtures before enabling the adapter.

### Query and refund

POST JSON `querydr`/`refund` uses
`https://sandbox.vnpayment.vn/merchant_webapi/api/transaction`.
Query identifies the original TxnRef and CreateDate through TransactionDate;
RequestId is a separate 1–32-character alphanumeric value, unique daily.
Query response code 00 means the query succeeded, not that payment succeeded;
TransactionStatus carries the outcome. Request/response checksums use distinct,
ordered pipe-delimited fields, not PAY's sorted query-string format. The response
signature includes optional promotion fields; request Amount is not in the query
request table. Full and partial refunds are documented (types 02/03); their
acceptance is not proof of completed reimbursement. [Official query/refund documentation](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html).

### Errors, uncertainty and document conflicts

PAY response 24 denotes customer cancellation; 11 denotes payment timeout;
07 reports a debit with suspected fraud. Query 91 means not found and 94 denotes
a duplicate request within a five-minute API window. Refund restrictions include
no full refund after a partial refund. These are operation-specific codes, not
interchangeable internal lifecycle values. [Official error table](https://sandbox.vnpayment.vn/apis/docs/bang-ma-loi/).

The downloadable spec lists VND/USD, conflicting with the live PAY web table's
VND-only statement. Its status table includes 00 success, 01 incomplete, 02 error,
04 reversal, refund processing 05/06, fraud suspicion 07, refund refusal 09 and
additional 10/20 delivery/settlement states. It also describes merchant-portal
refunds when a paid order cannot be fulfilled. [Official specification, sections 2.3, 2.5.3 and 2.5.7](https://sandbox.vnpayment.vn/apis/files/VNPAY%20Payment%20Gateway_Techspec%202.1.0-VN.pdf).

Do not enable USD or interpret every non-00 status as terminal FAILED. The query
web table also contains suspicious type labels and a missing concatenation symbol
in its checksum expression. Obtain merchant-specific signed vectors for optional
fields, definitive negative outcomes and special statuses; public examples alone
are not a verified interoperability test.

### Capabilities not established

The reviewed PAY, query/refund and specification material does not establish a
merchant authorization/capture/void API, a funds reservation available to Smart
Cinema, an exactly-once charge guarantee for reopening a payment URL, or a generic
idempotency-key API. This is a bounded research finding, not a claim that VNPAY has
no other products. Do not import Token/installment capabilities into PAY, or infer
funds reservation from bank authorization terminology in a sequence diagram.

Merchant confirmation/testing remains required for fractional/zero acceptance,
effective amount limits, minimum payment window, duplicate URL behavior, query
throttling scope, terminality/correction rules and enabled refund permissions.
Approval of a Smart Cinema policy cannot substitute for these provider facts.

## 3. Remaining decision matrix

All rows are **PROPOSED / AWAITING APPROVAL**. Labels below are document-local
decision labels, not requirement IDs. Provider selection itself is resolved.

| Decision | Recommended minimal design | Alternative / consequence |
|---|---|---|
| Currency, fractional and zero totals | Declare checkout pricing and eligible existing V9 attempts VND. Preserve exact domain amount; submit only positive whole-VND totals initially, multiply exactly by 100 and check protocol plus merchant limits. This whole-VND restriction is a proposed conservative application policy, NOT an asserted provider restriction. Block other totals at the boundary without rounding, unfreezing or manufacturing SUCCESS. Customer can cancel/rebook; free-order fulfillment is deferred. | Permit exactly representable fractional totals only after explicit VNPAY confirmation. Four-decimal values whose product by 100 is nonintegral cannot fit the documented wire format without a new approved pricing policy. Zero fulfillment requires separate approved behavior. |
| Integration scope and existing attempts | Implement sandbox PAY hosted redirect, signed IPN and query reconciliation first; production charge remains disabled. Bind an eligible existing V9 attempt once to VNPAY/VND and a fixed merchant/environment namespace under locks before returning a URL. Preserve freeze time/amount; never blanket-bind expired rows. | Leave all existing attempts historical and require new Bookings; less recovery complexity but loses existing checkout continuity. |
| Attempt identity and retries | One persisted provider submission identity per internal attempt; alphanumeric TxnRef derived collision-free from the existing UUID reference, retaining the original P- reference unchanged. Persist original provider CreateDate, deadline, encoded amount and merchant binding. Return the same unexpired submission on recovery. New attempt/reference only after definitive verified failure/cancellation and while original Booking remains eligible. | MVP can prohibit replacement attempts entirely. Reopening/replaying the same URL is not a documented guarantee of no second debit; uncertain outcomes must query, not create a fresh charge. |
| Verification authority | Verified IPN is sufficient for immediate eligible finalization; verified query is recovery authority. Require response code 00 AND transaction status 00 for a normal payment success, with matching identity/amount/merchant. Browser return never settles. Contradictory, incomplete, refund or special states enter reconciliation without fulfillment. | Query every IPN before finalization adds latency and outage dependency, increasing the risk of crossing the original Seat deadline. |
| Pending, timeout and recovery | Use existing optional PENDING for submitted unresolved attempts; UNKNOWN is explanatory only. Provider deadline never exceeds the original Booking/Hold/cutoff deadline, rounded down to provider second precision. Local/network timeout or query-not-found does not prove FAILED. Start with configurable 3-second connect/10-second response timeouts, queries no more often than every 5 minutes per attempt, a 24-hour automated horizon then durable operator escalation. These are proposed operating defaults, not VNPAY guarantees. | Different cadence/horizon may be approved after merchant rate-limit confirmation. Booking expiry still releases Holds immediately; financial uncertainty persists until resolved, even after automated polling ends. |
| Fulfillment eligibility after freeze | Keep exact origin Holds, cutoff, current screening/Seat eligibility and unsold checks. Preserve accepted Promotion terms despite later Promotion deactivation/window/value changes; still enforce current usage limit under lock at SUCCESS. A subsequently blocked customer prevents automatic fulfillment and triggers financial reconciliation. | Revalidate current Promotion ACTIVE/window too, or permit settlement for blocked customers. Each changes who receives entitlement after money is received and needs explicit policy. No option may reprice frozen snapshots. |
| Paid but unfulfillable, refunds and ownership | Durably record authenticated financial success plus an unresolved reconciliation case/evidence, without PAID/sold/consumed/Tickets/QR. Designate an authorized Admin/operator to handle late/cancelled/expired, exhausted-Promotion, conflicting and duplicate-charge cases through the merchant portal; automatic refund API is deferred. Acknowledge IPN only after durable acceptance, even if fulfillment is withheld. | Implement automated refunds now as an explicitly expanded scope with refund persistence, permissions, retry/reconciliation and completed-refund verification. Refund API availability alone does not approve this business workflow. |

Proposed amount examples: 10000.0000 -> 1000000; 10000.5000 -> boundary
rejection under the proposed whole-VND policy, although exact scaled encoding is
mathematically possible; 10000.1234 -> not exactly encodable; 0 -> no provider
submission or free Ticket. None alters the frozen value or historical numeric type.

## 4. Proposed result and concurrency design

These are implementation obligations once the decision matrix is approved:

- Maintain separate internal attempt, merchant TxnRef and VNPAY TransactionNo.
  Keep all identifiers as strings externally. Qualify references by merchant and
  environment; an external number alone must not select a Booking.
- Persist binding before redirect exposure. Do not assume URL construction means
  VNPAY received a payment. Network queries/refunds run outside database locks.
- Authenticate IPN/query evidence before invoking a narrowly privileged system
  writer; never impersonate the Customer JWT. Redact secrets, bank details and
  sensitive URLs from ordinary logs; retain minimal verified audit evidence.
- Consistent duplicates return the existing result without reissuing entitlement.
  Never discard contradictory later evidence as an ordinary duplicate. Never
  downgrade committed SUCCESS because an older failure arrives.
- A verified normal terminal failure/cancel can release the unresolved-attempt
  slot only after the status mapping is tested. Fraud/reversal/unknown codes and
  API errors cannot authorize a replacement attempt merely because they are non-00.
- Use the actual existing ordered resource gate, including Movie SHARE and Holds
  before Promotion, and reconcile the older integrity document's different order
  in an additive design revision. Do not mix ordering between writers.
- Successful eligible finalization atomically records Payment SUCCESS, PAID/paid_at,
  every sold_at, exact origin Hold consumption, usage through the PAID Booking,
  one Ticket per whole Seat Unit, exactly one Booking QR and audit. COUPLE remains
  one Ticket for two guests. Notify after commit.
- Genuine payment without eligible fulfillment must remain durably recordable.
  No alternate Holds, backdated local eligibility, temporary sale markers or fake
  refunds. Do not impose a one-SUCCESS-per-Booking constraint that hides duplicate
  financial evidence; enforce one sale separately.
- V9 needs a forward migration for one-time binding, trusted result writes and
  retries. Its exactly-one-total-attempt assertion and INITIATED-only CHECK cannot
  simply be bypassed. Preserve first-attempt freeze and restricted runtime grants.

## 5. Readiness and next task

Research and matrix reconciliation: **COMPLETE**. Finalization implementation:
**NOT READY until the matrix policies are approved and necessary merchant protocol
ambiguities are resolved/tested**. Sandbox credentials, registered HTTPS IPN and
ReturnURL, merchant namespace and contract fixtures are deployment/test inputs,
not credentials to paste into this document.

Exact next task: approve the remaining matrix, publish the VNPAY sandbox
integration/finalization contract and obtain the required provider confirmations;
then implement VNPAY verification + atomic sale finalization with PostgreSQL and
sandbox coverage. No current application behavior changes during this preflight.

Carry forward v1.0's fresh/V9-upgrade, runtime-grant, atomicity, race, expiry,
Promotion usage, duplicate and issuance checks. Add signature vectors, amount
boundary/namespace tests, callback-before-return, lost IPN/query recovery,
contradictory evidence, ambiguous resubmission and refund-escalation tests.
Provider/sale tests are **DEFERRED**, not covered by the historical 194-test run.
