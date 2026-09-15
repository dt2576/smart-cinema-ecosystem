# Smart Cinema Implementation Report

## 1. Task Information

Task: Implement Smart Cinema customer login backend  
Date: 2026-09-15  
Module: Backend / Authentication  
Type: Feature implementation  
Status: Complete

## 2. Requested Work

Implement the FR-AUTH-002 login flow over the existing User/Auth foundation: validated request/response DTOs, normalized email lookup, BCrypt credential verification, Account Status validation, access-token issuance, standardized authentication errors, security configuration, and tests. Refresh tokens, forgot password, social login, frontend integration, and unrelated Auth behavior are excluded.

## 3. Documents Reviewed

- `.agent/workflows/DEVELOPMENT_WORKFLOW.md`
- `.agent/workflows/BACKEND_WORKFLOW.md`
- `.agent/rules/CODING_RULES.md`
- `.agent/rules/REQUIREMENT_TRACEABILITY.md`
- `.agent/rules/PROJECT_CONVENTIONS.md`
- `docs/development/project-conventions.md`
- `docs/project-scope/project-scope v1.0.md` §5.1
- `docs/business-analysis/business-analysis-v2.1.md` Customer flow and Authentication sections
- `docs/brd/brd-v1.2.md` §5.1 Customer Login scenario
- `docs/srs/srs-v1.2.md` §§3.1, 4.3
- `docs/system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx` Auth/User architecture context
- Approved frontend login implementation in `frontend/src/features/auth/login-form.tsx`
- Existing User/Auth source, V1 migration, backend configuration, and prior Auth reports

## 4. Requirements Traceability

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| FR-AUTH-002 — SRS v1.2 §3.1 | Authenticate valid Credential and Account Status, then issue Token | Yes | PASS: normalized email and BCrypt password authentication require an ACTIVE account before an access token is issued |
| FR-AUTH-006 — SRS v1.2 §3.1 | Blocked users have restricted access | Yes | PASS: a BLOCKED account cannot obtain a new access token |
| FR-AUTH-007 — SRS v1.2 §3.1 | Backend enforces Role | Partially | PASS for token foundation: approved User Role is signed into the access token; feature-specific authorization remains future scope |
| NFR-SEC-001 — SRS v1.2 §4.3 | Passwords are safely hashed, never plaintext | Yes | PASS: login verifies the existing BCrypt hash and never stores the submitted password |
| NFR-SEC-002 — SRS v1.2 §4.3 | Protected APIs require authentication | Yes | PASS: registration and login are the only anonymous request matchers; other requests require a valid bearer token |
| NFR-SEC-004 — SRS v1.2 §4.3 | Token/session has a valid lifecycle | Partially | PASS for the authorized access-token scope: token expiration is configurable and defaults to 15 minutes; renewal/revocation is excluded |
| NFR-SEC-006 — SRS v1.2 §4.3 | Server-side input validation | Yes | PASS: login email and password are validated before service invocation |
| NFR-SEC-010 — SRS v1.2 §4.3 | Logs exclude plaintext password and secret tokens | Yes | PASS: LoginRequest string output redacts password; token values are not logged by the implementation |
| NFR-SEC-011 — SRS v1.2 §4.3 | Errors do not reveal internal information | Yes | PASS: missing User, wrong password, and unavailable Account share the same HTTP 401 Problem Detail |
| NFR-SEC-012 — SRS v1.2 §4.3 | Sensitive endpoints should have rate limiting | Yes | PARTIAL: no rate-limiting infrastructure is selected in the approved design and it is not introduced in this scoped implementation |

No applicable UC identifier was found in the reviewed current requirements, so none was invented.

## 5. Implementation Summary

- Added resource-oriented `POST /api/v1/auth/tokens` for login.
- Added validated LoginRequest and LoginResponse DTOs. The response includes the bearer access token, expiry in seconds, and the authenticated User summary without password data.
- Normalized login email using trim plus locale-independent lowercase, matching registration behavior and the normalized unique V1 email schema.
- Verified credentials with the existing PasswordEncoder/BCrypt configuration. Unknown accounts still execute a BCrypt-compatible comparison path to reduce account-existence timing differences.
- Required Account Status `ACTIVE`; all failed credential/status cases return the same HTTP 401 Problem Detail.
- Issued signed HS256 JWT access tokens with issuer, User ID subject, email, Role, issued-at, and expiry claims.
- Required `AUTH_JWT_SECRET` with at least 32 UTF-8 bytes. Added a non-secret placeholder to `backend/.env.example` and a configurable ISO-8601 duration with a 15-minute default.
- Redacted both submitted passwords and issued access tokens from DTO string representations used by framework DEBUG logging.
- Configured Spring Security resource-server JWT validation. Registration and login remain the only anonymous POST endpoints and are the only CSRF exclusions.
- Generalized request-validation Problem Details so the existing Auth handler accurately serves both registration and login.

## 6. Files Created

- `backend/src/main/java/com/smartcinema/auth/AccessTokenService.java`
- `backend/src/main/java/com/smartcinema/auth/AuthenticationFailedException.java`
- `backend/src/main/java/com/smartcinema/auth/LoginController.java`
- `backend/src/main/java/com/smartcinema/auth/LoginService.java`
- `backend/src/main/java/com/smartcinema/auth/dto/LoginRequest.java`
- `backend/src/main/java/com/smartcinema/auth/dto/LoginResponse.java`
- `backend/src/test/java/com/smartcinema/auth/AccessTokenServiceTests.java`
- `backend/src/test/java/com/smartcinema/auth/LoginControllerTests.java`
- `backend/src/test/java/com/smartcinema/auth/LoginServiceTests.java`
- `docs/reports/2026-09-15_customer-login-backend_report.md`

## 7. Files Modified

- `backend/pom.xml`: added the Spring Security OAuth2 resource-server dependency required for JWT encoding and validation.
- `backend/.env.example`: documented the required JWT signing-secret environment variable with a non-secret placeholder.
- `backend/src/main/resources/application.properties`: added signing-secret and access-token TTL settings.
- `backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java`: added login access, JWT beans, TTL validation, and bearer-token validation.
- `backend/src/main/java/com/smartcinema/auth/AuthExceptionHandler.java`: added standardized authentication failure handling and generalized validation errors.
- `backend/src/main/java/com/smartcinema/user/UserRepository.java`: added normalized email lookup.
- `backend/src/test/java/com/smartcinema/auth/RegistrationControllerTests.java`: reconciled the generalized validation-error title.
- `backend/src/test/java/com/smartcinema/SmartCinemaApplicationTests.java`: supplied an isolated test signing secret and verified anonymous login routing without CSRF.

Existing uncommitted database-foundation and registration work was preserved and not reverted.

## 8. Verification

| Check | Result |
|---|---|
| TypeScript | NOT RUN — backend-only change |
| ESLint | NOT RUN — backend-only change |
| Build | PASS — `mvn -q clean verify` |
| Tests | PASS — 29 tests, 0 failures, 0 errors, 0 skipped |
| Manual Verification | PASS — MockMvc verifies the HTTP success, validation, generic unauthorized, anonymous endpoint, and CSRF contracts; signed JWT is decoded and its identity/expiry claims are asserted |

Test coverage includes valid login, normalized email, real BCrypt verification, unknown email, wrong password, BLOCKED status, uniform authentication errors, DTO password/token redaction, request validation, response data exposure, JWT signature/claims/expiry, application context, and security-filter routing.

## 9. Requirement Reconciliation

- PASS: FR-AUTH-002 credential authentication, Account Status validation, and access-token issuance are implemented.
- PASS: login uses the existing User table, repository, AccountStatus, UserRole, and BCrypt setup.
- PASS: token response contains no password/hash and authentication failures do not reveal whether an email exists or an Account is blocked.
- PASS: security filters accept anonymous login and registration while requiring bearer authentication elsewhere.
- PASS: no refresh token, forgot-password, social-login, frontend, database migration, or unrelated Auth feature was added.
- PARTIAL: NFR-SEC-004 lifecycle is implemented through short-lived access-token expiry; renewal and revocation are outside the authorized scope.
- PARTIAL: NFR-SEC-012 recommends rate limiting, but the project has no approved rate-limiting infrastructure or policy.

## 10. Deviations / Conflicts

The SRS requires Token issuance but does not define the login route, token format, signing algorithm, issuer, claim set, or access-token duration. The implementation uses a resource-oriented token collection endpoint, HS256 JWT, a technical issuer, minimal identity/Role claims, and a configurable 15-minute TTL. These are minimal technical decisions needed to implement the requested token issuance and are not presented as new business requirements.

The approved Login frontend includes a `rememberMe` control, but no approved requirement defines alternate token duration or persistent-login behavior. LoginRequest therefore accepts only email and password; remember-me behavior remains unimplemented rather than silently creating a token policy.

No conflict was found between Stitch/frontend fields and BRD/SRS login behavior. No convention exception was requested or introduced.

### Convention Compliance

Validated against [project conventions](../development/project-conventions.md).

| Area | Result | Notes |
|---|---|---|
| Folder naming | PASS | Existing Java package and conventional test locations used |
| File naming | PASS | Java classes use PascalCase; report uses the required date plus lowercase kebab-case task name |
| Code naming | PASS | Java class, method, variable, DTO, and environment-variable names follow the canonical styles |
| Domain terminology | PASS | User, Credential, Account Status, Role, Customer, and Token match approved terminology |
| API convention | PASS | Versioned resource noun route `POST /api/v1/auth/tokens`; no action verb route introduced |
| Database convention | N/A | No schema or migration change |
| Documentation convention | PASS | Report is under `docs/reports/`, preserves requirement IDs, and does not redefine requirements |

Post-implementation review found no convention FAIL or approved exception. The report itself was included in this check.

## 11. Known Limitations

- Frontend login remains disconnected from this endpoint by the requested backend-only scope.
- Access tokens cannot be refreshed or explicitly revoked because refresh/logout behavior is excluded.
- `AUTH_JWT_SECRET` must be supplied when running the backend; the repository contains only a placeholder.
- No rate limiting is configured for login because no approved policy or infrastructure exists.
- Role/ownership/Cinema-scope enforcement for future protected business endpoints remains future feature work.

## 12. Next Recommended Step

Define the frontend authentication-storage and redirect contract, then connect the approved Login form to `POST /api/v1/auth/tokens` without adding refresh-token behavior until FR-AUTH-004 is separately approved for implementation.
