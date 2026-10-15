# Phase 4E — Local Integration Smoke Test

## 1. Task Information

- Date: **2026-10-14**, Asia/Saigon. Module: ADMIN Staff Management. Type: local integration verification.
- Final outcome: **BLOCKED**. Environment preflight and anonymous real-frontend checks completed; authenticated Spring Boot/Staff/database workflows could not safely begin.
- No application source, environment configuration, migration, business data, historical report or Stitch changes. No staging/commit/push/deployment.
- Existing uncommitted Phase4E implementation and previous audit reports were preserved. This report does not revoke the fixture-backed frontend implementation result.

## 2. Requested Work

Verify Phase4E against the real local Spring Boot API and an isolated approved development/test database. Use an approved test ADMIN and recipient; create one uniquely identified Staff, inspect persisted BLOCKED/detail/invitation state and activation-before-setup rejection, then test assignment history/status only if a safe test Cinema exists. Actual password setup/SMTP/Check-in require their own explicitly available test prerequisites.

The user's safety rule says: **“Stop before any mutation if the environment is not clearly isolated and approved.”** This prevents normal backend startup too when it would run Flyway and background writers against the currently configured remote database. No values or credentials were invented to bypass that boundary.

## 3. Documents Reviewed

[AGENTS](../../AGENTS.md), [Development Workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [project conventions](../development/project-conventions.md), Frontend/Backend/Review workflows, applicable Document/Requirement Traceability rules, frontend-local AGENTS and [report template](templates/TASK_REPORT_TEMPLATE.md).

[README local workflow](../../README.md#local-development), root/frontend package scripts, [development ADMIN provisioning](../development/development-admin-provisioning.md), [Staff administration contract v1.0](../api/staff-invitation-administration-contract-v1.0.md), [onboarding foundation](../development/staff-onboarding-and-checkin-foundation.md), [Gmail SMTP setup](../development/gmail-smtp-setup.md), [Phase4E implementation report](2026-10-14_admin-staff-management-frontend-implementation_report.md), [frontend guide](../development/admin-staff-management-frontend.md), relevant [BRD v1.2](../brd/brd-v1.2.md)/[SRS v1.2](../srs/srs-v1.2.md).

Inspected ignored local environment files without outputting their values, [backend configuration](../../backend/src/main/resources/application.properties), [Next.js rewrite](../../frontend/next.config.ts), actual [invitation settings](../../backend/src/main/java/com/smartcinema/staff/StaffInvitationSettings.java), [encryption boundary](../../backend/src/main/java/com/smartcinema/staff/StaffInvitationCrypto.java), [delivery worker](../../backend/src/main/java/com/smartcinema/staff/StaffDeliveryWorker.java), [Seat Hold cleanup](../../backend/src/main/java/com/smartcinema/seat/SeatHoldCleanup.java) and V13 table definitions.

## 4. Requirements Traceability

| Actual requirement | Relevant verification | Result |
|---|---|---|
| BRD v1.2 BR-002/004; SRS FR-AUTH-007 | ADMIN authorization | PARTIAL: anonymous real UI guard observed; real authenticated backend RBAC BLOCKED |
| BRD BR-003/053/055; SRS FR-ORG-002/003 | Limited Staff/Cinema assignment management and retained history | BLOCKED: required database/API/test actor unavailable safely |
| SRS FR-AUTH-006 | BLOCKED creation and activation prerequisites | BLOCKED: no Staff mutation attempted |
| SRS NFR-SEC-010/011 | Secret protection and safe output | PASS diagnostic scope; no credentials/raw invitation/user data emitted |
| SRS NFR-UX-004 | Understandable errors | PARTIAL: anonymous guard observed; authenticated business errors NOT RUN |
| User smoke-test safety constraints | Isolated approved environment before writes | PASS: stopped before startup/mutation on remote target |

No business requirement or endpoint is proposed or changed by this report.

## 5. Environment and Service Readiness

### Documented commands

From repository root, `pnpm dev` supervises `mvn spring-boot:run` in backend and `pnpm dev` in frontend. Defaults are backend port8080 and frontend port3000. PostgreSQL must already run. Separate frontend/backend commands are explicitly supported by README. Normal backend startup runs Flyway; `spring.jpa.hibernate.ddl-auto=validate` is not a migration bypass.

`pnpm admin:dev` is a separate database-mutating provisioning command, not normal startup; **NOT RUN**. `pnpm seed:demo`, manual migrations, new databases/schemas and reset/cleanup commands were also **NOT RUN**.

| Component / configuration | Actual evidence | Readiness |
|---|---|---|
| Java / Node / pnpm / Maven | Java21.0.11, Node24.17.0, pnpm12.4.1; Maven command installed | PASS tooling |
| PostgreSQL local listener | `pg_isready -h 127.0.0.1 -p 5432`: accepting connections | PASS listener only; not authenticated local application DB verification |
| Effective backend datasource | `backend/.env` DB_URL targets **remote Neon**; DB username/password configured; no DB process overrides or root `.env` observed | **BLOCKED** for local mutations: no approved isolated local datasource selected |
| Configured remote database connectivity | Direct PostgreSQL JDBC connection with read-only mode; server confirms `transaction_read_only=on`, PostgreSQL18.6 | PASS read-only connection; not a local integration PASS |
| Configured remote schema | Public Flyway successful head **V12** | BLOCKED for current Staff API schema; source migration head remains V14 |
| Required Staff tables in configured schema | `cinema_assignments`, `staff_onboarding`, `staff_invitations`, `staff_invitation_deliveries`, `staff_rate_limits`: all missing | BLOCKED; no manual migration applied |
| ADMIN input | DEV_ADMIN_EMAIL/DEV_ADMIN_PASSWORD are present in ignored backend input; values withheld | No isolated local account approval/login verified; credentials were not used |
| Invitation prerequisites | STAFF_ACTIVATION_BASE_URL, STAFF_INVITATION_ENCRYPTION_KEYS, STAFF_INVITATION_ACTIVE_KEY_ID absent from file/process input | BLOCKED Create/reissue prerequisites; source would fail closed503, not runtime-tested here |
| SMTP | SMTP_USERNAME/SMTP_APP_PASSWORD/MAIL_FROM_ADDRESS absent; documented defaults use Gmail587 but delivery defaults false | NOT READY for real mail; no approved recipient/mailbox verified |
| Local mail capture | No listeners on documented Mailpit SMTP1027/UI8027 | NOT RUN; no capture service started/configured |
| Frontend configuration | `.env.local` empty; existing rewrite defaults to `http://localhost:8080/api/v1/...` | PASS inspected rewrite; backend listener unavailable |
| Spring Boot | No listener8080 before/after; not started | BLOCKED deliberately, not a failed Java startup |
| Frontend | Existing `pnpm dev` from frontend, Next16.3.5 ready in4.7s at localhost3000 | PASS startup; stopped with Ctrl+C after checks |

Starting root `pnpm dev` now would point Flyway at remote V12 and apply V13/V14. In addition, `seat-hold.cleanup-enabled` defaults true and its scheduled worker can mutate expired records. A local Spring Boot process does not make its database local or isolated. No flags were changed to force a read-only application mode.

The JDBC diagnostic did not start Spring/Flyway/Hibernate/jobs. It opened a read-only transaction, checked schema metadata, then rolled back/closed. It did not read account records, tokens, mail content or business data.

## 6. Files Created / Evidence

- This dated report is the only new non-ignored deliverable.
- Ignored diagnostic helper: `backend/target/phase4e-integration-smoke-2026-10-14/StaffSmokePreflight.java`, Java source-launch with installed PostgreSQL JDBC42.7.13. SQL is SELECT-only, read-only server state asserted, credentials read privately from existing input, errors limited to SQLSTATE.
- Ignored browser helper: `frontend/target/phase4e-integration-smoke-2026-10-14/browser-smoke.mjs`, installed Edge through Playwright; no HTTP fixtures, route interception, fabricated session, login, POST or PUT.
- [Browser JSON evidence](../../frontend/target/phase4e-integration-smoke-2026-10-14/browser-evidence.json).
- Three inspected1440×1000 screenshots: [anonymous Staff List](../../frontend/target/phase4e-integration-smoke-2026-10-14/staff-list-anonymous.png), [anonymous Staff Detail](../../frontend/target/phase4e-integration-smoke-2026-10-14/staff-detail-anonymous.png), [empty Login form](../../frontend/target/phase4e-integration-smoke-2026-10-14/login.png).

These artifacts are local/ignored, not committed screenshots or reproducible evidence of authenticated Staff workflows on another checkout. No sensitive inputs are visible.

## 7. Files Modified

No pre-existing project/environment/report files were modified by this smoke task. Existing uncommitted application/doc changes are from Phase4E implementation and remain intact. Backend/frontend environment SHA-256 matches preflight; existing Git index and HEAD unchanged. Next.js compilation generated only ignored runtime artifacts. The pre-existing PostgreSQL service was left running; only this task's frontend process/browser were stopped.

## 8. Real Requests and Functional Verification

| Request / workflow | Observed result | Classification |
|---|---|---|
| Real browser GET `/admin/staff` on3000 | HTTP200; visible **Cần đăng nhập**, no injected session or authenticated data | PASS anonymous frontend only |
| Real browser GET `/admin/staff/1` on3000 | HTTP200; same anonymous guard | PASS route guard only; `/1` is not a claimed existing/owned/test Staff ID and no Staff lookup was performed by the guard |
| Real browser GET `/login` on3000 | HTTP200; **Chào mừng bạn trở lại** and native Login form | PASS render only; no credential submission |
| GET3000 `/api/v1/admin/staff?page=0&size=20` without auth | HTTP500 from Next proxy; ECONNREFUSED for localhost8080 | FAIL transport due deliberate backend-startup block; not a Spring401/503 or Staff response |
| Direct GET8080 `/api/v1/admin/staff?page=0&size=20` | Connection unavailable | BLOCKED before HTTP API completion |
| ADMIN login/identity; authenticated List/page0/page1/loading/error | NOT RUN | BLOCKED: no approved isolated backend/actor |
| POST `/api/v1/admin/staff` and persisted BLOCKED account | NOT RUN | BLOCKED before mutation |
| GET `/api/v1/admin/staff/{staffId}` and invitation status | NOT RUN | BLOCKED; no test Staff identity created |
| POST `/{staffId}/invitations` | NOT RUN | BLOCKED; no email/invitation writes |
| PUT `/{staffId}/status`, including ACTIVE before setup rejection | NOT RUN | BLOCKED; disabled UI/old fixtures are not proof of real server rejection |
| GET `/{staffId}/cinema-assignments` / supporting Admin Cinema catalogue | NOT RUN | BLOCKED; no safe test Cinema was identified or selected |
| POST `/{staffId}/cinema-assignments`; PUT `/{staffId}/cinema-assignments/{assignmentId}/status` | NOT RUN | BLOCKED; no assignment/history mutation |
| Actual password setup, SMTP delivery, Staff login/Check-in | NOT RUN | Missing isolated actor/mailbox/configuration and explicit external-flow authorization |

Paths abbreviated after the Staff prefix in the final rows refer to the unchanged contract, not new endpoints. None of the eight Staff APIs completed a request inside Spring Boot during this task. No authenticated200/201, persisted account, invitation delivery, activation409 or assignment history/status result is claimed.

One diagnostic browser run initially waited for the wrong Login heading (“Đăng nhập” instead of actual “Chào mừng bạn trở lại”) and timed out. Corrected only the ignored helper and reran successfully, exit0. This was a harness defect, not an application integration defect. The frontend process exit after Ctrl+C was deliberate teardown, not startup failure.

The previous implementation's230 unit/366 Playwright PASS counts remain **historical fixture-backed regression evidence**. They were not rerun or relabeled as real integration proof. No mocked API test was used in this smoke task. Typecheck/lint/build/backend regression reruns were NOT RUN because application code was unchanged and this task concerns live integration readiness.

## 9. Requirement Reconciliation / Defects

Preflight and secret/data protection PASS. Anonymous real frontend checks PASS. **Core requested authenticated integration BLOCKED**, not end-to-end verified or partially successful Staff provisioning.

No frontend/backend implementation defect was established by real authenticated API behavior. Confirmed blockers are environmental: remote/unapproved datasource, applied V12 without Staff tables, missing invitation settings and unavailable approved local actor/recipient. The proxy500 is explained by absent Spring Boot, not evidence that Spring Staff code returns500.

## 10. Deviations / Conflicts

Did not start both services through the root runner because doing so would breach the user's no-shared-mutation instruction. Used the separately documented frontend command only. No database configuration override, disposable schema provisioning, manual Flyway execution, cleanup, invented credentials, local SMTP substitution or automatic command retries.

A clarification requested the location of an already configured isolated local database/test ADMIN through a safe mechanism; none was supplied during these independent checks. That missing information is not permission inferred from timeout. Existing documented historical local regression databases are not automatically authorized/configured for this smoke task.

## Convention Compliance

| Area | Result | Evidence |
|---|---|---|
| Workflow/traceability | PASS | Mandatory readings before evidence/report; real IDs only |
| Report/folder naming | PASS | New YYYY-MM-DD_kebab-task_report.md; diagnostic folders kebab-case under ignored target |
| Diagnostic identifiers | PASS | Java PascalCase file/class; English identifiers; no application architecture change |
| API/domain terminology | PASS | Existing Staff/Cinema/status vocabulary and exact existing paths |
| Secret/environment protection | PASS | Values withheld; unchanged environment file hashes; no password/token screenshots |
| Database/migration convention | NOT APPLICABLE to changes | No schema/data writes; source V14 and remote applied V12 distinguished |
| Documentation/history | PASS | New report, checked relative evidence links/encoding; prior reports/handoff preserved |
| Source/Git/deployment | PASS | No application edits/staging/commit/push/deploy; prior dirty tree retained |

Existing historical filename conventions were left untouched; no new exception or rule change.

## 11. Untested External Dependencies

Approved local DB identity/schema/access role, current ACTIVE ADMIN authentication, test recipient/safe Cinema, HTTPS activation target and AES key configuration, SMTP sender/transport/inbox receipt, public password redemption and actual Staff admission all remain unverified. A reachable remote PostgreSQL listener is not permission to write. Missing credential/configuration presence is distinguished from authentication failure; no login/password guess was attempted.

## 12. Minimum Prerequisites / Recommended Fixes

1. Provide an explicitly approved, existing isolated development/test database configuration and migration readiness, preferably local PostgreSQL. A dedicated private Neon test branch could also qualify if its isolation and use are explicitly confirmed; remote hosting alone does not establish that a database is shared or production. Any datasource switch or normal-startup migration requires a separately approved environment step; do not silently overwrite backend/.env or apply V13/V14 to the current remote target without that confirmation.
2. Confirm an existing dedicated ACTIVE ADMIN test account for that database and a safe credential-access mechanism. Current ignored DEV_ADMIN values alone do not establish local isolation or authorization. Provision a new account only if independently authorized; never invent credentials or modify real accounts.
3. Supply approved STAFF_ACTIVATION_BASE_URL (HTTPS path), STAFF_INVITATION_ENCRYPTION_KEYS and STAFF_INVITATION_ACTIVE_KEY_ID through the existing secure configuration mechanism. Create/reissue require these even with delivery disabled. Do not print keys or enable delivery automatically.
4. Approve the unique test Staff recipient and identify a safe existing test Cinema if assignment writes are desired. Real delivery/password setup/Check-in additionally need an approved mailbox and transport/capture/HTTPS/access configuration; otherwise leave those checks NOT RUN.
5. Once prerequisites are settled, start the documented runner, confirm Spring and Next health, authenticate normally, then perform each explicit mutation once and verify persistence through supported GETs. If any result is uncertain, do not replay its POST/PUT.

**STOP: no fixes, migrations, environment overrides or further mutations applied.**
