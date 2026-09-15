# Smart Cinema Authentication Database Foundation Report

## 1. Task Information

Task: Prepare the PostgreSQL database foundation for Smart Cinema Authentication  
Date: 2026-09-15  
Module: Identity and Access  
Type: Backend database migration  
Status: Complete

## 2. Requested Work

Create the first Flyway migration for the minimal User/Account model required by registration and login, then verify it through a real local PostgreSQL connection. Registration/login endpoints and unrelated domain tables are outside this task.

## 3. Documents Reviewed

- `AGENTS.md`
- `.agent/workflows/DEVELOPMENT_WORKFLOW.md`
- `.agent/workflows/BACKEND_WORKFLOW.md`
- Applicable rules in `.agent/rules/`
- `docs/development/project-conventions.md`
- `docs/brd/brd-v1.2.md`, Identity and Authorization requirements
- `docs/srs/srs-v1.2.md`, sections 3.1, 4.3, 5.1, and 7
- `docs/system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx`, Identity and Access domain, logical ERD, modular-monolith architecture, and PostgreSQL persistence responsibility
- `docs/reports/templates/TASK_REPORT_TEMPLATE.md`

## 4. Requirements Traceability

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| BR-001 — BRD v1.2 §4.1 | Customer uses one account across Smart Cinema | Yes | PASS: one chain-level `users` table was created |
| BR-002 — BRD v1.2 §4.1 | Roles include CUSTOMER, STAFF, MANAGER, and ADMIN | Yes | PASS: database role constraint permits exactly these values |
| FR-AUTH-001 — SRS v1.2 §3.1 | Customer Registration; login identifier must be unique | Yes | PASS for persistence foundation: normalized email is required and unique; endpoint behavior remains out of scope |
| FR-AUTH-002 — SRS v1.2 §3.1 | Login validates credential and Account Status | Yes | PASS for persistence foundation: `password_hash` and required nonblank `status` are stored; authentication/token behavior remains out of scope |
| NFR-SEC-001 — SRS v1.2 §4.3 | Password must be safely hashed and never stored as plaintext | Yes | PASS at schema boundary: the credential column is explicitly `password_hash`; hashing behavior belongs to the future Auth service |
| SRS v1.2 §5.1 | User ID, Email/Username, Password Credential, Full Name, Phone, Role, Status, Created At, Updated At | Yes | PASS: all listed data requirements are represented |

No database-specific UC identifier applies to this migration, so none was invented.

## 5. Implementation Summary

- Replaced the empty migration placeholder with `V1__create_users_table.sql`.
- Created only the `users` table.
- Added `id`, normalized `email`, `password_hash`, `full_name`, `phone`, `role`, `status`, `created_at`, and `updated_at`.
- Used a PostgreSQL identity-backed `BIGINT` primary key and timezone-aware timestamps.
- Enforced unique normalized email, nonblank credential/profile/status values, and the four approved roles.
- Required callers to supply both role and status, avoiding an implicit account-activation policy in the database.
- Retained the existing environment-driven datasource and Flyway configuration; no credentials were committed.
- Did not add a username column because the current approved Login/Register UI uses email as its login identifier. The SRS permits Email/Username rather than requiring both.

## 6. Files Created

- `backend/src/main/resources/db/migration/V1__create_users_table.sql`
- `docs/reports/2026-09-15_auth-database-foundation_report.md`

## 7. Files Modified

- Removed `backend/src/main/resources/db/migration/.gitkeep` because the migration directory now contains a real migration.

## 8. Verification

| Check | Result |
|---|---|
| Java/Maven build | PASS: `mvn -B verify` |
| Tests | PASS: 1 test, 0 failures, 0 errors, 0 skipped |
| PostgreSQL connectivity | PASS: Spring Boot connected through HikariCP to a real local PostgreSQL 18.4 instance |
| Flyway validation | PASS: exactly one migration was discovered and validated |
| Flyway migration | PASS: `V1 - create users table` applied successfully to an empty `smart_cinema` database |
| Schema inspection | PASS: PostgreSQL reported all 9 expected columns, primary key, unique email, required fields, and role/status checks |
| Valid-row smoke test | PASS: a transaction inserted a `CUSTOMER`/`ACTIVE` record with non-null timestamps, then rolled back |
| Integrity smoke test | PASS: PostgreSQL rejected duplicate email and invalid role `OWNER`; no test rows remained |
| Whitespace | PASS: `git diff --check` |

The isolated verification database listened on local port 55432 and was stopped after testing. The machine's existing PostgreSQL service on port 5432 was not altered.

## 9. Requirement Reconciliation

- PASS: migration contains the minimal current Authentication data only.
- PASS: User attributes match SRS v1.2 §5.1.
- PASS: unique login identifier is enforced in PostgreSQL.
- PASS: plaintext password storage is avoided by schema naming and expected contract.
- PASS: real PostgreSQL connection, Flyway execution, and database constraints were verified.
- PASS: no Movie, Cinema, Booking, token/session, cinema-assignment, audit, or other unrelated table was created.
- PARTIAL by authorized scope: FR-AUTH-001 and FR-AUTH-002 still require application validation, password hashing, transactions, authentication, and token handling in later endpoint work.

## 10. Deviations / Conflicts

No BRD/SRS conflict was found.

The SRS names `Email/Username` as one logical identifier. Current approved Auth screens consistently use email, so this migration implements email as the identifier and does not invent a separate username requirement.

SRS v1.2 requires Account Status and states that blocked users are restricted, but it does not define a complete serialized status set or the initial activation policy. The schema therefore requires a nonblank status without constraining or defaulting its business values. That policy remains for the Auth design/implementation task.

The local PostgreSQL service already listening on port 5432 did not accept the repository's placeholder development credentials. Verification therefore used a separate temporary PostgreSQL 18.4 cluster on port 55432, supplied through the existing `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` environment variables. The installed service and its databases were not changed.

Existing Convention Conflicts: none introduced.  
Approved exceptions: none.

## Convention Compliance

| Area | Result | Notes |
|---|---|---|
| Folder naming | PASS | Standard Flyway `db/migration` location retained |
| File naming | PASS | Flyway versioned filename uses the configured naming convention; report uses the required dated format |
| Code naming | NOT APPLICABLE | No Java code was added |
| Domain terminology | PASS | `users`, role, status, and Customer terminology match approved documents |
| API convention | NOT APPLICABLE | No endpoint or contract was implemented |
| Database convention | PASS | Plural table name, snake_case columns/constraints, `id` primary key, and UPPER_SNAKE_CASE serialized statuses |
| Environment variables | PASS | Existing uppercase `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` configuration was used |
| Documentation convention | PASS | Report follows the repository template and links to the canonical convention |

## 11. Known Limitations

- No User JPA entity or repository exists yet.
- No registration/login endpoint, password encoder, authentication provider, token/session persistence, or security policy is implemented.
- `updated_at` receives its initial value from PostgreSQL; future update code must set it when account data changes.
- The application context unit smoke test excludes datasource auto-configuration; the real database/Flyway verification for this task was performed separately through the packaged application.

## 12. Next Recommended Step

Implement the Auth persistence mapping and registration service with server-side validation, password hashing, duplicate-email handling, and transactional tests before exposing FR-AUTH-001 through an API.
