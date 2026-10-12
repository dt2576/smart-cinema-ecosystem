# Phase 4B-1 — Staff Check-in Contract & Database Foundation: Blocking Decision Report

## 1. Task Information

- Date: 2026-10-12, Asia/Saigon.
- Type: implementation request; **stopped at the mandatory pre-implementation decision gate**.
- Module: Staff Check-in foundation, Cinema Assignment and ADMIN Staff provisioning.
- Status: **BLOCKED — STAFF initial credential/activation workflow is not settled by existing contracts**. Phase 4B-1 is **not implemented**.
- Entry HEAD: `b8a4d21d8d1774a3bb79ba7335a46420568af1fc`.
- Entry working tree: two untracked reports, Phase 3A and Phase 4A; both preserved. Index empty.
- Actual source migration head: **V12**; V13 not created/applied.

**Finding:** the new task approves who can provision Staff, admission timing, atomic Check-in, current assignment validation and recovery. It does not choose how a Staff's first credential is established/delivered or the newly provisioned account's activation behavior. Existing Customer self-registration and development-only Admin CLI do not define a STAFF provisioning contract. The task explicitly requires STOP rather than inventing this workflow.

Only this blocking report and a verified preflight note in current handoff are created/updated. No Java, SQL, test, frontend, environment, existing API contract or business data change.

## 2. Requested Work / Applicable STOP Gate

Requested implementation: publish the four Staff API contracts, implement designed assignments and ADMIN-only Staff provisioning, add a forward-only protected database writer/guards/audit/ACL foundation, test isolated PostgreSQL security/concurrency/rollback and run full backend regression. Staff operational HTTP controllers and all frontend work are reserved for Phase 4B-2.

The attached Phase 4B-1 request, **§7**, states:

> If secure account provisioning requires a product decision about credentials or activation that existing repository contracts do not settle, STOP and report the missing decision rather than inventing a workflow.

Section 4 also requires a blocking decision report if safe implementation would invent an unresolved business rule. This is the reason for stopping; it is **not** a tooling approval rejection, inability to write files, missing database password, unapproved migration in general or a request to approve already approved admission rules.

The approved policies remain recorded in §5.1. No temporary password, invitation, mandatory first-login change, initial ACTIVE/BLOCKED default or credential delivery mechanism has been silently adopted.

## 3. Documents Reviewed / Evidence

| Reference | Relevant evidence |
|---|---|
| [Root instructions](../../AGENTS.md), [Development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [Backend workflow](../../.agent/workflows/BACKEND_WORKFLOW.md), [review workflow](../../.agent/workflows/REVIEW_WORKFLOW.md), [conventions](../development/project-conventions.md) | Gate, traceability, naming, preservation and report compliance |
| [Coding](../../.agent/rules/CODING_RULES.md), [documents](../../.agent/rules/DOCUMENT_RULES.md), [traceability](../../.agent/rules/REQUIREMENT_TRACEABILITY.md) rules; [current handoff](../ai/current-handoff.md) | Existing accepted milestones and database/test execution boundaries |
| [Phase 4A audit](2026-10-11_staff-qr-checkin-contract-audit_report.md) | Absent assignments/Staff provisioning; protected Ticket UPDATE prohibition; source/read/design boundaries |
| [Phase 3A](2026-10-11_customer-booking-history-ticket-qr-contract-audit_report.md), [Phase 3B](2026-10-11_customer-booking-history-ticket-qr-backend_report.md), [Phase 3C](2026-10-11_customer-my-bookings-ticket-qr-frontend_report.md), [Customer read contract](../api/customer-booking-history-ticket-qr-contract-v1.0.md) | Existing paid aggregate, exact UTF-8 QR, current owned reads and previous regression evidence |
| [BRD v1.2](../brd/brd-v1.2.md), [SRS v1.2](../srs/srs-v1.2.md), [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md) | Staff accounts/scope/status, credential/security requirements; no Staff first-credential workflow found |
| [System Analysis v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx) | DOCX semantic search for credential/activation/provisioning and Staff management; no concrete initial Staff password/delivery/first-login policy |
| [Physical dictionary](../db/physical-data-dictionary-v1.0.md), §3.3; [integrity v1.1](../db/integrity-enforcement-design-v1.1.md), §1; [v1.2](../db/integrity-enforcement-design-v1.2.md) | Designed assignments, corrected lock order, financial and Ticket/audit protections |
| [Auth foundation report](2026-09-15_auth-database-foundation_report.md), §§5/10 | Initial activation policy deliberately not defaulted in V1; future Auth design must choose it |
| [Development Admin provisioning guide](../development/development-admin-provisioning.md), [implementation report](2026-10-01_development-admin-provisioning_report.md) | Explicit development-only ACTIVE ADMIN creation with locally supplied password; not a general employee provisioning contract |
| Actual User, registration/login/renewal, development Admin service, security mappings, V1–V12 inventory and relevant V4/V5/V6/V9/V10 guards/grants | Current capabilities rechecked against source; no operational Staff provisioning/reset/invitation endpoint |

Prior Phase 4A source/requirement readings remain applicable to preserved source; this preflight specifically rechecked the newly approved decisions and credential/activation blocker. It is not presented as completed migration security verification or an implementation baseline test run. No module-local backend AGENTS file/security-specific rule was found in the inspected inventory; applicable root rules were used.

## 4. Requirements Traceability

| Actual requirement / approved task section | Meaning | Result at STOP |
|---|---|---|
| BRD BR-002–004; SRS FR-AUTH-007/008, NFR-SEC-002/003 | Role/scope enforcement | Framework exists; Staff scope foundation not implemented |
| BR-053/055; FR-ORG-002/004/005; FR-AUDIT-003 | Staff assignment, status and attributed grant/revoke | New task approves ADMIN-only management; existing persistence/API absent |
| FR-AUTH-002; NFR-SEC-001/010; SRS §5.1 | Valid credential/account status; safe password hashing/secrecy | Technical primitives exist; initial STAFF credential/activation contract missing |
| FR-CHECKIN-003–012; FR-TICKET-010; NFR-CONC-003 | Paid/VALID eligibility, independent selected Tickets, atomic/duplicate/concurrent protection | Approved task §§2.1–2.5 settles window/batch/role policies; writer absent |
| FR-CHECKIN-011; FR-AUDIT-004; BR-052/062 | Immutable per-Ticket actor/time audit | Existing storage; protected transition/audit correspondence not implemented |
| UC-STF-004; BRULE-TICKET-001–009 | One Booking QR, unit-level independent Check-in and scope | Prior audit/source invariants retained; no new operational capability |
| Attached task §§4/7 | STOP if initial credentials/activation require an unsettled decision | **STOP applied before Java/migration edits** |
| Attached task §§10/11/12 | Phase boundaries, exact evidence and report/handoff | Documentation completed; implementation checks NOT RUN because gate stopped |

These are real document IDs. The blocking issue is a concrete unresolved workflow, not a newly invented BR/FR requirement. Approved task restrictions supersede the broader historical Manager/Admin operational permission matrix for this phase.

## 5. Preflight Summary, Approved Decisions and Blocker

### 5.1. Approved product decisions recorded unchanged

- Admission window: `start_time - interval '30 minutes' <= database authoritative time <= start_time + interval '15 minutes'`, **both boundaries inclusive**. No browser time or original Booking payment expiry; no automatic Ticket expiry outside the interval.
- Require PAID and complete consistent issuance, selected owned VALID Tickets, active operational Cinema/Hall/Showtime and actual matching operating Cinema.
- STAFF-only operational authorization, current ACTIVE/STAFF database account and effective ACTIVE STAFF assignment; multiple Cinema assignments supported. No Admin/Manager admission inheritance.
- One Booking QR, one Ticket per Seat Unit; COUPLE means two guests/one Ticket/one transition. Only VALID → CHECKED_IN, all selected Tickets or none; unselected Tickets unchanged, Booking remains PAID, QR untouched.
- ADMIN-only Staff account provisioning/activation/block and assignment creation/activation/deactivation. No public STAFF registration, self-assignment, Manager provisioning, auto seed or role escalation.
- Scope-protected Staff Booking recovery GET approved; raw QR need not be persisted.
- Sale/settlement rules remain separate and unchanged. No refund/reschedule/cancellation/Seat release or frontend/Phase 4B-2 controller work.

These decisions are not blockers requiring a second approval. The remaining decision is initial Staff account onboarding, specified in §5.3.

### 5.2. Verified credential/activation implementation

| Actual source | What it establishes | What it does not establish |
|---|---|---|
| [V1 users](../../backend/src/main/resources/db/migration/V1__create_users_table.sql) | Password hash/name/email/phone/role/status required; normalized unique email; no default status | No invitation state, temporary credential, initial STAFF activation default or credential lifecycle |
| [User](../../backend/src/main/java/com/smartcinema/user/User.java) | `registeredCustomer` creates ACTIVE CUSTOMER; `developmentAdmin` creates ACTIVE ADMIN | No Staff creation factory/workflow; development factory explicitly creation-only |
| [AccountStatus](../../backend/src/main/java/com/smartcinema/user/AccountStatus.java) | ACTIVE/BLOCKED serialized application states | Does not specify which state a newly provisioned STAFF must receive |
| [RegistrationService](../../backend/src/main/java/com/smartcinema/auth/RegistrationService.java), [RegisterUserRequest](../../backend/src/main/java/com/smartcinema/auth/dto/RegisterUserRequest.java) | Customer supplies password, existing validation/BCrypt, fixed CUSTOMER role; password redacted in request representation | Cannot promote a Customer or establish who chooses/delivers a Staff's first password |
| [LoginService](../../backend/src/main/java/com/smartcinema/auth/LoginService.java), [TokenRenewalService](../../backend/src/main/java/com/smartcinema/auth/TokenRenewalService.java) | Password login/renewal requires current ACTIVE account | No first-login password-change/activation-token flow or invitation verification |
| [DevelopmentAdminService](../../backend/src/main/java/com/smartcinema/development/DevelopmentAdminService.java) | Local DEV_ADMIN input, BCrypt limit/validation, absent-account ACTIVE ADMIN creation; existing accounts never promoted/reset | Development-only CLI privilege does not authorize a production-oriented ADMIN→STAFF password onboarding policy |
| [Security configuration](../../backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java), controller inventory | ADMIN gate and public CUSTOMER registration; shared password authentication | No supported Staff provisioning, credential reset, invitation/activation, mandatory password change or delivery endpoint |

The Auth foundation report explicitly states that V1 requires caller-supplied role/status to avoid imposing an initial activation policy. Later implementation settles ACTIVE for Customer registration and the separately authorized development Admin CLI only. BCrypt validation is a reusable **technical capability**, not proof of an approved STAFF onboarding workflow.

### 5.3. Precise missing decision and minimum resolution

Before publishing/implementing administrative provisioning, choose:

1. **First credential:** does ADMIN provide a password in a protected create request, or must the system invite/generate a credential for Staff to establish privately? No real password is needed for this decision; do not send credentials in chat.
2. **Activation:** create STAFF as BLOCKED pending an explicit ADMIN activation, or allow initial ACTIVE under the approved administrative request? ADMIN authority to activate/block is approved, but initial creation behavior is not specified.
3. **First use/delivery:** is the initial password usable in the existing login without mandatory change, and delivered outside the application through an approved organizational channel, or is invitation/forced first-login change required? The latter needs additional credential/token/authentication capabilities not currently installed.

**Minimum proposed resolution — NOT YET APPROVED:** ADMIN supplies an initial password over the protected HTTPS provisioning request; backend stores only the existing BCrypt hash and never returns/logs password/hash; new STAFF starts BLOCKED, ADMIN explicitly activates it; existing email/password login is reused without invitation or mandatory first-login change. Credential delivery stays outside the application through the organization's controlled channel. Reuse name/email/phone validation and enforce BCrypt's 72 UTF-8-byte maximum; reject an existing email rather than promote/reset any account.

This is a concrete minimal option for review, not an implemented or assumed policy. If invitation/private password establishment/first-login change is required, approve that additional workflow before changing schema or Auth. No need to reapprove the 30/15-minute admission window or the already approved Staff permissions.

### 5.4. Showtime/Cinema/Hall semantics and sale-versus-admission findings

Current [V4](../../backend/src/main/resources/db/migration/V4__create_customer_discovery_tables.sql) vocabulary:

| Entity | Actual states | Relevant consequence |
|---|---|---|
| Cinema | ACTIVE, TEMPORARILY_CLOSED, INACTIVE | Approved admission requires ACTIVE; closed/inactive fails closed |
| Hall | ACTIVE, MAINTENANCE, INACTIVE | No CLOSED enum exists. Approved active Hall requirement rejects MAINTENANCE/INACTIVE without inventing CLOSED |
| Showtime | DRAFT, SCHEDULED, OPEN_FOR_BOOKING, STARTED, ENDED, CANCELLED | CANCELLED/ENDED excluded. Normal paid sale requires OPEN_FOR_BOOKING; no automatic STARTED progression is installed. Do not make STARTED mandatory or introduce another state |
| Booking | PENDING, PAID, EXPIRED, CANCELLED | Only coherent PAID aggregate can be admitted; payment expiry is not admission expiry |
| Ticket | VALID, CHECKED_IN, EXPIRED, CANCELLED | Only VALID → CHECKED_IN; no USED alias or automatic expiry |

The source supports retaining OPEN_FOR_BOOKING after start and a stored STARTED state; any final operational eligibility mapping must be explicitly stated in the resumed contract and tested, not copied from public discovery. This report does not implement or certify that predicate.

[V5 acquire/hold guard](../../backend/src/main/resources/db/migration/V5__create_seats_and_authoritative_holds.sql) requires active Cinema/Hall, published Movie, OPEN_FOR_BOOKING future Showtime/cutoff and sellable active Seat. [V10 `payment_settlement_eligible`](../../backend/src/main/resources/db/migration/V10__integrate_sandbox_payment_finalization.sql) likewise requires active Cinema/Hall, published Movie, OPEN_FOR_BOOKING future Showtime/cutoff, original unexpired origins and unsold units. No inactive-Cinema/Hall settlement gap was found in those inspected predicates. This is a source finding, not a newly executed sale regression or exhaustive guarantee about every administrative incident workflow.

Admission must not reuse sale-time future-start/cutoff/Seat-resale checks. Purchased Seat units are already sold. Movie publication or Customer account status after purchase is not an approved admission veto. Current sale/Payment code remains unchanged; no cancellation/refund/reschedule/Seat release is added.

### 5.5. Contract and ADMIN endpoint publication status

The four approved future Staff resources are recorded, **not implemented or published as a new callable contract**:

- GET `/api/v1/staff/cinema-assignments`.
- POST `/api/v1/staff/booking-qr-resolutions` with canonical string `cinemaId`, exact UTF-8 `bookingQr` in confidential body; logical read only.
- GET `/api/v1/staff/bookings/{bookingId}?cinemaId={cinemaId}` for independent scope-revalidated recovery.
- POST `/api/v1/staff/bookings/{bookingId}/check-ins` with canonical string `cinemaId` and nonempty canonical string `ticketIds`; committed atomic selected transitions only.

`docs/api/staff-qr-checkin-contract-v1.0.md` **not created** because the task's decision gate stopped before completing the combined contract/security design. No ADMIN provisioning endpoint/DTO is implemented or presented as approved. Credential-dependent create input, activation response/behavior, confidentiality/error semantics and subsequent administrative lifecycle contract remain to finalize after §5.3 is resolved. Exact technical bounds/400–503 behavior and typed Staff DTOs still require publication and implementation tests; this report is not that API contract.

### 5.6. Assignment, migration, writer, guard/audit and ACL status

- Actual source head V12 rechecked by ordered V1–V12 inventory. No V13 created/applied; no Java or migration edited.
- Designed `cinema_assignments` still absent from migrations. Physical dictionary §3.3 defines User/Cinema/type/status/effective_at, retained inactive rows, active-scope uniqueness and multiple scopes; none is installed by this task.
- V10 Ticket guard still routes to `guard_payment_record`, which permits protected owner INSERT and rejects Ticket UPDATE/DELETE. Existing issuance and audit/evidence/reconciliation protections remain intact.
- `smart_cinema_hold_runtime` retains Ticket SELECT; Check-in owner/function/grants/audit uniqueness/correspondence assertions do not yet exist. No PUBLIC helper/owner membership/financial privilege expansion performed.
- Corrected integrity v1.1 order remains User → Cinema → Hall → Showtime → Movie → Seats → Showtime Seat pairs → Bookings → Holds → command-specific later resources → Tickets/audit. Staff account blocking/revocation must later serialize against actor User SHARE with protected administration taking User UPDATE before scope/resource locks; this is not tested/implemented now.
- Proposed new NOLOGIN owner, safe schema-qualified definer functions, parent-first locking, fresh database time, bounded timeouts, immutable Ticket identity and exactly one matching audit remain Phase 4B-1 implementation requirements. They are not verified runtime capabilities after this preflight.

## 6. Files Created

- This report: `docs/reports/2026-10-12_staff-checkin-contract-database-foundation_report.md`.
- Ignored evidence under `backend/target/qa/staff-checkin-foundation-2026-10-12/`: preflight SHA-256 baseline and documentation/preservation checks only. No generated production/test/schema artifact.

## 7. Files Modified

- [Current handoff](../ai/current-handoff.md): additive dated note recording the verified credential/activation blocker, STOP status, V12/no implementation and link to this report. Existing milestone text retained.

No application source, test, migration, existing contract, frontend, requirements, historical report, secrets/environment or deployment file changed. Incoming untracked Phase 3A/4A reports remain untouched. No staging/reset/commit.

## 8. Verification — Actual Commands and Results

| Check | Actual result |
|---|---|
| `git status --short`, `git rev-parse HEAD`, `git diff --cached --name-only` | Entry HEAD recorded; two incoming reports untracked; empty index |
| Migration inventory and relevant source/contract searches | Source head V12; no assignment migration or Staff provisioning/credential lifecycle endpoint found |
| DOCX semantic inspection | .NET Zip/XML read, targeted Staff/credential/activation search; no initial Staff onboarding contract found |
| Source preservation SHA-256 | 702 entry files fingerprinted; only intended handoff update differs; all Java/frontend/tests/V1–V12/prior contracts/reports retained |
| Documentation UTF-8/links/template/whitespace/conventions | PASS after final report/handoff validation |
| Focused backend/database/security/concurrency tests | **NOT RUN — implementation STOP before production/test/migration changes**; 0 new tests executed, no PASS/skip count invented |
| Full `mvn verify` | **NOT RUN — same mandatory STOP gate**, not claimed as current regression PASS |
| Clean install / V12 upgrade / restricted role ACL / rollback / audit integrity | **NOT RUN — no V13 or database change** |
| Frontend TypeScript/lint/unit/build/Playwright | NOT RUN — no frontend change, outside this stopped backend phase |
| Neon / credentials / VNPAY / actual Staff admission | NOT RUN — no database/provider operation or account/assignment/financial/admission data manufactured |

Historical evidence only: Phase 3B reports 317/317 backend tests; Phase 3C reports 151/151 frontend unit, 272/272 Playwright and TypeScript/lint/build PASS. These counts were **not rerun**, do not validate new Check-in functionality and are not this task's final test totals.

Preflight command corrections: guessed `RegisterRequest.java`/`DevelopmentAdminProvisioningService.java` filenames do not exist; actual `RegisterUserRequest.java` and `DevelopmentAdminService.java` were located and inspected. No missing source was replaced or fabricated. No database/test command was started and then skipped to mask a failure.

## 9. Requirement Reconciliation

| Deliverable / constraint | Result |
|---|---|
| Recheck head, authorization/provisioning architecture and blocker evidence | PASS for preflight |
| Record approved window/batch/scope/ADMIN/recovery policies unchanged | PASS |
| Credential/activation STOP instruction | PASS — stopped before Java/migration changes |
| Published Staff contract / typed DTOs / ADMIN endpoint implementation | **NOT IMPLEMENTED — BLOCKED** |
| Assignment/protected migration/Check-in writer/audit/ACL | **NOT IMPLEMENTED — BLOCKED** |
| Focused/full tests, migration and concurrency acceptance | **NOT RUN — BLOCKED** |
| Blocking report/current handoff verified facts | PASS |
| Preserve application/source/data/contracts, no commit/deploy/Phase 4B-2 | PASS |

Phase 4B-1 acceptance is **not met**. This report records the required gate outcome, not successful implementation or a completed backend foundation.

## 10. Deviations / Conflicts

The approved task intentionally narrows broader SRS Manager provisioning/Admin operational permissions: ADMIN-only account/assignment administration; STAFF-only admission. Those are explicit phase decisions and must be reflected in later code/contracts without rewriting BRD/SRS.

Execution deviates from the requested implementation/test outcome because the same task explicitly orders STOP when credential/activation policy is unresolved. That is a user-specified gate, not an inferred permission flow. No scope exemption or invented business workflow was used to claim completion.

Existing Convention Conflicts: legacy spaced scope/DOCX names retained; no mass rename or new exception. Report path/date matches the request. No current source migration is renamed/revised.

## Convention Compliance

Checked against [canonical conventions](../development/project-conventions.md) before writing and after report/handoff checks.

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | Requested dated kebab-case report; existing handoff; ignored evidence in target |
| Documentation convention | PASS | Template sections, actual status, verified/proposed distinction, real IDs, exact NOT RUN and historical evidence |
| Domain/status terminology | PASS | Actual uppercase serialized role/states; no USED/CLOSED/PENDING_ACTIVATION invented |
| API convention | NOT APPLICABLE to implementation | Approved paths recorded only; no new versioned/callable contract or controller created |
| Java/database/frontend naming | NOT APPLICABLE | No code/schema/frontend modification |
| Preservation/security | PASS | Credentials never requested/printed, old reports/contracts/V1–V12 unchanged, no live DB/provider action, HEAD/index retained |

## 11. Blocker / Known Limitations

**Required decision:** approve a concrete initial STAFF credential, activation and first-use/delivery workflow (§5.3). Existing BCrypt/login infrastructure can support the minimal option, but does not authorize it by itself.

No Staff account/assignment foundation, protected Check-in writer, new audit/ACL mechanism or contract has been deployed or implemented. No live/current Staff records, applied schema or financial/admission result was inspected. Policy metadata and source-level sale findings are not migration/runtime acceptance.

No real password, token or merchant credential is needed in the reply. Specify only the onboarding policy.

## 12. Next Recommended Step / Phase 4B-2 Prerequisites

1. Resolve §5.3. The minimum proposed option is ADMIN-supplied initial password, initial BLOCKED, explicit ADMIN activation, ordinary existing login, no invitation/forced first-login change, controlled credential delivery outside the app.
2. Resume **Phase 4B-1**, recheck working tree/head, finish the contract/security design before Java/SQL, then implement protected ADMIN Staff provisioning, assignment persistence and the approved forward migration/writer/guard/audit foundation.
3. Run isolated focused security/ACL/migration/concurrency/rollback and full `mvn verify`, preserving prior cases; publish exact results/failures and reconcile requirements/conventions.
4. Only after Phase 4B-1 passes, separately authorize Phase 4B-2 operational Staff HTTP controllers against the published contract. Frontend/camera/workspace remain later authorized work.

STOP applied. No commit, deployment, Neon modification or Phase 4B-2 continuation.
