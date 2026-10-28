# Manager Staff management contract v1.0

Date: 2026-10-28. Additive backend contract; requires operator-installed V18.
V18 was installed with explicit operator approval and verified against the existing
isolated local database. See the [implementation report](../reports/2026-10-28_manager-staff-management-backend_report.md)
for actual tests and limitations; no deployment is implied.
Historical [Staff administration](staff-invitation-administration-contract-v1.0.md)
and [Manager Cinema operations](manager-cinema-operations-contract-v1.0.md) remain
unchanged.

## 1. Authority and scope

[BRD v1.2](../brd/brd-v1.2.md) BR-002/003/053/055;
[SRS v1.2](../srs/srs-v1.2.md) FR-AUTH-007/008, FR-CINEMA-010,
FR-ORG-002/003/005, FR-AUDIT-003, NFR-SEC-002/003/006;
System Analysis v1.1 UC-MGR-015/016/017; Business Analysis v2.1 §38.
FR-ORG-004 remains implemented by existing ADMIN account status plus scoped
assignment deactivation; no new global Manager account-status permission is inferred.

Only authenticated MANAGER plus a current ACTIVE MANAGER account and currently
effective ACTIVE MANAGER Cinema assignment can use this namespace. Every read
query binds Cinema scope; writes recheck/lock current account and assignments.
Future-only grants do not authorize immediate access. Same JWT does not preserve
authority after revocation. ADMIN uses the existing ADMIN endpoints instead.

Staff resource identity is anchored to an explicit source Cinema: a STAFF
assignment record, current/future/inactive, must already relate that Staff to
that source. No global Staff directory or arbitrary account-ID lookup is exposed.
For a new grant the destination Cinema must also be in current Manager scope.
Adding a grant does not remove an existing grant or transfer a Staff account.
For a status command the exact assignment must match the path Cinema AND Staff;
owning another assignment of that Staff is insufficient.

Initial account provisioning and first placement of a Staff outside the Manager's
existing resource scope remain ADMIN operations. This preserves the requested
resource-ownership boundary rather than exposing unrelated accounts. A Manager
can grant an already scoped Staff another owned Cinema or regrant after inactive
history; each source/destination is independently checked. History access does not
grant Staff admission rights.

## 2. Resources

Prefix: `/api/v1/manager/cinemas/{cinemaId}`. No query parameters.

| Method | Path | Result |
|---|---|---|
| GET | `/staff-assignments` | Complete `Membership[]`, ordered assignment numeric ID; history/future/current rows only for this Cinema |
| GET | `/staff/{staffId}` | `Detail` containing minimal profile and assignment history only for the path Cinema |
| POST | `/staff/{staffId}/cinema-assignments` | `{cinemaId, effectiveAt}`; grant existing scoped Staff to this or another currently owned destination;201 |
| PUT | `/staff/{staffId}/cinema-assignments/{assignmentId}/status` | Exactly `{status: ACTIVE|INACTIVE}`; assignment must belong to the path Cinema;200 |

Existing GET `/staff` is unchanged: current effective ACTIVE STAFF assignments
only, existing response shape/order. The new history collection does not silently
change that old list. No deletion, incremental account registration or bulk command.

DTOs:

- `Profile {id, fullName, email, phone, status}`. Status is the current account
  ACTIVE/BLOCKED value, read-only. No password/onboarding/invitation/outbox fields.
- `Assignment {id, userId, cinemaId, cinemaName, assignmentType, status, effectiveAt}`
  reuses the existing Staff DTO; assignmentType is always STAFF in this API.
- `Membership {staff: Profile, assignment: Assignment}`.
- `Detail {staff: Profile, assignments: Assignment[]}`; this array contains only
  the path Cinema, never an account's unrelated Cinema memberships.

Responses and errors use no-store. Creation Location points to the new destination
Cinema's existing scoped Staff detail. Arrays are complete collections, following
current Manager configuration conventions; no pagination/total count is invented.

## 3. Validation and lifecycle

All path/body identity fields are canonical positive decimal strings within signed
bigint range, never JSON numeric IDs. The actor comes only from the signed JWT
subject. Strict JSON object, exact field set, duplicate/trailing JSON rejection,
64KiB body bound. No role, actor, account status, profile or invitation fields.

Creation body has exactly `cinemaId` (destination) and `effectiveAt` (explicit
offset ISO-8601 instant, year1–9999, at most microsecond precision). Response UTC.
Creation is ACTIVE even when future-effective. The existing registered STAFF
account/onboarding prerequisite of the protected ADMIN assignment writer remains.
BLOCKED accounts can receive assignments; this does not activate them or bypass
password setup/ADMIN activation. Existing Staff check-in gates remain authoritative.

Status is ACTIVE or INACTIVE. Identity, Staff/Cinema/type and original effectiveAt
are immutable. Reactivation retains the original timestamp, including future
dates. Duplicate ACTIVE assignments use the existing database uniqueness rule
and return409. Existing Staff same-status behavior/audit is preserved; no new
idempotency or retry policy. A rejected or uncertain command is not automatically
replayed; clients must explicitly read current state before deciding another write.

## 4. Protected writer and concurrency

V18 adds no table, role or membership. It extracts the unchanged domain body of
V13 `staff_assign_cinema` into private `staff_apply_assignment` using verified
source anchors. The existing ADMIN function keeps its signature/owner/ACL and
`staff_lock_admin` authorization, then delegates to this shared domain core.
The core is executable only by the protected Staff owner, not runtime/PUBLIC.

New `manager_assign_staff(actor, sourceCinema, staff, destinationCinema,
effectiveAt, assignmentId, status)` is SECURITY DEFINER, owned by existing NOLOGIN
`smart_cinema_staff_owner`, fixed `search_path=pg_catalog,pg_temp`, fully qualified
objects and no PUBLIC EXECUTE. Only this new wrapper receives runtime EXECUTE.
No runtime direct assignment/account DML, owner membership or raw-core access.

Writes take sorted actor/Staff User locks like existing Staff administration,
then current source/destination Manager assignment SHARE locks, followed by the
existing shared domain writer's Cinema/assignment locks. ADMIN revocation takes
the same Manager User lock, so winning writes finish before revocation commits;
a committed revocation causes waiting/subsequent writes to fail. Target User lock
also serializes Staff role/account administration. No client scope flag or GUC is
trusted. Read-only REPEATABLE READ snapshots are advisory; commands use READ
COMMITTED and revalidate. Existing10s transaction/5s statement/2s lock bounds apply.

Assignment mutation and existing `ASSIGNMENT_GRANTED/ACTIVE/INACTIVE` audit append
are atomic, with real Manager actor, resource CINEMA_ASSIGNMENT, user_id/cinema_id
metadata. Existing append-only audit guard and domain constraints are unchanged.
Rollback removes both assignment change and audit. No financial authority added.

## 5. Errors and explicit exclusions

400: malformed fields/IDs/precision/status/query;401: invalid/missing auth;
403: wrong role, blocked/current invalid Manager or no effective scope;
404: foreign/missing source/destination/Staff/nested assignment, uniformly;
409: active duplicate, integrity conflict or bounded contention;
503: unexpected database/transaction infrastructure failure. Existing safe Manager
ProblemDetail mapping reused, without raw SQL, PII or private payloads.

No Manager account creation/invitation/reissue, profile edit, global activation/
blocking, role change, arbitrary unassigned Staff lookup or chain-wide history.
Requirements do not explicitly delegate these ADMIN account workflows; with a
multi-Cinema Staff they would affect unrelated scope. Existing ADMIN invitation
encryption, password setup, delivery/retry/expiry/rate limits and status policy
are preserved without cloning or bypassing them. No email-success claim.
No HR/POS/shifts/attendance/payroll, frontend, Manager Booking/Reporting/Dashboard,
provider integration, deployment or schema repair.
