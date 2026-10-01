# Admin Cinema configuration contract v1.0

Date: 2026-10-01. Scope: chain-wide ACTIVE ADMIN configuration of existing Cinema,
Hall and physical Seat records. Customer discovery, Hold, Booking and Payment
contracts remain unchanged. No Manager scope administration, Showtime authoring,
Delete or automatic transactional side effects are introduced.

## 1. Requirements and authority

[SRS v1.2](../srs/srs-v1.2.md) FR-AUTH-007, FR-CINEMA-003–009,
FR-SEAT-002/003/017; [BRD v1.2](../brd/brd-v1.2.md) BR-008–011;
[dictionary](../db/physical-data-dictionary-v1.0.md) §§3.7–3.9;
[integrity design](../db/integrity-enforcement-design-v1.0.md) §7 physical eligibility.
The user explicitly approved one V11 migration and this Admin-only slice.
Manager operations in the SRS remain deferred until assignment/scope enforcement
exists. Approved whole COUPLE semantics and people capacity remain authoritative.

Every endpoint requires a valid ADMIN Bearer JWT **and** a current ACTIVE ADMIN
database account. A stale role/status token cannot authorize writes. Responses
use no-store; IDs are positive decimal strings within signed bigint range.
Anonymous access returns 401; CUSTOMER/STAFF/MANAGER and blocked or downgraded
Admin return 403. Frontend authorization never replaces backend checks.

## 2. Resources

| Method | Path under `/api/v1/admin` | Result |
|---|---|---|
| GET | `/cinemas` | All statuses, complete array, numeric ID ascending |
| GET | `/cinemas/{cinemaId}` | Cinema detail |
| POST | `/cinemas` | Create, 201 and Location |
| PUT | `/cinemas/{cinemaId}` | Replace approved content including status |
| GET | `/cinemas/{cinemaId}/halls` | Halls of existing Cinema, numeric ID ascending |
| POST | `/cinemas/{cinemaId}/halls` | Create Hall permanently under that Cinema, 201 |
| GET | `/halls/{hallId}` | Hall detail |
| PUT | `/halls/{hallId}` | Replace approved metadata/status, preserve Cinema |
| GET | `/halls/{hallId}/seats` | Physical layout, including inactive units; empty before initialization |
| POST | `/halls/{hallId}/seats` | Initialize complete empty-Hall layout atomically, 201 |
| GET | `/seats/{seatId}` | One whole physical Seat Unit |
| PUT | `/seats/{seatId}` | Safe metadata and/or physical status update |

No query parameters, pagination, sorting controls or DELETE endpoints are exposed.
Collections are minimal complete arrays; future scale-driven pagination requires
a separate contract. Seat ordering is stored row label, number label, numeric ID;
labels are opaque display identifiers rather than coordinates. Numeric labels are
not sorted by coercing IDs or interpreting full Hall geometry.

## 3. Input and response fields

Cinema content: required `name` (nonblank, max 150), `address` (nonblank text),
`status`; optional `contact` (null or nonblank, max 255), `operatingInformation`
(null or nonblank text). Missing optional fields become null on full replacement.
Response adds string `id`. Status: ACTIVE, TEMPORARILY_CLOSED, INACTIVE.
No new lifecycle-transition matrix is imposed: an active Admin can choose any
approved physical status. No Cinema-name uniqueness is invented.

Hall content: required `name` (max 100), `capacity` (positive int32 **people**),
`type` (nonblank configured text, max 50), `status`. Response adds string `id`,
`cinemaId`, boolean `layoutInitialized`. Status: ACTIVE, MAINTENANCE, INACTIVE.
No Hall-type enum or Hall-name uniqueness is invented. Request `cinemaId` is
rejected; the parent comes from the creation path or existing persistent record.
Once any Seat exists, capacity cannot change. Hall metadata/status changes do
not rewrite Booking snapshots, schedules or financial history.

Seat content: required `row`, `number` (nonblank labels, max 20 each), `type`,
`physicalStatus`. Type: STANDARD, VIP, COUPLE. Physical status: ACTIVE,
MAINTENANCE, INACTIVE. Response adds string `id`, `hallId`, integer
`guestCapacity` and boolean `structureEditable`. Neither derived response field
is accepted as input. Referenced units report structureEditable=false; this is
an advisory projection, never permission to bypass write-time validation.

Layout input: exactly `{ "units": [SeatContent, ...] }`, nonempty. Inputs reject
unknown fields, non-text values, null required values, invalid statuses, embedded
NUL and duplicate normalized `(row,number)` identities. Labels trim surrounding
whitespace without silently changing case. Recognizable numeric single labels
and inclusive ranges reject overlap within the same row, including `9-10` with
`9`, `10` or a different numeric spelling of the same position. Descending ranges
are invalid. Non-numeric labels remain opaque under exact uniqueness; no new
coordinate schema or arbitrary geometry inference is introduced.

## 4. Layout and historical protection

- One record is one sellable unit. STANDARD/VIP contribute one guest, COUPLE
  contributes two. Complete initialization requires SUM(guestCapacity)=Hall
  capacity, counting all physical units independently of status.
- The only layout creation operation initializes an empty Hall. It cannot append,
  replace, split, merge or delete an initialized layout.
- Seat `id` and `hallId` remain permanent. Any Showtime membership, Hold or
  Booking Seat reference prevents changing row/number/type. Referenced units may
  change physical status through the guarded writer.
- Unreferenced units can edit labels and swap STANDARD/VIP. Changing single-guest
  versus COUPLE capacity is rejected even when unreferenced; no compensating
  multi-unit reshape operation exists in this slice.
- Physical status never changes derived HELD/BOOKED storage. Existing deadlines,
  origins, sold markers, Payment evidence, Tickets and Booking QR remain intact.
- No implicit cancellation, refund, reschedule or repricing occurs. Operational
  handling of maintenance affecting existing transactions is a later workflow.

## 5. Database and concurrency boundary

[V11](../../backend/src/main/resources/db/migration/V11__guard_admin_cinema_configuration.sql)
adds guarded SQL functions; no columns/tables/indexes or V1–V10 edits.
`smart_cinema_configuration_owner` is NOLOGIN, owns only its helper/writer
functions and receives necessary table/column privileges. It does not own Seat
tables and is not granted to hold runtime. SQL bodies have schema-qualified
objects and fixed `pg_catalog,pg_temp` search_path. No caller flag/GUC permits
configuration mutation.

`smart_cinema_hold_runtime` receives EXECUTE on configure_cinema, configure_hall,
configure_hall_layout and configure_seat, retaining zero Seat DML/initializer
privileges. Actor ID is supplied solely by the backend from the verified JWT,
then rechecked by the definer against users. This follows the existing trusted
application/runtime model; direct database access is not an end-user API.
The deployment initializer is delegated only to the isolated configuration
definer, preserving its original full-layout transaction and capacity check.

Writes lock active Admin User FOR SHARE → Cinema → Hall → Seat/configuration.
Cinema edits take Cinema FOR UPDATE. Hall/layout/Seat writers take Cinema
FOR SHARE then Hall FOR UPDATE before Seat locks. This conflicts with customer
and settlement Hall-share gates **before** later Showtime locks. The existing
membership initializer also takes Hall-exclusive coordination. No downstream
Showtime lock is needed because this slice never writes Showtime/pair state.
Capacity, duplicate labels, initialization and referenced checks rerun under the
gate. Errors roll back the entire transaction. Services use a ten-second
transaction/query timeout; concurrency errors are conflicts, not success retries.

The revised trigger still forbids Seat DELETE and all arbitrary INSERT/UPDATE;
deployment owner INSERT remains supported. Only the isolated definer may update
approved Seat columns, with trigger-level identity/reference/capacity checks.
Showtime Seat configuration remains deployment-only and immutable after insert.
No application SET ROLE, trigger disabling, broad runtime grants or owner switching.
Runtime database logins need inherited hold_runtime membership and existing Auth
access; V11 gives runtime no configuration-owner inheritance or SET authority.
During the transactional Flyway bootstrap only, the privileged migration user
receives temporary SET membership and the definer receives schema CREATE for
ownership transfer. Both are revoked before migration commit. Managed PostgreSQL
does not give CREATE ROLE callers superuser ownership-transfer privileges; failed
DDL rolls back rather than leaving a runtime authorization bypass. Managed
PostgreSQL may retain a creator's ADMIN-only role-management membership; this is
not inherited definer access or SET authority. The configured migration principal
was verified to have both definer inheritance and SET disabled after commit.

Runtime-role enrollment is deployment provisioning, separate from schema
migration. The configured Neon development login initially lacked inherited
hold_runtime execution. It was enrolled in that existing restricted role with
INHERIT TRUE and SET FALSE; no Seat DML or configuration-owner grant was added.
Ordinary runtime logins must not receive migration/role-administration credentials.

Committed HTTP mutations log actor/resource/action through the existing Admin
after-commit application audit pattern. Rollbacks never log success. No request
payload, credentials or JWT are logged. Durable searchable administrative audit
storage/retention remains deferred as in the Movie administration contract; V10
financial audit persistence is unchanged.

## 6. Errors and frontend

400 ProblemDetail for malformed/unknown/invalid fields; 404 for missing resources;
409 for duplicate labels, capacity mismatch, existing initialization, protected
history and concurrent changes; 503 for unexpected persistence failures. SQL,
credentials and internal object details are not returned. Validation errors
include the existing keyed `errors` map. Empty valid collections return 200.

Frontend routes: `/admin/cinemas`, `/admin/cinemas/new`,
`/admin/cinemas/[cinemaId]/edit`, `/admin/cinemas/[cinemaId]/halls`,
`/admin/cinemas/[cinemaId]/halls/new`, `/admin/halls/[hallId]/edit`,
`/admin/halls/[hallId]/seats`. Existing verified Admin shell, design tokens and
Bearer API client are reused. Navigation adds only Cinemas beside Movies/Home.
Forms show loading/error/retry, saved feedback and empty states. Whole units are
shown in a responsive grid; draft-unit add/remove exists only before persistence.

## 7. Customer discovery and deferred work

An ACTIVE branch appears in the plain public Cinema API even without Showtimes.
Movie-filtered discovery requires an eligible future Showtime as defined by
[Discovery v1.0](customer-discovery-contract-v1.0.md). Physical Seat configuration
does not create showtime_seats; a Customer map requires approved Showtime
membership. No new Showtime is created to demonstrate visibility.

Next slice: **Admin Showtime Management**, including schedule authoring and
membership/readiness rules under the existing integrity model. Other Admin
modules, scoped Manager administration, layout reshape, operational maintenance
resolution and production deployment remain outside this task.
