# Customer Frontend Screen Mapping and Plan Report

## 1. Task Information

Task: Canonical Customer screen mapping and implementation plan.
Date: 2026-09-25.
Module: Customer frontend.
Type: Source analysis and planning documentation.
Status: COMPLETE for documentation scope; no code implemented.

## 2. Requested Work

Select one Stitch source per Customer route/flow state, distinguish canonical/alternate/hidden/legacy/conflicting references, assess existing and missing frontend, identify unsupported controls and backend dependencies, and order completion work under SRS/contracts.

## 3. Documents Reviewed

- Development/frontend workflows; project conventions; UI/UX, documentation, coding and traceability rules; report template; frontend/AGENTS.md.
- Refreshed [.stitch/metadata.json](../../.stitch/metadata.json) and [SITE.md](../../.stitch/SITE.md), with DESIGN visual/business context.
- [SRS v1.2](../srs/srs-v1.2.md), section 6.1 Customer UI and applicable functional requirements.
- [Finalized Movie contract](../api/movie-service-contract-v1.0.md), adopted decisions and publication/access limits.
- [Database design decisions](../db/database-design-decisions-v1.0.md), first-payment composition freeze.
- Current frontend route tree, Home/sample Movie components, Auth/Profile forms and API/session code, header/menu, root layout, proxy and package scripts. Current backend controller inventory checked for dependency readiness.

## 4. Requirements Traceability

| Source | Coverage | Result |
|---|---|---|
| SRS 6.1 | Every named Customer UI step | PASS planning: mapped to a canonical route/state, including embedded Promotion and combined Bookings/Tickets/QR |
| FR-AUTH-001/002/003/005 | Existing registration/login/logout/profile | PASS source coverage identified; future regression checks specified |
| FR-MOVIE-001/002/003/007/008 | Catalog/detail/search/Genre/discovery | PASS plan; separates ready Movie reads from future Cinema/Showtime discovery |
| FR-SHOWTIME-006/007/008; FR-SEAT-001/004/005/009 | Showtime/Seat/Hold flow | PASS plan; backend contract gates explicit |
| FR-BOOKING-007/008/009/010/013/016/017 | Summary, Promotion, history and concessions | PASS plan; server totals, composition freeze and optional concessions |
| FR-PAYMENT-001/003/006/007 | Payment initiation/provider/verification/result | PASS plan; backend-confirmed results only |
| FR-TICKET-002/004/006/007/008 | One Ticket per unit; Booking QR and Ticket statuses | PASS plan; legacy per-Ticket QR excluded |

PASS means planning/documentation coverage, not implementation or runtime acceptance. No requirement IDs were invented.

## 5. Deliverable Summary

### Canonical mapping

The [screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md) maps every Customer route/state to one source ID. It selects 17 unique canonical IDs and classifies the remaining eight UI references as hidden alternatives or legacy/conflicting designs, accounting for all 25 UI screens. Image assets and audit resources are excluded from route mapping.

There are 15 target route patterns: four current routes (`/`, `/login`, `/register`, `/profile`) and 11 missing routes. Account menu is a shared component, not a route. Promotion remains within Booking Summary; payment processing is a Payment state; Booking QR is a state of combined Booking/Ticket detail.

### Current implementation

Home exists as a sample-data preview with local search and modal details, not a live Movie catalog/detail integration. Login, Register, Profile and account-menu/session flows call real Auth/Profile APIs in source. No downstream Movie/discovery/booking/payment/ticket pages or domain frontend clients exist. The sample MovieCard/type is reusable UI groundwork, not an implemented Movie contract.

### Completion order

The [implementation plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md) orders shared-shell/Auth regression, Movie list/detail, Home integration, Cinema/Showtime discovery, Seats/Holds, Booking/Concessions/Summary/Promotion, Payment, combined Bookings/Tickets/QR, then whole-journey verification. Each slice includes backend dependencies and acceptance gates.

Important gap: Movie genreId filtering exists, but a complete Genre-option discovery contract does not. The plan prevents deriving fake IDs/options from Stitch names or treating one response page as a complete Genre vocabulary.

## 6. Files Created

- [docs/ui-ux/screen-spec/customer-screen-map-v1.0.md](../ui-ux/screen-spec/customer-screen-map-v1.0.md).
- [docs/ui-ux/customer-frontend-implementation-plan-v1.0.md](../ui-ux/customer-frontend-implementation-plan-v1.0.md).
- This report.

## 7. Files Modified

None. Frontend/backend code, Stitch metadata/designs, finalized contracts and SRS remain unchanged. Earlier uncommitted work is preserved.

## 8. Verification

| Check | Result |
|---|---|
| Source route inventory | PASS: all frontend/src route files enumerated; four pages confirmed |
| Screen IDs | PASS: every referenced 32-character screen ID resolves in refreshed metadata; 17 canonical plus 8 excluded UI references |
| Flow coverage | PASS: all 15 SRS Customer UI labels represented; shared/embedded states explicitly identified |
| Behavioral reconciliation | PASS: public PUBLISHED-only Movie reads, unsupported controls excluded, one Booking QR and Ticket-level check-in retained |
| Document links/format | PASS: local links, trailing whitespace, report structure and git diff --check |
| Preservation | PASS: task-entry hashes compared for frontend/src, refreshed metadata/SITE, Movie contract and SRS; no changes |
| Build/tests/lint/browser QA | NOT RUN: documentation-only task; no runtime or visual acceptance claim |

Current source was inspected directly rather than inferring implementation from file names or previous reports. No live Stitch modification or frontend implementation tool action occurred.

## 9. Requirement Reconciliation

PASS for the requested mapping and planning task. The documents preserve visual authority in Stitch and behavioral authority in SRS/contracts, consolidate allowed screens, exclude unsupported features and distinguish ready APIs from in-scope but blocked integration. Future full Customer implementation remains outstanding as explicitly planned.

## 10. Deviations / Conflicts

No task deviation. Canonical Payment Result retains its layout ID but excludes its conflicting per-Ticket QR copy. All four hidden legacy Ticket designs are rejected as implementation sources. Canonical Movie/Profile screens also require excluding unapproved controls/content rather than copying generated HTML.

Existing Convention Conflicts: profile source includes hardcoded gradient colors; legacy source/document names are retained. These are pre-existing, unchanged and recorded for scoped cleanup, not treated as new exceptions. The planning files themselves follow current conventions.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md), including this report.

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | Existing docs/ui-ux/screen-spec; versioned kebab-case documents and dated report |
| Route naming | PASS | Lowercase static segments, plural resources and camelCase dynamic parameters; current URLs preserved |
| Domain/status terminology | PASS | Movie/Cinema/Showtime/Seat/Booking/Ticket retained; no new statuses |
| API/database convention | NOT APPLICABLE | Existing contract references only; no new backend API/schema design |
| Documentation | PASS | Source links, exact screen IDs, current evidence, dependencies and acceptance limits |
| Implementation naming | NOT APPLICABLE | No code changes |

## 11. Known Limitations

Frontend coverage is a source-based assessment, not a new browser/test run. Desktop Stitch references do not supply complete mobile/state designs. Downstream service contracts and Genre option discovery remain dependencies. Proposed target frontend routes do not authorize new backend behavior. No estimates or claims of production completeness are made for blocked slices.

## 12. Next Recommended Step

Scope implementation of the public Movie list/detail UI against the existing API, including the Genre-options contract decision, then integrate Home navigation/data while retaining the phased backend gates for the rest of the Customer journey.
