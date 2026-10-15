# Phase 4E — ADMIN Staff Management Frontend Implementation

## 1. Task Information

- Date: **2026-10-14**, Asia/Saigon. Module: ADMIN Staff Management. Type: frontend implementation.
- Status: **PHASE 4E IMPLEMENTED & VERIFIED** for the authorized frontend scope. Live HTTPS/Gmail/onboarding verification is NOT RUN.
- User explicitly approved the current seven Stitch designs and independent React corrections. The previous design gate is not repeated. Historical audit decisions remain preserved as history.
- Entry HEAD: `c65e0593baef8b0e1f7dd6763b9468409fe9a0b1`; empty index, tracked tree clean, seven incoming untracked audit reports preserved. No commit/staging/push/deployment.

## 2. Requested Work

Implement real ADMIN List/Create/Detail, invitation/account confirmations, Cinema assignments/Add/status confirmations against the existing eight Staff endpoints, preserving Nocturne/AdminShell, backend authority, security, UTC/identity semantics and unrelated features. Correct approved prototype imperfections in React. No backend, migration, database, environment or Stitch write is authorized or performed.

## 3. Documents Reviewed

[AGENTS](../../AGENTS.md), [Development Workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [Frontend Workflow](../../.agent/workflows/FRONTEND_WORKFLOW.md), applicable Review/UI_UX/Coding/Document/Requirement Traceability/Project Convention rules; [project conventions](../development/project-conventions.md), [report template](templates/TASK_REPORT_TEMPLATE.md), frontend-local AGENTS and installed Next.js 16.3.5 page/client-component documentation before editing.

[BRD v1.2](../brd/brd-v1.2.md), [SRS v1.2](../srs/srs-v1.2.md), historical Project Scope v1.0 and System Analysis v1.1; [current handoff](../ai/current-handoff.md), Phase 1/2 assessment/shared UI reports and recent Phase 4C/4D implementation reports; [seven-screen audit](2026-10-14_admin-staff-management-7-screen-design-audit_report.md), [design gate](2026-10-14_admin-staff-management-design-gate_report.md) and [latest recheck](2026-10-14_admin-staff-management-design-gate-recheck_report.md).

Authoritative [Staff administration contract v1.0](../api/staff-invitation-administration-contract-v1.0.md), [Staff operational contract](../api/staff-qr-checkin-contract-v1.0.md), actual [AdminStaffController](../../backend/src/main/java/com/smartcinema/staff/AdminStaffController.java), [requests](../../backend/src/main/java/com/smartcinema/staff/StaffRequest.java), [repository DTOs](../../backend/src/main/java/com/smartcinema/staff/StaffRepository.java), [service](../../backend/src/main/java/com/smartcinema/staff/StaffOnboardingService.java), [VietnamPhoneValidator](../../backend/src/main/java/com/smartcinema/auth/validation/VietnamPhoneValidator.java), security and V13 assignment invariants. Existing [AdminShell](../../frontend/src/features/admin/admin-shell.tsx), Admin API/request hooks, Phase 1 components, global tokens and [.stitch/DESIGN.md](../../.stitch/DESIGN.md) were inspected.

## 4. Requirements Traceability

| Actual requirement / source | Applied behavior | Result |
|---|---|---|
| BRD v1.2 BR-002/003/004 | Current backend ADMIN authorization; no client role/scope authority | PASS frontend integration; backend unchanged |
| BRD v1.2 BR-053/055 | Minimal Staff account/status/Cinema assignment UI; no HR/POS/employment/permission fields | PASS |
| SRS v1.2 FR-AUTH-006/007/008/010 | BLOCKED/ACTIVE presentation, protected administration, separate setup/activation | PASS for approved ADMIN slice; no generic Role editor |
| SRS v1.2 FR-ORG-002/003/004/005 | Add/deactivate/reactivate, immutable effectiveAt/history, server scope authority | PASS for existing ADMIN contract; Manager administration outside scope |
| SRS v1.2 FR-AUDIT-003 | Preserve returned assignment history; no invented audit viewer | PASS preservation; existing backend audit not rerun |
| SRS v1.2 NFR-SEC-006/010/011/012 | Actual validation, no credential display/storage/logging, safe errors, Retry-After | PASS frontend boundary; live limiting/security remain backend |
| SRS v1.2 NFR-UX-004 | Vietnamese loading/empty/validation/error/review/success feedback | PASS |
| Approved contract v1.0 + user Phase 4E task | Eight exact APIs, positive-bigint strings, truthful delivery/setup prerequisites | PASS implemented; live mail not claimed |

No requirement IDs, endpoints, roles or financial outcomes were added. Detailed behavior is in the [frontend guide](../development/admin-staff-management-frontend.md).

## 5. Implementation Summary

### Stitch references and visual mapping

Fresh Stitch MCP list/get_screen reads succeeded for all seven current resources in project `1208499799798658711`, with HTML/PNG export references. Current exports and responsive HTML renders from the preceding audit were inspected as visual references; prototype JavaScript was not copied. No historical/deleted resource or generation write was used. MCP job-completion state is not claimed.

| Current Stitch screen ID | Approved component | Production mapping |
|---|---|---|
| `a76b3e182457474ab63a874b18b5d5e7` | Staff List | `/admin/staff`, desktop table / mobile-tablet cards, pagination and feedback |
| `ac7d4f2d4a8a461e8fed0064ddb0eef7` | Create Staff | Three-field validated Create dialog |
| `3e0264b3d0d44bed9fb08e37e56a253c` | Staff Detail | `/admin/staff/[staffId]`, account/setup/invitation cards |
| `3d1c054f04e544639ce2c57d4558718a` | Cinema Assignments | Detail section, active/inactive/future/history/actions |
| `c55feb9b893242c2a8a4bd1177aeaded` | Account Action Dialogs | Reissue, Activate, Block confirmations |
| `cfb33f1500e245f6bcef2c6767778334` | Add Cinema Assignment | Existing Cinema selector + Vietnam time input |
| `b7fbb4d0249b4e7aad51441ef4aef531` | Assignment Action Dialogs | Deactivate and Reactivate confirmations |

Preserved charcoal surfaces, amber primary CTA, configured fonts, semantic status colors, existing AdminShell and shared primitives. Corrected phone10digits-only copy, premature “email sent” wording, unsupported job-title labels and excessive prototype/state-board content in React. No Stitch edits or new design approval. Destructive controls use readable existing error/canvas tokens. Tablet list uses cards to prevent excessive column wrapping; long unbroken names/IDs wrap without document overflow.

### Exact endpoint integration

| Method and endpoint | Exact input | Validated result / UI |
|---|---|---|
| GET `/api/v1/admin/staff?page={page}&size=20` | Only page/size | StaffAccount[]; numeric order, current-page count, no invented global totals |
| POST `/api/v1/admin/staff` | `{fullName,email,phone}` | 201, BLOCKED + setup incomplete, truthful delivery state |
| GET `/api/v1/admin/staff/{staffId}` | No query | Exact ID/account/setup/expiry/delivery projection |
| POST `/api/v1/admin/staff/{staffId}/invitations` | `{}` | 200 account; explicit confirmation, old-link invalidation, no inbox claim |
| PUT `/api/v1/admin/staff/{staffId}/status` | `{status}` | 200 exact identity/status; ACTIVE requires completed setup |
| GET `/api/v1/admin/staff/{staffId}/cinema-assignments` | No query | Ordered assignments, exact parent, read-only non-STAFF history |
| POST `/api/v1/admin/staff/{staffId}/cinema-assignments` | `{cinemaId,effectiveAt}` | 201 ACTIVE STAFF, exact Cinema/parent/time |
| PUT `/api/v1/admin/staff/{staffId}/cinema-assignments/{assignmentId}/status` | `{status}` | 200 exact identity/parent/Cinema/type/status; immutable original time |

Supporting selector reuses existing GET `/api/v1/admin/cinemas`; this is not a ninth invented Staff API. JWT ADMIN and current database ACTIVE/ADMIN remain backend authority. All Staff identity fields are decimal strings, no Number conversion. Runtime validation rejects malformed/mismatched/unsupported responses and drops extra metadata. Name/email/phone use existing150/254/30 limits, all supported Vietnamese formats and no company-domain restriction. Date input explicitly uses GMT+7, validates calendar normalization, submits UTC; no invented past-time ban. Nano-precision effectiveAt equality is checked after assignment changes.

New accounts remain BLOCKED. Setup, activation and operational permissions are separate. Future ACTIVE membership is labeled future-effective, never promised immediate Check-in. Block/reissue/status commands never remove history. Inactive or temporarily closed Cinema selection is not prohibited by an invented rule. Duplicate ACTIVE STAFF membership is disabled in the UI and still revalidated by backend constraints.

### Failure, concurrency and accessibility

Fixed safe Vietnamese 400/401/403/404/409/429/503/network/malformed-response handling. Writes require explicit user action/confirmation, synchronous duplicate guard, disabled controls, a15-second transport timeout, validated response and read refresh. No optimistic status, mount mutation, replay, automatic retry or polling. Valid Retry-After drives a local countdown only.

Per-tab storage keeps only a nonce/optional Staff ID as an untrusted review/navigation hint, never PII/status/password/invitation token. Lost/interrupted/5xx/malformed write and409 block new decisions until explicit GET review and manual acknowledgement. Unknown Create cannot recover an ID by email or operation token; the UI advises checking supported pages, without blind retry. Reads/acknowledgement do not prove the previous write failed. Stale request/unmounted/token/resource guards and nonce-specific cleanup prevent stale view updates and clearing newer review hints.

Native modal dialog has named title, Tab/Shift+Tab containment, Escape/backdrop handling, trigger-focus restoration and scroll lock; closing is blocked while submitting. Native forms retain required controls, accessible labels/inline error associations/first-error focus and shared44px touch targets/focus tokens. UI is Vietnamese; native date-picker chrome follows OS/browser locale. No new animations; existing reduced-motion rules remain in place.

## 6. Files Created

- `frontend/src/app/admin/staff/page.tsx`
- `frontend/src/app/admin/staff/[staffId]/page.tsx`
- `frontend/src/components/ui/dialog.tsx`
- `frontend/src/features/admin/admin-staff.types.ts`
- `frontend/src/features/admin/admin-staff-service.ts`
- `frontend/src/features/admin/admin-staff-api.ts`
- `frontend/src/features/admin/admin-staff-review.ts`
- `frontend/src/features/admin/use-admin-staff-command.ts`
- `frontend/src/features/admin/admin-staff-screen.tsx`
- `frontend/src/features/admin/admin-staff.test.ts`
- `frontend/test/e2e/admin-staff.spec.ts`
- `docs/development/admin-staff-management-frontend.md`
- This new implementation report.

## 7. Files Modified

- `frontend/src/features/admin/admin-shell.tsx`: one supported Staff navigation link; existing auth/logout unchanged.
- `frontend/package.json`: append Staff unit-test file; all existing cases retained, no dependency changes.
- `frontend/test/e2e/admin-movies.spec.ts`: obsolete four-link assertion becomes exact five supported labels plus Staff href; original test retained, authorization assertion strengthened.
- `docs/ai/current-handoff.md`: prepend Phase4E milestone after final verification; prior milestones retained.

Ignored `frontend/target/admin-staff-implementation-qa/` contains fixture browser screenshots, not production assets. Seven incoming reports remain untouched. No files moved.

## 8. Verification

| Check / command from frontend | Actual result |
|---|---|
| Pre-edit `pnpm exec tsc --noEmit` | PASS |
| Pre-edit `pnpm lint` | PASS exit0,0 errors,12 existing warnings in historical ignored target scripts |
| Pre-edit `pnpm test` | 215/215 PASS,0 failed/skipped |
| Pre-edit `pnpm build` | PASS |
| Pre-edit full Playwright | NOT RUN separately;347 existing cases from the retained source inventory/prior Phase4D report, final regression runs them together with19 new cases |
| Final `pnpm exec tsc --noEmit` | PASS exit0 |
| Final `pnpm lint` | PASS exit0,0 errors,12 unchanged historical target warnings; focused changed-source lint also passed with0 warnings |
| Final `pnpm test` | 230/230 PASS,0 failed/cancelled/skipped/todo;215 retained +15 new |
| Final `pnpm build` | PASS, Next16.3.5 production routes include both Staff routes |
| Focused `PLAYWRIGHT_CHANNEL=msedge pnpm exec playwright test test/e2e/admin-staff.spec.ts` | 19/19 PASS,44.2s before final tablet/long-name refinement; final-source cases included in full run below |
| Final full `PLAYWRIGHT_CHANNEL=msedge pnpm exec playwright test` | **366/366 PASS**,13.3m,27 files,1 worker;347 retained +19 new;0 failures/skips/retries, exit0 |
| Responsive visual inspection | PASS:15 fixture screenshots, List/Detail/Create/Add/Reissue at390/768/1440; final tablet/long-name snapshots rechecked; keyboard/overflow assertions PASS in final full run |
| Backend `mvn verify`, live SMTP/onboarding, Neon/data/provider writes | NOT RUN; frontend-only task, backend unchanged; historical410/410 is not current evidence |
| Preservation/document checks | PASS:7/7 incoming report SHA-256 hashes unchanged, empty index/unchanged HEAD/backend diff, V14 head, new document links/UTF-8 and diff whitespace checked |

Fifteen new unit tests cover runtime DTO/identity/status/ordering validation, exact eight requests/auth headers/body shapes, immutable nanosecond time, Vietnamese phone/calendar/action gates, safe errors/Retry-After, uncertain outcomes, existing Cinema options and hint isolation. Nineteen new fixture browser scenarios cover Create/Detail/all seven dialogs, UTC/history, duplicate submission, pending-close protection, reload/direct-entry/interrupted recovery, unknown identity,409/429/503/malformed/network,401/403/404/anonymous/forged ADMIN/mismatched ID, pagination/loading/empty/Cinema error and keyboard/focus/overflow at the three widths.

Development failures were corrected, not masked: initial unit-test error predicate caused TypeScript/build errors; fixed its type guard. Three width-specific keyboard checks revealed native dialog boundary focus escape; explicit focus containment fixed them. Initial full run found the old four-link assertion after the approved fifth navigation link; replaced it with the exact supported navigation and URL assertions. Partial full runs were stopped for tablet/long-name refinements (one after11 completed with10 PASS/1 obsolete-assertion FAIL; another after26 completed PASS). A build session interrupted by the continuation was rerun. None of these partial runs is counted as a full PASS. Tests/config/retry/skip settings were not weakened.

Final console also contains existing Node module/color warnings and local proxy ECONNREFUSED logs for unmocked public Movie/Genre reads during historical Staff navigation/logout tests. Backend localhost:8080 was not running; those browser scenarios pass with safe unavailable states. These logs are disclosed, not hidden or counted as successful live backend integration.

## 9. Requirement Reconciliation

All authorized feature families implemented; backend/assignment/setup/delivery authority preserved. Final regression, requirement reconciliation and preservation checks PASS. Browser fixtures test frontend interaction and supported HTTP shape, not live backend commits or actual mail delivery. Manager administration, HR/POS/KYC/2FA/shifts/permission editing, Staff self-management, financial logic and deployment are outside scope and absent.

## 10. Deviations / Conflicts

The latest user instruction explicitly supersedes prior design-only STOP decisions, approving implementation and React corrections. Historical reports remain unchanged. BRD/SRS generic Manager/Admin assignment wording is broader than this approved ADMIN-only API slice; no Manager endpoint/privilege is introduced. No requirement/contract rewrites, dependencies, framework migration or environment edits.

Existing Convention Conflicts: historical Project Scope/System Analysis filenames and historical ignored target scripts are left unchanged. Baseline target lint warnings are disclosed, not hidden by new exclusions. No new convention exception is required.

## Convention Compliance

Checked against [canonical project conventions](../development/project-conventions.md), including the report itself.

| Area | Result | Evidence |
|---|---|---|
| Folder/file/route naming | PASS | kebab-case; framework page.tsx and camelCase `[staffId]` exception; dated report |
| Code/type/component naming | PASS | English camelCase/PascalCase, UPPER_SNAKE_CASE shared constants |
| Feature/generic separation/imports | PASS | feature logic under admin; generic Dialog has no business logic; source uses existing @/ alias |
| Domain/status/API | PASS | Staff/Cinema/Assignment; unchanged uppercase backend enums; exact existing endpoints |
| Visual/UI language | PASS | shared semantic tokens, Nocturne/fonts, Vietnamese copy/native semantics |
| Database/migrations | NOT APPLICABLE | no writes/source changes; V14 remains head |
| Documentation/history | PASS | new report/guide, additive handoff; BRD/SRS/contracts/historical reports preserved |
| Git/environment/deployment | PASS | no staging/commit/push, credentials/config/deployment unchanged |

## 11. Known Limitations

1. No operation-status/commit-fence/email lookup API exists. Unknown Create result requires human review of supported pages; an explicit GET cannot rule out a delayed commit. Manual acknowledgement permits a new decision, never guarantees safe replay or automatic deduplication.
2. Per-tab hints do not serialize separate tabs. Backend current role/status/assignment constraints remain authoritative. Browser storage denial prevents persistence across reload; mounted uncertainty handling remains.
3. Future-effective display uses the client read time, not invented server time. It is informational; only backend grants admission. Refresh updates it; no polling.
4. Actual HTTPS/Gmail invitation delivery, public password setup, ADMIN activation and real Staff operational admission were not exercised here. No live account/email/database data was created to manufacture proof. Real browser/OS date-picker, assistive technology and physical-device matrix require separate QA.
5. No live backend integration test count is claimed. Fixture-backed HTTP results and source-contract inspection are separate from production integration evidence. Historical backend410 is only history.
6. Deliberately extreme unbroken Staff names can widen the desktop table and require its keyboard-accessible internal horizontal scroll; the document itself stays within the viewport. Mobile/tablet cards wrap them. Optional later column-width polish is not a missing workflow or API dependency.

## 12. Next Recommended Step

Separately authorize controlled end-to-end ADMIN provisioning → HTTPS/Gmail invitation → private password setup → ADMIN activation → effective Cinema assignment → Staff login/authorized Check-in verification in an approved environment. Do not enable secrets, alter data, commit/deploy or begin another phase automatically. STOP after Phase4E report.
