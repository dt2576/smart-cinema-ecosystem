# Smart Cinema Implementation Report

## 1. Task Information

Task: Customer Booking creation frontend using authoritative Hold handoff.
Date: 2026-10-02, Asia/Ho_Chi_Minh.
Module: Customer Seat / owned Booking Summary / normal Auth resume.
Type: Frontend integration, regression and live database verification.
Status: **COMPLETE** — automated regression, real Customer/Neon/browser proof and preservation PASS. Final documentation reconciliation recorded below.

## 2. Requested Work

Connect normal Customer Movie → Cinema → Showtime → real Seat map → owned Holds
to one existing authoritative Booking create operation and owned Summary.
Preserve complete origins, atomicity, whole COUPLE semantics, exact snapshots,
totals and server deadline. Support duplicate/unknown response handling, reload,
direct entry and safe back navigation. Stop before real Concession, Promotion,
Payment, VNPAY or issuance; preserve V1–V12 and historical data.

## 3. Documents Reviewed

- [AGENTS.md](../../AGENTS.md), [development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md),
  frontend workflow and applicable Coding/UI/Traceability/Document rules;
  [conventions](../development/project-conventions.md), frontend local instructions
  and installed Next.js routing/component documentation.
- [Current handoff](../ai/current-handoff.md), [stable context](../ai/project-context.md),
  [latest Hold frontend report](2026-10-02_customer-authoritative-seat-hold-frontend_report.md).
- [Booking v1.0](../api/booking-contract-v1.0.md),
  [v1.1](../api/booking-contract-v1.1.md), [v1.2](../api/booking-contract-v1.2.md),
  [v1.3](../api/booking-contract-v1.3.md); actual Controller/Service/Repository/Request/Response.
- [Seat/Hold v1.0](../api/seat-hold-contract-v1.0.md),
  [v1.1](../api/seat-hold-contract-v1.1.md),
  [Concession composition](../api/concession-composition-contract-v1.0.md),
  [Promotion v1.1](../api/promotion-composition-contract-v1.1.md),
  [Payment initiation](../api/payment-initiation-contract-v1.0.md).
- [SRS v1.2](../srs/srs-v1.2.md) §3.6/Customer flow,
  [BRD v1.2](../brd/brd-v1.2.md),
  [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md) Booking/Hold/pricing,
  [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx),
  physical dictionary, integrity design including V10 origin/deadline/sale gates,
  existing V1–V12 and actual runtime contract.
- [Screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md),
  [implementation plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md),
  [.stitch metadata](../../.stitch/metadata.json), visual direction/inventory;
  existing Seat/Hold/Auth/Summary and downstream preview adapters/tests.

Pre-implementation audit identified the existing two-field create request,
complete response, eligible-PENDING exact-set retry, independently owned GET and
attached-Hold restrictions. No missing mandatory Concession input or schema
blocker was found. Names/routes/imports and requirement IDs were checked before
implementation. This report records that audit; it establishes no new policy.

## 4. Requirements Traceability

| Requirement | Description / source | Applicable | Result |
|---|---|---|---|
| FR-BOOKING-001 / BR-026 | SRS §3.6 / BRD Booking: create from valid owned Holds | Yes | PASS — existing authenticated complete-set operation |
| FR-BOOKING-002 / BR-027 | One Showtime per Booking | Yes | PASS — exact Showtime/origins; backend revalidation |
| FR-BOOKING-003 / BR-028 | Multiple Seats | Yes | PASS — one atomic request, no per-line loop |
| FR-BOOKING-004/005 / BR-029/030 | Lifecycle and expiry | Read/guards | PASS — returned status/deadline; no fabricated transitions |
| FR-BOOKING-006 / BR-031 | Seat pricing snapshots | Yes | PASS — returned stored type/prices, no catalog repricing |
| FR-BOOKING-007 / BR-035 | Server total authority | Yes | PASS — exact numeric(19,4) strings, no client amount input |
| FR-BOOKING-010 / BR-032 | Owned Booking detail | Detail only | PASS — authenticated GET, reload/direct entry/login resume |
| FR-BOOKING-012 | No valid Ticket before Payment | Boundary | PASS — no Payment/Ticket/QR write or issuance UI |
| FR-SEAT-016 | Stale client protection | Yes | PASS — fresh origin read plus backend decision/reconciliation |
| FR-BOOKING-008/009/011 | Promotion, history and cancellation UI | Separate integrations | DEFERRED — no feature expansion; existing backend cancel may be used only for safe verification cleanup |

COUPLE authority comes from the approved database/Seat-Hold decisions and
contracts: one unit/Hold/Booking Seat for two guests. No new requirement or
Business Rule ID is invented. Backend policy and historical implementation
coverage are independently exercised by the full PostgreSQL regression.

## 5. Implementation Summary

### Migration gate and actual contract

**V12 remains the head; no V13 is needed or created. No backend change.**
Contracts and historical migrations/reports are unchanged.

`POST /api/v1/bookings`, active CUSTOMER Bearer, 200:

```json
{"showtimeId":"12","holdIds":["6","7","8"]}
```

Only these two fields are sent. Customer subject, lifecycle, validity, original
origins, prices and deadline remain server decisions. Seat IDs, client prices,
timestamps, owner/role or preview codes are never submitted as authority.
The complete exact set attaches once; no partial client Booking Seat writes.

The typed response mirrors actual BookingResponse: server `id`/`bookingCode`/
`status`; Showtime/Movie/Cinema/Hall IDs and current labels; starts/created/
expires/server time; whole Seat line/Seat/Hold IDs, type/guest count and saved
prices; unit/guest counts; five amount fields; persisted Concession lines,
nullable Promotion and `paymentStartedAt`. Screening labels are current
references, not invented historical snapshots. Prices/type/totals are snapshots.
There is no currency, display timezone, poster/duration, Ticket or QR field.

### Frontend integration and boundaries

Primary **Create Booking & review** freshly confirms complete owned origins,
POSTs once and routes to `/bookings/{serverId}/summary` only after a valid receipt.
Summary performs owned GET, never reconstructs persistence from React memory.
It reuses the canonical Review Order screen
`52aa55f16d2640d68efb6c399d5fb990`, shared Customer header/layout/tokens, screening
card, Seat/composition panels and responsive totals column.

String IDs are strict positive canonical PostgreSQL bigint strings. Monetary
strings retain all four decimal digits, including zero/fractions/large values;
BigInt only checks receipt arithmetic, never reprices. No VIP adjustment or
COUPLE doubling exists. STANDARD/VIP mean one unit/guest each; COUPLE one
indivisible line for two guests. UTC is explicitly displayed because this DTO
does not expose a display zone; a local query date is never guessed from UTC.

Summary uses exact Booking `expiresAt` and serverTime/monotonic projection,
rechecks on expiry/focus/visibility/poll/reload and displays returned terminal
states read-only. Navigation never renews it. An existing `paymentStartedAt`
is displayed only as an existing frozen-attempt boundary, not verified success.

Real Summary has no enabled Payment path or composition controls. Existing
persisted add-ons/Promotion may be read, never edited here. **Preview Concessions**
remains an explicitly separate secondary action into the existing design flow;
its fixtures/prices/codes never alter the real Booking. No My Bookings, Payment,
VNPAY, Ticket/QR implementation was added.

### Duplicate, unknown response, reload and Back

Pending Hold/Booking refs gate rapid actions. While creation is pending or its
outcome unknown, acquisition, release and new/preview continuation are blocked.
No automatic POST retry. Exact intent is saved before dispatch; navigation/abort
cannot establish rollback. An explicit **Recover Booking** sends only the same
Showtime and complete original Hold set under the existing eligible-unexpired-
PENDING same-owner contract. It returns the same identity/deadline, never a new
deadline or a replacement set. 4xx clears rejected intent and reconciles;
transport/5xx/invalid receipt remains uncertain. Safe errors exclude raw SQL.

Owned GET works on direct entry/reload even after public catalog hiding. Normal
Customer login resumes a validated local Summary URL; ownership is always
checked by backend. Role/current-account restrictions remain unchanged.

Attached Holds remain ACTIVE with original expiry, excluded from independently
owned-Hold GET. Returning shows them HELD/disabled and **Return to Booking**,
with **See Booking** rather than a reset Hold timer. No release/re-create occurs.
Known Booking navigation/unknown exact-set recovery can survive unavailable
public catalog/map. A per-tab storage hint supplies no ownership/amount/token.
Missing/untrusted Seat context recovers through the server Showtime date picker.

## 6. Files Created

- `frontend/src/features/booking/booking.types.ts`, `booking-api.ts`,
  `booking-api.test.ts`, `booking-service.ts`, `booking-service.test.ts`;
- `booking-creation-storage.ts`, `use-booking-creation.ts`,
  `use-booking-detail.ts`, `owned-booking-summary-screen.tsx` in that feature;
- `frontend/src/app/(public)/bookings/[bookingId]/layout.tsx` and `summary/page.tsx`;
- `frontend/test/e2e/helpers/customer-bookings.ts`,
  `frontend/test/e2e/customer-booking-creation.spec.ts`;
- [Development guide](../development/customer-booking-creation-frontend.md) and this report.

## 7. Files Modified

- `frontend/src/features/seat/seat-selection-screen.tsx` — primary real creation,
  pending/recovery gates, truthful attached-Hold return and separate preview action;
- `frontend/src/features/auth/auth-return.ts`, `login-form.tsx` — validated normal
  Customer Summary resume, preserving existing role routing;
- `frontend/package.json` — two new unit test files, no dependency change;
- browser helpers `customer-holds.ts`, `customer-discovery.ts` — contract fixtures
  represent attached origins and supported VIP; never imported by production;
- existing `seat-selection`, `concession-selection`, `booking-summary`,
  `payment-method`, `payment-processing`, `payment-result`, `customer-final-qa`
  specs — secondary explicit preview entry and deterministic navigation waits;
- `README.md`, current Hold guide, Customer screen map/implementation plan,
  `docs/ai/current-handoff.md` — integration boundary/next task reconciliation.

No backend, migration, BRD/SRS, historical contract/report or Stitch edit.
Stable `docs/ai/project-context.md` remains unchanged: no stable domain decision
was established by this existing-contract integration.

## 8. Verification

| Check | Result / evidence |
|---|---|
| Maven verify | PASS — 294 tests, 50 suites, zero failures/errors/skips; all existing PostgreSQL flags enabled, dedicated local PostgreSQL database; jar/repackage PASS, 2026-10-02 16:14:17 +07 |
| TypeScript | PASS — `pnpm exec tsc --noEmit` on final source |
| ESLint | PASS — `pnpm lint`, zero violations on final source |
| Unit tests | PASS — `pnpm test`, 81/81, zero failures/skips |
| Production build | PASS — `pnpm build`, including dynamic owned Summary route |
| Full Playwright | PASS — `PLAYWRIGHT_CHANNEL=msedge pnpm test:e2e --retries=0`, 115/115, one worker, retries=0, 6.4 minutes; completed build followed by a fresh production test server |
| Final test-import convention follow-up | PASS — after a type-only test-helper import changed to the source alias, TypeScript/ESLint and all 14 Booking Playwright scenarios passed again, retries=0, 20.7 seconds; application runtime source unchanged |
| Neon/API/browser desktop/mobile | PASS — real no-interception normal Customer flow, owned Summary reload/Back, 1440×1000 / 390×844, keyboard; one retained unpaid Booking |
| Protected repository files | PASS — 320 original protected files SHA-256 unchanged; final Neon protected row fingerprints and V1–V12 applied checksums also unchanged |
| Final docs/links/whitespace/handoff | PASS — current guide/README/map/plan/handoff/report reconciled; local links, UTF-8/EOF, Git whitespace, naming, source boundaries and protected history checked, including this report |

Unit additions exercise exact authenticated existing-resource body, strict IDs,
safe 4xx/5xx errors, unknown transport/malformed receipts, abort without rollback
claims, no automatic retry, exact zero/large money, whole type/guest counts,
recovery intent and safe Auth return paths.

Fourteen additional Booking browser scenarios cover valid multi-origin creation,
STANDARD/VIP/COUPLE, owned reload/Back, pending duplicate gate, lost committed
response/exact-set recovery after reload, expiry before/during submission,
server rejections for invalid origins, login/hidden catalog/direct reads,
service errors/retry/role/foreign access, server terminal states and desktop/
mobile/keyboard/string safety. Isolated HTTP fixtures test UI contract handling;
they are not PostgreSQL or live provider proof. PostgreSQL ownership/atomicity/
concurrency and history/finalization regression remain the backend suite's job.

Intermediate failures were corrected, not retried into acceptance: scoped alerts
avoid Next's route announcer; pending assertions await the request reaching the
test server; preview Back waits for the actual Method navigation. A separate
run affected by rebuilding `.next` while its test server was active was stopped
and discarded. Final acceptance uses an already completed build and a fresh
server for the entire suite, with no retry masking.

### Live Neon and browser evidence

**PASS, actual Neon PostgreSQL 18.6 / existing V12, no migration or reseed.**
Normal backend `.env` startup validated twelve migrations, reported no migration
necessary and started with Hibernate validate. Verification process alone set
`SEAT_HOLD_CLEANUP_ENABLED=false` and `VNPAY_ENABLED=false`; source/defaults remain
unchanged. Existing normal isolated Customer accounts were reused through Auth;
no Admin credentials, fabricated session, HTTP interception or database bypass.

Browser walked Home → Movie Listing → Movie Detail → Cinema → Showtime → Seat:
existing Showtime **12**, Movie **4**, Cinema **1**, Hall **1**, **2026-10-04 19:00
Asia/Ho_Chi_Minh**. Selected STANDARD **1/A1**, VIP **31/D1**, whole COUPLE
**41/E1-2** and acquired **Holds 6/7/8** atomically through the UI. One primary
create operation produced server **Booking 1**, initially PENDING, and three
Booking Seat rows: **3 Seat Units / 4 guests**. Each stored price is
`90000.0000`; seat/subtotal/final amount **`270000.0000`**, Concession/discount
`0.0000`, no Concession lines, Promotion or Payment start.

Exact original earliest Hold expiry and Booking deadline:
**`2026-10-02T10:09:36.316360Z`** (17:09:36.316360 +07).
Raw owned-Hold and Booking JSON were compared without floating-point money/ID
conversion. Exact origin set, type/counts, snapshots, total and deadline matched;
owned GET after reload/Back was identical except new serverTime. No further
create operation was needed for this live proof.

Public map reported all three units HELD, independent own-Hold GET returned
zero attached origins. Browser Back on mobile showed the three whole units
and fresh Create disabled, See Booking and Return to Booking; Enter returned to
Summary without release/re-creation/deadline renewal. Actual attached single-Hold
release returned **409**; owning detail **200**, different normal Customer
**404**, anonymous **401**. No raw internal error appeared.

Desktop **1440×1000**, mobile **390×844**, keyboard selection/return, status/count/
price/deadline and no document overflow PASS. Final live browser error log was
empty. Screenshots from the real browser, not intercepted fixtures:

- [PENDING Summary desktop](../../backend/target/qa/customer-booking-live/booking-summary-desktop.png)
- [Reloaded PENDING Summary mobile](../../backend/target/qa/customer-booking-live/booking-summary-mobile.png)
- [Attached Seat Back mobile](../../backend/target/qa/customer-booking-live/attached-seats-mobile.png)
- [Final retained CANCELLED Summary](../../backend/target/qa/customer-booking-live/booking-summary-final-cancelled.png)

Evidence is local ignored verification output; it is not a committed dataset.
Private login inputs/JWTs and read-only audit helpers stayed outside Git and are
not included in this report.

Safe verification cleanup used the **existing owned DELETE Booking** operation
(**204**, logical cancellation, no physical deletion). Final **Booking 1
CANCELLED**, all three Booking Seat snapshots retained, Holds **6/7/8 RELEASED**
with unchanged original expiry/attachment; Seats **1/31/41 AVAILABLE**.
Exactly one verification Booking remains, no unpaid active resource left held.
No cancellation UI was implemented.

Final read-only pre/post fingerprints prove preservation of all original
catalog/hierarchy/schedules/membership, prior Holds/Bookings/Booking Seats and
Payment/Ticket/Promotion/Concession/evidence/reconciliation/audit rows, plus
all applied V1–V12 checksums. New additions are exactly three verification Holds,
one retained Booking and its three Seat lines; ordinary Auth login/token activity
is expected separately. Existing five prior verification Holds are unchanged.
Payment start/paid/QR remain null, sold_at null, no CONSUMED, usage consumption,
Payment Transaction, Ticket, provider call or financial effect.

## 9. Requirement Reconciliation

- PASS: real existing Customer Booking adapter, exact owned Hold origins, one
  atomic server operation, normal Auth/owned detail, whole units and authoritative
  identity/snapshots/amount/deadline. No fake API or mock fallback.
- PASS: safe duplicate/uncertain write handling, strict string IDs, server-wins
  expiry rejection, owned reload/direct entry and attached-Hold Back navigation.
- PASS: scope preservation, no V13/backend/business-policy change, no real
  Concession/Promotion/Payment/VNPAY/paid/sold/consumption/Ticket/QR action.
- PASS: final 115/115 full Playwright, live no-interception Customer/Neon proof,
  safe retained cancellation, original-history preservation and docs/handoff checks.
- DEFERRED: future composition, Payment and history/cancellation/issuance UI;
  no verification requiring real Payment SUCCESS was manufactured.

## 10. Deviations / Conflicts

No schema/contract blocker or V13 proposal. The existing create operation is
seat-only; integrating real add-ons is not mandatory for this request.

Existing convention conflicts: legacy Auth DTO/session userId remains numeric;
new Booking/domain IDs stay strings. Historical filenames/older dated coverage
statements are preserved, with current integration reconciliation in maintained
docs. The Next.js dynamic `[bookingId]` segment is an explicit framework naming
exception, not a deviation. No new exception requested or approved.

Visual reference may show richer Movie metadata, local timezone/currency or
editable composition/Payment. This task uses only the real Booking DTO and stops
at the approved integration boundary; unsupported fields/actions are excluded.
No requirement or Stitch document is rewritten to justify implementation.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md).

| Area | Result | Notes |
|---|---|---|
| Folder/file naming | PASS | Existing feature layout; new kebab-case files, framework page/layout/dynamic exceptions |
| Code naming/imports | PASS | PascalCase types/components, camelCase functions, production `@/` imports; test tooling uses supported relative imports |
| Domain/status terminology | PASS | Existing Booking/Hold/Seat names and returned approved statuses; no new enum/business policy |
| Route/API convention | PASS | `/bookings/[bookingId]/summary`; only existing `/api/v1/bookings` POST/owned GET |
| Database convention | N/A for changes | No database object, guard, migration or backend edit |
| Documentation/report convention | PASS | Correct dated kebab-case report, all template sections, current maintained docs/handoff/local links/EOF/whitespace; historical documents preserved; report rechecked |
| Secrets/generated artifacts | PASS | Private credentials/JWT/evidence helpers outside Git; ignored `.env`/target/test output; no dependencies added |

## 11. Known Limitations

- No Booking list/search endpoint exists to rediscover an unknown server identity
  after its exact-set recovery window expires. The existing My Bookings preview
  cannot list this real Booking; retain its server Summary link. Retry cannot
  resurrect it. A
  blocked sessionStorage permits memory-only recovery until unload; the last
  per-tab hint is not history or ownership.
- Screening labels are current referenced metadata. Booking DTO lacks display
  timezone/currency; exact amounts and explicit UTC are used. Cold Seat navigation
  goes through the real date picker rather than fabricating context.
- Summary polls/refreshes server truth; no realtime push. The backend remains
  authoritative under cutoff/expiry races. Historical Auth userId serialization
  is outside this string-safe Booking slice.
- Real Concession composition, Promotion, Payment initiation/result, owned
  history/cancellation UI and Ticket/QR integration remain separate. Static
  previews are not purchased entitlements or production completion.
- VNPAY remains disabled for verification; no provider interoperability, external
  charge or Payment SUCCESS certification is implied by this frontend task.

## 12. Next Recommended Step

**Integrate real Concession composition into the existing unpaid Booking** using
the authoritative active catalog, owned PENDING/pre-Payment edit guards, immutable
line snapshots and server total/deadline. Promotion integration follows
separately, then Payment initiation. Do not begin automatically.
