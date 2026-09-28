# Smart Cinema Implementation Report

## 1. Task Information

Task: Customer Showtime Selection frontend.
Date: 2026-09-27.
Module: Customer / Showtime.
Type: Frontend implementation and verification.
Status: COMPLETE for the authorized local preview. Live service integration remains deferred.

## 2. Requested Work

Implement the canonical Showtime Selection route with Movie/Cinema context, isolated typed mock data, date selection, Hall groups, availability/recovery states and future/available-only continuation. Preserve Stitch appearance and responsive behavior. Do not implement Seat Selection, Seat Hold, Booking, backend endpoints or migrations.

## 3. Documents Reviewed

- [Development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), frontend workflow, coding/UI/UX/traceability/document rules and convention enforcement pointer.
- [Project conventions](../development/project-conventions.md), frontend application instructions and installed Next.js page/useSearchParams documentation.
- [SRS v1.2](../srs/srs-v1.2.md), sections 3.4, 5.7 and 6.1.
- [BRD v1.2](../brd/brd-v1.2.md), Showtime requirements BR-015/BR-016.
- [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md), sections 17–21; System Analysis & Design v1.1, Customer flow and UC-CUS-008 View Showtimes; project scope discovery/started-Showtime boundaries.
- [Screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md), [implementation plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md), [Movie contract](../api/movie-service-contract-v1.0.md) and [Cinema implementation report](2026-09-27_cinema-selection-frontend_report.md).
- [Stitch visual guidance](../../.stitch/DESIGN.md), inventory/metadata and live read-only screen `a808fb16fcad452696636be952ea70b1` in project `1208499799798658711`.
- Existing Movie API/types/components, Cinema adapter/route, shared dialog, request hook and frontend test configuration.

## 4. Requirements Traceability

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| BRD v1.2 BR-016; SRS v1.2 FR-SHOWTIME-006/007 | Discover Showtimes by Movie, Cinema and date; active Cinema | Yes | PARTIAL: mock presentation and context filtering; no authoritative service |
| BRD v1.2 BR-015; SRS v1.2 FR-SHOWTIME-008 | No Booking after Showtime starts; server time authoritative | Yes | PARTIAL: preview continuation blocked at start; no Booking or server enforcement implemented |
| System Analysis & Design v1.1 UC-CUS-008 | View Showtimes | Yes | PARTIAL: date/Hall selection preview implemented |
| SRS v1.2 section 5.7 | Showtime identity, Movie, Hall and time context | Yes | PASS for the scoped UI subset; not a new complete service DTO |
| SRS v1.2 section 6.1 | Cinema → Showtime → Seat Map | Yes | PASS for authorized Showtime step; Seat Selection remains deferred |
| User task | Sold-out/past/loading/empty/retry and responsive local preview | Yes | PASS |

No IDs, persisted status values or business requirements were invented. Full Showtime requirements remain unfulfilled until server integration is implemented.

## 5. Implementation Summary

### Route and context

Added `/movies/[movieId]/cinemas/[cinemaId]/showtimes`. Cinema Continue now opens this route instead of its former stopping-point dialog. The existing public Movie detail API supplies Movie context; the existing local Cinema adapter resolves and validates the branch. Invalid IDs, hidden/missing Movies, closed/unavailable/unknown Cinemas and retryable failures cannot expose selectable Showtimes.

Movie, Cinema, Hall and Showtime IDs remain strings. The `from` catalog return context survives Cinema/Showtime navigation. Change Cinema returns with its selected ID. Date and selected Showtime are stored in frontend query parameters, supporting refresh/back; changing date clears selection. Selection is checked against the current date and Movie/Cinema identities rather than trusting a query ID.

### Local service boundary and time

`ShowtimeSelectionService` returns typed local schedule data. The UI does not construct fixtures or call any invented endpoint. The model includes identity, Movie/Cinema context, Hall identity/name, start time and a preview `hasAvailableSeats` flag. It does not define a persisted Showtime status enum, seat inventory, pricing or Booking behavior.

The adapter provides seven sample dates and two Hall groups. This is a fixture window, not an approved advance-booking limit. Vietnam time (`Asia/Ho_Chi_Minh`, UTC+07:00) is explicitly shown for these Vietnam sample branches; display and date grouping are independent of the browser time zone. Fixtures do not derive availability from Movie release dates or publication.

UI states Available, Sold out and Started / past are derived presentation labels. The start comparison refreshes every second and on window focus, and is checked again at Continue. Exact-start and past Showtimes cannot continue; an open handoff closes when its selection becomes invalid. Local browser time is only a preview approximation: server time, cut-off, Hall/Cinema eligibility and current seat availability must replace it for live integration.

Preview query `previewState` accepts `empty`, `error`, `sold-out` and `past`; other values use default data. Error fails once per adapter instance, then retry succeeds. Abort handling prevents cancelled loads from consuming that failure. `date`, `showtimeId`, `step` and `from` are frontend state, not a backend API contract.

### UI and continuation

Preserved the canonical dark shell, progress links, compact Movie/Cinema panel, date choices, Hall panels with time tiles, amber selection and sticky summary. Reused semantic tokens, Movie poster/feedback/request components and shared dialog. Native radios, pressed date buttons, text status labels, visible focus and live summary feedback support keyboard use. Mobile uses two time tiles per row, wrapping date choices and a full-width Change Cinema action.

Continue is enabled only for the current future/available choice. It records `step=seats` and opens an explicit Seat Selection handoff on the same route. The typed handoff preserves Movie/Cinema/Showtime IDs and the future canonical `/showtimes/[showtimeId]/seats` path. No dead Seat route link, Seat Selection screen, Seat Hold or Booking is created.

Prototype format filters, IMAX/Atmos labels, lounge benefits, promotional cards, seat counts, pricing tiers and sample prices were excluded. The preview does not introduce new Showtime business statuses.

## 6. Files Created

- `frontend/src/app/(public)/movies/[movieId]/cinemas/[cinemaId]/showtimes/page.tsx`
- `frontend/src/features/showtime/showtime.types.ts`
- `frontend/src/features/showtime/showtime-service.ts`
- `frontend/src/features/showtime/showtime-selection-screen.tsx`
- `frontend/src/features/showtime/showtime-service.test.ts`
- `frontend/test/e2e/showtime-selection.spec.ts`
- This report.

## 7. Files Modified

- `frontend/src/features/cinema/cinema-selection-screen.tsx`: replace prior handoff dialog with canonical Showtime navigation.
- `frontend/test/e2e/cinema-selection.spec.ts`: verify the new continuation and return path.
- `frontend/package.json`: include Showtime unit tests; no dependencies added.
- `docs/ui-ux/customer-frontend-implementation-plan-v1.0.md`: mark both discovery previews implemented; retain integration gates.
- `docs/ui-ux/screen-spec/customer-screen-map-v1.0.md`: eight existing routes, seven missing target routes; preserve all canonical IDs.

No moves or commits. Existing worktree changes from earlier tasks were preserved.

## 8. Verification

Commands run from `frontend/` unless stated otherwise.

| Check | Result |
|---|---|
| TypeScript | PASS: `pnpm exec tsc --noEmit` |
| ESLint | PASS: `pnpm lint` |
| Unit tests | PASS: `pnpm test`, 23 passed; 4 new Showtime adapter tests |
| Production build | PASS: `pnpm build`; canonical nested Showtime route included |
| Playwright | PASS: `PLAYWRIGHT_CHANNEL=msedge` with `pnpm test:e2e`, 26 passed (51.7s). After the final mobile layout adjustment, rebuilt and reran `pnpm test:e2e test/e2e/showtime-selection.spec.ts`: 6 passed (21.2s) |
| Visual inspection | PASS: desktop 1440x1000 and mobile 390x844 screenshots reviewed against live canonical reference; final mobile context action rechecked; no horizontal overflow assertion passed |
| Preservation | PASS: 98 baseline SHA-256 hashes unchanged across backend source/tests/migrations, Stitch files, frontend Auth, shared header and BRD/SRS |
| Documentation | PASS: local Markdown links and whitespace checked across 13 task files; `git diff --check` passed; report and naming conventions reconciled |
| Live backend/database | NOT RUN: local UI task; browser Movie responses use isolated contract fixtures |

Unit tests cover no network dependency, string identities, independent fixture results, Hall groups, exact-start/past/sold-out rejection, invalid dates/times/context, handoff identity, Vietnam midnight/year boundary, abort and retry.

Browser tests cover Cinema continuation, context and catalog return, Hall/date controls, reload/back, reset on date change, disabled states, invalid/closed/missing context, transient failures, Seat handoff focus return, start-time expiry and responsive/keyboard behavior. Existing Home/Movie/Cinema scenarios remain in the suite, including Auth account-menu regression coverage. The initial browser run found two test selector failures caused by an assumed comma in localized date formatting; selectors were corrected to tolerate that punctuation. Lint also identified the clock read location; the fresh timestamp now enters validation explicitly from the click handler.

Screenshots are generated under `frontend/test-results/`, not committed source artifacts. Verification is not a full accessibility audit or live server/seat-availability acceptance. Existing informational Node module-type and terminal color warnings do not indicate test failures.

## 9. Requirement Reconciliation

- PASS: canonical route, Movie/Cinema context, isolated typed mock data and string IDs.
- PASS: date selection, Hall groups, required availability/recovery states and valid-choice continuation.
- PASS: responsive Stitch-based layout and shared frontend architecture.
- PASS: no new backend endpoints, migrations, Seat Selection, Holds, Bookings or unsupported Showtime statuses/features.
- PARTIAL: authoritative eligibility and server cut-off remain deferred; the Customer journey is not production-complete.

## 10. Deviations / Conflicts

The SRS requires server-time cut-off and authoritative availability. The user explicitly authorized local mocks because no Showtime API exists. The preview is labeled accordingly and does not claim server enforcement. Its date window/time-zone setting/availability flag are implementation fixtures, not new requirements or a finalized service contract.

The user requested continuation toward Seat Selection while excluding its implementation. A context-preserving stopping-point dialog satisfies that boundary, following the earlier Cinema preview pattern. Cinema's old stopping point is now replaced by the implemented Showtime route.

Existing Convention Conflicts: no new conflict found in changed files. Historical document filenames and pre-existing Home/Profile caveats remain untouched. No exception was required or approved.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md), including the report itself.

| Area | Result | Notes |
|---|---|---|
| Folder naming | PASS | `features/showtime`; required Next.js dynamic segments |
| File naming | PASS | Kebab-case components/services/tests; required `page.tsx`; dated report |
| Code naming | PASS | PascalCase types/components, camelCase functions, uppercase shared constant |
| Domain terminology | PASS | Movie, Cinema, Hall, Showtime, Seat Selection; preview labels are not persisted statuses |
| Route/import conventions | PASS | Canonical plural route, camelCase IDs, application alias imports |
| UI organization | PASS | Feature UI and adapter separated; semantic tokens and shared components |
| API convention | NOT APPLICABLE | No new endpoint; existing public Movie client reused |
| Database convention | NOT APPLICABLE | No schema or persistence changes |
| Documentation convention | PASS | Planning/map updates and new report; historical reports preserved |

## 11. Known Limitations

Real Movie data still requires the existing backend when running outside the browser fixtures. Cinema/Showtime fixtures do not establish a real screening relationship, availability, price or seat entitlement. Live time-zone, date-window, cut-off and discovery access policies need their service contract. The Seat Selection route remains absent; no transaction behavior exists in this preview.

## 12. Next Recommended Step

Implement Seat Selection only through a separately authorized scope and canonical screen, or finalize the discovery API contract before replacing Cinema/Showtime adapters. Keep mock UI completion distinct from production readiness.
