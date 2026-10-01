# Smart Cinema Implementation Report

## 1. Task Information

- Task: Safe repeatable development/demo catalog and discovery seed
- Date: 2026-10-01
- Module: Backend developer tooling / PostgreSQL catalog data
- Type: Dedicated seed command, integration tests and setup documentation
- Status: COMPLETE; local regression, actual Neon seed/reseed and real public API checks PASS

## 2. Requested Work

Populate development catalog/discovery data so real Customer APIs and Home/Movies
can be exercised. Keep demo data outside mandatory migrations, require explicit
opt-in, preserve legitimate records and all integrity guards. Do not create
transactional or financial entitlement fixtures on the target database.

## 3. Documents Reviewed

AGENTS.md; development/backend workflows; coding, document and traceability rules;
project conventions; project context/current handoff; README/root runner; V1–V10;
Movie/Genre, Discovery, Seat/Hold, Booking, Concession and latest Promotion
contracts; actual entities/controllers/services, publication policy, PostgreSQL
configuration writers/guards and existing integration fixtures; applicable SRS
v1.2 requirements and approved database decisions. Existing seed mechanism search
found test fixtures and deployment configuration routines, but no reusable demo
command. The existing test compilation blocker had already been fixed before this
task; no Payment code was changed here.

## 4. Requirements Traceability

| Requirement / source | Application | Result |
|---|---|---|
| SRS v1.2 FR-MOVIE-001/002/003/007; Movie v1.0 publication policy | Published catalog/detail, title and Genre filtering with complete metadata | PASS |
| FR-MOVIE-008; FR-CINEMA-001/002/009 | Movie → Cinema discovery; capacity consistent with whole Seat Units | PASS |
| FR-SHOWTIME-004/005/006/008/009/010 | Non-overlapping intervals, Movie duration, cutoff, configured price and active resources | PASS |
| FR-SEAT-001/003/005/006/007/008 | Membership/map, whole COUPLE and genuine owned Hold flow | PASS locally through existing APIs/services |
| FR-BOOKING-001/002/003/006/007 | Existing owned PENDING Booking, snapshots and totals exercised in rollback-only tests | PASS; no target Booking seeded |
| FR-PROMO-002–006; latest approved composition policy | Window/minimum/type/cap/usage and authoritative discount behavior | PASS locally; demo catalog persisted on Neon |
| User seed safety requirements | Explicit CLI, repeatability, no overwrite/reset, no financial/Ticket fixtures | PASS |

These IDs trace verification of existing behavior; the seed is not a new Admin
feature or a replacement for requirements. No new BR/FR/UC identifier or policy
was invented.

## 5. Implementation Summary

### Architecture and safety

`pnpm seed:demo` invokes a separate one-shot Spring Boot main with
`--demo.seed.confirm=development-only`. It uses existing datasource/.env/Flyway and
Hibernate validation but starts a non-web configuration containing only demo
service and mapped entities. No Customer controllers, cleanup scheduler or provider
components are loaded. Normal backend main remains explicitly selected in Maven;
no ordinary startup or migration performs demo inserts. No dependency was added.

The seed profile is inactive by default. Missing acknowledgement fails before
opening the CLI application; recognized prod/production/staging profiles reject
seed execution. Explicitly selecting a development database is still the
operator's responsibility; a generic JDBC host cannot reliably identify production.
CLI DevTools restart is disabled so a command failure propagates rather than
appearing as a successful restart wrapper exit.

One PostgreSQL transaction and database/schema-scoped advisory lock serialize seed
commands. Identity/content comparisons reject collisions rather than overwriting.
Existing rows are not updated, deleted or truncated; IDs use normal identity
sequences. Demo labels/descriptions mark fictional records. Seats/membership,
Concessions and Promotions use existing deployment writers under the authorized
`smart_cinema_hold_owner` role; the command neither grants privileges nor disables
triggers/constraints. A conflict rolls back the seed transaction.

### Exact dataset

| Data | Values / count |
|---|---|
| Genres | 7: demo-prefixed Action, Adventure, Science Fiction, Drama, Thriller, Animation, Comedy |
| Movies | 10: Eclipse Protocol, The Last Horizon, Neon City, Echoes of Tomorrow, Midnight Signal, Beyond Orion, Silent Orbit, Crimson Sky, Clockwork Garden, The Paper Moon; all demo-prefixed |
| Publication | PUBLISHED; required title/duration/releaseDate/ageRating/language/poster; duration 90–135 minutes, releaseDate 2026-01-01, T13, Vietnamese, fictional description, no trailer |
| Genre associations | 20, two per Movie, using actual Genre identities |
| Cinemas | 3 ACTIVE demo-prefixed Smart Cinema Central/Riverside/Westlake with fictional addresses |
| Halls | 6 ACTIVE: Demo Hall 1/2 per branch; capacity 50; configured demo type, no format behavior |
| Seat Units | 270 total, 45 per Hall: 30 STANDARD in rows A–C, 10 VIP in D, 5 indivisible COUPLE in E (1-2 to 9-10); 50 guests per Hall |
| Showtimes | 72: tomorrow/day +2/day +3, 4 daily slots per Hall at 10:00/13:00/16:00/19:00 in configured discovery timezone |
| Timing/price | End derives from Movie duration; 15-minute occupancy buffer; cutoff 15 minutes before start; base_price 90000 for all whole units, no type adjustment |
| Membership | 3240 explicit sellable showtime_seats |
| Concessions | 5 ACTIVE: Popcorn Small 35000, Popcorn Large 55000, Coke 25000, Water 15000, Popcorn + Coke Combo 60000; POPCORN/DRINK/COMBO only |
| Promotions on verification day | SCDEMO10-20261001: PERCENTAGE 10, minimum 100000, cap 40000, limit 100; SCWELCOME50K-20261001: FIXED_AMOUNT 50000, minimum 150000, no cap, limit 100 |

Both Promotion windows are local day −1 through day +7, ACTIVE. Date-namespaced
codes are development database records unrelated to frontend fixtures. Existing
discount rules remain authoritative; seeding/application does not consume usage.

Posters use the neutral existing frontend asset `http://localhost:3000/file.svg`.
No frontend code/assets or external Movie/image API was added. It is a placeholder,
not artwork claiming to represent a real film.

### Future-relative data and idempotency

The seed samples database wall-clock time, derives the date in DISCOVERY_TIME_ZONE
and creates tomorrow through day +3. Movie assignment depends on the absolute
screening date/Hall/slot, not the seed's relative day offset. Same-day rerun is a
no-op for logical catalog data. A next-day run appends 24 screenings for the new
horizon day and two new date-scoped Promotions, retaining overlapping and past
records unchanged. No existing times, Hold deadlines, prices or Booking snapshots
are refreshed. Developers rerun when they need fresh dates; there is no automatic
production refresh job.

## 6. Files Created

- [DemoSeedApplication](../../backend/src/main/java/com/smartcinema/demo/DemoSeedApplication.java): dedicated opt-in non-web CLI and gates.
- [DemoSeedService](../../backend/src/main/java/com/smartcinema/demo/DemoSeedService.java): transaction, coherent dataset, collision checks and existing configuration writers.
- [DemoSeedPostgresTests](../../backend/src/test/java/com/smartcinema/demo/DemoSeedPostgresTests.java): 5 PostgreSQL/API tests.
- [DemoSeedSafetyTests](../../backend/src/test/java/com/smartcinema/demo/DemoSeedSafetyTests.java): 3 default-off/acknowledgement/profile tests.
- [Demo setup](../development/demo-seed.md).
- This report.

## 7. Files Modified

- [Root package](../../package.json): `seed:demo` script only; no new tooling/dependency/lockfile change.
- [Backend pom](../../backend/pom.xml): explicit existing normal main default with CLI override, avoiding ambiguous main selection after adding the seed entry point.
- [README](../../README.md#development-demo-catalog): exact command and setup link.
- [Current handoff](../ai/current-handoff.md): current evidence, workflow, limitations and immediate next step.

V1–V10, historical reports/contracts, application/domain/provider sources,
datasource settings, frontend and stable project context remain unchanged from
task entry. No persistent seed marker table or schema change was introduced.

## 8. Verification

| Check | Result / evidence |
|---|---|
| Migration/source preservation | PASS: task-entry SHA-256 comparison; V1–V10, historical reports/contracts and domain/provider/frontend unchanged |
| Full backend regression/package | PASS: **243 tests, 0 failures/errors/skips**, `mvn verify`, exit 0, BUILD SUCCESS, 1:08 min, 2026-10-01 16:02:59 +07:00 |
| New PostgreSQL seed tests | PASS: 5; existing public APIs, rerun, next-day horizon, collisions, actual owned Hold/Booking/add-on/Promotion flow and concurrent seed |
| Safety tests | PASS: 3; no seed bean without profile, missing CLI confirmation, recognized production profiles rejected |
| Fresh local CLI | PASS: new local database, Flyway V1–V10/Hibernate validate then committed seed; no historical migration change |
| Actual Neon preflight | PASS: read-only JDBC connected to Neon PostgreSQL 18.6, V1–V10 all success, Movies initially 0 |
| Actual Neon first seed | PASS: dedicated CLI completed 2026-10-01 15:59:23 +07:00, committed full catalog |
| Actual Neon second seed | PASS: root `pnpm seed:demo`, completed 16:01:12 +07:00; same dataset/codes/counts, no duplicated logical rows |
| Actual Neon database counts | PASS: 7 Genres/10 Movies/20 links/3 Cinemas/6 Halls/270 Seat Units/72 Showtimes/3240 memberships/5 Concessions/2 Promotions; duplicate Hall/start Showtime count 0 |
| Live public API reads | PASS: Movie list 10 PUBLISHED; detail PUBLISHED; Genre options 7; selected Genre filter 3 Movies; Movie-specific Cinemas 3; schedule 3 available dates, selected date returns screening; Seat map 45 units including 5 COUPLE; Concessions 5 |
| Local Promotion flow | PASS: two whole units including COUPLE produce guestCount 3; Concession subtotal added; percent discount 21500 and final 193500, then fixed discount 50000; rerun preserves Booking expiry |
| Forbidden target state | PASS: Neon Holds/Bookings/Payments/evidence/reconciliation/Tickets/audit all 0, consumed Holds/sold Booking Seats/PAID or QR Bookings all 0 |
| Frontend placeholder | PASS: existing `/file.svg` HTTP 200; no frontend change |
| Security | PASS: local `.env` ignored; no real credentials added/tracked/printed; no authentication bypass or provider result writer called by seed |
| Documentation/links/whitespace | PASS: README/setup/report/handoff reconciled, local links and `git diff --check` |
| TypeScript/ESLint/Playwright/full visual review | NOT RUN: frontend untouched; backend data/API and existing asset checks performed |
| Live Neon Hold/Booking/Promotion mutation | NOT RUN: ownership flow verified with isolated PostgreSQL rollback-only test fixtures; no demo Customer/Booking written to target |
| Provider interoperability/Payment success | NOT APPLICABLE: explicitly excluded; existing gates unchanged |

Full verification used the existing local test environment, all existing suite
flags plus DEMO_DB_TESTS=true, cleanup disabled, against dedicated local PostgreSQL
with isolated suite schemas. The newly created CLI development database is
`smart_cinema_demo_seed_20261001`. Do not run regression fixtures on Neon.

Live reads used the existing backend at localhost:8080 and current frontend at
localhost:3000; no other process was stopped/reconfigured. Neon verification
credentials came exclusively from ignored backend/.env. Temporary preflight/count
utilities performed read-only queries; no SQL grant/reset/schema workaround was
used. All temporary logs remain outside Git: `smart-cinema-demo-tests.log`,
`smart-cinema-demo-cli-local.log`, `smart-cinema-demo-cli-neon-first.log`,
`smart-cinema-demo-cli-neon-second.log`, `smart-cinema-demo-final-verify.log`.

## 9. Requirement Reconciliation

PASS for approved dataset, repeatability, actual Neon execution and catalog →
Cinema → Showtime → Seat API coverage. PUBLISHED Movies satisfy the existing
publication validator. Promotion behavior uses existing approved calculations.
No domain/status/type/pricing policy was changed. Seed creates no transactional
fixture, financial result, entitlement or authorization bypass. Tests create only
rollback-scoped owned pre-Payment flow through existing behavior.

## 10. Deviations / Conflicts

No business exception or scope expansion. The dataset uses explicit demo prefixes
and date-qualified Promotion codes rather than colliding with the frontend's
fixed fixture codes. Local poster placeholder is intentionally neutral. The root
seed command adds no framework. The existing compilation blocker was already
resolved and the complete suite now passes; Payment sources were preserved.
Existing Convention Conflicts: historical legacy filenames remain untouched.

## Convention Compliance

Validated against [project conventions](../development/project-conventions.md).

| Area | Result | Evidence |
|---|---|---|
| Folder/file/code naming | PASS | Lowercase demo package, PascalCase Java, conventional tests |
| Domain terminology/status | PASS | Existing Movie/Cinema/Hall/Seat/Showtime/Concession/Promotion vocabulary and storage tokens |
| API convention | NOT APPLICABLE | No endpoint added or changed; existing contracts tested |
| Database convention | PASS | Existing snake_case storage/routines, no new schema object or migration |
| Configuration/dependencies | PASS | Existing DB variables, default main preserved, no added dependency |
| Documentation/report/handoff | PASS | kebab-case setup, dated report template, current links and preservation |
| Frontend conventions | NOT APPLICABLE | No frontend source or asset change |

## 11. Known Limitations

- Production detection is explicit opt-in plus recognized profile checks, not a
  guarantee based on a database hostname. Only operators may choose a dev target.
- Seed needs migration/deployment privileges, not the restricted runtime role.
  Collisions or customized existing demo records abort rather than overwrite.
- Rerun appends future dates and dated codes. Old demo catalog/history is retained;
  no cleanup/deletion job or new seed-tracking entity is introduced.
- Only Home/Movies use real catalog clients today. Downstream UI adapters remain
  previews; no full checkout frontend wiring is claimed by this dataset task.
- Placeholder points at the default local frontend origin. No exported artwork,
  production CDN, real film metadata or external data dependency is provided.
- Demo Promotions still obey validity/minimum/usage rules; exhausted/expired
  records are not revived. No usage is reserved by the seed.
- Payment initiation/provider confirmation remains the current guarded application
  flow. No external Payment, paid issuance or Staff check-in was exercised here.

## 12. Next Recommended Step

The configured Neon database is already seeded. Run **`pnpm dev` from root**, then
open Home/Movies. Rerun **`pnpm seed:demo`** when new future dates are needed.
If continuing Customer integration, authorize the next scoped task to connect
existing Cinema/Showtime/Seat frontend adapters to approved real contracts. That
work is separate from seeding and from the still-pending provider certification.
