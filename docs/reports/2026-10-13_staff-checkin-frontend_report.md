# Smart Cinema implementation report — Staff Check-in frontend

## 1. Task information and requested work

- Date: 2026-10-13, Asia/Ho_Chi_Minh.
- Phase/module: Phase 4C, operational STAFF frontend.
- Type: implementation, real HTTP integration with fixture-backed frontend verification.
- Status: **COMPLETE for the authorized Phase 4C frontend scope; final regression PASS.** External interoperability remains NOT RUN as classified below.
- Entry: clean working tree, HEAD `d3286eee71fcc7a56c9d5fe9604edf43c2c3683e` (Phase 4B-2). No incoming uncommitted work to overwrite.

Implement assigned Cinema selection, real camera/manual opaque QR resolution, authoritative Booking/Ticket presentation, eligible indivisible Ticket selection, explicit atomic Check-in confirmation and safe read recovery. Preserve existing Customer/Admin behavior, authentication, Backend/DB/V1–V14, Payment/VNPAY, issuance/freeze/expiry and all existing frontend tests. No commit, deployment, Stitch edit or live business-data mutation.

## 2. Repository and design review

Read root/frontend AGENTS; canonical [development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), frontend/review workflows, coding/documentation/traceability/UI rules and [project conventions](../development/project-conventions.md). Reviewed installed Next.js 16.3.5 documentation for App Router pages/layouts, client boundaries and navigation before implementation. React 19.2.8, TypeScript 5 and Tailwind 4 conventions remain unchanged.

Reviewed [current handoff](../ai/current-handoff.md), [Phase 4B-2 report](2026-10-13_staff-qr-checkin-backend-apis_report.md), [Phase 4B-1 continuation](2026-10-12_staff-checkin-foundation-implementation-continuation_report.md), authoritative [Staff operational contract v1.0](../api/staff-qr-checkin-contract-v1.0.md), [invitation contract v1.0](../api/staff-invitation-administration-contract-v1.0.md), [security DB design](../db/staff-onboarding-checkin-security-design-v1.0.md), and actual Staff controller/service/DTO/security source. Also reviewed [BRD v1.2](../brd/brd-v1.2.md), [SRS v1.2](../srs/srs-v1.2.md), [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md) §§33–36/47–49, [System Analysis v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx), [project scope](<../project-scope/project-scope v1.0.md>), shared UI, auth/session/API infrastructure, role navigation, real Customer Booking QR and test configuration.

Live Stitch MCP connected to `projects/1208499799798658711`, Smart Cinema Ecosystem. Current list contained **41 screen resources**, not a claim of 41 unique completed designs. Retrieved metadata/list and `get_screen` for the three actual Staff references below, downloaded available HTML/PNG and visually inspected the PNG plus HTML. Metadata still uses generating labels for some resources; MCP export availability does not establish generation-job completion. No design was changed.

| Stitch ID | Actual title / variant | Applied visual scope |
|---|---|---|
| `05a2ad0f96cd4502ba97662d5f0a2e12` | Smart Cinema - Quét mã vé & Xác minh Booking; desktop 2560×2318 | Split scanner/verification workspace, layered cards, amber actions |
| `713c9e3fae5f4ef7a907102243ebff5c` | Smart Cinema - Bàn làm việc nhân viên soát vé; desktop 2560×2916 | Staff shell, screening/Booking/Ticket presentation |
| `851e390ea6f64946b1c3e9814de03d63` | Smart Cinema - Quét mã QR soát vé Mobile; mobile 780×2334 | Stacked scanner/details and touch controls |

Preserved [.stitch/DESIGN.md](../../.stitch/DESIGN.md), Nocturne background `#0f131c`, action `#f59e0b`, existing `#ffc174` accent and Space Grotesk/Plus Jakarta Sans. Reused SurfaceCard, Button, StatusBadge, StatusFeedback, Skeleton and global focus/reduced-motion tokens. The references include unsupported shifts/KPIs/history/gates/pickup/employee codes/printing/offline/scenario toggles; these were deliberately excluded. No supplied poster URL exists in the Staff DTO, so no invented poster or production mock image was added. The implementation is contract-constrained Stitch alignment, not a pixel-identical copy of unsupported features.

## 3. Requirements traceability

These are existing identifiers, not newly invented requirements. Results below are frontend scope reconciliation; existing server concurrency/audit/issuance guarantees are consumed rather than reimplemented.

| Requirement / source | Applicable behavior | Result / evidence |
|---|---|---|
| BRD BR-002/003/053; SRS FR-AUTH-007/008, FR-ORG-005, NFR-SEC-003 | Current STAFF and actual assigned Cinema | PASS: only backend-returned assignments expose operations; 401/403 revoke local workspace; Admin/Manager denied |
| BRD BR-046/048; SRS FR-TICKET-004–006, FR-CHECKIN-001/002/010 | Exact one-Booking QR resolution and rescan | PASS for frontend: real decoder/manual exact POST body, no QR consumption or automatic Check-in |
| BRD BR-049/050; SRS FR-CHECKIN-003–006/013 | Authoritative Booking/context/window/Ticket projection | PASS: coherent typed validation, server reasons/flags; no client time-window authority |
| SRS FR-TICKET-002/003/010, FR-CHECKIN-007/009 | Purchased Seat Units, canonical IDs, eligible independent batches | PASS: one COUPLE ID/two guests, terminal units disabled, explicitly selected batches |
| BRD BR-051; SRS FR-CHECKIN-008/012 | Duplicate/concurrent admission protection | PASS frontend command discipline and conflict recovery; server atomic protection unchanged; frontend fixtures do not independently prove DB concurrency |
| BRD BR-052/062; SRS FR-CHECKIN-011, FR-AUDIT-004 | Backend committed audit/checkedInAt | PASS consumption of timestamp/status only; audit actor creation remains backend, no frontend audit writer |
| SRS NFR-SEC-006/009–012 | Validation, opaque QR/privacy, safe errors/rate limits | PASS: no QR URL/storage/logging, allowlisted projection, fixed errors, Retry-After, no-store |
| SRS NFR-UX-003/004 | Clear Staff outcome/business error presentation | PASS for automated/visual scope: Vietnamese pending/success/uncertain/error and manual fallback |
| System Analysis UC-STF-004, BRULE-TICKET-001–009 | Operational validation and Ticket/Booking QR invariants | PASS under narrower approved Phase 4B contract; historical conditional Manager admission is not adopted |
| User Phase 4C §§3/13/14 | 390/768/1440, keyboard, media lifecycle, regression | Final results recorded in §9; physical-device and live admission limitations explicit |
| User Phase 4C §15 / invitation contract | Activation dependency audit only | PASS audit; activation UI remains separately scoped and unimplemented |

## 4. Routes, auth and current assignments

New dynamic route **`/staff/check-in`** imports the client workspace. Existing AuthProvider, login, session storage infrastructure and logout API are reused. STAFF login accepts only the exact narrow Staff return route and defaults there; existing Customer/Admin/Manager destinations remain. SiteHeader and account menu add a STAFF-only entry. No Manager/Admin invitation page or new provider.

Local role gates show safe login/wrong-role presentation; they do not authorize admission. Operational scanner/data appear only after authenticated current assignment GET validates. One assignment auto-selects; multiple require explicit choice; empty/no access shows no camera. Selected scope name remains readable below the native selector on mobile. Current assignment changes are rechecked explicitly or through bounded foreground events and every subsequent backend operation, not a push feed. Current 403 invalidates all operation data; matching-owner 401 clears session and offers existing safe login resume.

## 5. Actual endpoint audit and response boundary

| Endpoint | Exact request / response used |
|---|---|
| GET `/api/v1/staff/cinema-assignments` | No body/query; `{serverTime,assignments:[{id,cinemaId,cinemaName,effectiveAt}]}` ordered numeric assignment ID |
| POST `/api/v1/staff/booking-qr-resolutions` | `{cinemaId:string,bookingQr:string}`; no query; complete StaffBooking projection; read-only business operation |
| GET `/api/v1/staff/bookings/{bookingId}?cinemaId={cinemaId}` | Exactly one canonical Cinema context; independently authorized complete recovery projection |
| POST `/api/v1/staff/bookings/{bookingId}/check-ins` | `{cinemaId:string,ticketIds:string[]}`; no query; HTTP 200 `{checkedInTicketIds:string[],booking}` only after commit |

Projection consumes `bookingId/bookingCode/bookingStatus`, movie/Cinema/Hall/Showtime identifiers and labels, `startsAt/endsAt/showtimeStatus/serverTime`, `admissionAllowed/admissionReason`, sorted Tickets and purchased Concessions. Ticket fields: `id,bookingSeatId,seatId,ticketCode,row,number,seatType,guestCount,status,checkedInAt,canCheckIn`. Concessions: `name,category,quantity`. No new endpoints/fields/statuses or response authority.

All positive bigint IDs remain strings within Long range; tests include values above JS safe integer. Validation rejects mismatched IDs/Cinema, malformed/incomplete/duplicate aggregates, incorrect COUPLE capacity, contradictory eligibility, unexpected successful status codes, wrong selected-set acknowledgement and stale/regressed server projection. Returned data is cloned through an explicit allowlist, dropping unexpected sensitive fields. Frozen identities/capacity cannot change during known-Booking recovery; current labels may change. UTC instants and nanosecond comparisons preserve server chronology. No local sale/admission deadline or financial computation.

## 6. Camera, manual QR and operational display

Added pinned **`@zxing/browser` 0.2.1** and peer **`@zxing/library` 0.23.0**, after inspecting dependencies and primary release/source evidence. [Browser release](https://github.com/zxing-js/browser/releases/tag/v0.2.1), [browser source](https://github.com/zxing-js/browser), [library releases](https://github.com/zxing-js/library/releases). Existing architecture and unrelated dependency versions preserved. Upstream library notes limited maintainer capacity; selection rests on available recent releases and tested API compatibility, not a guarantee of future maintenance.

Explicit camera action dynamically loads the reader, requests secure-context video only, prefers rear camera and exposes available devices. No permission request on mount. Fixed Vietnamese denied/unavailable/unsupported/device-switch errors retain manual fallback. Media owner stops decoder controls/video/all tracks on decode/stop/unmount/context changes; delayed permission and decoder completions are also disposed. A decoded token triggers at most one QR resolution and never Check-in. Device enumeration failure does not remove fallback.

Manual textarea is labeled, autocomplete disabled and preserves paste text including invalid controls for safe rejection. Exact UTF-8 spaces/case/NFD/punctuation are submitted unchanged in confidential JSON; nonblank/≤128-code-point/no-control/no-unpaired-surrogate checks mirror the actual Java isBlank boundary without normalization (Java excludes NBSP, figure/narrow space and BOM from blank characters). QR-like URLs are never followed or parsed. Raw text is erased before sending and never echoed in result/error panels.

Vietnamese Booking states: PENDING “Chờ thanh toán”, PAID “Đã thanh toán”, EXPIRED “Đã hết hạn”, CANCELLED “Đã hủy”. Ticket states: VALID “Chưa sử dụng”, CHECKED_IN “Đã soát vé”, EXPIRED “Đã hết hạn”, CANCELLED “Đã hủy”. Reasons NOT_PAID, CONTEXT_UNAVAILABLE and OUTSIDE_ADMISSION_WINDOW map to safe server-derived guidance. No extra persisted status. Times are explicitly UTC. Purchased Concessions show name/quantity only, with no invented pickup action. No PII, provider references, amount, QR debug data or audit operator.

## 7. Selection, confirmation and recovery

Only current backend `canCheckIn=true` units are selectable; terminal Ticket states are disabled. One COUPLE unit remains indivisible, one checkbox/ID and two guests. Selected Ticket count and guest capacity are shown separately. Different eligible units may be admitted in independently confirmed batches.

Native confirmation dialog requires an eligible nonempty selection, explains whole-unit admission and shows the selected seats/capacity. State changes to submitting synchronously before awaiting transport, preventing duplicate commands. Buttons disable in flight; no optimistic mutation. Only a validated committed 200 produces “Soát vé thành công”. Recovery confirming CHECKED_IN reports current state, without attributing another Staff member's command to this browser.

| Condition | Safe frontend response |
|---|---|
| 400 | Fixed invalid QR/selection guidance; no diagnostic echo |
| 401 | Clear matching current session and operation state; login resume |
| 403 | Wipe assignments/Booking/selection/camera; current authorization unavailable |
| 404 | Remove inaccessible Booking; generic QR/Booking message |
| 409 | Lock selection, require current scoped GET before reselecting |
| 429 | Fixed message, bounded Retry-After cooldown, controls disabled; timer makes no request |
| 503 / network / timeout / malformed response | Uncertain command result, locked prior projection, explicit safe GET recovery; no POST replay |

No command on mount, refresh, scanner callback, foreground, failure or retry. Reads have a 15-second abort deadline. Event-driven foreground recheck is coalesced, minimum 15-second spacing, suppressed during requests/scanning/cooldown; there is no polling loop. Context/token/generation checks and AbortController ignore stale results. Cinema changes, QR edits, owner/logout/navigation/hidden/pagehide clear confidential state and stop camera. A sent server command may still commit after navigation; the UI never claims cancellation reverses it.

Known in-memory Booking recovery uses scoped GET. Reload/direct entry/back from a cleared hidden context requires rescan/manual entry, because QR, selection and Booking identity are not persisted. This deliberately exposes a safe recovery limitation rather than guessing IDs or storing confidential operational state.

## 8. Privacy, responsive UI and accessibility

Requests use existing bearer transport with `cache:no-store`, `credentials:omit`, `redirect:error`, `referrerPolicy:no-referrer`; the dynamic route is no-store and carries no-referrer/noindex metadata. Incoming query/fragment values are discarded, never interpreted. No new analytics, token/PII logs, provider logic or financial authority. Test fixtures use unmistakably fake credentials and data; generated QR/video fixtures live only under ignored `target/`.

Rendered and inspected workspace/confirmation/result/loading/long-text/safe-error states at **390, 768 and 1440px**. Automated cases check no document horizontal overflow, initial header clearance, visible accessible labels, native keyboard selection/confirmation, Tab/Shift+Tab trap, Escape/focus restoration and ≥44px primary controls. Reduced-motion media uses existing shared rules. Scanner/media aspect box remains contained; mobile/tablet stack, desktop splits scanner/detail. Full selected Cinema label addresses native-select clipping. Focused full-page capture is scrolled to top for legible header comparison; dialog remains viewport-relative. No formal screen-reader session or physical mobile camera test is claimed.

## 9. Exact verification evidence

Commands run from `frontend/` using existing configuration; Windows invokes `pnpm.cmd`. Playwright uses installed Edge via `PLAYWRIGHT_CHANNEL=msedge`, one worker and **zero retries**. No tests skipped/weakened/removed. Logs, exports, screenshot/video fixtures and failed traces are ignored local evidence under `frontend/target/staff-checkin-2026-10-13/`; not deployment artifacts.

| Check | Entry / final result |
|---|---|
| `pnpm exec tsc --noEmit` | Entry PASS; final **PASS**, exit 0 (final-verified tsc/lint logs) |
| `pnpm lint` | Entry PASS; final **PASS**, exit 0 (final-verified tsc/lint logs) |
| `pnpm test` | Entry **151/151 PASS**; final **192/192 PASS** (41 new), zero failed/cancelled/skipped/todo, 1.587 seconds |
| `pnpm build` | Entry PASS; final **PASS**, exit 0 (`final-opaque-build.log`); Staff route server-rendered on demand |
| `pnpm exec playwright test staff-checkin.spec.ts staff-camera.spec.ts --workers=1 --retries=0 --reporter=line` | **37/37 PASS**, 1.4 minutes before the final Unicode refinement; zero failures/skips/retries; full suite validates final source |
| `pnpm exec playwright test --workers=1 --retries=0 --reporter=line` | Final **309/309 PASS** in **11.3 minutes**, exit 0, **25 files** = all 272 existing + 37 new; zero failures/skips/retries. Evidence: `full-browser-final-3.log` |
| Backend `mvn verify` | **NOT RUN this frontend task**. Prior Phase 4B-2 historical 410/410 in 56 suites is separately documented, not a fresh result |
| Backend/DB/Stitch preservation and convention checks | PASS: 739 entry tracked-file hashes checked; exactly 9 intended tracked files changed, 730 unchanged. Backend/V1–V14/Stitch/env/historical reports and original handoff tail preserved; HEAD unchanged and index empty |

Failure history retained, not masked: initial new unit imports used unsupported `.ts` static specifiers and seven TSC errors; converted to established alias/dynamic-fixture convention without changing tsconfig. Initial browser fixture global casts caused seven TS2352 errors/build failure; corrected test-only casts through unknown. First focused browser run **21 PASS / 16 FAIL**, caused Next route-announcer alert ambiguity and a navigation selector/context mistake. Second **36 PASS / 1 FAIL**, the screen-reader-only menu label intercepting pointer input; corrected to the native summary control. Final focused run **37/37 PASS**. All baseline cases retained. The shared navigation fixture assertion formerly prohibited every Staff link; it now positively requires exactly the two approved Staff links for STAFF only, and still prohibits every other Staff/Manager route for all roles. This reflects the explicitly authorized new route and strengthens role visibility rather than removing a test. Final reruns retain equivalent or stronger assertions, no retries/skips. Final contract review additionally replaced JavaScript trim-based blank validation with the actual Java isBlank whitespace boundary, preserving non-breaking/figure/narrow spaces and BOM while rejecting actual blank/control input; unit and browser assertions cover it. A second full run was deliberately stopped at last-started case 58/309 for this fix, without claiming a partial PASS count. An initial full run was interrupted when the active tool session ended during the user continuation, with the last started case 33/309 and no final result; no PASS count is inferred from that partial run. Homepage discovery calls during nav/logout can log local unavailable-backend ECONNREFUSED in test server output; Staff HTTP requests are explicit fixtures, not live server proof.

Evidence classifications:

| Evidence | Classification |
|---|---|
| Frontend actual transport/validators/controller/Vietnamese UI | Fixture-backed unit/browser coverage; final counts above |
| Actual ZXing decoder / media lifecycle | Real decoder reading generated Y4M QR through Edge fake camera; native MediaStream/Canvas lifecycle fixtures |
| Backend Staff auth/scope/atomic writer/HTTP integration | Existing Phase 4B-2 source/contract audited; historical test evidence only |
| Physical phone/desktop camera, iOS/Android/Safari | **NOT RUN** |
| Real employee JWT, live paid Booking/admission/Neon | **NOT RUN**; no scheduling/catalog/financial/operational data manufactured |
| Real HTTPS invitation click/Gmail delivery | **NOT RUN / NOT COMPLETE**; activation page excluded |
| VNPAY/payment/live Ticket issuance | **NOT RUN**; unchanged and not inferred from frontend fixtures |

## 10. Files created and modified

Created:

- `frontend/src/app/staff/check-in/page.tsx` — dynamic Staff route/metadata.
- `frontend/src/features/staff/staff.types.ts`, `staff-api.ts`, `staff-api.test.ts` — exact typed contract, transport, validators and unit cases.
- `frontend/src/features/staff/staff-workspace-controller.ts`, `staff-workspace-controller.test.ts` — owned memory state, command discipline, stale/recovery/rate handling.
- `frontend/src/features/staff/staff-camera-session.ts`, `staff-camera-session.test.ts` — resource ownership/cleanup/error mapping.
- `frontend/src/features/staff/staff-checkin-workspace.tsx`, `staff-qr-camera.tsx`, `staff-booking-panel.tsx` — access/scope/scanner/details/dialog UI.
- `frontend/test/fixtures/staff-checkin.ts`, `frontend/test/e2e/helpers/staff-checkin.ts` — explicitly synthetic HTTP projections/auth fixtures.
- `frontend/test/e2e/staff-checkin.spec.ts`, `frontend/test/e2e/staff-camera.spec.ts` — responsive/keyboard/auth/privacy/async/command/real-decoder browser cases.
- [Staff frontend guide](../development/staff-checkin-frontend.md) and this dated report.

Modified:

- `frontend/package.json`, `frontend/pnpm-lock.yaml` — pinned decoder dependencies and appended three unit test files; existing test script coverage retained.
- `frontend/src/components/layout/site-header.tsx` — STAFF-only navigation.
- `frontend/src/components/ui/icon.tsx` — existing SVG icon system extended with scan/camera.
- `frontend/src/features/auth/auth-return.ts`, `login-form.tsx`, `customer-account-menu.tsx` — narrow Staff login destination/menu, existing auth/session architecture unchanged.
- `frontend/test/e2e/shared-ui-foundation.spec.ts` — updated obsolete no-Staff-route expectation for the approved STAFF-only route, preserving all existing cases and denying unsupported routes.
- [Current handoff](../ai/current-handoff.md) — new verified milestone prepended; history retained.

No moved files, backend source/tests, migration/configuration/environment, existing domain feature logic, historical contracts/reports, Stitch designs or deployment changes. All 151 baseline unit and 272 baseline browser cases remain.

## 11. Requirement reconciliation and scope conflicts

Phase 4C operational frontend is implemented and full regression verified against the four existing APIs, without production mock fallback. Server remains the sole authorization/admission/commit authority. COUPLE/independent Ticket batches, composition freeze, original pre-sale expiry, Payment/Booking states, protected issuance and immutable audit are not modified. Migration head remains **V14**; V1–V14 source/checksums preserved.

Historical System Analysis admission wording and Stitch operational extras do not expand the approved Phase 4B contract. No Manager/Admin operational privilege or new pickup/shift/history/printing/offline/gate/undo behavior. Activation is an audited dependency, not part of delivered operational workspace. Physical/live interoperability is an external verification limitation, not a fixture PASS.

## Convention Compliance

Checked against [canonical project conventions](../development/project-conventions.md), including this report and guide. No approved exception requested or needed; preserve existing historical naming without broad renames.

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | lowercase feature/route paths and kebab-case purpose suffixes; Next `page.tsx` exception; dated `_report.md` convention |
| Code/import naming | PASS | PascalCase components/types, camelCase functions/values, alias imports, existing testing loader conventions |
| Domain terminology/statuses | PASS | Cinema/Booking/Ticket/Seat Unit/Check-in; exact serialized statuses, localized labels only |
| API conventions | PASS | consume four existing resources and exact DTOs; string bigint/no actor/state override |
| Database convention | NOT APPLICABLE implementation | no DB/migration changes; V14 preservation checked |
| Shared UI/design | PASS | established tokens/fonts/primitives/native semantics; no new component framework |
| Documentation/report | PASS | new guide/report under canonical directories, correct links/template sections, real requirement IDs/history preserved |
| Scope/Git preservation | PASS | 26 intended paths (9 tracked modifications +17 new); entry hash evidence, unchanged HEAD/empty index, no commit/stage/reset/deployment |

## 12. Staff activation dependency and known limitations

The separate [onboarding contract](../api/staff-invitation-administration-contract-v1.0.md) defines the public HTTPS activation path through `STAFF_ACTIVATION_BASE_URL`; `/staff/activate` is an example, not a verified environment value. No activation page exists yet. Current frontend architecture can support an isolated public route outside the Staff privilege gate, reusing existing form/error/login primitives without inventing authentication.

Future activation must capture `#token=...` only in memory and remove it immediately with history.replaceState, use no-referrer/no-store and no analytics/storage/third-party assets. Explicit POST `/api/v1/staff/password-setups` has exact `{token,password}` body, no query or GET validation. Token is canonical 32-byte base64url/no padding (43 characters); password ≥8 characters and ≤72 UTF-8 bytes. Backend controls purpose, exact 24-hour expiry, reissue/revocation and single-use redemption. HTTP 204 means password configured **still BLOCKED awaiting ADMIN activation**, not ACTIVE/automatic login. After ADMIN activation, existing login routes STAFF to the workspace. Do not claim Gmail click-through onboarding complete.

Remaining external verification: real camera devices/browser matrix, formal assistive technology session and a separately authorized real Staff/current assignment/issued paid Booking exercise. Route reload/tab privacy clears known identity, so rescan is required. There is no push revocation feed; explicit/foreground/next-request checks use existing server authority. No offline access or historical admission report.

## 13. Next recommended step

Separately scope the **Staff invitation/password-setup activation frontend**, with public fragment-token privacy, explicit confidential redemption, awaiting-ADMIN state and verified HTTPS/Gmail click-through. Independently authorize physical scanner/live Staff admission QA against already legitimate data. Do not start automatically. Final report/handoff links, UTF-8, requirement traceability, intended diff and preservation checks PASS. Phase 4C is complete and stops here; no commit or deployment.
