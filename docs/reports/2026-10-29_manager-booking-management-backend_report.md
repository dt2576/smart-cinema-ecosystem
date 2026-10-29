# MANAGER Booking Management backend

## 1. Task Information

Date: 2026-10-29, Asia/Saigon. Module: cinema-scoped, read-only MANAGER Booking view.
**Implemented; automated verification PASS. Real authenticated MANAGER positive
path BLOCKED because PRIMARY has no suitable existing MANAGER.** No account created.

## 2. Implemented endpoints and scope

| Method | Endpoint | Behavior |
|---|---|---|
| GET | `/api/v1/manager/bookings` | Assigned-Cinema page with exact search and filters |
| GET | `/api/v1/manager/bookings/{bookingId}` | Scoped detail and persisted operational snapshots |

[API contract v1.0](../api/manager-booking-management-contract-v1.0.md) documents
every request/response field. Filters: cinemaId, showtimeId, bookingId, bookingCode,
Booking status, latest-attempt paymentStatus, explicit-offset createdFrom/createdTo,
page and size. Default page0/size20, maximum size100; order createdAt DESC/id ASC.
Unknown/repeated/blank/invalid filters fail safely. Empty and beyond-last pages
return 200 with scoped totals. Detail missing/foreign IDs share the same 404.

IDs and amounts remain exact strings. Details include Cinema/Hall/Movie/Showtime,
creation/original expiry/freeze timestamps, whole Seat Units and price snapshots,
Concession snapshots, stored totals, all Payment attempts and actual Ticket rows.
Customer identity/contact information, QR/Ticket bearer codes, Hold identifiers,
provider references, signing/verification metadata and audit payloads are omitted.

## 3. Documents and requirements reviewed

Canonical workflows/conventions/rules, current handoff and PRIMARY startup guide;
Manager operations/Staff contracts and implementation; Booking v1.0–1.3 and
Customer read/Ticket contracts; actual V6–V10 schema, V17/V18 Manager architecture,
Booking/Payment/Ticket readers, security configuration and tests. Project Scope
v1.0 Booking/Cinema sections and System Analysis v1.1 Manager operational view.

Traceability: SRS v1.2 FR-AUTH-007/008, FR-BOOKING-004/005/006/010/014 and §6.3;
BRD v1.2 Manager actor scope, BR-029/030/031/047/066. These are existing authority/
preservation requirements; the current task explicitly authorizes additive Manager
list/detail APIs. No new requirement, status, role or business workflow invented.

## 4. Authorization, isolation and financial integrity

Existing `/manager/**` JWT MANAGER gate is reused without security-config edits.
Every service request calls existing `ManagerRepository.access`; explicit Cinema
and Showtime filters also pass existing scoped readers. Every list/count/detail
and child query repeats `ManagerScope`: current ACTIVE MANAGER plus ACTIVE,
effective MANAGER assignment. Filters and exact-code search cannot expand scope.
EXISTS avoids count multiplication from historical/duplicate assignment fixtures.
Revocation, future/inactive assignments, role changes and blocked accounts are tested.

Read-only REPEATABLE READ / ten-second transaction, existing statement/lock bounds.
Count/items and detail projections share a snapshot. Revocations committed before
the next request are observed under the existing scope model; no new locking policy.
No writer, settlement, cancellation, refund, override, issuance or check-in invoked.

Stored Booking state is returned separately from the existing read-only EXPIRED
projection. Latest Payment uses initiatedAt DESC/id DESC; missing Payment is null.
An older FAILED attempt does not hide a newer PENDING attempt. Amounts are read,
not recomputed. SUCCESS does not mark Booking PAID or imply issuance. Actual Ticket
count/rows expose issuance evidence without a new issuance state or QR eligibility
promise. COUPLE remains one two-guest Unit.

## 5. Files created / modified

Created in `backend/src/main/java/com/smartcinema/manager/`:
`ManagerBookingController`, `ManagerBookingService`, `ManagerBookingRepository`,
`ManagerBookingQuery`, `ManagerBookingResponse` (all `.java`).

Created five corresponding test classes: `ManagerBookingControllerTests`,
`ManagerBookingServiceTests`, `ManagerBookingQueryTests`,
`ManagerBookingRepositoryTests`, `ManagerBookingPostgresTests`.
Created API contract and this report; current handoff updated additively.

Modified `ManagerExceptionHandler` only to register the new controller, retaining
existing safe ProblemDetail mapping. Added the new repository mock to
`SmartCinemaApplicationTests`, following that isolated context's existing pattern.
No frontend, dependency, configuration, schema or historical migration change.

## 6. Executed test evidence

| Execution | Actual result |
|---|---|
| Initial `mvn verify` | 570 discovered: 227 executed PASS, 343 existing opt-in skips |
| First new HTTP/query/service run | 15 cases, 1 Mockito restubbing error; test fixture corrected with doThrow, no production rule change |
| `mvn '-Dtest=ManagerBooking*Tests' test` with READ TESTS flag | **27/27 PASS**, 0 skipped |
| First full regression after additions | 597 discovered, 15 context errors: new repository was missing from datasource-excluded application-test mocks |
| Affected `SmartCinemaApplicationTests` after mock addition | **15/15 PASS**, unchanged assertions |
| Final `mvn verify`, READ TESTS flag enabled | **254 executed PASS, 0 failures/errors; 343 existing opt-in skips**, 597 discovered; BUILD SUCCESS |

Final command from `backend/`:

```powershell
$env:MANAGER_BOOKING_READ_TESTS='true'
mvn verify
```

All **27 new tests actually ran**, including eight PostgreSQL cases. The 343
pre-existing conditional tests were not enabled; no skip/retry/removal introduced
to mask a failure. This report does not call all 597 cases executed or passed.

SQL fixtures use existing PRIMARY PostgreSQL through enforced **READ ONLY** JDBC
transactions. Each SELECT prefixes isolated `WITH … VALUES` relations that shadow
all domain inputs, following the existing read-only reporting-test approach.
These are explicitly synthetic query-only fixtures, not persisted Bookings,
accounts, financial results, verified callbacks or real Manager authentication.
No local database replacement, new environment, temp table, DDL or operator account.

Coverage: assigned/unassigned/multiple Cinemas, current invalid/future/blocked/
revoked/changed-role access, foreign detail/search/count isolation, filters and
microsecond half-open periods, tied pagination, failed/replacement Payment attempts,
null Payment, exact decimals/bigints, whole COUPLE Units, snapshots, Ticket rows,
SUCCESS without inferred PAID/issuance, SQL parameter binding and no mutation handlers.
Real business-table/history fingerprints and protected function definitions matched
before/after the read-only test runs.

## 7. Real PRIMARY Neon execution

Started root `pnpm dev`, preserving the configured PRIMARY `neondb` target.
Actual startup reported **installed/source V18/V18, pending0, failed0, all18
checksums valid**, migration SKIPPED with no operator credentials loaded.
Spring Boot/Tomcat and Next.js started; monitor reached actual backend/frontend/
matching API-proxy READY. BUILD SUCCESS alone was not used as readiness evidence.

Process-only flags disabled expired-Hold cleanup, invitation delivery and VNPAY
to preserve existing data. No environment file or merchant configuration changed.
Real Edge/HTTP checks: **8 PASS** (matching real genres API/proxy, six Manager
anonymous reads returning401 through backend/proxy, frontend render). No HTTP
response fixtures, forged JWT or auth provisioning used for these checks.

Separate actual-data READ ONLY probe confirmed unknown actor denial, empty scoped
results and no detail exposure using real schema. It found **0 ACTIVE MANAGER,
0 effectively assigned MANAGER**. Therefore authenticated real positive list/detail,
including live revocation, are **BLOCKED / NOT RUN**, not PASS. No credentials or
business data were manufactured to change that outcome. No real Payment SUCCESS,
Booking PAID, provider or issuance claim is made from fixtures.

## 8. Verification artifacts and remaining limits

Ignored evidence: `backend/target/manager-booking-2026-10-29/`:
`booking-tests.log`, `verify-verified.log`, `context-fixed.log`, `startup.log`,
`readonly-sql-preservation.txt`, `primary-read-probe.log`, `real-http.json`,
`real-primary-home.png`, baseline/scope hashes. Logs/reports contain no credentials.

Large-production-dataset performance and real authenticated Manager200 remain
unverified; current statement/page bounds are retained. Positive HTTP scope requires
a separately available, approved existing MANAGER account. No new schema need was
demonstrated; no migration proposed. Existing backend/financial guards preserved.
Frontend, full browser regressions and visual acceptance: NOT APPLICABLE here.

## Requirement reconciliation and Convention Compliance

PASS for authorized read-only scope, minimization, authority, precision and existing
behavior preservation; real Manager positive interoperability remains BLOCKED.
Canonical Java/package/DTO naming, versioned plural resource routes, existing
Manager patterns, English identifiers and new kebab-case API/report paths comply.
Database naming changes: NOT APPLICABLE. No convention exception or BRD/SRS edit.
Historical migrations, frontend, security config, previous work and HEAD/index
preserved; no staging, commit, push or deployment.

Next recommended step: obtain a suitable existing approved Manager for positive
API verification, then separately authorize frontend integration under mandatory
Stitch rules. **Do not start either automatically. Report and STOP.**
