# ADMIN Reporting & Dashboard frontend — implementation report

## 1. Outcome and scope

2026-10-27 · ADMIN frontend · **PASS**.
Implemented real Dashboard `/admin` and Reporting `/admin/reports`, authenticated
read adapters, date filters, daily chart, paginated dimension table and feedback.
Actual local application and browser workflows verified. No backend, database,
migration, financial rule, authentication/session implementation, Stitch design,
Manager, deployment, staging, commit or push changes.

Working tree was clean at `d479ac44d57b026b6e47dee5921f57f08f700ac4`.
Read AGENTS/frontend AGENTS, applicable workflows/rules, canonical conventions,
current handoff, previous Reporting backend report, exact
[API contract v1.0](../api/admin-reporting-dashboard-contract-v1.0.md), relevant
BRD/SRS, existing AdminShell/Promotion/Concession/auth/shared components and
installed Next.js16 server/client component guidance. Requirements unchanged.

## 2. Requirement and design traceability

| Authority | Result |
|---|---|
| BRD v1.2 §3.1.16, BR-058; SRS v1.2 §3.13 FR-REPORT-002 | PASS — real chain-wide ADMIN Dashboard |
| BR-059 / FR-REPORT-003 | PASS — displays only backend-confirmed revenue; no frontend settlement inference |
| BR-060 / FR-REPORT-004–007 | PASS — Tickets, occupancy, Movie/Cinema/Showtime performance from backend fields |
| NFR-SEC-002/003/004/006 | PASS within frontend scope — existing backend gate/session flow retained; safe typed reads/input validation |
| FR-REPORT-001, FR-REPORT-008 | NOT APPLICABLE to this requested UI — no Manager or Concession revenue workspace |

Read-only live Stitch project `1208499799798658711`: retrieved and inspected actual
HTML and PNG for Dashboard **`07d55d5aaba54a9cb4dc13d310496533`** and Reporting
**`e26f0a24a88249d69398a8d2a82de159`**. No designs edited. Reused
[Nocturne reference](../../.stitch/DESIGN.md), current fonts, semantic colors,
cards, Button, FormField, Skeleton, StatusFeedback and AdminShell. Corrected mockup
limitations in React; no prototype JavaScript copied.

## 3. Implemented behavior and exact integration

| UI | API and behavior |
|---|---|
| Dashboard | GET `/api/v1/admin/dashboard`; exactly4 KPI cards: confirmedRevenue, ticketsSold, confirmedBookings, occupancyPercent |
| Reporting summary | GET `/api/v1/admin/reports/summary`; same4 plus showtimes |
| Daily chart on both | GET `/api/v1/admin/reports/daily`; exact daily values, zero days, scrollable bars, accessible data table |
| Dimension table | GET `/api/v1/admin/reports/breakdowns`; CINEMA/MOVIE/SHOWTIME, backend page/size10, exact totalElements |

Dashboard presets are computed on mount/selection using `Asia/Ho_Chi_Minh`:
today `[today,tomorrow)`,7days `[today−6,tomorrow)`,month-to-date
`[month start,tomorrow)`. Link to detailed report preserves the exact API period.
Report inputs include the final selected date; submission adds one calendar day
for exclusive `to`. Missing/impossible/reversed/>366day/out-of-range dates fail
before HTTP. Invalid direct URLs never fetch guessed/default data. Applied dates
remain in URL for reload; draft edits require explicit submission. Separate
DD/MM/YYYY applied-range text clarifies the period while editing and when native
date control presentation follows browser/OS locale.

All4 adapters require valid structured responses, matching period/timezone/
Sandbox metadata, complete ordered daily dates, exact decimal strings, canonical
bigint IDs, correct dimension metadata and page/count/duplicate consistency.
GET bearer/no-store/omitted cookies,15s timeout and cancellation; no write API,
automatic retry, polling, export or synchronization endpoint. Existing request
identity hook prevents aborted/stale data replacing a newer selection.401/403
reuse AdminShell denial;400/429/503/network/malformed responses receive safe
Vietnamese feedback. Retry-After countdown enables only an explicit read retry.
Raw server errors are never echoed.

Money is formatted by string operations, counts remain strings, and null occupancy
means **“Chưa có dữ liệu”**, not zero. BigInt ratios produce bounded chart drawing
coordinates only; no revenue total/financial eligibility is calculated by the UI.
Table SHOWTIME rows use supplied Movie/Cinema/Hall label and local start time;
other dimensions additionally display Showtime count. No invented row total,
comparison, forecast, VAT, fees, bank settlement or refund claim. Visible
**“Dữ liệu thanh toán thử nghiệm”** identifies the existing Sandbox environment.
The short payment-date versus Showtime-date explanation is retained.

## 4. Files

Created:

- `frontend/src/app/admin/reports/page.tsx`.
- `frontend/src/features/admin/admin-report-api.ts`.
- `frontend/src/features/admin/admin-report-service.ts`.
- `frontend/src/features/admin/admin-report-components.tsx`.
- `frontend/src/features/admin/admin-report-screen.tsx`.
- `frontend/src/features/admin/admin-report.test.ts`.
- `frontend/test/e2e/admin-reporting.spec.ts`.
- `frontend/test/fixtures/admin-reporting.ts` (test-only; never production imported).
- This report.

Modified: `frontend/src/features/admin/admin-home.tsx` (replace old quick-navigation
landing), `admin-shell.tsx` (one Reporting link), `frontend/package.json` (append
unit test), `frontend/test/e2e/admin-movies.spec.ts` (assert the new link in the
existing exact navigation expectation), and additive `docs/ai/current-handoff.md`.
No new library, token/font/configuration change or unrelated module rewrite.

## 5. Actual commands and final results

Frontend commands ran from `frontend/`, normal existing configuration, Edge channel
for Playwright. Backend test counts from the previous report are historical and
are **not** included in this task's totals.

| Check | Actual result |
|---|---|
| Baseline `pnpm test` | **256/256 PASS**, zero failures/skips |
| `pnpm exec tsc --noEmit` | PASS, zero errors |
| `pnpm lint` | PASS,0 errors/12 existing warnings in old ignored audit artifacts |
| `pnpm test` | **269/269 PASS**, including13 new tests; zero failures/skips/cancellations |
| `pnpm build` | PASS; final build compiled, typechecked and generated28 static pages |
| `$env:PLAYWRIGHT_CHANNEL='msedge'; pnpm exec playwright test admin-` | **88/88 PASS**,67 existing ADMIN +21 new Reporting cases, zero skips/retries |
| Final focused `pnpm exec playwright test admin-reporting` after applied-range caption | **21/21 PASS**, included in88 distinct cases, not an extra21 |
| Actual local browser harness, no API fixtures | **12/12 groups PASS**,53 browser ADMIN GET responses200,9 final masked screenshots |
| Separate positive-chart visual harness | PASS — HTTP fixture only; bar geometry and screenshot inspected, no operational sales claim |
| Full cross-role/customer Playwright suite / backend Maven regression | NOT RUN — scope was frontend with all existing ADMIN regression; backend unchanged |

Ignored evidence: `frontend/target/admin-reporting-frontend-2026-10-27/`:
`baseline-unit.log`, `unit-second.log`, `typecheck-verified.log`,
`lint-verified.log`, `build-complete.log`, `playwright-final.log`,
`playwright-reporting-final.log`, `real-browser-complete.log`,
`real/evidence.json`,9 final `real/*.png` screenshots (excluding retained initial
failure screenshot), `fixture-positive-desktop.png`, `fixture-visual.log`,
`startup.log`, `status-final.log`, `preservation-final.log`, and Stitch exports.
No real token, password, request header or login body recorded in evidence.

## 6. Real local application, data and visual evidence

Ran root `./scripts/local-dev.ps1` and `./scripts/local-dev.ps1 -Action Status`.
Only target **127.0.0.1:5432/smartcinema_phase4e_test**. Actual status:
**installed/source V16, pending0, failed0, all16 checksums valid**. Migration
skipped; operator credentials not loaded. Spring Boot8080, Next.js3000 and real API
proxy all healthy. No startup workflow changes.

Used approved existing synthetic ADMIN via normal login. Real browser checked:
anonymous denial;4 Dashboard KPIs; all3 presets and matching daily filters;
Dashboard→Reporting values; inclusive October range/exclusive API end;31 daily
rows; all3 breakdowns; actual page2/back; invalid-date no-fetch; empty2000 range
with null occupancy; reload; existing Movie/Concession/Promotion navigation;
real anonymous API401; no page errors or ADMIN writes. Browser timezone was
America/Los_Angeles to check independence from local date boundaries.

Live October data remains20 created Bookings,20 Showtimes,20 sellable Seat Units,
zero sold units/Tickets and confirmed revenue `0.0000`. No PAID/SUCCESS/Ticket
fixture was written. Nonzero revenue, long amounts, malformed/negative HTTP
responses, wrong-role403 and delayed requests were tested using clearly marked
HTTP fixtures. They do not prove real VNPAY callback/settlement/issuance. No live
non-ADMIN credentials were provisioned or guessed.

Compared actual renders with Stitch at **390/768/1440px**: dark/amber hierarchy,
readable≥16px primary labels/controls, wrapping KPI money,≥44px controls, visible
keyboard focus, native date segment traversal, accessible chart table and
horizontal table/chart scrolling contained within their regions. No page overflow,
header overlap, fake sync/time indicator or unsupported navigation. Reduced motion
checked. Positive bar screenshot is explicitly fixture-backed. Native date text
format follows browser/OS; applied dates always have explicit DD/MM/YYYY text.

Read-only restricted runtime snapshot before/after matches ordered row hashes for
16 business/Flyway tables plus protected function definitions. Includes171 users,
24 Cinemas,49 Concessions,33 Promotions,20 Bookings,8 Payments,0 Tickets. No role,
privilege, guard or migration change; normal login adds only auth refresh sessions.
Services started for verification are stopped after testing.

## 7. Defects, limits and convention compliance

Fixed initial ES2017-target BigInt-literal type errors by using supported BigInt
constructors; no compiler target change. Corrected new unit fixture module
resolution. First browser pass83/88:5 test harness failures due to Next route
announcer ambiguity and a frozen test clock blocking Retry-After; fixed selectors
and clock, final88/88. Initial local QA assumed one Tab exits a native date input;
corrected keyboard traversal through actual date segments. These initial failures
are retained in logs; no skipped cases or retry masking. Primary control typography
was improved to16px and applied-period text added following visual QA. No backend
integration defect was found.

Known limits: no production-volume frontend/browser load test, real positive
financial/provider interoperability, Manager, export or additional metrics. Separate
backend reads are separate snapshots under concurrent commits; UI does not promise
atomic live synchronization or replace values with frontend aggregates. Periods
refresh on selection/reload; no automatic polling. Existing login destination and
session handling are preserved. No blocker remains for this requested UI slice.

| Convention area | Result |
|---|---|
| Folders/files/routes | PASS — kebab-case feature/test files, `/admin/reports`, standard page.tsx |
| Components/functions/imports | PASS — PascalCase/camelCase and existing alias; shared feature presentation |
| Domain/status/IDs/money | PASS — authoritative fields, exact string values, no new financial state |
| Tokens/accessibility/UI copy | PASS — Nocturne/shared primitives, Vietnamese labels and verified responsive controls |
| APIs/database/backend | PASS preservation; existing4 GET contracts only, no schema/backend change |
| Documentation/report/handoff | PASS — required dated report, additive handoff; historical reports untouched |
| Exceptions/conflicts | None introduced; existing ignored audit lint warnings documented |

Rechecked this report against [canonical conventions](../development/project-conventions.md).
Next: review the delivered ADMIN UI and independently select the next feature.
No Manager or other module started automatically.
