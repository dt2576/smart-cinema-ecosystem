# Smart Cinema Implementation Report

## 1. Task Information

- Task: Seat, showtime_seats and authoritative PostgreSQL Seat Hold backend.
- Date: 2026-09-28.
- Module: Customer Seat discovery and Hold ownership/lifecycle.
- Type: Backend implementation, forward migration, API contract and verification.
- Status: **PASS for the approved unattached-Hold slice. PARTIAL against the complete Seat requirements: actual BOOKED protection remains deferred to Booking by explicit user decision.**
- Working tree was clean at task entry. No commit or production deployment was performed.

## 2. Requested Work

Implement physical sellable Seat Units, explicit per-Showtime membership, public availability reads and authenticated atomic Hold acquisition/release/expiry. PostgreSQL supplies authoritative time, ownership and exclusivity. Preserve whole COUPLE units and string-safe API IDs. Verify fresh and V4 upgrade migrations, concurrency, eligibility and authorization without creating Booking, Payment or frontend functionality.

## 3. Documents Reviewed

- [Development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), applicable backend workflow, coding/document/traceability rules and [project conventions](../development/project-conventions.md).
- [BRD v1.2](../brd/brd-v1.2.md), Seat requirements BR-017 through BR-025.
- [SRS v1.2](../srs/srs-v1.2.md), Seat requirements, Customer flow, data requirements and concurrency constraints.
- [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md), Seat types, Hold ownership and expiry.
- [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx), UC-CUS-010, UC-SYS-001 and Seat business rules.
- [Database decisions](../db/database-design-decisions-v1.0.md), [physical dictionary](../db/physical-data-dictionary-v1.0.md) and [integrity enforcement](../db/integrity-enforcement-design-v1.0.md).
- [Customer discovery contract](../api/customer-discovery-contract-v1.0.md), existing Movie/Genre behavior, V1–V4 migrations and current backend tests.
- [Customer implementation plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md), current Seat preview contracts/service and final Customer frontend QA evidence. Frontend remains unchanged.

## 4. Requirements Traceability

| Requirement / source | Description | Applicable | Result |
|---|---|---|---|
| BRD v1.2 BR-017; SRS v1.2 FR-SEAT-001, 004 | Per-Showtime Seat map and derived availability | Yes | PARTIAL: AVAILABLE/HELD/UNAVAILABLE implemented; BOOKED deferred until its approved sale authority exists |
| FR-SEAT-003; approved COUPLE decision | STANDARD/VIP/COUPLE; one sellable unit | Yes | PASS: one identity/Hold for COUPLE, two guests; no half-seat API identity |
| BR-018; FR-SEAT-005, 006 | Atomic multi-unit acquisition | Yes | PASS: all requested units accepted or entire transaction rolled back |
| BR-020; FR-SEAT-007 | Customer ownership | Yes | PASS: JWT subject plus current database account; safe foreign-Hold rejection |
| BR-019, 024; FR-SEAT-008, 009, 010 | Configurable TTL, expiry and release | Yes | PASS for unattached Holds; default ten minutes, authoritative deadline, retained history |
| BR-021; FR-SEAT-011; NFR-CONC-001 | Exclusive valid Hold | Yes | PASS: PostgreSQL gate and unique ACTIVE pair; concurrent tests |
| BR-022; FR-SEAT-012 | Reject BOOKED units / prevent double sale | Deferred by user | PARTIAL: not implemented or claimed tested; requires Booking Seat sold marker |
| BR-023; FR-SEAT-016, 017 | Stale/unavailable request validation | Yes | PASS for this schema stage; missing membership and physical unavailability rejected |
| FR-SHOWTIME-008; existing Discovery contract | Start/cutoff and visibility eligibility | Yes | PASS: full eligibility rechecked after locks with database wall-clock time |
| NFR-CONC-005, 006, 007 | Bounded contention and automated hot-seat races | Yes | PASS: bounded timeouts, deterministic safe conflict responses, actual concurrent PostgreSQL tests |
| FR-SEAT-002 | Manager/Admin Seat management | Outside this slice | NOT APPLICABLE to Customer API; restricted one-time configuration routines support valid initial persistence, no admin CRUD |
| BR-025; FR-SEAT-013, 014, 015 | Realtime events | Outside requested slice | NOT APPLICABLE to this delivery; remains unimplemented, not declared fulfilled |

Traceability records implementation evidence; it does not amend BRD/SRS or close the deferred requirements.

## 5. Implementation Summary

### Persistence and integrity

V5 creates only `seats`, `showtime_seats` and `seat_holds`. Approved physical types, nullability, keys, checks and indexes are implemented, including same-Hall composite membership FKs and a partial unique ACTIVE Hold pair. Expiry is checked against time and retired under locks; no time-dependent index predicate is used.

`booking_id` is constrained NULL and CONSUMED is blocked by a stage constraint. No synthetic sold flag, Booking table or fake BOOKED transition exists. Controlled initial configuration checks labels, types/statuses, Hall guest capacity and explicit sellability. Configuration is immutable through this slice after initialization; history guards prevent unsupported reparenting or timing changes.

### API and transaction boundary

The [Seat/Hold contract](../api/seat-hold-contract-v1.0.md) defines:

- Public `GET /api/v1/showtimes/{showtimeId}/seats`.
- Active CUSTOMER `POST` and `GET /api/v1/showtimes/{showtimeId}/seat-holds`.
- Owning active CUSTOMER `DELETE /api/v1/showtimes/{showtimeId}/seat-holds/{holdId}`.

DTO IDs remain strings, including values beyond JavaScript's safe integer range. Requests reject numeric JSON IDs, normalized duplicates, foreign units and unsupported fields. Public availability never reveals other Customers' identities or Hold IDs. ProblemDetail errors distinguish invalid input, authorization, unavailable resources, conflicts and service failure without SQL details.

Database-owned routines lock context and requested units in a consistent order, then sample `clock_timestamp()` and revalidate eligibility. All units succeed together. Same-owner retries preserve the existing Hold identity/deadline. New units in a mixed batch cannot outlive the earliest included existing Hold. New grants are capped by server TTL and Showtime cutoff. Release retains history and cannot affect a later replacement Hold.

Read projections ignore elapsed ACTIVE rows even before cleanup. Scheduled cleanup calls guarded expiry per Showtime in separate bounded transactions. Cleanup timing is not required for correctness. PostgreSQL remains authoritative without Redis.

### Permissions and deployment

New tables and protected routines use a separate NOLOGIN owner. The runtime grant role receives SELECT and only acquire/release/expiry execution; no direct DML, TRUNCATE, trigger disabling, internal helper or initial-configuration execution. SECURITY DEFINER routines have fixed search paths and qualified objects; public execution is revoked.

Production requires separate migration credentials and a non-owner/non-superuser runtime login with the documented grant role and existing Auth/catalog privileges. Local tests use deployment credentials and explicit restricted-role checks. This verifies object privileges, not production credential provisioning.

## 6. Files Created

- [V5 migration](../../backend/src/main/resources/db/migration/V5__create_seats_and_authoritative_holds.sql).
- `backend/src/main/java/com/smartcinema/seat/`: SeatController, SeatService, SeatRepository, SeatRequest, SeatRequestException, SeatUnavailableException, SeatExceptionHandler, SeatHoldSettings and SeatHoldCleanup Java files.
- `backend/src/main/java/com/smartcinema/seat/dto/`: SeatUnitResponse, SeatMapResponse, SeatHoldResponse and SeatHoldBatch Java records.
- [SeatControllerTests](../../backend/src/test/java/com/smartcinema/seat/SeatControllerTests.java), [SeatHoldPostgresTests](../../backend/src/test/java/com/smartcinema/seat/SeatHoldPostgresTests.java) and [SeatMigrationPostgresTests](../../backend/src/test/java/com/smartcinema/seat/SeatMigrationPostgresTests.java).
- [Seat/Hold API contract](../api/seat-hold-contract-v1.0.md) and this report.

## 7. Files Modified

- `backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java`: exact public Seat read and authenticated Customer Hold routes; scoped Bearer write CSRF exemptions.
- `backend/src/main/resources/application.properties`: configurable Hold TTL, transaction timeouts and cleanup settings.
- `backend/src/test/java/com/smartcinema/SmartCinemaApplicationTests.java`: SeatRepository mock for database-free context tests.
- `backend/src/test/java/com/smartcinema/discovery/DiscoveryMigrationPostgresTests.java`: historical V3→V4 test explicitly targets V4; current-version expectation permits later forward migrations.
- `backend/src/test/java/com/smartcinema/discovery/DiscoveryPostgresTests.java`: unknown-route assertion now uses an unimplemented administration route because Seat reads are implemented.

No files moved. No frontend, historical migration, BRD/SRS, Stitch or existing Movie/Discovery application behavior was changed.

## 8. Verification

Environment: Java 21, Maven 3.9.16, local PostgreSQL 18.4. Dedicated database: `smart_cinema_seat_hold_test_20260928`. Concurrency fixtures commit in isolated UUID schemas; they are not claimed to roll back automatically. Upgrade tests drop their own isolated schema.

From `backend/`, final command:

```powershell
$env:DB_URL='jdbc:postgresql://localhost:5432/smart_cinema_seat_hold_test_20260928'
$env:SEAT_DB_TESTS='true'
$env:MOVIE_DB_TESTS='true'
$env:DISCOVERY_DB_TESTS='true'
$env:SEAT_HOLD_CLEANUP_ENABLED='false'
mvn verify
```

Final result: **BUILD SUCCESS; 126 tests, 0 failures, 0 errors, 0 skipped**, 32.794 seconds. Evidence: `backend/target/surefire-reports/TEST-*.xml` and local temporary log `smart-cinema-seat-verify.log`. Reports/build outputs remain untracked generated artifacts. New coverage is 4 controller/input/configuration tests, 15 PostgreSQL Hold tests and 1 PostgreSQL migration test; remaining 106 tests cover existing behavior.

| Check | Result / evidence |
|---|---|
| Maven test/verify and package | PASS: all 126 tests and production JAR packaging |
| PostgreSQL repository/service/controller integration | PASS: actual PostgreSQL routines, JDBC service calls and HTTP/security projections |
| Fresh V5 and populated V4→V5 upgrade | PASS: historical rows/checksums preserved; repeat migration is a no-op |
| Hibernate compatibility | PASS: existing application validation/context succeeds; this slice adds JDBC persistence, no new JPA mappings |
| Concurrent overlapping multi-unit acquisition | PASS: two Customers race; exactly one succeeds, loser gets conflict; no partial batch |
| Same-owner concurrent retry | PASS: same Hold ID/deadline, one ACTIVE record |
| Expiry and reacquisition | PASS: elapsed Hold stops blocking before cleanup, replacement gets new ID, old release cannot affect replacement |
| Ownership and release | PASS: foreign owner rejected safely; owner terminal release idempotent, including closed context |
| COUPLE atomicity | PASS: one stored unit, one requested ID, one Hold, two guests; no selectable half-seat record |
| Start/cutoff revalidation | PASS: test observes an actual blocked waiter using pg_blocking_pids, crosses cutoff, then releases lock; acquisition fails without Holds |
| Ineligible and unavailable units | PASS: parent visibility/status, started Showtime, missing/false membership, maintenance, foreign Hall/Showtime and invalid IDs |
| Contention timeout | PASS: bounded conflict response and no partial records |
| Permissions/history integrity | PASS: restricted-role direct writes/TRUNCATE/trigger disabling/configuration denied; authorized routine works; history rewrite/reparent rejected |
| Public read / authenticated write | PASS: anonymous map; Customer-only ownership writes; current database account revalidation |
| String-safe identifiers | PASS: fixtures above 2^53; JSON string-only input/output, normalized duplicate rejection |
| Real BOOKED rejection | NOT RUN / DEFERRED: no Booking sale authority exists, as explicitly approved |
| Scheduled worker wall-clock execution | NOT RUN: scheduler disabled for deterministic suite; expiry routine/service correctness tested directly |
| TypeScript / ESLint / Playwright / visual review | NOT RUN: no frontend changes |
| Protected files | PASS: baseline SHA-256 comparison of 202 protected files unchanged |
| Documentation links and whitespace | PASS: new contract/report local links resolve; tracked diff and new-file whitespace checked |

Validated Flyway history:

| Version | Checksum | Result |
|---|---|---|
| V1 | 1536752408 | PASS, unchanged |
| V2 | 1495804464 | PASS, unchanged |
| V3 | 1822747767 | PASS, unchanged |
| V4 | -336975126 | PASS, unchanged |
| V5 | -226696638 | PASS, successfully applied |

## 9. Requirement Reconciliation

**PASS** for physical whole-unit persistence, explicit membership, authoritative unattached Hold ownership/TTL, all-or-nothing acquisition, stale-state validation, release, expiry and requested concurrency/authorization checks. Existing Discovery eligibility is preserved and rechecked at command time. No frontend timestamp grants authority.

**PARTIAL** for the complete Seat domain: BOOKED projection/rejection and double-sale proof require Booking persistence; attached-Hold consumption/aggregate expiry are not enabled. Realtime events, full Seat administration and frontend integration remain outside this delivery. No claim of complete BR-022 or FR-SEAT-012 fulfillment is made.

## 10. Deviations / Conflicts

The approved physical model derives BOOKED from `booking_seats.sold_at`, while this task forbids Booking implementation. The user explicitly answered **“Giữ ranh giới, không tạo Booking”** to staging unattached Holds, prohibiting Booking attachment/CONSUMED, and deferring real BOOKED protection. This is an approved delivery boundary, not a BRD/SRS amendment. A future sale writer must not be enabled until the full sold predicate and related guards are installed together.

Existing convention conflicts: legacy System Analysis DOCX filename and established Flyway naming are preserved. No new convention exception requested or introduced. No historical report or requirement revision was overwritten.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md), including this report.

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | Lowercase Java package; PascalCase Java files; versioned kebab-case API document; required dated report name; existing Flyway pattern |
| Code/import naming | PASS | English Java identifiers and normal package imports; no unnecessary implementation-interface pair |
| Domain/status terminology | PASS | Seat/Hall/Showtime/Seat Hold; approved uppercase physical/lifecycle values; availability derived |
| API/routes | PASS | `/api/v1/`, plural resource nouns, kebab-case seat-holds, string DTO IDs |
| Database | PASS | Plural snake_case tables, snake_case columns/constraints/routines; forward V5 only |
| Configuration | PASS | UPPER_SNAKE_CASE environment variables; no new secrets or credentials in documentation |
| Documentation/report | PASS | Requirement evidence separated from scope decisions; relative links checked; report template sections retained |
| Frontend conventions | NOT APPLICABLE | No frontend edits |
| Branch/commit | NOT APPLICABLE | No branch or commit created |

## 11. Known Limitations

- Real BOOKED rejection, attachment/consumption, sale exclusivity and Booking aggregate cleanup remain deferred. Do not deploy a sale writer against this staged schema alone.
- The current Customer Seat UI still uses local preview adapters; this task does not connect it to real Holds.
- Seat labels do not express geometry. Initialization checks label uniqueness and guest capacity, but cannot detect physically overlapping operator labels such as H9-10 together with H9/H10. Each stored COUPLE remains indivisible.
- Runtime configuration is immutable here; guarded future administration is separate. No pricing or VIP behavior was invented.
- No realtime events/outbox, production load/latency certification or deployed production-role setup was verified. Existing local superuser configuration is not a production security recommendation.
- No automatic server retry is added. Clients reload/retry; a new grant after expiry is not an extension of the expired Hold.
- Independent acquisition batches can have different deadlines; a future Booking must honor the earliest participating expiry. Direct operational routine callers must also configure bounded transaction timeouts.

## 12. Next Recommended Step

Implement the approved Booking aggregate in a forward migration: Booking/Booking Seat FKs and assertions, controlled Hold attachment/consumption, authoritative sold predicate in both availability and acquisition under the same gate, aggregate expiry/cancellation and concurrent no-double-sale tests. Preserve owner/deadline validation, price snapshots and the approved atomic first-payment composition freeze boundary. No Payment implementation is implied by this recommendation.

Final task status: **approved Seat/Hold slice complete and verified; Booking-dependent protection explicitly deferred.**
