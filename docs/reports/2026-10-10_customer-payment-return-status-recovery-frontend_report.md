# Customer Payment return / status / recovery implementation report

## 1. Task Information

Task: Real Customer Payment Return / Status / Recovery Integration. Date: 2026-10-10, Asia/Ho_Chi_Minh. Module: Customer frontend Payment and owned Booking Summary. Type: implementation. Status: **COMPLETE — implementation and full regression PASS; actual Sandbox interoperability NOT RUN**. Entry repository: 649 tracked files, no untracked changes, empty index; all incoming work is preserved. No reset, staging, commit or deployment.

## 2. Requested Work

Implement the existing backend-authoritative post-initiation result/recovery flow. Vietnamese dark/amber UI, exact string IDs/amounts, permanent first-attempt composition freeze, original deadlines, safe known-attempt GET recovery and strict provider navigation remain. Backend financial verification/finalization remains unchanged. No frontend SUCCESS/PAID mutation, IPN handler, Ticket/QR/history integration, new provider, V13, merchant activation or data repair.

## 3. Documents Reviewed

- Root/frontend AGENTS and CLAUDE instructions; Development and Frontend workflows; Coding, UI/UX, Document, Traceability and Convention rules; canonical project conventions and report template.
- BRD v1.2 §4.8, SRS v1.2 §3.9 and applicable Booking/security/time/UX requirements; Business Analysis v2.1 Payment boundary and project scope Sandbox-only exclusions.
- System Analysis & Design v1.1 (existing legacy-named DOCX): §5.2.2 Customer catalogue, §§5.3.6/5.3.7 and §5.5.5 Payment rules.
- Booking contracts v1.0–v1.3; Payment initiation v1.0; VNPAY Sandbox v1.0/v1.1; current handoff, initiation guide, screen map and frontend plan.
- Actual Booking/Payment/VNPAY controllers, services, repositories, DTOs/settings/protocol/query worker and V12 configuration; PaymentPostgresTests, VnpayPostgresTests and VnpayProtocolTests.
- Existing real Summary, shared hook, typed Payment client, per-tab hints, initiation panel and separate preview Payment routes/services. Installed Next 16.3.5 page, useRouter and Server/Client component documentation.

Pre-implementation trace/convention/scope review selected an existing shared Customer layout, kebab-case feature files, framework page/layout names, PascalCase components and `@/` imports. The fixed frontend landing route is authorized by this implementation request and the existing configurable backend redirect. No mandatory backend API change is required for stored-state reads. Missing merchant/configuration/live eligible data are explicit external limitations, not permission to invent a query or lookup API.

## 4. Requirements Traceability

| Requirement / source | Applied behavior | Result |
|---|---|---|
| BRD v1.2 BR-035; SRS v1.2 FR-PAYMENT-002/012 | Exact server amount, identity/amount consistency; no repricing | PASS |
| BRD BR-038/039; SRS FR-PAYMENT-004/006/007/013 | Return cannot confirm success; only agreeing backend results establish successful UI | PASS for frontend; backend authority preserved |
| BRD BR-040; SRS FR-PAYMENT-008/009 | Distinct verified FAILED/CANCELLED; no premature Tickets/QR/PAID | PASS |
| BRD BR-041/042; SRS FR-PAYMENT-010/011/014/015 | Duplicate return/read recovery, known server identity, late success reconciliation, no secrets | PASS; financial idempotency remains backend |
| SRS FR-BOOKING-005/006/007/012/018; Booking v1.3 and VNPAY v1.1 | Original expiry, frozen snapshots/amount/marker, independent Booking state | PASS |
| SRS NFR-SEC-011, NFR-REL-006, NFR-UX-005 | Safe Vietnamese errors; existing server-clock/UTC and exact Summary totals | PASS |
| System Analysis v1.1 UC-CUS-018/019, UC-SYS-006; BRULE-PAY-001–006 | Customer returns/views stored result; backend verifies; no client financial authority | PASS within this slice |
| BRD BR-037; SRS FR-PAYMENT-003/005 | Sandbox return/notification interoperability | PARTIAL: client routing implemented; actual merchant interaction NOT RUN |
| Ticket/history/check-in/admin/reporting requirements | Explicitly excluded frontend work | NOT APPLICABLE |

## 5. Implementation Summary

### Actual endpoint and return audit

| Endpoint | Actual access/request/response and authority |
|---|---|
| POST `/api/v1/bookings/{bookingId}/payment-transactions` | Owning ACTIVE CUSTOMER JWT; exact `{}`, no query; 200/no-store `id`, `bookingId`, `internalReference`, `status`, exact `amount`, nullable provider/currency, `initiatedAt`, original `expiresAt`. Reuses INITIATED/PENDING; protected definitive-negative replacement policy remains backend. Never used as unknown-ID lookup. |
| GET `/api/v1/bookings/{bookingId}` | Owning ACTIVE CUSTOMER JWT; no body/query, no-store; authoritative complete Booking, saved amounts/composition, `paymentStartedAt`, original expiry and server time. Read-time expired projection does not mutate persistence. |
| GET `/api/v1/bookings/{bookingId}/payment-transactions/{paymentId}` | Owning ACTIVE CUSTOMER JWT; no body/query, no-store. `paymentId`, `bookingId`, `status`, `amount`, `bookingStatus`, `reconciliationRequired`; QR/Tickets returned only for paid aggregate are dropped by this frontend projection. No reference/currency/provider deadline/attempt time in GET; none invented. |
| POST known attempt `/vnpay-submission` | Owning ACTIVE CUSTOMER JWT; exact `{}`, no query; backend-only VNPAY/SANDBOX/VND binding and signed hosted URL with exact amount/provider expiry. Existing frontend allowlist pins HTTPS sandbox.vnpayment.vn/paymentv2/vpcpay.html. Same-URL reopen is backend-gated by confirmation and recent verified QUERY/PENDING. |
| GET `/api/v1/payments/vnpay/return` | Public browser callback; backend checks checksum/merchant, never invokes result writer. Fixed configured HTTPS frontend URL receives 303 with no forwarded query/IDs. Without a valid target, informational JSON only; `verifiedRedirect` is not settlement evidence. |
| GET `/api/v1/payments/vnpay/ipn` | Backend signature/merchant/reference/exact amount verification and protected system writer; VNPAY acknowledgement. Never invoked by frontend. |

The new **`/payments/vnpay/return`** consumes the existing fixed-redirect contract. No callback parameters are parsed/forwarded, logged or rendered. Unexpected browser query/hash is removed; metadata uses no-referrer/no-index. Future authorized deployment must configure the HTTPS backend ReturnURL and fixed HTTPS frontend result URL. Existing environment is unchanged and that external path is not claimed exercised here.

### Authoritative status mapping

INITIATED → “Thanh toán đang chờ hoàn tất”; PENDING → “Thanh toán đang chờ xử lý”; agreeing SUCCESS/PAID without reconciliation → “Thanh toán thành công”; FAILED → “Thanh toán không thành công”; CANCELLED → “Thanh toán đã hủy”. Busy reads → “Đang xác minh thanh toán”. Reconciliation flag → “Đang đối soát thanh toán”; financial SUCCESS is explicitly described without promising Booking fulfillment. Unknown/unavailable/malformed/mismatched projections → “Chưa thể xác định kết quả thanh toán”. EXPIRED/CANCELLED Booking guidance remains separate; Payment has no invented EXPIRED/UNKNOWN/VERIFIED enum.

### Reconciliation, recovery and lifecycle

Known attempts use authenticated owned reads only. A per-tab return pointer must match the existing per-Booking hint and selects an untrusted resource identity; it contains no price/status/token/URL/callback. Reload, direct entry, login resume, back/forward, tab focus and explicit recheck never initiate or submit. Missing identity on a frozen Booking stays blocked; no latest/list endpoint exists. Different tabs can safely have different/missing hints. No financial result is restored from storage.

The fixed redirect does not prove association between its callback and the tab-selected attempt; the landing displays the owned saved attempt's ID and ignores callback identity. A mounted landing cannot silently switch attempts when its hint is altered.

Shared serialization and ID/amount/Booking-state/freeze checks gate truthful output. Later reads of an observed frozen Booking cannot change composition/original expiry/first marker or regress its terminal state. Pre-Payment reads preserve existing server-authoritative lifecycle behavior. Previously server-read SUCCESS cannot be downgraded within the mounted session by stale Payment reads. Receipt mismatch is discarded in favor of agreeing owned reads. Known GET does not expose attempt initiation/provider deadline/reference, so receipt-less recovery cannot independently compare those absent fields; no reconstruction occurs.

At most six visible/non-overlapping 30-second interval reads per mount, plus existing initial/event/one-expiry reads; confirmed terminal results stop interval polling. 401/403/404/429 and 30-second read timeout stop automatic event/interval reads until an explicit recheck. Poll exhaustion/network/5xx/malformed data never sets FAILED. Backend query recovery remains the protected separately configured worker; UI recheck does not invoke provider querydr. No new retry/replacement policy is created or exposed. Frozen negative attempts remain readable with no automatic/replacement POST.

Backend audit preserves immutable merchant/wire amount/reference/currency binding, original provider deadline, strict normal-success mapping, signed IPN/query authority, protected atomic finalization, deduplicated durable evidence and reconciliation for special/contradictory/late/multiple-success results. Late SUCCESS may coexist with unfulfilled non-PAID Booking. Backend tests independently exercise these guarantees; return checksum alone never settles. No browser financial finalizer exists.

## 6. Files Created

- `frontend/src/app/(public)/payments/vnpay/return/page.tsx`
- `frontend/src/app/(public)/payments/vnpay/return/layout.tsx`
- `frontend/src/features/payment/payment-return-screen.tsx`
- `frontend/src/features/payment/owned-payment-status-panel.tsx`
- `frontend/src/features/payment/payment-status-service.ts`
- `frontend/src/features/payment/payment-status-service.test.ts`
- `frontend/test/e2e/customer-payment-status.spec.ts`
- `frontend/test/e2e/helpers/customer-payment-status.ts`
- `docs/development/customer-payment-return-status-recovery-frontend.md`
- This dated report.

## 7. Files Modified

`frontend/package.json`, `frontend/src/features/auth/auth-return.ts`, `frontend/src/features/booking/owned-booking-summary-screen.tsx`, `frontend/src/features/booking/use-booking-detail.ts`, `frontend/src/features/payment/owned-payment-initiation-panel.tsx`, `frontend/src/features/payment/payment-initiation-storage.ts`, `docs/ai/current-handoff.md`, `docs/development/customer-payment-initiation-frontend.md`, `docs/ui-ux/screen-spec/customer-screen-map-v1.0.md`, `docs/ui-ux/customer-frontend-implementation-plan-v1.0.md` and `README.md`. No move, backend/schema/config/dependency change. **21 files: 11 modified + 10 created.** Final inventory is checked against entry hashes.

## 8. Verification

| Check | Result / evidence |
|---|---|
| Backend `mvn verify` | PASS: **294**, 50 suites, 0 failures/errors/skips; dedicated existing local PostgreSQL integration flags; build/repackage PASS; 2026-10-10T06:42:55+07:00, 1:51 |
| Frontend `pnpm exec tsc --noEmit` | PASS on final runtime/test source |
| `pnpm lint` | PASS on final runtime/test source |
| `pnpm test` | PASS: **138/138**, all 118 baseline plus 20 new; 0 failures/cancelled/skipped/todo |
| `pnpm build` | PASS on final runtime/test source; static real return route present |
| Targeted installed-Edge Payment browser suite | PASS **66/66**, including all 34 existing initiation cases plus initial 32 return cases; 1.7m. Five additional recovery tests are included in final full regression. No retries/skips. |
| Full installed-Edge Playwright | PASS: **219/219**, exit 0, **9.2m**; all 182 baseline plus 37 new cases, one worker, 0 failures/skips/retries |
| Visual/accessibility | PASS: final-source fixture screenshots visually reviewed on desktop 1440×1000 and mobile 390×844, exact IDs/amounts/UTC deadline, dark/amber layout, no horizontal overflow, keyboard Enter refresh and no Ticket/QR |
| Scope/conventions/UTF-8/links/whitespace/index | PASS: 21 authorized files (11 modified/10 new), **638/649** entry tracked files unchanged, all **19 original E2E files unchanged**, all original unit commands retained; strict UTF-8, 130 local Markdown links, whitespace and unchanged empty index. Backend/config/migrations/requirements/contracts/historical reports/preview routes/dependencies protected. |

All local logs/screenshots/generated output stay ignored under `frontend/node_modules/payment-status-work/`, `frontend/test-results/` or `frontend/target/`. A shell harness path/PowerShell stderr handling issue and a new test-file syntax error were corrected before passing tests; no skipped test or retry masking was introduced. No browser/backend regression failure is concealed.

Reviewed final-source browser artifacts: [desktop return](../../frontend/target/customer-payment-return-status-recovery/return-desktop.png), [mobile return](../../frontend/target/customer-payment-return-status-recovery/return-mobile.png). These show **fixture-backed** pending UI; they are not provider or live financial evidence and contain no raw callback query.

A preliminary full browser run was intentionally stopped after 74 passed cases, with no failure, to fix two audit findings: lock the landing's selected attempt against changed hints and make expiry reads respect automatic-read suppression. Its log is retained as `playwright-preliminary-interrupted.log`; it is not reported as full PASS. A fresh complete 219-case run uses the rebuilt final runtime and adds the identity-lock regression. No test retry or omission substitutes for full regression.

The first completed full run reported **218 passed / 1 failed (9.1m)**. Original `customer-booking-creation.spec.ts:142` exposed an overbroad new lifecycle guard on an **unfrozen** Booking. The guard was corrected to apply only after an observed `paymentStartedAt`; pre-Payment reads retain their existing backend-authoritative behavior. The old test is unchanged; a new unit regression makes this boundary explicit. Rebuilt TypeScript/lint/build and **138/138 unit** pass; the original failing browser case separately passed **1/1**. The failed full log and failure trace/context are retained under `playwright-full-initial-failed.log` and `first-regression-failure/`. The fresh final complete run passed **219/219 (9.2m, exit 0)**, with no retries/skips or changed baseline assertions; its log is `playwright-full.log`.

### Neon and provider evidence classification

| Category | Result |
|---|---|
| A. Frontend return/status/recovery with HTTP fixtures | PASS: targeted suite and final full 219/219 regression. All simulated responses explicitly labeled fixtures. |
| B. Real backend stored-state/query integration | PASS via actual isolated PostgreSQL and protocol regression, including protected result/query handling; **not live VNPAY certification**. Payment-related suites total 53 tests. |
| C. Actual VNPAY Sandbox return | **NOT RUN**: absent merchant/secret/HTTPS return configuration and eligible Booking |
| D. Actual verified signed provider callback | **NOT RUN**: signed local fixtures are separate; provider gates remain false |
| E. Actual live Payment SUCCESS | **NOT RUN** |
| F. Actual live Booking PAID | **NOT RUN** |

Fresh read-only Neon preflight at **2026-10-09T23:35:57.810598Z** (2026-10-10 local): 73 Showtimes, latest start **2026-10-09T16:17:00Z**, **zero** future OPEN_FOR_BOOKING/cutoff-valid rows; Payment/Ticket rows zero. V12 remains head. No scheduling/catalog/Promotion/financial writes, seed/provisioning or real-money transactions. Preflight's nonzero exit reports unavailable eligible data after saving read-only fingerprints, not a test regression. Read-only postflight **PASS**: all 19 business/history/financial fingerprints and V1–V12 applied checksums unchanged, no new Booking/Concession line. Private `.env` and process environment checks report presence/boolean flags only, never secret values; merchant/secret/return URLs absent and all confirmations disabled.

## 9. Requirement Reconciliation

Frontend authority, Vietnamese presentation, safe owned identity recovery, original expiry/freeze, no automatic writes, no premature issuance and scope preservation: PASS, including final complete regression. Live Sandbox interoperability: PARTIAL/NOT RUN for the explicit external dependencies above. No fixture or isolated SQL result is claimed as C–F evidence. Historical contracts/BRD/SRS remain unchanged.

## 10. Deviations / Conflicts

No approved business-rule or convention exception required. V9's INITIATED-only staging text is historical; actual V10/VNPAY v1.1 permits PENDING recovery/protected definitive-negative replacement. Existing legacy DOCX filename is preserved; current identifiers use canonical naming. No invented requirement IDs, Customer query endpoint, list/latest lookup, callback field, financial state or deployment host. The new frontend path is a fixed destination for the existing configurable redirect, not a new backend callback API.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md), including this report, all 21 files and local links. Final completion wording, requirement reconciliation and this report were rechecked after the full browser run passed.

| Area | Result | Notes |
|---|---|---|
| Folder naming | PASS | Existing feature/test locations and framework route group; lowercase static paths |
| File naming | PASS | Kebab-case source/guide, conventional page/layout/test names; dated report format |
| Code naming | PASS | PascalCase components/types, camelCase functions/variables, UPPER_SNAKE_CASE shared constants |
| Domain terminology/status/UI | PASS | Existing serialized Payment/Booking states; Vietnamese labels; financial state separate from fulfillment |
| API convention | PASS | Only actual owned GET/explicit existing POST contracts; new frontend route is not an API |
| Database convention | NOT APPLICABLE | No backend/database/migration writes; V12 preserved |
| Imports/routes | PASS | `@/` application imports; conventional relative browser-helper imports; safe fixed login return |
| Documentation convention | PASS | Dated report/guide and current development/UI/handoff documents; 130 local links and template sections validated, historical reports/contracts preserved |

## 11. Known Limitations

No automatic discovery after lost Payment ID; no latest/list/Customer-query endpoint. Per-tab pointer requires the originating tab/storage or an existing known Summary hint. Unknown identity stays blocked with Vietnamese guidance. Exact provider reference/deadline/initiation time are absent from owned GET and cannot be reconstructed. Financial reconciliation/operator support remains the backend's existing process; no support messaging, refund or retry policy is added. Fixed HTTPS redirect requires future authorized environment configuration; no merchant flags are enabled. Proxy/APM callback-log suppression is an existing deployment requirement outside this frontend slice. Actual Sandbox gaps remain C–F NOT RUN.

## 12. Next Recommended Step

**Real Customer Ticket/Booking QR and My Bookings integration, but only after independently verified backend PAID/issuance contracts are audited. Do not start automatically.** Stop after completing this task; no further implementation authorized.
