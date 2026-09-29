# Smart Cinema Implementation Report

## 1. Task Information

- Task: Functional Promotion pre-Payment composition
- Date: 2026-09-29
- Module: Promotion / Booking / PostgreSQL
- Type: Backend implementation, migration, verification and contract revision
- Status: COMPLETE for the pre-Payment slice; final applicable checks PASS
- Task-entry commit: `09b39c8`

## 2. Requested Work

Implement owned apply/remove, approved eligibility/calculation, persistent terms
and discount snapshot, authoritative totals and concurrency. Preserve all
Payment/sale/issuance prohibitions and historical migrations/contracts/reports.

## 3. Documents Reviewed

AGENTS.md, development workflow, project conventions and coding/document/traceability
rules; AI context/handoff; Concession v1.0 and V7 report; Booking v1.1/base;
V1–V7 persistence and guards; SRS v1.2 Promotion/Booking requirements, BRD v1.2
BR-034/035, Business Analysis v2.1 Promotion section, physical dictionary and
integrity design Promotion/lock/freeze sections. The explicit user-approved policy
resolves prior policy gaps; old design documents remain historical design references.

## 4. Requirements Traceability

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| FR-BOOKING-008 | Apply eligible Promotion | Yes | PASS, owned apply/replace/remove |
| FR-PROMO-002/005; BR-034 | Server-time window and ACTIVE validation | Yes | PASS, including post-lock wait |
| FR-PROMO-003 | Usage limit | Pre-Payment boundary | PASS validation/count policy; actual consumption and exhaustion with real PAID data deferred to Payment |
| FR-PROMO-004 | Minimum order | Yes | PASS, whole pre-discount subtotal |
| FR-PROMO-006; BR-035 | Backend calculation | Yes | PASS, exact SQL arithmetic, percentage floor/cap, bounded fixed discount |
| FR-BOOKING-013–018 | Concession composition and freeze | Existing behavior | PASS, current eligibility/rollback/history preserved; actual first-attempt freeze deferred |
| Approved 2026-09-29 policy | Types, usage timing, snapshot/freeze boundary | Yes | PASS for current stage, future responsibilities explicitly contracted |
| FR-PROMO-001 | Admin management | Outside Customer scope | NOT APPLICABLE; deployment-only configuration, no Admin HTTP CRUD |

No requirement IDs or unrelated entities introduced.

## 5. Implementation Summary

### Persistence and policy

V8 translates existing FIXED data to FIXED_AMOUNT, adds nullable percentage cap
and Booking Promotion term snapshot columns. Existing `minimum_order` is retained
as the approved minimum_order_amount storage. FK, named checks, numeric(19,4),
historical indexes and all sale/Payment stage guards remain. No usage counter or
redemption entity is added.

Whole Booking subtotal is both discount and minimum basis. Percentage discount
floors to whole VND and respects cap; fixed discount cannot exceed subtotal.
Snapshot includes code/type/value/minimum/cap; persisted discount/final_amount are
the authoritative result. Reads never join mutable master terms to rewrite history.
Cancellation/expiry preserve snapshots. One singular Promotion reference prevents stacking.

### API and concurrency

- `PUT /api/v1/bookings/{bookingId}/promotion`: apply/reapply/replace by code.
- `DELETE /api/v1/bookings/{bookingId}/promotion`: remove, including an invalid old code.
- Both return authoritative BookingResponse with nullable Promotion snapshot.

JWT actor and active CUSTOMER ownership are revalidated. IDs/amounts remain
strings; strict request/query validation and safe ProblemDetail errors follow
existing conventions. Promotion lookup failure, inactive/future/expired/minimum/
usage ineligibility use safe 409 responses without SQL leakage.

The existing aggregate locks serialize apply/remove with Concession changes,
cancel and expiry. Promotion row lock comes last. Shared Booking guard calculates
discount and snapshots for all accepted composition edits, not only the new API.
An invalid Promotion rolls back the entire Concession edit until removed/replaced.
Master configuration does not lock Bookings or mutate snapshots. Applying consumes
no usage; the count is PAID Bookings under Promotion lock. No caller-supplied count
is exposed to runtime. Internal calculator is deployment/owner-only.

First actual Payment initiation must later revalidate and permanently freeze
accepted composition with a real attempt. This migration still prevents any
payment_started_at, PAID, consumed Hold or sold_at write.

## 6. Files Created

- [V8 migration](../../backend/src/main/resources/db/migration/V8__enable_promotion_composition.sql).
- `backend/src/main/java/com/smartcinema/promotion/`: PromotionController, PromotionRequest, PromotionRepository, PromotionService.
- `backend/src/test/java/com/smartcinema/promotion/`: PromotionRequestTests, PromotionPostgresTests, PromotionMigrationPostgresTests.
- [Promotion contract v1.0](../api/promotion-composition-contract-v1.0.md), [Booking v1.2](../api/booking-contract-v1.2.md), this report.

## 7. Files Modified

- AuthSecurityConfiguration: exact Customer write routes and existing Bearer CSRF conventions.
- BookingResponse / BookingRepository: nullable stored Promotion snapshot projection.
- BookingExceptionHandler: new controller coverage and safe Promotion conflict.
- SmartCinemaApplicationTests: database-free Promotion repository mock.
- ConcessionPostgresTests: evolves disabled-application expectation to authoritative guard recalculation; static validations retained.
- ConcessionMigrationPostgresTests: pins historical V6→V7 test to V7 while allowing later current head.
- [Current handoff](../ai/current-handoff.md) and [project context](../ai/project-context.md): V8, policy, latest contracts/report and exact next task.

No files moved; no frontend, historical migration/report/contract, BRD or SRS changed.

## 8. Verification

Environment: Windows, Java 21, Maven 3.9.16, PostgreSQL 18.4. Dedicated existing
test database `smart_cinema_concession_test_20260929`; suites isolate UUID schemas.
The new upgrade suite migrates a populated V7 schema containing PENDING Booking,
COUPLE origin Hold and FIXED Promotion to V8, verifies preserved history and
functional discount, checks historical checksums and repeated migration no-op.

From `backend/`:

```powershell
$env:DB_URL='jdbc:postgresql://localhost:5432/smart_cinema_concession_test_20260929'
$env:PROMOTION_DB_TESTS='true'
$env:CONCESSION_DB_TESTS='true'
$env:BOOKING_DB_TESTS='true'
$env:SEAT_DB_TESTS='true'
$env:MOVIE_DB_TESTS='true'
$env:DISCOVERY_DB_TESTS='true'
$env:SEAT_HOLD_CLEANUP_ENABLED='false'
mvn verify
```

Final result: **BUILD SUCCESS; 178 tests, 0 failures, 0 errors, 0 skipped**, 50.141
seconds; finished 2026-09-29T19:15:37+07:00. Evidence: generated Surefire XML and
temporary local `smart-cinema-promotion-verify.log`, not committed artifacts.
New coverage: 13 PostgreSQL Promotion tests, 1 migration test, 1 request test.
Initial runs found a test generic-type compile error and a fixture role-reset
error; both were fixed before the final full successful verification.

| Check | Final result / evidence |
|---|---|
| Maven verify / executable build | PASS, 178 tests and repackaged JAR |
| Fresh V8 / populated V7 upgrade | PASS, transformed FIXED data, preserved Booking/Holds, working discount |
| Historical migration checksums | PASS, V1–V7 exact checksum assertions and Flyway validate |
| Valid/unknown/inactive/future/expired Promotion | PASS, HTTP/service/PostgreSQL cases |
| Percentage / fixed / cap / minimum / whole VND | PASS, fractional subtotal, cap, exact minimum boundary, zero discount and fixed over-subtotal |
| Apply / replace / remove / reapply | PASS, one snapshot and consistent totals, remove-without-code accepted |
| Authoritative composition recalculation | PASS, Concession edits update whole discount or atomically roll back below minimum/inactive policy |
| Snapshot preservation | PASS, master edits do not change read snapshots, Seat/Concession price and original expiry preserved; revalidation intentionally refreshes accepted pre-Payment terms |
| Ownership / authorization | PASS, anonymous 401, wrong role/blocked actor 403, foreign/missing Booking 404 |
| String-safe IDs / strict input | PASS, IDs above 2^53, range/shape/query/client discount rejection, decimal strings |
| Booking cancel / expiry / eligibility | PASS, discovery parent state checks, expiry during Promotion lock wait, cancel race and terminal edit rejection |
| Promotion expiry during lock wait | PASS, database time rechecked after waiting |
| Concurrent Promotion / Concession edits | PASS, apply/add, remove/add, competing codes and apply/cancel races; consistent single final aggregate |
| Usage limit | PASS for calculator/count boundary; two PENDING Bookings can apply limit=1, neither consumes usage; internal used=limit rejects |
| Real PAID usage exhaustion / SUCCESS race | DEFERRED, no real paid writer or Payment exists; no fake PAID data manufactured |
| Frozen snapshot mutation race | DEFERRED to actual Payment initiation; current schema rejects creating payment_started_at |
| Runtime grants / configuration checks | PASS, protected apply permitted; direct writes, catalog reads, helper calls and TRUNCATE rejected; invalid value/type/cap/precision rejected |
| No Payment/sale/consumption/issuance | PASS, PAID/freeze/sold/CONSUMED writes remain rejected; no Ticket/QR generation |
| Auth/Hibernate and prior regressions | PASS within full suite; no new JPA mapping |
| Documentation / links / whitespace / handoff | PASS, final changed-file checks and current next task reconciliation |
| TypeScript / ESLint / frontend tests / visual QA | NOT RUN, frontend unchanged |
| Scheduler timing / production load | NOT RUN; cleanup disabled for deterministic tests, expiry routine paths covered |

Historical checksums retained: V1 1536752408; V2 1495804464; V3 1822747767;
V4 -336975126; V5 -226696638; V6 -1104445100; V7 -2107511975.

## 9. Requirement Reconciliation

PASS for functional pre-Payment composition and approved calculation/usage policy.
Actual Payment initiation, consumption and frozen mutation tests are deliberately
DEFERRED, not represented as completed Payment compliance. Holdings, COUPLE
identity, original expiry and no-sale stage remain intact.

## 10. Deviations / Conflicts

The older dictionary/V7 selected FIXED; the explicit approved task selects
FIXED_AMOUNT. V8 translates the data and this new contract records the override
without editing history. Optional cap and term snapshots are authorized additions
needed for this slice, not unrelated entities. Physical minimum_order is retained.

The task did not prescribe invalid-Promotion behavior during Concession edits;
the conservative revalidate-and-rollback behavior was raised as an optional
question and then stated as the implementation assumption. No explicit answer
was received. It neither consumes usage nor silently accepts invalid discount.
Percentage caps with fractional precision floor the capped result to retain the
approved whole-VND percentage rule; fixed amounts retain existing decimal precision.
Provider amount/currency conversion is still a required Payment decision.

No convention exception or historical file rename was required.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md), including this report.

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | Domain package, PascalCase Java, forward Flyway, kebab-case versioned contracts/report |
| Code/domain/status | PASS | English identifiers, approved PERCENTAGE/FIXED_AMOUNT, existing Booking statuses |
| API | PASS | Resource PUT/DELETE, owned Customer, ProblemDetail, string IDs |
| Database | PASS | Named snake_case constraints, protected routines, safe search_path, unchanged migration history |
| Documentation/traceability | PASS | Real IDs, policy approval distinguished from assumptions and deferred Payment work |
| Handoff/context | PASS | Stable policy updated, V8/current links and exact next task reconciled |
| Frontend | NOT APPLICABLE | No changes |
| Commit/branch | NOT APPLICABLE | No commit created |

## 11. Known Limitations

- Pre-Payment snapshot refresh on accepted composition changes is intentional;
  immutable frozen snapshots require the future real attempt boundary.
- Application does not reserve usage. Payment must handle exhaustion concurrently
  with provider settlement without over-redemption or silently changing frozen terms.
- Existing amounts can have four decimals; gateway amount validation/conversion,
  provider identities, idempotency and reconciliation remain unimplemented.
- No Promotion Admin HTTP API, history API, real checkout/frontend integration or
  production load/role certification is added. Legacy Auth numeric-ID gap remains.
- Existing Showtime-wide locks remain conservative; no load-performance claim.

## 12. Next Recommended Step

**Payment initiation + atomic first-payment composition freeze.** Finalize provider
and currency/amount contracts, revalidate owned eligible aggregate and current
Promotion, atomically establish first attempt plus permanent freeze, and test
composition races/retries. Verified SUCCESS consumption/sale/issuance remains a
separate protected completion boundary. See current handoff for the exact task.
