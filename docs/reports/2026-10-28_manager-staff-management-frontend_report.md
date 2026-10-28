# MANAGER Staff Management Frontend implementation report

## 1. Task information and outcome

Date: 2026-10-28, Asia/Saigon. Type: frontend implementation.
**Outcome: PASS — scoped Staff assignment management implemented and verified.**
Backend, API contracts, migrations and Stitch designs remain unchanged.
[Authoritative API v1.0](../api/manager-staff-management-contract-v1.0.md),
[verified backend report](2026-10-28_manager-staff-management-backend_report.md).

## 2. Documents and requirements

Read root/frontend AGENTS.md, development/frontend workflows, coding/UI/traceability/
document rules, project conventions, current handoff, relevant Project Scope v1.0,
BRD/SRS v1.2, the backend report and its System Analysis UC traceability, existing
Manager/Admin Staff/authentication code, installed Next16 page documentation and
`.stitch/DESIGN.md`. Historical requirements/contracts/reports were not rewritten.

| Existing requirement | Implementation and actual evidence | Result |
|---|---|---|
| BRD BR-002/003; SRS FR-AUTH-007/008, FR-ORG-005; NFR-SEC-002/003 | Backend-verified Manager shell; both path IDs validated; scoped reads, foreign404 and same-JWT revocation in real browser | PASS |
| SRS FR-CINEMA-010; System Analysis UC-MGR-015 | Existing current Staff endpoint preserved; complete scoped history, contact/profile and filters | PASS |
| BRD BR-053/055; SRS FR-ORG-002/003; UC-MGR-016/017 | Explicit grant/deactivate/reactivate; immutable effectiveAt and preserved other memberships | PASS |
| SRS FR-ORG-004 | Account state read-only; no Manager account activation/block/profile/invitation controls | PASS |
| SRS FR-AUDIT-003; NFR-SEC-006 | Existing audited backend writer only; exact fields, validated receipts, no optimistic assignment status or automatic retry | PASS for frontend boundary; prior backend audit tests not rerun |
| HR, shifts, performance, global account administration | Excluded from this task and production UI | NOT APPLICABLE |

## 3. Live Stitch references and adaptations

Read-only MCP `list_screens`, `get_screen`, `download_file`: actual HTML and images
inspected for all five references in project `1208499799798658711`.

| Screen | Current Stitch ID | Production mapping |
|---|---|---|
| Nhân viên tại rạp | `5229c9ca853846e48a72c6e6f39abd44` | Existing Manager list; scoped selector, desktop table/mobile cards, contact/status/effective date and detail links |
| Chi tiết nhân viên | `be11e96c0b9449968bfdb3abefbb7d81` | New detail route; compact profile and Cinema-specific history |
| Phân công nhân viên | `a0093d0064574fd183fbeee7aa510951` | Staff/source, authorized destination, GMT+7 effective time and explicit confirmation |
| Ngừng phân công | `15ea91d169d44508833a9a7ee9f68220` | Exact assignment confirmation, account/other memberships preserved |
| Kích hoạt lại phân công | `a453177e20f8403e8f89a68f4c779c03` | Exact assignment confirmation, original time retained, future access wording corrected |

Preserved existing ManagerShell, Nocturne tokens, fonts, dark surfaces and amber
actions. Reused Button/Dialog/FormField/StatusBadge/SurfaceCard/Operations UI.
Responsive history cards follow the existing ADMIN pattern rather than copying
the prototype's dense history table. No avatar asset, metric or data was invented.
Removed prototype HR/job titles/shifts/hours/performance/dispatch/cloud claims,
deactivation reasons, invitation/global account controls and rescheduled reactivation.
The obsolete read-only-only banner was replaced by the approved assignment flow.
Cropped prototype modals became scrollable native dialogs with accessible actions.
These are frontend adaptations; no Stitch resource was modified.

## 4. Implemented pages and exact APIs

Preserved `/manager/staff` and `/manager/cinemas/[cinemaId]/staff`.
Added `/manager/cinemas/[cinemaId]/staff/[staffId]`, including exact login resume
and correct active Staff navigation. Existing ADMIN navigation is unchanged.

| Method and existing API suffix under `/api/v1/manager/cinemas/{cinemaId}` | Use |
|---|---|
| GET `/staff` | Original server-current collection retained; current filter uses returned assignment IDs |
| GET `/staff-assignments` | Full ordered Cinema history; current/future/inactive presentation and local search |
| GET `/staff/{staffId}` | Minimal owned profile/history; reload, direct entry and review |
| POST `/staff/{staffId}/cinema-assignments` | Exactly `{cinemaId, effectiveAt}`; source context plus authorized destination |
| PUT `/staff/{staffId}/cinema-assignments/{assignmentId}/status` | Exactly `{status: "ACTIVE"}` or `{status: "INACTIVE"}` |

Existing GET `/manager/cinemas` supplies destination options; GET scoped Cinema
provides context. No arbitrary destination-ID field, global Staff search, reason,
new API/query parameter or pagination contract. Counts refer to loaded assignments,
not invented unique Staff totals. Adding another Cinema preserves existing grants.
Initial unrelated Staff placement remains ADMIN. Account ACTIVE/BLOCKED is distinct
from assignment ACTIVE/INACTIVE; future/current are presentation labels only.

## 5. Authorization, validation and recovery

- Backend-authenticated scoped GET authorizes the shell, independent of stored role
  hints. Every feature request retains signed Bearer, no-store and omitted cookies.
- IDs remain canonical positive-bigint decimal strings, including values beyond
  Number precision. Responses validate Cinema, Staff, assignment type/identity,
  ordered uniqueness, exact microsecond timestamp and expected mutation status.
  Unexpected/private profile fields are discarded.
- Date input explicitly uses GMT+7 and existing wall-time/calendar validation;
  commands submit UTC instants. Status commands never submit/change effectiveAt.
  An inactive historical row cannot reactivate over a loaded ACTIVE grant.
- Reads use the existing cancellation/request-identity hook; old Cinema responses
  cannot replace a newly selected Cinema. Successful writes trigger fresh GETs.
- Confirmation, synchronous submission lock and pending controls prevent duplicate
  commands. No POST/PUT on mount, reload, navigation, error or review.
- Network/5xx/malformed receipts remain uncertain.409 requires review;429 respects
  Retry-After.400/401/403/404 remain safe localized responses. No raw server SQL,
  invitation material or credentials are reflected.
- A separate per-tab review hint stores only operation kind and canonical resource
  IDs, never names/contact data, credentials or an authoritative status. Reload
  retains the review block. Explicit review reads owned source detail and, for a
  grant, destination assignments; acknowledgement is separate from those reads.
  Absence of a destination row is not presented as proof that the prior write failed.
  A hint for another context links to its source; backend still checks ownership.
- Account creation/invitations, profile edits, roles and global activation/blocking
  are absent. Assignment changes do not imply check-in permission or account activation.

## 6. Files

Created:

- `frontend/src/app/manager/cinemas/[cinemaId]/staff/[staffId]/page.tsx`
- `frontend/src/features/manager/manager-staff-api.ts`
- `frontend/src/features/manager/manager-staff-service.ts`
- `frontend/src/features/manager/manager-staff-dialogs.tsx`
- `frontend/src/features/manager/use-manager-staff-command.ts`
- `frontend/src/features/manager/manager-staff.test.ts`
- `frontend/test/e2e/manager-staff.spec.ts`
- This report.

Modified: `frontend/package.json` (include new unit file), Manager
`manager-staff-screen.tsx`, `manager-navigation.ts`, `manager-shell.tsx`, existing
`frontend/test/e2e/manager-operations.spec.ts` and additive current handoff.
The prior Staff read-only regression was updated for this explicitly approved
capability while retaining contact/role/no-HR/no-automatic-write assertions.
No dependency, auth/session implementation, ADMIN Staff source or test configuration
was changed. Existing routes other than the additive detail route are preserved.

## 7. Actual checks and fixes

Commands from `frontend/`, using existing configuration:

```powershell
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
$env:PLAYWRIGHT_CHANNEL='msedge'
pnpm exec playwright test 'manager-staff|manager-operations|admin-staff' --reporter=line
pnpm exec playwright test manager-staff --grep 'scoped list shows|stale response' --reporter=line
pnpm exec playwright test 'admin-|manager-operations|manager-staff|shared-ui-foundation|customer-final-qa' --reporter=line
```

| Executed check | Actual final result |
|---|---|
| Baseline frontend unit tests | 287/287 PASS |
| Final frontend unit tests | **306/306 PASS**,19 new;0 failures/skips |
| TypeScript | PASS,exit0 |
| ESLint | PASS,exit0;0 errors,12 existing warnings in old ignored `target/` audit scripts |
| Production build, Next16.3.5 | PASS,including new dynamic route |
| Initial focused browser run | 63 PASS /2 FAIL; exact implicit-label lookups for two selectors |
| Affected cases after explicit accessible labels | 2/2 PASS |
| Final complete selected Edge regression | **160/160 PASS in one2.8-minute run**;135 baseline +25 new;0 failures/skips/retries |
| Real local browser | **12/12 functional groups PASS**,0 browser errors |
| Real responsive/accessibility evidence | **15/15 screen/width checks PASS** |
| Database original-record/guard preservation | PASS |

Before final verification, fixed unsupported badge tones by reusing the existing
neutral/success tones; moved render-time clocks to stable receipt/dialog snapshots
for React purity; restored explicit native selector labels. No assertion was
weakened or test skipped. The real harness initially needed the cached Spring test
jar for the protected fixture helper and a navigation-ready assertion before reload;
both harness issues were corrected. Earlier fresh QA setup records were retained,
without resetting data or replaying an uncertain frontend mutation.

The160 browser cases use clearly labelled HTTP fixtures. They are separate from
the real browser described next. Backend Maven suites were NOT RUN for this
frontend-only slice; the prior243 backend tests are historical evidence, not a
newly executed count. Full unrelated cross-module Playwright suite NOT RUN.

## 8. Real local application and data preservation

Repository-root commands actually executed:

```powershell
.\scripts\local-dev.ps1 -Action Status
.\scripts\local-dev.ps1
```

Actual database: **127.0.0.1:5432/smartcinema_phase4e_test**.
Installed/source **V18**,18 valid migration checksums,pending0,failed0. Startup
skipped migrations; Spring8080, Next3000 and matching real API proxy all PASS.
No administrator migration/privilege change was needed. Remote `.env` was not
imported; provider, delivery and cleanup stayed disabled.

Fresh fixtures reused the explicitly approved V18 QA scope, guarded by existing
local preflights and acknowledgements. Managed Staff were created through the
protected invitation-intent/revocation flow and remained BLOCKED. Separate synthetic
role-only login fixtures exercised denial, not successful Staff onboarding/check-in.
No invitation mail was sent and no operational account was reused or changed.
The operator connection was limited to approved fixture/read-audit support;
feature commands used real signed-JWT HTTP and restricted application writers.

Real Edge browser, without API/JWT interception, verified Manager login/resume,
list/profile/history, reload and separate-tab entry, one explicit201 grant to
another owned Cinema, current and future deactivate/reactivate, immutable
microseconds, account/other memberships unchanged, foreign404, Manager denied
ADMIN Staff, existing ADMIN Staff/prerequisites, actual revocation/reactivation
with the same JWT, existing Manager Cinema/Showtime navigation, and STAFF/CUSTOMER
denial. Recorded **112 management responses:200×104,201×1,403×3,404×4**.

Real list/detail and all three dialogs checked at390/768/1440:15 screenshots,
no horizontal overflow, visible actions, keyboard trap/Escape/focus restoration,
visible focus, >=44px controls and >=16px control text. Reduced motion was enabled;
browser timezone was deliberately America/Los_Angeles while UI remained GMT+7.
Screenshot header masking is evidence redaction, not application styling.

Read-only fingerprints cover all original rows in23 selected application/history
tables, V1–V18 history, function definitions/ACL, roles/memberships and financial/
catalog counts. All originals unchanged. Only fresh labelled QA rows and their
assignment/audit changes were retained; normal authentication created sessions.
Final Users386/Cinemas183 versus preflight376/177 reflects those QA fixtures.
No Hold/Booking/Payment/Ticket/Concession/Promotion data was created or changed.
Owned startup services were stopped after verification; no commit/push/deploy.

Ignored evidence directory: `frontend/target/manager-staff-2026-10-28/` contains
baseline hashes, test/build logs, startup/status logs, `real-evidence.json`,15 PNGs,
read-only Stitch HTML/metadata, database preservation evidence and local harnesses.
Credentials remain in the separate owner-ACL private fixture file, never reports
or response logs. No Neon, SMTP or external provider verification was attempted.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md).

| Area | Result | Evidence |
|---|---|---|
| Files/folders/routes | PASS | Kebab-case feature files, PascalCase components, approved plural scoped Next route and async params |
| Architecture/imports | PASS | Existing alias, API/service/UI separation, shared primitives; no dependencies |
| Domain/API/status | PASS | Exact five existing APIs, bigint strings and existing serialized statuses; no new workflow |
| UI language/accessibility | PASS | Concise Vietnamese, semantic native controls/dialogs, responsive and keyboard evidence |
| Database/backend | NOT APPLICABLE for implementation | Source, contracts, V1–V18 and privileges unchanged; approved QA only |
| Documentation | PASS | Required dated report, actual IDs/evidence/limitations, additive handoff |

No convention exception or unrelated rename. Final checks PASS:6 original files
modified,8 new files,943/949 original files byte-identical; backend, contracts,
V1–V18, ADMIN Staff and unrelated source unchanged. Strict UTF-8, whitespace and
103 documentation links PASS. Git HEAD/index unchanged. Ports8080/3000/3100 free
after stopping the owned services; after-shutdown database preservation also PASS.
Evidence: `scope-final.json` and `database-preservation.txt`.

## 9. Limitations and next step

Collection endpoints expose complete scoped arrays; filters are local and no
pagination/global search is invented. Future labels are snapshots at read time;
reload for current presentation and always rely on backend admission checks.
Session-storage failure limits cross-reload review hints; in-memory submission
locking remains. Reading after an uncertain write does not prove nonexecution.
Native date widget formatting follows the browser/OS; the labelled timezone and
submitted instant remain explicit. Exact prototype pixel matching was not claimed.
No live email/password onboarding, Staff admission, financial issuance, provider,
production load or deployment proof is claimed by this frontend task.

Manager account provisioning, global profile/status and initial unrelated placement
remain ADMIN. Any later Manager feature requires separate scope approval.
**Requested scope complete; STOP.**
