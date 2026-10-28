# MANAGER Cinema Operations Backend implementation report

## 1. Task information

- Outcome: **PASS — implemented and verified for the approved backend slice.**
- Implementation/tests: 2026-10-27; final local status/preservation check and
  documentation: 2026-10-28 (Asia/Saigon). Requested report filename retained.
- Target: only `127.0.0.1:5432/smartcinema_phase4e_test`.
- [API contract](../api/manager-cinema-operations-contract-v1.0.md): exact19
  endpoints, DTOs, errors, assignment rules, locking and exclusions.

## 2. Requested work and documents reviewed

Implemented scoped Manager Cinema/Hall/Seat/Showtime operations, read-only Cinema
Staff, and the missing minimal ADMIN Manager assignment mechanism. Reused existing
domain writers and verified the actual local application. No frontend work.

Read AGENTS.md, canonical development/backend workflows and coding/document/
traceability rules; [project conventions](../development/project-conventions.md),
current handoff, Project Scope v1.0, Business Analysis v2.1 Manager sections,
[BRD v1.2](../brd/brd-v1.2.md), [SRS v1.2](../srs/srs-v1.2.md), System Analysis &
Design v1.1 DOCX, actual security/controllers/services/DTOs and V1–V16.
Reviewed historical [configuration](../api/admin-cinema-configuration-contract-v1.0.md),
[Showtime](../api/admin-showtime-contract-v1.0.md),
[Staff](../api/staff-invitation-administration-contract-v1.0.md) contracts and the
existing local workflow. Historical Manager exclusions are superseded only by
this explicitly authorized additive slice; historical documents remain unchanged.

## 3. Requirements traceability and reconciliation

| Verified source | Implementation/evidence | Result |
|---|---|---|
| BRD BR-002/003; SRS FR-AUTH-007/008, FR-ORG-005; NFR-SEC-002/003/006 | JWT role plus current account/effective assignment, query predicates and locked writer checks; real wrong-role/foreign/revocation tests | PASS |
| BRD BR-009–011; SRS FR-CINEMA-006–009, FR-SEAT-002/003/017 | Shared protected Hall/layout/Seat writer, people capacity and whole COUPLE semantics, frozen structure/history | PASS |
| BRD BR-012–015; SRS FR-SHOWTIME-001–010 | Shared Showtime parser/writer/filter, duration/overlap/eligibility/history guards; existing Customer cutoff retained | PASS for this slice |
| BRD BR-054; SRS FR-ORG-001/003 | Minimal ADMIN grant/deactivate/reactivate, immutable effectiveAt and retained assignment history | PASS |
| BRD BR-055; SRS FR-CINEMA-010 | Assigned Cinema current Staff view, minimal profile/status; no invitation/HR fields | PASS for read scope |
| SRS FR-AUDIT-002/003 | Atomic durable Manager operation/assignment audit and rollback tests | PASS |
| System Analysis v1.1 UC-MGR-002–015 | Assigned Cinema/Hall/Seat/Showtime and Staff reads; create/update/status through existing safe policies | PASS for approved operations |
| BRD BR-057; FR-REPORT-001; UC-MGR-016–022 | Manager Staff writes, Cinema Bookings and reporting/dashboard intentionally deferred | NOT APPLICABLE to authorized slice |

No BR/FR/UC/NFR IDs or role permissions were invented. Existing ADMIN-only Cinema
authoring remains ADMIN-only. No incremental Seat append/layout reshape or broader
cancellation/refund policy was added to satisfy a use-case label.

## 4. Implementation and exact API surface

**15 MANAGER operations**, prefix `/api/v1/manager`:

| Resource | Methods |
|---|---|
| `/cinemas`, `/cinemas/{cinemaId}` | GET each |
| `/cinemas/{cinemaId}/halls` | GET, POST |
| `/halls/{hallId}` | GET, PUT |
| `/halls/{hallId}/seats` | GET, POST complete initial layout |
| `/seats/{seatId}` | GET, PUT |
| `/cinemas/{cinemaId}/staff` | GET only |
| `/showtimes` | GET, POST |
| `/showtimes/{showtimeId}` | GET, PUT |

**4 ADMIN operations**, prefix `/api/v1/admin/managers`:

- GET base: existing MANAGER accounts.
- GET `/{managerId}/cinema-assignments`: retained current/inactive/future history.
- POST same: `{cinemaId, effectiveAt}`.
- PUT `/{managerId}/cinema-assignments/{assignmentId}/status`: `{status}`.

Positive canonical bigint-string identities and exact decimal-string amounts are
preserved. Shared ADMIN Hall/Seat/Showtime validators, projections and protected
domain writers provide the actual business rules. Published Movie discovery is
reused; no redundant Manager Movie authoring/catalog API. Complete array lists
follow current configuration conventions, not invented pagination.

Manager requires current ACTIVE account and effective ACTIVE MANAGER assignment.
No scope→403; foreign/nonexistent nested resource with valid scope→404. Every read
query contains assignment scope. Writes recheck locked account and assignment;
the actual existing resource determines Cinema, including Showtime updates.
Future-only grants do not authorize access. Blocked accounts stay denied despite
valid JWTs/grants. Assignment identity/type/effectiveAt are immutable; status
history is retained, and reassignment is deactivate plus new grant. ADMIN role
and existing ADMIN domain behavior are preserved.

## 5. Files created and modified

Created under `backend/src/main/java/com/smartcinema/`:

- `manager/ManagerController.java`, `ManagerService.java`, `ManagerRepository.java`,
  `ManagerRequest.java`, `ManagerScope.java`, `ManagerFailure.java`,
  `ManagerExceptionHandler.java`.
- `admin/AdminManagerController.java`, `AdminManagerService.java`,
  `AdminManagerRepository.java`.
- Migration: `backend/src/main/resources/db/migration/V17__enforce_manager_cinema_operations.sql`.

Created under `backend/src/test/java/com/smartcinema/manager/`:

- `ManagerRequestTests.java`, `ManagerControllerTests.java`, `ManagerServiceTests.java`.
- `ManagerOperationsPostgresTests.java`, `ManagerOperationsHttpPostgresTests.java`,
  `LocalManagerTestSupport.java`.

Modified existing backend files:

- `admin/AdminConfigurationRepository.java`: shared Seat projection/mapper.
- `admin/AdminShowtimeRepository.java`: shared projection/filter with scoped query.
- `auth/AuthSecurityConfiguration.java`: Manager namespace role gate and existing
  Bearer API/CSRF pattern for the new endpoints; no authentication redesign.
- `src/test/java/com/smartcinema/SmartCinemaApplicationTests.java`: new repository
  mocks for the existing no-DB context test.

Documentation: new API contract, this report, additive `docs/ai/current-handoff.md`.
No frontend, dependency, environment or startup workflow source changes.

## 6. Approved V17 migration and preservation

Before changes, read-only status was installed/source V16, pending0/failed0 and
16 valid checksums. The user explicitly approved **V17 and the stated fresh QA
fixture scope** before privileged execution. Used existing private local postgres
configuration; no credentials printed or committed.

Executed approved Flyway V17 via `scripts/local-dev.ps1 -ApproveMigrations`.
V17 adds protected scoped authorization/audit helpers and ADMIN Manager assignment
wrapper; extends four existing configuration writers and the nonfinancial audit
whitelist. Fixed search_path, schema qualification, NOLOGIN protected ownership,
no PUBLIC EXECUTE. Existing domain bodies/financial guards are retained.
Separate approved local grant:

```sql
GRANT EXECUTE ON FUNCTION public.admin_assign_manager(bigint,bigint,bigint,timestamptz,bigint,text)
TO smartcinema_phase4e_app;
```

No new table, role, membership, runtime direct DML or owner SET ROLE authority.
The new internal helpers are not runtime-callable. Existing deployment-only
initializer remains denied. Atomic audit and domain mutation roll back together.
Both write-versus-revocation lock orderings were tested using actual blocking PIDs.

Final read-only status **V17 installed/source, pending0, failed0,17 checksums valid**.
Original rows across23 application/history tables, V1–V16 history, role attributes/
memberships and financial table counts were fingerprinted and remain unchanged.
Only the five approved existing function definitions changed; new protected
functions are additive. No PAID/SUCCESS/Ticket/evidence/reconciliation data created.
Fresh labeled QA accounts/catalog/assignments and unpaid Booking fixtures are
retained; no destructive cleanup. Normal QA authentication adds refresh sessions.

## 7. Actual commands, application and test evidence

Executed from root:

```powershell
.\scripts\local-dev.ps1 -Action Status
.\scripts\local-dev.ps1 -ApproveMigrations
# Final repeatable startup, with database already current:
.\scripts\local-dev.ps1
```

Backend commands below ran from `backend/`. Local runtime configuration excludes
remote imports and disables provider/mail delivery/cleanup. Operator test inputs
use the existing private file and strict exact-target preflight.

```powershell
mvn '-Dtest=*Tests,!*PostgresTests' '-Dspring.config.location=optional:file:target/local-dev/private/runtime.properties' '-Dspring.flyway.enabled=false' verify
$env:ADMIN_MANAGER_OPERATOR_APPROVED='true'
$env:MANAGER_DB_TESTS='true'
mvn '-Dtest=ManagerOperationsPostgresTests' '-Dspring.config.location=optional:file:target/local-dev/private/runtime.properties' '-Dspring.flyway.enabled=false' test
$env:MANAGER_HTTP_TESTS='true'
mvn '-Dtest=ManagerOperationsHttpPostgresTests' '-Dspring.config.location=optional:file:target/local-dev/private/runtime.properties' '-Dspring.flyway.enabled=false' test
```

`LocalManagerTestSupport before/grant/after` also executed through the existing
test classpath for read-only baseline, approved narrow grant and preservation.

| Actual check | Result |
|---|---|
| Pre-change non-Postgres regression | 197 PASS |
| Final non-Postgres regression, jar/repackage | **216 PASS**,0 failures/errors/skips; BUILD SUCCESS |
| New real PostgreSQL suite | **13 PASS**,0 failures/errors/skips |
| Stronger lock-observation rerun, included in13 | 2 PASS; no additional unique cases |
| New real authenticated HTTP suite | **5 PASS**,0 failures/errors/skips |
| Total distinct selected final tests | **234 PASS** =216+13+5;37 new tests over197 baseline |
| Actual local backend/frontend/proxy health | PASS; Spring Boot8080, Next3000, real API proxy |
| Database status and original-data preservation | PASS; V17,17 valid checksums, no pending/failed |
| Frontend typecheck/lint/build/Playwright | NOT RUN: backend-only task, frontend unchanged |
| Full historical PostgreSQL suite | NOT RUN: destructive schema/financial fixture assumptions are inappropriate for this preserved operational local DB |

Real signed-JWT HTTP suite made115 requests:200×26,201×21,400×7,401×8,
403×32,404×18,409×3. All19 endpoints exercised against the actual app/database.
No mocked JWT or HTTP interception in that suite. Tests cover assigned/foreign
and nested resources, wrong roles/anonymous/blocked accounts, missing/future/
revoked/reassigned grants with the same JWT, strict fields/IDs, price precision,
duplicate scopes, capacity/history/overlap and existing ADMIN reads/writes.
SQL tests also cover real new unpaid Hold/Booking integrity, forbidden raw writes,
rollback/audit and contention. Positive financial/provider states were not fabricated.

Ignored evidence: `backend/target/manager-cinema-operations-2026-10-27/`:
`baseline-unit.log`, `regression.log`, `postgres.log`, `concurrency-verified.log`,
`http-verified.log`, `real-http.json`, `startup.log`, `startup-final.log`,
`status-final.log`, `database-before.json`, `preservation.txt`.
These generated artifacts are local evidence, not committed project sources.
Final normal startup on2026-10-28 again passed all three health checks without
applying another migration. Verification processes were stopped; ports8080/3000
had no listeners. A subsequent read-only preservation check also passed.

## 8. Defects found and fixed

No production domain failure was found in final tests. Initial harness failures
were corrected and rerun, without skipping, automatic replay or weakening guards:

- Mockito error-loop restubbing: changed to `doThrow().when()`; final216 PASS.
- HTTP fixture generated nanoseconds: truncated to supported microseconds;
  backend rejection/validation retained.
- Staff read fixture attempted account creation without deferred invitation
  intent: used protected create+intent+immediate revocation in one transaction.
  Ephemeral fixture encryption only; delivery remained disabled and no email sent.
  This proves scoped Staff reads, not onboarding or SMTP interoperability.
- HTTP client connect-retry policy is set before construction; lock tests now
  assert actual PostgreSQL blocking rather than only timing a Future.

## 9. Scope, limitations and convention compliance

Backend slice PASS; this is not a full Manager product milestone. Existing Manager
account provisioning, Manager Staff mutations, Cinema Booking history, Manager
reporting/dashboard and all frontend remain separate. Reads are snapshots; every
write revalidates. No new idempotency/automatic retry/pagination contract. Production
load and a fresh managed-cloud migration install were not tested. No Neon access,
provider calls, financial finalization, new database, historical migration edit,
data reset, staging/commit/push or deployment.

| Convention area | Result | Evidence |
|---|---|---|
| Package/file/code naming | PASS | Existing Java package structure and PascalCase classes; English identifiers |
| API/domain/status | PASS | Versioned noun routes, canonical Cinema/Hall/Seat/Showtime, existing uppercase statuses |
| Database | PASS | Forward V17, snake_case objects, protected ownership and narrow grants |
| Documentation/report | PASS | New lowercase contract and required dated report; actual requirement IDs; historical docs preserved |
| Scope/imports/dependencies | PASS | Existing infrastructure/types/validators reused; no dependency or frontend changes |
| Frontend naming/design | NOT APPLICABLE | No frontend implementation |

No approved convention exception was required. Historical ADMIN contracts describe
their original exclusions; they were not rewritten to conceal the additive scope.
New API documentation links and report naming are reconciled against the canonical
convention. Current handoff updated additively.
Final scope check:894 original files fingerprinted; exactly five authorized
original files changed, all889 others unchanged, including all V1–V16 source
migrations. Git HEAD/index unchanged. All19 new files passed strict UTF-8 and
trailing-whitespace checks;12 new-document local links resolve. `git diff --check`
passed. Evidence: ignored `final-scope.json` alongside the test logs.

## 10. Next recommended step

Separately approve a Manager frontend contract/design audit against these verified
APIs. Do not automatically start Manager frontend, Staff administration, Reporting,
Dashboard or another module. **STOP after this report.**
