# Smart Cinema Implementation Report

## 1. Task Information

- Task: Customer Payment Method frontend preview.
- Date: 2026-09-28.
- Module / actor: Frontend Payment / Customer.
- Type: Implementation and verification with typed local preview data.
- Final status: **COMPLETE — PASS for the requested preview scope.**

## 2. Requested Work

Implement canonical Payment Method selection with reviewed Summary context, local method fixtures, one available selection, loading/empty/unavailable/retry states, original Seat expiry and Showtime-start guards. Continue toward Payment Processing without creating a Booking, Payment Transaction, provider request, composition freeze, Ticket or Booking QR.

## 3. Documents Reviewed

- [Development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [frontend workflow](../../.agent/workflows/FRONTEND_WORKFLOW.md), applicable coding, UI/UX, traceability, document and convention rules.
- [Project conventions](../development/project-conventions.md), [frontend instructions](../../frontend/AGENTS.md), installed Next.js layout, pathname and router documentation.
- [Canonical Customer screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md), [implementation plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md) and [Stitch visual guidance](../../.stitch/DESIGN.md).
- Live Stitch project `1208499799798658711`, Payment Method Selection screen `0cc11f6226c74b6291ef49660e63f748`: retrieved and screenshot inspected read-only. No designs, metadata or assets were modified.
- [SRS v1.2](../srs/srs-v1.2.md), Payment requirements §3.9 and Customer flow §6.1; [BRD v1.2](../brd/brd-v1.2.md) §4.8.
- [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md) §§30–32, [Project Scope v1.0](<../project-scope/project-scope v1.0.md>) §5.8.
- [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx), UC-CUS-018 Make Payment and server verification boundary.
- [Approved database decisions](../db/database-design-decisions-v1.0.md) §6 first-payment composition freeze; current Seat, Concession and Summary source/tests; [Summary report](2026-09-28_booking-summary-frontend_report.md).

## 4. Requirements Traceability

| Reference | Applicable behavior | Result |
|---|---|---|
| SRS §6.1; UC-CUS-018 | Customer selects a Payment method after review | PASS for local selection preview; actual transaction flow deferred |
| FR-PAYMENT-001; BR-036 | Only eligible Booking can initiate Payment | Preview validates its context before handoff; actual owned-Booking validation/initiation NOT IMPLEMENTED |
| FR-PAYMENT-002/012; BR-035 | Correct amount/currency and backend authority | PASS preview preservation: reviewed Seat/Concession amounts, Promotion and VND total remain consistent; no authoritative total claim |
| FR-PAYMENT-003; BR-037 | Configured sandbox provider | Typed local fixtures only; live provider configuration/integration deferred |
| FR-PAYMENT-004/006/007; BR-038/039 | Browser cannot establish verified success | PASS scope boundary: no success transition, callback or verification simulation |
| FR-PAYMENT-005/008–011/013–015 | Webhooks, failures, cancellation, idempotency, references, signatures, late results and audit | NOT APPLICABLE to method-only preview; no Payment lifecycle implemented |
| FR-SEAT-008/009; FR-BOOKING-005 | Expiry prevents progression | PASS original local deadline and Showtime-start guards; server ownership/expiry deferred |
| Approved COUPLE decision | One indivisible sellable unit for two guests | PASS whole IDs, unit count, guest count and independent whole-unit price preserved |
| FR-BOOKING-018; approved first-payment decision | Freeze at actual first Payment initiation | PASS: no initiation occurs, so no composition freeze is applied |
| FR-TICKET-001; Booking QR model | Issue only after verified Payment | PASS: no Ticket or Booking QR generated |

Production Payment requirements remain incomplete at system level. These results describe the authorized UI preview, not backend acceptance.

## 5. Implementation Summary

### Route and reviewed context

- Added static **`/bookings/preview/payment`** using the existing Customer layout. The literal `preview` segment is not a Booking ID; the owned-Booking production route remains deferred.
- Summary Continue now passes a typed reviewed view containing the current quote, applied Promotion or null, and preview total into memory, then navigates to Payment Method. The existing context retains Movie, Cinema, Showtime, Hall, whole Seat Units, guest count, selected Concessions and the original Seat expiry.
- Payment Method recalculates the local quote from current selections and checks it against the reviewed view before enabling selection/continuation. Changed composition, identities, quantities, prices, guest count or inconsistent discount/total are rejected.
- Returning to Summary restores its applied Promotion and total. Editing/removing/applying Promotion invalidates the prior review. Returning to Concessions also invalidates it, while quantities remain editable. Customer must Continue from Summary again before re-entering Payment Method. This review gate is not a composition freeze.
- Memory state spans Concessions, Summary and Payment Method only. Reload or leaving that flow clears it; returning to Seats requires reselection. URL parameters cannot fabricate a reviewed selection, method choice, total or Booking ID.

### Payment method adapter and UI

- `PaymentMethodService` owns an abort-aware local catalog. VNPay and MoMo are available sample options; “Other configured provider” demonstrates an unavailable option. These names follow the visual reference and establish no production provider support.
- Native radio controls permit exactly one available method; none is initially selected. Disabled/unknown/duplicate method identities cannot continue. Method selection is local to the page visit and does not alter the reviewed total or original expiry.
- `paymentPreview=empty|error|unavailable` supports frontend-only fixture scenarios, forwarded from the Seat preview entry. Unknown scenario values use the default. The error fixture fails its first completed load; retry succeeds. Aborted loads do not consume the failure.
- Loading, errors, empty lists and all-unavailable lists block Continue. Retry does not select a method, change totals or restart the deadline.
- The canonical horizontal method cards and right-side Order Summary are retained on desktop. Mobile stacks them with wrapping descriptions, native radio keyboard support and large clickable labels. Existing Movie poster, shared buttons, feedback, dialog and layout are reused.
- Summary displays screening context, whole Seat Units, guests, Concessions/quantities, separate subtotals, applied Promotion discount and clearly labeled non-authoritative VND total.

### Guards and handoff

- Both rendering and action-time validation check the original Seat selection deadline and Showtime start through the existing Seat handoff validator. The method must still exist and be available in the current adapter result.
- Expiry or Showtime start disables methods/Continue and closes an open Processing handoff. Recovery returns to Seat Selection; no timer reset or reservation claim is offered on Payment Method.
- Continue opens a **Payment Processing preview handoff dialog** only. It shows the selected method, screening/count and preview total, and explains that processing is not implemented. No provider call, transaction reference, real Booking ID, freeze marker, Payment result, Ticket or Booking QR is introduced.

## 6. Files Created

- `frontend/src/app/(public)/bookings/preview/payment/page.tsx`
- `frontend/src/features/payment/payment-method.types.ts`
- `frontend/src/features/payment/payment-method-service.ts`
- `frontend/src/features/payment/payment-method-service.test.ts`
- `frontend/src/features/payment/payment-method-screen.tsx`
- `frontend/test/e2e/payment-method.spec.ts`
- This report.

## 7. Files Modified

- `frontend/src/features/concession/concession-preview-provider.tsx` — three-route memory flow, reviewed Summary and invalidation rules.
- `frontend/src/features/booking/booking-summary-screen.tsx` — reviewed context handoff, real Payment Method navigation and Promotion restoration on return.
- `frontend/test/e2e/booking-summary.spec.ts` — replaces the previous method-dialog expectations with route/return assertions while preserving Summary expiry tests.
- `frontend/package.json` — registers three Payment service unit tests; no dependency changes.
- [Screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md) and [implementation plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md) — updated preview coverage and remaining integration gates.

No files moved. Earlier dirty/untracked work and all historical reports were preserved.

## 8. Verification

All frontend commands ran from `frontend/` on 2026-09-28.

| Check | Final result / evidence |
|---|---|
| TypeScript | **PASS** — `pnpm exec tsc --noEmit`, exit 0 |
| ESLint | **PASS** — `pnpm lint`, exit 0; zero errors/warnings |
| Unit tests | **PASS** — `pnpm test`, 37 passed, 0 failed; three new adapter/selection/review-consistency tests |
| Production build | **PASS** — `pnpm build`, exit 0; static Payment preview route generated |
| Full Playwright suite | **PASS** — `$env:PLAYWRIGHT_CHANNEL='msedge'; pnpm test:e2e`, 49 passed, 0 failed, 3.0 minutes, exit 0 |
| Desktop/mobile visual inspection | **PASS** — final screenshots inspected at 1440×1000 and 390×844 viewports; selected/unavailable options, context, totals and expired recovery; no horizontal page overflow |
| Keyboard / dialog | **PASS** — Space/arrow keys select one radio, disabled option skipped, Escape closes handoff and restores Continue focus |
| Context / edit regression | **PASS** — Promotion and total survive Summary return; changes invalidate the old review; updated Concessions can continue after review; no freeze |
| Deadline / invalid links | **PASS** — method changes and retry retain countdown; exact expiry/Showtime start block and close handoff; reload/history/direct URL cannot invent context |
| Network isolation | **PASS** — complete journey requests limited to existing Movie detail and local/test media; no unexpected backend/provider calls |
| Protected-file preservation | **PASS** — all 137 baseline SHA-256 hashes unchanged across backend/migrations, Auth, header, BRD/SRS, Stitch and existing reports |
| Documentation / whitespace | **PASS** — task Markdown links, file naming, final newlines, conflict markers and whitespace checked; `git diff --check` succeeds |

The full suite includes all previous Movie, Home, Cinema, Showtime, Seat, Concession and Summary tests plus six new Payment Method tests. It ran on the production server at port 3100, using Movie API fixtures and local domain adapters. No live Payment integration is claimed. Existing Node module-type and terminal-color notices remain informational; the PowerShell log wrapper displayed pnpm's stderr banner as a native-command notice, while the test process completed successfully.

Visual artifacts under ignored `frontend/test-results/`:

- `payment-method-canonical-P-307cd-ts-radio-keyboard-selection/payment-method-desktop.png`
- `payment-method-canonical-P-307cd-ts-radio-keyboard-selection/payment-method-mobile.png`
- `payment-method-method-chan-a5962-and-recovery-clears-context/payment-method-expired-mobile.png`

## 9. Requirement Reconciliation

**PASS for requested scope:** canonical preview route, complete reviewed context, typed local method adapter, exactly one available selection, loading/empty/unavailable/retry states, responsive reference layout, unchanged deadline/start-time guards and valid-only Processing handoff.

**COUPLE PASS:** E1-2 remains one indivisible unit for two guests. With A1, the flow preserves two Seat Units / three guests. Selected Concessions and applied DEMO10 retain the reviewed sample amounts: 240,000 Seat subtotal + 120,000 Concessions − 36,000 discount = 324,000 VND preview total across method changes and Summary return.

**Exclusions PASS:** no Booking ID, Payment Transaction, endpoints, external provider invocation, authoritative amount claim, early freeze, Ticket/Booking QR, backend changes or migrations.

## 10. Deviations / Conflicts

- The production canonical URL requires an owned Booking, while the task forbids creating one. The existing static preview route convention is extended to `/bookings/preview/payment`. Current coverage is nine target route patterns plus three static previews; six production target routes remain missing.
- The SRS requires configured providers and authoritative server amounts. Stitch sample provider names are therefore exposed only as local preview fixtures, with explicit labels. No real provider configuration, availability guarantee, wallet/account feature, payment QR or security claim was copied from the design.
- Actual first-payment initiation remains the atomic freeze boundary. Neither choosing a method nor opening the Processing handoff initiates Payment; the review gate does not freeze composition.
- Historical naming and existing dirty work remain unchanged. No new convention exception or business requirement change was introduced.

## Convention Compliance

Checked before implementation and after verification against [project conventions](../development/project-conventions.md), including this report.

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | Kebab-case feature/test files, framework route filename, new dated report |
| Code/import naming | PASS | PascalCase components/types, camelCase functions, uppercase constants and project aliases |
| Routes | PASS | Lowercase static preview path; no invented Booking parameter |
| Domain terminology | PASS | Payment Method, Booking, Promotion, Concession, Showtime, Hall and Seat Unit retained |
| Status/data strategy | PASS | Availability is a preview boolean; no new Payment lifecycle or persisted status |
| Architecture | PASS | Local method adapter and review validation separated from UI; existing layout/feedback/dialog reused |
| API/database | NOT APPLICABLE | No new endpoint, backend code or schema |
| Documentation | PASS | Current map/plan reconciled; new report, traceability, links and historical preservation checked |

## 11. Known Limitations

This is memory-only UI preview data using browser time, with no ownership, reservation or financial guarantee. Production providers, authoritative pricing/Promotion validation, actual first-payment freeze, processing and reconciliation require backend contracts. Reload loses context. Payment Processing is a handoff dialog only. Browser checks used Microsoft Edge on Windows; other engines were not run.

## 12. Next Recommended Step

Implement a separately scoped Payment Processing preview when requested. Real payment work must first provide owned-Booking eligibility, server totals, provider configuration, atomic first-initiation freeze and verified-result handling.
