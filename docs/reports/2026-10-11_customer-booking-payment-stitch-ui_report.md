# Smart Cinema — Customer Booking and Payment Stitch UI Report

## 1. Task Information

Task: Phase 2 — Customer Booking & VNPAY Payment UI.
Date: 2026-10-11 (Asia/Saigon).
Module: Existing owned Booking Summary, Payment initiation, status and fixed VNPAY return.
Type: Frontend implementation and regression verification.
Status: COMPLETE — scoped visual implementation, final frontend checks and full regression PASS; external financial/provider evidence NOT RUN.

Entry commit: `4cf274b27d12392199051284b44cb699d3d4879c` (`feat(ui): implement Phase 1 shared UI foundation`). The working tree and staged diff were empty at entry. No commit, deployment or Phase 3 work is authorized or performed.

## 2. Requested Work

Implement the approved Phase 2 presentation on `/bookings/[bookingId]/summary` and `/payments/vnpay/return`, using Phase 1 primitives and live Stitch HTML/PNG references. Preserve Booking/Payment authority, exact decimal and bigint strings, ownership, readiness gates, the original expiry, permanent first-attempt freeze, provider navigation safety and recovery restrictions. Verify Vietnamese presentation, responsive layout, native forms/buttons, keyboard focus and existing regressions.

## 3. Documents Reviewed

- Root `AGENTS.md`; [development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [project conventions](../development/project-conventions.md), convention enforcement, Coding, UI/UX, Document and Requirement Traceability rules; [frontend workflow](../../.agent/workflows/FRONTEND_WORKFLOW.md); `frontend/AGENTS.md`.
- [Approved assessment](2026-10-10_stitch-frontend-implementation-assessment_report.md), especially reference adaptations, actual routes and Phase 2 boundaries; [completed Phase 1 report](2026-10-11_shared-ui-foundation_report.md).
- [Stitch design system](../../.stitch/DESIGN.md), [current handoff](../ai/current-handoff.md), [BRD v1.2](../brd/brd-v1.2.md) §§4.6–4.8 and Concession requirements; [SRS v1.2](../srs/srs-v1.2.md) §§3.6–3.9 and security/UX; [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md) Booking lifecycle/pricing/Promotion/Payment sections; [Project Scope v1.0](<../project-scope/project-scope v1.0.md>) Customer/MVP boundaries; [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx) Booking/payment use cases.
- [Booking v1.3](../api/booking-contract-v1.3.md), [Payment initiation v1.0](../api/payment-initiation-contract-v1.0.md), [VNPAY Sandbox v1.0](../api/vnpay-sandbox-payment-contract-v1.0.md) and [v1.1 implementation delta](../api/vnpay-sandbox-payment-contract-v1.1.md).
- [Existing Customer Booking implementation guide](../development/customer-booking-creation-frontend.md), [Payment initiation guide](../development/customer-payment-initiation-frontend.md), [return/status/recovery guide](../development/customer-payment-return-status-recovery-frontend.md) and its [implementation report](2026-10-10_customer-payment-return-status-recovery-frontend_report.md).
- Installed Next.js 16 documentation for Server/Client Components and CSS; actual package versions, routes/layouts, shared primitives, Booking/Promotion/Payment presenters, hooks, API readers, status/coherence validators, navigation/storage helpers and existing tests. No framework migration or new dependency.

### Live Stitch references inspected before implementation

Read-only `get_screen` calls targeted `projects/1208499799798658711/screens/{id}`. All four HTML exports and original PNG exports returned HTTP 200. The actual HTML content and all four full-resolution PNGs were inspected; preview availability is not a generation-job completion claim.

| Reference | Stitch screen ID | Original PNG | Component mapping |
|---|---|---|---|
| N01 — Booking Summary | `66beffb2e06e49d3b103533d25f5c54d` | 2560 × 3608 | `OwnedBookingSummaryScreen`, `BookingShowtimeCard`, existing Promotion panel and authoritative totals sidebar |
| N02 — VNPAY initiation | `5c2d7472096a4d9099ff2f62a1b6da68` | 2560 × 3038 | Existing `OwnedPaymentInitiationPanel` inside Summary |
| N03 — Verification/reconciliation | `e58f593344cd4fdaac8bfe35a885f3d0` | 2560 × 3802 | Existing `OwnedPaymentStatusPanel`, fixed `PaymentReturnScreen`, shared loading skeleton |
| N04 — Payment result | `ca8f557d4c2f4ea78fa40552b7b41ba3` | 2560 × 2632 | Same real status/return presenters, distinct truthful outcomes; Ticket section deferred |

Original assets and a sanitized HTTP/dimension/SHA-256 manifest are archived under `frontend/target/customer-booking-payment-stitch-ui-2026-10-11/stitch/`. Thumbnail downloads are retained separately as `.preview.png`; comparison used the original 2560px exports. No signed download URL, merchant secret or callback string is included in this report. Stitch was not modified.

## 4. Requirements Traceability

The results below concern presentation and preservation of existing behavior, not a new backend implementation or provider certification.

| Actual requirement / source | Applicable behavior | Result |
|---|---|---|
| BRD v1.2 BR-026–031; SRS v1.2 FR-BOOKING-004–007/010 | Owned saved Booking, lifecycle, original expiry and Seat price snapshots | PASS — existing readers/calculations retained; clearer snapshot and status presentation |
| BRD BR-065–067; SRS FR-BOOKING-014/015/018 | Saved Concession lines, server totals and composition integrity | PASS — saved rows/amounts retained; first-attempt freeze remains governed by Booking v1.3 |
| BRD BR-034/035; SRS FR-BOOKING-008, FR-PROMO-003–006 | Backend-valid Promotion and backend-authoritative discount/total | PASS — existing handlers/validation/gates retained inside shared field/surface presentation |
| BRD BR-036/037; SRS FR-PAYMENT-001–003 | Explicit eligible initiation and Sandbox redirect | PASS — existing native actions and hosted URL validation retained; no automatic POST |
| BRD BR-038/039; SRS FR-PAYMENT-004/006/007/012/013 | Backend financial authority and distrust of browser return | PASS — existing coherence service retained; no callback interpretation or local success decision |
| BRD BR-040; SRS FR-PAYMENT-008/009/014, FR-BOOKING-012 | Failure/cancellation/late-result presentation without premature fulfillment | PASS — distinct result/review UI; no Ticket/QR promise or rendering |
| BRD BR-041/042; SRS FR-PAYMENT-010/011/015 | Idempotency/traceability boundaries | PASS for preservation — known ID/validated receipt only; no new provider command, reference or Customer audit stream |
| SRS FR-AUTH-009; NFR-SEC-011 | Owned reads and safe business errors | PASS — Auth, server ownership and safe error mapping unchanged |
| SRS NFR-UX-002/004/005 | Authoritative expiration, understandable feedback and separated money totals | PASS — original clock/expiry retained; exact Ticket/Concession/subtotal/discount/final amounts remain separate |
| System Analysis v1.1 UC-CUS-018/019/021; UC-SYS-006 | Make Payment, view result/detail, separate system verification | PASS for frontend presentation; backend verification authority unchanged |
| BRD BR-043–047; SRS Ticket/Booking QR requirements | Ticket/QR fulfillment | NOT APPLICABLE to implementation — explicit Phase 3 exclusion preserved; absence asserted even when fixtures include paid projection fields |

FR-BOOKING-018 states the broader historical-integrity requirement. The already approved Booking v1.3 first-attempt lock is preserved; this phase does not move the lock to financial success or revise SRS/BRD.

## 5. Implementation Summary

### Shared design adoption

Reuse Phase 1 `SurfaceCard`, `FormField`, `StatusBadge`, `StatusFeedback`, `Skeleton`, native `Button`, icons, semantic Tailwind tokens and configured fonts. No changes to the Nocturne palette, global CSS, font configuration or shared-component contracts. Two small Booking-specific presenters are justified by reuse on Summary and return: a validated Showtime context card and reduced-motion-aware loading skeleton.

Summary now has a Booking identity/status card, visible permanent-freeze strip, Showtime/movie context, Seat Unit cards, saved Concession rows, Promotion snapshot/form and an amber-bordered totals/readiness sidebar. Desktop uses a 420px sidebar; smaller widths stack content in reading order. Money uses the existing exact formatter and tabular typography, with wrapping for unusually large values. COUPLE remains one Seat Unit with two guests.

The existing initiation panel gains a Sandbox heading, explicit primary action, saved attempt/amount presentation and shared feedback. Existing known-attempt, review and unresolved states retain their native controls and disabled conditions. Only a validated initiation receipt can provide a reference; the label is now the customer-safe “Mã tham chiếu thanh toán.” No reference is synthesized from the return URL or status GET.

Return/result places the authoritative result above saved transaction details, with Booking context alongside on desktop and below on mobile. Green, red, amber and neutral visual treatments follow the existing service's Vietnamese presentation. The existing Summary link is the primary recovery destination. Loading, authentication, unknown identity and unavailable reads reuse Phase 1 surfaces/feedback.

### Existing authority and routes preserved

| Operation | Existing contract, unchanged |
|---|---|
| Owned Booking read | GET `/api/v1/bookings/{bookingId}` |
| Known owned attempt read / Customer recheck | GET `/api/v1/bookings/{bookingId}/payment-transactions/{paymentId}` |
| Explicit initiation | POST `/api/v1/bookings/{bookingId}/payment-transactions`, strict empty JSON object |
| Explicit hosted submission | POST `/api/v1/bookings/{bookingId}/payment-transactions/{paymentId}/vnpay-submission`, strict empty JSON object |
| Provider browser return | Existing backend GET `/api/v1/payments/vnpay/return`; fixed configured HTTPS 303 destination, no result writing or forwarded callback fields |
| Frontend landing | Existing `/payments/vnpay/return`; raw query/hash discarded by the unchanged effect; known per-tab hint selects an owned read |

No standalone real Payment route is added. No frontend IPN, QueryDR, reconciliation command, financial finalization or signature verification is introduced. The existing strict HTTPS VNPAY hosted destination allowlist and browser navigation helper are unchanged. Provider/merchant configuration and confirmation flags are untouched.

### Authoritative status mapping, unchanged service

| Validated state / consistency | Existing Vietnamese result | Visual treatment |
|---|---|---|
| Reads in progress | Đang xác minh thanh toán | Amber clock/loading |
| INITIATED, coherent owned reads | Thanh toán đang chờ hoàn tất | Amber pending |
| PENDING, coherent owned reads | Thanh toán đang chờ xử lý | Amber pending |
| SUCCESS with coherent PAID and no reconciliation | Thanh toán thành công | Green check |
| FAILED, coherent non-PAID | Thanh toán không thành công | Red failure |
| CANCELLED, coherent non-PAID | Thanh toán đã hủy | Neutral cancellation |
| `reconciliationRequired=true`, coherent reads | Đang đối soát thanh toán | Amber review; no issuance promise |
| Unknown ID, missing/malformed/unavailable/mismatched/stale-inconsistent reads | Chưa thể xác định kết quả thanh toán | Neutral uncertainty |

`EXPIRED` remains a Booking status, not a Payment enum. Expired/cancelled Booking guidance remains separate from financial status. `data-feedback-tone` is a presentation attribute, not a new serialized business status. The result panel selects visual emphasis from the unchanged service result; it does not independently reinterpret Payment or callback evidence.

### Expiry, freeze and recovery

IDs remain positive-bigint strings; amounts remain exact decimal strings, including four-place fractions. The formatter, financial validators, server-clock countdown and saved snapshots are unchanged. No VAT, service fee, artificial currency field or timer extension is introduced.

The first `paymentStartedAt` permanently freezes Concession/Promotion composition. Existing `paymentIneligibility`, editability, confirmation and review gates remain unchanged. An expired original Booking does not establish failed Payment; a late SUCCESS requiring reconciliation does not establish entitlement. No replacement attempt is exposed on frozen Bookings.

Reload, direct entry, login resume, back/forward, independent tabs, interrupted navigation, lost response, stale reads and delayed results retain the existing hook/storage/API recovery. Per-tab hints are untrusted identity hints, never status authority. Unknown attempt identity on a frozen Booking remains blocked because no approved latest/list recovery endpoint exists. Customer recheck remains owned GET; existing bounded reads are unchanged (six visible, non-overlapping 30-second intervals and existing stop conditions). No POST is added on mount/refresh/return.

### Keyboard focus correction

The new browser QA found native disabled recheck buttons losing keyboard focus while owned GETs ran. A presentation-only `useEffect`/ref restores focus after a keyboard-triggered read when focus is on the document body. It does not steal focus if the user has moved to another control. The native disabled condition and original click handler remain unchanged; no timing/polling/business rule changes. Both behaviors are asserted at all three widths.

## 6. Files Created

| File | Purpose |
|---|---|
| [booking-showtime-card.tsx](../../frontend/src/features/booking/booking-showtime-card.tsx) | Reusable validated movie/Cinema/Hall/Showtime context; decorative film glyph instead of invented poster |
| [booking-summary-skeleton.tsx](../../frontend/src/features/booking/booking-summary-skeleton.tsx) | Shared geometry/loading announcement; decorative reduced-motion placeholders |
| [customer-booking-payment-stitch-ui.spec.ts](../../frontend/test/e2e/customer-booking-payment-stitch-ui.spec.ts) | 12 explicitly fixture-backed browser cases, four per width; no existing tests changed |
| `docs/reports/2026-10-11_customer-booking-payment-stitch-ui_report.md` | This implementation report |

## 7. Files Modified

| File | Scoped change |
|---|---|
| [owned-booking-summary-screen.tsx](../../frontend/src/features/booking/owned-booking-summary-screen.tsx) | Shared surfaces/skeleton/badges, Showtime context, snapshot cards, freeze notice and responsive authoritative sidebar |
| [owned-promotion-panel.tsx](../../frontend/src/features/promotion/owned-promotion-panel.tsx) | Shared field/surface/badge presentation, saved discount emphasis; existing IDs, validation, events and gates retained |
| [owned-payment-initiation-panel.tsx](../../frontend/src/features/payment/owned-payment-initiation-panel.tsx) | Sandbox/provider framing, known amount/reference display and shared feedback; existing actions/gates retained |
| [owned-payment-status-panel.tsx](../../frontend/src/features/payment/owned-payment-status-panel.tsx) | Truthful visual tones/icons, native recheck presentation and keyboard focus recovery |
| [payment-return-screen.tsx](../../frontend/src/features/payment/payment-return-screen.tsx) | Responsive result/context composition, shared loading/error/auth/unknown surfaces and Summary recovery link |

Total: five existing frontend presenters modified; two presenters, one test file and this report created. No moved files. Runtime artifacts are ignored under `frontend/target/customer-booking-payment-stitch-ui-2026-10-11/` and are not staged.

## 8. Verification

### Baseline before application edits

| Check | Actual result |
|---|---|
| Working tree/index and file hashes | PASS — clean entry; SHA-256 baseline for all 668 tracked files |
| `pnpm exec tsc --noEmit` | PASS, exit 0 |
| `pnpm lint` | PASS, exit 0 |
| `pnpm test` | PASS — 138/138; 0 failed/cancelled/skipped/todo |
| `pnpm build` | PASS, exit 0 |
| `PLAYWRIGHT_CHANNEL=msedge pnpm exec playwright test customer-payment-initiation.spec.ts customer-payment-status.spec.ts` | PASS — 71/71, 1.6m |

An initial baseline command wrapper incorrectly splatted the TypeScript arguments as one pnpm command. It did not run TypeScript or edit application files. The corrected command above passed before source edits; `baseline-tsc-command-error.log` is retained separately. No check is counted from that invocation.

### Final source checks

Commands run from `frontend/` using the existing configuration: production `pnpm start --port 3100`, one worker, installed Edge via process-local `PLAYWRIGHT_CHANNEL=msedge`, no retries/skips or configuration changes.

| Command | Actual result |
|---|---|
| `pnpm exec tsc --noEmit` | PASS, exit 0, after keyboard focus correction |
| `pnpm lint` | PASS, exit 0, after keyboard focus correction |
| `pnpm test` | PASS — 138/138; 0 failed/cancelled/skipped/todo |
| `pnpm build` | PASS, exit 0, after keyboard focus correction |
| Focused Playwright: new presentation suite + both existing Payment suites | PASS — 83/83, 2.0m; no retries/skips |
| Full `PLAYWRIGHT_CHANNEL=msedge pnpm exec playwright test` | PASS — 250/250, 10.4m, exit 0; 0 failures/skips/retries |
| Responsive visual/accessibility evidence | PASS for scoped QA at 390/768/1440; 39 final fixture screenshots archived and representative actual renders visually inspected |
| Preservation/convention checks | PASS — 668 tracked hashes checked, only five allowed presenters changed; original event handlers/authority calls/effects retained; HEAD and index unchanged |
| Report checks | PASS — local links, actual explicit requirement IDs, required 12-section structure, UTF-8 and whitespace; final scope review complete |

Final total: **138 unit tests and 250 Playwright cases PASS**. The full browser suite preserves all **238 Phase 1 baseline cases** and adds 12 presentation cases. No old test is edited, removed, skipped or retried. Final command logs are `verified-final-tsc.log`, `verified-final-lint.log`, `verified-final-unit.log`, `verified-final-build.log`, `focused-final-playwright.log` and `full-playwright.log` in the ignored evidence directory. PowerShell's native-stderr wrapper and Node color/experimental notices are retained in raw logs; command results above use actual exit codes and runner summaries.

The first focused implementation run was **80 passed / 3 failed (2.5m)**. All three failures were the newly introduced keyboard-focus assertion after recheck at the three widths. The native focus behavior was corrected as described above; the same assertion and a no-focus-stealing assertion pass in the fresh 83-case run. Original failures, error contexts and traces are retained in `focused-first/` and `focused-first-playwright.log`. This is a tested fix followed by a new run, not retry masking or weakened tests.

### Focused browser coverage

The 12 new cases cover:

- Summary's large exact fractional amounts/string IDs, long Vietnamese labels, one COUPLE unit/two guests, saved Concession/Promotion amounts, original expiry, keyboard form validation, explicit initiation readiness and permanent freeze after reload.
- Seven distinct backend fixture projections per width: INITIATED, PENDING, coherent SUCCESS/PAID, FAILED, CANCELLED, late SUCCESS/reconciliation and inconsistent SUCCESS/PENDING. No unsupported Ticket/QR/invoice or technical verification copy.
- Reduced-motion loading, safe unavailable status, 44px native recheck target, visible focus, keyboard GET recovery, focus restoration and no focus stealing.
- Unknown identity, forged direct-return query/hash rejection, frozen Summary blocking, back navigation and zero financial writes.

The unchanged 71 Payment cases also cover known-attempt identity/ownership, allowlisted navigation, lost initiation response, expiry/freeze, stale reads, malformed/network/5xx/429 failures, mismatched IDs/amounts, login resume, independent tabs, bounded reads, late results and interrupted return. Assertions remain intact.

### Responsive and visual QA

Widths: **390px mobile, 768px tablet, 1440px desktop**, browser height 1000px with full-page captures. New cases assert Vietnamese document language, no horizontal overflow, heading clearance below the shared header and native focus/touch-target behavior. Long Vietnamese snapshot labels and unusually large exact amounts wrap without changing data. Decorative skeleton animation is disabled under reduced motion.

Desktop adopts Stitch's main-column/summary-sidebar hierarchy; mobile/tablet stack the same information. Success is green only after the existing coherence service allows it; failure is red, cancellation/uncertainty neutral and pending/reconciliation amber.

The 12 new cases in the full regression have passed. Their **39 full-page screenshots** are archived in `frontend/target/customer-booking-payment-stitch-ui-2026-10-11/final-screenshots/`, with source paths, dimensions, fixture classification and SHA-256 hashes in `manifest.json`. Actual rendered Summary and return views at all three widths were inspected, including frozen composition, coherent success, failure, reconciliation, loading and safe unavailable feedback. Representative artifacts:

| Width | Booking Summary | Payment result |
|---|---|---|
| 390px | [Summary](../../frontend/target/customer-booking-payment-stitch-ui-2026-10-11/final-screenshots/summary-390-editable.png) | [Coherent success fixture](../../frontend/target/customer-booking-payment-stitch-ui-2026-10-11/final-screenshots/return-390-success.png) |
| 768px | [Summary](../../frontend/target/customer-booking-payment-stitch-ui-2026-10-11/final-screenshots/summary-768-editable.png) | [Reconciliation fixture](../../frontend/target/customer-booking-payment-stitch-ui-2026-10-11/final-screenshots/return-768-reconciliation.png) |
| 1440px | [Frozen Summary](../../frontend/target/customer-booking-payment-stitch-ui-2026-10-11/final-screenshots/summary-1440-frozen.png) | [Confirmed failure fixture](../../frontend/target/customer-booking-payment-stitch-ui-2026-10-11/final-screenshots/return-1440-failed.png) |

These local evidence files are ignored runtime artifacts, not new production assets or provider proof. Exact-value stress fixtures can wrap long IDs/amounts inside narrow nested cards; no truncation, numeric conversion or horizontal scrolling is introduced. Existing UTC labels and the exact formatter's separators are retained rather than changing financial/time formatting during visual implementation.

### Preservation evidence

`preservation-final.json` checks all **668 tracked entry files**: only the five listed presenters differ; the other 663, including old tests, services/hooks, Auth/session, financial validators, API readers, route/layout files, shared foundation, packages/lockfile, backend, migrations, `.stitch` and historical documents/reports, match their entry hashes. The index and HEAD also match entry.

TypeScript AST comparison confirms the original `onClick`/`onSubmit`/`onChange` handlers and calls to Booking/Payment/Promotion authority helpers are identical. Original effects, including return query/hash clearing and selected-identity handling, are retained. The one additional effect is the documented keyboard-focus recovery in the status presenter. This structural evidence supplements browser regression; it does not replace server authorization or financial verification tests.

### Evidence and external boundaries

| Evidence category | Result / limits |
|---|---|
| A — Frontend presentation/return/status/recovery, HTTP-fixture browser tests | PASS — focused 83/83 and full 250/250. These fixtures are explicitly labeled and do not prove a financial event |
| B — Real backend status/query integration regression | NOT RUN in this frontend-only phase; historical 294 backend tests are not relabeled as fresh results |
| C — Actual VNPAY Sandbox return | NOT RUN |
| D — Actual verified signed callback | NOT RUN |
| E — Actual Payment SUCCESS | NOT RUN |
| F — Actual Booking PAID | NOT RUN |

No Neon/database transaction or live Sandbox flow was attempted; scheduling/catalog/financial data, merchant configuration and flags were not changed to create proof. The earlier read-only preflight and provider limitations remain historical evidence in the existing Payment report, not a new check here. Browser screenshots contain only HTTP fixtures, with unexpected callback fields removed before capture. No real credentials or signed provider URL are exported.

## 9. Requirement Reconciliation

**PASS for implementation/preservation and regression:** the approved Phase 2 scope maps to existing real routes and presenters, uses the shared design foundation and retains backend financial authority. No service/API/validator/hook contract or business state machine is modified. Final TypeScript, lint, build, 138 unit tests, focused 83 browser cases and full 250 browser cases pass. Responsive QA, preservation checks and report/convention reconciliation pass within the stated evidence limits.

**NOT APPLICABLE:** new payment provider, production payments, frontend IPN/QueryDR/finalization, manual financial changes, Ticket/QR/My Bookings integration, operational/Admin redesign, backend/schema/deployment/configuration changes.

## 10. Deviations / Conflicts

Intentional approved reference adaptations follow the assessment and user boundaries:

- N01 has poster/duration/age/format/personal fields, VAT/service-fee concepts and a design timer that are not supplied by the current Booking projection. The implementation uses actual labels, a decorative glyph and original authoritative expiry/totals.
- N02's bank networks/test cards/merchant or PCI/security claims are not contract evidence and are omitted.
- N03's IPN/QueryDR/signing/audit stream, 5–30-second guarantee, fixed ten-minute period and refund/Ticket promises are omitted. Only safe stored status/read guidance is exposed.
- N04's Ticket/QR, bank authorization, invoice, SMS/email promises and unsupported navigation remain deferred. There is no financial demo state in a real route.
- The four supplied references are desktop exports; mobile/tablet adaptations use existing information and controls. They are responsive implementations, not newly approved Stitch mobile designs.

Existing convention conflicts: the System Analysis DOCX and Project Scope filenames retain their historical naming. They are read-only evidence; no mass renaming or document rewrite is performed. No new convention exception is requested or introduced.

## Convention Compliance

Checked against [canonical project conventions](../development/project-conventions.md), including this report's name, links and placement.

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | Existing feature/test folders; new lowercase kebab-case TSX/spec filenames; required dated report filename |
| Code naming and imports | PASS | PascalCase presenters, camelCase refs/helpers; existing `@/` imports; TypeScript/lint PASS |
| Domain terminology/statuses | PASS | Booking/Seat Unit/Concession/Promotion/Payment terms retained; existing UPPER_SNAKE_CASE business enums unchanged |
| Design/language conventions | PASS | Phase 1 semantic Nocturne tokens/fonts/native primitives; Vietnamese UI copy; fixture display names are data |
| Route/API convention | PASS for preservation | Existing routes, request shapes, ownership and safe navigation; no new endpoint or standalone Payment route |
| Database convention | NOT APPLICABLE | No database/backend/migration changes; V12 remains source migration head |
| Tests | PASS | 12 new explicitly labeled HTTP-fixture cases; 138 unit and full 250 browser cases pass; no old test/config changes, skips or retries |
| Documentation convention | PASS | New report uses task template, actual IDs, scoped limitations and evidence; local links/UTF-8/structure checked; historical docs/contracts/reports unchanged |
| Git/environment | PASS | Final preservation manifest confirms unchanged HEAD/index; no staging, commit, deployment, dependency/environment or secret change |

## 11. Known Limitations

- Actual VNPAY interoperability and verified financial SUCCESS/PAID are not established by this presentation phase. No external provider result is claimed from fixtures.
- Unknown frozen-attempt identity still requires support or the original known-ID tab/link; there is no approved latest/list attempt endpoint. A fixed backend redirect cannot prove that a callback corresponds to a tab hint.
- The status GET does not supply a payment reference, provider deadline, currency or attempt creation timestamp; the UI does not invent them. Known initiation/submission receipt details remain available only under the existing validated receipt rules.
- Current labels in the Booking projection are not historical poster/catalog metadata. Saved financial/composition snapshots remain historical; their distinction is stated in the context card.
- Screenshot comparison is visual QA, not pixel-identical reproduction or independent accessibility certification. No separate Stitch mobile variants were supplied.
- Ticket/Booking QR/My Bookings remain outside this phase even if the backend's verified paid projection contains fulfillment fields.

## 12. Next Recommended Step

Separately approve Phase 3 only after auditing actual backend PAID/issuance/ownership contracts for Real Customer Ticket/Booking QR and My Bookings. Independently authorize any future live Sandbox eligibility/configuration verification. This task does not begin either activity.
