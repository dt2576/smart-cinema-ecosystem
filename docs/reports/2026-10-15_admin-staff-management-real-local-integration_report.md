# Phase 4E — Real Local Authenticated Integration & E2E

## 1. Task Information

- Date: **2026-10-15**, Asia/Saigon. Type: real local integration testing, not frontend implementation or Stitch audit.
- Outcome: **PHASE 4E LOCAL INTEGRATION PARTIALLY VERIFIED**.
- Real Staff creation, persisted reads, invitation reissue, assignment transitions, validation, authorization boundaries and responsive browser workflows verified. Successful password setup/activation and ACTIVE → BLOCKED browser workflow remain **BLOCKED** by missing legitimate invitation delivery/onboarding prerequisites.
- Spring Boot 4.1.1, Next.js 16.3.5, PostgreSQL18.4; existing application source/contracts unchanged. No Neon connection, email, reset, manual migration, staging, commit, push or deployment.
- Entry/final HEAD: `c65e0593baef8b0e1f7dd6763b9468409fe9a0b1`; index remains empty. Incoming uncommitted implementation and reports preserved.

## 2. Requested Work

Execute actual ADMIN frontend login and eight existing Staff APIs against the dedicated local database. User explicitly authorized one synthetic ACTIVE ADMIN, one synthetic STAFF and minimal ACTIVE Cinema data; secure local credentials and small provisioning/test-tool adaptations were authorized. No mock/intercepted Staff API response, forged session/JWT or protected-table insertion is used.

## 3. Documents and Source Reviewed

[AGENTS](../../AGENTS.md), [Development Workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), Frontend/Backend workflows, Requirement Traceability, Document/Coding/UI_UX/Project Convention rules, [project conventions](../development/project-conventions.md), [report template](templates/TASK_REPORT_TEMPLATE.md), frontend-local AGENTS.

[Environment readiness report](2026-10-15_isolated-local-postgresql-test-environment_report.md), [local environment guide](../development/local-test-environment.md), [ADMIN provisioning](../development/development-admin-provisioning.md), [Staff foundation](../development/staff-onboarding-and-checkin-foundation.md), [Staff contract v1.0](../api/staff-invitation-administration-contract-v1.0.md), [Phase4E implementation report](2026-10-14_admin-staff-management-frontend-implementation_report.md), current handoff, relevant BRD v1.2/SRS v1.2 and historical Project Scope v1.0 sections.

Actual [AdminStaffController](../../backend/src/main/java/com/smartcinema/staff/AdminStaffController.java), StaffRequest/OnboardingService/Repository, VietnamPhoneValidator, [security configuration](../../backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java), StaffAdmissionController, DevelopmentAdminApplication/Service, Cinema configuration controller/request/service, V13/V14 protected lifecycle and runtime ACLs; actual Staff frontend/API/service, Login form, AdminShell and Playwright configuration. No seven-screen audit repeated.

## 4. Requirements Traceability

| Existing source | Verified scope | Result |
|---|---|---|
| BRD v1.2 BR-002/003/004; SRS FR-AUTH-007/008, NFR-SEC-002/003 | Real ADMIN JWT, anonymous Staff API401, ADMIN denied Staff operational GET403; API remains authority | PASS tested boundaries; non-ADMIN → ADMIN access not exercised with a second active actor |
| BRD BR-053/055; SRS FR-ORG-002/003/004/005, FR-AUDIT-003 | Minimal Staff data; future assignment, deactivate/reactivate, retained identity/time/history | PASS ADMIN slice; actual STAFF admission/audit viewer not tested |
| SRS FR-AUTH-006 | BLOCKED creation, setup prerequisite409, preserved blocked status | PASS negative gate; successful activation BLOCKED |
| SRS NFR-SEC-001/006/010/011 | Existing BCrypt provisioning/login; phone/ID validation, secure input, fixed safe errors | PASS exercised scope; no production hashing/security code modified |
| SRS NFR-SEC-012 | Avoid resend exhaustion, no mutation replay | PASS scope preservation; live429 not tested |
| SRS NFR-UX-004 | Actual Vietnamese empty/loading/error/success/review feedback and keyboard controls | PASS tested views |
| Staff administration contract v1.0; explicit task §§2–8 | Eight exact APIs, immutable UTC time, setup/activation separation, minimal isolated data | PARTIAL overall due onboarding dependencies; initial preflight catalogue scope deviation corrected below |

No new requirement/UC IDs, permissions or business rules. This report does not redefine BRD/SRS or supersede the approved Staff contract.

## 5. Environment, Isolation and Local Data

Before provisioning, service startup and each harness phase, ran `backend/scripts/local-test-environment.ps1 -Action Verify`. Actual JDBC checks confirmed physical server **127.0.0.1:5432**, database **smartcinema_phase4e_test**, owner/migrator **smartcinema_phase4e_migrator**, runtime **smartcinema_phase4e_app**, read-only preflight, **14 successful/0 failed migrations, V14**, five Staff tables and zero runtime role memberships. Normal Boot validated all14 checksums and Hibernate schema; no migration executed on this run.

Whole Spring ConfigData location remains the unchanged private `.env.local-test` with blank import and profile `local-test`; frontend rewrite target pinned to `http://127.0.0.1:8080`. Conflicting overrides fail closed. No root dev/admin/seed command, remote fallback, provider call or SMTP worker. Backend TCP observation showed loopback database connections only, plus local browser/proxy connections.

**Preflight correction:** the inherited Verify helper initially read cluster role catalogues via the local `postgres` maintenance database. This was outside the new task's exclusive-database wording, although it accessed only role metadata and made no business writes there. Changed this check to the restricted read-only connection in the dedicated test database; role-preservation hash still matched. Repeated Verify/Audit and the final real browser read phase after correction. All application/provisioning/business tests used the dedicated database throughout; do not represent the early maintenance-catalogue read as strict exclusive-database compliance.

| Synthetic resource | Identity and persisted final state |
|---|---|
| ADMIN | ID `1`, ACTIVE; existing DevelopmentAdminApplication/Service returned CREATED via JPA/BCrypt, no promotion/hash bypass |
| Cinema | ID `1`, `Phase4E Local Test Cinema c32f51f8`, ACTIVE; existing authenticated POST `/api/v1/admin/cinemas`201 |
| STAFF | ID `2`, `Phase4E Nhân viên Test 82a3852a`, synthetic `@example.test`, BLOCKED, setup=false; backend canonical phone starts `+84` |
| Assignment | ID `1`, Staff `2`, Cinema `1`, STAFF, ACTIVE, future `effectiveAt=2026-10-21T18:24:00Z` (22/10/2026 01:24 GMT+7); unchanged through transitions |
| Invitations/delivery | Two invitations with exact24h intervals; older revoked on reissue, latest revoked on final BLOCKED operation; consumed0, queued0, delivery attempts0 |

Credentials generated with CSPRNG in ignored `backend/.env.local-test-admin`; inheritance disabled, ACL grants current Windows user only. Password is passed privately through process environment to the existing provisioning CLI, never arguments/output. Local JWT/AES/datasource values and remote `.env` were not changed. Browser JWT exists only in harness memory and the application's existing authenticated session; no session injection, storage export, HAR/trace or Login screenshot.

## 6. Services and Real Login

Started only `local-test-environment.ps1 -Action Start` and `frontend/scripts/start-local-test.ps1`: backend127.0.0.1:8080, frontend127.0.0.1:3000. Actual Spring main startup7.433s; Next ready859ms. Each test phase filled the actual Login form, obtained POST `/api/v1/auth/tokens`200 and followed ADMIN navigation to Staff. No fabricated identity or API fixtures.

Both owned application sessions were stopped with Ctrl+C after verification; no remaining listeners3000/8080. Their exit1 is intentional interruption, not startup failure. PostgreSQL and minimal test records remain; nothing deleted/reset.

## 7. Each Staff API Result

All paths below are actual controller contracts. IDs remain canonical positive-bigint strings; safe owned GETs confirm persistence. Supporting Cinema GET/POST were the existing endpoints, not invented Staff APIs.

| # | Method/path | Actual request/evidence | Result |
|---|---|---|---|
| 1 | POST `/api/v1/admin/staff` | Browser `{fullName,email,phone}`201 once; BLOCKED/setupfalse/QUEUED/attempts0; subsequent GET matches | PASS; duplicate email409 and invalid phone400 |
| 2 | GET `/api/v1/admin/staff?page=0&size=20` | Actual browser list, empty-before/one-after; size1 page0 one/page1 empty; direct page1size20 empty and previous-page navigation | PASS; no next-page link promised with only one Staff |
| 3 | GET `/api/v1/admin/staff/2` | Exact persisted identity/phone/status/setup/delivery; reload/direct entry | PASS; `0`, `001`, bigint overflow400; absent canonical max ID404 |
| 4 | POST `/api/v1/admin/staff/2/invitations` | Browser explicit confirmation, `{}`,200 once, new expiry, QUEUED/attempts0 | PASS reissue; old revocation verified by read-only DB metadata, not redemption HTTP |
| 5 | PUT `/api/v1/admin/staff/2/status` | `{status:ACTIVE}`409 before setup; GET remains BLOCKED. Later `{status:BLOCKED}`200, delivery REVOKED and assignment unchanged | PASS prerequisite and supported idempotent block; ACTIVE transition/ACTIVE→BLOCKED UI BLOCKED |
| 6 | GET `/api/v1/admin/staff/2/cinema-assignments` | Empty-before/one-after and each status persistence; exact parent/Cinema/ID/time | PASS |
| 7 | POST `/api/v1/admin/staff/2/cinema-assignments` | Browser `{cinemaId:"1",effectiveAt:UTC}`201 once; ACTIVE STAFF future badge; duplicate ACTIVE409 | PASS |
| 8 | PUT `/api/v1/admin/staff/2/cinema-assignments/1/status` | Browser explicit confirmations INACTIVE200 then ACTIVE200; identical original effectiveAt, same single retained assignment | PASS |

Staff GET/probe success and error paths assert no-store. Real anonymous Staff API returned401 directly and through frontend. Real ADMIN JWT accessing GET `/api/v1/staff/cinema-assignments` returned403; this verifies the actual ADMIN/STAFF separation, not the untested converse of a STAFF/CUSTOMER accessing ADMIN endpoints.

## 8. Browser E2E and Verification Evidence

Harness: [phase4e-local-integration.mjs](../../frontend/scripts/phase4e-local-integration.mjs), Edge via existing `@playwright/test`, real frontend dev server. No route interception/mock API response. Real-network loading uses CDP latency; read failure uses browser offline mode, then explicit GET retry online. No writes during offline tests.

| Workflow | Result and evidence |
|---|---|
| Real login, List→Detail, exact identity, direct entry/reload | PASS |
| Create dialog, inline invalid-phone/noPOST, success | PASS after phone assertion correction; successful POST not replayed |
| Reissue dialog, fresh invitation projection | PASS; no email-delivery claim |
| Setup prerequisite and account controls | PASS: both Activate/Block disabled while BLOCKED/incomplete; real ACTIVE request409 |
| Add assignment, future badge, deactivate/reactivate | PASS, persistence and immutable original UTC verified |
| Duplicate email, uncertain/review guard | PASS actual409, Vietnamese alert, controls blocked, explicit GET review/manual acknowledgement; no POST replay |
| Duplicate ACTIVE assignment | PASS backend409; same single record retained |
| Loading and offline read error | PASS actual pending GET/error feedback/recovery, not fabricated responses |
| Responsive390/768/1440 | PASS List, Detail, Create/Reissue/Add/Deactivate dialogs; document overflow checks; Tab/Shift+Tab containment/Escape/trigger-focus restoration |
| Reactivate confirmation | PASS actual browser transition and1440 screenshot; separate390/768 reactivation-dialog capture NOT RUN |
| Activate and Block account dialogs | BLOCKED by legitimate onboarding prerequisite; not forced open by fabricated frontend state |

Screenshots were visually inspected at the required widths: readable Vietnamese, wrapping synthetic email/name, no horizontal document overflow or header overlap in tested views. Dev Next indicator and existing smooth-scroll warning remain; this is not production-build/physical-device/assistive-technology certification.

Actual commands/results:

| Command/check | Exact result |
|---|---|
| Local `ProvisionAdmin` through existing CLI | PASS, CREATED, Maven BUILD SUCCESS; source unchanged |
| Verify/Audit and normal Boot Flyway/Hibernate | PASS, V14/14success0fail; dedicated final preflight |
| `node scripts/phase4e-local-integration.mjs write` | Exit1:6PASS/1FAIL, harness expected wrong phone normalization after real201 |
| Explicit `... continue` on known Staff | Exit0:19PASS/0FAIL; no repeated create |
| Explicit `... block` | Exit1:3PASS/1FAIL, wrong UI label after real200 and successful persistence assertions; no repeated PUT |
| `... read` after label fix | Exit0:11PASS/0FAIL, Staff/Cinema read-only, normal real login |
| Final `... read` after preflight isolation correction | **Exit0:11PASS/0FAIL** |
| Cumulative journal | **50 PASS check executions,2 historical harness FAIL executions,25 distinct check names**; repeated reads are not50 independent scenarios |
| Actual HTTP journal |197 sanitized response records;11 intentional ADMIN domain write requests including negative cases; exactly one successful Staff create, one reissue, one assignment create; no automatic retry |
| Screenshot evidence |70 capture calls,28 distinct PNG files; repeated read QA refreshed the same filenames |
| `node --check scripts/phase4e-local-integration.mjs` | PASS |
| `pnpm exec eslint scripts/phase4e-local-integration.mjs` | PASS,0 warnings |
| `pnpm exec tsc --noEmit` | PASS exit0 |
| `pnpm lint` | PASS exit0,0 errors,12 unchanged historical target-script warnings |
| `pnpm test` | **230/230 PASS**,0 failed/cancelled/skipped/todo; unit tests are separate fixture-based regression evidence |
| `pnpm build`, full fixture Playwright suite, `mvn verify` | NOT RUN for this test-only task; no application changes. Prior report366 browser/410 backend counts are historical, not current real-E2E evidence |

Final preservation/document checks:792 incoming files unchanged; only four expected pre-existing tooling/docs files differ,0 unexpected differences. Incoming handoff body preserved exactly behind the additive milestone. PowerShell parser0 errors, report0 missing links, `git diff --check` PASS, empty index/unchanged HEAD. Private-value scan across report/docs/harness and textual evidence found0 matches for the actual local passwords/JWT signing secret/AES key. Application listeners3000/8080 stopped; PostgreSQL5432 retained.

Evidence retained locally (Git-ignored): [HTTP/check journal](../../frontend/target/phase4e-real-local-2026-10-15/results.json), [summary](../../backend/target/phase4e-real-local-2026-10-15/summary.json), [final DB metadata](../../backend/target/phase4e-real-local-2026-10-15/lifecycle-final.txt), [before-block metadata](../../backend/target/phase4e-real-local-2026-10-15/lifecycle-before-block.txt), [unit output](../../frontend/target/phase4e-real-local-2026-10-15/unit-tests.txt), [lint output](../../frontend/target/phase4e-real-local-2026-10-15/lint.txt). They contain no passwords/JWT/invitation token/ciphertext.

Selected safe screenshots: [mobile List](../../frontend/target/phase4e-real-local-2026-10-15/list-390.png), [mobile Detail](../../frontend/target/phase4e-real-local-2026-10-15/detail-390.png), [tablet Detail](../../frontend/target/phase4e-real-local-2026-10-15/detail-768.png), [desktop Detail](../../frontend/target/phase4e-real-local-2026-10-15/detail-1440.png), [Add dialog](../../frontend/target/phase4e-real-local-2026-10-15/add-dialog-390.png), [duplicate-email alert](../../frontend/target/phase4e-real-local-2026-10-15/duplicate-email-review-1440.png), [loading](../../frontend/target/phase4e-real-local-2026-10-15/actual-loading-1440.png), [offline error](../../frontend/target/phase4e-real-local-2026-10-15/actual-offline-read-error-1440.png), [revoked detail](../../frontend/target/phase4e-real-local-2026-10-15/blocked-revoked-persisted-1440.png).

## 9. Defects, Reconciliation and Limitations

**No confirmed application defect in exercised workflows.** Two harness defects corrected openly: expected `0…` instead of actual `+84…`; expected `Đã thu hồi` instead of existing `Lời mời đã thu hồi`. Both happened after committed successful mutations; recovery used known-ID GETs, never repeated creates/PUTs. Original failed executions remain in the journal. A relative-path Tee-Object output failure was fixed using an absolute evidence path; it changed no data. The preflight catalogue-scope issue and correction are disclosed in §5.

| Missing evidence | Classification / exact prerequisite |
|---|---|
| SMTP acceptance, inbox delivery, actual received invitation link | BLOCKED/NOT RUN: delivery disabled by instruction, no approved local capture workflow; attempts0 |
| Public password setup204, old-token redemption rejection | BLOCKED: ADMIN APIs do not expose raw bearer tokens; no legitimate delivered link available. Did not decrypt DB payload, invent a token or bypass setup |
| Successful ACTIVE account, ACTIVE→BLOCKED browser dialog | BLOCKED until legitimate setup completes; idempotent BLOCKED API200 is explicitly narrower evidence |
| Real STAFF login/effective-scope admission/Check-in | NOT RUN: STAFF remains BLOCKED/setupfalse; no Booking/Ticket/QR data manufactured |
| HTTPS activation | NOT RUN: configured loopback8443 URL is a valid configuration value; no actual TLS listener/certificate installed |
| Live429/503/5xx, lost write response/concurrent tabs | NOT RUN: no fault injection into production API, artificial outage during writes, exhaustion or unsafe uncertain mutation |
| Full-page/next-page multi-record pagination | Partial coverage: one synthetic Staff; actual page0/page1/size1/20 verified without creating20 unnecessary accounts |

Overall accepted local ADMIN slice is verified with actual services/data. End-to-end onboarding/admission is not proven; **PARTIALLY VERIFIED** accurately preserves that boundary. No financial/provider/Ticket success inferred or exercised.

## 10. Files Created / Modified and Scope

Created: [test harness](../../frontend/scripts/phase4e-local-integration.mjs), this dated report; ignored ACL-restricted `.env.local-test-admin` and ignored target evidence.

Modified only test tooling/documentation: [local launcher](../../backend/scripts/local-test-environment.ps1) adds guarded ProvisionAdmin/Audit and private credential lifecycle; [local JDBC helper](../../backend/scripts/LocalTestEnvironment.java) adds non-secret lifecycle Audit and moves normal role inspection onto the dedicated read-only datasource; [local guide](../development/local-test-environment.md) and [handoff](../ai/current-handoff.md) receive additive current testing notes. No files moved.

Incoming796-file hash baseline includes existing tracked/untracked source/docs and private env files. All application/backend/frontend sources, dependencies, migrations, contract/requirements, previous reports and private existing env contents remain byte-for-byte preserved; only the listed tooling/docs are intentionally updated. No protected direct DML, grants/configuration repair, seed/reset or new API. V14 remains head.

## Convention Compliance

Checked against [canonical project conventions](../development/project-conventions.md), including the report itself.

| Area | Result | Evidence |
|---|---|---|
| Folder/file/report naming | PASS | Existing scripts/target locations, kebab-case MJS/PS task filename, existing PascalCase Java helper, dated kebab-task report |
| Identifiers/imports | PASS | English identifiers; installed Node/Playwright imports; no application route/import changes |
| API/domain/status/identity | PASS preservation | Exact eight endpoints, existing serialized statuses, string IDs; no new business vocabulary |
| Database/environment | PASS final tooling | Fixed dedicated target; normal runtime restrictions and V14; initial catalogue scope deviation explicitly disclosed/corrected |
| Credentials/logging | PASS | Ignored private file/Windows ACL, password never argv/output, safe journal/screenshots, no trace/HAR |
| Documentation/history | PASS | Additive current notes/new report; historical reports/requirements/contracts preserved |
| Git/scope | PASS | Existing uncommitted work preserved, index empty, same HEAD; no application/Stitch/database configuration changes |

No convention exception or requirement change introduced. Early preflight deviation is a corrected test-tool defect, not an approved permanent exception.

## 11. Next Recommended Step

Separately authorize a legitimate **local-only captured invitation and HTTPS/onboarding test path**, then verify public password setup, ADMIN Activate/Block dialogs, STAFF login and actual permission changes. Do not expose/decrypt invitation bearer tokens merely to bypass delivery. Preserve the current test records and use known owned IDs; normal read-mode QA performs no Staff/Cinema writes. Do not rerun one-shot write/continue/block phases or reset the database. Stop here; no automatic external SMTP/Neon/Check-in task.
