# Smart Cinema implementation report — Customer authoritative Seat Hold

## 1. Task Information

Task: Integrate Customer Authoritative Seat Hold Frontend.
Date: 2026-10-02, Asia/Ho_Chi_Minh.
Module: Customer Seat Selection, existing Auth and future Booking handoff.
Type: Frontend integration, regression and live PostgreSQL/browser verification.
Status: **COMPLETE — final automated, live Neon and browser verification PASS**.

## 2. Requested Work

Replace local acquisition/release/countdown authority with existing authenticated
Seat/Hold APIs. Preserve real discovery/map, string IDs, whole Seat Units,
Customer ownership and original server expiry. Restore/reconcile after reload,
expiry, conflicts and uncertain transport. Continue prepares a pre-Booking
handoff only. Preserve V1–V12 and all backend behavior; no V13, Booking creation,
Payment, provider call, Ticket or QR issuance.

## 3. Documents Reviewed

- [AGENTS](../../AGENTS.md), [development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md),
  [frontend workflow](../../.agent/workflows/FRONTEND_WORKFLOW.md), applicable
  coding/UI/document/traceability/convention rules, [conventions](../development/project-conventions.md),
  [frontend instructions](../../frontend/AGENTS.md) and bundled Next.js 16 docs.
- [Current handoff](../ai/current-handoff.md), [stable context](../ai/project-context.md),
  [latest Admin Showtime report](2026-10-02_admin-showtime-management_report.md).
- [Seat/Hold v1.0](../api/seat-hold-contract-v1.0.md), [v1.1](../api/seat-hold-contract-v1.1.md),
  [Discovery](../api/customer-discovery-contract-v1.0.md), [Booking base](../api/booking-contract-v1.0.md)
  and [v1.3](../api/booking-contract-v1.3.md) for future handoff only.
- [SRS v1.2](../srs/srs-v1.2.md) §§3.5, 4, 5.8, 6.1, 8.1, integrity;
  [BRD v1.2](../brd/brd-v1.2.md) §4.5;
  [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md) §§22–24, invariants;
  [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx)
  UC-CUS-009/010/011 and BRULE-SEAT-001–007.
- [Database decisions](../db/database-design-decisions-v1.0.md),
  [dictionary](../db/physical-data-dictionary-v1.0.md),
  [integrity](../db/integrity-enforcement-design-v1.0.md) with
  [lock order](../db/integrity-enforcement-design-v1.1.md) and
  [V10 origin/deadline/finalization guards](../db/integrity-enforcement-design-v1.2.md).
  Actual Seat/Auth/Booking source and V1–V12, especially V5 acquire/release,
  V6 attachment/expiry and later paid-origin guards.
- [Canonical screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md),
  [implementation plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md),
  Stitch canonical Seat screen `fdea388b4b24406799ab087b31239835`, current
  discovery/Seat/Auth and downstream preview source/tests. Stitch is unchanged.

## 4. Requirements Traceability

| Source | Applicable implementation | Result |
|---|---|---|
| BR-017–024, BRD §4.5 | Map, ownership, configurable authoritative expiry, exclusive/stale validation and release | PASS within this integration |
| FR-SEAT-001/003/004/017, SRS §3.5 | Real map, STANDARD/VIP/COUPLE, availability and nonsellability | PASS |
| FR-SEAT-005/006/011/016 | One atomic request for all selected units; conflict and pending gates; PostgreSQL authority | PASS |
| FR-SEAT-007/008/009/010 | Authenticated owned GET, exact-ID release, server expiry projection and restoration | PASS |
| FR-SEAT-012, SR-SEAT-05 | BOOKED remains disabled; existing server acquisition/sale guards unchanged | PASS regression |
| NFR-UX-002; DR-007/014 | Server expiration countdown; exclusive valid origin and valid deadlines | PASS |
| UC-CUS-009/010/011; BRULE-SEAT-003–007, design v1.1 | Read/acquire/release, ownership, expiry, stale/sold authority | PASS |
| FR-SEAT-013/014/015 | Realtime push transport remains an existing separately deferred dependency | NOT APPLICABLE to requested integration |
| Booking creation, Concession checkout, Promotion/Payment, issuance, Admin | Explicit task exclusions | NOT APPLICABLE |

No requirement ID, business policy, Seat quota, pricing rule or backend endpoint
was invented. No BRD/SRS or historical contract/report was rewritten.

## 5. Implementation Summary

### Authority, auth and atomicity

Typed Hold adapter uses existing GET/POST `/api/v1/showtimes/{id}/seat-holds`
and DELETE `/{holdId}`, Bearer token, no-store, abort and strict decimal string
IDs. It never sends userId, role, timestamp, TTL, price or status. Only normal
Customer backend authorization grants ownership; local role/legacy numeric
Auth userId do not determine it. Anonymous selection is a draft; login resumes
a validated internal Seat route and draft without granting an anonymous Hold.

Unheld **Selected** and server-confirmed **Held by you** are separate. Explicit
**Hold selected Seats** sends the entire chosen set once, including retained
owned units when adding. Requests are gated immediately and throughout
confirmation. No acquisition loop, automatic POST retry, partial-success claim
or local mock fallback exists. All units stay whole: COUPLE has one identity,
control, Hold and two guests; STANDARD/VIP one guest each.

### Release, uncertain responses and reconciliation

Owned unit deselection DELETEs its exact Hold origin then reloads truth. Bulk
clear uses sequential exact-ID releases because the approved API has no bulk
release/replacement operation; it stops on failure and shows remaining owned
Holds, without an atomic-release promise. New units are never assumed acquired
after release. Terminal/missing/ownership conflicts remain server decisions.

Lost acquisition response reconciles committed ownership with GET. On failed
reconciliation, last-confirmed state is explicitly labeled and new acquisition/
Continue is disabled. Typed safe 400/401/403/404/409/service messages disclose no
SQL/private owner data. A 401 supports normal sign-in resumption.

Entry/reentry/reload restores only usable owned unattached Holds. Public HELD
alone never proves ownership. Visibility/focus/pageshow and visible-page
30-second polling reload truth; reaching expiry also reconciles, never renews
or reacquires. Continue performs another fresh owned/map read. Server physical,
parent, publication, start/cutoff and attached/sold guards remain unchanged.

### Time and future Booking handoff

Seat countdown uses exact earliest server expiresAt and sampled PostgreSQL
serverTime projected with monotonic elapsed time. Conservative full round-trip
allowance may display expiry slightly early; it never grants a local TTL or
extends timestamps on rerender/reload. Existing same-owner retries preserve
origin/expiry. Clock/cutoff guards block pending or elapsed continuation.

Continue retains exact string Showtime/Hold IDs, original origin records,
serverTime and earliest ISO expiresAt in memory, matching the future Booking
request shape. It does not call POST Bookings, attach/consume Holds, create a
Booking ID or price authority. Existing Concession preview can display it;
sample totals/Promotion/Payment remain previews and do not renew Holds. Its
memory context clears on reload/exit while Seat Selection restores real Holds.
VIP has no invented fixture price; existing Summary refuses unsupported VIP
demo pricing. Necessary downstream changes are confined to display acceptance
of owned HELD units and truthful boundary/recovery messages.

### Migration and backend decision

**No backend production/test/configuration change. V12 remains head; no V13.**
V1–V12 and protected Hold/Booking/Payment/sale/paid-origin guards stay byte-for-byte
unchanged. Existing API covers acquisition, ownership restoration and release;
no schema or contract blocker was found.

## 6. Files Created

- `frontend/src/features/seat/seat-hold.types.ts`, `seat-hold-api.ts`,
  `seat-hold-service.ts`, `use-seat-holds.ts`, API/service unit tests.
- `frontend/src/features/auth/auth-return.ts`.
- `frontend/test/e2e/helpers/customer-holds.ts` (test-only HTTP simulator).
- [Current development guide](../development/customer-seat-hold-frontend.md), this report.

## 7. Files Modified

- `frontend/src/features/seat/seat-selection-screen.tsx`, `seat-service.ts`,
  `seat.types.ts`; `frontend/src/features/discovery/discovery-api.ts`.
- `frontend/src/features/auth/login-form.tsx`;
  `frontend/src/features/concession/concession-preview-provider.tsx`,
  `concession-selection-screen.tsx`;
  `frontend/src/features/booking/booking-summary-service.ts`, `booking-summary-screen.tsx`;
  `frontend/src/features/payment/payment-method-screen.tsx`,
  `payment-processing-screen.tsx`, `payment-result-screen.tsx`.
  Preview validation accepts HELD only with explicitly carried owned unit IDs;
  necessary wording changes do not introduce checkout or pricing behavior.
- `frontend/package.json`; `frontend/test/e2e/seat-selection.spec.ts`,
  `concession-selection.spec.ts`, `booking-summary.spec.ts`, `payment-method.spec.ts`,
  `payment-processing.spec.ts`, `payment-result.spec.ts`, `customer-final-qa.spec.ts`,
  `helpers/customer-discovery.ts`. Fixtures/assertions explicitly permit only
  existing contracted Hold writes, while rejecting checkout/provider writes.
- `frontend/README.md`, `docs/ui-ux/customer-frontend-implementation-plan-v1.0.md`,
  `docs/ui-ux/screen-spec/customer-screen-map-v1.0.md`, `docs/ai/current-handoff.md`.
  Stable project context is preserved: no new architecture/business decision.
- No backend, historical migration/report/contract, BRD/SRS or Stitch change.

## 8. Verification

| Check | Result and evidence |
|---|---|
| Backend `mvn verify` | PASS: **294**, zero failures/errors/skips; PostgreSQL 18.4, completed 03:40:17 +07; jar/repackage PASS |
| Fresh/upgraded migration, Hold/Booking/Payment integrity regression | PASS in full existing PostgreSQL suites, including concurrency, origin, expiry/ownership/cutoff, sold/settlement/Ticket and restricted grants; no backend change |
| TypeScript `pnpm exec tsc --noEmit` | PASS |
| ESLint `pnpm lint` | PASS |
| Frontend `pnpm test` | PASS: **70**, zero failures/skips |
| Production `pnpm build` | PASS |
| Full Playwright, installed Edge/one worker/retries=0 | PASS: **101/101**, 5.8 minutes, final accepted full run; includes 14 Seat tests |
| Desktop/mobile and keyboard | PASS: live 1440×1000 and 390×844 review, scroll-contained map/no document overflow, whole-unit controls; keyboard/pending/focus/error behavior covered by automated suite |
| Real Neon V12 Customer Hold/auth/race/release | PASS: normal Customer JWTs, 200/409 concurrent race, protected ownership and release, original deadlines |
| Real browser without interception | PASS: normal login → Movie → Cinema → Showtime → real map → atomic Hold → reload → release; STANDARD, VIP and whole COUPLE |
| Preservation, documentation/links/whitespace/handoff | PASS: 106 local links/anchors across six current documents, UTF-8/EOF/whitespace/secret checks and handoff reconciliation; 314 protected original files and live original row fingerprints unchanged |

Logs remain local temporary artifacts and contain no documented credentials.
Browser HTTP fixtures are isolated tests, not live provider/Neon proof. Initial
test-clock session fixtures, route-announcer scoping/navigation abort handling
and old checkout no-write assertions were corrected for the real Hold boundary;
no automatic test retries or weakened product guard masks a failure.

### Live evidence and data preservation

Existing Neon **V12** was used without reseed or schema change. Normal backend
startup read ignored `.env`; Flyway validated twelve migrations and found the
schema current; Hibernate validate and startup passed. All backend suites ran
on dedicated local PostgreSQL, not destructive isolated-schema tests on Neon.
Cleanup and VNPAY were disabled only in the verification process; application
defaults/source are unchanged. No Admin credentials or provider calls were used.

Two isolated QA Customers were registered through the existing normal public
Auth API. Their passwords/JWTs/private values stayed outside repository/output.
Existing Showtime **12**, Movie **4**, Cinema **1**, Hall **1** was already eligible:
**2026-10-04 19:00 Asia/Ho_Chi_Minh**, 45 units/50 guests/five COUPLE units.
Existing schedule/layout/cutoff/pricing was preserved.

- Concurrent normal Customer A/B requests for STANDARD Seat **1** produced
  **200/409** and exactly one Hold **1**. Winner retry returned the same Hold
  origin/deadline; winner owned GET returned one, loser zero. Foreign release
  returned **404**; own/repeated release **204**; map returned AVAILABLE.
- Normal Customer A browser acquired STANDARD **1 / A1** and COUPLE **41 / E1-2**
  together as Holds **2/3**. UI showed **2 units/3 guests**, two owned Holds and
  exact original earliest `expiresAt=2026-10-01T21:25:26.350704Z`
  (**2026-10-02 04:25:26.350704 +07**). Reload retained exact IDs, createdAt
  and expiry, verified with fresh owned GET. No half-COUPLE control exists.
- Mobile whole-COUPLE release restored AVAILABLE and left STANDARD unchanged.
  Adding VIP **31 / D1** created Hold **4**, retained STANDARD and the original
  earliest deadline, showing two units/two guests. Clear released the remaining
  whole units; UI and owned/map reads confirmed zero active Holds.
- A second Customer's stale request for A1 reconciled to another owner's HELD
  and zero owned units, with continuation blocked. Hold **5** was separate
  verification evidence. An actual host suspension/clock leap subsequently
  expired that Hold and the browser session; UI stopped claiming ownership,
  exposed normal sign-in/recovery, and showed server-refreshed availability.
  Fresh normal Customer login and authoritative release/expiry normalization
  confirmed zero active Holds for both Customers. No clock/TTL policy changed.

Final read-only audit: **all original catalog, hierarchy, schedule, membership,
Booking, financial snapshots, Concession, Promotion, Payment, Ticket, evidence,
reconciliation, audit and prior-Hold fingerprints plus V1–V12 applied checksums
unchanged**. Exactly **five** new verification Holds remain RELEASED/EXPIRED and
unattached; no destructive cleanup. Only expected Customer registration/Auth
token activity and those verification Holds were added. No Booking/Payment,
sold_at, Hold consumption, Ticket or Booking QR was created.

Local screenshots (Git-ignored generated artifacts; not historical design edits):
[desktop Hold](../../backend/target/qa/customer-holds-live/held-desktop.png),
[mobile whole-unit map](../../backend/target/qa/customer-holds-live/map-mobile.png),
[mobile countdown/summary](../../backend/target/qa/customer-holds-live/held-mobile.png),
[release](../../backend/target/qa/customer-holds-live/released-mobile.png),
[session-expiry recovery](../../backend/target/qa/customer-holds-live/session-expired-desktop.png).

## 9. Requirement Reconciliation

Implemented behavior matches the approved Customer-authenticated Hold contract,
whole-unit counts, atomic acquisition, safe release/change, authoritative expiry,
reload restoration and explicit preview boundary. Backend controls ownership,
eligibility and concurrency. **PASS** for all requested integration/scope and
verification gates. Deferred realtime transport and future checkout integrations
remain explicitly separate; no failed required check remains.

## 10. Deviations / Conflicts

- No replacement/bulk release contract exists. Sequenced release plus GET is
  explicit; no unapproved endpoint or changed backend semantics.
- Independent batches may have different original deadlines; the earliest
  participating deadline is preserved for handoff. No new Hold renewal rule.
- Existing preview wording claiming no Hold/clear-on-return conflicted with
  real ownership; only necessary wording/HELD display handling is corrected.
- Existing convention conflicts: historical numeric Auth identity and legacy
  seed names remain unchanged; no mass rename. No new approved exception needed.
- The stable context retains historical implementation descriptions. Current
  milestone/limits/next task are reconciled in current-handoff and current UI
  documents; stable architecture/domain decisions are unchanged, so
  project-context is deliberately preserved per task instructions.

## Convention Compliance

Validated against [project conventions](../development/project-conventions.md)
before naming/implementation and after implementation, including this report.

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | Existing feature folders, new kebab files, dated report under docs/reports |
| Code/types/components | PASS | camelCase functions, PascalCase types/components; domain terminology retained |
| Routes/imports/status | PASS | Existing canonical route, `@/` aliases, existing uppercase states; no new domain status |
| API | PASS | Existing `/api/v1/` Hold nouns/methods; no invented endpoint/owner parameter |
| Database/backend naming | NOT APPLICABLE | No backend/schema change; historical V1–V12 preserved |
| Tokens/UI | PASS | Existing semantic tokens and Seat layout; responsive whole-unit controls |
| Documentation/report/links/whitespace | PASS | Current guide/plan/map/report/handoff links and content reconciled; UTF-8, EOF and whitespace checks include this report; no secrets or historical edits |

## 11. Known Limitations

- Booking/Concession/Promotion/Payment/history/Ticket/QR frontend integration
  remains separate. Downstream previews cannot prove continuing ownership or
  authorize persistence. Real Booking must revalidate at create time.
- Realtime push and production load/latency acceptance remain deferred; polling
  and operations reconcile instead. Other Customer changes can occur between
  reads; frontend state is not a database lock or final Booking promise.
- Bulk release is sequential; a partial failure retains clearly reconciled
  remaining Holds. Navigating away does not release or extend Holds.
- Legacy Auth userId remains numeric; domain/Hold IDs remain strings. Production
  credential separation and VNPAY merchant certification remain existing
  dependencies; no provider/external charge or deployment is attempted.

## 12. Next Recommended Step

**Customer Booking creation frontend integration using authoritative Hold
handoff.** Revalidate/attach through the existing owned Booking contract and
use returned identity/snapshots/deadline/amount; preserve original Hold origin.
This is a recommendation, not authorization. Stop after this task completes.
