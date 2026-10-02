# Current AI handoff

Last reconciled: 2026-10-02, Asia/Ho_Chi_Minh. **Customer authoritative Seat Hold frontend COMPLETE**: final full regression, real Customer/Neon/browser verification and preservation PASS. No commit is implied. Read [project context](project-context.md), [AGENTS.md](../../AGENTS.md), workflows/conventions and Git status first. Current implementation status here supersedes historical local-Hold descriptions in stable context/older reports; no stable architecture/domain decision changed.

## Current milestone

Flyway head: **V12**, [migration](../../backend/src/main/resources/db/migration/V12__guard_admin_showtime_configuration.sql). **No migration or backend change in the Hold frontend task; no V13.** All V1–V12 source and applied Neon checksums are unchanged. Historical reports/contracts, BRD/SRS and Stitch references are preserved.

Latest evidence: [Hold frontend report](../reports/2026-10-02_customer-authoritative-seat-hold-frontend_report.md)
and [current development guide](../development/customer-seat-hold-frontend.md).
Read both [Seat/Hold v1.0](../api/seat-hold-contract-v1.0.md) and
[v1.1 delta](../api/seat-hold-contract-v1.1.md), plus
[current Customer screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md) and
[implementation plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md).

- Movie/Genre and Movie→Cinema→Showtime→Seat map use existing public APIs.
  Seat Selection now uses normal Customer JWTs for existing atomic whole-set
  POST, owned GET and exact-ID DELETE. No userId/role/timestamp/TTL/price authority
  is sent; stored roles never grant ownership. Public HELD does not identify an owner.
- Draft selection is separate from server-confirmed owned Holds. COUPLE is one
  indivisible unit/Hold for two guests; STANDARD/VIP one guest. Pending gates,
  conflict/uncertain-response reconciliation, safe errors and anonymous normal
  login resumption are implemented. No mock fallback after API failure.
- Countdown projects serverTime with monotonic elapsed time and exact earliest
  expiresAt. Entry/reentry/reload, expiry, focus/visibility and visible-page
  polling reload server truth without POST/renewal. Continue freshly reads
  owned/map truth, preserving exact string Hold origins and original deadline.
- Continue only opens the existing Concession preview with an in-memory future
  Booking handoff. No Booking creation/attachment, Payment/provider write,
  authoritative frontend price or issuance exists. Downstream preview context
  clears on reload/exit; returning to Seat Selection restores real owned Holds.
  No acquisition/reservation should ever be inferred from a downstream preview.

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
- Customer READ remains as implemented in the Admin Showtime slice. The subsequent Hold frontend integration above replaces local acquisition/countdown only; all downstream checkout/history/Ticket/QR adapters remain previews.

## Verification and live data

Latest backend full `mvn verify`: **294 PASS**, zero failures/errors/skips, PostgreSQL 18.4, jar/repackage PASS, completed 2026-10-02 03:40:17 +07:00. Includes fresh/upgrade, grants, strict input/auth, Hold/Booking/Payment origin, expiry/ownership/cutoff/concurrency, sale/settlement/Ticket integrity and string-safe domain IDs. Historical upgrade tests retain pinned versions.

Frontend TypeScript/ESLint/production build and **70 unit tests PASS**. Final-tree full Playwright **101/101 PASS**, installed Edge, one worker, retries=0, 5.8 minutes, including 14 Seat scenarios and all existing Customer/Admin tests. Documentation/local links/UTF-8/EOF/whitespace/report/handoff/secret checks PASS. **314 protected original backend/contract/design/requirement/Stitch/report files unchanged.** Test HTTP fixtures remain separate from actual browser/Neon evidence.

**Latest real Neon V12 PASS:** normal `mvn spring-boot:run` imported ignored `.env`; Flyway validated twelve migrations with no migration required, Hibernate validate/startup passed. No reseed. Cleanup and VNPAY were disabled only for verification processes; application defaults/source are unchanged. Two isolated normal QA Customers were registered through existing Auth API; no Admin credentials, fabricated identities, database bypass or provider calls.

Existing Showtime **12**, Movie **4**, Cinema **1**, Hall **1**, **2026-10-04 19:00 Asia/Ho_Chi_Minh**, 45 units/50 guests/five COUPLE units:

- Actual simultaneous A/B Seat 1 requests: **200/409**, one Hold; retry retained ID/deadline, owned GET isolated, foreign release 404, own/repeated release 204 and map AVAILABLE.
- Real normal Customer browser, no interception: Movie→Cinema→Showtime→map; STANDARD 1/A1 + COUPLE 41/E1-2 acquired atomically as Holds 2/3, **2 units/3 guests**. Server earliest expiry **2026-10-02 04:25:26.350704 +07** retained after reload, verified through exact origin/expiry comparison. Whole COUPLE release and VIP 31/D1 addition retained existing earliest deadline; clear/release restored availability.
- Desktop 1440×1000/mobile 390×844, map-contained scrolling, no document overflow and accurate summary/countdown passed. Stale second-Customer submission reconciled another-owner HELD/zero owned with continuation blocked. Actual host suspension later caused session/Hold expiry; ownership claims stopped safely. Final normal Customer API reads confirm zero active verification Holds and restored STANDARD/VIP/COUPLE availability.
- Final read-only audit: original catalog/hierarchy/schedules/membership/financial/transaction/evidence/audit/prior-Hold row fingerprints and all applied V1–V12 checksums unchanged. Exactly **five** verification Holds retained RELEASED/EXPIRED, unattached. Expected Customer registration/Auth activity only; no Booking/Payment, consumption, sold_at, Ticket/QR or destructive cleanup.

### Prior Admin Showtime evidence — preserved historical context

Normal Admin browser login/signed JWT created exactly one Showtime **73** on existing Movie **9** (`[DEMO] Clockwork Garden`), Cinema **1**, Hall **1**. Local start **2026-10-09 23:17 Asia/Ho_Chi_Minh**, end/occupied **2026-10-10 01:27**, cutoff=start. Exact price `90000.1234` safely edited to `90001.4321` without changing times. Public Cinema/schedule/detail/map and normal Customer browser reached the same **45 units, 50 guests, five whole COUPLE**. Desktop/mobile, keyboard and read-only preview disclosure passed without interception. No Hold/Booking/Payment created.

Final verification Showtime is **CANCELLED**, Admin read-only; Customer query omits it and public detail returns 404. All original catalog/hierarchy/schedule/membership/Booking/Hold/Payment/Ticket/Promotion/Concession/evidence/reconciliation/audit row fingerprints and V1–V11 checksums are unchanged. Auth login/token activity is expected, separate from that preservation check. Runtime ACL and non-superuser managed bootstrap checks PASS.

## Exact next recommended task — not authorization

**Customer Booking creation frontend integration using the authoritative Hold handoff.** Read Booking v1.0 plus all current additive revisions (latest v1.3) and Seat/Hold v1.0 + v1.1. Use owned authenticated creation from exact valid Hold identities; let the backend revalidate/attach the complete whole-unit set, cutoff/expiry and composition. Replace preview Booking identity/Seat price/aggregate deadline with returned authoritative values. Preserve original Hold origins, string IDs and COUPLE guest semantics. Scope subsequent Concession/Promotion/Payment integrations separately; never infer PAID, consume Holds or issue Ticket/QR from local preview. **Do not begin automatically.**

## Remaining limitations and dependencies

- Seat acquisition/release/countdown now uses authoritative APIs. Concession, Booking Summary/Promotion, Payment Method/Processing/Result and My Bookings/Tickets/QR remain preview adapters. VIP Hold/map is real; existing Summary demo fixtures price STANDARD/COUPLE only. Do not fabricate a VIP checkout price or treat demo totals as server totals.
- No bulk-release/replacement endpoint exists: clear uses sequential exact-ID releases, stops on failure and reconciles remaining ownership. No implicit release or renewal on navigation. Polling/operations reconcile rather than realtime push; reads are not a final Booking guarantee. Downstream previews carry original expiry but cannot prove continuing ownership.
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
| [Discovery v1.0](../api/customer-discovery-contract-v1.0.md), [Seat/Hold v1.0](../api/seat-hold-contract-v1.0.md), [v1.1 delta](../api/seat-hold-contract-v1.1.md), [latest frontend report](../reports/2026-10-02_customer-authoritative-seat-hold-frontend_report.md) | Real Customer read/Hold frontend; read both Hold versions for Booking handoff |
| [Booking v1.3](../api/booking-contract-v1.3.md), [Payment initiation](../api/payment-initiation-contract-v1.0.md) | Existing backend first-attempt/freeze, no frontend checkout integration |
| [Promotion v1.1](../api/promotion-composition-contract-v1.1.md), [Concession](../api/concession-composition-contract-v1.0.md) | Authoritative pre-Payment backend composition |
| [VNPAY v1.1](../api/vnpay-sandbox-payment-contract-v1.1.md), [v1.0](../api/vnpay-sandbox-payment-contract-v1.0.md), [report](../reports/2026-09-30_vnpay-sandbox-payment-backend_report.md) | Local protected result/finalization paths; real merchant certification pending |
| [Integrity v1.2](../db/integrity-enforcement-design-v1.2.md), [v1.1](../db/integrity-enforcement-design-v1.1.md), [dictionary](../db/physical-data-dictionary-v1.0.md) | Ordered guards, snapshots, protected paid finalization |
| [Demo seed](../development/demo-seed.md), [seed report](../reports/2026-10-01_development-demo-seed_report.md) | Historical 72 Showtimes/3240 memberships unchanged; never reseed for verification |
| [Final Customer QA](../reports/2026-09-28_customer-frontend-final-qa_report.md) | Historical preview milestone; Discovery/map/Hold descriptions superseded by current integration reports |
| [Development Admin provisioning](../development/development-admin-provisioning.md) | Existing opt-in non-web CLI, ignored local inputs; no account reset/promotion |

## Developer workflow

Run **`pnpm dev` from root**; see [README](../../README.md#local-development). Backend `.env` is Git-ignored and loaded as optional properties; never commit/print credentials. Keep Hibernate `ddl-auto=validate` and Flyway enabled. `pnpm admin:dev` remains opt-in; no seed/provisioning rerun was needed here.

Use dedicated local PostgreSQL for destructive isolated-schema tests, never Neon. Current regression DB: `smart_cinema_v11_accepted_20261001`; enable MOVIE_DB_TESTS, DISCOVERY_DB_TESTS, SEAT_DB_TESTS, BOOKING_DB_TESTS, CONCESSION_DB_TESTS, PROMOTION_DB_TESTS, PAYMENT_DB_TESTS, VNPAY_DB_TESTS and DEMO_DB_TESTS; deterministic test cleanup=false. Frontend uses installed Edge via `PLAYWRIGHT_CHANNEL=msedge`. Keep provider gates false until actual approved merchant evidence exists. No further migration, commit or feature is authorized by this handoff.
