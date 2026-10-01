# Admin Movie development guide

## Run and access

Run `pnpm dev` at repository root using the existing database environment setup.
Open [login](http://localhost:3000/login), sign in with an existing active ADMIN,
then open [Admin Home](http://localhost:3000/admin). Admin login routes there
automatically; the account menu also links to Admin for ADMIN sessions.

| Screen | URL |
|---|---|
| Admin Home | `/admin` |
| Movie list | `/admin/movies` |
| Create draft | `/admin/movies/new` |
| Edit | `/admin/movies/{movieId}/edit` |

The browser uses the existing API proxy and Bearer session; it never connects
directly to PostgreSQL/Neon. The backend checks current database authority on every
Admin API request. The shell waits for verified access before rendering Movie
management and blocks guest/unauthorized sessions even on direct deep links.

## Development account provisioning

Use the explicit root `pnpm admin:dev` command with local inputs as documented in
[development Admin provisioning](development-admin-provisioning.md). It creates
only a new dedicated ACTIVE ADMIN, or verifies an identical existing account
without mutation. Conflicts fail. No default password, automatic promotion or
production provisioning is provided. The opt-in [demo seed](demo-seed.md) creates
catalog data only; public registration remains CUSTOMER-only.

## Movie flow

1. Create a Movie: title/duration are required; the result is DRAFT and private.
2. Edit the supported content and select existing options from `GET /api/v1/genres`.
3. Publish from the list when title, duration, release date, age rating, language
   and poster URL are complete. Description/trailer/Genres are optional.
4. Reload Customer Home/Movies; both consume the same PUBLISHED catalog API.
5. Unpublish from the list to withdraw public visibility. The Movie and historical
   transaction data remain stored. There is no Delete action.

Genre creation and every other Admin module remain outside this slice. Existing
scheduled Showtimes are not rescheduled by Movie content changes. Financial and
Booking snapshots are preserved.

## Verification

Backend: `mvn verify` in `backend/` with a dedicated local PostgreSQL test database
and the existing integration flags documented in [current handoff](../ai/current-handoff.md).
`MOVIE_DB_TESTS=true` enables the Admin PostgreSQL suites, including real login-token
API flow, current-role checks, concurrent publication/edits and snapshot preservation.
Tests allocate isolated schemas; do not run the regression suite on the demo Neon
database. Random test-only account credentials are never a development Admin account.

Frontend: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`, then
`pnpm test:e2e` from `frontend/`. If bundled Chromium is absent on Windows, set
`$env:PLAYWRIGHT_CHANNEL='msedge'` for the existing installed Edge browser.
Browser tests use explicit intercepted fixtures; they are distinct from real
PostgreSQL API integration evidence.

See [Admin Movie contract](../api/admin-movie-contract-v1.0.md) and
[implementation report](../reports/2026-10-01_admin-foundation-movie-management_report.md).
