# Smart Cinema Implementation Report

## 1. Task Information

Task: Customer Seat Selection frontend.
Date: 2026-09-27.
Module: Customer / Seat.
Type: Frontend implementation and verification.
Status: COMPLETE — all final verification checks PASS for the authorized local frontend preview. Authoritative Seat/Hold integration remains deferred.

## 2. Requested Work

Implement the canonical Seat Selection route with Movie/Cinema/Showtime context, an isolated typed local Seat adapter, Hall map and legend, standard/couple units, selection/recovery states, summary and a clearly non-authoritative countdown. Continue toward Concession without implementing Concession, real Holds, Booking, Payment, backend endpoints or migrations.

## 3. Documents Reviewed

- [Development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), frontend workflow, applicable UI/UX, coding, traceability, documentation and convention rules.
- [Project conventions](../development/project-conventions.md), frontend application instructions, installed Next.js page/useSearchParams guidance and package/test configuration.
- [SRS v1.2](../srs/srs-v1.2.md), sections 3.5, 5.6 and 6.1; Showtime start cut-off from FR-SHOWTIME-008.
- [BRD v1.2](../brd/brd-v1.2.md), Seat availability/holding and unit ticketing; [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md), sections 21–24.
- System Analysis & Design v1.1: UC-CUS-009 View Seat Map, UC-CUS-010 Hold Seats and BRULE-SEAT-001–005. The full Hold use case remains deferred.
- [Approved design decisions](../db/database-design-decisions-v1.0.md), section 3: one indivisible COUPLE Seat for two guests.
- [Screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md), [implementation plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md), current Showtime/Movie/Cinema implementations and [Showtime report](2026-09-27_showtime-selection-frontend_report.md).
- [Stitch visual guidance](../../.stitch/DESIGN.md), inventory/metadata and live read-only Seat Selection reference: project `1208499799798658711`, screen `fdea388b4b24406799ab087b31239835`.
- Historical Project Scope Seat/hold sections, interpreted under the current approved design rather than its older Redis/QR assumptions.

## 4. Requirements Traceability

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| SRS v1.2 FR-SEAT-001/004; BRD v1.2 BR-017 | Seat map and availability per Showtime | Yes | PARTIAL: typed local map/state presentation; server authority deferred |
| SRS v1.2 FR-SEAT-003; adopted COUPLE decision | Seat types and indivisible couple unit | Yes | PASS for requested STANDARD/COUPLE scope; VIP UI not introduced |
| SRS v1.2 FR-SEAT-008/009; BRD v1.2 BR-019 | Hold countdown and expiration | Yes | PARTIAL: explicit preview countdown/expiry only; no actual Hold |
| SRS v1.2 FR-SEAT-012/017 | Sold/unavailable Seats cannot be acquired | Yes | PASS for local selection guards; server enforcement deferred |
| SRS v1.2 FR-SEAT-016 | Reject stale selections | Yes | PARTIAL: current map/context/deadline validation; no realtime server state |
| SRS v1.2 FR-SHOWTIME-008 | Stop progression when Showtime starts | Yes | PARTIAL: preview local time check; server validation remains necessary |
| System Analysis & Design v1.1 UC-CUS-009 | View Seat Map | Yes | PASS for local preview presentation |
| SRS v1.2 section 6.1; user task | Showtime → Seat → Concession flow | Yes | PASS for Seat scope; Concession stops at explicit preview handoff |

No new requirement IDs or persistent Seat Unit entity were introduced. Local countdown state does not fulfill Hold ownership, exclusivity, acquisition/release or persistence requirements.

## 5. Implementation Summary

### Route and context

Added `/showtimes/[showtimeId]/seats`. Showtime Continue now navigates there with string `movieId`, `cinemaId`, `date` and optional catalog `from` query state. The context loader reuses the public Movie detail client and existing local Cinema/Showtime adapters. Missing/invalid parameters, mismatched date/Cinema/Showtime, closed branch, sold-out/past Showtime and unavailable Movie block the map. Transient Movie failures can retry.

Change Showtime retains the date, selected Showtime and catalog return context. The route does not trust display names or Seat IDs from query parameters. The mock schedule is generated for the requested context; this checks local fixture consistency, not a real persisted Movie/screening association.

### Seat representation and selection

The Seat adapter returns one typed item per sellable Seat. Sample layout has 32 STANDARD units and four COUPLE units across five rows, with a central aisle. COUPLE labels such as `E1-2` represent one ID and one button spanning two visual positions; separate E1/E2 options do not exist. Unit count and guest capacity are displayed separately. No price is inferred by doubling a standard-seat amount.

Fixture availability uses existing vocabulary `AVAILABLE`, `BOOKED` and `UNAVAILABLE`; BOOKED displays as Sold. Selected is local UI state and does not mutate a Seat to HELD. Sold/unavailable units are disabled. Final continuation validates nonempty, unique IDs, availability, Hall/Showtime membership, deadline and future Showtime before preparing a typed handoff. Unknown, stale, duplicate or foreign units cannot continue.

### Preview countdown and Concession boundary

First selection starts a ten-minute in-memory countdown demonstration. Adding/removing some units does not extend its deadline. Removing the last unit or clearing selection returns to Not started. Expiration shows a recovery message, removes the active selection display, disables selection/continuation and closes any open handoff. Restart preview clears the old selection; it does not extend a server Hold. Reload, navigation away or a replaced map clears the in-memory selection/deadline, as stated in the UI.

Time is refreshed every second and on window focus; selection/continuation checks also use the current timestamp at the click. Showtime start removes the map even when the preview countdown has time left. All timing uses local preview time, not an authoritative server clock.

Continue opens a Concession Selection stopping-point dialog with the chosen units and context. The typed handoff carries Movie/Cinema/Showtime/Hall IDs, Seat Unit IDs and guest count. It creates no Booking ID, Concession URL, Hold record, Payment or exclusive seat claim. No local/session storage is used for this countdown.

### Visual implementation and integration

Preserved the canonical dark shell, compact screening context, curved screen indicator, row labels, aisle, green selected units, couple-unit treatment and amber Continue action. Desktop places a sticky summary beside the map; mobile stacks the summary below an independently scrollable map so Seat buttons keep useful touch targets. Native buttons expose pressed/disabled state and full unit/type/status labels; the legend uses text and symbols as well as color.

Extracted the existing Movie-page shell into shared `CustomerDiscoveryLayout` for Movie and Showtime/Seat route families. Header/Auth implementation is unchanged. Shared `PreviewDialog` now explicitly restores its previous focused element after unmount, addressing focus return discovered during Seat browser testing.

Excluded sample prices/totals, fabricated seat quotas, zoom controls, VIP-specific behavior and other unrequested prototype features. Preview scenarios are available through frontend-only `seatPreview=empty|error|unavailable`; the error scenario succeeds on retry. These are adapter scenarios, not backend parameters or domain states.

## 6. Files Created

- `frontend/src/features/seat/seat.types.ts`
- `frontend/src/features/seat/seat-service.ts`
- `frontend/src/features/seat/seat-selection-screen.tsx`
- `frontend/src/features/seat/seat-service.test.ts`
- `frontend/src/app/(public)/showtimes/[showtimeId]/seats/page.tsx`
- `frontend/src/app/(public)/showtimes/layout.tsx`
- `frontend/src/components/layout/customer-discovery-layout.tsx`
- `frontend/test/e2e/seat-selection.spec.ts`
- This report.

## 7. Files Modified

- `frontend/src/features/showtime/showtime-selection-screen.tsx`: navigate to Seat Selection instead of its earlier stopping-point dialog.
- `frontend/src/app/(public)/movies/layout.tsx`: reuse extracted shared shell.
- `frontend/src/components/ui/preview-dialog.tsx`: explicit focus restoration.
- `frontend/test/e2e/showtime-selection.spec.ts`: verify new Seat route/return behavior.
- `frontend/package.json`: include Seat unit tests; no dependency changes.
- `docs/ui-ux/customer-frontend-implementation-plan-v1.0.md` and `docs/ui-ux/screen-spec/customer-screen-map-v1.0.md`: nine existing route patterns, six remaining target routes; Seat preview distinguished from real Hold integration.

Existing worktree changes were preserved. No historical report was overwritten; no commits were created.

## 8. Verification

| Check | Result |
|---|---|
| TypeScript | PASS: `pnpm exec tsc --noEmit`; production build also checks TypeScript |
| ESLint | PASS: final `pnpm lint`, exit 0, no errors or warnings |
| Unit tests | PASS: `pnpm test`, 27 passed, including four Seat adapter/selection tests |
| Build | PASS: `pnpm build`; canonical `/showtimes/[showtimeId]/seats` route included |
| Playwright | PASS: full `PLAYWRIGHT_CHANNEL=msedge` / `pnpm test:e2e` suite, 32 passed (1.3 minutes), exit 0; includes all six Seat scenarios |
| Visual inspection | PASS: final desktop 1440x1000 and mobile 390x844 screenshots reviewed against canonical Stitch; map, couple units, legend, summary and preview text verified; horizontal scrolling stays inside the mobile map |
| Preservation | PASS: 98 baseline SHA-256 hashes unchanged across backend source/tests/migrations, Stitch files, frontend Auth, shared header and BRD/SRS |
| Documentation | PASS: task Markdown links, referenced implementation paths, whitespace and report conventions checked; `git diff --check` passed |
| Live backend/database | NOT RUN: task explicitly uses local Seat/Hold preview; browser Movie responses use isolated contract fixtures |

Unit coverage: whole-couple identity, guest/unit totals, no half-unit IDs, fixed countdown deadline, exact expiry, sold/unavailable/unknown/duplicate/foreign/stale choices, start cut-off, fixture isolation, no network calls, cancellation and retry.

Browser coverage: Showtime navigation/context, map loading, whole-couple toggling, disabled units, preview countdown/expiry/restart, Concession handoff, invalid and unavailable context, transient recovery, Showtime start, keyboard controls, horizontal map scrolling, no page-wide overflow, focus return and reload clearing. Existing Home, Auth account menu, Movie, Cinema and Showtime regression scenarios remain in the suite.

Initial runs exposed a test reading the URL before navigation completed, a loading assertion registered after the short loading state ended, and dialog focus return on unmount. Assertions now wait for navigation and observe loading during the transition; dialog cleanup restores focus. Informational Node module-type/terminal-color warnings remain unrelated to test outcomes. Generated screenshots stay under ignored `frontend/test-results/`.

### Final verification confirmation

Final checks completed on 2026-09-27 against the current implementation. TypeScript, ESLint, 27 unit tests, the full 32-test Playwright suite, production build, final desktop/mobile visual review and documentation/link/whitespace checks all PASS. No failing check remains. The finalization request introduced no new feature or scope change.

**COUPLE atomicity: PASS.** Each pair has one Seat ID and one selectable button. Selecting E1-2 adds exactly one Seat Unit and two guests; deselecting it removes the whole unit. Neither a separate E1 nor E2 selection exists. Fixture tests verify all four pair labels, and the selection guard rejects a half-unit identifier. Sold/unavailable couple units remain disabled. A standard unit plus a couple unit is two Seat Units for three guests.

Final visual artifacts: `frontend/test-results/seat-selection-keyboard-mo-8a2ba-ion-without-claiming-a-Hold/seat-selection-desktop.png` and `seat-selection-mobile.png` in the same directory. These are local generated evidence, not committed design assets. The mobile capture intentionally shows the map after horizontal scrolling to the right-hand couple units; the page itself has no horizontal overflow.

## 9. Requirement Reconciliation

- PASS: canonical route and visual reference; Movie/Cinema/Showtime context retained with string IDs.
- PASS: isolated local adapter, Hall map/legend, standard/couple units and requested states.
- PASS: couple unit selected/deselected atomically; unit count and guest count remain distinct.
- PASS: preview countdown/expiration clearly labeled and unable to authorize Hold/Booking behavior.
- PASS: only locally valid selections reach the Concession stopping point.
- PASS: no backend endpoints, persistence, migrations, Concession implementation, Booking or Payment changes.
- PARTIAL: full Seat availability, VIP presentation, real Hold acquisition/ownership/expiry and concurrent/realtime behavior await their approved service scope.

## 10. Deviations / Conflicts

SRS requires authoritative server availability and Hold deadlines. The user explicitly authorized local mock UI and countdown; this implementation labels that boundary and does not claim those requirements are fully implemented. Ten minutes demonstrates the documented default; a future integration must consume server configuration and expiry instead.

The canonical Concession route requires a real Booking ID, but Booking creation is prohibited in this task. Continuation therefore stays in a preview dialog and does not fabricate a Booking or route. The user requested STANDARD and COUPLE for this slice; broader SRS VIP support remains deferred rather than silently removed.

Existing Convention Conflicts: none introduced in task files. Historical filenames, older project-scope Redis wording and unrelated Home/Profile caveats were preserved. No convention exception was required or approved.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md), including this report.

| Area | Result | Notes |
|---|---|---|
| Folder naming | PASS | `features/seat`, shared layout placement; Next.js dynamic segments |
| File naming | PASS | Kebab-case sources/tests; required page/layout names; dated report |
| Code naming | PASS | PascalCase components/types, camelCase functions and uppercase duration constant |
| Domain terminology | PASS | Seat Unit is a UI representation of Seat; no new persisted entity or state |
| Route/import conventions | PASS | Canonical plural route, camelCase parameter, application aliases |
| Component architecture | PASS | Fixture/selection logic behind service boundary; shared shell/components and semantic tokens |
| API convention | NOT APPLICABLE | Existing Movie reads only; no new endpoint |
| Database convention | NOT APPLICABLE | No schema/persistence changes |
| Documentation convention | PASS | Current map/plan updated; historical reports preserved; new report name follows standard |

## 11. Known Limitations

Local fixtures cannot prove live screening associations, seat availability, exclusivity or pricing. The countdown can be reset by leaving the page and grants no entitlement. Normal app usage needs the existing Movie API; browser verification uses Movie fixtures. No live concurrency, complete accessibility audit or full booking journey is certified by this UI task.

## 12. Next Recommended Step

Scope Concession Selection separately, or finalize Seat/Hold service contracts before replacing the local adapter and timer with authoritative ownership/expiry behavior. Do not use the preview handoff as proof of a Hold or permission to create a Booking.
