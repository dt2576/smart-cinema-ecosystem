# Smart Cinema Customer Registration Backend Report

## 1. Task Information

Task: Implement Smart Cinema customer registration backend  
Date: 2026-09-15  
Module: Authentication and User  
Type: Backend feature implementation  
Status: Complete with documented account-status inference

## 2. Requested Work

Implement the FR-AUTH-001 backend flow over the existing V1 `users` schema: persistence mapping, request/response DTOs, validation, normalization, duplicate handling, password hashing, Customer defaults, transactional service, public registration endpoint, and tests. Login, JWT, refresh tokens, forgot password, and unrelated Auth features remain outside scope.

## 3. Documents Reviewed

- `AGENTS.md`
- `.agent/workflows/DEVELOPMENT_WORKFLOW.md`
- `.agent/workflows/BACKEND_WORKFLOW.md`
- Applicable `.agent/rules/`
- `docs/development/project-conventions.md`
- `docs/brd/brd-v1.2.md`, Identity and Authorization requirements
- `docs/srs/srs-v1.2.md`, sections 3.1, 4.3, 5.1, and 7
- `docs/system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx`
- Approved Register implementation in `frontend/src/features/auth/register-form.tsx`
- Existing `backend/src/main/resources/db/migration/V1__create_users_table.sql`
- `docs/reports/templates/TASK_REPORT_TEMPLATE.md`

## 4. Requirements Traceability

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| BR-001 — BRD v1.2 §4.1 | Customer account management across the cinema chain | Yes | PASS: registration creates one chain-level User account |
| BR-002 — BRD v1.2 §4.1 | Approved roles include CUSTOMER, STAFF, MANAGER, ADMIN | Yes | PASS: self-registration always assigns CUSTOMER |
| FR-AUTH-001 — SRS v1.2 §3.1 | Customer can create an Account; identifier is unique | Yes | PASS: validated transactional registration and normalized unique email handling implemented |
| FR-AUTH-006 — SRS v1.2 §3.1 | Account Status is managed and blocked users are restricted | Partially | PASS for creation state: new Customer receives ACTIVE; later status transitions are out of scope |
| NFR-SEC-001 — SRS v1.2 §4.3 | Password must be safely hashed and never stored as plaintext | Yes | PASS: BCrypt is applied before persistence and credential fields are absent from responses |
| NFR-SEC-006 — SRS v1.2 §4.3 | Client input requires server-side validation | Yes | PASS: Jakarta validation and Vietnamese phone validation reject malformed input |
| NFR-SEC-010 — SRS v1.2 §4.3 | Logs must not store plaintext passwords or token secrets | Yes | PASS: request string representation redacts password content |
| SRS v1.2 §5.1 | User data includes identifier, credential, profile, role, status, and timestamps | Yes | PASS: JPA mapping covers the existing V1 columns |

No registration-specific UC ID appears in the current SRS. The system analysis lists `UC-CUS-001 — Register Account`, which was used as descriptive traceability without inventing a requirement.

## 5. Implementation Summary

- Added the `User` JPA entity, `UserRepository`, `UserRole`, and `AccountStatus` under the User module.
- Added request/response records that expose account data without password or password hash.
- Added required-field, size, email-shape, password-length, and Vietnamese phone validation aligned with the approved Register form.
- Normalized email by trimming and lowercasing with `Locale.ROOT` before lookup and persistence.
- Normalized accepted Vietnamese phone forms to `+84` storage.
- Added a transactional registration service that assigns `CUSTOMER` and `ACTIVE`, hashes passwords with BCrypt, flushes inside the transaction, and maps the unique email race to a duplicate-email conflict.
- Added `POST /api/v1/users`, following the repository's resource-oriented API convention.
- Allowed anonymous POST access only to the registration resource and exempted that exact request matcher from CSRF. Other requests remain authenticated.
- Added RFC 9457-style Problem Detail responses for invalid registration input and duplicate email.
- Redacted the request DTO's password from its string representation to protect debug logs.

## 6. Files Created

- `backend/src/main/java/com/smartcinema/user/User.java`
- `backend/src/main/java/com/smartcinema/user/UserRepository.java`
- `backend/src/main/java/com/smartcinema/user/UserRole.java`
- `backend/src/main/java/com/smartcinema/user/AccountStatus.java`
- `backend/src/main/java/com/smartcinema/auth/RegistrationController.java`
- `backend/src/main/java/com/smartcinema/auth/RegistrationService.java`
- `backend/src/main/java/com/smartcinema/auth/DuplicateEmailException.java`
- `backend/src/main/java/com/smartcinema/auth/AuthExceptionHandler.java`
- `backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java`
- `backend/src/main/java/com/smartcinema/auth/dto/RegisterUserRequest.java`
- `backend/src/main/java/com/smartcinema/auth/dto/RegisterUserResponse.java`
- `backend/src/main/java/com/smartcinema/auth/validation/VietnamPhone.java`
- `backend/src/main/java/com/smartcinema/auth/validation/VietnamPhoneValidator.java`
- `backend/src/test/java/com/smartcinema/auth/RegistrationControllerTests.java`
- `backend/src/test/java/com/smartcinema/auth/RegistrationServiceTests.java`
- `backend/src/test/java/com/smartcinema/auth/validation/VietnamPhoneValidatorTests.java`
- `docs/reports/2026-09-15_customer-registration-backend_report.md`

## 7. Files Modified

- `backend/src/test/java/com/smartcinema/SmartCinemaApplicationTests.java`: mocked the external database repository for the context test and added a full security-filter smoke test for anonymous registration.

The uncommitted database-foundation files from the preceding task were preserved and used as the implementation baseline. No frontend file was modified.

## 8. Verification

| Check | Result |
|---|---|
| Build and tests | PASS: `mvn -B verify` |
| Automated tests | PASS: 17 tests, 0 failures, 0 errors, 0 skipped |
| Application context | PASS with datasource excluded and repository mocked |
| Security filter | PASS: anonymous POST to `/api/v1/users` succeeds without a CSRF token; other routes remain authenticated |
| Live PostgreSQL startup | PASS: Spring Boot connected to PostgreSQL 18.4; Flyway V1 was current; Hibernate schema validation passed |
| Live creation | PASS: HTTP 201 with normalized non-secret account response |
| Live duplicate handling | PASS: repeated normalized email returned HTTP 409 Problem Detail |
| Live validation | PASS: malformed request returned HTTP 400 Problem Detail with per-field errors |
| Live persistence | PASS: email/name/phone normalized; role CUSTOMER; status ACTIVE; timestamps populated; stored password differed from plaintext and had BCrypt length |
| Whitespace | PASS: `git diff --check` |

Live checks used an isolated local PostgreSQL 18.4 database and temporary application port. Both verification processes were stopped afterward.

## 9. Requirement Reconciliation

- PASS: implemented only Customer Registration behavior.
- PASS: unique email is checked using its normalized form and enforced by the database.
- PASS: the database constraint remains authoritative under concurrent duplicate attempts.
- PASS: the password is validated, BCrypt-hashed, omitted from responses, and redacted from request logging.
- PASS: registration is transactional and flushes before returning success.
- PASS: the result uses CUSTOMER and ACTIVE with populated timestamps.
- PASS: no Login, JWT, refresh token, forgot-password, frontend integration, or unrelated feature was introduced.

## 10. Deviations / Conflicts

No direct BRD/SRS conflict was found.

SRS v1.2 requires Account Status and restricts blocked users but does not explicitly state the initial status assigned by Customer Registration. Because FR-AUTH-001 requires account creation and no approval/verification workflow is approved, the implementation assigns `ACTIVE`. This is a minimal inference required to make registration usable and is not presented as a new requirement.

No approved API design file defines a registration route. `POST /api/v1/users` was selected because it creates a User resource and complies with the repository rule favoring nouns over action routes.

Existing Convention Conflicts: none introduced.  
Approved exceptions: none.

## Convention Compliance

| Area | Result | Notes |
|---|---|---|
| Folder naming | PASS | Feature packages use lowercase `auth`, `user`, `dto`, and `validation` |
| File naming | PASS | Java class filenames use PascalCase; report uses the dated convention |
| Code naming | PASS | Classes use PascalCase; methods and fields use camelCase |
| Domain terminology | PASS | User, Customer, Account Status, Role, and Credential match approved terminology |
| API convention | PASS | Versioned resource endpoint `POST /api/v1/users`; HTTP 201/400/409 semantics |
| Database convention | PASS | Existing plural `users` table and snake_case mappings retained |
| Status convention | PASS | CUSTOMER, ACTIVE, and other serialized enum values use UPPER_SNAKE_CASE |
| Documentation convention | PASS | New report follows the required name/template and preserves earlier reports |

## 11. Known Limitations

- Initial ACTIVE status is a documented inference because SRS v1.2 does not define the registration activation policy.
- Email verification is not implemented or approved.
- The frontend Register form is not connected to the endpoint in this backend-only task.
- CORS configuration is not added because no approved deployment origin is defined.
- Login, token/session lifecycle, status transitions, and role administration remain unimplemented.
- The current test suite uses a separately executed real-PostgreSQL smoke test; it does not start PostgreSQL automatically in Maven.

## 12. Next Recommended Step

Connect the approved Register frontend to `POST /api/v1/users` after defining the environment-specific API origin and CORS policy, while preserving the Problem Detail validation and duplicate-email responses.
