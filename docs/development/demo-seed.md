# Development/demo seed workflow

Use only an explicitly selected development database. The command is not a
production migration, deploy tool or authorization bypass.

## Run

1. Copy `backend/.env.example` to `backend/.env` and fill the JDBC URL, username and
   password locally. Keep the JDBC SSL parameters supplied by Neon. For local
   PostgreSQL use the local database's connection values instead.
2. Ensure the migration login can apply V1–V10 and can `SET ROLE` to the existing
   `smart_cinema_hold_owner`. The role needs schema privileges required by those
   migrations. Use the development migration/admin account, not a Customer login
   or restricted application runtime login. The command creates/grants no roles
   beyond what unchanged Flyway migrations already require.
3. At repository root run:

```powershell
pnpm seed:demo
```

4. Wait for **DEVELOPMENT DEMO seed committed** and **BUILD SUCCESS**. It closes its
   connections and exits. Then run `pnpm dev` and open <http://localhost:3000/> and
   <http://localhost:3000/movies>.

The backend-only equivalent, from `backend/`, is:

```powershell
mvn spring-boot:run "-Dspring-boot.run.main-class=com.smartcinema.demo.DemoSeedApplication" "-Dspring-boot.run.arguments=--demo.seed.confirm=development-only"
```

The CLI uses the same optional `.env` imports, datasource, Flyway and
`ddl-auto=validate`. It starts a non-web context with only demo configuration and
existing mapped entities; Customer API, scheduler and provider components are not
loaded. It explicitly requires the development-only acknowledgement; recognized
prod/production/staging profiles reject seeding. These gates cannot identify every
production database automatically: selecting a development target remains the
operator's responsibility. Default application startup has no seed service/runner.

## Dataset

All catalog labels have `[DEMO]` prefixes and fictional marker content. No user
account/password, Hold, Booking or Payment is created by the seed.

| Catalog | Values |
|---|---|
| Genres | Action, Adventure, Science Fiction, Drama, Thriller, Animation, Comedy (demo-prefixed) |
| Movies | Eclipse Protocol; The Last Horizon; Neon City; Echoes of Tomorrow; Midnight Signal; Beyond Orion; Silent Orbit; Crimson Sky; Clockwork Garden; The Paper Moon |
| Movie metadata | PUBLISHED; durations 90–135 minutes; releaseDate 2026-01-01; T13; Vietnamese; clearly fictional description; optional trailer absent |
| Cinemas | Smart Cinema Central, Riverside, Westlake with demo prefixes and fictional addresses; ACTIVE |
| Halls | Demo Hall 1 and 2 per Cinema; ACTIVE; capacity 50; configured demo Hall type only, no format behavior |
| Seats | Per Hall: A–C 10 STANDARD each; D 10 VIP; E five indivisible COUPLE units numbered 1-2 through 9-10; 45 sellable units for 50 guests |
| Showtime | 4 slots per Hall per day, 10:00/13:00/16:00/19:00 in DISCOVERY_TIME_ZONE; tomorrow through day +3; 72 in current horizon |
| Showtime timing/price | End = Movie duration; occupiedUntil = end +15 minutes; cutoff = start −15 minutes; base_price 90000 for every Seat Unit with no type adjustment |
| Concessions | Popcorn Small 35000; Popcorn Large 55000; Coke 25000; Water 15000; Popcorn + Coke Combo 60000; ACTIVE, POPCORN/DRINK/COMBO only |
| Percentage Promotion | SCDEMO10-YYYYMMDD, 10%, minimum 100000, cap 40000, usage_limit 100 |
| Fixed Promotion | SCWELCOME50K-YYYYMMDD, FIXED_AMOUNT 50000, minimum 150000, no cap, usage_limit 100 |

Both Promotions are ACTIVE, valid from local day −1 through day +7. Codes include
the seed day's date, so subsequent days add new demo-only codes instead of extending
previous terms. These are independent development database records, not frontend
demo policy or automatic production policy. Existing Promotion calculation/window/
usage checks remain authoritative; seeding consumes no usage.

Poster URLs use the existing frontend's neutral placeholder at
`http://localhost:3000/file.svg`. No remote movie API, image service or new frontend
asset is needed. It is a development placeholder, not a real film poster. A frontend
running on another origin will need a separately approved fixture adjustment.

## Rerun safely

Run `pnpm seed:demo` again. A transaction-scoped advisory lock serializes concurrent
seed commands. Existing demo identities and expected content are checked; no master
record is updated, deleted or truncated. Ambiguous identity/content collisions
abort the whole seed transaction. Existing non-demo content is never overwritten.
Genres use exact demo names; multiple matches are rejected rather than merged.

Movie/Cinema/Hall identities are names within their demo namespace, Seat units are
immutable Hall/row/number, Showtime identity is Hall/startTime, and Promotion code
is unique. IDs always come from database identities, not hardcoded/reset sequences.
Seats, membership, Concessions and Promotions use existing deployment configuration
writers under the authorized owner role. No trigger or constraint is disabled.

Showtime Movie assignment is a deterministic function of the absolute screening
date and Hall/slot, so advancing the seed day does not change overlapping dates.
Same-day reruns add nothing. Later-day reruns append the newly exposed horizon,
retain past screening/history and never move existing times, refresh Holds or
overwrite Booking/price snapshots. Tomorrow's dates are available through the
existing Showtime schedule's `dates`; include one as the `date` query parameter.
The command does not promise that yesterday's data stays future without rerunning.

## Check the real APIs

With the normal backend running, request:

```text
GET /api/v1/movies?q=Eclipse
GET /api/v1/genres
GET /api/v1/cinemas?movieId=<returnedMovieId>
GET /api/v1/showtimes?movieId=<movieId>&cinemaId=<cinemaId>&date=<returnedAvailableDate>
GET /api/v1/showtimes/<showtimeId>/seats
GET /api/v1/concession-items
```

Use your ordinary registered Customer/authentication and existing Hold/Booking APIs
to exercise add-ons and apply one returned demo Promotion. The seed does not create
ownership or relax authorization. Payment initiation still obeys the current real
contract; provider confirmation gates are unchanged. No success/PAID/sold/consumed
Hold/Ticket/Booking QR/evidence/check-in state is manufactured.

Only Home/Movies currently use real Movie data in the frontend. Downstream typed
preview adapters remain as previously documented; seeding does not connect them to
the Discovery/Seat/Booking APIs. Verify those APIs directly until an integration
task is authorized.

## Verification

PostgreSQL tests require the existing explicit local test environment plus
`DEMO_DB_TESTS=true`; do not run destructive test fixtures against Neon. New tests
cover public APIs, whole COUPLE Hold/Booking/add-ons, collision protection,
same-day/concurrent idempotency and next-day growth. See the
[implementation report](../reports/2026-10-01_development-demo-seed_report.md)
for actual local versus Neon results. No credentials are stored in this document.
