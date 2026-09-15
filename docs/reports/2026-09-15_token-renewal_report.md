# Smart Cinema Task Report

## 1. Task Information

Task: Implement Token Renewal  
Date: 2026-09-15  
Modules: Backend Authentication, PostgreSQL, Frontend Authentication  
Type: Full-stack feature  
Status: Complete

## 2. Requested Work

Implement FR-AUTH-004 token renewal over the existing JWT Login/AuthProvider flow. Login must issue a refresh credential, the backend must validate and rotate it before issuing a new access token, invalid/expired/revoked credentials must fail safely, and the frontend must renew before access-token expiry or clear Auth state on failure. Forgot password, social login, password change, multi-device session UI, and unrelated Account features are excluded.

## 3. Documents Reviewed

- `.agent/workflows/DEVELOPMENT_WORKFLOW.md`
- `.agent/workflows/BACKEND_WORKFLOW.md`
- `.agent/workflows/FRONTEND_WORKFLOW.md`
- `.agent/rules/CODING_RULES.md`
- `.agent/rules/REQUIREMENT_TRACEABILITY.md`
- `.agent/rules/UI_UX_RULES.md`
- `docs/development/project-conventions.md`
- `frontend/AGENTS.md`
- `docs/project-scope/project-scope v1.0.md`
- `docs/srs/srs-v1.2.md` §3.1 FR-AUTH-002, FR-AUTH-003, FR-AUTH-004, FR-AUTH-006, FR-AUTH-007 and §4.3 NFR-SEC-002, NFR-SEC-004, NFR-SEC-006, NFR-SEC-007, NFR-SEC-010, NFR-SEC-011
- Existing Login, JWT, Account Status, AuthProvider/storage, Profile guard, Logout, Flyway V1, and their implementation reports/tests
- Installed Next.js 16.3.5 App Router `useRouter` documentation

## 4. Requirement Traceability

| Requirement | Result | Evidence |
|---|---|---|
| FR-AUTH-002 — Login | PASS | Successful Login now atomically issues an access token and opaque refresh token with explicit lifetimes |
| FR-AUTH-004 — Token Renewal | PASS | Valid refresh credential is locked, validated, revoked, rotated, and exchanged for a new token pair |
| FR-AUTH-006 — Account Status | PASS | Renewal rejects a refresh token whose current User is not ACTIVE |
| FR-AUTH-007 — Role Enforcement | PASS | New access JWT is issued from current database User data and preserves the existing Role claim behavior |
| NFR-SEC-002 — Protected authentication | PASS | Existing JWT access-token protection is unchanged |
| NFR-SEC-004 — Token/session lifecycle | PASS | Access and refresh TTLs, hash-at-rest, rotation, revocation, expiry validation, and client failure cleanup are implemented |
| NFR-SEC-006 — Server validation | PASS | Renewal request requires a nonblank bounded refresh token |
| NFR-SEC-007 — OWASP-related controls | PASS within scope | Opaque 256-bit random tokens, SHA-256 hash storage, generic rejection, transaction and row lock reduce credential/database/replay risks |
| NFR-SEC-010 — Secret-safe logging | PASS | Request/response `toString()` methods redact both access and refresh tokens |
| NFR-SEC-011 — Safe errors | PASS | Missing, invalid, expired, revoked, and unavailable-account renewal all produce bounded Problem Detail responses |

No applicable UC identifier was found, so none was invented.

## 5. API Contract

### Login

`POST /api/v1/auth/tokens` retains its existing request and access-token/User fields and adds:

- `refreshToken`
- `refreshExpiresIn` in seconds

### Renewal

`POST /api/v1/auth/token-renewals`

Request:

```json
{ "refreshToken": "opaque-refresh-credential" }
```

Success returns the same token/User contract as Login, containing a newly issued access token and rotated refresh token. Rejected credentials return HTTP 401 Problem Detail titled `Token renewal failed`.

## 6. Security Lifecycle

- Refresh token values use 32 cryptographically random bytes encoded as unpadded Base64 URL text.
- PostgreSQL stores only the SHA-256 hex hash, never the raw refresh credential.
- Default access-token TTL remains 15 minutes.
- Refresh-token TTL defaults to 30 days and is configurable through `AUTH_REFRESH_TOKEN_TTL` using ISO-8601 duration syntax.
- Renewal locks the matching row pessimistically inside one transaction, preventing two concurrent uses from both succeeding.
- The used refresh token is revoked and a replacement is stored in the same transaction.
- Expired, missing, revoked, reused, or blocked-account credentials share a generic 401 response.
- Access JWTs now include a random `jti`, ensuring renewal produces a distinct access token even within the same second while preserving subject, issuer, email, Role and expiry behavior.

## 7. Persistence

Flyway V2 creates `refresh_tokens` with:

- User foreign key
- unique 64-character token hash
- creation, expiry and optional revocation timestamps
- User and expiry indexes
- hash and expiry integrity constraints

No Movie, Cinema, Booking, Payment, Ticket, or unrelated table changed.

## 8. Frontend Behavior

- AuthSession now stores both tokens and both expiry timestamps with the existing User summary.
- Login maps the expanded backend response without changing its success navigation.
- AuthProvider schedules renewal 60 seconds before access-token expiry.
- Concurrent React renewal attempts share one in-flight request, which prevents rotation races under Strict Mode or multiple consumers.
- Successful renewal replaces the complete stored session and immediately notifies Auth subscribers.
- Failed renewal clears authentication.
- On reload, a session with an expired access token but valid refresh token is retained long enough for immediate renewal; `/profile` waits for that renewal instead of sending a known-expired access token.
- A session is discarded when the refresh credential has expired or its expanded contract is malformed. Existing pre-refresh sessions therefore require a new Login once.

## 9. Files Created

- `backend/src/main/resources/db/migration/V2__create_refresh_tokens_table.sql`
- `backend/src/main/java/com/smartcinema/auth/RefreshToken.java`
- `backend/src/main/java/com/smartcinema/auth/RefreshTokenRepository.java`
- `backend/src/main/java/com/smartcinema/auth/RefreshTokenService.java`
- `backend/src/main/java/com/smartcinema/auth/RefreshTokenRejectedException.java`
- `backend/src/main/java/com/smartcinema/auth/TokenRenewalService.java`
- `backend/src/main/java/com/smartcinema/auth/TokenRenewalController.java`
- `backend/src/main/java/com/smartcinema/auth/dto/TokenRenewalRequest.java`
- `backend/src/test/java/com/smartcinema/auth/RefreshTokenServiceTests.java`
- `backend/src/test/java/com/smartcinema/auth/TokenRenewalServiceTests.java`
- `backend/src/test/java/com/smartcinema/auth/TokenRenewalControllerTests.java`
- `frontend/src/features/auth/auth-api.test.ts`
- `docs/reports/2026-09-15_token-renewal_report.md`

## 10. Files Modified

- Backend Login response/service, JWT service, security configuration, exception handling, properties, environment example, application security test and Login tests.
- Frontend Auth types, API client, AuthProvider, storage, storage tests, Profile expiry guard and test script.

## 11. Verification

| Check | Result |
|---|---|
| Backend tests | PASS — `mvn test -q`; 48 tests passed, including anonymous/CSRF security routing for renewal |
| Frontend lint | PASS — `pnpm lint` |
| Frontend tests | PASS — `pnpm test`; 3 tests passed |
| Frontend production build | PASS — `pnpm build`; TypeScript and routes `/`, `/login`, `/profile`, `/register` passed |
| Flyway/PostgreSQL | PASS — V2 applied to PostgreSQL 18.4; Hibernate schema validation passed |
| Live Login | PASS — returned nonempty access and refresh credentials |
| Live renewal | PASS — returned distinct access JWT, rotated refresh token, and preserved CUSTOMER Role |
| Replay rejection | PASS — reuse of the previous refresh token returned HTTP 401 |
| Test-data cleanup | PASS — four generated refresh rows and the temporary verification User were removed |
| Git whitespace | PASS — `git diff --check` produced no whitespace error |

## 12. Conflicts and Limitations

The requirements define a valid refresh lifecycle but do not prescribe endpoint naming, refresh TTL, token format, persistence, rotation, or client renewal lead time. The implementation uses a resource-oriented `/api/v1/auth/token-renewals`, opaque rotating credentials, 30-day configurable lifetime, and a 60-second client lead time as minimal security design decisions required to make FR-AUTH-004 executable.

The frontend continues the repository's approved localStorage Auth model, so the raw refresh credential is accessible to same-origin JavaScript. Hash-at-rest, rotation and bounded lifetime protect the server-side store, but an HttpOnly cookie would provide stronger protection against token extraction by injected scripts. Moving Auth to cookies would require an approved cookie/CSRF/deployment-origin design and was not silently introduced here.

This task does not add a server logout endpoint. Logout removes the browser credential, while server-side refresh-token revocation occurs during renewal. Explicit logout revocation remains a separate FR-AUTH-003 backend decision.

Expired/revoked rows are retained for rejection/audit evidence. Automated retention cleanup is not defined by current requirements and remains future operational work.

## Convention Compliance

Validated against [project conventions](../development/project-conventions.md).

| Area | Result | Notes |
|---|---|---|
| Java packages/classes | PASS | Existing `com.smartcinema.auth` feature package and PascalCase class naming retained |
| Database naming | PASS | Plural table and snake_case columns/indexes/constraints |
| API naming | PASS | Versioned resource-oriented plural `token-renewals` endpoint |
| Frontend naming/placement | PASS | Existing `features/auth` and kebab-case/purpose-suffix files reused |
| Domain terminology | PASS | Access Token, Refresh Token, User, Role, Account Status and Token Renewal match requirements |
| Environment naming | PASS | `AUTH_REFRESH_TOKEN_TTL` uses UPPER_SNAKE_CASE |
| Separation of concerns | PASS | DTO/controller/service/repository/entity/storage/provider responsibilities remain separate |
| Dependencies | PASS | No dependency added |
| Documentation | PASS | Report uses required location and naming format |

No convention exception was introduced. The report itself was included in the final convention check.
