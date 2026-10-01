# Current AI handoff

Last reconciled: 2026-10-02, Asia/Ho_Chi_Minh. Admin Showtime + Customer real READ task **COMPLETE**: final full regression, live Neon verification and preservation PASS. No commit is implied. Read [project context](project-context.md), [AGENTS.md](../../AGENTS.md), workflows/conventions and Git status first.

## Current milestone

Flyway head: **V12**, [migration](../../backend/src/main/resources/db/migration/V12__guard_admin_showtime_configuration.sql). Exactly one forward migration was authorized and added. V1–V11 source and applied Neon checksums are unchanged. Historical reports/contracts, BRD/SRS and Stitch references are preserved.

**Admin Showtime Management and real Customer READ integration are implemented.**
Read the [latest contract](../api/admin-showtime-contract-v1.0.md),
[development guide](../development/admin-showtime-management.md) and
[implementation report](../reports/2026-10-02_admin-showtime-management_report.md).
The [historical preflight](../reports/2026-10-02_admin-showtime-management-preflight_report.md)
stopped at authorization; the separate accepted task resolved that gate and approved policy.

- ACTIVE ADMIN independently required on list/detail/create/update. No Delete or Manager authoring. `/admin/showtimes`, `/new`, `/{showtimeId}/edit` use real JWT APIs.
- New authoring: PUBLISHED Movie, ACTIVE Cinema/Hall, complete physical guest-capacity layout. Hall is permanent. Atomic Showtime plus all membership; maintenance/inactive units remain represented and nonsellable. COUPLE = one unit/membership, two guests.
- New/retimed end comes from persisted Movie duration; occupied_until=end; booking_cut_off=start. Exact nonnegative numeric(19,4), including zero/fractions. Price/status-only edits preserve saved times. Half-open existing Hall exclusion remains the concurrency backstop.
- Create DRAFT/SCHEDULED/OPEN_FOR_BOOKING. DRAFT→SCHEDULED/OPEN_FOR_BOOKING/CANCELLED, SCHEDULED→OPEN_FOR_BOOKING/CANCELLED, OPEN_FOR_BOOKING→CANCELLED. Same-state safe future edits only. Any Hold/Booking history freezes commercial/schedule/lifecycle. No Admin STARTED/ENDED, regressions or cancelled reopening.
- Runtime gets only guarded configuration writer EXECUTE. No direct Showtime/membership DML, initializer execution, configuration-owner inheritance/SET, HTTP role switching or disabled trigger. Managed bootstrap SET/schema CREATE is revoked before commit. After-commit technical audit follows existing Admin pattern.
- Customer Movie→Cinema→Showtime/detail→Seat map READ now uses existing public GET APIs. Server eligibility, date options and IANA zone remain authoritative. No new endpoints or inferred sold-out/count/pricing fields. Local Seat selection/countdown creates no Hold/reservation. All transactional frontend adapters remain previews.

## Verification and live data

Backend full `mvn verify`: **294 PASS**, zero failures/errors/skips, PostgreSQL 18.4, package build PASS, completed 2026-10-02 02:12:58 +07:00. Includes fresh V1→V12, populated V11→V12, grants, strict input/auth, concurrency/overlap/history, membership and string IDs above JS safe range. Old historical upgrade tests retain their pinned version.

Frontend TypeScript/ESLint/build and **62 unit tests PASS**. Final-tree full Playwright **94/94 PASS**, installed Edge, one worker, no retries, 6.9 minutes; verified by 2026-10-02 02:56 +07:00. Five Admin tests additionally reran after the timing fixture correction; final full run also includes the scoped read-only status selector and obsolete Movie-entry badge cleanup. Documentation/links/whitespace, report, handoff, protected-history and secret checks PASS. Test HTTP fixtures are separate from the following real browser evidence.

**Real Neon PostgreSQL 18.6 PASS:** normal `mvn spring-boot:run` imported ignored `.env`, Flyway applied only V12, Hibernate validate and startup passed. No reseed. Cleanup was disabled only for the verification process to preserve existing transactional rows; no application configuration default changed.

Normal Admin browser login/signed JWT created exactly one Showtime **73** on existing Movie **9** (`[DEMO] Clockwork Garden`), Cinema **1**, Hall **1**. Local start **2026-10-09 23:17 Asia/Ho_Chi_Minh**, end/occupied **2026-10-10 01:27**, cutoff=start. Exact price `90000.1234` safely edited to `90001.4321` without changing times. Public Cinema/schedule/detail/map and normal Customer browser reached the same **45 units, 50 guests, five whole COUPLE**. Desktop/mobile, keyboard and read-only preview disclosure passed without interception. No Hold/Booking/Payment created.

Final verification Showtime is **CANCELLED**, Admin read-only; Customer query omits it and public detail returns 404. All original catalog/hierarchy/schedule/membership/Booking/Hold/Payment/Ticket/Promotion/Concession/evidence/reconciliation/audit row fingerprints and V1–V11 checksums are unchanged. Auth login/token activity is expected, separate from that preservation check. Runtime ACL and non-superuser managed bootstrap checks PASS.

## Exact next recommended task — not authorization

**Integrate Customer authoritative Seat Hold frontend with the existing Seat/Hold v1.0 + v1.1 contracts.** Replace local acquisition/release/countdown authority only after explicit task authorization. Preserve the real discovery/map adapters, string-safe identities, whole COUPLE units, authenticated ownership, server expiresAt/cutoff, atomic multi-unit conflict handling and original deadlines. Keep Booking/Payment frontend work separately scoped. Do not start automatically.

## Remaining limitations and dependencies

- Seat selection is local; Concession, Booking Summary/Promotion, Payment Method/Processing/Result and My Bookings/Tickets/QR remain preview adapters. VIP map display works; existing Summary demo fixtures price STANDARD/COUPLE only. Do not fabricate a VIP checkout price or treat demo totals as server totals.
- Automatic STARTED/ENDED progression, operational cancellation with history/refunds, Manager scoped authoring, Delete, layout reshaping and durable searchable Admin audit remain outside this task. Cinema-first behavioral contract remains unresolved; Movie-first real discovery is implemented.
- Legacy Auth response/session userId is numeric; new domain IDs are decimal strings. Do not claim global ID safety.
- Development datasource is a privileged migration login. Restricted runtime ACL is verified, but production must use separate deployment/runtime credentials. No deployment performed.
- VNPAY Sandbox merchant interoperability remains **DEFERRED and disabled by default**. No provider changes, external calls/charge, Payment result or Ticket/QR activity occurred in this task. Follow the current confirmation register only under separate authorization.

## Contracts and historical evidence

| Read | Boundary |
|---|---|
| [Admin Showtime v1.0](../api/admin-showtime-contract-v1.0.md), [latest report](../reports/2026-10-02_admin-showtime-management_report.md) | Current V12 authoring plus Customer real READ slice |
| [Admin configuration](../api/admin-cinema-configuration-contract-v1.0.md), [V11 report](../reports/2026-10-01_v11-admin-cinema-configuration_report.md) | Protected Cinema/Hall/Seat; final historical verification Cinema 4/Hall 7/Seats 271–273 remain INACTIVE |
| [Admin Movie](../api/admin-movie-contract-v1.0.md), [live Movie report](../reports/2026-10-01_live-neon-admin-and-cinema-management-preflight_report.md) | Existing management; historical verification Movie 12 remains UNPUBLISHED |
| [Discovery v1.0](../api/customer-discovery-contract-v1.0.md), [Seat/Hold v1.0](../api/seat-hold-contract-v1.0.md), [v1.1 delta](../api/seat-hold-contract-v1.1.md) | Next Hold integration must read both Hold versions |
| [Booking v1.3](../api/booking-contract-v1.3.md), [Payment initiation](../api/payment-initiation-contract-v1.0.md) | Existing backend first-attempt/freeze, no frontend checkout integration |
| [Promotion v1.1](../api/promotion-composition-contract-v1.1.md), [Concession](../api/concession-composition-contract-v1.0.md) | Authoritative pre-Payment backend composition |
| [VNPAY v1.1](../api/vnpay-sandbox-payment-contract-v1.1.md), [v1.0](../api/vnpay-sandbox-payment-contract-v1.0.md), [report](../reports/2026-09-30_vnpay-sandbox-payment-backend_report.md) | Local protected result/finalization paths; real merchant certification pending |
| [Integrity v1.2](../db/integrity-enforcement-design-v1.2.md), [v1.1](../db/integrity-enforcement-design-v1.1.md), [dictionary](../db/physical-data-dictionary-v1.0.md) | Ordered guards, snapshots, protected paid finalization |
| [Demo seed](../development/demo-seed.md), [seed report](../reports/2026-10-01_development-demo-seed_report.md) | Historical 72 Showtimes/3240 memberships unchanged; never reseed for verification |
| [Final Customer QA](../reports/2026-09-28_customer-frontend-final-qa_report.md) | Historical preview milestone; Discovery/map mocks superseded by this task |
| [Development Admin provisioning](../development/development-admin-provisioning.md) | Existing opt-in non-web CLI, ignored local inputs; no account reset/promotion |

## Developer workflow

Run **`pnpm dev` from root**; see [README](../../README.md#local-development). Backend `.env` is Git-ignored and loaded as optional properties; never commit/print credentials. Keep Hibernate `ddl-auto=validate` and Flyway enabled. `pnpm admin:dev` remains opt-in; no seed/provisioning rerun was needed here.

Use dedicated local PostgreSQL for destructive isolated-schema tests, never Neon. Current regression DB: `smart_cinema_v11_accepted_20261001`; enable MOVIE_DB_TESTS, DISCOVERY_DB_TESTS, SEAT_DB_TESTS, BOOKING_DB_TESTS, CONCESSION_DB_TESTS, PROMOTION_DB_TESTS, PAYMENT_DB_TESTS, VNPAY_DB_TESTS and DEMO_DB_TESTS; deterministic test cleanup=false. Frontend uses installed Edge via `PLAYWRIGHT_CHANNEL=msedge`. Keep provider gates false until actual approved merchant evidence exists. No further migration, commit or feature is authorized by this handoff.
