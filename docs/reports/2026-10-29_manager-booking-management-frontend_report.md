# MANAGER Booking Management frontend

## 1. Task Information

- Date: 2026-10-29, Asia/Saigon.
- Type: frontend implementation; read-only, cinema-scoped Booking view.
- FUNCTIONAL: **BLOCKED for authenticated PRIMARY Neon positive-path verification**;
  implementation and fixture-backed functional verification completed. No suitable
  existing MANAGER account is available; none was created or promoted.
- VISUAL: **PASS for contract-compatible reproduction**, including responsive
  adaptation. This is not a measured 100% pixel match or proof using real Manager data.

## 2. Requested Work and Documents Reviewed

Read canonical Development/Frontend/Stitch workflows, all applicable rules, root
and frontend AGENTS, project conventions, `.stitch/DESIGN.md`, current handoff,
BRD v1.2, SRS v1.2 and existing Manager implementation/verification reports.
The [Booking API contract](../api/manager-booking-management-contract-v1.0.md),
actual controller/query/DTO/repository and V10 Ticket states govern behavior.
Installed Next.js guides for layouts/pages, client components and fonts were read.
Existing Manager scope/auth/navigation, shared UI, request hook and local PRIMARY
startup workflow were inspected. Baseline working tree was clean.

## 3. Stitch References

Project `1208499799798658711`, **Smart Cinema Ecosystem**, retrieved through live
Stitch MCP. Project updateTime: `2026-10-29T02:52:07.634663Z`.
Current inventory has one matching screen for each requested Manager Booking view;
the actual HTML contains the latest simplified composition, not the earlier audit
boards. No ambiguous alternate current Booking design was selected.

| Approved current screen | Stitch ID | Production route |
|---|---|---|
| Quản lý đặt vé | `413b4b3b6d744731933b6ab325dead8a` | `/manager/bookings` |
| Chi tiết đơn đặt vé | `a6990e8019604febaecb035f3ed34b06` | `/manager/bookings/[bookingId]` |

Both current `get_screen` results expose HTML and image exports. Canvas instances
are 1280px desktop; metadata image dimensions differ. Downloaded JPEGs are
1600×1280: List preview contains only the shell; Detail preview omits its title
region. Therefore these cached previews alone were not treated as a complete
reference. The exact current HTML for each ID was downloaded and independently
rendered in Edge at matching widths; no designs were edited or generated.
Only HTML with its actual design content was used for implementation decisions.

Reference files and metadata are in ignored
`frontend/target/manager-booking-2026-10-29/stitch/`.
Original exports were retained; `reference-*.png` captures are labeled HTML renders.
Export authentication remained private, with no key or token written into source.

## 4. Requirements Traceability

| Existing authority | Implementation / preservation | Result |
|---|---|---|
| SRS v1.2 §6.3 Booking View; BRD v1.2 Cinema Manager actor scope | Manager list/detail in assigned Cinema context | Automated PASS; authenticated live check BLOCKED |
| FR-AUTH-007/008; BRD BR-003 | Existing backend role/scope gate, scoped reads and safe denials | PASS with HTTP fixtures and real anonymous denials |
| FR-BOOKING-004; BR-029/030 | Exact backend Booking states and original expiry; no local lifecycle transition | PASS |
| FR-BOOKING-005/006/010/014; BR-031 | Exact string amounts, Seat/Concession snapshots and original timing retained | PASS |
| Existing API contract v1.0; BR-047/066 preservation | Minimal Ticket/Payment projection; no check-in, financial mutation or QR disclosure | PASS |
| Current task's strict visual requirement | Actual current Stitch exports, loaded fonts and screenshot correction loop | PASS with documented adaptations |

No requirement ID, financial outcome, role or backend capability was invented.
Historical requirements/contracts were not changed.

## 5. Implementation Summary

- List: exact Booking-code or explicit bigint ID search; Booking/latest-Payment
  states, assigned Cinema, Showtime ID, creation dates and size filters; stable
  server pagination. Extra filters expand from the compact toolbar. URL filters
  survive reload/back/forward; invalid or repeated filters fail before Booking GET.
- Creation-day presets/custom dates use Vietnam time, submitted as half-open UTC
  instants. Direct explicit-offset filter instants retain microsecond comparison.
- Detail: Movie/Cinema/Hall/Showtime, whole Seat Units and prices, Concession
  snapshots, authoritative amount breakdown, each Payment attempt and actual
  Ticket rows/statuses. Secondary financial/timestamp details expand on demand.
- Bigint IDs and numeric(19,4) amounts remain strings; monetary presentation uses
  string grouping without Number conversion or rounding. Unknown Payment currency
  is not replaced with an invented currency.
- Two existing GET operations only. Bearer auth, no-store and abort signals reuse
  existing request infrastructure. No cancellation/refund/confirmation/issuance,
  mutations, frontend QR, provider references or Customer PII.
- Existing ManagerShell verifies assigned Cinemas on route/token changes. Only
  Booking routes adopt the scoped Stitch shell; other Manager layouts remain.
  Existing navigation gains a Booking link and canonical login-resume paths.
  Stored roles do not establish authorization.
- Loading, empty, 400/401/403/404/409/429/503, network and malformed-response states
  are safe. Manual recheck performs GET only. Aborted/stale reads cannot replace
  the current request; prior details are hidden during failed rechecks.
- Payment SUCCESS never changes Booking state or fabricates Ticket issuance.
  All four real Ticket states are supported, including independent check-in state.

## 6. Files Created

Under `frontend/src/features/manager/`:

- `manager-booking-api.ts`, `manager-booking.types.ts`, `manager-booking-service.ts`.
- `manager-booking-list.tsx`, `manager-booking-detail.tsx`.
- `manager-booking-shell.tsx`, `manager-booking-ui.tsx`, `manager-booking.module.css`.
- `manager-booking.test.ts` (10 unit cases).

Other new files:

- `frontend/src/app/manager/bookings/page.tsx`.
- `frontend/src/app/manager/bookings/[bookingId]/page.tsx`.
- `frontend/test/e2e/manager-booking.spec.ts` (30 browser cases).
- `frontend/test/fixtures/manager-booking.mjs`, `manager-booking-browser.mjs`.
- `frontend/public/icons/manager-booking-symbols.woff2` and its Apache license
  `manager-booking-symbols-license.txt`: small self-hosted Material Symbols subset
  matching reference iconography, not a new dependency.
- This report. Generated comparison scripts/images/logs remain ignored in target.

## 7. Files Modified

- `frontend/src/features/manager/manager-shell.tsx`: Booking entry and scoped shell.
- `frontend/src/features/manager/manager-navigation.ts`: safe Booking return paths.
- `frontend/package.json`: register new unit test; dependencies unchanged.
- `docs/ai/current-handoff.md`: additive completion/limitation entry.

## 8. Verification

| Check | Actual result |
|---|---|
| Baseline `pnpm test` | **309/309 PASS**, no skipped cases |
| Final `pnpm test` | **319/319 PASS**, including 10 new cases; zero skips/failures |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm lint` | PASS: zero errors; 12 pre-existing warnings in ignored historical QA scripts |
| `pnpm build` | PASS; both real Manager Booking routes included |
| New Booking Playwright suite | **30/30 PASS** before final badge adjustment; all included in final regression below |
| Badge affected test after correction | **1/1 PASS** |
| Complete selected Edge regression | **199/199 PASS** in one final run (3.3m), including all 30 new cases; zero failures/skips/retries |
| Real PRIMARY HTTP/browser checks | **9/9 PASS**, no response mocks or authentication fabrication |
| Authenticated real MANAGER positive path | **BLOCKED / NOT RUN** |

Final selected regression command, from `frontend/`:

```powershell
$env:PLAYWRIGHT_CHANNEL='msedge'
pnpm exec playwright test 'admin-|manager-|shared-ui-foundation|customer-final-qa' --reporter=line
```

All existing selected cases were retained. Initial Booking run: 22 PASS/2 FAIL
because select labels included option text; explicit accessible names fixed the
production controls, then 24/24 passed. Six further cases brought the suite to
30/30. First combined run: 198 PASS/1 FAIL after icon polish made the exact badge
text share a node with icon ligatures. Label and decorative icon were separated;
assertions were retained. The affected case passed before the final combined run.
No retry configuration, skipped tests, weakened assertions or test removal.

Coverage includes query parameters, pagination, history navigation, reload/direct
entry, login resume, revoked/wrong-role scope, stale/network/malformed/mismatched
responses, empty results, replacement/reconciliation, SUCCESS with PENDING Booking
and no Tickets, whole COUPLE units, independent Ticket state, separate tabs, long
Vietnamese text, exact fractional amounts, keyboard focus and responsive menus.
All positive Booking/auth responses in these browser cases are **labeled fixtures**;
their tokens never establish real Neon identities or financial outcomes.

### Real PRIMARY execution

Root `pnpm dev` was executed using the configured PRIMARY Neon connection, not
local PostgreSQL. Installed/source **V18/V18**, pending0/failed0, applied checksums
valid. Migration skipped, Spring Boot and Next.js started and health monitor
reported backend/frontend/API proxy READY. No operator/migration privileges used.

For non-mutating QA, expired-Hold cleanup, invitation delivery and VNPAY were
disabled through process-only environment flags. No environment file or merchant
configuration was changed. No business writes were sent to Neon.

Real checks: matching backend/proxy genres response; six anonymous Manager GETs
returning401 through ports8080/3000; two real browser direct entries with canonical
login links. Separate enforced READ ONLY JDBC probe confirmed **0 ACTIVE MANAGER
and 0 effectively assigned MANAGER**, actual scope denial and Flyway18:0. It used
real tables, not persisted fixtures. Therefore no real authenticated Manager200,
positive Booking list/detail or live revocation claim is made.

QA services were stopped after verification. HTTP shutdown checks confirmed no
listener responding on ports3000/8080/3100; no development process was left running.

### Visual and accessibility evidence

Both screens captured at **1440, 1280, 768 and 390px**, Edge, 100% zoom, 1024px
viewport height. Comparisons use current reference HTML rendered at those same
widths. Implementation screenshots are the actual running Next.js UI with isolated
HTTP fixtures, not real Manager data. Actual `pnpm dev` connectivity is separate.

| Metric at 1280/1440px | Stitch HTML | Implemented |
|---|---|---|
| Sidebar | 288px | 288px |
| Header | 64px | 64px |
| H1 left edge | 312px | 312px |
| List H1 | 28px/36px,600,-0.7px | Same |
| Detail H1 | 28px/36px,700,-0.7px | Same |
| Heading color | rgb(223,226,238) | Same |

Self-hosted Space Grotesk and Plus Jakarta Sans were verified through computed
styles **and CDP platform-font glyph evidence**, including sampled Vietnamese
headings, navigation and inputs. No sampled system-font glyph fallback. Existing
root font loading and global tokens were preserved; controls use reference
15px/22px body typography, compact labels, 8px controls and 12px panels.

Corrections driven by actual screenshots: header height68→64; table row density
and column proportions; green summary icon; compact toolbar; intact Booking code,
status and money at1280; preserved 8/4 detail proportions; duplicate price text
removed; overlong Payment/Ticket panels compacted without removing their data;
tablet table given readable width with local keyboard scrolling rather than
squeezed columns. No document overflow in eight final route/width captures;
tablet ArrowRight scroll verified. Mobile menu uses the shared accessible Dialog,
including Escape/focus restoration. Native buttons/forms, visible focus, loading
and disabled feedback, reduced-motion rules and 44px action targets preserved.

Evidence under `frontend/target/manager-booking-2026-10-29/`:

- [1440px side-by-side](../../frontend/target/manager-booking-2026-10-29/accepted-comparison-1440.png)
  and [1280px side-by-side](../../frontend/target/manager-booking-2026-10-29/accepted-comparison-1280.png).
- `before-*.png`, `after-*.png`, `accepted-{list,detail}-{width}.png` and
  `reference-{list,detail}-{width}.png` retain the correction sequence.
- `accepted-visual.json`, `geometry.json`, `real-http.json`,
  `real-anonymous-detail.png`, `primary-readonly-probe.log`.
- `baseline-unit.log`, `unit-final.log`, `tsc-complete.log`, `lint-complete.log`,
  `build-complete.log`, `playwright-affected.log`, `playwright-verified.log`,
  `startup-final.log` and scope hashes. Artifacts are ignored, local evidence.

## 9. Requirement Reconciliation

PASS for frontend read-only implementation, authority/precision/minimization,
supported search/filters/pagination and scope-safe failures. Automated functional
coverage PASS; real authenticated positive interoperability remains BLOCKED.
Visual PASS applies to the reproducible composition and declared contract-compatible
adaptations, not an unmeasured literal 100% image identity.

## 10. Deviations / Conflicts

| Stitch content not supplied/supported by contract | Truthful adaptation |
|---|---|
| Global today/paid/pending KPI aggregates | Same three cards; scoped result total and explicitly page-local status counts |
| List Seat labels; Movie poster/rating/genre/duration/language/end time/Hall format | List uses returned Unit count; Detail preserves poster footprint with labeled neutral placeholder; unsupported facts omitted |
| App channel, generic confirmed badge, notification center, fake operator ID, active-Cinema Hall totals | Omitted; returned Payment state/current assigned context and existing logout used |
| Separate extra Cinema navigation destination | Existing real Manager destinations retained; no invented route or duplicated unsupported destination |
| Ticket bearer code, blanket valid/issued promise | Actual Ticket ID and each backend status/count only; no QR/admission promise |
| Tiny prototype targets and broken fixed desktop shell at mobile widths | 44px controls, shared mobile dialog, stacked cards/columns and local tablet table scroll |

Payment history and detailed timestamps use disclosure sections to satisfy the
real contract without reintroducing audit boards. Cached Stitch image omissions,
different truthful data lengths, neutral poster, Vietnamese navigation, browser
rasterization and development indicator preclude a literal pixel-perfect claim.
No arbitrary backend field, price, asset association or product workflow invented.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md).

| Area | Result | Evidence |
|---|---|---|
| Folders/files/components | PASS | Existing Manager feature; kebab-case modules, PascalCase React components, framework page.tsx |
| Routes/imports/statuses | PASS | Plural `/manager/bookings/[bookingId]`, existing alias, exact serialized enums |
| API/business terminology | PASS | Existing two resource GETs; no contract edits or new business rules |
| Documentation/report | PASS | Requested dated report path, real requirement IDs, preserved historical docs |
| Database/migrations | NOT APPLICABLE to changes | No DDL, role/owner/grant change, migration or data write |
| Scope/preservation | PASS | Backend, API, existing frontend modules, global tokens/fonts, dependencies and Git index preserved; scope/hash/link checks recorded in target |

No convention exception requested or introduced. Reports/evidence distinguish
fixtures, actual requests, verified fonts, adaptations and external limitations.
Final file-hash comparison: **985 original tracked files, 981 unchanged**, only
the four listed original files modified; 17 new files. All backend/migration
originals, HEAD and index unchanged. Strict UTF-8/whitespace checks and **111 local
documentation links** passed; `git diff --check` passed. No staging or commit.

## 11. Known Limitations

Authenticated PRIMARY Manager positive verification is blocked solely by the
absence of a suitable approved existing account. No fabricated identity/Booking,
account promotion, permission or business-data change was used to manufacture proof.
Dedicated mobile Stitch variants were not present for these two screens; responsive
adaptations were tested, not claimed as separately approved mobile exports.

## 12. Next Recommended Step

When a suitable existing authorized Manager is separately available, run positive
read-only PRIMARY list/detail/search/pagination checks. Do not create accounts or
start another module automatically. No commit, push or deployment. Report and STOP.
