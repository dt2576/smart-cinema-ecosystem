# ADMIN Promotion Management backend

## 1. Task Information

- Date: **2026-10-27**. Backend implementation and actual local PostgreSQL/HTTP verification.
- Final decision: **PASS** for the requested backend scope.
- Database: **127.0.0.1:5432/smartcinema_phase4e_test**; installed/source **V16**, pending **0**, failed **0**, checksums valid.

## 2. Requested Work and Documents Reviewed

Implement missing ADMIN Promotion operations using existing policy and protections;
run the real project and tests, document the actual contract. Reviewed AGENTS,
Development/Backend workflows and applicable rules, project conventions, current
handoff/local guide/latest startup report, Scope v1.0 §5.10, BRD/SRS v1.2,
Business Analysis v2.1 §29, System Analysis v1.1 Promotion/Admin use-case inventory,
Promotion v1.0/v1.1, Booking v1.3 and Payment contracts, V7–V10/V13/V15,
actual Promotion/Booking/Payment/admin/security/audit source and test patterns.

## 3. Requirements Traceability

| Source | Implemented/verified result |
|---|---|
| BRD BR-033; SRS FR-PROMO-001; System Analysis v1.1 inventory UC-ADM-010 | Five current-ACTIVE-ADMIN management operations |
| BRD BR-034/035; SRS FR-PROMO-002–006 | Existing backend eligibility, exact pricing, period/minimum/status/usage policy retained |
| SRS FR-BOOKING-008/018; Promotion v1.0/v1.1; Booking v1.3 | Customer apply/remove, snapshot revalidation and permanent first-attempt freeze retained |
| SRS FR-AUDIT-001 | Durable actor/resource/changed-field audit; no-op has no audit; audit failure rolls back master mutation |
| SRS NFR-SEC-002/003/006/010/011 | Auth/current role validation, strict input handling, safe errors/no credentials in evidence |

Actual PAID-count exhaustion and verified provider finalization are not exercised;
the existing policy helper is tested with explicit count arguments, without creating PAID records.

## 4. Existing Functionality and Implementation

Already existed: `promotions`, two discount types, canonical unique immutable code,
validity/minimum/usage/status/cap constraints, deployment-only protected writer,
Customer apply/remove, backend discount calculation, immutable accepted snapshots,
first-initiation revalidation/freeze and backend-only finalization/reconciliation.
Missing ADMIN HTTP management/audited actor boundary is now implemented; no duplication
of pricing formulas or financial writers.

[Actual API contract](../api/admin-promotion-management-contract-v1.0.md):

| Method | Endpoint |
|---|---|
| GET | `/api/v1/admin/promotions` |
| GET | `/api/v1/admin/promotions/{promotionId}` |
| POST | `/api/v1/admin/promotions` |
| PUT | `/api/v1/admin/promotions/{promotionId}` |
| PUT | `/api/v1/admin/promotions/{promotionId}/status` |

Canonical bigint-string IDs, exact decimal strings, explicit-offset UTC instants,
microsecond deadline precision, strict JSON/UTF-8/keys and explicit ACTIVE/INACTIVE.
Code is immutable; content and status commands are separate. No invented timestamps,
description, image, delete, lifecycle, stacking, Cinema scope or redemption counter.
Current account is locked/rechecked for reads and independently in the protected
command. Transactions serialize on actor then Promotion, never reverse-lock Booking.
Bounded timeouts, no-store and safe 400/401/403/404/409/503 responses follow existing patterns.

## 5. Database and Approval

User explicitly answered **“Phê duyệt V16 và phạm vi kiểm thử trên”** before privileged
execution. Existing separate private postgres input and approved fixed-local workflow
installed exactly one forward migration. No role membership/elevation, new database,
reset, repair, seed, direct runtime DML or historical migration edit.

V16 adds one SECURITY DEFINER wrapper owned by `smart_cinema_hold_owner`, qualified
objects/fixed `pg_catalog,pg_temp` search_path, PUBLIC execution revoked, shared-runtime
wrapper EXECUTE and Promotion SELECT. Local app receives only equivalent narrow
grants. Existing raw `configure_promotion` remains denied. Atomic audit records carry
old/new master terms and changed fields; Customer responses never expose them.

Installed V16 checksum **-1194771387**; source SHA256
`023a40e886dfb451f54b44c904274a9966ae2092cea1dfe354ba9e5eaffd95ca`.
Migration reported `APPLICATION_DATA_UNCHANGED=true`. V1–V15 source bytes/checksums
preserved; final Flyway validates all16. Existing-role snapshot remains unchanged.
Test preservation checks verify all original table rows, Flyway history, guards and
restricted runtime. Only labelled new fixtures retained; temporary item-scoped audit
fault functions/triggers removed. Existing Concession regression uses its previously
approved fixture scope, including deletion only of its new unreferenced test actor.

## 6. Files Created / Modified

- New production files under `backend/src/main/java/com/smartcinema/admin/`:
  `AdminPromotion.java`, `AdminPromotionBody.java`, `AdminPromotionController.java`,
  `AdminPromotionExceptionHandler.java`, `AdminPromotionFailure.java`,
  `AdminPromotionRepository.java`, `AdminPromotionRequest.java`,
  `AdminPromotionService.java`, `AdminPromotionWebConfiguration.java`.
- New `backend/src/main/resources/db/migration/V16__guard_admin_promotion_management.sql`.
- New admin tests/support: `AdminPromotionRequestTests.java`,
  `AdminPromotionControllerTests.java`, `AdminPromotionPostgresTests.java`,
  `AdminPromotionHttpPostgresTests.java`, `LocalPromotionTestSupport.java`.
- Modified `AuthSecurityConfiguration.java`: narrow ADMIN Promotion Bearer-CSRF
  matcher under unchanged ADMIN authorization.
- Modified `SmartCinemaApplicationTests.java`: mock new repository in the existing
  database-free application/security fixture; all original assertions retained.
- Modified `LocalConcessionTestSupport.java`: discover/require exact contiguous
  source migration head instead of hardcoded V15; same change in new Promotion helper.
- Modified `backend/scripts/LocalDatabase.java` and `scripts/local-dev.ps1`: extend
  existing narrow-wrapper readiness/provisioning for V16; unchanged startup commands.
- New API contract and this report; additive current handoff/local environment guide.

## 7. Commands and Actual Verification

From root, `.\scripts\local-dev.ps1 -Action Status` before changes confirmed V15/V15,
pending0/failed0. After source changes it truthfully showed V15/V16, pendingV16.
After approval: `.\scripts\local-dev.ps1 -ApproveMigrations` installed V16, then real
Spring8080/Next3000/proxy readiness all PASS. Status rechecked after tests.

From backend, common option:
`-Dspring.config.location=optional:file:target/local-dev/private/runtime.properties`.

| Executed check | Actual result |
|---|---|
| Baseline `mvn '-Dtest=*Tests,!*PostgresTests' verify` | **169/169 PASS**, build PASS |
| New parser/MVC/security focused tests | **18/18 PASS** |
| Final `mvn '-Dtest=*Tests,!*PostgresTests' '-Dspring.flyway.enabled=false' verify` | **187/187 PASS**, executable JAR/repackage PASS |
| Final `mvn '-Dtest=AdminPromotionPostgresTests,AdminPromotionHttpPostgresTests' test` | **16/16 PASS**:13 SQL +3 HTTP; **74 real requests**, zero mocks/interceptions |
| `mvn '-Dtest=AdminConcessionPostgresTests' test` | **12/12 PASS** on V16 |
| Final local Status/read-only SQL/ownership/ACL audit | **PASS** |
| Whitespace/local Markdown links/scope/index/history/privacy | **PASS**;24 scoped files, no broken local links;20 evidence artifacts checked against private input values |
| Frontend tests/build/browser visual checks; unfiltered full backend suite | **NOT RUN**; no frontend implementation, legacy financial-fixture suites excluded |

Opt-in flags `ADMIN_PROMOTION_DB_TESTS=true` and
`ADMIN_PROMOTION_OPERATOR_APPROVED=true` were set only for approved real tests.
Concession regression uses its existing equivalent flags. The Flyway-disable option
is for database-free unit/MVC tests only, preventing an explicit test datasource from
triggering migration; actual migration/startup retain Flyway enabled and validation.
Final selected coverage totals **215 unique tests**, no final failures/errors/skips.
Earlier successful SQL13/HTTP3 runs also exist; final16 is the post-helper-change run,
not additive unique coverage. HTTP74 ran twice; final evidence is74, cumulative148.

Real cases: all five APIs, price precision/status/immutable code/duplicate validation,
anonymous/tampered401, CUSTOMER/STAFF/MANAGER/current-blocked-ADMIN403, missing404,
conflict409, audit/no-op/rollback, two observed PostgreSQL row-lock races, percent
rounding/cap, invalid period/minimum/status, Customer ownership404, changed-terms
initiation409 then explicit reapply, INITIATED freeze409, unchanged expiry/amounts/
Payment snapshots and no premature Ticket. Public Concession catalogue still200.

Evidence: ignored `backend/target/admin-promotion-verification-2026-10-27/`:
`baseline.log`, `focused-unit.log`, `final-source-unit.log`, `startup.log`,
`integration-final.log`, `concession-regression.log`, `status-final.log`,
`postflight-final.log`, sanitized `http-3F2DE7AB-20A6-420F-AE87-EDAA52E73E2F.json`.

## 8. Bugs Found and Fixed

No production business defect found in actual SQL/HTTP execution. Fixed test-harness
class-brace compilation error, missing repository mock, database-free test Flyway
configuration, expected initiation200 (actual controller), uppercase synthetic codes
and comparison excluding fresh `serverTime`. Historical failed compile/context logs
are retained; no test weakening, skip or retry masking. Concession fixture V15
hardcode was a genuine new-head compatibility issue and is now dynamic.

## 9. Requirement Reconciliation / Scope

Requested ADMIN backend, auth/input/audit and real-local verification: **PASS**.
Snapshot/expiry/permanent freeze preservation: **PASS**. Actual provider settlement,
PAID usage exhaustion and issuance: **NOT RUN**, unchanged authority. Final retained
database totals:32 Promotions,20 Bookings,8 Payments,0 Tickets; **PAID0/SUCCESS0**.
Fixtures include genuine INITIATED attempts only. Existing rows preserved; no Neon,
provider/SMTP activation, frontend/Stitch work, deployment, staging/commit/push.
QA app services stopped; database and labelled synthetic fixtures remain.

## Convention Compliance

| Area | Result | Evidence |
|---|---|---|
| Folder/file/Java naming | PASS | Existing admin package, PascalCase classes, standard test placement |
| API/status/domain | PASS | `/api/v1/admin/promotions`, plural resources, canonical field names/statuses |
| Database | PASS | snake_case additive V16; protected owner/audit/locking conventions |
| Documentation/report | PASS | Versioned kebab-case contract, dated report, additive handoff; historical docs preserved |
| Scope/index/history | PASS | Original HEAD/index and V1–V15/financial source preserved; no approved exception needed |

Legacy System Analysis filename is preserved. No requirement IDs/business rules
invented and no BRD/SRS rewrite. Frontend naming/visual conventions: NOT APPLICABLE.

## 10. Remaining Limitations and Next Step

No optimistic version/idempotency key/server pagination introduced; full-term edits
serialize with last committed writer winning. Review owned server reads after uncertain
writes, never blindly repeat creation. No real PAID redemption/provider outcome claimed.
Next smallest separate task: ADMIN Promotion frontend/design integration against the
published verified contract. **Do not start automatically.**
