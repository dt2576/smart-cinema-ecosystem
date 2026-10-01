# VNPAY Sandbox Payment contract v1.1 — implementation delta

Date: 2026-09-30. Status: implemented locally with V10; **external sandbox operations
disabled by default and real VNPAY interoperability NOT VERIFIED**.
Read the approved [v1.0](vnpay-sandbox-payment-contract-v1.0.md) first. This additive
revision describes actual runtime boundaries and deployment gates; it does not
change the approved pricing, freeze, account or fulfillment policies.

## 1. Implemented resources

| Resource | Actual behavior |
|---|---|
| POST `/api/v1/bookings/{bookingId}/payment-transactions` | Existing strict `{}` initiation; immutable first freeze; recovers INITIATED/PENDING; replacement only after definitive negative outcomes with no unresolved reconciliation/success |
| POST `/api/v1/bookings/{bookingId}/payment-transactions/{paymentId}/vnpay-submission` | Owning ACTIVE Customer, strict `{}`, no query parameters; 200/no-store with typed redirect response when configured/confirmed and eligible; 503 while gates are disabled |
| GET `/api/v1/bookings/{bookingId}/payment-transactions/{paymentId}` | Owned stored result, string IDs/exact amount, bookingStatus and reconciliationRequired; PAID returns one bookingQr and individual Tickets; unpaid returns null QR and empty Tickets |
| GET `/api/v1/payments/vnpay/return` | Validates redirect checksum only; never invokes result writer. 303 to fixed configured HTTPS frontend result URL; safe informational JSON fallback when no valid target is configured |
| GET `/api/v1/payments/vnpay/ipn` | Public transport, signature/merchant/reference/amount checks before system result command; VNPAY JSON RspCode/Message; disabled/transient failure returns 99, not SUCCESS |

Customer APIs retain ProblemDetail and ACTIVE/ownership rules. Invalid/foreign
resources cannot expose another Booking. Later BLOCKED status does not prevent
the separate system settlement path; it still blocks new Customer actions.
Neither ReturnURL nor a Customer request can submit a trusted financial result.
The existing Booking detail shape is preserved; paid QR/Ticket projection is on
the owned Payment result resource. Staff scanner/check-in mutation is not added.

Ticket projection: string id, bookingSeatId, seatId, ticketCode, status, seatType,
integer guestCount. One purchased COUPLE unit yields one Ticket with guestCount 2.
QR belongs only to Booking. DTO log representations redact signed URLs and QR.

## 2. Binding, recovery and amount

`bind_vnpay_submission` serializes through the established hierarchy before
one-time binding. V9 unbound history is not backfilled. Internal `P-<uuidhex>`
maps to distinct merchant `P<uuidhex>`; namespace includes VNPAY/SANDBOX/TmnCode.
Persist exact wire amount, original provider creation/deadline, ReturnURL, client
IP and order category. Recovery never changes those values or frozen snapshots.

The application validates positive whole-VND, exact multiplication by 100, 12-digit
wire format and configured confirmed limits/window. PostgreSQL independently
checks positive whole-VND and exact scaled equality. Rejection leaves the exact
numeric(19,4) domain value and permanent freeze unchanged. Zero/free-order and
fractional submission remain prohibited at this boundary only.

Reopening is separately gated by confirmed provider behavior and a recent verified
QUERY/PENDING observation (freshness uses configured query-delay). An uncertain
attempt is queried, not replaced. Conflicting success/reconciliation on another
attempt prevents further submission. Query claims do not extend entitlement.

## 3. Results, atomicity and audit

HMACSHA512 PAY and separate pipe-delimited query verification are implemented.
Duplicate keys are rejected; normal success requires response/status 00 with a
valid non-placeholder TransactionNo, exact stored amount and namespace. Query
also requires successful query processing and payment type. Fraud, reversal,
refund/special/unknown outcomes go to reconciliation, not generic FAILED.

Definitive FAILED/CANCELLED mappings are empty by default. Deployment supplies
only evidenced exact `SOURCE:responseCode:transactionStatus` pairs after enabling
the terminal-confirmed gate; e.g. a test fixture mapping is not a shipped provider
policy. Query-not-found/network errors remain unresolved.

The protected writer records digest-deduplicated evidence, financial state and
audit. Under the Showtime gate and Promotion lock it either commits the entire
PAID/sold/origin-CONSUMED/Ticket/one-QR aggregate or commits financial SUCCESS with
an unfulfillable reconciliation case. Frozen Promotion terms survive master changes;
current usage limit still serializes the sale through the count of PAID Bookings.
Late correction after failure, additional financial success or conflicting references
never authorize another automatic sale. Consistent duplicate result keeps identities.

Case reasons include fulfillment unavailable, Promotion exhausted, reference
conflict, terminal correction, contradictory/special result, additional financial
success and query horizon. Cases retain first/last observation and evidence;
new contradictory evidence reopens a previously resolved case. Authorized ACTIVE
Admin resolution uses `resolve_payment_reconciliation` under the system role,
records operator/time/note, and does not manufacture a refund or financial change.
There is no new admin HTTP CRUD surface or automatic refund integration.

No notification sender existed in this slice. None is called inside the sale
transaction. The approved after-commit/failure-isolation boundary remains mandatory
for later notification integration; no email delivery is claimed here.

## 4. Query worker and separate system authority

`VnpayRecovery` is disabled unless query and query-signature confirmations are
enabled. It claims up to 20 due attempts through a short protected transaction,
commits the next-query time, then performs network I/O without resource locks.
Concurrent workers skip already locked/claimed rows. Lost response or worker crash
does not imply failure. The next due claim recovers the same identity.

After the configured horizon, the attempt stays PENDING and a durable case/audit
is created for an operator. Unresolved financial state may outlive Booking expiry.
Automatic repeated polling stops for reconciled/special cases; operators retain
evidence and the obligation to resolve them through supported sandbox tooling.

Use a **separate least-privilege database login** for VNPAY result/query work, a
member of `smart_cinema_payment_system`, against the same database/schema as the
application. The system repository has no fallback to Customer datasource/identity.
It sets that role and invokes only protected commands. The normal runtime role
cannot execute result writing or directly mutate sale/evidence tables.
Privileged DBA provisioning of logins/secrets is deployment work; no credentials
are committed or provisioned by this task.

## 5. Configuration and confirmation register

All flags below default false. **No real VNPAY calls or merchant credentials were
used to assert them in this task.** Unit fixtures explicitly enabling them are
local tests, not sandbox evidence.

| Configuration | Evidence needed before enabling |
|---|---|
| `VNPAY_ENABLED` | Sandbox deployment only; never production credentials/URLs |
| `VNPAY_SIGNATURE_CONFIRMED` | PAY encoding/signature vectors from merchant/sandbox |
| `VNPAY_SUCCESS_CONFIRMED` | Matched normal success fields/reference/amount |
| `VNPAY_IPN_CONFIRMED` | Callback reachability and acknowledgement interoperability |
| `VNPAY_AMOUNT_WINDOW_CONFIRMED` | Confirmed merchant amount and expiry-window limits |
| `VNPAY_REOPENED_URL_CONFIRMED` | Duplicate/reopened URL behavior; no exactly-once claim from local tests |
| `VNPAY_QUERY_CONFIRMED` | Visibility/throttling and recovery semantics |
| `VNPAY_QUERY_SIGNATURE_CONFIRMED` | Query response canonical vectors including optional fields |
| `VNPAY_TERMINAL_CONFIRMED` | Exact definitive negative mappings in `VNPAY_FAILED_PAIRS` / `VNPAY_CANCELLED_PAIRS` |

Required inputs: VNPAY_MERCHANT_CODE, VNPAY_HASH_SECRET, VNPAY_RETURN_URL,
VNPAY_FRONTEND_RESULT_URL, VNPAY_ORDER_TYPE, VNPAY_MINIMUM_AMOUNT,
VNPAY_MAXIMUM_AMOUNT, VNPAY_MINIMUM_WINDOW_SECONDS, VNPAY_SYSTEM_DB_URL,
VNPAY_SYSTEM_DB_USERNAME and VNPAY_SYSTEM_DB_PASSWORD where authentication requires
it. Use secret configuration and a schema-qualified JDBC search path; do not paste
credentials into reports. Register HTTPS IPN/ReturnURL with the sandbox merchant.
Outbound endpoints are fixed to the official sandbox hosts; no production gateway
switch or Customer-supplied endpoint exists.

Operational defaults: query delay PT5M, automated horizon PT24H, connect PT3S,
response PT10S; tune via VNPAY_QUERY_DELAY, VNPAY_QUERY_HORIZON,
VNPAY_CONNECT_TIMEOUT, VNPAY_RESPONSE_TIMEOUT only within confirmed behavior.
`VNPAY_QUERY_IP` must reflect the deployment's approved server IP. Customer IP uses
the servlet remote address; configure trusted proxies explicitly, never trust
arbitrary forwarded headers. Polling values are not Booking deadline extensions.

Disable request/response body and query-string logging at reverse proxies/APM for
these routes. Application DTOs redact sensitive representations; no secret or raw
bank payload is stored in audit. Do not enable HTTP wire logging to debug signatures.

## 6. Evidence and next task

See [implementation report](../reports/2026-09-30_vnpay-sandbox-payment-backend_report.md)
and [V10 integrity implementation](../db/integrity-enforcement-design-v1.2.md).
Local PostgreSQL/protocol tests and real sandbox confirmation are separate result
categories. The next task is **VNPAY Sandbox merchant provisioning and real
interoperability confirmation**, with signed vectors, callbacks, query/terminal
mapping, duplicate URL and limits evidence before enabling affected gates.
Production money, automatic refunds, full frontend checkout integration, booking
history list and Staff check-in remain outside this completed local backend slice.
