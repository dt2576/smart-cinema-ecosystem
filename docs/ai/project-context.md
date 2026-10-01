# Smart Cinema project context

Last reconciled: 2026-09-30, migration head V10. This is a repository-owned orientation summary, not a replacement for requirements, API contracts or canonical AI instructions. Use [current handoff](current-handoff.md) for the immediate task and update it as work progresses.

## How a new AI agent should start

1. Read root [AGENTS.md](../../AGENTS.md).
2. Read [.agent/workflows/DEVELOPMENT_WORKFLOW.md](../../.agent/workflows/DEVELOPMENT_WORKFLOW.md), then its required [project conventions](../development/project-conventions.md), applicable rules/workflows and application-local instructions before planning or editing.
3. Read [docs/ai/project-context.md](project-context.md).
4. Read [docs/ai/current-handoff.md](current-handoff.md).
5. Read only the contracts/reports relevant to the current task, plus their applicable requirement/design sections and actual source.
6. Treat repository documents as the source of truth over chat memory. Check implementation evidence; a design proposal is not an implemented feature.
7. Never reinterpret approved domain decisions without documenting a conflict first. Surface unresolved policy; do not invent requirement IDs or modify BRD/SRS to fit code.

Canonical operating instructions remain in `.agent/`; this file records project context and points to them. Check `git status` before working and preserve unrelated changes. A handoff's next task does not authorize unrelated work, publishing or commits.

## Sources and authority

| Source | What to use it for |
|---|---|
| [BRD v1.2](../brd/brd-v1.2.md) | Business scope, roles and requirements |
| [SRS v1.2](../srs/srs-v1.2.md) | Functional/data/integrity requirements and Customer flow |
| [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md) | Domain meaning, lifecycle and scope rationale |
| [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx) | Architecture and use-case design |
| [Database decisions](../db/database-design-decisions-v1.0.md) | Approved Seat Unit, PostgreSQL Hold, membership and first-payment freeze decisions |
| [Logical ERD](../db/erd/smart-cinema-logical-erd.md), [physical dictionary](../db/physical-data-dictionary-v1.0.md), [integrity design](../db/integrity-enforcement-design-v1.0.md) | Intended schema, composite integrity and protected transaction design |
| [API contracts](../api/) and dated [reports](../reports/) | Implemented boundaries, verified behavior, later decisions and explicit deferrals |
| [Customer screen map](../ui-ux/screen-spec/customer-screen-map-v1.0.md), [frontend plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md), [Stitch references](../../.stitch/SITE.md) | Canonical visual references and implementation mapping; SRS/contracts govern behavior |

Some older design headers still describe all domain persistence as proposed, and older reports name work that is now complete. Read current contracts, migrations and later reports for implementation status. Preserve older documents as history; do not silently rewrite them or treat a report as authority to change business scope.

## Stable product and architecture decisions

- Smart Cinema is **one cinema chain with multiple branches**, not an aggregator or multi-tenant marketplace. Hierarchy: **Smart Cinema → Cinema → Hall → Seat**.
- Customer identity/usage is chain-wide; Admin authority is chain-wide. Manager and Staff operate only within assigned Cinema scope. This is the required authorization model, not a claim that every administrative API is implemented.
- Movie is a global catalog. Showtime connects one Movie to one Hall and therefore its Cinema. Do not duplicate Movie per branch.
- Architecture is a **modular monolith**: domain-oriented modules in one Spring Boot backend and a Next.js frontend. Do not introduce microservices or unrelated entities to complete a slice.
- Frontend: Next.js App Router 16.3.5, React 19.2.8, TypeScript 5, Tailwind CSS 4, pnpm; ESLint, Node unit tests and Playwright. Verify exact versions/scripts in [package.json](../../frontend/package.json).
- Backend: Java 21, Spring Boot 4.1.1, Maven, Spring Security/JWT, JPA for existing mapped domains and JDBC/protected PostgreSQL routines for newer transactional domains. Flyway owns schema evolution; Hibernate validates existing mappings. See [pom.xml](../../backend/pom.xml).
- PostgreSQL is authoritative for transactional persistence and **Seat Hold correctness**. Recent integration verification used PostgreSQL 18.4. Redis is optional optimization only; no Redis value or browser timer can grant ownership.
- All API/domain IDs exposed to the frontend should be string-safe end-to-end, including values above JavaScript's safe integer range. New domain APIs use decimal strings. **Known exception:** legacy Auth login/renewal `userId` and stored session identity remain numeric; coordinated correction is still needed. Do not claim global ID safety is already complete.

## Seat, Booking and Ticket invariants

- One physical Seat record represents one sellable Seat Unit. STANDARD/VIP are one guest each; **COUPLE is one indivisible Seat Unit for two guests**, selected/released/purchased as one identity. No half-seat selection or automatic double price.
- One purchased Seat Unit produces one Ticket. One Booking can have multiple Tickets; a COUPLE Ticket covers two guests as one check-in unit.
- One paid Booking has **exactly one reusable Booking QR**. It loads Booking/Tickets context; scanning alone does not consume admission. No per-Ticket QR.
- Each Ticket has independent status and check-in. Mixed/partial check-in is supported across Tickets; a COUPLE unit cannot be split into separate successful check-ins. Canonical Booking QR requirements override legacy Stitch Individual QR Ticket designs.
- No double booking/sale of the same Showtime/Seat. `showtime_seats` is explicit per-Showtime eligibility, not a cached HELD/BOOKED lifecycle. Missing membership is not sellable.
- Holds use server-configured TTL (default ten minutes) and PostgreSQL `expires_at`. Expired Holds no longer block acquisition. Multi-unit acquisition is atomic, ownership is enforced, and downstream actions never renew deadlines implicitly.
- No new Hold/Booking after Showtime start or booking cutoff. Revalidate eligibility after transaction locks using database wall-clock time, not an earlier discovery response or client timestamp.
- No overlapping operational Showtimes in one Hall, including the stored configured buffer; follow the V4 exclusion and existing scheduling lifecycle rules.
- Hold/Booking writes share a Showtime gate and ordered resource locks, protected database routines and restricted runtime privileges. Preserve exact origin identities, aggregate expiry/cancellation and historical rows. Consult the integrity design before modifying guards or lock order.

## Concession, Promotion and Payment boundaries

- Concessions are Booking add-ons only: **POPCORN, DRINK, COMBO**. No inventory, warehouse, supplier, kitchen or POS scope.
- Server computes authoritative totals and persists price snapshots; frontend preview values never establish production pricing or discounts.
- Approved Promotion policy (2026-09-29): discount/minimum basis is Seat + Concession subtotal. PERCENTAGE rounds down to whole VND with optional cap; FIXED_AMOUNT is bounded by subtotal. One Promotion per Booking. ACTIVE/window/minimum/usage checks are authoritative. Frontend demo codes remain unrelated fixtures.
- Applying/removing or pre-Payment cancellation/expiry consumes no usage. Usage is consumed only after backend-verified Payment SUCCESS, counted through PAID Bookings under the Promotion lock. First initiation must revalidate eligibility and freeze accepted terms/discount; an invalid Promotion must be removed/replaced before initiation. Frozen snapshots must never be repriced.
- V8 reads preserve stored Promotion terms. Pre-Payment Concession edits revalidate current terms and recalculate atomically; invalid Promotion rolls back the edit until removed/replaced. See [Promotion contract](../api/promotion-composition-contract-v1.0.md).
- Real Payment verification is backend-authoritative. A client redirect or local success preview is not verified Payment.
- The **first actual Payment initiation** atomically establishes permanent composition/price freeze with the first persisted attempt. Opening Summary or Payment preview does not freeze anything. Retries do not reopen the basket.
- Only eligible backend-verified Payment SUCCESS may atomically set PAID/paid_at, set line sold_at, consume origin Holds, and issue Tickets plus one Booking QR, with the required aggregate integrity/audit. No real Ticket or Booking QR before verified Payment.
- Implemented V9 initiation boundary: a real internal INITIATED attempt and atomic permanent freeze without provider submission or external charge. Exact authoritative numeric(19,4) includes fractional and zero values; clients supply no amount. Historical unbound attempts remain null; V10 permits eligible one-time VNPAY/SANDBOX/VND binding.
- Approved and locally implemented 2026-09-30 integration: **VNPAY Payment Gateway Sandbox/Test only**, checkout currency VND. Provider submission requires positive whole-VND totals, exactly scaled by 100 with provider limits; no rounding or frozen-value mutation. Fractional/zero totals are rejected only at the provider boundary; free-order fulfillment and production money are outside MVP. See [VNPAY Sandbox contract](../api/vnpay-sandbox-payment-contract-v1.0.md); provider facts/confirmation gates remain separate from approved policy.
- Eligible existing V9 attempts may bind once to immutable VNPAY/merchant/environment/VND submission identity before redirect exposure. Internal reference, merchant TxnRef and provider TransactionNo remain distinct. Uncertain/PENDING attempts are recovered, not replaced; new attempts require verified definitive FAILED/CANCELLED and original Booking eligibility, with permanent freeze/deadlines preserved.
- ReturnURL never settles. Verified IPN may finalize immediately; verified Query is recovery authority. Financial SUCCESS remains durably recordable without PAID when entitlement is unavailable. Late/contradictory/special outcomes require audit/reconciliation; authorized Admin/operator uses supported sandbox merchant tooling, with no automatic refund or fabricated result.
- Frozen accepted Promotion terms survive later master changes/deactivation/window expiry without repricing. Current usage limit is still enforced under lock at successful sale; exhaustion yields unfulfillable financial success requiring reconciliation. Application/initiation reserves no usage. Before first initiation, changed terms still require review/reapply/remove.
- Customer ACTIVE status governs new protected actions. A legitimate existing Payment's verified SUCCESS is not rejected solely because the Customer later became BLOCKED; all Booking/origin Hold/Seat/cutoff/usage checks still apply. This explicitly supersedes the contrary historical preflight proposal.
- [Integrity addendum v1.1](../db/integrity-enforcement-design-v1.1.md) adopts actual runtime order: User where applicable, Cinema, Hall, Showtime, Movie, Seats, Showtime Seat pairs, Bookings, Holds, command-specific Concession resources, Promotion, then Payment/Ticket rows and audit. No provider network work under database locks. Notifications occur only after commit and cannot roll back valid finalization. PAY authorization/capture/reservation is not assumed.

- V10 uses a separate system database login/NOLOGIN role for trusted results; ordinary runtime cannot write financial outcomes. Signed evidence is digest-deduplicated and contradictions retained. Query claims commit before network work; uncertain outcomes never authorize retries. All external confirmation gates default false until real merchant Sandbox evidence exists. Operator resolution is audited and cannot manufacture a refund.

## Current implementation: frontend

Customer frontend new-feature development is **frozen after final QA**; only regression/integration changes should proceed unless scope changes. This is a UI/preview milestone, not production release approval or complete backend integration.

The full preview journey exists: Home/Auth/Profile → Movies → Movie Detail → Cinema → Showtime → Seats → Concessions → Booking Summary with Promotion → Payment Method → Processing → Result → My Bookings / Tickets / Booking QR.

- Auth/Profile, Movie and Genre use existing real APIs where implemented; Home uses the real Movie client.
- Downstream Cinema/Showtime/Seat/Concession/Booking/Payment/Ticket flows still use typed local adapters/fixtures. Backend Discovery, Hold and Booking APIs existing does **not** mean frontend adapters have been connected.
- Preserve original preview expiry, atomic COUPLE selection and truthful preview messaging. Local Payment success does not issue a real Booking/Ticket/QR. Mock paid history/QR fixtures are demonstrations, not ownership or verified-payment evidence.
- Do not reintroduce unsupported Movie rating/popularity/cast/pricing controls or Profile biometric/SMS/lounge/wallet features.
- [Final Customer QA](../reports/2026-09-28_customer-frontend-final-qa_report.md): TypeScript, lint, build, desktop/mobile/accessibility review PASS; 49 unit tests and 73 Playwright tests PASS. Auth numeric IDs, missing production checkout integrations and Cinema-first behavior remain explicit limitations.

## Current implementation: backend and migrations

Migration head: **V10**. Historical migrations must never be edited or checksum-repaired to accommodate changes; use reviewed forward migrations. No new migration is allocated by this handoff.

| Migration | Persistence |
|---|---|
| [V1](../../backend/src/main/resources/db/migration/V1__create_users_table.sql) | users |
| [V2](../../backend/src/main/resources/db/migration/V2__create_refresh_tokens_table.sql) | refresh_tokens |
| [V3](../../backend/src/main/resources/db/migration/V3__create_movie_catalog_tables.sql) | movies, genres, movie_genres |
| [V4](../../backend/src/main/resources/db/migration/V4__create_customer_discovery_tables.sql) | cinemas, halls, showtimes |
| [V5](../../backend/src/main/resources/db/migration/V5__create_seats_and_authoritative_holds.sql) | seats, showtime_seats, seat_holds |
| [V6](../../backend/src/main/resources/db/migration/V6__create_pending_bookings.sql) | bookings, booking_seats; aggregate-aware Hold attachment/expiry |
| [V7](../../backend/src/main/resources/db/migration/V7__create_concession_composition.sql) | concession_items, booking_concessions, promotions; pre-Payment add-ons |
| [V8](../../backend/src/main/resources/db/migration/V8__enable_promotion_composition.sql) | Promotion cap, Booking term snapshots and guarded apply/remove/recalculation |
| [V9](../../backend/src/main/resources/db/migration/V9__create_payment_initiation.sql) | Internal payment_transactions and atomic first-attempt composition freeze |
| [V10](../../backend/src/main/resources/db/migration/V10__integrate_sandbox_payment_finalization.sql) | Sandbox binding, protected results/evidence/reconciliation, atomic sale, Tickets/Booking QR/audit |

Implemented and verified slices: Auth/Profile, Movie, Genre, Customer Discovery, authoritative Seat/Hold, pre-Payment Booking, Concession catalog/composition, Promotion composition, Payment initiation/freeze and locally verified VNPAY Sandbox result/finalization adapters. Real provider interoperability remains unverified and disabled by default. Current contract entry points:

| Contract | Important boundary |
|---|---|
| [Movie v1.0](../api/movie-service-contract-v1.0.md) | DRAFT/PUBLISHED/UNPUBLISHED; only PUBLISHED public catalog/detail; approved publication/search/filter/sort rules |
| [Genre options v1.0](../api/genre-options-contract-v1.0.md) | Public filtering options; no Genre admin CRUD |
| [Discovery v1.0](../api/customer-discovery-contract-v1.0.md) | Movie → Cinema → Showtime read APIs; Hall projection; no inferred Seat counts/pricing/format; chain IANA zone defaults to Asia/Ho_Chi_Minh |
| [Seat/Hold v1.1](../api/seat-hold-contract-v1.1.md) with [v1.0 base](../api/seat-hold-contract-v1.0.md) | Public Seat map, authenticated acquisition/release, attached-Hold exclusion and Booking-aware expiry; v1.1 is a delta, read both |
| [Booking v1.0](../api/booking-contract-v1.0.md) | Owned create/detail/cancel, snapshots and strict pre-Payment stage |

### Current Booking stage — do not advance implicitly

- Booking is created **PENDING** from valid owned ACTIVE Holds for one eligible Showtime. Holds attach permanently and remain ACTIVE before Payment.
- Deadline is bounded by the earliest participating Hold and Showtime cutoff. Cancellation/expiry releases/expires the entire exact attached set, never another Customer's replacement Hold.
- Seat Unit price currently equals **Showtime base_price** for STANDARD, VIP and COUPLE. Snapshot it on Booking Seat and aggregate totals. No automatic type adjustment has been approved.
- No CONSUMED, non-null `booking_seats.sold_at`, PAID, Ticket or Booking QR before verified Payment success. `payment_started_at` is now set atomically with the first internal INITIATED Payment attempt, never alone.
- V10 evolves the V6 staging guards: the protected verified-result writer coordinates financial SUCCESS, PAID, sold lines, exact origin Hold consumption, Promotion paid usage, Tickets and one Booking QR atomically. Unfulfillable financial SUCCESS creates reconciliation without entitlement. PostgreSQL races/rollback are locally tested; real provider certification is deferred.
- Concession lines and a single Promotion may now be edited before Payment, with authoritative totals and snapshots. Owned Payment result includes issued Tickets/Booking QR. Booking history list, dedicated Ticket/check-in APIs, Staff scanner and frontend checkout integration remain unimplemented.

Historical V6 evidence: [Discovery report](../reports/2026-09-28_customer-discovery-backend_report.md), [Seat/Hold report](../reports/2026-09-28_seat-hold-backend_report.md), [Booking report](../reports/2026-09-28_booking-backend_report.md). The Booking report supersedes earlier next-step notes: **144 tests PASS, zero failures/errors/skips**, including PostgreSQL concurrency, fresh migration/V5 upgrade and package build. This count is recorded evidence, not a test rerun by the context-documentation task.

Current additive contracts: [Booking v1.2](../api/booking-contract-v1.2.md), [Booking v1.1](../api/booking-contract-v1.1.md), [Concession v1.0](../api/concession-composition-contract-v1.0.md), [Promotion v1.0](../api/promotion-composition-contract-v1.0.md). V7 adds Concession/Promotion persistence; [V8](../../backend/src/main/resources/db/migration/V8__enable_promotion_composition.sql) enables guarded Promotion application and snapshots. Latest evidence: [VNPAY implementation report](../reports/2026-09-30_vnpay-sandbox-payment-backend_report.md), 231 tests PASS. Current implementation deltas: [VNPAY v1.1](../api/vnpay-sandbox-payment-contract-v1.1.md) and [integrity v1.2](../db/integrity-enforcement-design-v1.2.md). Historical evidence: [Payment initiation report](../reports/2026-09-30_payment-initiation-backend_report.md). Current deltas: [Booking v1.3](../api/booking-contract-v1.3.md), [Promotion v1.1](../api/promotion-composition-contract-v1.1.md), [Payment initiation v1.0](../api/payment-initiation-contract-v1.0.md). The historical V6 evidence above is retained as dated evidence, not current test count.

## Maintaining this context

After each completed authorized slice, reconcile these files with actual source, migration head, current contracts and the new report. Keep stable decisions here; keep the immediate milestone/next task in the handoff. Update verification dates/counts only from real evidence and label deferred tests. Preserve historical reports and source versions. Record conflicts and approvals in the relevant task report before changing a decision; do not silently turn an unresolved policy into an implementation rule.
