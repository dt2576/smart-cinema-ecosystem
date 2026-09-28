# Customer My Bookings, Tickets and Booking QR Frontend Preview Report

## 1. Task Information

- Task: Implement Customer Booking history, combined Booking/Ticket detail and Booking QR preview.
- Date: 2026-09-28.
- Module: Customer frontend; Booking and Ticket read previews.
- Type: Frontend implementation, local adapters, verification and documentation.
- Status: COMPLETE — all requested preview implementation and final verification checks PASS. Production integration remains deferred.

## 2. Requested Work

Implement `/my-bookings`, `/my-bookings/[bookingId]` and a Booking QR presentation using typed local fixtures. Preserve string IDs, independent Ticket states and whole COUPLE Seat Units. Provide loading, empty, error/retry and responsive list/detail navigation. Do not create backend endpoints, ownership, Payment verification, check-in mutations, Staff scanning, real Tickets or per-Ticket QR codes.

## 3. Documents Reviewed

- [Development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [frontend workflow](../../.agent/workflows/FRONTEND_WORKFLOW.md), applicable coding/UI/document/traceability/convention rules and [frontend instructions](../../frontend/AGENTS.md).
- [Project conventions](../development/project-conventions.md), checked before implementation and again for this report.
- [SRS v1.2](../srs/srs-v1.2.md): Booking/Ticket requirements, partial check-in, repeated Booking QR lookup, Customer flow and Ticket lifecycle.
- [BRD v1.2](../brd/brd-v1.2.md): Booking lifecycle/history and Ticket/Booking QR rules.
- [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md): Ticket, Booking QR, validation and Ticket-level check-in sections 33–36.
- [Project Scope v1.0](<../project-scope/project-scope v1.0.md>): legacy Ticket QR wording is superseded by the approved Booking QR model.
- [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx): UC-CUS-020, UC-CUS-021, UC-CUS-023 and UC-CUS-024.
- [Canonical Customer screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md), [implementation plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md), [Stitch inventory](../../.stitch/SITE.md), [metadata](../../.stitch/metadata.json) and [visual guidance](../../.stitch/DESIGN.md).
- Live Stitch project `1208499799798658711`, screen **Smart Cinema - Booking QR & Passes**, `b850455e65fc482a8ef3332cb672683d`; screenshot inspected. No Stitch changes.
- Existing Movie, Auth, checkout/Payment preview components and [Payment Result report](2026-09-28_payment-result-frontend_report.md); installed Next.js 16.3.5 page/async-params and useSearchParams documentation.

## 4. Requirements Traceability

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| BR-029; FR-BOOKING-004 | Booking lifecycle values | Preview display | PASS: PENDING, PAID, EXPIRED, CANCELLED fixtures; no transition actions |
| BR-032; FR-BOOKING-009, FR-BOOKING-010 | History and authorized Booking detail | Presentation only | PASS for requested local UI; PARTIAL for production requirements because ownership/backend reads are deferred |
| FR-BOOKING-006, FR-BOOKING-007 | Snapshot amounts and backend totals | Display only | PASS for preview: fixed local snapshots, VND format and explicit non-authoritative amount labels |
| BR-043; FR-TICKET-001; FR-BOOKING-012 | Issuance requires verified successful Payment | Boundary | PASS: no issuance; unpaid examples have no Tickets or QR; PAID labels are explicitly fictional |
| BR-044; FR-TICKET-002 | One Ticket per purchased Seat Unit | Preview model | PASS: whole COUPLE unit H9-10 has one Ticket for two guests; no half-unit records |
| BR-045; FR-TICKET-003 | Unique Ticket identity | Preview model | PASS for unique string fixture IDs; real issuance/persistence is deferred |
| BR-046; FR-TICKET-004 | One Booking QR per paid Booking | Preview model | PASS: one inert payload/asset per PAID sample; no Ticket contains a QR field |
| FR-TICKET-005, FR-TICKET-006 | Resolve QR and retrieve Booking/Tickets | Local read simulation | PASS locally: exact known payload lookup, unknown payload rejection, repeated read with unchanged independent Ticket states; production authorization deferred |
| BR-047; FR-TICKET-007, FR-TICKET-008 | Owned Booking QR and individual Ticket status view | Presentation only | PASS for requested fictional UI; PARTIAL for actual ownership, explicitly not implemented |
| FR-CHECKIN-009, FR-CHECKIN-010 | Mixed Ticket states and reusable Booking QR | Read-only presentation | PASS: two CHECKED_IN plus one VALID Ticket; repeated lookup does not consume QR or change statuses; actual check-in is NOT APPLICABLE |
| UC-CUS-020, UC-CUS-021, UC-CUS-023, UC-CUS-024 | History/detail/Tickets/Booking QR views | Preview flow | PASS for local screens and navigation; service integration remains deferred |

## 5. Implementation Summary

### Routes and visual structure

- `/my-bookings`: five fictional Bookings, newest first, with status, Movie poster/title, Cinema, Hall, Vietnam-time Showtime, Booking code and sample amount. Each links to combined detail using its unchanged string ID.
- `/my-bookings/[bookingId]`: canonical dark/gold two-column desktop structure, stacked on mobile. Screening, Concessions and sample amount breakdown accompany individual Ticket rows and one Booking QR panel.
- Shared navigation and the Home footer now link to My Bookings. The active header link follows the route. Existing Auth/account menu/session/logout logic is unchanged.
- Native shared dialog provides a focused Booking QR view with Escape dismissal and focus restoration. Opening it removes the inline QR image: only one QR image is rendered at a time.

### Local service boundaries and fixtures

- `BookingHistoryService` exposes list, detail and exact QR resolution. `TicketPreviewService` exposes read-only Ticket retrieval by string Booking ID. Adapters support cancellation and return cloned data; component mutation cannot alter fixtures.
- Default list: two PAID examples and one each PENDING, EXPIRED and CANCELLED. Fixture IDs exceed JavaScript's safe integer range and remain strings throughout.
- Main example `9007199254741101`: Tickets F7/F8 are CHECKED_IN; H9-10 is one VALID COUPLE Ticket. Counts are **3 Tickets / 3 Seat Units / 4 guests**. The second PAID example independently displays EXPIRED and CANCELLED Tickets.
- Dates, statuses and amounts are fixed example snapshots, not clock-derived eligibility or live customer facts. Unpaid samples represent Bookings that never issued Tickets.
- `?bookingPreview=empty` and `?bookingPreview=error` exercise Booking empty/fail-once/retry states. Detail additionally supports `?ticketPreview=empty` and `?ticketPreview=error`. Unknown Booking references show a recoverable not-found presentation.
- Checkout Payment Result stays separate. A local success does not populate history, mark any Booking PAID or issue Tickets/QR.

### Booking QR preview

- QR payloads use `SMART_CINEMA_PREVIEW:BOOKING:<fixture-id>`. They are inert text, not URLs, credentials, provider references, signatures or admission tokens.
- Two bundled PNG fixtures encode the two PAID sample Booking identities. No per-Ticket QR is generated or rendered. An invalid Ticket remains visibly invalid even when its Booking QR context can be viewed.
- “Reload sample from Booking QR” passes the exact local payload through the Booking adapter, then reads Tickets through the Ticket adapter. Repeated lookup preserves all Ticket states; there is no scanner or mutation API.
- Offline generation: from `frontend/`, run `node --experimental-strip-types scripts/generate-booking-preview-qr.mjs`. The generator reads the same typed Booking fixtures as the UI.
- Added development dependencies: `qrcode` for offline encoding; `jsqr` and `pngjs` for independent decode verification. None is imported by the application UI or calls an external QR service. Encoding uses the documented [node-qrcode API](https://github.com/soldair/node-qrcode).

## 6. Files Created

Paths below are repository-relative; no existing files were moved.

- `frontend/src/app/(public)/my-bookings/layout.tsx`
- `frontend/src/app/(public)/my-bookings/page.tsx`
- `frontend/src/app/(public)/my-bookings/[bookingId]/page.tsx`
- `frontend/src/features/booking/booking-history.types.ts`
- `frontend/src/features/booking/booking-history-service.ts`
- `frontend/src/features/booking/booking-history-service.test.ts`
- `frontend/src/features/booking/booking-history-shared.tsx`
- `frontend/src/features/booking/booking-history-preview.tsx`
- `frontend/src/features/booking/booking-detail-preview.tsx`
- `frontend/src/features/booking/booking-qr-preview.tsx`
- `frontend/src/features/ticket/ticket-preview.types.ts`
- `frontend/src/features/ticket/ticket-preview-service.ts`
- `frontend/src/features/ticket/ticket-preview-service.test.ts`
- `frontend/scripts/generate-booking-preview-qr.mjs`
- `frontend/public/images/booking-preview/9007199254741101.png`
- `frontend/public/images/booking-preview/9007199254741102.png`
- `frontend/test/booking-preview-qr.test.mjs`
- `frontend/test/e2e/booking-history.spec.ts`
- This report.

## 7. Files Modified

- `frontend/package.json`: include new unit/QR tests and offline QR development dependencies.
- `frontend/pnpm-lock.yaml`: dependency resolution.
- `frontend/src/components/layout/site-header.tsx`: My Bookings link and accurate active navigation.
- `frontend/src/features/home/home-screen.tsx`: replace the My Bookings footer placeholder with a link.
- `docs/ui-ux/screen-spec/customer-screen-map-v1.0.md`: record implemented local list/detail/QR coverage and production limitations.
- `docs/ui-ux/customer-frontend-implementation-plan-v1.0.md`: update slice 8 and remaining integration gates.

## 8. Verification

Commands run in `frontend/` unless specified otherwise.

| Check | Result | Evidence |
|---|---|---|
| TypeScript | PASS | `pnpm exec tsc --noEmit`, exit 0 after the visual fix |
| ESLint | PASS | `pnpm lint`, exit 0 after the visual fix |
| Unit tests | PASS | `pnpm test`: 49/49, including 7 new adapter/atomicity/QR tests |
| Actual QR decoding | PASS | Each bundled PNG decoded independently by jsqr to the exact fixture payload and resolved to the expected string Booking ID |
| Production build | PASS | `pnpm build`, exit 0 after the visual fix; static list and dynamic detail routes emitted |
| Full Playwright suite | PASS | Final production-build run: `$env:PLAYWRIGHT_CHANNEL='msedge'; pnpm test:e2e` — 66/66 tests passed in 6.0 minutes, including 6 new Booking/Ticket/QR tests and existing Auth/account-menu/checkout regressions |
| Desktop/mobile visual verification | PASS | Final list/detail/QR screenshots inspected at 1440px and 390px; poster, status rows, whole Couple unit, one QR and modal readable; 320px overflow assertion passed |
| Documentation/link/whitespace checks | PASS | 52 local Markdown links resolved; report paths and 12 numbered sections verified; `git diff --check` and whitespace scan of 23 changed/new text files passed |
| Protected-file preservation | PASS | 155 baseline files compared; only the intentionally modified shared header differs. Backend source/migrations, BRD/SRS, prior reports, Stitch, Auth and Payment feature files remain unchanged |
| Backend/PostgreSQL checks | NOT APPLICABLE | No backend, migration or API behavior changed |

The first browser run found an incorrect test assumption that one Tab from the last native-dialog control must focus the first control; Edge may visit browser chrome. The corrected test checks background inertness, dialog keyboard movement, Escape dismissal and focus restoration. Visual inspection also caught that the existing API Movie poster component rejects local asset paths; the Booking preview now renders its bundled fixture poster directly. Final production checks were restarted after that source fix.

Browser evidence is generated under ignored `frontend/test-results/`: `booking-history-desktop.png`, `booking-detail-desktop.png`, `booking-qr-desktop.png`, `booking-history-mobile.png`, `booking-detail-mobile.png`, `booking-qr-mobile.png`. Tests use desktop 1440×1000 and mobile 390×844, plus 320px overflow coverage. These are local verification artifacts, not committed product assets.

## 9. Requirement Reconciliation

- PASS: requested local history/detail/QR UI and list/detail navigation; canonical Booking QR screen selected; legacy Individual QR Ticket behavior excluded.
- PASS: whole COUPLE unit, one Ticket/two guests, independent/mixed status display, unique string IDs and no half-unit controls.
- PASS: exactly one Booking QR per PAID fixture, one image at a time across inline/dialog views, repeat read without consumption, and no QR on unpaid examples.
- PASS: explicit fictional data/non-authoritative amounts; no backend endpoints, ownership simulation, Payment verification, real issuance, Staff scanner, check-in mutation or external provider call.
- PARTIAL by authorized scope: real owned Booking history, Ticket status refresh, paid issuance and secured Booking QR resolution await backend contracts. This report does not certify those production requirements.

## 10. Deviations / Conflicts

- “One QR per Booking” is applied to **paid** Bookings as required by FR-TICKET-004 and BR-046. Creating QR codes for never-paid PENDING/EXPIRED/CANCELLED examples would conflict with those requirements; such examples show an unavailable state.
- Public canonical URLs are preview-only and display fictional, shared fixtures. They do not claim actual Customer ownership. Production access control is still required by FR-BOOKING-009/010 and FR-TICKET-007/008.
- Canonical Stitch supplies layout, not admission claims, status controls, scan/check-in actions, transfers, wallet passes or legacy per-Ticket QR behavior. Those are excluded.
- The approved serialized Ticket state is CHECKED_IN; no USED alias or new Ticket lifecycle value was introduced.
- Existing convention conflicts: historical Project Scope/System Analysis filenames retain spaces/underscores; left unchanged. Existing Node test runs emit the module-type warning; no unrelated package-module conversion was made. No new convention exception was requested or taken.

## Convention Compliance

Validated against [project conventions](../development/project-conventions.md), including the report itself.

| Area | Result | Notes |
|---|---|---|
| Folder naming | PASS | Feature-local Booking/Ticket code, lowercase script/assets folders; required Next route-group/dynamic-segment exceptions |
| File naming | PASS | Kebab-case source/test/script names; framework page/layout names; dated task report |
| Code naming | PASS | PascalCase components/types, camelCase functions, uppercase fixture constants |
| Domain terminology/statuses | PASS | Booking, Ticket, Cinema, Hall, Showtime, Seat Unit; approved uppercase status values |
| Routes/imports | PASS | Canonical plural routes and string bookingId; application alias imports; Node tooling uses direct relative imports because the application alias is not installed there |
| UI/component placement | PASS | Feature-specific UI; shared dialog/Button/layout reuse; semantic tokens and existing local Movie poster asset |
| API convention | NOT APPLICABLE | No new endpoints or network contract |
| Database convention | NOT APPLICABLE | No schema, persistence or migration edits |
| Documentation convention | PASS | New report preserves previous reports, real requirement IDs, relative references and explicit preview/production boundaries |

## 11. Known Limitations

- All Booking/Ticket data is fictional and public within the preview. No ownership, server-time validation, real Payment facts, inventory, issuance or check-in is implemented.
- Static fixture dates/statuses do not evolve with wall-clock time. The QR is deliberately unusable for real admission and contains no secure credential.
- Booking history is a small local fixture collection; no production history pagination, retention or filtering contract is invented.
- No scanner, Ticket transfer/download/wallet, real QR refresh/revocation policy or Staff workflow is added.
- Browser verification uses Edge on Windows and local fixtures; it is not live service acceptance or a complete cross-browser/accessibility certification.

## 12. Next Recommended Step

Define the owned Booking history/detail, Ticket read and Booking QR access contracts before replacing these adapters. Keep real issuance tied to verified PAID finalization, one Ticket per whole Seat Unit, and Staff-only Ticket-level check-in. No further implementation is authorized by this recommendation.
