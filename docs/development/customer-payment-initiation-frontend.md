# Customer Payment initiation frontend

Date: 2026-10-07. Primary language: **Vietnamese**. Real owned Booking Summary integration against the existing V12 backend; no backend/schema/provider configuration change. Read [Payment initiation v1.0](../api/payment-initiation-contract-v1.0.md), additive [VNPAY v1.0](../api/vnpay-sandbox-payment-contract-v1.0.md)/[v1.1](../api/vnpay-sandbox-payment-contract-v1.1.md), and [Booking v1.3](../api/booking-contract-v1.3.md) with its earlier revisions. V10 retry/binding rules supersede the earlier V9 staging limitation; historical contracts remain unchanged.

## Commands and authority

`/bookings/{bookingId}/summary` continues to read owned Booking and display Seat origins, Concessions, Promotion, the five exact amount rows and original expiry. **Tiến hành thanh toán** explicitly requests the first internal attempt. **Mở VNPAY Sandbox** is a separate explicit action on a known, freshly confirmed unresolved attempt. No additional route/provider or preview processing adapter is needed.

| Action | Existing resource | Body |
|---|---|---|
| First initiation | POST `/api/v1/bookings/{bookingId}/payment-transactions` | Exact `{}` |
| Known attempt recovery | GET `/api/v1/bookings/{bookingId}/payment-transactions/{paymentId}` | None |
| Configured Sandbox submission | POST the known attempt's `/vnpay-submission` child | Exact `{}` |

All use Bearer JWT, no-store, decimal-string amounts and positive-bigint string IDs. No Customer ID, amount, discount, status, provider, idempotency key or expiry is submitted. Backend current account/role/ownership, deadline/cutoff, origin-Hold, parent-resource and Promotion checks remain decisive.

First initiation atomically freezes the complete accepted composition and original `paymentStartedAt`; it does not consume Holds, set Booking PAID, issue Tickets or create Booking QR. Initial provider/currency are null. The receipt contains server identity, internal reference, exact amount, initiation time and unchanged Booking expiry. A fresh complete Booking and known-attempt read must agree before the gateway action is enabled. Concurrent accepted composition wins as one aggregate; changed totals require explicit Customer review, without client recalculation or repricing.

The backend reuses eligible INITIATED/PENDING attempts. It can create a replacement after definitive FAILED/CANCELLED under its protected reconciliation policy, while preserving the original freeze/deadline. Therefore POST is **not a generic recovery lookup**. This frontend does not initiate replacements on frozen Booking or offer terminal retries; those belong to the separately reviewed post-initiation flow.

## Recovery and shared operation gate

Summary reads, Promotion mutations and Payment actions share one controller/ref gate. Rapid click/Enter/focus refresh cannot cause concurrent writes from one action or overwrite a receipt with a late Summary read. Every explicit Payment action freshly reads owned Booking; changed composition, expired/closed state and freeze block stale first-initiation intent. The backend revalidates within its transaction for races after that read.

The existing per-tab `sessionStorage` navigation-intent pattern saves only Booking ID, optional known Payment ID and a review marker. It stores no token, price, financial status, hosted URL or receipt. This is untrusted recovery intent, never ownership or Payment authority. GET validates both identities under JWT. Forged/unavailable IDs disable continuation. Storage denial permits in-memory intent only; after unload, owned Booking still protects a frozen unknown-identity state.

The review marker is saved before POST. Network loss, 30-second write timeout, 5xx, malformed success, abort or navigation can leave a committed attempt. Recovery reads owned Booking and, if its identity was received, the actual known-attempt GET. A malformed receipt with matching valid scalar Booking/Payment IDs contributes only an untrusted ID hint; agreeing owned reads must confirm state/amount and the Customer must explicitly review. Inconsistent receipt metadata is discarded when owned reads agree, rather than overriding server truth. Missing/invalid identity stays unrecoverable through GET. Timeout recovery uses a fresh read signal. No effect, reload, login or back/forward transition submits a Payment POST or automatically reopens the provider URL. Explicit acknowledgement clears the review marker only after successful owned reads; a subsequent action remains explicit and revalidates again.

There is **no latest/list/recovery-by-Booking endpoint**. If Booking is frozen and no safe Payment ID was received, Summary displays Vietnamese recovery guidance and blocks a new attempt. An owned Booking read cannot reveal an unreturned Payment ID. There is no guessed ID, blind POST or fabricated endpoint. Known recovery GET is projected to ID/status/amount/Booking status/reconciliation only; returned Ticket/QR fields are discarded and never rendered by this integration.

## Sandbox URL and deadlines

Only the server-generated URL is consumed, unchanged. The redirect guard pins HTTPS, `sandbox.vnpayment.vn`, and `/paymentv2/vpcpay.html`; it rejects wrong host/path/port, userinfo, lookalikes, whitespace/backslashes, fragments and non-HTTPS schemes. The frontend neither builds/signs a gateway URL nor possesses/verifies merchant secrets/signatures. Valid URL syntax is not provider acceptance or Payment success.

Submission requires a freshly confirmed matching frozen amount, unresolved known status, no reconciliation requirement and unexpired server-derived Booking time. Backend gates decide merchant confirmation, whole-positive VND amount, original window and reopened-URL policy. Zero/fractional internal amounts remain exact; provider rejection cannot round/reprice or unfreeze them. A returned provider expiry must be no later than the original Booking expiry and still current before navigation. It is labeled separately as the VNPAY deadline when available, never substituted for the Booking countdown or reconstructed after reload.

A lost/invalid submission response retains the known ID and review marker; GET can show PENDING without proving external acceptance. Even an explicit subsequent reopen goes through backend's existing confirmed-reopen/verified-query gates. No provider response, browser callback, query string or locally persisted status authorizes SUCCESS/PAID.

## Verification and boundaries

Use `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`, full installed-Edge Playwright and backend `mvn verify` against the existing dedicated local PostgreSQL regression database with all integration flags. Browser fixtures are isolated HTTP simulators, not production adapters or evidence of Neon persistence/provider acceptance. Existing Payment/VNPAY PostgreSQL tests independently prove transaction freeze, origins, retry/replacement, exact amounts, lock races and protected finalization boundaries. See the [dated report](../reports/2026-10-07_customer-payment-initiation-frontend_report.md) for final counts/evidence.

Fresh read-only Neon preflight found 73 Showtimes, latest start 2026-10-09T16:17:00Z, but **zero future open/cutoff-valid Showtimes** at database time 2026-10-06T22:06:08Z (2026-10-07 local). Live new Booking/initiation is **NOT RUN** for that data dependency. No master data/schedule/Promotion terms were changed. Actual production-browser proof reads existing owned CANCELLED Booking 1 after ordinary Customer login; its Payment action stays disabled across reload, desktop/mobile and keyboard checks. This proves reads/read-only gating, not initiation writes.

Merchant/secret are absent and all confirmation flags remain false. Live generated URL/provider acceptance/signed callback/SUCCESS/PAID/issuance are **NOT RUN**, with no enabling of gates, manufactured callback or external provider contact. Normal Auth activity is separate from business data. No return/result/finalization, history, Ticket/QR, check-in, Admin or deployment feature is added.

Exact next recommended task: **Audit and integrate the Customer post-initiation Payment return/status/recovery flow against the existing backend verification contract.** Keep backend verification authoritative and do not issue Tickets before independently verified SUCCESS. Recommendation only; stop here.
