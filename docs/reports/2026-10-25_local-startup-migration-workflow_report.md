# Windows local startup and migration workflow

## 1. Task Information

- Date: **2026-10-25**. Type: local tooling implementation and real execution verification.
- Status: **IMPLEMENTED AND VERIFIED** for database migration/status and local service startup.
- Actual target: **127.0.0.1:5432/smartcinema_phase4e_test**. Installed **V15**, source **V15**, pending **0**, failed **0**, checksums valid.

## 2. Requested Work

Replace manual local migration tracking with one Windows startup command and one read-only status command. Install V15 through separately approved existing local administrator access; keep Spring Boot restricted and preserve application data/integrity.

```powershell
# From repository root:
.\scripts\local-dev.ps1
.\scripts\local-dev.ps1 -Action Status
```

## 3. Documents Reviewed

[AGENTS](../../AGENTS.md), Development/Backend workflows and applicable rules, [conventions](../development/project-conventions.md), [handoff](../ai/current-handoff.md), [local guide](../development/local-test-environment.md), [Phase5B-2 findings](2026-10-25_admin-concession-migration-authority-verification_report.md), existing Flyway/application/POM/launch configuration, V15 and the approved ADMIN Concession contract. Existing database integrity/ownership context remains unchanged.

## 4. Requirements Traceability

| Requirement/source | Result |
|---|---|
| User requirements1–4/9–12: discover versions, validate, migrate before boot, repeatable Windows startup | PASS; real V14→V15, repeated current-schema starts and HTTP/browser evidence |
| User requirements5–6: separate existing administrator, explicit first-operation approval | PASS; user explicitly replied **“Phê duyệt thao tác nêu trên”** to the exact postgres/private-file/V15/narrow-EXECUTE plan before administrator access |
| User requirements7–8/13: integrity, fixed existing DB, no resets/new roles/remote/deploy | PASS; no role changes, V1–V15 source preserved, original-role snapshot unchanged, application-data fingerprint unchanged |
| Integrity design v1.0 §2; SRS v1.2 SR-CONCESSION-02/03; FR-AUDIT-006 | Owner/ACL/guard and snapshot-bearing data preserved; no new business behavior. Full catalog audit/snapshot behavior tests are outside this startup task |

## 5. Implementation Summary

- `LocalDatabase` uses the installed Flyway API and a fixed-target DataSource that verifies physical server/database/schema/session identity on **every** connection. Status uses the restricted app with PostgreSQL-enforced read-only connections.
- Source versions are discovered dynamically. Applied history/checksums are validated; failed, missing, changed or future applied migrations block startup. Only pending source files are allowed during pre-migration validation and must be installed before boot.
- Pending migrations require explicit `MIGRATE` confirmation; the approved automation switch is `-ApproveMigrations`. Up-to-date startup skips migration and does **not load administrator credentials**.
- Existing local `postgres` credentials were copied, after approval, into ignored `backend/.env.local-test-migration`, with owner-only Windows ACL (protected inheritance, one allow rule). Base runtime/remote configuration was not overwritten.
- A short-lived standalone Flyway process installed unchanged V15, then issued the approved single `GRANT EXECUTE` on the protected Concession wrapper to the dedicated app. No temporary owner/schema grants, role memberships or role attribute changes.
- Spring receives a separate owner-only generated profile containing app credentials for datasource and read-only Flyway validation. Administrator credentials never reach Spring. Hibernate validation and disabled provider/mail/cleanup configuration remain intact.
- PowerShell supervises backend/frontend/readiness through the existing `concurrently` dependency's Node API, handling this workspace's spaces/parentheses correctly. Real backend, frontend and matching API proxy responses are required for READY. A service exit stops its siblings; Ctrl+C stops the owned process trees. Busy ports are rejected without killing unrelated services.

## 6. Files Created

- [LocalDatabase.java](../../backend/scripts/LocalDatabase.java)
- [local-dev.ps1](../../scripts/local-dev.ps1)
- [local-dev-runner.mjs](../../scripts/local-dev-runner.mjs)
- This report. Private inputs, compiled tools, fixtures and evidence are ignored under `.env.*`/`backend/target/local-dev/`.

## 7. Files Modified

- [LocalTestEnvironment.java](../../backend/scripts/LocalTestEnvironment.java): retain role/isolation/Staff-table checks; discover contiguous source versions instead of a fixed V15 maximum. Existing bootstrap methods were not invoked.
- [README](../../README.md), [local guide](../development/local-test-environment.md), [handoff](../ai/current-handoff.md): current command pair and evidence; dated historical reports retained.

No frontend/backend business source, API contract, migration SQL, environment base file, dependency manifest or historical report changed.

## 8. Actual Verification

| Check | Result |
|---|---|
| Initial real status | PASS: V14/sourceV15, pendingV15, failed0, applied-history checksums valid; read-only app |
| Approved real migration | **PASS: exactly1 applied**, V15, PostgreSQL18.4, at approximately10:41:52+07:00; V15 stored/source checksum **886021656** |
| Historical migrations | **14/14 original checksums unchanged**; final15/15 stored/source matches |
| Data/roles/ACL | PASS: all application-table fingerprint unchanged across migration; old-role snapshot unchanged; relevant memberships0; wrapper hold-owner/SECURITY DEFINER/safe search_path; PUBLIC EXECUTE absent; app narrow EXECUTE present |
| Runtime forbidden privileges | PASS: Concession INSERT/UPDATE/DELETE/TRUNCATE=false; raw configure EXECUTE=false; owner SET=false |
| Repeated normal startup | **3 successful starts**, all after schema became current; migration skipped without loading administrator input. One earlier child-launch attempt failed on Windows quoting and was fixed |
| Real HTTP smoke | **4/4 expected outcomes**: backend genres200; frontend home200; proxy genres200/matching backend; anonymous ADMIN Concession401 |
| Real browser smoke | **1/1 PASS**, installed Microsoft Edge via Playwright, no API interception; home200, nonempty Vietnamese heading/title |
| Service failure supervision | PASS: stopped only this task's Next process; supervisor stopped backend/health and freed both ports |
| Ctrl+C | PASS: interrupted the second successful run; ports3000/8080 free afterward. Final QA services also stopped after verification |
| Safety negative checks | **3/3 PASS**: conflicting DB_URL rejected; unapproved migrate rejected while V15 pending; checksum-corrupt **private copied fixture** rejected read-only with exact Flyway mismatch and startup stopped |
| Java/PowerShell/Node | PASS: real Java compilation, PowerShell parser0 errors, Node syntax check, actual worker execution |
| Full backend/frontend regression/build | NOT RUN; application business source unchanged. Spring's normal compile/test-compile and Hibernate startup succeeded; no claim of a new unit/full E2E regression count |
| Twelve ADMIN Concession PostgreSQL feature cases | **NOT RUN**; separate protected fixture/audit authority remains unresolved, no membership was granted to satisfy tests |

Evidence: [final status](../../backend/target/local-dev/status-final.log), [post-migration history/owner/ACL/checksum audit](../../backend/target/local-dev/after-migration-authority.log), [repeated startup](../../backend/target/local-dev/repeat-startup.log), [final startup](../../backend/target/local-dev/final-startup.log), [HTTP evidence](../../backend/target/local-dev/http-startup-evidence.json), [real Edge evidence](../../backend/target/local-dev/browser-startup-evidence.json), [checksum rejection fixture](../../backend/target/local-dev/verification/checksum-fixture/checksum-rejection.log). Ignored local evidence, no credential files linked.

Development iterations disclosed: one Java checked-exception compile error, unsupported Flyway logger options and pre-migration pending-validation policy were corrected before successful status; first child launch exposed PowerShell quoting and was replaced with the existing Node API. An initial fixture command used the wrong classpath root, and relative Tee output resolved against the script's temporary cwd; harness paths were corrected. Playwright's default bundled headless shell was absent; the already installed Edge was used successfully without installing a browser. No failed migration, repair, SQL replay or production mock was introduced.

## 9. Requirement Reconciliation

PASS for the requested startup/migration scope: actual V15 installation, truthful dynamic version/status display, validation/failure gate, separate credentials, real service readiness and repeatability. No success inferred from source review alone. Feature-level catalog mutation/audit/concurrency verification is not established by startup.

## 10. Deviations / Conflicts

The user's new administrator-access instruction and explicit approval supersede the previous task's prohibition on using an unapproved operator. Existing restricted-role snapshot and integrity guards remain active. No canonical convention exception required; historical bootstrap/default/remote instructions remain history and are not invoked by the new command. No additional database or role hierarchy created.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md), including this report: PASS for kebab-case script/report naming, PascalCase Java helpers, existing directories/domain identifiers, additive handoff and valid links. API/status/database naming unchanged. Unrelated work and historical migrations/reports preserved; no staging/commit/push/deploy.

## 11. Known Limitations

PostgreSQL and installed dependencies must already exist; missing prerequisites fail clearly. New migration batches require explicit confirmation. Deliberately failing privileged DDL or stopping PostgreSQL was not used as a test; checksum and approval failures were exercised safely. Existing ADMIN Concession protected-fixture tests still need their own reviewed execution path. This is a local development workflow, not deployment or full feature verification.

## 12. Next Recommended Step

Use the two commands above for normal local work. If resuming Phase5B verification, resolve only the test fixture/audit authority separately, without widening runtime or granting cluster-wide owner membership. Do not start frontend feature implementation automatically.
