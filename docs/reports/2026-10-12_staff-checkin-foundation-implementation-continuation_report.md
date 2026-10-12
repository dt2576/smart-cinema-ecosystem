# Phase 4B-1 — Secure Staff Invitation and Check-in Foundation Implementation Continuation

## 1. Task Information

- Date: 2026-10-12, Asia/Saigon.
- Type: backend/database implementation continuation; Gmail SMTP addendum applied.
- Status: **COMPLETE for authorized Phase 4B-1 backend/foundation scope**. Final full backend regression **365/365 PASS**, 0 failures/errors/skips. Staff operational HTTP controllers/frontend remain unimplemented by phase boundary.
- Entry HEAD: `b8a4d21d8d1774a3bb79ba7335a46420568af1fc`; index empty. Entry handoff already modified and three prior reports untracked; original contents preserved.
- Source migration head verified **V12 before implementation**, now **V13**. Applied/validated in dedicated local QA and isolated test schemas only; **Neon NOT RUN**, no deployment/commit.
- Previous [BLOCKED report](2026-10-12_staff-checkin-contract-database-foundation_report.md) retained unchanged. Resume explicitly approves private Staff invitation/password onboarding; no historical result is rewritten as success.

## 2. Requested Work

Implement approved ADMIN-provisioned BLOCKED STAFF, secure one-time emailed invitation, private password setup, explicit ADMIN activation, resend/status/assignment administration, durable encrypted delivery, provider-independent Spring Mail/Gmail defaults, designed assignments and protected database Check-in. Publish contracts before Java/V13. Test local SMTP/Mailpit, HTTP/security/token concurrency, protected ACL/audit/rollback, admission and clean/upgrade migrations; run full backend verify, update handoff and STOP.

No Staff QR/Check-in/operational Booking HTTP controllers, scanner/workspace/password-setup/Admin frontend, financial/provider changes, production SMTP/deployment or automatic Phase 4B-2.

## 3. Documents Reviewed

- [Root instructions](../../AGENTS.md), [Development](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md)/[Backend](../../.agent/workflows/BACKEND_WORKFLOW.md)/[Review](../../.agent/workflows/REVIEW_WORKFLOW.md) workflows; applicable [coding](../../.agent/rules/CODING_RULES.md), [documents](../../.agent/rules/DOCUMENT_RULES.md), [traceability](../../.agent/rules/REQUIREMENT_TRACEABILITY.md) rules and [canonical conventions](../development/project-conventions.md). No backend-local AGENTS/security-specific instruction file in inspected inventory.
- [Blocked Phase 4B-1 report](2026-10-12_staff-checkin-contract-database-foundation_report.md), [Phase 4A](2026-10-11_staff-qr-checkin-contract-audit_report.md), [Phase 3A](2026-10-11_customer-booking-history-ticket-qr-contract-audit_report.md)/[3B](2026-10-11_customer-booking-history-ticket-qr-backend_report.md)/[3C](2026-10-11_customer-my-bookings-ticket-qr-frontend_report.md), [Customer read contract](../api/customer-booking-history-ticket-qr-contract-v1.0.md), [current handoff](../ai/current-handoff.md).
- [Auth foundation](2026-09-15_auth-database-foundation_report.md), [development Admin provisioning report](2026-10-01_development-admin-provisioning_report.md) and [guide](../development/development-admin-provisioning.md); actual User/registration/login/renewal/security architecture.
- [BRD v1.2](../brd/brd-v1.2.md), [SRS v1.2](../srs/srs-v1.2.md), [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md), [System Analysis v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx), [physical dictionary](../db/physical-data-dictionary-v1.0.md), [integrity v1.1](../db/integrity-enforcement-design-v1.1.md)/[v1.2](../db/integrity-enforcement-design-v1.2.md); relevant readings from preceding preflight reconciled against preserved source and new approvals.
- V1–V12 inventory/source/protected owners/grants, current Booking/Payment/Ticket/Cinema/Hall/Showtime implementation and regression infrastructure. Previous owner/scope/policy audit reused only where source remains unchanged.
- Official [Google App Password guidance](https://support.google.com/accounts/answer/185833), [SMTP setup](https://support.google.com/a/answer/176600), [Gmail limits](https://support.google.com/mail/answer/22839); [Mailpit v1.31.5 release](https://github.com/axllent/mailpit/releases/tag/v1.31.5). Documentation uses these links; no Google account configuration or live mail action.

## 4. Requirements Traceability / Approved Decisions

| Actual requirement / approval | Applied behavior | Result |
|---|---|---|
| BR-002–004; FR-AUTH-007/008; NFR-SEC-002/003 | Explicit ADMIN HTTP gate plus current database ACTIVE/ADMIN; current STAFF/scope in database command | PASS |
| BR-053/055; FR-ORG-002/004/005; FR-AUDIT-003 | Protected ADMIN Staff/assignment administration, attribution, retained history, multiple Cinemas | PASS; MANAGER administration deliberately excluded by approval |
| FR-AUTH-002; NFR-SEC-001/006/010–012; resume §§2–6 | Private Staff password, single-use 256-bit token/digest/encrypted outbox, exact 24h, explicit activation, rate limits/redaction | PASS in focused tests |
| BR-043–047; FR-TICKET-001–004/009/010; BRULE-TICKET-001–009 | Existing issued aggregate preserved; one Booking QR/one Ticket per unit; whole COUPLE | PASS in old/new regression |
| BR-048–052/062; FR-CHECKIN-003–012; UC-STF-004; NFR-CONC-003/005/007 | Only VALID→CHECKED_IN, atomic selected batch, actor/scope/operational context/window/unique audit | PASS database foundation; operational HTTP deferred |
| Approved inclusive admission policy | −30/+15 minutes using persisted start and fresh database time; PAID, ACTIVE Cinema/Hall, OPEN_FOR_BOOKING or STARTED | PASS shared exact-boundary and actual-writer tests |
| Approved role narrowing | STAFF-only admission; ADMIN-only provisioning; no Admin/Manager admission inheritance or Manager provisioning | PASS |
| Approved Gmail addendum | Spring Mail environment configuration; Gmail 587/auth/required STARTTLS defaults; App Password guide; local capture tests | PASS configuration/local transport; real Gmail NOT VERIFIED |
| Approved phase boundary | Contract for four Staff operational resources, no implementation of those controllers/frontends | PASS |

IDs come from cited documents. Invitation policy/window/ADMIN-only narrowing are explicit new task approvals, not silent changes to BRD/SRS. Delivery lifecycle/reason/technical bounds are new typed contract details, distinct from existing User/Booking/Payment/Ticket states.

## 5. Implementation Summary

### 5.1. Account provisioning and private password setup

[AdminStaffController](../../backend/src/main/java/com/smartcinema/staff/AdminStaffController.java), [StaffOnboardingService](../../backend/src/main/java/com/smartcinema/staff/StaffOnboardingService.java), [StaffRepository](../../backend/src/main/java/com/smartcinema/staff/StaffRepository.java) implement current ACTIVE ADMIN create/list/detail, invitation reissue, activation/block and assignment operations. Full name/email/mandatory phone reuse registration validation/normalization. Unknown fields including password/role/status in create, duplicates and noncanonical IDs are rejected. Existing normalized email is conflict, never role promotion/reset/overwrite.

Create one transaction: STAFF/BLOCKED + unmistakably unusable non-BCrypt credential marker + onboarding record + invitation digest + encrypted delivery intent + attributed audit. A deferred database assertion forbids committing provisioning without invitation intent. The service's validation-only placeholder is not stored/hashed as a credential; ADMIN never supplies a Staff password.

Public [StaffPasswordSetupController](../../backend/src/main/java/com/smartcinema/staff/StaffPasswordSetupController.java) accepts confidential POST token/password only. Existing minimum 8-character policy and BCrypt maximum 72 UTF-8 bytes apply; invalid UTF-8/unpaired surrogates fail safely. Store BCrypt hash privately, atomically consume invitation and set passwordSetAt, retain BLOCKED. Concurrent redemption permits exactly one success/audit. ADMIN activation before setup is denied in command and onboarded-User guard; after activation existing password login works. No invitation auto-login/automatic ACTIVE, Cinema grant, password reset or first-login change.

Block invalidates outstanding invitations and removes pending payloads; configured password remains intact. Reissue is incomplete-onboarding only, fresh token/new 24 hours, old outstanding token revoked; completed accounts refuse reissue. Assignment history survives account/credential changes.

### 5.2. Invitation security, privacy and expiration

[StaffInvitationCrypto](../../backend/src/main/java/com/smartcinema/staff/StaffInvitationCrypto.java): SecureRandom **32 bytes/256 bits**, canonical unpadded base64url (43 characters), SHA-256 digest only for lookup, purpose STAFF_PASSWORD_SETUP. Exact valid interval `[issuedAt, issuedAt + 24h)` with authoritative database time; **at expiresAt it is invalid**. No UUID/account-ID bearer secrets. Token is bound to Staff/purpose and supersession/consumption/revocation; no accepted account override.

Delivery payload uses AES-256-GCM, fresh 12-byte nonce, external key ID/ring, AAD binding account/purpose/digest. Decrypt authenticates payload and constant-time verifies recovered digest. Database/outbox/audit/API store/return no raw token or password. Key rotation retains previous external keys until pending payloads terminate; removing a needed key fails delivery, never regenerates a token. No real encryption/SMTP secret was created/printed or placed in source. Test-only key material is explicitly isolated fixture configuration.

[StaffSensitiveBody](../../backend/src/main/java/com/smartcinema/staff/StaffSensitiveBody.java) and [StaffWebConfiguration](../../backend/src/main/java/com/smartcinema/staff/StaffWebConfiguration.java) redact before MVC DEBUG/TRACE argument diagnostics, reject malformed UTF-8 and keep old controllers' JSON semantics unchanged. [StaffRequest](../../backend/src/main/java/com/smartcinema/staff/StaffRequest.java) enforces unknown/duplicate/trailing JSON rejection and canonical IDs. [StaffRequestFilter](../../backend/src/main/java/com/smartcinema/staff/StaffRequestFilter.java) stream-bounds bodies before binding at 64 KiB and rate-limits public redemption; private password JDBC binding bypasses Spring parameter-value TRACE logging.

Activation URL comes only from explicit HTTPS base, no Host/header derivation/userinfo/query/fragment. Token added as fragment `#token=...`, not a backend access-log query. No GET validates/consumes tokens. Exact later frontend contract: immediately isolate/remove fragment into memory, no-referrer/no-store, no persistent storage/third-party resources/analytics, explicit password POST and truthful awaiting-ADMIN state. Full activation frontend remains unimplemented.

### 5.3. Durable delivery, retry and SMTP

[StaffDeliveryWorker](../../backend/src/main/java/com/smartcinema/staff/StaffDeliveryWorker.java) claims durable leased rows in short transactions, commits before decrypt/MIME/SMTP, finishes separately. Same encrypted payload/token/deadline across retry, 5 attempts by default, 30-second exponential delay capped at 30 minutes, 5-minute lease; validated finite configurable ranges. Expired queued/leased rows are swept regardless of future retry timestamp. Successful/terminal/revoked/consumed/superseded payloads are erased. Disabled/unavailable worker delays cleanup, but never extends redemption validity.

SMTP is not atomic with database. Crash after SMTP acceptance before finish can duplicate delivery of the **same** invitation; actual capture test covers this and restart/lease recovery. A revoked/expired message already in SMTP flight cannot be recalled, but its link is rejected. SENT means SMTP acceptance, not inbox receipt or account activation. Transport/config/key failures produce fixed warning and bounded retry/FAILED, never fake success. Mail debug is forcibly off; no raw MIME/exception/token logs.

Spring Boot Mail dependency added; [application properties](../../backend/src/main/resources/application.properties)/[sanitized environment example](../../backend/.env.example) expose provider-independent host/port/username/App Password/auth/STARTTLS/SSL/timeouts/sender/base URL/encryption ring/retry/lease/scheduler settings. Gmail development/demo defaults smtp.gmail.com:587, auth true, STARTTLS enabled+required, SSL false. Delivery stays disabled until explicitly configured; missing credentials/keys are not fabricated. Other providers use the same SMTP configuration.

Vietnamese UTF-8 multipart plain-text/HTML invitation, exact approved subject, Smart Cinema identity, one activation link per alternative, concrete expiry UTC/24-hour notice, awaiting-ADMIN explanation and unexpected-invitation guidance. User-controlled name/URL HTML escaped; no password/hash/internal database ID or external asset in email.

Local tests use loopback non-relaying SMTP capture and **real Mailpit v1.31.5** at 127.0.0.1:1027/8027. Docker daemon unavailable; official portable Windows archive downloaded to ignored target, SHA-256 matched GitHub release digest (`9637e21c02b33185fe69268ba05317152a5d8ac7877115e8a70e29b7e199e8dc`). No system installation/configuration change. Mailpit process started hidden for this task and stopped after tests. No real Gmail/recipient send.

[Gmail developer guide](../development/gmail-smtp-setup.md) covers dedicated sender, 2-Step Verification/App Password eligibility, private storage, compatible sender/alias, separately authorized connectivity check, rotation/revocation and Gmail operational limits. Real Gmail transport/inbox behavior **NOT VERIFIED**; account/SMTP credentials were not requested.

### 5.4. Implemented ADMIN/public HTTP inventory

Final wire/error/body/credential rules: [onboarding/admin contract v1.0](../api/staff-invitation-administration-contract-v1.0.md).

| Implemented method/path | Input / result |
|---|---|
| POST `/api/v1/admin/staff` | fullName/email/phone only; 201 typed StaffAccount, queued intent, no secret |
| GET `/api/v1/admin/staff?page=0&size=20` | Strict page/size, bounded 1–100, numeric ID order; typed array |
| GET `/api/v1/admin/staff/{staffId}` | Minimal account/setup/expiry/delivery status |
| POST `/api/v1/admin/staff/{staffId}/invitations` | `{}`; protected reissue; new digest/expiry, old invalidated |
| PUT `/api/v1/admin/staff/{staffId}/status` | ACTIVE/BLOCKED only; setup gate and attributed audit |
| GET `/api/v1/admin/staff/{staffId}/cinema-assignments` | Typed retained assignment records |
| POST `/api/v1/admin/staff/{staffId}/cinema-assignments` | Canonical cinemaId + finite effectiveAt; ACTIVE STAFF assignment |
| PUT `/api/v1/admin/staff/{staffId}/cinema-assignments/{assignmentId}/status` | ACTIVE/INACTIVE only, parent identity/scope preserved |
| POST `/api/v1/staff/password-setups` | Public confidential token/password POST; 204 after atomic setup/consumption, remains BLOCKED |

All new resource IDs are canonical bigint strings (including beyond JS-safe range); UTC instant timestamps, safe typed fields/no raw QR/password/hash/SMTP/key. No-store on success/application errors and existing security headers on authentication denial. Fixed 400/401/403/404/409/429/503 semantics with no input/SQL/secret reflection. Durable redemption per hashed peer 10/minute; ADMIN reissue per actor 3/hour, independent committed buckets. Retry-After 60/3600 respectively. Seven-day inactive rate-key cleanup/counter saturation; forwarded headers not implicitly trusted. These are engineering limits, not business Ticket maxima.

Current ADMIN checked for every read and mutation; database functions recheck under ordered locks. Public CUSTOMER registration/authentication/JWT/session behavior preserved; only additive security matchers/CSRF exceptions for exact new resources. No global CSRF disable or public role selection.

### 5.5. Assignment persistence, exact migration and protected writers

[V13](../../backend/src/main/resources/db/migration/V13__create_staff_onboarding_and_checkin_foundation.sql) adds:

| Objects | Meaning |
|---|---|
| `cinema_assignments` | User/Cinema FKs, STAFF/MANAGER type, ACTIVE/INACTIVE, finite effective_at; retained history, partial active-scope unique index and lookup indexes |
| `staff_onboarding` | Staff/User and creating ADMIN, creation time/password_set_at; deferred invitation-intent assertion |
| `staff_invitations` | Purpose-bound unique digest, issued/expires exactly24h, consumed/revoked, one outstanding per Staff |
| `staff_invitation_deliveries` | Invitation FK, only encrypted payload/key ID/nonce, durable status/attempt/backoff/lease/completion; indexed pending work |
| `staff_rate_limits` | Durable hashed scope-key bucket and retention index |
| `uq_ticket_checkin_event` | One TICKET_CHECKED_IN audit per Ticket |
| NOLOGIN `smart_cinema_staff_owner`, `smart_cinema_checkin_owner` | Distinct onboarding/admin/queue versus Ticket command authority |
| `staff_create_account`, `staff_issue_invitation`, `staff_set_password`, `staff_set_status`, `staff_assign_cinema` | Narrow protected administration/onboarding functions |
| `staff_claim_delivery`, `staff_finish_delivery`, `staff_rate_limit` | Bounded queue/rate functions, no financial writer delegation |
| `staff_lock_admin`, `staff_revoke_invitations`, `staff_invitation_at`, `staff_admission_at` | Private helpers; no PUBLIC/runtime EXECUTE |
| `lock_staff_assignment_cinema`, `lock_staff_admission_resources` | Private existing hold-owner lock-only adapters; no broad Cinema/Booking mutation grant to new owners |
| `staff_guard_record`, `staff_guard_user`, `staff_guard_audit`, `staff_assert_invitation_intent` | Protected/immutable lifecycle/assignment/payload, onboarding mutation/activation gate, narrow append-only audit and intent assertion |
| `check_in_tickets`, `guard_ticket_checkin`, `assert_ticket_checkin`; `ct_ticket_checkin`, `ct_ticket_checkin_audit` | Ordered protected selected transition and exact per-Ticket audit correspondence |

V13 retains existing financial/evidence/reconciliation guard implementation. Only audit/Ticket trigger routing evolves with narrowly named new owner branches. Existing `assert_paid_aggregate` remains owned by the original protected hold owner and becomes SECURITY DEFINER for read assertions, rather than giving Check-in owner Payment SELECT. No financial DML/verification/state-machine/amount policy change. Source V1–V12 byte-identical.

Runtime receives only approved EXECUTE and required reads; no owner membership, public helper EXECUTE, direct Ticket UPDATE/DELETE or unrestricted assignment/audit DML. New owners use minimum column access to existing Users/context/Booking snapshots, no Customer credential or Payment/provider writer delegation. Safe fixed search_path and schema qualification follow current isolated-schema migration conventions; temporary migration owner membership/CREATE are revoked.

### 5.6. Ticket transition, lock order, concurrency/audit

Only `VALID → CHECKED_IN`, approved columns status/checked_in_at/checked_in_by_user_id, finite database time ≥ issuedAt. All identity/code/Booking Seat/issued fields immutable, repeated updates/non-VALID transitions/delete denied. Settlement INSERT remains under existing hold owner. Validate complete paid Ticket aggregate and every selected member/state before writing; missing/foreign membership safe P0002, used/non-VALID/conflicting eligibility P0003, malformed selection P0001. HTTP mapping for operational controllers remains Phase 4B-2.

Actor User SHARE precedes private parent/resources gate: Cinema SHARE → Hall SHARE → Showtime UPDATE → Movie SHARE → ordered Hall Seats/pairs/Bookings/Holds → selected Tickets UPDATE → audit. Nonlocking discovery is rechecked after parent locks. Account/assignment mutations acquire actor/target Users deterministically before Cinema/assignment rows; target UPDATE serializes block/revoke with admission. Confirmed lock-wait tests exercise revocation/block after a Check-in is actually waiting; two different Staff/overlapping batches allow at most one success for each competing Ticket.

Fresh database time after resource/Ticket waits; bounded lock/statement/transaction timeouts; no network under admission/admin domain locks. Queue claims/finishes lock only their own rows and never enter earlier domain ranks afterward. All selected Ticket mutations and one attributable audit per Ticket commit together or rollback together. Unique event plus deferred assertion checks exact actor/time/Booking/Cinema/Showtime identity and rejects audit-only fake success. Later Staff blocking preserves historical audit.

COUPLE is one Ticket/two guests/one transition. Selected units may differ across separate requests, Booking stays PAID, QR unchanged, sold markers/consumed Holds/freeze/original expiry untouched. No Customer Check-in, cancellation/refund/resale/automatic Ticket expiry or financial success logic.

### 5.7. Verified operational statuses; sale versus admission

Actual Cinema ACTIVE/TEMPORARILY_CLOSED/INACTIVE; Hall ACTIVE/MAINTENANCE/INACTIVE; Showtime DRAFT/SCHEDULED/OPEN_FOR_BOOKING/STARTED/ENDED/CANCELLED. No CLOSED/USED/new User state invented. Admission accepts ACTIVE Cinema/Hall and OPEN_FOR_BOOKING/STARTED only, inclusive persisted start−30/start+15; pre-opening SCHEDULED/DRAFT and ENDED/CANCELLED fail closed. Existing sale produces OPEN_FOR_BOOKING; automatic STARTED is not assumed/required.

V5 hold acquisition and V10 settlement already reject inactive Cinema/Hall, require published Movie and future OPEN_FOR_BOOKING/cutoff/origin readiness. No inactive-resource sale gap found in those predicates; no sale policy changed. Admission deliberately ignores later Movie unpublication/Customer account status, sold-seat availability and original pre-sale expiry. New tests verify post-expiry paid admission and unchanged Customer issued reads, plus real Cinema closure/Hall maintenance rejection without paid mutation. Exact boundary/Showtime negative states use the shared pure predicate; ordinary paid-showtime cancellation remains unsupported, not newly installed.

### 5.8. Published Staff operational contract, implementation boundary

[Staff QR/Check-in contract v1.0](../api/staff-qr-checkin-contract-v1.0.md), written with the [security design](../db/staff-onboarding-checkin-security-design-v1.0.md) **before Java/V13**, defines four approved resources, typed minimum projection, canonical IDs/exact opaque UTF-8 QR, confidentiality/no-store, current scope, readonly resolution, recovery and atomic selected command/error semantics. 1 MiB operational command body bound is technical, not an arbitrary Ticket business maximum; operational rate limits are defined for Phase 4B-2.

**Not implemented here:** GET Staff assignments, POST QR resolution, GET operational Booking recovery and POST HTTP Check-in. New controllers are only ADMIN management/public password setup. Staff scanner/workspace/activation UI, Admin frontend and rich counters/manual lookup are absent. Existing Customer frontend remains unchanged.

## 6. Files Created

24 files total:

- 14 Java files under `backend/src/main/java/com/smartcinema/staff/`: `AdminStaffController.java`, `StaffPasswordSetupController.java`, `StaffOnboardingService.java`, `StaffRepository.java`, `StaffInvitationCrypto.java`, `StaffInvitationSettings.java`, `StaffDeliveryWorker.java`, `StaffRateLimiter.java`, `StaffRequest.java`, `StaffSensitiveBody.java`, `StaffWebConfiguration.java`, `StaffRequestFilter.java`, `StaffFailure.java`, `StaffExceptionHandler.java`.
- [V13 migration](../../backend/src/main/resources/db/migration/V13__create_staff_onboarding_and_checkin_foundation.sql).
- [StaffInvitationTests](../../backend/src/test/java/com/smartcinema/staff/StaffInvitationTests.java), [StaffFoundationPostgresTests](../../backend/src/test/java/com/smartcinema/staff/StaffFoundationPostgresTests.java), [LocalSmtpCapture](../../backend/src/test/java/com/smartcinema/staff/LocalSmtpCapture.java).
- Two additive API contracts, security design, two development guides linked above and this continuation report (six documentation files).

Ignored evidence under `backend/target/qa/staff-foundation-continuation-2026-10-12/`: baseline hashes, logs/results, preservation/doc checks, Mailpit verified download/process evidence and local QA synchronization helper. No generated artifact committed; no credential/token MIME output published.

## 7. Files Modified

Eight existing files:

1. [pom.xml](../../backend/pom.xml): Spring Boot Mail dependency only.
2. [application.properties](../../backend/src/main/resources/application.properties): additive environment-backed SMTP/invitation configuration, safe disabled default.
3. [.env.example](../../backend/.env.example): sanitized SMTP/key/retry examples, existing content retained.
4. [AuthSecurityConfiguration](../../backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java): exact additive Admin/public setup matchers; existing behavior preserved.
5. [SmartCinemaApplicationTests](../../backend/src/test/java/com/smartcinema/SmartCinemaApplicationTests.java): new repository MockitoBean in existing no-DataSource context; old methods/assertions retained.
6. [AdminMoviePostgresTests](../../backend/src/test/java/com/smartcinema/admin/AdminMoviePostgresTests.java): one exact migration-head assertion 12→13; business assertions unchanged.
7. [VnpayMigrationPostgresTests](../../backend/src/test/java/com/smartcinema/payment/VnpayMigrationPostgresTests.java): one current-head assertion 12→13; original V9→V10 upgrade/checksum/issuance assertions unchanged.
8. [current handoff](../ai/current-handoff.md): additive continuation facts; incoming BLOCKED/preflight/earlier milestones retained as history.

No existing file moved; no frontend, V1–V12, Payment/Booking/Hold/VNPAY business source, environment secret or historical report/contract rewrite. Three incoming untracked reports preserved. Entry handoff content remains below the new continuation note. HEAD/index unchanged.

## 8. Verification — Commands and Exact Results

Dedicated local PostgreSQL 18.4 regression database `smart_cinema_v11_accepted_20261001`, localhost only; old DB flags plus STAFF_DB_TESTS=true. Test overrides SMTP host to loopback, credentials blank/auth/TLS disabled only in local capture, scheduler/cleanup disabled; no Gmail fallback. Each new DB suite uses a random schema; runtime owner-abuse tests switch **SESSION AUTHORIZATION** to the restricted role rather than trusting a superuser's SET ROLE result. Clean V13 and V12→V13 upgrade checked with original checksums.

| Actual command / check | Result |
|---|---|
| Baseline `mvn verify` | PASS **317/317**, 0 failures/errors/skips, exit0, 1:41 |
| Migration smoke `mvn -Dtest=BookingReadPostgresTests,SmartCinemaApplicationTests test` | PASS **32/32**, 0 failures/errors/skips, 24.129s |
| Final focused `mvn -Dtest=StaffInvitationTests,StaffFoundationPostgresTests test` | PASS **48/48** (8 unit +40 HTTP/PostgreSQL/SMTP cases), 0 failures/errors/skips, 27.215s; final full run covers subsequent membership error-code refinement |
| **Accepted final `mvn verify`** | **PASS 365/365 in 54 suites**, 0 failures/errors/skips, exit0, **1:48**, completed 2026-10-12T09:13:37+07:00; compile/JAR/repackage PASS |
| Baseline cases preserved | All original **317** retained; 48 added. Old two head assertions updated exactly to authorized V13, no scenario removal/skip/retry masking |
| Local SMTP and real Mailpit capture | PASS: actual Vietnamese MIME/HTML/text/link/SMTP acceptance; explicit local-only transport; worker failure/retry/duplicate/crash/expiry cases |
| Restricted ACL/transition/audit/rollback/concurrency | PASS in new DB suite; original issuance/Customer read tests PASS in full run |
| Clean install / V12 upgrade | PASS in isolated schemas; V1–V12 source/applied checksums retained |
| Source/doc/preservation checks | PASS: 703 entry files tracked by baseline; only intended eight existing files change, 695 preserved; 24 new task files; UTF-8/links/whitespace/template/HEAD/index checked |
| Frontend tsc/lint/unit/build/Playwright | NOT RUN — no frontend change; no unnecessary suite/provider operation |
| Real Gmail, actual employee inbox/activation page | **NOT VERIFIED / NOT RUN** — no live Gmail credential/send, frontend setup page not implemented |
| Neon / actual VNPAY / actual production paid admission | **NOT RUN** — local synthetic HTTP/protected-settlement fixtures are not external interoperability |

### Failure history and corrections — retained, not hidden

1. First compile failed on overloaded JDBC mapper reference; renamed mapper, compile passed. No test assertion weakened.
2. First focused: 37 tests, 3 failures/23 errors. Shared guard evaluated `NEW.id` against tables without that field; changed to table-specific nested branches. Initial checksum comparison also included Flyway's null-version schema marker in only one side.
3. Second focused: 37, 1 failure/11 errors. Assignment FOR SHARE required additional lock privilege; added private hold-owner lock-only adapter rather than broad Cinema UPDATE grant. Null-version checksum filter reconciled. Third focused: 37/37 PASS.
4. Security hardening focused: 37, 0 failures/4 errors, queue alias collided with PL/pgSQL variable; renamed alias. Expanded 44/44, then 47/47 and complete48/48 passed as meaningful tests were added.
5. First full: 362, 2 failures/0 errors; only hardcoded V12 current-head assertions. Updated exact expectations to13 while retaining all business/upgrade/checksum assertions; next362/362 passed. Further365/365 passed with new Admin HTTP/Unicode/lock-wait/crash cases.
6. Final SQL membership error-code refinement changed unreleased V13 checksum already applied to the **shared local QA/public schema** by earlier runs. Next full: **365, 0 failures/26 context errors/0 skips**, validation failure. No production schema involved. A narrowly validated ignored helper reapplied only this task's Check-in function and repaired **only unreleased local QA V13** metadata; before/after verifies V1–V12 checksums, domain User rows and protected writer owner unchanged. No old migration/source or business data repair. Full accepted run then365/365 passed on final source. Evidence: `qa-unreleased-v13-synchronization.json`, `qa-synchronization.log`, `final-regression.log`, `accepted-final-verify.log`.

An initial Maven classpath-helper argument needed PowerShell quoting; corrected without source effect. Native PowerShell logs are UTF-16LE; summary parser accounts for BOM/encoding. Tests were not skipped/retried automatically, timeouts/thresholds were not weakened, failures remain in ignored logs. No claim that an older PASS validates later source.

## 9. Requirement Reconciliation

| Deliverable / invariant | Result |
|---|---|
| Approved private invitation/blocked setup/explicit activation/reissue | PASS backend/HTTP/DB tests |
| Purpose/256-bit entropy/digest/AES payload/exact24h/single use/concurrency/privacy | PASS focused tests |
| SMTP/Gmail env configuration, Vietnamese alternatives, actual local/Mailpit capture and durable failure/retry | PASS; real Gmail explicitly NOT VERIFIED |
| ADMIN-only provisioning/status/assignment, database current authority, no public Staff role selection | PASS |
| Designed assignments/history/multiple scopes/revocation and block lock relationship | PASS |
| Forward V13, original checksums, owner/ACL/narrow Ticket writer/audit | PASS source/local migration tests |
| Complete paid/VALID/active-context/inclusive window/independent whole-unit atomic Check-in | PASS DB foundation; no operational HTTP claim |
| Existing sale/issuance/freeze/expiry/provider/Customer reads | PASS full regression/source preservation |
| Contract publication and phase boundaries | PASS; four operational controllers/frontends remain deferred |
| Report/handoff/history/conventions/no commit/deploy/Neon | PASS |

These PASS statements apply to authorized backend/local evidence, not actual provider settlement, recipient inbox or a working Staff browser entrance workflow.

## 10. Deviations / Conflicts

No remaining policy blocker; resume explicitly resolves old initial-credential decision. Broader historical Manager administration/Admin admission matrix is intentionally narrowed by current approval without rewriting requirements. Missing closed-Hall/USED vocabularies are not introduced; actual MAINTENANCE/INACTIVE/CHECKED_IN used.

Docker unavailable; verified portable Mailpit plus embedded loopback capture supplied actual SMTP evidence without Docker/system reconfiguration. Delivery is at-least-once with single-use invitation, not exactly-once inbox delivery. The backend can queue intent while transport is disabled/unavailable; status remains truthful, no fake sender. Separate activation frontend remains missing by strict phase scope.

Local QA unreleased V13 synchronization is explicitly disclosed in §8; it was not a production repair or checksum change to V1–V12. Existing convention conflicts: legacy DOCX/spaced scope names retained. No approved naming exception necessary; no arbitrary migration or data rewrite.

## Convention Compliance

Checked before contract/code/migration/report naming and after final verification against [canonical conventions](../development/project-conventions.md).

| Area | Result | Evidence |
|---|---|---|
| Folder/file/class naming | PASS | Existing backend structure, lowercase `staff` Java package, PascalCase Java names, dated kebab-case docs, Flyway V13 filename convention |
| Code/DTO/function/status terminology | PASS | English identifiers, exact old domain enums; new invitation/delivery statuses distinguished; no invented BR/FR/UC IDs |
| REST/API conventions | PASS | `/api/v1/` plural resources, protected Admin and password-setups; operational paths documented only |
| Database conventions/integrity | PASS | snake_case, schema-qualified safe-path functions, purpose/identity/constraints/grants/ordered locks; no old migration edit |
| Documentation/history | PASS | Additive versioned contracts/design, guides/report template and actual evidence; historical BLOCKED/audits preserved |
| Test conventions | PASS | Existing JUnit/MockMvc/local PostgreSQL flags; 317 retained, no skipped tests, real SMTP capture, exact failure history |
| Frontend/UI/imports | NOT APPLICABLE | No source/design/frontend changes |
| Security/scope/concurrent-work preservation | PASS | No secrets/raw tokens in report/source/output, no real SMTP/Neon/provider writes, incoming content preserved, HEAD/index unchanged |

## 11. Known Limitations and Remaining Risks

1. Real Gmail App Password/account eligibility, sender alias, delivery limits/inbox placement and actual HTTPS activation routing are **NOT VERIFIED**. Configure external secrets/sender and separately authorize a specific live recipient test; do not claim local capture proves Gmail.
2. Staff password setup page, Admin management UI and operational scanner/resolver/recovery/Check-in HTTP are unimplemented by scope. Invitation email link cannot establish a complete existing frontend workflow yet.
3. External AES key custody/rotation/backups and production migration/runtime credentials remain operational work. Disabled/unavailable worker delays payload cleanup; expired token stays invalid. No actual production/managed-migrator deployment certification.
4. SMTP can duplicate an invitation after accept/crash and cannot recall an in-flight obsolete email. Same token/time plus authoritative redemption prevents multiple credentials/activation; SENT is transport acceptance only.
5. Runtime DB credentials are trusted service credentials, never browser/operator credentials. NOLOGIN owner separation protects normal runtime, not a malicious superuser/migration operator or arbitrary driver/APM wire logging. Configure secret/body/capture redaction operationally; local MIME/test links are sensitive QA artifacts.
6. Broad per-Showtime gate is deliberately conservative; throughput/P95 under real gate/camera traffic not measured. Shared-proxy rate policy requires deployment-specific trusted-proxy configuration; no implicit forwarded-header trust.
7. Manager assignment type persists, but new Admin workflow manages STAFF only; Manager onboarding/permissions remain separate. Existing non-onboarded legacy STAFF records are not automatically promoted/adopted.
8. New resource IDs are strings; legacy Auth response userId serialization remains unchanged and is not a claim of global JS bigint safety. No frontend/session redesign.
9. No password reset, invitation-after-completed recovery, Staff check-in undo, manual Ticket/financial success, cancellation/refund/rescheduling/automatic expiry or new provider workflow.

## 12. Next Recommended Step / Phase 4B-2 Prerequisites

Review the two published contracts and verified V13 foundation. Separately authorize **Phase 4B-2 operational STAFF HTTP integration**: current scope read, exact UTF-8 confidential QR resolution, minimal coherent Booking/Ticket response, owned operational recovery GET and explicit atomic Check-in with safe errors/rate limits. Use the existing protected writer; no frontend financial or admission authority.

Full password-setup frontend/Admin UI/scanner/workspace must be separately authorized. Before real demo invitation: external keys and Gmail sender configuration, working HTTPS activation route, allowed recipient and explicit live-mail authorization. No automatic Phase 4B-2, commit or deployment. STOP after this continuation report and verified handoff.
