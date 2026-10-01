# Admin Showtime development guide

Read the [API contract](../api/admin-showtime-contract-v1.0.md) and
[project conventions](project-conventions.md). Flyway V12 adds the protected
Showtime writer; retain V1–V11 unchanged. No schema repair/disabled guards.

## Run and author

Use the ignored `backend/.env` and existing development Admin provisioning;
never paste secrets into reports. Run `pnpm dev` from repository root, or
`mvn spring-boot:run` from backend and `pnpm dev` from frontend. Default backend
8080/frontend 3000 remain unchanged. Real API calls use the existing Next proxy.

Sign in with an ACTIVE ADMIN, open `/admin/showtimes`, then Create Showtime.
Choose PUBLISHED Movie → ACTIVE Cinema → configured ACTIVE Hall → date/time →
exact price → allowed initial status. The form displays the backend IANA zone
and converts explicitly; browser-local timezone does not decide the instant.
Ambiguous/missing DST times require another time. Cinema change clears Hall.

Server derives end from persisted Movie runtime, occupied end equals end and
cutoff equals start. New Showtime plus all Hall membership commit atomically.
No type adjustment is invented; base price supports zero/four decimal digits.
Forward lifecycle options come from current detail; stale changes can fail 409.
Any Hold/Booking history or past/terminal state makes edits read-only. No Delete.

## Customer read integration

Normal Customer Movie → Cinema → Showtime → Seats uses existing public GET APIs,
not preview IDs or `previewState`/`seatPreview` query-controlled production mocks.
Date options/timezone come from the server. Discovery promises eligible schedules,
not free Seat counts or sold-out classifications. Seat map displays real whole
STANDARD/VIP/COUPLE units and AVAILABLE/HELD/BOOKED/UNAVAILABLE states.

Row/number ordering is a visual projection, not measured Hall geometry. COUPLE
remains one selectable button/two guests. Local selection/countdown creates no
Hold or reservation; availability is a read snapshot, not a purchase guarantee.
Concession onward and My Bookings/Tickets/QR remain local demonstrations. Legacy
mock factories are retained only for existing unit fixtures, not normal reads.
VIP is displayed correctly; no new VIP checkout demo price is fabricated, so
downstream Summary preview still requires its existing STANDARD/COUPLE fixtures.
Authoritative checkout requires separate Hold/Booking frontend integration.

## Verify

Backend: `mvn verify` with all existing PostgreSQL suite flags enabled and a
disposable local database. Do not point destructive isolated migration tests at
Neon. New tests use fresh schemas and populated V11→V12 upgrade; current-head
assertions advance to 12 while historical migration tests keep their exact target.

Frontend: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`,
`pnpm test:e2e` from frontend. On this Windows host the installed browser is Edge:
set `$env:PLAYWRIGHT_CHANNEL='msedge'` before Playwright. E2E HTTP fixtures use
real contract shapes; live proof must separately use no interception.

Live verification is development-only: after all automation passes, normal Boot
startup migrates configured Neon, normal login creates exactly one future
unreferenced Showtime on existing seed parents, and public API/browser reads
must reach the same membership. Stop before Hold/Booking. Finish with safe
CANCELLED state; preserve original seed/financial fingerprints and checksums.

Remaining modules/provider certification, automatic STARTED/ENDED progression,
operational cancellation with history and production deployment are outside
this slice. See the [implementation report](../reports/2026-10-02_admin-showtime-management_report.md).
