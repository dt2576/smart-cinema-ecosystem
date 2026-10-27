# ADMIN Reporting & Dashboard backend — implementation report

## 1. Task and outcome

2026-10-27 · ADMIN backend · **PASS** for the implemented read-only API slice.
Four real APIs, common aggregation, actual local startup, PostgreSQL and HTTP
verification completed. No frontend, Manager, Stitch, migration, privilege change,
Neon, deployment, staging, commit or push. Initial working tree was clean at
`d03079bee8ce16578eb8a7a861a20c95ccafafa2`.

## 2. Reviewed authority and reconciliation

Read AGENTS.md, canonical workflows/rules/conventions, current handoff, local
environment/startup documentation, Project Scope v1.0, Business Analysis v2.1
§§40–42, BRD v1.2 §3.1.16, SRS v1.2 §3.13, System Analysis & Design v1.1,
Booking/Concession/Promotion/Payment/VNPAY contracts, integrity v1.2, actual
controllers/services/security and V1–V16 SQL. Requirements were not rewritten.

| Verified requirement | Result and implementation |
|---|---|
| BR-058 / FR-REPORT-002 | PASS — chain-wide ADMIN Dashboard and shared Reporting summary |
| BR-059 / FR-REPORT-003 | PASS — eligible PAID aggregate plus verified, non-reconciliation SUCCESS; no pending/failed revenue |
| BR-060 / FR-REPORT-004–007 | PASS — Ticket issuance counts, Seat Unit occupancy, ranked Movie/Cinema/Showtime breakdowns |
| FR-REPORT-008 | PASS for supported gross snapshot metric; net concession allocation excluded |
| NFR-PERF-006 / NFR-SCALE-005 | PARTIAL — bounded read-only SQL, timeouts, no row locks/N+1; local plan measured, production load/isolation capacity unverified |
| FR-REPORT-001 | NOT APPLICABLE — Manager deliberately excluded |

System Analysis ADMIN chain-dashboard/revenue/Concession use cases provide
supporting scope; no new business-rule IDs, statuses or financial transitions.
BRD narrative UserStatistics has no agreed metric/filter definition for this
slice; not exposed as an invented KPI.

## 3. APIs and exact metrics

Full response/filter/error contract:
[ADMIN Reporting v1.0](../api/admin-reporting-dashboard-contract-v1.0.md).

- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/reports/summary`
- `GET /api/v1/admin/reports/daily`
- `GET /api/v1/admin/reports/breakdowns?dimension=CINEMA|MOVIE|SHOWTIME`

Required `from`/`to`: half-open local dates in `Asia/Ho_Chi_Minh`, maximum366 days
(technical query bound). Optional canonical bigint-string Cinema/Movie/Showtime
filters intersect. Breakdown page/size bounded; numeric IDs and counts and exact
four-decimal amounts remain strings. Empty series is zero-filled, empty occupancy
is null. No-store responses; safe400/401/403/503. ADMIN token and current ACTIVE
ADMIN row required. Existing locking mutation authorizer is preserved.

| Metrics shared by Dashboard/Reporting | Source/grain/date |
|---|---|
| confirmedRevenue | Sum Booking final_amount after discount, one eligible Booking, paid_at |
| grossAmount / discountAmount | Frozen subtotal / discount on those Bookings |
| seatGrossAmount / concessionGrossAmount | Frozen seat_amount / concession_amount before overall discount |
| confirmedBookings / ticketsSold / guestsSold | Eligible Booking / issued Ticket / purchased guest capacity; COUPLE one Ticket, two guests |
| bookingsCreated | All statuses by Booking created_at |
| showtimes | SCHEDULED/OPEN_FOR_BOOKING/STARTED/ENDED by start_time; excludes DRAFT/CANCELLED |
| capacitySeatUnits / soldSeatUnits | Frozen is_sellable Showtime membership / PAID sold Booking Seats on that Showtime cohort, regardless payment date |
| occupancyPercent | Weighted sold units / capacity units ×100, four decimals |

Financial eligibility requires exactly one SUCCESS attempt, positive amount
matching frozen final_amount, VNPAY/VND/SANDBOX, completed_at, backend IPN/QUERY
SUCCESS evidence, no reconciliation flag on any attempt, and coherent issued/sold
Seat Units. Protected database finalization remains authoritative. Ticket statuses
VALID/CHECKED_IN/EXPIRED/CANCELLED preserve historical issuance; cancellation does
not fabricate a refund. Finance exclusions do not free physical Seat Units.
Current catalog names label historical rows; prices remain Booking snapshots.

Preaggregate payments and issuance per Booking; evidence uses EXISTS. Thus retries,
duplicate evidence, multiple Tickets and Concession children cannot multiply
financial headers. One event stream produces summary, daily and breakdowns;
Dashboard invokes the exact summary service. Per-request REPEATABLE READ consistency;
separate requests may see later commits. No bank-settlement/real-money claim:
the response explicitly identifies **SANDBOX**.

## 4. Files created and modified

Created under `backend/src/main/java/com/smartcinema/admin/`:
`AdminReportQuery`, `AdminReportResponse`, `AdminReportSql`, `AdminReportRepository`,
`AdminReportService`, `AdminReportingController`, `AdminReportFailure`,
`AdminReportExceptionHandler` (all `.java`).

Created under `backend/src/test/java/com/smartcinema/admin/`:
`AdminReportQueryTests`, `AdminReportingControllerTests`, `AdminReportPostgresTests`,
`AdminReportHttpPostgresTests`, `LocalReportTestSupport` (all `.java`).

Modified `AdminAccessService.java` additively with nonlocking current-role read;
`SmartCinemaApplicationTests.java` with new repository mock for its no-DB context.
Created API contract and this report; additive current-handoff entry. No new
dependencies, environment changes, schema objects or historical report edits.

## 5. Actual execution and verification

Only database: **127.0.0.1:5432/smartcinema_phase4e_test**, PostgreSQL18.4.
Existing workflow `./scripts/local-dev.ps1` started Spring Boot8080 and Next.js3000;
its health monitor confirmed both and the real Next→Spring API proxy. Restarted
through that same workflow after final presentation-label SQL refinement.
`./scripts/local-dev.ps1 -Action Status` confirmed **installed/source V16,
pending0, failed0, all16 checksums valid**, unchanged role attributes/membership.
Migration skipped; administrator credentials were not loaded. No new migration.

Commands below ran from `backend/`; every Maven invocation used
`-Dspring.config.location=optional:file:target/local-dev/private/runtime.properties`
and test invocations used `-Dspring.flyway.enabled=false` (startup itself still
validated Flyway through the established workflow).

| Executed command / evidence | Actual final result |
|---|---|
| Baseline `mvn '-Dtest=*Tests,!*PostgresTests' ... verify` | 187 tests,0 failures/errors/skips; BUILD SUCCESS |
| Final same non-DB regression command | **197 tests,0 failures/errors/skips; BUILD SUCCESS**; includes10 new request/MVC tests |
| `$env:ADMIN_REPORT_DB_TESTS='true'; mvn '-Dtest=AdminReportPostgresTests' ... test` | **12 tests,0 failures/errors/skips; BUILD SUCCESS** |
| `$env:ADMIN_REPORT_HTTP_TESTS='true'; mvn '-Dtest=AdminReportHttpPostgresTests' ... test` after health READY | **3 tests,0 failures/errors/skips; BUILD SUCCESS** |
| Total distinct selected final tests | **212 PASS** =187 existing +25 new; not a full destructive PostgreSQL suite |
| TypeScript/lint/frontend build/browser UI | NOT RUN — backend-only, frontend unchanged; Next startup/proxy health verified |
| Final diff/convention/preservation checks | PASS |

Regression includes BookingRead6, BookingRequest2, ConcessionRequest2,
PromotionRequest1, VnpayProtocol16, ADMIN Concession22, ADMIN Promotion18 and
existing authentication/security/Staff coverage, within the197 above. Broader
financial PostgreSQL suites requiring persisted PAID/SUCCESS/Ticket fixtures were
not executed on this operational local database.

Evidence under ignored `backend/target/admin-reporting-dashboard-2026-10-27/`:
`baseline-unit.log`, `regression.log`, `sql-final.log`, `http-final.log`,
`startup.log`, `status-final.log`, `real-http.json`, `real-summary.json`,
`database-before.json`, `database-preservation.txt`, `summary-explain.txt`.

### Evidence boundaries

- **Real local HTTP:** approved existing synthetic ADMIN normal login;30 GET
  requests across all4 routes, all3 dimensions/paging, daily sums, exact string
  serialization, empty/filter validation, anonymous/tampered401, no-store and
  Dashboard equality. One normal login creates a refresh session; no business
  fixture/account/catalog writes.
- **Real current-account SQL:** existing ACTIVE ADMIN accepted; all existing
  non-ADMIN/blocked actors and missing actor denied, in READ ONLY transactions.
  Wrong-role HTTP403, stale-ADMIN403 and database-failure503 use explicit MVC fixtures;
  no other account was provisioned or credential-reset for live role testing.
- **Real legitimate data, October2026:**20 Bookings created,20 Showtimes,20
  sellable Seat Units,0 sold units; confirmed revenue `0.0000`, tickets0.
  The database has20 Bookings,8 Payment attempts and0 Tickets. No operational
  PAID/SUCCESS was created; positive live financial proof is unavailable.
- **PostgreSQL financial tests:** exact production SQL over test-only VALUES
  CTEs shadowing source relations, inside READ ONLY transactions. No tables,
  schema, rows, guards or permissions are changed. Covers eligible sales,
  retries/evidence duplication, unpaid/negative/unverified/wrong amount/currency/
  environment/reconciliation/extra-success exclusions, incoherent issuance,
  COUPLE, expired/cancelled Ticket history, weighted occupancy, payment versus
  Showtime cohort, microsecond half-open GMT+7 boundaries, zero-filled dates,
  dimension/filter/paging consistency and aggregate `1999999999999998.0000`
  beyond single-row precision. Fixtures are not signed-callback/live settlement evidence.
- **Preservation:** before/after count+ordered row hashes match across16 business/
  Flyway tables, plus protected function-definition digest. Includes171 users,
  24 Cinemas,49 Concessions,33 Promotions,20 Bookings,8 Payments,0 Tickets.
  Runtime stays restricted; no operator connection or additional grants.
- **Performance:** actual summary EXPLAIN ANALYZE/BUFFERS, planning1.728ms,
  execution0.643ms on this small local dataset. No N+1; count/page share a
  snapshot. Technical limits:366days,100rows/page,5s statement/2s lock/10s
  transaction timeout. No production load benchmark or index benefit asserted.

## 6. Defects and fixes

During implementation review, nullable sold/issued comparisons were wrapped in
COALESCE(false), preventing BOOL_AND from ignoring an incoherent Seat Unit.
Initial test harness errors were corrected: inet output needed host() to remove
`/32`, MVC needed the existing StaffRateLimiter mock, preservation table name is
`concession_items`. Initial focused run11 tests/6 errors, next11/1 error; final
request/MVC and SQL runs pass. An early HTTP attempt failed with connection-refused
before Spring health READY; rerun only after actual readiness passed. No automatic
test retry, skipped failing test, disabled integrity rule or hidden failure.
No defect in existing financial writers or startup/migration workflow was found.

## 7. Limits, convention compliance and next step

Unsupported: refunds/reversals ledger, bank settlement, net Concession discount
allocation, inventory analytics, demographics/UserStatistics, Manager scope,
exports and frontend. Reconciliation flag is sticky in the existing backend;
manual case resolution alone does not restore confirmed-report eligibility.
Production-volume performance and positive operational financial interoperability
remain unverified. Existing VNPAY gates/secrets and financial state machines untouched.

| Convention area | Result |
|---|---|
| Folder/file/package/class/member naming | PASS — existing Java packages, PascalCase classes, camelCase members |
| Domain/status/IDs/money | PASS — existing terminology/statuses; exact string wire values |
| APIs/imports/architecture | PASS — versioned noun routes; controller/service/repository; shared aggregation |
| Database | PASS — read-only existing snake_case objects, parameterized SQL, no migration |
| Documentation/report/handoff | PASS — lowercase versioned contract and required dated report; additive handoff |
| Frontend/routes/design tokens | NOT APPLICABLE — unchanged |
| Existing conflicts/exceptions | Legacy DOCX filename preserved; no new convention exception |

Report itself rechecked against [canonical conventions](../development/project-conventions.md).
Next recommended task: review this metric/API contract, then independently approve
ADMIN Reporting/Dashboard frontend scope and design. **No frontend or Manager
work started automatically.**
