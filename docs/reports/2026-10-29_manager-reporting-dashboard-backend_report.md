# MANAGER Reporting & Dashboard backend

## 1. Task Information

Date: 2026-10-29, Asia/Saigon. Type: read-only backend implementation.

- **IMPLEMENTATION: PASS**.
- **AUTOMATED TESTS: PASS** — 288 executed, zero failures/errors; 343 existing
  conditional tests not enabled. All 34 new cases actually ran.
- **REAL AUTHENTICATED MANAGER VERIFICATION: BLOCKED** — PRIMARY has zero ACTIVE,
  effectively assigned Managers. No account was created, promoted or impersonated.

## 2. Requested Work

Implemented cinema-scoped Dashboard, revenue/activity trends, performance rankings
and Concession reporting. Existing financial recognition, operational occupancy,
current Manager authorization and immutable pricing authority are preserved.
No frontend/Stitch work, migration, privilege change, production financial action,
account provisioning, deployment, staging, commit or push.

## 3. Documents Reviewed

AGENTS; canonical development/backend workflows and applicable coding, document,
convention and traceability rules; current handoff; Project Scope v1.0 §§4.3/5.11;
Business Analysis v2.1 §§40–42; BRD v1.2 §3.1.16; SRS v1.2 §3.13; System Analysis
& Design v1.1 Manager reporting use cases; PRIMARY startup workflow.
Read existing ADMIN Reporting v1.0, Manager Operations/Booking contracts, actual
reporting/Booking/Payment/Ticket/Concession/scope/security source and relevant
V7/V10/V17/V18 schema/guards. Existing reports were preserved. Working tree was
clean before this task; original file/HEAD/index hashes were retained.

## 4. Requirements Traceability

| Existing requirement | Implementation / evidence | Result |
|---|---|---|
| BR-003/057; FR-AUTH-007/008; FR-REPORT-001 | Current Manager gate and Cinema predicate on every aggregate/count/rank | Automated PASS; authenticated PRIMARY positive check BLOCKED |
| BR-059; FR-REPORT-003 | Same verified-sales cohort as ADMIN, exact decimals, no SUCCESS-only recognition | PASS |
| BR-060; FR-REPORT-004/005/006/007 | Ticket/guest distinction, frozen Seat Unit occupancy, scoped Movie/Showtime rankings | PASS |
| BR-066; FR-REPORT-008 | Frozen Concession quantity/gross with eligible-sales gate, no invented net allocation | PASS |
| NFR-PERF-006; NFR-SCALE-005 | Bounded periods/pages, statement/transaction limits, no row locks/N+1 | PARTIAL: structural bounds verified; production load/isolation not benchmarked |

No new requirement IDs, business states, expiry policies or revenue formulas were
invented. No requirements or historical API contract was rewritten.

## 5. Implementation Summary

Full schema, query and metric definitions:
[MANAGER Reporting contract v1.0](../api/manager-reporting-dashboard-contract-v1.0.md).

| Method | Endpoint | Response |
|---|---|---|
| GET | `/api/v1/manager/dashboard` | Summary |
| GET | `/api/v1/manager/reports/summary` | Identical Summary implementation |
| GET | `/api/v1/manager/reports/daily` | Zero-filled local daily Metrics/Activity |
| GET | `/api/v1/manager/reports/breakdowns` | Paginated CINEMA/MOVIE/SHOWTIME performance |
| GET | `/api/v1/manager/reports/concessions` | Paginated product quantities/gross |

Required half-open `from`/`to` calendar dates, `Asia/Ho_Chi_Minh`, maximum 366 days.
Optional Cinema/Movie/Showtime filters intersect. Pagination defaults 0/20, size
maximum 100. Unknown/repeated/blank/noncanonical filters fail safely.
All identities/counts/money/percentages are strings; money has four decimals.
No financial floating point. Zero capacity has null occupancy. Responses and
controller errors are no-store; reporting persistence/timeouts map to safe503.

### Financial correctness

One shared SQL cohort now serves ADMIN and MANAGER. Manager adds only the fixed,
existing Cinema scope predicate before grouping. Recognition requires PAID Booking,
non-null paid_at, exactly one positive matching VNPAY/VND/SANDBOX SUCCESS attempt
with completed_at and backend IPN/QUERY SUCCESS evidence, no reconciliation flag
on any attempt, and coherent nonempty sold/issued Seat Units.

`confirmedRevenue` sums frozen final_amount by paid_at; gross/subtotal, discount,
seat gross and Concession gross retain existing ADMIN definitions. Payments and
issuance preaggregate per Booking; repeated evidence uses EXISTS. Failed/replaced
attempts, multiple evidence rows, Tickets and Concession lines cannot multiply
header revenue. SUCCESS alone, wrong binding/amount, extra SUCCESS, reconciliation
and incoherent issuance are excluded. Reporting neither re-verifies signatures
nor finalizes Payment/Booking/Tickets.

Concession products sum eligible Booking line quantity and total_price, not current
selling_price. Current catalog ID/name/category label grouped history, including
inactive products. Ranking: quantity DESC, gross DESC, numeric ID ASC. Gross is
before whole-Booking discount; no unsupported net allocation, refund, profit,
settlement or production-money metric. Combos are ordered units, not inventory.

All **10 original ADMIN SQL strings** (common cohort, metrics, summary, daily,
three breakdowns and counts) were compared to pre-edit source and are **byte-identical**.
ADMIN Java changes are delegation to the shared SQL and additive visibility for
existing parameter/mapper/Period helpers. ADMIN routes, schema, validation,
authorization and calculations are unchanged.

### Operational correctness

Activity is aggregated separately before combining with financial totals. Booking
statuses use created_at and current stored state; Payment statuses count attempts
by initiated_at; Ticket statuses count actual issued rows by issued_at; all six
Showtime statuses use start_time. Actual checked_in_at supplies checkedInTickets;
reconciliationAttempts counts flagged attempts initiated in period.

These are separate event cohorts, not a conversion funnel or historical state at
day-end. Raw stored PENDING is not silently rewritten to the Booking-view EXPIRED
projection. COUPLE remains one Ticket/Seat Unit and two guests. Check-in counts
Tickets, not inferred guests. Expired/cancelled Ticket history does not invent a
refund. Occupancy remains the existing frozen sellable Unit denominator and PAID
sold Unit numerator on operational Showtimes, independent of financial exclusion.

Movie/Cinema/Showtime ranks include dimensions with financial or operational
events; activity-only rows can have zero revenue. Stable order is confirmed
revenue DESC, ticketsSold DESC, numeric ID ASC. Count/page share one snapshot.

### Authorization and isolation

Existing `/manager/**` JWT gate is unchanged. Each service request invokes current
ManagerRepository.access, then scoped validation for explicit Cinema/Showtime
filters. Shared query scope rechecks current ACTIVE MANAGER and ACTIVE/effective
MANAGER assignment, using EXISTS to prevent duplicate assignment multiplication.
Every financial, activity, daily, count and product input derives from owned
Showtimes before aggregation. Foreign/missing explicit resources share404;
unknown/foreign Movie intersections do not expose global names/counts.

REPEATABLE READ/readOnly/10-second service transaction, existing 5-second statement
and 2-second lock limits. A revocation committed after a snapshot is visible to
the next request. No expiry column/state exists on assignments; inactive/past and
future-effective assignments are handled by existing authority. No read audit
inserts, row locks, financial commands, PII, QR/Ticket codes or provider metadata.

## 6. Files Created

Under `backend/src/main/java/com/smartcinema/manager/`:
`ManagerReportRequest`, `ManagerReportResponse`, `ManagerReportSql`,
`ManagerReportRepository`, `ManagerReportService`, `ManagerReportingController`,
`ManagerReportExceptionHandler` (all `.java`).

Shared `backend/src/main/java/com/smartcinema/reporting/ReportSql.java`.

Under `backend/src/test/java/com/smartcinema/manager/`:
`ManagerReportRequestTests`, `ManagerReportServiceTests`,
`ManagerReportingControllerTests`, `ManagerReportPostgresTests`,
`ManagerReportReadTestSupport` (all `.java`). New API contract and this report.

## 7. Files Modified

- `AdminReportSql.java`: delegates unchanged common financial/occupancy SQL.
- `AdminReportRepository.java`: existing parameters/metrics helpers made public.
- `AdminReportResponse.java`: existing Period factory made public.
- `SmartCinemaApplicationTests.java`: new repository mock for its existing
  datasource-excluded application context; assertions unchanged.
- `docs/ai/current-handoff.md`: additive completion/limitation entry.

No dependencies, environment files, auth configuration, financial/domain writers,
frontend, database objects or historical migrations were changed.

## 8. Verification

Commands from `backend/` unless noted:

| Command / evidence | Actual result |
|---|---|
| Baseline `MANAGER_BOOKING_READ_TESTS=true; mvn verify` | 597 discovered; **254 executed PASS**, 343 existing conditional skips |
| `mvn -DskipTests compile` | BUILD SUCCESS; compilation only, not test evidence |
| Targeted Manager request/service/MVC plus existing ADMIN query/MVC tests | **26/26 PASS**, zero skips |
| `MANAGER_REPORT_READ_TESTS=true; mvn '-Dtest=ManagerReport*Tests,ManagerReportingControllerTests' test` | **34/34 PASS**, zero skips, including18 PostgreSQL tests |
| Final `mvn verify` with both read-test flags | **288 executed PASS**, zero failures/errors; 343 existing conditional skips; 631 discovered; BUILD SUCCESS |
| Original ADMIN SQL compatibility tool | **10/10 byte-identical** SQL strings |
| Root `pnpm dev` | PRIMARY V18/V18 and actual backend/frontend/proxy READY |
| Actual HTTP/Edge checks | **12/12 PASS**, no response mocks |
| Real authenticated Manager positive path | **BLOCKED / NOT RUN** |

Final Maven invocation:

```powershell
$env:MANAGER_REPORT_READ_TESTS='true'
$env:MANAGER_BOOKING_READ_TESTS='true'
mvn verify
```

All 34 new cases actually ran; there was no failing test, skip, retry masking or
assertion weakening. Do not interpret the 631 discovered cases as all executed.
The 343 pre-existing opt-in suites were not enabled on operational Neon.
Frontend typecheck/lint/build/E2E: NOT RUN for this backend-only task; frontend
startup/proxy/browser health were verified and its source is preserved.
Existing StaffWebConfiguration deprecation warning is unrelated and unchanged.

### PostgreSQL evidence boundaries

The 18 cases run on the existing PRIMARY PostgreSQL engine via enforced READ ONLY
JDBC. WITH/VALUES inputs shadow all domain relations only within individual
SELECTs. No temp table, seed, DDL, role/account provisioning or persisted financial
fixture. Synthetic PAID/SUCCESS/evidence/Ticket rows are query-test inputs, not
actual provider verification, signed callbacks, issued Tickets or live revenue.

Coverage: assigned/unassigned/multiple Cinemas; blocked/inactive/future/changed-role
authority; simulated revocation and duplicate history; scoped filters/ranks/counts;
wrong amount/provider/currency/environment/evidence; failed/replaced/duplicate
SUCCESS attempts; repeated evidence; reconciliation versus physical occupancy;
issuance coherence; all Ticket states; COUPLE; exact microsecond Vietnam boundaries;
zero-filled days; activity outside the sales cohort; actual check-in timestamps;
activity-only Movies; stable ties/pages; product snapshots versus catalog prices;
aggregate `1999999999999998.0000`; empty capacity/null occupancy and real schema reads.

Before/after ordered row fingerprints across **19 existing tables/history** and
protected function definitions matched. No existing business data or Flyway
history was changed. Actual summary EXPLAIN on a missing actor: planning2.803ms,
execution0.508ms; this is not an authorized positive-scope production-load benchmark.

### Real PRIMARY execution

Actual root `pnpm dev`, configured PRIMARY `neondb`; **installed/source V18/V18,
pending0, failed0, applied checksums valid**. Migration skipped. Spring Boot,
Next.js and monitor READY verified; Maven BUILD SUCCESS was not used as a health
substitute. Only process environment disabled Hold cleanup, invitation delivery
and VNPAY to avoid background business writes; env files/merchant settings unchanged.

Actual checks: matching genres backend/proxy200; all5 Manager reporting resources
return401 without auth through both ports8080/3000; real Edge homepage renders
without page errors. No credentials/tokens fabricated for live HTTP checks.
Separate actual-table READ ONLY probe verifies unknown actor403, zero scoped
summary, daily series, all three performance dimensions and Concession reads.
Fresh count: **0 ACTIVE MANAGER,0 effectively assigned MANAGER**. Therefore
authenticated positive responses and live assignment revocation remain BLOCKED;
no account/data was manufactured to change that outcome.
QA services were stopped after verification; HTTP checks confirm no remaining
listeners responding on ports3000/8080.

Evidence ignored under `backend/target/manager-reporting-2026-10-29/`:
`baseline-verify.log`, `unit-first.log`, `report-tests-first.log`, `verify-verified.log`,
`startup.log`, `real-http.json`, `real-primary-home.png`, `primary-readonly.log`,
`readonly-preservation.txt`, `primary-summary-explain.txt`,
`admin-sql-compatibility.txt` and baseline/scope hashes. No secrets in report/source.

## 9. Requirement Reconciliation

PASS for authorized read-only scope, consistent revenue definition, exact precision,
data minimization, scoping and bounded API behavior. Automated checks PASS;
authenticated real Manager interoperability BLOCKED. Workload isolation remains
PARTIAL pending real scoped traffic/load evidence. No schema blocker demonstrated.

## 10. Deviations / Conflicts and Limits

- Concession net revenue/refunds/settlement have no authoritative allocation/ledger;
  only eligible frozen gross is provided. No invented zero/net figure.
- Previous-period comparison, weekly/monthly grouping, exports and inventory are
  not provided by the existing shared contract; none is fabricated here.
- Counts reflect current stored states of explicitly dated event cohorts, not
  historical state snapshots or inferred Ticket/admission outcomes.
- Assignments have no independent expiry field. Existing effective/ACTIVE authority
  is preserved; no new assignment lifecycle added.
- Positive Manager HTTP and production load cannot be verified without an existing
  suitable account. Fixtures are not substitutes for that evidence.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md).

| Area | Result | Evidence |
|---|---|---|
| Java/package/DTO naming | PASS | Existing manager feature, shared reporting package, PascalCase classes, camelCase members |
| REST/queries/statuses | PASS | Versioned noun resources, canonical IDs, existing status values and validators |
| Database/API authority | PASS | No migration, writer, role/ownership change or historical contract edit |
| Documentation/report | PASS | Dated requested report, versioned kebab-case contract, actual requirement IDs |
| Tests/preservation | PASS | Existing test layout, original assertions retained, frontend/migrations/HEAD/index checked |

No approved exception or existing convention conflict required remediation in this
scope. Generated target artifacts remain ignored; no staging/commit/push/deploy.
Final scope comparison: 1002 original tracked files,997 unchanged, only the five
listed originals modified;15 new files. Frontend and all18 historical migrations,
HEAD and index unchanged. Strict UTF-8/whitespace and113 local-link checks PASS;
`git diff --check` PASS. The report itself was included in the final check.

## 11. Known Limitations

Real authenticated Manager verification remains BLOCKED by the lack of a suitable
existing account, not by an implemented API/schema failure. The financial cohort
represents verified **SANDBOX** sales, never real-money settlement. No production
load claim from isolated fixtures or a query plan for a missing actor.

## 12. Next Recommended Step

When a suitable existing approved Manager becomes available, perform read-only
authenticated positive checks on PRIMARY. Frontend/Stitch work requires a separate
instruction. Do not provision accounts or start another module automatically.
Report and STOP.
