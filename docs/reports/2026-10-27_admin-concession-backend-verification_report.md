# ADMIN Concession backend verification

## 1. Task Information

- Final decision: **PASS** for the requested local backend verification.
- Tests executed **2026-10-26**; report and final read-only recheck completed **2026-10-27**, Asia/Saigon, after interruption.
- **12/12 PostgreSQL cases, 3/3 real HTTP cases and 169/169 unit/MVC/security regression cases passed**, with0 final failures/errors/skips. HTTP passes comprise a2-case run plus the affected1-case Customer run, not a combined3-case rerun.
- Existing PostgreSQL18.4 database **127.0.0.1:5432/smartcinema_phase4e_test** remains installed/source **V15**, pending0/failed0, checksums valid.

## 2. Requested Work and Documents Reviewed

Complete all five ADMIN APIs, real persistence/audit, Customer compatibility and the12 authored SQL tests. Read AGENTS, canonical Development/Backend workflows and applicable rules, project conventions, handoff, [ADMIN contract v1.0](../api/admin-concession-management-contract-v1.0.md), relevant Concession/Booking contracts, actual Java/SQL and [startup report](2026-10-25_local-startup-migration-workflow_report.md). The completed startup workflow was used unchanged.

## 3. Requirements Traceability

| Source | Verified result |
|---|---|
| SRS v1.2 FR-CONCESSION-001–006 | Five ADMIN endpoints, categories/status, exact prices and ACTIVE-only public catalog |
| BRD v1.2 BR-002/004; SRS FR-AUTH-007/008 | Real login; anonymous/tampered401; CUSTOMER/STAFF/MANAGER and current blocked ADMIN403 on all five endpoints |
| SRS FR-AUDIT-006 | Durable actor/item audit, safe exact delta, no-op without timestamp/audit change, atomic rollback on injected audit failure |
| BRD BR-065/066/067; SRS SR-CONCESSION-01–04 | Customer ADD/PATCH/DELETE, snapshots/totals, ownership, original expiry and first-attempt freeze |
| User safety requirements | Original rows/history/guards preserved; no new DB, migration, runtime privileges or financial success |

## 4. Changes Made / Files

- Added [LocalConcessionTestSupport](../../backend/src/test/java/com/smartcinema/admin/LocalConcessionTestSupport.java): fixed-target test-only connections, private operator ACL/approval checks, restricted-role checks and original-row/history/guard preservation assertions.
- Modified [AdminConcessionPostgresTests](../../backend/src/test/java/com/smartcinema/admin/AdminConcessionPostgresTests.java): retain all12 cases; use the separately approved operator for fixture/audit setup; fix fixture timestamp drift.
- Added [AdminConcessionHttpPostgresTests](../../backend/src/test/java/com/smartcinema/admin/AdminConcessionHttpPostgresTests.java):3 unmocked live HTTP cases with real authentication and SQL persistence/audit assertions.
- Updated [local test guide](../development/local-test-environment.md) and [handoff](../ai/current-handoff.md); created this report.

No production feature defect was found. Backend/frontend business source, API contracts, V1–V15, environment inputs, startup scripts and historical reports were not edited by this task.

## 5. Approved Test Setup

Before privileged fixture/audit access, the user explicitly replied **“Phê duyệt phạm vi test nêu trên”** to the exact scope: new synthetic users/catalog/unpaid Bookings; changes only to new test users; audit reads; a new item-scoped rejection trigger/function with cleanup; deletion only of a new unreferenced actor for the deleted-actor case. No PAID/SUCCESS/Ticket creation.

The existing owner-only ignored `.env.local-test-migration` supplies operator credentials only for that setup. Concession commands and the running server retain restricted app credentials. App and migrator are checked to have no protected-owner SET authority or membership. Every JDBC connection checks physical server/database/schema/session identity. No GRANT/REVOKE, role elevation, guard disabling or migration is performed.

Fixtures remain for review. After each class, assertions compare every pre-existing row's server-side hash, exact Flyway history and enabled trigger definitions. Only the approved new unreferenced actor and temporary item-scoped fault trigger/function are removed. Existing accounts/history are preserved.

## 6. Actual Commands Executed

From root: `.\scripts\local-dev.ps1 -Action Status`, then `.\scripts\local-dev.ps1`. Real backend/frontend/API proxy readiness passed; migration was skipped because V15 was current.

From backend, with process-scoped `ADMIN_CONCESSION_DB_TESTS=true` and `ADMIN_CONCESSION_OPERATOR_APPROVED=true`, removed afterward:

```powershell
mvn -o test-compile
mvn -o '-Dtest=AdminConcessionPostgresTests,AdminConcessionHttpPostgresTests' test
mvn -o '-Dtest=AdminConcessionHttpPostgresTests' test
mvn -o '-Dtest=AdminConcessionHttpPostgresTests#customerHttpCompositionRetainsSnapshotsOwnershipExpiryAndPaymentFreeze' test
```

Regression used process-only `SPRING_CONFIG_LOCATION` pointing to the existing private generated runtime profile and `SPRING_PROFILES_ACTIVE=local-test`, preventing remote `.env` imports:

```powershell
mvn -o '-Dtest=*Tests,!*PostgresTests' verify
```

This169-case selection excludes PostgreSQL test classes. One Spring context also performed read-only local Flyway validation, confirming no migration necessary. JAR/repackage passed. Older PostgreSQL suites that manufacture financial/issuance fixtures were not run.

## 7. Actual Results

| API or check | Result |
|---|---|
| GET `/api/v1/admin/concession-items` | PASS: persisted ACTIVE/INACTIVE list, proxy, no query parameters |
| GET same base `/{itemId}` | PASS: detail/reload, canonical string IDs,400 invalid/overflow IDs,404 absent item |
| POST collection | PASS:201/Location, string IDs/prices, null image, duplicate names, exact zero and999999999999999.9999 persistence |
| PUT `/{itemId}` | PASS: content/price changes preserve status/image/identity/creation; no-op preserves timestamp/audit |
| PUT `/{itemId}/status` | PASS: deactivate/reactivate; public catalog excludes/includes item; content preserved |
| Validation/authentication/authorization | PASS: overprecision/negative/exponent/nonfinite/numeric prices, invalid fields/status/category/name, duplicate/unknown/missing JSON keys, malformed UTF-8/JSON/oversized body,401/403/no-store |
| Audit and DB permissions | PASS: actual actor/resource events, safe exact delta, audit-failure rollback, no-op, denied direct DML/raw configure and current-account recheck |
| Customer HTTP compatibility | PASS: POST/PATCH/DELETE, snapshots after master change/deactivation, inactive ADD409, foreign ownership404, totals/expiry unchanged, all edits409 after INITIATED, no Ticket |
| Concurrency | PASS: real lock waits; Customer ADD before price update retains old snapshot; Admin deactivation before ADD rejects without a line |
| Final PostgreSQL cases | **12/12 PASS** |
| Final HTTP cases | **3/3 PASS**, across2-case and affected1-case runs; **99 actual requests** (80+19), all expected statuses, no API interception or forged JWT |
| Regression/build | **169/169 PASS**,0 failures/errors/skips,25.974s; executable JAR/repackage PASS |

Final read-only recheck on27/10: V15/sourceV15, pending0/failed0, checksums valid, role snapshot unchanged. Retained local counts:35 Concession items,4 Booking Concession lines,5 Bookings,3 Payments. **All3 Payments are INITIATED; PAID Bookings0, SUCCESS Payments0, Tickets0.** Relevant memberships0; runtime direct catalog DML/raw configure/owner SET remain denied. No application listeners remain on3000/8080 after interrupted QA; PostgreSQL/test records remain.

## 8. Bugs Fixed and Failure History

1. Fixture authority incorrectly required restricted migrator SET owner. Replaced with a separately approved test-only operator connection; runtime unchanged.
2. Repeated `clock_timestamp()` calls produced cutoff slightly later than start in three Showtime fixtures. Use `statement_timestamp()`; all12 cases passed afterward.
3. Default HTTP negotiation failed with the local Next proxy. Pinning the test client to HTTP/1.1 fixed it; application proxy unchanged.
4. Added Customer test initially queried nonexistent `tickets.booking_id`. Corrected to actual `booking_seat_id` → `booking_seats.booking_id`; affected test passed.

Initial14 cases:10 passed/4 errors/0 skips; corrected14:14 passed. Added Customer batch:2 passed/1 assertion-query error; affected Customer rerun:1 passed. Initial sandbox regression stalled after Mockito agent output; its exact underlying cause is unconfirmed. Only this task's identified Surefire JVM was terminated, then outside-sandbox169-case verification passed. No retry/skip configuration added; failed evidence retained. Compile warnings include deprecated test JSON accessors and existing Mockito/JVM warnings, with no final build errors.

## 9. Evidence

Ignored [verification directory](../../backend/target/admin-concession-verification-2026-10-26/): [12 SQL +2 HTTP pass](../../backend/target/admin-concession-verification-2026-10-26/final-integration.log), [Customer pass](../../backend/target/admin-concession-verification-2026-10-26/final-customer-only.log), [169 regression/build](../../backend/target/admin-concession-verification-2026-10-26/non-db-regression-final.log), [27/10 database status](../../backend/target/admin-concession-verification-2026-10-26/completion-status-2026-10-27.log), [27/10 financial-state counts](../../backend/target/admin-concession-verification-2026-10-26/completion-read-only-2026-10-27.log), [owner/ACL/checksum audit](../../backend/target/admin-concession-verification-2026-10-26/final-read-only-audit.log), [80 HTTP records](../../backend/target/admin-concession-verification-2026-10-26/http-95294619-6331-47d8-a465-5bad1415d3e9.json), [19 Customer records](../../backend/target/admin-concession-verification-2026-10-26/http-e7766a34-e5ef-47ad-8e6d-7ccb8d124e1b.json). Failed-run logs/XML remain in that directory/initial subdirectory. Request evidence omits bodies, passwords and tokens; no credential inputs are linked.

## 10. Requirement Reconciliation / Convention Compliance

PASS for requested local verification. No requirement IDs/business rules invented. Convention checks PASS: PascalCase Java tests/helpers in the existing test package, dated kebab-case report, unchanged domain/API/database/status naming, additive handoff and checked links. No convention exception needed. Unrelated incoming work and historical documents preserved. No Neon, reset, new DB/environment, seed, deployment, staging/commit/push.

## 11. Remaining Blockers

**None for this task.** This is local backend evidence, not production/provider interoperability or frontend certification. Full frontend suites and unrelated financial/issuance PostgreSQL fixtures were outside scope.

## 12. Next Recommended Step

ADMIN Concession frontend/design work may use the verified contract if separately requested. Do not start automatically.
