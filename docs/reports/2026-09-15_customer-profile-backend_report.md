# Smart Cinema Implementation Report

## 1. Task Information

Task: Implement Smart Cinema Customer Profile backend  
Date: 2026-09-15  
Module: Backend / User Profile  
Type: Feature implementation  
Status: Complete

## 2. Requested Work

Implement authenticated Customer profile retrieval and update for FR-AUTH-005 and FR-AUTH-009 using the existing User/Auth foundation. Expose approved profile data, allow only permitted profile changes, keep identity/security attributes server-controlled, derive ownership from the access token, standardize errors, and add tests. Password changes, forgot password, refresh token, Admin User Management, and unrelated Account features are excluded.

## 3. Documents Reviewed

- `.agent/workflows/DEVELOPMENT_WORKFLOW.md`
- `.agent/workflows/BACKEND_WORKFLOW.md`
- `.agent/rules/CODING_RULES.md`
- `.agent/rules/REQUIREMENT_TRACEABILITY.md`
- `.agent/rules/PROJECT_CONVENTIONS.md`
- `docs/development/project-conventions.md`
- `docs/project-scope/project-scope v1.0.md` Authentication scope
- `docs/business-analysis/business-analysis-v2.1.md` User/Profile behavior
- `docs/brd/brd-v1.2.md` Customer Account Management
- `docs/srs/srs-v1.2.md` §§3.1, 4.3, 5.1, and traceability matrix
- Existing V1 users migration, User JPA model, JWT issuance, security configuration, Auth APIs, and Auth implementation reports

## 4. Requirements Traceability

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| BR-001 — SRS v1.2 traceability matrix | Customer Account Management | Yes | PASS for Profile retrieval/update scope |
| FR-AUTH-005 — SRS v1.2 §3.1 | Customer manages permitted Profile fields; protected fields cannot be changed outside their workflow | Yes | PASS: Customer can retrieve Profile and update only fullName/phone |
| FR-AUTH-006 — SRS v1.2 §3.1 | Blocked Account has restricted access | Yes | PASS: service rejects a non-ACTIVE Account even if an older JWT remains cryptographically valid |
| FR-AUTH-007 — SRS v1.2 §3.1 | Backend enforces Role | Yes | PASS: security filter requires ROLE_CUSTOMER and service rechecks the current database Role |
| FR-AUTH-009 — SRS v1.2 §3.1 | Customer accesses only owned resources | Yes | PASS: route accepts no User ID; repository lookup derives exclusively from signed JWT subject |
| NFR-SEC-002 — SRS v1.2 §4.3 | Protected APIs require authentication | Yes | PASS: both Profile methods require a valid bearer token |
| NFR-SEC-003 — SRS v1.2 §4.3 | Backend enforces Role and Ownership | Yes | PASS: JWT Role authorization plus database Role/Status and subject-owned lookup |
| NFR-SEC-006 — SRS v1.2 §4.3 | Input has server-side validation | Yes | PASS: required/length validation and existing Vietnamese phone validation apply to PATCH |
| NFR-SEC-011 — SRS v1.2 §4.3 | Errors do not reveal internal information | Yes | PASS: validation, authentication, authorization, missing Profile, and unavailable Account use bounded Problem Detail responses |
| SRS v1.2 §5.1 | User data includes identifier, profile, Role, Account Status, and protected credential | Yes | PASS: response exposes the approved Profile/identity summary and excludes credential/hash/timestamps |

No applicable UC identifier was found in the current requirements, so none was invented.

## 5. Implementation Summary

- Defined `GET /api/v1/profile` to retrieve the authenticated Customer Profile.
- Defined `PATCH /api/v1/profile` to update only `fullName` and `phone`.
- Returned only `fullName`, `email`, `phone`, `role`, and `status`, matching the approved Profile requirements and frontend need.
- Derived ownership from the signed JWT `sub` claim. Neither route nor request body accepts a User ID.
- Added transactional ProfileService operations. Updates rely on JPA dirty checking inside the transaction.
- Reused the existing Vietnamese phone validator and normalized storage format; trimmed full name before persistence.
- Added a narrow User domain mutation method that cannot modify email, password hash, Role, or Account Status.
- Required CUSTOMER authority at the security filter and revalidated current database Role and ACTIVE status to protect against stale token claims.
- Mapped JWT `role` into `ROLE_*` authorities for backend Role enforcement.
- Added standardized application Problem Details for missing/unavailable Profile and denied current Account.
- Added standardized security-filter Problem Details for unauthenticated and forbidden requests.
- Exempted the bearer-token Profile endpoint from CSRF because authentication is stateless and does not use browser cookies.

## 6. Files Created

- `backend/src/main/java/com/smartcinema/auth/SecurityProblemHandler.java`
- `backend/src/main/java/com/smartcinema/user/ProfileAccessDeniedException.java`
- `backend/src/main/java/com/smartcinema/user/ProfileController.java`
- `backend/src/main/java/com/smartcinema/user/ProfileExceptionHandler.java`
- `backend/src/main/java/com/smartcinema/user/ProfileService.java`
- `backend/src/main/java/com/smartcinema/user/ProfileUnavailableException.java`
- `backend/src/main/java/com/smartcinema/user/dto/ProfileResponse.java`
- `backend/src/main/java/com/smartcinema/user/dto/UpdateProfileRequest.java`
- `backend/src/test/java/com/smartcinema/user/ProfileServiceTests.java`
- `docs/reports/2026-09-15_customer-profile-backend_report.md`

## 7. Files Modified

- `backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java`: Customer authority mapping, Profile authorization, standardized security handlers, and Profile CSRF matcher.
- `backend/src/main/java/com/smartcinema/user/User.java`: narrow full-name/phone Profile update method.
- `backend/src/test/java/com/smartcinema/SmartCinemaApplicationTests.java`: authenticated retrieval/update, ownership, protected-field, validation, unauthenticated, Role, and CSRF contract coverage.

## 8. Verification

| Check | Result |
|---|---|
| TypeScript | NOT RUN — backend-only change |
| ESLint | NOT RUN — backend-only change |
| Build | PASS — `mvn -q clean verify` |
| Tests | PASS — 39 tests, 0 failures, 0 errors, 0 skipped |
| Manual Verification | PASS by API/security inspection: Profile URI has no user identifier; controller reads JWT subject; response/request fields and security matchers were reconciled with requirements |

Tests cover Profile retrieval, permitted update/normalization, unchanged protected fields, missing User, BLOCKED Account, non-Customer Account, anonymous rejection, Role rejection, JWT-subject ownership, PATCH without CSRF, validation Problem Detail, and existing Auth regressions.

## 9. Requirement Reconciliation

- PASS: authenticated Customer can retrieve own Profile.
- PASS: authenticated Customer can update own full name and phone.
- PASS: email, password hash, Role, Account Status, timestamps, and unrelated data cannot be updated through the Profile contract.
- PASS: Role and Account Status are returned read-only for the approved frontend presentation.
- PASS: ownership derives from JWT subject and never from client-supplied User ID.
- PASS: current database Role and Status are checked in addition to token authority.
- PASS: input and access failures return bounded standardized errors.
- PASS: no password change, forgot password, refresh token, Admin User Management, migration, or unrelated Account behavior was introduced.

## 10. Deviations / Conflicts

The requirements do not define a concrete Profile endpoint. `/api/v1/profile` was selected as a singular resource representing the authenticated principal's Profile; this avoids an ID path parameter and directly enforces FR-AUTH-009 ownership.

The SRS states that only permitted profile fields may be updated but does not enumerate them. The existing V1 User model and approved Register/Profile UI identify full name and phone as Profile data. Email is the protected unique login identifier, while Role and Account Status are explicitly server-controlled. The PATCH contract is therefore limited to `fullName` and `phone`; this decision is recorded as the minimal contract and not as a new general business rule.

No conflict with the existing Auth implementation or database schema was found. No convention exception was requested or introduced.

## Convention Compliance

Validated against [project conventions](../development/project-conventions.md).

| Area | Result | Notes |
|---|---|---|
| Folder naming | PASS | Existing lowercase Java `user` package and conventional `dto` subpackage used |
| File naming | PASS | Java filenames/classes use PascalCase; report follows required date and kebab-case task name |
| Code naming | PASS | Methods/variables use camelCase and DTO/domain types use PascalCase |
| Domain terminology | PASS | Customer, User, Profile, Role, Account Status, and ownership follow approved terms |
| API convention | PASS | Versioned singular resource with GET/PATCH semantics and no action route |
| Database convention | N/A | Existing schema reused; no database object changed |
| Documentation convention | PASS | Report is under `docs/reports/`, uses real requirement IDs, and does not redefine BRD/SRS |

Post-implementation review found no convention FAIL. The report itself was included in the review.

## 11. Known Limitations

- Password changes and other security-sensitive identity workflows remain unavailable by scope.
- Profile email is read-only; changing the unique login identifier requires a separately approved verification workflow.
- The response exposes only the current V1 Profile fields; no avatar, membership, rewards, preferences, or unrelated fields are present.
- The frontend Profile screen must call these endpoints with the stored bearer token in a separate frontend task.

## 12. Next Recommended Step

Complete the approved Customer Profile frontend using `GET/PATCH /api/v1/profile`, update local Auth session display data after a successful PATCH, and clear local authentication on HTTP 401 without adding excluded Account features.
