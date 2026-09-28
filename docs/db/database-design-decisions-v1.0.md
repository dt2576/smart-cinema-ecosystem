# Smart Cinema Database Design Decisions v1.0

Date: 2026-09-25  
Status: Selected MVP design for the four decisions requested; not implemented  
Scope: Seat Units, Hold authority, Showtime Seat Availability and Payment freeze

## 1. Decision summary

| Topic | Selected minimal MVP design | Logical ERD effect |
|---|---|---|
| COUPLE Seat | One indivisible physical seating unit represented by one Seat; one Ticket for the whole unit | Reuse Seat, Booking Seat and Ticket; no separate Seat Unit/pairing entity |
| Seat Hold authority | PostgreSQL owns Hold records, ownership and deadlines; Redis is optional optimization | Persist Seat Hold with User, Showtime, Seat and optional Booking references |
| Showtime Seat Availability | One `showtime_seats` association per Showtime/Seat, with a sale-enabled flag; calculate occupancy from Holds and Bookings | Add one justified associative entity; do not persist a second HELD/BOOKED state machine |
| Booking Payment freeze | Permanently freeze that Booking's composition and prices at its first payment initiation; retry unchanged before expiry | Add `payment_started_at` to Booking; retain existing Payment Transaction relationship and amount/currency snapshots |

These are design selections made under the current request to resolve ambiguities, not quotations of previously approved business policy. They refine implementation choices within the referenced scope. They do not amend BRD/SRS, approve migrations or add application behavior in this task. The COUPLE admission and first-payment freeze consequences are explicit below so future implementation cannot conceal them.

## 2. Sources and requirement traceability

- [Database model analysis, 2026-09-23](../reports/2026-09-23_database-model-analysis_report.md), especially §§5.1–5.6 and 10.
- [BRD v1.2](../brd/brd-v1.2.md): §§3.1.5–3.1.12; BR-017–BR-024, BR-026–BR-031, BR-038–BR-044, BR-065–BR-067; BA-07.
- [SRS v1.2](../srs/srs-v1.2.md): §§3.5–3.6, 3.9–3.10, 4.2, 5.6–5.18, 8 and 11.
- [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md): §§15–24, 26–28, 33–36, 49–50. The `H9-10` Ticket example supports, but does not by itself mandate, a grouped COUPLE unit.
- [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx): §§5.3, 5.5–5.8, 5.10.4, 5.12–5.13. Redis is planned but its responsibility and concurrency details are deferred.
- [V1 users](../../backend/src/main/resources/db/migration/V1__create_users_table.sql) and [V2 refresh tokens](../../backend/src/main/resources/db/migration/V2__create_refresh_tokens_table.sql).

| Decision | SRS requirements | Design use cases and business rules |
|---|---|---|
| COUPLE | FR-SEAT-003, FR-TICKET-002, DR-001, DR-005, DR-009, DR-023–DR-024 | UC-SYS-008, UC-STF-004; BRULE-TICKET-001 and BRULE-TICKET-004 |
| Hold authority | FR-SEAT-005–FR-SEAT-012, FR-BOOKING-001/005; DR-006–DR-007, DR-014; NFR-CONC-001/002/005/006 | UC-CUS-010, UC-CUS-016, UC-SYS-001; BRULE-SEAT-003–BRULE-SEAT-007 |
| Availability | FR-SEAT-001/004/016/017, DR-001–DR-007 | UC-CUS-010; BRULE-SEAT-001/002/006/007 |
| Freeze | FR-BOOKING-006/007/014–FR-BOOKING-018, FR-PAYMENT-001/002/006–FR-PAYMENT-015, DR-008, DR-012, DR-015–DR-019; NFR-CONC-004 | UC-CUS-016, UC-CUS-018, UC-SYS-006; BRULE-BOOK-004/005/007 and BRULE-PAY-001–BRULE-PAY-006 |

UC and BRULE identifiers refer to System Analysis & Design v1.1. New headings are decision topics, not new requirement IDs.

## 3. COUPLE Seat and Seat Unit

### Requirement

STANDARD, VIP and COUPLE are supported Seat types. Each purchased Seat/Seat Unit produces one Ticket with one independent successful check-in. A Seat belongs to one Hall. The documents do not define a separate attendee identity or independent check-in for each occupant of a COUPLE unit.

### Viable options and tradeoffs

| Option | Benefits | Costs and limitations |
|---|---|---|
| One Seat record for one indivisible COUPLE fixture/unit | Reuses all existing Hold, price, Booking Seat and Ticket logic; one ownership key | Cannot sell or check in the two positions separately |
| Two physical Seat records with a pairing relation and mandatory joint purchase | Individually identifiable positions; can evolve toward separate admission | Requires pair-consistency validation, multi-row ownership and a decision on one versus two Tickets |
| Physical Seats plus separate sellable Seat Unit and membership entities | Can represent arbitrary bundles and convertible seating | Additional entities and historical membership rules exceed the minimal fixed-layout need |

### Selected MVP design

Treat one Seat as the stable physical seating unit offered for sale. STANDARD/VIP units accommodate one person; a COUPLE unit accommodates two people but is sold as one indivisible unit. Store `seat_type = COUPLE` on that Seat. The capacity interpretation is a selected design assumption, not an explicit numerical SRS rule.

For example, row `H`, unit number/label `9-10` identifies one Seat. Do not also create separately sellable H9 and H10 for the same fixture. `(hall_id, row, number)` remains unique; layout validation must additionally reject overlapping physical positions because textual uniqueness alone cannot detect a combined label overlapping two individual labels. Label parsing, coordinate types and validation details belong to physical/layout design.

The unit receives one Hold, one Booking Seat price snapshot, and one Ticket after successful payment. Its price is the configured price for the complete unit; it is not automatically twice the STANDARD price. A COUPLE Ticket can be checked in once for the unit. Separate arrivals within that unit cannot create a second successful check-in; partial check-in remains supported between different Tickets in the same Booking. If separate admission per occupant becomes required, this decision must be revised before implementation of that behavior.

Hall physical capacity counts people (one per STANDARD/VIP, two per COUPLE); sellable-unit count and Ticket count count units. These measures must not be conflated. Exact reporting formulas remain a reporting-design concern. Do not alter a Seat's type, Hall, identity or occupied positions once referenced by active/future sales or historical transactions; preserve old references and deactivate/reconfigure through a later controlled layout workflow.

### Effect on logical ERD

- Hall `1 → 0..N` Seat, each Seat in exactly one Hall.
- Booking `1 → 1..N` Booking Seat; each line refers to one Seat unit.
- Booking Seat `1 → 0..1` Ticket for the MVP issuance model; exactly one after paid issuance.
- Snapshot Seat type and unit price on Booking Seat. No `seat_units`, `seat_pairs`, attendee or group-admission entity.

### Deferred

Convertible/splittable couples, independent occupant Tickets, occupant identity, arbitrary bundles, detailed layout coordinates, historical capacity snapshots and Ticket reissuance policy. None is introduced to solve this MVP decision.

## 4. Seat Hold authoritative persistence

### Requirement

Only one valid owner may hold a Showtime/Seat at a time. Holds have a configurable default ten-minute TTL, cannot be reused after expiry, and must be validated by the backend. Valid payment must not race with release/reallocation to create two successful owners. Design §5.10.4 permits Redis as a candidate; BA §50 calls it an optimization, not an exclusive required authority.

### Viable options and tradeoffs

| Option | Benefits | Costs and limitations |
|---|---|---|
| PostgreSQL-authoritative Holds | Hold, Booking and finalization can share one transaction boundary; durable history and FKs | More database writes; application must implement deadline-aware release and cleanup |
| Redis-authoritative Holds with PostgreSQL sales | Fast temporary ownership and expiry | Requires a carefully designed handoff, recovery and conflict protocol across stores; a missing Redis key alone cannot prove no paid/pending owner |
| Both stores authoritative | Potentially fast access in either store | Conflicting truths and partial writes; no simple ownership rule; rejected for MVP |

### Selected MVP design

Persist `seat_holds` in PostgreSQL. A Hold has its existing logical ID, Showtime, Seat, authenticated User owner, creation time, expiry and lifecycle status. Use database-backed server time consistently; a Hold is usable only strictly before `expires_at`. Equality means expired. Check time after obtaining transaction serialization, so a request queued before expiry cannot succeed using an old request timestamp.

The `showtime_seats` row selected in §5 is the per-pair serialization target. All acquisition, release, booking attachment and payment finalization operations must coordinate through it. Multi-seat acquisition is all-or-nothing; lock units in a deterministic order. Transaction timeouts and bounded retries must produce a clear failure rather than partial ownership. This is a logical transaction contract; exact SQL, lock ordering across other resources, indexes and isolation settings remain for physical design.

When Booking is created, atomically validate all selected Holds, owner and Hall membership; attach them to that Booking using nullable `seat_holds.booking_id`. Each Hold can attach to at most one Booking and cannot create a second Booking, including after cancellation. Its User and Showtime must match the Booking. Keep this attached Hold as the temporary entitlement through payment; do not create a second reservation entity.

Select the conservative deadline policy: Booking `expires_at` is no later than the earliest attached Hold expiry and the Showtime booking cut-off. Payment initiation and retries do not extend it. This avoids changing ownership during a gateway interaction or granting unlimited renewals. Near-expiry users may need a new Hold/Booking; the API/UI must expose the actual deadline. This selection also respects the older scope statement prohibiting completion with expired Holds.

On verified eligible payment, finalize Booking, record payment, consume the attached Holds, establish the sold entitlement through Booking Seats, and issue Tickets/Booking QR idempotently within the business transaction design. Paid Booking Seats then remain unavailable independently of Hold TTL. On cancellation or expiry, release only that Booking's own temporary entitlement. Every release operation identifies the exact Hold/Booking, so a delayed cleanup cannot release another customer's replacement Hold.

Expiry correctness is not dependent on a worker running exactly on time. Reads and writes evaluate timestamps, and the next competing write can retire expired entitlement under serialization. A periodic worker updates lifecycle records and emits release events for UI convergence. Preserve history; do not use indiscriminate deletion. Redis may later cache projections or assist notifications after database commit. Redis outage, eviction or stale entries cannot grant a Hold, extend it or change a Booking. With PostgreSQL unavailable, acquisition/finalization fails rather than falling back to a Redis owner.

### Effect on logical ERD

- User, Showtime and Seat each `1 → 0..N` Seat Holds over time; each Hold has exactly one of each.
- Booking `1 → 0..N` attached Holds; Hold belongs to `0..1` Booking. A created Booking has one attached origin Hold per Booking Seat.
- Hold's `(showtime_id, seat_id)` must reference a valid Showtime Seat association as well as retain its conceptual Showtime/Seat links.
- No Redis entity and no link from business Holds to `refresh_tokens`.

At most one valid Hold and one successful sale per pair are cross-row invariants. Ordinary FKs or a unique historical `(showtime_id, seat_id)` Hold key cannot alone enforce these semantics. Expired Hold history must coexist with future Holds. The physical design must supply both database safeguards and the transaction protocol.

### Deferred

Redis caching mechanics, cleanup cadence and retention, reconnect/realtime delivery guarantees, SQL status vocabulary for Hold lifecycle, physical concurrency safeguards and measured performance tuning. Redis optimization remains planned, without becoming a second authority.

## 5. Showtime-specific Seat Availability

### Requirement

A physical Seat's condition differs from its availability for an individual Showtime. The backend returns AVAILABLE, HELD, BOOKED or UNAVAILABLE and rejects stale client choices. Physical maintenance must prevent sale even for an existing Showtime (BA EC-11). The analysis also identifies the need to represent a Seat excluded from one Showtime without disabling it for every Showtime.

### Viable options and tradeoffs

| Option | Benefits | Costs and limitations |
|---|---|---|
| Derive everything from Hall Seats, Holds and Bookings | Fewest stored rows | No explicit per-Showtime exclusion; ownership still needs a stable serialization target |
| Sparse per-Showtime exclusion records plus derived occupancy | Stores only exceptional exclusions | Missing-row concurrency and scope validation are less uniform; still needs a common ownership guard |
| One Showtime Seat row per pair; derive changing occupancy | Explicit eligibility, stable ownership guard and predictable membership | Rows grow with Showtimes × Seat Units; initialization and layout-change policy required |
| Persist full availability status plus owner pointers | Fast direct projection | Duplicates Hold/Booking state and requires synchronization across several authoritative-looking fields |

### Selected MVP design

Add `showtime_seats` as the associative representation of the already-required Seat Availability concept. This is the sole additional entity relative to the earlier 19-candidate inventory. It is directly related to the requested decision, not a new business feature.

Minimum logical fields: `id`, `showtime_id`, `seat_id`, `is_sellable`. Require unique `(showtime_id, seat_id)` and that Seat.Hall equals Showtime.Hall. The boolean records a Showtime-specific sale exclusion, not occupancy. No stored mutable AVAILABLE/HELD/BOOKED column and no duplicate price are needed. Auditing changes uses the existing Audit Record concept.

Initialize one row for every configured Seat Unit in the Hall before the Showtime opens for booking; unavailable physical units can still be represented. A missing pair is not implicitly available: reject it and repair configuration before opening sales. Once Holds or Bookings exist, do not delete/reparent pairs or mutate layout identity. New layout membership is a controlled configuration change, not a side effect of querying the map.

For a valid configured pair, resolve the projection in this order:

1. A sold Booking Seat in a PAID Booking means BOOKED. Later physical maintenance does not erase that sale or imply an automatic refund.
2. Otherwise physical condition, Cinema/Hall restrictions or `is_sellable = false` prevent new sale and project UNAVAILABLE. Existing temporary ownership is still tracked; blocking a held unit causes subsequent payment eligibility to fail, not ownership transfer.
3. Otherwise an unexpired, unreleased Hold (unattached or attached to a nonterminal PENDING Booking) means HELD.
4. Otherwise project AVAILABLE. Expired/cancelled history must not make it HELD or BOOKED.

Showtime status and booking cut-off remain a separate permission to transact; AVAILABLE does not bypass a closed or started Showtime. Commands revalidate all conditions under the same serialization used for ownership. A blocked held unit may be cancelled/released or expire normally; no extra customer can buy it while blocked. Re-enabling it does not reset any existing valid ownership. Administrative blocking, physical status changes and payment finalization must coordinate so neither can rely on stale eligibility. Paid-unit maintenance resolution remains an operational exception; it does not silently cancel paid Tickets.

### Effect on logical ERD

| Relationship / key | Effect |
|---|---|
| Showtime `1 → 0..N` Showtime Seat | At draft stage zero is possible; complete configured membership required before sales |
| Seat `1 → 0..N` Showtime Seat | One physical unit participates in multiple screenings |
| Showtime Seat unique pair | One row represents exactly one Showtime and one Seat |
| Showtime Seat `1 → 0..N` Seat Hold | Pair must exist; temporal Hold history retained |
| Showtime Seat `1 → 0..N` Booking Seat over history | Each line identifies exactly one pair; expired/cancelled Bookings may reference the same pair |

Use `(showtime_id, seat_id)` as the candidate reference key for Holds and Booking Seats while keeping the convention's `id` PK on `showtime_seats`. Booking Seat consequently includes `showtime_id` alongside `booking_id` and `seat_id`; that Showtime must equal Booking.Showtime. This deliberate redundant key component permits explicit pair validation; it must never be independently editable. The eventual physical design must enforce the pair and Booking membership together, not just three unrelated FKs. Only one successful sale may exist for the pair, although many unsuccessful historical lines can exist.

### Deferred

Materialized availability caches, partitioning, detailed exclusion reasons, automated maintenance scheduling, layout version entities and precise admin UI. The per-Showtime flag is selected persistence; it does not authorize an unrelated new management module.

## 6. Booking composition and price freeze during Payment

### Requirement

Booking prices are server-computed snapshots; catalog changes must not rewrite existing prices. Concessions may be edited before Payment. A valid payment must match reference, amount and currency, and paid composition is immutable. Duplicate/late events cannot create duplicate or invalid Tickets. The documents do not specify the exact in-flight freeze boundary.

### Viable options and tradeoffs

| Option | Benefits | Costs and limitations |
|---|---|---|
| Freeze at Booking creation | Simplest immutable transaction | Prevents required pre-payment concession updates on that Booking |
| Freeze at first payment initiation for the remaining Booking lifetime | One immutable payable basket across retries and delayed events; no basket versions | Editing after a failed attempt requires cancelling and starting a new Booking |
| Freeze only while an attempt is unresolved, then unlock | Convenient editing after definitive failure | Must prove old attempts cannot later settle against edits; usually needs versioned snapshots and stricter provider guarantees |
| Allow edits using versioned Booking/payment snapshots | Rich user experience and auditable revisions | Additional version/state design and stale-result handling are unnecessary for minimal MVP |

### Selected MVP design

Allow supported concession/promotion changes while Booking is PENDING, unexpired and has never initiated Payment. Booking creation already snapshots Seat pricing. Editing quantity changes quantity/line totals using that line's stored unit price; master updates alone never reprice existing lines. New/replaced concession lines require ACTIVE catalog validation and capture their then-current name/category/unit price. No new seat-edit workflow is implied; changes of purchased Seat Units use a new Booking.

At the first payment initiation, under Booking and seat-ownership serialization:

1. Validate owner, account, Booking state, deadline, attached Holds and sale eligibility. Validate applicable promotion policy and server totals. If validation would change the displayed amount, return the revised summary for customer confirmation before creating a gateway attempt; never silently charge a different total.
2. Finalize the existing snapshot totals without pulling new master prices for unchanged lines. Persist the Payment Transaction's immutable amount, currency and internal reference and set Booking `payment_started_at` atomically.
3. Commit before contacting the external gateway. The first persisted attempt establishes the freeze even if the process crashes before sending the request. No long database transaction waits for a gateway response.

`payment_started_at` is a nullable timestamp and monotonic freeze marker, not a new Booking status. Once set, no Seat/Concession composition, promotion, amount or currency edits are allowed on that Booking, including after FAILED/CANCELLED attempts. Paid/expired/cancelled Bookings never become editable again. Cancellation of a PENDING Booking remains allowed and releases entitlement; starting again obtains fresh Holds and a new Booking rather than copying ownership. There is no guarantee the previous seats remain available.

This interprets “before Payment” in FR-BOOKING-016 as before payment initiation. It intentionally selects an earlier freeze than the minimum paid-state protection in FR-BOOKING-018. The consequence is a product design choice explicitly authorized for selection by this task, not a claim that SRS already prescribes it. Supporting edits after a failed attempt would require revisiting this choice.

Only one unresolved gateway attempt is allowed for a Booking at a time. Duplicate initiation returns/resumes the existing attempt. A timeout or browser abandonment is unknown outcome, not a verified failure; reconcile that same reference before offering another attempt. A definitely failed/cancelled attempt permits a new attempt with exactly the same frozen amount/currency and only before the original deadline. A retry does not reset TTL or unfreeze the Booking. Currency is pinned by the first Payment Transaction and must match on all subsequent attempts; no additional currency entity is needed.

Gateway submission must be recoverable using the stored internal reference. Provider-specific idempotency/query mechanisms are an implementation dependency. If the selected sandbox cannot safely determine an uncertain outcome, keep the attempt unresolved until reconciliation or Booking expiry; do not blindly create another charge.

On a trusted payment result, verify authenticity, reference, provider, amount and currency against the stored attempt and frozen Booking. Serialize with cancellation, expiry, eligibility changes and seat reallocation. Finalize only if Booking remains eligible and within the selected deadline, attached Holds still belong to it, all Seat Units are saleable, and no other paid owner exists. One atomic business transition establishes PAID, paid seat ownership, Hold consumption and idempotent Ticket/QR issuance. Exact transaction implementation remains for detailed design.

If expiry/cancellation wins, or an otherwise authentic success arrives after the deadline, record the actual payment outcome and immutable audit evidence but do not revive Booking, reclaim reallocated Seats or auto-issue Tickets. Payment SUCCESS is evidence of the provider outcome; it does not override an ineligible Booking. Route the mismatch for reconciliation, consistent with FR-PAYMENT-014. No automatic refund or refund entity is introduced. Duplicate successes for an already-finalized Booking return its existing result; additional successful attempts are reconciliation exceptions, never extra Tickets or double-counted Booking revenue.

### Effect on logical ERD

- Booking gains nullable `payment_started_at`; its existing totals and line snapshots remain authoritative.
- Booking `1 → 0..N` Payment Transactions remains unchanged; each attempt carries immutable amount/currency/reference.
- No Payment Session, Basket Version, snapshot-header, refund or event entity is added.
- Required transaction constraints include at most one unresolved attempt per Booking, monotonic freeze, idempotent finalization and at most one successful sale per Showtime/Seat.
- Existing `users` and `refresh_tokens` remain unchanged. Hold/Booking ownership references User, never the refresh credential.

### Deferred

Provider adapter and reconciliation procedure, provider reference uniqueness scope, exact rounding/discount allocation, and promotion usage reservation rules. Promotion usage must be concurrency-safe before payment implementation; this decision freezes an accepted discount but does not define the outstanding promotion policy. Editing a frozen basket, automatic refund and versioned checkout remain outside minimal MVP.

## 7. Cross-decision verification scenarios

These are design walkthroughs and future acceptance targets, not executed application tests.

| Scenario | Required outcome under these selections |
|---|---|
| Two Customers hold the same COUPLE unit | One wins the whole unit; no half-unit ownership |
| Same Seat, different Showtimes | Independent `showtime_seats` rows and ownership |
| Two-seat Hold request with one unavailable unit | Entire acquisition fails; no partial new Holds |
| Worker is late, Hold deadline has passed | Timestamp validation rejects the old owner; new acquisition can retire old entitlement under serialization |
| Booking creation races Hold expiry | Strict current-time check chooses valid attachment or rejection; no expired Hold is reused |
| Old expiry job runs after a new Hold exists | It can retire only the old identified entitlement |
| Redis is empty or unavailable | PostgreSQL correctness unchanged; cache cannot authorize a sale |
| Seat disabled only for one Showtime | That pair is UNAVAILABLE; other Showtimes are unaffected unless physical status also blocks them |
| Payment wins just before an admin block | Sold history stays BOOKED; block does not erase or auto-refund the sale |
| Admin block wins before payment finalization | Payment cannot sell the blocked unit; trusted financial result becomes a reconciliation exception if already charged |
| Concession edit races first payment initiation | Serialized order: edit completes first and is included, or freeze completes first and edit is rejected |
| Gateway request times out | Keep the same unresolved attempt; no edit and no blind second attempt |
| Payment definitively fails | No Ticket; same frozen basket can retry before expiry or Customer can cancel and start anew |
| Late success after another Customer gets the unit | Preserve financial evidence, no revived Booking or Ticket, reconcile |
| Duplicate verified success | Same Booking/Tickets/QR, no repeated issuance |
| Two people arrive separately on a COUPLE Ticket | One unit-level successful check-in only; independent per-person admission is deferred |

## 8. Scope and remaining conflicts

The new `showtime_seats` association refines an existing requirement and raises the earlier candidate inventory from 19 to 20. The historical analysis is preserved, not rewritten. No separate Seat Unit entity is required. Its previously deferred Hold store and payment freeze boundary are now selected. Other findings—assignment history, promotion policy, account status vocabulary, Ticket replacement and provider identity—remain deferred unless explicitly constrained above.

Older scope text on per-ticket QR and optional concessions remains superseded by the referenced v1.2/v2.1 baseline. The SRS HOLDING versus HELD inconsistency is treated here as terminology drift: availability uses HELD, while precise stored Hold lifecycle enum values remain for physical design. These decisions do not edit any source requirement document or introduce additional Booking statuses.

Implementation readiness still requires concrete enforcement of cross-table membership, lock ordering, successful-sale uniqueness, active-Hold exclusivity and provider reconciliation. Logical choices are resolved; runtime safety is not claimed until implemented and tested.
