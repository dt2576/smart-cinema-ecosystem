# Current AI handoff

Last reconciled: 2026-10-02 after V11 Guarded Admin Cinema/Hall/Seat Configuration completed. Implementation, full regression and live Neon API/UI PASS. No new commit is implied. Read [project context](project-context.md), AGENTS.md and Git status before editing.

## Current milestone

Backend Auth/Profile, Movie/Genre, Discovery, Seat/Hold, Booking, Concession, Promotion, Payment initiation/freeze and protected Sandbox result/finalization paths are implemented. Flyway head: **V11**, [migration](../../backend/src/main/resources/db/migration/V11__guard_admin_cinema_configuration.sql). V1–V10 files and applied Neon checksums remain unchanged.

The first real **Admin Foundation + Movie Management** slice is implemented:
verified active ADMIN access, `/admin`, real Movie list/create/edit and approved
publication/unpublication. It uses existing V3 persistence and public Customer
catalog rules; no Delete, other Admin module, provisioning or migration was added.
Read the [Admin contract](../api/admin-movie-contract-v1.0.md),
[developer guide](../development/admin-movie-management.md) and
[implementation report](../reports/2026-10-01_admin-foundation-movie-management_report.md).
Development provisioning now exists: root **`pnpm admin:dev`**, a separate non-web
CLI using ignored local `DEV_ADMIN_EMAIL`, `DEV_ADMIN_PASSWORD`, `DEV_ADMIN_NAME`
and `DEV_ADMIN_PHONE`. It rejects production/staging profiles, creates only absent
ACTIVE ADMIN accounts and verifies matching reruns without mutation. Conflicting
role/status/identity/password fails; no promotion or reset. Normal startup and
registration are unchanged. Read the [provisioning guide](../development/development-admin-provisioning.md)
and [provisioning report](../reports/2026-10-01_development-admin-provisioning_report.md).
**Live Neon Admin verification is now PASS:** normal login and signed JWT → active
Admin API → Movie DRAFT/public hiding → publish/public visibility → edit → unpublish
passed against PostgreSQL 18.6. Real browser login/list/publish/edit/unpublish and
Customer detail visibility also passed without interception. Exactly one verification
Movie was created: **ID `12`, Admin Verification Movie 20261001-222226**, left
UNPUBLISHED. Existing Admin provisioning rerun returned UNCHANGED; no new account
or seeded Movie change. Read the [historical live Movie report](../reports/2026-10-01_live-neon-admin-and-cinema-management-preflight_report.md).

**Admin Cinema/Hall/Seat is implemented and COMPLETE.** The separately authorized
V11 adds controlled configuration writers, a separate NOLOGIN function owner and
narrow EXECUTE grants; no columns/tables/indexes or historical migration changes.
Runtime still cannot directly INSERT/UPDATE/DELETE Seats, execute the deployment
initializer or inherit/set the configuration owner. No trigger bypass.
Read the [configuration contract](../api/admin-cinema-configuration-contract-v1.0.md),
[developer guide](../development/admin-cinema-configuration.md) and
[latest implementation report](../reports/2026-10-01_v11-admin-cinema-configuration_report.md).
Real Admin APIs/UI provide Cinema list/create/edit/status, Hall list/create/edit/status
and whole Seat initialization/status/safe metadata. Initialized Hall capacity is
immutable; any Showtime membership/Hold/Booking Seat reference protects identity.
No Delete, append/reshape, Manager authoring or Showtime Management.

Live Neon PostgreSQL 18.6 migrated normally through Flyway, then Hibernate validate
and startup passed. Normal Admin login/JWT created exactly one verification Cinema
ID **4**, Hall ID **7** and Seat Units **271/272/273**: three units, four guests,
including one whole COUPLE. Final verification hierarchy is INACTIVE. Plain ACTIVE
public Cinema visibility passed; Movie-filtered discovery correctly excluded it
without Showtime. All original three Cinemas/six Halls/270 units and seeded/
transactional data were preserved. Real desktop/mobile Admin navigation/save passed;
Admin Movie read and provisioning UNCHANGED rerun passed.

**Local verification PASS; real VNPAY interoperability DEFERRED.** All external confirmation gates default false. No merchant credentials, real VNPAY calls or external charge were used. Historical VNPAY slice `mvn verify`: **231 tests, zero failures/errors/skips**, PostgreSQL 18.4, fresh migration and populated V9 upgrade, package build PASS. See [implementation report](../reports/2026-09-30_vnpay-sandbox-payment-backend_report.md).

Customer frontend feature development remains frozen at previous preview QA.
Latest V11 Maven verify: **278 tests PASS, zero failures/errors/skips**, PostgreSQL
18.4 and package build PASS, 2026-10-02 00:01:20 +07:00. Frontend TypeScript/lint/
production build and **57 unit tests PASS**. Full Playwright: **87/87 PASS**, installed
Edge, one worker, no retries. The prior Showtime loading-test race is resolved by
holding only adapter timers in the test, asserting loading, releasing and checking
options; no production delay or removed assertion. Final live desktop/mobile,
documentation/links/whitespace, handoff, secrets and protected-scope checks PASS in
the V11 report. Historical preflight 81/82 evidence remains unchanged in its report.

## Exact next task

**Admin Showtime Management.** The V11 task is COMPLETE; STOP before this next
slice unless separately requested. Read SRS, Discovery/Seat/Hold contracts, V1–V11
and the configuration contract before defining the approved schedule/membership
write boundary. Preserve eligibility/cutoff, ordered locks, referenced identities,
financial snapshots and admission history. No generic table writes, trigger bypass
or HTTP owner-role switching.

Customer downstream Discovery/Seat/Booking/Payment adapters still use previews;
checkout integration is a separate task. The root development command and seeded
Home/Movies remain available.

Latest developer slice: [demo seed report](../reports/2026-10-01_development-demo-seed_report.md)
and [workflow](../development/demo-seed.md). `pnpm seed:demo` at root is opt-in, one-shot,
uses existing `.env`/Flyway/JPA validation, and commits only catalog/discovery data.
Actual Neon PostgreSQL 18.6 seed/reseed and public API reads PASS. Dataset: 7 Genres,
10 PUBLISHED Movies, 3 Cinemas, 6 Halls, 270 Seat Units, 72 future Showtimes with
3240 memberships, 5 Concessions and 2 date-namespaced Promotions. No Booking, Hold,
Payment, evidence, Ticket, QR or sale was seeded. Seed-task head was V10; current head is V11. Do not reseed or mutate existing records for verification.
Seed slice full Maven verify: **243 tests PASS, zero failures/errors/skips**, local
PostgreSQL regression plus package build, 2026-10-01 16:02:59 +07:00.

The separately approved provider follow-up remains pending:

**Provision a VNPAY Sandbox merchant and perform real interoperability confirmation before enabling affected integration gates.**

1. Configure secret merchant inputs, registered HTTPS IPN/ReturnURL and a separate least-privilege system database login. Follow the [configuration register](../api/vnpay-sandbox-payment-contract-v1.1.md#5-configuration-and-confirmation-register).
2. Capture actual PAY/query signature vectors, success and definitive negative combinations, callback acknowledgements, duplicate/reopened URL behavior, query visibility/throttling and merchant amount/window limits.
3. Verify lost-IPN recovery and special/late/contradictory outcomes in Sandbox. Enable only individually confirmed gates; record real evidence separately from local fixtures. Do not enable production money or automatic refunds.
4. Reconcile contracts/report and this handoff from actual evidence. Full frontend checkout integration, Booking history and Staff admission remain subsequent tasks.

## Current contracts and evidence

| Read | Boundary |
|---|---|
| [Admin Movie v1.0](../api/admin-movie-contract-v1.0.md), [Admin report](../reports/2026-10-01_admin-foundation-movie-management_report.md) | Current first Admin slice; active DB role check, DRAFT creation, publication, no Delete or account provisioning |
| [Development Admin guide](../development/development-admin-provisioning.md), [provisioning report](../reports/2026-10-01_development-admin-provisioning_report.md) | Explicit CLI provisioning implemented; historical report predates supplied input/live verification |
| [Admin configuration v1.0](../api/admin-cinema-configuration-contract-v1.0.md), [guide](../development/admin-cinema-configuration.md), [V11 report](../reports/2026-10-01_v11-admin-cinema-configuration_report.md) | Latest completed Admin Cinema/Hall/Seat slice; full regression and real Neon API/UI PASS |
| [Historical live Admin / Cinema readiness report](../reports/2026-10-01_live-neon-admin-and-cinema-management-preflight_report.md) | Prior Movie/Auth PASS and V11 authorization gate; subsequently resolved by separate V11 task |
| [VNPAY v1.1](../api/vnpay-sandbox-payment-contract-v1.1.md) plus approved [v1.0](../api/vnpay-sandbox-payment-contract-v1.0.md) | Implemented resources, configuration, disabled confirmation gates and provider policy |
| [Integrity v1.2](../db/integrity-enforcement-design-v1.2.md) plus [v1.1](../db/integrity-enforcement-design-v1.1.md) | V10 schema, protected writer, lock order, paid assertions and grants |
| [V10 report](../reports/2026-09-30_vnpay-sandbox-payment-backend_report.md) | Historical Payment verification and continuing provider deferrals |
| [Payment initiation](../api/payment-initiation-contract-v1.0.md), [Booking v1.3](../api/booking-contract-v1.3.md) | Permanent first-attempt freeze and base ownership/composition |
| [Promotion v1.1](../api/promotion-composition-contract-v1.1.md), [Concession](../api/concession-composition-contract-v1.0.md) | Snapshot and pre-Payment composition rules |
| [Seat/Hold v1.1](../api/seat-hold-contract-v1.1.md), [Discovery](../api/customer-discovery-contract-v1.0.md) | Exact origins, expiry, shared eligibility/cutoff |
| [SRS v1.2](../srs/srs-v1.2.md), [dictionary](../db/physical-data-dictionary-v1.0.md), [decisions](../db/database-design-decisions-v1.0.md) | Requirements and approved domain model |
| [Provider research](../reports/2026-09-30_vnpay-provider-research_report.md), [contract report](../reports/2026-09-30_vnpay-sandbox-payment-contract_report.md) | Historical evidence/design; not real Sandbox certification |
| [Final frontend QA](../reports/2026-09-28_customer-frontend-final-qa_report.md) | Preview coverage and remaining integrations |

## Active invariants and limitations

- Admin configuration uses actor → Cinema → Hall-exclusive → Seat ordering. Whole guest capacity and referenced identity remain protected. Durable searchable Admin audit, Manager authoring and layout reshaping remain deferred; after-commit technical logs match Admin Movie.

- Exact domain numeric(19,4) is unchanged. Provider submission alone requires positive whole VND, exact ×100 and confirmed merchant limits; no rounding or client-controlled amount.
- First freeze is permanent. Eligible historical V9 attempts bind once; original deadlines and snapshots never extend or reprice. Unresolved attempts cannot be replaced. Definitive mappings are empty until confirmed.
- ReturnURL is UX only. Signed IPN/verified Query use a separate protected system writer. Later BLOCKED alone is not a settlement veto. Normal runtime cannot forge results or directly mutate sale tables.
- Eligible verified SUCCESS atomically commits PAID/paid_at, sold_at, exact origin CONSUMED Holds, serialized Promotion usage, one Ticket per whole Seat Unit, one Booking QR and audit. COUPLE is one Ticket for two guests; no per-Ticket QR.
- Financial SUCCESS without entitlement is retained with reconciliation, never forced into PAID or a fake refund. Contradictory evidence and late additional success cannot trigger another automatic sale.
- Worker scheduling commits before network calls. Horizon/network errors do not imply failure. Audited operator case resolution exists as a protected database command; operator UI and automatic refund do not.
- Owned Payment detail projects issued Tickets/QR; standalone history/check-in APIs, notification sender, full checkout frontend integration, production provisioning/load and legacy Auth numeric userId correction remain outstanding.

## Developer workflow and verification

Run **`pnpm dev` at root**: [README](../../README.md#local-development).

Local datasource setup updated 2026-10-01: copy `backend/.env.example` to
`backend/.env`, fill Neon JDBC URL/username/password, and run the existing command.
Spring Boot imports the optional file as properties without extra dependencies;
OS overrides and local fallbacks remain supported. `.env` is Git-ignored. The
subsequent demo seed task verified actual Neon connection, existing V1–V10 history,
seed and rerun; configuration report below remains dated evidence. Migration head
and domain/provider scope remain unchanged. See the
[configuration report](../reports/2026-10-01_neon-local-database-configuration_report.md).
The subsequent user-reported startup blocker is now fixed: removed an unused
invalid test helper and isolated the config test from the developer's actual env
file. Full `mvn verify` with PostgreSQL: **235 tests PASS, zero failures/errors/skips**,
BUILD SUCCESS, 2026-10-01 15:07:58 +07:00. See the
[test compilation fix report](../reports/2026-10-01_backend-test-compilation-fix_report.md).
Neon catalog reads and demo command startup are now verified by the later seed report.

Run `mvn verify` in backend with a dedicated PostgreSQL database. Enable VNPAY_DB_TESTS, PAYMENT_DB_TESTS, PROMOTION_DB_TESTS, CONCESSION_DB_TESTS, BOOKING_DB_TESTS, SEAT_DB_TESTS, MOVIE_DB_TESTS, DISCOVERY_DB_TESTS and DEMO_DB_TESTS=true; SEAT_HOLD_CLEANUP_ENABLED=false for deterministic tests. Final V11 accepted database: `smart_cinema_v11_accepted_20261001`. Final verification ended 2026-10-02 00:01:20 +07:00, exit 0. Test-only Hikari limits prevent accumulated Spring contexts exhausting local PostgreSQL connections.

Managed Neon bootstrap initially rolled back because the migration principal lacked
SET authority for function ownership transfer. Final V11 temporarily grants required
SET/schema CREATE and revokes both before commit. The development runtime login
was separately enrolled in the existing restricted hold runtime role with INHERIT
TRUE and SET FALSE, following the guide. No direct Seat grants or owner inheritance/
SET authority. PostgreSQL may retain creator ADMIN-only membership in configuration
owner, with inheritance/SET disabled. Production must separate runtime/deployment
credentials.

Earlier development databases contain superseded uncommitted V10/V11 checksums;
do not repair/reuse them as final evidence. V1–V10 and historical reports/contracts
were preserved. Never put credentials here. Include handoff, current contracts,
report links and whitespace in final documentation checks.
