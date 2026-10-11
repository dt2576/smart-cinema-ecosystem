# Phase 3C — Real Customer My Bookings, Booking Detail, Tickets and Booking QR

## 1. Task Information

- Date: 2026-10-11, Asia/Ho_Chi_Minh.
- Type: frontend implementation; existing Customer routes and approved Phase 3B read contract.
- Status: COMPLETE — real Customer routes implemented; final frontend checks and full Playwright regression PASS.
- Entry HEAD: `e68e37d` (`feat(booking): add customer history and ticket QR read APIs`).
- Entry working tree: only the untracked Phase 3A audit report. It is preserved byte-for-byte and remains outside this task's changes.
- No reset, staging, commit, deployment, database action or Stitch mutation performed.

## 2. Requested Work

Replace `/my-bookings` and `/my-bookings/[bookingId]` preview consumption with authenticated owned Booking history/detail and issued Ticket/QR reads. Implement the six supplied Stitch references within supported contracts, safe login/navigation/session recovery, exact decimal and bigint preservation, complete entitlement validation, one UTF-8 Booking QR, responsive/accessibility QA and full frontend regression. Stop before Phase 4.

## 3. Documents Reviewed

- [Development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [project conventions](../development/project-conventions.md), [root instructions](../../AGENTS.md), [frontend instructions](../../frontend/AGENTS.md), [frontend workflow](../../.agent/workflows/FRONTEND_WORKFLOW.md), applicable Coding/UI/Requirement Traceability/Document/Convention rules and [report template](templates/TASK_REPORT_TEMPLATE.md).
- [Phase 3A audit](2026-10-11_customer-booking-history-ticket-qr-contract-audit_report.md), [Phase 3B implementation](2026-10-11_customer-booking-history-ticket-qr-backend_report.md), [Customer history/Ticket/QR contract v1.0](../api/customer-booking-history-ticket-qr-contract-v1.0.md).
- [Phase 1 shared foundation](2026-10-11_shared-ui-foundation_report.md), [Phase 2 Booking/Payment UI](2026-10-11_customer-booking-payment-stitch-ui_report.md), [Stitch assessment](2026-10-10_stitch-frontend-implementation-assessment_report.md), [current handoff](../ai/current-handoff.md), [Customer screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md), [.stitch/DESIGN.md](../../.stitch/DESIGN.md).
- [BRD v1.2](../brd/brd-v1.2.md) §§4.6/4.9; [SRS v1.2](../srs/srs-v1.2.md) Booking, Ticket, ownership, security and UX; [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md) Seat Unit/Ticket invariants; [project scope v1.0](<../project-scope/project-scope v1.0.md>). Semantic DOCX inspection of [System Analysis v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx) confirms UC-CUS-020/021/023/024 names and matches the Phase 3A traceability.
- Existing [Booking v1.0](../api/booking-contract-v1.0.md), [v1.3 freeze contract](../api/booking-contract-v1.3.md); actual `BookingController`, `BookingResponse`, `BookingReadController`, `BookingReadService`, `BookingHistoryItem`, `BookingHistoryResponse`, `BookingTicketsResponse`, `CustomerTicket` and ownership/security source. Backend files were inspected only.
- Installed Next.js 16 documentation at `frontend/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`: asynchronous route params, client lifecycle/browser APIs and server/client boundaries. Existing React 19, TypeScript 5, Tailwind 4 architecture retained.

### Live Stitch evidence and mapping

Read-only MCP `get_screen` succeeded for all six screens in project `1208499799798658711`. Each supplied a valid title/ID and accessible HTML/PNG export; all twelve assets were downloaded and all six PNGs inspected. HTML tokens/layout and unsupported controls were inspected. No generation-job status is exposed by this response; accessible exports do **not** certify generation completion.

| Design | Stitch screen ID | Export size | Implemented mapping |
|---|---|---|---|
| My Bookings desktop | `4b9b19206fc14015a77322f58b113bd1` | 2560 × 5730 | `OwnedBookingHistoryScreen`: status header, screening/card content, exact total, detail CTA and feedback |
| Booking Detail desktop | `c7f09eb14aa44fbfa2cfc44e86753013` | 2560 × 3898 | `OwnedBookingDetailScreen`: screening, purchased units, individual Ticket status, concessions/promotion/totals, QR sidebar |
| Booking QR Pass desktop | `265e1328babf486b9245fb508624d9e6` | 2560 × 3554 | `BookingQrPass`: one high-contrast code and accessible enlargement dialog |
| My Bookings mobile | `3f5732811dba482e95b07e5aa6251b21` | 780 × 3354 | Stacked owned cards and existing responsive header |
| Booking Detail mobile | `28c2fd5f49c0437eb2e77f8b9814be84` | 780 × 3732 | Stacked single-column composition/Tickets/QR with readable Vietnamese copy |
| Booking QR Pass mobile | `d989b7d6ffb04be6a964be21e298a4fa` | 780 × 2460 | Bounded responsive modal, close/Escape/keyboard/focus restoration |

Nocturne semantic palette/fonts and Phase 1 `SurfaceCard`, `StatusBadge`, `StatusFeedback`, `Skeleton`, `Button` and icons are reused. Phase 2 `BookingShowtimeCard` is reused. Existing site header/footer and route layout remain unchanged. Assets and sanitized ID/title/dimension/SHA-256 evidence live under ignored `frontend/target/customer-my-bookings-ticket-qr-2026-10-11/`.

**Contract adaptations:** decorative film glyphs replace unsupported poster URLs. No global status counters, search/filters, cinema address, duration/age/classification, membership, countdown extension, refund, wallet, transfer/share/download, NFC, automatic gate, food-pickup QR, scanner status or admission window is copied from Stitch. UI demonstration-state selectors are absent. This is Stitch-inspired presentation within actual data, not a pixel-identical copy of unsupported design content.

## 4. Requirements Traceability

| Actual requirement / source | Applied behavior | Result |
|---|---|---|
| BRD v1.2 BR-032; SRS v1.2 FR-BOOKING-009; System Analysis UC-CUS-020, as verified in Phase 3A | Customer-owned paginated history | Implemented through supported collection GET |
| FR-BOOKING-010, FR-AUTH-009; UC-CUS-021 | Owned detail and authentication | Existing detail GET plus new owned entitlements; narrow login resume and session scoping |
| BR-043–045; FR-TICKET-001–003/009; INV-05–07/14 | Backend issuance and one Ticket per Seat Unit | Read only; complete unique identities and Seat Unit correspondence checked; no issuance inferred from Payment |
| BR-046; FR-TICKET-004/007; UC-CUS-024 | One Booking QR | Exact server token encoded as UTF-8 bytes; one displayed QR, no wrapping/signing/rotation |
| BR-047; FR-TICKET-008; UC-CUS-023 | Owned independent Ticket statuses | Exact VALID/CHECKED_IN/EXPIRED/CANCELLED labels and account-clearing behavior |
| NFR-SEC-009; FR-AUTH-009 | QR privacy and ownership | Bearer/no-store reads, safe errors, no token URL/storage/analytics; backend remains authorization authority |
| INV-08/13/14; Booking v1.3 | No Customer Check-in, exact snapshots/freeze/original expiry | Read-only composition; original expiry retained and does not hide paid entitlements |
| NFR-UX-004/005 | Understandable errors and separated financial totals | Vietnamese feedback, explicit UTC, distinct exact amount lines |
| FR-TICKET-005; Staff Check-in requirements | QR resolution/admission workflow | NOT APPLICABLE to implementation; still requires an independently audited backend contract |

Requirement IDs come from the cited current documents and Phase 3A audit. Task-specific responsive widths, validation and dialog behavior are task/design acceptance criteria, not invented FR/UC IDs.

## 5. Implementation Summary

### API inventory and validation

| Operation | Actual supported endpoint | Validation / authority |
|---|---|---|
| History | GET `/api/v1/bookings?page=0&size=20` | Existing ACTIVE CUSTOMER gate; strict echoed page/size/counts, page 0–2147483647, size 1–100, fixed createdAt DESC/id ASC order |
| Owned Booking | GET `/api/v1/bookings/{bookingId}` | Reuses unchanged `getBooking`/`validateBooking`; exact requested ID, complete purchased composition and exact integer arithmetic checks |
| Issued entitlements | GET `/api/v1/bookings/{bookingId}/tickets` | Exact Booking ID/status, UTC serverTime, typed complete unique Ticket identities/codes/Seat Units and opaque token |

All requests explicitly use GET, Bearer token, `cache: no-store`, `credentials: omit` and AbortSignal through the existing same-origin `/api/v1` backend rewrite. There is no owner override, Payment ID, provider query or automatic POST. The reader only retains approved history/entitlement DTO fields.

IDs remain canonical positive-bigint strings bounded by `9223372036854775807`. Money remains the exact numeric(19,4) text. Presentation reuses `formatBookingAmount`, preserving Phase 2 separators and all four fractional digits; it does not round, convert through Number, reprice or invent a currency/fee field. UTC instants are structurally/calendar validated. Read ordering retains Java Instant's up-to-nine fractional digits rather than silently truncating stale comparisons to milliseconds.

History uses only contracted card fields and 20-item pages. Empty collection, out-of-range page, malformed metadata, unavailable service, authentication requirement and retry each have explicit UI. Page transitions remount the resource reader, preventing a late page response from replacing the current page. Pagination metadata comes from the server, not global counts derived from visible cards.

### Entitlement reconciliation and statuses

Detail reads Booking and entitlements concurrently; separate HTTP snapshots may differ. The client requires echoed identity and identical Booking status. PAID additionally requires complete one-to-one mapping between Tickets and all Booking Seat IDs/Seat IDs, matching snapshot seatType and guestCount. Duplicate Ticket IDs/codes, duplicate Seat/Booking Seat references, missing rows, unknown status/type, malformed token or mismatched projections fail safe. No partial Ticket list or QR is displayed after failure.

Within a mounted session, a recheck also verifies immutable origins, permanently frozen composition/marker and original expiry; older server times, previously paid state downgrade, changed issued token or Ticket identities require review. No previous Payment attempt is selected or queried. This makes paid entitlement recovery independent of a lost/older FAILED Payment attempt without introducing an unknown frozen-Payment recovery policy.

| Backend Booking state | Vietnamese display / entitlements |
|---|---|
| PENDING | Chờ thanh toán; null QR/empty Tickets only |
| PAID | Đã thanh toán; QR/Tickets only after full aggregate validation |
| EXPIRED | Hết hạn; null QR/empty Tickets only |
| CANCELLED | Đã hủy; null QR/empty Tickets only |
| Read disagreement / malformed / stale | Cần kiểm tra lại thông tin vé; QR and Ticket list suppressed |
| Network/5xx/rate limit/auth failure | Safe unavailable/login/role guidance; no local paid/issuance assumption |

| Backend Ticket state | Vietnamese label |
|---|---|
| VALID | Chưa sử dụng |
| CHECKED_IN | Đã check-in |
| EXPIRED | Hết hạn |
| CANCELLED | Đã hủy |

Ticket statuses are read only; no expiry/admission window is calculated from the browser clock. COUPLE is one purchased unit, one Ticket and two guests. PAID remains readable after the original pre-sale expiresAt, with that timestamp explicitly distinguished from Ticket usage expiry. Frozen concessions/promotion are displayed without editing actions. Pending detail may link to the existing Summary/Payment panel; this navigation does not initiate Payment.

### QR encoding and privacy

The existing `qrcode` 1.5.4 package is moved from development to runtime dependencies; only `@types/qrcode` 1.5.6 is added for compile-time types. No UI framework migration. The renderer supplies one explicit byte segment from `TextEncoder().encode(bookingQr)`, medium error correction, four-module quiet zone, 320px output and opaque black/white modules. Algorithmic black/white colors are intentional QR contrast, not a new Nocturne palette.

The server-issued token is preserved exactly, including valid surrounding spaces and Unicode. No ID, URI prefix, JSON wrapper, PII, extra token or financial signature is inserted. One inline image is replaced by one modal image during enlargement; there is no per-Ticket QR. Node and browser PNG decoding verify both decoded text and byte identity. QR text is never rendered as a visible token, placed in a link, persisted to local/session storage, logged or sent to analytics. The necessary QR image exists only in the current component's memory/DOM and is removed with invalidation/unmount.

Native `dialog.showModal()` makes background inert; explicit Tab/Shift+Tab wrap, Escape, touch-sized close controls, body scroll restoration and trigger focus restoration are implemented. The modal uses a bounded viewport-relative width/height and responsive image. This verifies local rendering, not scanner acceptance.

### Authentication, recovery and request lifecycle

Existing AuthProvider/storage/renewal/logout implementations are unchanged. Customer pages wait for hydration, require the existing session and restrict cached-role presentation to CUSTOMER; backend still verifies current ACTIVE role and ownership. A narrowly scoped `customerLoginReturn` addition accepts only exact `/my-bookings` and `/my-bookings/{canonical-positive-bigint}` without query/fragment. External, protocol-relative, escaped, malformed/overflow ID and unsupported variants are rejected.

Reader components are keyed by Booking ID/page and account ID/access token. Logout/account/token change unmounts old state and aborts old requests; later old responses cannot display another account's data. Entitlement data is hidden during every recheck and on tab hide, then validated from fresh owned reads on return. Direct entry, reload, back/forward, login resume and two actual tabs are covered. Session rejection offers explicit safe sign-in.

Reads have a 30-second transport timeout, one active request group per mounted reader, AbortController/identity guards and event-driven focus/pageshow/visibility recheck throttled to two seconds. There is **no interval polling** or unbounded reconciliation loop. Automatic event reads stop on 400/401/403/404/429; a safe explicit retry is available for transient/rate-limit failure. No GET changes a deadline, composition, financial or Ticket state.

### Preview migration

The two real route entry points now import only owned screen components and use real/noindex metadata. They no longer import the preview heading, mock history/detail services or static preview QR. No silent fallback exists, and `bookingPreview`/`ticketPreview`/financial query values cannot create data. Existing inert preview modules/assets are retained for their standalone unit tests/reuse; they are unreachable from these real routes and no new demo route is added.

All six existing history browser scenarios are replaced with equivalent authenticated HTTP-fixture coverage: navigation/whole units, single enlarged QR/focus, unpaid and independent invalid Ticket statuses, loading/empty/error/retry/not-found, desktop and mobile/shared navigation. Existing whole-Customer journey assertions now use the same real-read fixture slice only for its history/detail stage; earlier preview Booking/Payment boundaries remain asserted. No test case is dropped or skipped. New tests add stricter validation/session/security/responsive coverage.

## 6. Files Created

| File | Purpose |
|---|---|
| [booking-read.types.ts](../../frontend/src/features/booking/booking-read.types.ts) | Exact history/entitlement DTO types |
| [booking-read-api.ts](../../frontend/src/features/booking/booking-read-api.ts) | Authenticated GET readers, validation and reconciliation |
| [use-owned-booking-read.ts](../../frontend/src/features/booking/use-owned-booking-read.ts) | Bounded/cancelled session/resource read lifecycle |
| [owned-booking-feedback.tsx](../../frontend/src/features/booking/owned-booking-feedback.tsx) | Shared scoped loading/access/error presentation |
| [owned-booking-history-screen.tsx](../../frontend/src/features/booking/owned-booking-history-screen.tsx) | Real history cards/pagination |
| [owned-booking-detail-screen.tsx](../../frontend/src/features/booking/owned-booking-detail-screen.tsx) | Validated composition/Tickets/QR view |
| [booking-qr-renderer.ts](../../frontend/src/features/ticket/booking-qr-renderer.ts) | Exact UTF-8 QR encoding |
| [booking-qr-pass.tsx](../../frontend/src/features/ticket/booking-qr-pass.tsx) | One QR and accessible dialog |
| [auth-return.test.ts](../../frontend/src/features/auth/auth-return.test.ts) | Narrow history resume allowlist |
| [booking-read-api.test.mjs](../../frontend/test/booking-read-api.test.mjs) | Typed reader/validation/security unit coverage |
| [customer-entitlements fixture](../../frontend/test/fixtures/customer-entitlements.ts) | Explicit test-only DTO fixtures |
| [HTTP fixture helper](../../frontend/test/e2e/helpers/customer-entitlements.ts) | Browser API/auth/error/delay fixtures |
| [customer-booking-entitlements.spec.ts](../../frontend/test/e2e/customer-booking-entitlements.spec.ts) | 22 new browser scenarios |
| This report | Task evidence and limitations |

## 7. Files Modified

- [My Bookings page](<../../frontend/src/app/(public)/my-bookings/page.tsx>) and [detail page](<../../frontend/src/app/(public)/my-bookings/[bookingId]/page.tsx>): real owned components/metadata; same URLs/layouts.
- [auth-return.ts](../../frontend/src/features/auth/auth-return.ts): narrow allowlist addition; previous destinations retained.
- [package.json](../../frontend/package.json) and [frontend lockfile](../../frontend/pnpm-lock.yaml): existing QR renderer runtime classification, types and two additional unit-test entries. Framework versions/test configuration unchanged.
- [booking-preview-qr.test.mjs](../../frontend/test/booking-preview-qr.test.mjs): retains old inert image case, adds production renderer round-trip case.
- [booking-history.spec.ts](../../frontend/test/e2e/booking-history.spec.ts): six equivalent real-read fixture scenarios replace preview expectations.
- [customer-final-qa.spec.ts](../../frontend/test/e2e/customer-final-qa.spec.ts): real history fixture stage and exact GET allowlist; earlier Auth/seat/preview Payment assertions retained.
- [current handoff](../ai/current-handoff.md): additive Phase 3C milestone; previous accepted evidence remains historical.

Total task scope: 13 new frontend/test files + this report; eight existing frontend files and the handoff modified. Entry Phase 3A report remains preserved and untracked. No existing source file is moved. Local draft test naming was resolved before finalization to use the existing Node `.mjs` infrastructure for explicit TypeScript fixture imports.

## 8. Verification

Commands use the existing frontend configuration, production `pnpm start --port 3100`, one Playwright worker and installed Edge via process-only `PLAYWRIGHT_CHANNEL=msedge`. No configuration retries, skips, environment-file edits or test weakening.

| Check | Actual result |
|---|---|
| Baseline `pnpm exec tsc --noEmit`, `pnpm lint` | PASS, exit 0 |
| Baseline `pnpm test` | PASS — 138/138, 0 failed/cancelled/skipped/todo |
| Baseline `pnpm build` | PASS, exit 0 |
| Baseline `pnpm exec playwright test booking-history.spec.ts` | PASS — 6/6, 24.7s |
| Final `pnpm exec tsc --noEmit` | PASS, exit 0 |
| Final `pnpm lint` | PASS, exit 0; 0 ESLint errors/warnings |
| Final `pnpm test` | PASS — 151/151; original 138 + 13 new cases; 0 failures/cancelled/skipped/todo |
| Final `pnpm build` | PASS, exit 0; existing route inventory preserved |
| Focused `pnpm exec playwright test booking-history.spec.ts customer-booking-entitlements.spec.ts customer-final-qa.spec.ts` | PASS — 35/35, 1.2m; 6 migrated + 22 new + 7 existing Customer QA scenarios |
| Final full `pnpm exec playwright test` | PASS — 272/272, 10.4m, exit 0; original 250 scenarios retained (six migrated) + 22 new; 0 failures/skips/retries |
| Responsive/keyboard/QR visual QA | PASS on focused production render: 390/768/1440px plus existing 320px case; 24 focused screenshots archived and representative images inspected |
| Backend `mvn verify` | NOT RUN — backend untouched; Phase 3B 317/317 is historical evidence, not this task's rerun |
| Neon, VNPAY, actual live SUCCESS/PAID/issuance/signed callback/Staff scan | NOT RUN — no database/provider/financial/admission actions |

SHA-256 comparison of all 687 entry files confirms exactly the nine listed existing-file changes; the other 678 entry files, including every backend/migration/financial validator, previous report/contract and the incoming Phase 3A audit, are unchanged. HEAD and staged diff remain unchanged. UTF-8, final newlines, trailing whitespace and 101 documentation links across this report/handoff were checked.

Final scalar check exit codes are in ignored `final-command-results.json`; baseline/focused/full logs and SHA-256 manifests remain in the task's ignored evidence directory. The final full run will include the final nanosecond-ordering refinement; the successful focused run preceded that refinement, whose additional unit case passed on final source.

### Failure history and corrections

1. Initial new TypeScript fixture check rejected ES2020 bigint literals under the existing ES2017 target. Fixtures now use `BigInt(...)`; compiler target/configuration unchanged.
2. First expanded unit run failed to resolve one extensionless relative TypeScript fixture import in Node's native stripping infrastructure. The reader tests use a conventional `.mjs` test with explicit `.ts` fixture import; the original alias registrar/test cases remain unchanged. Next run passed 150/150; final nanosecond case increases this to 151/151.
3. Initial browser collection failed on `import.meta` in Playwright's existing CommonJS transform. Test PNG decoder uses `createRequire(resolve("package.json"))`; module/test configuration unchanged.
4. First collected focused run: 25 passed, 9 failed, 1.3m. All nine failures were ambiguous `alert` selectors matching both the feature's alert and Next's route announcer. Selectors are scoped to `main`; assertions remain intact. The subsequent focused run passed all 35 cases, including an added actual-two-tab scenario. No assertion or scenario was removed to conceal failure.

PowerShell can wrap native stderr progress (`$ eslint`, color warnings) as `NativeCommandError` text even with native exit 0; this is not an ESLint failure. Actual command codes and diagnostics were checked. Existing Node MODULE_TYPELESS_PACKAGE_JSON and Playwright color warnings remain tooling notices; package module mode was not changed to silence them.

### Responsive/accessibility and security evidence

- At each required width: Vietnamese page language/copy, header clearance, document width, 44px QR trigger, stacked versus sidebar composition, keyboard opening/Escape/focus restoration, single QR and PNG text/byte decoding.
- Long Vietnamese film title, long Booking code and maximum numeric(19,4) amounts wrap without truncation/float conversion or horizontal overflow; loading/reduced-motion and safe service-error screenshots at all three widths.
- Complete/missing/duplicate/mismatched Ticket aggregates, COUPLE, four Ticket enums, unpaid states, PAID after original expiry, stale independent Booking/Ticket server times, expired authentication, unauthorized roles and forged preview/financial query values.
- Direct entry/reload/back/login resume, account/token change during delayed reads, modal removal on logout, real two-tab cross-tab session removal, tab hide/return, network failure/malformed JSON/rate-limit stop and explicit GET recovery.
- No QR in persistent storage, no unsupported posters or Customer Check-in controls, no Payment POST, no Payment-ID dependency and no production mock fallback.

Focused images are archived under `frontend/target/customer-my-bookings-ticket-qr-2026-10-11/focused-screenshots/`, with source paths/hashes and explicit fixture classifications in `manifest.json`. The full final run's 24 corresponding images are separately archived under `final-screenshots/` and representative final images rechecked. Screens inspected include `history-390.png`, `detail-390.png`, `history-768.png`, `detail-1440.png`, `qr-390.png`, `qr-768.png`, `long-1440.png`, `loading-768.png` and `error-390.png`. This is targeted accessibility validation, not comprehensive screen-reader/WCAG certification.

## 9. Requirement Reconciliation

| Requested behavior | Result |
|---|---|
| Real owned history/detail at unchanged URLs; no mock fallback | PASS |
| Exact strings, approved fields/envelopes/pages/status/timestamps | PASS |
| Complete one-Ticket-per-unit aggregate; COUPLE guest semantics | PASS |
| One exact UTF-8 Booking QR, safe inconsistent-state suppression | PASS |
| Independent entitlement recovery without Payment identity | PASS |
| Authentication/reload/resume/account/tab/stale-request handling | PASS in focused fixture-backed tests |
| No new payment/freeze/expiry/issuance/Check-in authority | PASS; protected source preservation verified separately |
| Full frontend regression | PASS — 151/151 unit and 272/272 Playwright; TypeScript/lint/build PASS |
| Real provider or Staff acceptance | NOT RUN; no claim based on fixtures |

## 10. Deviations / Conflicts

No business-scope or API/backend change. No V13; V1–V12 remain unchanged. The old screen map and handoff sections describing public history previews are historical context superseded by this implementation; historical versioned screen map/contracts/reports are not rewritten. Older Project Scope per-Ticket QR wording remains superseded by BRD/SRS v1.2 and the approved Booking QR contract, as documented in Phase 3A.

Existing Convention Conflicts: legacy spaced requirement/DOCX names remain untouched. Explicit approved exception: none required. The QR library's algorithmic black/white output is needed for contrast; all interface styling uses existing semantic tokens. Unsupported Stitch controls are omitted according to contract boundaries, not replaced by invented workflows.

## Convention Compliance

Checked before naming/implementation and after finalization against [project conventions](../development/project-conventions.md).

| Area | Result | Evidence |
|---|---|---|
| Folder/file names | PASS | Existing feature folders, kebab-case purpose filenames, framework page.tsx and `.mjs` native test convention |
| Components/functions/types | PASS | PascalCase components/types, camelCase operations; no Vietnamese identifiers |
| Routes/imports | PASS | Same two plural kebab-case routes; frontend source uses `@/`; local test fixture imports stay test-only |
| Domain terminology/statuses | PASS | Booking, Ticket, Seat Unit, Booking QR; exact serialized backend enums, localized display only |
| API conventions | PASS | Exactly three approved authenticated GET resources; contracts unchanged |
| Database conventions | NOT APPLICABLE | No schema/data/backend/migration action |
| UI/design conventions | PASS | Phase 1 semantic primitives/tokens, Nocturne fonts, Vietnamese copy; no unrelated redesign |
| Test conventions | PASS | Existing Node/Playwright infrastructure; old counts retained, equivalent migrated coverage, no skips/retries |
| Documentation/report | PASS | Requested dated report name/template, verified IDs, evidence classifications, limitations and preserved history |

## 11. Known Limitations / Gaps before Staff Check-in

1. Frontend browser integration is verified with labeled HTTP fixtures. Real backend read behavior has separate Phase 3B integration-test evidence. No live owned paid Booking, VNPAY callback/settlement, Neon read or Staff scan was exercised in this frontend task.
2. Actual Staff QR resolver, cinema assignment/scope validation, per-Ticket Check-in writer/duplicate/concurrency rules and admission validation are still outside this slice. VALID means only the serialized Ticket state, not present entrance eligibility.
3. Separate GET snapshots can disagree; QR/Tickets remain hidden until a later safe read is coherent. No reconciliation writer/query endpoint or backend status is invented. There is no automatic interval polling.
4. History has only page/size, current referenced labels and server totals. Search/filter/global status count/poster/fee/admission features remain unsupported. Live page membership may shift with new Bookings, as the API contract documents.
5. Independent Tickets/QR retrieval solves paid entitlement recovery. It does not discover an unknown unresolved Payment attempt for a frozen Booking or permit another initiation. Existing Payment return and Summary behavior are unchanged.
6. Accessible local QR rendering and decoding do not certify operational scanner compatibility or acceptance. Fullscreen/wallet/share/download/transfer/NFC design actions are not implemented.

## 12. Next Recommended Step

Independently audit and approve the real Staff Booking QR resolution and per-Ticket Check-in contracts, including current cinema assignments, authoritative admission validation, repeated scanning, concurrency, duplicate use, permissions and required backend APIs, before planning Phase 4 implementation. Do not automatically start it. Stop after this report and verified frontend regression; no commit or deployment without a new explicit request.
