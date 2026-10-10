# Smart Cinema Stitch Frontend Implementation Assessment

## 1. Task Information

- Task: assess implementation of the existing frontend against live Google Stitch before changing application code.
- Date: 2026-10-10, Asia/Ho_Chi_Minh. Final live metadata recheck: approximately 22:53 local / 15:53 UTC.
- Module: shared frontend, Guest/Customer, Admin, Cinema Manager and Cinema Staff.
- Type: READ-ONLY AUDIT / documentation.
- Status: **COMPLETE as an assessment. Phase 1 has not started.**
- Repository entry: HEAD `a3f0ae420eab2bc9b16b2dd679b708fc46d50129`, clean working tree, empty staged diff, 660 tracked files.
- Stitch: `projects/1208499799798658711`, **Smart Cinema Ecosystem**, MCP connected, access `OWNER`.

**Recommendation:** extend the existing shared UI foundation, then restyle the real Customer Booking/Payment flow without changing its contracts. My Bookings and Staff have usable new visual references, but their complete real workflows are blocked by missing APIs. Preserve the existing real Admin pages until dedicated designs are approved. A newer screen is a visual reference, not approval for its sample business behavior.

## 2. Requested Work

The attached task's execution control authorizes only an assessment and this report. It explicitly defers application implementation until approval. Deliverables cover architecture, every current route, all 38 UI designs, route mapping/status, actual API availability, conflicts/gaps, shared components, six proposed phases, regression risks, likely Phase 1 files and phase acceptance criteria.

No application source, backend, database, MCP/environment configuration, Stitch design or historical document was changed. No staging, commit, deployment, generation or generation retry was performed. Ignored local evidence downloads/contact sheets support inspection; they are not application assets.

## 3. Documents Reviewed

- Instructions: [development workflow](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), then [project conventions](../development/project-conventions.md), [root AGENTS](../../AGENTS.md), [frontend AGENTS](../../frontend/AGENTS.md), [frontend workflow](../../.agent/workflows/FRONTEND_WORKFLOW.md), applicable coding/UI/documentation/traceability/convention rules under `.agent/rules/`, and [report template](templates/TASK_REPORT_TEMPLATE.md).
- Requirements: [BRD v1.2](../brd/brd-v1.2.md), [SRS v1.2](../srs/srs-v1.2.md), [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md), [System Analysis v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx), [Project Scope v1.0](<../project-scope/project-scope v1.0.md>).
- Design/baseline: [.stitch/DESIGN.md](../../.stitch/DESIGN.md), [cached SITE](../../.stitch/SITE.md), [cached metadata](../../.stitch/metadata.json), [screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md), [Customer plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md), [current handoff](../ai/current-handoff.md), [previous 25-screen audit](2026-10-10_live-stitch-ui-coverage-audit_report.md).
- Contracts: [Booking v1.0](../api/booking-contract-v1.0.md), [v1.1](../api/booking-contract-v1.1.md), [v1.2](../api/booking-contract-v1.2.md), [v1.3](../api/booking-contract-v1.3.md), [Payment initiation](../api/payment-initiation-contract-v1.0.md), [VNPAY v1.0](../api/vnpay-sandbox-payment-contract-v1.0.md), [v1.1](../api/vnpay-sandbox-payment-contract-v1.1.md), current Customer/Admin guides in `docs/development/`.
- Recent evidence: [Payment return/status/recovery](2026-10-10_customer-payment-return-status-recovery-frontend_report.md), [initiation](2026-10-07_customer-payment-initiation-frontend_report.md), [Promotion](2026-10-05_customer-promotion-composition-frontend_report.md), [Concession](2026-10-05_customer-concession-composition-frontend_report.md), [localization](2026-10-03_frontend-vietnamese-localization_report.md), [Booking creation](2026-10-02_customer-booking-creation-frontend_report.md), [Booking/Ticket previews](2026-09-28_booking-history-tickets-frontend_report.md), [Admin Movie](2026-10-01_admin-foundation-movie-management_report.md), [Cinema configuration](2026-10-01_v11-admin-cinema-configuration_report.md), [Showtime](2026-10-02_admin-showtime-management_report.md).

The original designs were inspected in the preceding audit. For this assessment, all 38 UI resources were read through live MCP and their HTML/PNG assets fetched again. All 25 original HTML hashes match the previous audit's exports; previous original-screen visual evidence remains applicable. All 13 new screenshots were additionally inspected in five contact sheets, with full HTML text, controls, state selectors and token definitions inspected separately. Frontend/backend source remains byte-identical to that preceding audit; current routes, shared architecture, navigation and relevant controllers/DTOs were rechecked.

Current BRD/SRS, additive contracts and code supersede historical preview descriptions. In particular, the old scope's per-Ticket QR and Booking v1.3's pre-VNPAY issuance boundary do not override the later Booking QR model or protected VNPAY finalization. Historical documents are preserved.

## 4. Requirements Traceability

The following are existing requirement/use-case IDs. Screen aliases and phase numbers below are report navigation labels, not new requirement IDs. Implementation order does not change Must/Should/Could priorities.

| Requirement | Description | Applicable | Assessment result |
|---|---|---|---|
| BR-001–BR-004; FR-AUTH-001–FR-AUTH-010; NFR-SEC-002/003/004 | Authentication, active role, ownership and Cinema scope | Yes | Real Auth/Admin checks; shared operator navigation needs refinement |
| BR-005–BR-016; FR-MOVIE-001–008, FR-CINEMA-001–010, FR-SHOWTIME-001–010 | Public discovery and scoped operational configuration | Yes | Customer reads/Admin configuration real; Manager implementation absent |
| BR-017–BR-032; FR-SEAT-001–017, FR-BOOKING-001–012; UC-CUS-020/021/022 | Holds, snapshots, lifecycle, history/detail/cancellation | Yes | Real Holds/owned Summary; history preview; cancellation API without Customer command UI |
| BR-033–BR-035, BR-065–BR-067; FR-BOOKING-013–018, FR-CONCESSION-001–006, FR-PROMO-001–006; NFR-UX-005 | Concessions/Promotion and server totals | Yes | Customer composition real; catalog authoring separate and absent |
| BR-036–BR-042; FR-PAYMENT-001–015; UC-CUS-018/019; NFR-SEC-008/010/011/012 | Verified Sandbox Payment, late evidence and safe recovery | Yes | Real initiation/return/status; visual adaptation must preserve authority |
| BR-043–BR-047; FR-TICKET-001–010; UC-CUS-023/024 | One Booking QR, multiple Ticket states and ownership | Yes | Backend issuance/projection exists; Customer retrieval/frontend integration incomplete |
| BR-048–BR-052; FR-CHECKIN-001–013; UC-STF-002–007; NFR-UX-003 | Staff resolution, eligible Ticket selection, atomic partial Check-in | Yes | New design references; no operational HTTP API/frontend |
| BR-053–BR-056; FR-ORG-001–005; UC-MGR-002–017; UC-ADM-007/008 | Scoped assignment and limited Staff management | Yes | Missing Manager/assignment APIs and designs; no HRM expansion |
| BR-057–BR-062; FR-REPORT-001–008, FR-AUDIT-001–006; UC-MGR-019–022; UC-ADM-014–019 | Dashboards, revenue correctness and audit | Phased | Admin hub is not a KPI dashboard; reporting APIs/designs absent |
| NFR-UX-001–005; NFR-SEC-009 | Clear seats, authoritative timers, safe errors/totals and QR privacy | Yes | Many source states exist; shared presentation/mobile design coverage needs work |

SRS FR-BOOKING-018 describes integrity after finalization/Payment success. The current additive Booking/Payment contract imposes the **earlier, permanent first-attempt `paymentStartedAt` freeze**. Preserve that actual contract; do not reinterpret a failed attempt as permission to edit.

## 5. Assessment and Proposed Implementation

### 5.1. Evidence rules and current architecture

**Verified** means observed in a document, source file or live resource. **Proposed** means a future implementation recommendation. **Unresolved** means the audit cannot establish the answer. REAL describes API integration in source, not deployment readiness, fresh runtime test results or actual provider interoperability. PREVIEW denotes fictional adapters even when visually polished; PARTIAL denotes a mixed implementation; PLACEHOLDER denotes a route without its required functionality; MISSING denotes no implementation.

| Area | Verified architecture | Implication for implementation |
|---|---|---|
| Toolchain | [package.json](../../frontend/package.json): Next.js 16.3.5, React 19.2.8, TypeScript 5, Tailwind 4, ESLint 9, pnpm 12.4.1 | Use installed Next documentation before writing code; do not copy older framework recipes |
| App Router | `frontend/src/app`, 33 page patterns, 10 layouts; strict TypeScript and `@/*` alias | Preserve route groups/dynamic IDs and existing navigation/resume semantics |
| Root shell | [layout](../../frontend/src/app/layout.tsx): `lang="vi"`, AuthProvider, next/font Plus Jakarta Sans/Space Grotesk | Already has foundation fonts; verify Vietnamese heading fallback during implementation |
| Public shell | [discovery layout](../../frontend/src/components/layout/customer-discovery-layout.tsx), shared fixed [header](../../frontend/src/components/layout/site-header.tsx), route-group layouts | Reuse shells; align header clearance, skip links, content width and mobile spacing |
| Admin shell | [admin-shell](../../frontend/src/features/admin/admin-shell.tsx) authenticates identity via backend on route/token changes | Keep fail-closed guard and separate operational navigation |
| API transport | [Next config](../../frontend/next.config.ts): `/api/v1/*` rewrite to configured backend origin; feature clients own headers, abort signals, validation and safe errors | No generic transport rewrite needed for a visual phase; do not expose backend secrets |
| Feature boundaries | `features/auth`, `movie`, `discovery`, `cinema`, `showtime`, `seat`, `booking`, `concession`, `promotion`, `payment`, `ticket`, `admin` | Keep API/types/service/hooks/view separation; presentation consumes validated models |
| Existing primitives | [Button](../../frontend/src/components/ui/button.tsx), [Icon](../../frontend/src/components/ui/icon.tsx), [PreviewDialog](../../frontend/src/components/ui/preview-dialog.tsx), native validation | Expand incrementally; preserve button type, disabled state, Escape/focus restoration and form validation |
| Display utilities | [labels](../../frontend/src/lib/display-labels.ts), [formatting](../../frontend/src/lib/display-format.ts), [safe errors](../../frontend/src/lib/presentation-errors.ts) | Keep Vietnamese labels separate from serialized statuses and exact domain values |
| Backend | [pom](../../backend/pom.xml): Spring Boot 4.1.1, Java 21, MVC, JPA, Security/JWT, PostgreSQL/Flyway | Existing REST backend is functional authority; no backend rebuild is justified |
| Schema | Migration directory ends at V12 | No schema change or V13 is needed for Phase 1/2 presentation |

There is no Staff/Manager operational feature folder or route. Current shared header exposes “Vé của tôi” as a preview entry and a Customer profile link for every authenticated role; only the account menu's Admin link is role-conditional. The profile API is Customer-only. **Proposed Phase 1 correction:** show Customer profile/Booking links for appropriate roles, preserve the Admin entry, and refrain from adding Staff/Manager destinations until they exist. Display filtering is convenience, never an authorization boundary. Staff/Manager must not be routed to Admin APIs merely because the controls look similar.

### 5.2. Live Stitch inventory and content readiness

Live project last updated `2026-10-10T15:42:01.600935Z`; the final recheck returned the same value. Metadata contains **58 canvas instances**: **57 source resources = 38 UI + 18 images + one Markdown resource**, plus one design-system instance. `list_screens` returns **41 visible resources = 23 UI + 18 images**; project canvas discovery supplies the 15 hidden UI resources and hidden Markdown. Therefore neither 41 nor 58 is the unique UI screen count.

All 38 UI `get_screen` reads succeeded. All **38 HTML + 38 original-size PNG downloads returned HTTP 200**. Device metadata: **34 DESKTOP / 4 MOBILE**, no TABLET variant. All 13 new canvas instances still have the label `Generating Screen...`; their screen DTOs have IDs/titles/HTML/screenshots but **no generation-job status/error field**. Available tools expose no job-status operation. Assets can be assessed and reused as references; actual job completion remains **UNCONFIRMED**.

#### Original 25 references

All remain visually reusable in parts but OUTDATED against Vietnamese/current contracts. Full original-screen state/asset evidence is also preserved in the [preceding audit](2026-10-10_live-stitch-ui-coverage-audit_report.md). Every row below was retrieved again; no original HTML export changed.

| Alias | Screen / actual Stitch ID | Recommended use and verified adaptation need |
|---|---|---|
| O01 | Homepage — `c667635786b940938d6071bb335830f9` | Home hero/cards; English/sample offers and venues must stay explicitly preview |
| O02 | Movie Listing — `fe57105a74494ca4807f61ae495f7c29` | Real catalog layout; exclude unsupported popularity/rating/release filters |
| O03 | Movie Detail — `16dbe62e3be744e6ab4123fc004283e3` | Real detail layout; cast/crew/rating/technical promises exceed DTO |
| O04 | Cinema Selection — `8de77c4d95c141f9947a4f7bf4cad7c9` | Real choice layout; no fabricated distance/location/branch benefits |
| O05 | Showtime Selection — `a808fb16fcad452696636be952ea70b1` | Date/Hall grouping; replace sample availability/urgency with server eligibility |
| O06 | Seat Selection — `fdea388b4b24406799ab087b31239835` | Correct whole COUPLE units; selected-summary blank regions need state review |
| O07 | Food & Drinks — `602baa042d22404d8b31d461351aa42d` | Catalog/basket; remove fixed eight-minute and seat-delivery/kitchen claims |
| O08 | Food & Drinks expired — `1017f7c1f77943579d9bb1bee37f7718` | Expired overlay; reconcile residual timer/hold assurances with real server state |
| O09 | Booking Summary — `52aa55f16d2640d68efb6c399d5fb990` | Earlier separated totals layout; no Reset Timer; N01 is preferred after adaptation |
| O10 | Payment Method — `0cc11f6226c74b6291ef49660e63f748` | Preview only; multi-provider/instant confirmation/QR payment claims obsolete |
| O11 | Payment Processing — `777b204432ad4fba84065c10697951e9` | Earlier preview; insufficient reconciliation/reload/uncertainty; prefer adapted N03 |
| O12 | Payment Result — `b023e6ffbd0c424d9244aaa8393c442c` | Obsolete success-only/per-Ticket QR; prefer adapted N04 |
| O13 | Booking QR & Passes — `b850455e65fc482a8ef3332cb672683d` | Correct one-QR/multiple-Ticket structure; remove Customer simulated Check-in |
| O14 | Sign In — `f5904cd07f924d25a0ca844636e93060` | Existing real form; localize; no unsupported Remember me/password recovery |
| O15 | Create Account — `82c296db655348e2a3f14776f936989e` | Existing real form; preserve actual validation/errors, not generated assumptions |
| O16 | My Profile — `85bfbbac541b4455be5bd383218436e6` | Existing real Customer view/edit; no biometric/member/SMS claims |
| O17 | Account Menu — `14dc6c1445a747b88c866508463e9879` | Menu appearance; no Staff/Manager variant or operational destinations |
| O18 | Older Cinema Seat — `019a53e2bbc242ca98a84fa1a10192a6` | Legacy CINEPLEX/USD/taxes; do not implement |
| O19 | Older Homepage — `85a6a5848b1c499594bc3e3faeecf9b8` | Alternate Home, some incomplete venue/offer content; prefer O01 |
| O20 | Older Booking Summary — `5e46faa89712407ca07bf131aaae1316` | Alternate expiry presentation, not a second required screen |
| O21 | Older expired Food — `91a9d638f6694887a3299111e6026a52` | Captured image shows default basket rather than expiry; prefer O08 |
| O22 | My Tickets — `ca1c28a605b64d4ebeb59d4c00c23d42` | Legacy per-Ticket QR/transfer/wallet/NFC; prefer N05/N08 |
| O23 | My Tickets & Passes — `b35a7c6b366d4c2a90d8e04b76c4b99b` | Legacy USD/per-Ticket QR/carousel; do not implement as a separate new journey |
| O24 | Ticket Detail — `422f032569974172b8217983f7738b41` | Legacy per-Ticket QR/offline/PDF/wallet; prefer N06/N09 |
| O25 | Individual QR Ticket — `8c85de5a42c34780915d8661021246ab` | Explicitly incompatible with one Booking QR; prefer N07/N10 |

#### New 13 references: actual content, not just titles

These are useful design exports, with functional/copy conflicts requiring adaptation. “Available” means DTO + screenshot + HTML accessible, not a completed job, approved business behavior or working application. Desktop exports are 2560px wide; mobile exports 780px wide and include prototype controls. Captured mobile compositions must not be mistaken for proof of live 390px overflow/keyboard accessibility.

| Alias | Screen / actual Stitch ID | Device; PNG dimensions | Content assessment and frontend destination |
|---|---|---|---|
| N01 | Summary — `66beffb2e06e49d3b103533d25f5c54d` | Desktop; 2560×3608 | Available. Strong Seat/Concession/Promotion/totals/freeze layout → owned Summary. Remove sample VAT 8%, online fee, PCI claim, fixed timer and unsupported personal/contact fields |
| N02 | Sandbox initiation — `5c2d7472096a4d9099ff2f62a1b6da68` | Desktop; 2560×3038 | Available. VNPAY Sandbox CTA/amount → existing initiation panel. Reopen must retain backend gates; “I paid” can only request GET. Remove security certifications, bank-count/card support claims and test-card instructions |
| N03 | Verification/reconciliation — `e58f593344cd4fdaac8bfe35a885f3d0` | Desktop; 2560×3802 | Available. Pending/recheck visual → real return/status panels. Remove Customer-visible IPN/QueryDR/signature/audit logs, 5–30s guarantee, fixed ten-minute hold and refund/equivalent-Ticket promise |
| N04 | Payment result/Ticket state — `ca8f557d4c2f4ea78fa40552b7b41ba3` | Desktop; 2560×2632 | Available. Success/failure/cancel/review/unknown prototypes → existing real status view. SUCCESS is not issuance; remove IPN Verified/bank authorization/SMS/email/invoice promises. Ticket section remains deferred |
| N05 | My Bookings — `4b9b19206fc14015a77322f58b113bd1` | Desktop; 2560×5730 | Available. List/filter/empty/loading/error/login structures → `/my-bookings` preview until history API. Remove refund/member/security/support claims; filters need approved list contract |
| N06 | Booking Detail — `c7f09eb14aa44fbfa2cfc44e86753013` | Desktop; 2560×3898 | Available. One QR + multiple Ticket/mixed-state layout → existing detail preview. No Customer Check-in. Remove card details, food pickup QR, fixed entry time, share/print/brightness promises |
| N07 | Booking QR Pass — `265e1328babf486b9245fb508624d9e6` | Desktop; 2560×3554 | Available. One Booking QR fullscreen presentation → detail QR view; no established separate real route. Remove NFC/kiosk/Apple Wallet/share/automatic brightness and fixed admission-window claims |
| N08 | My Bookings — `3f5732811dba482e95b07e5aa6251b21` | Mobile; 780×3354 | Available. Responsive counterpart to N05. Screenshot explicitly says cancelled/refunded to SmartPay wallet: unsupported. Translate English header/bottom navigation and preserve whole COUPLE units |
| N09 | Booking Detail — `28c2fd5f49c0437eb2e77f8b9814be84` | Mobile; 780×3732 | Available. One Booking QR and two Ticket cards → N06 responsive counterpart. English title, masked card/pickup/brightness and sample admission guidance need adaptation |
| N10 | Booking QR Pass — `d989b7d6ffb04be6a964be21e298a4fa` | Mobile; 780×2460 | Available. High-contrast single-QR presentation → N07 counterpart. Remove periodic QR regeneration/SHA security claims and gate sync; “couple” example cannot split a COUPLE Seat Unit into two Tickets |
| N11 | Staff scanner/verification — `05a2ad0f96cd4502ba97662d5f0a2e12` | Desktop; 2560×2318 | Available. Camera/manual lookup + Ticket selection + explicit confirmation; no API implementation. Remove offline local admission, device/certificate claims, sample KPI/shift/food pickup data |
| N12 | Staff desk — `713c9e3fae5f4ef7a907102243ebff5c` | Desktop; 2560×2916 | Available. Assigned-Cinema/no-assignment/locked/login/network structures; operational routes missing. Offline emergency Check-in, open-room command, four-digit/phone search, shift timeout, live KPIs and printing are uncontracted |
| N13 | Staff scanner — `851e390ea6f64946b1c3e9814de03d63` | Mobile; 780×2334 | Available. Responsive scan/Ticket selection/manual entry; no operational API. No h1 in export; improve landmarks. Ten-digit lookup restriction and food pickup claim are uncontracted; camera controls depend on actual device support |

All new designs contain prototype/sample state controls; never migrate those controls as production authority. Their sample dates/amounts, decorative QR patterns and “success” views are not real paid Bookings or admission credentials. The nine new desktop screens are not duplicates of the four mobile variants: they share journeys but different layouts. Original alternate/legacy families overlap as documented above; there is no reason to implement 38 separate routes. No dedicated Admin or Manager design appeared among the 38 inspected screens. Staff designs are now present, superseding the earlier audit's missing-design finding.

### 5.3. Every existing route: implementation status and Stitch mapping

Route count is **33: 24 REAL, 7 PREVIEW, 1 PARTIAL, 1 PLACEHOLDER**. `/admin` is a real authorized operations hub but a PLACEHOLDER for the required chain KPI dashboard. Aliases resolve to full IDs in §5.2. Requirements are SRS unless prefixed otherwise. Each entry links the actual route file; the feature implementations cited elsewhere provide behavior evidence.

| Route | Role | Entry file | Status / implemented scope | Stitch reference | Traceability / remaining work |
|---|---|---|---|---|---|
| `/` | Guest/Customer | [page](<../../frontend/src/app/(public)/page.tsx>) | PARTIAL: real Movie feed; sample venues/offers | O01; O19 legacy | FR-MOVIE-001; finish presentation without turning sample offers into valid Promotion |
| `/login` | Guest / all roles | [page](<../../frontend/src/app/(auth)/login/page.tsx>) | REAL: login/session/errors/resume | O14 | FR-AUTH-002/006; shared visual/accessibility alignment |
| `/register` | Guest | [page](<../../frontend/src/app/(auth)/register/page.tsx>) | REAL: Customer registration | O15 | FR-AUTH-001; no operator self-registration or recovery workflow |
| `/profile` | Customer | [page](<../../frontend/src/app/(customer)/profile/page.tsx>) | REAL: owned profile read/edit | O16/O17 | FR-AUTH-005/009; correct shared role navigation |
| `/movies` | Guest/Customer | [page](<../../frontend/src/app/(public)/movies/page.tsx>) | REAL: catalog/query/genre reads | O02 | FR-MOVIE-001/003/007; no uncontracted filters |
| `/movies/[movieId]` | Guest/Customer | [page](<../../frontend/src/app/(public)/movies/[movieId]/page.tsx>) | REAL: Movie detail | O03 | FR-MOVIE-002; omit unavailable metadata |
| `/movies/[movieId]/cinemas` | Guest/Customer | [page](<../../frontend/src/app/(public)/movies/[movieId]/cinemas/page.tsx>) | REAL: eligible Cinemas | O04 | FR-CINEMA-001/002; retain Movie-first discovery |
| `/movies/[movieId]/cinemas/[cinemaId]/showtimes` | Guest/Customer | [page](<../../frontend/src/app/(public)/movies/[movieId]/cinemas/[cinemaId]/showtimes/page.tsx>) | REAL: date/Hall/eligibility | O05 | FR-MOVIE-008, FR-SHOWTIME-006/007/008/010; authoritative availability |
| `/showtimes/[showtimeId]/seats` | Guest view / Customer writes | [page](<../../frontend/src/app/(public)/showtimes/[showtimeId]/seats/page.tsx>) | REAL: map, owned Holds, create Booking | O06; O18 legacy | FR-SEAT-001/004–012/016/017, FR-BOOKING-001–003; preserve unit/ownership/server clock; event gap below |
| `/bookings/[bookingId]/concessions` | Customer | [page](<../../frontend/src/app/(public)/bookings/[bookingId]/concessions/page.tsx>) | REAL: catalog/add/update/remove | O07/O08 | FR-BOOKING-013–018; preserve original expiry/freeze/Promotion revalidation |
| `/bookings/[bookingId]/summary` | Customer | [page](<../../frontend/src/app/(public)/bookings/[bookingId]/summary/page.tsx>) | REAL: owned Summary, Promotion, initiation/status | N01–N04; O09 historical | FR-BOOKING-004–010, FR-PROMO-003–006, FR-PAYMENT-001–015; Phase 2 restyle, no Ticket authority |
| `/payments/vnpay/return` | Customer / login resume | [page](<../../frontend/src/app/(public)/payments/vnpay/return/page.tsx>) | REAL: known-attempt owned status/recovery | N03/N04 | FR-PAYMENT-004/006/014; raw query discarded; unknown identity blocked |
| `/my-bookings` | Customer design / publicly accessible preview | [page](<../../frontend/src/app/(public)/my-bookings/page.tsx>) | PREVIEW: mock list/filters/empty/error | N05/N08; O22/O23 legacy | FR-BOOKING-009; history endpoint missing |
| `/my-bookings/[bookingId]` | Customer design / preview | [page](<../../frontend/src/app/(public)/my-bookings/[bookingId]/page.tsx>) | PREVIEW: mock detail/Tickets/one QR | N06/N09, N07/N10; O13 | FR-BOOKING-010, FR-TICKET-004–008; real owned retrieval/issuance audit required |
| `/bookings/preview/concessions` | Preview | [page](<../../frontend/src/app/(public)/bookings/preview/concessions/page.tsx>) | PREVIEW: sample basket/expiry | O07/O08 | Reference only for FR-BOOKING-013–017; not a second real flow |
| `/bookings/preview/summary` | Preview | [page](<../../frontend/src/app/(public)/bookings/preview/summary/page.tsx>) | PREVIEW: sample totals | O09/O20 | Reference only for NFR-UX-005; keep isolated |
| `/bookings/preview/payment` | Preview | [page](<../../frontend/src/app/(public)/bookings/preview/payment/page.tsx>) | PREVIEW: simulated method selection | O10 | Does not implement a production multi-provider capability |
| `/bookings/preview/payment/processing` | Preview | [page](<../../frontend/src/app/(public)/bookings/preview/payment/processing/page.tsx>) | PREVIEW: simulated processing | O11 | Existing real return route is separate |
| `/bookings/preview/payment/result` | Preview | [page](<../../frontend/src/app/(public)/bookings/preview/payment/result/page.tsx>) | PREVIEW: simulated result | O12 | Never a real financial success destination |
| `/admin` | Admin | [page](../../frontend/src/app/admin/page.tsx) | PLACEHOLDER for KPI; REAL operations hub | MISSING | FR-REPORT-002; no fabricated chain metrics |
| `/admin/movies` | Admin | [page](<../../frontend/src/app/admin/movies/page.tsx>) | REAL: list/publication | MISSING | FR-MOVIE-004–008; preserve while awaiting design |
| `/admin/movies/new` | Admin | [page](<../../frontend/src/app/admin/movies/new/page.tsx>) | REAL: create | MISSING | FR-MOVIE-004; backend validation preserved |
| `/admin/movies/[movieId]/edit` | Admin | [page](<../../frontend/src/app/admin/movies/[movieId]/edit/page.tsx>) | REAL: edit | MISSING | FR-MOVIE-005–008; no unrelated CRUD expansion |
| `/admin/cinemas` | Admin | [page](../../frontend/src/app/admin/cinemas/page.tsx) | REAL: list | MISSING | FR-CINEMA-003–010; guarded configuration |
| `/admin/cinemas/new` | Admin | [page](../../frontend/src/app/admin/cinemas/new/page.tsx) | REAL: create | MISSING | FR-CINEMA-003 |
| `/admin/cinemas/[cinemaId]/edit` | Admin | [page](<../../frontend/src/app/admin/cinemas/[cinemaId]/edit/page.tsx>) | REAL: edit | MISSING | FR-CINEMA-004/005 |
| `/admin/cinemas/[cinemaId]/halls` | Admin | [page](<../../frontend/src/app/admin/cinemas/[cinemaId]/halls/page.tsx>) | REAL: Hall list | MISSING | FR-CINEMA-006–008 |
| `/admin/cinemas/[cinemaId]/halls/new` | Admin | [page](<../../frontend/src/app/admin/cinemas/[cinemaId]/halls/new/page.tsx>) | REAL: Hall create | MISSING | FR-CINEMA-006 |
| `/admin/halls/[hallId]/edit` | Admin | [page](<../../frontend/src/app/admin/halls/[hallId]/edit/page.tsx>) | REAL: Hall edit | MISSING | FR-CINEMA-007/008 |
| `/admin/halls/[hallId]/seats` | Admin | [page](<../../frontend/src/app/admin/halls/[hallId]/seats/page.tsx>) | REAL: Seat initialization/detail/update | MISSING | FR-SEAT-001–003; preserve history/capacity guards |
| `/admin/showtimes` | Admin | [page](../../frontend/src/app/admin/showtimes/page.tsx) | REAL: schedule list | MISSING | FR-SHOWTIME-003–010 |
| `/admin/showtimes/new` | Admin | [page](../../frontend/src/app/admin/showtimes/new/page.tsx) | REAL: create | MISSING | FR-SHOWTIME-001/004/005/009/010; server collision policy |
| `/admin/showtimes/[showtimeId]/edit` | Admin | [page](<../../frontend/src/app/admin/showtimes/[showtimeId]/edit/page.tsx>) | REAL: guarded edit | MISSING | FR-SHOWTIME-002–005/009/010; no client policy rewrite |

The 10 layout files are root, auth, public, movies, showtimes, owned Booking, preview Booking, My Bookings, VNPAY return and Admin. There is no standalone real `/bookings/[bookingId]/payment`, real result page, QR pass route, Staff workspace or Manager workspace. N01–N04 can map to existing panels/routes; no routing expansion is required for Phase 2.

### 5.4. Verified API availability and boundaries

This is a **source/contract audit**, not requests to a running backend. Exact mapping evidence: [Auth security](../../backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java), controllers below and corresponding feature API clients. Path variables remain positive-bigint **strings** in frontend contracts; exact financial amounts remain decimal **strings**, not `Number` repricing. Display formatting must reuse current utilities.

| Capability | Actual HTTP contract | Access / implementation evidence |
|---|---|---|
| Register / login / renewal / logout | POST `/api/v1/users`; POST `/api/v1/auth/tokens`; POST `/api/v1/auth/token-renewals`; POST `/api/v1/auth/token-revocations` | [auth-api](../../frontend/src/features/auth/auth-api.ts), `auth/*Controller.java`; real session lifecycle |
| Customer profile | GET/PATCH `/api/v1/profile` | [ProfileController](../../backend/src/main/java/com/smartcinema/user/ProfileController.java); owned Customer scope |
| Movie/genre reads | GET `/api/v1/movies`; GET `/api/v1/movies/{id}`; GET `/api/v1/genres` | [movie-api](../../frontend/src/features/movie/movie-api.ts), Movie/Genre controllers; public |
| Cinema/Showtime discovery | GET `/api/v1/cinemas` and `/{cinemaId}`; GET `/api/v1/showtimes` and `/{showtimeId}` | [DiscoveryController](../../backend/src/main/java/com/smartcinema/discovery/DiscoveryController.java), [client](../../frontend/src/features/discovery/discovery-api.ts); existing query contracts only |
| Seat map / owned Holds | GET `/api/v1/showtimes/{showtimeId}/seats`; GET/POST `/api/v1/showtimes/{showtimeId}/seat-holds`; DELETE `/api/v1/showtimes/{showtimeId}/seat-holds/{holdId}` | [SeatController](../../backend/src/main/java/com/smartcinema/seat/SeatController.java), [client](../../frontend/src/features/seat/seat-hold-api.ts); public map, authenticated Customer Hold operations |
| Booking create / detail / cancel | POST `/api/v1/bookings`; GET/DELETE `/api/v1/bookings/{bookingId}` | [BookingController](../../backend/src/main/java/com/smartcinema/booking/BookingController.java); owned Customer, eligible PENDING cancellation; **no history/list GET** |
| Concession catalog/composition | GET `/api/v1/concession-items`; POST `/api/v1/bookings/{bookingId}/concessions`; PATCH/DELETE `/api/v1/bookings/{bookingId}/concessions/{lineId}` | [ConcessionController](../../backend/src/main/java/com/smartcinema/concession/ConcessionController.java); active public catalog + owned editable Booking |
| Promotion apply/remove | PUT/DELETE `/api/v1/bookings/{bookingId}/promotion` | [PromotionController](../../backend/src/main/java/com/smartcinema/promotion/PromotionController.java); no public Promotion list or Admin authoring contract |
| Initiate attempt | POST `/api/v1/bookings/{bookingId}/payment-transactions`, body `{}` | [PaymentController](../../backend/src/main/java/com/smartcinema/payment/PaymentController.java); explicit Customer action, server amount and permanent freeze |
| Known Payment status | GET `/api/v1/bookings/{bookingId}/payment-transactions/{paymentId}` | [VnpayController](../../backend/src/main/java/com/smartcinema/payment/VnpayController.java); authenticated owned read, no latest/list lookup |
| Sandbox submission | POST `/api/v1/bookings/{bookingId}/payment-transactions/{paymentId}/vnpay-submission`, body `{}` | Same controller; explicit action under backend readiness/reopen/deadline gates |
| Provider return / IPN | GET `/api/v1/payments/vnpay/return`; GET `/api/v1/payments/vnpay/ipn` | Backend provider protocol; **not Customer financial commands**. Return validates then redirects, never settles |
| Query/recovery | Backend `VnpayRecovery`/`VnpayQueryClient`/`acceptQuery`, gated scheduled recovery | **No Customer QueryDR/reconciliation endpoint**; owned GET does not itself issue QueryDR |
| Admin identity | GET `/api/v1/admin` | [AdminController](../../backend/src/main/java/com/smartcinema/admin/AdminController.java), current DB Admin permission check |
| Admin Movie | GET/POST `/api/v1/admin/movies`; GET/PUT `/{movieId}`; PUT `/{movieId}/publication` | [AdminMovieController](../../backend/src/main/java/com/smartcinema/admin/AdminMovieController.java), [admin-api](../../frontend/src/features/admin/admin-api.ts) |
| Admin Cinema | GET/POST `/api/v1/admin/cinemas`; GET/PUT `/{cinemaId}` | [AdminConfigurationController](../../backend/src/main/java/com/smartcinema/admin/AdminConfigurationController.java); ADMIN only |
| Admin Hall | GET/POST `/api/v1/admin/cinemas/{cinemaId}/halls`; GET/PUT `/api/v1/admin/halls/{hallId}` | Same controller; existing configuration/history restrictions |
| Admin Seat | GET/POST `/api/v1/admin/halls/{hallId}/seats`; GET/PUT `/api/v1/admin/seats/{seatId}` | Same controller; initialization is not unrestricted destructive reseating |
| Admin Showtime | GET/POST `/api/v1/admin/showtimes`; GET/PUT `/{showtimeId}` | [AdminShowtimeController](../../backend/src/main/java/com/smartcinema/admin/AdminShowtimeController.java); backend scheduling/lifecycle restrictions |

#### Payment state/identity: preserve, do not redesign the authority

- [BookingResponse](../../backend/src/main/java/com/smartcinema/booking/BookingResponse.java) supplies IDs/code/status, referenced Movie/Cinema/Hall labels, times including `serverTime`/original `expiresAt`, Seat Unit and guest counts, stored Seat/Concession/Promotion snapshots, exact totals and `paymentStartedAt`. It does **not** supply Tickets/QR, card details, VAT/fee breakdown, age certification, director, pickup fulfillment or arbitrary contact data.
- [VnpayPaymentResponse](../../backend/src/main/java/com/smartcinema/payment/VnpayPaymentResponse.java) supplies `paymentId`, `bookingId`, `status`, `amount`, `bookingStatus`, `reconciliationRequired`, `bookingQr`, `tickets`. [VnpayService.detail](../../backend/src/main/java/com/smartcinema/payment/VnpayService.java) returns QR/Ticket projection only for PAID Bookings. This existing capability must not be reported as “no backend issuance.” However, the current frontend [known-attempt reader](../../frontend/src/features/payment/payment-initiation-api.ts) intentionally discards QR/Ticket fields. Their types, ownership, lifecycle and retrieval/recovery contract need an independent Phase 3 audit.
- Payment states are exactly **INITIATED, PENDING, SUCCESS, FAILED, CANCELLED**; Booking states exactly **PENDING, PAID, EXPIRED, CANCELLED**. `reconciliationRequired` is a flag, not a new Payment status. Do not create `VERIFIED`, `UNKNOWN` or `EXPIRED` Payment enums. Uncertain/review are presentation states.
- Current presentation maps INITIATED → “Thanh toán đang chờ hoàn tất”, PENDING → “Thanh toán đang chờ xử lý”, an active read → “Đang xác minh thanh toán”, and `reconciliationRequired` → “Đang đối soát thanh toán”. Accepted coherent SUCCESS/PAID → “Thanh toán thành công”; FAILED → “Thanh toán không thành công”; CANCELLED → “Thanh toán đã hủy”. Booking expiry is displayed separately. Unavailable/malformed/identity-mismatched or conflicting reads → “Chưa thể xác định kết quả thanh toán”. Financial SUCCESS without Booking PAID must explicitly withhold Ticket/QR/admission claims.
- Fixed frontend route is **`/payments/vnpay/return`**. Backend return issues 303 to the configured HTTPS frontend destination, forwarding no IDs/raw callback query. [return screen](../../frontend/src/features/payment/payment-return-screen.tsx) selects a known attempt from untrusted per-tab identity hints, discards browser query parameters and uses authenticated owned reads. It does not validate signatures or establish financial success.
- [status service](../../frontend/src/features/payment/payment-status-service.ts) and owned panels validate identities, Booking/Payment coherence, exact frozen amount, first freeze marker and original expiry. Preserve mounted attempt locking, stale-read review and no downgrade of previously read SUCCESS. Current polling is bounded to six visible 30-second intervals, with allowed event/explicit rechecks and error suppression, not an endless loop.
- First initiation permanently freezes composition, even after a negative or expired attempt. Backend may reuse unresolved attempts or replace definitive-negative attempts under its policy; the frontend must not introduce a different retry policy. A frozen Booking with unknown attempt identity remains blocked: no list/latest endpoint exists and a blind POST is unsafe.
- `internalReference`, currency/provider, initiation time and expiry are supplied in initiation/submission receipts, but not all are in known-attempt GET. Show them only when backed by validated responses; never reconstruct bank references or signature badges from URL/state. Server `expiresAt` never resets on reload/payment return.
- Preserve the existing exact hosted HTTPS allowlist for `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`. All signing, IPN, QueryDR and protected finalization remain backend-only. No new merchant flags, secrets, frontend handler or finalization command is needed.

### 5.5. Missing/unsupported capabilities and role coverage

| Required experience / role | Frontend / Stitch evidence | Functional gap and implementation gate |
|---|---|---|
| Customer My Bookings history | PREVIEW; N05/N08 available | No owned collection/history GET, pagination/filter/search contract. Cannot build real history by guessing IDs or scraping per-tab hints |
| Customer owned detail | Real Summary GET; detail preview N06/N09 | Can reuse owned Booking data, but full Ticket/QR retrieval and navigation/recovery require audited issuance contract |
| Customer Ticket list/one QR/pass | PREVIEW; N06/N07/N09/N10 + O13 | Known Payment GET exposes PAID projection, but depends on known attempt identity. No independent owned Ticket/QR endpoint discovered; no full reload/history recovery without a supported path |
| Customer PENDING cancellation | Backend owned DELETE exists; no real command UI | Audit eligibility, original holds/freeze, lost response and server re-read before adding. No PAID refund implication |
| Staff scanner / resolve / select / confirm / result | MISSING frontend; N11/N13 available | No HTTP Booking QR resolve, scoped eligibility/Ticket retrieval or atomic Check-in command/recovery contract. Camera preview alone cannot deliver Check-in |
| Staff workspace / manual lookup | MISSING frontend; N12 available | No assigned-Cinema/context endpoint or approved lookup contract. No four-digit/phone/ten-digit lookup rule can be assumed |
| Staff recent history | MISSING; embedded N12 visual | UC-STF-008 is Could; no history API. No obligation to implement uncontracted KPI/live feed/shift scheduling |
| Manager Cinema/Hall/Seat/Showtime operations | MISSING frontend and dedicated Stitch | SRS role/scope requirements exist, but current Admin APIs are ADMIN-only. Manager scoped APIs and designs required; do not reuse Admin endpoints with weaker checks |
| Manager Staff assignment/Booking oversight/dashboard | MISSING frontend/design/API | FR-ORG, UC-MGR-015–022 and reporting dependencies; Manager Check-in only where explicitly permitted, not automatic role entitlement |
| Admin User/role/status/assignments | MISSING frontend/design/API | FR-AUTH-010/FR-ORG; actual current Admin identity is not user-management API |
| Admin Promotion/Concession authoring | MISSING frontend/design/API | FR-PROMO/FR-CONCESSION authoring separate from current Customer composition/catalog read |
| Admin Genre authoring, conditional | MISSING frontend/design/API; Movie Genre association is real | UC-ADM-005 / Scope §5.2; confirm retained authoring scope and contract before defining forms. Public Genre GET is not Genre CRUD |
| Admin KPI/reports/audit; Manager reports | Hub only / MISSING designs/APIs | FR-REPORT/FR-AUDIT; no client-calculated revenue from PENDING/FAILED or invented sample metrics |
| Seat event updates | Real polling/focus reads; no frontend event subscription | FR-SEAT-013–015 describe broadcast events. Current `use-seat-holds.ts` polls every 30 seconds plus focus/pageshow/visibility; that does not establish these events or a three-second realtime guarantee |
| Guest/auth discovery states | Real routes; original desktop designs | No authored mobile variant for Home/auth/discovery/Seat/Concession; existing responsive source needs measured comparison, not replacement |

Backend entities/migrations or an internal service do not establish a Customer/Staff HTTP contract. Missing APIs are blockers for complete real Phase 3/4/Manager scope, not authorization to add them in this frontend task. A separately approved API task may resolve them without unnecessarily rebuilding existing modules.

### 5.6. Design inconsistencies and state coverage

| Finding | Actual evidence | Required future adaptation |
|---|---|---|
| Design system largely already implemented | `.stitch/DESIGN.md`, live HTML, `globals.css` | Extend existing semantic tokens; do not restart theme or install a component framework just to reproduce cards |
| Narrative vs tonal colors differ | Narrative surfaces `#0B0F17/#111827/#1F2937`; generated surface `#0F131C`, CTA `#F59E0B`, text `#DFE2EE`, primary `#FFC174` | Preserve recorded provenance; current production tokens already follow generated tonal palette and approved warm CTA |
| Shape tokens differ from narrative | New HTML default/lg/xl = 4/8/12px; DESIGN narrative controls/cards = 8/16px | Proposed semantic controls 8px/cards 16px following DESIGN; compare actual card use before applying global changes; do not blindly impose generated token names |
| English and unsupported links remain in new assets | N01–N04 nav/footer, N08/N09 English titles/bottom nav; original 25 English | All Customer/operational copy Vietnamese. Only supported routes/actions; no invented standalone Showtime/Cinema/Promotion pages |
| Prototype states are not application states | All 13 new exports have simulator/test controls; screenshots show one selected scenario | Use selectors only as reference for tests/design coverage; real views derive from validated server state |
| Payment view reveals invented technical authority | N03 QueryDR/IPN/signature/audit stream; N04 IPN Verified | Customer-safe status and read-only recheck; no financial log/signature/merchant/raw callback data in UI or screenshots |
| Unsupported money/workflow claims | N01 VAT/fee; N03 refund guarantee; N08 SmartPay refund; N12 offline admission/open-room command | Remove from implementation; never alter backend to fit artwork |
| QR behavior conflicts with contract | O12/O22–O25 per-Ticket QR; N07 NFC/wallet; N10 periodic QR claim | One backend-issued Booking QR, separate current Ticket states; no Customer Check-in/QR regeneration/automatic gate operation |
| Ticket eligibility and COUPLE units need care | N10 labels two Tickets as “couple”; backend Seat Unit model | One Ticket per purchased Seat Unit, COUPLE two guests/one unit; never infer unit count from visual seat labels |
| Overstated performance/security/operations | N02 card networks/PCI; N11 camera performance/KPIs; N12 shift/KPI/window promises | Only actual supported behavior, device capability and server-issued scope/window; no fixed future proof claims |

**State work for the shared foundation:** existing screens already handle many loading/empty/error/authorization states, often with repeated markup. Standardize presentation without replacing request state machines: initial loading versus refreshing, empty versus unavailable, safe error with explicit retry, login resume, forbidden ownership/role, not found, rate-limit/timeout, interrupted navigation and reduced motion. Preserve current accessible names, form errors, keyboard navigation, focus return, skip links and 44px control minimums.

**Customer Booking/Payment:** loading owned data, invalid/mismatched IDs, unauthenticated/forbidden, expired/terminal, first freeze, lost initiation response, unknown attempt identity, pending, verification/reconciliation, coherent financial success, failed/cancelled, stale Payment/Booking projections and unavailable recheck. Phase 2 must include reload/direct entry/login resume/multiple tabs/browser back and delayed provider evidence. No Ticket/QR promise before independent fulfillment integration.

**Ticket/Staff future states:** no Bookings, mixed terminal Bookings, unissued/unavailable/invalid QR, mixed Ticket states and expiry; Staff denied camera, unavailable camera, malformed/unknown QR, unpaid/wrong Cinema/outside server window, already-used Ticket, partial Check-in, concurrent operation, duplicate scan, in-flight submit and unknown outcome. Network loss blocks admission; no local offline-success mode. Camera retry and financial/Check-in command retry are different operations.

Dedicated mobile designs exist only for My Bookings, detail, QR pass and scanner. Missing mobile Payment layouts, Staff desk layout and Admin/Manager designs should be commissioned/reviewed when their scopes are approved. Existing desktop responsive classes are useful but not acceptance evidence. Proposed QA widths: 390/768/1440, plus narrow-content/200% zoom and keyboard cases; these are test recommendations, not new requirements.

### 5.7. Proposed reusable component architecture and extracted tokens

Keep `components/ui` presentation-only, `components/layout` for page framing, and `features/*` for domain state/actions. Never let a generic status badge infer PAID, a QR card issue credentials or a shell authorize operations. No generated Tailwind CDN script, inline simulator, global prototype event handler or new third-party UI framework should be copied into React.

| Proposed reusable responsibility | Existing evidence / reuse | Boundary and acceptance |
|---|---|---|
| Theme/type/space/radius tokens | `globals.css`, fonts in root layout, N01 HTML token definitions | Extend semantic Tailwind 4 tokens. Body 13/15/18px (line 18/22/28); headings 18/22/28/36/48px with mobile 26/32; tabular prices 24/30 and timer 20/24. Choose readable role sizes; generated 10px labels are not a minimum accessibility target |
| Spacing/content shell | Discovery layout + header + Admin shell | HTML spacing: 4/8/16/24/40px, mobile margin16/gutter12, desktop margin40/gutter24. Preserve max-width and sticky/footer geometry; don't hardcode screenshot export width |
| Button | Current shared Button | Preserve native props, type override, disabled/focus, destructive versus primary semantics; loading state presentation must not create actions |
| Surface card | Repeated panel/border/card classes | Semantic elevation/padding/radius, optional heading/description; no arbitrary pricing logic |
| Form field | Auth/Profile/Admin forms + native validation | Label/help/error linkage and stable IDs; retain native inputs and actual validation rules |
| Status badge / feedback | Display labels + existing `movie-feedback` patterns | Presentation severity and localized text passed in by feature. No cross-feature business status mapping in a generic component |
| Skeleton | Existing feature loading views | Reflect expected geometry; use a readable loading announcement, reduced motion, no layout jumps or fake timers |
| Dialog | Existing PreviewDialog | Reuse current native dialog semantics where suitable; check unique IDs/focus/scroll lock. Do not rename/remove previews before dependency review |
| Future Booking/Ticket presenters | Existing history/detail/QR preview and owned Summary | Keep real and preview adapters explicit; exact money strings/server QR only in real models. Share layout only after contracts are audited |
| Future operator workspace | Existing Admin shell; N11–N13 visual refs | Presentation reuse is possible; Admin guard is not Staff/Manager scope verification. New domain shell requires real authorized context contract |

Current tokens already match most of the live generated palette: background `#0F131C`, canvas `#0A0E16`, panel `#1C2028`, low/high `#181C24/#262A33`, hover `#353942`, text `#DFE2EE`, muted `#D8C3AD`, accent `#FFC174`, action/hover `#F59E0B/#D97706`, on-action `#2A1700`, success `#4EDEA3`, outline `#534434`, error `#FFB4AB`. These are source facts, not a proposal to change brand. Existing fonts are correctly configured by family; a broad substring search for “inter” is not font evidence. Actual inspected `fontFamily` token definitions specify Plus Jakarta Sans and Space Grotesk.

### 5.8. Detailed phases, dependencies and acceptance criteria

All phases are **proposed**, require subsequent approval and should be separately reviewable. After each implemented phase: TypeScript, lint, relevant tests, production build, authorized API verification, desktop/mobile/keyboard comparison and a dated report with real results. Baseline suite cases must remain; no skipped tests/retry masking. No source change is authorized by this assessment.

| Phase | Scope and work sequence | Gate / dependencies | Acceptance criteria |
|---|---|---|---|
| **1 — Shared UI Foundation** | Confirm selected tokens; extend type/space/radius; add minimum card/field/badge/feedback/skeleton primitives; align header/discovery spacing; fix role-visible profile/Booking links; verify auth/Admin/real Booking layouts incrementally | Approval; read installed Next App Router/font docs as required by frontend AGENTS; capture runtime baseline first. No missing backend API needed for presentation | Existing Auth/role checks/logout/resume remain intact; no new route or network command; Vietnamese copy; focus/labels/keyboard/44px controls/reduced-motion/no header overlap; 390/768/1440 comparison; tsc/lint/unit/build and relevant/full agreed browser checks pass with exact counts |
| **2 — Customer Booking/Payment** | Restyle owned Summary with adapted N01; initiation N02; return/verification N03; status/result N04. Keep Summary and fixed return route. Preserve hooks/services/validators; no new result authority | Phase 1 foundation; audited Booking/Payment contracts already exist; remove unsupported technical/refund/Ticket claims; optional new mobile design review | Exact string amounts/IDs, immutable first freeze/original expiry, no automatic POST, strict provider URL safety; all server states/pending/reconciliation/mismatch/unknown recovery truthful; reload/login/back/multi-tab/network/stale/late cases pass; no premature Ticket/QR; no signature/query/IPN logic in browser |
| **3 — My Bookings/Booking QR** | Independently audit PAID/issuance/Ticket projection first; define missing collection/owned retrieval contracts via a separately approved backend task if necessary; implement N05/N08 list, N06/N09 detail/Tickets, N07/N10 single QR view; replace previews only when real equivalents work | **Blocked for complete real history/recovery:** no history GET; known-Payment QR projection must not be ignored or assumed sufficient for unknown identity. API/schema changes need separate authorization; no endpoint names invented here | Owned list/detail retrieval with approved pagination/filter semantics; no demo fallback; backend-issued one QR per Booking; one Ticket per Seat Unit and current Ticket states; PAID/issuance independently verified; Customer cannot Check-in; reload/direct entry/login/403/404/unissued/mixed/error/mobile/keyboard cases pass; no refund/wallet/NFC feature |
| **4 — Cinema Staff** | Approve assigned-Cinema context, resolve/lookup, eligibility/Ticket state, atomic Check-in and unknown-outcome recovery contracts; adapt N12 desk, N11 desktop and N13 mobile scanner; confirmation/result UI based on backend | **Blocked:** no Staff operational HTTP contracts. Permission/scope and server time-window must be verified. Camera library/device/HTTPS behavior needs a bounded technical evaluation, not blind dependency installation | Scan does not consume Tickets; only eligible selected Tickets submitted; wrong scope/unpaid/outside-window/duplicate rejected by backend; partial/concurrent Check-in correct; no fake/offline success; lost response blocks unsafe resubmit until approved recovery; loading/denied/no-assignment/camera/manual-entry/mobile/keyboard states pass |
| **5 — Admin and Cinema Manager** | Keep real Admin CRUD. Commission dedicated designs for existing Movie/Cinema/Hall/Seat/Showtime operations; then approved restyle. Treat Manager scoped operations, assignments, dashboards and missing Admin modules as separate gated slices | Admin presentation needs design approval, not API rewrites. **Manager/new modules blocked** by dedicated designs/contracts; ADMIN-only endpoints cannot be reused as Manager authority | Existing Admin identity/401/403/validation/collision/history guards and all existing tests preserved; no invented destructive action; Manager only server-authorized Cinemas when approved APIs exist; no mock KPI/assigned staff/Promotion authoring; missing designs documented, working pages retained |
| **6 — Final UI Integration** | Audit desktop/mobile consistency/accessibility; full regression and actual configured API smoke checks; compare selected screenshots; inspect all incoming links/resume/preview dependencies; remove obsolete preview adapters/routes only after approved replacements | Relevant preceding slices actually complete; source-based availability is not live provider proof; removal needs demonstrated replacement and dependency review | Full tsc/lint/unit/build/Playwright pass with exact counts and no omissions; broken links/overflow/focus/error states corrected; tests clearly label HTTP fixtures; real financial/provider/issuance evidence separately classified; no production-to-preview success path; dated differences/limits documented |

**Recommended execution order:** 1 → 2 → independently approved Phase 3 contract audit/integration → Phase 4 after its API gate → Phase 5 approved role slices → 6. Backend contract discovery for 3/4 and commissioning Admin/Manager designs can be planned after approval. If those gates remain blocked, do not fill them with production mock data; the existing real Admin presentation slice can proceed when its designs are approved without waiting for invented Staff APIs.

### 5.9. Exact likely Phase 1 files

This is a proposed bounded edit list, **not files modified by this task**. No package, API client, Payment state machine, backend, migration, environment or Stitch file is required to change for Phase 1. New primitive names follow conventions; implement only components actually reused.

| Exact path | Proposed action / reason |
|---|---|
| `frontend/src/app/globals.css` | Extend existing semantic type/space/radius tokens and focus/reduced-motion rules after comparison; retain palette |
| `frontend/src/components/ui/button.tsx` | Align shared sizing/presentation while preserving native behavior and existing callers |
| `frontend/src/components/layout/site-header.tsx` | Consistent desktop/mobile navigation, header spacing and role-visible links |
| `frontend/src/components/layout/customer-discovery-layout.tsx` | Consume shared spacing/content tokens; preserve skip links/header clearance/footer |
| `frontend/src/features/auth/customer-account-menu.tsx` | Appropriate Customer profile/Admin links; preserve keyboard/Escape/logout behavior |
| `frontend/src/components/ui/surface-card.tsx` | Proposed new minimal shared card primitive |
| `frontend/src/components/ui/form-field.tsx` | Proposed new accessible field wrapper; no new validators |
| `frontend/src/components/ui/status-badge.tsx` | Proposed new presentation-only localized status styling |
| `frontend/src/components/ui/status-feedback.tsx` | Proposed new loading/empty/safe-error presentation with caller-owned retry |
| `frontend/src/components/ui/skeleton.tsx` | Proposed new geometry/reduced-motion loading primitive |
| `frontend/src/app/layout.tsx` | Conditional: typography/fallback alignment only if actual Vietnamese glyph QA identifies a need; no AuthProvider rewrite |
| `frontend/src/app/(auth)/layout.tsx` | Conditional: shared auth spacing/width adoption |
| `frontend/src/features/auth/login-form.tsx` | Conditional: field/feedback adoption; preserve actual form/session errors and redirect |
| `frontend/src/features/auth/register-form.tsx` | Conditional: field/feedback adoption; retain registration contract |
| `frontend/src/features/auth/profile-screen.tsx` | Conditional: card/field/loading adoption for Customer profile |
| `frontend/src/features/admin/admin-shell.tsx` | Conditional: shared token/navigation presentation only; keep backend identity guard |
| `frontend/test/e2e/customer-final-qa.spec.ts` | Extend meaningful shared keyboard/mobile/navigation coverage where needed; preserve baseline assertions |
| `frontend/test/e2e/admin-movies.spec.ts`, `frontend/test/e2e/admin-configuration.spec.ts`, `frontend/test/e2e/admin-showtimes.spec.ts` | Conditional: focused shared-shell regression assertions; no weakening existing permission/configuration tests |
| `docs/reports/<implementation-date>_shared-ui-foundation_report.md` | Future implementation evidence, exact checks and Convention Compliance; filename placeholder, no file created now |

Phase 2 would separately touch owned Booking/Payment view files, not automatically broadening Phase 1. Existing `preview-dialog.tsx`, `icon.tsx`, formatting utilities and all feature service/API files should be reused first; edit only if a concrete reviewed issue warrants it. No mass component rename or route move is justified.

### 5.10. Risks and regression prevention

| Risk | Consequence | Prevention / meaningful evidence required |
|---|---|---|
| Replacing real views with generated HTML | Static sample data or simulator becomes production behavior | Adapt layout only; retain validated models/hook actions; inspect network calls and source imports |
| Shared primitives change form/button behavior | Login, composition or payment double-submit/incorrect validation | Preserve button type/disabled/submit semantics; keyboard and rapid-click regression across actual flows |
| Client menu treated as role authority | Customer sees operator operations or Manager bypasses scope | Role-filter display only; preserve backend identity/ownership checks; 401/403/role-change cases |
| Financial status conflated with fulfillment | Incorrect “paid/issued” or scannable QR | Coherent owned state only; SUCCESS/non-PAID/reconciliation cases; no QR until Phase 3 contract acceptance |
| Lost attempt replaced by new POST | Duplicate initiation/freeze changes | Known-ID owned GET only; frozen unknown identity blocked; reload/lost-response/multi-tab coverage |
| Timer/amount reskin recomputes business state | Extended holds, floating-point errors, changed totals | Server clocks/original expiry and decimal strings; big-ID/COUPLE/Promotion/snapshot cases |
| Prototype QR/private metadata used for admission | Privacy leak or fabricated credential | Server-issued payload only; decorative assets never production authority; no raw callback/token screenshots/logs |
| Network-unknown Staff outcome retried blindly | Duplicate/incorrect Check-in | Approve backend atomicity/recovery before UI; disable in-flight and require authoritative refresh after uncertainty |
| Preview cleanup breaks routes/resume | Broken bookmarks/navigation or hidden mock fallback | Map all links and tests, implement real replacements first, approve removal; retain clear preview boundaries meanwhile |
| Broad visual change misses existing states | Hidden focus/error/mobile regressions | Small phases, runtime screenshots/state fixtures, functional suites and production build per phase |

Future regression commands from `frontend/`: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm exec playwright test`. Use the existing browser/runtime configuration and baseline test setup; do not mask failures with retries/skips. Relevant browser coverage includes auth/resume via current customer suites, `customer-final-qa`, catalog/discovery/Seat, Booking/Concession/Promotion, `customer-payment-initiation`, `customer-payment-status`, all Admin suites and preview cases until replacements are accepted. Backend `mvn verify` is appropriate when approved work changes contracts or a complete cross-system regression is required; preserve its actual integration prerequisites rather than running an unconfigured suite and reporting partial execution as PASS.

## 6. Files Created

- **Repository deliverable:** `docs/reports/2026-10-10_stitch-frontend-implementation-assessment_report.md` only.
- **Ignored local inspection evidence:** `frontend/target/stitch-frontend-implementation-assessment-2026-10-10/`: entry hash baseline, asset retrieval helper, 38 HTML exports, 38 PNGs, sanitized content/hash manifest and five new-screen contact sheets. These are not tracked application changes or deployable designs. Raw downloaded HTML/URLs remain local and are not reproduced in the report.

## 7. Files Modified

None. Existing 660 tracked files, requirements, prior reports, current handoff, source, migration/configuration and cached `.stitch/` references are preserved. No moved/deleted file, staged change or new commit.

## 8. Verification

| Check | Result / evidence |
|---|---|
| Live Stitch connection/project | PASS: current project read and final metadata recheck, OWNER; no mutation tool invoked |
| UI inventory and exports | PASS: 38 live UI reads; 76/76 HTML/PNG downloads HTTP 200; original 25 HTML hashes unchanged |
| New design content inspection | PASS for audit inspection: full HTML/control/token extraction plus screenshots of all 13 new screens; not application visual QA |
| Frontend route enumeration | PASS: all 33 `page.tsx` patterns and 10 layouts reconciled with source and matrix |
| Endpoint/authority audit | PASS as source inspection; no API smoke request or live financial outcome claimed |
| Report validation | PASS: required sections, real requirement/screen IDs, local evidence links, filename/conventions and whitespace checked |
| Preservation | PASS: original tracked-file hashes/HEAD/staged diff unchanged; Git has only this new report as an untracked deliverable |
| `pnpm exec tsc --noEmit` / lint / unit / build / Playwright | **NOT RUN in this audit**: no application change; no fresh functional/visual PASS asserted |
| Backend `mvn verify` | **NOT RUN in this audit**: no backend change and no database/test environment actions authorized/needed |
| Database/Neon eligibility or catalog inspection | **NOT RUN**: this assessment did not access or change database content |
| Actual VNPAY return/signed callback/live SUCCESS/live PAID | **NOT RUN**: no merchant activation/provider transaction or environment changes |

Latest **historical**, not rerun, evidence is the [2026-10-10 Payment report](2026-10-10_customer-payment-return-status-recovery-frontend_report.md): **294 backend tests**, **138 frontend unit tests**, **219 Playwright cases**, TypeScript/lint/build PASS on the then-final source, with no retries/skips. Older 118/182 baselines were expanded by that milestone. Application source is unchanged here, but these results are not relabeled as execution performed during this audit.

Provider classifications remain separate: A = fixture-backed frontend tests, B = backend integration tests (historically PASS); C = actual Sandbox return, D = actual signed provider callback, E = live Payment SUCCESS, F = live Booking PAID (**historically NOT RUN; also NOT RUN now**). Available Stitch screenshots or local signed test fixtures establish none of C–F.

## 9. Requirement Reconciliation

| Item | Result | Reason |
|---|---|---|
| Requested assessment/deliverable | PASS | Architecture, every route, all 38 designs, contracts, conflicts, phases/files/acceptance/regression evidence covered |
| Read-only execution control | PASS | New report only; source/backend/database/Stitch unchanged; no Phase 1 or commit |
| Vietnamese / visual direction / domain rules in plan | PASS | Current DESIGN palette/fonts and server authority retained; unsupported design copy explicitly excluded |
| Existing working functionality | PASS for preservation | Entry source preserved; no new runtime certification claimed |
| Complete real Customer history/Tickets/Staff/Manager coverage | PARTIAL product coverage | Exact missing contracts/designs recorded; not implemented or simulated by this audit |
| Live external interoperability | NOT APPLICABLE to execution / NOT RUN evidence | No provider transaction authorized by this assessment |

## 10. Deviations / Conflicts

The task title requests implementation, while its explicit first-deliverable/execution-control sections require an audit only. This report follows that narrower current authorization. No implementation exception was inferred.

Existing conflicts: English/outdated original references; uncontracted refund/financial/security/QR/Staff operations in newer artwork; legacy per-Ticket QR in scope/designs; historical screen-map descriptions preceding real Payment; generated radii versus DESIGN narrative; shared Customer links for non-Customer accounts. These are findings and future adaptation decisions, not changes to BRD/SRS/backend. No convention exception requested or applied. Historical filenames containing spaces/underscores are retained and do not authorize such names for new files.

## Convention Compliance

Validated against [project conventions](../development/project-conventions.md).

| Area | Result | Notes |
|---|---|---|
| Folder naming | PASS | New deliverable in existing `docs/reports/`; generated evidence in existing ignored target directory |
| File naming | PASS | `2026-10-10_stitch-frontend-implementation-assessment_report.md` follows dated report convention; proposed component names kebab-case |
| Code naming / imports / routes | NOT APPLICABLE to edits | No application code changes; current route inventory verified, no fabricated operational routes |
| Domain terminology | PASS | Booking QR versus individual Ticket, Seat Unit/COUPLE, Payment SUCCESS versus Booking PAID preserved |
| API convention | PASS for assessment | Exact current methods/paths/serialized states documented; no new endpoint/field invented |
| Database convention | NOT APPLICABLE to edits | No data/schema change; V12 remains source migration head |
| Documentation convention | PASS | Template sections, traceability, evidence/limits/conflicts/acceptance included; historical docs unchanged; report links checked |
| Scope/preservation | PASS | Original files/HEAD/staged diff unchanged; no design/configuration/source edits or auto-commit |

## 11. Known Limitations and Unresolved Questions

1. **Generation completion:** all 13 new canvas labels still say Generating Screen; MCP provides no job state. Usable exports are verified, actual generation task completion is not.
2. **Visual fidelity:** new asset screenshots and HTML were inspected, but the existing application was not started or photographed during this audit. Pixel matching, viewport overflow, Vietnamese heading fallback and interactive accessibility need runtime Phase 1/2 verification.
3. **History/QR recovery:** is an approved owned collection/Ticket/QR contract planned, or should an independently audited known-attempt projection support only a narrower Ticket slice? No endpoint is proposed as already existing. Full history and unknown-attempt recovery remain blocked.
4. **Staff/Manager scope:** actual HTTP permission/context/Check-in/window/recovery contracts and Manager operation contracts must be supplied or separately implemented with approval. Designs cannot determine them.
5. **Design decisions:** confirm any departure from DESIGN's radius narrative after component comparison; commission missing Payment mobile and Admin/Manager/operator state designs as appropriate. No live generation/edit is performed here.
6. **Environment/provider readiness:** latest historical merchant/eligible-Booking limitations were not checked against live Neon/provider during this audit. No claim about a current available Showtime, merchant credentials or provider success is made.
7. **Evidence portability:** ignored asset snapshots/helpers/contact sheets are local, not part of the report commit. Full live IDs, metadata values, inspected conflicts and source/document links are recorded here; the earlier original-screen report remains the portable historical inventory.

## 12. Next Recommended Step

Approve a bounded **Phase 1 — Shared UI Foundation** using §5.9 as the candidate file list. Begin with runtime baseline capture and installed Next documentation, then extend existing tokens/primitives/navigation and preserve all real feature integrations. Follow with adapted Customer Booking/Payment presentation; separately audit missing history/issuance and Staff/Manager API contracts before their real integration.

**STOP: this assessment does not authorize Phase 1, application changes, backend work, new Stitch designs or commits.**
