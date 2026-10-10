# Customer Payment return, status and recovery frontend

Date: 2026-10-10. Vietnamese Customer UI; existing V12 backend remains the financial authority. Read [VNPAY v1.0](../api/vnpay-sandbox-payment-contract-v1.0.md), [v1.1 implementation delta](../api/vnpay-sandbox-payment-contract-v1.1.md), [Payment initiation](../api/payment-initiation-contract-v1.0.md), [Booking v1.3](../api/booking-contract-v1.3.md) and [initiation frontend](customer-payment-initiation-frontend.md). Historical staging limitations are superseded only by the approved V10 delta.

## Return routing and configuration boundary

The provider ReturnURL is the existing backend GET `/api/v1/payments/vnpay/return`. `VnpayController.returned` checks the redirect signature through `VnpayService.validReturn`, then issues **303** to the fixed configured HTTPS `VNPAY_FRONTEND_RESULT_URL`. It forwards no callback fields or resource IDs. A missing/invalid target yields safe informational JSON. Neither a valid signature nor `verifiedRedirect` confirms financial success; return never invokes the result writer.

The new frontend landing route is **`/payments/vnpay/return`**. For an independently authorized future Sandbox deployment, the fixed frontend URL must be the HTTPS origin plus that path, and the backend ReturnURL must remain its registered HTTPS backend endpoint. No environment, secret, merchant setting or confirmation flag is changed here. There is no hard-coded deployment host, frontend IPN handler, callback forwarding or Customer reconciliation endpoint.

Unexpected browser query/hash values are discarded without parsing or interpretation, using a clean history replacement. They are not API input, financial evidence, navigation identity, analytics/error content or screenshot content. The landing page sends `no-referrer` and no-index metadata. Existing deployment guidance to suppress callback query/body logging at proxies/APM remains required; frontend code cannot configure upstream logs. Static `/bookings/preview/payment/*` stays isolated and unchanged.

## Actual APIs and fields

| Operation | Existing contract |
|---|---|
| Owned Booking read | GET `/api/v1/bookings/{bookingId}`; complete saved composition, `status`, exact totals, `paymentStartedAt`, original `expiresAt`, `serverTime` |
| Known Payment read | GET `/api/v1/bookings/{bookingId}/payment-transactions/{paymentId}`; `paymentId`, `bookingId`, `status`, `amount`, `bookingStatus`, `reconciliationRequired` |
| First attempt | Existing explicit POST `/api/v1/bookings/{bookingId}/payment-transactions`, exact `{}` |
| Hosted submission | Existing explicit POST the known attempt's `/vnpay-submission`, exact `{}` |
| Provider notification | Existing backend GET `/api/v1/payments/vnpay/ipn`; signature/binding verification and protected system writer, never called by Customer UI |

Owned reads require Bearer JWT and current ACTIVE CUSTOMER ownership; all use no-store, positive-bigint string IDs and exact decimal-string amounts. Known GET supplies no internal/provider reference, currency, attempt creation time or provider deadline: the UI does not invent them. Its QR/Ticket fields are deliberately dropped from the consumed projection. Only an already validated initiation receipt may display its internal reference; only an actual submission response may display its provider expiry. Neither is persisted as financial authority.

## Authoritative presentation

| Serialized state / consistency | Vietnamese presentation |
|---|---|
| INITIATED, agreeing reads | Thanh toán đang chờ hoàn tất |
| PENDING, agreeing reads | Thanh toán đang chờ xử lý |
| SUCCESS plus agreeing PAID, no reconciliation | Thanh toán thành công |
| FAILED, agreeing non-PAID | Thanh toán không thành công |
| CANCELLED, agreeing non-PAID | Thanh toán đã hủy |
| `reconciliationRequired=true` | Đang đối soát thanh toán; SUCCESS is described as verified financial success requiring Booking review, with no fulfillment promise |
| Reads in progress | Đang xác minh thanh toán |
| Missing/malformed/unavailable/mismatched reads | Chưa thể xác định kết quả thanh toán |

EXPIRED is a Booking state, **not** a Payment enum. Expired/cancelled Booking guidance is separate: local expiry/cancellation does not establish provider failure/cancellation. A SUCCESS/non-PAID projection without reconciliation is reviewed, never promoted to PAID. An older FAILED attempt read against a Booking later paid by another attempt is also reviewed, never attributed another attempt's success. No Ticket/QR or local financial mutation is introduced.

## Recovery and consistency

The existing per-Booking hint is retained. An additional per-tab `smart-cinema.payment-return` pointer records only Booking/Payment IDs and review intent when a known hint is saved. The fixed return has no identity; this pointer selects an owned GET, and must match the existing per-Booking hint. It grants no ownership/status authority and contains no token, amount, financial state, receipt, URL or callback. New tabs, denied storage after unload, corrupt/mismatched pointers and lost IDs fail safely. The server's permanent freeze blocks blind initiation even if all hints disappear. No latest/list/recovery-by-Booking API exists.

The landing inspects the identified saved attempt, whose Payment ID is displayed only after an owned read. The fixed redirect cannot prove correspondence between a particular callback and that tab's hint; callback values never resolve this gap. A mounted landing cannot switch attempts if the per-Booking hint is altered. Its selected identity stays fixed and inconsistent hints require review rather than reading a different attempt.

Return, direct Summary entry, reload, back/forward, login resume and visible tab focus/pageshow recover through owned GET only. The return screen offers a clean allowlisted login return and an owned Summary link. It has no initiate/replacement/open-provider action. Summary preserves its separate explicit backend-gated submission action and existing review marker. No automatic POST or provider reopen is scheduled.

Shared read/write serialization prevents stale concurrent reads from overwriting write recovery. Both reads must agree on Booking identity, status, frozen exact amount and freeze existence. Subsequent reads of an observed frozen Booking cannot change original origins/composition/expiry/freeze or regress its terminal state. Unfrozen Booking reads preserve existing server-authoritative lifecycle behavior. Within the mounted session, previously server-read SUCCESS cannot be downgraded by stale Payment results; these observations are not persisted as authority. Initial known GET lacks initiation time/deadline fields, so those cannot be independently compared with the first-attempt marker after receipt loss. Original frozen snapshots remain checked across subsequent reads; no timestamp/expiry is fabricated.

Stored status reads automatically run at most six visible, non-overlapping 30-second intervals per mount, stop for confirmed terminal results, and stop after 401/403/404/429 or a 30-second read timeout. Focus/visibility/pageshow events recheck reads unless blocked. An explicit recheck can retry a supported read; it does not retry a financial command. The expiry boundary performs one additional Booking read. Polling stops without declaring failure or extending the original deadline. These are UI read bounds, not VNPAY query throttling rules. Provider queries remain the backend's separately confirmed worker with existing delay/horizon/system credentials.

The backend can replace definitive FAILED/CANCELLED attempts under its frozen original-deadline and reconciliation safeguards. This UI preserves the existing choice not to expose a replacement initiation action on frozen Bookings; it neither creates an alternative retry rule nor uses POST to discover unknown identity. Concession/Promotion remain permanently non-editable after first freeze.

## Verification and external limitations

Run backend `mvn verify` on the existing dedicated local PostgreSQL regression database, and frontend `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`, full `PLAYWRIGHT_CHANNEL=msedge pnpm exec playwright test`. All 118 unit and 182 browser baseline cases remain. New HTTP fixtures explicitly simulate stored backend responses and fixed 303 routing; they do not assert real callbacks or provider certification. See the [dated report](../reports/2026-10-10_customer-payment-return-status-recovery-frontend_report.md) for final counts and artifacts.

Fresh read-only Neon at **2026-10-09T23:35:57.810598Z** (2026-10-10 local) has V12, 73 Showtimes, latest start 2026-10-09T16:17:00Z and **zero future open/cutoff-valid Showtimes**. Existing Payment/Ticket rows are zero. VNPAY merchant/secret/return configuration are absent and confirmation flags retain false defaults. No live data is created/changed to produce evidence. Actual VNPAY Sandbox return, actual signed callback, actual Payment SUCCESS and actual Booking PAID are **NOT RUN**. Backend isolated signed fixtures and browser fixtures remain separate evidence categories.

Next recommended task: **Real Customer Ticket/Booking QR and My Bookings integration, but only after independently verified backend PAID/issuance contracts are audited. Do not start automatically.**
