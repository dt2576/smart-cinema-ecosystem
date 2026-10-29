# ADMIN Cinema / Hall / Seat visual polish

## 1. Task and outcome

2026-10-28, Asia/Saigon. Frontend-only follow-up to the
[alignment report](2026-10-28_admin-cinema-hall-seat-stitch-alignment_report.md).
Implemented typography, proportions, responsive polish and display-only Seat order.
**Functional PASS; visual PASS for the documented reference adaptation.**
This is not a pixel-perfect certification.

## 2. References and preparation

Read canonical workflow/conventions, frontend instructions/rules, current handoff,
existing report, `.stitch/DESIGN.md`, installed Next.js font guide and
[configuration contract](../api/admin-cinema-configuration-contract-v1.0.md).
MCP `get_project`, `get_screen`, `download_file` retrieved current theme, actual
HTML and screenshot bytes from project `1208499799798658711`:

- Hall: `9eca84f2fdaf4cf69b1e68dc9180270c` — Quản lý rạp.
- Seat: `c3f01a57af1342789159f2b26b83b69c` — Sơ đồ ghế.

Uncommitted first-iteration work was the baseline and is preserved. No changes to
Stitch, root font loader, global theme, other modules, API/backend or migrations.

## 3. Typography before / after

Stitch specifies **Space Grotesk** for headings/labels and **Plus Jakarta Sans**
for body/input content. Both were already loading through self-hosted `next/font`;
this was an application-of-type-scale issue, not a missing-font installation.

| Element | Before | After, browser computed |
|---|---|---|
| Hall/page heading | Space 32/40, 700 | Space 36/44, 700, −.02em |
| Seat heading | Space 32/40, 700 | Space 28/36, 600, −.025em; matches actual export |
| Sidebar | Space 14, normal line-height/tracking | Space 14/20, 600, .02em |
| Breadcrumb | Jakarta 12/18, 400 | Space 12/16, 600, .04em |
| Form label | Jakarta 13/19.5, 600 | Space 14/20, 600, .02em |
| Input | Jakarta 13/19.5 | Jakarta 15/22, 400 |
| Action | Space 14/20, no tracking | Space 14/20, 600, .02em |
| Seat label | Space 11, normal line-height | Space 10/16, 600, .02em |
| Inspector Seat identity | Space 30, normal line-height | Space 36/44, 700 |

Sizes/line-heights are px. Mobile headings use 26/34. Body metadata uses Jakarta
13/18; the scoped body baseline is 15/22. Form pages reuse theme tokens; no separate
form export is claimed. No tables were introduced into the existing list workspace.

Verified `document.fonts.ready`, loaded faces, `document.fonts.check` with Vietnamese
text, computed styles and CDP **CSS.getPlatformFontsForNode**. All sampled rendered
glyphs in the 28 final views used custom fonts; none used a system fallback.
CDP names the Space variable face internally “Space Grotesk Light” on both the
Stitch export and frontend; the CSS family remains Space Grotesk.

## 4. Layout refinements and defect fixed

Sidebar 248→288px and header 72→64px now match reference proportions. Explicit
navigation spacing, icon sizes, breadcrumb scale, compact Hall rows, status and
summary hierarchy replace inherited defaults. Forms use a 720px maximum width,
48px fields, 24px field rhythm and a separated right-aligned action area.
Seat map uses denser 32px desktop units, consistent row labels, a polished 320px
inspector and sticky row labels during local horizontal scrolling. Touch/coarse
pointer targets remain ≥44px. Existing keyboard/focus/dialog behavior retained.

Visual review caught a **768px banner defect** despite passing overflow assertions:
nonshrinking statistics squeezed the title into a narrow column. Fixed by making
the title section a full row at tablet widths; added a heading-width/height
regression, then recaptured all final screens. No known blocking visual issue remains.

## 5. Seat ordering and compatibility

The API returns string order (`1,10,2…`). New pure `orderSeatRowForDisplay` sorts a
copied row only when all labels are distinct, nonoverlapping numeric integers or
ascending ranges. BigInt parses labels exactly; IDs are never coerced.
Opaque/alphanumeric/mixed, equivalent (`01`/`1`), overlapping or descending labels
preserve the entire original row order. Row membership/order, objects, types,
range labels and whole COUPLE units stay intact. No coordinates/aisles inferred.

Real Neon row A displays **1,2,3,4,5,6,7,8,9,10**, while raw API responses remain
unchanged. Keyboard order follows display order; fixture save verifies the original
Seat ID and payload. This user-approved presentation change does not alter the
contract's server ordering or backend data.

## 6. Actual verification

| Check | Result |
|---|---|
| Baseline unit tests | 306/306 PASS |
| Final unit tests | **309/309 PASS**, 3 new ordering cases, no skips/failures |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm lint` | PASS, 0 errors; 12 unchanged historical audit-script warnings |
| `pnpm build` | PASS |
| Selected Edge regression | **169/169 PASS** in one final complete run, 0 failures/skips/retries; earlier run 168/168 PASS |
| Real PRIMARY browser/font QA | **28/28 final route/viewport captures**, 7 before; 0 browser errors, 0 ADMIN writes, catalog unchanged, logout 204 |

Existing configuration; full selected command:

```powershell
$env:PLAYWRIGHT_CHANNEL='msedge'
pnpm exec playwright test 'admin-|manager-operations|manager-staff|shared-ui-foundation|customer-final-qa' --reporter=line
```

Three new browser cases cover numeric ordering/identity, actual loaded/rendered
fonts and tablet banner width. Existing 166 cases retained. Mutation tests are HTTP
fixtures. Real checks used normal `pnpm dev`, PRIMARY Neon **V18/V18**, 18 valid
checksums, zero pending/failed; migrations skipped. Normal existing ADMIN login and
authenticated GETs only; no business mutations, seeding or privileged operations.
Hold cleanup, SMTP delivery and VNPAY were disabled only in the QA process environment.
Two normal QA login/logout cycles returned 200/204; private credential input removed.
Unrelated full browser suites/backend Maven NOT RUN for this frontend-only scope.

## 7. Evidence and scope

Ignored local evidence: `frontend/target/admin-cinema-polish-2026-10-28/`.
[1440px before/reference/after](../../frontend/target/admin-cinema-polish-2026-10-28/comparison-1440.html),
[comparison PNG](../../frontend/target/admin-cinema-polish-2026-10-28/comparison-1440.png),
[1280px comparison](../../frontend/target/admin-cinema-polish-2026-10-28/comparison-1280.html),
[font and real API evidence](../../frontend/target/admin-cinema-polish-2026-10-28/font-and-real-qa.json).
Reviewed final screenshots at 390/768/1280/1440 and responsive contact sheets.

Polish delta: `admin-configuration.module.css`, `admin-seat-management.tsx`,
`admin-configuration.test.ts`, `test/e2e/admin-configuration.spec.ts`;
new `admin-seat-presentation.ts`, this report and additive handoff.
No application route, dependency, root font loader, financial/business validation,
API, backend, environment configuration or historical migration edited.

## 8. Requirement reconciliation and Convention Compliance

PASS: SRS v1.2 FR-AUTH-007, FR-CINEMA-003–009, FR-SEAT-002/003/017; BRD v1.2
BR-008–011 remain preservation constraints. No new requirement/UC ID invented.
Canonical conventions checked: existing feature location, kebab-case/PascalCase,
alias imports, domain terms, Vietnamese UI, scoped Nocturne tokens and dated report.
API/database naming changes: NOT APPLICABLE. No convention exception.
Historical report and unrelated/uncommitted work preserved; no stage/commit/push.
Final scope/UTF-8/whitespace/local-link audit PASS: 5 existing files changed,
2 new files; 963/968 baseline files byte-identical. Backend, 18 migrations,
root fonts/global theme and HEAD/index unchanged. Owned QA services stopped;
ports 3000/3100/8080 free, private auth input absent.

Remaining differences: real backend data and supported actions differ from the
Stitch demo; no fake aisles, prices or per-position split COUPLE controls. Visual
review is evidence of closer fidelity, not a pixel-diff score. Next step is user
review of this polish iteration. **Stop; no next module or deployment.**
