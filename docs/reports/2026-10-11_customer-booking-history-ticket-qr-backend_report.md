# Phase 3B — Customer Booking History and Ticket/QR Read APIs

## 1. Task Information

- Date: 2026-10-11, Asia/Ho_Chi_Minh.
- Type: additive backend implementation, based on the approved Phase 3A audit.
- Module: Customer-owned Booking history and independent issued Ticket/Booking QR retrieval.
- Status: COMPLETE — two owned read APIs implemented; focused and full backend regression PASS.
- Entry HEAD: `cfdf48078f25d40291b9e2999679719864503130`.
- Entry working tree: only the untracked Phase 3A audit report. Its contents are preserved. No reset, staging, commit or deployment.

## 2. Requested Work

Implement exactly GET `/api/v1/bookings` and GET `/api/v1/bookings/{bookingId}/tickets`, publish an additive versioned contract before implementation, use typed DTOs and explicit Customer authorization, test the real HTTP/PostgreSQL behavior and run full `mvn verify`. Preserve existing Booking/Payment/issuance logic, original expiry, first-attempt freeze, Ticket guards, V1–V12, frontend, provider integration/configuration and Stitch. Phase 3C and Staff Check-in are not started.

## 3. Documents Reviewed

- [Development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [backend workflow](../../.agent/workflows/BACKEND_WORKFLOW.md), applicable Coding/Requirement Traceability/Document rules and [project conventions](../development/project-conventions.md).
- Primary specification: [Phase 3A audit](2026-10-11_customer-booking-history-ticket-qr-contract-audit_report.md).
- [Phase 2 report](2026-10-11_customer-booking-payment-stitch-ui_report.md), [Phase 1 report](2026-10-11_shared-ui-foundation_report.md), [Stitch implementation assessment](2026-10-10_stitch-frontend-implementation-assessment_report.md).
- [Booking v1.3](../api/booking-contract-v1.3.md) and earlier additive Booking contracts; [VNPAY v1.1](../api/vnpay-sandbox-payment-contract-v1.1.md) and approved v1.0.
- [BRD v1.2](../brd/brd-v1.2.md), [SRS v1.2](../srs/srs-v1.2.md), [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md) §§33–36/48, System Analysis use cases identified in Phase 3A, historical scope and [current handoff](../ai/current-handoff.md) test-environment guidance.
- Actual Booking/Payment/VNPAY controllers, DTOs, JDBC repositories, service transactions, security configuration, V6/V10/V12 guards and existing Booking/Payment/VNPAY test infrastructure.

The user explicitly approved the two reads, pagination bounds/order and UTF-8 opaque-token encoding through the Phase 3B task. No new business requirement or historical contract was silently introduced.

## 4. Requirements Traceability

| Requirement | Applied behavior | Result |
|---|---|---|
| BR-032; FR-BOOKING-009; UC-CUS-020 | Owned paginated history | Implemented |
| FR-BOOKING-010; FR-AUTH-009; UC-CUS-021 | Existing owned detail preserved; current Customer ownership enforced on new reads | Implemented/preserved |
| BR-043–045; FR-TICKET-001–003/009; INV-05–07/14 | Consume existing issued aggregate; never issue or infer financial fulfillment during GET | Preserved |
| BR-046; FR-TICKET-004/007; UC-CUS-024 | One exact persisted Booking QR; independent retrieval by Booking ID | Implemented |
| BR-047; FR-TICKET-008; UC-CUS-023 | Own typed Ticket list and independent statuses | Implemented |
| NFR-SEC-009; FR-AUTH-009 | Opaque QR, safe errors/redaction/no-store and ownership | Implemented |
| INV-08/13/14 | No Customer Check-in; exact frozen snapshots/original expiry/backend authority | Preserved |

References are BRD/SRS v1.2, Business Analysis v2.1 and the System Analysis use cases verified in Phase 3A. FR-TICKET-005 QR-token resolution and Staff Check-in remain separate, unimplemented operational workflows.

## 5. Implementation Summary

### Final wire contracts

The [new contract v1.0](../api/customer-booking-history-ticket-qr-contract-v1.0.md) was created before source implementation. Existing Payment and Booking DTOs were not changed.

| Endpoint | Response and gates |
|---|---|
| GET `/api/v1/bookings` | Current ACTIVE Customer; subject-scoped `BookingHistoryResponse`; strict page/size; no-store |
| GET `/api/v1/bookings/{bookingId}/tickets` | Current ACTIVE owning Customer; `BookingTicketsResponse`; no query parameters or Payment ID; no-store |

History envelope:

```text
items: BookingHistoryItem[]
page, size, totalElements, totalPages: JSON integers
serverTime: UTC instant string

items[]:
  id, bookingCode, status
  movieId, movieTitle, cinemaId, cinemaName, hallId, hallName, showtimeId
  startsAt, createdAt, expiresAt, paymentStartedAt (nullable)
  seatUnitCount, guestCount, finalAmount
```

IDs and exact `finalAmount` are strings; timestamps are UTC strings; counts are integers; other names/code/status are strings. No Payment attempt ID, QR token, Ticket rows, provider reference or Customer personal fields appears in history.

Entitlement envelope:

```text
bookingId: positive-bigint string
bookingStatus: PENDING | PAID | EXPIRED | CANCELLED
serverTime: UTC instant string
bookingQr: opaque string | null
tickets: CustomerTicket[]

tickets[]:
  id, bookingSeatId, seatId, ticketCode: strings
  status: VALID | CHECKED_IN | EXPIRED | CANCELLED
  seatType: STANDARD | VIP | COUPLE
  guestCount: integer (STANDARD/VIP=1, COUPLE=2)
```

### Query, expiry and pagination behavior

Only history `page`/`size` are accepted, once each, as nonempty ASCII digits. Defaults are page 0/size 20; page maximum is 2147483647; size is 1–100. Blank, signed, fractional, whitespace, overflow, repeated and unknown inputs fail 400. Caller-supplied customerId is rejected. Offset is calculated as long; maximum-page requests safely return empty items while retaining owned total count.

Ordering is fixed `createdAt DESC, id ASC`. Count/page use the same owner predicate, no discovery publication/activity filters and the same read-only REPEATABLE_READ snapshot. Historical labels remain current reference labels, as in existing owned detail. Concurrent insertion can shift pages between separate requests; no cursor guarantee or global entrance counters are introduced.

Both reads apply the existing effective status rule: persisted PENDING with `expiresAt <= serverTime` projects EXPIRED without cleanup mutation. The original deadline and first `paymentStartedAt` remain unchanged. PAID is never projected expired from the original pre-sale deadline. Money uses `BigDecimal.toPlainString()` and four-digit persisted scale; all bigint identities use JDBC string reads. COUPLE guest count does not introduce a new price multiplier.

### Issuance consistency and independent recovery

The entitlement service authorizes ownership before reading issued units, in one read-only REPEATABLE_READ transaction. It does not query or require a Payment attempt, call settlement, resolve QR tokens or execute a financial command.

Non-PAID returns null QR and empty Tickets. PAID requires a valid persisted token, paid timestamp and a nonempty complete purchased-unit set. A left join retains a purchased unit even if its Ticket is missing. Validation checks expected unit count, unique/positive Ticket/Booking Seat/Seat IDs, unique valid Ticket codes, supported Seat Unit/Ticket states and matching sold/issued/paid timestamps. A missing, malformed, duplicate or inconsistent projection fails closed with safe 503, without entitlement fields.

An older FAILED Payment attempt does not control a Booking paid by another attempt. A lost Payment ID therefore no longer prevents retrieval of issued Tickets/QR through the new Booking-level read. Frozen unpaid Payment recovery remains unchanged: no latest/list lookup or automatic POST is added. Late financial SUCCESS without Booking fulfillment still has no QR/Tickets.

### QR payload and privacy

Return the persisted `bookingQr` unchanged. The approved rendering payload is that exact token as UTF-8 text, with no URI scheme, prefix, wrapper, Booking ID or browser signature. Rendering remains Phase 3C.

Current issuance produces 64 lowercase hexadecimal characters, but the new read treats the token as opaque: nonblank, at most 128 characters, no control characters. It neither trims valid content nor assumes a hash format. A Unicode opaque-token unit fixture verifies preservation. No periodic refresh, regeneration or financial claim is introduced.

Sensitive DTO/internal-record `toString()` implementations redact QR/Ticket data. New code has no token logging or analytics; raw query values, database diagnostics and attacker-supplied path tokens are not echoed. Safe ProblemDetail uses a fixed collection instance URI. Ticket rows omit Staff identity/audit and provider details. This contract does not establish an operational Staff scanner or admission eligibility.

### Authorization and safe HTTP responses

Explicit GET CUSTOMER matchers were added for both resources. Existing auth/session/CSRF behavior is untouched. The repository independently checks current database ACTIVE/CUSTOMER status, then applies principal ownership. Foreign/missing Booking responses are identical safe 404 bodies. Anonymous access is 401; ADMIN/MANAGER/STAFF, invalid subject and inactive/non-Customer database accounts are denied.

New-controller advice returns fixed safe application/problem+json errors: 400 invalid request, 403 active Customer required, 404 Booking unavailable, 503 temporarily unavailable/inconsistent aggregate. Application success/errors use exact `Cache-Control: no-store`; Spring Security rejection retains its existing default no-store headers. Existing Booking/Payment exception behavior is not replaced.

## 6. Files Created

All Java files below are new under the existing `com.smartcinema.booking` package:

| File | Purpose |
|---|---|
| [BookingHistoryQuery.java](../../backend/src/main/java/com/smartcinema/booking/BookingHistoryQuery.java) | Strict pagination validation and long offset |
| [BookingHistoryItem.java](../../backend/src/main/java/com/smartcinema/booking/BookingHistoryItem.java) | Typed history projection |
| [BookingHistoryResponse.java](../../backend/src/main/java/com/smartcinema/booking/BookingHistoryResponse.java) | Typed page envelope |
| [CustomerTicket.java](../../backend/src/main/java/com/smartcinema/booking/CustomerTicket.java) | Typed seven-field Customer Ticket |
| [BookingTicketsResponse.java](../../backend/src/main/java/com/smartcinema/booking/BookingTicketsResponse.java) | Redacted Booking-level entitlement DTO |
| [BookingReadController.java](../../backend/src/main/java/com/smartcinema/booking/BookingReadController.java) | Exactly two new GET mappings |
| [BookingReadService.java](../../backend/src/main/java/com/smartcinema/booking/BookingReadService.java) | Consistent transactions and fail-closed aggregate validation |
| [BookingReadRepository.java](../../backend/src/main/java/com/smartcinema/booking/BookingReadRepository.java) | JDBC SELECT-only queries with current actor/owner predicates |
| [BookingReadUnavailableException.java](../../backend/src/main/java/com/smartcinema/booking/BookingReadUnavailableException.java) | Fixed safe inconsistent-aggregate failure |
| [BookingReadExceptionHandler.java](../../backend/src/main/java/com/smartcinema/booking/BookingReadExceptionHandler.java) | Scoped safe/no-store ProblemDetail responses |
| [BookingReadTests.java](../../backend/src/test/java/com/smartcinema/booking/BookingReadTests.java) | Six unit cases for pagination, redaction, opaque QR and status fixtures |
| [BookingReadPostgresTests.java](../../backend/src/test/java/com/smartcinema/booking/BookingReadPostgresTests.java) | Seventeen real HTTP/PostgreSQL integration cases |
| [API contract v1.0](../api/customer-booking-history-ticket-qr-contract-v1.0.md) | Published final additive wire and encoding contract |
| This report | Implementation and verification evidence |

Ignored evidence is under `backend/target/qa/customer-booking-history-ticket-qr-2026-10-11/`: baseline hashes/status, command logs, test summaries and preservation/document checks. No credentials are written into this report or new source/contract.

## 7. Files Modified

- [AuthSecurityConfiguration.java](../../backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java): two explicit GET resource matchers in the existing CUSTOMER rule.
- [SmartCinemaApplicationTests.java](../../backend/src/test/java/com/smartcinema/SmartCinemaApplicationTests.java): one `@MockitoBean BookingReadRepository` added to the existing no-DataSource authentication-context fixture. Existing test methods/assertions remain unchanged.

No existing Booking/Payment/VNPAY implementation/test or DTO, frontend, migration, historical report/contract, Stitch, environment or deployment file is modified. The entry untracked Phase 3A report is preserved; it is not a newly created file of Phase 3B.

## 8. Verification

The documented dedicated local PostgreSQL database `smart_cinema_v11_accepted_20261001` was verified on localhost before tests. Integration uses isolated randomly named schemas and the existing flags: MOVIE_DB_TESTS, DISCOVERY_DB_TESTS, SEAT_DB_TESTS, BOOKING_DB_TESTS, CONCESSION_DB_TESTS, PROMOTION_DB_TESTS, PAYMENT_DB_TESTS, VNPAY_DB_TESTS and DEMO_DB_TESTS, all true; cleanup disabled for deterministic tests. Test settings are process-scoped; no environment file is changed. Neon is not used.

| Check | Actual result |
|---|---|
| Baseline `mvn verify` | PASS — 294 tests, 0 failures/errors/skips, exit 0; 1:28; finished 2026-10-11T10:23:24+07:00 |
| Focused `mvn -Dtest=BookingReadTests,BookingReadPostgresTests test` | PASS — 23/23 (6 unit + 17 HTTP/PostgreSQL), 0 failures/errors/skips, exit 0; 19.193s; finished 2026-10-11T10:29:50+07:00 |
| Final full `mvn verify` | PASS — 317/317 in 52 suites, 0 failures/errors/skips, exit 0; 1:26; finished 2026-10-11T10:34:08+07:00; compile, tests, jar and Spring Boot repackage succeeded |
| Existing Booking/Payment tests | PASS — source hashes unchanged; all original 50 suites retain their 294 cases and pass; two new suites add 23 cases |
| Frontend TypeScript/lint/unit/build/Playwright | NOT RUN — backend-only task; frontend sources unchanged |
| Provider/Neon/real admission interoperability | NOT RUN — no live financial/provider/production database action |

Final runner summary and per-suite case counts were reconciled in the ignored `test-summary.json`. Hash comparison preserves every entry file except the two explicitly listed modifications in §7; original Booking/Payment/VNPAY test contents, frontend, migrations, historical contracts/reports and the prior untracked audit are unchanged. HEAD/index are unchanged. Documentation links/UTF-8/whitespace/template sections and `git diff --check` were checked without staging generated files.

### Failure history and corrections

All attempts are retained; no test is skipped or assertion removed to conceal a failure:

1. Initial focused run: 23 total, 0 assertion failures, 17 setup errors. The new Showtime fixture used separate clock reads, violating the existing interval constraint. It now uses the same statement timestamp as existing fixtures; production code/guards were unchanged.
2. Second focused run: 23 total, 1 failure, 0 errors. A new assertion incorrectly expected COUPLE to double the base-price amount. Existing approved Booking behavior charges each purchased unit at its stored base price; two units at 123.4567 total exactly 246.9134. The test now asserts that exact unchanged rule; guestCount remains three.
3. First full run: 317 total, 0 assertion failures, 15 authentication-context errors. The existing suite excludes DataSource and mocks every repository; the new repository was initially omitted. The matching MockitoBean fixture was added without altering any old test/assertion or production context.

Logs: `baseline-mvn-verify.log`, `focused-tests.log`, `focused-tests-second.log`, `focused-tests-final.log`, `final-mvn-verify.log`, `verified-final-mvn-verify.log`. This is deliberate correction/re-execution after failures, not retry masking.

### Focused evidence

- Empty/owned history, deterministic tied-time ordering, default/max pagination, maximum-page long offset, exact fractional money and IDs beyond JavaScript safe integer range.
- Same original expiry projection and freeze marker, with before/after stored Booking/Seat/Hold/Payment/Ticket state equality; paid reads likewise leave stored state unchanged.
- Historical access after catalog becomes hidden/inactive; no public discovery filter dependency.
- Invalid/repeated/unknown queries and invalid paths, customerId override rejection, safe no-store errors and attacker-token non-reflection.
- Anonymous and actual ADMIN/MANAGER/STAFF role denial; current BLOCKED/changed-role checks despite stale JWT; identical foreign/missing resource errors.
- Pending/cancelled null/empty, paid STANDARD/VIP/COUPLE complete typed set, one COUPLE Ticket/two guests, exact token recovery without Payment ID, duplicate settlement preserves identities.
- Paid entitlements after the original pre-sale deadline; older failed attempt versus paid replacement; late success after cancellation does not expose entitlements.
- Corrupt projection/database-failure fixtures fail safe 503, without QR or partial Ticket output. Stored data and Ticket guard triggers remain intact.
- Latch-controlled concurrent settlement/read yields a complete old PENDING snapshot, then a complete paid snapshot on recheck. Concurrent history creation yields count/items from one old snapshot, then both update on the next read. Actual transactions report read_only=on and isolation=repeatable read.
- Runtime database SELECT grants suffice; the runtime role cannot update issued Tickets. No permission/migration change was necessary.

Tied history timestamps are supplied by a test-only BEFORE INSERT fixture trigger in the isolated schema, removed immediately afterward; ordinary Booking guards and protected creation remain active. Inconsistent projection/status/Unicode token samples are explicitly test fixtures, not production data or implemented Ticket transition writers.

## 9. Requirement Reconciliation

| Requested behavior | Result |
|---|---|
| Exactly two additive authenticated Customer GETs and typed DTOs | PASS |
| Strict history pagination/order, exact money/IDs and effective expiry | PASS in focused tests |
| Current database ownership, role gates, safe errors and no-store | PASS in focused tests |
| Complete paid/nonpaid aggregate and Payment-independent recovery | PASS in focused tests |
| QR exact UTF-8 payload/privacy; no issuance/rotation/Check-in | PASS |
| Existing guards, freeze, original expiry, contracts and frontend preservation | PASS — source/hash preservation and complete backend regression |
| Full regression acceptance | PASS — 317/317; no failures/errors/skips |
| Live provider/admission proof | NOT APPLICABLE to this implementation's execution; NOT RUN |

## 10. Deviations / Conflicts and Migration Impact

No business-scope deviation or migration is required. V1–V12 source files remain unchanged; Flyway validates all 12 on the local regression environment. Existing Booking history index and Ticket SELECT grants suffice. **V12 remains migration head; no V13.** No Ticket trigger is changed or bypassed to manufacture paid states. Settlement remains the existing protected writer and is exercised only as isolated test evidence.

Phase 3A ambiguity resolutions: default/max page bounds follow existing Movie collections; leading-zero path IDs follow the existing Booking ID parser and normalize on output; effective status matches owned detail; inconsistent paid data uses safe 503; a separate read aggregate preserves existing Booking/Payment DTOs; QR is the exact opaque UTF-8 token without a wrapper. The new error instance is fixed to avoid reflecting malicious path text.

Legacy Project Scope per-Ticket QR wording remains superseded by later BRD/SRS v1.2 and Business Analysis v2.1 one-Booking-QR requirements, as documented in Phase 3A. Historical files are not rewritten. Enum values for CHECKED_IN/EXPIRED/CANCELLED do not create operational status writers. Existing Convention Conflicts: legacy spaced requirement/DOCX names are preserved; no new exception is approved or needed.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md) before naming/creation and after implementation.

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | Existing Java booking package; PascalCase classes; kebab-case versioned contract; requested dated report filename |
| Code naming/domain terms | PASS | Booking, Ticket, Seat Unit, Booking QR; camelCase methods; no invented statuses or requirement IDs |
| API conventions | PASS | Exactly the approved plural resource/nested GET paths; existing mappings/contracts unchanged |
| Database conventions | PASS | Existing snake_case tables/columns; SELECT-only runtime repository; no schema/grant/migration change |
| Documentation conventions | PASS | Versioned additive contract, report template sections, exact traceability, failures and evidence classifications |
| Test conventions | PASS | Existing Java/JUnit/MockMvc/PostgreSQL infrastructure and flags; old assertions preserved; isolated fixtures labeled |
| Frontend imports/routes/design | NOT APPLICABLE | No frontend or Stitch change |

## 11. Known Limitations / Phase 3C Prerequisites

1. My Bookings/detail remain frontend previews. Phase 3C must replace fixture consumption with typed authenticated readers for this contract and existing owned detail; no production mock fallback.
2. Strict frontend validation must reconcile complete Tickets against owned Booking seats, preserve money/ID strings, suppress unsafe QR on malformed/stale mismatches and clear entitlement data on session/account change.
3. Existing login return allowlist still lacks `/my-bookings` and detail. Phase 3C needs a narrow safe internal resume addition, authorization/loading/empty/error states, reload/back/direct-entry/tab recovery and GET-only recheck.
4. Render the exact token as UTF-8 QR text with no prefix/wrapper/PII. Add decoding round-trip, quiet-zone/contrast, responsive 390/768/1440px and keyboard/dialog accessibility checks. No preview QR assets, locally issued token or rotating/hash claims.
5. Preserve one Booking QR and one Ticket per purchased Seat Unit, COUPLE guestCount two, and post-sale access after original expiresAt. Do not infer admission eligibility, issuance or new financial outcomes.
6. History currently has page/size only and live catalog labels. Search, arbitrary filters/global counters/posters/card details and unsupported Stitch wallet/refund/NFC/share/pickup features remain uncontracted.
7. There is no Staff QR resolver/Check-in writer, Ticket expiry transition service or Customer Check-in action. Mixed status fixtures do not prove those workflows. Operational admission remains unverified.
8. No real provider callback, actual live Payment SUCCESS/Booking PAID, Neon paid entitlement or entrance scan was performed. Local SQL/test evidence is not claimed as live financial interoperability.

## 12. Next Recommended Step

Review this backend contract/report and separately authorize **Phase 3C real Customer My Bookings, Booking Detail, Ticket status and Booking QR frontend integration** at the existing routes, using the audited Stitch adaptations and Phase 1 components. The independent owned APIs remove the issued-entitlement attempt-ID blocker; they do not add unknown frozen Payment recovery or Staff Check-in.

Do not start Phase 3C, Staff Check-in, migration, commit or deployment automatically. Phase 3B stops after verification and this report.
