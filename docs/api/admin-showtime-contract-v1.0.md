# Admin Showtime contract v1.0

## Scope and authority

Approved 2026-10-02: global ACTIVE ADMIN authoring only. Implements SRS v1.2
FR-SHOWTIME-001–010, FR-AUTH-007 and FR-AUDIT-002 within the approved MVP
boundary. Manager authoring, Delete, refund and time-progression automation are
excluded. This additive contract preserves historical Discovery/Seat contracts.

Every endpoint requires a signed ADMIN JWT and independently checks current
database ACTIVE ADMIN identity. Anonymous: 401; other roles, blocked or stale
Admin: 403. Responses use `Cache-Control: no-store` and existing ProblemDetail.

## Resources

| Method/path | Behavior |
|---|---|
| GET /api/v1/admin/showtimes | Complete deterministic list, ordered startsAt then bigint ID |
| GET /api/v1/admin/showtimes/{showtimeId} | Historical/current detail |
| POST /api/v1/admin/showtimes | Atomic create + complete authoritative membership; 201 + Location |
| PUT /api/v1/admin/showtimes/{showtimeId} | Full safe update or forward lifecycle transition |

No DELETE. Optional list filters: `date` (strict yyyy-MM-dd), `movieId`,
`cinemaId`, `hallId`, `status`. Unknown/repeated query keys fail 400. Detail and
write accept no query parameters. IDs are positive decimal strings, never JS
numbers. Date filtering uses configured `DISCOVERY_TIME_ZONE` local midnight
through next midnight, default `Asia/Ho_Chi_Minh`; instants are UTC ISO-8601.

List envelope: `{ timeZone, items }`; detail/create/update: `{ timeZone, showtime }`.
Showtime projection: `id`, `movieId`, `movieTitle`, `cinemaId`, `cinemaName`,
`hallId`, `hallName`, `startsAt`, `endsAt`, `occupiedUntil`, `bookingCutOff`,
`basePrice` (exact decimal string), `status`, `editable`, `transitions`.
Editable/transitions are advisory; the locked writer always revalidates.

Write body contains exactly:

```json
{
  "movieId": "2",
  "hallId": "1",
  "startsAt": "2030-01-02T03:00:00Z",
  "basePrice": "90000.1234",
  "status": "DRAFT"
}
```

`startsAt` requires explicit offset, finite future time and at most six fractional
digits. `basePrice` is a plain nonnegative decimal string, at most four fractional
digits and less than 1000000000000000; zero/fractions remain supported. No
floating money or VNPAY conversion rules. Cinema/end/occupancy/cutoff/actor are
server-derived; unknown fields fail 400.

## Authoring and lifecycle

Create/edit requires PUBLISHED Movie, ACTIVE Cinema/Hall, complete physical
layout and matching guest capacity. Initial DRAFT/SCHEDULED/OPEN_FOR_BOOKING are
allowed; OPEN requires at least one ACTIVE sellable membership. All physical
units are represented; maintenance/inactive units are nonsellable. One COUPLE
record and membership represent two guests. Hall is permanent after membership.

New or Movie/start-changed authoring calculates persisted Movie duration:
`end_time = start_time + duration minutes`, `occupied_until = end_time`,
`booking_cut_off = start_time`. No invented buffer/cutoff configuration. A later
Movie duration change does not rewrite saved times. Price/status-only edits
preserve existing stored end/occupancy/cutoff, including historical seed values.

| Current | Allowed next (plus unchanged state for safe content edits) |
|---|---|
| DRAFT | SCHEDULED, OPEN_FOR_BOOKING, CANCELLED |
| SCHEDULED | OPEN_FOR_BOOKING, CANCELLED |
| OPEN_FOR_BOOKING | CANCELLED |
| STARTED / ENDED / CANCELLED | None |

No Admin STARTED/ENDED, regressions or cancelled reopening. Existing past or
terminal rows remain readable. Any Hold or Booking history, including released
or expired Holds, rejects commercial/schedule/lifecycle mutations. Cancellation
requires future/unreferenced Showtime and unchanged content; it can safely
disable an unreferenced row even if its parent subsequently became ineligible.
No releases, repricing, refunds or financial changes occur.

## PostgreSQL boundary and errors

[V12](../../backend/src/main/resources/db/migration/V12__guard_admin_showtime_configuration.sql)
adds guarded configuration-owner routines. Runtime gets only intended writer
EXECUTE, no direct Showtime/membership DML or initializer EXECUTE, owner
membership or SET access. Fixed search_path and schema-qualified bodies;
PUBLIC execution revoked. Managed ownership bootstrap is revoked after migration.

Lock order: active actor → Cinema SHARE → Hall exclusive → existing Showtime →
Movie SHARE → ordered physical Seats → ordered membership pairs. For create,
the new uncommitted Showtime is inserted after parent/layout checks; the private
initializer runs in that same transaction under already-held parent locks.
Hall-exclusive coordination serializes layout authoring against discovery
transaction gates. Existing exclusion `ex_showtimes_hall_occupancy` remains the
final backstop: half-open `[start_time, occupied_until)` allows exact touching
boundaries, rejects same-Hall overlap and permits different-Hall overlap.

400: malformed/strict input; 404: missing requested Admin resource; 409: overlap,
history, readiness, transition, stale time or bounded contention; 403: current
actor invalid. Unexpected database failures return safe 503; no raw SQL/private
payload. Successful mutations use existing after-commit actor/resource/action
technical audit; rollback emits no success audit. No durable audit subsystem.

## Customer integration and deferred work

Customer browsing uses existing public GET cinemas, showtimes/detail and Seat
map APIs. Only PUBLISHED + ACTIVE parents + OPEN_FOR_BOOKING + future start and
cutoff are public. No inferred seat counts, format, price or sold-out Showtime
flag. The returned discovery IANA zone governs display/date selection.

Seat map reports authoritative AVAILABLE/HELD/BOOKED/UNAVAILABLE and whole
STANDARD/VIP/COUPLE identities. Layout renders ordered row/number labels; it does
not invent persisted physical coordinates. UI selection/countdown remains local,
explicitly creates no Hold/reservation. Concession onward, Booking, Payment,
VNPAY, history/Ticket/QR adapters remain preview-only. No transactional frontend
integration is authorized by this contract. See [developer guide](../development/admin-showtime-management.md).
