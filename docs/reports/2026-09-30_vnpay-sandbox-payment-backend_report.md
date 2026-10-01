# Smart Cinema Implementation Report

## 1. Task Information

- Task: VNPAY Sandbox integration, verified Payment results and atomic sale finalization
- Date: 2026-09-30
- Module: Payment / Booking / Seat Hold / Promotion / Ticket / PostgreSQL
- Type: Backend, forward migration, contracts and verification
- Status: COMPLETE for local implementation; real Sandbox interoperability DEFERRED, affected gates disabled
- Task-entry commit: `90b2259`; existing uncommitted work preserved

## 2. Requested Work

Implement the approved Sandbox contract with immutable provider binding, exact amount conversion, signed IPN/query processing, durable financial evidence/reconciliation and complete atomic sale issuance. Preserve first-payment freeze and historical migrations. Do not infer financial success from redirects or implement production money, automatic refunds or unrelated frontend behavior.

## 3. Documents Reviewed

AGENTS.md, development workflow, project conventions and applicable coding/document/traceability rules; project context/handoff; BRD v1.2, SRS v1.2 Payment/Booking/Ticket requirements; approved [VNPAY v1.0](../api/vnpay-sandbox-payment-contract-v1.0.md), [integrity v1.1](../db/integrity-enforcement-design-v1.1.md), physical dictionary, database decisions, provider research/preflight/contract reports; Payment initiation v1.0, Booking v1.3, Promotion v1.1, Concession and Seat/Hold contracts; actual V1–V9 persistence and guards.

## 4. Requirements Traceability

| Requirement / source | Application | Result |
|---|---|---|
| SRS v1.2 FR-PAYMENT-001/002; BR-035 | Owned initiation and authoritative amount | PASS locally; exact numeric(19,4) retained |
| SRS v1.2 FR-PAYMENT-003–015 | Provider submission, results, identity, verification and reconciliation | PARTIAL overall: local implementation PASS, real provider confirmation DEFERRED |
| FR-BOOKING-018; approved first-payment freeze | Permanent snapshots across retries and master changes | PASS |
| FR-BOOKING-005/010/011; Seat/Hold contract | Original expiry/cancellation and exact origin entitlement | PASS |
| FR-PROMO-002–006; approved frozen Promotion policy | Preserve accepted discount; serialize paid usage at sale | PASS |
| SRS v1.2 Ticket/Booking QR requirements; approved Seat Unit model | One Ticket per whole unit, COUPLE two guests, one Booking QR | PASS for issuance/projection; admission mutation outside scope |
| Approved VNPAY contract and integrity v1.1 | Later BLOCKED alone does not veto settlement; unfulfillable SUCCESS retained | PASS |

No new requirement IDs or provider policies were invented. Existing contracts remain historical; the additive implementation delta documents the actual boundaries.

## 5. Implementation Summary

V10 adds immutable merchant/environment/TxnRef/amount/date/deadline binding, evidence and reconciliation storage, Ticket persistence and audit. Eligible historical V9 rows bind once; unbound rows are not bulk backfilled. Exact domain amounts remain unchanged, with positive whole-VND and exact ×100 enforced only at submission.

The Sandbox adapter creates signed hosted-payment URLs and implements UX-only return, signed IPN and verified query recovery. Duplicate keys/tampering are rejected. Normal success requires matched reference/amount and confirmed result combination. Definitive negative mappings are empty by default. Unknown/special results cannot authorize replacement attempts.

A separate protected system database role records results under the established resource order. Eligible success commits financial SUCCESS, PAID/paid_at, sold lines, exact origin Hold consumption, Promotion paid usage, Tickets, one QR and audit together. A failure during issuance rolls back the whole transaction. Unfulfillable financial success is durable without entitlement and creates an operator case. Contradictory evidence, late old-attempt success and additional financial success are retained without another automatic sale.

Query claims commit before network work; concurrent claims skip locked rows. Horizon expiry creates reconciliation without fabricating failure. Operator case resolution is attributed and cannot refund or issue entitlement. Ordinary runtime cannot call the result writer or directly mutate sale/evidence tables. Customer result DTOs use string IDs and redact QR/signed URL representations in logs.

## 6. Files Created

- [V10 migration](../../backend/src/main/resources/db/migration/V10__integrate_sandbox_payment_finalization.sql).
- In [payment source](../../backend/src/main/java/com/smartcinema/payment/): VnpaySettings, VnpayUnavailableException, VnpayConflictException, VnpayProtocol, VnpaySubmission, VnpayRedirectResponse, VnpayPaymentResponse, VnpayRepository, VnpaySystemRepository, VnpayService, VnpayController, VnpayQueryClient and VnpayRecovery Java files.
- In [payment tests](../../backend/src/test/java/com/smartcinema/payment/): VnpayProtocolTests, VnpayPostgresTests and VnpayMigrationPostgresTests.
- [API v1.1](../api/vnpay-sandbox-payment-contract-v1.1.md), [integrity v1.2](../db/integrity-enforcement-design-v1.2.md), this report.

## 7. Files Modified

- [AuthSecurityConfiguration](../../backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java): public transport and owned Customer route authorization.
- [BookingExceptionHandler](../../backend/src/main/java/com/smartcinema/booking/BookingExceptionHandler.java): safe provider ProblemDetail mapping.
- [application.properties](../../backend/src/main/resources/application.properties): secret-free environment placeholders and disabled confirmation gates.
- [pom.xml](../../backend/pom.xml): test-only Hikari pool limits for full-suite connection capacity.
- [SmartCinemaApplicationTests](../../backend/src/test/java/com/smartcinema/SmartCinemaApplicationTests.java): no-DB repository mock.
- [PaymentMigrationPostgresTests](../../backend/src/test/java/com/smartcinema/payment/PaymentMigrationPostgresTests.java): preserve V9 upgrade check while accepting later migration head.
- [Current handoff](../ai/current-handoff.md), [project context](../ai/project-context.md): actual V10 status, latest evidence and next task.

Pre-existing Payment initiation files, V9, contracts/reports and unrelated working-tree changes are not attributed to this task.

## 8. Verification

Final command: `mvn verify -Dlogging.level.root=INFO` in backend, with all eight PostgreSQL suite flags enabled and cleanup disabled. Java 21, Maven 3.9.16, PostgreSQL 18.4; dedicated database `smart_cinema_vnpay_accepted_20260930`. Exit **0**, BUILD SUCCESS, 59.477 seconds, completed **2026-09-30 19:36:27 +07:00**. Evidence: Surefire XML and local temporary log `smart-cinema-vnpay-accepted.log` (not committed).

| Check | Result / evidence |
|---|---|
| Complete backend regression and package build | PASS: **231 tests, 0 failures, 0 errors, 0 skipped** |
| New protocol tests | PASS: 16 local tests; no real provider certification implied |
| New PostgreSQL integration/concurrency | PASS: 20 tests |
| Fresh V10 and populated V9 upgrade | PASS: 1 dedicated migration test, prior checksums retained |
| Exact wire conversion; fractional/zero rejection | PASS; no domain rounding |
| One-time binding/recovery, ownership, strict input | PASS |
| Valid/tampered signatures, duplicate keys, ReturnURL non-authority | PASS using local signed fixtures |
| Signed IPN and query recovery | PASS locally against protected PostgreSQL writer; real transport DEFERRED |
| Duplicate/contradictory/special evidence and unresolved retry protection | PASS locally |
| Cancel, expiry/replacement Hold, Showtime start, later BLOCKED | PASS |
| Promotion last-use race across Showtimes | PASS: one sale, financial success/reconciliation retained for loser |
| Concurrent success, late old success after replacement attempt | PASS; no duplicate sale/issuance |
| Atomic PAID/sold/CONSUMED/Tickets/QR and injected rollback | PASS |
| Frozen amount/Promotion snapshots and post-freeze edit rejection | PASS |
| Query claim concurrency/horizon/operator audit | PASS |
| Runtime grants, separate system writer, string IDs, DTO redaction | PASS |
| Historical preservation and documentation/link/whitespace | PASS; task-entry SHA-256 comparison and local link review |
| TypeScript / ESLint / frontend tests / visual review | NOT RUN: no frontend files changed |
| Real VNPAY merchant Sandbox interoperability | DEFERRED: no merchant credentials or provider calls |
| Notification delivery/failure injection | NOT APPLICABLE: no sender exists or is invoked; future delivery must be after commit |

During development, stale migration-head assertions and reused external-reference fixtures were corrected. Full-suite PostgreSQL connection exhaustion was resolved with test-only pool limits. One superseded development V10 checksum run was discarded and verification repeated on a fresh database; no Flyway repair or historical edit was used. Final run has no failures.

## 9. Requirement Reconciliation

PASS for implemented local persistence, protocol boundaries, protected settlement, concurrency and issuance. PARTIAL for end-to-end external integration: actual Sandbox confirmation remains deferred and every affected path is fail-closed. All required domain policies remain unchanged. No frontend success or redirect can create entitlement. No automatic refund, production gateway, inventory/POS or check-in mutation was added.

## 10. Deviations / Conflicts

No business policy exception was introduced. Real provider behavior requiring evidence is explicitly gated rather than inferred. Existing development credentials/configuration and pre-task working-tree changes were preserved; no new secret was committed. Existing Convention Conflicts: legacy historical filenames remain untouched, no mass renaming. No new convention exception is requested.

## Convention Compliance

Validated against [project conventions](../development/project-conventions.md).

| Area | Result | Evidence |
|---|---|---|
| Folder/file/code naming | PASS | Existing domain package, PascalCase Java, Flyway forward migration, kebab-case versioned documents |
| Domain/status terminology | PASS | Existing Payment/Booking/Ticket states; reconciliation evidence does not invent a Booking lifecycle |
| API/authorization | PASS | Versioned resources, owned Customer access, provider transport separated from trusted writer |
| Database | PASS | snake_case, narrow grants, protected functions and additive V10 |
| Configuration/security | PASS | UPPER_SNAKE_CASE inputs, disabled gates, no secret defaults added |
| Documentation/report/handoff | PASS | Versioned additions, template sections, current links and historical preservation |
| Frontend/import conventions | NOT APPLICABLE | Frontend unchanged |

## 11. Known Limitations

- No real VNPAY interoperability claim. PAY/query signature vectors, definitive outcomes, IPN acknowledgements, reopened URL behavior, query visibility/throttling, special/reversal/refund semantics and merchant amount/window limits still require evidence. All confirmation flags default false; negative mappings default empty.
- Separate least-privilege system login, merchant secrets and registered HTTPS callback/return routes require deployment provisioning.
- Query delay/horizon are configurable operational bounds, not proof of provider limits or a Hold extension. Operator workflow is a protected audited database command; no operator UI/automatic refund integration.
- Production load, notification delivery, frontend checkout wiring, Booking history and Staff check-in are deferred. Conservative Showtime serialization remains intentional.
- Legacy Auth numeric userId limitation remains unrelated and unchanged.

## 12. Next Recommended Step

**VNPAY Sandbox merchant provisioning and real interoperability confirmation.** Follow the [API confirmation register](../api/vnpay-sandbox-payment-contract-v1.1.md#5-configuration-and-confirmation-register), register callbacks, collect actual protocol/status/duplicate/query/limit evidence and enable only individually confirmed gates. Preserve local test evidence separately. Do not move to production charges or automatic refunds as part of that confirmation.
