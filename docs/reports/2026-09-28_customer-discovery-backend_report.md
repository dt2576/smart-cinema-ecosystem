# Customer Cinema, Hall and Showtime Discovery Backend Report

## 1. Task Information

- Date: 2026-09-28.
- Module: Customer discovery; Cinema, Hall and Showtime persistence/read projections.
- Type: backend implementation, contract definition, migration and verification.
- Status: COMPLETE — requested backend discovery slice and final verification PASS; remaining Seat/Hold dependencies documented.

## 2. Requested Work

Define production read contracts for Movie → Cinema → Showtime, implement customer eligibility and server cutoff, string-safe IDs, date/timezone behavior, ProblemDetail responses, approved persistence and automated tests. Preserve Movie/Genre behavior, frontend, historical migrations and requirements. Do not implement Seat/Hold or invent pricing/availability fields.

## 3. Documents Reviewed

- [Development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [backend workflow](../../.agent/workflows/BACKEND_WORKFLOW.md), coding/document/traceability rules and [project conventions](../development/project-conventions.md). No backend-local AGENTS.md exists.
- [SRS v1.2](../srs/srs-v1.2.md), Customer discovery, entity requirements, integrity, authorization matrix and Showtime lifecycle.
- [BRD v1.2](../brd/brd-v1.2.md), Cinema/Hall operations and Showtime requirements; [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md), branch/Hall states and Customer journey.
- [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx), Customer browsing/Showtime use cases and eligibility; [Project Scope](<../project-scope/project-scope v1.0.md>).
- [Database decisions](../db/database-design-decisions-v1.0.md), [physical dictionary](../db/physical-data-dictionary-v1.0.md), [integrity design](../db/integrity-enforcement-design-v1.0.md), V1–V3 and existing repository/service/controller/security/testing conventions.
- [Movie contract](../api/movie-service-contract-v1.0.md), [Genre options](../api/genre-options-contract-v1.0.md), [final Customer QA](2026-09-28_customer-frontend-final-qa_report.md) and current Cinema/Showtime mock DTOs.

Pre-implementation checks selected `com.smartcinema.discovery`, PascalCase Java types, resource GET routes, approved SQL names/statuses, versioned kebab-case contract and the dated report. No convention exception or business requirement change was required. Existing uncommitted frontend QA changes were present at task entry and left untouched.

## 4. Requirements Traceability

| Source / requirement | Implementation evidence | Result |
|---|---|---|
| SRS FR-MOVIE-008; FR-SHOWTIME-006; BRD BR-016 | Movie-filtered Cinema options and Movie/Cinema/date Showtime query | PASS |
| SRS FR-CINEMA-001/002 | Active branch list/detail; optional public contact/operating information | PASS |
| SRS FR-CINEMA-005/008; FR-SHOWTIME-010; BRD BR-010 | ACTIVE branch/Hall predicate; inactive, closed and maintenance resources hidden | PASS for reads; authoring/Booking writes deferred |
| SRS FR-SHOWTIME-008; BRD BR-015 | Strict start/cutoff comparison against a single sampled server instant | PASS for discovery; every future sale command must revalidate |
| SRS FR-SHOWTIME-007 | Active branch listing exists; Cinema-first Movie discovery contract remains unresolved | PARTIAL, explicitly deferred |
| SRS FR-SHOWTIME-004; BRD BR-013 | PostgreSQL exclusion including occupied buffer, DRAFT conflicts, cancelled overlap and adjacency | PASS for database constraint; scheduling workflow deferred |
| SRS FR-SHOWTIME-005; BRD BR-014 | Persist accepted end/buffer and validate interval; no schedule writer introduced | PARTIAL: Movie duration/buffer authoring validation deferred |
| SRS FR-SHOWTIME-009 | Approved numeric(19,4) nonnegative bounded base_price stored; no customer price quote exposed | PASS for persistence; pricing service deferred |
| SRS DR-002/003/013; data requirements §§5.4/5.5/5.7 | Required Cinema/Hall/Movie FKs, finite times, interval checks and approved columns | PASS |
| SRS §6.1; SAD Customer browsing flow | Public read continuation from existing public Movie catalog; Hall identity embedded for grouping | PASS for backend slice; UI adapter replacement not performed |
| SRS FR-SEAT-001/004 and approved showtime_seats decision | No claims of Seat state/sale readiness, no Seat tables or Hold operations | NOT IMPLEMENTED, required next dependency |

No new BR/FR/UC/NFR identifier or status vocabulary was created. Full production Customer fulfillment is not claimed by the PASS labels for this bounded slice.

## 5. Implementation Summary

- Added [Customer discovery contract](../api/customer-discovery-contract-v1.0.md), documenting four public GET routes, projections, strict inputs, ordering, date semantics, safe errors and handoff limitations.
- `GET /api/v1/cinemas?movieId=...`: distinct ACTIVE branches with eligible future screenings for a PUBLISHED Movie. Without movieId returns all ACTIVE branches.
- `GET /api/v1/cinemas/{cinemaId}`: ACTIVE branch detail, indistinguishable missing/hidden 404.
- `GET /api/v1/showtimes?movieId=...&cinemaId=...&date=...`: dates and selected-day screenings; Movie and Cinema required, date defaults to local today.
- `GET /api/v1/showtimes/{showtimeId}`: eligible screening with derived Movie/Cinema/Hall identities and safe detail fields.
- Hall appears only as id/name in Showtime. No standalone Hall administration or unnecessary collection was introduced.
- Shared SQL predicate requires PUBLISHED Movie, ACTIVE Cinema/Hall, OPEN_FOR_BOOKING Showtime and strictly future start/cutoff. No role bypass, stale status-worker dependency, seat inference or client time trust.
- Typed JDBC repository projections avoid exposing persistence internals. The read-only REPEATABLE_READ service uses one UTC Clock instant, while the named chain zone defaults to Asia/Ho_Chi_Minh. Day boundaries use calendar midnight, including daylight-saving rules when configured. Responses disable caching.
- V4 creates only cinemas/halls/showtimes with approved identity/type/null/check/FK/unique/index/exclusion design and btree_gist. No seed rows, Seat/Hold tables or new dependencies.
- Existing Hibernate entity validation still runs; no new JPA mappings or entity write services were needed for read-only projections.

## 6. Files Created

- `backend/src/main/resources/db/migration/V4__create_customer_discovery_tables.sql`
- `backend/src/main/java/com/smartcinema/discovery/`: DiscoveryConfiguration, DiscoveryController, DiscoveryExceptionHandler, DiscoveryQuery, DiscoveryRepository, DiscoveryRequestException, DiscoveryService, DiscoveryUnavailableException.
- `backend/src/main/java/com/smartcinema/discovery/dto/`: CinemaResponse, HallSummary, ShowtimeResponse, ShowtimeSchedule.
- `backend/src/test/java/com/smartcinema/discovery/`: DiscoveryControllerTests, DiscoveryServiceTests, DiscoveryPostgresTests, DiscoveryMigrationPostgresTests.
- `docs/api/customer-discovery-contract-v1.0.md`
- This report.

## 7. Files Modified

- `backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java`: public access allowlist for exactly the four GET patterns; write/unknown routes retain existing protection.
- `backend/src/main/resources/application.properties`: configured discovery zone, UTC JDBC/Hibernate timestamp handling and pooled database session zone.
- `backend/src/test/java/com/smartcinema/SmartCinemaApplicationTests.java`: mock the new discovery repository in the existing database-free application context.

No frontend, Movie/Genre implementation, V1/V2/V3, BRD/SRS, Stitch, prior report or dependency file was modified by this task. No commit or deployment was performed. Prior frontend QA changes remain in the working tree and are not part of this backend slice.

## 8. Verification

Environment: Java 21, Maven 3.9.16, PostgreSQL 18.4; disposable local database `smart_cinema_discovery_test_20260928`. Credentials use existing environment/configuration and are omitted here. Both PostgreSQL opt-in suites were enabled for final verification.

| Check | Final result | Evidence |
|---|---|---|
| Maven tests / verify / package | PASS | Final `mvn verify`: 106 tests, 0 failures, 0 errors, 0 skipped; build/package success, 26.996 seconds |
| Repository/service/controller behavior | PASS | Actual PostgreSQL predicate/date/order queries, HTTP DTO/error checks, service clock/parent checks |
| PostgreSQL integration | PASS | Discovery and existing Movie/Genre database suites enabled; isolated fixtures roll back |
| Fresh migration / V3 upgrade / repeat migration | PASS | Flyway V1–V4 fresh schema; V3 populated schema upgraded to V4 preserving Movie data; repeat migration no-op; validate succeeds |
| Historical checksums | PASS | V1 1536752408; V2 1495804464; V3 1822747767 unchanged; V4 -336975126 |
| Physical integrity | PASS | FK rejection, NO ACTION deletion, text/status/capacity checks, finite time/interval/cutoff checks, numeric negative/NaN/upper-bound rejection, buffer overlap, cancelled overlap and touching intervals |
| Hibernate compatibility | PASS | Existing mappings pass ddl-auto=validate after migration; no new mappings introduced |
| API contract / authorization | PASS | Public GET; unchanged authenticated visibility; hidden data unavailable even to Admin; invalid bearer 401; write/unrelated paths not opened |
| String-safe IDs / data minimization | PASS | IDs above 2^53 returned as strings; no capacity/type/basePrice/hasAvailableSeats leak; bigint overflow rejected |
| Date/time behavior | PASS | Vietnam local day boundaries under a non-UTC database session, exact start and early-cutoff equality, empty past day and future date options; DST boundary unit test |
| Documentation / links / whitespace | PASS | 26 relative links resolve; 19 new files pass whitespace/newline checks; `git diff --check` passes; contract/report reconciled |
| Frontend / browser checks | NOT RUN | No frontend changes; previous final QA is separate evidence |
| Provider / Seat/Hold / production load | NOT RUN | Outside this read slice |

Reproduce from backend using a disposable database:

```powershell
$env:DB_URL='jdbc:postgresql://localhost:5432/smart_cinema_discovery_test_20260928'
$env:MOVIE_DB_TESTS='true'
$env:DISCOVERY_DB_TESTS='true'
mvn verify
```

The `verify` lifecycle includes Maven's test phase. New PostgreSQL tests are opt-in; do not report a flag-disabled run as integration coverage. Migration tests create/drop only their generated `discovery_upgrade_<uuid>` schema. Direct psql inspection confirmed V1–V4 success, eight indexes/constraint-backed indexes for the new tables and zero remaining rows in all three new tables after tests.

One intermediate upgrade-test assertion included Flyway's schema-creation marker as though it were a versioned migration checksum. The assertion was corrected to select versioned migrations; no migration or expected V1–V3 checksum was changed. Existing Mockito dynamic-agent and logging notices are informational.

## 9. Requirement Reconciliation

PASS for the requested discovery backend scope: production read contracts, approved persistence, visibility, server cutoff, named timezone, safe IDs and errors, security and integration coverage. Movie/Genre behavior is preserved. PARTIAL for the complete discovery/booking SRS because Cinema-first Movie discovery, live Seat availability and operational authoring remain separate requirements.

The contract explicitly distinguishes query eligibility from bookability under current Seat state. A future Hold command must not rely on these responses to authorize a hold or sale. No requirements were modified to make tests pass.

## 10. Deviations / Conflicts

- The existing mock Showtime DTO has `hasAvailableSeats`; deriving it from OPEN_FOR_BOOKING would be false authority. It is deliberately absent. Future frontend adapter integration must revise that mock-only assumption and consume the Seat contract for availability.
- Mock CLOSED/UNAVAILABLE and past/sold-out examples are UI states, not new persisted statuses. Production selectable discovery omits ineligible options.
- FR-SHOWTIME-007 establishes Cinema-first search but does not settle its Movie response/filter contract. That decision is recorded, not guessed; Movie endpoints remain unchanged.
- Public access, minimal Hall projection, complete arrays, no advance-window policy and chain timezone are explicit engineering contract decisions within this task's authorized scope.
- Existing historical requirement/report filenames are retained. No new convention exception was needed. Existing unrelated frontend QA changes are preserved.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md), including this report.

| Area | Result | Evidence |
|---|---|---|
| Folder / file / code naming | PASS | Lowercase Java package, PascalCase classes/records, camelCase members; framework test locations retained |
| Domain / status terminology | PASS | Cinema, Hall, Showtime and existing persisted vocabulary; no AVAILABLE/SOLD_OUT lifecycle invented |
| API convention | PASS | `/api/v1/` plural nouns, GET only, explicit input/ProblemDetail contracts, string IDs |
| Database convention | PASS | Plural snake_case tables, named constraints/indexes and approved physical definitions; immutable old migrations |
| Documentation convention | PASS | Versioned kebab-case contract, uniquely dated report, real traceability IDs and preserved historical evidence |
| Frontend conventions | NOT APPLICABLE | No frontend edits |

## 11. Known Limitations and Seat/Hold Dependencies

1. Customer UI still calls local Cinema/Showtime adapters. Contract availability is complete; replacing adapters is a separate frontend integration task.
2. No Seats or showtime_seats exist yet. Hall capacity/layout agreement, indivisible COUPLE geometry, eligibility completeness and sold-out state cannot be inferred from this read model.
3. Next persistence/service slice must implement physical Seats, per-Showtime membership, PostgreSQL-authoritative Holds, ownership, whole-unit atomic acquisition/release, server TTL, conflict responses, clock/realtime/reconnect behavior and start/cutoff revalidation under approved transaction boundaries.
4. No schedule-opening/authoring workflow exists; seed/demo data was not added to production. Before enabling sales, future writers must validate duration/buffer, Hall layout readiness, parent membership history and status transitions.
5. Advance-window/pagination policy and Cinema-first Movie discovery remain unresolved as described in the contract. Multi-timezone branches are not modeled. Deployment must use a named zone available to both Java and PostgreSQL; raw numeric offsets are rejected.
6. Full read arrays and query indexes have not been production load-tested. No browser, external provider, multi-connection schedule-writer race test or live Seat integration was claimed. The exclusion behavior was exercised directly on PostgreSQL; no scheduling writer was added.
7. Auth's previously reported numeric userId precision gap remains unrelated and unchanged. New discovery DTO IDs are string-safe.

## 12. Next Recommended Step

Define and implement the approved Seat/showtime_seats and authoritative Hold contracts, then integrate discovery adapters without fabricating seat availability. Preserve these tests as the read eligibility boundary and add write-time concurrency/ownership acceptance before enabling Booking or payment. This slice does not enable real reservations or sales.
