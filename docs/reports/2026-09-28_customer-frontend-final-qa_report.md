# Final Customer Frontend QA and Implementation Reconciliation

## 1. Task Information

- Date: 2026-09-28.
- Module: complete Customer frontend, current API clients and local previews.
- Type: QA, scoped cleanup, regression tests and implementation reconciliation.
- Status: COMPLETE — final QA and scoped cleanup PASS; integration limitations recorded below.
- Decision: ready to freeze new feature development for the current Customer UI/preview scope and move primary effort to backend contracts and integration. **This is not production release approval.**

## 2. Requested Work

Audit Home → Movie catalog/detail → Cinema → Showtime → Seats → Concessions → Summary/Promotion → Payment Method/Processing/Result → My Bookings/Tickets/Booking QR → Auth/Profile. Repair existing navigation and misleading UI, verify all canonical presentations and states, preserve domain invariants and service boundaries, remove only proven-unused controls/code, run final checks and identify remaining integration requirements. No new feature, backend behavior, endpoint, migration, requirement or Stitch change is authorized.

## 3. Documents Reviewed

- [Development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [frontend workflow](../../.agent/workflows/FRONTEND_WORKFLOW.md), applicable coding/UI/document/traceability/convention rules, [frontend instructions](../../frontend/AGENTS.md) and installed Next.js 16.3.5 navigation documentation.
- [Project conventions](../development/project-conventions.md) and [report template](templates/TASK_REPORT_TEMPLATE.md), before source/document changes and at completion.
- [SRS v1.2](../srs/srs-v1.2.md), especially Customer UI §6.1, Auth/Movie/discovery/Seat/Booking/Promotion/Payment/Ticket requirements and partial check-in; [BRD v1.2](../brd/brd-v1.2.md).
- [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md), discovery, Hold, Ticket/QR and check-in model; [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx), UC-CUS-001 through UC-CUS-025; [Project Scope v1.0](<../project-scope/project-scope v1.0.md>) as historical scope, subject to the approved Booking QR model.
- [Movie contract](../api/movie-service-contract-v1.0.md), [Genre options contract](../api/genre-options-contract-v1.0.md), [database decisions](../db/database-design-decisions-v1.0.md) and [physical dictionary](../db/physical-data-dictionary-v1.0.md).
- [Customer implementation plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md), [canonical screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md), [Stitch metadata](../../.stitch/metadata.json), [inventory](../../.stitch/SITE.md) and [visual guidance](../../.stitch/DESIGN.md). Live canonical Home/Profile screenshots were retrieved and inspected; references remain unchanged.
- Current frontend source, tests and API client calls; existing backend controller/DTO signatures read only to confirm contracts.

Completed frontend report history was reconciled, not overwritten:

| Slice | Historical reports |
|---|---|
| Auth/Profile | [Login](2026-09-15_login-screen_report.md), [Register](2026-09-15_register-screen_report.md), [Auth integration](2026-09-15_auth-frontend-integration_report.md), [header](2026-09-15_authenticated-customer-header-fix_report.md), [Profile](2026-09-15_customer-profile-frontend_report.md), [logout](2026-09-15_customer-logout-frontend_report.md) |
| Planning and catalog | [Customer plan](2026-09-25_customer-frontend-plan_report.md), [Movie frontend](2026-09-26_movie-catalog-frontend_report.md), [Home integration](2026-09-26_home-movie-integration_report.md) |
| Discovery and selections | [Cinema](2026-09-27_cinema-selection-frontend_report.md), [Showtime](2026-09-27_showtime-selection-frontend_report.md), [Seats](2026-09-27_seat-selection-frontend_report.md), [Concessions](2026-09-27_concession-selection-frontend_report.md) |
| Review and Payment | [Summary](2026-09-28_booking-summary-frontend_report.md), [Method](2026-09-28_payment-method-frontend_report.md), [Processing](2026-09-28_payment-processing-frontend_report.md), [Result](2026-09-28_payment-result-frontend_report.md) |
| Bookings and Tickets | [History/Tickets/Booking QR](2026-09-28_booking-history-tickets-frontend_report.md) |

Earlier reports describe their then-current stopping-point dialogs, missing routes and unavailable Auth browser tooling. Current routes and new browser tests supersede those limitations where explicitly covered below. Historical reports remain accurate records of earlier work.

## 4. Requirements Traceability

| Requirement | Audit focus | Applicable result |
|---|---|---|
| FR-AUTH-001 through FR-AUTH-005; UC-CUS-001/002/003/025 | Register/login/profile/renewal/logout, validation and recovery | PASS for existing API-client behavior under browser fixtures; live backend acceptance not certified here |
| FR-AUTH-009; FR-BOOKING-009/010; FR-TICKET-007/008 | Ownership and authorized reads | PARTIAL: Profile uses existing authenticated API; Booking/Ticket history is openly labeled fictional data, not ownership enforcement |
| FR-MOVIE-001/002/003/007; approved Movie/Genre contracts | Catalog/detail/filter/sort/pagination and IDs | PASS for current client contract and regression checks; no invented rating/popularity/cast/price inputs |
| FR-MOVIE-008; FR-CINEMA-001/002; FR-SHOWTIME-006/007/008 | Cinema/Showtime discovery and start cutoff | PARTIAL: Movie-first local flow and browser-time guards exist; real discovery and Cinema-first service behavior deferred |
| FR-SEAT-001/003/004/005/007/008/009/011/016/017 | Map, types, availability, Hold/expiry/contention | PASS for authorized STANDARD/COUPLE preview invariants; PARTIAL for production VIP/HELD, ownership, server clock and concurrency |
| FR-BOOKING-006/007/011/012/013/014/015/016/017 | Snapshots, add-ons, totals, cancellation, no unpaid issuance | PASS for local add-on/review/expiry boundaries; cancel-pending and authoritative totals/issuance require backend integration |
| BR-034/035; approved first-payment freeze decision | Promotion and composition authority | PASS for explicit demo-only discount/totals and no premature freeze; real rules/freeze deferred |
| BR-038/039/040; FR-PAYMENT-001/006/007/008/010/014 | Trusted results, retries and late outcomes | PASS for honest UI simulation, original expiry and no financial/issuance effects; provider verification/idempotency remain backend work |
| FR-TICKET-001/002/003/004/005/006/009/010; BR-044/046 | Ticket per whole unit, one Booking QR, safe lookup | PASS for fictional fixture model and independent decoding; no per-Ticket QR or live issuance |
| FR-CHECKIN-009/010 | Mixed Ticket states and repeat QR reads | PASS for read-only presentation; no Customer check-in or Staff scanner added |
| SRS §6.1; canonical screen map | Complete Customer presentation | PASS for canonical page/shared/embedded representation; not full production SRS completion |

## 5. Implementation Summary

### Scoped fixes

1. Profile now displays the actual Account Status without “Verified” or verified-email claims. Its background uses semantic tokens, and “Back to movies” links to `/movies`.
2. Account menu supports Escape dismissal and restores focus to its summary control.
3. Removed Login's ignored Remember me checkbox. The field had no consumer and no approved alternate persistence/token lifetime; existing session behavior is unchanged.
4. Home Showtime shortcuts now explain Movie-first discovery and link to `/movies`, replacing obsolete dead-end copy. Home location/offer sample labels appear before their cards. The Couple offer sample now describes one indivisible Seat Unit for two guests.
5. Added seven browser QA tests: complete desktop/mobile journeys; Home shortcut recovery; Login/Register validation/error/retry; Profile load/retry/edit/cancel/save errors/protected fields; unauthorized-session recovery; expired-token renewal success/failure.

### Completed Customer frontend coverage

| Presentation | Actual path or state | Data boundary / current coverage |
|---|---|---|
| Home | `/` | Movie API hero/catalog rows; sample Cinema/offer cards explicitly labeled; navigation and account menu |
| Movie Listing | `/movies` | Public Movie/Genre clients; search, single Genre ID, approved sorting/pagination and feedback states |
| Movie Detail | `/movies/[movieId]` | Public visible detail; optional media/content and unavailable/retry states; Cinema preview entry |
| Cinema | `/movies/[movieId]/cinemas` | Local branch adapter; real Movie context; available/closed/unavailable/loading/empty/retry |
| Showtime | `/movies/[movieId]/cinemas/[cinemaId]/showtimes` | Local dates/Hall groups; future/available selection; sold-out/past/empty/retry |
| Seat Selection | `/showtimes/[showtimeId]/seats` | Local map/legend; indivisible STANDARD/COUPLE selection; unavailable/sold/retry/expiry/reselection |
| Concessions and expired state | `/bookings/preview/concessions` | Local POPCORN/DRINK/COMBO catalog; optional quantities, empty/unavailable/retry and expiry dialog |
| Summary + embedded Promotion | `/bookings/preview/summary` | Local reviewed composition/totals; apply/remove/invalid/expired/ineligible/retry; original expiry |
| Payment Method | `/bookings/preview/payment` | Local fixtures; exactly one available method; loading/empty/unavailable/retry and expiry |
| Processing | `/bookings/preview/payment/processing` | Local processing/verifying/success/failed/pending/error; duplicate-action and late-result guards |
| Result | `/bookings/preview/payment/result` | Truthful success/failed/pending preview; retry/method return; no PAID mutation, Transaction, Ticket or QR |
| My Bookings | `/my-bookings` | Independent fictional list; Booking status, screening, code, amount and list/detail navigation |
| Booking/Tickets/QR | `/my-bookings/[bookingId]`, QR dialog | Independent Ticket statuses, mixed partial entry, exactly one reusable inert QR for a PAID example |
| Auth/Profile | `/login`, `/register`, `/profile`; shared account menu | Existing API clients, validation/submitting/error/retry, read-only protected fields, renewal and logout |

There are **16 actual routes**, **17 canonical Stitch IDs** and **15 target production URL patterns**. Eleven target paths exist, while four owned-Booking checkout patterns are represented only by static previews. Processing is separately addressable in preview but a state of the production Payment target. No current link targets an unimplemented owned-Booking path. Every canonical presentation is represented; server-driven states are separately deferred in section 11.

### Invariants and boundary audit

- Network calls occur only in `features/auth/auth-api.ts` and `features/movie/movie-api.ts`. All calls map to existing controller paths: Movie collection/detail, Genres, users, tokens, token-renewals, token-revocations and Profile GET/PATCH. Domain mock adapters make no fetch/WebSocket/EventSource calls; the existing proxy is unchanged.
- Movie/Genre and downstream context/fixture IDs remain decimal strings, including values above 2^53. No ID is converted through Number/parseInt. Numeric pagination, money, capacity and timestamps are not identifiers.
- **Existing Auth limitation:** Login/renewal DTO uses numeric `userId` (backend Long); session storage uses numeric user.id. It is not used to construct downstream Booking paths or authorize resources, but the contract is not bigint-safe above JavaScript's safe integer range. A coordinated backend/string-serialization change is still required; no false global bigint-safety claim is made.
- A COUPLE selection remains one identity through Seats, Concessions, Summary and Payment. The integrated sample is two units/three guests and 324,000 VND demo total. Independent Booking fixture H9-10 is one Ticket for two guests; the mixed sample is three Tickets/four guests.
- Downstream UI preserves the original Seat expiry. The full journey advances time by one minute and still shows 09:00 through Summary, Method and Result; existing expiry/start/race tests cover late completion and retry. Returning to Seats requires fresh selection; no timer is a real Hold.
- Real composition freeze remains deferred until atomic first Payment initiation. Opening any preview screen, applying Promotion or changing methods does not freeze or grant a Booking.
- Payment results never certify payment, create Transactions, mutate a Booking to PAID or issue Tickets/QR. Visiting My Bookings shows the same five independent fixtures, not a newly created checkout result.
- Paid history fixtures each have one Booking QR identity/image; the expanded view replaces the inline image. QR decoding and repeated read are tested. No Ticket carries a QR field. Unpaid examples have neither Tickets nor QR; independent VALID/CHECKED_IN/EXPIRED/CANCELLED statuses remain visible.
- TypeScript import-graph audit found no unreachable application source module. No mock adapter/component was deleted speculatively. The no-op Remember me control was removed based on direct data-flow evidence.

## 6. Files Created

- `frontend/test/e2e/customer-final-qa.spec.ts`
- This report: `docs/reports/2026-09-28_customer-frontend-final-qa_report.md`

## 7. Files Modified

- `frontend/src/features/auth/customer-account-menu.tsx`
- `frontend/src/features/auth/login-form.tsx`
- `frontend/src/features/auth/profile-screen.tsx`
- `frontend/src/features/home/home-screen.tsx`
- `frontend/src/features/home/home-mock-data.ts`
- `docs/ui-ux/customer-frontend-implementation-plan-v1.0.md`
- `docs/ui-ux/screen-spec/customer-screen-map-v1.0.md`

No moves, new dependencies, backend/migration/BRD/SRS/Stitch changes, commit or deployment.

## 8. Verification

Commands ran from `frontend/`, except repository/document audits.

| Final check | Result | Evidence |
|---|---|---|
| TypeScript | PASS | `pnpm exec tsc --noEmit --noUnusedLocals --noUnusedParameters`, exit 0 |
| ESLint | PASS | `pnpm lint`, exit 0 |
| All unit tests | PASS | `pnpm test`: 49/49; includes ID/expiry/COUPLE/Payment and independent QR decoding |
| Production build | PASS | `pnpm build`, exit 0; all 16 route patterns emitted |
| New QA scenarios | PASS | `pnpm exec playwright test test/e2e/customer-final-qa.spec.ts`: 7/7, 42.4 seconds |
| Full Playwright suite | PASS | Final production-build run with `PLAYWRIGHT_CHANNEL=msedge` and `pnpm test:e2e`: 73/73, 6.6 minutes, exit 0 |
| Final desktop/mobile visual review | PASS | Home through Profile, Register and QR dialog reviewed at both sizes; failed/pending Payment and expired Concession variants reviewed; no blocking layout defect found |
| Route/navigation audit | PASS | 16 route files; all 17 canonical IDs resolve in metadata; zero unreferenced source modules; complete browser journey and fragment-target checks |
| API and string-ID audit | PASS with documented Auth gap | Only two approved network modules; all existing string IDs preserved; legacy numeric Auth contract explicitly deferred |
| Documentation/link/whitespace | PASS | Updated map, plan and report reconciled; 64 relative links resolve; `git diff --check` and changed/new-file whitespace checks pass |
| Preservation audit | PASS | All 136 task-entry SHA-256 baseline files unchanged: backend, requirements, Stitch and historical reports |

The full suite retains existing visibility/filter, invalid-context, loading/empty/retry, expired/unavailable, Promotion, pending/failed Payment, independent Ticket-state and mobile tests. New tests observe no unexpected domain API calls or page errors through the complete journey, exercise account-menu keyboard return, and verify Profile sends only fullName/phone on PATCH. API fixtures test frontend contract behavior, not deployed service correctness.

Visual artifacts are generated in ignored `frontend/test-results/customer-final-qa-*` directories: numbered 01–16 captures for Home through Profile on desktop 1440×1000 and mobile 390×844, plus Register captures. Existing suites provide pending/failed/expired/retry variants and 320px overflow checks. Full-page modal captures are supplemented by viewport QR captures. No screenshot is added to product assets.

## 9. Requirement Reconciliation

- PASS for the requested QA/cleanup scope: canonical coverage, routing, contract boundaries, whole-unit semantics, Booking QR model, original preview expiry, truthful Payment states and scoped fixes.
- PARTIAL for full production Customer SRS: local previews cannot satisfy authoritative discovery, Holds, owned Bookings, server totals, Payment verification, issuance or ownership enforcement. Their visual implementation is not reclassified as service completion.
- PASS for preservation: no behavioral requirement was weakened to make a test pass; no new feature or fake endpoint was added. Production dependencies remain explicit in the map/plan.

## 10. Deviations / Conflicts

- Auth numeric userId differs from the string-ID Movie/domain contracts. Backend edits are forbidden here; this cross-layer gap is surfaced rather than hidden by unsafe number-to-string conversion.
- Stitch Profile verification/biometric/lounge content is not supported by the account DTO. Verification wording was corrected; unsupported capabilities remain excluded. Remember me had no approved policy or behavior and was removed without adding one.
- The Home Cinema cards are design samples, not authoritative discovery associations. Their Showtime action must start the implemented Movie-first flow and cannot invent a Cinema-first backend contract.
- Earlier frontend reports still mention dialogs/downstream missing pages and absent Auth browser QA. These are historical limitations now superseded by the current source/tests; no old report was overwritten.
- Existing historical filenames with spaces/underscores remain untouched. Existing Node module-type/terminal-color notices are informational. No new convention exception was required or approved.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md), including the generated report.

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | Existing feature placement; kebab-case QA spec; correctly dated new report; no route renames |
| Code naming/imports | PASS | Existing PascalCase components, camelCase handlers and alias imports preserved |
| Domain terminology/statuses | PASS | Approved Booking/Ticket/Seat Unit language; no new serialized business state |
| UI tokens/accessibility | PASS for basic checks | Profile hardcoded gradient removed; shared tokens; labels, focus/keyboard, native dialog and live/error states retained |
| API convention | PASS | Only existing contracts and paths; no invented endpoints or proxy changes |
| Database convention | NOT APPLICABLE | No persistence/schema/migration changes |
| Documentation convention | PASS | Map/plan reconciled; new report and actual requirement IDs; historical evidence preserved |

## 11. Known Limitations and Remaining Backend Contracts

| Priority / contract | Required backend decisions and integration |
|---|---|
| Discovery | Movie/Cinema/date filtering, Cinema-first discovery, Hall/Showtime eligibility, date/timezone/window and server cutoff rules; no guessed endpoint names |
| Seat/Hold | Showtime-specific eligibility, VIP/HELD data, atomic whole-unit acquire/release, ownership, configurable TTL, server timestamps, stale selection/conflict and reconnect/realtime semantics |
| Booking/Concessions/Promotion | Owned Booking creation/read/cancel, pricing snapshots, active add-on catalog, quantities, discount scope/rounding/usage limits, server totals and ProblemDetail errors |
| First Payment initiation | Atomic composition/price freeze, configured methods, transaction identity and idempotency, edit eligibility across retries |
| Payment verification | Provider authenticity, amount/currency/reference checks, trusted pending/success/failure/cancel/late states, reconciliation and exactly-once finalization |
| Tickets/Booking QR | One Ticket per whole purchased unit, one secure reusable Booking QR per paid Booking, ownership-protected history/detail, independent Ticket statuses and authorized read/refresh |
| Auth IDs and live acceptance | Bigint-safe Login/renewal userId serialization coordinated with stored sessions; representative live Auth/Profile/Movie/Genre acceptance through the actual proxy |

**Unresolved frontend/integration issues:** numeric Auth identity remains a cross-layer precision risk; no production handlers for ownership denial, real HELD/contention/reconnect, VIP presentation/data, cancel-pending action (FR-BOOKING-011 / UC-CUS-022), frozen composition or verified issuance exist yet. These were not added as fake demonstrations. Four owned-Booking checkout route patterns are still missing by design. Cinema-first discovery remains deferred. Service-dependent gaps must remain on the implementation backlog.

Current preview URLs use memory/browser time and deliberately lose checkout state on reload/exit. They are not authorization or reservation boundaries. Auth sessions retain their existing storage policy; no alternative Remember me policy was introduced. QR assets are inert demo references without admission value.

Browser execution covers Chromium-based Microsoft Edge on Windows at desktop/mobile viewport sizes. This is basic keyboard/focus/responsive verification, not a complete accessibility certification or Firefox/WebKit/device matrix. Backend/PostgreSQL/provider end-to-end acceptance was not run because this task preserves backend and tests frontend behavior against controlled fixtures.

## 12. Freeze Decision and Next Recommended Step

**Ready to freeze new features in the current Customer frontend UI/preview scope and move primary effort back to backend. All final QA gates in section 8 passed.** No unresolved blocking defect was found in the audited preview UI. The canonical presentation is in place; adding more mock behavior would not resolve the remaining service-dependent requirements.

Keep the frontend available for regression fixes and integration changes when approved contracts arrive. Implement backend work in the dependency order in section 11, replace adapters with real contracts one slice at a time, then repeat live cross-layer acceptance and security/ownership testing. Do not treat this UI freeze as production readiness, actual payment capability or completion of every Customer SRS use case.
