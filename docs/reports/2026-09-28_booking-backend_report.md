# Smart Cinema Implementation Report

## 1. Task Information

- Task: owned Booking aggregate, Booking Seats and permanent Hold attachment before Payment.
- Date: 2026-09-28.
- Module: Customer Booking / Seat Hold backend.
- Type: forward migration, protected persistence, Customer API, concurrency verification and contracts.
- Status: **PASS — approved pre-Payment Booking slice complete. Payment/sale integration explicitly DEFERRED.**
- Task entry: clean tree at `6cb65d0`. No commit or production deployment performed.

## 2. Requested Work

Implement Booking creation from valid owned Holds, one immutable Booking Seat per whole sellable unit, price snapshots, earliest expiry, cancellation and owned detail. Coordinate Booking/Hold operations under the existing PostgreSQL gate. Prepare authoritative sold predicate/uniqueness without enabling Payment, sale, consumption, Ticket or QR writes. Preserve historical migrations and frontend behavior.

The user resolved the initial scope conflict explicitly: Booking stays PENDING until cancellation/expiry; ACTIVE Holds attach without becoming CONSUMED. Only verified Payment SUCCESS may later write sold_at/PAID and consume. Each Seat Unit uses current Showtime base_price, with no type adjustment or automatic COUPLE multiplier.

## 3. Documents Reviewed

- [Development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), backend workflow, coding/document/traceability rules and [project conventions](../development/project-conventions.md).
- [BRD v1.2](../brd/brd-v1.2.md), [SRS v1.2](../srs/srs-v1.2.md), [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md) Booking/Hold/pricing sections, and [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx) Customer Booking flow.
- [Approved decisions](../db/database-design-decisions-v1.0.md), [physical dictionary](../db/physical-data-dictionary-v1.0.md), [integrity enforcement](../db/integrity-enforcement-design-v1.0.md).
- [Seat/Hold v1.0](../api/seat-hold-contract-v1.0.md), [Seat/Hold implementation report](2026-09-28_seat-hold-backend_report.md), V1–V5 SQL and current Seat/Discovery/Auth persistence and tests.
- Frontend Booking Summary preview types/service, [Customer frontend QA report](2026-09-28_customer-frontend-final-qa_report.md) and [implementation plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md). Mock prices/discounts are not production policy.

## 4. Requirements Traceability

| Requirement / source | Description | Applicable | Result |
|---|---|---|---|
| BRD BR-026–028; SRS FR-BOOKING-001–003 | Create owned single-Showtime Booking from multiple valid Holds | Yes | PASS: atomic attachment, strict identity/owner/deadline checks |
| BR-029/030; FR-BOOKING-004/005/011 | Lifecycle, expiration and owner cancellation | Yes | PASS for approved pre-Payment stage; PAID remains disabled |
| BR-031/035; FR-BOOKING-006/007; DR-015 | Server pricing and snapshots | Yes | PASS: one base_price per unit, exact decimal snapshots/totals, immutable on retry/master changes |
| FR-BOOKING-010 | Owned detail | Yes | PASS: protected resource read, safe missing/foreign response |
| FR-BOOKING-012 | No Ticket before Payment | Yes | PASS: no Ticket table/writer/response and QR remains NULL |
| FR-SEAT-005–011/016/017; NFR-CONC-001/005–007 | Exclusive ownership, atomicity, expiry, contention | Yes | PASS: existing tests retained; Booking races and aggregate expiry added |
| FR-SEAT-012; BR-022; NFR-CONC-002 | BOOKED rejection and no double sale | Future Payment boundary | PARTIAL: sold predicate/unique index installed; all sale writes blocked; paid-sale tests DEFERRED |
| FR-BOOKING-018 and approved first-payment decision | Composition freeze | Yes, boundary preservation | PASS for stage guard; actual first-initiation freeze and payment aggregate remain deferred |
| FR-BOOKING-009 | Booking history list | Outside requested detail scope | NOT APPLICABLE to this delivery; list API not implemented |
| FR-BOOKING-008/013–017 | Promotion/Concession composition | Explicitly deferred | NOT APPLICABLE to this delivery; zero add-ons/discount and NULL Promotion |

No requirement IDs or new statuses invented. This report does not amend BRD/SRS.

## 5. Implementation Summary

### Schema and write boundary

V6 adds `bookings` and `booking_seats` with the approved columns/types, candidate keys, money/time/status checks and indexes. Composite origin FKs bind the exact Booking/Showtime/Customer/Seat; the Hold-to-line reference and final aggregate assertions are deferred to permit atomic construction. Holds keep their original identity/expiry and cannot detach or reassign. Snapshot lines cannot be modified/deleted or appended after the creation transaction, including zero-price lines that would otherwise leave totals unchanged.

Promotion, first-payment timestamp, paid state, QR, sold_at and CONSUMED remain prohibited by stage constraints/guards. Promotion FK installation is deferred with its absent parent; NULL-only staging prevents dangling references. The sold-pair partial unique index and matching acquisition/map predicates are installed without permitting synthetic sold records.

The existing separate NOLOGIN owner and runtime grant role are reused. Fixed-search-path schema-qualified create/cancel routines are the only added runtime write entry points. Internal helpers, table DML/TRUNCATE and trigger disabling are not runtime privileges. Existing Auth privileges are preserved.

### Service and API

- `POST /api/v1/bookings`: exact string showtimeId + nonempty string holdIds; 200 for new or eligible exact-set retry.
- `GET /api/v1/bookings/{bookingId}`: active Customer's owned detail, decimal strings and string-safe IDs.
- `DELETE /api/v1/bookings/{bookingId}`: logical cancellation, 204; retained snapshots/history; owned terminal calls idempotent.

No list/admin/update/payment endpoint is added. Body/query validation and ProblemDetail responses follow current conventions. Identity comes from JWT subject and current database account validation; the client supplies no pricing, owner or deadline.

Booking Seat price/type and all Booking amounts are stored snapshots. Movie/Cinema/Hall display names are live references, not invented historical columns. One COUPLE creates one line with two guests and one base price. Detail immediately reports elapsed PENDING as EXPIRED without mutating on GET.

### Atomicity and expiry

Writes use the existing Showtime gate and ordered parent locks. V6 locks the full Showtime physical/pair/Booking/Hold set before aggregate mutation, avoiding later expansion to another attached line in reverse order. It rechecks eligibility and database wall-clock deadlines after waits. All selected Holds attach together; overlapping requests cannot create partial duplicate Bookings.

Exact-set retry returns the same still-valid Booking and stored prices. Subset/superset/mixed attached selections fail. Cancellation releases all exact origin Holds. Expiry follows the earliest origin deadline, including later-deadline members, and acquisition retires whole expired aggregates before replacement. The existing worker uses the new aggregate-aware routine; no new scheduler is needed. Delayed cleanup never releases a replacement Hold.

Seat GET projects BOOKED from sold_at first, then eligibility and live Hold/Booking entitlement. GET own Holds now excludes attached origins; owned Booking detail provides them. V1.1 documents this integration change while preserving V1.0 as historical evidence.

## 6. Files Created

- [V6 migration](../../backend/src/main/resources/db/migration/V6__create_pending_bookings.sql).
- `backend/src/main/java/com/smartcinema/booking/`: BookingController, BookingService, BookingRepository, BookingResponse, BookingRequest and BookingExceptionHandler Java files.
- [BookingRequestTests](../../backend/src/test/java/com/smartcinema/booking/BookingRequestTests.java), [BookingPostgresTests](../../backend/src/test/java/com/smartcinema/booking/BookingPostgresTests.java), [BookingMigrationPostgresTests](../../backend/src/test/java/com/smartcinema/booking/BookingMigrationPostgresTests.java).
- [Booking contract v1.0](../api/booking-contract-v1.0.md), [Seat/Hold contract v1.1](../api/seat-hold-contract-v1.1.md), this report.

## 7. Files Modified

- `backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java`: Customer-only Booking resource rules and exact Bearer write CSRF exemptions.
- `backend/src/main/java/com/smartcinema/seat/SeatRepository.java`: sold predicate, Booking-aware Hold availability and unattached-only own-Hold projection.
- `backend/src/test/java/com/smartcinema/SmartCinemaApplicationTests.java`: BookingRepository mock for database-free tests.
- `backend/src/test/java/com/smartcinema/seat/SeatMigrationPostgresTests.java`: historical V4→V5 upgrade explicitly pinned to V5; current application version may be later.

No files moved. No dependencies, frontend, BRD/SRS, Stitch, historical report or V1–V5 migration changed.

## 8. Verification

Environment: Java 21, Maven 3.9.16, PostgreSQL 18.4. Final disposable database: `smart_cinema_booking_verified_20260928`. Dedicated UUID schemas isolate committed race fixtures. The upgrade test removes only its own schema; suite fixtures remain in disposable databases. No checksum repair was used. Draft V6 corrections were tested against new databases; historical migrations were untouched.

From `backend/`:

```powershell
$env:DB_URL='jdbc:postgresql://localhost:5432/smart_cinema_booking_verified_20260928'
$env:BOOKING_DB_TESTS='true'
$env:SEAT_DB_TESTS='true'
$env:MOVIE_DB_TESTS='true'
$env:DISCOVERY_DB_TESTS='true'
$env:SEAT_HOLD_CLEANUP_ENABLED='false'
mvn verify
```

Final command result: **BUILD SUCCESS; 144 tests, 0 failures, 0 errors, 0 skipped**, 40.452 seconds, finished 2026-09-28T22:49:07+07:00. New coverage: 15 Booking PostgreSQL integration tests, 2 request tests and 1 migration test; existing 126 tests remain passing. Evidence is the local temporary log `smart-cinema-booking-verified.log` and `backend/target/surefire-reports/TEST-*.xml`; generated artifacts are not committed.

| Check | Result / evidence |
|---|---|
| Maven verify/package | PASS: all 144 tests and executable JAR packaging |
| PostgreSQL repository/service/HTTP coverage | PASS in final full run; 15 Booking integration cases plus existing Seat/Discovery/Movie tests |
| Fresh schema and populated V5 upgrade | PASS in final full run; preexisting active Hold attaches after upgrade; restricted role creates/cancels; repeat migration no-op |
| Concurrent exact-set creates | PASS: one Booking identity and one line per unit |
| Overlapping distinct sets | PASS: one 200, one 409, one Booking, no partial attachment |
| Booking versus another Customer's Hold acquisition | PASS: Booking succeeds, conflicting grant fails |
| Expired/released/foreign/missing/mixed-Showtime Holds | PASS: atomic rejection; no new Booking |
| Ownership/auth/input validation | PASS: anonymous/wrong role/inactive account denied; safe foreign 404; strict string IDs and no client pricing |
| Earliest expiry and replacement | PASS: entire Booking expires; later-deadline member becomes available; old cancellation cannot affect replacement |
| Cancellation | PASS: whole owner aggregate, closed-Cinema cancellation, independent release denied, idempotent terminal calls |
| Wait-time expiry | PASS: observes actual blocked waiter with pg_blocking_pids; passes deadline; rejects creation after gate release |
| COUPLE and money snapshots | PASS: one line/two guests/one base price; later master changes do not reprice; aggregate overflow rejected without attachment |
| String-safe IDs | PASS: Booking, line, Seat and Hold IDs beyond 2^53; all API IDs/amounts serialized as strings |
| Deferred assertions and history guards | PASS: empty Booking/partial release cannot commit; no detach/rewrite; zero-price line append blocked |
| Premature sale/freeze/QR/consumption | PASS: protected writes rejected, zero sold rows; no Ticket/Payment table/writer |
| Real sold Seat blocks Hold / paid no-double-sale | DEFERRED: approved Payment boundary prohibits constructing valid sold data in this slice |
| Runtime permissions | PASS: restricted role allowed create/cancel and denied direct mutations/internal helpers |
| Existing Hibernate compatibility | PASS in final full run: context/schema validation and all existing tests; new persistence uses JDBC, no JPA mappings introduced |
| Protected source/docs | PASS: all 261 task-entry SHA-256 baseline files unchanged |
| Scheduled wall-clock invocation | NOT RUN: scheduler disabled for deterministic tests; actual aggregate expiry routine/service tested |
| Frontend TypeScript/lint/Playwright/visual | NOT RUN: frontend unchanged |
| Documentation/link/whitespace | PASS: new contract/report links resolve; tracked and new-file whitespace checks pass |

One initial test fixture used a Booking code longer than varchar(40); the fixture was corrected. Final review added an explicit same-creation-transaction guard for zero-price lines and safe aggregate-overflow handling. Transaction-ID comparison uses native xid8→xid casting, verified locally across the epoch boundary. No business constraint was relaxed to satisfy a test.

Validated final Flyway history and checksums:

| Version | Checksum | Result |
|---|---|---|
| V1 | 1536752408 | PASS, unchanged |
| V2 | 1495804464 | PASS, unchanged |
| V3 | 1822747767 | PASS, unchanged |
| V4 | -336975126 | PASS, unchanged |
| V5 | -226696638 | PASS, unchanged |
| V6 | -1104445100 | PASS |

Direct schema inspection confirms both new tables are owned by `smart_cinema_hold_owner`, and Payment, Ticket, Concession and Promotion tables remain absent.

## 9. Requirement Reconciliation

PASS for the user-approved pre-Payment Booking scope: owned creation/detail, whole-unit snapshots, permanent active-Hold attachment, earliest expiry, cancellation, string safety and concurrency coordination. Existing Discovery eligibility and Hold authority remain intact.

PARTIAL for the original full sale wording: true consumption, BOOKED production data and no-double-sale completion require Payment. Preparatory predicate/index installation and tests that premature writes fail do not prove successful paid finalization. This distinction follows the user's explicit decision and integrity design.

## 10. Deviations / Conflicts

The initial request mentioned Hold consumption/sold writes while forbidding Payment/PAID. The user resolved this by retaining the approved Payment SUCCESS boundary. No sale escape hatch or test-only finalization writer was installed. The unspecified type adjustment was resolved to existing Showtime base_price for every unit; frontend fixture prices remain irrelevant.

Existing convention conflicts: preserve legacy System Analysis DOCX and established Flyway naming. No new convention exception is required. V1.0 Seat/Hold documentation remains historical; a new v1.1 revision records behavior changes.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md), including this report.

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | Lowercase Java package, PascalCase Java files, existing Flyway naming, versioned kebab-case contracts, dated report |
| Code/import naming | PASS | English identifiers, standard Java package imports; existing framework conventions |
| Domain/status terminology | PASS | Booking/Booking Seat/Hold/Showtime; approved uppercase statuses only |
| API convention | PASS | `/api/v1/bookings`, resource methods, string IDs, ProblemDetail, no admin or action-named routes |
| Database convention | PASS | Plural snake_case tables, named keys/checks/indexes, protected routines, forward V6 only |
| Documentation convention | PASS | Version history retained, traceability and limitations explicit; no requirement edits |
| Frontend | NOT APPLICABLE | No changes |
| Branch/commit | NOT APPLICABLE | No branch or commit created |

## 11. Known Limitations

- Payment, paid finalization, consumption, Tickets, Booking QR and first-initiation freeze remain disabled. Sale predicate/index readiness is not a completed Payment contract.
- Concession/Promotion amounts are fixed to zero and Promotion reference NULL. Their catalog/composition/usage rules and FKs remain future work.
- Customer history list and frontend real Booking integration are not implemented. Display names are live references; only approved snapshot columns are persisted.
- Pricing uses exact numeric(19,4) base-price values; currency/minor-unit provider validation must be settled before charging. No pricing adjustment or currency behavior invented.
- Production credentials must use the documented non-owner role. Local restricted-role tests do not certify production deployment access.
- Full Showtime history locking is conservative; production throughput/latency and query-plan tuning remain unmeasured. No realtime/audit event delivery infrastructure was added.
- Failed commands roll back incidental expiry transitions too; reads still ignore elapsed entitlement and later successful commands/cleanup retire it. No transport idempotency key or automatic retry exists.

## 12. Next Recommended Step

Implement separately approved Concession/Promotion persistence and pre-Payment composition edits, with validated policy and aggregate totals. Then implement Payment initiation and backend verification: permanent first-initiation freeze, currency/provider evidence, and atomic successful finalization with sold markers, consumed Holds, Tickets, one Booking QR and audit. Replace all stage guards and add real sold/paid concurrency coverage together before enabling a sale writer.
