# Customer Frontend Implementation Plan v1.0

Date: 2026-09-25.
Status: Canonical planning baseline; Final Customer frontend QA reconciliation dated 2026-09-28; final verification recorded in the QA report.

Current continuation, 2026-10-05: real Customer discovery, Holds, Booking creation/owned Summary and Vietnamese localization are already accepted. [Customer Concession composition](../development/customer-concession-composition-frontend.md) now adds `/bookings/[bookingId]/concessions` with active catalog, owned POST/PATCH/DELETE, immutable snapshots, exact server totals and unchanged expiry. Older planning-stage preview descriptions below are historical and are superseded by dated integration sections/current handoff. Promotion application/removal is the next separate task; Payment/history/Ticket integrations remain deferred. Live Concession write QA is unavailable because Neon currently has no future eligible open Showtime; automated persistence proof and limited real read-only browser proof are distinguished in the new report.

## 1. Controlling references

- [Canonical screen map](screen-spec/customer-screen-map-v1.0.md): one source ID per route/state, current coverage and excluded variants.
- [Stitch inventory](../../.stitch/SITE.md), [metadata](../../.stitch/metadata.json), [visual guidance](../../.stitch/DESIGN.md).
- [SRS v1.2](../srs/srs-v1.2.md), Customer UI section 6.1 and relevant functional requirements.
- [Finalized Movie contract](../api/movie-service-contract-v1.0.md).
- [Database design decisions](../db/database-design-decisions-v1.0.md), particularly composition freeze at first payment initiation.
- [Project conventions](../development/project-conventions.md).

Stitch controls appearance; SRS and adopted contracts control behavior. Canonical selection never imports prototype sample rules. Uncompleted slices below require their own scoped task and verification. Do not modify external designs as an implicit step.

## 2. Current readiness and dependencies

The canonical Customer presentation is implemented across **16 actual route patterns**: 11 canonical target paths plus five static checkout previews. The 15 production target paths are not all integrated: four owned-Booking checkout path patterns remain deferred. All 17 canonical Stitch references have a corresponding page, embedded state or shared component. Promotion is embedded in Summary; Booking/Tickets/QR share the combined detail family.

| Boundary | Current implementation | Remaining work |
|---|---|---|
| Home, Movie list/detail and Genre filtering | Existing public Movie/Genre API clients; title search, one Genre ID, pagination and approved sorting; neutral Home catalog sections | Live deployed API/data/media acceptance; no inferred Now Showing/Upcoming classifications |
| Login, Register, Profile, renewal and logout | Existing Auth/Profile API clients; actual role/status/email read-only; field errors and session recovery | Live backend acceptance and Auth numeric userId contract reconciliation; no email-verification claim or unsupported Remember me policy |
| Cinema / Showtime / Seat | Isolated local adapters; real Movie context; future/available selection; atomic STANDARD/COUPLE units and preview expiry | Authoritative discovery, Hall eligibility, VIP/HELD data, ownership, Hold acquire/release/realtime and server-clock contracts |
| Concessions / Summary / Promotion | Local add-on catalog, quantity selection, quote and Promotion demonstration; original Seat deadline preserved | Owned Booking creation; server snapshots/totals, eligibility/rounding, cancellation and composition freeze |
| Payment Method / Processing / Result | Local typed methods/simulation; success/failed/pending and retry; no verified success or issuance | Configured gateway methods, atomic first initiation, trusted verification, late outcomes and reconciliation |
| My Bookings / Tickets / Booking QR | Independent fictional read fixtures; individual Ticket states; one inert QR per PAID sample | Ownership-protected history/detail, actual issuance, secure Booking QR access and refreshed Ticket states |

The five checkout preview paths are `/bookings/preview/concessions`, `/bookings/preview/summary`, `/bookings/preview/payment`, `/bookings/preview/payment/processing` and `/bookings/preview/payment/result`. `preview` is a static segment, not a Booking ID. Reload or leaving this flow discards memory state. Editing reviewed composition invalidates the review; it does not freeze it. Returning to earlier steps cannot extend the original Seat expiry. Selecting Seats afresh starts a new demonstration without acquiring a Hold.

My Bookings is accessible through the shared header and Home footer. Leaving Payment Result for that list does **not** persist the payment preview or issue a Ticket. The five fixed history samples remain independent. Public preview routes are not an ownership implementation.

The obsolete Cinema-to-Showtime, Showtime-to-Seat and checkout stopping-point dialogs described in earlier reports have been replaced by routes. The remaining dialogs are intentional: Home design information/Movie-first discovery, Concession expiry and Booking QR presentation. Home Showtime shortcuts now lead to Movie discovery; there is no invented Cinema-first endpoint or route.

See the [final Customer QA report](../reports/2026-09-28_customer-frontend-final-qa_report.md) for current verification, route/state coverage, historical-report reconciliation and remaining backend contracts. Earlier reports remain historical evidence; their then-unimplemented downstream handoffs are not current blockers.

## 3. Implementation order and completion gates

| Order | Slice / routes | Main work and source reuse | Dependencies and release gate |
|---|---|---|---|
| 1 | Shared shell and existing Auth/Profile | IMPLEMENTED and QA-covered: shared navigation, Auth/Profile API flows, session recovery, keyboard menu dismissal and semantic tokens | Existing Auth behavior preserved; misleading verification copy and no-op Remember me removed; Profile Movie return corrected; production security remains backend-enforced |
| 2 | Public `/movies`, `/movies/[movieId]` | IMPLEMENTED: Movie DTOs/client, title search, Genre options, approved sort, pagination, optional media, retry and uniform unavailable state | Public routes; frontend checks and browser contract fixtures passed. Live backend acceptance remains to be exercised with representative published data |
| 3 | Home integration | IMPLEMENTED: one public catalog request, shared cards and states, real detail/discovery links; canonical hero and two rows preserved | Neutral catalog sections, first server-ordered item in hero; no date-derived status. Cinema/offer sections remain explicitly marked design previews; full-stack acceptance remains pending |
| 4 | Cinema and Showtime selection | Cinema and Showtime MOCK UI IMPLEMENTED: context, dates, Hall groups, selected/loading/empty/retry/closed/unavailable/sold-out/started states. Showtime Continue opens Seat Selection; all discovery availability remains local preview data | Replace isolated Cinema/Showtime adapters only after discovery API/access/eligibility/time-zone contracts. No availability derived from Movie publication; server time and eligibility remain authoritative |
| 5 | Seat Map and Hold | Seat MOCK UI IMPLEMENTED: standard/couple units, state legend, whole-unit selection, guest/unit summary, local countdown/expiry and Concession handoff. Real Holds and realtime contention remain missing | Hold acquire/release/expiry/realtime and ownership contracts required; server clock/expiry authoritative; local countdown grants no Hold or Booking |
| 6 | Booking creation, Concessions, Summary + Promotion | Concession and Summary MOCK UI IMPLEMENTED at static `/bookings/preview/concessions` and `/bookings/preview/summary`: optional add-ons, editable return, sample Seat/Concession subtotals, embedded Promotion and grand total. Original Seat deadline retained. Summary now navigates to Payment Method with reviewed context | Production routes require a server-created owned Booking; pricing, Promotion eligibility/scope/rounding and freeze contracts required. No fake Booking ID or authoritative frontend amounts; preview does not initiate Payment or freeze composition |
| 7 | Payment selection/processing/result | Payment Method MOCK UI IMPLEMENTED at `/bookings/preview/payment`: typed sample providers, one available selection, loading/empty/unavailable/retry, original expiry and reviewed Promotion/total. Processing MOCK UI IMPLEMENTED at `/bookings/preview/payment/processing`: typed local outcomes, duplicate-action/cancellation guards and original expiry/start checks. Result MOCK UI IMPLEMENTED at `/bookings/preview/payment/result`: distinct truthful outcomes, complete review, failed retry/method return and unresolved pending recovery; no Tickets or QR | Live configured methods, Payment initiation and backend verification/reconciliation contracts required. Actual first initiation freezes composition atomically; preview never freezes, calls providers or issues Tickets/QR |
| 8 | `/my-bookings`, `/my-bookings/[bookingId]`, Booking QR state | MOCK UI IMPLEMENTED: fictional history and combined detail, independent Ticket states including partial check-in, one Ticket per whole Seat Unit (Couple = two guests), one reusable inert Booking QR per PAID sample, enlarged QR, loading/empty/retry | Production ownership, Booking history/detail, Ticket status and Booking QR contracts required; no per-Ticket QR or Customer check-in. Public local fixtures are independent of checkout and never claim issuance or verified Payment |
| 9 | Whole-journey reconciliation | QA IMPLEMENTED for current UI/preview scope: complete desktop/mobile journey, route/anchor audit, API boundary review, expiry/race/reload cases, Auth/Profile browser coverage and convention reconciliation | All required APIs integrated; no hidden mock success paths; reconcile SRS, screen map and tests before declaring Customer experience complete |

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

For each implemented slice, follow repository checks from frontend: `pnpm test`, `pnpm lint`, `pnpm build` as relevant. Current `pnpm test` covers Auth storage/API, Movie API/query contracts, Cinema/Showtime/Seat/Concession/Summary/Payment/Booking/Ticket adapters and independent Booking QR decoding. `pnpm test:e2e` covers the entire desktop/mobile Customer journey, all feature slices, Auth/Profile form/session states, mock boundaries and reusable Booking QR against a production build with isolated API fixtures. These do not certify future booking behavior or live backend deployment. Include browser checks of responsive layouts, keyboard navigation, visible focus, dialog focus return, labels, contrast, state announcements and reduced-motion behavior. Use focused API/UI integration scenarios instead of assuming a screenshot proves business correctness.

## 7. Scope and convention reconciliation

New feature code should use the existing feature organization (movie, booking, payment, ticket when actually implemented), shared components and semantic tokens. Preserve current routes and Auth contract. A planning document does not authorize mass renames or a new dependency. Read the installed Next.js guides required by frontend/AGENTS.md before future coding.

Final QA removed Profile verification claims and hardcoded gradient values, corrected its Movie return, removed the ignored Remember me checkbox, and repaired Home Showtime recovery. Home Cinema/offer samples remain explicitly labeled before their cards. All application source modules are reachable from route entries; no further mock component was proven unused. The existing Auth response/storage uses numeric userId; Movie/Genre and domain preview IDs stay string-safe. Reconcile Auth bigint serialization jointly with backend before production rather than silently converting an already-rounded number.

### Definition of completion

All 15 target URLs and required shared/embedded states in the map have a real implementation or a documented SRS-compatible consolidation; every in-scope transaction step uses approved server behavior; no unsupported controls or legacy QR flow remains; route/state, integration and accessibility checks pass. Completing a preview alone does not satisfy this definition. Optional external features (wallet, NFC, SMS, biometrics, cast/critic/popularity controls) are not completion requirements.

## 8. Frontend freeze decision and backend handoff

Final QA gates passed: 49 unit tests, 73 Playwright tests, TypeScript, lint, production build, desktop/mobile review and documentation checks. The **current Customer UI/preview scope is ready to freeze**, with primary effort moving to backend contracts/integration. This is not production release approval or a claim that all Customer SRS behavior is complete. Preserve regression tests and make focused frontend fixes or contract-alignment changes as real services arrive.

Backend handoff order: discovery and Hall/Showtime seat eligibility; authoritative Hold ownership/expiry/realtime; owned Booking/Concessions/Promotion snapshots and cancellation; Payment initiation/freeze/verification; Ticket issuance, owned history and secure Booking QR resolution. Define string IDs and ProblemDetail semantics in each contract. Auth numeric userId needs a coordinated serialization audit.

At the historical final-QA milestone, discovery and authoritative Hold were deferred. Current real integrations now cover Movie-first discovery, VIP/HELD Seat data, authenticated ownership, atomic Hold races and reconciliation. Remaining Customer capabilities include Cinema-first discovery (FR-SHOWTIME-007), real Concession/Promotion composition, owned history/cancel-pending action (FR-BOOKING-011 / UC-CUS-022), frozen composition and trusted Payment states. These dependencies do not authorize fake endpoints. Full production completion still follows the definition above.

## Authoritative Seat Hold integration — 2026-10-02

Customer discovery/map reads remain real. Seat Selection now uses normal
Customer JWTs and existing Seat/Hold v1.0 + v1.1: atomic whole-set POST, separate
owned GET, exact-ID release, server expiresAt projection and reload/error/expiry
reconciliation. Unheld drafts and owned Holds are visually distinct; COUPLE
remains one unit/Hold for two guests, VIP is one guest. No local countdown
authority, invented endpoint or migration is added.

The future Booking handoff carries exact string Hold origins and original
deadline. Existing Concession/Summary/Payment routes retain their explicitly
local preview behavior and do not attach Holds, create Booking, determine real
totals, initiate Payment or issue anything. VIP fixture pricing remains
unsupported. See the [development guide](../development/customer-seat-hold-frontend.md)
and [latest report](../reports/2026-10-02_customer-authoritative-seat-hold-frontend_report.md).

Exact next separately authorized integration: **Customer Booking creation
frontend using authoritative Hold handoff**. Backend must revalidate owner,
whole set, original expiry/cutoff and current eligibility before attaching;
frontend must then use the returned real Booking identity, snapshots and total.
Do not automatically advance Concession/Promotion/Payment integration.

## Authoritative Booking integration — 2026-10-02

Primary flow now reaches real authenticated seat-only Booking creation and owned
`/bookings/[bookingId]/summary` from the exact fresh Hold origins. Existing V12
backend gates remain the authority for complete-set attachment, ownership,
cutoff/expiry, immutable prices and aggregate deadline. COUPLE remains one
Booking Seat/two guests. GET restores Summary on reload/direct entry and after
public catalog hiding; safe normal login resumption is implemented.

Summary displays exact server numeric(19,4) strings, current screening metadata,
saved Seat type/prices, status and deadline. No local price adjustment, currency
conversion, deadline renewal or payment authority is added. Attached origins
are excluded from editable owned Holds; back navigation restores HELD/disabled
units and Return to Booking without mutation. Duplicate creation is gated;
unknown responses require explicit retry of only the same complete saved set
under the current eligible-PENDING exact-set contract.

Real Summary stops before Concession/Promotion/Payment integration. The existing
static design flow is accessible only through the separate Preview Concessions
secondary action, with explicit non-persistence messaging. No preview action
modifies the real Booking. Earlier future/pre-Booking descriptions are historical
coverage and superseded for this primary flow. No backend/schema/contract or
Stitch change. Details: [guide](../development/customer-booking-creation-frontend.md),
[report](../reports/2026-10-02_customer-booking-creation-frontend_report.md).

Exact next separately authorized task: **Integrate real Concession composition
into the existing unpaid Booking**, then Promotion integration and Payment
initiation as separate tasks. Owned history, cancellation UI and trusted
Payment/Ticket/QR integration remain deferred; previews are not production
completion. Do not advance these automatically.
