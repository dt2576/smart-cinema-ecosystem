# ADMIN Concession Management frontend

## 1. Task Information

Date: **2026-10-27**, Asia/Saigon. Final decision: **PASS** for the requested frontend and real local integration scope. Four screens and all five verified backend APIs are integrated. No backend/migration change, new dependency, commit or deployment.

## 2. Requested Work / Context

Implement a simple, readable Vietnamese workspace using existing Nocturne/AdminShell and current Stitch references. Read AGENTS, Development/Frontend workflows, convention/coding/UI/traceability/document rules, current handoff, relevant SRS/Use Cases, existing Movie/Cinema/Hall/Showtime/Staff patterns, installed Next16 client/dynamic-route documentation, [contract v1.0](../api/admin-concession-management-contract-v1.0.md), [verified backend report](2026-10-27_admin-concession-backend-verification_report.md) and [.stitch/DESIGN.md](../../.stitch/DESIGN.md).

## 3. Requirements and Stitch Traceability

| Requirement/reference | Result |
|---|---|
| SRS v1.2 FR-CONCESSION-001–006; System Analysis UC-ADM-010–013 | List/create/detail/content edit/status; three categories, exact amounts and active catalog compatibility |
| BRD BR-002/004; SRS FR-AUTH-007/008 | Existing server-verified ADMIN shell and session/error handling; no authorization inferred from saved role |
| BRD BR-065–067; SRS SR-CONCESSION-01–04 | Customer code and purchased snapshots/freeze unchanged; real public inclusion/exclusion verified |
| User simplicity/accessibility requirements | Essential fields/actions only; natural Vietnamese, responsive cards/table, visible keyboard focus, labelled controls/dialogs and contextual feedback |
| Stitch List `849d5f08b7e54d56a59a8f0152b41133` | List spacing, dark surfaces, orange primary action adapted |
| Stitch Create `d5e4ffdc8faa4059825865bff9c4845c` | Simple card form adapted; no preview/compliance/statistics board |
| Stitch Edit `5d4cbea69e224a5d8de48dbdb4756792` | Prefilled content form; ordinary edit excludes status/image/ID fields |
| Stitch Detail `c67f51f62d9b4a538e7279968a226385` | Essential details and two contextual status dialogs adapted |

All four current screens were retrieved through read-only Stitch MCP in project1208499799798658711; actual HTML and PNG exports inspected. No design edits/generation. Unsupported SKU/POS/inventory/VAT/analytics/metrics and prototype state boards were excluded. No requirement IDs or business rules invented.

## 4. Features Implemented

| Route | Purpose |
|---|---|
| `/admin/concession-items` | Quản lý bắp nước: name search, category filter, real list, Xem/Sửa/status actions, client pagination10 per page when needed |
| `/admin/concession-items/new` | Thêm sản phẩm: name/category/price/optional description/explicit initial selling status |
| `/admin/concession-items/[itemId]` | Chi tiết sản phẩm: essential fields, edit, stop/resume selling and back |
| `/admin/concession-items/[itemId]/edit` | Sửa sản phẩm: prefilled content fields, separate status workflow |

Added **Bắp nước** to existing Admin navigation. Reused Button, SurfaceCard, FormField, Dialog, Skeleton, StatusFeedback and existing fonts/tokens. No unrelated page redesign, image upload, deletion, stock, recipe, tax, reporting or new role/workflow.

All five APIs use the exact approved paths/methods. Search/filter/pagination run locally over the authoritative full-list response; no invented query parameters or endpoint. IDs stay canonical bigint strings. Prices remain decimal strings throughout: comma input normalizes to a dot, formatting groups digits and preserves every significant fractional digit; no JavaScript monetary Number conversion or rounding. Zero/fractional amounts and actual15-integer/4-fraction limits remain supported.

Status changes require the specified simple confirmation, disable repeated clicks, validate the write receipt, then read the actual item and refresh the visible list/detail. Creation navigates using a validated server-issued identity; edits never send status, image, ID or timestamps. Responses are typed/validated, including duplicate/mismatched IDs, exact amounts and UTC timestamps; unused extra fields are dropped.

## 5. Errors and Recovery

Safe Vietnamese messages cover400/401/403/404/409/429/5xx, network loss and malformed receipts without backend diagnostic text. Writes are explicit, synchronously locked, bounded and never automatically replayed; Retry-After is respected when supplied. Stale/unmounted read results are rejected through the existing read hook.

Per-tab storage holds only an untrusted review nonce/optional known product ID, never product status or PII. An interrupted/uncertain/conflicting write blocks further commands until an explicit authenticated GET and manual acknowledgement; known-item review shows server-read price/status and reloads form data after acknowledgement. SSR-safe storage subscription avoids hydration mismatch. No automatic write on mount, login, reload or recheck.

Unknown create outcome cannot be conclusively resolved by a list read because the backend has no idempotency/operation lookup and duplicate names are allowed. The UI asks for manual product review and does not guess IDs or auto-create again. If browser storage is unavailable, the current view retains its in-memory gate; recovery across reload is limited.

## 6. Files Created / Modified

Created under `frontend/src/features/admin/`: [service/types](../../frontend/src/features/admin/admin-concession-service.ts), [typed API](../../frontend/src/features/admin/admin-concession-api.ts), [command/review hook](../../frontend/src/features/admin/use-admin-concession-command.ts), [screens/form/dialogs](../../frontend/src/features/admin/admin-concession-screen.tsx), [12 unit cases](../../frontend/src/features/admin/admin-concession.test.ts).

Created four route page files under `frontend/src/app/admin/concession-items/`; [13 fixture browser cases](../../frontend/test/e2e/admin-concessions.spec.ts); [real local browser harness](../../frontend/scripts/admin-concession-local-e2e.mjs); this report. Modified [AdminShell](../../frontend/src/features/admin/admin-shell.tsx), frontend package test command, existing Admin navigation assertion and current handoff. Incoming unrelated staged work preserved.

## 7. Executed Checks and Results

| Actual command/check | Result |
|---|---|
| Baseline `pnpm test` |230/230 PASS,0 fail/skip |
| Final `pnpm exec tsc --noEmit` |PASS |
| Final `pnpm lint` |PASS,0 errors;12 unchanged warnings in historical ignored QA scripts |
| Final `pnpm test` |**242/242 PASS**:230 retained +12 new;0 failures/cancelled/skipped |
| `pnpm build` |PASS, four new routes in production output |
| `PLAYWRIGHT_CHANNEL=msedge pnpm exec playwright test admin-concessions.spec.ts` |**13/13 PASS**,13.5s, no retries/skips |
| Same runner: Admin movies/configuration/showtimes/staff + Customer Concession/entitlements specs |**75/75 PASS**,1.7m, six existing suites; updated navigation assertion retains prior links |
| Total selected fixture browser cases |**88/88 PASS** across two runs; full repository Playwright suite NOT RUN |
| `.\scripts\local-dev.ps1` |Real Spring/Next/proxy readiness PASS; installed/sourceV15, no pending migration or administrator load |
| `node scripts/admin-concession-local-e2e.mjs` |**7/7 real browser groups PASS**, all five endpoints, actual PostgreSQL, no intercepted APIs |
| Final read-only form polish check |PASS at390/768/1440; visible keyboard outline, feature controls≥44px, no page overflow;0 product writes |
| Post-integration local Status |V15/sourceV15, pending0/failed0, checksums and original-role snapshot valid |

Real browser used the existing approved synthetic ADMIN through actual login. It created exactly one product despite two rapid click events, edited its exact price, deactivated/reactivated it, checked reload/search/navigation/anonymous denial and verified public Customer catalog exclusion/inclusion. All pre-existing Admin catalog DTOs were compared before/after and remained identical.

Four actual successful product writes: POST201, content PUT200 and two status PUT200. Retained test product **ID36**, `QA Bắp nước 2026-10-27 c5a843b9`, final ACTIVE, price **65000.4321**. Normal login refresh-session records are expected; no other product or Booking/Payment/Ticket data was intentionally modified. No operator/SQL fixture connection used for this frontend task.

Evidence: [real journal](../../frontend/target/admin-concession-frontend-2026-10-27/real/journal.json), [real run log](../../frontend/target/admin-concession-frontend-2026-10-27/real-browser.log), [polish measurements](../../frontend/target/admin-concession-frontend-2026-10-27/real/polish-readonly.json), [mobile final form](../../frontend/target/admin-concession-frontend-2026-10-27/real/create-final-390.png), [desktop detail](../../frontend/target/admin-concession-frontend-2026-10-27/real/detail-1440.png), [new browser suite](../../frontend/target/admin-concession-frontend-2026-10-27/playwright-initial.log), [regression](../../frontend/target/admin-concession-frontend-2026-10-27/playwright-regression.log), [unit](../../frontend/target/admin-concession-frontend-2026-10-27/unit-final.log), [build](../../frontend/target/admin-concession-frontend-2026-10-27/build-final.log). Artifacts are ignored local evidence, not committed release artifacts.18 initial workflow screenshots plus3 final create-form captures; all four screens/dialogs checked at three widths using headless installed Edge, not physical devices.

## 8. Defects Found and Fixed

- New test imports/fixture parameter types initially failed production typecheck; switched to existing alias-loader conventions and unknown response fixtures. A later form event cast was replaced with native control type narrowing. Final typecheck/build pass.
- Validation styling remained after a field was corrected; clear its error on change. Actual read-only browser check confirmed cleared errors and visible keyboard focus.
- Recovery refresh could unmount its acknowledgement before use; defer reload until acknowledgement and show the server-read known-item state. Dedicated browser case verifies recheck without replay and refreshed form values.
- Read-only polish harness initially counted Next's route announcer as a form alert; scoped the assertion to the form. No extra product write or creation replay.

No backend defect, business-rule change, skipped test or retry masking. Real backend faults were not manufactured; loading/network/5xx/malformed/recovery states are fixture-backed cases and are not claimed as live backend failure evidence.

## 9. Requirement Reconciliation / Convention Compliance

PASS for all four screens/five existing APIs, simple Vietnamese essential content, exact amounts, ADMIN authority, responsive/accessibility and real persistence. No unsupported business feature. Canonical naming PASS: kebab-case frontend files/routes, PascalCase components/types, existing alias imports and semantic tokens, exact status/API/domain identifiers, dated report and valid links. Historical requirements/reports, backend/migrations, Stitch and unrelated staged work preserved; no convention exception required.

## 10. Remaining Issues and Next Step

No blocking issue for the requested scope. Full-list local filtering and unknown-create/manual-review limits follow the existing contract; real5xx/provider/physical-device/full Playwright coverage is not claimed. QA app processes were stopped after verification; PostgreSQL and the clearly named test product remain. No Neon, migration, deployment, commit or push. Stop here; future modules only on a separate request.
