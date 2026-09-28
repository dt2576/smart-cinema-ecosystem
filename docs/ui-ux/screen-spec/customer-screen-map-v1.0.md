# Canonical Customer Screen Map v1.0

Date: 2026-09-25.
Status: Canonical reference selection; Final Customer QA reconciliation updated 2026-09-28. No Stitch edits.
Project: Smart Cinema Ecosystem, `1208499799798658711`.

## 1. Authority and classification

Use the refreshed [metadata](../../../.stitch/metadata.json) and [screen inventory](../../../.stitch/SITE.md) for exact source IDs, and [DESIGN.md](../../../.stitch/DESIGN.md) for visual direction. [SRS v1.2](../../srs/srs-v1.2.md), especially section 6.1, and the [finalized Movie contract](../../api/movie-service-contract-v1.0.md) control behavior. The user's exclusions in this task are binding. A canonical visual reference is not approval of every field, action or sample value in that design.

- **Canonical:** the single selected source screen for a route or named flow state. Several routes may reuse the same source when the SRS permits a combined screen.
- **Alternate:** retained for comparison or historical context, never a competing default.
- **Hidden:** a canvas metadata flag; independent of business correctness.
- **Legacy:** superseded reference not selected for new implementation.
- **Conflicting:** contains behavior that must be excluded. A canonical layout may have explicitly conflicting content; that content is never canonical behavior.

IDs below are source screen IDs, not canvas instance IDs. Source inventory remains untouched. Route-group folders such as `(public)` do not appear in URLs. New URLs are target frontend routes selected by this plan, not claims of existing pages or new backend API definitions.

## 2. One canonical screen per route / flow step

| Customer route or state | Canonical Stitch name | Canonical screen ID | Current frontend coverage | Required interpretation |
|---|---|---|---|---|
| `/` — Home | Smart Cinema - Customer Homepage | `c667635786b940938d6071bb335830f9` | MOVIE API CLIENT IMPLEMENTED; OTHER SECTIONS PREVIEW | Hero and two Movie rows use public catalog; real detail/discovery links; no inferred screening states |
| `/login` — Sign In | Smart Cinema - Sign In | `f5904cd07f924d25a0ca844636e93060` | IMPLEMENTED API-CONNECTED | Existing login flow; no password-recovery feature inferred |
| `/register` — Create Account | Smart Cinema - Create Account | `82c296db655348e2a3f14776f936989e` | IMPLEMENTED API-CONNECTED | Existing registration/validation and login redirect |
| `/profile` — Profile view/edit | Smart Cinema - My Profile | `85bfbbac541b4455be5bd383218436e6` | IMPLEMENTED API-CONNECTED | Edit fullName/phone only; no biometric/SMS/lounge/wallet features |
| Shared header — account menu / logout | Smart Cinema - Authenticated Account Menu | `14dc6c1445a747b88c866508463e9879` | IMPLEMENTED API-CONNECTED COMPONENT | Menu state, no new route; profile link and logout |
| `/movies` — list/search/filter | Smart Cinema - Movie Listing | `fe57105a74494ca4807f61ae495f7c29` | IMPLEMENTED API CLIENT; BROWSER FIXTURES VERIFIED | Public PUBLISHED-only catalog; only contracted query controls |
| `/movies/[movieId]` — detail | Smart Cinema - Movie Detail | `16dbe62e3be744e6ab4123fc004283e3` | IMPLEMENTED API CLIENT; BROWSER FIXTURES VERIFIED | Public detail DTO; no cast/prices or inferred screening availability |
| `/movies/[movieId]/cinemas` — choose Cinema | Smart Cinema - Cinema Selection | `8de77c4d95c141f9947a4f7bf4cad7c9` | MOCK UI IMPLEMENTED; BROWSER VERIFIED | Real Movie context; isolated local Cinema options; navigation to Showtime preview. Live eligibility awaits backend contract |
| `/movies/[movieId]/cinemas/[cinemaId]/showtimes` — choose Showtime | Smart Cinema - Showtime Selection | `a808fb16fcad452696636be952ea70b1` | MOCK UI IMPLEMENTED; BROWSER VERIFIED | Preserve Movie/Cinema context; local dates/Hall groups and availability; navigation to Seat preview; backend eligibility remains deferred |
| `/showtimes/[showtimeId]/seats` — Seat Map / Hold | Smart Cinema - Seat Selection | `fdea388b4b24406799ab087b31239835` | MOCK UI IMPLEMENTED | STANDARD/COUPLE preview; indivisible Couple unit; local countdown only. VIP and real Holds/availability remain outside this slice |
| `/bookings/[bookingId]/concessions` — Concessions | Smart Cinema - Food & Drinks | `602baa042d22404d8b31d461351aa42d` | MOCK UI IMPLEMENTED at static `/bookings/preview/concessions`; production route deferred | Optional POPCORN/DRINK/COMBO, local quantities/subtotal; authoritative catalog and Booking remain deferred |
| Same Concessions flow — Hold expired state | Smart Cinema - Food & Drinks (Seat Hold Expired) | `1017f7c1f77943579d9bb1bee37f7718` | PREVIEW STATE IMPLEMENTED | Stop progression; return to Seat Selection; original local deadline never extends; real Hold ownership remains deferred |
| `/bookings/[bookingId]/summary` — review | Smart Cinema - Booking Summary / Review Order | `52aa55f16d2640d68efb6c399d5fb990` | MOCK UI IMPLEMENTED at static `/bookings/preview/summary`; production route deferred | Screening, whole Seat Units/guest count, Concessions, sample Seat/Concession subtotals, discount and grand total; all non-authoritative |
| Same Summary route — Promotion | Smart Cinema - Booking Summary / Review Order | `52aa55f16d2640d68efb6c399d5fb990` | EMBEDDED PREVIEW IMPLEMENTED | Local apply/remove/invalid/expired/ineligible/error/retry fixtures; real eligibility and server totals remain deferred |
| `/bookings/[bookingId]/payment` — method selection | Smart Cinema - Payment Method Selection | `0cc11f6226c74b6291ef49660e63f748` | MOCK UI IMPLEMENTED at static `/bookings/preview/payment`; production route deferred | Typed sample methods, single available selection, reviewed Promotion/total and original Seat deadline; no Payment initiation or freeze |
| Same Payment route — processing/verification | Smart Cinema - Payment Processing & Verification | `777b204432ad4fba84065c10697951e9` | MOCK UI IMPLEMENTED at static `/bookings/preview/payment/processing` | Local processing/verifying and outcome simulation; pending is unresolved and success is explicitly not server-verified |
| `/bookings/[bookingId]/payment/result` — result | Smart Cinema - Payment Result & Order Confirmation | `b023e6ffbd0c424d9244aaa8393c442c` | MOCK UI IMPLEMENTED at static `/bookings/preview/payment/result`; production route deferred | Success/failed/pending demo outcomes with reviewed context; exclude all issued/verified/paid claims and QR content. Future real issuance follows one Booking QR per Booking |
| `/my-bookings` — My Bookings / Tickets list | Smart Cinema - Booking QR & Passes | `b850455e65fc482a8ef3332cb672683d` | MOCK UI IMPLEMENTED | Fictional history with Booking status, screening, code and amount; local adapter, loading/empty/retry and string IDs |
| `/my-bookings/[bookingId]` — Booking detail / Tickets | Smart Cinema - Booking QR & Passes | `b850455e65fc482a8ef3332cb672683d` | MOCK UI IMPLEMENTED | Combined screening, amounts, Concessions and independent Ticket states; one Couple Ticket for two guests; real ownership deferred |
| Same Booking detail — enlarged Booking QR | Smart Cinema - Booking QR & Passes | `b850455e65fc482a8ef3332cb672683d` | MOCK STATE IMPLEMENTED | One inert demo Booking QR per PAID sample; enlarged view replaces inline QR; repeat lookup changes no Ticket status |

This selects 17 unique canonical screen IDs for 15 target URLs plus embedded/shared states. Eleven target route patterns exist, including Cinema/Showtime/Seat mock previews, plus static Concession, Summary, Payment Method, Payment Processing and Payment Result preview routes (sixteen implemented route patterns total). Four target route patterns remain missing: the owned-Booking Concession, Summary, Payment and Payment Result routes. My Bookings routes exist only as local previews; production ownership/history/Tickets/QR integration remains missing. Reusing the Booking QR screen for list/detail/QR and the Summary screen for Promotion is intentional. There is no Customer check-in action: authorized Staff performs Ticket-level check-in; Customer UI displays returned states, including partial entry.

Cinema/Showtime selection access and the point at which a Hold becomes a Booking require their service contracts. Production `/bookings/[bookingId]/...` routes require a real server-created owned Booking; do not invent an ID to enter checkout. The explicitly requested preview UI uses static `/bookings/preview/concessions`, `/bookings/preview/summary`, `/bookings/preview/payment`, `/bookings/preview/payment/processing` and `/bookings/preview/payment/result`: `preview` is a literal segment, not a Booking identifier. The five routes share only memory state and the original Seat deadline. Reload or leaving this flow clears context; returning to Seats requires reselection. Payment Method requires a reviewed Summary, including its Promotion/total. Returning to Summary preserves the review; editing Promotion or returning to Concessions invalidates it until reviewed again. Payment Method continues to the Processing preview route with its selected method. Processing uses an isolated local simulator with processing/verifying, success/failed/pending outcomes and retryable errors; it passes a typed local outcome to the Payment Result preview route. Result preserves reviewed context and demonstrates success/failed/pending without authoritative claims or issuance. Failed may retry through Processing or choose another method; pending resumes the same unresolved demo scenario. Expiry/start blocks these actions while the recorded local outcome remains a clearly labeled demonstration. Pending never implies success. Returning to Method/Summary/Concessions clears Processing eligibility; selecting a method again starts from a fresh local UI state. Original expiry and Showtime start block start, retry and result continuation, including late simulated completions. Returning to Method/Summary/Concessions or changing the simulation clears old Result state; reload/exit cannot restore it. No transaction creation, provider contact or composition freeze occurs. These routes do not authorize backend implementation.



The canonical My Bookings paths now use standalone, explicitly fictional fixtures behind Booking and Ticket read adapters. PAID examples carry one decodable inert Booking QR; PENDING/EXPIRED/CANCELLED unpaid examples have no Tickets or QR. Detail supports mixed Ticket states and one COUPLE Ticket for two guests. QR expansion replaces the inline image, and repeated demo QR lookup reloads the same context without check-in. These public preview routes do not establish ownership, verify Payment, or turn Payment Result success into issued Tickets. See the [Booking history/Tickets report](../../reports/2026-09-28_booking-history-tickets-frontend_report.md).

## 3. Alternate, hidden, legacy and conflicting references

| Name / role | Screen ID | Classification | Disposition |
|---|---|---|---|
| Customer Homepage, earlier variant | `85a6a5848b1c499594bc3e3faeecf9b8` | Alternate; hidden | Retain; use the visible canonical Home ID |
| Booking Summary, earlier variant | `5e46faa89712407ca07bf131aaae1316` | Alternate; hidden | Retain; use canonical Summary for all totals/Promotion states |
| Cinema Seat Selection | `019a53e2bbc242ca98a84fa1a10192a6` | Alternate; hidden; legacy branding | Do not inherit CINEPLEX branding or sample quota rules |
| Food & Drinks (Hold Expired) | `91a9d638f6694887a3299111e6026a52` | Alternate; hidden | Use visible canonical expired-state ID instead |
| My Tickets | `ca1c28a605b64d4ebeb59d4c00c23d42` | Hidden; legacy; conflicting | Ignore per-Ticket QR, transfers and wallet controls |
| My Tickets & Passes | `b35a7c6b366d4c2a90d8e04b76c4b99b` | Hidden; legacy; conflicting | Do not use for new Customer booking/ticket implementation |
| Ticket Detail | `422f032569974172b8217983f7738b41` | Hidden; legacy; conflicting | Use combined canonical Booking detail instead |
| Individual QR Ticket | `8c85de5a42c34780915d8661021246ab` | Hidden; legacy; conflicting | No per-Ticket QR page, route, carousel or token |

The 17 canonical selections plus these eight excluded UI references account for all 25 UI resources. Eighteen image assets and the Accessibility Audit reference are not route screens. Related poster alternatives do not change route mapping or approve sample film data. The audit is not evidence that accessibility has passed.

## 4. Scope corrections for canonical references

| Reference | Keep | Exclude or gate |
|---|---|---|
| Home | Cinematic layout, cards, navigation and approved tokens | Sample Now Showing/Coming Soon classifications, schedules, Cinema/offer claims and booking buttons are not live data; releaseDate alone never means showing/bookable |
| Movie Listing | Title search, single Genre ID filter, list/empty presentation | No age-rating filter, popularity/rating score sort, release-window/status filters; only title/releaseDate/id asc/desc sorting |
| Movie Detail | Title, duration, releaseDate, ageRating display, language, posterUrl, optional description/trailerUrl, Genres | No cast/crew, critic scores, ticket prices, screening/Hall specifications or unavailable-because-no-showtimes logic in the current Movie slice |
| Profile / Account Menu | Full name, email, phone, role/status and logout | No biometrics, verification process, SMS delivery, lounge eligibility, member-since facts or wallet integration inferred from designs |
| Cinema / Showtime | Branch/schedule selection layout | These are SRS scope but backend-blocked now; distance/geolocation, complimentary benefits and sample prices are not approved automatically |
| Seat / Concession / Summary | Choice, expiry, quantities, required server totals and embedded Promotion | No invented seat quotas, fees, timer reset, stock/kitchen management or in-seat delivery behavior |
| Payment / Result | Method, pending/verified/failed result structure | No browser-callback success claim, arbitrary gateway availability, editable frozen basket or individual QR instruction |
| Booking QR & Passes | One QR per Booking, Ticket list and per-Ticket statuses | No check-in-all-on-scan, Customer self-check-in, transfers, wallet/NFC passes or per-Ticket QR |

Displaying the contracted ageRating label is allowed; rating/popularity controls and scores are not. VND display guidance comes from DESIGN.md; future money/currency values must come from service contracts, never copied sample totals.

## 5. Current frontend evidence

| Evidence | What exists | What it does not establish |
|---|---|---|
| `frontend/src/app/(public)/page.tsx`; `features/home/home-screen.tsx`; `home-movies.tsx` | Home hero/two Movie rows use public catalog data; real detail links and /movies discovery; loading/empty/retry states | No booking/Cinema/Showtime integration; browser evidence uses contract fixtures |
| `features/home/home-mock-data.ts`; `features/movie/movie.types.ts`; `movie-card.tsx` | Mock file now holds only Cinema/offers; Home and listing share MovieSummary cards and string IDs | No Movie sample arrays, synthetic opening labels or sample slug links remain |
| `app/(auth)/login/page.tsx`; `register/page.tsx`; login/register forms | Actual forms calling Auth APIs, errors and redirects | Forgot password is disabled text, not an implemented flow |
| `app/(customer)/profile/page.tsx`; `features/auth/profile-screen.tsx` | Profile load/edit/save/cancel/retry and protected-field display | Browser fixtures cover loading/retry/edit/cancel/save and 401 recovery; verification claims removed. Live backend acceptance remains pending |
| `features/auth/auth-api.ts`, `auth-context.tsx`, `auth-storage.ts` | Registration/login/profile APIs, token renewal, logout and session handling | No Cinema, Hold, Booking, Payment or Ticket frontend client |
| `app/(public)/movies/`; `features/movie/movie-api.ts`; `movie-catalog.tsx`; `movie-detail-screen.tsx` | Typed public Movie/Genre reads, list/detail routes, URL filters, retries, string IDs and browser-tested states | Browser tests use isolated contract fixtures; live backend acceptance is not established |
| `features/auth/customer-account-menu.tsx`; `components/layout/site-header.tsx` | Account menu/profile link/logout; Movies links to /movies, brand to /; My Bookings is available in shared navigation; Home Showtime shortcuts recover through Movie-first discovery | Home retains other preview actions and section links; Cinema/Showtime/Seat/Concession previews exist; production Booking routes remain missing |
| `features/cinema/`; `app/(public)/movies/[movieId]/cinemas/page.tsx` | Canonical Cinema preview, local adapter, string IDs, selected/loading/empty/closed/unavailable/retry states; Movie Detail entry | No Cinema API; Continue now opens the Showtime preview route |
| `features/showtime/`; `app/(public)/movies/[movieId]/cinemas/[cinemaId]/showtimes/page.tsx` | Typed local schedule adapter, date selection, Hall groups, future/available-only continuation, retry and responsive states | No Showtime API; Continue opens Seat Selection preview; local clock is preview-only |
| `features/seat/`; `app/(public)/showtimes/[showtimeId]/seats/page.tsx` | Typed local map, indivisible Couple units, unit/guest summary, local countdown/expiry, navigation to Concession preview | No authoritative Hold, seat ownership, Booking or transaction behavior |
| `features/concession/`; `app/(public)/bookings/preview/concessions/page.tsx` | Typed local catalog adapter, optional quantities/subtotal, categories, unavailable/empty/retry, original Seat countdown; navigation to Summary and editable return | No real Booking, Hold, prices from a server, inventory or Payment |
| `features/booking/booking-summary-*`; `app/(public)/bookings/preview/summary/page.tsx` | Summary and embedded Promotion preview; local prices/calculation adapter, original deadline and Showtime-start guard; navigation to Payment Method with reviewed context | No authoritative totals, real Promotion policy, usage tracking, Booking identity or first-payment freeze |
| `features/payment/payment-method-*`; `app/(public)/bookings/preview/payment/page.tsx` | Typed local method adapter, one available radio selection, loading/empty/unavailable/retry, reviewed totals/Promotion, expiry/start guards and Processing route navigation | No configured production providers, real Payment Transaction, freeze, Ticket or Booking QR |
| `features/payment/payment-processing-*`; `app/(public)/bookings/preview/payment/processing/page.tsx` | Centered canonical Processing layout, typed local simulator, duplicate-action guard, cancellation, deadline/start guards and typed Result route handoff | No backend verification, provider calls/references/signatures or real Payment lifecycle |
| `features/payment/payment-result-*`; `app/(public)/bookings/preview/payment/result/page.tsx` | Canonical status banner, screening/whole units/add-ons, non-authoritative summary, failure retry and unresolved pending states; original deadline and state invalidation | No PAID Booking, Transaction, Ticket/QR, backend/provider call, generated references or receipt |
| `app/(public)/my-bookings/`; `features/booking/booking-history-*`; `booking-detail-preview.tsx`; `booking-qr-preview.tsx`; `features/ticket/` | Canonical list/detail and one Booking QR preview; local read adapters, independent Ticket states, atomic Couple Ticket, retry and enlarged QR | No real ownership, Payment verification, issuance, scanning or check-in mutation |
| `frontend/next.config.ts` | Existing `/api/v1` backend proxy | Proxy presence is not feature integration |

Route files now include `/`, `/login`, `/register`, `/profile`, `/movies`, `/movies/[movieId]` and `/movies/[movieId]/cinemas`, plus `/movies/[movieId]/cinemas/[cinemaId]/showtimes` and `/showtimes/[showtimeId]/seats`. Seat verification is recorded in the [Seat report](../../reports/2026-09-27_seat-selection-frontend_report.md). Showtime verification is recorded in the [Showtime report](../../reports/2026-09-27_showtime-selection-frontend_report.md). Cinema preview verification is recorded in the [Cinema report](../../reports/2026-09-27_cinema-selection-frontend_report.md). Movie verification is recorded in the [2026-09-26 implementation report](../../reports/2026-09-26_movie-catalog-frontend_report.md); Auth/Profile UI was not re-certified by this Movie task. The Movie backend has public list/detail and Genre collection controllers; downstream domain controllers remain outside this implementation.

The static preview routes additionally implement Concession, Summary with embedded Promotion, Payment Method, Payment Processing and Payment Result, including local expiry states. See the [Concession report](../../reports/2026-09-27_concession-selection-frontend_report.md), [Booking Summary report](../../reports/2026-09-28_booking-summary-frontend_report.md) and [Payment Method report](../../reports/2026-09-28_payment-method-frontend_report.md) for prior verification. See the [Payment Processing report](../../reports/2026-09-28_payment-processing-frontend_report.md) for Processing verification. See the [Payment Result report](../../reports/2026-09-28_payment-result-frontend_report.md) for current Result verification and the distinction from owned-Booking production routes.

See the [implementation plan](../customer-frontend-implementation-plan-v1.0.md) for dependencies, states and acceptance gates.

## 6. Final QA coverage and service boundaries

The final [Customer QA report](../../reports/2026-09-28_customer-frontend-final-qa_report.md) reconciles all 17 canonical IDs and 16 route patterns, desktop/mobile navigation and all existing feature tests. No source screen ID or Stitch reference was changed. Auth/Profile browser coverage supersedes earlier source-only verification; old intermediate preview-handoff descriptions are historical.

Every canonical presentation has a route, embedded panel/dialog or shared component. This does not mean every production state is available. Ownership denied, live HELD/VIP Seat data, authoritative contention/reconnect, cancel-pending Booking, frozen composition and verified Payment/issuance require future backend contracts. The four owned-Booking checkout URL patterns remain deliberately absent; no current link targets them.

Only Auth/Profile and Movie/Genre modules call backend APIs. All downstream adapters remain local. Movie/Genre and domain fixture IDs are strings; Auth still follows its existing numeric userId response/storage contract and requires a coordinated bigint serialization decision. Payment Result is not connected to fixture Ticket issuance: customers can navigate to My Bookings, but those examples are independent of the checkout preview.

Current UI fixes: Profile status truthfulness and Movie return, account-menu Escape/focus, removal of the nonfunctional Remember me control, and Home Showtime recovery with clearly labeled sample locations/offers. No new Customer feature or endpoint was added. Freeze readiness applies to the current UI/preview scope only; production readiness remains blocked on service integration and live acceptance.
