# Customer Frontend Implementation Plan v1.0

Date: 2026-09-25.
Status: Canonical planning baseline; Payment Result preview implementation status updated 2026-09-28.

## 1. Controlling references

- [Canonical screen map](screen-spec/customer-screen-map-v1.0.md): one source ID per route/state, current coverage and excluded variants.
- [Stitch inventory](../../.stitch/SITE.md), [metadata](../../.stitch/metadata.json), [visual guidance](../../.stitch/DESIGN.md).
- [SRS v1.2](../srs/srs-v1.2.md), Customer UI section 6.1 and relevant functional requirements.
- [Finalized Movie contract](../api/movie-service-contract-v1.0.md).
- [Database design decisions](../db/database-design-decisions-v1.0.md), particularly composition freeze at first payment initiation.
- [Project conventions](../development/project-conventions.md).

Stitch controls appearance; SRS and adopted contracts control behavior. Canonical selection never imports prototype sample rules. Uncompleted slices below require their own scoped task and verification. Do not modify external designs as an implicit step.

## 2. Current readiness and dependencies

Nine target frontend route patterns exist, plus the static `/bookings/preview/concessions`, `/bookings/preview/summary`, `/bookings/preview/payment`, `/bookings/preview/payment/processing` and `/bookings/preview/payment/result` previews: Home, Login, Register, Profile, `/movies`, `/movies/[movieId]`, `/movies/[movieId]/cinemas`, `/movies/[movieId]/cinemas/[cinemaId]/showtimes` and `/showtimes/[showtimeId]/seats`. Home uses the shared Movie API client/components for its hero and two catalog rows, with real detail/discovery links. Its Cinema/offer sections remain design previews. Movie list/detail use the same typed API client and existing backend proxy. Cinema and Showtime Selection load real Movie context and isolated local domain fixtures, with explicit preview labels. Cinema Continue now opens the Showtime route; Showtime Continue now opens Seat Selection with verified local context. Seat Selection uses an isolated local map, indivisible Couple units and an explicitly non-authoritative countdown; Continue now opens the Concession preview, carrying the original deadline and whole Seat Units in memory. Concessions use a local catalog adapter and continue to Summary with editable return. Summary contains local pricing and Promotion fixtures and passes its reviewed context to Payment Method. Payment Method uses typed local method fixtures and passes reviewed context to Payment Processing. The isolated Processing simulator demonstrates processing/verifying, success/failed/pending and retryable errors, prevents duplicate local actions and continues to the canonical Payment Result preview route. Result displays the complete review in distinct success/failed/pending presentations; failed can retry or choose another method, while pending returns to its unresolved local scenario. Demo success is never server-verified and pending remains unresolved. The original deadline survives all five routes; reload or leaving this preview flow clears context. Returning to Summary preserves Promotion/total; edits invalidate the review and require another Continue. Returning from Processing or Result to Payment Method clears the method/result handoff before entering Processing again; direct/reloaded URLs cannot construct context or a Result outcome. Result actions also recheck the original deadline and Showtime start. See the [Payment Result report](../reports/2026-09-28_payment-result-frontend_report.md). See the [Payment Processing report](../reports/2026-09-28_payment-processing-frontend_report.md). See the [Payment Method report](../reports/2026-09-28_payment-method-frontend_report.md). No Payment is initiated and no composition is frozen. See the [Booking Summary report](../reports/2026-09-28_booking-summary-frontend_report.md). See the [Concession report](../reports/2026-09-27_concession-selection-frontend_report.md). See the [Seat preview report](../reports/2026-09-27_seat-selection-frontend_report.md). See the [Showtime preview report](../reports/2026-09-27_showtime-selection-frontend_report.md). Auth/Profile remain API-connected; AuthProvider/account-menu behavior is preserved. See the [Movie frontend report](../reports/2026-09-26_movie-catalog-frontend_report.md), [Home integration report](../reports/2026-09-26_home-movie-integration_report.md) and [Cinema preview report](../reports/2026-09-27_cinema-selection-frontend_report.md) for verification and limits.

Current backend controllers support Auth, Profile and Movie list/detail. Cinema, Showtime, Seat/Hold, Booking/Concessions, Promotion, Payment and Ticket/Booking QR UI are in the SRS journey but lack implemented backend controllers/contracts. Distinguish **missing UI** from **missing backend support**, and **unsupported prototype feature** from an in-scope feature deferred for its service contract.

The Genre option-source dependency is resolved by public `GET /api/v1/genres` and the [Genre options contract](../api/genre-options-contract-v1.0.md). The Movie frontend selector now fetches that complete vocabulary, retains string IDs/server ordering and distinct duplicate names, and handles loading, empty options and independent retry. It does not derive options from paginated Movies. A Genre option does not guarantee matching published Movies.

## 3. Implementation order and completion gates

| Order | Slice / routes | Main work and source reuse | Dependencies and release gate |
|---|---|---|---|
| 1 | Shared shell and existing Auth/Profile | Reuse semantic tokens, Button/Icon/dialog and session plumbing; prepare real route navigation; regression-check login/register/profile/logout | Preserve existing Auth behavior; no fake target links; keyboard/focus/mobile checks; remove unsupported verification claims when that cleanup is authorized |
| 2 | Public `/movies`, `/movies/[movieId]` | IMPLEMENTED: Movie DTOs/client, title search, Genre options, approved sort, pagination, optional media, retry and uniform unavailable state | Public routes; frontend checks and browser contract fixtures passed. Live backend acceptance remains to be exercised with representative published data |
| 3 | Home integration | IMPLEMENTED: one public catalog request, shared cards and states, real detail/discovery links; canonical hero and two rows preserved | Neutral catalog sections, first server-ordered item in hero; no date-derived status. Cinema/offer sections remain explicitly marked design previews; full-stack acceptance remains pending |
| 4 | Cinema and Showtime selection | Cinema and Showtime MOCK UI IMPLEMENTED: context, dates, Hall groups, selected/loading/empty/retry/closed/unavailable/sold-out/started states. Showtime Continue opens Seat Selection; all discovery availability remains local preview data | Replace isolated Cinema/Showtime adapters only after discovery API/access/eligibility/time-zone contracts. No availability derived from Movie publication; server time and eligibility remain authoritative |
| 5 | Seat Map and Hold | Seat MOCK UI IMPLEMENTED: standard/couple units, state legend, whole-unit selection, guest/unit summary, local countdown/expiry and Concession handoff. Real Holds and realtime contention remain missing | Hold acquire/release/expiry/realtime and ownership contracts required; server clock/expiry authoritative; local countdown grants no Hold or Booking |
| 6 | Booking creation, Concessions, Summary + Promotion | Concession and Summary MOCK UI IMPLEMENTED at static `/bookings/preview/concessions` and `/bookings/preview/summary`: optional add-ons, editable return, sample Seat/Concession subtotals, embedded Promotion and grand total. Original Seat deadline retained. Summary now navigates to Payment Method with reviewed context | Production routes require a server-created owned Booking; pricing, Promotion eligibility/scope/rounding and freeze contracts required. No fake Booking ID or authoritative frontend amounts; preview does not initiate Payment or freeze composition |
| 7 | Payment selection/processing/result | Payment Method MOCK UI IMPLEMENTED at `/bookings/preview/payment`: typed sample providers, one available selection, loading/empty/unavailable/retry, original expiry and reviewed Promotion/total. Processing MOCK UI IMPLEMENTED at `/bookings/preview/payment/processing`: typed local outcomes, duplicate-action/cancellation guards and original expiry/start checks. Result MOCK UI IMPLEMENTED at `/bookings/preview/payment/result`: distinct truthful outcomes, complete review, failed retry/method return and unresolved pending recovery; no Tickets or QR | Live configured methods, Payment initiation and backend verification/reconciliation contracts required. Actual first initiation freezes composition atomically; preview never freezes, calls providers or issues Tickets/QR |
| 8 | `/my-bookings`, `/my-bookings/[bookingId]`, Booking QR state | Combined history/detail, per-Ticket states and one Booking QR presentation, ownership, expiry/cancellation/partial check-in views | Booking history/detail, Ticket status and Booking QR contracts required; no per-Ticket QR; Staff check-in reflected through refreshed server data |
| 9 | Whole-journey reconciliation | Replace remaining demo navigation, verify return paths, expiry/races, retry/reload and accessibility across all routes | All required APIs integrated; no hidden mock success paths; reconcile SRS, screen map and tests before declaring Customer experience complete |

UI-only prototyping for blocked slices may proceed in separately authorized work with explicitly isolated fixtures. Such work is not production-ready integration and must not simulate real payment success, grant Holds, or issue fake customer Tickets. No elapsed-time estimate is invented while backend contracts remain open.

## 4. Movie slice contract checklist

- Fetch only the public catalog/detail APIs; missing/hidden detail is the same 404. PUBLISHED is the only visible status; do not expose a status filter or turn dates into lifecycle states.
- Use string bigint IDs throughout links/state; do not convert them to JavaScript Number or reuse demo slugs such as dune as backend IDs.
- Inputs: q trimmed, at most 255 Unicode code points; one genreId; zero-based page default 0; size default 20, range 1–100; sort title/releaseDate/id with asc/desc, default title,asc. Send no rating/popularity/cast/pricing parameters.
- Keep the API's totalElements/totalPages and item ordering. Reset page on filter changes; preserve query/navigation state without appending duplicate parameters. Do not re-sort or locally filter a single server page as if it were the full catalog.
- Fetch GET /api/v1/genres for complete options; keep string IDs, server order and separate duplicate names. Handle empty metadata and load failure/retry; All Genres omits genreId. Do not treat an option as evidence of matching published Movies.
- DTO fields: title, duration, releaseDate, ageRating, language, posterUrl, status and Genres; detail adds optional description/trailerUrl. Hide unavailable optional content without inventing synopsis/media. Provide image failure handling. Review remote image/media configuration against actual approved URLs when implementing.
- Handle request races so an older search response cannot overwrite a newer one. Provide loading, no-results/reset, network retry, invalid-query feedback, out-of-range-page handling and detail unavailable states.
- Home and detail must not link to nonexistent checkout flows or display unsupported cast, price, schedule or score facts. Restore discovery actions when their contracts/routes are available; omission today is not removal from eventual SRS scope.

## 5. Booking and Ticket invariants

1. Seat availability, Hold ownership, TTL, prices and totals come from the server. Countdown display does not extend ownership. Recover stale selections by refreshing authoritative state.
2. One COUPLE Seat Unit is selected, priced and ticketed indivisibly. One Ticket per purchased Seat/Seat Unit; guest capacity may differ from Ticket count.
3. Summary displays Seats, Seat Amount, Concessions, Concession Amount, Promotion, Discount and Final Amount. Do not invent service fees or discount eligibility.
4. Booking composition freezes at the first payment initiation and stays frozen across failed/cancelled attempts. UI edit controls follow server eligibility; an expired or frozen Booking cannot be made editable by returning to a previous screen.
5. Browser redirects/callbacks do not prove payment success. Pending/late verification must remain distinct from paid issuance. Only backend-confirmed eligible outcomes show valid Tickets/QR.
6. Exactly one Booking QR belongs to one Booking. Use the same identity in card/detail/enlarged presentations; no per-Ticket QR route or carousel.
7. Scanning Booking QR retrieves the Booking and Tickets for authorized Staff. Check-in is per Ticket; partial check-in is valid. Customer displays statuses and cannot consume Tickets or check in an entire Booking.
8. My Bookings, Tickets and Booking QR may share the canonical screen family. History, selected Booking detail, amounts, Ticket states and QR must remain discoverable and ownership-protected even without separate visual designs.

## 6. UX states and acceptance evidence

| Area | Required states / checks |
|---|---|
| Shared / Auth | Anonymous/authenticated, hydration, expired session, renewal failure, validation/submitting, logout; safe same-origin return behavior once protected booking routes exist |
| Profile | Loading/load error/retry, view/edit/cancel/saving/success/field errors, 401 session recovery; protected fields remain read-only |
| Catalog/detail | Loading, empty catalog vs empty search, retry, stale request, invalid query, missing/hidden 404, null media/description, paging and keyboard controls |
| Discovery | No eligible Cinema/Showtime, closed/inactive branch, started/sold-out selection, changed context, server failure; retain accessible date/time choices |
| Seat/Hold | Available/held/booked/unavailable plus selected state; types labeled independently of color, acquisition pending/rejected, stale data, ownership failure, expiry/reselection, reconnect |
| Concessions/Summary | Loading/unavailable item, empty optional basket, quantity/removal errors, promotion valid/invalid/removed, changed server total, expired Hold, frozen composition |
| Payment | Disabled duplicate submission, initialization failure, pending/verification timeout, verified success, failed/cancelled/expired/late result, safe refresh and retry |
| Bookings/Tickets/QR | Loading/empty/error, ownership denied, PENDING/PAID/EXPIRED/CANCELLED as returned; VALID/CHECKED_IN/EXPIRED/CANCELLED Ticket states, mixed partial check-in, accessible QR enlargement and text Booking reference |

Error/empty/mobile variants without a dedicated Stitch resource inherit their route's canonical ID. Do not select a legacy screen to fill a missing state. Reflow desktop references using existing tokens and components; the inventory does not supply mobile-specific canonical screens.

For each implemented slice, follow repository checks from frontend: `pnpm test`, `pnpm lint`, `pnpm build` as relevant. Current pnpm test covers Auth storage/API, Movie API/query contracts and Cinema/Showtime/Seat/Concession/Summary/Payment preview adapters; `pnpm test:e2e` runs Movie, Home, Cinema, Showtime, Seat, Concession, Summary, Payment Method, Payment Processing and Payment Result browser scenarios against a production build using isolated Movie API fixtures. These do not certify future booking behavior or live backend deployment. Include browser checks of responsive layouts, keyboard navigation, visible focus, dialog focus return, labels, contrast, state announcements and reduced-motion behavior. Use focused API/UI integration scenarios instead of assuming a screenshot proves business correctness.

## 7. Scope and convention reconciliation

New feature code should use the existing feature organization (movie, booking, payment, ticket when actually implemented), shared components and semantic tokens. Preserve current routes and Auth contract. A planning document does not authorize mass renames or a new dependency. Read the installed Next.js guides required by frontend/AGENTS.md before future coding.

Existing source caveats for later scoped cleanup: Home retains Cinema/offer preview sections and their section navigation; Profile uses local hardcoded gradient values and verification wording not established by ACTIVE status. Home Movie discovery/navigation and the obsolete sample Movie type were reconciled in the Home integration task. Remaining caveats are not authorization for unrelated changes.

### Definition of completion

All 15 target URLs and required shared/embedded states in the map have a real implementation or a documented SRS-compatible consolidation; every in-scope transaction step uses approved server behavior; no unsupported controls or legacy QR flow remains; route/state, integration and accessibility checks pass. Completing a preview alone does not satisfy this definition. Optional external features (wallet, NFC, SMS, biometrics, cast/critic/popularity controls) are not completion requirements.
