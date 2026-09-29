# Smart Cinema Implementation Report

## 1. Task Information

- Task: Concession catalog, Booking Concessions and safe pre-Payment Promotion boundary.
- Date: 2026-09-29.
- Module: Customer Booking composition / Concession persistence.
- Type: backend implementation, V7 migration, API documentation and handoff reconciliation.
- Status: **PASS for Concession implementation and the authorized Promotion persistence boundary. PARTIAL for functional Promotion application; unresolved policy is explicitly DEFERRED.**
- Entry baseline: clean tree at `d44999a`. No commit or production deployment performed.

## 2. Requested Work

Implement ACTIVE Customer catalog, POPCORN/DRINK/COMBO add-on lines, immutable catalog snapshots, eligible pre-Payment quantity edits/removal and authoritative totals without changing Seat/Hold ownership/deadlines. Implement Promotion only where approved policy is sufficient; otherwise stop at safe persistence/contract boundaries. Preserve Payment/PAID/CONSUMED/sold/Ticket/QR prohibitions and immutable historical migrations. Update current handoff and verify documentation.

## 3. Documents Reviewed

- [AGENTS.md](../../AGENTS.md), [development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [project conventions](../development/project-conventions.md), backend workflow and coding/document/traceability rules.
- [Project context](../ai/project-context.md) and [current handoff](../ai/current-handoff.md).
- [SRS v1.2](../srs/srs-v1.2.md) §§3.6–3.8/data requirements; [BRD v1.2](../brd/brd-v1.2.md); [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md) §§29/29A; [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx) UC-CUS-012 and UC-CUS-015.
- [Approved database decisions](../db/database-design-decisions-v1.0.md), [physical dictionary](../db/physical-data-dictionary-v1.0.md), [integrity design](../db/integrity-enforcement-design-v1.0.md), V1–V6 migrations and current Booking/Seat implementation.
- [Booking v1.0](../api/booking-contract-v1.0.md), [latest Booking report](2026-09-28_booking-backend_report.md), [Concession preview report](2026-09-27_concession-selection-frontend_report.md), [Summary/Promotion preview report](2026-09-28_booking-summary-frontend_report.md).

## 4. Requirements Traceability

| Requirement / source | Obligation | Applicable | Result |
|---|---|---|---|
| BR-065; FR-CONCESSION-001/004/006; FR-BOOKING-013 | ACTIVE supported catalog and optional add-ons | Yes | PASS: public ACTIVE catalog; new selections require ACTIVE; only three approved categories |
| BR-066; FR-BOOKING-014/016; FR-CONCESSION-003/005 | Immutable snapshots and quantity edits | Yes | PASS for composition/persistence: name/category/unit price preserved; quantity/total changes only |
| BR-067/035; FR-BOOKING-015 | Server concession/final totals | Yes | PASS: exact decimal arithmetic and deferred aggregate assertions |
| FR-BOOKING-017 | Remove add-ons before Payment | Yes | PASS: owned eligible line removal, totals recalculated |
| FR-BOOKING-018; approved first-initiation decision | Freeze and history protection | Boundary applies | PASS for current stage/guards; actual Payment-attempt freeze integration DEFERRED |
| FR-BOOKING-005/010/011; FR-SEAT-007–011/016 | Expiry, ownership and unchanged Holds | Yes | PASS: existing 144 regressions plus new eligibility/expiry/cancellation races |
| FR-PROMO-001–006; BR-034; FR-BOOKING-008 | Promotion persistence, validation/application | Conditional | PARTIAL: approved schema/FK/static checks only; runtime application/removal and discount policy DEFERRED |
| FR-CONCESSION-002/003 | Full Admin catalog API | Outside Customer scope | NOT APPLICABLE: deployment-only protected configuration routine, no Admin HTTP CRUD |
| SRS/BRD scope; user prohibitions | No stock/POS or Payment/sale issuance | Yes | PASS: no related tables/endpoints/writers; premature transitions still rejected |

The exact real SRS prefix is FR-PROMO, not an invented FR-PROMOTION prefix. No requirements or domain states were rewritten.

## 5. Implementation Summary

### Persistence and protected writes

V7 creates `concession_items`, `booking_concessions` and `promotions`, using dictionary columns, bigint identities, numeric(19,4), timestamp(6) with time zone, named checks/FKs and required indexes. Promotion has code/type/value/window/minimum/usage/status structural constraints and the Booking FK. The Booking stage still requires NULL Promotion and zero discount.

Concession configuration has a restricted deployment routine; no seeded product/price or Admin HTTP API exists. Runtime can read ACTIVE catalog through the public API and mutate owned Booking composition only through a protected routine. New objects use the existing separate NOLOGIN owner with fixed search paths, schema qualification and narrow grants.

Immediate guards preserve Booking identity, original deadline, Seat amount and immutable line snapshots. Header monetary changes are allowed only in an eligible PENDING pre-Payment aggregate. Deferred assertions now reconcile Concession sums on both header and child mutations. Seat insertion is additionally blocked once any origin Hold is attached, preventing a header total update from reopening Seat composition through a changed xmin, including zero-price cases.

### API and totals

- Public `GET /api/v1/concession-items`: ACTIVE items, deterministic category/name/ID ordering, string IDs/exact price strings, empty array support.
- Owned CUSTOMER `POST /api/v1/bookings/{bookingId}/concessions`: new item/quantity line.
- Owned CUSTOMER `PATCH /api/v1/bookings/{bookingId}/concessions/{lineId}`: absolute positive integer quantity.
- Owned CUSTOMER `DELETE /api/v1/bookings/{bookingId}/concessions/{lineId}`: permitted line removal.

All edits return the authoritative BookingResponse, now including snapshot Concession lines. Exact duplicate item lines remain separate as allowed by the approved model; no automatic merge/idempotency policy is invented. PATCH preserves snapshots, including after item deactivation; INACTIVE prevents new additions. DELETE of an absent line returns 404. Request prices/totals/owner/timestamps are rejected.

Seat snapshots are never repriced. Concession subtotal sums retained lines; final total is Seat amount plus Concession amount, discount zero. All writes preserve attached ACTIVE Holds, COUPLE semantics and original deadline. Exact decimal bounds/precision are enforced without introducing provider currency/rounding behavior.

### Concurrency and Promotion boundary

Edits reuse the existing Showtime gate, parent/pair/Booking/Hold lock order and bounded timeouts. New catalog reads take a SHARE lock after aggregate locks; catalog-only configuration takes no earlier domain locks. Current state/time/ownership is checked after waits and before acceptance. Concurrent add/edit/cancel operations commit one consistent aggregate, with no partial totals.

SRS §3.8 requires an explicit Promotion target; integrity design §6 leaves usage consumption/release undefined. The user authorized stopping this part rather than guessing. Consequently no apply/remove/eligibility API, discount calculation or runtime Promotion writer is enabled. Static valid-window/percentage/limit constraints are not claimed as current-time or usage eligibility validation. Frontend demo codes and discounts remain fixtures only.

## 6. Files Created

- [V7 migration](../../backend/src/main/resources/db/migration/V7__create_concession_composition.sql).
- `backend/src/main/java/com/smartcinema/concession/`: ConcessionController, ConcessionService, ConcessionRepository, ConcessionRequest and ConcessionItemResponse Java files.
- [ConcessionPostgresTests](../../backend/src/test/java/com/smartcinema/concession/ConcessionPostgresTests.java), [ConcessionMigrationPostgresTests](../../backend/src/test/java/com/smartcinema/concession/ConcessionMigrationPostgresTests.java), [ConcessionRequestTests](../../backend/src/test/java/com/smartcinema/concession/ConcessionRequestTests.java).
- [Concession composition v1.0](../api/concession-composition-contract-v1.0.md), [Booking v1.1](../api/booking-contract-v1.1.md) and this report.

## 7. Files Modified

- `backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java`: exact public catalog and authenticated Customer write routes, scoped Bearer CSRF exclusions.
- `backend/src/main/java/com/smartcinema/booking/BookingResponse.java` and `BookingRepository.java`: additive snapshot Concession projection shared by detail/create/retry/edit responses.
- `backend/src/main/java/com/smartcinema/booking/BookingExceptionHandler.java`: existing safe ProblemDetail advice also covers Concession operations with applicable generic details.
- `backend/src/test/java/com/smartcinema/SmartCinemaApplicationTests.java`: database-free ConcessionRepository mock.
- `backend/src/test/java/com/smartcinema/booking/BookingMigrationPostgresTests.java`: pins historical V5→V6 test to V6 while allowing a later current application version.
- [Current handoff](../ai/current-handoff.md): V7, latest contracts/report, 163-test result, completed Concession scope, policy deferrals and exact next task.

No files moved. No frontend, historical migration, requirement, historical report or old contract edited. `project-context.md` remains unchanged because no stable architecture/domain decision changed; current handoff explicitly supersedes its dated V6 implementation snapshot.

## 8. Verification

Environment: Java 21, Maven 3.9.16, PostgreSQL 18.4. Dedicated database: `smart_cinema_concession_test_20260929`. Suite fixtures use isolated UUID schemas and committed transactions for races; upgrade tests drop only their own generated schema. No migration checksum repair or production database change.

From `backend/`:

```powershell
$env:DB_URL='jdbc:postgresql://localhost:5432/smart_cinema_concession_test_20260929'
$env:CONCESSION_DB_TESTS='true'
$env:BOOKING_DB_TESTS='true'
$env:SEAT_DB_TESTS='true'
$env:MOVIE_DB_TESTS='true'
$env:DISCOVERY_DB_TESTS='true'
$env:SEAT_HOLD_CLEANUP_ENABLED='false'
mvn verify
```

Final result: **BUILD SUCCESS; 163 tests, 0 failures, 0 errors, 0 skipped**, 49.778 seconds; finished 2026-09-29T12:34:32+07:00. New coverage: 16 PostgreSQL Concession cases, 2 request tests, 1 migration test; all prior 144 regressions also pass. Evidence: generated `backend/target/surefire-reports/TEST-*.xml` and local temporary log `smart-cinema-concession-verify.log`. Generated artifacts are not committed.

| Check | Result / evidence |
|---|---|
| Maven verify/package | PASS: 163 tests and executable JAR |
| Fresh V7 and populated V6→V7 | PASS: existing PENDING Booking/Holds preserved, add-ons work after upgrade, repeat Flyway no-op |
| Historical migration compatibility | PASS: V1–V6 checksums unchanged; existing Auth/Hibernate validation regressions pass; no new JPA mapping |
| Catalog ACTIVE/INACTIVE, empty and ordering | PASS: anonymous read, active-only DTOs, deterministic order, unsupported query rejected |
| Add/update/remove and totals | PASS: real SQL + service + HTTP tests, exact decimal strings, line deletion recalculation |
| Immutable snapshots | PASS: master name/price/status changes do not rewrite selected lines; separate later addition captures new snapshot |
| Concurrent adds/quantities | PASS: no lost aggregate sum; serialized absolute quantities match header total |
| Cancel/edit race | PASS: edit commits before cancel or returns conflict; retained snapshot totals consistent, Holds released once |
| Deadline crossed during lock wait | PASS: actual blocking observed with pg_blocking_pids; edit rejected after expiry with no partial line |
| Ineligible/expired/cancelled Booking | PASS: eligibility/status/ownership checked; closed parents reject edits; historical snapshots remain readable |
| String-safe IDs, body and quantity checks | PASS: IDs above 2^53; numeric IDs, malformed quantities and client price rejected |
| Amount bounds/precision | PASS: overflow, NaN/infinity, negative and over-precision catalog prices rejected without partial edits |
| Authorization | PASS: anonymous reads, authenticated active Customer ownership writes; foreign lines/Booking hidden; wrong role and blocked account rejected |
| Protected roles/deferred guards | PASS: runtime edit allowed, direct DML/TRUNCATE/helpers/configuration denied; partial totals, history rewrites and Seat append after header edit rejected |
| Promotion schema | PASS: structural code uniqueness, type/value/window/minimum/limit/status checks; Booking association/discount still blocked |
| Promotion valid/invalid/expired/ineligible application | DEFERRED: no approved discount/usage policy and no runtime API; not simulated as business compliance |
| Payment/freeze/sale/issuance | PASS for prohibitions: mutation guards reject premature freeze/sale/consumption; actual first-payment freeze race DEFERRED to Payment |
| Direct schema inspection | PASS: three V7 tables owned by smart_cinema_hold_owner; Payment/Ticket tables remain absent |
| Frontend TypeScript/lint/Playwright/visual | NOT RUN: frontend unchanged |
| Scheduled worker timing | NOT RUN: scheduler disabled for deterministic suite; expiry routines tested directly |
| Documentation/link/whitespace/handoff reconciliation | PASS: new contracts/report and updated handoff checked; current next task and Promotion deferrals agree |
| Protected-file preservation | PASS: 273 baseline files unchanged, including requirements, frontend, historical reports/migrations and stable project context |

Final Flyway history:

| Version | Checksum | Result |
|---|---|---|
| V1 | 1536752408 | PASS, unchanged |
| V2 | 1495804464 | PASS, unchanged |
| V3 | 1822747767 | PASS, unchanged |
| V4 | -336975126 | PASS, unchanged |
| V5 | -226696638 | PASS, unchanged |
| V6 | -1104445100 | PASS, unchanged |
| V7 | -2107511975 | PASS |

## 9. Requirement Reconciliation

PASS for approved Concession persistence/catalog, whole Booking composition edits, snapshot integrity, server totals and verification. No original Seat deadline/snapshot/ownership was weakened. No Payment or business policy was silently introduced.

PARTIAL for functional Promotion requirements. Schema checks and the disabled application boundary are delivered; authoritative discount calculation/application/removal requires approved policy. The user's explicit conditional scope allows this safe stop without blocking the independent Concession slice.

## 10. Deviations / Conflicts

Promotion target, minimum basis, currency/rounding/cap details, usage-count consumption/release and revalidation behavior are not sufficiently defined. The contract lists exact decisions needed; no frontend demo algorithm is adopted. The singular Booking reference preserves the model for at most one Promotion, without inventing stacking behavior.

Existing legacy filenames and Flyway convention remain untouched. New contract revisions preserve older reports/contracts instead of making historical verification appear current. No stable domain decision changed, so the user-required project-context update condition was not triggered.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md), including this report and handoff.

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | Existing domain packages, PascalCase Java, forward Flyway file, kebab-case versioned contracts and dated report |
| Code/import naming | PASS | English identifiers, conventional Java imports, no unnecessary interface/implementation pair |
| Domain/status terminology | PASS | Concession/Booking/Promotion; POPCORN/DRINK/COMBO and existing lifecycle values only |
| API convention | PASS | `/api/v1/` resource nouns, precise methods/security, string-safe IDs and ProblemDetail |
| Database convention | PASS | Plural snake_case tables, named constraints/indexes, protected routines, historical migrations preserved |
| Documentation/handoff | PASS | Actual IDs and source links, explicit PARTIAL/DEFERRED, updated exact next task and current contracts/report |
| Frontend conventions | NOT APPLICABLE | No changes |
| Commit/branch | NOT APPLICABLE | No commit/branch created |

## 11. Known Limitations

- Promotion is schema-only. ACTIVE rows cannot be applied; no authoritative discount snapshot beyond enforced zero exists yet.
- No actual first-payment attempt/freeze or verified success finalization; all sale/consumption/issuance remains blocked. Do not drop stage checks in isolation.
- POST creates distinct lines and is not transport-idempotent. Reload after uncertain responses. No automatic item merging, optimistic version or silent retry is promised.
- Existing-line quantity changes are permitted after master deactivation using old snapshots; only new additions require ACTIVE, per the approved snapshot design. Payment must apply its approved eligibility/reconfirmation policy before charging.
- Production currency scale and provider amounts, operational audit integration and deployment role provisioning remain separate work. Local role tests do not certify production credentials.
- Conservative Showtime-wide locking is retained; production load/query-plan tuning and realtime transport remain unmeasured/unimplemented.
- Frontend adapters remain previews. Catalog Admin HTTP CRUD, Booking history integration and legacy Auth numeric-ID correction are outside this slice.

## 12. Next Recommended Step

**Resolve Promotion business policy and finalize its pre-Payment composition contract.** Decide discount/minimum target, rounding/currency/caps, usage accounting/release and pre-Payment revalidation; then authorize guarded implementation with real eligibility/concurrency tests.

For Payment initiation afterward: settle provider/currency contracts, revalidate the owned eligible aggregate, preserve accepted snapshots, and atomically persist the first attempt plus permanent payment_started_at. Add edit-versus-initiation and frozen-child mutation tests. Verified success must later finalize PAID/sold/CONSUMED/Tickets/one Booking QR together; it is not enabled here.
