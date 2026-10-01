# Smart Cinema Implementation Report

## 1. Task Information

- Task: Payment initiation + atomic first-payment composition freeze
- Date: 2026-09-30
- Module: Payment / Booking / PostgreSQL
- Type: Backend, migration, API contracts and verification
- Status: COMPLETE for approved internal initiation scope; applicable final checks PASS
- Task-entry commit: `90b2259`

## 2. Requested Work

Persist a real internal Payment attempt and permanent Booking composition freeze
atomically; validate owned eligible Booking/Promotion, preserve authoritative amount,
support idempotent recovery and prove concurrent mutation safety. Keep external
charge, Payment SUCCESS/finalization and issuance outside this slice.

## 3. Documents Reviewed

AGENTS.md, development workflow and applicable coding/document/traceability rules;
project conventions, project context/current handoff; Promotion composition
contract/report, Booking v1.2/base, Concession contract/report, Seat/Hold v1.1;
database decisions §6, integrity design §§3/5/6, physical dictionary Payment model,
SRS v1.2 Payment/Booking requirements and current V1–V8 definitions.

The [preflight report](2026-09-30_payment-initiation-preflight_report.md) and
[decision draft](../api/payment-initiation-decisions-v0.1.md) remain unchanged history.
The user explicitly resolved their questions on 2026-09-30: no provider integration
or charge; exact numeric(19,4) domain amount, no invented integral-positive-VND rule.
The [final contract](../api/payment-initiation-contract-v1.0.md) records this resolution.

## 4. Requirements Traceability

| Requirement | Application | Result |
|---|---|---|
| FR-PAYMENT-001 | Owned eligible Booking initiation | PASS for persisted internal attempt |
| FR-PAYMENT-002; BR-035 | Server Booking amount | PASS, exact decimal amount, no client amount accepted |
| FR-PAYMENT-010/011; BR-041/042 | Identity/idempotency/traceability | PASS for local attempt/reference and duplicate recovery; provider events deferred |
| FR-PAYMENT-012 | Amount/currency/reference verification | PASS for local amount/reference; provider currency/authenticity deferred |
| FR-BOOKING-018; approved first-initiation decision | Permanent first-attempt composition freeze | PASS, paired persistence and post-freeze mutation rejection |
| FR-PROMO-002–006 | Current Promotion eligibility/discount | PASS before first initiation; no silent changed-price acceptance |
| FR-BOOKING-005/010/011; Seat/Hold ownership rules | Deadline/cancel/origin protection | PASS, expiry/cancel races and original entitlement retained |
| FR-PAYMENT-003–009/013–015 | Gateway, outcomes, signatures, reconciliation/audit | DEFERRED beyond local persistence/identity; no provider integration claimed |
| Explicit approved scope | No SUCCESS/PAID/consumption/sale/issuance | PASS, current-stage restrictions remain enforced |

No business requirement IDs, provider names or financial policy were invented.

## 5. Implementation Summary

### Persistence and atomicity

[V9](../../backend/src/main/resources/db/migration/V9__create_payment_initiation.sql)
creates payment_transactions with bigint identity/Booking FK, unique immutable
internal reference, exact numeric(19,4) amount and timestamp(6) with time zone.
Provider/currency/external reference/completion remain null and provider metadata
empty under an explicit current-stage check. Status is INITIATED only. Zero and
fractional authoritative amounts are accepted unchanged.

Initiation locks the existing aggregate resources, validates current eligibility,
origin Holds and totals, locks/revalidates Promotion and compares accepted terms.
Changed Promotion terms return a review conflict, not silently updated snapshots.
One timestamp is used for first attempt and payment_started_at. Immediate guards
require matching origin/amount and actual attempt before setting the marker;
deferred assertions on both tables reject either half committing alone.

Existing composition guards reject edits on frozen Bookings. Deferred Booking
Seat/Hold/Concession assertions and stage guards still prohibit sale/consumption.
Cancel/expiry can transition frozen Booking while preserving marker/attempt/history
and releasing only its origin Holds. A terminal Booking does not imply a terminal
provider outcome: its attempt remains INITIATED until future trusted reconciliation.

### Customer contract

`POST /api/v1/bookings/{bookingId}/payment-transactions`, body `{}`, returns 200
PaymentResponse for first initiation and retry. Authenticated active CUSTOMER
ownership, strict body/query/ID validation, string-safe IDs/amounts and safe
ProblemDetail follow existing conventions. BookingResponse adds paymentStartedAt.

Repeated/concurrent initiation returns the same unresolved row/reference/amount/
timestamp while PENDING and unexpired. No client key, amount or currency is
authoritative; the Booking gate and unresolved unique index provide idempotency.
Retry is recovery, not fresh provider authorization, and never reprices from masters.
After terminal state/expiry, initiation conflicts; the immutable attempt remains stored.

### Security and external boundary

Existing non-login owner owns new persistence; runtime has SELECT plus narrow
initiate_payment EXECUTE, not direct DML/TRUNCATE/helpers/results. SECURITY DEFINER
uses fixed safe search paths/schema qualification. Existing ordered locks and
bounded timeouts are reused; no network work occurs inside or after this command.

No gateway adapter, checkout URL, external charge, provider reference, SUCCESS,
FAILED/CANCELLED result writer, PAID/paid_at, usage consumption, Hold consumption,
sold_at, Ticket or QR is implemented. Currency/provider binding and minor-unit
conversion belong to the later selected-provider boundary.

## 6. Files Created

- [V9 migration](../../backend/src/main/resources/db/migration/V9__create_payment_initiation.sql).
- `backend/src/main/java/com/smartcinema/payment/`: PaymentController, PaymentService, PaymentRepository, PaymentResponse.
- [PaymentPostgresTests](../../backend/src/test/java/com/smartcinema/payment/PaymentPostgresTests.java), [PaymentMigrationPostgresTests](../../backend/src/test/java/com/smartcinema/payment/PaymentMigrationPostgresTests.java).
- [Payment initiation v1.0](../api/payment-initiation-contract-v1.0.md), [Booking v1.3](../api/booking-contract-v1.3.md), [Promotion v1.1](../api/promotion-composition-contract-v1.1.md), this report.
- Earlier in this task: preserved preflight decision draft/report linked above.

## 7. Files Modified

- AuthSecurityConfiguration: exact Customer POST and existing Bearer write conventions.
- BookingResponse / BookingRepository: nullable paymentStartedAt projection.
- BookingExceptionHandler: Payment controller coverage and changed-terms ProblemDetail.
- SmartCinemaApplicationTests: database-free Payment repository mock.
- PromotionMigrationPostgresTests: accepts later current head while its V7→V8 test remains pinned to V8.
- [Current handoff](../ai/current-handoff.md): V9, latest contracts/evidence and exact next task.
- [Project context](../ai/project-context.md): stable internal-attempt/exact-amount/provider-deferred decisions and current state.

No files moved. Frontend, historical V1–V8, old reports/contracts and BRD/SRS/design
sources remain unchanged. No commit was created.

## 8. Verification

Environment: Java 21, Maven 3.9.16, PostgreSQL 18.4 on Windows. Final dedicated
database: `smart_cinema_payment_test_20260930`, with isolated UUID test schemas.
Migration test starts from populated V8, verifies old Booking/COUPLE Hold history,
upgrades once, validates checksums, exercises exact amount/freeze/retry/cancel and
confirms repeated migration is a no-op. Fresh suites start directly through V9.

Run from `backend/` using existing credentials without storing them in documentation:

```powershell
$env:DB_URL='jdbc:postgresql://localhost:5432/smart_cinema_payment_test_20260930'
$env:PAYMENT_DB_TESTS='true'
$env:PROMOTION_DB_TESTS='true'
$env:CONCESSION_DB_TESTS='true'
$env:BOOKING_DB_TESTS='true'
$env:SEAT_DB_TESTS='true'
$env:MOVIE_DB_TESTS='true'
$env:DISCOVERY_DB_TESTS='true'
$env:SEAT_HOLD_CLEANUP_ENABLED='false'
mvn verify
```

Final result: **BUILD SUCCESS; 194 tests, 0 failures, 0 errors, 0 skipped**,
58.788 seconds, finished 2026-09-30T01:24:48+07:00. New coverage comprises
15 Payment PostgreSQL cases and 1 migration case. Evidence: generated Surefire
XML plus temporary local `smart-cinema-payment-verify.log`; generated files are not committed.

| Check | Final result / evidence |
|---|---|
| Maven verify/package | PASS, all 194 tests plus repackaged backend JAR |
| Fresh V9 / V8 upgrade | PASS, valid origin history, exact amount/marker and duplicate attempt identity after upgrade |
| Historical checksums | PASS, Flyway validate, upgrade checksum comparison and unchanged tracked migration files |
| Valid initiation | PASS, stored INITIATED plus exact matching timestamp marker |
| Fractional/zero amount | PASS, 129.7035 exact example and 0.0000 attempt without PAID |
| First-attempt/freeze atomicity | PASS, marker without attempt rejected; attempt without marker fails commit; rollback removes both |
| Retries/duplicates/concurrent initiation | PASS, same id/reference/amount/time and exactly one row |
| Invalid/expired Booking | PASS, owner/state/parent eligibility and original deadline checks |
| Invalid/expired/changed Promotion | PASS, no attempt/marker on failure; explicit terms-review conflict, eligible reapply permits initiation |
| Expiry while waiting for gate/Promotion | PASS, rejection after wait without partial freeze |
| Initiation versus Concession edit | PASS, accepted whole edit is included or edit returns conflict after freeze |
| Initiation versus Promotion apply/remove | PASS, consistent accepted single snapshot or rejected edit |
| Initiation versus cancel | PASS, cancel retains successful freeze history or wins before initiation; no fake provider cancellation |
| Frozen expiry/reacquisition | PASS, origin expiry retains attempt/freeze, retry conflicts, another Customer can acquire released entitlement |
| Post-freeze mutations | PASS, API and owner-level header/line/attempt changes reject; marker cannot clear |
| Master/catalog changes | PASS, frozen retry/read preserves Promotion/Concession terms and amount after deactivation/repricing |
| COUPLE/string-safe IDs | PASS, whole unit/two guests, IDs above 2^53 and exact decimal strings |
| Authentication/ownership/input | PASS, anonymous 401, wrong role/blocked user 403, foreign/missing Booking 404; amount/currency/provider/result/unknown query/range rejected |
| Runtime grants/guards | PASS, protected initiation works; direct writes/TRUNCATE/helpers denied; owner cannot mutate attempt/result |
| No sale/usage/issuance | PASS for current prohibitions, unchanged active Holds/PENDING Booking, PAID/paid_at/CONSUMED/sold_at/result writes rejected |
| Actual SUCCESS / paid usage exhaustion / finalization | DEFERRED, no verified provider or paid writer; no fake paid data |
| Provider timeout/submission/reconciliation | DEFERRED; local rollback/retry tested, no gateway behavior invented |
| New attempt after definitive FAILED/CANCELLED | DEFERRED; result transitions are intentionally unavailable |
| Auth/Hibernate/prior regression | PASS in full suite; no new JPA mapping |
| Documentation/links/whitespace/conventions | PASS, new contracts/report and both context files reconciled |
| TypeScript/ESLint/frontend tests/visual | NOT RUN, frontend unchanged |
| Production load/scheduled cleanup timing | NOT RUN; direct expiry behavior tested with scheduler disabled |

Final Flyway history (all success): V1 1536752408; V2 1495804464;
V3 1822747767; V4 -336975126; V5 -226696638; V6 -1104445100;
V7 -2107511975; V8 -1266032292; **V9 48634441**.

Initial verification found a shared deferred trigger referring to a field absent
on the Booking record; it was corrected using per-table IF branches before final
verification. Final testing used a new dedicated database rather than repairing
history. The earlier Concession test database contains that superseded development
V9 and is not the current verification target; use the database above for reruns.

## 9. Requirement Reconciliation

PASS for the explicitly approved local initiation/freeze slice. Provider integration
and verified SUCCESS remain DEFERRED. This report does not claim currency binding,
provider acceptance, external money movement or completion of the full Payment lifecycle.
Permanent snapshots, original deadlines and no-sale stage remain intact.

## 10. Deviations / Conflicts

The original physical dictionary required provider/currency immediately. User
explicitly deferred those choices while approving real internal persistence;
V9 represents the unknown values as null and forbids binding/charge in this slice.
No synthetic provider namespace or default currency was inserted. The preflight
positive-integral-VND proposal was rejected and is not implemented.

The design's requirement to return a revised summary on amount change is enforced
as a safe 409 review workflow: unchanged stored snapshot remains readable; Customer
reapplies/removes Promotion and reviews before retry. No unsolicited amount is
persisted or frozen. No new summary-repricing endpoint was added.

Current stage has no terminal attempt transitions, so recovery returns the existing
INITIATED row only. Failed-attempt replacement will require the verified-result
slice rather than introducing an untrusted result-setting escape hatch.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md).

| Area | Result | Notes |
|---|---|---|
| Folder/file naming | PASS | Existing domain layout, PascalCase Java, forward Flyway, versioned kebab-case docs |
| Code/domain terminology | PASS | Payment Transaction, existing INITIATED and Booking states |
| API naming/security | PASS | Resource POST, owned Customer, strict input, ProblemDetail and string IDs |
| Database | PASS | Named constraints/indexes, protected functions, safe search_path, no historical checksum changes |
| Documentation/traceability | PASS | Real requirement IDs, explicit approval/deferred boundaries and actual test evidence |
| Context/handoff | PASS | Newly stable amount/gateway decisions recorded; V9 and exact next task reconciled |
| Frontend | NOT APPLICABLE | No source/config changes |
| Commit/branch | NOT APPLICABLE | Not created |

## 11. Known Limitations

- Internal INITIATED is not a provider transaction; no charge can be submitted yet.
- Currency/provider binding, fractional/zero handling at provider boundary,
  definitive result transitions, retries after failure and financial audit are future work.
- No new customer attempt-history endpoint; existing owned Booking exposes freeze
  marker and initiation recovers same row before expiry. Operational reporting remains separate.
- Local DB assertions cannot prove provider authenticity. SUCCESS must only be
  entered through a trusted adapter and full finalization transaction.
- Applying/initiating reserves no Promotion usage. Settlement versus exhaustion
  needs explicit reconciliation before external charge is enabled.
- Conservative Showtime-wide serialization, production role provisioning/load,
  frontend checkout integration and legacy Auth numeric userId remain limitations.

## 12. Next Recommended Step

**Backend-verified Payment SUCCESS + atomic sale finalization**, with provider
selection/integration and amount/currency binding resolved before enabling charge
or accepting results. Preserve frozen amount/terms and implement complete verified
result/PAID/sold/Hold consumption/Ticket/one Booking QR/audit integrity together.
See [current handoff](../ai/current-handoff.md) for exact prerequisites and exclusions.
