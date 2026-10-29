# Smart Cinema — Stitch-First Frontend Workflow

**Status:** Mandatory for every future frontend implementation or frontend visual modification.

## Purpose
Implement the approved Google Stitch design with maximum achievable visual fidelity. The design is the visual source of truth; existing backend/API contracts and actual PRIMARY Neon data remain the functional source of truth.

## Phase policy
1. Finish remaining business modules and integration checks first. Defer project-wide visual alignment until the user authorizes that phase.
2. When the frontend phase begins, work one module at a time: retrieve Stitch references → implement → run the real app → compare screenshots → correct differences → report → STOP for review.
3. Do not perform an audit-only phase when implementation is requested.

## Required implementation sequence
1. Use the connected Google Stitch MCP to find the **approved** Smart Cinema project and exact screen. Retrieve screen ID, latest screenshot, HTML/exported assets, theme and typography tokens. Record which design revision was used. If multiple candidates exist, ask for confirmation; never choose a random design.
2. Map the design to the real Next.js route and inspect the existing page, shared components, API adapter and permissions. Identify design-only demo content and unsupported actions.
3. Implement the approved screen composition: shell, navigation, breadcrumbs, content hierarchy, columns, card/table/form layouts, inspector panels, dialogs, states and responsive behavior. Reuse Stitch assets/code where compatible. Do not substitute a generic template or simplify away designed elements.
4. Apply the exact available design tokens: font families, loaded font faces, weights, sizes, line heights, tracking, colors, spacing, radii, borders, shadows and iconography. Verify actual computed styles and loaded fonts in the browser, including Vietnamese glyphs.
5. Bind to existing real API data and supported operations. Never hardcode Stitch demo values or fabricate cinema, seats, statuses, financial data or actions. Respect role boundaries. Where the design assumes data or capabilities that do not exist, preserve the visual intent as far as truthful and mark the precise mismatch; do not silently invent backend behavior.
6. Start the real project with `pnpm dev` using the PRIMARY Neon configuration. Never silently switch to a local PostgreSQL database or local-dev.ps1. Use non-destructive checks on existing data; privileged Neon changes require separate explicit approval.
7. Capture reference and implementation screenshots at the **same viewport**, browser zoom, relevant state and representative real data. Compare side by side. Check shell width, grid proportions, alignment, density, fonts, colors, iconography, control dimensions and responsive states. Fix material mismatches and repeat comparison.
8. Run TypeScript, lint, relevant unit/E2E tests, keyboard/focus/accessibility checks and real frontend/backend connectivity. Distinguish mocked/fixture tests from live Neon checks.
9. Report per route: Stitch project/screen ID, route, reference revision, changes, screenshot locations, remaining deviations with reasons, Functional PASS/FAIL and Visual PASS/FAIL. STOP for user review before moving to the next module.

## Acceptance
- **Target:** 100% fidelity to approved Stitch for all visual details that can be faithfully reproduced. No arbitrary simplification, substitutions or unapproved redesigns.
- **Do not assert literal pixel-perfect or 100% achieved** without verifiable pixel-level evidence under matched conditions. Real data, supported capabilities, font rasterization and responsive environments may cause justified differences; disclose them.
- **Functional PASS** requires actual existing behavior and access controls to remain correct.
- **Visual PASS** requires a verified Stitch reference, direct screenshot comparison, matching major composition and typography, and no unresolved material discrepancies. Functional PASS alone never implies Visual PASS.
- If the Stitch reference is inaccessible, mismatched, or absent: **Visual BLOCKED**, not PASS. Ask for the missing reference.

## Hard boundaries
No backend/API/Flyway/schema changes, Neon business-data mutations, permission changes, fabricated actions, credentials in reports, commits, pushes or deployments as part of visual alignment unless separately authorized.
