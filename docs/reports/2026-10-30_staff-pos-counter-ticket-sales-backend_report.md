# STAFF POS counter ticket sales backend

## 1. Task Information

Date: 2026-10-30, Asia/Saigon. Backend implementation with isolated PostgreSQL
verification. **IMPLEMENTED AND VERIFIED ON ISOLATED FIXTURES; PRIMARY ACTIVATION
BLOCKED pending separate V19 approval.** No frontend or subsequent POS module.

The user explicitly approved both CASH and VNPAY Sandbox and the corresponding
BR-038/SRS changes during this task. Historical BRD/SRS v1.2 and API contracts
were preserved; new v1.3 requirements and additive contracts record that decision.

## 2. Inspection and Requirements Traceability

Read root AGENTS, canonical development/backend workflows, project conventions,
coding/traceability/document rules, current handoff, Project Scope v1.0, BRD/SRS
v1.2, System Analysis & Design v1.1, existing Customer discovery/Hold/Booking/
Concession/Promotion/Payment/VNPAY/Ticket and Staff admission implementations and
contracts, V5–V18 guards, Manager/ADMIN read/reporting patterns and local/PRIMARY
startup/test safeguards. No application-local backend AGENTS exists.

| Authority | Reconciliation |
|---|---|
| BRD BR-026/027/028/029/030/031/035 | Shared booking, one Showtime, multiple units, expiry, snapshots and server totals preserved; v1.3 explicitly extends counter ownership |
| BR-038, SRS FR-PAYMENT-006/007 | Explicit approved change: VNPAY verified gateway outcome; CASH authorized STAFF receipt confirmation and audit |
| BR-039/040/041/042/043/044/046 | No client financial authority, unpaid Ticket, duplicate issuance or untraceable confirmation |
| BR-002/003/050/053; FR-AUTH-007/008, FR-ORG-005 | JWT role plus current account/effective Cinema scope; foreign and other-operator sales denied |
| FR-SEAT, FR-BOOKING, FR-PROMO, FR-TICKET; SRS DR-004 | Existing unit/hold/pricing/promotion/issuance rules reused; v1.3 revises ownership and RBAC explicitly |
| BR-059; ADMIN/MANAGER reporting contracts v1.1 | Original VNPAY metrics unchanged; separately verified CASH totals added |

No new BR/FR/UC identifiers were invented. The approved revision is not a claim
that historical v1.2 already allowed cash. System Analysis/Scope historical files
remain unchanged; the new requirement revision documents this authorized extension.

## 3. Implemented Backend and Contracts

New [STAFF POS API contract](../api/staff-pos-counter-ticket-sales-contract-v1.0.md)
specifies all 14 handlers under `/api/v1/staff/pos`: movies, showtimes, seat map,
own live Holds/acquire/release, counter Booking creation/recovery/cancellation,
Promotion apply/remove, Payment initiation, explicit CASH confirmation and VNPAY
submission. Exact route/body/response/error tables are in that contract.

- Reuses DiscoveryRepository eligibility, SeatRepository Hold writers and existing
  protected Booking/Promotion/Payment functions. No second seat-lock/pricing engine.
- Walk-in Booking has null customer_id and real selling_staff_id. An internal
  generated owner key preserves the Hold/Booking FK without inventing Customer
  accounts, impersonating Customers or putting a STAFF ID in customer_id.
- Positive-bigint string identifiers and exact four-decimal monetary snapshots;
  COUPLE remains one purchased unit/Ticket and two guests. Original deadlines and
  first-attempt permanent composition freeze remain authoritative.
- CASH requires an existing INITIATED unbound attempt, exact frozen-total comparison,
  current actor/scope and valid settlement resources. Persists CASH/VND/COUNTER,
  SUCCESS/completed_at, append-only SHA-256 receipt evidence and CASH_RECEIVED audit
  with actor, amount, currency, Booking/Payment and database timestamp.
- One internal finalizer handles both verified VNPAY and authorized CASH, atomically
  committing PAID, sold markers, consumed Holds, one Booking QR, one Ticket/unit
  and SALE_FINALIZED audit. Audit/constraint/issuance failure rolls back the sale.
  Runtime cannot execute that internal finalizer or directly mutate financial tables.
- Duplicate live Hold-set Booking, unresolved initiation and successful CASH replay
  reuse committed identity; concurrent confirmation issues once. Bound unresolved
  VNPAY cannot switch to CASH. Verified negative/replacement retains original freeze.
- Scoped receipt GET returns authoritative attempts and coherent issued units/QR;
  unpaid results contain none. Supports explicit known-identity recovery without
  automatic command retries. No tax invoice, cash change, contact capture or POS
  transaction-history workflow was invented.

Existing VNPAY callback/signature/readiness/amount/deadline/negative/reconciliation
rules remain in control. No merchant secret or attestation flag was enabled. The
existing provider return route is unchanged; future POS UI must recover through its
owned receipt GET. No new browser callback or manual VNPAY-success endpoint.

## 4. Impact on Existing Roles and Reporting

Customer HTTP routes remain CUSTOMER-only and query customer_id. Existing Customer
VNPAY purchase/issuance passed against the proposed schema. Staff admission uses
the same issued aggregate and independent Ticket check-in states.

The existing reporting UI explicitly labels its revenue VNPAY Sandbox and checks
`paymentEnvironment=SANDBOX`. Therefore **CASH is not mixed into those metrics**.
ADMIN summary and MANAGER summary/Dashboard add `cashTotals` containing confirmed
revenue, bookings, tickets and guests as exact strings, with matching successful
amount, complete issuance, CASH evidence, confirming-actor audit and no reconciliation.
It uses the same period/Cinema/Manager scope and recognizes replay once.
Legacy daily/ranking/product metrics retain their VNPAY meaning. The frontend does
not render the additive CASH field yet; no CASH analytics/shift UI is claimed.

Before V19, CASH is structurally impossible and the additive field returns zero
without requiring the new audit-column privilege. Existing VNPAY period metadata,
financial computations, authorization and functional frontend remain compatible.

## 5. Migration Proposal — Not Applied to PRIMARY

[Proposed V19 SQL](../../backend/src/test/resources/pos-migration/V19__enable_staff_counter_sales.sql)
is deliberately in an **isolated-test resource location**, outside normal Flyway
startup and the packaged application migration directory. It was executed only
inside generated `staff_pos_*` schemas in the existing
`127.0.0.1:5432/smartcinema_phase4e_test` database. No new database/Docker environment.

Necessary schema impact: nullable Customer plus mutually exclusive selling STAFF;
generated internal owner key and matching Hold FK/index; disjoint CASH binding
and evidence source; guarded function extensions and shared finalizer. Existing
rows retain their Customer identity. V1–V18 files/checksums are unchanged.
Proposed narrow permissions: protected Hold owner reads Cinema assignments;
runtime EXECUTE on cash wrapper and SELECT of required audit columns. No runtime
protected-owner membership, new role hierarchy, direct financial DML or public
finalizer. Production installation requires reviewed operator authority for the
protected tables/functions and **separate explicit approval**; none was requested
or executed as an implicit consequence of the CASH business decision.

## 6. Actual Verification

| Command/evidence | Result |
|---|---|
| `cd backend; $env:STAFF_POS_DB_TESTS='true'; mvn '-Dtest=StaffPos*Tests' test` | **27/27 PASS**, 23 real isolated PostgreSQL/MockMvc cases and 4 request tests; zero skips |
| `cd backend; $env:STAFF_POS_DB_TESTS='true'; mvn verify` with other historical conditional DB/HTTP suites explicitly not enabled | **658 discovered; 289 executed PASS; 369 conditional cases not enabled; 0 failures/errors**, package/repackage BUILD SUCCESS |
| `cd frontend; pnpm test` | **328/328 PASS**, zero skipped/failed |
| Root `pnpm dev` against actual PRIMARY | **PASS**: Spring Boot, Next.js and backend/frontend API proxy READY |
| Actual PRIMARY HTTP smoke | **19/19 PASS**, public connectivity/proxy equality and anonymous/tampered bearer denial on all POS handlers |
| PRIMARY Flyway preflight/startup | **Installed V18 / normal source V18; pending 0, failed 0; all 18 checksums valid** |
| Real PRIMARY STAFF positive flow | **BLOCKED / NOT RUN**: 0 ACTIVE STAFF; V19 not installed; no account or business-write authorization |
| Actual VNPAY Sandbox/payment interoperability | **NOT RUN**: no external merchant/provider transaction attempted |
| Backend/frontend source quality gates | Maven compile/package verified; no new frontend typecheck/lint/build/Playwright claim because no frontend code changed |

PostgreSQL cases cover CASH, signed fixture VNPAY success/duplicate/forgery/negative
replacement, existing Customer VNPAY success, no premature entitlement, exact
decimal Promotion pricing/freeze, released/expired Holds and late CASH, two-actor
seat races, parallel cash confirmation, actor/scope/revocation denial, audit-failure
rollback, runtime financial DML/internal-finalizer denial and separately scoped
ADMIN/MANAGER CASH reporting. Fixture JWTs/signatures are **not** real PRIMARY
STAFF login or real provider certification. No test retry/skip was added to conceal
failure; the isolated test flag is explicitly enabled for all new database cases.

Defects found/fixed: SQL comment patch anchor; fixture onboarding now uses the real
invitation/password/activation functions; stored generated-owner comparison in
BEFORE Booking guard now excludes only the derived value while protecting its
immutable input columns. An initial full-run wrapper stopped on Mockito's stderr
warning under PowerShell Stop; corrected the wrapper and reran complete `mvn verify`.
Successful final results above supersede the retained failed diagnostic runs.
Final source review also corrected year-0000 date validation and mapped protected
Promotion conflicts to 409, followed by another complete successful `mvn verify`
and real PRIMARY startup/HTTP/preservation checks on that final source.

Evidence (Git-ignored): [full backend log](../../backend/target/staff-pos-2026-10-30/backend-verify-final-2.log),
[targeted POS log](../../backend/target/staff-pos-2026-10-30/pos-final.log),
[frontend unit log](../../frontend/target/staff-pos-2026-10-30-unit.log),
[actual startup](../../backend/target/staff-pos-2026-10-30/startup-final.log),
[actual HTTP checks](../../backend/target/staff-pos-2026-10-30/real-http.json),
[PRIMARY preservation](../../backend/target/staff-pos-2026-10-30/primary-after.log),
[local preservation](../../backend/target/staff-pos-2026-10-30/local-preservation.txt).

## 7. Data Preservation and Files

Enforced READ ONLY PRIMARY before/after fingerprints: **30 keys** covering all
public table data/history plus protected function definitions/owners/ACLs and role
flags/memberships, unchanged. This includes authentication history: no live login,
refresh, invitation or rate-ledger mutation. MANAGER user 5 remains ACTIVE with
its single approved Cinema 1 assignment. No Neon account, catalog, Booking,
Payment, Ticket, migration, ownership or privilege write.

Local isolated tests preserve all existing public rows/history/global roles and
memberships. Generated fixture schemas are retained for evidence, not reset over
existing data. Test invitations are consumed/revoked through onboarding and delivery
is disabled; no SMTP/provider request. QA-owned dev services stopped after checks.

Created: StaffPosController/Service/Repository/Request/Response; StaffPosPostgresTests
and StaffPosRequestTests; isolated V19 proposal; STAFF POS contract v1.0; ADMIN and
MANAGER reporting contracts v1.1; BRD/SRS v1.3; this report.
Modified: AuthSecurityConfiguration, StaffExceptionHandler, DiscoveryRepository,
BookingRepository, VnpayRepository/Service; ReportSql and ADMIN/MANAGER report
repositories/responses plus AdminReportService; SmartCinemaApplicationTests adds
the new repository mock for its intentionally database-free context; additive handoff.
No dependency, frontend, historical migration/requirement/report or environment edit.
Exact relative paths: [28 changed files](../../backend/target/staff-pos-2026-10-30/files-changed.txt).

## Convention Compliance

Naming/packages/REST/domain enums/identifier and amount conventions: **PASS**.
New report/contracts use dated kebab-case/versioned naming; historical requirements
are preserved and the explicit user-approved change is versioned: **PASS**.
Shared protected writers and fixed internal SQL column/predicate choices; no request
SQL interpolation, source secrets, new dependency or invented role/status: **PASS**.
Strict UTF-8, local links and `git diff --check`: **PASS**. Compared all 1,034
original tracked files: only 13 scoped backend/test files and the additive handoff
changed; frontend, historical V1–V18/requirements/reports and environment files are
unchanged. HEAD/index and the complete previous handoff body remain unchanged.
Secret scan of changed files and task evidence passed; credentials stay in existing
ignored private files. Visual/Stitch
acceptance: **NOT APPLICABLE**, no frontend implementation or design change.

## 8. Stop Boundary and Next Action

Backend implementation and isolated verification are complete. PRIMARY sale
activation remains blocked until V19/operator permissions are separately reviewed
and approved. No real STAFF authenticated positive-flow or real payment PASS is
claimed. Next smallest action: review/authorize the tested V19 promotion/installation
plan; then independently authorize a suitable real STAFF verification scope.
Do not start concession sales, STAFF provisioning, UI, shifts or deployment.
No commit, push or deployment performed.
