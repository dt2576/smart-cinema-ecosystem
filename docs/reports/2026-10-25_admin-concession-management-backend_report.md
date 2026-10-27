# Phase 5B-1 — ADMIN Concession Management backend

## 1. Task Information

- Date: **2026-10-25**, Asia/Saigon. Scope: approved backend-only minimal catalog management.
- Final outcome: **IMPLEMENTED WITH BLOCKED VERIFICATION**.
- Source implementation and executable JAR completed; selected non-database regression **169/169 PASS in32 suites**,0 failures/errors/skips. Includes22 new tests:8 request tests and14 MVC/security/parser tests.
- **PostgreSQL integration, V15 execution and real API/database mutation verification are BLOCKED.** Read-only preflight proved the dedicated migration login lacks SET authority for the existing protected owner. No migration, grant, bootstrap, business write or server startup was attempted beyond the guarded launcher's preflight.
- Source migration head **V15**; actual isolated database remains **V14**. V1–V14 source unchanged. No PAID/SUCCESS/Ticket fixture, VNPAY integration, frontend/Stitch change, Neon, commit, push or deploy.

## 2. Requested Work and Context

The user explicitly approved Phase5A's five-endpoint contract, ADMIN-only chain catalog, three categories, flat COMBO, duplicate names, exact decimal/string IDs, separate status, explicit initial status, image read-only/new image null, no DELETE, no version/idempotency guarantee and no Booking/Customer contract changes. The task explicitly permits reviewable source implementation with blocked integration when safe local execution cannot be established.

Followed [AGENTS](../../AGENTS.md), [Development Workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), Backend workflow, coding/requirement/document conventions, [project conventions](../development/project-conventions.md) and report template. Rechecked [Phase5A](2026-10-25_admin-concession-management-preparation_report.md), current handoff, relevant BRD/SRS v1.2/System Analysis v1.1, Concession/Booking/Promotion contracts, V7/V9/V10/V11 guards, existing ADMIN authorization/error patterns and isolated environment instructions. Context and requirements read during Phase5A remain unchanged and were reconciled again against the implementation.

Published [ADMIN Concession contract v1.0](../api/admin-concession-management-contract-v1.0.md) **before** implementation. All API behavior below is now source-implemented, but database execution is not claimed.

## 3. Contract and Requirements Traceability

| Actual requirement / source | Implementation and evidence | Result |
|---|---|---|
| BRD BR-002/004; SRS FR-AUTH-007/008 and §6 RBAC | Generic ADMIN security gate, existing current ACTIVE ADMIN authorizer; independent locked check inside V15 | PASS source/MVC; DB recheck execution BLOCKED |
| SRS FR-CONCESSION-001–006; System Analysis UC-ADM-010–013 | List/detail/create/content-update/status; ACTIVE/INACTIVE, three current categories, zero/fractional exact prices | PASS source/parser/MVC; persistence BLOCKED |
| BRD BR-065–067; SRS FR-BOOKING-013–018, SR-CONCESSION-01–04, DR-016–018 | Existing Customer commands/totals/original expiry/first-attempt freeze unchanged; master only | PASS preservation/source; new DB compatibility/concurrency execution BLOCKED |
| SRS FR-AUDIT-001/006, NFR-OBS-006 | Protected wrapper records minimal durable audit in same transaction; no-op no audit | PASS source review; atomic DB rollback/audit tests BLOCKED |
| SRS NFR-SEC-002/003/006/010/011 | Scoped strict bounded UTF-8 parser; no raw input/DTO diagnostic output; safe no-store ProblemDetail | PASS executed MVC/request boundary |
| User scope/isolation requirements | Exact fixed local target, restricted identities, no escalation/migration/data write | PASS actual read-only preflight |

No requirement or business-rule ID, provider outcome, permission or optional workflow was invented. No conflict with higher-authority requirements was found in the approved slice.

## 4. API Implementation

| Implemented resource | Request | Response |
|---|---|---|
| GET `/api/v1/admin/concession-items` | No query |200 array including INACTIVE, category/name-C/numeric-ID order |
| GET same base `/{itemId}` | Canonical bigint-string path |200 item or404 |
| POST collection | `{name,description,category,sellingPrice,status}` exactly |201 item + Location |
| PUT `/{itemId}` | `{name,description,category,sellingPrice}` exactly |200 item; status/image preserved |
| PUT `/{itemId}/status` | `{status}` exactly |200 item; content/image preserved |

Example create (illustrative payload; **not submitted** to a database):

```json
{"name":"Bắp rang","description":null,"category":"POPCORN","sellingPrice":"55000.0000","status":"ACTIVE"}
```

Response fields: `id,name,description,category,sellingPrice,imageUrl,status,createdAt,updatedAt`. IDs/exact four-decimal prices strings; description/image nullable; timestamps UTC. Canonical ID range1..9223372036854775807. Name stripped/nonblank/≤150 Unicode code points; nullable description with no invented business character limit. Price lexical validation rejects JSON numbers, leading zeros, exponent/negative/nonfinite/≥10^15/>4 decimals before BigDecimal/database coercion. Zero and valid fractional values remain allowed.

Dedicated `AdminConcessionBody`/converter/parser rejects duplicate/missing/unknown keys, trailing documents, invalid UTF-8/NUL/unpaired surrogates and bodies above1MiB. That documented transport bound does not add a catalog-description business maximum. Scope is only the new request type: global JSON behavior and Customer DTOs unchanged. The converter uses installed Spring7 `HttpMessageConverters.ServerBuilder`; no new deprecated converter override.

No-store success and safe application errors; mapped400/403/404/409/503 plus existing security401. Unexpected SQL/privilege failures become503 rather than an invented duplicate-item conflict; no SQL/payload echo. New narrow CSRF matcher mirrors existing Bearer ADMIN resources; current authentication/authorization logic otherwise unchanged. No DELETE, pagination/filter/sort query, image write, category CRUD, stock/Cinema mapping, media, frontend authority or automatic retry.

Existing AdminAccessService uses FOR SHARE. GETs are logically read-only REPEATABLE_READ transactions, not PostgreSQL-enforced readOnly=true. Writes are READ_COMMITTED with short lock/statement/transaction bounds, one command per explicit call. Last accepted content write wins; no version/ETag/idempotency promise. Uncertain create uses manual list review, known-ID uncertainty detail GET; reads cannot prove delayed rollback or identify which browser caused a change.

## 5. Migration, Ownership and Atomic Audit

[V15 source](../../backend/src/main/resources/db/migration/V15__guard_admin_concession_catalog.sql) defines only `admin_configure_concession_item(bigint,bigint,text,text,text,text,numeric,text)`. It creates no table/column, role, seed, price backfill or financial state.

- Independently locks/rechecks actor User as current ACTIVE ADMIN, then locks only the target item. Never locks Booking/Showtime after catalog, preserving existing Customer ADD lock order.
- Reuses deployment-only `configure_concession_item` internally under existing NOLOGIN `smart_cinema_hold_owner`. Wrapper preserves id/created_at/image/current unrelated fields from the locked row.
- CREATE/UPDATE/STATUS modes validate inputs. Duplicate names allowed. Same content/status returns existing ID without UPDATE/timestamp/audit. Real changes insert actor/item/action/time/minimal before/after exact price/status and changed-field names into existing `audit_records` before returning.
- Audit INSERT failure rolls back the routine/catalog statement. No arbitrary description/image/credential/request payload is stored. Actions: CONCESSION_CREATED/CONCESSION_UPDATED/CONCESSION_STATUS_CHANGED; resource CONCESSION_ITEM.
- Fixed safe search_path, schema-qualified objects, PUBLIC execution revoked, only wrapper EXECUTE granted to existing runtime grant role in migration source. Raw deployment function and direct DML remain unexposed.

These are implementation guarantees to be checked against PostgreSQL, **not observed database outcomes in this task**. SQL syntax/ownership installation, runtime execution, audit persistence/rollback and row-lock races remain unexecuted.

## 6. Actual Isolation Preflight and Blocker

Before source migration and database operations, the established `local-test-environment.ps1 -Action Verify` verified physical **127.0.0.1:5432/smartcinema_phase4e_test**, owner/migrator `smartcinema_phase4e_migrator`, runtime `smartcinema_phase4e_app`, V14/14successful/0failed, five Staff tables and preserved original role attributes/memberships. Runtime has no shared protected-role membership.

New read-only [LocalConcessionVerification](../../backend/scripts/LocalConcessionVerification.java) independently checked both exact JDBC/Flyway URLs, blank imports, provider/delivery/cleanup disabled, physical server/database/current role/read-only transaction and NOSUPERUSER/NOCREATEDB/NOCREATEROLE. It found:

```text
MIGRATION_EXISTING_CAPABILITIES=SET_hold_owner:false;CREATE_schema:true;CREATE_public:true
```

**Exact blocker:** the restricted migration login cannot SET `smart_cinema_hold_owner`, so it cannot safely perform the ownership transfer required by this new protected function. Database CREATE authority alone is insufficient. No alternative credential, superuser, role bootstrap, broad membership, guard disabling, old checksum repair or remote fallback was used.

Updated the existing local source-head guard deliberately for V15. Verify now distinguishes sourceV15/databaseV14 as `PENDING_NOT_APPLIED`; Start/ProvisionAdmin have a separate preflight that refuses to launch Spring/Flyway when the required authority is absent. One deliberate Start preflight returned that BLOCKED message; **no backend process launched and no migration ran**. Post-migration startup also requires the dedicated application's narrow function grant, since this environment copies database-scoped privileges instead of inheriting the shared runtime role. No grant was applied.

The new helper's `prepare` action created only an ignored private test profile derived from the existing local input under `backend/target/admin-concession-local-2026-10-25/private/test.properties`, using the restricted migration identity for future reviewed test configuration; it is not database bootstrap. Windows ACL verified protected inheritance and exactly one owner access rule. Existing environment inputs were not overwritten; no credentials entered argv/reports or tool output. Unit regression replaced Spring ConfigData location with this explicit local profile, preventing remote `.env` import.

All DB connections performed here were **read-only preflight queries** against that single approved database. User/Cinema counts remain2/1, actual schema history remainsV14, existing role attributes/memberships unchanged. No current HTTP/PostgreSQL integration, positive data mutation or domain fingerprint comparison is claimed. No services/listeners were started by this task.

## 7. Tests and Exact Verification Results

| Executed command/check | Actual result |
|---|---|
| `mvn -Dtest=AdminConcessionRequestTests test` |8PASS/0fail/error/skip, initial source request tests |
| Final `mvn '-Dtest=*Tests,!*PostgresTests' verify` with private isolated ConfigData location |**169PASS,0failures,0errors,0skips,32 suites**,18.263s, finished2026-10-25T09:31:50+07:00 |
| New focused cases included in final run |8 request +14 controller/MVC/security/parser =22PASS;147 retained non-DB cases also PASS |
| JAR/repackage |PASS; packaged new classes and V15 resource inspected |
| Final `mvn test-compile` after safety review of DB probes |PASS, no tests executed; compiled bytecode inspected for rollback/savepoint and non-destructive ACL probes |
| Source/PS/Java preflight checks |Java helper compilation/read-only execution PASS; PowerShell parser and source preservation checked; guarded startup stops as designed |
| V15 migration/full PostgreSQL regression |**BLOCKED / NOT RUN**, protected-owner authority absent |
| New AdminConcessionPostgresTests |12 cases authored/compiled, explicitly excluded from executed selection; **NOT RUN**, not counted PASS or disguised as skips |
| Actual Customer/ADMIN SQL/API commits, audit rollback, snapshot/freeze/concurrency |**BLOCKED / NOT RUN**; mocked HTTP tests do not prove these |
| Frontend tests/build/browser, Stitch, external SMTP/VNPAY |NOT RUN; frontend/provider work outside scope |

The selected Maven command is a **non-database regression**, not the historical410-test full backend verification. All `*PostgresTests` were intentionally excluded before execution because safe migration is blocked and some older suites construct synthetic financial/issuance states prohibited for this task. No test was weakened, skipped inside the selected suites or retried by configuration. Existing VNPAY protocol unit fixtures exercised pure local/mocked behavior only; they are not provider verification, signed callback acceptance or PAID evidence.

Executed MVC coverage: anonymous401 and wrong CUSTOMER/STAFF/MANAGER403 on all five endpoints, exact string receipt/Location/no-store, content/status separation, malformed/duplicate/trailing/unknown/oversized/UTF-8 inputs, invalid prices/status/IDs/query/subject, safe denied/missing/database errors, no DELETE. Service is mocked: current account and DB exception simulations validate HTTP handling only. Request unit tests include Unicode limits, nullable description, explicit status, maximum bigint and decimal values, zero/fractional amounts and redacted diagnostics.

### Authored PostgreSQL acceptance cases

The opt-in suite fails preflight unless the exact private local URLs/identities, disabled external effects, actual V15, existing migration SET authority and runtime wrapper EXECUTE are present. It never performs migrations, grants, resets or guard disabling. It tests real protected commands, not provider outcomes. If separately enabled after review it retains its own uniquely synthetic catalog/users/unpaid Booking data; existing records/history are not cleaned up. Only its newly created unreferenced deleted-actor fixture and its own scoped fault trigger/function are removed.

Twelve authored cases cover: duplicate-name/price bounds; all-status ordering and public ACTIVE projection; image/status/content/identity preservation; no-op; safe exact audit delta; invalid/missing input; current wrong/blocked/changed/missing/deleted actor; runtime direct DML/raw configuration denial; injected audit INSERT failure rollback; old line snapshots/quantity/INITIATED-only freeze; actual Customer ADD SHARE lock versus repricing; deactivation UPDATE versus Customer ADD rejection. Concurrency asserts real pg_stat_activity row-lock waits with bounded deadlines. No PAID/SUCCESS/Ticket/QR setup is used. These source cases remain **unverified** until safe execution is available.

### Failure history and remaining warnings

Initial MVC run:22 total tests,14 context errors from one missing mocked StaffRateLimiter needed by the existing globally discovered Staff filter; added the test-only mock. Next focused run:21PASS/1error caused by Mockito re-stubbing an already throwing mock using `when`; corrected to `doThrow`. Both initial XML files were retained under ignored evidence. These were test-harness errors, not silently hidden or treated as passing runs. An intermediate non-DB regression169/169 passed; after final diagnostic-redaction changes the complete selected regression ran again and passed as recorded above.

Existing StaffWebConfiguration deprecated-converter and Mockito dynamic-agent warnings remain; new converter uses the installed nondeprecated builder. Existing MVC exception-resolution diagnostics in negative fixture tests are not live backend faults.

Evidence: [final regression log](../../backend/target/admin-concession-local-2026-10-25/verification/final-unit-regression.log), [initial context errors](../../backend/target/admin-concession-local-2026-10-25/verification/initial-http-context-errors.xml), [initial mock error](../../backend/target/admin-concession-local-2026-10-25/verification/initial-mock-restub-error.xml). Ignored local artifacts, not a committed release evidence store; private profile is intentionally not linked as report evidence.

## 8. Files Created / Modified

Created:

- [Contract v1.0](../api/admin-concession-management-contract-v1.0.md), this dated report and V15 source linked above.
- `backend/src/main/java/com/smartcinema/admin/`: [AdminConcessionBody](../../backend/src/main/java/com/smartcinema/admin/AdminConcessionBody.java), [WebConfiguration](../../backend/src/main/java/com/smartcinema/admin/AdminConcessionWebConfiguration.java), [Request](../../backend/src/main/java/com/smartcinema/admin/AdminConcessionRequest.java), [Item](../../backend/src/main/java/com/smartcinema/admin/AdminConcessionItem.java), [Controller](../../backend/src/main/java/com/smartcinema/admin/AdminConcessionController.java), [Service](../../backend/src/main/java/com/smartcinema/admin/AdminConcessionService.java), [Repository](../../backend/src/main/java/com/smartcinema/admin/AdminConcessionRepository.java), [Failure](../../backend/src/main/java/com/smartcinema/admin/AdminConcessionFailure.java), [ExceptionHandler](../../backend/src/main/java/com/smartcinema/admin/AdminConcessionExceptionHandler.java).
- [RequestTests](../../backend/src/test/java/com/smartcinema/admin/AdminConcessionRequestTests.java), [ControllerTests](../../backend/src/test/java/com/smartcinema/admin/AdminConcessionControllerTests.java), [PostgresTests](../../backend/src/test/java/com/smartcinema/admin/AdminConcessionPostgresTests.java), [local read-only/private-profile helper](../../backend/scripts/LocalConcessionVerification.java).

Modified:

- [AuthSecurityConfiguration](../../backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java): narrow new Bearer ADMIN CSRF matcher only.
- [SmartCinemaApplicationTests](../../backend/src/test/java/com/smartcinema/SmartCinemaApplicationTests.java): mock the new repository in its existing datasource-free full-context tests; prior assertions retained.
- [LocalTestEnvironment.java](../../backend/scripts/LocalTestEnvironment.java)/[launcher](../../backend/scripts/local-test-environment.ps1): audited source-head/pending state and startup authority check, no automatic grants.
- [Local environment guide](../development/local-test-environment.md) and [current handoff](../ai/current-handoff.md): additive current evidence/blocker; preserve prior Phase4F/5A history.

No files moved. Final SHA-256 comparison against805 baseline repository files found exactly the six intended existing-file changes listed above and16 new files. V1–V14 source, frontend, incoming Phase4F tools/reports, Phase5A/progress reports, BRD/SRS, historical contracts and unrelated application modules are preserved. Report/contract/guide/handoff links resolve; PowerShell parser found0 errors; `git diff --check` passed (LF→CRLF advisories only). Index/HEAD remain unchanged; no staging/commit/push/deploy.

## 9. Requirement Reconciliation and Risks

**PASS source/selected tests:** approved five endpoints, minimal fields, ADMIN-only HTTP, exact prices/string IDs, images read-only, duplicate names, category/status vocabulary, safe parser/errors/CSRF, transaction and owner/audit design, no frontend/business expansion.

**BLOCKED runtime evidence:** SQL install/ACL, current account SQL denial, actual atomic audit/no-op, public catalog compatibility, historical snapshots, composition freeze and row-lock races. The existing current database does not contain V15; this feature is not locally runnable through the guarded launcher yet. Compiling/packaging SQL does not verify PostgreSQL semantics or resolve deployment authority.

No business-requirement conflict or convention exception. Technical1MiB request limit is documented and feature-local; no description-domain cap or category/image/stock requirement was added. API last-write-wins/no-idempotency limitations remain explicit. Permission gaps must not be “fixed” by granting runtime owner membership/direct catalog writes or changing old migrations.

## Convention Compliance

Reviewed against [canonical conventions](../development/project-conventions.md), including this report.

| Area | Result | Evidence |
|---|---|---|
| Folder/file/source naming |PASS|Existing admin/scripts/test locations, PascalCase Java, dated kebab-case report/contract, V15 Flyway filename |
| API/DTO/status/identity |PASS|Plural resource, five approved verbs/routes, camelCase fields, exact current uppercase tokens and string IDs |
| Architecture/security |PASS source|Existing JDBC/service/AdminAccess/NOLOGIN guard reused, new parser/advice scoped, no framework/dependency migration |
| Database convention |PASS source; execution BLOCKED|No domain schema change; new snake_case protected routine/atomic audit; old migrations preserved |
| Documentation/history |PASS|New contract/report and additive guide/handoff; no rewrite of requirements/historical reports |
| Frontend/visual/routes |NOT APPLICABLE change|No frontend or Stitch modification |
| Scope/preservation |PASS|Unrelated/incoming work kept, diff whitespace/report links checked, no DB privilege/data writes or Git publication |

## 10. Next Step and Frontend Handoff

**First resolve local verification authority through an approved DBA/operator review.** The source task is complete; this session has no suitably authorized migration context and performed no privilege fix. Have the operator review and execute V15 under appropriate existing protected-owner authority, recheck ownership/schema requirements, and grant only the new function's EXECUTE to the dedicated runtime inside this database. Keep runtime without raw configure/DML/owner membership, do not widen privileges on other databases, and preserve V1–V14/checksums/data. Re-run the guarded preflight before any command.

Then run the12 opt-in PostgreSQL cases plus safe Customer/Payment-freeze integration regression and migration-upgrade acceptance using only the approved local database. Record actual database results before declaring IMPLEMENTED AND VERIFIED. Financial/issued-Ticket fixture suites remain outside this task; no VNPAY setup is required for catalog/INITIATED-only tests.

Frontend can consume the published field/status/error/recovery contract after backend integration is verified and its separate work is authorized. Use current AdminShell/Nocturne; no approved dedicated Concession design exists yet. Images read-only, description nullable, exact decimal strings, explicit status actions, no implicit merge/DELETE/version/idempotency and no automatic POST/PUT retry. Do not start frontend, Stitch design, provider integration or deployment automatically. **Stop after this report and await review.**
