# Phase 4F — Real local Staff QR/Ticket Check-in integration

## 1. Task Information

- Date: **2026-10-15**, Asia/Saigon. Type: real local integration testing and dependency audit.
- Final outcome: **PHASE 4F STAFF CHECK-IN PARTIALLY VERIFIED**.
- Actual negative browser/API execution: **8 grouped checks PASS, 0 FAIL**, 25 sanitized HTTP response records, 6 screenshots. Positive Booking → payment → issuance → Check-in is **BLOCKED / NOT RUN**.
- Blocking dependency: no existing approved local payment simulator or supported local payment-confirmation API was found. Existing issuance requires verified VNPAY IPN/Query evidence and its separate protected system writer; these are deliberately unavailable in the authorized provider-disabled local profile.
- No financial success, PAID Booking, Ticket, QR or Check-in was manufactured. No application-source change, database reset, Neon, external mail/payment, commit, push or deployment.

## 2. Requested Work and Documents Reviewed

Verify legitimate Customer booking through issued Ticket/Booking QR to STAFF admission, preserving isolation and domain authority; stop the positive workflow if external-provider dependence cannot be satisfied safely.

Read [Development Workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), Backend/Frontend workflows, requirement/document/coding/UI rules, [conventions](../development/project-conventions.md), report template, frontend-local AGENTS and installed Next16.3.5 CLI guide. Reviewed [prior onboarding](2026-10-15_staff-onboarding-local-e2e_report.md), [prior real integration](2026-10-15_admin-staff-management-real-local-integration_report.md), [local environment guide](../development/local-test-environment.md), [Staff foundation](../development/staff-onboarding-and-checkin-foundation.md), [Staff frontend guide](../development/staff-checkin-frontend.md), current handoff and relevant Project Scope v1.0, BRD/SRS v1.2 and System Analysis & Design v1.1 use cases.

Contract references: [Discovery](../api/customer-discovery-contract-v1.0.md), [Seat Hold v1.0](../api/seat-hold-contract-v1.0.md)/[v1.1](../api/seat-hold-contract-v1.1.md), [Booking v1.0](../api/booking-contract-v1.0.md)/[v1.3](../api/booking-contract-v1.3.md), [Payment initiation](../api/payment-initiation-contract-v1.0.md), [VNPAY v1.1](../api/vnpay-sandbox-payment-contract-v1.1.md), [owned Ticket/QR reads](../api/customer-booking-history-ticket-qr-contract-v1.0.md), [Staff admission](../api/staff-qr-checkin-contract-v1.0.md) and Admin Showtime authoring. Older contract stage restrictions are historical; V10 finalization and V13/V14 admission are the current implemented boundary.

Actual controllers/services/repositories, Login/security, VNPAY settings/recovery/result writer, Booking/Seat/owned entitlement reads, Staff admission/request parsing, V10/V13/V14 migrations and the real Check-in workspace/controller/API adapter were inspected. Test settlement helpers were examined specifically to distinguish synthetic fixtures from a legitimate application mechanism.

## 3. Requirements Traceability

| Existing requirement/source | Evidence and reconciliation | Result |
|---|---|---|
| BRD v1.2 BR-002/004; SRS FR-AUTH-002/006/007, NFR-SEC-002/003 | Real ADMIN authentication; anonymous operational401; ADMIN operational403; BLOCKED STAFF login401 | PASS tested slice |
| BRD BR-050/053; SRS FR-AUTH-008, FR-ORG-005 | Persisted future assignment verified without modification; current effective-scope operation requires ACTIVE STAFF | PARTIAL: current active scope not exercised |
| BRD BR-043–047; SRS FR-TICKET-001–009 | Verified protected issuance/read contracts; no legitimate local financial evidence or issued aggregate | BLOCKED live workflow |
| BRD BR-048–052/062; SRS FR-CHECKIN-001–013, FR-AUDIT-004; System Analysis UC-STF-004 | Operational contracts/source audited; rejected unauthorized requests verified; actual resolve/selection/commit/rescan/audit needs issued Tickets | PARTIAL; positive acceptance BLOCKED |
| SRS NFR-SEC-006/009/010/011 | No raw QR, JWT, password, callback parameters or secrets in artifacts; no session injection; safe Vietnamese denied UI | PASS tested boundary |
| SRS NFR-UX-004 | Real access guards, keyboard links and responsive390/768/1440 | PASS limited views |
| Explicit task isolation and financial-safety constraints | Dedicated loopback DB, V14, provider/mail disabled, no fake settlement or protected DML | PASS |

No requirement/status/permission/API was added. This report does not establish compliance of the unexecuted admission and concurrency paths.

## 4. Environment Verification

Ran `& ./backend/scripts/local-test-environment.ps1 -Action Verify` before any authentication or operational probes, again in the browser harness, and after teardown. Actual JDBC identity is **127.0.0.1:5432/smartcinema_phase4e_test**; database owner/Flyway user `smartcinema_phase4e_migrator`, runtime `smartcinema_phase4e_app`. Read-only preflight verified14 successful migrations,0 failures, V14 head, five Staff tables, restricted migration/runtime privileges, zero runtime role memberships and unchanged pre-existing role attributes/memberships.

Started only the established base launchers:

```powershell
& ./backend/scripts/local-test-environment.ps1 -Action Start
& ./frontend/scripts/start-local-test.ps1
```

Actual Spring Boot4.1.1/Java21 startup validated14 migration checksums and Hibernate schema; **no migration was necessary**. Spring profile `local-test`, HTTP127.0.0.1:8080. Next16.3.5 dev bound127.0.0.1:3000; actual rewrite targets8080. Direct and proxied public Cinema GET returned the same persisted Cinema1. This confirms real application traffic, rather than fixture-backed responses.

The launchers replace Spring ConfigData locations with the existing ignored local profile, blank imports, exact local application/Flyway URLs and reject conflicting environment overrides. Additional read-only tooling checks all VNPAY confirmation flags false, system writer URL/user/password empty, VNPAY disabled, Staff delivery/Seat Hold cleanup disabled and SMTP loopback. No onboarding scheduler/capture/HTTPS proxy was started; no provider or email operation was attempted. Remote `.env` contents were not imported or printed.

Physical listeners were127.0.0.1:8080/backend and127.0.0.1:3000/frontend. Both owned sessions were stopped after testing; PostgreSQL remains intact. Ctrl+C process exit1 is intentional teardown, not a test failure. No remote database connection or maintenance-database connection was made by the diagnostics.

## 5. Actual Dependency Assessment — Before Mutations

The assessment and decision to stop positive issuance were communicated **before normal ADMIN login created its session**. No Staff/catalog/financial mutation was performed.

| Stage | Existing supported endpoint / authority | Required state / actual local result |
|---|---|---|
| Customer account/login | POST `/api/v1/users`; POST `/api/v1/auth/tokens`; Registration/Login services | ACTIVE CUSTOMER; none exists locally. Not provisioned after discovering issuance blocker |
| Discovery | GET `/api/v1/movies`, `/cinemas`, `/showtimes`, `/showtimes/{showtimeId}` under `/api/v1` | PUBLISHED Movie, ACTIVE Cinema/Hall, OPEN_FOR_BOOKING and future start/cutoff; Cinema1 exists, no Movie/Hall/Showtime |
| Seats/Hold | GET `/api/v1/showtimes/{showtimeId}/seats`; POST same Showtime `/seat-holds` | Whole sellable unsold Seat Units; authenticated ACTIVE CUSTOMER; database-authoritative original Hold deadline |
| Booking | POST `/api/v1/bookings` `{showtimeId,holdIds}`; owned GET | PENDING Booking from exact owned ACTIVE Holds; locked snapshots/amounts, original expiry no later than earliest Hold/cutoff |
| Initiation/submission | POST `/api/v1/bookings/{bookingId}/payment-transactions` `{}`; POST known attempt `/vnpay-submission` `{}` | First attempt permanently freezes composition/exact amount. Initiation alone does not settle. Submission requires all readiness gates and fixed VNPAY Sandbox host |
| Financial verification | GET `/api/v1/payments/vnpay/ipn`; internal signed QueryDR recovery | Authentic PAY/Query signature plus merchant, bound attempt/reference, exact amount and supported result. Separate system datasource/role; **disabled locally** |
| Sale/issuance | Protected `record_vnpay_result` through `VnpaySystemRepository`, V10 | Eligible verified normal SUCCESS atomically PAID/paid_at, sold units, consumed origin Holds, one Ticket per Seat Unit, one Booking QR and sale audit. Financial SUCCESS may instead require reconciliation without fulfillment |
| Customer entitlement recovery | Owned GET `/api/v1/bookings/{bookingId}` and `/{bookingId}/tickets`; known Payment GET | Complete persisted PAID aggregate; malformed/incomplete entitlement503. Reads never issue Tickets. Browser return never settles |
| Staff scope/resolve/recovery | GET `/api/v1/staff/cinema-assignments`; POST `/booking-qr-resolutions` `{cinemaId,bookingQr}`; GET `/bookings/{bookingId}?cinemaId=...` | Current ACTIVE STAFF and effective ACTIVE STAFF Cinema assignment, consistent issued aggregate; no ADMIN inheritance |
| Check-in | POST `/api/v1/staff/bookings/{bookingId}/check-ins` `{cinemaId,ticketIds}` | PAID, ACTIVE Cinema/Hall, Showtime OPEN_FOR_BOOKING or STARTED, inclusive start−30min/start+15min; selected VALID Tickets, atomic transition/audit |

Source anchors: [SeatService](../../backend/src/main/java/com/smartcinema/seat/SeatService.java), [BookingService](../../backend/src/main/java/com/smartcinema/booking/BookingService.java), [PaymentController](../../backend/src/main/java/com/smartcinema/payment/PaymentController.java), [VnpayController](../../backend/src/main/java/com/smartcinema/payment/VnpayController.java), [VnpayService](../../backend/src/main/java/com/smartcinema/payment/VnpayService.java), [VnpaySettings](../../backend/src/main/java/com/smartcinema/payment/VnpaySettings.java), [system writer](../../backend/src/main/java/com/smartcinema/payment/VnpaySystemRepository.java), [V10](../../backend/src/main/resources/db/migration/V10__integrate_sandbox_payment_finalization.sql), [owned issuance validation](../../backend/src/main/java/com/smartcinema/booking/BookingReadService.java), [Staff service](../../backend/src/main/java/com/smartcinema/staff/StaffAdmissionService.java)/[repository](../../backend/src/main/java/com/smartcinema/staff/StaffAdmissionRepository.java).

### Legitimate issuance blocker

Searches across main backend controllers/services, local scripts and contracts found **no approved local payment simulator or HTTP success/finalization operation**. The only implemented financial verifier is VNPAY. `validReturn` verifies a redirect signature only; it does not call the result writer. Customer GETs and initiation cannot issue entitlements. `VnpayRecovery` returns immediately while provider/query gates are false. Outbound provider URLs are fixed official Sandbox hosts, not a configured local emulator.

[StaffAdmissionPostgresTests](../../backend/src/test/java/com/smartcinema/staff/StaffAdmissionPostgresTests.java) explicitly labels its settlement as synthetic protected fixtures. Its `paid(...)` helper directly invokes `bind_vnpay_submission`/`record_vnpay_result` with fabricated SUCCESS evidence in an isolated schema. VNPAY protocol tests use local fixture secrets/mock collaborators. These prove isolated behavior, **not an approved local E2E payment authority**; none was copied or executed to create data here.

Therefore Customer provisioning, catalog authoring, Seat Hold, Booking, Payment initiation, Staff activation/effective assignment and positive admission were not started. Provisioning them cannot remove the missing legitimate financial-verification dependency. Original expiry/freeze/issuance rules were preserved; once a legitimate Booking is PAID, original pre-sale expiry is not itself a new admission deadline. COUPLE remains one Ticket for two guests.

## 6. Persisted Synthetic Data and Integrity Evidence

Read-only REPEATABLE_READ evidence: [before](../../backend/target/staff-qr-checkin-real-local-2026-10-15/before.txt), [after](../../backend/target/staff-qr-checkin-real-local-2026-10-15/after.txt).

| Data | Before → after |
|---|---|
| Users |2 →2: ADMIN1 ACTIVE; STAFF2 BLOCKED/password setup completed |
| Cinema |1 →1: Cinema1 ACTIVE |
| Assignment |1 →1: Staff2/Cinema1/typeSTAFF/ACTIVE, immutable `2026-10-21T18:24:00Z`, still future-effective |
| Invitations/delivery rows |3/3 →3/3; no reissue or delivery |
| Movies/Halls/Seats/Showtimes/Showtime Seats |0 each →0 each |
| Holds/Bookings/Booking Seats/Payment attempts/Tickets |0 each →0 each |
| PAID Bookings/Booking QR |0/0 →0/0 |
| Refresh sessions |9 →10: one legitimate ADMIN login; rejected Staff login created none |
| Staff technical rate bucket rows |3 →3; row count alone does not prove unchanged internal counters |

All **14 SQL-side metadata/domain fingerprints match** before/after (Users without password hashes, assignments, onboarding timestamp, Cinema, Movie, Hall, Seat, Showtime, Showtime Seat, Hold, Booking, Booking Seat, Payment, Ticket). SQL digests of full protected rows remain inside PostgreSQL; only digests/counts leave JDBC. No raw bearer/QR or credential values were output. Matching fingerprints support no change in the compared domain projections from the rejected probes.

**Audit limitation:** the normal runtime has no SELECT privilege on `audit_records`. Successful Check-in audit was not inspected or claimed; no role/grant escalation was performed. A first read-only diagnostic attempt encountered that denial and stopped; the helper was corrected to record the privilege limitation rather than query the protected table. The trusted before/after snapshots use that corrected helper. This was a local evidence-tool issue, not an application defect. No positive Ticket transition exists to audit.

## 7. Real API and Browser Results

Harness: [staff-checkin-local-e2e.mjs](../../frontend/scripts/staff-checkin-local-e2e.mjs). Actual Edge/Playwright against running Next/Spring/PostgreSQL; no route interception, fixtures, fabricated JWT, storage/session injection, HAR or trace. API probes use the actual browser-login token in memory; no token/response-body export. All requests have no automatic retries; probe redirects are rejected.

| Workflow | Actual observation | Result |
|---|---|---|
| Direct8080/proxied3000 GET Cinema collection |200 each, exact persisted Cinema1 projection agrees | PASS |
| Anonymous four operational endpoints | Assignment GET, QR resolution POST, Booking GET, Check-in POST all401; direct and proxy (8 requests) | PASS authentication barrier |
| Anonymous `/staff/check-in` | Vietnamese login guard; keyboard-focused login link follows existing returnTo | PASS |
| Actual ADMIN login | POST `/api/v1/auth/tokens`200 through real Login UI; ADMIN1 | PASS |
| ADMIN owned Staff reads | Detail/assignment200 confirm Staff2 BLOCKED/setuptrue, exact assignment1/time | PASS |
| ADMIN four operational endpoints | All403 direct and proxy (8 requests) | PASS role separation |
| ADMIN `/staff/check-in` | Vietnamese STAFF-required guard, no Cinema selector/scanner; keyboard return link works | PASS |
| BLOCKED STAFF normal frontend login | POST `/api/v1/auth/tokens`401, safe Vietnamese error; subsequent workspace remains anonymous | PASS blocked-login boundary |
| Final ADMIN Staff GET | Still BLOCKED/setuptrue | PASS |
| Real Camera/QR resolution/selection/confirmation/Check-in | No issued aggregate or eligible active actor | BLOCKED / NOT RUN |

Denied Booking/Ticket probes use an explicitly absent canonical max-bigint sentinel; QR resolution uses a clearly non-issued negative string. These requests test authentication/role rejection **before domain lookup**. They do not prove malformed-token400, unknown-token404, Ticket409 or successful resolution. IDs in operational bodies/paths remain canonical strings. Existing Login DTO has its legacy numeric `userId`; no admission identity is derived from that numeric field.

**25 sanitized HTTP records:**8×200,9×401,8×403. Journal: [results.json](../../frontend/target/staff-qr-checkin-real-local-2026-10-15/results.json). Grouped assertions:8PASS/0FAIL in one browser execution; no skipped or retried browser cases. Browser request observation recorded no external HTTP(S) host.

### Required scenarios not established

| Scenario | Status / reason |
|---|---|
| CUSTOMER → STAFF403 | BLOCKED: no Customer; not provisioned after issuance stop decision |
| BLOCKED STAFF with an already-issued current token → operational403 | NOT RUN this task: Staff cannot log in while blocked; prior Phase4E evidence remains historical |
| ACTIVE STAFF without effective assignment / wrong Cinema | NOT RUN this task: Staff intentionally retained BLOCKED; future assignment metadata alone is not live scope enforcement proof |
| Authenticated eligible STAFF malformed/unknown QR | BLOCKED: no active effective scope; unauthorized401/403 is not parser validation evidence |
| Invalid/expired Ticket; duplicate Check-in; rescan; partial batch; race; time boundaries | BLOCKED: no legitimate issued Ticket; no fabricated data/time/financial state |
| Real Customer booking, verified signed callback, actual Payment SUCCESS/Booking PAID, issuance and persisted Check-in audit | BLOCKED / NOT RUN, not inferred from isolated tests |

### Responsive and accessibility evidence

Six screenshots were captured and visually inspected: anonymous and ADMIN access guards at **390/768/1440px**. Vietnamese text readable, no document horizontal overflow or header overlap in those views; keyboard login-resume/return links and visible anonymous-link focus verified. Screenshots contain no credentials/JWT/raw QR. These checks cover access guards only, not the scanner, Ticket panel, confirmation dialog, physical camera, screen reader or successful admission.

Evidence samples: [anonymous390](../../frontend/target/staff-qr-checkin-real-local-2026-10-15/anonymous-staff-guard-390.png), [anonymous768](../../frontend/target/staff-qr-checkin-real-local-2026-10-15/anonymous-staff-guard-768.png), [anonymous1440](../../frontend/target/staff-qr-checkin-real-local-2026-10-15/anonymous-staff-guard-1440.png), [ADMIN390](../../frontend/target/staff-qr-checkin-real-local-2026-10-15/admin-staff-role-denied-390.png), [ADMIN768](../../frontend/target/staff-qr-checkin-real-local-2026-10-15/admin-staff-role-denied-768.png), [ADMIN1440](../../frontend/target/staff-qr-checkin-real-local-2026-10-15/admin-staff-role-denied-1440.png).

## 8. Verification Commands

| Command/check | Actual result |
|---|---|
| Existing local launcher `-Action Verify` | PASS repeated before testing and after teardown; V14/physical isolation |
| Java source launcher `java --class-path <installed PostgreSQL42.7.13.jar> ./scripts/LocalStaffCheckInAudit.java` from backend | PASS corrected before/after; compilation plus actual read-only JDBC |
| `node scripts/staff-checkin-local-e2e.mjs negative` from frontend | **8 PASS,0 FAIL**,25 response records,6 screenshots |
| `node --check scripts/staff-checkin-local-e2e.mjs` | PASS |
| `pnpm exec eslint scripts/staff-checkin-local-e2e.mjs` | PASS,0 diagnostics |
| `pnpm exec tsc --noEmit` | PASS, exit0 |
| Full frontend unit/fixture Playwright/build; backend `mvn verify` | NOT RUN: no application changes; isolated fixture regressions cannot establish missing real financial issuance. No historical test counts reused as current results |
| Production application defects | None reproduced in the tested negative slice; positive flow remains unassessed |

Existing Next dev smooth-scroll diagnostic appeared during navigation; not a new functional failure. No design work or production fix was performed.

## 9. Files Created / Modified

Created [LocalStaffCheckInAudit.java](../../backend/scripts/LocalStaffCheckInAudit.java), [staff-checkin-local-e2e.mjs](../../frontend/scripts/staff-checkin-local-e2e.mjs) and this report. Generated evidence remains under ignored backend/frontend `target/staff-qr-checkin-real-local-2026-10-15/`. Modified only the current handoff with an additive Phase4F entry. No file moves.

Repository baseline: HEAD `702838561bfe0fd128d7741a8591efccc1eafb9d`, clean index/tree at verification baseline. An806-file SHA-256 manifest covers tracked files and existing private environment inputs. Final comparison preserves all baseline files except the explicitly additive handoff update. Existing source/contracts/requirements/migrations/environment files/historical reports are unchanged. No staging or commit.

## 10. Requirement Reconciliation, Deviations and Conflicts

- PASS: authorized local isolation, real authentication/API/browser negative evidence, existing data/freeze/expiry/issuance/authorization preservation, safe artifacts and no provider calls.
- PARTIAL: Staff Check-in overall. Positive admission and Ticket-level behavior cannot be verified without legitimate financial/issued prerequisites; the required stop condition was honored.
- No proposed simulator was implemented, no flags/secrets enabled, no protected table inserted/updated, no assignment time changed. Future assignment1 was not replaced or deactivated.
- No business or convention exception introduced. Restricted audit visibility is an explicit evidence limitation; production permissions were not relaxed for testing.

## Convention Compliance

Checked against [canonical conventions](../development/project-conventions.md), including this report.

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | Existing scripts/target folders, PascalCase Java helper, kebab-case MJS, required dated report |
| Code/import naming | PASS | English identifiers, standard Java/Node imports, existing installed Playwright; no dependency changes |
| Domain/API/identity/status | PASS preservation | Existing exact endpoints and serialized statuses; operational bigint strings; no new workflow |
| Database/environment | PASS | Fixed exact loopback target, read-only diagnostic transactions, V14, no grants/config changes |
| Routes/components | N/A changes | Existing `/staff/check-in`, Login and shared components only exercised |
| Documentation/history | PASS | New report/additive handoff; existing reports/contracts/BRD/SRS retained |
| Scope/Git | PASS | No production-source edits, staging, commit, push, deploy or Stitch work |

## 11. Known Limitations

This is **real local negative integration evidence**, not positive admission E2E or VNPAY interoperability. No current positive Ticket/QR/Check-in or successful audit claim is supportable. The diagnostic runtime cannot read the audit table; only permitted metadata/domain projections were compared. Browser QA uses local HTTP and desktop Edge emulated viewports; no physical camera or public TLS validation. Generated evidence is ignored local material and is not embedded into Git history.

## 12. Next Recommended Step

Resolve the financial test-authority dependency separately before provisioning more domain data. A new strictly local payment simulator would require an explicit contract/security design and authorization; it does not currently exist and was not invented here. Alternatively, actual VNPAY Sandbox verification requires separately authorized merchant setup, signed evidence, confirmation gates, protected system datasource and callback connectivity; that is outside this provider-disabled task.

After an approved legitimate issuance path exists, use supported APIs to prepare minimal Customer/catalog/Showtime data, preserve assignment1 while establishing valid Staff scope, obtain actual issued Tickets/QR and then execute resolution → atomic Check-in → persisted audit → duplicate/rescan/security/time-window cases. Do not replay the completed onboarding harness or reset data. **Stop here; no automatic next task.**
