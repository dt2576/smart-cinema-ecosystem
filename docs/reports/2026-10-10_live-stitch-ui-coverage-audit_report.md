# Smart Cinema Live Stitch UI Coverage Audit

## 1. Task Information

- Task: Read-only UI/UX coverage audit against live Stitch, requirements and current frontend.
- Date: 2026-10-10, Asia/Ho_Chi_Minh.
- Module: Guest, Customer, Admin, Cinema Manager, Cinema Staff.
- Type: AUDIT / documentation only.
- Status: COMPLETE as an audit; product coverage remains incomplete.
- Live project: **Smart Cinema Ecosystem**, `1208499799798658711`; MCP access **CONNECTED AND WORKING**, project role `OWNER`.

**Finding:** The 35 resources returned by `list_screens` are not 35 completed screens. They comprise **17 UI screens and 18 images**. Project canvas metadata reveals eight additional hidden UI screens and one hidden Markdown resource. Reading every distinct source resource gives **44 resources: 25 UI screens, 18 images, one incomplete Markdown document**. A separate design-system asset brings the canvas to **45 instances**. All 25 UI resources specify `DESKTOP`; no authored mobile/tablet screen variant was found.

Customer discovery through Payment return/status/recovery has real API integration. My Bookings, Tickets and Booking QR have existing designs and frontend previews, but no real Customer retrieval integration. Admin has real Movie/Cinema/Hall/Seat/Showtime interfaces without dedicated Stitch designs. No Manager or Staff operational screen exists in the live Stitch inventory or frontend. English UI copy and several obsolete business assumptions require revision in existing designs.

## 2. Requested Work

Retrieve live metadata, enumerate visible and hidden resources, inspect available HTML and screenshots, reconcile all current routes and required role screens, produce a gap matrix and prioritized design backlog, and prepare P0 prompts. No design generation, design edits, implementation, configuration changes, database operations or commits were authorized.

## 3. Documents Reviewed

Authority and repository instructions:

- [Development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), [project conventions](../development/project-conventions.md), root [AGENTS.md](../../AGENTS.md), [frontend instructions](../../frontend/AGENTS.md).
- Applicable `.agent/rules/DOCUMENT_RULES.md`, `REQUIREMENT_TRACEABILITY.md`, `UI_UX_RULES.md`, `PROJECT_CONVENTIONS.md`; review/frontend workflows; [report template](templates/TASK_REPORT_TEMPLATE.md).
- [BRD v1.2](../brd/brd-v1.2.md), [SRS v1.2](../srs/srs-v1.2.md), [System Analysis v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx), [Project Scope v1.0](<../project-scope/project-scope v1.0.md>).
- [Screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md), [Customer plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md), [current handoff](../ai/current-handoff.md).
- [.stitch/DESIGN.md](../../.stitch/DESIGN.md), [cached inventory](../../.stitch/SITE.md), [cached metadata](../../.stitch/metadata.json). Live MCP content, rather than cache counts, controls this inventory.
- [Booking v1.0](../api/booking-contract-v1.0.md), [v1.1](../api/booking-contract-v1.1.md), [v1.2](../api/booking-contract-v1.2.md), [v1.3](../api/booking-contract-v1.3.md), [Payment initiation](../api/payment-initiation-contract-v1.0.md), [VNPAY v1.0](../api/vnpay-sandbox-payment-contract-v1.0.md), [v1.1](../api/vnpay-sandbox-payment-contract-v1.1.md), current Customer development guides.
- Implementation evidence: [Admin foundation/Movie](2026-10-01_admin-foundation-movie-management_report.md), [Cinema configuration](2026-10-01_v11-admin-cinema-configuration_report.md), [Showtime](2026-10-02_admin-showtime-management_report.md), [Booking/Ticket previews](2026-09-28_booking-history-tickets-frontend_report.md), [Booking creation](2026-10-02_customer-booking-creation-frontend_report.md), [Concession](2026-10-05_customer-concession-composition-frontend_report.md), [Promotion](2026-10-05_customer-promotion-composition-frontend_report.md), [localization](2026-10-03_frontend-vietnamese-localization_report.md), [Payment initiation](2026-10-07_customer-payment-initiation-frontend_report.md), [Payment return/status/recovery](2026-10-10_customer-payment-return-status-recovery-frontend_report.md).

The dated continuation at the top of the screen map/plan and actual code supersede their historical preview tables. Historical reports were not rewritten. Current BRD/SRS and `.stitch/DESIGN.md` supersede the older scope document's per-Ticket QR model and optional-food description.

## 4. Requirements Traceability

All IDs below originate in the cited documents. Backlog batch names are planning labels, not new requirements. P0/P1/P2 are design execution recommendations; they do not change Must/Should/Could requirement priorities.

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| BR-001–BR-004; FR-AUTH-001–FR-AUTH-010 | Authentication, active role, ownership, Cinema scope, user management | Yes | Shared Auth real; operator scope/navigation incomplete |
| BR-005–BR-016; FR-MOVIE-001–FR-MOVIE-008, FR-CINEMA-001–FR-CINEMA-010, FR-SHOWTIME-001–FR-SHOWTIME-010 | Catalog, branch, Hall and scheduling operations | Yes | Customer reads/Admin operations real; Manager operations absent |
| BR-017–BR-032; FR-SEAT-001–FR-SEAT-017, FR-BOOKING-001–FR-BOOKING-012 | Holds, Booking lifecycle, snapshots, owned history/detail | Yes | Real Holds/owned Summary; history preview; cancellation UI absent |
| BR-033–BR-035, BR-065–BR-067; FR-BOOKING-013–FR-BOOKING-018, FR-CONCESSION-001–FR-CONCESSION-006, FR-PROMO-001–FR-PROMO-006 | Composition, Promotion, totals, freeze, catalog authoring | Yes | Customer composition real; Admin authoring missing |
| BR-036–BR-042; FR-PAYMENT-001–FR-PAYMENT-015 | Backend-verified Payment, negatives, idempotency, late evidence | Yes | Real initiation/status/recovery; designs outdated; live Sandbox not certified |
| BR-043–BR-052; FR-TICKET-001–FR-TICKET-010, FR-CHECKIN-001–FR-CHECKIN-013 | One Booking QR, individual Ticket states, scoped atomic Check-in | Yes | Customer previews only; Staff screens missing |
| BR-053–BR-056; FR-ORG-001–FR-ORG-005 | Manager/Staff assignment and limited account administration | Yes | Dedicated designs/frontend missing |
| BR-057–BR-062; FR-REPORT-001–FR-REPORT-008, FR-AUDIT-001–FR-AUDIT-006 | Dashboards, accurate reporting, audit | Yes, phased | Admin hub is not a KPI dashboard; reporting/audit screens missing |
| BR-063–BR-064; FR-NOTIFY-001–FR-NOTIFY-004 | Optional notifications and failure isolation | Conditional | Templates/delivery UI absent; not a new inbox requirement |
| NFR-UX-001–NFR-UX-005; NFR-SEC-002, NFR-SEC-003, NFR-SEC-008–NFR-SEC-012 | Clear states/totals, safe errors, verified authorization/privacy | Yes | Source implementations cover many states; authored responsive designs incomplete |
| UC-CUS-019–UC-CUS-024; UC-STF-002–UC-STF-008; UC-MGR-002–UC-MGR-022; UC-ADM-002–UC-ADM-019 | System Analysis role-screen coverage | Yes, original priorities retained | Detailed matrix/backlog below |

## 5. Audit Findings and Deliverables

### 5.1. Method and classification rules

Read-only MCP calls: `get_project`, `list_screens`, `list_design_systems`, and `get_screen` for **all 44 distinct `sourceScreen` names**. No write-capable Stitch tool was invoked. All resource reads succeeded. Available content was downloaded for inspection: **26 HTML/text exports and 43 resource screenshots/images**. Default images were visually inspected using five UI contact sheets and an 18-image asset sheet. All **25 original-size UI renditions** were then retrieved successfully and visually inspected in nine additional contact sheets, with the combined Booking QR also inspected individually. HTML headings, controls, visible copy, prototype states and responsive classes were inspected separately. Files are ignored local evidence, not production assets.

Frontend audit: all **33 Next.js `page.tsx` route patterns**: 24 REAL, seven PREVIEW, one PARTIAL Home and one PLACEHOLDER for the required chain dashboard (its operational hub is REAL). Layouts, route-level loading/error files, feature screens, typed API/service boundaries, preview adapters, Auth/role navigation, Admin guards and relevant backend controllers/DTOs were inspected. Classification assesses integration in source, not live deployment or pixel-perfect runtime certification.

- Frontend **REAL**: actual API-backed implementation for the listed scope; does not imply production availability or live provider proof.
- **PREVIEW**: fictional fixtures/local simulation, even where visually finished.
- **PARTIAL**: mixed real and preview content, or only part of the required role experience.
- **PLACEHOLDER**: route/hub exists without the required functionality.
- **MISSING**: no frontend implementation for that screen/function.
- Stitch **COMPLETE**: inspected content covers the stated scope without known current-baseline conflict.
- **PARTIAL**: unfinished design/content or absent required states without an overriding contradiction.
- **OUTDATED**: actual design conflicts with current language, model, contract or role policy; this classification takes precedence over PARTIAL.
- **MISSING**: no relevant actual screen found after inspecting the entire project, including hidden sources.

Every UI export uses English interface copy, while current frontend language is Vietnamese. Consequently **all 25 existing UI resources are OUTDATED against the current baseline**, including otherwise reusable layouts. This does not mean their visual work should be discarded. No UI screen qualifies for “no further action”; completed image assets and the reusable theme require no new screen design. Missing substates are specified independently.

### 5.2. Live project metadata and resource inventory

| Metadata | Observed value |
|---|---|
| Resource name | `projects/1208499799798658711` |
| Title / access | Smart Cinema Ecosystem / OWNER |
| Created | 2026-09-12T16:08:24.523592Z |
| Last updated | 2026-10-10T00:46:23.516983Z, 07:46:23 local |
| Project type / visibility | TEXT_TO_UI_PRO / PUBLIC |
| Project device / theme | DESKTOP / DARK, Nocturne Cinema System |
| Fonts / brand override | Space Grotesk headings/labels; Plus Jakarta Sans body; amber `#F59E0B` |
| Visible list / all source resources | 35 / 44 |
| Canvas instances | 45: 44 source-screen instances + one design-system instance |
| UI variants | 25 DESKTOP, zero MOBILE/TABLET resource variants |

Dimensions below are **MCP resource width/height declarations**, not downloaded-thumbnail dimensions, measured viewport sizes or proof of mobile coverage. The default download images are downscaled previews; canvas instances also have separate display bounds. “Hidden” reflects canvas metadata, not approval, deletion or completeness.

| Actual UI screen | Stitch source screen ID | Canvas | Declared resource px | Status and inspected content |
|---|---|---|---|---|
| Customer Homepage | `c667635786b940938d6071bb335830f9` | Visible | 2560×6972 | OUTDATED: English; sample Now Showing/Coming Soon, 2025 dates, static offers/venues; reusable hero/cards |
| Movie Listing | `fe57105a74494ca4807f61ae495f7c29` | Visible | 2560×2790 | OUTDATED: unsupported popularity/rating/release filters; search/empty structure reusable |
| Movie Detail | `16dbe62e3be744e6ab4123fc004283e3` | Visible | 2560×3748 | OUTDATED: cast/crew, rating and technical/branch claims outside current DTO; loading/unavailable/trailer structures exist |
| Cinema Selection | `8de77c4d95c141f9947a4f7bf4cad7c9` | Visible | 2560×3280 | OUTDATED: distance/location/benefit claims uncontracted; active/closed/no-branch variants exist |
| Showtime Selection | `a808fb16fcad452696636be952ea70b1` | Visible | 2560×3742 | OUTDATED: invented availability/urgency and lounge benefits; Hall/date/started/sold-out/no-screening structures exist |
| Seat Selection | `fdea388b4b24406799ab087b31239835` | Visible | 2560×2262 | OUTDATED: English/demo countdown; correct whole COUPLE units and VND; legend, contention, empty selection, expiry, bottom summary exist |
| Food & Drinks | `602baa042d22404d8b31d461351aa42d` | Visible | 2560×3760 | OUTDATED: fixed eight-minute story, seat delivery/kitchen claims, mismatched summary item; skeleton/network/empty basket exist |
| Food & Drinks — Seat Hold Expired | `1017f7c1f77943579d9bb1bee37f7718` | Visible | 2560×3500 | OUTDATED: expiry overlay but residual countdown/held-seat assurances; requires authoritative expired/read-only state |
| Booking Summary / Review Order | `52aa55f16d2640d68efb6c399d5fb990` | Visible | 2560×3444 | OUTDATED: Reset Timer controls, token-reservation claim and unsupported payment options; correct separated totals/Promotion structure |
| Payment Method Selection | `0cc11f6226c74b6291ef49660e63f748` | Visible | 2560×2500 | OUTDATED: MoMo/other methods, instant confirmation, QR payload generation, different TTL and cancellation assumptions |
| Payment Processing & Verification | `777b204432ad4fba84065c10697951e9` | Visible | 2560×2432 | OUTDATED: redirect-only panel; no authoritative pending/reconciliation/recovery family; discourages reload/back |
| Payment Result & Order Confirmation | `b023e6ffbd0c424d9244aaa8393c442c` | Visible | 2560×2386 | OUTDATED: success/PAID/issued-only and a QR per Ticket; missing truthful negative/uncertain results |
| Booking QR & Passes | `b850455e65fc482a8ef3332cb672683d` | Visible | 2560×3410 | OUTDATED but preferred Ticket reference: one Booking QR, multiple Tickets, mixed/all-checked states; remove Customer Simulate Check-In and unsupported brightness/kiosk/food-pickup claims |
| Sign In | `f5904cd07f924d25a0ca844636e93060` | Visible | 2560×2244 | OUTDATED: English, Remember me/Forgot password unsupported; loading/input/credential-error forms reusable |
| Create Account | `82c296db655348e2a3f14776f936989e` | Visible | 2560×2864 | OUTDATED: English/password-recovery assumptions; validation/duplicate/loading/success form states exist |
| My Profile | `85bfbbac541b4455be5bd383218436e6` | Visible | 2560×3012 | OUTDATED: biometric/pass-ready/lounge/verification/SMS/member-since assertions; view/edit/save/error layout reusable |
| Authenticated Account Menu | `14dc6c1445a747b88c866508463e9879` | Visible | 2560×3012 | OUTDATED: expanded Customer menu over Profile, same unsupported copy; operator variants absent |
| Cinema Seat Selection | `019a53e2bbc242ca98a84fa1a10192a6` | Hidden | 2560×2368 | OUTDATED: CINEPLEX branding, USD, surcharges/tax; superseded by current Seat Selection |
| Customer Homepage — older | `85a6a5848b1c499594bc3e3faeecf9b8` | Hidden | 2560×7108 | OUTDATED: related earlier Home layout/content, not a unique required screen |
| Booking Summary — older | `5e46faa89712407ca07bf131aaae1316` | Hidden | 2560×3928 | OUTDATED: older expiry-overlay variant with sample zero timer; not another required Summary |
| Food & Drinks — Hold Expired, older | `91a9d638f6694887a3299111e6026a52` | Hidden | 2560×3560 | OUTDATED: older expiry variant/prototype controls; do not add a duplicate required screen |
| My Tickets | `ca1c28a605b64d4ebeb59d4c00c23d42` | Hidden | 2560×2544 | OUTDATED: individual QR/transfer/wallet/NFC; useful list, empty and API-error structures |
| My Tickets & Passes | `b35a7c6b366d4c2a90d8e04b76c4b99b` | Hidden | 2560×2700 | OUTDATED: individual Ticket carousel/QR, USD, transfer, wallet/NFC/receipt promises |
| Ticket Detail | `422f032569974172b8217983f7738b41` | Hidden | 2560×3042 | OUTDATED: QR on each Ticket, offline/PDF/wallet, arrival/re-entry claims |
| Individual QR Ticket | `8c85de5a42c34780915d8661021246ab` | Hidden | 2560×2764 | OUTDATED: obsolete individual QR model; hash, NFC/lane privileges and simulated state controls |

There are related/repeated screen families: two Home designs, two Summary designs, two expired Concession designs, two Seat designs, Profile versus Profile-with-menu, and five overlapping Ticket/QR layouts. Their HTML and screenshot SHA-256 hashes are different: **no byte-identical exported UI duplicate found**. They are alternate/legacy presentations, not 25 distinct required journeys. No Admin, Manager or Staff operation is hidden in this group.

Incomplete rendered/content evidence is separate from model obsolescence. Older Home `85a6a5848b1c499594bc3e3faeecf9b8` shows incomplete venue/offer card content compared with current Home. Current Seat `fdea388b4b24406799ab087b31239835` screenshot contains an unpopulated summary list and lower panel despite selected-seat indicators, while its HTML defines additional states. Hidden expired Concession `91a9d638f6694887a3299111e6026a52` screenshot actually captures an active/default basket, whereas visible expired Concession captures an overlay. Do not count a title or prototype switch as proof that every corresponding state has a completed captured design. These exports need state/asset review; whether blank regions arise from template state, rendering timing or asset loading is unresolved, and no new design edit is presumed necessary solely from that observation.

Non-screen resources, all visible in `list_screens`:

| Resource | Source ID | Declared resource px | Classification |
|---|---|---|---|
| Desert hero background | `d17964cf5cf34ae5ae8293d927d8a638` | 1376×768 | COMPLETE image asset; no UI |
| Dune poster | `df50977f707947758394894e7a282864` | 848×1264 | COMPLETE image asset |
| Oppenheimer poster | `6edaa1ec31154bf0a4b43a03091c0166` | 848×1264 | COMPLETE image asset |
| Civil War poster | `2a5914f8462a444895bd014510ba6282` | 848×1264 | COMPLETE image asset |
| Past Lives poster | `517d9ab1a5814297af43fefb65e6704f` | 848×1264 | COMPLETE image asset |
| Furiosa poster | `33afd83a57494e96bc46d408596fc034` | 848×1264 | COMPLETE image asset |
| Gladiator II poster | `9b54d3edecd74da0b19c5ab08bafdbd6` | 848×1264 | COMPLETE image asset |
| Interstellar poster | `ca8ef62a23414c8b8047b566375cff5d` | 848×1264 | COMPLETE image asset |
| Fire and Ash poster A | `817f0a5e5f02438b86a433aebc1ee807` | 848×1264 | COMPLETE image variant |
| Fire and Ash poster B | `e443081476ef45b889c07407a37fc00a` | 848×1264 | COMPLETE image variant, different artwork |
| Multiverse poster A | `385a395694ed4adc86af9a4a86891343` | 848×1264 | COMPLETE image variant |
| Multiverse poster B | `896acb2c4d5e42c396d4eba9706a7b3a` | 848×1264 | COMPLETE image variant, different artwork |
| Classic popcorn | `cd77377730824fbcba1b9f12e4e4c784` | 1200×896 | COMPLETE image asset |
| Caramel popcorn | `82d34150a46a467a90ea4f0933b1e249` | 1200×896 | COMPLETE image asset |
| Cola | `d194632f74d04fb3b8b46e0631b8c0f7` | 1200×896 | COMPLETE image asset |
| Lime soda | `98e0897836c840a09132c20bc2023d3a` | 1200×896 | COMPLETE image asset |
| Mineral water | `081f444b338947afad9e66d06a8d8f12` | 1200×896 | COMPLETE image asset |
| Food combo | `f145e703600c491bb9fc5b2d9cbafbf4` | 1200×896 | COMPLETE image asset |
| Accessibility Audit.md | `10765353845882543715` | No screenshot | PARTIAL non-screen, hidden; 152-byte “Analyzing…” placeholder, no completed audit/results |
| Nocturne Cinema System | `assets/ac4a3505e353425b991e16e1d27e0415` | Canvas 960×540 | COMPLETE reusable theme resource, not a screen or accessibility certification |

The Markdown instance ID is `1c742dc4-8202-436f-b309-23d4a99423e2`; it is not its source-screen ID. Poster title similarity does not establish duplication: paired images differ visually and in hashes. “COMPLETE asset” means usable reference imagery, not licensing, data correctness or implemented catalog content.

### 5.3. Full required UI inventory and gap matrix

Requirements refer to SRS v1.2 unless prefixed BR/BG/UC. The **71 matrix rows** describe required screen/functions and role-specific coverage, including embedded panels and shared layouts; they are not 71 distinct screens. A function does not require a new route when an existing route legitimately contains it. `—` means no actual screen/route; route wildcards describe existing patterns only. File evidence keys resolve in §5.4. Roles are requirement scope, not proof that a current endpoint permits access.

| Screen | Role | Requirement | Stitch Screen ID | Stitch Status | Frontend Route | Frontend Status | Missing UI | Priority |
|---|---|---|---|---|---|---|---|---|
| Home / discovery entry | Guest, Customer | FR-MOVIE-001, BR-007 | `c667635786b940938d6071bb335830f9` | OUTDATED | `/` | PARTIAL [E1] | Static venues/offers remain preview; reconcile catalog labels/copy | P1 |
| Movie list/search/Genre | Guest, Customer | FR-MOVIE-001, FR-MOVIE-003, FR-MOVIE-007 | `fe57105a74494ca4807f61ae495f7c29` | OUTDATED | `/movies` | REAL [E2] | Remove unsupported filters; mobile/error design | P1 |
| Movie detail/trailer | Guest, Customer | FR-MOVIE-002 | `16dbe62e3be744e6ab4123fc004283e3` | OUTDATED | `/movies/[movieId]` | REAL [E2] | Remove DTO-invented information; distinguish no screenings | P1 |
| Cinema discovery/detail context | Guest, Customer | FR-CINEMA-001, FR-CINEMA-002, FR-MOVIE-008 | `8de77c4d95c141f9947a4f7bf4cad7c9` | OUTDATED | `/movies/[movieId]/cinemas` | REAL [E3] | Current real fields/states; no unsupported geolocation promises | P1 |
| Showtime/date/Hall selection | Guest, Customer | FR-SHOWTIME-006–FR-SHOWTIME-008 | `a808fb16fcad452696636be952ea70b1` | OUTDATED | `/movies/[movieId]/cinemas/[cinemaId]/showtimes` | REAL [E3] | Cutoff/unavailable/current state design; no invented availability | P1 |
| Seat map / whole-unit Hold / release | Guest reads; Customer writes | FR-SEAT-001, FR-SEAT-003–FR-SEAT-012, FR-SEAT-016, FR-SEAT-017 | `fdea388b4b24406799ab087b31239835` | OUTDATED | `/showtimes/[showtimeId]/seats` | REAL [E4] | Auth/reload/contention/uncertain-write responsive design | P1 |
| Seat synchronization / stale connection | Guest, Customer | FR-SEAT-013–FR-SEAT-015, BR-025, BG-06, NFR-PERF-005 | `fdea388b4b24406799ab087b31239835` | OUTDATED | Same Seat route | PARTIAL [E4] | Real 30-second/focus reads; no event subscription; design reconnect/stale/read-error states against approved event contract | P1 |
| Create Booking / lost-response recovery | Customer | FR-BOOKING-001–FR-BOOKING-003, FR-BOOKING-005 | `fdea388b4b24406799ab087b31239835` | OUTDATED | Seat route → `/bookings/[bookingId]/summary` | REAL [E4,E5] | Explicit creation and recovery states; no duplicate POST | P1 |
| Owned Summary / frozen review | Customer | FR-BOOKING-004–FR-BOOKING-007, FR-BOOKING-010, FR-BOOKING-018 | `52aa55f16d2640d68efb6c399d5fb990` | OUTDATED | `/bookings/[bookingId]/summary` | REAL [E5] | Original expiry, first-attempt freeze, terminal/denied states | P0 |
| Concession catalog/add/change/remove | Customer; public catalog reads | FR-CONCESSION-001, FR-BOOKING-013–FR-BOOKING-017 | `602baa042d22404d8b31d461351aa42d` | OUTDATED | `/bookings/[bookingId]/concessions` | REAL [E6] | Frozen/uncertain mutation/revalidation states, exact snapshots | P1 |
| Concession expiry/read-only | Customer | FR-BOOKING-005, FR-BOOKING-018 | `1017f7c1f77943579d9bb1bee37f7718` | OUTDATED | Same owned Concession route | REAL [E6] | Truthful expiry, no hold assurance or timer reset | P1 |
| Promotion apply/replace/remove | Customer | FR-BOOKING-008, FR-PROMO-002–FR-PROMO-006 | `52aa55f16d2640d68efb6c399d5fb990` | OUTDATED | Embedded owned Summary | REAL [E7] | Freeze/conflict/rollback/uncertain result design | P1 |
| Payment initiation / VNPAY handoff | Customer | FR-PAYMENT-001–FR-PAYMENT-003 | `0cc11f6226c74b6291ef49660e63f748` | OUTDATED | Embedded owned Summary | REAL [E8] | VNPAY-only/gated submission; no unsupported providers | P0 |
| Provider return / pending verification | Customer | FR-PAYMENT-004–FR-PAYMENT-006, UC-CUS-019 | `777b204432ad4fba84065c10697951e9` | OUTDATED | `/payments/vnpay/return` and Summary | REAL [E8] | Authoritative pending/reload/login/known-attempt design | P0 |
| Verified result / negative / reconciliation | Customer | FR-PAYMENT-007–FR-PAYMENT-015, FR-BOOKING-012 | `b023e6ffbd0c424d9244aaa8393c442c` | OUTDATED | Return route and Summary | REAL [E8] | Failed/cancelled, inconsistent/stale, uncertain and late-success design; no issued-Ticket promise | P0 |
| Unknown Payment identity recovery block | Customer | FR-AUTH-009, NFR-UX-004, BR-039 | — | MISSING | Return route and Summary | REAL [E8] | Blocked recovery/limited safe guidance; no guessed attempt/new POST | P0 |
| My Bookings / history/filter/empty | Customer | FR-BOOKING-009, UC-CUS-020 | `b850455e65fc482a8ef3332cb672683d`; older `ca1c28a605b64d4ebeb59d4c00c23d42` | OUTDATED | `/my-bookings` | PREVIEW [E9] | Real owned list; pending/expired/cancelled, auth/empty/error/mobile | P0 |
| Owned Booking detail / Tickets | Customer | FR-BOOKING-010, FR-TICKET-006, FR-TICKET-008 | `b850455e65fc482a8ef3332cb672683d` | OUTDATED | `/my-bookings/[bookingId]` | PREVIEW [E9] | Paid/issuance contract, genuine per-Ticket states, no premature Tickets | P0 |
| Booking QR / full-screen QR | Customer | FR-TICKET-004, FR-TICKET-007, BR-046 | `b850455e65fc482a8ef3332cb672683d` | OUTDATED | Embedded Booking detail dialog | PREVIEW [E9] | One actual owned QR, secure retrieval, unavailable/stale state | P0 |
| Cancel eligible PENDING Booking | Customer | FR-BOOKING-011, UC-CUS-022 | — | MISSING | —; Summary/detail context exists | MISSING [E5,E9] | Eligibility/confirmation/uncertain response; no PAID refund flow | P1 |
| Register | Guest → Customer | FR-AUTH-001 | `82c296db655348e2a3f14776f936989e` | OUTDATED | `/register` | REAL [E10] | Vietnamese contract-aligned copy and mobile design | P1 |
| Login / resume / renewal / logout | All authenticated roles; Guest entry | FR-AUTH-002–FR-AUTH-004 | `f5904cd07f924d25a0ca844636e93060` | OUTDATED | `/login`; shared controls | REAL [E10] | Operator destination/scope errors; unsupported reset/Remember me removal | P0 operator states; P1 form revision |
| Customer Profile / edit | Customer | FR-AUTH-005 | `85bfbbac541b4455be5bd383218436e6` | OUTDATED | `/profile` | REAL [E10] | Remove unsupported membership/verification/biometric claims | P1 |
| Account menu / role navigation | Customer, Admin; Manager/Staff gaps | FR-AUTH-007, FR-AUTH-008 | `14dc6c1445a747b88c866508463e9879` | OUTDATED | Shared header | PARTIAL [E10,E11] | Manager/Staff destinations; avoid Customer-only Profile link for operators | P0 |
| Role/scope denied, inactive, no assignment | Admin, Manager, Staff | FR-AUTH-006–FR-AUTH-008, FR-ORG-005 | — | MISSING | `/admin/*` guard only | PARTIAL [E11] | Existing Admin gate has states; no scoped operator workspace | P0 |
| Chain dashboard | Admin | FR-REPORT-002, BR-058 | — | MISSING | `/admin` | PLACEHOLDER [E11] | Actual KPI/report interface; current hub contains navigation cards | P2 |
| Movie management list/filter/publication | Admin | FR-MOVIE-001, FR-MOVIE-006 | — | MISSING | `/admin/movies` | REAL [E12] | Dedicated design for current real controls/states | P1 |
| Create Movie | Admin | FR-MOVIE-004, FR-MOVIE-007 | — | MISSING | `/admin/movies/new` | REAL [E12] | Validated editor and save/error/mobile design | P1 |
| Edit Movie / Genres / publication | Admin | FR-MOVIE-005–FR-MOVIE-007 | — | MISSING | `/admin/movies/[movieId]/edit` | REAL [E12] | Current read/write status separation and edit design | P1 |
| Genre authoring (not association picker) | Admin | UC-ADM-005; Project Scope §5.2 | — | MISSING | — | MISSING [E12] | Separate CRUD contract/screen if retained; existing picker is real | P2 |
| Cinema list/status | Admin | FR-CINEMA-001, FR-CINEMA-005 | — | MISSING | `/admin/cinemas` | REAL [E13] | Operational list/empty/error design, not Customer branch cards | P1 |
| Create Cinema | Admin | FR-CINEMA-003 | — | MISSING | `/admin/cinemas/new` | REAL [E13] | Actual fields and server validation design | P1 |
| Edit Cinema/status | Admin | FR-CINEMA-004, FR-CINEMA-005 | — | MISSING | `/admin/cinemas/[cinemaId]/edit` | REAL [E13] | Authoritative save/failure and unavailable state design | P1 |
| Hall list | Admin | FR-CINEMA-006–FR-CINEMA-009 | — | MISSING | `/admin/cinemas/[cinemaId]/halls` | REAL [E13] | Cinema context, layout status, loading/empty design | P1 |
| Create Hall | Admin | FR-CINEMA-006, FR-CINEMA-009 | — | MISSING | `/admin/cinemas/[cinemaId]/halls/new` | REAL [E13] | Guest capacity/type/status validation design | P1 |
| Edit Hall/status | Admin | FR-CINEMA-007–FR-CINEMA-009 | — | MISSING | `/admin/halls/[hallId]/edit` | REAL [E13] | Immutable Cinema/capacity-after-layout guard | P1 |
| Physical Seat layout / initialization / edit | Admin | FR-SEAT-002, FR-SEAT-003 | — | MISSING | `/admin/halls/[hallId]/seats` | REAL [E13] | Whole-layout capacity and referenced-seat guards; distinguish availability | P1 |
| Showtime list/filter | Admin | FR-SHOWTIME-006, FR-SHOWTIME-007 | — | MISSING | `/admin/showtimes` | REAL [E14] | Actual filters/configured timezone/status/empty design | P1 |
| Create Showtime | Admin | FR-SHOWTIME-001, FR-SHOWTIME-004, FR-SHOWTIME-005, FR-SHOWTIME-009, FR-SHOWTIME-010 | — | MISSING | `/admin/showtimes/new` | REAL [E14] | Conflict, Hall eligibility, exact price, calculated times design | P1 |
| Edit/view/disable Showtime | Admin | FR-SHOWTIME-002, FR-SHOWTIME-003 | — | MISSING | `/admin/showtimes/[showtimeId]/edit` | REAL [E14] | Read-only history/past, server transitions/cancellation guard | P1 |
| Users / account detail / role/status | Admin | FR-AUTH-006, FR-AUTH-007, FR-AUTH-010, UC-ADM-002, UC-ADM-003 | — | MISSING | — | MISSING [E15] | Limited administration and protected confirmation; no HRM | P0 |
| Managers / Cinema assignment | Admin | FR-ORG-001, FR-ORG-003, UC-ADM-007, UC-ADM-008 | — | MISSING | — | MISSING [E15] | Assignment list, active/inactive/history/forbidden states | P0 |
| Staff assignment/account operational status | Admin | FR-ORG-002–FR-ORG-004, FR-CINEMA-010 | — | MISSING | — | MISSING [E15] | Cinema-scoped assignment and limited account actions | P1 |
| Promotion management list/create/edit/status | Admin | FR-PROMO-001–FR-PROMO-005, BR-033 | — | MISSING | — | MISSING [E15] | Validity/minimum/usage/status forms; no invented financial controls | P1 |
| Concession management list/create/edit/status | Admin | FR-CONCESSION-002–FR-CONCESSION-006 | — | MISSING | — | MISSING [E15] | POPCORN/DRINK/COMBO, price/category/status forms; no stock | P1 |
| Global Booking/Ticket operational read | Admin | SRS §7.2; FR-BOOKING-010, FR-TICKET-006 | — | MISSING | — | MISSING [E15] | Read-only scope/ownership-safe lookup; no manual settlement | P1 |
| Chain reports/revenue/performance | Admin | FR-REPORT-002–FR-REPORT-008, UC-ADM-015–UC-ADM-018 | — | MISSING | — | MISSING [E15] | Valid financial aggregates, dates/timezone/empty/error; optional Concession revenue | P2 |
| Audit list/detail and Payment traceability | Admin | FR-AUDIT-001–FR-AUDIT-006, FR-PAYMENT-015 | — | MISSING | — | MISSING [E15] | Redacted scoped audit, actor/time/reference; no raw secrets | P2 |
| Assigned Cinema selector/context | Cinema Manager | FR-AUTH-008, FR-ORG-005, UC-MGR-002 | — | MISSING | — | MISSING [E15] | Only server-authorized assignments; no arbitrary chain access | P0 |
| Cinema operational dashboard | Cinema Manager | FR-REPORT-001, UC-MGR-019 | — | MISSING | — | MISSING [E15] | Scoped valid KPI and no-data/error states | P2 |
| Hall list | Cinema Manager | FR-CINEMA-006–FR-CINEMA-009, UC-MGR-003 | — | MISSING | — | MISSING [E15] | Scoped list/workspace; Admin route is not Manager implementation | P0 |
| Create Hall | Cinema Manager | FR-CINEMA-006, UC-MGR-004 | — | MISSING | — | MISSING [E15] | Scoped create/validation/save/conflict states | P0 |
| Edit Hall/status | Cinema Manager | FR-CINEMA-007, FR-CINEMA-008, UC-MGR-005, UC-MGR-006 | — | MISSING | — | MISSING [E15] | Protected scope/capacity/history guards | P0 |
| Seat layout/create/update/status | Cinema Manager | FR-SEAT-002, FR-SEAT-003, UC-MGR-007–UC-MGR-010 | — | MISSING | — | MISSING [E15] | Whole COUPLE unit/capacity/maintenance/editor states | P0 |
| Showtime list | Cinema Manager | FR-SHOWTIME-006, FR-SHOWTIME-007, UC-MGR-011 | — | MISSING | — | MISSING [E15] | Assigned Cinema scheduling list/date filters | P0 |
| Create Showtime | Cinema Manager | FR-SHOWTIME-001, FR-SHOWTIME-004, FR-SHOWTIME-005, UC-MGR-012 | — | MISSING | — | MISSING [E15] | Scoped Hall/Movie selection and conflict validation | P0 |
| Edit/disable Showtime | Cinema Manager | FR-SHOWTIME-002, FR-SHOWTIME-003, UC-MGR-013, UC-MGR-014 | — | MISSING | — | MISSING [E15] | Approved transitions/history/past guards, no refund workflow | P0 |
| Cinema Staff list | Cinema Manager | FR-CINEMA-010, UC-MGR-015 | — | MISSING | — | MISSING [E15] | Scoped operational list/details | P1 |
| Assign/remove Staff/status | Cinema Manager | FR-ORG-002–FR-ORG-004, UC-MGR-016, UC-MGR-017 | — | MISSING | — | MISSING [E15] | Deactivate association preserving history; limited role/account actions | P1 |
| Cinema Booking list/detail / Tickets | Cinema Manager | SRS §6.3, §7.2; UC-MGR-018 | — | MISSING | — | MISSING [E15] | Scoped read-only records and mixed Ticket states | P1 |
| Cinema revenue/occupancy/performance | Cinema Manager | FR-REPORT-001, FR-REPORT-003–FR-REPORT-007, UC-MGR-020–UC-MGR-022 | — | MISSING | — | MISSING [E15] | Valid revenue/occupancy denominators and data states | P2 |
| Scoped audit subset | Cinema Manager | SRS §7.2; FR-AUDIT-002–FR-AUDIT-004 | — | MISSING | — | MISSING [E15] | Approved scope/field visibility; no chain audit entitlement | P2 |
| Staff login / operational entry | Cinema Staff | FR-AUTH-002, FR-AUTH-008, UC-STF-001 | `f5904cd07f924d25a0ca844636e93060` | OUTDATED | `/login`; no Staff destination | PARTIAL [E10,E15] | Assigned Cinema entry/no-scope/suspended/expired session | P0 |
| Booking QR scanner | Cinema Staff | FR-CHECKIN-001, FR-CHECKIN-002, UC-STF-002 | — | MISSING | — | MISSING [E15] | Camera permission/unavailable, scan/pause/retry, private QR handling | P0 |
| Booking validation / Ticket selection | Cinema Staff | FR-CHECKIN-003–FR-CHECKIN-010, UC-STF-003, UC-STF-004 | — | MISSING | — | MISSING [E15] | Paid/Cinema/window validation; select VALID Tickets, mixed state/rescan | P0 |
| Check-in outcome / rejection / uncertain | Cinema Staff | FR-CHECKIN-011–FR-CHECKIN-013, UC-STF-005, UC-STF-007 | — | MISSING | — | MISSING [E15] | Atomic result, duplicate/concurrent conflict, network re-read before retry | P0 |
| Manual Booking lookup/detail | Cinema Staff | SRS §6.2; UC-STF-006 | — | MISSING | — | MISSING [E15] | Approved lookup key/scope; no unbounded Customer search | P0 |
| Check-in history / audit-limited view | Cinema Staff | SRS §6.2, §7.2; UC-STF-008; FR-AUDIT-004 | — | MISSING | — | MISSING [E15] | Authorized history subset/filter/detail; Could use case retained | P2 |
| Limited operational dashboard | Cinema Staff | SRS §7.2 only | — | MISSING | — | MISSING [E15] | Optional approved limited view; not chain revenue/report access | P2, conditional |
| Notification content (Payment/Tickets) | Customer receives; System sends | FR-NOTIFY-001–FR-NOTIFY-004 | — | MISSING | — | MISSING [E15] | Optional delivery templates only; no mandatory new inbox or delivery promise | P2, conditional |
| Responsive and accessible state library | All roles | NFR-UX-001–NFR-UX-005, NFR-SEC-011 | Desktop sources above; no mobile source | PARTIAL | Existing responsive components | PARTIAL [E1–E14] | Authored mobile/operator/error/empty/focus/contrast variants | P0 for P0 journeys, P1/P2 elsewhere |

Manager Check-in is **not a default permission**: SRS §7.2 says “Scope if permitted.” Reuse the Staff flow only after an explicit policy/contract confirms this permission. No separate Manager Check-in design is commissioned here. Staff dashboard/audit scope labels similarly do not authorize full reporting access.

### 5.4. Exact frontend and backend evidence

Evidence keys used above:

| Key | Actual files and observed boundary |
|---|---|
| E1 | [home-screen.tsx](../../frontend/src/features/home/home-screen.tsx), [home-movies.tsx](../../frontend/src/features/home/home-movies.tsx), [home-mock-data.ts](../../frontend/src/features/home/home-mock-data.ts): real Movie discovery plus explicitly previewed venues/offers |
| E2 | [movie-catalog.tsx](../../frontend/src/features/movie/movie-catalog.tsx), [movie-detail-screen.tsx](../../frontend/src/features/movie/movie-detail-screen.tsx), [movie-api.ts](../../frontend/src/features/movie/movie-api.ts), [movie-query.ts](../../frontend/src/features/movie/movie-query.ts): real typed catalog/Genre/detail reads |
| E3 | [cinema-selection-screen.tsx](../../frontend/src/features/cinema/cinema-selection-screen.tsx), [showtime-selection-screen.tsx](../../frontend/src/features/showtime/showtime-selection-screen.tsx), [discovery-api.ts](../../frontend/src/features/discovery/discovery-api.ts): actual Cinema/Showtime/Seat-map APIs |
| E4 | [seat-selection-screen.tsx](../../frontend/src/features/seat/seat-selection-screen.tsx), [use-seat-holds.ts](../../frontend/src/features/seat/use-seat-holds.ts), [seat-hold-api.ts](../../frontend/src/features/seat/seat-hold-api.ts), [use-booking-creation.ts](../../frontend/src/features/booking/use-booking-creation.ts): owned Holds, explicit Booking creation, reload/lost-response handling |
| E5 | [owned-booking-summary-screen.tsx](../../frontend/src/features/booking/owned-booking-summary-screen.tsx), [use-booking-detail.ts](../../frontend/src/features/booking/use-booking-detail.ts), [booking-api.ts](../../frontend/src/features/booking/booking-api.ts): owned GET/create, frozen composition, original expiry; no history/list or cancellation client |
| E6 | [owned-concession-screen.tsx](../../frontend/src/features/concession/owned-concession-screen.tsx), [use-concession-composition.ts](../../frontend/src/features/concession/use-concession-composition.ts), [concession-api.ts](../../frontend/src/features/concession/concession-api.ts): actual catalog and owned composition with uncertainty/freeze |
| E7 | [owned-promotion-panel.tsx](../../frontend/src/features/promotion/owned-promotion-panel.tsx), [promotion-api.ts](../../frontend/src/features/promotion/promotion-api.ts): owned PUT apply and DELETE remove, no public Promotion list |
| E8 | [owned-payment-initiation-panel.tsx](../../frontend/src/features/payment/owned-payment-initiation-panel.tsx), [owned-payment-status-panel.tsx](../../frontend/src/features/payment/owned-payment-status-panel.tsx), [payment-return-screen.tsx](../../frontend/src/features/payment/payment-return-screen.tsx), [payment-status-service.ts](../../frontend/src/features/payment/payment-status-service.ts), [payment-initiation-api.ts](../../frontend/src/features/payment/payment-initiation-api.ts), [payment-initiation-storage.ts](../../frontend/src/features/payment/payment-initiation-storage.ts): known-attempt authenticated reads, explicit initiation/submission, safe per-tab hints |
| E9 | [booking-history-preview.tsx](../../frontend/src/features/booking/booking-history-preview.tsx), [booking-detail-preview.tsx](../../frontend/src/features/booking/booking-detail-preview.tsx), [booking-qr-preview.tsx](../../frontend/src/features/booking/booking-qr-preview.tsx), [booking-history-service.ts](../../frontend/src/features/booking/booking-history-service.ts), [ticket-preview-service.ts](../../frontend/src/features/ticket/ticket-preview-service.ts): fictional sample Bookings/Tickets and inert `SMART_CINEMA_PREVIEW:BOOKING` QR; not owned financial/admission data |
| E10 | [login-form.tsx](../../frontend/src/features/auth/login-form.tsx), [register-form.tsx](../../frontend/src/features/auth/register-form.tsx), [profile-screen.tsx](../../frontend/src/features/auth/profile-screen.tsx), [auth-api.ts](../../frontend/src/features/auth/auth-api.ts), [auth-return.ts](../../frontend/src/features/auth/auth-return.ts), [customer-account-menu.tsx](../../frontend/src/features/auth/customer-account-menu.tsx): actual auth/profile, restricted safe resume destinations; shared menu offers Profile to operators although backend Profile is Customer-only |
| E11 | [admin-shell.tsx](../../frontend/src/features/admin/admin-shell.tsx), [admin-home.tsx](../../frontend/src/features/admin/admin-home.tsx), [site-header.tsx](../../frontend/src/components/layout/site-header.tsx): server-checked Admin access; four Admin navigation items, no scoped Manager/Staff workspace |
| E12 | [admin-movie-list.tsx](../../frontend/src/features/admin/admin-movie-list.tsx), [admin-movie-form.tsx](../../frontend/src/features/admin/admin-movie-form.tsx), [admin-api.ts](../../frontend/src/features/admin/admin-api.ts): real administrative list/editor/publication and Genre association |
| E13 | [admin-configuration-screen.tsx](../../frontend/src/features/admin/admin-configuration-screen.tsx), [admin-configuration.types.ts](../../frontend/src/features/admin/admin-configuration.types.ts), [admin-api.ts](../../frontend/src/features/admin/admin-api.ts): real Cinema/Hall/Seat operations, complete-layout capacity checks, history-sensitive structure editing |
| E14 | [admin-showtime-screen.tsx](../../frontend/src/features/admin/admin-showtime-screen.tsx), [admin-showtime.types.ts](../../frontend/src/features/admin/admin-showtime.types.ts), [admin-api.ts](../../frontend/src/features/admin/admin-api.ts): real schedule filters/editability/transitions, timezone, exact decimal price |
| E15 | Exhaustive [app route tree](../../frontend/src/app), [feature tree](../../frontend/src/features), and backend controller inventory: no Manager/Staff/Check-in/User/Assignment/Reports/Audit authoring route/component/API client; no inference from navigation absence alone |

Actual backend boundaries inspected include [BookingController](../../backend/src/main/java/com/smartcinema/booking/BookingController.java), [VnpayController](../../backend/src/main/java/com/smartcinema/payment/VnpayController.java), [VnpayPaymentResponse](../../backend/src/main/java/com/smartcinema/payment/VnpayPaymentResponse.java), [AuthSecurityConfiguration](../../backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java), [ProfileController](../../backend/src/main/java/com/smartcinema/user/ProfileController.java), [AdminAccessService](../../backend/src/main/java/com/smartcinema/admin/AdminAccessService.java), [AdminMovieController](../../backend/src/main/java/com/smartcinema/admin/AdminMovieController.java), [AdminConfigurationController](../../backend/src/main/java/com/smartcinema/admin/AdminConfigurationController.java) and [AdminShowtimeController](../../backend/src/main/java/com/smartcinema/admin/AdminShowtimeController.java). Public catalog/discovery reads are permitted; owned transactions require active CUSTOMER. Admin URLs require current database-verified ADMIN, not just a cached role. No current scoped Manager/Staff operation controller exists to substitute for this.

Seat synchronization is a separate incomplete requirement: `use-seat-holds.ts` refreshes actual owned Holds/Seat map on a visible 30-second interval and focus/pageshow/visibility events. It has no WebSocket/EventSource subscription or FR-SEAT-013–FR-SEAT-015 event consumer. Real server reads and contention protection do not demonstrate the BRD BG-06 three-second synchronization goal. This is a contract/integration dependency; do not solve it by designing a false “live” guarantee.

Known Payment reads return exact string IDs/amount, serialized Payment status, Booking status, `reconciliationRequired`, and an existing `bookingQr`/`tickets` paid projection. The current frontend deliberately drops the issuance fields. Therefore “no Ticket backend whatsoever” would be incorrect; conversely this response is **not** a Customer history/list endpoint or a fully audited independent Ticket/QR access contract.

Current Customer Payment endpoints are `POST /api/v1/bookings/{bookingId}/payment-transactions` with `{}`, known-attempt `GET /api/v1/bookings/{bookingId}/payment-transactions/{paymentId}`, and explicit `POST .../{paymentId}/vnpay-submission` with `{}`. There is no known Customer latest/list-attempt endpoint. Backend browser return redirects to a configured fixed HTTPS destination without query/IDs and does not settle the Payment. Frontend destination is `/payments/vnpay/return`; browser parameters are discarded. This existing route and inline Summary satisfy the Payment screen function; absent historical standalone owned `/payment` or `/result` paths are not automatically missing product capabilities.

Payment serialized states are **INITIATED, PENDING, SUCCESS, FAILED, CANCELLED**. Booking states are **PENDING, PAID, EXPIRED, CANCELLED**. Reconciliation is a server field, not an invented status. Payment has no invented EXPIRED state. SUCCESS with required reconciliation/non-PAID Booking cannot promise Tickets; stale/inconsistent reads remain uncertain/review. Known-attempt recovery is read-only and bounded; unknown frozen identity remains blocked. Permanent first-attempt composition freeze and original Booking expiry are preserved. No browser result/signature decides success.

Owned `DELETE /api/v1/bookings/{bookingId}` exists for eligible cancellation, but current frontend has no production cancellation client/control. Its eligibility/freeze/provider consequences must be used exactly; a failed Payment does not restore composition editing or authorize a refund.

#### Exhaustive route appendix

| Route pattern | Actual page file | Imported feature / classification |
|---|---|---|
| `/` | [(public)/page.tsx](<../../frontend/src/app/(public)/page.tsx>) | HomeScreen (home/home-screen) — **PARTIAL** |
| `/admin` | [admin/page.tsx](<../../frontend/src/app/admin/page.tsx>) | AdminHome (admin/admin-home) — **PLACEHOLDER (KPI dashboard); REAL operational hub** |
| `/admin/cinemas` | [admin/cinemas/page.tsx](<../../frontend/src/app/admin/cinemas/page.tsx>) | AdminCinemaList (admin/admin-configuration-screen) — **REAL** |
| `/admin/cinemas/[cinemaId]/edit` | [admin/cinemas/[cinemaId]/edit/page.tsx](<../../frontend/src/app/admin/cinemas/[cinemaId]/edit/page.tsx>) | AdminCinemaEditor (admin/admin-configuration-screen) — **REAL** |
| `/admin/cinemas/[cinemaId]/halls` | [admin/cinemas/[cinemaId]/halls/page.tsx](<../../frontend/src/app/admin/cinemas/[cinemaId]/halls/page.tsx>) | AdminHallList (admin/admin-configuration-screen) — **REAL** |
| `/admin/cinemas/[cinemaId]/halls/new` | [admin/cinemas/[cinemaId]/halls/new/page.tsx](<../../frontend/src/app/admin/cinemas/[cinemaId]/halls/new/page.tsx>) | AdminHallEditor (admin/admin-configuration-screen) — **REAL** |
| `/admin/cinemas/new` | [admin/cinemas/new/page.tsx](<../../frontend/src/app/admin/cinemas/new/page.tsx>) | AdminCinemaEditor (admin/admin-configuration-screen) — **REAL** |
| `/admin/halls/[hallId]/edit` | [admin/halls/[hallId]/edit/page.tsx](<../../frontend/src/app/admin/halls/[hallId]/edit/page.tsx>) | AdminHallEditor (admin/admin-configuration-screen) — **REAL** |
| `/admin/halls/[hallId]/seats` | [admin/halls/[hallId]/seats/page.tsx](<../../frontend/src/app/admin/halls/[hallId]/seats/page.tsx>) | AdminSeatManagement (admin/admin-configuration-screen) — **REAL** |
| `/admin/movies` | [admin/movies/page.tsx](<../../frontend/src/app/admin/movies/page.tsx>) | AdminMovieList (admin/admin-movie-list) — **REAL** |
| `/admin/movies/[movieId]/edit` | [admin/movies/[movieId]/edit/page.tsx](<../../frontend/src/app/admin/movies/[movieId]/edit/page.tsx>) | AdminMovieForm (admin/admin-movie-form) — **REAL** |
| `/admin/movies/new` | [admin/movies/new/page.tsx](<../../frontend/src/app/admin/movies/new/page.tsx>) | AdminMovieForm (admin/admin-movie-form) — **REAL** |
| `/admin/showtimes` | [admin/showtimes/page.tsx](<../../frontend/src/app/admin/showtimes/page.tsx>) | AdminShowtimeList (admin/admin-showtime-screen) — **REAL** |
| `/admin/showtimes/[showtimeId]/edit` | [admin/showtimes/[showtimeId]/edit/page.tsx](<../../frontend/src/app/admin/showtimes/[showtimeId]/edit/page.tsx>) | AdminShowtimeEditor (admin/admin-showtime-screen) — **REAL** |
| `/admin/showtimes/new` | [admin/showtimes/new/page.tsx](<../../frontend/src/app/admin/showtimes/new/page.tsx>) | AdminShowtimeEditor (admin/admin-showtime-screen) — **REAL** |
| `/bookings/[bookingId]/concessions` | [(public)/bookings/[bookingId]/concessions/page.tsx](<../../frontend/src/app/(public)/bookings/[bookingId]/concessions/page.tsx>) | OwnedConcessionScreen (concession/owned-concession-screen) — **REAL** |
| `/bookings/[bookingId]/summary` | [(public)/bookings/[bookingId]/summary/page.tsx](<../../frontend/src/app/(public)/bookings/[bookingId]/summary/page.tsx>) | OwnedBookingSummaryScreen (booking/owned-booking-summary-screen) — **REAL** |
| `/bookings/preview/concessions` | [(public)/bookings/preview/concessions/page.tsx](<../../frontend/src/app/(public)/bookings/preview/concessions/page.tsx>) | ConcessionSelectionScreen (concession/concession-selection-screen) — **PREVIEW** |
| `/bookings/preview/payment` | [(public)/bookings/preview/payment/page.tsx](<../../frontend/src/app/(public)/bookings/preview/payment/page.tsx>) | PaymentMethodScreen (payment/payment-method-screen) — **PREVIEW** |
| `/bookings/preview/payment/processing` | [(public)/bookings/preview/payment/processing/page.tsx](<../../frontend/src/app/(public)/bookings/preview/payment/processing/page.tsx>) | PaymentProcessingScreen (payment/payment-processing-screen) — **PREVIEW** |
| `/bookings/preview/payment/result` | [(public)/bookings/preview/payment/result/page.tsx](<../../frontend/src/app/(public)/bookings/preview/payment/result/page.tsx>) | PaymentResultScreen (payment/payment-result-screen) — **PREVIEW** |
| `/bookings/preview/summary` | [(public)/bookings/preview/summary/page.tsx](<../../frontend/src/app/(public)/bookings/preview/summary/page.tsx>) | BookingSummaryScreen (booking/booking-summary-screen) — **PREVIEW** |
| `/login` | [(auth)/login/page.tsx](<../../frontend/src/app/(auth)/login/page.tsx>) | LoginForm (auth/login-form) — **REAL** |
| `/movies` | [(public)/movies/page.tsx](<../../frontend/src/app/(public)/movies/page.tsx>) | MovieCatalog (movie/movie-catalog); MovieLoading (movie/movie-feedback) — **REAL** |
| `/movies/[movieId]` | [(public)/movies/[movieId]/page.tsx](<../../frontend/src/app/(public)/movies/[movieId]/page.tsx>) | MovieDetailScreen (movie/movie-detail-screen); MovieLoading (movie/movie-feedback) — **REAL** |
| `/movies/[movieId]/cinemas` | [(public)/movies/[movieId]/cinemas/page.tsx](<../../frontend/src/app/(public)/movies/[movieId]/cinemas/page.tsx>) | CinemaSelectionScreen (cinema/cinema-selection-screen); MovieLoading (movie/movie-feedback) — **REAL** |
| `/movies/[movieId]/cinemas/[cinemaId]/showtimes` | [(public)/movies/[movieId]/cinemas/[cinemaId]/showtimes/page.tsx](<../../frontend/src/app/(public)/movies/[movieId]/cinemas/[cinemaId]/showtimes/page.tsx>) | ShowtimeSelectionScreen (showtime/showtime-selection-screen); MovieLoading (movie/movie-feedback) — **REAL** |
| `/my-bookings` | [(public)/my-bookings/page.tsx](<../../frontend/src/app/(public)/my-bookings/page.tsx>) | BookingHistoryPreview (booking/booking-history-preview); BookingHistoryLoading, BookingPreviewHeading (booking/booking-history-shared) — **PREVIEW** |
| `/my-bookings/[bookingId]` | [(public)/my-bookings/[bookingId]/page.tsx](<../../frontend/src/app/(public)/my-bookings/[bookingId]/page.tsx>) | BookingDetailPreview (booking/booking-detail-preview); BookingHistoryLoading, BookingPreviewHeading (booking/booking-history-shared) — **PREVIEW** |
| `/payments/vnpay/return` | [(public)/payments/vnpay/return/page.tsx](<../../frontend/src/app/(public)/payments/vnpay/return/page.tsx>) | PaymentReturnScreen (payment/payment-return-screen) — **REAL** |
| `/profile` | [(customer)/profile/page.tsx](<../../frontend/src/app/(customer)/profile/page.tsx>) | ProfileScreen (auth/profile-screen) — **REAL** |
| `/register` | [(auth)/register/page.tsx](<../../frontend/src/app/(auth)/register/page.tsx>) | RegisterForm (auth/register-form) — **REAL** |
| `/showtimes/[showtimeId]/seats` | [(public)/showtimes/[showtimeId]/seats/page.tsx](<../../frontend/src/app/(public)/showtimes/[showtimeId]/seats/page.tsx>) | SeatSelectionScreen (seat/seat-selection-screen); MovieLoading (movie/movie-feedback) — **REAL** |

Route groups are organization, not authorization. All page entries were inspected. Root layout supplies Auth/Suspense/global styling; public layout supplies the Concession preview context, and discovery pages use the shared customer layout. Admin layout uses `AdminShell`. Movie loading/error route files coexist with feature-local loading/error states elsewhere. Their absence in another folder alone is not evidence of a missing UX state. The five explicit checkout preview routes remain PREVIEW. No Manager/Staff route was found.

### 5.5. State coverage and responsive gaps

| Journey | Live Stitch states actually present | Current frontend evidence | Missing/revision scope |
|---|---|---|---|
| Auth/Profile/menu | Credential and field errors, loading, duplicate registration, save success/failure, expanded Customer menu | Real auth/profile and session/denied states [E10] | Vietnamese, mobile form/menu, safe role destinations, no unsupported recovery/membership claims |
| Movie/Cinema/Showtime | Movie skeleton/unavailable/trailer; branch closed/empty; no screenings/sold-out/started | Real loading/empty/error/retry and unavailable context [E2,E3] | Remove uncontracted metadata/filters/counts; distinguish unavailable Movie versus empty schedule; deliberate mobile states |
| Seat/Hold/Booking create | Legend, selection, contention, empty cart, timer warning/expiry, bottom summary | Real acquire/release, exact Hold ownership, lost response/auth/resume [E4] | Server-expiry copy, keyboard seat navigation, stale/reload/rejected-batch/creation-uncertain variants |
| Concession/Promotion/Summary | Empty basket, skeleton, network error, expired overlay, valid/invalid Promotion, distinct totals | Real exact snapshots/freeze, invalid-Promotion rollback, uncertain mutation/read-only [E5–E7] | Remove reset/demo controls and fixed TTL; first-Payment freeze, denial, unsupported/deactivated catalog and revalidation variants |
| Payment | Redirect screen and success-only confirmation | Real INITIATED/PENDING/negative/reconciliation/uncertain/read/login/recovery [E8] | Entire backend-authoritative state family; conflicting projections, unknown identity, original expiry and late SUCCESS; no QR/issuance promise |
| Booking/Tickets/QR | Combined paid detail, valid/mixed/all-checked Tickets; fullscreen Booking QR; older list empty/error | Preview list/detail/empty/error/QR dialog; no real retrieval [E9] | Owned list/detail/loading/denied, PENDING/EXPIRED/CANCELLED, paid-but-issuance-unavailable, latest per-Ticket state, mobile QR; no Customer Check-in control |
| Admin operational CRUD | No dedicated actual screen | Existing real loading/error/retry/empty, save success/validation, protected editability [E11–E14] | Design existing behavior first; mobile editor/list/layout, denied and stale/server-conflict variants; generic form errors already exist |
| Manager/Staff/assignment | No actual operational design | No operational frontend [E15] | All list/detail/create/edit/validation/result states plus role/scope/no-assignment, loading/empty/error and mobile |
| Reports/audit | No actual design | No aggregate/history frontend [E15] | Contract-defined metric/filter/history states, redaction and scope; no fake KPI or fabricated financial success |

Responsive utility classes occur in all 25 UI HTML exports, and current frontend has responsive classes and historical mobile browser evidence. Neither proves a complete set of authored mobile designs or a fresh accessibility audit. Required design work must include desktop and mobile exports with legible tables/cards, keyboard focus and status announcements, labeled non-color-only states, safe QR sizing and no clipped controls. `Accessibility Audit.md` supplies no measured WCAG result. No current full accessibility certification is claimed.

### 5.6. Gap categories

1. **Missing Stitch and missing frontend:** Admin Users/Manager/Staff assignment, Promotion/Concession authoring, Genre authoring (conditional), operational Booking/Ticket lookup, reports/audit; all Manager scoped operations; Staff scanner/validation/Check-in/manual lookup/history; eligible Customer cancellation; optional notification templates. Requirements and priorities are in §5.3.
2. **Existing Stitch, no real frontend:** My Bookings, owned Ticket detail and Booking QR are PREVIEW, not absent. Prefer `b850455e65fc482a8ef3332cb672683d`; use older list empty/error layout selectively. Five explicit checkout previews also have designs but do not replace the real inline owned Payment flow.
3. **Existing real frontend, missing dedicated Stitch:** all 13 Admin CRUD route pages, Admin access/hub shell, known/unknown Payment recovery variants, freeze/revalidation/uncertain-write states. Reuse current source components when designing; no new backend capability is implied.
4. **Outdated Stitch requiring revision:** all 25 UI exports need Vietnamese copy; seven legacy Hidden Customer layouts and older Home overlap should not drive new implementation, while the hidden old Seat screen adds incompatible branding/currency. Payment, Summary, old individual QR, profile benefits and discovery claims require business-content revision as listed in §5.2.
5. **Completed resources requiring no new design:** 18 inspected image assets and the reusable Nocturne theme. No completed UI screen requires zero baseline revision. A lack of runtime/image licensing certification is outside the screen coverage judgment.

### 5.7. Prioritized Stitch backlog by role

Shared acceptance for every batch: preserve `.stitch/DESIGN.md`, Vietnamese customer/operator copy, dark/amber visuals, Space Grotesk/Plus Jakarta Sans, VND exact-value display, labeled status distinctions. Export **desktop 1280px and mobile 390px**, inspect narrow 360px reflow and tablet behavior. Include keyboard/focus, loading, empty, safe error, denied/session-expired, confirmed success/negative and uncertain states wherever applicable. These viewport targets are proposed design criteria, not invented SRS constants. Designs must not create endpoints, permissions, timing rules, provider capabilities or financial authority.

#### P0 — shared entry and core Customer/operational completion

| Batch / role | Exact scope and reuse | Components / states | Requirements / dependencies | Acceptance criteria |
|---|---|---|---|---|
| **Shared operator entry** — Admin, Manager, Staff | Shared login plus role-aware landing/navigation, authorized Cinema context; extend `f5904cd07f924d25a0ca844636e93060` and `14dc6c1445a747b88c866508463e9879`; reuse existing Admin shell visually | Identity loading, inactive/forbidden, no assignment, assignment removed, network error, logout; desktop sidebar/mobile menu | FR-AUTH-002, FR-AUTH-006–FR-AUTH-008, FR-ORG-005; scoped identity/assignment contract missing for operators | No cached-role authorization; no arbitrary Cinema; Customer-only Profile not offered to operators without a contract; navigation contains only approved functions |
| **Owned Booking, Tickets and Booking QR** — Customer | My Bookings list, detail, Tickets and fullscreen single Booking QR; extend `b850455e65fc482a8ef3332cb672683d`, borrow generic list/empty/error from `ca1c28a605b64d4ebeb59d4c00c23d42` | Owned list/empty/error/login; PENDING/PAID/EXPIRED/CANCELLED detail; paid-but-issuance-unavailable; VALID/CHECKED_IN/EXPIRED/CANCELLED Ticket labels and mixed/all-checked states; safe refresh/QR privacy | FR-BOOKING-009, FR-BOOKING-010; FR-TICKET-002, FR-TICKET-004–FR-TICKET-010; BR-044, BR-046; Customer list and independent PAID/issuance access audit required | Exactly one QR per eligible Booking; one whole COUPLE unit gives one Ticket/two guests; no locally issued QR, Customer Check-in, transfer/wallet/offline promise or unpaid admission |
| **Owned Summary and Payment return/status/recovery** — Customer | Revise `52aa55f16d2640d68efb6c399d5fb990`, `0cc11f6226c74b6291ef49660e63f748`, `777b204432ad4fba84065c10697951e9`, `b023e6ffbd0c424d9244aaa8393c442c`; one real return route + embedded Summary | Original expiry/freeze; VNPAY-only explicit gated action; INITIATED/PENDING, coherent SUCCESS/PAID, FAILED/CANCELLED, reconciliation, conflicting/stale reads, unavailable/unknown identity, login resume | FR-BOOKING-005–FR-BOOKING-007, FR-BOOKING-012, FR-BOOKING-018; FR-PAYMENT-001–FR-PAYMENT-015; existing real frontend/contracts are dependency | No Reset Timer; no automatic POST/reopen/retry; no browser-param success; SUCCESS reconciliation cannot imply issuance; refresh reads only; exact known attempt IDs/amount when provided |
| **Staff admission flow** — Cinema Staff | New scanner, manual lookup, server validation, Ticket selection, check-in result/rejection and fresh rescan; only visual Ticket card reuse from `b850455e65fc482a8ef3332cb672683d` | Camera consent/unavailable; unknown QR, unpaid/wrong Cinema/window rejection; VALID/mixed/already-used; busy/atomic result/concurrent conflict/lost response; mobile-first task flow plus desktop | FR-CHECKIN-001–FR-CHECKIN-013; FR-AUTH-008; UC-STF-002–UC-STF-007; actual scan/lookup/check-in HTTP contract and window policy absent | Scanning resolves, does not consume Booking; explicit selection only eligible Tickets; confirmed server result only; no duplicate check-in or invented fixed time window; show remaining Tickets after partial admission |
| **Users and Manager assignment** — Admin | New user list/detail, limited role/status forms, Manager list and Cinema assignment/deactivation/history; reuse Admin shell, no existing Stitch operational screen | List/filter/empty/error, inactive/role/scope restrictions, assignment conflict, save/uncertain mutation, protected confirmation | FR-AUTH-006, FR-AUTH-007, FR-AUTH-010; FR-ORG-001, FR-ORG-003; UC-ADM-002, UC-ADM-003, UC-ADM-007, UC-ADM-008; admin write/read contracts missing | No HRM, payroll, role creation or delete-history feature; assignment and account status distinct; availability/change rules depend on actual contract |
| **Scoped Hall, Seat and scheduling workspace** — Cinema Manager | New assigned-Cinema Hall list/create/edit/status, Seat-layout initialization/edit and Showtime list/create/edit/disable; reuse current Admin configuration/schedule visual patterns, not their ADMIN endpoints | No assignment/out-of-scope, loading/empty/validation/saved/error/uncertain; physical-maintenance vs showtime availability; capacity/history locks; scheduling conflict and past/read-only | FR-CINEMA-006–FR-CINEMA-009, FR-SEAT-002, FR-SEAT-003, FR-SHOWTIME-001–FR-SHOWTIME-005, FR-SHOWTIME-009, FR-SHOWTIME-010; UC-MGR-002–UC-MGR-014; scoped Manager APIs/policy required | Only assigned Cinema data/actions; no chain Movie/Cinema authoring; whole COUPLE units; price/times/transitions server-authoritative; no assumed buffer minutes or manual financial changes |

All six P0 batches require both desktop/mobile and applicable shared states. Contract-dependent designs may document a pending contract boundary; their mock content cannot be presented as implemented production capability.

#### P1 — existing operations design parity and composition/catalog completion

| Role / batch | Scope / reuse | Components and UI states | Requirements / dependencies | Acceptance criteria |
|---|---|---|---|---|
| Guest/Customer — discovery and Hold alignment | Revise Home, Movie list/detail, Cinema, Showtime, Seat IDs in §5.2; retain canonical layouts | Current API filters/DTO fields; normal/loading/empty/error/unavailable/closed/cutoff/contention/auth/reload/create-uncertain; reconnect/stale-connection/read-error; desktop/mobile | FR-MOVIE-001–FR-MOVIE-003, FR-MOVIE-007, FR-MOVIE-008; FR-CINEMA-001, FR-CINEMA-002; FR-SHOWTIME-006–FR-SHOWTIME-008; FR-SEAT-001, FR-SEAT-003–FR-SEAT-017; use real client DTOs; event contract/subscription unresolved | No fake ratings/geodistance/benefits/classifications; server deadlines and ownership; no unsupported real-time guarantee from a static screen |
| Customer — Auth/Profile revision | Extend login/register/profile/menu current IDs | Vietnamese validated forms, duplicate/inactive/session error, read-only role/email/status, edit/save/error; mobile menu | FR-AUTH-001–FR-AUTH-005; current actual Auth/Profile APIs | No Remember me/reset/SMS/verified-member/biometric capability; explicit supported fields only |
| Customer — Concession/Promotion and expiry | Revise `602baa042d22404d8b31d461351aa42d`, `1017f7c1f77943579d9bb1bee37f7718`, Summary panel | Optional empty basket, exact snapshot quantities/totals, inactive items, error, Promotion validation/rollback/remove, frozen/terminal/uncertain read; desktop/mobile | FR-BOOKING-008, FR-BOOKING-013–FR-BOOKING-018; FR-CONCESSION-001; FR-PROMO-002–FR-PROMO-006; real current composition clients | No stock/delivery/kitchen promise; first-attempt freeze cannot be undone; original expiry unchanged; invalid mutation leaves authoritative prior snapshot |
| Customer — eligible pending cancellation | New detail/Summary confirmation substate, extend Booking/Summary visuals | Only contract-eligible PENDING; submitting/success/already-expired/denied/uncertain refresh; desktop/mobile | FR-BOOKING-011, UC-CUS-022; existing DELETE contract and exact eligibility audit | No PAID refund/automatic provider cancellation; no timer reset or thaw after first Payment; lost response causes read/review |
| Admin — Movie and Cinema authoring | New Movie list/create/edit/publication; Cinema list/create/edit; reuse existing real components/shell | Search/paging/Genre association and actual fields, loading/empty/error/validation/saved/denied; desktop/mobile | FR-MOVIE-004–FR-MOVIE-007; FR-CINEMA-003–FR-CINEMA-005; actual admin DTOs | No new status/filter/media upload capability; distinguish stored read statuses from legal writes |
| Admin — Hall, physical Seat, Showtime parity | New designs corresponding to all current Hall/Seat/schedule pages; coordinate with Manager P0 component library | Capacity guest count, complete initialization, structural-history locks, physical status, timezone/price, server editability/transitions, conflict/error/success; desktop/mobile | FR-CINEMA-006–FR-CINEMA-009; FR-SEAT-002, FR-SEAT-003; FR-SHOWTIME-001–FR-SHOWTIME-005, FR-SHOWTIME-009, FR-SHOWTIME-010; actual guarded APIs | No deleting historical Seats, arbitrary capacity reshape, fake buffers or editing server-read-only schedules; role actions remain separate |
| Admin — Promotion/Concession authoring | New management lists/forms/status changes | Code validity/minimum/usage/status; Concession name/description/image/category/exact price/status; loading/empty/error/conflict/uncertain/saved; desktop/mobile | FR-PROMO-001–FR-PROMO-005; FR-CONCESSION-002–FR-CONCESSION-006; management endpoint schemas missing | No stock/fulfilment, new discount algorithm, hidden fees or retroactive change to Booking snapshots |
| Manager/Admin — Staff administration | New scoped Staff list/detail, assign/deactivate/status; reuse P0 assignment components | Cinema scope, role/status distinction, empty/history/conflict/denied/error/saved/uncertain; desktop/mobile | FR-CINEMA-010; FR-ORG-002–FR-ORG-005; UC-MGR-015–UC-MGR-017; missing approved scoped contract | No HRM or chain-wide Manager access; inactive association preserves history; account effects only per approved policy |
| Manager/Admin — operational Booking/Ticket reads | New authorized list/lookup/detail with Ticket cards | Scoped filters/loading/empty/denied/current Booking/Payment separation, mixed Tickets/error; desktop/mobile | SRS §6.3/§7.2; UC-MGR-018; FR-BOOKING-010, FR-TICKET-006; role-scoped read contracts absent | No unrestricted Customer search, settlement/refund controls or QR access beyond authorized operational need |

#### P2 — reporting, audit and optional support

| Role / batch | Scope / reuse | Components and states / variants | Requirements / dependencies | Acceptance criteria |
|---|---|---|---|---|
| Admin — chain dashboard/reporting | New aggregate dashboard and date/Cinema/Movie/performance reports; replace required dashboard gap at `/admin` without assuming a new route | Valid revenue/Tickets/occupancy, optional Concession revenue, no-data/loading/error/filter/permission; desktop tables + mobile cards | FR-REPORT-002–FR-REPORT-008; UC-ADM-014–UC-ADM-018; metric definitions/read contracts absent | No unpaid-as-revenue, fabricated KPI, invented exports or predictive analytics |
| Manager — scoped dashboard/reporting | New assigned-Cinema revenue/occupancy/Movie/Showtime performance | Approved date/timezone filters, current scope, no data/error/loading; desktop/mobile | FR-REPORT-001, FR-REPORT-003–FR-REPORT-007; UC-MGR-019–UC-MGR-022; scoped metrics contract | No chain comparisons/data outside scope unless explicitly permitted; defined denominators and financial source |
| Admin/Manager/Staff — authorized audit/history | Admin audit list/detail/Payment traceability; approved Manager subset; Staff Check-in history | Actor/time/reference, scope/redaction, empty/loading/filter/error and permitted detail; desktop/mobile | FR-AUDIT-001–FR-AUDIT-006; FR-PAYMENT-015; UC-STF-008, UC-ADM-019; visibility/read contracts absent | No secrets/raw QR/callback/signature dump; Staff not granted full chain audit; no manual Payment SUCCESS control |
| Admin — Genre authoring, conditional | New Genre list/editor/status only if UC-ADM-005 retained; reuse Movie form style | Allowed actual fields and validation/empty/error/saved; desktop/mobile | UC-ADM-005; Scope §5.2; no explicit CRUD FR/API schema | Existing Genre association does not certify Genre CRUD; clarify scope/contract before detailed forms |
| Customer/System — optional notification templates | Payment confirmation/Ticket availability messages and failed-delivery fallback, not a new inbox | Vietnamese content, authoritative result/issuance separation, no misleading delivery guarantee; responsive email/web content if channel approved | FR-NOTIFY-001–FR-NOTIFY-004; channel and delivery contract pending | Notification failure does not alter Payment/Booking/Ticket state |
| Staff — limited dashboard, conditional | Only approved limited operational summary | Scoped available/no-assignment/no-data/error views, desktop/mobile | SRS §7.2; exact content/entitlement unresolved | No unapproved financial KPI or Manager reporting functions |
| All — accessibility/responsive design review | Extend theme/state component library; replace the incomplete Markdown audit through a future authorized task | Focus, status announcements, reduced motion, labeled semantic states, contrast measurement, 360/390/tablet/desktop reflow | NFR-UX-001–NFR-UX-005, NFR-SEC-011; actual rendered checks required | A measured review, not “WCAG compliant” sample copy; no theme/font/color redesign |

### 5.8. Copy-paste P0 Stitch prompts

These are **prepared prompts only**. They were not sent to a generation/edit tool. Each future batch needs explicit design execution authorization. All resulting user-facing labels, instructions, validation, empty/error/success text and accessible names must be Vietnamese; keep English only for this prompt and immutable technical/provider identifiers where necessary.

#### Prompt 1 — shared operator entry

```text
Design the shared operator entry and role-aware workspace navigation for Smart Cinema Ecosystem, project 1208499799798658711. Preserve the existing Nocturne Cinema System and repository .stitch/DESIGN.md: cinematic dark surfaces, restrained amber #F59E0B actions, Space Grotesk headings and Plus Jakarta Sans body, clear focus and non-color-only states. Reuse Sign In screen f5904cd07f924d25a0ca844636e93060 and Account Menu screen 14dc6c1445a747b88c866508463e9879 visually. All UI copy and accessible labels must be Vietnamese.

Create desktop 1280px and mobile 390px variants, with 360px reflow. Show distinct Admin, Cinema Manager and Cinema Staff navigation. Admin's current implemented modules are Phim, Rạp chiếu phim and Suất chiếu; a Tổng quan hub is not evidence of financial KPI support. Manager may enter only server-authorized assigned Cinema workspaces. Staff has an assigned-Cinema admission workspace, not administrative CRUD. An assignment selector may contain only server-provided authorized choices. Do not grant Manager Check-in by default: that permission remains conditional.

Include Đang kiểm tra quyền truy cập, Không có quyền truy cập, Tài khoản không hoạt động, Chưa có rạp được phân công, Phiên đăng nhập đã hết hạn, temporarily unavailable and assignment-removed states. Include safe sign-in/resume, logout, active navigation, keyboard focus and mobile menu behavior. Do not offer the Customer-only Hồ sơ của tôi to operators without a supported profile contract. Cached role information never grants permission. Do not invent password reset, Remember me, role creation, unrestricted Cinema switching or backend endpoints. Missing scoped identity/assignment contracts are dependencies, not working product capabilities.
```

#### Prompt 2 — owned My Bookings, Tickets and one Booking QR

```text
Design Customer My Bookings, owned Booking detail, Ticket list and full-screen Booking QR for Smart Cinema Ecosystem, project 1208499799798658711. Preserve .stitch/DESIGN.md and the existing dark/amber Nocturne system, typography and VND formatting. Use Booking QR & Passes screen b850455e65fc482a8ef3332cb672683d as the primary visual reference. Borrow only generic list/empty/error structure from older My Tickets screen ca1c28a605b64d4ebeb59d4c00c23d42; do not reuse its individual QR, wallet or transfer model. All interface and accessible copy must be Vietnamese.

Produce desktop 1280px and mobile 390px variants with narrow 360px reflow. Cover Đơn đặt vé của tôi list, empty/loading/read-error/login/ownership-denied states, and owned detail for backend PENDING, PAID, EXPIRED and CANCELLED. Show exact backend amounts and references only when supplied. Separate financial confirmation from Ticket issuance availability. For unpaid or unconfirmed data do not render admission Tickets or a usable QR. Include a paid Booking whose issuance data is temporarily unavailable, with safe read-only recheck guidance.

The model is ONE BOOKING -> ONE BOOKING QR -> MULTIPLE TICKETS. Each purchased Seat Unit produces one Ticket; COUPLE is one indivisible unit, one Ticket and two guests. Show separate VALID, CHECKED_IN, EXPIRED and CANCELLED Ticket labels, mixed valid/checked-in states, and all-checked-in state based on current server data. Scanning a Booking QR does not consume the whole Booking. Customer has no Simulate Check-In or admission action. Provide an accessible fullscreen QR dialog with dismiss/focus return and legible mobile sizing. Never fabricate a live QR token in the design's sample content; use a clearly inert placeholder. Do not add NFC, Apple/Google Wallet, transfer, PDF/offline guarantee, automatic brightness, food pickup, kiosk access or re-entry policy. Customer history/list and independent verified PAID/issuance access contracts still require audit; do not invent endpoints or filters unsupported by the approved contract.
```

#### Prompt 3 — owned Summary and authoritative Payment status/recovery

```text
Revise Smart Cinema's owned Summary and Payment return/status/recovery experience in project 1208499799798658711. Reuse Summary 52aa55f16d2640d68efb6c399d5fb990, Payment Method 0cc11f6226c74b6291ef49660e63f748, Processing 777b204432ad4fba84065c10697951e9 and Result b023e6ffbd0c424d9244aaa8393c442c. Preserve .stitch/DESIGN.md, dark/amber hierarchy, typography and exact VND amounts. Every user-facing label and accessible name must be Vietnamese. Produce desktop 1280px/mobile 390px variants and 360px reflow.

The real flow embeds Payment in owned Booking Summary and returns through /payments/vnpay/return. Show separate Booking and Payment states. Payment serialized states are INITIATED, PENDING, SUCCESS, FAILED, CANCELLED; Booking states are PENDING, PAID, EXPIRED, CANCELLED. Reconciliation is a backend flag, not a new financial status. Design Đang xác minh thanh toán, Thanh toán đang chờ hoàn tất, Thanh toán đang chờ xử lý, verified Thanh toán thành công only for coherent backend SUCCESS and PAID, confirmed failure/cancellation, Đang đối soát thanh toán, conflicting or stale projections, temporary read failure and Chưa thể xác định kết quả thanh toán. A late successful transaction requiring reconciliation must not promise Tickets or fulfillment.

Keep original server Booking expiry visible when provided and preserve permanent composition freeze from the first Payment attempt. No Reset Timer or restored Concession/Promotion editing after a failed Payment. The supported provider is VNPAY with explicit backend-gated Sandbox submission; remove MoMo/other methods and instant-confirmation claims. Show known-attempt recovery, login resume, reload/back/tab return, safe explicit Kiểm tra lại trạng thái and Quay về thông tin đặt vé actions. Unknown Payment identity on a frozen Booking stays blocked with truthful guidance. Read-only refresh must not imply a new initiation, provider reopen or query API. Show Payment ID/exact amount only from server data. Do not expose raw callback parameters, signatures, secrets or internal metadata. Browser redirect parameters never establish success. No frontend IPN, automatic Payment POST, locally PAID Booking, Ticket/QR issuance or refund/replacement policy. Do not invent new routes or backend contracts.
```

#### Prompt 4 — Cinema Staff admission

```text
Create Cinema Staff admission designs for Smart Cinema Ecosystem, project 1208499799798658711, using the existing .stitch/DESIGN.md Nocturne dark/amber system. There is no existing Staff screen. Reuse only the visual Ticket-card language of Booking QR & Passes b850455e65fc482a8ef3332cb672683d, not Customer prototype controls. All UI copy and accessible labels must be Vietnamese. Create mobile-first 390px screens and desktop 1280px equivalents, with 360px reflow and clear keyboard focus.

Design assigned-Cinema entry, Booking QR scanner, approved manual Booking lookup, Booking validation/Ticket selection and server-confirmed Check-in results. Include camera permission prompt, denied/unavailable camera, scanning/pause/loading, unknown QR, unpaid Booking, wrong Cinema, invalid server-defined admission window, expired/cancelled Ticket, already-used Ticket, mixed Ticket states and all-already-checked-in. Do not prescribe fixed admission-window minutes or unapproved lookup fields. Detailed HTTP/result contracts remain dependencies; no invented endpoints or permissions.

One Booking has one QR resolving multiple Tickets. Scanning loads/refreshes the Booking and Ticket states; it does not automatically Check-in everyone. Staff explicitly selects one or more eligible VALID Tickets. A COUPLE Seat Unit is one Ticket for two guests and cannot be split. Show clear selected Ticket/guest counts, pending action, server-confirmed atomic result, actor/time only where permitted, and refreshed remaining valid/checked-in Tickets. Include duplicate/concurrent action conflict, delayed response, network uncertainty and read/review before retry; never optimistically mark CHECKED_IN or display success from scanning alone. Distinguish Vietnamese outcomes such as Vé hợp lệ, Đã check-in, Không đúng rạp, Đơn chưa thanh toán, Không thể xác minh and Kiểm tra lại. Keep raw QR tokens/private Customer data out of logs and general UI. No payment settlement, refund, full chain search, HRM or Manager permission extension.
```

#### Prompt 5 — Admin users and Manager assignment

```text
Create Admin user administration and Manager-to-Cinema assignment designs for Smart Cinema Ecosystem, project 1208499799798658711. Preserve .stitch/DESIGN.md, the existing dark/amber Nocturne system and current Admin shell visual language. No dedicated live Stitch Admin screen exists. All UI text and accessible names must be Vietnamese. Produce desktop 1280px and mobile 390px list/form/detail variants with narrow 360px reflow.

Cover Danh sách người dùng, limited account detail/role/status editing, Manager list and Cinema assignment/deactivation with preserved history. Use only approved requirements FR-AUTH-006, FR-AUTH-007, FR-AUTH-010, FR-ORG-001 and FR-ORG-003. Do not turn this into HRM: no payroll, attendance management, arbitrary permission/role creation, password recovery or delete-history feature. Exact user fields, status transitions and assignment schemas need an approved API contract; mark these as dependencies instead of inventing working capabilities.

Show loading, empty list, read failure, active/inactive account, currently assigned/unassigned/deactivated association, invalid or conflicting assignment, permission denial, session expiry, save in progress, confirmed saved and uncertain write outcomes requiring a fresh read. Keep account status separate from assignment status and show authorized Cinema context. Include protected change confirmation without inventing self-demotion or last-Admin business rules. Reuse common accessible forms, status chips, filtered list patterns only for approved filter fields, and mobile cards. No financial status changes, fake audit proof, unapproved User deletion or operator access based solely on a local cached role.
```

#### Prompt 6 — scoped Manager Hall/Seat/Showtime operations

```text
Create Cinema Manager's assigned-Cinema Hall, physical Seat and Showtime workspace for Smart Cinema Ecosystem, project 1208499799798658711. Preserve .stitch/DESIGN.md and the current Nocturne dark/amber design system. There is no current Manager Stitch design or operational frontend route. Reuse the visual patterns of existing Admin configuration/schedule components; their ADMIN-only APIs do not grant Manager access. All UI and accessible copy must be Vietnamese. Produce desktop 1280px and mobile 390px variants with 360px reflow and usable dense editors.

Design authorized Cinema context/no-assignment/removed-assignment states, Hall list/create/edit/status, physical Seat layout setup/edit/status, and Showtime list/create/edit/disable/view-only. Scope every operation to server-authorized assigned Cinemas. Hall capacity is guest capacity. STANDARD and VIP are one guest; COUPLE is one indivisible Seat Unit for two guests. Distinguish physical ACTIVE/MAINTENANCE/INACTIVE from per-Showtime seat availability. Present whole-layout guest-capacity totals and reference/history-based editing locks only according to the approved scoped contract. No Hall reassignment, arbitrary deletion of historical Seats or changing protected capacity.

Scheduling should show approved Movie/Hall choice, exact server price, configured timezone and server-derived timing, valid transitions and editability. Include empty/loading/read failure, validation/conflict, maintenance/unavailable Hall, out-of-scope rejection, past or history-protected read-only schedule, save pending/success and uncertain result. Do not hard-code buffers or a new cutoff policy, infer a legal transition or modify Booking/Payment/Tickets on cancellation. Scoped Manager APIs and exact operational policies are unresolved dependencies, not implemented capabilities. No chain-level Movie/Cinema authoring, full chain reporting, default Check-in entitlement, staff HRM, financial settlement or refund workflow. Coordinate shared components with future Admin designs while keeping role-specific actions separate.
```

### 5.9. Recommended design execution order

1. Establish shared Vietnamese role/scope/state patterns and desktop/mobile components; retain the current theme. Resolve scoped operator access contracts before treating workspaces as functional.
2. Revise owned Summary/Payment status first using current verified implementation; remove misleading success/issuance and timer/provider assumptions.
3. Extend the existing combined Booking QR design for owned My Bookings/Tickets; independently audit actual PAID/issuance and Customer history contracts before implementation.
4. Design Staff scanner/validation/selection/results against an approved Check-in/manual-lookup contract. Admission is the remaining critical end-to-end closure.
5. Design Admin Users/Manager assignment, then scoped Manager Hall/Seat/Showtime operations; coordinate shared operational components with P1 Admin design parity.
6. Execute P1 discovery/Auth/composition alignment, Admin catalog/configuration parity, Staff administration and scoped Booking reads. Pending cancellation requires its own contract-correct substate.
7. Execute P2 reporting/audit/optional content after metric, visibility and channel contracts are settled. Review actual rendered accessibility/responsive states.

This order authorizes no execution. Backend contract work and future implementation remain separate tasks; an attractive design cannot unblock a missing API or permission by itself.

## 6. Files Created

- This report: `docs/reports/2026-10-10_live-stitch-ui-coverage-audit_report.md`.
- Ignored local audit evidence under `frontend/target/stitch-ui-coverage-audit-2026-10-10/`: tracked-file preservation baseline, downloaded 26 HTML/text and 43 image exports, contact sheets, sanitized content/source inventories and DOCX text extraction. These are audit artifacts, not frontend/backend source changes. Signed asset-download URLs and credentials are omitted from this report.

## 7. Files Modified

No existing tracked file modified. No source, requirements, handoff, historical report, `.stitch` cache/design, database, migration, MCP configuration, index or commit changed. The sole deliverable is a new audit report. Scope is AUDIT ONLY, so updating the implementation handoff or generating designs was not performed.

## 8. Verification

| Check | Result / evidence |
|---|---|
| Live Stitch connectivity/metadata | PASS: read calls succeeded with OWNER access to specified project |
| Resource completeness | PASS: 35 visible resources reconciled to 44 distinct canvas source resources plus theme; every source retrieved |
| Actual content inspection | PASS: 26 HTML/text exports and 43 resource screenshots/images; all 25 original-size UI renditions additionally fetched and visually reviewed, plus 18 image assets |
| Unique/duplicate review | PASS: no byte-identical HTML/PNG resource export; related/obsolete families explicitly separated |
| Frontend route coverage | PASS: all 33 actual page patterns and their imported feature boundaries classified; no Manager/Staff page found |
| Requirement/source reconciliation | PASS as audit: current requirement IDs/role policies and actual API boundaries cited; product gaps remain |
| Fresh TypeScript, ESLint, build, unit/backend/Playwright regression | NOT RUN: audit adds documentation only and changes no runtime/test code |
| Historical regression evidence | Previous 2026-10-10 Payment report records backend 294, unit 138, Playwright 219 PASS plus TypeScript/lint/build; these were not rerun or recertified here |
| Frontend runtime/browser accessibility | NOT RUN in this audit; source and Stitch inspection are not fresh interactive production QA |
| Live Neon/VNPAY/financial proof | NOT RUN; no database operation or provider transaction performed. Earlier report explicitly marks actual Sandbox return/signed callback/Payment SUCCESS/Booking PAID NOT RUN |
| Report links/IDs/tables, Git preservation | PASS after final correction: 126 local targets and 175 distinct requirement/goal IDs resolve; all 44 live source IDs/33 routes/71 matrix rows/six P0 prompts accounted for; all 659 entry tracked files unchanged, index unchanged, sole new untracked file is this report |

Final read-only live snapshot check at **2026-10-10 04:56:19 UTC / 11:56:19 local**: project update timestamp, all canvas source identities and visible list identities unchanged; `list_screens` still returns 35. Download rendition size differs from some declared resource dimensions; widths in §5.2 are intentionally labeled metadata, not measured viewports.

Local evidence: [HTML content inventory](../../frontend/target/stitch-ui-coverage-audit-2026-10-10/html-content-evidence.json), [frontend source inventory](../../frontend/target/stitch-ui-coverage-audit-2026-10-10/frontend-evidence.json), [UI contact sheet 1](../../frontend/target/stitch-ui-coverage-audit-2026-10-10/ui-contact-0.png), [2](../../frontend/target/stitch-ui-coverage-audit-2026-10-10/ui-contact-1.png), [3](../../frontend/target/stitch-ui-coverage-audit-2026-10-10/ui-contact-2.png), [4](../../frontend/target/stitch-ui-coverage-audit-2026-10-10/ui-contact-3.png), [5](../../frontend/target/stitch-ui-coverage-audit-2026-10-10/ui-contact-4.png), [asset contact sheet](../../frontend/target/stitch-ui-coverage-audit-2026-10-10/asset-contact.png). Ignored evidence is local and not part of a committed report bundle.

Additional evidence: [sanitized live inventory and final snapshot](../../frontend/target/stitch-ui-coverage-audit-2026-10-10/live-inventory-sanitized.json), [original-image dimensions/hashes](../../frontend/target/stitch-ui-coverage-audit-2026-10-10/original-image-evidence.json), [original-size download outcomes](../../frontend/target/stitch-ui-coverage-audit-2026-10-10/original-download.json), [final report validation](../../frontend/target/stitch-ui-coverage-audit-2026-10-10/report-validation.json). Original contact sheets `original-contact-0.png` through `original-contact-8.png` are in the same evidence directory.

## 9. Requirement Reconciliation

| Audit deliverable | Result |
|---|---|
| Live project inventory including hidden/non-screen resources | PASS |
| Full role UI inventory, 33 current routes, real/preview distinction | PASS |
| Matrix with actual requirements, Stitch IDs and file evidence | PASS |
| Missing/outdated categories and loading/empty/error/result/responsive scope | PASS |
| P0/P1/P2 role backlog with reuse, dependencies and acceptance | PASS |
| Six English P0 prompts requiring Vietnamese user-facing copy | PASS |
| Evidence, unresolved contract questions and execution order | PASS |
| Read-only source/design/configuration/database scope | PASS: final tracked-file/index check confirmed preservation |
| Product completion / all required UI implemented | PARTIAL: missing integration/designs enumerated; not the audit acceptance criterion |

## 10. Deviations / Conflicts

No approved exception or business requirement change. Live screen-list omissions were resolved using project canvas source identities. English copy makes current designs outdated even where frontend was already localized. Per-Ticket QR prototypes, old Project Scope wording, unsupported payment providers/benefits and reset timers conflict with current baseline; they are evidence of design debt, not authority to alter backend behavior.

Existing convention/content conflicts preserved: historical mixed naming in legacy Scope/DOCX filenames; historical plan tables describing now-real APIs as mock; residual English `Halls` back labels in `admin-configuration-screen.tsx`. These are existing files, not approved naming exceptions for new work. The latter labels should be included in a future authorized localization cleanup; no source was modified during this audit. Role-specific Customer Profile links and missing operator destinations are recorded as gaps rather than silently granting access.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md) and the report template.

| Area | Result | Notes |
|---|---|---|
| Folder/file naming | PASS | New report in `docs/reports`, dated kebab-case task name and `_report.md` suffix |
| Code naming/imports | NOT APPLICABLE | No code changed; existing routes/components cited exactly |
| Domain terminology | PASS | Booking QR versus Ticket; whole Seat Unit/guest count; Payment and Booking states distinct |
| API convention | PASS | Existing endpoints only; no proposed fabricated endpoint/field or new financial authority |
| Database convention | NOT APPLICABLE | No database/config/migration operation; V12 remains unchanged in source |
| Requirement traceability | PASS | Real BR/FR/UC/NFR identifiers and document sections; design priority is separate from requirement priority |
| Documentation convention | PASS | Template sections, evidence, scope preservation, conflicts and limitations included; links/IDs rechecked |

## 11. Known Limitations and Unresolved Questions

1. **Customer history contract:** no Customer Booking list/history endpoint in current controller/client. Which approved owned-list filters, pagination and ordering will be supported? Do not invent them in detailed design or implementation.
2. **Paid Ticket/QR access:** known Payment GET includes a paid projection, but independent Ticket retrieval, secure QR presentation, issuance availability and refresh contracts require audit. A PAID label alone cannot generate an admission QR locally.
3. **Staff admission contract:** no current Staff scanner/lookup/check-in HTTP controller. Confirm lookup keys, QR resolution schema, actual outcome serialization, server time-window policy and atomic mixed-selection behavior. System Analysis scenario names are not proof of current API enums.
4. **Manager scope:** scoped identity/assignment/operations APIs absent; current Admin APIs reject Manager. Confirm assigned-Cinema context, permitted transitions and limited account actions before implementing designs. Manager Check-in is conditional, not a default entitlement.
5. **Admin/organization authoring:** User/assignment/Promotion/Concession management schemas/actions need approved contracts; existing entities and requirements do not establish endpoint availability or account-change side effects.
6. **Reporting/audit:** metric formulas, timezone/filter definitions, permissible field visibility and role subsets need contracts. No export/download, support-message endpoint, manual financial settlement or unrestricted logs is inferred.
7. **Responsive/accessibility:** no authored MOBILE/TABLET resource found. Generated responsive CSS and historical frontend tests do not certify all operator/responsive layouts or WCAG. The live Markdown audit is incomplete.
8. **Seat events:** real reads currently poll at 30 seconds; event-consumer contract and integration needed for required Seat broadcasts/three-second synchronization evidence. Loading/stale/reconnect design must describe actual current behavior until that capability exists.
9. **Design versioning:** hidden flags/favorites are not approval/version history. Legacy families are inferred from actual incompatible content and current baseline, not deletion status. Preserve resources; canonical selection/revision is future work.
10. **Environment/proof:** no new deployed frontend/backend, database or live provider interoperability test. Real API integration classification is source-backed; fixture/historical evidence is kept separate from actual VNPAY/financial evidence.

## 12. Next Recommended Step

Review and authorize selected P0 design batches, beginning with authoritative Payment design alignment and Customer Booking/Ticket/QR contract audit. Resolve Staff/Manager operational contracts before treating their designs as implementable. **No design execution or implementation started. STOP after this report.**
