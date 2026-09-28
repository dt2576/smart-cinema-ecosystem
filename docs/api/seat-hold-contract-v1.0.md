# Seat and Seat Hold Contract v1.0

Date: 2026-09-28. Status: implemented **unattached Hold** backend slice. Booking, sales and frontend integration remain separate.

## 1. Authority and scope decision

Sources: [SRS v1.2](../srs/srs-v1.2.md) FR-SEAT-001/003–012/016/017, FR-SHOWTIME-008, NFR-CONC-001/005/006/007, [BRD v1.2](../brd/brd-v1.2.md) BR-017–024, [database decisions](../db/database-design-decisions-v1.0.md), [physical dictionary](../db/physical-data-dictionary-v1.0.md), [integrity enforcement](../db/integrity-enforcement-design-v1.0.md) and [Customer discovery contract](customer-discovery-contract-v1.0.md).

The user explicitly confirmed “Giữ ranh giới, không tạo Booking” after reviewing the conflict between requested BOOKED protection and the absent `booking_seats.sold_at` authority. Accordingly:

- V5 creates physical Seats, showtime_seats and unattached seat_holds only.
- `booking_id` is present for the approved future model but constrained to NULL. CONSUMED is blocked by the stage constraint; no dangling Booking identifier is permitted.
- No real BOOKED state can exist in this schema stage. No temporary sold flag, fake Booking table or CONSUMED-as-BOOKED shortcut is introduced.
- Before any Booking/sale writer is enabled, a forward migration must add the approved Booking references, sale predicate, attachment/consumption guards and aggregate assertions together. **Real BOOKED rejection and its concurrency test are deferred by the explicit scope decision.**

PostgreSQL is the sole authority. Browser countdowns, request times and Redis do not grant or renew ownership. No Payment, Ticket, QR or admin HTTP endpoint is added.

## 2. Resources and access

| Operation | Access | Result |
|---|---|---|
| `GET /api/v1/showtimes/{showtimeId}/seats` | Public | SeatMapResponse |
| `POST /api/v1/showtimes/{showtimeId}/seat-holds` | Authenticated active CUSTOMER | Atomically acquire requested units; SeatHoldBatch, 200 |
| `GET /api/v1/showtimes/{showtimeId}/seat-holds` | Authenticated active CUSTOMER | Only caller's currently usable, unexpired ACTIVE Holds; SeatHoldBatch |
| `DELETE /api/v1/showtimes/{showtimeId}/seat-holds/{holdId}` | Authenticated active CUSTOMER owning that Hold | 204, retained history |

JWT subject identifies the Customer; no userId is accepted from the browser. Both the token role and current database User role/status are checked. Deleted, BLOCKED or non-CUSTOMER accounts cannot acquire/release through a stale Customer token. Admin/Staff/Manager cannot bypass customer ownership. Auth token handling otherwise remains unchanged.

Anonymous Seat reads expose no owner ID, Hold ID or expiry of another Customer. Authenticated public reads return the same public projection. GET own Holds provides the owner's identities/deadlines so a client can reconstruct its selection after a retry/reload. Unknown/ineligible Showtime IDs produce an empty own-Hold list when no usable owned entitlement exists; this read is not a resource-existence oracle. Invalid supplied Bearer credentials follow existing 401 security handling even on public reads.

All operations reject query parameters. Successful responses use `Cache-Control: no-store`. There is no write permission on a public GET, and no CSRF exemption beyond the authenticated Bearer acquire/release paths.

## 3. Seat map and unit semantics

SeatMapResponse contains `showtimeId`, `movieId`, `cinemaId`, `hallId`, `serverTime`, and `units`. IDs are decimal strings. Unit fields:

```json
{
  "id":"9007199254740993",
  "row":"H",
  "number":"9-10",
  "type":"COUPLE",
  "guestCount":2,
  "availability":"AVAILABLE"
}
```

STANDARD and VIP represent one guest; COUPLE represents two guests and exactly **one selectable identity, one Hold and one future purchased unit**. No half-seat ID, per-guest Hold, VIP pricing or special VIP behavior exists. Capacity is derived from the approved type meaning, not an added column. Guest count and type cannot be overridden in a Hold request.

Units include the Hall's physical records, ordered by row and number using PostgreSQL C collation, then numeric ID. These are labels, not numeric seat positions: e.g. `10` may sort before `2`. The approved model does not contain aisle geometry/column coordinates, so the API does not invent the frontend mock's `column` field. A future layout presentation contract may refine ordering/geometry separately.

Derived availability at the response's sampled PostgreSQL serverTime:

1. Missing showtime_seats membership, `is_sellable=false`, or physical MAINTENANCE/INACTIVE → UNAVAILABLE.
2. Otherwise an ACTIVE Hold with `expires_at > serverTime` → HELD.
3. Otherwise → AVAILABLE.

There is no stored AVAILABLE/HELD/BOOKED lifecycle on Seat or Showtime. An expired stored ACTIVE row is no longer HELD in reads. The same physical unit at separate Showtimes has separate memberships/Holds. Empty configured Hall data returns an empty units array; absence never becomes implicit sellability.

The Showtime must still satisfy the complete discovery predicate: PUBLISHED Movie, ACTIVE Cinema and Hall, OPEN_FOR_BOOKING Showtime, future start and future booking cutoff. The public map returns 404 for missing/hidden/closed/started context. Hold commands recheck the same predicate using PostgreSQL time after waiting for locks; they do not reuse a prior discovery response.

## 4. Acquire contract

The entire JSON object must contain exactly one field:

```json
{"seatIds":["9007199254740993","9007199254740994"]}
```

The array must be nonempty. Each element must be a JSON string containing 1–19 ASCII digits with numeric value 1–9223372036854775807. Path IDs use the same numeric syntax. Leading zeros normalize to the same identity; `"1"` and `"01"` are duplicates and rejected. JSON numbers, nulls, fractions, negative/overflow IDs, duplicates and additional fields such as userId, expiresAt, TTL, guestCount or status return 400. No browser clock or prior availability claim is accepted.

All requested identities must be configured sellable, physically ACTIVE units for this exact Showtime/Hall. Foreign/missing/unconfigured units, stale conflicts and another owner's valid Hold return a safe 409. No owner identity or partial successful subset is returned. All new Holds and lifecycle changes in a failed command roll back together.

Each new grant has one record per unit and common server creation/deadline. Default TTL is ten minutes. Expiry is capped at the earlier Showtime start/booking cutoff. The write accepts only a positive interval remaining at the final decision.

Same-owner retries return existing valid unattached Holds with identical IDs and original expiresAt; they do not renew them. When a request mixes new units with existing valid owned units, new units use no later than the earliest existing deadline in that request. Existing records never change expiry. Independent batches can have different deadlines; a future Booking must respect the earliest participating Hold expiry.

Expired ACTIVE rows for the requested pairs are retired under the gate before replacement. Reacquisition after expiry is a new grant with new Hold IDs if the context is still eligible; no indefinite transport-idempotency key is defined. A client must reload after a timeout/expiry rather than assume the old entitlement survived. GET own Holds resolves a response lost after commit without renewing anything.

SeatHoldBatch example:

```json
{
  "serverTime":"2030-01-01T02:00:00.123456Z",
  "holds":[{
    "id":"9007199254740995",
    "showtimeId":"12",
    "seatId":"9007199254740993",
    "createdAt":"2030-01-01T02:00:00.120000Z",
    "expiresAt":"2030-01-01T02:10:00.120000Z",
    "status":"ACTIVE"
  }]
}
```

Actual response timing can be slightly later than the accepted instant; expiry is authoritative even if transport delay consumes the remaining interval. Never replace expiresAt with “browser now + TTL”. IDs, including Hold/User subjects beyond JavaScript's safe integer range, remain strings at the API boundary; this does not fix the separate legacy Auth login DTO's numeric userId.

## 5. Release and expiry

Release uses exact Showtime + Hold ID + authenticated owner. Missing, foreign-Showtime and another owner's IDs all return 404. ACTIVE becomes RELEASED, or EXPIRED if its deadline has already elapsed. Releasing the same owned terminal record is idempotent 204. No row is deleted. Releasing an old expired ID after reacquisition cannot touch the new Hold, even on the same unit.

Release remains possible when the Cinema closes or Showtime starts, provided the account is still an active Customer. These conditions block new acquisition, not safe removal of an existing entitlement. No independent release of an attached Hold will be enabled without the future whole-Booking lifecycle.

The scheduled cleanup discovers a bounded set of Showtimes with elapsed ACTIVE Holds, then calls the guarded expiry routine in a separate transaction for each Showtime. It retains rows as EXPIRED. Multiple workers are safe under the same gate, and an old candidate cannot release a newer unexpired Hold. No HTTP system-expiry endpoint exists. Reads and reacquisition remain correct if cleanup is delayed or disabled.

No realtime event transport/outbox was added. Until that separately authorized integration exists, clients must reload the authoritative map/own Holds; expiry correctness does not depend on notification delivery.

## 6. Errors

All application errors follow existing application/problem+json conventions with safe status/title/detail. Input validation also supplies `errors` keyed by field where applicable.

| Condition | HTTP / title |
|---|---|
| Invalid IDs, body, duplicate normalized units or query parameters | 400 / Invalid request |
| Missing authentication or invalid Bearer token | 401 / existing security ProblemDetail |
| Non-Customer token or inactive/mismatched database account | 403 / Access denied |
| Unavailable Showtime, absent/foreign Hold | 404 / Resource unavailable |
| Unavailable/stale/foreign unit, another owner, uniqueness conflict or deadline crossed during the command | 409 / Seat selection conflict |
| Bounded lock/statement timeout, deadlock or serialization retry condition | 409 / Seat Hold contention |
| Other database/service failure | 503 / Seat service unavailable |

The application performs no automatic acquisition retries. Reload and retry are explicit; a successful committed retry preserves any still-valid same-owner records. SQLSTATE mapping is internal, not a disclosure of SQL, schema details or owner identities. No fallback grant is possible while PostgreSQL is unavailable.

## 7. Transaction and permissions design

New writes execute PostgreSQL SECURITY DEFINER routines under a separate NOLOGIN `smart_cinema_hold_owner`. Routine bodies use schema-qualified objects and fixed `search_path=pg_catalog,pg_temp`; public EXECUTE is revoked. The migration qualifies the actual Flyway schema, including isolated upgrade-test schemas.

`smart_cinema_hold_runtime` is a NOLOGIN grant role with SELECT and only acquire/release/expiry EXECUTE on this domain. It has no direct INSERT/UPDATE/DELETE/TRUNCATE, trigger-disable privilege, internal lock helper execution or initial-configuration execution. The trusted backend binds the authenticated user; database credentials/routine execution must never be exposed to customers. Table owner/superuser operational power remains outside this protection boundary.

READ COMMITTED writes follow User SHARE → Cinema SHARE → Hall SHARE → Showtime UPDATE → physical Seats SHARE → showtime_seats UPDATE → Hold UPDATE, ascending IDs within each level. Movie SHARE protects publication from changing during the eligibility decision; Movie catalog-only writers must not acquire these later resources. Context identities are reread after locks. Cleanup omits the actor lock and uses the same parent/gate/pair order. A fresh `clock_timestamp()` after locks governs validity; transaction-start time is not authority.

Partial unique index `uq_seat_holds_active_pair` is the exclusive ACTIVE-row backstop. Expiry is a timestamp predicate plus guarded retirement, never an index predicate involving current time. Guards reject immutable Hold identity/owner/time changes, reopening terminal Holds and deletion. Composite FKs prove Showtime/Seat/Hall membership. Public read projections use a read-only repeatable snapshot and sampled database time, without taking the write gate.

V5 retains the approved columns/types/checks/indexes. The additional stage check forbids Booking attachment/consumption until its referenced tables/guards exist. Once history exists, screening identity/time changes are blocked; initialized Hall membership/capacity cannot be changed by this slice. Runtime physical configuration is intentionally immutable here.

## 8. Initial configuration and deployment

There is no admin CRUD API. Migration/deployment operators can invoke the restricted initialization routines:

- `initialize_hall_seats(hall_id, units_jsonb)` installs a nonempty initial layout once. Each object supplies row, number, type, physicalStatus. Required fields, allowed types/statuses, unique labels and total guest capacity equal to Hall capacity are enforced atomically.
- `initialize_showtime_seats(showtime_id, sellable_seat_ids_bigint_array)` installs exactly one membership for every existing Hall unit once. The explicit ID set enables only those units; an empty set enables none. Foreign/duplicate IDs and reinitialization are rejected.

These routines are not granted to the runtime role. They coordinate configuration with Cinema/Hall/Showtime locks. No seed data or ID list is embedded in migrations. The model stores labels, not geometric spans: an operator must still approve a physically non-overlapping layout. Label uniqueness alone does not detect a misleading combination such as H9-10 plus H9/H10. The API never splits a stored COUPLE record.

Migration credentials require role-creation/ownership-transfer privileges, or an operator must preprovision the specified NOLOGIN roles and suitable deployment permissions. Existing application Auth access is not revoked or rewritten. Production must use separate migration credentials and a non-owner, non-superuser backend login granted `smart_cinema_hold_runtime` plus its existing Auth/catalog permissions. Use existing DB configuration and Spring's separate Flyway credentials; never run the production application as the table owner or postgres superuser. Local integration uses deployment credentials plus explicit restricted-role permission tests; it does not certify a deployed production credential setup.

| Environment variable | Default | Meaning |
|---|---|---|
| SEAT_HOLD_TTL | PT10M | Server-selected grant duration, capped by cutoff |
| SEAT_HOLD_LOCK_TIMEOUT | PT2S | Maximum lock wait |
| SEAT_HOLD_STATEMENT_TIMEOUT | PT5S | Maximum statement time |
| SEAT_HOLD_IDLE_TIMEOUT | PT10S | Idle-in-transaction bound |
| SEAT_HOLD_CLEANUP_ENABLED | true | Enable scheduled retirement |
| SEAT_HOLD_CLEANUP_DELAY | PT30S | Initial/fixed delay |
| SEAT_HOLD_CLEANUP_BATCH_SIZE | 100 | Maximum candidate Showtimes per sweep |

Durations must be positive and at least one millisecond; PostgreSQL timeout values must fit its millisecond integer range and lock timeout cannot exceed statement timeout. Cleanup batch size must be positive. The operational delay/timeouts are not the TTL. Direct operational routine callers must also set transaction-local timeouts and follow the protected interface.

## 9. Remaining Booking and frontend integration

Before Booking or any successful sale is enabled:

1. Add Booking/Booking Seat origin FKs and deferred aggregate assertions; replace the unattached-stage constraint together with controlled attachment/consumption routines.
2. Incorporate the authoritative sold marker into both Seat projection and acquisition validation under the same gate, and prove real BOOKED rejection/no double sale with concurrent PostgreSQL tests.
3. Expire/cancel attached entitlements through the whole Booking aggregate; never reuse this unattached cleanup as a per-line Booking expiry operation.
4. Enforce deadlines, owner identity, price snapshots and first-payment composition freeze through their approved contracts.

The current frontend preview is unchanged. Future integration must replace its local countdown/fixtures with these APIs, consume HELD and VIP data without inventing behavior, preserve whole-unit IDs, use the returned expiresAt and obtain layout presentation rules without guessing geometry. Realtime delivery, full Seat administration, production load/NFR latency measurement and production role provisioning remain separate work.

Verification and traceability: [implementation report](../reports/2026-09-28_seat-hold-backend_report.md).
