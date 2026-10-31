# ADMIN Reporting & Dashboard API contract v1.1

Date: 2026-10-27. Backend read model; no financial writer, settlement API or frontend implementation.

## Authority and scope

BRD v1.2 §3.1.16, BR-058–060; SRS v1.2 §3.13 FR-REPORT-002–008,
NFR-PERF-006 and NFR-SCALE-005. FR-REPORT-001 (Manager) is outside this slice.
Existing [VNPAY v1.1](vnpay-sandbox-payment-contract-v1.1.md) and
[integrity v1.2](../db/integrity-enforcement-design-v1.2.md) retain all finalization authority.

All endpoints require a valid bearer token with ADMIN authority **and** a current
ACTIVE ADMIN account in PostgreSQL. CUSTOMER, STAFF and MANAGER are denied.
Current account authorization is checked in the same REPEATABLE READ, read-only
request transaction, without `FOR SHARE`. A change committed after that snapshot
is visible to the next request. Existing mutation authorizers retain their locks.
Responses, including controller errors, use `Cache-Control: no-store`.

## Endpoints and query

| Method | Route | Response |
|---|---|---|
| GET | `/api/v1/admin/dashboard` | Summary |
| GET | `/api/v1/admin/reports/summary` | Same Summary implementation |
| GET | `/api/v1/admin/reports/daily` | Daily, zero-filled ascending local calendar dates |
| GET | `/api/v1/admin/reports/breakdowns` | Paginated dimension aggregates |

Common required parameters: `from`, `to`, exact `YYYY-MM-DD`, years 0001–9999,
`from < to`. **`to` is exclusive.** Calendar period is interpreted in IANA
`Asia/Ho_Chi_Minh`; returned UTC boundaries remove ambiguity. Example:
`?from=2026-10-27&to=2026-10-29` means
`[2026-10-26T17:00:00Z, 2026-10-28T17:00:00Z)`.

Maximum period 366 calendar days is a synchronous-query resource bound, not a
Booking/payment business rule. Optional `cinemaId`, `movieId`, `showtimeId` use
canonical positive decimal bigint strings, range 1–9223372036854775807. Filters
intersect (AND). Nonexistent or mutually inconsistent IDs return empty data.
Inactive catalog entities remain eligible for historical reporting.

Breakdowns additionally require `dimension=CINEMA|MOVIE|SHOWTIME`; optional
`page` (integer 0–2147483647, default 0), `size` (1–100, default 20).
Order: confirmed revenue descending, tickets sold descending, numeric identity
ascending. Rows represent dimensions with at least one in-period event, including
created Bookings or operational Showtimes with zero sales. Paging is stable for
unchanged data. Unknown, duplicate, blank, noncanonical or unsupported query
parameters are rejected; paging/dimension are rejected on other endpoints.

## Response records

- `Summary = { period, metrics }`.
- `Daily = { period, items: [{ date, metrics }] }`; one row per requested day.
- `Breakdowns = { period, dimension, page, size, totalElements, items }`.
- Each breakdown item: `{ id, name, cinemaId, movieId, startsAt, metrics }`.
  CINEMA name is current Cinema name; MOVIE name is current Movie title.
  Their `cinemaId`, `movieId`, `startsAt` are null (identity is `id`). SHOWTIME
  has its Cinema/Movie IDs, UTC start and a current Movie/Cinema/Hall label.
- `period = { from, to, startInclusive, endExclusive, timezone, currency,
  paymentEnvironment, cinemaId, movieId, showtimeId }`. Missing filters are null.
  Currency is `VND`, environment is **`SANDBOX`**, the only implemented binding.
- All identities, counts, `totalElements`, money and percentages are JSON strings.
  `page` and `size` are JSON integers. Amounts/percentages have four decimal places;
  aggregate precision is not limited to one row's `numeric(19,4)`. No floating point.
  `occupancyPercent` is null when capacity is zero. Other empty metrics are zero.

### Confirmed-sales cohort

One Booking is counted once, dated by **`bookings.paid_at`**, not Payment initiation,
provider completion, redirect or Booking creation. Eligibility:

1. Booking status PAID, non-null paid_at.
2. Exactly one SUCCESS Payment among all attempts; its amount equals frozen
   Booking final_amount and is positive; VNPAY/VND/SANDBOX, completed_at present.
3. That attempt has backend-recorded SUCCESS evidence with source IPN or QUERY;
   no attempt for this Booking has `reconciliation_required=true`.
4. Nonempty purchased Seat Units, each with a Ticket and `sold_at=paid_at`,
   `issued_at=paid_at`; Ticket status VALID, CHECKED_IN, EXPIRED or CANCELLED.

Payment/issuance facts are preaggregated per Booking before header sums. Failed
retries, multiple evidence deliveries and multiple Tickets cannot multiply money.
Unpaid, unverified, conflicting, extra-success or reconciliation-required cases
are excluded. A SUCCESS on its own never establishes a completed sale. Existing
protected PAID aggregate constraints remain authoritative; reporting neither
re-verifies signatures nor resolves reconciliation. The current reconciliation
flag is sticky; a case resolution alone does not change this eligibility.

| Metric | Exact meaning |
|---|---|
| `confirmedRevenue` | Sum eligible frozen Booking final_amount, after Booking discount |
| `grossAmount` | Sum eligible Booking subtotal |
| `discountAmount` | Sum eligible Booking discount; gross minus discount equals confirmedRevenue |
| `seatGrossAmount` | Sum eligible Booking seat_amount |
| `concessionGrossAmount` | Sum eligible Booking concession_amount snapshot, **before** overall discount |
| `confirmedBookings` | Count eligible Bookings |
| `ticketsSold` | Number of issued Tickets in those Bookings |
| `guestsSold` | Purchased capacity: COUPLE=2 guests per Ticket, other Seat Units=1 |

Ticket expiry/check-in/cancellation does not fabricate a refund. `ticketsSold`
is historical issuance for confirmed sales, not the number of currently VALID
passes or admitted guests. No supported refund ledger/allocation exists. Do not
label concessionGrossAmount as concession net revenue or subtract an invented
share of the Booking discount. Values are **verified Sandbox sales**, never
production money, bank settlement, profit, refund totals or cash reconciliation.

### Activity and occupancy cohort

| Metric | Exact meaning |
|---|---|
| `bookingsCreated` | All scoped Bookings created in period, regardless current status |
| `showtimes` | Scoped Showtimes starting in period in SCHEDULED, OPEN_FOR_BOOKING, STARTED or ENDED; DRAFT/CANCELLED excluded |
| `capacitySeatUnits` | Frozen showtime_seats membership with is_sellable=true for those Showtimes |
| `soldSeatUnits` | Booking Seats on those Showtimes with Booking PAID and sold_at=paid_at, irrespective of payment date |
| `occupancyPercent` | `100 * soldSeatUnits / capacitySeatUnits`, weighted over the cohort, rounded to four decimals |

Seat Unit is the denominator, **not guests** or Hall.capacity. COUPLE is one unit.
Holds and unpaid Bookings do not consume sold capacity. Financial reconciliation
does not free a physically sold unit; occupancy can remain nonzero while confirmed
revenue is excluded. Changing current Seat physical status does not rewrite frozen
membership. Daily rows independently use paid_at / created_at / start_time for
their respective metrics. They must not be interpreted as one sales funnel.

## Failure, consistency and workload

401 invalid/missing token; 403 wrong role, blocked/deleted/current non-ADMIN actor;
400 invalid query with safe field errors; 503 database/read timeout/transaction
failure, without SQL, stack, provider secrets or internal metadata. There is no
write/retry side effect. Explicit GET retry is safe. No custom 429 policy is invented.

One snapshot per request, statement timeout 5 seconds, lock timeout 2 seconds,
transaction timeout 10 seconds; parameterized SQL, database-side grouping,
bounded daily/page result sizes, no per-row fetching and no user-controlled SQL.
Breakdowns use a count and page query within the same snapshot. Dashboard/summary
share the service and SQL; equivalent values agree for unchanged committed data.
Separate requests may legitimately observe later commits. No cross-request snapshot
token or reporting cache is promised. No read audit inserts, new infrastructure,
new privileges, schema or indexes are required in the tested V16 environment.

## Exclusions and verification

Manager scoping, UserStatistics demographics, inventory, refund/net concession
allocation, CSV/export, live updates, UI and production settlement are not provided.
No trustworthy refund or post-discount concession allocation contract exists.

See [implementation report](../reports/2026-10-27_admin-reporting-dashboard-backend_report.md)
for executed regression, fixed-local read-only SQL/HTTP evidence and limitations.
CTE financial fixtures are isolated SELECT input only, never persisted or evidence
of a signed provider callback or actual operational PAID/issuance.

## Additive v1.1 revision — authorized CASH counter sales (2026-10-30)

Approved together with BRD/SRS v1.3 STAFF POS decision. All original `metrics`,
`period.paymentEnvironment="SANDBOX"`, daily/breakdown/product cohorts, field
formats, filters and authorization retain their VNPAY meaning. Existing frontend
copy and strict SANDBOX validation remain truthful; CASH is never silently mixed
into VNPAY revenue. Historical v1.0 is preserved.

Summary (and its existing Dashboard alias, where present) adds `cashTotals`:
`{ confirmedRevenue, confirmedBookings, ticketsSold, guestsSold }`, all exact
strings, money at four decimals. It uses the same scope, reporting period, one
successful amount-matched attempt, complete issuance and no reconciliation gates,
with CASH/VND/COUNTER, backend CASH evidence, and `CASH_RECEIVED` audit carrying
an operator, exact amount and currency. Replayed confirmation is counted once.
An incomplete or unaudited financial outcome is not recognized. Query uses paid_at
for recognition; historical actor blocking does not erase a previously valid sale.

On a V18 deployment CASH cannot exist and `cashTotals` is zero without querying
uninstalled schema or requiring new audit privileges. The revised V19 grants only
EXECUTE of the protected boolean `cash_payment_confirmed(bigint)` predicate, which
checks evidence and matching audit actor/amount/currency/confirmation time without
exposing audit rows or metadata. The reporting query retains its outer scope.
No runtime audit SELECT is added. No migration is implicitly
installed. Existing frontend does not render this additive CASH field yet; future
reporting UI work must label the two methods explicitly. This backend iteration
adds no combined-revenue claim or CASH daily/product/shift dashboard.
