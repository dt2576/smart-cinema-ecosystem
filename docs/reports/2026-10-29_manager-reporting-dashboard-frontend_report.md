# MANAGER Reporting & Dashboard frontend

## 1. Task Information

Task started 2026-10-29; completion verification 2026-10-30, Asia/Saigon.
Frontend implementation only. **IMPLEMENTED AND VERIFIED within the evidence below.**

| Acceptance | Result |
|---|---|
| FUNCTIONAL | PASS: frontend contract/fixture integration and selected regressions |
| VISUAL | PASS for contract-compatible reproduction of current Stitch HTML; not pixel identity |
| REAL AUTHENTICATED MANAGER | BLOCKED: PRIMARY has 0 ACTIVE/effectively assigned Managers |

No account provisioning, Neon business-data writes, backend/API/Flyway changes,
Stitch edits, staging, commit, push or deployment.

## 2. Requested Work and Documents Reviewed

Implemented `/manager/dashboard` and `/manager/reports`, reusing existing Manager
scope/authentication, request infrastructure and Booking shell styles.
Read AGENTS, canonical development/frontend/Stitch workflows, applicable rules,
[project conventions](../development/project-conventions.md), `.stitch/DESIGN.md`,
current handoff, Project Scope v1.0 §§4.3/5.11, BRD v1.2 §3.1.16, SRS v1.2 §3.13,
the latest Booking frontend/Reporting backend reports, installed Next16 client/server
guide and actual controller/request/response source. Behavioral authority is the
[Manager Reporting contract v1.0](../api/manager-reporting-dashboard-contract-v1.0.md).
No requirement document or historical report was changed.

## 3. Requirements Traceability

| Existing requirement | Implementation/evidence | Reconciliation |
|---|---|---|
| BR-003/057; FR-AUTH-007/008; FR-REPORT-001 | Existing server scope gate, Bearer GETs, Manager navigation; wrong-role/revocation fixtures and real anonymous denial | Automated PASS; real authenticated positive BLOCKED |
| BR-059; FR-REPORT-003 | Backend `confirmedRevenue`; exact decimal strings, no SUCCESS-only recognition or local revenue derivation | PASS |
| BR-060; FR-REPORT-004/005/006/007 | Actual Ticket/guest/Seat Unit metrics, nullable weighted occupancy, Movie/Showtime/Cinema rankings | PASS |
| BR-066; FR-REPORT-008 | Backend Concession quantity/gross snapshots; no product net-discount allocation | PASS |
| NFR-PERF-006; NFR-SCALE-005 | Existing bounded GETs,366-day validation, paginated rankings, abort/stale-read protection; no polling | PARTIAL: production workload not benchmarked |

These IDs exist in BRD/SRS v1.2. No new UC/BR/FR/NFR ID or business rule was invented.

## 4. Stitch Evidence and Route Mapping

Live project `projects/1208499799798658711`, **Smart Cinema Ecosystem**;
MCP project update time `2026-10-29T13:54:22.100712Z`.
The current inventory contained 72 entries, with one candidate for each requested
Manager title. Selected the current candidates, not historical/deleted IDs:

| Screen | Current screen ID | HTML file ID | Screenshot file ID | Frontend |
|---|---|---|---|---|
| Tổng quan | `87b091c31f314e2dbec333782d8bbb2f` | `14422373861905346492` | `11437687389018221313` | `/manager/dashboard` |
| Báo cáo & Thống kê | `ced1bfc2953941c8a64893756154b63b` | `15847184588353747747` | `15786923008359635028` | `/manager/reports` |

Retrieved project/list/get_screen metadata, actual HTML and JPEG previews through
the connected integration. Export credentials were used only in memory for the
Stitch host, never printed or committed. Cached JPEGs omit some operational/card/
product content; current HTML contains those sections and was rendered directly
in Edge for comparison. MCP has no immutable per-screen revision/approval marker
or generation-job completion evidence: no job-completion claim is made here.
The sole current designs match the requested screen compositions; residual
unsupported prototype copy is overridden by the user's explicit restrictions.

Source metadata/downloads and rendered evidence are retained under ignored
[task artifacts](../../frontend/target/manager-reporting-2026-10-29/stitch-metadata.json).

## 5. Implementation and API Integration

Dashboard preserves the four KPI cards, amber area/line chart, Booking state
segments, ranked Movie list and operational Showtime panel. Reports preserves
the amber confirmed-revenue card, three financial component cards, daily bar
chart, three performance dimensions and Concession ranking. Both have functional
Cinema/date filters, safe refresh, loading/empty/error states and responsive layout.

| Existing GET | Use |
|---|---|
| `/api/v1/manager/dashboard` | Dashboard summary/activity |
| `/api/v1/manager/reports/summary` | Detailed financial summary |
| `/api/v1/manager/reports/daily` | Ordered per-day chart/table data |
| `/api/v1/manager/reports/breakdowns` | MOVIE/CINEMA/SHOWTIME pages; dashboard4 rows, reports5 |
| `/api/v1/manager/reports/concessions` | Independent5-row product pages |

The existing `/api/v1/manager/cinemas` read still gates workspace access.
All report reads use Bearer authentication, no-store, omitted cookie credentials,
bounded timeouts and explicit DTO projection. Validate string IDs/counts/amounts,
period/filter identity, local-day boundaries, complete activity states, daily
ordering, page metadata and duplicate identities. Raw error payloads/PII/provider
metadata never render. Stored roles and URL hints do not authorize reads.

Inputs display an inclusive end day and submit the contract's exclusive `to` in
Asia/Ho_Chi_Minh. Invalid/repeated/unknown filters are blocked before report reads;
URL filters, tabs and independent pages survive reload/Back/Forward. Login resume
uses exact canonical routes. Advanced URL Movie/Showtime filters are disclosed
and can be cleared. Stale/aborted reads cannot replace a newer query.

401/403/404/409/429/503, malformed JSON/DTO and network failures have safe Vietnamese
feedback; Retry-After delays only the explicit recheck button. No automatic API
retry, polling or mutation handler. Exact monetary formatting remains string-based;
BigInt is used for chart ratios, totals/page arithmetic and adaptive axes. Number
is used only for bounded drawing coordinates, calendar/pagination controls, never
identity or financial totals. Arbitrarily large/fractional amounts remain exact.

Finance stays backend-authoritative. Gross components are labeled before discount;
the backend confirmed total is displayed independently. Booking states are current
stored states of creation-period rows. Actual checked-in Tickets are shown without
dividing by a different issuance/sales cohort. COUPLE remains one Ticket/Seat Unit
with its actual guest capacity. Zero-capacity occupancy stays unavailable.

## 6. Files Created and Modified

New files under `frontend/`:

- `src/app/manager/dashboard/page.tsx`, `src/app/manager/reports/page.tsx`.
- `src/features/manager/manager-report.types.ts`, `manager-report-api.ts`,
  `manager-report-service.ts`, `manager-report-shell.tsx`, `manager-report-screen.tsx`,
  `manager-report-components.tsx`, `manager-report.module.css`, `manager-report.test.ts`.
- `public/icons/manager-report-symbols.woff2` and its Apache2 license.
- `test/fixtures/manager-reporting.mjs`, `manager-reporting-browser.mjs`;
  `test/e2e/manager-reporting.spec.ts`.

Modified `frontend/package.json` only to register the new unit file;
`manager-shell.tsx`, `manager-booking-shell.tsx`, `manager-navigation.ts` only for
the new scoped routes/navigation. Existing Manager pages keep their layout.
`test/e2e/manager-operations.spec.ts` now permits the approved Manager reporting
links while explicitly denying ADMIN links/Manager-assignment controls.
This new report and an additive current-handoff entry are the only documentation
changes. No dependency or lockfile change.

## 7. Verification

Working tree was initially clean; original 1017 tracked-file/HEAD/index hashes were
saved. Baseline `pnpm test`: **319/319 PASS** before implementation.

Commands below ran from `frontend/`, with existing configuration:

| Command/check | Actual result |
|---|---|
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm lint` | PASS:0 errors,12 pre-existing historical QA-script warnings |
| `pnpm test` | **328/328 PASS**,0 failures/skips;9 new cases |
| `pnpm build` | PASS: Next16.3.5 production build, both routes present |
| `$env:PLAYWRIGHT_CHANNEL='msedge'; pnpm exec playwright test manager-reporting --reporter=line` | **34/34 PASS** on the final production build |
| Same channel; `pnpm exec playwright test 'manager-reporting\|manager-operations' --reporter=line` | **54/54 PASS** after the navigation assertion correction |
| Same channel; `pnpm exec playwright test 'admin-\|manager-\|shared-ui-foundation\|customer-final-qa' --reporter=line` | **233/233 PASS**, one complete final-build run,4.4 minutes,0 failures/skips/retries |
| Real root PRIMARY HTTP/Edge, without interception | **13/13 PASS**:5 endpoint401s at both backend/proxy, public proxy equality,2 anonymous login entries |
| Additional real-browser fixture state screenshots | **12/12 PASS**: loading/empty/error at1440/390 for both routes; reduced motion, no page overflow/writes |
| Final real-browser geometry/overlap checks | **8/8 PASS**: actual sidebar/header bounds, chart/table control separation and44px bar targets |

Exact final selected-suite command (existing configuration, one worker, no retries):

```powershell
cd frontend
$env:PLAYWRIGHT_CHANNEL='msedge'
pnpm exec playwright test 'admin-|manager-|shared-ui-foundation|customer-final-qa' --reporter=line
```

The initial new-suite run had28 PASS/2 FAIL: a large Cinema fixture repeated its
ID, and an alert locator also matched Next's route announcer. Fixed fixture
identity and scoped the assertion to the form; no production validation weakened.
The first selected run had231 PASS/1 FAIL: the old test prohibited every reporting
link. Replaced that obsolete assumption with positive Manager-route checks and
explicit ADMIN-link denial; retained the no-write/assignment-control assertions.
The corrected selected run passed232/232. No skipped tests or retry masking.
The overnight verification process was interrupted by the session transition;
its incomplete log was retained, not counted as a completed run. A fresh complete
rerun also passed232/232. Final review then corrected the beyond-last Concession
page message and added an explicit first-page recovery regression; the final
**34/34 Reporting and233/233 selected cases passed** on the final build and cover
that correction. The final run preserves all199 baseline selected cases and adds34.

Logs, font/geometry measurements and scripts are ignored task artifacts, including
[unit results](../../frontend/target/manager-reporting-2026-10-29/unit-final.log),
[selected regression](../../frontend/target/manager-reporting-2026-10-29/e2e-selected-final.log),
[geometry checks](../../frontend/target/manager-reporting-2026-10-29/geometry-qa.json)
and [real HTTP evidence](../../frontend/target/manager-reporting-2026-10-29/real-api.json).

## 8. PRIMARY Neon Verification

Used actual root `pnpm dev`, never local PostgreSQL. Process-only QA overrides
disabled Seat Hold cleanup, invitation delivery and VNPAY background activity;
environment files/startup configuration were not edited. The normal startup gate
reported **installedV18/sourceV18; pending0; failed0; all18 checksums VALID**,
skipped migration and reached backend/frontend/API proxy READY. `pnpm db:status`
independently confirmed that state. Spring Boot and Next.js were actually serving.

An existing enforced READ ONLY JDBC probe checked real schema/repository queries,
unknown-actor denial and empty scoped summary/daily/all dimensions/Concessions.
Fresh counts: **ACTIVE Managers0; effectively assigned Managers0**. Therefore real
authenticated positive reads, live scope revocation and representative financial
data display remain **BLOCKED/NOT RUN**, not PASS. No account/token impersonation,
seed or Neon business-data mutation was used to manufacture evidence. Fixture
sessions/outcomes are isolated tests, not real Manager or financial verification.
After verification, the supervised QA services were stopped intentionally;
ports3000/8080/3100 no longer responded. Start normally with root `pnpm dev` when
needed. The stopped-process exit is not a startup failure; READY and actual HTTP
checks preceded shutdown.

## 9. Screenshot and Typography Evidence

Rendered the exact current HTML and actual React application in installed Edge,
100% zoom,1000px viewport height. Compared both routes at all four required widths.
[Comparison index](../../frontend/target/manager-reporting-2026-10-29/comparisons.html)
labels Stitch left/fixture-backed React right. Original previews/raw full-page
references remain; comparison images crop only reference overflow past the viewport.

| Width | Dashboard comparison | Reports comparison |
|---|---|---|
|1440|[PNG](../../frontend/target/manager-reporting-2026-10-29/dashboard-comparison-1440.png)|[PNG](../../frontend/target/manager-reporting-2026-10-29/reports-comparison-1440.png)|
|1280|[PNG](../../frontend/target/manager-reporting-2026-10-29/dashboard-comparison-1280.png)|[PNG](../../frontend/target/manager-reporting-2026-10-29/reports-comparison-1280.png)|
|768|[PNG](../../frontend/target/manager-reporting-2026-10-29/dashboard-comparison-768.png)|[PNG](../../frontend/target/manager-reporting-2026-10-29/reports-comparison-768.png)|
|390|[PNG](../../frontend/target/manager-reporting-2026-10-29/dashboard-comparison-390.png)|[PNG](../../frontend/target/manager-reporting-2026-10-29/reports-comparison-390.png)|

Corrected the initial icon font override, grid fractions, heading/filter spacing,
financial amount wrapping at1280, chart tooltip clipping, Movie row spacing/icon
placement and overlapping chart-data control. Re-rendered/re-captured after fixes.
Scoped Nocturne CSS reuses existing fonts/tokens; new icons are a small licensed
self-hosted Material Symbols subset, without a new dependency.

Measured1440 geometry matches sidebar288/header64, titlex328 and H1
36px/44px/700/tracking−0.9px (Dashboardy126, Reportsy106),24px gutters and the8:4/7:5
12-column arrangements. CDP `CSS.getPlatformFontsForNode` confirms custom Space
Grotesk for sampled Vietnamese headings/navigation/labels/numbers and Plus Jakarta
Sans for body/select text, with no sampled system fallback. Native date inputs'
computed family is Jakarta; their internal calendar text is browser-managed.
All eight rendered views had0 page errors and document width equal to viewport.
Keyboard focus, native semantics, mobile menu focus return,44px controls/bar targets
and local chart/table scrolling are retained. Full precision can increase wrapping.

## 10. Deviations, Conflicts and Limitations

- Existing GETs do not supply posters, format/runtime metadata, equipment health,
  room readiness, comparison growth or authoritative update timestamps. Neutral
  poster footprints replace demo images; no invented data or controls are retained.
- Removed residual English prototype labels, fake account/Cinema facts, notification
  action, “qua quầy”, “thời gian thực”, cancellation-safety threshold and attendance
  ratio/unscanned count. Those claims are unsupported or mix different event cohorts.
- Product rank/order follows backend quantity order, not the prototype's illustrated
  order. Per-product values are gross, not allocated net revenue. Fixtures deliberately
  differ from some inconsistent prototype numbers; screenshots do not prove finance.
- Native date inputs replace the demonstration range string; browser locale controls
  their internal date notation. Accessible daily tables and44px controls add height.
  Long IDs/tables/charts scroll locally rather than clipping values or the document.
  Relative presets follow the actual browser date rather than the prototype's fixed
  example date, so a past fixture period need not highlight a current-day preset.
- Only desktop Stitch exports exist for these IDs. Raw390 HTML overflows to533px
  (Dashboard)/500px (Reports); React uses the existing mobile menu/stacking patterns.
  This is a responsive adaptation, not a claim of a separate approved mobile export.
- No measured100% pixel identity, Stitch generation-job completion, production load
  benchmark, real authenticated Manager success or production-money result is claimed.

No convention exception was requested or introduced; legacy files remain untouched.
Final source reconciliation:1011 of1017 original tracked files are byte-unchanged;
the6 modified originals are exactly the frontend registration/navigation/test files
and additive handoff listed above. All backend, contracts,18 migrations, requirements,
historical reports and instruction/design files are unchanged. HEAD/index unchanged.

## Convention Compliance

| Area | Result | Evidence |
|---|---|---|
| Folders/files/routes | PASS | Existing Manager feature; kebab-case files; canonical plural reports route; framework page.tsx |
| Code/imports | PASS | PascalCase components/types, camelCase functions, configured `@/` imports; scoped business UI |
| Domain/status/identity | PASS | Existing serialized states and Ticket/Seat Unit terminology; canonical string IDs |
| API/database | PASS / N/A | Exact existing GET contracts; no backend/schema/Flyway/privilege change |
| Dependencies/design | PASS | No packages/global-theme/Stitch changes; licensed font asset; verified typography |
| Documentation | PASS | Requested dated report, real requirement IDs, additive handoff, historical reports preserved |
| Scope/Git/encoding | PASS | Protected hashes, UTF-8, links and whitespace checked; unchanged HEAD/index; no source/config changes outside the listed scope |

## 11. Next Recommended Step

Separately authorize real authenticated read-only verification when a suitable
existing ACTIVE/effectively assigned Manager and approved access are available.
Do not provision accounts, start another module or deploy automatically. Stop after
this report and verification reconciliation.
