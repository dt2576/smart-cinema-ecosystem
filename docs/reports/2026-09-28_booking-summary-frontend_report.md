# Smart Cinema Implementation Report

## 1. Task Information

- Task: Customer Booking Summary frontend UI with embedded Promotion preview.
- Implementation / checks: 2026-09-27; final report: 2026-09-28.
- Module / actor: Frontend Booking / Customer.
- Type: Implementation and verification using typed local preview state.
- Final status: **COMPLETE — PASS for the requested frontend preview scope.**

## 2. Requested Work

Implement the canonical Summary preview with screening, whole Seat Units, guest count, selected Concessions, local subtotals/grand total and embedded Promotion states. Preserve the original Seat deadline, block expired/started selections, and continue only to a Payment Method handoff. Do not create a Booking, endpoints, Payment, composition freeze or backend changes.

## 3. Documents Reviewed

- [Development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [frontend workflow](../../.agent/workflows/FRONTEND_WORKFLOW.md), applicable coding, UI/UX, document, traceability and convention rules.
- [Project conventions](../development/project-conventions.md), [frontend instructions](../../frontend/AGENTS.md) and installed Next.js layout/pathname documentation.
- [Canonical screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md), [implementation plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md), [Stitch visual guidance](../../.stitch/DESIGN.md).
- Live Stitch project `1208499799798658711`, canonical Summary screen `52aa55f16d2640d68efb6c399d5fb990` — retrieved and visually inspected read-only. Existing Movie/Concession images are reused; no Stitch edit or new image asset.
- [SRS v1.2](../srs/srs-v1.2.md) §§3.6, 3.8, 6.1 and NFR-UX-005; [BRD v1.2](../brd/brd-v1.2.md) Booking/Promotion requirements.
- [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md) §§29–29A, [Project Scope v1.0](<../project-scope/project-scope v1.0.md>) Booking/Promotion boundaries.
- [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx), UC-CUS-015 Apply Promotion, UC-CUS-017 Review Booking Summary and related Booking calculation.
- [Approved database decisions](../db/database-design-decisions-v1.0.md) §6: first-payment composition freeze; current Seat and Concession source/tests and [Concession report](2026-09-27_concession-selection-frontend_report.md).

## 4. Requirements Traceability

| Reference | Applicable behavior | Result |
|---|---|---|
| SRS §6.1, NFR-UX-005; UC-CUS-017 | Screening, Seats/amount, Concessions/amount, Promotion, discount and final amount | PASS for labeled preview presentation |
| FR-BOOKING-002/003; approved COUPLE decision | One Showtime; whole Seat Units and guest capacity | PASS preview validation; no half-unit representation |
| FR-BOOKING-008; UC-CUS-015; BR-034 | Apply Promotion and specific rejection feedback | PASS for local applied/invalid/expired/ineligible/error/retry states; backend validation deferred |
| FR-PROMO-002/004/005/006 | Validity, eligibility/status and server recalculation | PARTIAL system coverage: UI outcomes demonstrated; no actual policy/server authority implemented |
| FR-PROMO-001/003 | Administration and usage limits | NOT APPLICABLE to this UI slice; no administration or usage reservation |
| FR-BOOKING-006/007/014/015; BR-031/035/066/067 | Pricing snapshots and authoritative totals | Deferred; local sample amounts are explicitly non-authoritative and not persisted |
| FR-BOOKING-016/017 | Editable Concessions before Payment | PASS preview return/edit/recalculation; real Booking command handling deferred |
| FR-SEAT-008/009; FR-BOOKING-005 | Expiry blocks progression | PASS local deadline and Showtime-start guard; real Hold/Booking expiry deferred |
| FR-BOOKING-018 and approved first-payment decision | Freeze at actual first Payment initiation | PASS scope boundary: no initiation occurs, so preview composition remains editable |

## 5. Implementation Summary

### Route and state

- Added static **`/bookings/preview/summary`**, using the canonical Summary screen and existing Customer discovery layout. `preview` is a literal route segment, not a Booking identifier. Future `/bookings/[bookingId]/summary` still requires a real owned Booking.
- The existing memory provider now spans Concessions and Summary. It carries Movie, Cinema, Showtime, Hall, map, original Seat selection/expiry, catalog data and quantities. String IDs are preserved end-to-end.
- Concession Continue navigates to Summary. Edit/Back to Concessions restores quantities and permits edits. Returning to Seats requires reselection. Reloading or leaving both preview routes clears context; direct URL parameters cannot create it.
- Summary displays whole Seat Units, guest count and item quantities. The service validates unavailable, duplicate/mixed units, invalid quantities, unsupported add-on categories and unsafe monetary arithmetic.

### Local pricing and Promotion adapter

- `booking-summary-service.ts` owns sample Seat pricing and summary calculation. STANDARD is 90,000 VND per unit; COUPLE is independently 150,000 VND per whole unit. These are UI fixtures, not an approved production tariff. A Couple plus Standard remains two units / three guests, costing 240,000 sample VND before add-ons.
- Selected Concession names, prices and quantities come from the existing local Concession adapter/context. The Summary shows separate Seat and Concession subtotals, Promotion discount and **Preview grand total**, labeled non-authoritative throughout. No fees are invented.
- `PromotionPreviewService` is abort-aware and local only. `DEMO10` demonstrates 10% of Seat + Concession subtotal rounded down to whole VND. `DEMOEXPIRED` and `DEMOINELIGIBLE` demonstrate their named rejection states. `DEMORETRY` fails its first completed request and applies the same 10% fixture on retry. Other/empty codes are invalid. These rules are disclosed under “Sample codes and preview rules.”
- One code is demonstrated at a time. Editing/removing it cancels pending work and clears any old discount. Unmounted requests and stale responses cannot replace current state. Returning to Summary after Concession edits requires applying the code again to the revised subtotal.
- Invalid/expired/ineligible codes leave no applied Promotion and permit continuing without a discount. A pending request or transient error blocks Continue until completion, retry, editing or removal resolves it.

### Expiry and Payment boundary

- Countdown derives from the original Seat `expiresAt`. Apply, remove, retry, route transitions and Concession edits do not write a new deadline.
- Both rendered state and action-time checks use existing Seat handoff validation, including Showtime start. Async Promotion responses are checked again at completion. Expiry removes the applied preview discount, closes the Payment handoff and disables progression/Promotion controls; recovery returns to Seats.
- Continue opens a **Payment Method preview handoff dialog** only. No Payment route, provider options, transaction, Booking ID or success state is implemented. Closing it permits edits: composition is not frozen because actual first-payment initiation has not occurred.

## 6. Files Created

- `frontend/src/app/(public)/bookings/preview/summary/page.tsx`
- `frontend/src/features/booking/booking-summary-screen.tsx`
- `frontend/src/features/booking/booking-summary-service.ts`
- `frontend/src/features/booking/booking-summary.types.ts`
- `frontend/src/features/booking/booking-summary-service.test.ts`
- `frontend/test/e2e/booking-summary.spec.ts`
- This report.

## 7. Files Modified

- `frontend/src/features/concession/concession-preview-provider.tsx` — shared two-route memory state and selected Concessions.
- `frontend/src/features/concession/concession-selection-screen.tsx` — real Summary navigation, quantity restoration and editable return.
- `frontend/test/e2e/concession-selection.spec.ts` — replaces prior Summary-dialog assertions with route/return assertions; retains expiry coverage.
- `frontend/package.json` — includes four new unit tests; no dependency changes.
- [Screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md) and [implementation plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md) — current coverage and deferred production gates.

No files moved. Existing dirty/untracked changes and historical reports were preserved.

## 8. Verification

Commands ran in `frontend/` on the final implementation unless otherwise stated.

| Check | Final result |
|---|---|
| TypeScript | **PASS** — `pnpm exec tsc --noEmit`, exit 0 |
| ESLint | **PASS** — `pnpm lint`, exit 0, zero errors/warnings |
| Unit tests | **PASS** — `pnpm test`: 34 passed, 0 failed, including four new Summary/Promotion tests |
| Production build | **PASS** — `pnpm build`, exit 0; static Summary route generated |
| Full Playwright | **PASS** — `$env:PLAYWRIGHT_CHANNEL='msedge'; pnpm test:e2e`: 43-test suite; final `test-results/.last-run.json` reports `passed` with no failed tests; no skipped/only tests |
| Desktop/mobile visual review | **PASS** — final screenshots inspected at 1440×1000 and 390×844 viewports; screening, Seat/Concession panels, embedded Promotion, total and expired state; no horizontal page overflow |
| Keyboard / navigation | **PASS** — Enter applies code, Escape restores focus from handoff, editable Concession return, reload/direct-URL recovery and history invalidation |
| Race / deadline checks | **PASS** — pending-code edits/removal, stale responses, retry without extension, exact expiry and Showtime start, Payment handoff closure |
| API scope | **PASS** — browser journey requests only the existing Movie detail API; adapters contain no Booking/Promotion backend calls |
| Preservation | **PASS** — 136 baseline file hashes unchanged: backend/migrations, Auth, shared header, BRD/SRS, Stitch references and existing reports |
| Documentation / whitespace | **PASS** — local links, naming, final newlines, conflict markers and whitespace checked for task files; `git diff --check` passes |

The initial full browser run passed 39 tests and failed four new assertions because the unscoped alert locator also matched Next.js's route announcer. Scoping assertions to the main content fixed the test ambiguity; the complete suite was rerun successfully. Initial ESLint purity findings were resolved by passing the event-time clock into the async apply handler, including its completion checks. Final lint/build checks pass.

The final Playwright process finished across a user continuation; its terminal process handle was no longer available when polled. The completed `.last-run.json` confirms the successful full run. Final screenshots were read directly from that run. No application change followed the successful production build; later changes affected tests/documentation only.

Existing informational Node module-type and terminal-color warnings remain. Browser tests use Movie fixtures and local domain adapters; they do not establish live Booking integration.

Visual artifacts under ignored `frontend/test-results/`:

- `booking-summary-desktop-mo-ef50b-keyboard-Promotion-controls/booking-summary-desktop.png`
- `booking-summary-desktop-mo-ef50b-keyboard-Promotion-controls/booking-summary-mobile.png`
- `booking-summary-Promotion--eea93-and-recovery-clears-context/booking-summary-expired-mobile.png`

## 9. Requirement Reconciliation

**PASS for requested UI scope:** canonical preview route, screening/Seat/guest/Concession preservation, sample subtotals and grand total, embedded Promotion outcomes, unchanged deadline, expiry/Showtime-start blocking and valid-only Payment Method handoff.

**COUPLE semantics PASS:** the same whole unit ID remains attached to the preview; it counts two guests and receives one independent whole-unit price. No half-seat controls or per-person split were added.

**Scope preservation PASS:** no real Booking identity, Hold persistence, authoritative total claim, endpoints, Payment implementation, composition freeze, loyalty, wallet, membership, coupon administration, backend or migration changes.

## 10. Deviations / Conflicts

- The canonical production URL needs an owned Booking, which this task forbids creating. The existing static preview convention is extended to Summary; the screen map now records nine target routes plus two static preview routes. Six production targets remain missing.
- SRS §3.8 explicitly leaves Promotion discount scope to a Business Rules Specification. Actual eligibility, rounding, allocation and usage policy remain unresolved. The disclosed 10% fixture and sample Seat prices demonstrate UI only and do not resolve those policies. This boundary was stated before implementation.
- First-payment freeze is retained as the approved future rule, with no early freeze on opening the handoff. No verified-session/secure-payment claims or specific payment methods were copied from Stitch.
- Existing historical file naming and dirty work remain untouched; no new convention exception was introduced.

## Convention Compliance

Reviewed before and after implementation against [project conventions](../development/project-conventions.md), including this report.

| Area | Result | Evidence |
|---|---|---|
| Folder/file names | PASS | Kebab-case feature/test filenames; framework route files; dated report |
| Code/import naming | PASS | PascalCase components/types, camelCase handlers, constants and project aliases |
| Routes | PASS | Static lowercase preview route, no invented dynamic Booking ID |
| Domain terminology | PASS | Booking, Promotion, Concession, Showtime, Hall and Seat Unit retained |
| Status vocabulary | PASS | Promotion outcomes documented as UI fixtures, not new persisted domain statuses |
| Architecture | PASS | Summary arithmetic and Promotion adapter separated from React UI; existing shared layout/dialog reused |
| API/database | NOT APPLICABLE | No new endpoint, backend code or schema |
| Documentation | PASS | Current map/plan reconciled, new report generated, source links and historical preservation checked |

## 11. Known Limitations

This preview uses browser memory/time and mock prices, so it grants no ownership or price guarantee. Production pricing, Promotion policy, usage limits, ownership, server expiry and freeze enforcement await backend contracts. Reloading loses the preview. Payment remains a handoff dialog. Browser verification used Microsoft Edge on Windows; other engines were not run.

## 12. Next Recommended Step

Implement the separately scoped Payment Method preview when requested. Real payment integration must use server-confirmed totals and enforce the approved first-payment composition freeze atomically; this UI preview provides neither guarantee.
