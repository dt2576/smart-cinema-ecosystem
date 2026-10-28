# Manager Cinema operations contract v1.0

Implementation: 2026-10-27; final verification: 2026-10-28. Backend-only additive
contract. This enables the previously deferred Manager scope in the historical
[Cinema configuration](admin-cinema-configuration-contract-v1.0.md) and
[Showtime](admin-showtime-contract-v1.0.md) contracts; their ADMIN and Customer
contracts remain unchanged. No Manager frontend, reporting or dashboard is included.

## 1. Authority and authorization

[BRD v1.2](../brd/brd-v1.2.md): BR-002/003, BR-009–015, BR-054/055.
[SRS v1.2](../srs/srs-v1.2.md): FR-AUTH-007/008, FR-CINEMA-006–010,
FR-SEAT-002/003/017, FR-SHOWTIME-001–010, FR-ORG-001/003/005,
FR-AUDIT-002/003, NFR-SEC-002/003/006. The Staff capability here is read-only;
broader Manager Staff assignment/account operations are outside this slice.

Manager endpoints require a signed MANAGER Bearer JWT, a current ACTIVE MANAGER
database account, and at least one ACTIVE MANAGER Cinema assignment whose
`effectiveAt` is not in the future. Every resource query also enforces its actual
Cinema ancestry. Role alone and client-supplied Cinema IDs grant no authority.
Scope is evaluated again on each request; revocation affects subsequent requests.
Multiple assignments are supported by the existing model. Account activation is
separate from assignments. Cinema status is returned as stored; it does not create
an additional assignment rule. Existing domain readiness gates still apply.

No effective assignment or invalid current account: 403. With valid current scope,
a missing or foreign resource, including an explicit foreign Cinema/Hall filter,
returns 404. These cases do not disclose whether a foreign resource exists.
ADMIN, CUSTOMER and STAFF cannot enter the MANAGER namespace.

All identity fields are canonical positive decimal **strings**, within signed
bigint range; leading zeroes, signs, whitespace and JSON numeric IDs are rejected.
Money is exact decimal text. Counts/capacity remain integers. Instants use ISO-8601
with explicit offset; responses serialize instants in UTC. Responses use no-store.

## 2. Manager resources

Paths below are relative to `/api/v1/manager`.

| Method | Path | Response |
|---|---|---|
| GET | `/cinemas` | Assigned Cinemas array, numeric ID order |
| GET | `/cinemas/{cinemaId}` | Assigned Cinema |
| GET | `/cinemas/{cinemaId}/halls` | Halls array, numeric ID order |
| POST | `/cinemas/{cinemaId}/halls` | Created Hall, 201 |
| GET | `/halls/{hallId}` | Scoped Hall |
| PUT | `/halls/{hallId}` | Updated Hall |
| GET | `/halls/{hallId}/seats` | Whole physical Seat Units array |
| POST | `/halls/{hallId}/seats` | Atomic complete initial layout array, 201 |
| GET | `/seats/{seatId}` | Scoped Seat Unit |
| PUT | `/seats/{seatId}` | Updated Seat Unit |
| GET | `/cinemas/{cinemaId}/staff` | Current scoped Staff array, user ID order |
| GET | `/showtimes` | `{timeZone, items}` |
| GET | `/showtimes/{showtimeId}` | `{timeZone, showtime}` |
| POST | `/showtimes` | Created `{timeZone, showtime}`, 201 |
| PUT | `/showtimes/{showtimeId}` | Updated `{timeZone, showtime}` |

Creation responses include Location. There are no DELETE endpoints. Collections
are complete arrays, without invented pagination. Only Showtime list accepts
query parameters: `date`, `movieId`, `cinemaId`, `hallId`, `status`, using existing
Showtime validation and configured discovery time zone. Unknown/repeated keys
fail 400; other operations accept no query parameters. Showtime order is start
instant, then numeric ID. Seat order is row label, number label, numeric ID.

### Shared configuration DTOs and writers

The existing ADMIN validators, response records and protected SQL domain writers
are reused, rather than copying layout, pricing or lifecycle rules:

- Cinema response: `id`, `name`, `address`, `contact`, `operatingInformation`,
  `status`. Read only; no Manager Cinema mutation.
- Hall input: `name` (nonblank, max100), `capacity` (positive int32 people),
  `type` (nonblank text, max50), `status` (ACTIVE/MAINTENANCE/INACTIVE).
  Response adds `id`, `cinemaId`, `layoutInitialized`. Parent is permanent.
- Seat input: `row`, `number` (nonblank labels, max20 each), `type`
  (STANDARD/VIP/COUPLE), `physicalStatus` (ACTIVE/MAINTENANCE/INACTIVE).
  Response adds `id`, `hallId`, `guestCapacity`, `structureEditable`.
  Initial layout body is exactly `{ "units": [SeatInput, ...] }`, nonempty.
  Existing duplicate/range-overlap and people-capacity checks apply atomically.
  Initialization requires an empty Hall; capacity freezes once Seats exist.
  A COUPLE Unit has capacity2 and remains one Seat identity. Structural changes
  remain prohibited once referenced; physical status is a separate safe change.
- Showtime body: `movieId`, `hallId`, `startsAt`, `basePrice`, `status`.
  `startsAt` has explicit offset and at most microsecond precision.
  `basePrice` is nonnegative decimal text below1000000000000000, scale≤4.
  Authoring statuses: DRAFT/SCHEDULED/OPEN_FOR_BOOKING/CANCELLED; initial CANCELLED
  is not allowed. Response fields and lifecycle are exactly the existing
  [Showtime contract](admin-showtime-contract-v1.0.md#authoring-and-lifecycle).
  PUBLISHED Movie, eligible parents/layout, duration, overlap, immutable Hall,
  Hold/Booking history and cancellation restrictions remain protected.
  No Manager STARTED/ENDED command, Booking rewrite or automatic transition.
- Staff response: `id`, `fullName`, `email`, `phone`, `status`, `assignmentId`,
  `effectiveAt`. Only effective ACTIVE STAFF assignments and current STAFF role
  in the assigned Cinema are included. Account status can be ACTIVE or BLOCKED;
  this projection does not grant Staff access. No password/invitation/delivery
  details, mutation, HR fields or permissions are exposed.

JSON must be an object, ≤1MiB. Duplicate keys, trailing JSON, unknown fields and
invalid required values fail 400. Request actor fields are unsupported; the
authenticated subject supplies actor identity. Derived fields are not accepted.
`editable`, `transitions` and `structureEditable` are advisory; writes revalidate.
Published Movie discovery already exists; no duplicate Manager Movie catalog or
Movie-authoring privilege is added.

## 3. Minimal ADMIN Manager assignment resources

All four endpoints require signed ADMIN JWT and current ACTIVE ADMIN account.
These manage existing MANAGER accounts only; no account creation or role/status API.
Paths below are relative to `/api/v1/admin/managers`; no query parameters.

| Method | Path | Body/result |
|---|---|---|
| GET | base | Array `{id, fullName, email, phone, status}`, numeric ID order |
| GET | `/{managerId}/cinema-assignments` | All MANAGER assignments, including inactive/future, ID order |
| POST | `/{managerId}/cinema-assignments` | Exactly `{cinemaId, effectiveAt}`; 201 + Location |
| PUT | `/{managerId}/cinema-assignments/{assignmentId}/status` | Exactly `{status: "ACTIVE" | "INACTIVE"}`; 200 |

Assignment response: `id`, `userId`, `cinemaId`, `cinemaName`, `assignmentType`
(`MANAGER`), `status`, `effectiveAt`. `effectiveAt` requires an offset, year1–9999
and microsecond-or-coarser precision. It may be future-effective; such a grant
does not authorize immediate access. Creation is ACTIVE; target must already
have MANAGER role. A BLOCKED target remains BLOCKED and denied.

Identity, type and effectiveAt are immutable. Status changes retain the same
row/history; reassignment is deactivate old plus create a new grant. Duplicate
ACTIVE scope uses the existing uniqueness rule and returns409. A same-status
command returns the existing row without an additional audit record. Foreign
assignment parent or non-MANAGER target returns404. No self-grant by Manager.

## 4. Transactions, database and audit

V17 is forward-only and operator installed. No new table, role, membership or
runtime table DML is introduced. New SECURITY DEFINER routines belong to existing
NOLOGIN `smart_cinema_staff_owner`, fixed search_path `pg_catalog,pg_temp`,
schema-qualified bodies and no PUBLIC EXECUTE:

- `lock_cinema_configuration(bigint,bigint)` and
  `record_manager_configuration(bigint,bigint,text,bigint,text)` are executable
  only by the existing configuration owner, not runtime.
- `admin_assign_manager(bigint,bigint,bigint,timestamptz,bigint,text)` is the only
  new runtime wrapper. The existing canonical runtime group receives EXECUTE;
  the isolated local runtime receives the separately approved direct EXECUTE.

Four existing Hall/layout/Seat/Showtime writers use the locked scoped actor
check. Existing ADMIN authority, domain locks and integrity guards remain.
Writes lock current actor and effective assignment until transaction end.
ADMIN assignment changes serialize through sorted user locks and the existing
Cinema/assignment locks. A committed revocation denies a waiting/subsequent
Manager write; a write that wins its lock can finish before revocation commits.
No frontend scope claims participate in this decision.

Reads use read-only REPEATABLE READ; commands use READ COMMITTED. Transaction
timeout10s, statement timeout5s and lock timeout2s bound contention. Read results
are snapshots, not future write authorization. No idempotency/retry contract is
introduced; after uncertain mutation delivery, read persisted state before
deciding whether another explicit command is safe.

Manager writes atomically append existing `audit_records` events:
`MANAGER_HALL_CREATED/UPDATED`, `MANAGER_SEAT_LAYOUT_INITIALIZED`,
`MANAGER_SEAT_UPDATED`, `MANAGER_SHOWTIME_CREATED/UPDATED/CANCELLED`.
Metadata contains string `cinema_id`; actor/time/resource use existing columns.
Assignment events reuse `ASSIGNMENT_GRANTED/ACTIVE/INACTIVE`, type
`CINEMA_ASSIGNMENT`, Manager identity metadata. Rollback removes mutation and
audit together. Existing audit guard is extended only with these nonfinancial
Manager events; Payment/Ticket/Booking finalization is not changed.

## 5. Errors and exclusions

| Status | Meaning |
|---|---|
| 400 | Invalid IDs, fields, JSON, dates, precision or query |
| 401 | No valid authentication; existing security response |
| 403 | Wrong namespace role, invalid current account or no effective scope |
| 404 | Missing/foreign scoped resource or invalid assignment parent |
| 409 | Duplicate assignment, protected history/layout/schedule, transition or bounded contention |
| 503 | Unexpected database/transaction unavailability |

Controller errors use safe no-store ProblemDetail without SQL, secrets or raw
payloads. Existing security handles401/403; framework media-type/method errors
retain standard behavior. No new rate limit or automatic mutation replay exists.

No Manager Staff mutation, Movie/Cinema authoring, account provisioning, Booking
history, check-in, Payment, Ticket issuance, deletion, reporting or dashboard.
No financial or provider behavior changes. Frontend integration is a separate task.
