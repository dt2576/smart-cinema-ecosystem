# Smart Cinema Implementation Report

## 1. Task Information

Task: Correct Spider-Verse and Avatar posters  
Date: 2026-09-15  
Module: Customer Home movie catalog  
Type: Frontend asset correction  
Status: Complete

## 2. Requested Work

Replace the incorrect Home poster images for `Spider-Man: Across the Spider-Verse` and `Avatar: Fire and Ash`. The user explicitly approved retrieving the correct posters outside Stitch after the available Stitch candidates were verified as different fictional films.

## 3. Documents Reviewed

- Root and frontend `AGENTS.md`.
- `.agent/workflows/DEVELOPMENT_WORKFLOW.md` and `FRONTEND_WORKFLOW.md`.
- Applicable coding, UI/UX, document, traceability, and convention rules.
- [Project conventions](../development/project-conventions.md).
- `.stitch/DESIGN.md` and the previous Home poster asset report.
- BRD v1.2 BR-006 and SRS v1.2 FR-MOVIE-001.
- Current Home mock data and reusable `MovieCard` image flow.

## 4. Requirements Traceability

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| SRS v1.2 §3.2 FR-MOVIE-001 | Customer views the Movie Catalog | Yes | PASS: existing catalog behavior preserved |
| BRD v1.2 BR-006 | Movie information includes Poster | Presentation context only | PASS: each Movie now references its correct standalone poster |

No Use Case, NFR, or new business rule applies to this asset-only correction. No requirement ID was invented.

## 5. Implementation Summary

- Re-inspected the Smart Cinema Stitch project through read-only MCP operations.
- Rejected Stitch screen `385a395694ed4adc86af9a4a86891343` because its artwork is titled `Nexus Shift`, not Spider-Man.
- Rejected Stitch screen `e443081476ef45b889c07407a37fc00a` because its artwork presents a different fictional `Fire and Ash` film, not Avatar.
- Retrieved the official Spider-Man one-sheet from Sony Pictures and the official Avatar poster from the Disney UK press kit, following the user's approval.
- Copied both complete JPEG files without cropping, editing, conversion, or compositing.
- Updated the existing data-driven `posterUrl` values. `MovieCard` and its layout remain unchanged.

## 6. Files Created

- `frontend/public/images/movies/spider-man-across-the-spider-verse.jpg` — 1400 × 2100 JPEG.
- `frontend/public/images/movies/avatar-fire-and-ash.jpg` — 743 × 1100 JPEG.
- `docs/reports/2026-09-15_spider-verse-avatar-posters_report.md`.

Official source pages:

- Sony Pictures: `https://www.sonypictures.com/movies/spidermanacrossthespiderverse`
- Disney UK Press: `https://press.disney.co.uk/press-kit/avatar-fire-and-ash-press-kit`

## 7. Files Modified

- `frontend/src/features/home/home-mock-data.ts`: replaced the two temporary `/images/home/` fallback paths with standalone `/images/movies/` paths.

No previous assets were deleted. Historical reports still reference them, so preservation follows the task's deletion condition.

## 8. Verification

| Check | Result |
|---|---|
| TypeScript | PASS: `pnpm.cmd exec tsc --noEmit` |
| ESLint | PASS: `pnpm.cmd lint` |
| Build | PASS: `pnpm.cmd build`; `/` statically generated |
| Image identity | PASS: both downloaded images were visually inspected and show the requested movie titles/characters |
| Image decode | PASS: JPEG, 1400 × 2100 and 743 × 1100 |
| Aspect ratio | PASS: both are standalone portrait posters compatible with the existing 2:3 `MovieCard` frame |
| Interaction tests | NOT RUN: no interaction or business behavior changed |

## 9. Requirement Reconciliation

- PASS: both requested movies now use distinct standalone posters.
- PASS: no page screenshot, Stitch screen screenshot, or combined export was cropped.
- PASS: frontend only; no layout, content, backend, API, dependency, or business behavior changes.
- PASS: reusable `MovieCard` remains data-driven.
- PASS: Stitch designs were not modified.

## 10. Deviations / Conflicts

The latest Stitch candidates still conflict with the requested movie identities. They were not used. The approved external official-source fallback resolves the visible Home issue without treating those resources as correct Stitch assets.

Existing Convention Conflicts: none introduced. Approved exception: the user approved official external poster sources after the Stitch mismatch was reported.

## Convention Compliance

Validated against [project conventions](../development/project-conventions.md) before and after implementation, including this report.

| Area | Result | Notes |
|---|---|---|
| Folder naming | PASS | Existing `public/images/movies` folder |
| File naming | PASS | Clear lowercase kebab-case filenames |
| Code naming | PASS | Existing `posterUrl` data structure preserved |
| Domain terminology | PASS | Approved Movie terminology unchanged |
| Routes/imports/status | NOT APPLICABLE | No changes |
| API/database convention | NOT APPLICABLE | No changes |
| Documentation convention | PASS | Dated kebab-case report and correct convention link |

## 11. Known Limitations

The Spider-Verse image delivered by the Sony page is 1400 × 2100. The Avatar press poster is 743 × 1100. Both are sufficiently close to the existing 2:3 frame; `object-cover` may trim a small edge from Avatar because its source ratio is approximately 0.675.

## 12. Next Recommended Step

Run the Home page locally and visually confirm both cards at desktop and mobile widths.
