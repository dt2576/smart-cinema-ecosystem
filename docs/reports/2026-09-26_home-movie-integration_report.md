# Smart Cinema Implementation Report

## 1. Task Information

Task: Integrate Customer Home with the real Movie catalog API

Date: 2026-09-26

Module: Customer Home / Movie

Type: Frontend integration and verification

Status: COMPLETE for requested frontend scope

## 2. Requested Work

Replace Home mock Movies with GET /api/v1/movies, reuse existing Movie client/types/components, preserve the canonical layout and Auth behavior, provide real detail/catalog navigation and loading/empty/error/retry states. Do not infer Now Showing/Upcoming from dates or implement Cinema/Showtime/backend/migration changes.

## 3. Documents Reviewed

- [Development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [frontend workflow](../../.agent/workflows/FRONTEND_WORKFLOW.md), applicable coding/UI/UX/traceability/document rules and [project conventions](../development/project-conventions.md).
- [Frontend instructions](../../frontend/AGENTS.md) and installed Next.js guides for data fetching and Link navigation.
- [Movie service contract](../api/movie-service-contract-v1.0.md), [Customer implementation plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md), [canonical screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md), relevant [SRS v1.2](../srs/srs-v1.2.md) and [BRD v1.2](../brd/brd-v1.2.md) Movie requirements.
- Live read-only Stitch Home reference: project 1208499799798658711, screen c667635786b940938d6071bb335830f9. Downloaded screenshot inspected; no design mutation.
- Existing Home, Movie API/query/DTO/request-state components, shared header, Auth storage/account menu, test configuration and package scripts.

Pre-implementation checks selected the existing home/movie feature directories, a HomeMovies component and a shared API-backed MovieCard. Planned verification included regression coverage of listing/detail, new Home states/navigation and existing Auth behavior. Movie release classifications in the prototype conflict with the current read contract and were explicitly excluded before coding.

## 4. Requirements Traceability

| Requirement / source | Description | Applicable | Result |
|---|---|---|---|
| SRS v1.2 FR-MOVIE-001 | Customer catalog with permitted visibility | Yes | PASS: Home reads the public catalog; server remains PUBLISHED visibility authority |
| FR-MOVIE-002 | Movie detail | Yes | PASS: hero/cards navigate to the real string-ID detail route |
| FR-MOVIE-003 | Valid search/discovery | Navigation scope | PASS: discovery links open /movies; no partial local search pretending to cover the catalog |
| FR-MOVIE-007 | Genre metadata | Read-only scope | PASS: returned Genre names displayed; no new Genre behavior |
| BRD v1.2 BR-005 / BR-007 | Shared catalog / Movie discovery | Movie slice | PASS; Cinema/Showtime part remains deferred |
| Movie contract §§3–5 | Public reads, string IDs, approved query/sort; dates do not imply screening | Yes | PASS |
| Customer plan, Home slice | Replace sample Movies while retaining layout | Yes | PASS |

No requirement identifiers were invented. No administration, screening eligibility or booking rule is added.

## 5. Implementation Summary

- HomeMovies calls the existing getMovies client once with page=0, size=9, sort=title,asc. Nine is a presentation limit matching the existing five-card and four-card rows, not a business rule.
- The first five server-ordered items form Explore Movies; the next four form More to Explore. No local sorting, release-date grouping or duplicate padding is performed. A smaller catalog displays fewer cards; the second section retains its catalog discovery action.
- The first returned item supplies the hero title, duration, age classification, Genres and poster. This is deterministic presentation, not popularity, a recommendation score or screening status. Generic descriptive copy replaces the hardcoded synopsis. The summary DTO does not supply trailer/description, so Home invents neither and adds no detail request.
- Loading, errors and empty catalog use a neutral hero without a fake Movie or detail link. Shared MovieLoading/MovieFeedback components provide loading, successful empty and retry states; the existing abort-aware request hook prevents obsolete results. Failed poster loads use existing card fallback; the hero falls back to its dark gradient.
- Reworked the obsolete preview MovieCard into the shared MovieSummary card already used visually by the listing. Home uses h3 card titles under section headings; listing retains h2 titles and filter-preserving detail URLs. Both reuse MoviePoster.
- Removed mock Movie arrays, sample opening metadata, hardcoded Dune hero/synopsis and preview Movie type. Home detail/showtime/trailer preview handlers and local sample search were removed. Hero/cards navigate to /movies/[movieId]; hero/section/footer Movie discovery links go to /movies. Existing header Movies link already points there.
- Existing hero dimensions, background layering, warm actions, five/four desktop row layout, responsive breakpoints and lower Home sections are retained. Auth/header/account-menu code is unchanged.
- Cinema/offer content and dialogs remain design previews within the existing layout. Their disclaimer now correctly applies only to those sections, not real Movie data. No downstream service integration was added.

## 6. Files Created

- frontend/src/features/home/home-movies.tsx
- frontend/test/e2e/home-movies.spec.ts
- docs/reports/2026-09-26_home-movie-integration_report.md

## 7. Files Modified

- frontend/src/features/home/home-screen.tsx: mount API-backed Movie sections; real Movie footer link; remove sample Movie actions; clarify remaining previews.
- frontend/src/features/home/home-mock-data.ts: remove Movie fixtures; retain Cinema/offer fixtures.
- frontend/src/features/movie/movie-card.tsx: shared MovieSummary/detail-link card.
- frontend/src/features/movie/movie-catalog.tsx: reuse extracted card while preserving list behavior.
- frontend/src/features/movie/movie.types.ts: remove obsolete preview-only Movie type.
- docs/ui-ux/customer-frontend-implementation-plan-v1.0.md and screen-spec/customer-screen-map-v1.0.md: reconcile Home coverage.

No dependency, package script, backend, migration, Auth or Stitch file changes. Existing uncommitted work remains preserved; no commit or branch was created.

## 8. Verification

Executed from frontend on 2026-09-26:

| Check | Evidence | Result |
|---|---|---|
| TypeScript | pnpm exec tsc --noEmit | PASS |
| ESLint | pnpm lint | PASS |
| Unit tests | pnpm test | PASS: 15 existing Auth/Movie tests |
| Production build | pnpm build | PASS: all existing routes generated, Home remains a prerendered shell with client data fetching |
| Playwright | PLAYWRIGHT_CHANNEL=msedge; pnpm test:e2e | PASS: 14 scenarios, including 6 new Home scenarios and 8 Movie regressions |
| Visual review | Home desktop/mobile screenshots against canonical layout | PASS for inspected structure; no horizontal overflow at tested 390px width |
| Preservation | SHA-256 comparison of 89 captured files | PASS: backend source/migrations, Stitch files, BRD/SRS, shared header, Auth context/account menu unchanged |
| Source reconciliation | Search for obsolete Movie mock constants, opening/metadata access and preview callbacks | PASS: none remain in home/movie source |
| Documentation/conventions | Links, whitespace, report/identifier naming and scope review | PASS |

The six Home browser scenarios cover one bounded request, server order, exact string IDs above 2^53, nine-item split, real detail/discovery links, past/future dates without screening classifications, pending/empty/503/network states, retry, one-item catalog without padding, missing/broken media, authenticated profile-menu/logout/session clearing, keyboard skip link and mobile Movies navigation. Shared Movie listing/detail regressions remained green after card extraction.

Browser tests run against the production frontend with API responses intercepted as isolated contract fixtures. Screenshots use existing local poster assets through test interception only; application Movie content has no mock fallback. Live backend/database acceptance was not performed in this frontend-only task. No new unit test mirrors slice/render implementation; new Home integration behavior is exercised in Playwright while existing client/query/Auth unit tests all run.

An initial account-menu test clicked its visually hidden label; its selector was corrected to the actual summary control. Final full Playwright run passed all 14 scenarios in 22.5 seconds. Informational Node module-format/color warnings did not fail verification. Generated screenshots/traces remain ignored under frontend/test-results; Home screenshots are home-desktop.png and home-mobile.png. Playwright starts/stops its production server on port 3100.

## 9. Requirement Reconciliation

| Area | Result | Notes |
|---|---|---|
| Real Home Movie content | PASS | Existing public API; no hardcoded Movie fallback |
| Layout and component reuse | PASS | Canonical hero/two rows; shared client, card, poster, feedback and request hook |
| Contract-safe hero | PASS | First catalog item only; no date-based state or extra fields |
| Navigation/string IDs | PASS | Real catalog/detail URLs; large-ID browser case |
| Loading/empty/error/retry | PASS | Shared states and browser coverage |
| Auth preservation | PASS | Code hashes unchanged; account/profile link/logout regression passed |
| Scope exclusions | PASS | No Cinema/Showtime/admin/backend/migration implementation |
| Live full-stack acceptance | NOT RUN | Browser fixtures verify frontend behavior, not a deployed backend |

## 10. Deviations / Conflicts

Canonical Home labels Now Showing/Coming Soon and Book Tickets require screening behavior absent from the current Movie contract. Neutral catalog headings and Explore Movies replace them. The same poster returned for the selected Movie is cropped as the decorative hero background because no backdrop field exists. This preserves the hero layout without inventing an asset mapping or new API field.

Existing Convention Conflicts: none introduced in touched files. Existing Cinema/offer sample content remains explicitly a preview and is not certified as live functionality. No convention exception was required.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md), including this report.

| Area | Result | Notes |
|---|---|---|
| Folder/file naming | PASS | Existing feature paths, kebab-case Home component/test, dated report |
| Code/import naming | PASS | PascalCase components, camelCase methods/props, existing @/ alias |
| Domain/status terminology | PASS | MovieSummary/Genre; no new Movie status or screening classification |
| Routes/API | PASS | Existing /movies and string-ID detail routes; approved public read parameters |
| UI conventions | PASS | Semantic tokens, shared components, responsive grids and heading hierarchy |
| Database | NOT APPLICABLE | No schema or migration edits |
| Documentation | PASS | Current coverage reconciled; historical reports and requirements preserved |
| Git | NOT APPLICABLE | No branch or commit created |

## 11. Known Limitations

Home intentionally shows only the first nine catalog items; the full catalog is one click away. Portrait posters may crop differently in the wide hero; unavailable media falls back without substituting a sample film. Genre/search/pagination controls remain on /movies. Cinema/offer sections remain previews. Browser verification used Chromium-based Edge at desktop/mobile sizes and contract fixtures, not a full accessibility or cross-browser audit.

## 12. Next Recommended Step

Verify Home/list/detail against a running backend with representative published data. Keep Cinema/Showtime and later Customer journey implementation gated by their own approved contracts and task scope.
