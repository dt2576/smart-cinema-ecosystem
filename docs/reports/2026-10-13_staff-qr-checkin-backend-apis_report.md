# Phase4B-2 — Staff QR Resolution, Recovery and Atomic Check-in HTTP APIs

## 1. Task Information

- Date: 2026-10-13, Asia/Saigon. Backend/security implementation.
- Status: **COMPLETE for authorized Phase4B-2 backend scope**. Final full backend **410/410 PASS**,56 suites,0 failures/errors/skips; JAR/repackage PASS. Scanner/frontend/live deployment remain separate.
- Entry HEAD: `783b7d2` (`feat(staff): implement secure onboarding and check-in foundation`), clean working tree/index. Independently verified V13 and backend365/365; historical evidence was not assumed.
- Source head now V14 for the approved operational limiter only. V1–V13 unchanged; no Check-in/financial writer replacement, checksum repair, Neon or production migration.

## 2. Requested Work and Scope

Implement the four published operational STAFF resources, exact confidential QR reads, current scope, minimal coherent projection, scoped recovery and explicit atomic selected Check-in using V13. Strict validation/no-store/safe errors/rate bounds, HTTP/security/database/concurrency regressions, report and handoff.

No scanner/workspace/camera/activation/Admin frontend, invitation/auth policy change, Payment/VNPAY/refund/cancellation/rescheduling/undo, live Gmail/provider operation, Neon migration, commit or deployment. Phase4C is not started.

## 3. Documents Reviewed

- [AGENTS](../../AGENTS.md), [Development](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [Backend](../../.agent/workflows/BACKEND_WORKFLOW.md), [Review](../../.agent/workflows/REVIEW_WORKFLOW.md); coding/document/traceability/convention rules and [project conventions](../development/project-conventions.md). No backend-local AGENTS found.
- [Phase4B-1 continuation](2026-10-12_staff-checkin-foundation-implementation-continuation_report.md), [Phase4A audit](2026-10-11_staff-qr-checkin-contract-audit_report.md), [current handoff](../ai/current-handoff.md), [Staff operational contract v1.0](../api/staff-qr-checkin-contract-v1.0.md), [onboarding/Admin v1.0](../api/staff-invitation-administration-contract-v1.0.md), [security design](../db/staff-onboarding-checkin-security-design-v1.0.md).
- [BRD v1.2](../brd/brd-v1.2.md), [SRS v1.2](../srs/srs-v1.2.md) §§3.10/3.11/3.12/4; [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md) §§33–36/47–49; [System Analysis v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx), actual DOCX XML UC-STF-004/BRULE-TICKET; [historical scope](<../project-scope/project-scope v1.0.md>); [physical dictionary](../db/physical-data-dictionary-v1.0.md), [integrity v1.1](../db/integrity-enforcement-design-v1.1.md).
- Actual V13/protected owners/grants/functions, authentication/security/Staff onboarding, BookingReadService/Repository and Customer retrieval/tests, Ticket/Seat/Concession/Payment fixture setup and local Maven/PostgreSQL configuration. No external contract or backend capability invented.

## 4. Requirements Traceability

| Actual source ID / approved decision | Implementation / verification | Result |
|---|---|---|
| BR-002–004/050/053; FR-AUTH-007/008, FR-ORG-005, NFR-SEC-003 | JWT STAFF plus current ACTIVE/STAFF; effective ACTIVE STAFF actual Cinema scope; no Admin/Manager inheritance | PASS focused |
| BR-043–047; FR-TICKET-002–006/010; BRULE-TICKET-001–009 | Preserve issuance/one QR/one purchased-unit Ticket, coherent complete projection, non-VALID rejection, COUPLE one Ticket/two guests | PASS focused and existing regression |
| BR-048/049; FR-CHECKIN-001–007/010/013; UC-STF-004 | Exact token resolve, read-only snapshots, advisory eligibility, explicit selected command, scoped GET recovery | PASS backend; scanner UI NOT APPLICABLE |
| BR-051; FR-CHECKIN-008/009/012; NFR-CONC-003/005/007 | Protected writer, ordered locks/fresh time, one concurrent success, atomic losing batch, bounded contention | PASS focused |
| BR-052/062; FR-CHECKIN-011; FR-AUDIT-004 | Commit transition plus exactly one immutable attributable audit, deferred assertion and rollback | PASS focused |
| NFR-SEC-006/009–012 | Strict IDs/JSON/UTF-8, confidential QR binding/redaction/no reflection, no-store, durable technical rate bounds | PASS focused |
| Published Staff v1.0 and Phase4B-2 §§2–4 | Exact four routes/projection/errors, inclusive −30/+15 policy, V13 writer reused, forward limiter migration | PASS source/HTTP/migration checks |

No invented requirement IDs or BRD/SRS edits. Historic broader permissions are narrowed by the existing published approval, not a new policy in this task. AdmissionReason is response explanation, not a new persisted status.

## 5. Implementation Summary and Contract Compliance

### Four endpoints

| Implemented resource | Exact input / response |
|---|---|
| GET `/api/v1/staff/cinema-assignments` | No body/query; `{serverTime,assignments:[{id,cinemaId,cinemaName,effectiveAt}]}` ordered numeric ID; effective ACTIVE STAFF only |
| POST `/api/v1/staff/booking-qr-resolutions` | `{cinemaId:string,bookingQr:string}` only, no query; read-only StaffBookingResponse |
| GET `/api/v1/staff/bookings/{bookingId}?cinemaId={cinemaId}` | Exactly one context parameter, no body; current independently authorized StaffBookingResponse |
| POST `/api/v1/staff/bookings/{bookingId}/check-ins` | `{cinemaId:string,ticketIds:string[]}` only, no query; 200 `{checkedInTicketIds:string[],booking:StaffBookingResponse}` after commit |

[Controller](../../backend/src/main/java/com/smartcinema/staff/StaffAdmissionController.java), [service](../../backend/src/main/java/com/smartcinema/staff/StaffAdmissionService.java), [repository](../../backend/src/main/java/com/smartcinema/staff/StaffAdmissionRepository.java), [validation](../../backend/src/main/java/com/smartcinema/staff/StaffAdmissionRequest.java). Exact DTO allowlists omit Customer PII, amounts/financial/provider data, raw QR, audit actor IDs and unsupported counters/pickup workflows.

Read-only REPEATABLE_READ uses current database actor/scope and complete committed Booking hierarchy/Tickets/Concession snapshots. Nonpaid has no Ticket entitlements and NOT_PAID; elapsed PENDING projects EXPIRED without mutation. PAID validates complete nonempty purchased-unit issuance, unique Ticket/code/Seat/line identities, stored seat type, soldAt=issuedAt=paidAt and Check-in timestamp consistency. Incomplete/malformed aggregate fails503. IDs remain canonical strings including actual9007199254740993 fixture identity.

Advisory reasons null/NOT_PAID/CONTEXT_UNAVAILABLE/OUTSIDE_ADMISSION_WINDOW reflect PAID, ACTIVE Cinema/Hall, OPEN_FOR_BOOKING or STARTED and inclusive start−30min through start+15min. Only VALID additionally canCheckIn. All Tickets checked in can leave context admissionAllowed=true while every canCheckIn=false; this is not new entitlement. Original pre-sale expiry, Movie visibility and Customer block do not veto paid admission.

### Current authorization, QR confidentiality and failures

Additive bearer security matchers gate STAFF and exact mutation CSRF exceptions; shared login/session/public password setup policies remain. Every read/service command rechecks current database role/status/scope; V13 rechecks commands under locks. Unavailable scope403, foreign/missing QR/Booking/selected Ticket generic404 without existence detail. Exact opaque UTF-8 preserves spaces/case/normalization/punctuation; nonblank≤128 code points, no controls/unpaired surrogates. No token URL handling/fetch/rotation/echo.

Redacted StaffSensitiveBody reaches MVC before argument diagnostics; strict custom converter UTF-8 and duplicate/trailing/unknown JSON rejection. Private ConnectionCallback binding avoids Spring parameter TRACE for QR. Log-capture test checks actual resolution with MVC/JDBC TRACE. Test-only Unicode QR pre-settlement fixture DDL also uses private execution; no guard disabled. Reverse proxy/APM/wire body capture is outside these application diagnostics and must remain redacted operationally.

All responses/errors no-store. Fixed safe400 malformed/media/ID/body/query/token/selection;401 auth;403 current account/role/scope;404 inaccessible resource;409 state/admission conflict;429 Retry-After60;503 database/timeout/inconsistent aggregate/commit uncertainty. Internal generic DB assertions after strict operational input validation map503; invitation validation400 remains. No SQL diagnostics/supplied values reflected. Stream-enforced Check-in1MiB, resolution64KiB, no business Ticket-count maximum.

### V13 writer, atomic audit and recovery

READ_COMMITTED service calls only existing V13 check_in_tickets. No Java Ticket DML or additional mutation authority. User/parent/resource/selected-Ticket lock order, fresh database time after waits, current account/assignment/context/PAID/VALID checks and narrow owner/ACL preserved. Lock2s, statement5s, service transaction10s; no network work under locks, no automatic retries. These are database/transaction bounds, not a measured end-to-end latency guarantee.

Selected Tickets plus one audit each commit atomically; audit failure or deferred assertion failure cannot return200. Unselected Tickets, Booking PAID, QR, frozen composition, sold/issued snapshots and financial state remain unchanged. COUPLE one transition/two guests. Post-write response-read failure occurs inside transaction and rolls back; transport loss after commit requires scoped GET/rescan, never guessed failure/success or automatic POST. Repeated command409 is state-effect idempotency, not identical replay.

[V14](../../backend/src/main/resources/db/migration/V14__extend_staff_operational_rate_limits.sql) extends V13's invitation-only limiter with shared per-actor STAFF_READ60/min and CHECKIN30/min. Technical ledger commits separately even for business conflicts; operational domain reads remain read-only. Existing redemption10/min, resend3/hour, owner/ACL/retention unchanged. V13 is not defective as a Ticket writer; its reserved operational bucket capability was absent. Additive V14 is necessary for the published durable limits and does not alter released migration checksums. Upgrade test compares all V1–V13 checksums and exact Check-in function text; fresh install/restricted-runtime reads/writer exercised.

## 6. Files Created

- Seven Java files under `backend/src/main/java/com/smartcinema/staff/`: StaffAdmissionController.java, StaffAdmissionService.java, StaffAdmissionRepository.java, StaffAdmissionRequest.java, StaffBookingResponse.java, StaffAssignmentResponse.java, StaffCheckInResponse.java.
- `backend/src/main/resources/db/migration/V14__extend_staff_operational_rate_limits.sql`.
- [StaffAdmissionTests](../../backend/src/test/java/com/smartcinema/staff/StaffAdmissionTests.java) and [StaffAdmissionPostgresTests](../../backend/src/test/java/com/smartcinema/staff/StaffAdmissionPostgresTests.java).
- [Staff development guide](../development/staff-qr-checkin-backend-apis.md) and this report.

## 7. Files Modified

- AuthSecurityConfiguration.java: additive Staff gates/CSRF exceptions only.
- StaffRequest.java, StaffWebConfiguration.java, StaffRequestFilter.java: separate bounds, strict binding, GET body rejection, safe stream errors/no-store.
- StaffExceptionHandler.java: operational safe errors/503 assertion and commit failures; current onboarding mappings retained.
- SmartCinemaApplicationTests.java: new JDBC repository mocked in existing no-DataSource fixture; original15 cases retained.
- AdminMoviePostgresTests.java, VnpayMigrationPostgresTests.java: exact current-head13→14 assertions.
- StaffFoundationPostgresTests.java: exact current head14 and unchanged V1–V12 upgrade checksum comparison using version≤12; no case removal/skip.
- Current handoff and foundation guide: additive current continuation; historical reports/contracts untouched.

## 8. Verification

Dedicated localhost PostgreSQL18.4; Spring Boot4.1.1/Java21/Maven3.9.16. All previous DB flags plus STAFF_DB_TESTS=true, delivery/provider/cleanup disabled. Random isolated Staff schemas, existing non-relaying local Mailpit for old SMTP regression. No real Gmail/Neon/provider operation. Ignored evidence: `backend/target/qa/staff-operational-2026-10-13/`.

| Executed check | Actual result |
|---|---|
| Independent baseline `mvn verify` |365 tests,0 failures,0 errors,0 skipped;54 suites, JAR/repackage PASS;1:45, ended01:17:02+07:00 |
| Initial `mvn -q -DskipTests compile` |PASS |
| Focused first |34 tests,3 failures,0 errors,0 skipped |
| Focused second, expanded |42 tests,0 failures,1 error,0 skipped |
| Focused third |43/43 PASS,0 failures/errors/skips;27.954s |
| First full `mvn verify` |408/408 PASS,0 failures/errors/skips;56 suites; JAR/repackage PASS,1:54, ended01:28:33+07:00 |
| Focused after bigint/confidential fixture hardening |44/44 PASS,0 failures/errors/skips;27.229s, ended01:29:15+07:00 |
| Final unit suite including interrupted stream |9/9 PASS,0 failures/errors/skips;5.240s, ended01:31:08+07:00 |
| Final-source full interrupted by environment clock leaps |410 tests,2 failures,0 errors,0 skips;2:21h, ended03:53:06+07:00; not accepted as passing evidence |
| Accepted final full on identical final source |410/410 PASS,0 failures/errors/skips;56 suites; JAR/repackage PASS;1:52, ended03:55:30+07:00 (`uninterrupted-final-verify.log`) |
| Preservation/UTF-8/links/whitespace/conventions |PASS:727 entry tracked files,716 preserved/11 scoped modifications,12 new task files; V1–V13/frontend/contracts/historical reports/HEAD/index unchanged; strict UTF-8/local links/whitespace checked |
| Frontend TypeScript/lint/unit/build/Playwright |NOT RUN — no frontend change; historic counts not claimed as current |
| Production Neon/live Gmail/VNPAY/real gate admission |NOT RUN; isolated protected financial fixtures do not establish external interoperability |

HTTP/database coverage includes four-route401/role403, stale JWT/current account, no/future/revoked/wrong-type/multi-Cinema scopes; opaque Unicode/malformed UTF-8/foreign QR privacy; read-only no side effects; paid/nonpaid/invalid states/context/expiry; STANDARD/VIP/COUPLE; selected/foreign/missing/duplicate validation; atomic overlapping batches; two Staff concurrent one success; block/revoke during actual writer wait; unique immutable audit/rollback/deferred commit failure; lock timeout503; corrupted/unavailable projection; lost-response GET/rescan; complete old/new REPEATABLE_READ snapshots; shared rate buckets/committed conflict counts; exact1MiB/64KiB bounds; no-store/TRACE; actual bigint strings; local V13→V14 checksum/writer/ACL preservation. Exact inclusive microsecond boundaries and all Showtime states compare advisory predicate with existing V13 predicate; existing foundation writer tests remain in full regression.

Failure history retained, no skip/retry masking: first focused surrogate fixture was transformed by client UTF-8 before request, so changed to explicit escaped invalid JSON; projection equality included changing serverTime, so immutable fields compared; generic internal audit RAISE mapped400, corrected operational503. Second focused Concession fixture used forbidden direct catalog DML; changed to existing deployment-only configure_concession_item in isolated schema, preserving guards. Additional bigint/confidential test execution and safe interrupted-body handling justified final-source rerun. No Flyway repair.

Final-source run encountered two environment pauses: Hikari clock-leap/thread-starvation deltas approximately1h38m23s and42m18s. It completed410 tests with2 failures: unchanged SeatHoldPostgresTests.expiryReadsAndReacquisitionDoNotDependOnWorkerAndOldReleaseCannotTouchReplacement no longer had expected public seat units after the elapsed screening boundary; new StaffAdmissionPostgresTests.originalBookingExpiryMovieVisibilityAndCustomerBlockDoNotVetoPaidAdmission returned409 after a2510-second test duration exceeded its start+15min admission interval. The writer correctly denied late admission. Full log `accepted-final-verify.log` and XML/text copies `suspended-run-reports/` are retained. Entire suite was rerun on identical source/tests with fresh normal isolated fixtures (`uninterrupted-final-verify.log`), without changing clock policy, timeouts, assertions, exclusions or automatic retries. The interrupted run is not hidden or counted as PASS.

## 9. Requirement Reconciliation

PASS for four backend contracts/current STAFF scope/exact QR/read-only projection/explicit protected writer/whole selected batch/audit/recovery/privacy/limits. All365 original backend cases retained plus45 new (36 HTTP/PostgreSQL,9 unit); final410/410 passing. Existing Booking/Payment/VNPAY/Customer/issuance/freeze/expiry regression PASS. Frontend interaction/camera/hardware/live interoperability NOT APPLICABLE to implemented scope and NOT RUN as evidence.

## 10. Deviations / Conflicts

No contract/status/policy change. V14 narrowly fills the operational durable-rate gap and is allowed forward-only work; V1–V13 sources/checksums untouched. Published contract statement that Phase4B-1 did not install operational HTTP remains historically true and is preserved. Existing broader historical role/scope and per-Ticket QR wording are resolved by approved current contracts, without BRD/SRS rewrites. Legacy DOCX/spaced-scope filenames left intact. No naming exception needed.

## Convention Compliance

Checked before implementation and after against [canonical conventions](../development/project-conventions.md).

| Area | Result | Evidence |
|---|---|---|
| Folder/file/code naming |PASS |Existing lowercase staff package, PascalCase Java classes/records, camelCase methods, English identifiers |
| Domain/API/status |PASS |Exact published plural kebab routes, bigint strings and serialized existing statuses; confidential logical POST justification preserved |
| Database |PASS |Forward snake_case V14, protected owner/ACL/safe search_path, no Ticket DML/financial writer changes |
| Documentation/report |PASS |Dated requested kebab report/template sections, real IDs/source links, history preserved |
| Tests/security/scope |PASS |Existing JUnit/MockMvc flags/local schema conventions,410/410, no skipped/removed cases, retained failure history, sensitive diagnostics redacted |
| Frontend/import/UI/deployment |NOT APPLICABLE |No changes |

## 11. Remaining Risks and Limitations

Production deployment/managed migration and runtime secret custody are not certified. Conservative per-Showtime gate and database rate rows need future gate-traffic/P95 measurement; no performance/hardware promise. HTTP transport loss can occur after commit; GET recovery is mandatory and no automatic replay safe. Read snapshots are advisory and may predate concurrent revocation/Check-in; explicit command revalidates. External body/wire/APM capture needs deployment redaction. No supported lifecycle writer currently progresses historical Showtime to STARTED/ENDED; this phase only consumes stored context and approved predicate, never updates lifecycle. Database/transaction bounds do not replace pool/proxy/network timeout configuration. Scanner/activation/Admin UI and live onboarding/admission remain missing by scope.

## 12. Exact Phase4C Frontend Prerequisites / Next Recommended Step

Separately approve Staff scanner/workspace integration after reviewing current contract/report, frontend-local workflow/installed Next docs, existing auth/session/navigation and actual live Staff Stitch HTML/PNG. Use real assignments/selected Cinema, exact-token confidential resolution, minimal server projection, explicit whole-unit Ticket selection/confirmation, command once, then scoped GET recovery on uncertain/409 responses. Session/context changes clear sensitive data/selection and ignore stale responses; no auto POST/rescan Check-in, raw QR URL/log/storage, inferred authority or unsupported KPI/history/shift/gate/pickup/printing/offline/undo.

Vietnamese accessible loading/no assignment/current403/404/409/429/503/empty/mixed/success/uncertain states; camera explicit permissions/device failures and track cleanup; exact manual-token fallback; focus/keyboard/44px/mobile390/tablet768/desktop1440 QA. Define safe real Staff navigation/login resume and independently assess activation frontend dependencies; invitations do not currently provide a completed frontend activation page. No automatic Phase4C/commit/deploy. STOP after verified report/handoff.
