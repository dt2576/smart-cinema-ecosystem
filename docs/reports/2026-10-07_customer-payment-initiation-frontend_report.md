# Smart Cinema Implementation Report

## 1. Task Information

Task: Integrate real Customer Payment initiation into the existing unpaid Booking frontend.
Date: 2026-10-07, Asia/Ho_Chi_Minh.
Module: Customer owned Booking Summary / Payment.
Type: Frontend integration, regression QA and documentation.
Status: COMPLETE for the authorized frontend implementation, final regression and requirement/convention reconciliation. Conditional live-write/provider limitations are recorded below.

## 2. Requested Work

Replace the disabled owned-Summary Payment placeholder with explicit first initiation through the actual backend contract. Preserve real Discovery/Holds/Booking/Concession/Promotion, string IDs, exact frozen amount, original expiry and backend authority. Safely handle duplicate/concurrent actions, lost/invalid responses, reload/direct entry/login and optional server-issued Sandbox URL. Do not implement post-initiation return/status finalization, SUCCESS/PAID transitions, issuance, history, Admin, scheduling/data repair or deployment.

## 3. Documents Reviewed

- Root/application AGENTS; `.agent/workflows/DEVELOPMENT_WORKFLOW.md` first, `FRONTEND_WORKFLOW.md`, applicable `.agent/rules/`, [project conventions](../development/project-conventions.md) before naming/implementation, and [report template](templates/TASK_REPORT_TEMPLATE.md).
- [BRD v1.2](../brd/brd-v1.2.md) Payment and price/Booking sections; [SRS v1.2](../srs/srs-v1.2.md) §§3.8–3.10, NFR/security/UX and traceability. Business Analysis v2.1 §§30–32 and Project Scope v1.0 provide context; current BRD/SRS and additive contracts remain controlling.
- [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx) §5.3.6 UC-CUS-018, §5.3.7 UC-SYS-006, §5.5.5 BRULE-PAY-001–006. Existing document was extracted to an ignored temporary read artifact; the requirement source was not edited.
- [Booking v1.0](../api/booking-contract-v1.0.md), [v1.1](../api/booking-contract-v1.1.md), [v1.2](../api/booking-contract-v1.2.md), [v1.3](../api/booking-contract-v1.3.md); [Payment initiation](../api/payment-initiation-contract-v1.0.md); [VNPAY v1.0](../api/vnpay-sandbox-payment-contract-v1.0.md)/[v1.1](../api/vnpay-sandbox-payment-contract-v1.1.md), including confirmation register and existing return/IPN/query boundary.
- Existing Concession/Promotion frontend guides, current handoff, screen map, implementation plan, `.stitch/DESIGN.md`; installed Next.js 16.3.5 `use-client` documentation.
- Actual Payment/VNPAY controllers, response records, service/repository/settings, V9/V10 initiation/binding policies and Payment/VNPAY PostgreSQL tests; existing owned Summary/auth/recovery/preview separation.

## 4. Requirements Traceability

| Requirement | Description / applicability | Result |
|---|---|---|
| BR-036; FR-PAYMENT-001; UC-CUS-018 initiation steps | Explicit first attempt for eligible owned Booking | Implemented real API client; isolated HTTP/browser and PostgreSQL proof; fresh live write NOT RUN |
| BR-035; FR-PAYMENT-002; BRULE-PAY-003 | Exact backend Booking amount, no frontend authority | PASS: empty body, decimal strings, frozen aggregate matching, no rounding or gateway conversion |
| BR-037; FR-PAYMENT-003 | Configured Sandbox submission/redirect | Implemented safe explicit client; live merchant interoperability NOT RUN |
| BR-042; FR-PAYMENT-011 | Server references and attempt traceability | PASS: actual receipt internal reference; known-ID owned GET; no invented latest lookup |
| BR-038/039; FR-PAYMENT-004/006; BRULE-PAY-001/002 | Backend verification remains authoritative | PASS preservation: no browser-derived financial transition, callback processing or issuance |
| BR-040; FR-PAYMENT-008/009; FR-BOOKING-012; BRULE-PAY-006 | Failure/uncertainty cannot imply PAID/Tickets | PASS preservation: uncertainty is reviewed, no fake failure/success, no Ticket/QR rendering |
| BR-041; FR-PAYMENT-010; BRULE-PAY-005 | Backend idempotency / duplicate protection | PASS preservation: no callback writer change; shared client gate and two-tab unresolved reuse coverage |
| FR-PAYMENT-012/013; BRULE-PAY-004 | Amount/currency/reference/signature verification | PASS preservation: existing backend only; no client secret/signature implementation |
| FR-PAYMENT-005/007/014/015; UC-SYS-006 | Webhook, atomic paid sale, late evidence and audit | NOT APPLICABLE to new frontend work; unchanged protected backend regression PASS |
| FR-BOOKING-005/006/007/010/018; Booking v1.3 first-attempt freeze | Immutable origins/snapshots, exact totals and expiry | PASS: complete authoritative aggregate, terminal/frozen read-only, no Hold renewal/release |
| FR-BOOKING-013–017; FR-PROMO-002–006 | Existing Concession/Promotion preservation | PASS: original scenarios retained, commands disabled during Payment/review and after freeze |
| NFR-UX-005; NFR-SEC-011; NFR-REL-006 | Separate totals, safe errors and server time | PASS: Vietnamese accessible panel, exact rows, UTC timestamps and monotonic server clock |
| FR-TICKET requirements / check-in / history | New issuance, QR, Customer history or check-in | NOT APPLICABLE; no implementation authorized or added |

The SRS composition-lock row describes post-finalization integrity. The already approved additive Booking v1.3/V9–V10 contracts also permanently freeze at first actual attempt. This task implements that current contract; it does not rewrite requirements or invent an earlier financial success.

## 5. Implementation Summary

Owned Summary embeds **Tiến hành thanh toán**, followed by **Đã bắt đầu thanh toán** and a separate **Mở VNPAY Sandbox** action on a known unresolved attempt. It uses shared tokens/components and preserves all static preview routes/adapters.

| Operation | Actual resource / complete body |
|---|---|
| Initiate | POST `/api/v1/bookings/{bookingId}/payment-transactions`, `{}` |
| Recover known attempt | GET `/api/v1/bookings/{bookingId}/payment-transactions/{paymentId}`, no body |
| Submit configured Sandbox | POST known attempt `/vnpay-submission`, `{}` |

JWT is the sole actor input; positive-bigint IDs and numeric(19,4) remain strings. Initial provider/currency stay null. First receipt is checked against unchanged origin/deadline; fresh Booking and attempt projections must match the frozen amount/marker before continuation. Concurrent composition changes require explicit rereview; the latest complete server aggregate wins. Stored Payment ID/reference is displayed without inventing missing lookup fields.

The same ref/controller gate serializes Summary reads, Promotion writes and Payment actions. A 30-second write timeout, network/5xx/malformed response or interrupted navigation persists uncertainty before the request. A fresh owned read and supported known-ID GET reconcile; no effect/reload/login/poll auto-submits. Matching valid scalar IDs from an otherwise malformed receipt are retained only as untrusted hints; owned reads must agree, bad receipt metadata is discarded and explicit Customer review remains required. Missing/invalid/mismatched identity is never guessed. Per-tab hints contain identity and review intent only, with storage-denied in-memory fallback. Tampered hints must pass owned reads. Known lookup failure has distinct Vietnamese copy from completely unknown identity.

The backend reuses INITIATED/PENDING and allows replacement after verified definitive negatives under reconciliation guards. Consequently POST cannot safely recover an unknown attempt in general. There is no latest/list endpoint. Frozen Booking without a received identity blocks new POST and presents Vietnamese review/recovery guidance. This intentional contract limitation is exposed, not bypassed. Known terminal/reconciliation states remain blocked; replacement/retry/result UX is deferred.

Sandbox navigation consumes the returned URL unchanged, pinned to HTTPS `sandbox.vnpayment.vn/paymentv2/vpcpay.html`. Wrong hosts/paths/ports, userinfo, lookalikes, fragments, whitespace/backslashes and unsafe schemes are rejected. Provider expiry is checked against original Booking expiry/server-derived current time and labeled separately when returned. Zero/fractional internal amounts stay exact; backend whole-positive-VND rejection cannot reprice. Lost submission uses GET/review; reopening still requires explicit action and backend confirmation/query gates.

Backend verification/return/IPN/query configuration and routes are untouched. Minimal lookup projection discards Ticket/QR fields. No receipt, callback query or URL syntax generates SUCCESS, PAID, SOLD, Ticket or Booking QR.

## 6. Files Created

- `frontend/src/features/payment/payment-initiation.types.ts`
- `frontend/src/features/payment/payment-initiation-api.ts`
- `frontend/src/features/payment/payment-initiation-service.ts`
- `frontend/src/features/payment/payment-initiation-storage.ts`
- `frontend/src/features/payment/owned-payment-initiation-panel.tsx`
- `frontend/src/features/payment/payment-initiation-api.test.ts`
- `frontend/test/e2e/helpers/customer-payments.ts`
- `frontend/test/e2e/customer-payment-initiation.spec.ts`
- `docs/development/customer-payment-initiation-frontend.md`
- This dated report.

## 7. Files Modified

- `frontend/src/features/booking/use-booking-detail.ts`: shared Payment actions/read/review state and gate.
- `frontend/src/features/booking/owned-booking-summary-screen.tsx`: inline Payment panel and composition review gating.
- `frontend/package.json`: append new unit file; no dependency/version/lockfile change.
- `frontend/test/e2e/customer-booking-creation.spec.ts`: one obsolete placeholder assertion now requires **Tiến hành thanh toán** enabled on the eligible owned Summary. All existing scenario names/flows and other assertions remain; no skipped/deleted tests.
- `README.md`, `frontend/README.md`: current frontend capability links.
- `docs/ai/current-handoff.md`: current milestone, evidence limits and exact next task.
- `docs/development/customer-booking-creation-frontend.md`, `docs/development/customer-concession-composition-frontend.md`, `docs/development/customer-promotion-composition-frontend.md`: separately authorized Payment continuation and unchanged composition boundaries.
- `docs/ui-ux/customer-frontend-implementation-plan-v1.0.md`, `docs/ui-ux/screen-spec/customer-screen-map-v1.0.md`: inline Summary reuse and deferred post-initiation scope. Historical reports and requirements remain untouched.

## 8. Verification

| Check | Result / evidence |
|---|---|
| `pnpm exec tsc --noEmit` | PASS, final source after production build |
| `pnpm lint` | PASS, exit 0 |
| `pnpm test` | PASS **118/118**, including all 104 existing tests plus 14 new; no skipped/cancelled tests |
| `pnpm build` | PASS, existing Next 16.3.5 production build; no new route/dependency |
| Focused Payment Playwright | PASS 31/31 initial coverage; PASS 4/4 final-build recovery refinements (9.6s); first complete run 180/180 PASS (9.2m) before the two recovery additions. Final full-source run below is the completion gate |
| Full installed-Edge Playwright | PASS **182/182**, final source/production build, exit 0, 8.9m: all 148 existing plus 34 Payment scenarios, one worker, no retries/skips |
| Dedicated local PostgreSQL `mvn verify` | PASS **294 tests**, 50 suites, failures/errors/skips 0; 2026-10-07T05:07:33+07:00, 1:27. Payment: 15; VNPAY PostgreSQL: 20; migration tests: 1 each; protocol: 16 |
| Fresh Neon preflight | PASS read-only inventory/fingerprint capture; zero eligible future open/cutoff-valid Showtimes. New live initiation NOT RUN |
| Real production-browser Neon reads | PASS, ordinary Customer login, existing owned CANCELLED Booking 1; Payment disabled, original deadline, reload, desktop/mobile/keyboard, no overflow/page errors/business writes |
| Neon postflight | PASS, all 19 protected domain/history/financial fingerprints and V1–V12 applied checksums unchanged; no new Booking/Concession line/Hold/Payment |
| Scope/convention/UTF-8/links/report audit | PASS: 22 authorized changed/created files, strict UTF-8, local Markdown links, whitespace, report inventory and runtime boundary; 627/639 baseline tracked files unchanged; index unchanged |

Backend test flags used: MOVIE_DB_TESTS, DISCOVERY_DB_TESTS, SEAT_DB_TESTS, BOOKING_DB_TESTS, CONCESSION_DB_TESTS, PROMOTION_DB_TESTS, PAYMENT_DB_TESTS and DEMO_DB_TESTS, against the dedicated local database `smart_cinema_v11_accepted_20261001`, never Neon. Existing Payment/VNPAY tests prove unchanged transaction semantics, including immutable origins/deadline, exact fractions/zero, promotion-change rollback, lock races, PENDING reuse, definitive-negative replacement, protected finalization and no unpaid Ticket/QR. No test weakening or backend workaround.

Proof sources: [Payment PostgreSQL tests](../../backend/src/test/java/com/smartcinema/payment/PaymentPostgresTests.java), [VNPAY PostgreSQL tests](../../backend/src/test/java/com/smartcinema/payment/VnpayPostgresTests.java), and [protocol tests](../../backend/src/test/java/com/smartcinema/payment/VnpayProtocolTests.java). In particular `pendingRecoversAndDefinitiveFailureAllowsFrozenRetry` proves why unknown-identity recovery must not blindly POST; `concurrentBindingAndQueryClaimsDoNotExtendDeadline` and `lateSuccessOnFailedAttemptCannotAuthorizeAnotherChargeOrAutomaticSale` preserve the existing deadline/reconciliation boundaries.

Browser coverage includes Movie→Cinema→Showtime→whole COUPLE Hold→Booking→Concession→Promotion→Payment on desktop/mobile; exact authenticated payload/IDs/snapshots; rapid actions; two tabs; frozen direct/reload/back/forward; lost/malformed/5xx/timeout/abort; malformed or amount-inconsistent receipt recovery through agreeing owned reads; 400/401/403/404/409 safe errors; first-Promotion review conflicts; before/after-read composition races; known recovery failure; storage denial/tampering; zero/fractional rejection; configured URL forwarding; lost/unsafe/malformed submission; terminal/reconciliation/expiry blocks; anonymous login resumption and forged browser success parameters. HTTP fixtures never serve as a production fallback or merchant acceptance proof.

### Evidence classification

| Stage | Actual evidence / result |
|---|---|
| A — frontend → real backend initiation | Implemented actual adapter; browser HTTP fixtures and real isolated backend MVC/PostgreSQL tests PASS separately. Live end-to-end Neon initiation **NOT RUN**, no eligible Showtime |
| B — backend-generated hosted URL | Existing local backend service/protocol tests and frontend URL guard/forwarding fixtures PASS. Live configured merchant URL generation **NOT RUN** |
| C — VNPAY accepted submission | **NOT RUN**: no merchant/secret, all confirmation gates false; no external provider call |
| D — signed callback accepted | **NOT RUN** externally; existing local protocol/finalization regression only, no manufactured live callback |
| E — Payment SUCCESS | **NOT RUN** live and out of this task's authorized frontend scope |
| F — Booking PAID | **NOT RUN** live and out of scope |
| G — Tickets / Booking QR | **NOT RUN** live and out of scope; no issuance path added |

Preflight database clock was 2026-10-06T22:06:08Z (2026-10-07 local), with 73 Showtimes and latest start 2026-10-09T16:17:00Z, but zero future open/cutoff-valid rows. Having future scheduled data alone does not make it eligible. No rescheduling, activation, seed/provisioning, Promotion validity/quota edits or historical/financial cleanup was used. Merchant and secret presence were inspected as booleans only; no value/token/raw signed URL is logged in delivered evidence. Runtime used cleanup=false and VNPAY enabled=false; confirmation flags stayed false.

Generated logs/screenshots/read evidence are local ignored artifacts under `frontend/target/customer-payment-initiation/`. Screenshots distinguish isolated HTTP fixtures from actual read-only Neon. Auth token/session activity is expected and separate from unchanged protected business/history tables. Verified owned runtime and preview processes were stopped after the final read-only postflight; no business cleanup was needed.

Local evidence: [full final Playwright log](../../frontend/target/customer-payment-initiation/full-e2e.log), [unit log](../../frontend/target/customer-payment-initiation/unit.log), [backend regression](../../frontend/target/customer-payment-initiation/backend.log), [production build](../../frontend/target/customer-payment-initiation/build.log), [fresh preflight](../../frontend/target/customer-payment-initiation/neon-preflight.log), [postflight](../../frontend/target/customer-payment-initiation/neon-postflight.log), [gate booleans](../../frontend/target/customer-payment-initiation/gateway-gates.json), and [actual read-only browser evidence](../../frontend/target/customer-payment-initiation/neon-read-evidence.json).

Visual QA inspected [fixture desktop](../../frontend/target/customer-payment-initiation/fixture-payment-frozen-desktop.png), [fixture mobile](../../frontend/target/customer-payment-initiation/fixture-payment-frozen-mobile.png), [fixture provider-back review](../../frontend/target/customer-payment-initiation/fixture-payment-returned-review.png), [actual Neon read desktop](../../frontend/target/customer-payment-initiation/neon-read-desktop.png), and [actual Neon read mobile](../../frontend/target/customer-payment-initiation/neon-read-mobile.png). All use the production frontend; fixture images are not live Payment persistence/provider proof. No overflow, garbled Vietnamese, issuance or financial-success claim was observed. Original 23 E2E files retain all scenarios; 22 are byte-unchanged and the remaining file differs only by the documented enabled-CTA assertion.

## 9. Requirement Reconciliation

**PASS for authorized implementation and backend-authority preservation**, subject to the explicitly permitted **PARTIAL live verification** gap: no eligible existing Showtime for live creation/initiation, and no merchant confirmation for provider interoperability. No live persistence, accepted provider submission, signature interoperability or financial success is claimed. No requirement IDs were invented and no BRD/SRS revision was made.

## 10. Deviations / Conflicts

- Existing V9 documentation alone described INITIATED reuse; V10/v1.1 now supports PENDING reuse and guarded replacement after definitive negatives. Current additive contract is followed without editing historical documents.
- The old eligible-Summary test required a disabled unimplemented Payment placeholder. One assertion was updated to the newly required enabled real action; all 148 scenarios are retained and must pass. This is authorized behavior evolution, not a reduced test.
- First focused run: 7 new-test failures came from a locator also matching Next's hidden route announcer. New locators now scope to `main`; all assertions remain, no retry/timeout relaxation. Subsequent 31/31 focused scenarios passed.
- Unknown Payment identity cannot be recovered by existing GET without an ID. UI reports the limitation and blocks replacement. No invented endpoint, client idempotency key or broad scope expansion.
- Existing legacy document filenames/preview adapters stay untouched. No approved convention exception is needed; no backend/migration/V13, API contract, requirements, Stitch, provider secret/flag or historical report change.

## Convention Compliance

Validated against [project conventions](../development/project-conventions.md), including this report.

| Area | Result | Notes |
|---|---|---|
| Folder/file naming | PASS | Existing feature paths; kebab-case new files, purpose/type suffixes; ignored artifacts excluded from Git |
| Code/import naming | PASS | PascalCase types/components, camelCase functions, shared uppercase constants; `@/` feature imports |
| Domain terminology/language | PASS | Canonical Booking/Payment/Concession/Promotion names and serialized states; Vietnamese UI, English identifiers |
| API/status convention | PASS | Exact existing plural resources/actions, string IDs/decimals, JWT/no-store; no invented authority fields/endpoints/statuses |
| Route/architecture | PASS | Inline existing owned Summary, client directive at interactive boundary, separate typed API/logic/storage/UI; no preview authority or generic UI/domain coupling |
| Database convention | NOT APPLICABLE | No schema/source migration/database mutation; V12 preserved |
| Documentation/report convention | PASS | New dated filename conforms to §19; template sections, real IDs, checked local links, explicit evidence limits, historical reports preserved |
| Branch/commit convention | NOT APPLICABLE | No branch, commit, staging or reset performed |

## 11. Known Limitations

Live first initiation and configured VNPAY merchant interoperability remain unverified for the independently documented environment/data conditions. No latest-attempt lookup exists, so an unreturned ID on a frozen Booking requires supported future recovery/support rather than a new POST. Terminal replacements, provider-return/status result UX, finalization, history, Ticket/QR and check-in remain deferred. Production rollout is not part of this task.

## 12. Next Recommended Step

**Audit and integrate the Customer post-initiation Payment return/status/recovery flow against the existing backend verification contract.**

Keep backend verification authoritative and do not issue Tickets before independently verified SUCCESS. This is a recommendation only. Stop after this task; no automatic continuation, merchant enablement, finalization or issuance is authorized.
