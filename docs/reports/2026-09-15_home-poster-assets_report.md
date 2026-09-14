# Smart Cinema Implementation Report

## 1. Task Information

Task: Replace Home image assets from Stitch  
Date: 2026-09-15  
Module: Customer Home, movie presentation  
Type: Frontend asset/reference update  
Status: Implemented with two documented asset fallbacks; browser verification unavailable.

## 2. Requested Work

Use standalone Stitch movie posters and the dedicated Dune landscape without redesign, business changes, dependencies, backend integration, screenshot cropping, or Stitch mutations.

## 3. Documents Reviewed

- Root and frontend AGENTS.md.
- .agent/workflows/DEVELOPMENT_WORKFLOW.md and FRONTEND_WORKFLOW.md.
- .agent/rules/PROJECT_CONVENTIONS.md, UI_UX_RULES.md, CODING_RULES.md, DOCUMENT_RULES.md, REQUIREMENT_TRACEABILITY.md.
- docs/development/project-conventions.md.
- .stitch/DESIGN.md, SITE.md, metadata.json.
- BRD v1.2 and SRS v1.2 movie requirements.
- Previous Home implementation report and current Home source.
- Installed Next.js image documentation and frontend package configuration.
- docs/reports/templates/TASK_REPORT_TEMPLATE.md.

## 4. Requirements Traceability

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| BRD v1.2 BR-006 | Movie metadata includes Poster | Yes | PASS: posters remain Movie presentation data |
| SRS v1.2 §3.2 FR-MOVIE-001 | Movie catalog | Yes | PASS: existing mock catalog preserved |
| SRS v1.2 §3.2 FR-MOVIE-002 | Movie details | Yes | PASS: preview and card share posterUrl |
| Booking QR behavior | No Booking changes in asset task | No | NOT APPLICABLE: no ticket or QR logic introduced |

## 5. Implementation Summary

Inspected project Smart Cinema Ecosystem, ID `1208499799798658711`, through read-only Stitch MCP project/screen operations. Inspected all ten candidate image resources visually. Their htmlCode fields are empty; screenshot file entries contain complete standalone artwork, not Home UI captures. Downloaded full-resolution images using the returned Google image URLs with the full-size `=s0` suffix. Copied accepted JPEG bytes without cropping, compositing, conversion, or image generation.

Seven verified posters now use explicit Movie.posterUrl values under /images/movies/. MovieCard and the details preview consume the same field. HOME_HERO_BACKDROP_URL identifies the separate landscape. Layout classes, 2:3 card frame, responsive sizes, hover, hero overlay, text, mock business values, VND formatting, and interactions are unchanged.

## 6. Files Created

| Asset | Stitch screen ID | File | Decoded dimensions |
|---|---|---|---|
| dune-part-two | `df50977f707947758394894e7a282864` | `frontend/public/images/movies/dune-part-two.jpg` | 848 × 1264 |
| oppenheimer | `6edaa1ec31154bf0a4b43a03091c0166` | `frontend/public/images/movies/oppenheimer.jpg` | 848 × 1264 |
| civil-war | `2a5914f8462a444895bd014510ba6282` | `frontend/public/images/movies/civil-war.jpg` | 848 × 1264 |
| past-lives | `517d9ab1a5814297af43fefb65e6704f` | `frontend/public/images/movies/past-lives.jpg` | 848 × 1264 |
| furiosa | `33afd83a57494e96bc46d408596fc034` | `frontend/public/images/movies/furiosa.jpg` | 848 × 1264 |
| gladiator-ii | `9b54d3edecd74da0b19c5ab08bafdbd6` | `frontend/public/images/movies/gladiator-ii.jpg` | 848 × 1264 |
| interstellar-10th-anniversary | `ca8ef62a23414c8b8047b566375cff5d` | `frontend/public/images/movies/interstellar-10th-anniversary.jpg` | 848 × 1264 |
| dune-part-two-hero | `d17964cf5cf34ae5ae8293d927d8a638` | `frontend/public/images/home/dune-part-two-hero.jpg` | 1376 × 768 |

Source resource pattern: `projects/1208499799798658711/screens/{screenId}/fileEntries/screenshot`.

Also created this report: `docs/reports/2026-09-15_home-poster-assets_report.md`.

## 7. Files Modified

- frontend/src/features/home/home-mock-data.ts: seven new poster paths, explicit paths for two retained fallbacks, hero constant.
- frontend/src/features/home/home-screen.tsx: data-driven hero and preview image references.
- frontend/src/features/movie/movie-card.tsx: reusable posterUrl consumption.
- frontend/src/features/movie/movie.types.ts: image replaced by posterUrl.

No old images deleted. The historical 2026-09-14 Home report references them; Spider-Verse and Avatar also remain active. Cinema assets and all pre-existing unrelated working-tree changes were preserved.

## 8. Verification

| Check | Result |
|---|---|
| TypeScript | PASS: pnpm.cmd exec tsc --noEmit |
| ESLint | PASS: pnpm.cmd lint |
| Build | PASS: pnpm.cmd build; Home statically generated |
| Whitespace | PASS: git diff --check; only existing LF/CRLF notices |
| Local decode | PASS: seven 848 × 1264 JPEG posters, one 1376 × 768 JPEG landscape |
| Distinct assets | PASS: all ten active image paths have different SHA-256 hashes |
| Image serving | PASS: all ten active static paths and /_next/image requests (w=640, q=75) return HTTP 200 image/jpeg on production server port 3012 |
| Home serving | PASS: production / returns HTTP 200 |
| Source visual inspection | PASS: accepted files are individual full poster artwork and dedicated landscape, without page UI |
| Aspect ratio | PASS by source inspection for seven replacements: 848/1264 closely matches unchanged 2/3 frame; object-cover trims about 0.63% of source width and does not stretch. Existing hover scaling preserved |
| Browser rendering | NOT RUN after update: connected cua browser inventory is empty; no browser visual pass claimed |
| Automated interaction tests | NOT RUN: no behavior changes; no new test dependencies introduced |

## 9. Requirement Reconciliation

- PASS: frontend-only assets and references; reusable MovieCard; dedicated hero; no layout/business/API/dependency changes.
- PASS: seven accepted posters are unique standalone files, not cropped page exports.
- PARTIAL: nine verified standalone movie posters cannot be claimed. Two candidate identities do not match the requested films; current assets retained under the user's explicit fallback rule.
- PASS: all active paths decode and resolve, including retained fallbacks.
- PARTIAL: browser rendering could not be verified through the connected tool. Source geometry and production image delivery checked instead.
- PASS: no Stitch design mutation; no requirement documents altered.

## 10. Deviations / Conflicts

| Movie | Candidate screen ID | Finding and action |
|---|---|---|
| Spider-Man: Across the Spider-Verse | `896acb2c4d5e42c396d4eba9706a7b3a` | Generic multiverse description; artwork explicitly reads “Multiverse: Echoes of Chaos.” Not a verified Spider-Man poster. Retained /images/home/spider-verse.jpg |
| Avatar: Fire and Ash | `817f0a5e5f02438b86a433aebc1ee807` | Artwork reads “Fire and Ash,” credits a different fictional film, and lacks Avatar identification. Not a verified Avatar poster. Retained /images/home/avatar.jpg |

No verified replacement was invented for these films. Their current files decode to 512 × 279 and retain the previous landscape-to-portrait fit limitation. Their standalone provenance is not newly certified.

Embedded credits, dates, and typography in accepted artwork are preserved as delivered by Stitch; they do not change mock Showtime data or business rules. No new BRD/SRS behavior conflict found.

Existing Convention Conflicts: none introduced in touched source. Historical files preserved. Approved exceptions: none required; retaining unavailable/unverified posters follows the explicit task instruction.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md) before editing and after implementation, including this report.

| Area | Result | Notes |
|---|---|---|
| Folder naming | PASS | movies under existing frontend/public/images |
| File naming | PASS | kebab-case JPEG and source names |
| Code naming | PASS | Movie, MovieCard, posterUrl, HOME_HERO_BACKDROP_URL |
| Domain terminology | PASS | Movie and Cinema preserved |
| Routes/imports/status | PASS | no routes/status changes; existing @/ alias retained |
| API convention | NOT APPLICABLE | no API |
| Database convention | NOT APPLICABLE | no database |
| Documentation convention | PASS | dated task report, template sections, correct convention link |
| Scope and dependencies | PASS | no package, layout, or backend changes |

## 11. Known Limitations

Two movie replacements remain pending verified Stitch assets. Browser visual verification is unavailable in the connected environment. Image HTTP/decode checks do not substitute for an actual browser render review.

## 12. Next Recommended Step

Provide correctly identified standalone Spider-Man and Avatar assets in Stitch, then replace the two fallbacks and perform a browser visual pass when a browser connection is available.

