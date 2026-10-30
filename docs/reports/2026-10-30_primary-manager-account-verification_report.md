# PRIMARY MANAGER account and authenticated verification

## 1. Task Information

Date: 2026-10-30, Asia/Saigon. Explicitly authorized, one-account test-data operation
and read-only module verification; no production application implementation.

| Final verdict | Result |
|---|---|
| Account creation | **PASS** — exactly one new ACTIVE MANAGER |
| Real MANAGER authentication | **PASS** — normal API and browser login |
| MANAGER functional verification | **PASS** — existing read-only resources/workspaces; data limitations below |
| Cinema scope and role isolation | **PASS** — owned scope allowed, existing foreign resources404, ADMIN403 |

## 2. Authority, Inspection and Requirements

Read repository AGENTS, canonical development/backend/frontend workflows and
applicable convention/coding/document/traceability rules; current handoff;
BRD v1.2 BR-002/003/054/057/059/060 and SRS v1.2 FR-AUTH-007/008,
FR-ORG-001/005, FR-CINEMA-010, FR-REPORT-001/003–008. Reviewed actual User,
registration validators, BCrypt configuration, authentication/session services,
Manager/Admin assignment services, V1/V13/V17 guards and the existing
[Manager Cinema](../api/manager-cinema-operations-contract-v1.0.md),
[Staff](../api/manager-staff-management-contract-v1.0.md),
[Booking](../api/manager-booking-management-contract-v1.0.md) and
[Reporting](../api/manager-reporting-dashboard-contract-v1.0.md) contracts.

PRIMARY **Neon PostgreSQL / neondb / public**, existing `neondb_owner` connection;
no local-database substitution. Read-only preflight found **0 MANAGER accounts**,
target email unused and existing Cinema1 ACTIVE. Normal `pnpm db:status` and root
startup confirmed **installed V18/source V18, pending 0, failed 0, all 18 checksums valid**.
The final read-only [database status](../../backend/target/real-manager-2026-10-30/db-status-final.log)
confirmed the same state after verification.
No migration, permission, owner or role-membership change was necessary or applied.

No HTTP Manager-creation endpoint exists; public registration remains CUSTOMER-only.
The user explicitly authorized a one-time transactional database operation, so an
ignored operator helper reused actual `RegisterUserRequest` validation,
`VietnamPhoneValidator`, application `BCryptPasswordEncoder` default strength10,
`ManagerRequest.assignment` and `AdminManagerRepository.save`/the existing protected
`admin_assign_manager` writer. The ADMIN actor was obtained through **normal real
ADMIN login and an authorized ADMIN GET**, not a guessed actor ID or forged JWT.
No existing user was promoted, reset, edited or deleted.

## 3. Exact Account and Records

| Item | Persisted value |
|---|---|
| User ID | `5` |
| Email | `qa.manager.20261030@example.test` |
| Display name | `QA MANAGER PRIMARY 2026-10-30` |
| Role / account status | `MANAGER` / `ACTIVE` |
| Cinema | `1` — `[DEMO] Smart Cinema Central` (existing catalog) |
| Assignment ID / type / status | `1` / `MANAGER` / `ACTIVE` |
| Immutable effectiveAt | `2026-10-30T02:17:03.139811Z`, derived from database clock |
| Required assignment audit | `audit_records.id=1`, `ASSIGNMENT_GRANTED`, `CINEMA_ASSIGNMENT`, authenticated ADMIN actor2 |

Exactly **1 users row +1 cinema_assignments row +1 mandatory audit row** were
created atomically. Account/assignment checks and unrelated-data fingerprints were
verified before commit and again through a fresh read-only connection afterward.
No Staff onboarding/activation/invitation record is required for MANAGER: current
ACTIVE account and an effective ACTIVE MANAGER assignment are the actual gates.

Normal authentication/renewal/logout verification also created **6 refresh_tokens
rows**:2 for the configured ADMIN,4 for the new MANAGER. **All6 were revoked** by
normal session endpoints. These are authentication history, not extra accounts,
assignments or financial fixtures. No email was sent.

A deliberate repeat of the explicit creation command returned
**`ACCOUNT=REUSED_UNCHANGED`**. User/assignment/audit were not duplicated, credentials
were not rotated and the private credential file hash remained unchanged.
The helper has no startup integration and refuses identity/scope/password conflicts.

## 4. Credential Delivery

Generated a strong random temporary password; only its BCrypt hash was inserted.
Retrieve credentials locally from **`backend/.env.neon-manager-test`** using a
local editor, for example `notepad backend\.env.neon-manager-test` from root.
Keys are `MANAGER_TEST_EMAIL` and `MANAGER_TEST_PASSWORD`.

The file is Git-ignored and its inherited ACLs were removed; only the current
Windows owner has access. The helper verifies that ACL before reading/writing it.
No password/token appears in this report, application source, commands, screenshots
or test snapshots. Passwords/JWTs stayed in process memory and the private file;
browser tracing/storage-state exports were not enabled. No default password or
automatic provisioning seed was added. Keep the file private; do not paste it into chat.

## 5. Real HTTP and Browser Results

Actual root **`pnpm dev`** reached backend/frontend/proxy READY against PRIMARY.
Process-only QA flags disabled Hold cleanup, invitation delivery and VNPAY jobs;
environment files/startup configuration were not changed.

**58/58 real HTTP checks PASS**, without response fixtures:

| Area | Evidence |
|---|---|
| Authentication | Real Manager POST `/api/v1/auth/tokens`200, signed identity5/MANAGER |
| Cinema/Hall/Seat/Showtime | Owned lists/details200; scope list exactly Cinema1;2 Halls,45 Seat Units/50 guests,25 catalog Showtimes |
| Staff | Owned effective list and assignment/history endpoints200 with empty results |
| Booking | Owned list200 containing existing CANCELLED Booking1; owned detail200 with0 Tickets; beyond-last page handled |
| Dashboard/reports | All5 GET endpoints200; all3 ranking dimensions and daily/Concession reads; scope/period validated; authenticated proxy reads200 |
| Existing foreign resources | Cinema2, Hall3, Seat91, Showtime25, Booking2 and foreign Cinema filters404; exact foreign Booking search returns an empty scoped page |
| ADMIN / other role boundary |9 ADMIN-only GETs403; Customer-only `/api/v1/profile`403; anonymous/tampered token401 |
| Validation/session | Noncanonical ID/unknown filter400; real renewal succeeds; old refresh401; logout204 and revoked refresh401 |

October `[2026-10-01,2026-10-31)` reporting returned authoritative
`confirmedRevenue="0.0000"`,1 Booking created,24 operational Showtimes,
1080 capacity Seat Units,0 sold units and `occupancyPercent="0.0000"`.
The25-row catalog includes records outside that operational status cohort; this
is not a fabricated extra Showtime or a frontend revenue calculation.

**20/20 real Edge browser checks PASS**: normal UI login, one-Cinema navigation,
Cinema/Hall/Seat/Showtime reads, Staff empty workspace, Booking list/detail,
Dashboard/Reports, ranking tabs/pagination, reload/session persistence,
390px Dashboard/Reports without document overflow, foreign Cinema/Booking denial,
ADMIN denial, logout/direct-entry protection and refresh revocation.
No mocked responses or localStorage authentication injection. A request guard
allowed real GETs/authentication POSTs and would abort unexpected business writes;
**0 business writes were attempted**, **0 browser page errors**.

Evidence:
[real HTTP results](../../frontend/target/real-manager-2026-10-30/real-api.json),
[browser checks/request statuses](../../frontend/target/real-manager-2026-10-30/real-browser.json),
[database receipt](../../backend/target/real-manager-2026-10-30/creation-receipt.json),
[post-verification preservation](../../backend/target/real-manager-2026-10-30/database-final.log).

Live screenshots: [Cinema](../../frontend/target/real-manager-2026-10-30/real-cinema-detail-1440.png),
[Seats](../../frontend/target/real-manager-2026-10-30/real-seat-map-1440.png),
[Staff empty](../../frontend/target/real-manager-2026-10-30/real-staff-empty-1440.png),
[Booking](../../frontend/target/real-manager-2026-10-30/real-booking-detail-1440.png),
[Dashboard](../../frontend/target/real-manager-2026-10-30/real-dashboard-1440.png),
[Reports](../../frontend/target/real-manager-2026-10-30/real-reports-1440.png),
[mobile Reports](../../frontend/target/real-manager-2026-10-30/real-reports-390.png),
[ADMIN denial](../../frontend/target/real-manager-2026-10-30/real-admin-denied.png).
Screenshots show existing Neon data, not the synthetic dataset used by regression tests.
No UI redesign or new Stitch fidelity gate was performed.

## 6. Automated Regression

From `backend/`:

```powershell
$env:MANAGER_DB_TESTS='false'
$env:MANAGER_STAFF_DB_TESTS='false'
$env:MANAGER_REPORT_READ_TESTS='true'
$env:MANAGER_BOOKING_READ_TESTS='true'
mvn '-Dtest=Manager*Tests,Login*Tests,AccessToken*Tests,TokenRenewal*Tests,TokenRevocation*Tests,Registration*Tests,AdminManager*Tests' test
```

**119 executed PASS,0 failures/errors;153 discovered,34 conditional database-write
cases not enabled**. Includes **26 actually executed PostgreSQL READ ONLY tests**
(18 Reporting,8 Booking). Their query-local WITH/VALUES fixtures do not create
persisted accounts, PAID/SUCCESS or Tickets and are separate from real login proof.

From `frontend/`:

```powershell
pnpm test
$env:PLAYWRIGHT_CHANNEL='msedge'
pnpm exec playwright test 'manager-|shared-ui-foundation' --reporter=line
```

**328/328 unit PASS;129/129 selected Playwright PASS**,0 skipped/retried browser
cases. Existing production build used; no application code/dependency change.
No new typecheck/lint/build claim is made for this operational verification task.
Actual command output: [backend tests](../../backend/target/real-manager-2026-10-30/backend-tests.log),
[frontend unit tests](../../frontend/target/real-manager-2026-10-30/unit.log),
[selected Playwright regression](../../frontend/target/real-manager-2026-10-30/playwright.log).

## 7. Findings, Limits and Reconciliation

No implementation defect requiring a source change was found. An initial QA helper
incorrectly expected MANAGER access to the Customer profile API. Source confirms
that API is CUSTOMER-only; corrected the helper to require403. The denied request
and session cleanup were retained as evidence, not reclassified as an application bug.

All requested account creation, normal authentication, read-only workspace access,
Cinema isolation and ADMIN denial checks passed. Data-dependent limits:

- No existing Staff assignment in Cinema1: real Staff detail/assignment actions
  are **NOT RUN**; the authenticated empty list/workspace is genuinely verified.
- Current owned Booking is CANCELLED and recognized financial/Ticket metrics are
  zero. Positive revenue, paid issuance, VNPAY interoperability or check-in were
  not manufactured or claimed.
- Live assignment revocation/account status changes and all business mutations
  are outside the authorized read-only verification scope.
- Logout revokes the refresh token and clears browser authentication. Existing
  stateless access JWT semantics/expiry remain unchanged; immediate global JWT
  invalidation is not claimed.

Original domain/business/history rows, existing users/assignments/audits, Flyway
history and protected function/role fingerprints were preserved, excluding only
the3 expressly authorized new domain rows. Normal authentication history is
accounted for separately above. No reset, migration, grant, owner change, seed,
catalog/schedule/Booking/Payment/Ticket mutation, POS work or deployment occurred.

## 8. Files and Convention Compliance

Tracked changes: this new dated report and an additive
`docs/ai/current-handoff.md` entry. Application source/contracts/migrations,
requirements and historical reports remain unchanged. No staging/commit/push.
Ignored local artifacts: one-time `PrimaryManagerAccount.java`/compiled helper,
preflight/receipts/fingerprints/logs under `backend/target/real-manager-2026-10-30/`;
real API/browser scripts, screenshots and regression logs under
`frontend/target/real-manager-2026-10-30/`; the owner-only credential file above.

| Convention area | Result |
|---|---|
| File/folder/report naming | PASS: dated kebab-case task report, existing ignored target areas |
| Domain/API/status/identity | PASS: existing MANAGER/ACTIVE, canonical string API IDs, no invented endpoint/state |
| Security/database | PASS: existing BCrypt/validation/protected writer; one authorized account/scope, no permission change |
| Documentation | PASS: real BRD/SRS IDs, actual counts and evidence classes, no historical report rewrite |
| Source/Git/encoding/links | PASS: 1,033 original tracked files compared; only additive handoff changed, HEAD/index unchanged; strict UTF-8, local evidence links and `git diff --check` verified |

The final exact-password scan checked 1,054 source/document/QA artifact files,
including the stopped application log, with no occurrence outside the private
credential file. Owner-only ACL and Git exclusion were rechecked. The complete
previous handoff body remains intact below its new entry.

No convention exception or business-rule change was introduced. The new evidence
resolves the previous “no suitable Manager account” blocker for **Cinema1 only**;
it does not retroactively change the outcomes of historical reports.

## 9. Stop Boundary

Account remains ACTIVE with its single approved assignment for normal manual
testing. Authentication sessions created by this task were revoked. Use root
`pnpm dev`, then normal `/login`, with the privately stored credentials.
The QA-owned development processes were stopped after verification; ports 3000,
8080 and 3100 were confirmed closed. The MANAGER account and assignment persist.
No STAFF POS implementation or other module was started.
