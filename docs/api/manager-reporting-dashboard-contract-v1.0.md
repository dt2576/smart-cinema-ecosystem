# MANAGER Reporting & Dashboard API contract v1.0

Date: 2026-10-29. Read-only, current Cinema scope; no migration or financial writer.

## Authority and authorization

BRD v1.2 §3.1.16, BR-003/057/059/060/066; SRS v1.2 FR-AUTH-007/008,
FR-REPORT-001/003–008, NFR-PERF-006 and NFR-SCALE-005.
Financial and occupancy definitions reuse
[ADMIN Reporting v1.0](admin-reporting-dashboard-contract-v1.0.md) without changing
that contract. Booking/Payment/Ticket finalization and provider verification remain
under the existing protected backend contracts, not this reporting module.

Require bearer authentication with MANAGER authority **and** current ACTIVE
MANAGER account plus at least one ACTIVE MANAGER Cinema assignment whose immutable
`effective_at <= clock_timestamp()`. Existing `ManagerRepository.access` runs on
every request; `ManagerScope` is also embedded at the beginning of every aggregate
query, including count, daily, ranking and Concession queries. Multiple assignments
cannot multiply data: scope uses EXISTS, not an assignment join into event rows.

Explicit Cinema/Showtime filters pass existing scoped resource reads. Unknown and
foreign resources receive the same 404. Optional Movie filtering intersects owned
Showtimes; it does not query global Movie existence or expose foreign names/counts.
Inactive catalog entities retain historical reporting visibility. Current scope,
not historical assignment at sale time, controls historical access.

Assignments have ACTIVE/INACTIVE and effectiveAt; there is no independent endsAt,
EXPIRED assignment state or invented expiry policy. Revoked/inactive assignments,
blocked/deleted actors and current role changes deny access. Changes committed
after a request's REPEATABLE READ snapshot are observed by the next request.

## Endpoints and filters

| Method | Route | Response |
|---|---|---|
| GET | `/api/v1/manager/dashboard` | Summary |
| GET | `/api/v1/manager/reports/summary` | Identical Summary implementation |
| GET | `/api/v1/manager/reports/daily` | Daily, zero-filled ascending dates |
| GET | `/api/v1/manager/reports/breakdowns` | Paginated Cinema/Movie/Showtime performance |
| GET | `/api/v1/manager/reports/concessions` | Paginated best-selling Concession products |

All require `from` and `to`, exact `YYYY-MM-DD`, years 0001–9999, `from < to`.
**to is exclusive.** Reporting timezone is `Asia/Ho_Chi_Minh`.
For `from=2026-10-27&to=2026-10-29`, the interval is
`[2026-10-26T17:00:00Z,2026-10-28T17:00:00Z)`.
Maximum 366 calendar days is the existing synchronous reporting resource bound.

Optional common filters: `cinemaId`, `movieId`, `showtimeId`; canonical positive
decimal bigint strings, 1–9223372036854775807. Filters AND together. Conflicting
otherwise-owned Cinema/Showtime filters yield empty results; filters cannot expand
scope. Missing/foreign explicit Cinema/Showtime is404, not a global lookup.

Breakdowns require `dimension=CINEMA|MOVIE|SHOWTIME`. Breakdowns and Concessions
accept `page`0–2147483647 (default0), `size`1–100 (default20). Other resources reject
paging/dimension. Concessions reject dimension; its product grouping is fixed.
Unknown, repeated, blank, noncanonical and unsupported filters are400, including
user-controlled grouping/sort/timezone. Dates, IDs and pagination reuse existing
ADMIN reporting validation. Page offset uses64-bit arithmetic.

## Response schemas

All identities, aggregate counts, totalElements, amounts and percentages are JSON
**strings**. Page/size are JSON integers. Monetary/percentage fields have four
decimal places, arbitrary aggregate precision; no floating-point conversion.
Zero capacity yields `occupancyPercent:null`, not0. Empty counts/money are zero.

- `Period`: `{from,to,startInclusive,endExclusive,timezone,currency,
  paymentEnvironment,cinemaId,movieId,showtimeId}`. Null optional filters;
  currency VND and paymentEnvironment SANDBOX describe the recognized financial
  cohort, not production settlement or a filter on raw operational attempt counts.
- `Summary`: `{period,metrics,activity}`.
- `Daily`: `{period,items:[{date,metrics,activity}]}`; exactly one row per local day.
- `Breakdowns`: `{period,dimension,page,size,totalElements,items}`.
- Performance item: `{id,name,cinemaId,movieId,startsAt,metrics,activity}`.
  CINEMA/MOVIE use current catalog labels; their auxiliary IDs/startsAt are null.
  SHOWTIME includes its Cinema/Movie IDs, UTC startsAt and Movie/Cinema/Hall label.
- `Concessions`: `{period,page,size,totalElements,items}`.
- Concession item: `{id,name,category,quantity,grossAmount,confirmedBookings}`.
  Identity is existing catalog item ID; label/category are current catalog values.
  Financial totals and quantities use immutable Booking lines, never catalog price.

### Shared metrics

`Metrics` is the exact existing ADMIN reporting record:

| Field | Definition |
|---|---|
| confirmedRevenue | Eligible Booking final_amount, after overall discount, dated paid_at |
| grossAmount / discountAmount | Eligible Booking subtotal / discount |
| seatGrossAmount / concessionGrossAmount | Eligible frozen seat_amount / concession_amount, before overall discount |
| confirmedBookings | Eligible Bookings, one per header |
| ticketsSold / guestsSold | Actual issued Tickets / guest capacity in eligible Bookings; COUPLE one Ticket/two guests |
| bookingsCreated | Scoped Bookings created in period, regardless current state |
| showtimes | Scoped Showtimes starting in period in SCHEDULED/OPEN_FOR_BOOKING/STARTED/ENDED |
| capacitySeatUnits | Frozen is_sellable Showtime membership in that Showtime cohort |
| soldSeatUnits | PAID Booking Seats with sold_at=paid_at on that Showtime cohort, regardless payment date |
| occupancyPercent | Weighted100×soldSeatUnits/capacitySeatUnits, rounded4 decimals; null denominator0 |

Confirmed-sales eligibility is shared SQL with ADMIN:

1. Booking PAID and non-null paid_at.
2. Exactly one SUCCESS across all its Payment attempts; that attempt has positive
   amount matching frozen final_amount, VNPAY/VND/SANDBOX and completed_at.
3. Existing backend SUCCESS evidence from IPN or QUERY; no attempt on that Booking
   requires reconciliation. Reporting does not verify signatures or resolve cases.
4. Nonempty purchased Seat Units, each with a Ticket and coherent sold_at/issued_at
   equal to paid_at; Ticket state VALID/CHECKED_IN/EXPIRED/CANCELLED.

Payments/issuance are preaggregated before header totals. Evidence uses EXISTS.
Failed/replacement attempts, repeated evidence, multiple Tickets and Concession
lines do not multiply revenue. Payment SUCCESS alone is never revenue/issuance.
Ticket expiration/cancellation does not fabricate refunds. Reconciliation can
exclude finance while physical sold occupancy remains nonzero.

Concession gross is **not post-discount net revenue**. There is no authoritative
allocation of whole-Booking discounts to seats/products or refund ledger. No
profit, bank settlement, cash reconciliation or production-money claim is made.

### Operational activity

`Activity` contains arrays of `{status,count}` with every supported state present,
plus `checkedInTickets` and `reconciliationAttempts` strings:

| Field | Event cohort / status source |
|---|---|
| bookingsByStatus | Booking created_at in period; current stored PENDING/PAID/EXPIRED/CANCELLED |
| paymentsByStatus | Each attempt initiated_at in period; current INITIATED/PENDING/SUCCESS/FAILED/CANCELLED |
| ticketsByStatus | Each Ticket issued_at in period; current VALID/CHECKED_IN/EXPIRED/CANCELLED |
| showtimesByStatus | All scoped Showtimes starting in period; current DRAFT/SCHEDULED/OPEN_FOR_BOOKING/STARTED/ENDED/CANCELLED |
| checkedInTickets | Actual Ticket checked_in_at in period; count Tickets, not inferred guests |
| reconciliationAttempts | Initiated-period attempts with reconciliation_required=true |

Booking status counts use the actual stored state, not the Customer/Booking-view
read-time PENDING→EXPIRED projection. They are not historical “status as of day-end”
snapshots. A late check-in can be counted even if issuance was before the period.
Operational attempts include records not in the recognized-sales cohort, including
unbound INITIATED attempts; attempt counts must not be used as financial totals.
Raw DRAFT/CANCELLED Showtime counts do not expand the existing occupancy cohort.
Daily fields use their own paid/created/initiated/issued/checked-in/start dates;
they are distinct event cohorts, not one conversion funnel.

Operational and financial events are aggregated separately before joining at day
or dimension grain. This prevents activity volume from multiplying financial sums.

### Rankings and pagination

Cinema/Movie/Showtime rows exist when at least one relevant financial **or
operational** event is in period. Thus an activity-only Movie may have zero
recognized revenue. Order: confirmedRevenue DESC, ticketsSold DESC, numeric ID ASC.
Labels and all events are scoped before grouping; page totals are not global.

Concession rows include products bought on eligible Bookings paid in period.
Sum Booking line quantity and total_price, count distinct eligible Bookings per
product. Combine historical line-name variants by stable catalog ID, retaining
frozen line prices; inactive products are not erased. Order: quantity DESC,
grossAmount DESC, numeric ID ASC. Combos count ordered Combo units, not invented
component/inventory quantities. No per-product net discount allocation.

Beyond-last pages are empty with scoped totalElements unchanged. Count/page use
one request snapshot; separate requests may observe later commits. No reporting
cache, cross-request snapshot token or automatic refresh is promised.

## Failure, consistency and workload

401 missing/invalid authentication;403 wrong role/current account/effective scope;
400 invalid query with safe field errors;404 missing/foreign explicit scoped
resource; 503 database, read timeout or transaction failure. No SQL, credentials,
Customer information, QR/Ticket codes, provider references or audit metadata.
Successful responses and controller errors have `Cache-Control:no-store`.
No custom429 policy is introduced. There is no mutation handler; explicit GET
recheck is safe and never retries a payment or finalization command.

Read-only REPEATABLE READ, transaction10s, statement5s and lock2s bounds; no row
locks, N+1 fetching, read-audit writes, new schema, dependencies or runtime grants.
Daily output ≤366 rows, each paginated output ≤100. No previous-period comparison,
weekly/monthly grouping, exports, inventory, customer demographics or settlement
workflow is implied. Production load isolation/performance still needs suitable
real scoped traffic; a query plan for a missing actor is not a positive load benchmark.

Verification details and the real authenticated Manager limitation are in the
[implementation report](../reports/2026-10-29_manager-reporting-dashboard-backend_report.md).
