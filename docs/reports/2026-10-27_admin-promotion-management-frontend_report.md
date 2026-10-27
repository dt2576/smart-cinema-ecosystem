# ADMIN Promotion Management frontend

## Task and outcome

Date: **2026-10-27**. **IMPLEMENTED & VERIFIED — PASS** for this frontend scope.
Four real routes, all five verified APIs, simplified Vietnamese UI and real local
browser workflows. No backend, migration, database configuration or Stitch changes.

## Requirements and conventions reviewed

AGENTS/frontend AGENTS, Development/Frontend workflows, applicable rules, project
conventions, current handoff, Nocturne `.stitch/DESIGN.md`, approved simplification
request, existing AdminShell/shared components, installed Next16 dynamic-route guide,
[verified API contract](../api/admin-promotion-management-contract-v1.0.md) and
[backend report](2026-10-27_admin-promotion-management-backend_report.md).

Traceability: BRD v1.2 **BR-033/034/035**; SRS v1.2 **FR-PROMO-001–006**,
**NFR-SEC-002/003/006/011**; System Analysis v1.1 Admin inventory **UC-ADM-010**.
Management UI is implemented; eligibility, discount calculation and financial
authority remain backend responsibilities. No requirements or business rules changed.

## Stitch handoff resolved without blocking implementation

Read-only MCP checked all four existing screens in project `1208499799798658711`:

| Screen | ID | Export observed |
|---|---|---|
| List | `3ab34f68f85d4f7689a67c828f63540e` | Updated example/no legacy branding;19,549 HTML characters |
| Create | `3038db458dd74b61821c849167ec8e61` | Old export;25,461 characters,2025/Admin Suite remain |
| Detail | `1b7288320ef947a89d5d685e1b5d4f96` | Updated example/no legacy branding;18,108 characters |
| Edit | `ab41cc7d71a14b4d8862e696c31f2eb2` | Mixed revision;19,655 characters,legacy2025 remains |

Used available updated references plus previously reviewed screenshots and the
explicitly approved simplified UX fallback. These findings do not certify generation
job completion. No Windows Computer Use, browser-URL troubleshooting, prototype
JavaScript copying, global redesign or further Stitch edits were performed.

## Implementation / API mapping

| Frontend route/action | Exact API |
|---|---|
| `/admin/promotions` | GET `/api/v1/admin/promotions` |
| `/admin/promotions/new` | POST collection |
| `/admin/promotions/[promotionId]` | GET `/{promotionId}` |
| `/admin/promotions/[promotionId]/edit` | PUT `/{promotionId}` |
| Detail disable/enable dialogs | PUT `/{promotionId}/status`, then explicit GET reconciliation |

List has local code search/status filter, five columns, text Xem/Sửa actions and
alternative loading/empty/no-results/error states. No pagination or fake statistics.
Create/edit use one form, conditional percentage cap, exact decimal strings,
minimum0/unlimited nullable usage, initial status only on create and immutable code
on edit. Enabling/disabling stays on Detail with the approved compact Vietnamese
confirmation copy; Đã bật never claims current eligibility.

Existing AdminShell/auth/shared Dialog/FormField/SurfaceCard/feedback/skeleton/tokens
are reused. One new navigation link; no other role routes. Body/control labels16px,
titles24–28px, ≥44px feature controls, visible focus, trapped/restored dialog focus,
reduced-motion preference respected. Form becomes one column at768/390; desktop
two columns. Existing mobile AdminShell navigation wraps instead of a new drawer.

Dates are explicitly Vietnamese `dd/MM/yyyy HH:mm`, GMT+7 converted to UTC. Unchanged
displayed dates retain original server seconds/microseconds, avoiding silent rounding.
Money/IDs never use floating point; usageLimit alone uses a bounded integer.
Typed receipts reject mismatched IDs/terms/status, malformed data and wrong Location.
Safe400/401/403/404/409/429/503/network handling; bounded15-second explicit commands,
duplicate lock, no automatic retries. Per-tab nonce/optional ID hints are untrusted;
uncertainty/conflict blocks writes until authenticated GET review and manual acknowledgement.
Unknown creation outcome still requires manual list review; no idempotency endpoint invented.

## Files created / modified

- New feature files: `frontend/src/features/admin/admin-promotion-service.ts`,
  `admin-promotion-api.ts`, `admin-promotion-screen.tsx`,
  `use-admin-promotion-command.ts`, `admin-promotion.test.ts`.
- Four new `page.tsx` files under `frontend/src/app/admin/promotions/`:
  collection, `new`, `[promotionId]`, `[promotionId]/edit`.
- New `frontend/test/e2e/admin-promotions.spec.ts` and
  `frontend/scripts/admin-promotion-local-e2e.mjs` (guarded real local journal/resume).
- Modified frontend package test command, AdminShell link, existing Admin navigation
  assertion (retains all previous links), additive current handoff and this report.

## Actual verification

| Check / command from frontend | Actual result |
|---|---|
| Baseline `pnpm test` | **242/242 PASS** |
| Final `pnpm test` | **256/256 PASS**;14 new,all242 retained |
| `pnpm exec tsc --noEmit` | **PASS**; production build also typechecks final source |
| `pnpm lint`; final focused eslint | **PASS**,0errors;12 pre-existing ignored historical QA-script warnings |
| `pnpm build` | **PASS**,all four routes generated |
| Selected existing Admin Movie/Configuration/Showtime/Staff/Concession + Customer Promotion suites | **69/69 PASS** |
| Final `pnpm exec playwright test admin-promotions.spec.ts` | **16/16 PASS**,16.3s |
| `node scripts/admin-promotion-local-e2e.mjs`, then `--resume --polish` | **9/9 real browser groups PASS**,all five APIs,zero interception/mock |
| `.\scripts\local-dev.ps1`, `-Action Status` from root | Real Spring8080/Next3000/proxy PASS; installed/sourceV16,pending0/failed0/checksums valid |

Selected browser coverage is **85 distinct cases**: the combined83-case run passed
before final date-format polish (69existing+14new); the affected new suite then passed
16/16 on final source. Retries0,skips0. Full Playwright/backend suites NOT RUN;
historical backend counts are not claimed as current execution.

Real synthetic Promotion retained: **ID37**, `QAUI-20261027-047E1B95`, final ACTIVE,
FIXED_AMOUNT **12345.6789**. Actual writes: create201,edit200,disable200,enable200,
one explicit no-op edit200 verifying final Vietnamese-date round trip. No replay of
uncertain mutations. All **32 original Promotion DTOs unchanged**. No Booking,
Payment, Ticket, provider or financial outcome was created by this frontend test.
QA services stopped; database/test record retained. No operator privilege operation.

**33 responsive screenshots** (18initial+15final), visually inspected final tablet,
desktop/mobile forms/detail/list/dialog. Actual keyboard/focus/touch/font/overflow
checks at390/768/1440 PASS. Real normal ADMIN/anonymous UI tested; adverse status,
malformed response, rate-limit, lost result and forged hint cases are HTTP fixtures.

Evidence is ignored under `frontend/target/admin-promotion-frontend-2026-10-27/`:
`stitch-reference.json`, `unit-polish.log`, `typecheck-complete.log`, `lint-final.log`,
`lint-last-change.log`, `build-final-release.log`, `playwright-regression.log`,
`playwright-complete.log`, `real-browser.log`, `real-polish.log`, `real/journal.json`,
`real/*-final-*.png`, `database-final.log`, `preservation.json`.

## Defects fixed and limitations

- ES2017 target requires BigInt constructor rather than bigint literal.
- Native datetime controls rejected microseconds and rendered US dates/AM-PM despite
  locale. Replaced with strict Vietnamese text input and lossless unchanged-value reuse.
- First invalid field now receives focus in visual order; type changes clear obsolete
  percentage/cap errors. Recovery acknowledgment precedes refetch; invalid route IDs fail safely.
- Concurrent dev/build produced a corrupt generated `.next/dev/types` file. Stopped
  owned services, reversibly archived four generated cache files and rebuilt serially;
  no source/config workaround. Earlier failed build/test logs remain, no retry masking.
- No optimistic version/idempotency or server filtering exists; last-writer semantics
  and review after uncertain writes remain documented contract limitations. Storage-denied
  reload hints and physical assistive-technology testing remain limitations.

## Convention Compliance / scope reconciliation

PASS: kebab-case TypeScript/docs, PascalCase components, async Next16 params, aliases,
existing feature/shared boundaries, exact plural API routes/statuses, Vietnamese copy,
Nocturne tokens and dated report. No invented IDs, business workflows or new dependencies.
Backend/migrations/contracts/environment/Stitch files, incoming work, Git index and
HEAD preserved; no commit/push/deployment. Current task makes no database configuration
or permission changes. Next task requires separate authorization; stop after reporting.
