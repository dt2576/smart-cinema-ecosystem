# Smart Cinema Implementation Report

## 1. Task Information

- Task: Integrate real Customer Concession composition into existing unpaid Booking
- Date: 2026-10-05, Asia/Ho_Chi_Minh
- Module: Customer Concession and owned Booking Summary
- Type: Frontend implementation against existing backend
- Status: COMPLETE; conditional live-write verification unavailable as documented below

## 2. Requested Work

Connect real active catalog and owned pre-Payment add/update/remove commands; display persisted immutable snapshots and exact authoritative totals after navigation/reload. Preserve original Seat/Hold origins, ownership and Booking deadline. Vietnamese UI. No Promotion/Payment/VNPAY/Ticket/QR/history/Admin expansion, deployment or migration.

## 3. Documents Reviewed

- Root/frontend AGENTS, canonical development/frontend workflows and applicable `.agent/rules/`; [project conventions](../development/project-conventions.md), report template and installed Next.js client-boundary documentation.
- Project Scope v1.0; Business Analysis v2.1 §29A; [BRD v1.2](../brd/brd-v1.2.md) §4.13A; [SRS v1.2](../srs/srs-v1.2.md) §§3.6–3.7/5.12/8.7.
- System Analysis & Design v1.1 DOCX: Customer use cases and §5.5.4 Concession rules; `.stitch/DESIGN.md`, current screen map/implementation plan.
- [Concession v1.0](../api/concession-composition-contract-v1.0.md); [Booking v1.0](../api/booking-contract-v1.0.md), [v1.1](../api/booking-contract-v1.1.md), [v1.2](../api/booking-contract-v1.2.md), [v1.3](../api/booking-contract-v1.3.md); existing frontend Booking/localization guides and handoff.
- Actual Concession Controller/DTO/Request/Repository/Service, Booking projection/owned reads, relevant database guards, existing Concession/Payment PostgreSQL tests, preview adapters and current Summary/Auth architecture.

Before implementation, naming/placement, requirement traceability and scope/conflict checks were completed. Existing backend supports the requested behavior; no schema blocker was found. Old V7 staging statements about disabled Promotion/impossible payment freeze are superseded by Booking v1.2/v1.3. Existing backend Promotion revalidation/freeze remains authoritative; this task adds no Promotion command. The high-level older journey sequence does not override the approved current owned-Booking composition contract.

The prior localization milestone was already committed at `d5feefe` and is preserved. No commit, reset or staging operation was performed for this task. A 621-file current-tree SHA-256 baseline and incoming index inventory were captured before task edits; the index remains unchanged.

## 4. Requirements Traceability

| Requirement/source | Description | Applicable | Result |
|---|---|---|---|
| User request §§0–34 | Real Concession integration, exact authority and scoped verification | Yes | Implemented; full regression PASS; conditional live-write limitation below |
| BRD v1.2 BR-065, BR-066, BR-067; BR-035 | Active optional add-ons, immutable snapshots, server totals | Yes | Real catalog/commands and stored Booking display; no frontend repricing |
| SRS v1.2 FR-CONCESSION-001, 004, 005, 006 | Active catalog, inactive additions forbidden, price/category constraints | Yes/preservation | Actual catalog fields; typed categories/decimal strings; backend validates stale availability |
| SRS v1.2 FR-BOOKING-013–017 | Select, snapshot, aggregate, quantity and removal | Yes | Explicit POST/PATCH/DELETE; server response and owned refetch |
| SRS v1.2 FR-BOOKING-018; Booking v1.3 | Historical integrity and first-Payment permanent freeze | Yes/preservation | Frozen/terminal read-only; no Payment initiation |
| SRS v1.2 FR-BOOKING-005, 006, 007, 010, 012 | Expiry, Seat snapshots, totals, ownership, no premature tickets | Preservation | Same identity/origins/deadline and exact monetary strings; no ticket/QR writes |
| System Analysis v1.1 UC-CUS-012, 013, 014, 017 | Selection, quantity, removal and Summary | Yes | Real owned editor, persisted Summary and safe navigation |
| System Analysis v1.1 BRULE-CON-001–006 | Active, positive quantity, snapshots, paid immutability, no inventory, backend totals | Yes | Existing rules retained; no stock or pricing policy invented |
| SRS v1.2 NFR-UX-005; NFR-SEC-011; NFR-REL-006 | Separated totals, safe errors and server time | Yes | Vietnamese amount rows/errors, exact values and explicit original UTC deadline |
| Admin Concession, real Promotion/Payment/Ticket/history | Separate functionality | Not applicable | No implementation in this task |

No requirement or Business Rule ID was invented; BRD/SRS/contracts were not changed.

## 5. Implementation Summary

### Contract audit and migration decision

| Concern | Actual existing contract and implementation |
|---|---|
| Catalog | Public GET `/api/v1/concession-items`; ACTIVE only; no query; string id/name/nullable description/category/exact sellingPrice/nullable imageUrl; no exposed availability/stock/status |
| Add | Owned CUSTOMER POST `/api/v1/bookings/{id}/concessions`, only itemId/string and quantity/integer; every POST creates a distinct line |
| Quantity/remove | PATCH the line with only quantity; DELETE line without body; zero is not removal |
| Quantity capacity | Integer 1–2147483647, existing PostgreSQL storage capacity; malformed/fraction/negative/overflow rejected |
| Line snapshots | String id/itemId, immutable name/category/unitPrice; integer quantity and exact totalPrice, returned by Booking |
| Eligibility | PENDING, unexpired, null paymentStartedAt, valid owned attached origins and current screening/parent/Seat eligibility; backend rechecks after lock waits |
| Totals | Authoritative five Booking monetary fields; current applied Promotion may be revalidated by backend; no frontend formula or Promotion mutation |
| Concurrency | Serialized commands; absolute PATCH last accepted wins; no version/CAS; POST not idempotent; missing removal 404 |
| Errors | Safe 400/401/403/404/409/service/invalid-response states; no raw detail rendered |
| Schema | V12 already supports everything; no backend changes, V1–V12 edits or V13 |

### Frontend and Vietnamese UX

Eligible confirmed Summary now offers **Thêm bắp nước**/**Chỉnh sửa bắp nước** and opens `/bookings/{bookingId}/concessions`. The new screen independently reads owned Booking/catalog. It preserves dark panels, warm primary controls, responsive layout and keyboard focus. Each catalog card has quantity and explicit **Thêm món**; each saved line has **Lưu số lượng**/**Xóa món**. No bulk replacement/automatic merge is assumed. Terminal/frozen/elapsed records show read-only copy and retained data, with no mutation controls. Catalog category filters are local; server order/IDs remain distinct.

The real flow imports no preview/mock adapter and has no fixture fallback. Static preview routes remain separate to preserve prior behavior. Optional supplied images render with safe references; absent/broken images use a neutral icon. Server-authored English demo/catalog text remains unchanged, while labels/actions/errors are Vietnamese.

### Snapshots, exact amounts and deadline

Editor and Summary render line name/category/quantity/unitPrice/totalPrice from the Booking. A changed catalog price/name or absent inactive item cannot reprice existing lines. Existing inactive lines remain quantity-update/removal candidates when backend eligibility allows. New additions require current ACTIVE authority.

All totals are read from the server, preserving exact decimal strings, zero, large values and four fractional digits through the existing formatter. BigInt checks validate response consistency only, including unique line IDs and line multiplication; they never replace totals or implement pricing. There is no currency inference, conversion, rounding, client quote, discount calculation or Seat repricing.

Mutation receipts must preserve Booking identity, creation, Seat snapshots/origins, seatAmount and original expiresAt. Countdown uses returned serverTime plus monotonic elapsed time; original expiry is unchanged by add/update/remove/reload/back. Explicit UTC remains because the DTO lacks a display timezone. No Hold/create/release/replacement action is added by the editor.

### Auth, races and recovery

Bearer authentication remains the sole submitted Customer authority. Foreign access remains safe 404; wrong role/inactive account 403. Validated internal login return now includes the exact owned Concession URL; external/query/hash/overflow paths are rejected. Login/reload never replays writes.

One in-flight ref gates editor reads and writes, including rapid repeated clicks. Each explicit command first reads fresh owned detail and afterward reconciles complete owned/catalog state. Focus/pageshow/visibility and 30-second refresh update stale tabs. No optimistic stored amount/line is used. Two tabs retain distinct accepted adds, and the server's last accepted absolute PATCH quantity wins; no invented client version is sent.

Conflict/missing-line errors cause safe refetch without replay. Network/5xx/malformed success is uncertain: owned detail is refetched, writes stay disabled until successful read plus explicit Customer review. Failed reads keep writes blocked. A further POST is clearly a new line. The contract has no command identity, so a read cannot prove rollback or identify which request created a line; no such claim is made. Abort/unload does not prove rollback; future entry is restored through reads.

## 6. Files Created

- `frontend/src/app/(public)/bookings/[bookingId]/concessions/page.tsx`
- `frontend/src/features/concession/concession-api.ts`
- `frontend/src/features/concession/concession-composition-service.ts`
- `frontend/src/features/concession/use-concession-composition.ts`
- `frontend/src/features/concession/owned-concession-screen.tsx`
- `frontend/src/features/concession/concession-api.test.ts`
- `frontend/test/e2e/helpers/customer-concessions.ts`
- `frontend/test/e2e/customer-concession-composition.spec.ts`
- `docs/development/customer-concession-composition-frontend.md`
- This report

## 7. Files Modified

- `frontend/src/features/booking/booking-api.ts`: validate unique Concession line identities and exact per-line arithmetic.
- `frontend/src/features/booking/owned-booking-summary-screen.tsx`: real editor entry/editability and persisted unit-price/category display.
- `frontend/src/features/auth/auth-return.ts`: allow validated owned Concession return path.
- `frontend/package.json`: include the new unit test file in the existing runner.
- `frontend/README.md`: current real integration link.
- `docs/development/customer-booking-creation-frontend.md`: current real Concession continuation/boundary.
- `docs/ui-ux/screen-spec/customer-screen-map-v1.0.md`: current Concession route coverage and dated delta.
- `docs/ui-ux/customer-frontend-implementation-plan-v1.0.md`: dated current implementation note.
- `docs/ai/current-handoff.md`: current milestone, verification, limitations and next task.

No tracked file moved. Backend, migrations, API contracts, requirements, historical reports, canonical conventions and Stitch artifacts remain unchanged.

## 8. Verification

| Check | Actual result |
|---|---|
| `pnpm exec tsc --noEmit` | PASS on final source |
| `pnpm lint` | PASS on final source; no ESLint errors/warnings |
| `pnpm test` | PASS: 94/94, no failures/skips; original 84 plus 10 new cases |
| `pnpm build` | PASS: final production build and new route generated |
| New Playwright cases | PASS: 15/15 without retries, also passed in final full run |
| Full installed-Edge `pnpm test:e2e` | PASS: 130/130 on final production source, 6.9 minutes; one worker, normal timeouts, no retries/skips; exit 0 |
| Backend `mvn verify` | PASS: 294 tests, zero failures/errors/skips; BUILD SUCCESS, 1:26, completed 2026-10-05T18:47:26+07:00 |
| Isolated PostgreSQL snapshot/persistence proof | PASS within full backend regression; existing schema-isolated Concession and Payment tests |
| Production browser desktop/mobile/keyboard | PASS for new fixture-backed editable flow and limited real Neon read-only flow |
| Live Neon V12/read-only data/browser | PASS: 12 migrations validated; five actual catalog items, ordinary Customer auth and terminal owned Booking |
| New live Neon Booking/add/update/remove persistence | NOT RUN: zero existing future OPEN_FOR_BOOKING/cutoff-valid Showtime; no scheduling changes authorized |
| Neon preservation | PASS: 19 original domain/history/financial fingerprints and V1–V12 applied checksums identical; no new business writes |
| Final scope/UTF-8/docs/whitespace/conventions | PASS: 9 modified and 10 created files; 612/621 original files unchanged; 19 original E2E files unchanged; strict UTF-8, 117 local Markdown links, report inventory and whitespace verified |

Backend verification used the existing dedicated local PostgreSQL regression database and all existing Movie/Discovery/Seat/Booking/Concession/Promotion/Payment/VNPAY/Demo flags, not Neon destructive tests. Backend source was unchanged.

New browser coverage checks full Movie → Cinema → Showtime → Seat → Hold → Booking → Summary → Concession flow on desktop/mobile, exact payload/auth/IDs, add/update/remove, persisted reload/back, original deadline/Seat origins, inactive/stale item, zero/fraction/quantity capacity, duplicate product lines/clicks, lost/malformed committed responses, failed reconciliation, expiry/freeze races, two tabs, terminal/foreign/role/auth resume and absence of Promotion/Payment calls. Original 115 scenarios and assertions are retained. Initial new-test failures were selector ambiguity against Summary Seat list/Next.js route announcer, corrected by waiting for the destination screen and scoping semantic regions. No retry masking was added. One exploratory full run was interrupted for final read-only wording; only the final full run counts as acceptance.

Snapshot immutability is proven by existing `ConcessionPostgresTests.addUpdateRemoveRecalculatesAndPreservesSeatAndHoldSnapshots`: isolated database catalog is renamed/repriced to 999 and made INACTIVE, yet stored old-name/unitPrice remains during quantity update/removal with original Seat/expiry. `repeatedItemCreatesDistinctLinesWithOwnSnapshots` proves distinct additions take distinct snapshots. Existing concurrent-add/quantity/cancellation/expiry tests and `PaymentPostgresTests.initiationVersusConcessionEditFreezesOnlyACompleteComposition` prove server aggregate/lock/freeze boundaries. No shared Neon catalog edit was used to manufacture this evidence.

Live preflight sampled database time `2026-10-05T11:54:46Z`: 73 Showtimes, latest start 2026-10-09T16:17Z, **zero future open/cutoff-valid records**. The later Showtime is cancelled. No new scheduling record, catalog mutation, Hold, Booking, Payment, VNPAY, Ticket or QR was created. Ordinary existing QA Customer login without session fabrication/interception rendered owned CANCELLED Booking 1 and actual five-item catalog on the final production build; read-only controls, reload, mobile overflow and keyboard focus passed with no page errors. These are limited real read checks, not a live composition persistence claim. Only expected Auth token activity occurred; no business cleanup was needed.

Logs/scripts/captures are local ignored verification artifacts. Final logs and representative live/fixture captures are copied under `frontend/target/customer-concession/`; Playwright output remains under `frontend/test-results/`. Credentials and JWTs are not included in tracked files or this report.

Representative final captures: [editable desktop](../../frontend/target/customer-concession/composition-desktop.png), [editable mobile](../../frontend/target/customer-concession/composition-mobile.png), [real Neon read-only desktop](../../frontend/target/customer-concession/live-read-desktop.png), [real Neon read-only mobile](../../frontend/target/customer-concession/live-read-mobile.png). These local ignored artifacts are not committed. Editable captures use the explicitly isolated HTTP contract fixtures; live captures use actual APIs without interception.

## 9. Requirement Reconciliation

Implementation preserves server ownership, ACTIVE new-selection policy, positive bounded storage quantities, immutable line/Seat snapshots, original deadline, exact authoritative totals, current Promotion revalidation and Payment freeze. Optional zero-line Bookings remain valid. Direct entry/reload/back depend on owned reads, without client persistence authority. No out-of-scope command/integration was added. Final full regression and requirement/convention reconciliation PASS. Conditional live-write verification is unavailable because the current catalog schedule has no eligible Showtime; this is a data dependency, not a schema blocker or an unimplemented API.

## 10. Deviations / Conflicts

No approved convention exception or new business policy was needed. Old contract staging is resolved through its existing additive versions, without editing history. Existing legacy System Analysis DOCX filename and earlier planning narratives are retained with dated current notes. The committed localization milestone is preserved.

The only verification deviation is the unavailable full live unpaid-Booking transaction. Backend isolated PostgreSQL and browser contract fixtures prove persistence/snapshot/race behavior; real Neon/browser evidence proves catalog/owned terminal read only. No full live-write claim is made.

## Convention Compliance

Validated against [project conventions](../development/project-conventions.md).

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | Existing feature/lib/test/docs placement; plural App Router route; kebab-case files; correctly dated new report |
| Code naming/domain terms | PASS | English identifiers and existing Booking/Concession terminology; Vietnamese presentation only |
| Routes/imports/statuses | PASS | Existing API resources/serialized values unchanged; `@/` imports; required client directives first |
| API convention | PASS | Typed client mirrors approved fields/verbs; no endpoint or authority-field invention |
| Database convention | N/A | No database source change; V12 head retained, no V13 |
| Documentation/history | PASS | Current guides/handoff/planning notes; no requirements/contracts/historical report rewrite |
| Dependencies/tests | PASS | No dependency added; same runner/config and original scenarios retained; no new retries/skips |
| UTF-8/scope/report self-check | PASS | SHA-256 baseline, exact 19-file inventory, strict UTF-8, resolved local links, unchanged index and whitespace checks; report rechecked after final updates |

## 11. Known Limitations

- Full new live Concession transaction needs an existing eligible future open Showtime. This task does not create scheduling/catalog data to bypass that dependency.
- The API has no version/CAS or POST command identity; last accepted quantity wins and uncertain writes require owned read plus explicit review. A read cannot prove rollback or assign a line to a particular tab.
- Booking DTO omits full eligibility/cutoff/currency/display-zone metadata. Backend may reject a seemingly eligible screen; exact amounts and explicit UTC remain without guesses.
- Catalog does not expose branch stock/status, and existing inactive snapshot lines need not appear there. Names/descriptions from the real development dataset may be English; static UI is Vietnamese.
- Existing applied Promotion can cause backend conflict during a Concession edit. Its application/removal is a separate task; no client workaround changes discount rules.
- Static Concession/Payment/history/Ticket previews remain separate demonstrations. No live Payment or issuance is implied. No deployment was performed.

## 12. Next Recommended Step

**Real Customer Promotion application/removal integration into the existing unpaid Booking.** Recommendation only. Stop after this integration is accepted; do not begin Promotion automatically.
