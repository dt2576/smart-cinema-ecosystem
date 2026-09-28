# Smart Cinema Database Model Analysis

## 1. Task Information

Task: Analyze the current database model before creating the ERD  
Date: 2026-09-23  
Module: Cross-domain data model  
Type: Documentation and requirements review  
Status: Analysis complete; unresolved design decisions explicitly identified

This report proposes 19 entity candidates: 16 concepts explicitly listed in SRS Data Requirements, two Genre normalization candidates, and the existing technical Refresh Token entity. Only `users` and `refresh_tokens` are defined by the reviewed migrations. The inventory is not an assertion that 19 PostgreSQL tables are already implemented or approved. Seat Hold persistence and several physical design choices remain open.

## 2. Requested Work

Produce an entity inventory, purposes, proposed PK/FK relationships and cardinalities, associative entities, snapshots, important constraints, authentication-table reconciliation, and document conflicts. No migrations, requirements, application code, or ERD are created or modified.

Pre-implementation checks: read the canonical workflow and conventions, identify the source traceability below, review scope and conflicts, then plan a single new report in `docs/reports/`. Proposed table/column names use plural snake_case tables, `id` primary keys, and role-qualified foreign-key names. Code, routes, imports, APIs, branches, and commits are NOT APPLICABLE. Verification consists of source reconciliation, report structure/link checks, and migration preservation checks.

## 3. Documents Reviewed

| Source | Relevant locations |
|---|---|
| [BRD v1.2](../brd/brd-v1.2.md) | §§3–5: scope, business requirements and rules; Booking QR revision |
| [SRS v1.2](../srs/srs-v1.2.md) | §§3–5, especially §§5.1–5.18; §§7–8, 10–11, 13 |
| [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx) | §§5.2–5.3 use cases; §5.5 rules; §§5.6–5.8 model/relationships/states; §§5.10.4 and 5.13 persistence/deferred decisions |
| [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md) | Cinema, Hall, Seat, pricing, Hold ownership, Booking, payment, Ticket/QR, Check-in, assignments, invariants and MVP decisions |
| [Project Scope v1.0](<../project-scope/project-scope v1.0.md>) | §§5–8 and 12; historical scope conflicts noted below |
| [Flyway V1](../../backend/src/main/resources/db/migration/V1__create_users_table.sql) | Complete SQL definition |
| [Flyway V2](../../backend/src/main/resources/db/migration/V2__create_refresh_tokens_table.sql) | Complete SQL definition |
| [Authentication foundation report](2026-09-15_auth-database-foundation_report.md), [token renewal report](2026-09-15_token-renewal_report.md) | Historical rationale; not substitutes for current migrations/code |
| Current User, AccountStatus, RefreshToken, RefreshTokenService and TokenRenewalService classes | Mapping, status, hashing, rotation and timestamp reconciliation |
| [Project conventions](../development/project-conventions.md), [report template](templates/TASK_REPORT_TEMPLATE.md) | Naming, preservation, reporting and compliance |
| Repository operating instructions | `AGENTS.md`; Development, Review and Backend workflows; Document, Requirement Traceability, Project Conventions and Coding rules |

The Word document was read through paragraphs and tables, including the textual logical ERD. No Word layout changes or page-number claims are made. Mermaid Chart capability is available; no diagram operation is needed for this pre-ERD analysis.

## 4. Requirements Traceability

PASS below means the requirement is represented in the analysis, not that its implementation has passed tests.

| Requirement/source | Description and design trace | Applicable | Result |
|---|---|---|---|
| BRD v1.2 BR-001–BR-004; SRS §3.1 FR-AUTH-001–FR-AUTH-010, §5.1; NFR-SEC-001 and NFR-SEC-004 | User identity, scope, ownership and refresh lifecycle; design UC-CUS-001, UC-CUS-002, UC-CUS-025 | Yes | PASS |
| BRD BR-005–BR-016; SRS §§3.2–3.4, §§5.3–5.7 | Movie/Genre, Cinema/Hall/Seat, scheduling; design UC-ADM-005, UC-MGR-012; BRULE-SHOW-001–005 | Yes | PASS |
| BRD BR-017–BR-032; SRS §§3.5–3.6, DR-001–DR-007, DR-013–DR-015 | Holds, bookings, seat membership and snapshots; UC-CUS-010, UC-CUS-016, UC-SYS-001; BRULE-SEAT-001–007 and BRULE-BOOK-001–007 | Yes | PASS |
| BRD BR-033–BR-042; SRS §§3.8–3.9, DR-011–DR-012 | Promotions, payment attempts and verification; UC-CUS-015, UC-CUS-018, UC-SYS-006; BRULE-PAY-001–006 | Yes | PASS |
| BRD BR-043–BR-052; SRS §§3.10–3.11, DR-008–DR-010, DR-020–DR-024 | Tickets, Booking QR and individual check-in; UC-SYS-008, UC-SYS-009, UC-STF-004; BRULE-TICKET-001–009 | Yes | PASS |
| BRD BR-053–BR-056; SRS §3.12, §5.2 and §7 | Staff/Manager assignments and no HRM expansion | Yes | PASS |
| BRD BR-057–BR-064; SRS §§3.13–3.15, §5.16, DR-019 | Reporting, notifications and audit; UC-SYS-010 | Yes | PASS: no unsupported reporting/notification tables implied |
| BRD BR-065–BR-067; SRS §§3.6–3.7, §§5.9, 5.12, DR-016–DR-018 | Concession add-ons and immutable price snapshots; UC-CUS-012; BRULE-CON-001–006 | Yes | PASS |
| SRS §4.2 NFR-CONC-001–NFR-CONC-007; §11 invariants | Concurrent Holds, sales, payment and check-in require atomic enforcement | Yes | PASS: design obligations identified; implementation NOT RUN |

All UC and BRULE identifiers above belong to System Analysis & Design v1.1. SRS DR identifiers belong to §5.18. No new requirement identifiers are introduced.

## 5. Implementation Summary

### 5.1. Proposed entity inventory

All candidates use `id` as the proposed PK; only the first two have implemented `BIGINT` identity PKs. New key types remain a physical-design decision. Role-qualified columns such as `customer_id` and `checked_in_by_user_id` reference `users.id`; they do not imply separate Customer or Staff tables.

| Entity / proposed table | Purpose and important data | PK and proposed FKs | Basis / status |
|---|---|---|---|
| User / `users` | Chain-wide account, credential hash, profile, role, status, timestamps | PK `id`; no FK | SRS §5.1; implemented V1 |
| Refresh Token / `refresh_tokens` | Hashed refresh credential, expiry and revocation | PK `id`; `user_id → users.id` | FR-AUTH-004; implemented V2; technical entity |
| Cinema Assignment / `cinema_assignments` | Give Staff/Manager effective Cinema scope; retain status/history | PK `id`; `user_id → users.id`; `cinema_id → cinemas.id` | SRS §5.2; proposed |
| Movie / `movies` | Shared film catalog: title, description, duration, release date, age rating, language, poster, trailer, status | PK `id`; no required FK | SRS §5.3; proposed |
| Genre / `genres` | Reusable Genre vocabulary for Movie classification | PK `id`; no FK | BRD §3.1.2; FR-MOVIE-007; UC-ADM-005; normalization candidate |
| Movie Genre / `movie_genres` | Associate a Movie with multiple Genres | PK `id`; `movie_id → movies.id`; `genre_id → genres.id` | Normalization of SRS §5.3 Genres; proposed association, not an explicit SRS data entity |
| Cinema / `cinemas` | Physical branch, address, contact, operating information and status | PK `id`; no FK | SRS §5.4; proposed |
| Hall / `halls` | Screening room within a Cinema; name, capacity, type and status | PK `id`; `cinema_id → cinemas.id` | SRS §5.5; proposed |
| Seat / `seats` | Physical Seat or agreed sellable Seat Unit; row, number, type, physical status | PK `id`; `hall_id → halls.id` | SRS §5.6; proposed; COUPLE semantics unresolved |
| Showtime / `showtimes` | Movie screening in a Hall, start/end, base price, status and cut-off | PK `id`; `movie_id → movies.id`; `hall_id → halls.id` | SRS §5.7; Cinema derived through Hall |
| Seat Hold / `seat_holds` | Time-limited ownership of one Seat for one Showtime | PK `id`; `showtime_id → showtimes.id`; `seat_id → seats.id`; proposed `user_id → users.id` | SRS §5.8; logical entity; SQL versus Redis persistence undecided |
| Concession Item / `concession_items` | Catalog item/combo, category, price, image, status and timestamps | PK `id`; no required FK | SRS §5.9; no inventory fields |
| Booking / `bookings` | Customer transaction for one Showtime; code, QR token, state, totals and lifecycle timestamps | PK `id`; `customer_id → users.id`; `showtime_id → showtimes.id`; optional `promotion_id → promotions.id` | SRS §5.10; proposed |
| Booking Seat / `booking_seats` | Purchased seat line and seat-type/unit-price/final-price snapshots | PK `id`; `booking_id → bookings.id`; `seat_id → seats.id` | SRS §5.11; proposed association with its own identity for Ticket linkage |
| Booking Concession / `booking_concessions` | Purchased add-on line, item/category snapshots, quantity, unit price and total | PK `id`; `booking_id → bookings.id`; `concession_item_id → concession_items.id` | SRS §5.12; proposed association |
| Promotion / `promotions` | Code, discount type/value, validity, minimum order, usage limit and status | PK `id`; no required FK | SRS §5.13; proposed |
| Payment Transaction / `payment_transactions` | Individual payment attempt; provider/references, amount, currency, status, timestamps and safe metadata | PK `id`; `booking_id → bookings.id` | SRS §5.14; multiple attempts permitted |
| Ticket / `tickets` | One purchased Seat Unit; unique code, status, issue/check-in time and operator | PK `id`; proposed `booking_seat_id → booking_seats.id`; optional `checked_in_by_user_id → users.id` | SRS §5.15, DR-009; Booking and Seat derived from line |
| Audit Record / `audit_records` | Historical actor/action/resource/time and safe metadata, including payment and check-in events | PK `id`; proposed nullable `actor_user_id → users.id`; resource type/id logical reference | SRS §5.16; system-actor representation unresolved |

Ticket's `booking_seat_id` is a proposed normalization of SRS's Booking + Seat relationship. If a later design stores `booking_id` and/or `seat_id` directly on Ticket, those values must match its Booking Seat. A generic audit `resource_id` cannot be an ordinary FK to several tables; do not depict it as one.

### 5.2. Relationships and cardinalities

`1 → 0..N` means each child has exactly one parent but a parent can exist with no children. Required child FKs are non-null unless stated otherwise. The source documents' `1:N` diagrams generally omit minimum participation; the zero minima below are proposed lifecycle interpretations, not quoted requirements.

| Parent → child | Cardinality and membership |
|---|---|
| User → Refresh Token | `1 → 0..N`; every token has exactly one User; V2 confirms required FK |
| User → Cinema Assignment | `1 → 0..N`; assignment belongs to one User |
| Cinema → Cinema Assignment | `1 → 0..N`; assignment belongs to one Cinema; User–Cinema is M:N over time |
| Cinema → Hall | `1 → 0..N`; Hall belongs to exactly one Cinema, DR-002 |
| Hall → Seat | `1 → 0..N`; Seat belongs to exactly one Hall, DR-001 |
| Movie → Movie Genre; Genre → Movie Genre | Each `1 → 0..N`; Movie–Genre proposed M:N; minimum Genres per Movie unspecified |
| Movie → Showtime; Hall → Showtime | Each `1 → 0..N`; Showtime has exactly one Movie and Hall, DR-003 |
| Showtime → Seat Hold; Seat → Seat Hold | Each `1 → 0..N` over time; at most one valid Hold per pair, DR-007 |
| User → Seat Hold | Proposed `1 → 0..N` for authenticated Customer; session binding needs clarification |
| User → Booking | `1 → 0..N`; Booking has exactly one Customer, DR-004 |
| Showtime → Booking | `1 → 0..N`; Booking has exactly one Showtime, DR-004 |
| Promotion → Booking | `1 → 0..N`; Booking has `0..1` Promotion under singular SRS §5.10 field; no promotion stacking proposed |
| Booking → Booking Seat | `1 → 1..N` for a valid created Booking; no empty Booking permitted by UC-CUS-016 and SRS §13 |
| Seat → Booking Seat | `1 → 0..N` across Showtimes and unsuccessful booking history; not globally unique on Seat |
| Booking → Booking Concession | `1 → 0..N`; add-ons are optional despite abbreviated `1:N` source diagrams |
| Concession Item → Booking Concession | `1 → 0..N`; proposed retained, required catalog reference; snapshot survives catalog updates |
| Booking → Payment Transaction | `1 → 0..N`; no payment attempt needed at Booking creation; repeated attempts are separate records |
| Booking Seat → Ticket | Proposed `1 → 0..1` across the MVP lifecycle; becomes exactly one after successful issuance for paid Seat; DR-009 itself only says at most one valid Ticket |
| Booking → Ticket | Derived `1 → 0..N`; paid Booking after issuance has one Ticket per purchased Seat Unit |
| User → Ticket as check-in operator | `1 → 0..N`; Ticket has `0..1` operator before/after check-in; operator Role and Cinema scope require validation |
| User → Audit Record | Proposed `1 → 0..N`; record has `0..1` User actor to allow system events; system identity needs explicit representation |

Booking QR is an optional unique attribute before payment and exactly one required identity for each paid Booking after issuance (FR-TICKET-004). It is not a separate candidate table. Repeated scans read current Ticket states and do not consume the QR.

Cinema for Booking/Ticket derives through Booking → Showtime → Hall → Cinema. Movie discovery by Cinema derives through Showtimes; no Movie–Cinema bridge is necessary. A Hold-to-Booking FK is not specified in the sources: ownership and consumption must be validated, but no new association entity is assumed.

### 5.3. Associative entities

- `cinema_assignments`: User–Cinema, with assignment type, status and effective time/history.
- `movie_genres`: proposed Movie–Genre junction; unique Movie/Genre pair.
- `booking_seats`: Booking–Seat, with transaction-specific pricing data.
- `booking_concessions`: Booking–Concession Item, with quantity and immutable sale data.
- `seat_holds`: temporal Showtime–Seat association with ownership and expiry; repeated historical rows are legitimate.

Showtime also connects Movie and Hall, but represents a scheduled business event, not a simple junction. Payment Transaction and Ticket are transaction entities. Actor roles do not require role-specific user tables.

### 5.4. Snapshot data and historical integrity

| Location | Required snapshot / historical data | Rule |
|---|---|---|
| Booking Seat | Seat type, unit price, final price | SRS §5.11, DR-015; changing Showtime base price or Seat type must not reprice historical lines |
| Booking Concession | Item name, category, unit price, quantity and total | SRS §5.12, DR-016–DR-018; master price/name/status changes cannot rewrite historical purchases |
| Booking | Seat amount, concession amount, subtotal, discount, final amount | BR-031, FR-BOOKING-006/007/014/015/018; persist confirmed server calculations |
| Payment Transaction | Actual attempted amount/currency, references, provider result and timestamps | SRS §5.14; evidence for verification and reconciliation, not a live lookup of current prices |
| Ticket and Audit | Issuance/check-in state, timestamp, operator and immutable action evidence | SRS §§5.15–5.16; do not derive past operator scope from current assignment alone |

Snapshots are established during Booking creation and protected after finalization/payment. Sources allow pre-payment concession editing, so immutability cannot mean that every PENDING draft is permanently frozen. An in-flight payment must not verify against stale totals after an edit; the exact freeze/version policy needs a design decision.

Promotion code/rule snapshots and Movie/Cinema/Hall/Seat display-label snapshots are useful candidates for historical presentation, but are not explicit mandatory attributes in SRS §5. They are not silently added here. Retain master references and prevent history-breaking edits/deletes. The current Booking discount snapshot preserves the charged amount even if Promotion rules change.

### 5.5. Unique and integrity constraints

| Constraint | Authority and proposed enforcement boundary |
|---|---|
| Unique normalized User email | Implemented V1: `uq_users_email` and normalization check; no unique phone requirement |
| Unique refresh hash and existing User | Implemented V2 unique/FK; expiry strictly after creation |
| Unique Seat location `(hall_id, row, number)` | SRS §5.6; final column spellings to follow physical design |
| Unique `(movie_id, genre_id)` | Proposed normalization safeguard; do not duplicate a Genre association |
| Unique `(booking_id, seat_id)` | Proposed line integrity; prevents repeating a Seat within the same Booking |
| Unique Booking code | Recommended lookup identity, SRS §5.10 and manual Booking lookup; uniqueness is a design proposal rather than an explicit DR |
| Unique non-null Booking QR token | DR-020–DR-021; one token field limits one current identity per Booking; paid issuance must ensure it exists |
| Unique Ticket code | DR-010; independent of Booking QR |
| Unique Ticket `booking_seat_id` | Proposed MVP one-Ticket-per-line rule; stronger than DR-009's valid-only wording; reissuance/history needs clarification before adopting globally |
| Payment references | DR-011 requires unambiguous resolution; propose unique internal reference and provider-scoped external reference when assigned; provider uniqueness domain/event identity must be confirmed |
| Assignment duplicates/history | Propose at most one concurrent effective assignment per User/Cinema/type; do not globally unique the pair if separate history rows are retained |
| Promotion code | Proposed unique lookup code; normalization/case policy unspecified |
| Booking Concession line duplicates | Quantity can consolidate one item per Booking, but unique `(booking_id, concession_item_id)` is optional pending agreed line-merging policy |
| Hall/Showtime/Booking membership | Required FKs enforce DR-001–004; Booking Seat and Hold must use Seats from Showtime's Hall (DR-005 and UC-CUS-010); simple independent FKs alone do not enforce this cross-table equality |
| One successful sale per Showtime/Seat | DR-006 and NFR-CONC-002; needs atomic ownership/finalization guard. Unique `(booking_id, seat_id)` alone is insufficient. Unconditional uniqueness across all historical booking lines would wrongly block retry after expiry/cancellation |
| One valid Hold per Showtime/Seat | DR-007 and NFR-CONC-001; atomic acquisition and expiry-aware release; time passage alone does not update a persisted status. Do not claim an ordinary static unique key completely enforces TTL |
| Paid Booking and Ticket eligibility | DR-008–009; verified Payment precedes PAID and valid Ticket issuance; enforce atomically/idempotently so duplicate payment events cannot create more Tickets |
| Check-in at most once per Ticket | DR-023–024; NFR-CONC-003; atomic eligible-state transition, operator/time recording, Cinema/window checks, immutable audit; never unique or consume Booking QR on scan |
| Numeric and time checks | DR-012 final amount ≥ 0; DR-013 end > start; DR-014 Hold expiry > creation; DR-017 quantity > 0; DR-018 line total = quantity × unit price before discount allocation |
| Booking arithmetic | Subtotal = Seat Amount + Concession Amount; Final Amount = Subtotal − Discount. Line aggregation, rounding and discount allocation require server transaction validation; ordinary row checks cannot sum child rows |
| Showtime conflicts | BR-013/014, FR-SHOWTIME-004/005, BRULE-SHOW-002: no overlapping Hall occupancy, with configured buffer; start/end ordering alone is insufficient. Database exclusion or serialized scheduling strategy remains undecided |
| Historical retention | DR-019; avoid cascading deletion of transactional history; inactive catalog items and deactivated assignments preserve references and snapshots |
| Authorization | Customer ownership, current account status, assignment type/status/effective time and Cinema scope are application rules; FK existence alone does not prove permission |

Additional recommended row checks include positive Movie duration, sensible capacity, nonnegative catalog/base prices and discounts, valid promotion time range, and consistent check-in timestamp/operator/state. Their precise ranges, status vocabularies and monetary precision must be finalized from business policy; this report does not invent values.

No concrete locking strategy, partial index, exclusion constraint or extra concurrency table is approved by this analysis. The physical design must explain how the cross-row rules above survive concurrent requests, expiration and retries.

### 5.6. Reconciliation of existing authentication tables

**V1 `users`: preserve and reuse.** It already represents all four actors through `role`, with exactly one stored role per User. All nine columns match SRS §5.1: `id`, `email`, `password_hash`, `full_name`, `phone`, `role`, `status`, `created_at`, `updated_at`. Email is a valid choice for SRS's Email/Username alternative. Do not add a redundant Account, Customer, Staff, Manager or Admin table.

V1 uses `BIGINT GENERATED BY DEFAULT AS IDENTITY`, required values, unique normalized nonempty email, nonblank hash/name/phone/status, and a role check limited to `CUSTOMER`, `STAFF`, `MANAGER`, `ADMIN`. Status has no enumerated SQL check or default. Current Java `AccountStatus` contains `ACTIVE` and `BLOCKED`, and registration assigns `ACTIVE`: SQL can therefore accept a nonblank status that Java cannot map. This is an existing schema/application constraint gap, not authorization to rewrite V1. SQL checks do not prove password hashing or valid email/phone syntax. `updated_at` has only an insertion default in SQL; the current User mapping uses `@UpdateTimestamp`, so direct SQL writers must manage updates themselves.

**V2 `refresh_tokens`: preserve as an authentication support entity.** Its six fields are `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, `created_at`. The required FK to User establishes User `1 → 0..N` Refresh Tokens. There is no unique `user_id`, no one-token-per-user restriction, and no cascade-delete clause. Hash uniqueness prevents duplicate stored credentials; indexes cover User and expiry.

`VARCHAR(64)` is a maximum length, not an exact 64-character/hex validation. V2 checks nonblank hash and expiry after creation, but not revocation chronology. Current service creates SHA-256 hashes and renewal validates expiry/revocation/current ACTIVE status and rotates credentials transactionally. Those behaviors are application guarantees, not SQL constraints. Token-family, device and authentication-session tables are not required by these migrations or the requested scope.

Refresh Token is absent from SRS §5's business entity list but is directly justified by FR-AUTH-004 and existing implementation. It is not a Seat Hold session identity and must not be reused as a business ownership FK. Preserve both migration versions; any future approved changes require a separate forward migration task.

## 6. Files Created

- `docs/reports/2026-09-23_database-model-analysis_report.md` — this report and complete proposed inventory.

## 7. Files Modified

None. No migrations, source requirements, application files, or ERD files were modified. A pre-existing untracked `docs/db/erd/smart-cinema-erd.pdf` was observed on continuation and left untouched; it was not a supplied baseline for this review.

## 8. Verification

| Check | Result |
|---|---|
| Source review | PASS: reviewed SRS §5.1–5.18 against BRD, Business Analysis, design tables/rules/use cases and both SQL migrations |
| Inventory coverage | PASS: all 16 SRS data entities represented; Genre/junction explicitly proposed; existing Refresh Token reconciled |
| Migration preservation | PASS: V1 SHA-256 `BB19D0F956053FCD2C7A9CC04B27565BB752036D918058088F61A20235DB4DEA`; V2 `C3D7C8618D4C39A14BF74AAB1A572381723992AC9E0541FBD80207142899C87A`; unchanged from initial review |
| Report structure, links, naming and traceability | PASS: local Python check found no missing linked paths or unresolved explicit requirement IDs; numbered sections 1–12 and Convention Compliance present; report reread against conventions |
| Change scope and whitespace | PASS: `git status --short` shows this new report and the pre-existing untracked ERD PDF only; `git diff --check` passed; new report checked separately for trailing whitespace |
| TypeScript / ESLint / build / application tests | NOT RUN: documentation-only analysis; no executable behavior changed |
| Database/Flyway execution | NOT RUN: reviewed repository definitions; no database mutation or live-schema assertion |
| Word rendering | NOT RUN: source content review only; no Word artifact authored or layout claim made |

## 9. Requirement Reconciliation

- PASS: entity purposes, proposed keys, cardinalities, associations, snapshots and constraints documented with source traceability.
- PASS: current V1/V2 facts separated from proposed future entities and physical-design decisions.
- PASS: no out-of-scope feature entities, invented requirement IDs, migration edits or requirement changes.
- PASS: Booking QR belongs to Booking; individual Ticket check-in permits mixed states and repeated QR retrieval.
- PARTIAL: final physical ERD readiness depends on the unresolved decisions in §10. Analysis is complete; production enforcement is not claimed.
- NOT APPLICABLE: implementation acceptance tests, UI behavior and API contracts for new domains.

## 10. Deviations / Conflicts

Findings are ordered by impact on future modeling. No CRITICAL finding is asserted from this document-only review.

| Severity | Source/evidence | Impact and proposed disposition |
|---|---|---|
| HIGH | Project Scope v1.0 §§5.9, 12 describe per-ticket QR and rejecting repeat scans; BRD v1.2 BR-046, SRS FR-TICKET-004–006 and design §5.3.9 require Booking QR | Use the newer explicit baseline for this proposal. Keep older scope unchanged and flag it for an approved documentation revision |
| HIGH | Business Analysis §§15, 33–35 and SRS §5.15 use Seat/Seat Unit and COUPLE; no mapping defines two physical seats versus one sale unit | Decide COUPLE identity, location, capacity and Ticket count before fixing the Seat/Ticket ERD. Do not invent a `seat_units` or pairing table now |
| HIGH | SRS §5.8 defines Hold; design §5.10.4 makes Redis a candidate and §5.13 defers concurrency | A logical Hold does not prove a PostgreSQL Hold table. Decide authoritative store, booking consumption, TTL and recovery behavior before a physical ERD |
| HIGH | BA §§16, 21 require per-Showtime availability including UNAVAILABLE; SRS §5 has no dedicated availability entity | Derive availability where supported; decide how Showtime-specific unavailability is persisted. Do not silently introduce `showtime_seats` or equate physical Seat status with sale status |
| HIGH | SRS FR-BOOKING-016–018 allow edits before payment and lock after finalization; payment must match backend amount | Define price freeze and in-flight payment/edit handling so valid callbacks cannot finalize a changed basket |
| MEDIUM | SRS §1.5/§5.8 and BA §23 say Customer/session; design UC-CUS-010 requires authenticated Customer | Propose User ownership with optional session binding only after clarification; no anonymous Hold or new session table assumed |
| MEDIUM | SRS §5.2 specifies assignment role/status/effective time; V1 stores one global role | Confirm simultaneous roles, assignment interval/history structure and duplicate-active-assignment policy. Do not replace the existing single-role model silently |
| MEDIUM | SRS §5.13 and FR-PROMO-003 define usage limit but not its consumption/release point | Decide whether usage counts paid transactions or reservations, and handle concurrent redemption atomically. No redemption entity assumed |
| MEDIUM | DR-009 limits valid Tickets; design UC-SYS-008 says one Booking Seat = one Ticket | Proposed lifetime uniqueness fits current MVP, but confirm whether replacement of invalid Tickets is ever allowed before choosing a global unique line FK |
| MEDIUM | SRS §5.14 and DR-011 do not define provider reference/event uniqueness domain | Confirm provider/account scoping, nullable reference phase and replay identity; no webhook event entity assumed |
| MEDIUM | SRS §5.16 Actor and UC-SYS-010 include system events; BA §36 mentions Cinema on Ticket while SRS §5.15 omits it | Decide system audit identity and whether check-in Cinema is derived or an explicit historical snapshot; preserve event-time scope evidence |
| MEDIUM | V1 nonblank `status` versus current Java ACTIVE/BLOCKED enum | Record schema/application gap; any tightening requires a later migration after checking stored values |
| MEDIUM | BA/SRS leave seat-price adjustments, discount allocation, currency/rounding and Hall capacity semantics underspecified | Confirm policy and precision before physical fields/checks; do not create a pricing engine or new lookup tables from examples |
| LOW | SRS v1.2 §§1.1, 9.1, 9.2, 13 retain v1.1 references despite v1.2 header/conclusion | Editorial drift; use explicit v1.2 content, identify document/version in traceability, do not silently edit baseline |
| LOW | SRS §8.1 uses HOLDING whereas BRD/BA/design use HELD; SRS §8.5 says CHECKED_IN / USED; design §5.8.5 also uses OPEN shorthand | Resolve serialized vocabularies before constraints; do not treat synonyms as extra business states. Proposed terminology favors HELD, CHECKED_IN and OPEN_FOR_BOOKING, pending reconciliation |
| LOW | Scope v1.0 §7 treats Combo/Food as optional extension; BRD BR-065–067 and SRS v1.2 explicitly include add-ons | Include limited Concessions from the later baseline; inventory and full F&B remain excluded |
| LOW | SRS/design abbreviated 1:N relationships omit lifecycle minima | Specify optional add-ons/payment attempts/Tickets before issuance and required Booking Seat membership as in §5.2 |

Existing Convention Conflicts: the historical design DOCX uses underscores/capitalization and the historical scope filename contains spaces. Canonical conventions §5 preserve historical filenames; neither was renamed. Current auth tables follow database naming conventions. No new exception was needed or approved.

No separate Brand/Tenant/Chain table, HR/payroll/shift/attendance model, inventory/stock/supplier/kitchen/POS model, automatic refund model, advanced pricing/recommendation model, generic role/permission hierarchy, or notification/reporting warehouse is justified by this task. Genre, Concession Category, Seat Type and payment providers should not automatically each become new lookup tables: only Genre normalization is proposed because Genre management is explicitly supported. Reporting can query transactions; notifications are integration behavior unless a later persistence design establishes a need.

## Convention Compliance

Validated against [project conventions](../development/project-conventions.md), including this report itself.

| Area | Result | Notes |
|---|---|---|
| Folder naming | PASS | Existing `docs/reports/`; no folders created |
| File naming | PASS | `2026-09-23_database-model-analysis_report.md`; new dated report, history preserved |
| Code naming | NOT APPLICABLE | No code created or modified |
| Domain terminology | PASS | User, Cinema, Hall, Seat Hold, Booking, Concession, Ticket and Check-in retained |
| API/routes/imports | NOT APPLICABLE | No contract or application edits |
| Database convention | PASS | Proposed plural snake_case names, `id` keys and descriptive snake_case FKs; no actual schema changes |
| Status naming | PASS | UPPER_SNAKE_CASE labels; semantic conflicts explicitly unresolved |
| Documentation convention | PASS | Template sections, source links, traceability, limitations and existing conflicts included |
| Branch/commit/environment naming | NOT APPLICABLE | No branch, commit or environment change |

## 11. Known Limitations

The reviewed migrations are repository evidence, not a live database inspection. New relationships are proposals and do not imply approved SQL DDL, indexes, delete policies, key types or constraint implementation. Application code was inspected only to reconcile existing authentication persistence. No concurrency or integration test was run. The separately observed ERD PDF was not used to override the requested source baselines.

## 12. Next Recommended Step

Resolve the high-impact decisions first: Seat/Seat Unit semantics, Hold and availability persistence, and price freeze during payment. Then prepare a logical ERD from this inventory, showing open decisions explicitly, followed by a separately authorized physical design. Use Mermaid Chart when diagram creation is requested; keep migration work separate.
