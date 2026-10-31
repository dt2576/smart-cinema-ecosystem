# STAFF POS V19 migration blocker resolution

## 1. Task and decision

Date: 2026-10-30. Scope: migration installer, protected reporting read, isolated
PostgreSQL verification and operator recovery documentation.

**Technical corrections and isolated regression: PASS. PRIMARY installation:
NO-GO pending verified provider recovery coverage, an accepted maintenance window
and separate explicit approval for the revised artifact/setup/execution/cleanup.**
V19 was neither promoted to normal migrations nor installed on PRIMARY.

## 2. Documents and requirement traceability

Read AGENTS, canonical development/backend workflows, coding/document/traceability
rules, project conventions, current handoff, complete
[previous review](2026-10-30_staff-pos-v19-primary-migration-review_report.md),
[operator plan](../development/neon-staff-pos-v19-migration-plan.md),
[POS contract](../api/staff-pos-counter-ticket-sales-contract-v1.0.md), prepared
reporting contracts v1.1 and affected V1–V19 SQL/functions/tests.

| Actual requirement | Reconciliation |
|---|---|
| BRD v1.3 BR-038/039 | CASH requires authorized received-amount confirmation; VNPAY remains backend-verified. No frontend/manual VNPAY authority introduced |
| BRD v1.3 BR-026–031/035 | Shared Booking ownership/pricing/freeze/expiry preserved; old snapshots survive migration |
| BRD v1.3 BR-040–044/046/050/053 | Existing issuance, one Booking QR, independent Ticket/check-in and Cinema assignment guards preserved |
| BRD v1.3 BR-059 | Separate CASH reporting requires protected confirmation evidence; existing VNPAY cohort unchanged |
| SRS v1.3 FR-AUTH-007/008, FR-ORG-005 | Current role/assignment checks preserved; installer receives no new runtime role membership |
| SRS v1.3 FR-REPORT-001/002 | ADMIN and cinema-scoped MANAGER metrics remain compatible in populated fixtures |
| User safety boundaries | PRIMARY read-only, no live sale/account/privileged change; no source promotion, historical migration edit, reset or seed |

No BRD/SRS, API endpoint, response field or business rule was changed in this task.

## 3. Previous NO-GO findings and resolution

| Finding | Resolution and evidence | Remaining gate |
|---|---|---|
| Helper demanded obsolete Configuration-owner authority | Exact per-version policy, separate V18 -> [19] target, actual minimum LOGIN rehearsal. Extra Configuration membership and missing REFERENCES fail before migration | None in tested source; fresh PRIMARY authority comparison required before installation |
| Broad audit column SELECT | Removed; Hold-owned boolean `cash_payment_confirmed(bigint)` replaces reporting's direct audit subquery. Restricted runtime can call proof but audit metadata SELECT fails 42501 | Approve only the documented function EXECUTE capability, not audit SELECT |
| STORED owner key physically rewrites Booking heap and takes ACCESS EXCLUSIVE | Keep atomic rewrite for actual tiny PRIMARY data; local populated test confirms rewrite and exact logical preservation. Installer enforces 5s lock/120s statement/30s idle-in-tx limits | Operator must accept/drain maintenance window; changed size/data requires reassessment |
| Unverified backup/restore readiness | Concrete GET-only Console/API evidence checklist and recovery matrix added | Actual provider restore coverage/access still UNVERIFIED; no claim of backup existence |
| Installer least-privilege rehearsal absent | Six new real PostgreSQL tests compile/call actual production helper policy/Flyway builder through an independent non-admin LOGIN; all PASS | Neon role-creation/control-plane behavior itself NOT RUN |

## 4. Exact source and SQL changes

Modified:

- [PrimaryDatabase.java](../../backend/scripts/PrimaryDatabase.java): pending-version
  owner/CREATE policy, exact membership/options and independent authority checks,
  V19 SHA pin checked twice, target 19, transactional/time-limited/no-retry Flyway.
- [ReportSql.java](../../backend/src/main/java/com/smartcinema/reporting/ReportSql.java):
  CASH cohort uses protected boolean. VNPAY template and scoped outer queries remain.
- [V19 proposal](../../backend/src/test/resources/pos-migration/V19__enable_staff_counter_sales.sql):
  adds protected read function/owner/REVOKE PUBLIC/GRANT runtime EXECUTE; removes
  five-column audit SELECT. Booking/CASH/VNPAY writer logic otherwise unchanged.
- [Migration review tests](../../backend/src/test/java/com/smartcinema/staff/StaffPosMigrationReviewTests.java):
  expect audit read denial/proof EXECUTE, use new evidence directory; retain nine
  populated migration/rollback/replay/compatibility cases.
- [Operator plan](../development/neon-staff-pos-v19-migration-plan.md): revised
  hash/authority, actual helper, locking decision, promotion and cleanup steps.
- [ADMIN reporting v1.1](../api/admin-reporting-dashboard-contract-v1.1.md) and
  [MANAGER reporting v1.1](../api/manager-reporting-dashboard-contract-v1.1.md):
  correct the prepared database read mechanism; no HTTP contract change.
- [Current handoff](../ai/current-handoff.md): additive result; historical body retained.

Created:

- [StaffPosInstallerPostgresTests.java](../../backend/src/test/java/com/smartcinema/staff/StaffPosInstallerPostgresTests.java).
- [Recovery verification procedure](../development/neon-v19-recovery-verification.md).
- This report. Helpers/logs/fingerprints under ignored `backend/target/` only.

Original reviewed SHA-256:
`A4CA71A0D0BAB130E8CE16EA8071C86EC5F4AAE7D912576007672663FE0B1197`.
**Revised SHA-256:**
`E528550DD23B4658D4C457E21032EFA3C16F0AE788659A5788E163202CCA0E1E`.
Observed revised Flyway checksum: **163697808**. Helper, proposal and plan agree.
Normal migration directory remains V1–V18. Promotion is a future approved **move**
of these exact bytes; leave one canonical V19 and rerun isolated tests afterward.

The boolean proof verifies successful CASH/VND/COUNTER payment, authoritative amount,
CASH success evidence and matching audit actor/amount/currency/time. It returns no
audit rows, staff identity or metadata. Later blocking the selling Staff does not
erase legitimate historical revenue. Existing finalization/audit writers remain
protected; no direct financial DML or internal finalizer EXECUTE is added.

## 5. Minimum authority and installation boundaries

| Pending version | Required owner memberships | New function-owner schema CREATE |
|---|---|---|
| V14 | Staff | None |
| V15/V16 | Hold | Hold |
| V17 | Staff, Configuration | Staff |
| V18 | Staff | Staff |
| V19 only, installed V18 | Hold, Staff | Hold |

Only contiguous reviewed historical ranges are accepted; V19 cannot be bundled
with earlier/future versions. Migration LOGIN must have INHERIT/SET, no ADMIN OPTION
on exactly the required owners, no SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS
or neon_superuser inheritance. Runtime cannot inherit/SET the installer identity.

V19 additionally needs CONNECT to the exact database, schema USAGE/CREATE,
users(id) REFERENCES, history SELECT/INSERT. PRIMARY Hold schema CREATE already
exists; no new Staff/Configuration CREATE is required. Staff ownership is necessary
for the migration's assignment SELECT grant to Hold. No extra runtime owner rights.
Exact setup and dependency-aware cleanup SQL are in the operator plan.

Three permanent additions: assignment SELECT to Hold; EXECUTE of CASH writer and
boolean proof to Hold runtime. No audit SELECT, table DML or finalizer EXECUTE.
Existing broader `neondb_owner` privileges are neither concealed nor revoked.

## 6. PRIMARY and locking evidence

Read-only JDBC/TLS before/after: actual `neondb/public`, PostgreSQL 18.6,
installed/source **V18/V18**, 18 valid checksums, pending=0, failed=0.
All **31 fingerprints**, full captured functions/owners/ACLs/memberships,
constraints/indexes/column types/triggers and original data remain unchanged.
MANAGER user 5 remains ACTIVE with its one Cinema 1 assignment.

Actual dataset: 3 Customer Bookings (1 CANCELLED, 2 EXPIRED), zero Payments/Tickets,
zero ACTIVE STAFF. Booking heap **8192 bytes**, total **155648 bytes** with indexes.
This supports a short, drained atomic rewrite rather than a multi-step ownership
backfill. It does not prove a production lock will be immediately available.
Old snapshots/readers must drain, including long-running read-only transactions.
No automatic lock/statement retry or autocommit SQL execution is allowed.

## 7. Executed verification

All financial/test data below are **isolated LOCAL PostgreSQL fixtures**, not real
PRIMARY sales or actual VNPAY provider interoperability. Database target fixed at
`127.0.0.1:5432/smartcinema_phase4e_test`; unique schemas retained, no new database.

Commands from `backend` (PowerShell):

```powershell
$env:STAFF_POS_DB_TESTS='true'
$env:STAFF_POS_MIGRATION_REVIEW_TESTS='true'
$env:STAFF_POS_INSTALLER_DB_TESTS='true'
mvn '-Dmaven.compiler.useIncrementalCompilation=false' '-Dtest=StaffPos*Tests' test
mvn '-Dmaven.compiler.useIncrementalCompilation=false' '-Dtest=StaffPosInstallerPostgresTests' test
mvn '-Dmaven.compiler.useIncrementalCompilation=false' verify
```

| Check | Actual final result |
|---|---|
| Installer affected-suite rerun | **6/6 PASS**, zero skips/failures/errors |
| Final `mvn verify` | BUILD SUCCESS; **673 discovered, 304 executed PASS, 369 conditionally skipped**, zero failures/errors |
| V19/POS subset within that complete final run | **42/42 PASS**: installer 6 + migration review 9 + POS PostgreSQL 23 + request 4; zero skips |
| `pnpm test:dev` from root | **4/4 PASS**, zero skips; security-negative CLI fixtures never connect |
| `pnpm db:status` from root | Real PRIMARY read-only V18/V18, valid checksums, zero pending/failed |
| PRIMARY before/after | 31/31 fingerprints plus captured catalog groups unchanged |
| Isolated cleanup/preservation | New installer LOGIN dropped, explicit grants/memberships revoked; no leftovers or public data/history/global role drift |
| Frontend/visual tests | NOT APPLICABLE; no frontend change |
| Live VNPAY/CASH/PRIMARY installation/provider restore | NOT RUN; not authorized |

The 369 skips are existing unrelated opt-in DB suites whose environment flags were
not enabled, not removed/weakened tests. They are not reported as PASS. No test
retries were configured. Initial new test runs failed for a missing LOCAL LOGIN
CONNECT grant and PostgreSQL JDBC mapping `bool` as JDBC BIT rather than BOOLEAN.
Fixed the fixture grant/cleanup and asserted actual Boolean/type name; reran the
affected suite and full verification. No application defect was concealed.

Populated V18 fixture: 10 Bookings, 6 attempts, 6 frozen compositions, 2 Tickets,
one CHECKED_IN, original QR, Concession/Promotion snapshots, failed/cancelled/
expired/reconciliation cases. PRIMARY's 13 affected function definitions, 85
constraints, 23 indexes and 72 exact types match the isolated V18 baseline.

Tests verify missing REFERENCES rejection, extra-owner rejection, divergent hash
rejection, independent minimum LOGIN installation, expected protected owners,
pre-existing rows/sequences/reports unchanged, real old VNPAY continuation,
runtime CASH/COUPLE issuance, cross-role/scope denial, amount/freeze/expiry,
duplicates/concurrency, separate scoped CASH reporting, audit failure rollback,
and no raw audit read. Later actor blocking preserves the CASH proof.

Contended ACCESS EXCLUSIVE fails 55P03 safely; injected failure after final GRANT
rolls back all DDL/function/ACL/history effects. Successful Flyway repeat executes
zero; raw replay fails 42701 inside an explicit transaction without partial change.
These are PostgreSQL transactional tests, not a post-COMMIT provider restore test.

## 8. Recovery readiness, limitations and next step

The [read-only checklist](../development/neon-v19-recovery-verification.md) defines
exact-target endpoint/project/branch matching, actual history retention/timeline,
pre-change UTC target, existing snapshot inspection, restore operator/budget and
GET-only management reads. Provider metadata and a SQL timestamp alone cannot
establish a successful restore. No management connection/evidence was available;
backup/restore coverage remains **UNVERIFIED**, restore rehearsal **NOT RUN**.

Before a future installation request: verify and record recovery coverage/access,
accept a drained maintenance window, refresh all PRIMARY preconditions, then obtain
separate explicit approval for this revised SHA/setup/promotion/migrate/cleanup
plan. Do not reuse the earlier V14–V18 approval. After uncertain COMMIT, inspect
history/postconditions before taking action; never resubmit automatically.
Once counter sales exist, automatic V18 downgrade is unsafe. Preserve all later
financial/audit/Ticket events and prefer a reviewed forward correction.

## Convention Compliance and scope preservation

PASS against [project conventions](../development/project-conventions.md): existing
Java package/PascalCase test, snake_case protected SQL, dated kebab-case report,
development docs in the proper directory, actual requirement IDs, no new routes,
API fields/statuses/dependencies or requirement revision. No approved exception
needed. Historical reports/contracts v1.0 and V1–V18 preserved. The old handoff is
retained after an additive entry. All unrelated pre-existing work, frontend,
environment and business logic outside the reporting read remain untouched.
HEAD/index unchanged; no commit/push/deploy/seed/PRIMARY write or next module.
Final byte/UTF-8/local-link/diff checks include this report.
Checked 1,051 pre-existing files: only the eight authorized modifications above;
the other 1,043 files are byte-identical. Exactly three task files were added.

Local evidence (ignored; not committed):
[full verify](../../backend/target/staff-pos-v19-resolution-2026-10-30/backend-verify.log),
[installer](../../backend/target/staff-pos-v19-resolution-2026-10-30/installer-evidence.txt),
[migration](../../backend/target/staff-pos-v19-resolution-2026-10-30/review-evidence.txt),
[PRIMARY equality](../../backend/target/staff-pos-v19-resolution-2026-10-30/primary-catalog-equality.txt),
[status](../../backend/target/staff-pos-v19-resolution-2026-10-30/primary-db-status.log),
[checksum/cleanup](../../backend/target/staff-pos-v19-resolution-2026-10-30/local-final-evidence.log),
[source preservation](../../backend/target/staff-pos-v19-resolution-2026-10-30/source-preservation.txt).
