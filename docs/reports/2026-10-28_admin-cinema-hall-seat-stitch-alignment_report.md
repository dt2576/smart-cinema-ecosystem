# ADMIN Cinema / Hall / Seat Stitch alignment

## 1. Task Information

Date: 2026-10-28, Asia/Saigon. Frontend visual implementation, ADMIN scope only.
**Functional: PASS. Visual: PASS for the contract-compatible reference adaptation.**
No claim of pixel identity or completion of other application modules.

## 2. Requested Work

Replace the large Seat cards with the actual Stitch row-map/inspector composition;
align Cinema/Hall navigation, surfaces and forms while retaining real functionality.
Run normal `pnpm dev` against PRIMARY Neon, verify and stop for user review.

## 3. Documents Reviewed and Live References

Read root/frontend AGENTS, canonical development/frontend workflows, applicable
rules, [conventions](../development/project-conventions.md), current handoff,
SRS v1.2, BRD v1.2, Project Scope Cinema management, existing configuration contract,
Stitch assessment, `.stitch/DESIGN.md` and installed Next.js CSS documentation.

Stitch MCP `list_projects`, `get_project`, `list_screens`, `get_screen` and
`download_file` verified **Smart Cinema Ecosystem, `1208499799798658711`**.
Downloaded actual HTML and screenshot bytes; rendered HTML in Edge because
downloaded previews contained blank content areas. No Stitch edits.

| Reference | Current screen ID | Frontend mapping |
|---|---|---|
| Quản lý rạp | `9eca84f2fdaf4cf69b1e68dc9180270c` | `/admin/cinemas/[cinemaId]/halls`: overview, counts, Hall rows and actions |
| Sơ đồ ghế | `c3f01a57af1342789159f2b26b83b69c` | `/admin/halls/[hallId]/seats`: curved screen, row map, type colors, inspector |
| Reused shell/row/form language from both | Same two verified IDs | `/admin/cinemas`, `/admin/cinemas/new`, `/admin/cinemas/[cinemaId]/edit`, `/admin/cinemas/[cinemaId]/halls/new`, `/admin/halls/[hallId]/edit` |

No separate Cinema list/create/edit or Hall form export was found in the retrieved
inventory. These five routes are explicitly shared-reference adaptations, not
claimed one-to-one dedicated Stitch screens. Mobile/tablet adapt desktop references.

## 4. Requirements Traceability

| Source | Requirement | Result |
|---|---|---|
| SRS v1.2 §3.1 | FR-AUTH-007 | PASS: existing authoritative ADMIN identity gate unchanged |
| SRS v1.2 §3.3 | FR-CINEMA-003–009 | PASS: existing fields, hierarchy, capacity and statuses preserved |
| SRS v1.2 §3.5 | FR-SEAT-002/003/017 | PASS: physical state/type controls and protected structure preserved |
| BRD v1.2 | BR-008–011 | PASS: Cinema/Hall/Seat administration retained |
| [Configuration contract v1.0](../api/admin-cinema-configuration-contract-v1.0.md) §§2–6 | Exact APIs, whole COUPLE units, immutable references | PASS: API adapter/types unchanged |

No new UC/business-rule identifiers or backend behavior introduced.

## 5. Implementation Summary

Scoped sidebar/header closely follows Stitch surfaces and typography, retaining
all existing ADMIN destinations. Other modules continue using the original shell.
Hall overview and list rows replace generic stacked cards; duplicate titles removed.
Forms retain native constraints, Vietnamese validation, disabled and saved feedback.

Seat map groups actual row labels in API order, with amber VIP, pink whole COUPLE,
maintenance/inactive markers and a desktop inspector. No synthesized aisles,
coordinates, price, preset/reset, bulk-save or invented maintenance rule.
Labels such as `1,10,2` retain backend ordering. COUPLE remains one two-guest unit.
`structureEditable`, server errors, explicit writes and capacity checks are retained.
Arrow/Home/End navigation, visible focus, mobile dialog focus/escape/restore,
loading skeleton, empty/error states and local horizontal map scrolling are present.

## 6. Files Created

Under `frontend/src/features/admin/`: `admin-configuration-shell.tsx`,
`admin-configuration-ui.tsx`, `admin-configuration-feedback.tsx`,
`admin-configuration.module.css`, `admin-seat-management.tsx`; this dated report.

## 7. Files Modified

`admin-configuration-screen.tsx`, `admin-shell.tsx`,
`frontend/test/e2e/admin-configuration.spec.ts`, additive current handoff.
No backend/API/types, dependency, global theme, route or environment changes.

## 8. Verification

| Actual command/check | Result |
|---|---|
| Baseline `pnpm test`; `pnpm exec tsc --noEmit` | 306/306 PASS; typecheck PASS |
| Final `pnpm exec tsc --noEmit` | PASS |
| `pnpm lint` | PASS: 0 errors, 12 existing warnings in historical ignored audit scripts |
| Final `pnpm test` | **306/306 PASS**, no skips/failures |
| `pnpm build` | PASS, 35 static pages generated |
| Selected Edge regression | **166/166 PASS** on final source, one complete run, 0 failures/skips/retries; earlier complete run also 166/166 PASS |
| Real PRIMARY browser smoke | **9/9 groups PASS**, 21 route/viewport checks, 0 browser errors, 0 ADMIN mutation attempts |
| Visual review | **PASS**: 3 comparison pairs plus 21 real screenshots at 390/768/1440px; no page overflow/header overlap |

Selected regression command (existing configuration, no retries):

```powershell
$env:PLAYWRIGHT_CHANNEL='msedge'
pnpm exec playwright test 'admin-|manager-operations|manager-staff|shared-ui-foundation|customer-final-qa' --reporter=line
```

Six new cases cover dense responsive maps at three widths, opaque labels/whole
units/keyboard, mobile dialog focus and single-flight server-authoritative writes.
All 160 selected baseline cases remain. Writes/conflicts use clearly labeled HTTP
fixtures, not Neon. Full unrelated browser suites and backend Maven: NOT RUN.

Actual root `pnpm dev` reached PRIMARY **V18/V18**, zero pending/failed, 18 valid
checksums; migration skipped. Spring, Next and matching API proxy READY.
Process-only flags disabled expired-Hold cleanup, invitation delivery and VNPAY.
Real ADMIN login, identity, Cinema/Hall/Seat GETs, all seven routes, native required
validation, reload, mobile navigation and logout 204 verified. Existing Neon demo
records were read as stored; no seed or business-data writes performed. Catalog
responses matched before/after. Normal auth session metadata is separate.

Evidence is ignored local QA output under `frontend/target/admin-cinema-stitch-2026-10-28/`:
[comparison](../../frontend/target/admin-cinema-stitch-2026-10-28/comparison.html),
[comparison PNG](../../frontend/target/admin-cinema-stitch-2026-10-28/comparison.png),
[real evidence](../../frontend/target/admin-cinema-stitch-2026-10-28/real-primary-evidence.json),
`real-*.png`, `fixture-seat-*.png`, `review-*.png` and command logs.

## 9. Requirement Reconciliation

PASS for scoped visual alignment and functional preservation. Financial state,
Booking/Payment/Ticket logic, API/RBAC rules, migrations and Stitch unchanged.
No new backend capabilities or unrelated module redesign.

## 10. Deviations / Conflicts

Contract authority overrides prototype claims about auto sale eligibility,
maintenance restrictions, prices and per-position COUPLE controls. Existing ADMIN
navigation replaces prototype Manager-only links. Counts/content use real data.
Local SVGs replace externally loaded Material Symbols; no new dependency.
Existing convention conflicts were left untouched; no approved exception needed.

## Convention Compliance

PASS: kebab-case files and dated report; PascalCase React/camelCase handlers;
existing routes, alias imports, Vietnamese UI, semantic Nocturne tokens and fonts.
The scoped pink token comes directly from Stitch `tertiary_container`.
API/database naming changes: NOT APPLICABLE. Historical documents preserved.
Final scope, UTF-8, local links, whitespace, migration hashes and HEAD/index checked.
Scope: 4 original files modified, 6 new files; 958/962 original files byte-identical.
All backend files and 18 historical migrations unchanged. Owned QA services stopped;
ports 3000/3100/8080 verified free. Private auth input absent.

## 11. Known Limitations

Visual PASS is a reviewed structural/design adaptation, not a pixel-diff score.
Different real data, whole COUPLE units and opaque label ordering necessarily
differ from the 160-position demo. Dedicated mobile/form designs were not present.
Physical coordinates/aisles cannot be reconstructed from this API.
Desktop seat targets are 36px; mobile/coarse-pointer targets are at least 44px.

Two initial real-QA runs exposed harness issues (access-gate timing and an incorrect
logout-response URL), corrected before the successful full run; no frontend defect
was hidden. The earliest harness cleanup did not verify revocation of its normal
test login session. No manual database cleanup attempted. Later UI logouts returned
204; private auth input was deleted. No credentials/token payload in report evidence.
No real create/update was attempted on Neon under this read-only business-data scope.

## 12. Next Recommended Step

User review of this Cinema/Hall/Seat module and comparison evidence. Other modules
remain deferred. No commit, push, deployment or automatic continuation.
