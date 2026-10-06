# Smart Cinema Implementation Report

## 1. Task Information

- Task: Integrate real Customer Promotion application/removal into existing unpaid Booking
- Date: 2026-10-05, Asia/Ho_Chi_Minh
- Module: Customer owned Booking Summary, Promotion and Concession reconciliation
- Type: Frontend implementation against existing backend
- Status: COMPLETE; conditional live-write verification unavailable as documented below

## 2. Requested Work

Apply/replace/reapply and remove the single Promotion through existing owned unpaid Booking commands, restore persisted state on reload/back/login, and retain exact server discount/totals, Seat/Concession snapshots and original deadline. Vietnamese UI and safe concurrency/uncertain-outcome handling. Preserve first-Payment freeze; no Payment/VNPAY/PAID/Ticket/QR/history/Admin/deployment or new policy.

## 3. Documents Reviewed

- Root/frontend AGENTS; canonical [development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), frontend workflow and applicable coding/document/traceability/UI rules; [project conventions](../development/project-conventions.md), report template and installed Next.js client-boundary documentation.
- Project Scope v1.0 §5.10; Business Analysis v2.1 §29; [BRD v1.2](../brd/brd-v1.2.md) §4.7; [SRS v1.2](../srs/srs-v1.2.md) §§3.6/3.8/5.13 and applicable security/reliability/UX requirements.
- System Analysis & Design v1.1 DOCX §§5.3.5/5.5.3/5.5.7; `.stitch/DESIGN.md`, current screen map/implementation plan, current handoff and existing Booking/Concession guides/reports.
- [Promotion v1.0](../api/promotion-composition-contract-v1.0.md)/[v1.1](../api/promotion-composition-contract-v1.1.md); [Booking v1.0](../api/booking-contract-v1.0.md)/[v1.1](../api/booking-contract-v1.1.md)/[v1.2](../api/booking-contract-v1.2.md)/[v1.3](../api/booking-contract-v1.3.md); [Concession](../api/concession-composition-contract-v1.0.md); [Payment initiation](../api/payment-initiation-contract-v1.0.md) freeze boundary.
- Actual Promotion Controller/Request/Service/Repository, BookingResponse/projection/exception handler, V8/current database guards, Concession and Payment services, isolated Promotion/Payment PostgreSQL tests, current preview service and real Summary/detail/Concession/Auth architecture.

Before implementation: requirement traceability, convention placement/naming, scope/conflict audit and implementation plan completed. Existing schema/API already supports all requested operations; **no migration blocker, no backend source change and no V13**. V1–V12 and historical contracts remain unchanged. The prior Concession milestone was already committed at `52e3c5e`; this task made no commit/reset/staging operation. A 631-file current-tree SHA-256 baseline and incoming index inventory were captured before edits.

## 4. Requirements Traceability

| Requirement/source | Description | Applicable | Result |
|---|---|---|---|
| User request §§0–37 | Real owned Promotion integration, preservation and scoped verification | Yes | Implemented; full regression PASS; conditional live-write limitation below |
| BRD v1.2 BR-034/035, §4.7 | Backend eligibility and final price authority | Yes | Typed real commands, safe input and exact server amounts; no client pricing policy |
| SRS v1.2 FR-PROMO-002–006, §3.8 | Validity, usage, minimum, ACTIVE status and recalculation | Yes | Server decision only; independent existing PostgreSQL rule proof |
| SRS v1.2 FR-BOOKING-008, §3.6 | Apply valid Promotion | Yes | Inline Summary PUT apply/replace/reapply; persisted owned GET |
| Promotion v1.0 HTTP/removal policy | Remove the single Promotion, including invalid old terms | Yes | Real DELETE with no body, complete authoritative reconciliation |
| SRS v1.2 FR-BOOKING-005/006/007/010/012/018; Booking v1.3 | Original expiry, snapshots, exact totals, ownership, no unpaid issuance and permanent freeze | Preservation | Same Booking/origin Seat snapshots and expiry; frozen/terminal controls absent; no Payment or issuance |
| SRS v1.2 FR-BOOKING-013–017; Booking v1.2 | Existing Concession composition/revalidation | Preservation | Complete returned aggregate wins; failed edit rolls back and explicit Promotion recovery is available |
| System Analysis v1.1 UC-CUS-015, §5.3.5 | Enter code, validate server rules, compute discount | Yes | Real code input/commands and stored code/discount display |
| System Analysis v1.1 BRULE-BOOK-004/005/006/007, §5.5.3; authorization §5.5.7 | Backend pricing, finalization history, expiry, no premature Tickets and ownership | Preservation | Exact server amounts, original clock, read-only freeze and JWT-owned APIs |
| SRS v1.2 NFR-UX-005, NFR-SEC-011, NFR-REL-006 | Separated price rows, safe error presentation and server time | Yes | Vietnamese semantic panel/labels/errors; exact five-row totals and explicit UTC |
| Per-Customer quota, public Promotion catalog | No such existing policy/API | Not applicable | No feature or rule invented |
| FR-PROMO-001 Admin, real Payment/Ticket/history | Separate functionality | Not applicable | Not implemented |

No BR/FR/UC/NFR/Business Rule ID was invented. The System Analysis has no separate numbered Promotion rule family; UC-CUS-015 and approved current Promotion policy are used. Older alternative-flow language saying invalid Promotion leaves no Promotion applies to an unpromoted Booking; current v1.0 explicitly preserves a previously accepted snapshot after failed replacement. Existing whole-edit rollback is preserved. Old pre-Payment/no-freeze staging is superseded by Promotion v1.1 and Booking v1.3 without rewriting history.

## 5. Implementation Summary

### Contract audit and migration decision

| Audit | Actual existing behavior |
|---|---|
| Input/discovery | Code entry only; no public Promotion list or Admin HTTP authority |
| Format | Backend string-only body `{code}`, strips whitespace, Locale.ROOT uppercase, normalized 1–50 chars; query/extra fields rejected |
| Apply | PUT `/api/v1/bookings/{id}/promotion`, 200 complete Booking; replaces or revalidates the one Promotion |
| Remove | DELETE same resource, no body, 200 Booking; eligible absence succeeds; clears term snapshots and discount |
| Ownership | JWT actor, active CUSTOMER; foreign/missing 404, wrong-role/inactive 403 |
| Eligibility | PENDING, unexpired original origin Holds, null permanent first-attempt marker; current parent/publication/Seat/pair/start/cutoff and aggregate checks after waits |
| Master rules | Chain-wide ACTIVE, `valid_from <= database clock < valid_until`, minimum pre-discount Seat + Concession subtotal, global PAID-count usage, bounded supported terms |
| Usage | PENDING does not reserve/consume; no per-Customer quota or usage counter; cancellation/expiry/application consume nothing |
| Types | FIXED_AMOUNT preserves fractional values and clamps to subtotal; PERCENTAGE follows approved whole-unit floor/cap and subtotal clamp, exclusively in PostgreSQL |
| Snapshot | Nullable promotion: string id/code/type, exact value/minimumOrderAmount, nullable maxDiscountAmount; no name/status/window/usage fields |
| Reads/edits | Owned read retains snapshots; accepted apply/reapply/Concession edit revalidates current master and refreshes terms; rejection rolls back the whole edit |
| Deadline | No command renews Booking/Hold expiry or replaces origins |
| Freeze | First actual Payment initiation permanently freezes composition; terminal/elapsed/frozen edits reject, history retained |
| Concurrency | Existing aggregate lock order, Promotion row last, READ COMMITTED, bounded waits; no version/CAS/command identity |
| Errors | 400 invalid, 401 authentication, 403 role/account, 404 ownership/resource, 409 eligibility/unavailable/contention, 503 persistence |
| Schema | Existing V12 head sufficient; no migration or historical checksum/source changes |

The frontend submits entered code unchanged; basic blank feedback is local, normalization/length and all business validity remain server decisions. No sample code, list endpoint, preview service, persisted write intent or fallback enters real Summary. DELETE is real even when the old master has become invalid. No replacement Booking is created.

### Summary, stored state and exact amounts

New typed Promotion adapter/service/panel extends existing feature architecture. Summary owns the accepted Booking state through its existing detail hook; one ref gates reads and writes. Complete owned GET precedes and follows every explicit command. The panel renders only stored code, ID and `discount`; other terms stay intact in the typed DTO. There is no historical name reconstruction or current-master lookup.

All five amount fields (`seatAmount`, `concessionAmount`, `subtotal`, `discount`, `finalAmount`) come from server Booking. Existing exact BigInt response-consistency checks and four-digit formatter remain; no Number/parseFloat discount calculation, formula, rounding or currency inference is added. Receipts validate correct Booking/Showtime/creation, unchanged original deadline and Seat origin/pricing snapshots; incorrect apply/remove result is uncertain. Concurrent Concession lines/totals may legitimately change, so the complete accepted server aggregate is retained.

Semantic Vietnamese form, errors/statuses, separate totals, blank feedback, read-only reason and keyboard focus follow current dark/amber UI. No unrelated redesign, dependency or new page is added. A Summary key now includes Booking identity as well as token so navigating between owned identities cannot retain another Booking's hook data.

### Concession interaction and Payment boundary

Existing editor now also displays the persisted Promotion code/discount and the explicit Summary recovery path. Accepted add/update/remove may refresh terms and amounts, without current catalog overwriting line snapshots. Invalid current Promotion/minimum causes whole-edit rollback; frontend retains/refetches actual prior lines/Promotion, never silently clears or restores a code. Customer explicitly removes/replaces it before another edit.

Known terminal, elapsed, started or `paymentStartedAt`-frozen Bookings have no Promotion controls. A fresh pre-write owned read also catches stale freeze/expiry. Original clock/countdown/UTC/deadline remain; no TTL renewal, new Hold or first-Payment command. Payment initiation, VNPAY/provider, PAID, sold Seats, Ticket and Booking QR remain out of scope.

### Concurrency, auth and errors

Duplicate clicks, focus/pageshow/visibility and polling share one gate; late stale GET cannot overwrite a mutation. There is no optimistic applied code/discount. Two tabs expose the last server-accepted complete state; no CAS/version/idempotency field is invented. Apply/remove vs Concession/expiry/freeze are independently covered by existing database tests and browser contracts.

Even a repeated PUT/DELETE can refresh current terms; no automatic replay occurs. Network/5xx/malformed success triggers owned reconciliation and explicit review before further writes. Failed GET blocks review/writes; successful refresh does not silently acknowledge. The Concession entry is unavailable while Summary is busy/unconfirmed/review-required. Abort/navigation does not prove rollback; future entry/login/reload reads stored state without replay.

401/403/404 clear unavailable data. Existing safe Summary return path is reused; no open redirect or auth authority field. Only the exact safe ProblemDetail title `Promotion unavailable` refines conflict presentation. It does not reveal whether unknown/inactive/future/expired/minimum/exhaustion failed. Raw backend/SQL/internal title/detail is never shown; generic contention/conflict remains generic.

## 6. Files Created

- `frontend/src/features/promotion/promotion-api.ts`
- `frontend/src/features/promotion/promotion-service.ts`
- `frontend/src/features/promotion/owned-promotion-panel.tsx`
- `frontend/src/features/promotion/promotion-api.test.ts`
- `frontend/test/e2e/helpers/customer-promotions.ts`
- `frontend/test/e2e/customer-promotion-composition.spec.ts`
- `docs/development/customer-promotion-composition-frontend.md`
- This report

## 7. Files Modified

- `frontend/src/features/booking/use-booking-detail.ts`: one Summary read/write gate, Promotion commands and uncertain-result review.
- `frontend/src/features/booking/owned-booking-summary-screen.tsx`: inline panel, identity key and Concession entry gating.
- `frontend/src/features/concession/owned-concession-screen.tsx`: persisted Promotion/revalidation recovery display.
- `frontend/package.json`: include ten new adapter/service cases in the existing unit runner.
- `frontend/README.md`: link current real Promotion integration.
- `docs/development/customer-booking-creation-frontend.md`: current real Promotion continuation.
- `docs/development/customer-concession-composition-frontend.md`: current Summary recovery and next boundary.
- `docs/ui-ux/screen-spec/customer-screen-map-v1.0.md`: current real Summary Promotion coverage/delta.
- `docs/ui-ux/customer-frontend-implementation-plan-v1.0.md`: dated current continuation.
- `docs/ai/current-handoff.md`: current milestone/evidence/limitations and exact Payment recommendation.

No tracked file moved. Backend, migrations, requirements, API contracts, protected operating conventions/Stitch and all historical reports remain unchanged.

## 8. Verification

| Check | Actual result |
|---|---|
| `pnpm exec tsc --noEmit` | PASS after final new test import/selector fixes |
| `pnpm lint` | PASS, no ESLint errors/warnings |
| `pnpm test` | PASS: 104/104, no failures/skips; preserved 94 plus 10 new cases |
| `pnpm build` | PASS final production runtime source; same routes, no dependency added |
| New Playwright cases | PASS: all 18/18 in final full regression, no retries/skips |
| Full installed-Edge `pnpm test:e2e` | PASS: 148/148, 7.7m, final production runtime source; one worker, normal timeouts, no retries/skips; exit 0 |
| Backend `mvn verify` | PASS: 294 tests, zero failures/errors/skips; BUILD SUCCESS, 1:26, completed 2026-10-05T22:56:47+07:00 |
| Isolated PostgreSQL Promotion/Payment rule/persistence proof | PASS in full regression, actual existing database guards and tests |
| Live Neon preflight | Read-only: 73 Showtimes, zero future OPEN_FOR_BOOKING/cutoff-valid rows; no scheduling/Promotion/catalog change |
| Full new live Booking/Promotion writes | NOT RUN: no existing eligible Showtime; out-of-scope data manufacture forbidden |
| Actual production browser, no interception | PASS: ordinary Customer auth, existing owned CANCELLED Booking 1, persisted state/deadline/read-only/reload/desktop/mobile/keyboard; zero page errors/business writes |
| Neon preservation | PASS: 19 original domain/history/financial fingerprints and V1–V12 applied checksums unchanged; no new Booking/Concession line |
| Final scope/UTF-8/docs/conventions | PASS: 10 modified and 8 created files; 621/631 original files and 21 original E2E files unchanged; strict UTF-8 for all 18, 134 local Markdown links, unchanged index, whitespace/inventory/runtime-boundary and final report recheck |

Backend ran all existing integration flags against dedicated local `smart_cinema_v11_accepted_20261001`, never destructive Neon tests. Source unchanged. Production build initially found non-exported test constants; local fixture constants fixed before successful build. The initial new browser run had one selector ambiguity: two exact `0.0000` amount rows. The assertion now explicitly targets final amount; it passed without retries. No scenario/assertion was removed or timeout relaxed. Only final full regression counts as acceptance.

Eighteen new scenarios cover full discovery/whole COUPLE Hold/Booking/Concession/Summary/Promotion journey on desktop/mobile, exact code-only auth payload/large IDs, replace/reapply/remove, saved snapshots/exact amounts, original expiry, direct/reload/back/forward, supported unavailable categories, zero/full/fraction/cap, all Concession commands/revalidation/minimum rollback, rapid duplicate/focus, lost/malformed/5xx committed apply and remove, failed reconciliation, stale conflict/fresh eligibility, expiry/freeze races, terminal states, two tabs, cross-tab Concession, auth/ownership/login resume and aborted navigation without replay. Original 130 cases/config/helpers remain unchanged.

Existing `PromotionPostgresTests` independently proves actual policy/persistence: `percentageUsesWholeSubtotalAndFloorsVndPreservingCoupleAndExpiry`, `capFixedFloorZeroAndReapplyReplaceRemove`, `unknownInactiveFutureExpiredAndMinimumRejectWithoutChangingAcceptedSnapshot`, `masterChangesDoNotMutateReadSnapshotsAndCompositionRevalidates`, `minimumFailureOnQuantityDecreaseRollsBackLineAndTotalsUntilRemoval`, `pendingApplicationsDoNotReserveOrConsumeUsageAndInternalPolicyRejectsExhaustion`, concurrent aggregate/Promotion/cancellation cases, lock-wait expiry and authorization/eligibility. The exhaustion helper test supplies authoritative paid count at the policy boundary without manufacturing PAID. Existing `PaymentPostgresTests.initiationVersusPromotionApplyAndRemoveUsesWholeAcceptedSnapshot` and other freeze/master-change/invalid-Promotion tests prove first-attempt serialization. No shared Neon master was changed to create this proof.

The same existing full regression also runs `VnpayPostgresTests.promotionLastUseAcrossShowtimesIsSerializedAndFrozen`: isolated protected finalization serializes two frozen attempts against a global limit of one, permits exactly one PAID redemption, retains frozen discount/amount after master changes and records the other's exhaustion reconciliation. This is independent existing backend test evidence, with no external provider call or new frontend Payment/finalization implementation.

Live preflight sampled database time `2026-10-05T16:02:14Z`; latest existing start is 2026-10-09T16:17Z but that future record is cancelled. Normal backend startup validates V12/Hibernate without reseeding/provisioning; verification-process-only cleanup/VNPAY overrides protect history, with source/defaults unchanged. Actual production-browser read used ordinary existing Customer login and owned CANCELLED Booking 1. No session/ownership fabrication or interception occurred. These are limited live read checks, **not live Promotion persistence proof**. Expected Auth token activity is separate; no business cleanup is needed.

Local ignored logs/captures are retained under `frontend/target/customer-promotion/` at completion. Credentials/JWTs are not placed in tracked files, the report or safe evidence JSON. Playwright artifacts remain under `frontend/test-results/`.

Representative final captures: [editable desktop](../../frontend/target/customer-promotion/promotion-summary-desktop.png), [editable mobile](../../frontend/target/customer-promotion/promotion-summary-mobile.png), [actual Neon read-only desktop](../../frontend/target/customer-promotion/live-read-desktop.png), [actual Neon read-only mobile](../../frontend/target/customer-promotion/live-read-mobile.png). Editable captures use isolated HTTP fixtures; live captures use actual APIs without interception. These are local ignored evidence, not committed artifacts.

## 9. Requirement Reconciliation

Implementation matches actual code-input/apply/remove/replace, backend eligibility, stored snapshot/amount authority, optional absence, exact decimal strings, Concession whole-edit revalidation/rollback, unchanged deadline/origins, permanent freeze and backend ownership. No nonexistent public catalog/per-Customer policy or out-of-scope write is added. Final full regression, requirement reconciliation and Convention Compliance PASS. Live writes are conditionally NOT RUN for current data dependency, as expressly allowed by user §31; no schema/API blocker exists.

## 10. Deviations / Conflicts

No business policy change or approved convention exception was needed. The current approved additive Promotion/Booking contracts resolve old staged disabled-Promotion/no-first-attempt descriptions and preserve prior accepted snapshots after rejected replacements. Existing legacy System Analysis DOCX filename and older planning/report history are retained with dated current notes. Prior accepted localization/Concession work is preserved.

Full live unpaid Promotion transaction is unavailable without changing scheduling data, which this task forbids. Rule/persistence proof is isolated PostgreSQL; real frontend command/navigation proof is HTTP-fixture-backed production browser; Neon proof is read-only and separately labeled. No unavailable check is marked PASS.

## Convention Compliance

Validated against [project conventions](../development/project-conventions.md).

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | Feature Promotion placement, kebab-case source/test/guide, correctly dated new report; no new route needed |
| Code naming/domain terms | PASS | English identifiers, canonical Booking/Promotion/Concession; Vietnamese presentation |
| Imports/client/status/API | PASS | Existing `@/` aliases and first client directives; serialized statuses/fields/verbs unchanged; code-only command |
| Database convention | N/A | No database source change; V12 head retained, no V13 |
| Documentation/history | PASS | Current guides/handoff/planning delta; no BRD/SRS/API/historical report/Stitch rewrite |
| Dependencies/regression | PASS | No dependency/config/retry/skip changes; all original test source retained |
| UTF-8/scope/report self-check | PASS | 631-file SHA-256 baseline, exact 18-file inventory, strict UTF-8, 134 local Markdown links, unchanged index, whitespace and final report recheck |

## 11. Known Limitations

- Full new live Promotion transaction requires an eligible existing future open Showtime. No arbitrary schedule/catalog/Promotion/date/historical manipulation was permitted or performed.
- No public catalog, persisted name/date/status/usage field or per-Customer quota exists. UI only enters a code and shows supported stored fields.
- Booking DTO omits full eligibility/cutoff/currency/display-zone metadata. Backend may reject apparently enabled controls; exact values and UTC remain without guesses.
- No command identity/version/CAS: the final accepted server aggregate wins. Reads prove current state, not request attribution or rollback; uncertain writes need explicit review.
- Applying a code does not reserve global usage or guarantee future redemption. Concession revalidation can reject a whole edit until code removal/replacement.
- Payment initiation/provider/finalization, Ticket/QR/history/Admin and deployment remain separate. No charge, PAID or issuance is implied.

## 12. Next Recommended Step

**Real Customer Payment initiation frontend integration against the existing backend Payment contract.** Recommendation only. Stop after successful completion; do not begin Payment automatically.
