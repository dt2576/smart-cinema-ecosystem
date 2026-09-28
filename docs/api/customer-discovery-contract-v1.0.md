# Customer Discovery Contract v1.0

Date: 2026-09-28. Status: implemented backend read slice; Customer UI adapters remain local mocks.

## 1. Scope and authority

This contract implements Movie → Cinema → Showtime discovery from [SRS v1.2](../srs/srs-v1.2.md) FR-MOVIE-008, FR-CINEMA-001/002/005/008, FR-SHOWTIME-006/008/010, [BRD v1.2](../brd/brd-v1.2.md) BR-010/015/016, and [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md). The [physical dictionary](../db/physical-data-dictionary-v1.0.md) and [integrity design](../db/integrity-enforcement-design-v1.0.md) govern persistence. [Movie](movie-service-contract-v1.0.md) and [Genre](genre-options-contract-v1.0.md) contracts remain unchanged.

Public GET access, response projections, deterministic ordering, date envelope and 404 behavior below are service decisions made within the authorized contract-definition task. They supplement requirements; they do not amend BRD/SRS. Read permission never authorizes a sale or proves Seat availability.

## 2. Customer visibility and eligibility

All four GET operations are public, allowing the existing anonymous Movie discovery journey to continue. No role, assignment or login is required; authenticated Customer/Staff/Manager/Admin see the same projection without a hidden-resource bypass. A supplied invalid Bearer credential still receives the existing 401 ProblemDetail from security; omit the header for anonymous browsing. No write or administrative route is introduced.

Cinema list/detail requires `cinemas.status = ACTIVE`. TEMPORARILY_CLOSED and INACTIVE are hidden, including detail. A Cinema can have no eligible Showtimes and still have public branch information.

Every returned Showtime, every discovery date, and every Movie-filtered Cinema uses the same predicate:

- Movie status is PUBLISHED; no inference from release date.
- Cinema status is ACTIVE.
- Hall status is ACTIVE; MAINTENANCE/INACTIVE are excluded.
- Showtime status is OPEN_FOR_BOOKING. DRAFT, SCHEDULED, STARTED, ENDED and CANCELLED are excluded.
- `start_time > serverTime` AND `booking_cut_off > serverTime`. Equality is closed. The approved database constraint also requires cutoff <= start.

No background lifecycle worker is needed to hide a started Showtime. A stored OPEN_FOR_BOOKING row can be past its deadline and is then hidden. No lifecycle mutation occurs on reads. SCHEDULED is not exposed as a disabled customer option in this minimal selectable-discovery contract.

## 3. Operations

| Public GET | Inputs | Response |
|---|---|---|
| `/api/v1/cinemas` | Optional single `movieId` | Array of CinemaResponse, ID ascending |
| `/api/v1/cinemas/{cinemaId}` | Path ID; no query parameters | One active CinemaResponse |
| `/api/v1/showtimes` | Required `movieId`, required `cinemaId`; optional `date` | ShowtimeSchedule |
| `/api/v1/showtimes/{showtimeId}` | Path ID; no query parameters | One eligible ShowtimeResponse |

Cinema list without movieId returns active branches once each. With movieId it first validates the PUBLISHED Movie and returns branches having at least one eligible future Showtime for that Movie, across all dates. `EXISTS` prevents duplicate options from multiple Halls/Showtimes. Missing/hidden Movie returns 404, not an empty branch list.

Showtime collection validates Movie then Cinema. Valid visible parents with no matching screenings return 200 with empty items/dates. It cannot return another Movie or Cinema. Detail applies the same complete predicate and derives Movie/Cinema/Hall IDs from the database. Future Seat integration must compare these returned identities with route context instead of trusting arbitrary client associations.

Hall is exposed only as `{id, name}` within an eligible Showtime. There is no standalone Hall collection/detail or administration API: no Customer requirement needs browsing rooms independently of Showtimes in this flow.

## 4. Date, timezone and ordering

- `DISCOVERY_TIME_ZONE` configures one chain-wide IANA zone; default `Asia/Ho_Chi_Minh`. Invalid zone configuration fails startup. This is an explicit MVP display/query decision, not a new Cinema column or per-branch timezone model.
- Server `Clock` supplies one instant per service call. The default clock is UTC; tests inject fixed instants. Database pooled sessions use UTC. HTTP timestamps are ISO-8601 UTC instants ending in `Z`.
- `date` is strictly `YYYY-MM-DD`, valid calendar date, years 0001–9999. Omitted means the server's current local date in the configured zone. Blank/malformed values are 400.
- Day membership uses Showtime start in `[local midnight, next local midnight)`, converted to instants. A screening crossing midnight belongs to its start day. Never use the browser timezone, database session date, end date or a hardcoded 24-hour duration to select a calendar day.
- `dates` contains distinct local start dates with eligible Showtimes for the requested Movie/Cinema, across the stored future schedule, ascending. It is independent of the selected date; no invented seven-day window or generated empty date options.
- `items` contains only selected-day Showtimes, ordered by `startsAt ASC, numeric id ASC`. Clients may group by `hall.id`; Hall names are not unique keys. Cinema ordering is numeric ID ascending and is independent of locale/collation.
- A valid past date or a future date without Showtimes returns empty items. Dates with all cutoffs passed disappear. Default today can have no items while dates lists later dates; the client may explicitly select a returned date.
- These MVP collections are complete arrays, without pagination, truncation, client sorting or a maximum advance-booking horizon. Measure chain/schedule size before introducing versioned pagination/window contracts. No load/performance SLA is certified by this slice.

## 5. DTOs

Every ID is a decimal **string** within signed bigint range, never a JSON number. Internal persistence uses bigint/Java long. Input accepts 1–19 ASCII digits with value 1–9223372036854775807; leading zeros are accepted and normalize through numeric lookup. No signs, whitespace, decimals or exponent notation.

CinemaResponse:

```json
{"id":"9007199254740993","name":"Smart Cinema","address":"Branch address","contact":null,"operatingInformation":null}
```

ShowtimeResponse:

```json
{
  "id":"9007199254740993",
  "movieId":"42",
  "cinemaId":"12",
  "hall":{"id":"25","name":"Hall 1"},
  "startsAt":"2030-01-01T03:00:00Z",
  "endsAt":"2030-01-01T05:00:00Z",
  "bookingCutOff":"2030-01-01T03:00:00Z"
}
```

ShowtimeSchedule fields:

| Field | Type / meaning |
|---|---|
| timeZone | Named configured zone |
| serverTime | Request evaluation instant |
| date | Effective requested local date |
| dates | Ascending array of eligible local dates, possibly empty |
| items | Ordered array of ShowtimeResponse for date, possibly empty |

Optional Cinema fields serialize as explicit null. No admin status, capacity, Hall type, occupied_until, audit/assignment data or raw persistence object is exposed. `base_price` is stored because FR-SHOWTIME-009 and the physical model require it, but no price quote is part of these discovery DTOs. No format, popularity, rating, sold-out flag, seat count or `hasAvailableSeats` is invented.

## 6. Errors and consistency

| Condition | Response |
|---|---|
| Invalid/missing required ID, invalid date, unknown query parameter or duplicate scalar parameter | 400 application/problem+json; title Invalid request; `errors` keyed by parameter |
| Missing/hidden Cinema, Movie or Showtime | 404 application/problem+json; title Resource unavailable; safe `Movie/Cinema/Showtime is unavailable.` detail |
| Empty valid collection | 200, empty array/items |
| Database read failure | 503 application/problem+json; Discovery unavailable; generic retry message without SQL/connection details |

Successful responses have `Cache-Control: no-store`. Each service call uses a read-only REPEATABLE_READ transaction for parent checks, date list and items, with one sampled serverTime. No application cache, row locks, Hold, Booking or reservation is created. Concurrent changes may make a later request return 404/empty. Future Hold/Booking commands must revalidate current committed state under their own approved write protocol; a discovery response is never an authorization token.

## 7. Persistence and migration

[V4](../../backend/src/main/resources/db/migration/V4__create_customer_discovery_tables.sql) creates only cinemas, halls and showtimes, using approved dictionary types/nullability, finite timestamp checks, nonblank text, status checks, monetary bounds, immediate NO ACTION FKs, the `(id,hall_id)` candidate key and three approved lookup indexes. No seeds/default business statuses are added.

`btree_gist` is required. Migration role must be able to install this extension, or operations must preinstall it on the migration search path. The approved exclusion rejects overlapping `[start_time,occupied_until)` intervals in one Hall for every non-CANCELLED status, including DRAFT. Adjacent intervals and cancelled overlap are allowed. Preserve V1/V2/V3 checksums; do not edit old files on rollout.

Repository uses typed JDBC read projections within the existing Spring transaction manager; it adds no JPA entities or dependencies. Existing Hibernate mappings still validate. PostgreSQL tests validate new persistence directly. There are no application writes: schedule duration/buffer authoring, membership immutability once sales exist, publication transitions and lifecycle operations remain separate implementation work.

## 8. Frontend handoff and unresolved decisions

The [final Customer QA report](../reports/2026-09-28_customer-frontend-final-qa_report.md) remains a historical frontend snapshot. This backend slice does not replace its mock adapters.

Future integration can use `GET /cinemas?movieId=...`, Cinema detail for validated context and `GET /showtimes?movieId=...&cinemaId=...&date=...`. Preserve string IDs, use returned dates/timeZone, and retain retry/empty states. Do not fabricate `hasAvailableSeats=true` to satisfy the current mock-only type. Retire the mock boolean when adapting production discovery, and obtain sold-out/Seat eligibility from the future Seat contract. Closed/started mocks remain visual examples; production reads omit such options.

Unresolved/deferred:

- FR-SHOWTIME-007 Cinema-first Movie discovery needs an approved response/filter/route decision. The active branch collection is available; this task does not alter `/movies` or support Showtime search without movieId.
- Multi-timezone branches, configured advance-booking windows, schedule pagination and display of non-bookable SCHEDULED rows require explicit future contracts if needed; none is inferred here.
- Hall layout/capacity, physical Seats, showtime_seats completeness, sold-out/HELD state and configurable authoritative TTL remain Seat/Hold work. OPEN_FOR_BOOKING metadata alone does not prove layout readiness.
- No authoring/admin endpoint or operational schedule-opening workflow exists. Future writers must enforce Movie duration, buffer, Hall layout completeness, status transitions and historical membership guards before enabling sales.
- Owned Booking, promotion/pricing authority, first-payment freeze, provider verification, Tickets and Booking QR remain outside this slice.

## 9. Verification

Use a disposable PostgreSQL database with the existing DB_URL/DB_USERNAME/DB_PASSWORD configuration. Enable both `MOVIE_DB_TESTS=true` and `DISCOVERY_DB_TESTS=true`, then run `mvn test` or `mvn verify` from backend. Without these flags the respective PostgreSQL tests are explicitly skipped. Migration tests create/drop only a UUID-named temporary schema, preserving public data; read/constraint fixtures roll back.

See the [implementation report](../reports/2026-09-28_customer-discovery-backend_report.md) for final execution results, traceability and remaining dependencies.
