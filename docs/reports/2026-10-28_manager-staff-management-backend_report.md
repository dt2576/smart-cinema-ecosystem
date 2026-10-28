# MANAGER Staff Management Backend implementation report

## 1. Task information

Date:2026-10-28, Asia/Saigon. Backend-only implementation.
**Outcome: PASS — approved scoped Staff assignment operations implemented and verified.**
[API contract v1.0](../api/manager-staff-management-contract-v1.0.md).
Only database target: `127.0.0.1:5432/smartcinema_phase4e_test`.

## 2. Documents and approved scope

Read AGENTS.md, canonical development/backend workflows, conventions and applicable
coding/document/traceability rules; current handoff; Project Scope v1.0 Manager
scope; Business Analysis v2.1 §38/39; BRD/SRS v1.2; System Analysis & Design v1.1
DOCX Manager use cases; actual ADMIN Staff, onboarding, invitation, assignment,
security and Manager implementation; V13/V14/V17 and existing contracts/reports.

The specific approved write capability is Cinema assignment, not the complete
ADMIN account lifecycle. Manager may grant a scoped existing Staff another owned
Cinema and deactivate/reactivate the specific assignment. Account creation,
invitations, profile edits, global activation/blocking and role changes remain
ADMIN-only: no explicit Manager delegation exists for those account-wide effects,
particularly when Staff has multiple Cinema memberships. No parallel invitation
or account system was created.

## 3. Requirements traceability and reconciliation

| Actual source | Implementation and verification | Result |
|---|---|---|
| BRD BR-002/003; SRS FR-AUTH-007/008, FR-ORG-005; NFR-SEC-002/003/006 | Signed role + current ACTIVE account/effective Cinema assignment; scoped queries and locked writes; real role/revocation/foreign tests | PASS |
| BRD BR-053/055; SRS FR-ORG-002/003; System Analysis UC-MGR-016/017 | Grant/deactivate/reactivate existing scoped Staff, immutable assignment identity/effectiveAt and retained history | PASS |
| SRS FR-CINEMA-010; UC-MGR-015 | Existing current Staff list retained; additive minimal profile and Cinema-specific history | PASS |
| SRS FR-AUDIT-003 | Real Manager actor, existing assignment events, same transaction as domain change; rollback verified | PASS |
| SRS FR-ORG-004 | Existing ADMIN account status policy preserved; Manager assignment status restricts that scope without changing the shared account | PASS for approved boundary |
| Invitation/activation/privacy policy, historical Staff contract v1.0 | ADMIN controls retained; real protected reissue/password/activation regression and no encrypted payload left deliverable by QA lifecycle case | PASS for tested backend behavior |
| HR/payroll/shifts, Booking/Reporting/Dashboard, frontend | Explicit task exclusions | NOT APPLICABLE |

No requirements or historical contracts were rewritten and no requirement IDs,
permissions, email-success states or business transitions were invented.

## 4. Implemented APIs and ownership

Four new endpoints under `/api/v1/manager/cinemas/{cinemaId}`:

| Method | Path | Contract |
|---|---|---|
| GET | `/staff-assignments` | Scoped `Membership[]` with minimal Staff profile and current/future/inactive assignments, numeric assignment ID order |
| GET | `/staff/{staffId}` | Minimal profile plus history only for the path Cinema |
| POST | `/staff/{staffId}/cinema-assignments` | Exactly `{cinemaId, effectiveAt}`; source Staff resource and destination independently authorized;201 + owned-detail Location |
| PUT | `/staff/{staffId}/cinema-assignments/{assignmentId}/status` | Exactly `{status: ACTIVE|INACTIVE}`; specific Staff/assignment/path Cinema required |

Existing GET `/api/v1/manager/cinemas/{cinemaId}/staff` retains its original current
effective ACTIVE-only assignment semantics and response. No global account lookup.
An existing Staff assignment relates the target resource to the source Cinema;
an initial placement outside the Manager's known scope still requires ADMIN.
Historical membership supports scoped reactivation, not global account authority.
Granting another owned Cinema does not silently remove another membership.

All IDs are canonical positive bigint strings; no JavaScript-number identity.
64KiB exact-key/duplicate/trailing JSON validation. Offset instants support year1–9999
and microseconds; responses UTC. Assignment identity/type/effectiveAt remain
immutable. Future ACTIVE does not mean current admission. BLOCKED Staff can receive
assignments without activation, matching existing ADMIN domain behavior.

Reads use bound SQL scope predicates in read-only REPEATABLE READ. Writes use
READ COMMITTED and recheck locked actor/account/source/destination in PostgreSQL.
Revocation affects subsequent requests with unchanged JWT. A valid actor with
foreign/missing resource gets404 uniformly; no current effective scope or inactive
actor gets403. Wrong namespace roles are denied by existing Spring security.
Safe no-store errors400/401/403/404/409/503; no private SQL/payload reflected.
No automatic retry/idempotency or extra rate-limit policy introduced.

## 5. Shared domain writer and V18 approval/execution

Initial read-only preflight: actual/source V17, no pending/failed migration,
17 installed checksums valid. Runtime direct assignment DML and protected-owner
SET denied; existing Staff writer owner/security-definer/search_path verified.

Before privileged operations, the user explicitly approved **V18 and the stated
fresh QA fixture scope**. Only then loaded the existing private local postgres
connection and executed:

```powershell
# From backend, existing dependency classpath:
java -cp $cp com.smartcinema.manager.LocalManagerStaffTestSupport before
# From repository root:
.\scripts\local-dev.ps1 -ApproveMigrations
# From backend:
java -cp $cp com.smartcinema.manager.LocalManagerStaffTestSupport grant
```

The helper requires both the new `MANAGER_STAFF_OPERATOR_APPROVED=true` approval
acknowledgement and existing local-helper safety acknowledgement. Exact target,
private credential ACL, restricted runtime and disabled provider/mail/cleanup
preflights remain. These flags do not grant approval by themselves.

Flyway installed **one forward V18**. V1–V17 source/history/checksums preserved.
V18 adds no table/column/role/membership and does not change integrity guards:

- Extracts the exact V13 assignment domain body to private `staff_apply_assignment`.
  Database comparison proves it differs only by removal of its ADMIN authorization
  call; authorization is now retained in the unchanged-signature ADMIN wrapper.
- Existing `staff_assign_cinema` keeps original owner/ACL and `staff_lock_admin`,
  delegating to the shared core. Other existing function definitions are unchanged.
- Adds `manager_assign_staff` with current Manager/Staff checks and source/
  destination assignment locks, then calls that same core. Sorted User locks
  serialize with existing ADMIN Manager/Staff administration. Both revocation/write
  orderings were verified using actual PostgreSQL blocking PIDs.
- Existing `ASSIGNMENT_GRANTED/ACTIVE/INACTIVE` audit append is reused with the
  real Manager actor and destination metadata. No audit whitelist was weakened.

Both new functions and the existing wrapper are owned by existing NOLOGIN
`smart_cinema_staff_owner`, SECURITY DEFINER, fixed search_path, PUBLIC EXECUTE
denied. Runtime can execute the intended wrappers; core EXECUTE is denied.
Only extra local provisioning:

```sql
GRANT EXECUTE ON FUNCTION public.manager_assign_staff(bigint,bigint,bigint,bigint,timestamptz,bigint,text)
TO smartcinema_phase4e_app;
```

No runtime table DML or role/owner authority added. Existing unrelated Auth
permissions are preserved, not redefined. Final read-only status: **installed/source
V18,pending0,failed0,18 checksums valid**. Migration installation and grant actually
executed; no mocked/PostgreSQL-source-only verification claim.

## 6. Actual application and tests

Existing local workflow started Spring Boot8080 and Next3000; backend/frontend/
real API proxy health all PASS. No environment/source configuration changes or
Neon connection. VNPAY, delivery and cleanup remained disabled.
The owned startup session was stopped after verification; neither port8080 nor
3000 remained listening. The final read-only preservation check after shutdown
also returned `MANAGER_STAFF_PRESERVATION=PASS`.

Executed from `backend/`, using the existing private local runtime profile:

```powershell
mvn '-Dtest=*Tests,!*PostgresTests' '-Dspring.config.location=optional:file:target/local-dev/private/runtime.properties' '-Dspring.flyway.enabled=false' verify
# After explicit approval, V18 installation and narrow grant:
$env:MANAGER_STAFF_OPERATOR_APPROVED='true'
$env:ADMIN_MANAGER_OPERATOR_APPROVED='true'
$env:MANAGER_STAFF_DB_TESTS='true'
$env:MANAGER_STAFF_HTTP_TESTS='true'
mvn '-Dtest=ManagerStaffPostgresTests,ManagerStaffHttpPostgresTests' '-Dspring.config.location=optional:file:target/local-dev/private/runtime.properties' '-Dspring.flyway.enabled=false' test
```

| Actual check | Result |
|---|---|
| Baseline non-Postgres regression | **216 PASS**,0 failures/errors/skips |
| Implemented non-Postgres regression, jar/repackage | **227 PASS**,0 failures/errors/skips;11 new MVC/service cases |
| Initial real PostgreSQL suite | 11/11 PASS; included in expanded suite below, not extra unique cases |
| Expanded final real PostgreSQL | **12/12 PASS**,0 failures/errors/skips |
| Real signed-JWT HTTP | **4/4 PASS**,0 failures/errors/skips |
| Distinct selected final tests | **243 PASS** =227+12+4;27 new over216 baseline |
| Protected-function ACL/domain-body and original data checks | PASS |
| Frontend/browser/Stitch | NOT RUN; excluded from backend task |
| Full historical destructive PostgreSQL suites | NOT RUN on preserved operational local schema; targeted approved real tests used instead |

The227 includes existing ADMIN Staff invitation/security and Manager authorization
unit regressions. New real SQL/HTTP cover owned/cross-Cinema/multi-assignment scope,
inactive/future/revoked actor, nested-ID tampering, STAFF/CUSTOMER/ADMIN role denial,
forged role/account fields, duplicates, immutable time/history, rollback/audit,
runtime privilege denial, current Staff-list compatibility and concurrency.
Actual ADMIN protected reissue invalidates the first token, private password setup
leaves BLOCKED, and ADMIN activation remains separate; no test claims SMTP delivery.
Existing ADMIN assignment endpoints also performed real creates/reads/status changes.

Real HTTP evidence: **68 management API requests**,200×11,201×22,400×6,401×4,
403×18,404×6,409×1. Ordinary signed JWT login, no HTTP/JWT mocks or interception in
these tests. Only method/path/status logged; no credentials/header/token payloads.
No failing production test or implementation defect was found in executed checks;
no skipped tests, automatic mutation retries or guard bypass to manufacture PASS.

## 7. Data preservation and files

Read-only before/after fingerprints cover all original rows in23 application/
history tables, roles/memberships and function/ACL definitions. All unchanged
except the explicitly approved ADMIN assignment wrapper body; the shared core's
domain body is exact. Financial/Ticket/evidence/reconciliation and catalog counts
preserved; no new Hold/Booking/Payment/SUCCESS/PAID/Ticket was needed or fabricated.
Only clearly named fresh QA accounts/Cinemas/Staff/assignments/audits were added;
status/password changes targeted those new accounts only. Fixtures retained without
destructive cleanup. Test-only invitation ciphertext was revoked/consumed before
commit; mail delivery stayed disabled. Normal fresh QA authentication adds sessions.

Created:

- `backend/src/main/java/com/smartcinema/manager/ManagerStaffController.java`,
  `ManagerStaffService.java`, `ManagerStaffRepository.java`.
- `backend/src/main/resources/db/migration/V18__enforce_manager_staff_assignments.sql`.
- `backend/src/test/java/com/smartcinema/manager/ManagerStaffControllerTests.java`,
  `ManagerStaffServiceTests.java`, `ManagerStaffPostgresTests.java`,
  `ManagerStaffHttpPostgresTests.java`, `LocalManagerStaffTestSupport.java`.
- New API contract and this report.

Modified: `ManagerExceptionHandler.java` (register new controller only),
`SmartCinemaApplicationTests.java` (mock new repository), additive
`docs/ai/current-handoff.md`. Existing security config, ADMIN services/controllers,
frontend, V1–V17, historical contracts/reports and requirement documents unchanged.

Ignored evidence: `backend/target/manager-staff-2026-10-28/`: baseline hashes,
`baseline-unit.log`, `unit-first.log`, `test-compile-final.log`, `preflight.log`,
`status-pending.log`, `startup.log`, `postgres-first.log`, `integration.log`,
`real-http.json`, `security-final.log`, `status-final.log`, `preservation.txt`.
`scope-final.json` records the final file/HEAD/index/encoding/link checks.
Operator credentials remain in the existing private file, never in these reports.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md).

| Area | Result | Evidence |
|---|---|---|
| Java/package/test naming | PASS | Existing manager package, PascalCase classes, camelCase English identifiers |
| API/domain/status | PASS | Versioned resource nouns, existing Staff/Assignment DTO and uppercase statuses; canonical bigint strings |
| Database | PASS | Forward V18, snake_case functions, same protected owner; no new schema tables/role hierarchy |
| Architecture/imports/dependencies | PASS | Shared protected domain core, existing JDBC/security/validators; no dependencies added |
| Documentation | PASS | Exact existing requirement IDs, new kebab-case contract and required dated report; additive handoff |
| Frontend | NOT APPLICABLE | No UI/Stitch changes |

No convention exception required. Final scope checks PASS: of938 original files,
only the3 listed original files changed; the other935 remain byte-identical.
There are11 new files. Frontend, V1–V17 and historical documents are unchanged.
Strict UTF-8, whitespace and7 documentation links PASS; Git HEAD/index unchanged.
No staging, commit, push or deployment.

## 8. Limitations and next step

Manager account/invitation/profile/global-status actions remain excluded, with
initial out-of-scope placement handled by ADMIN. Collection pagination and broad
Staff discovery are not invented. No physical mail, production load, external
provider or deployment proof; no financial/check-in issuance fixture. Backend-only
contract verified locally, not a new Manager frontend capability.

Next recommended task: independently approve Manager Staff assignment frontend
scope/design using this verified contract. Do not start frontend, Booking,
Reporting/Dashboard or another module automatically. **STOP after this report.**
