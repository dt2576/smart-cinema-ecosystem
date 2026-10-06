# Current AI handoff

Last reconciled: 2026-10-05, Asia/Ho_Chi_Minh. **Customer Promotion application/removal COMPLETE**, with the conditional live-write verification limitation below. Primary frontend language: **Vietnamese**. The prior localization, Booking creation and Concession milestones remain accepted. No commit is implied for this task. Read [project context](project-context.md), [AGENTS.md](../../AGENTS.md), workflows/conventions and Git status first. Current status supersedes older preview/pre-composition descriptions; no stable architecture/domain decision changed.

## Current milestone

Real Promotion implementation: [current guide](../development/customer-promotion-composition-frontend.md) and [dated report](../reports/2026-10-05_customer-promotion-composition-frontend_report.md). Inline owned Summary code entry, authenticated PUT apply/replace/reapply and DELETE removal; no public Promotion list. Stored code/ID/discount and exact server totals, original Seat origins/deadline, fresh owned reads, explicit uncertain-result review and first-Payment freeze remain authoritative. Concession edits revalidate current Promotion; invalid terms roll back the whole edit until explicit removal/replacement. Final full regression and requirement/convention reconciliation PASS. Stop; Payment initiation is recommendation only. No Payment/issuance command or automatic mutation replay.

Prior accepted Concession implementation: [current guide](../development/customer-concession-composition-frontend.md) and [dated report](../reports/2026-10-05_customer-concession-composition-frontend_report.md). `/bookings/{bookingId}/concessions` has real active catalog and owned add/quantity/remove. Immutable line snapshots, exact server totals and original expiry remain; frozen/terminal read-only. Its accepted evidence is preserved separately below.

Localization evidence: [dated report](../reports/2026-10-03_frontend-vietnamese-localization_report.md) and [current guide](../development/frontend-vietnamese-localization.md). Existing API/status/role/seat-type values remain unchanged; shared display labels map to Vietnamese. Exact Booking money and explicit UTC remain authoritative. Preview VND formatting is Vietnamese. Safe errors, validation and accessible names are localized. Final-source TypeScript, ESLint, production build, **84/84 unit tests**, full **115/115 Playwright scenarios** (one worker, no retries/skips) and backend **294 tests** passed. Desktop/mobile production screenshots and existing keyboard/overflow checks passed. Prior Booking evidence below is preserved separately.

Flyway head: **V12**, [migration](../../backend/src/main/resources/db/migration/V12__guard_admin_showtime_configuration.sql). **No migration or backend change in this frontend task; no V13.** All V1–V12 source/applied Neon checksums and historical contracts/reports/requirements/Stitch are unchanged.

Latest evidence: [Booking frontend report](../reports/2026-10-02_customer-booking-creation-frontend_report.md),
[current guide](../development/customer-booking-creation-frontend.md),
[screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md),
[implementation plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md).
Read [Booking v1.0](../api/booking-contract-v1.0.md) plus additive
[v1.1](../api/booking-contract-v1.1.md), [v1.2](../api/booking-contract-v1.2.md),
[v1.3](../api/booking-contract-v1.3.md), and both
[Seat/Hold v1.0](../api/seat-hold-contract-v1.0.md) and [v1.1](../api/seat-hold-contract-v1.1.md).

- Movie/Genre → Cinema → Showtime → Seat map remain real public reads. Existing
  authenticated Customer Holds remain PostgreSQL-authoritative, atomic whole-set,
  separate owned GET/exact-ID release, server deadline and reload reconciliation.
- Primary **Tạo đơn đặt vé & xem thông tin** freshly confirms exact owned Hold origins,
  POSTs the complete Showtime/Hold set once, then opens real
  `/bookings/{bookingId}/summary` only after the server confirms identity.
  No client owner/role/status/price/time authority, fake API or mock fallback.
- Server whole-unit type/prices/totals and Booking expiry are authoritative.
  STANDARD/VIP one unit/guest; COUPLE one Booking Seat/two guests. Exact
  numeric(19,4) strings retain zero/fractions. Current screening labels are
  referenced metadata; the response supplies no currency/display timezone.
  Summary uses explicit UTC and never guesses a local query date from UTC.
- Owned GET restores direct/reloaded Summary even if public catalog hides the
  screening. Normal Customer login safely resumes the validated local Summary.
  Backend current role/account/ownership rules remain authoritative.
- Attached Holds remain ACTIVE with original expiry, excluded from standalone
  owned reads and forbidden individual release/reuse. Back shows HELD/disabled
  units, Vietnamese Booking recovery/return links, with no automatic writes/renewal.
- Pending/unknown creation gates changes. No automatic Booking POST retry.
  Explicit Recover Booking uses only the exact saved complete set under the
  existing eligible-unexpired-PENDING same-owner contract. A per-tab untrusted
  hint grants no ownership; unknown identity cannot be rediscovered once that
  recovery window expires because no Booking list endpoint exists.
- Real Summary now supports real Concession composition through its owned editor,
  plus inline real Promotion application/removal, then stops before Payment integration. Separate secondary Preview
  Concessions retains the static design demonstration only. Its quantities/codes/prices never modify a real Booking. No Payment/VNPAY,
  freeze, PAID, consumption, sold_at or Ticket/Booking QR is initiated by this UI.

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
- Customer READ remains as implemented in the Admin Showtime slice. Subsequent Hold frontend integration replaces local acquisition/countdown; primary Booking creation/owned Summary, Concession and Promotion composition are now real. Payment/history/Ticket/QR integrations remain separate previews.

## Verification and live data

Promotion verification: TypeScript, ESLint, production build, **104/104 unit tests** and backend **294 tests** passed. Full installed-Edge **148/148 Playwright** regression passed (7.7m, exit 0), including all 18 new scenarios, one worker, normal timeouts, no retries/skips. Read-only Neon preflight again found no future eligible open Showtime; full live Booking/Promotion writes are NOT RUN for that dependency. Actual no-interception production browser with ordinary Customer login read existing CANCELLED Booking 1, persisted state/deadline, reload/read-only/desktop/mobile/keyboard; zero page errors/business writes. All 19 original domain/history/financial fingerprints and V1–V12 applied checksums are unchanged. Scope/UTF-8/134 local Markdown links/whitespace/report/Convention Compliance PASS; 621/631 original files and all 21 original E2E files unchanged. Payment initiation is recommendation only.

### Prior Concession verification — preserved historical context

Concession verification: TypeScript, ESLint, production build, **94/94 unit tests**, full installed-Edge **130/130 Playwright scenarios** (6.9 minutes, one worker, no retries/skips, exit 0) and backend **294 tests** passed. All fifteen new browser scenarios passed in the full run. Scope, strict UTF-8, documentation links, whitespace, report inventory and Convention Compliance passed; 612/621 original files and all 19 original E2E files are unchanged. Live Neon validates V12 and has five active catalog items, but no future OPEN_FOR_BOOKING/cutoff-valid Showtime among 73 existing rows. Full new Booking/composition write proof is NOT RUN for that data dependency; no scheduling/catalog edits were made. No-interception real production-browser proof used ordinary QA Customer login, existing CANCELLED Booking 1 and real catalog; read-only/reload/desktop/mobile/keyboard passed, zero page errors. Original 19 domain/history/financial fingerprints and all V1–V12 applied checksums are unchanged. No new business writes or cleanup; expected Auth token activity is separate.

### Prior localization verification — preserved historical context

Localization verification: final-source TypeScript/ESLint/build PASS, unit **84/84 PASS**, full installed-Edge Playwright **115/115 PASS**, retries=0, one worker and normal timeouts. Backend `mvn verify` **294 PASS**, zero failures/errors/skips, completed 2026-10-02T19:42:54+07:00 using the existing dedicated local database and integration flags. Strict UTF-8/authorized-scope checks passed for all 118 changed/created files; 54 local Markdown links and whitespace/report/convention reconciliation passed. No backend, migration, API, requirement, historical-report or Stitch change. Browser localization QA renders the actual production frontend with isolated API fixtures; no new live Neon transaction or deployment occurred. Localization is accepted; stop before Concession integration.

### Prior Booking verification and live data — preserved historical context

Prior full `mvn verify`: **294 PASS**, 50 suites, zero failures/errors/skips,
dedicated local PostgreSQL regression with all existing integration flags,
jar/repackage PASS, completed 2026-10-02 16:14:17 +07. No backend edits.
Final-source TypeScript/ESLint/build and **81/81 unit tests PASS**. Accepted full
Playwright **115/115 PASS**, installed Edge, one worker, retries=0, 6.4 minutes.
Fourteen new Booking browser scenarios plus all prior Customer/Admin regression.
After the final type-only test-helper import convention correction, TypeScript,
ESLint and the 14 Booking scenarios passed again, retries=0, 20.7 seconds;
application runtime source was unchanged.
Final docs/link/whitespace/report/handoff checks PASS. **320 protected original
backend/contract/design/requirement/Stitch/report/stable-context files unchanged.**
HTTP test simulators are separate from actual no-interception live proof.

**Real Neon V12 PASS:** normal `.env` startup validated twelve migrations,
required no migration/reseed and passed Hibernate validate. Verification-only
process overrides disabled Hold cleanup/VNPAY to preserve original history;
application defaults/source are unchanged. Existing isolated normal QA Customers
were reused through ordinary login; no Admin credentials or database bypass.

Normal real browser Home → Movies → Movie Detail → Cinema → Showtime → Seat →
owned Holds → **one server Booking** → Summary. Existing Showtime **12**, Movie
**4**, Cinema **1**, Hall **1**, 2026-10-04 19:00 Asia/Ho_Chi_Minh:

- STANDARD Seat **1/A1**, VIP **31/D1**, whole COUPLE **41/E1-2**, atomically
  acquired as Holds **6/7/8**, then attached by one normal UI create operation to
  Booking **1**, initially PENDING. **3 Seat Units / 4 guests**; each saved price
  `90000.0000`, aggregate `270000.0000`; no Concessions/Promotion/Payment.
- Exact original Hold/Booking expiry **2026-10-02T10:09:36.316360Z** retained
  after owned Summary reload and mobile browser Back/keyboard Return to Booking.
  Own independent Hold GET omitted attached origins; map HELD; all three units
  and fresh Create disabled on Back. Attached individual release **409**, foreign
  Customer detail **404**, anonymous **401**, owned GET **200**.
- Desktop 1440×1000/mobile 390×844 visual/keyboard checks PASS; no document
  overflow, complete COUPLE and exact amounts/deadline. Browser console errors
  empty. Live screenshots are linked in the report under ignored verification
  output, with initial PENDING and final retained terminal-state evidence.
- Safe cleanup used existing owned **DELETE Booking** (logical cancellation,
  **204**, no physical delete). Final Booking **1 CANCELLED**, three snapshots
  retained, Holds **6/7/8 RELEASED** with identical original expiry/attachment,
  Seats **1/31/41 AVAILABLE**. Exactly one verification Booking remains.
- Final read-only audit: original catalog/hierarchy/schedules/membership,
  prior Holds/Bookings/Seat lines and all financial/Payment/Ticket/Promotion/
  Concession/evidence/reconciliation/audit fingerprints plus V1–V12 checksums
  unchanged. No payment_started_at/paid_at/sold_at/CONSUMED/usage/Ticket/QR,
  provider/external financial activity or destructive cleanup. Expected Auth
  login/token activity is separate. Earlier five verification Holds are unchanged.

### Prior Admin Showtime evidence — preserved historical context

Normal Admin browser login/signed JWT created exactly one Showtime **73** on existing Movie **9** (`[DEMO] Clockwork Garden`), Cinema **1**, Hall **1**. Local start **2026-10-09 23:17 Asia/Ho_Chi_Minh**, end/occupied **2026-10-10 01:27**, cutoff=start. Exact price `90000.1234` safely edited to `90001.4321` without changing times. Public Cinema/schedule/detail/map and normal Customer browser reached the same **45 units, 50 guests, five whole COUPLE**. Desktop/mobile, keyboard and read-only preview disclosure passed without interception. No Hold/Booking/Payment created.

Final verification Showtime is **CANCELLED**, Admin read-only; Customer query omits it and public detail returns 404. All original catalog/hierarchy/schedule/membership/Booking/Hold/Payment/Ticket/Promotion/Concession/evidence/reconciliation/audit row fingerprints and V1–V11 checksums are unchanged. Auth login/token activity is expected, separate from that preservation check. Runtime ACL and non-superuser managed bootstrap checks PASS.

## Exact next recommended task — not authorization

**Real Customer Payment initiation frontend integration against the existing backend Payment contract.**
Read [Payment initiation](../api/payment-initiation-contract-v1.0.md), [Booking v1.3](../api/booking-contract-v1.3.md), Promotion v1.1 and the current composition guides/reports. Preserve reviewed stored snapshots, exact authoritative amounts, original deadline and atomic permanent first-attempt freeze. Provider, verified results/issuance and broader history remain separately scoped. **Do not begin automatically.**

## Remaining limitations and dependencies

- Seat/Hold, Booking creation/owned Summary, Concession and Promotion composition now use authoritative APIs. Payment and My Bookings/Tickets/QR remain preview integrations. VIP Booking snapshots are real; old Summary demo pricing supports STANDARD/COUPLE only and must never determine persisted prices.
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
| [Discovery v1.0](../api/customer-discovery-contract-v1.0.md), [Seat/Hold v1.0](../api/seat-hold-contract-v1.0.md), [v1.1 delta](../api/seat-hold-contract-v1.1.md), [Hold frontend report](../reports/2026-10-02_customer-authoritative-seat-hold-frontend_report.md) | Real Customer read/Hold and Booking frontend; latest evidence/guide above |
| [Booking v1.3](../api/booking-contract-v1.3.md), [Payment initiation](../api/payment-initiation-contract-v1.0.md) | Backend first-attempt/freeze; real Booking/Concession/Promotion frontend stops before Payment initiation |
| [Promotion v1.1](../api/promotion-composition-contract-v1.1.md), [Concession](../api/concession-composition-contract-v1.0.md) | Authoritative pre-Payment backend composition |
| [VNPAY v1.1](../api/vnpay-sandbox-payment-contract-v1.1.md), [v1.0](../api/vnpay-sandbox-payment-contract-v1.0.md), [report](../reports/2026-09-30_vnpay-sandbox-payment-backend_report.md) | Local protected result/finalization paths; real merchant certification pending |
| [Integrity v1.2](../db/integrity-enforcement-design-v1.2.md), [v1.1](../db/integrity-enforcement-design-v1.1.md), [dictionary](../db/physical-data-dictionary-v1.0.md) | Ordered guards, snapshots, protected paid finalization |
| [Demo seed](../development/demo-seed.md), [seed report](../reports/2026-10-01_development-demo-seed_report.md) | Historical 72 Showtimes/3240 memberships unchanged; never reseed for verification |
| [Final Customer QA](../reports/2026-09-28_customer-frontend-final-qa_report.md) | Historical preview milestone; Discovery/map/Hold descriptions superseded by current integration reports |
| [Development Admin provisioning](../development/development-admin-provisioning.md) | Existing opt-in non-web CLI, ignored local inputs; no account reset/promotion |

## Developer workflow

Run **`pnpm dev` from root**; see [README](../../README.md#local-development). Backend `.env` is Git-ignored and loaded as optional properties; never commit/print credentials. Keep Hibernate `ddl-auto=validate` and Flyway enabled. `pnpm admin:dev` remains opt-in; no seed/provisioning rerun was needed here.

Use dedicated local PostgreSQL for destructive isolated-schema tests, never Neon. Current regression DB: `smart_cinema_v11_accepted_20261001`; enable MOVIE_DB_TESTS, DISCOVERY_DB_TESTS, SEAT_DB_TESTS, BOOKING_DB_TESTS, CONCESSION_DB_TESTS, PROMOTION_DB_TESTS, PAYMENT_DB_TESTS, VNPAY_DB_TESTS and DEMO_DB_TESTS; deterministic test cleanup=false. Frontend uses installed Edge via `PLAYWRIGHT_CHANNEL=msedge`. Keep provider gates false until actual approved merchant evidence exists. No further migration, commit or feature is authorized by this handoff.
