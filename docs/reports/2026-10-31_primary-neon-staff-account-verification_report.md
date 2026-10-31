# PRIMARY Neon STAFF account creation and verification

Date: 2026-10-31. **CREATED AND VERIFIED** against actual PRIMARY Neon.

## Account and authorization

The user explicitly authorized exactly this account and Cinema 1 assignment, then
provided the required full name and Vietnamese phone. Read-only preflight confirmed
the email did not exist. The transaction rechecked before writing; existing-account
handling stops without changing passwords or assignments.

| Field | Verified value |
|---|---|
| Account ID | `6` |
| Email | `staff@gmail.com` |
| Full name | Smart Cinema Staff Test |
| Role / status | `STAFF` / `ACTIVE` |
| Password setup / storage | Completed; BCrypt hash verified using the configured algorithm, no hash/password printed |
| Assignment ID | `2` |
| Cinema | `1` — [DEMO] Smart Cinema Central |
| Assignment | `STAFF`, `ACTIVE`, effective at database time; returned by the real assigned-cinema API |

## Execution

Used existing input validation/phone normalization and protected onboarding commands
in one transaction: `staff_create_account` (BLOCKED) -> `staff_issue_invitation` ->
`staff_set_password` with BCrypt -> ADMIN `staff_set_status` ACTIVE ->
`staff_assign_cinema`. Used the existing ACTIVE development ADMIN as audit actor;
no direct user-table writes or changes to other accounts.

This was an explicitly authorized operator invocation of existing protected
commands, not an ADMIN HTTP create/email-delivery test. SMTP invitation settings
were not configured. A cryptographically random, one-time invitation was encrypted
with a transaction-local AES-GCM key using the existing onboarding payload/AAD
format, consumed immediately, and its encrypted delivery payload cleared before
commit. No email was sent, no SMTP/key configuration was changed, and no plaintext
password/token was saved in source, tracked files, reports or database columns.
The supplied password entered the helper only through transient process memory.

## Actual verification

| Check | Result |
|---|---|
| Root `pnpm dev` | PASS: actual Spring Boot, Next.js and backend proxy readiness |
| Flyway | **V19 installed / V19 source**, zero pending/failed, applied checksums valid; migration skipped, no migration credentials loaded |
| Real login | HTTP 200; server-issued identity is STAFF account `6` |
| Assigned Cinema API | HTTP 200; exactly Cinema 1, current assignment `2` |
| POS movie list / showtime read | HTTP 200; authoritative empty availability accepted |
| Protected Next.js POS API proxy | HTTP 200 with real STAFF authentication |
| Unassigned Cinema / ADMIN / MANAGER / Customer profile access | HTTP 403 as expected |
| Anonymous POS access | HTTP 401 |
| Unknown Showtime seat/Hold reads and unowned counter receipt | HTTP 404; safe reads only |
| Logout | HTTP 204; the single new smoke session is revoked |
| HTTP total | **16/16 PASS** |
| Backend regression | `mvn -Dmaven.compiler.useIncrementalCompilation=false verify`: **266 executed PASS**, 673 discovered, 407 existing opt-in skips, zero failures/errors; BUILD SUCCESS |

No PostgreSQL fixture suites were enabled because this task prohibits creating
Booking/Payment/Hold/Ticket test data. The 407 opt-in cases are NOT RUN, not PASS;
no test or application source was weakened. Initial sandbox regression stalled at
Mockito initialization and was stopped; the complete run outside sandbox passed.
The first helper invocation failed during a read-only Next.js readiness GET before
any write transaction or creation attempt. A read-only probe established Java's
HTTP/2 upgrade failure; using HTTP/1.1 fixed the helper. No account/POST operation
was automatically retried after an uncertain result.

## Preservation and limitations

Compared all original row-hash multisets before/after and exact allowed row-count
deltas. Every original record is unchanged, including existing users, assignments,
Bookings, Payments, Tickets, audit/history and authentication records. Exactly one
requested account, onboarding row, consumed invitation, revoked delivery and
assignment were added, plus five authorized onboarding/assignment audits. Normal
verification added one revoked login session and one new STAFF_READ technical
rate bucket. Original database role flags/memberships, function definitions and
object ACLs match before/after. No migration or permission changes.

**Zero Hold, Booking, Payment or Ticket writes**, including regression fixtures.
There are no eligible future OPEN_FOR_BOOKING Showtimes at Cinema 1; the positive
seat-map/Hold-list scenario is NOT RUN. No scheduling/catalog data was manufactured.
Cash/VNPAY sales, check-in and SMTP delivery were outside this verification scope.

## Files and Convention Compliance

Created this report and added the result to [current handoff](../ai/current-handoff.md).
One-time operator/read-only helpers and redacted evidence are in ignored
`backend/target/real-staff-2026-10-31/`. Application source, migrations, dependencies,
environment files and unrelated uncommitted work were preserved; no commit/push.

PASS against [project conventions](../development/project-conventions.md): canonical
development/backend workflows and document/traceability rules followed, dated
kebab-case report, PascalCase helper names, existing domain/API vocabulary. Relevant
approved requirements: BRD v1.3 BR-002/003/053/055; SRS v1.3 FR-AUTH-002/007/008,
FR-ORG-004/005 and FR-AUDIT-003, plus the
[Staff onboarding contract](../api/staff-invitation-administration-contract-v1.0.md).
No requirements, business rules, backend routes or frontend designs changed.
Final source/privacy checks PASS: 1,054 pre-existing files byte-identical; only
additive handoff and this report. HEAD/index, original handoff body, UTF-8 and
local links verified; no supplied password, configured secrets or JWTs in artifacts.

Evidence: [read-only preflight](../../backend/target/real-staff-2026-10-31/preflight.json),
[account/API/preservation result](../../backend/target/real-staff-2026-10-31/result.json),
[regression](../../backend/target/real-staff-2026-10-31/regression-outside-sandbox.log),
[actual startup](../../backend/target/real-staff-2026-10-31/dev.log),
[source/privacy checks](../../backend/target/real-staff-2026-10-31/source-and-privacy-verification.txt).

Stop here. This verification does not authorize a sale or another module.
