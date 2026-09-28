# Smart Cinema Integrity Enforcement Design v1.0

Date: 2026-09-25  
Status: Proposed transaction and database enforcement design; no routines, triggers, migrations or application code implemented.

## 1. Purpose and traceability

This document specifies how the [physical dictionary](physical-data-dictionary-v1.0.md) preserves the [canonical logical ERD](erd/smart-cinema-logical-erd.md) and [approved decisions](database-design-decisions-v1.0.md). It separates declarative guarantees, protected database mutations, and trusted service responsibilities. PostgreSQL is the authority for Holds and sales; Redis remains optional and cannot grant ownership.

| Requirement source | Integrity obligation | Design location |
|---|---|---|
| BRD BR-013/BR-014; SRS DR-013 | No Hall overlap and valid screening schedule | Dictionary §5 exclusion; §7 below |
| BRD BR-020–BR-024; SRS DR-005–DR-007, DR-014; NFR-CONC-001/002 | Correct pair, exclusive unexpired ownership, no double sale | §§2–5 |
| BRD BR-026/BR-027/BR-030; FR-BOOKING-001/002/005 | Booking created from owned valid Holds and expires correctly | §§3–5 |
| BRD BR-031/BR-066/BR-067; DR-012, DR-015–DR-018 | Arithmetic, snapshots and freeze | §§3, 5–6 |
| BRD BR-038–BR-041; FR-PAYMENT-006/010/012/014 | Trusted verification, idempotency and late outcomes | §6 |
| BRD BR-043–BR-046, BR-050–BR-052; DR-008–DR-010, DR-020–DR-024 | Paid issuance, Booking QR, one successful check-in per Ticket | §§3, 6–7 |
| DR-019; NFR-SEC-003/008/010 | Retention, authorization, authenticity and safe audit | §§2, 7–8 |
| NFR-CONC-005–NFR-CONC-007 | Bounded contention and required concurrency testing | §§4, 9 |

IDs above refer to [BRD v1.2](../brd/brd-v1.2.md) and [SRS v1.2](../srs/srs-v1.2.md). No new requirement IDs are introduced. The design respects the existing V1/V2 Auth constraints and does not claim to implement the requirements today.

## 2. Enforcement layers and trust boundary

| Layer | Responsibilities | Cannot prove |
|---|---|---|
| Types, NOT NULL, CHECK, FK, UNIQUE, partial unique indexes, exclusion | Row domains, matching tuples, active-record uniqueness, successful-sale uniqueness, one Ticket/line, Hall scheduling | Authenticity of a gateway event, actor authorization, cross-row totals, current TTL |
| Protected mutation routines and row guards | Acquire ordered resource locks, validate transitions/time/eligibility, freeze child data, create finalization state and audit together | Whether an incoming signature or JWT is authentic without trusted external verification |
| Deferred database assertions | At commit, verify complete aggregate state including totals, origin Holds, sold markers and Ticket/QR coverage | Concurrency safety without the writer protocol |
| Trusted backend service/provider adapter | Authenticate actor, resolve scope, verify gateway signature/reference/result, validate configured policy/currency, invoke authorized mutation | May not bypass persisted ownership with browser/Redis state |

Select database-owned domain mutation routines as the only production write interface for the new transactional tables. The runtime role gets SELECT and narrowly scoped EXECUTE, but no direct INSERT/UPDATE/DELETE/TRUNCATE on those tables and no privilege to disable triggers. The table/routine owner is a separate non-login deployment role. Any SECURITY DEFINER routine uses a fixed safe search_path and schema-qualified objects; revoke public execution. Configuration writes also use guarded routines. Existing Auth ORM privileges/behavior are preserved; this proposal is not an Auth rewrite.

The trusted backend may supply verified provider evidence, but a public browser cannot call the privileged finalization interface directly. PostgreSQL cannot independently infer that a stored SUCCESS label represents a valid signature. Documentation and tests must preserve that trust boundary rather than describing a FK or trigger as gateway verification.

Read-only reporting identities receive no mutation privileges. Controlled import/repair must follow the same invariants and explicitly validate before commit. A superuser can bypass safeguards; operational access governance is outside what a row constraint can guarantee.

Cross-table conditions are not implemented as CHECK functions that query other tables. PostgreSQL only guarantees appropriate row-local CHECK use; FK/unique constraints and transaction-aware guards serve different roles. [PostgreSQL constraint semantics](https://www.postgresql.org/docs/18/ddl-constraints.html).

## 3. Database guard and assertion specification

The following are future database objects to be implemented with the migrations/routines, not files created by this task. Names describe engineering objects, not requirement IDs. All new names use snake_case and fit the identifier length limit.

### 3.1. Immediate guards

| Proposed guard | Tables / events | Rejected mutation |
|---|---|---|
| `trg_bookings_guard` | bookings BEFORE INSERT/UPDATE/DELETE | Any new state except PENDING; changed owner/Showtime/code/creation/deadline after creation; backwards lifecycle; clearing/changing non-null freeze; frozen pricing/promotion edits; PAID mutation except separately approved operational metadata (none modeled); transaction deletion |
| `trg_booking_seats_guard` | booking_seats BEFORE INSERT/UPDATE/DELETE | Identity/Seat/type/price changes after insertion in MVP; addition outside Booking creation; removal of history; sold_at supplied/cleared outside authorized finalization |
| `trg_booking_concessions_guard` | booking_concessions BEFORE INSERT/UPDATE/DELETE | Changes when Booking non-PENDING, expired, or payment_started_at non-null; insertion/replacement from inactive item; existing-line price rewrite merely because master changed |
| `trg_seat_holds_guard` | seat_holds BEFORE INSERT/UPDATE/DELETE | Grant without pair eligibility; expired or different-owner attachment; changing immutable pair/owner/creation/expiry; reassigning or clearing attached Booking; reopening terminal Hold; removing history |
| `trg_payment_transactions_guard` | payment_transactions BEFORE INSERT/UPDATE/DELETE | Changed immutable attempt identity/amount/currency/Booking; mismatched frozen Booking amount/currency; second unresolved attempt; result regression or deletion; untrusted caller attempting a success path |
| `trg_tickets_guard` | tickets BEFORE INSERT/UPDATE/DELETE | Issuance outside paid finalization; changed code/line/issued_at; check-in from non-VALID; changing successful check-in data; deletion or CHECKED_IN exit |
| `trg_showtime_seats_guard` | showtime_seats BEFORE UPDATE/DELETE | Pair/Hall reparenting; history-breaking deletion; eligibility changes outside guarded configuration path |
| `trg_audit_records_guard` | audit_records BEFORE UPDATE/DELETE | Any history rewrite; inserts require attributable safe action evidence |

Routine access privileges are essential: a trigger name alone does not authorize a caller. Guards inspect actual OLD/NEW state and locked parents; no client-provided boolean such as “verified” or “skip freeze” is accepted as permission. Parent identity changes in Seat/Hall/Showtime are rejected once referenced by active or historical operational data. Layout membership changes before use require the Hall configuration protocol (§7).

Bookkeeping lifecycle transition sets:

- Hold: ACTIVE → RELEASED, EXPIRED or CONSUMED. Attachment changes null → one Booking while ACTIVE and valid. All terminal states and attached identities are permanent.
- Booking: PENDING → PAID, EXPIRED or CANCELLED only. Freeze timestamp null → one instant; freeze is never cleared. PENDING cancellation remains possible after freeze, without altering snapshots.
- Payment: INITIATED → PENDING/SUCCESS/FAILED/CANCELLED; PENDING → SUCCESS/FAILED/CANCELLED. Duplicate terminal reports are idempotent. A trusted provider correction from FAILED/CANCELLED to SUCCESS must remain recordable through a dedicated reconciliation path and immutable audit; it never automatically reopens a Booking or retracts a newer attempt. This is evidence correction for late outcomes, not a new Booking lifecycle.
- Ticket: VALID → CHECKED_IN/EXPIRED/CANCELLED. CHECKED_IN, EXPIRED and CANCELLED are terminal in this MVP; no reissue/reset workflow.

### 3.2. Deferred aggregate assertions

Use named AFTER ROW constraint triggers, `DEFERRABLE INITIALLY DEFERRED`, that re-read the final current aggregate state by ID. They must not evaluate only stale NEW values captured earlier in the transaction. PostgreSQL supports end-of-transaction constraint-trigger checks. [CREATE TRIGGER](https://www.postgresql.org/docs/18/sql-createtrigger.html).

| Assertion | Trigger coverage | Final-state condition |
|---|---|---|
| `ct_booking_composition` | Booking and Booking Seat insert/update/delete; Hold insert/update/delete/attachment | Booking has at least one line; every line has exactly one origin Hold matching Booking/customer/Showtime/Seat; no attached Hold without a line; expiry <= every origin expiry and cut-off |
| `ct_booking_totals` | Booking, Booking Seat, Booking Concession insert/update/delete | Header seat/concession sums, subtotal, discount and final amount reconcile with all retained lines; no negative or double-applied discount |
| `ct_booking_payment_freeze` | Booking and Payment Transaction insert/update/delete | Any attempt implies payment_started_at set; freeze implies at least one attempt; timestamp matches first initiation; all attempt amounts/currencies agree with frozen values; no reopening |
| `ct_booking_paid_integrity` | Booking, Booking Seat, Hold, Payment Transaction and Ticket insert/update/delete | PAID has matching trusted SUCCESS evidence, immutable QR, paid_at, exactly one Ticket/line, all line sold_at equal paid_at and all origin Holds CONSUMED; non-PAID has no sold line/Ticket |
| `ct_ticket_checkin_audit` | Ticket transition and associated audit insertion | Successful check-in has operator/time and attributable audit for that Ticket in the same transaction |

Statement-time identity/state guards still run; deferral allows valid construction sequences, not invalid committed records. Both child and parent mutation paths trigger relevant assertions. Frozen parent protection alone is insufficient: a direct child update must be guarded too. Cross-row predicates execute under the common write protocol; deferred triggers by themselves are not a replacement for synchronization.

Check successful-payment eligibility at the protected finalization step using actual current time, but preserve the accepted finalization instant. A later audit check must not invalidate a correctly paid historical Booking merely because its old deadline is now in the past. Assert paid_at < expires_at, not “now < expires_at” for every future read/update.

### 3.3. Sale marker and completeness

`booking_seats.sold_at` is deliberately materialized because a partial index cannot predicate on the parent Booking's status. The unique `(showtime_id,seat_id)` index WHERE sold_at IS NOT NULL prevents a second successful owner. Immediate guards prevent arbitrary marker edits; deferred assertions bind marker ⇔ PAID parent and equality to paid_at. Both are necessary: an index alone would allow a false marker or a PAID Booking with no marker.

All finalization changes—Payment result, PAID state, sale markers, Hold consumption, Ticket creation, QR identity and audit—commit together. A uniqueness/assertion failure rolls back the whole business finalization. Paid Ticket expiration/check-in never clears sold_at. Expired/cancelled unpaid lines retain null sold_at and may coexist with later sales.

## 4. Transaction and lock contract

### Selected isolation and synchronization

Use READ COMMITTED with explicit row locks and declarative constraints for the MVP, rather than assuming an unlocked read prevents races. A fresh statement after waiting must reload current data. PostgreSQL describes READ COMMITTED snapshots and explicit row locks in [transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html) and [explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html).

Select a conservative per-Showtime outer write gate (`showtimes` row FOR UPDATE) for all Hold/Booking/Payment/Ticket mutations. Also lock affected `showtime_seats` rows FOR UPDATE as the approved per-pair resource contract. The outer gate simplifies complete-Booking expiry/release across multiple Seats and prevents lock-set expansion races in MVP. It serializes unrelated Seats within one Showtime, so throughput is deliberately bounded; future removal requires re-proving ordered pair locking and aggregate correctness under load. This is a documented performance tradeoff, not an assertion of measured performance.

### Global acquisition order

Discover identifiers without trusting that discovery for authorization, then acquire and revalidate in this order. Ascending `id` within each level; never introduce an inverse order in a worker or admin path.

1. Actor/Customer User rows required for the command, FOR SHARE; User role/status or assignment changes take FOR UPDATE on the relevant User first. System cleanup of another user's expired ownership need not authorize that user and does not acquire their User row late.
2. Cinema rows FOR SHARE, then Hall rows FOR SHARE. Eligibility/configuration mutations take FOR UPDATE at the corresponding level; a Cinema-wide change precedes Hall locks.
3. Showtime rows FOR UPDATE (one per normal Booking command; ascending for controlled multi-Showtime maintenance).
4. Physical Seat rows FOR SHARE as needed for current eligibility; Hall-layout/physical-status changes follow the Hall-exclusive path. Then affected Showtime Seat rows FOR UPDATE, ordered by `(showtime_id,seat_id)`.
5. Affected Booking rows FOR UPDATE, ascending id. Before pair locking, the held Showtime gate permits discovering the full pair set for any expired attached Booking touched by the operation; lock that full set, not just the originally selected Seat.
6. Applicable Promotion rows FOR UPDATE, ascending id, when eligibility/usage is affected. Do not acquire other Booking locks after Promotion locks.
7. Hold rows, Payment Transaction rows, then Ticket rows FOR UPDATE in deterministic id order; append audit last. Catalog rows read for snapshot creation can be locked FOR SHARE before line insertion; catalog-only writers must not then acquire a Booking/Showtime lock.

Revalidate User, scope, parent membership, current status and deadlines after locks. A nonlocking discovery that finds changed parent identity causes restart/rejection, not a lock-order shortcut. Parent identity guards make resource reparenting unavailable during normal sales. Configuration routines and maintenance scripts participate in this contract; it is not just a customer endpoint convention.

User/assignment administration uses User → Cinema order and never holds assignment rows while waiting for earlier resources. Showtime creation/rescheduling takes Cinema SHARE → Hall UPDATE → relevant Showtimes; exclusion is the backstop. Promotion master administration takes only Promotion locks and does not synchronously lock Bookings; affected operations revalidate rules under the Promotion lock. Public read paths do not take this write gate and never authorize a sale from an old projection.

### Time, failure and retries

- After acquiring the gate and pair/Booking locks, capture `clock_timestamp()` for the eligibility decision. `CURRENT_TIMESTAMP` represents transaction start and can be stale after waiting. [PostgreSQL current-time functions](https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT).
- Expiry equality is expired. Recheck immediately before the final state transition; that accepted instant becomes paid_at/sold_at/issued_at. A short transaction may commit after that instant, but no earlier request/gateway timestamp is used to bypass an expired deadline. No remote call or user interaction occurs inside the transaction.
- Configure `lock_timeout`, `statement_timeout` and idle-in-transaction timeout to bounded deployment values; values are operational tuning, not new business constants. Capture timeout metrics. TTL remains the approved configurable ten-minute default; lock timeout is a different concept.
- Deadlocks/timeouts roll back the complete command. Retry at most a configured bounded count with backoff and fresh state/deadline checks. Retry DB failures only; do not retry an external payment creation blindly. A uniqueness conflict becomes a deterministic business conflict unless the same idempotent resource already exists.
- Keep network payment requests, notifications and realtime delivery outside the DB transaction. Realtime failure does not roll back sold ownership. Reliable delivery infrastructure/outbox entities are not added in this scope; clients can reload authoritative state.

## 5. Seat ownership and Booking transactions

### Acquire Holds

Validate authentication, resolve Showtime → Hall → Cinema, acquire the lock hierarchy, and load configured pairs. Validate all selected units before granting any. Reject non-sellable/physically blocked/closed/started resources, sold pairs, another unexpired ACTIVE owner, and invalid Hall membership.

Retire stale ACTIVE Holds under the gate before inserting replacement ACTIVE rows. A stored ACTIVE row can have an elapsed deadline; the partial unique index purposely retains it until the transition to EXPIRED/RELEASED, so time passage cannot silently create two owners. If it belongs to an expired Booking, transition that whole Booking and release all its attached entitlements in the same transaction. Gate ownership allows identifying all affected pairs first. Do not partially expire only one of an attached Booking's Seats.

Create one Hold per selected unit with a common server grant time and configured deadline. The ACTIVE-pair unique index is a final backstop against duplicates. Multi-seat request rollback leaves no new partial Holds. Same-owner retries may return the already matching unattached valid Hold; they cannot renew TTL implicitly or re-use an attached Hold for a second Booking.

### Create Booking

Under the same gate/pair locks, require at least one ACTIVE unexpired owner-matching Hold for one Showtime. None may already be attached. Compute the Booking deadline no later than the earliest Hold expiry or booking cut-off; reject if no positive interval remains.

Create PENDING Booking, immutable Seat lines, permitted concession snapshots and server totals, then attach each Hold to its corresponding line. Composite references and origin uniqueness enforce membership. Deferred assertions ensure no committed empty Booking or missing origin line. Retried creation for an already attached exact Hold set can return the existing same-owner Booking; it cannot make a duplicate Booking.

### Pending composition edits

Only eligible unexpired PENDING Booking with null payment_started_at may change supported Concession/Promotion content. Acquire the gate/pair/Booking locks, validate the policy and recalculate totals. New/replaced concession lines snapshot current ACTIVE catalog data; quantity updates use the existing unit-price snapshot. Existing Seat lines are fixed for this Booking. A new seat selection requires a new Hold/Booking flow.

If edit commits before payment initiation, the attempt sees the edited state; if initiation establishes the freeze first, the edit fails. All aggregate checks observe the final state at commit. The database guard covers both changed headers and changed/deleted child rows.

### Cancel or expire Booking / release Hold

PENDING → CANCELLED is allowed for the authorized owner; PENDING → EXPIRED occurs at the deadline. Release all attached ACTIVE Holds under exact Hold/Booking identity. Snapshots and origin references remain. Unattached owner/system release changes ACTIVE → RELEASED; attached Holds are released through the whole Booking lifecycle, not detached independently.

A delayed worker first discovers candidates without locking child rows, then acquires the normal hierarchy and rechecks identity/time/state. It must not lock a Hold/Booking first and then wait for Showtime. If payment already finalized, no release occurs. If another customer later owns the pair, the old Hold ID cannot affect the replacement. No auto-cancellation of PAID Booking or clearing of its sold markers.

Periodic workers handle persistence cleanup and release notifications, but validity checks never depend on worker timeliness. Read projections consider deadline, Booking state and physical eligibility even while an expired ACTIVE row awaits retirement.

## 6. Payment and paid finalization

### Initiation and permanent freeze

Acquire ordered resources, including all originating pairs. Validate the Customer/Booking, deadline, Holds, eligibility, promotion rules and server totals. A different computed amount requires a revised summary and customer confirmation before an attempt is created, not a silent charge change.

For the first attempt, capture one initiation instant and use it for both payment_started_at and that attempt's initiated_at; persist the INITIATED Payment Transaction with immutable amount/currency/internal reference in the same transaction. Do not invoke two separate timestamp defaults and expect equality. No frozen line data is altered afterward. For subsequent requests, return the existing unresolved attempt; only a definitively FAILED/CANCELLED attempt permits a new attempt with identical amount/currency before expiry. Query the first persisted attempt under the Booking gate to pin currency.

Commit before submitting to the sandbox. The stored internal reference is the recovery/idempotency key. Crash before submission leaves a frozen Booking and an existing attempt to resume, not a new basket. Crash/timeout after submission is an unknown outcome: reconcile/query/resubmit safely under provider idempotency before creating anything else. A local timeout is not a FAILED provider outcome.

### Verified result and idempotent completion

The trusted adapter verifies signature/authenticity, provider reference, amount, currency and provider status before invoking result handling. Invalid input cannot mark SUCCESS. Fetch/query provider evidence outside the database lock scope, then revalidate mutable internal state under the normal hierarchy. Do not trust the frontend redirect.

Inside the result transaction:

1. Resolve the unique internal/provider reference to the existing attempt and its Booking. Record only consistent provider identity and preserve mismatched evidence for audit/reconciliation.
2. If the same Booking is already PAID for this result, return existing Ticket/QR state; do not insert more Tickets or extend deadlines.
3. For an eligible PENDING Booking, require matching frozen totals/currency, all origin Holds ACTIVE and unexpired, current sale eligibility and no sold pair. Capture current finalization time after waits.
4. Record SUCCESS, PAID and paid_at, set every line sold_at to that instant, consume origin Holds, create exactly one Ticket per line, create one unique Booking QR identity and append audit. Deferred checks require the whole aggregate. The partial sold-pair index prevents two successful owners even if an implementation bug attempts it.
5. Commit before notifying clients. Any DB failure rolls back the finalization bundle. Reprocessing the same trusted evidence repairs by retrying that transaction, not by creating an independent ticket batch.

No separate asynchronous Ticket issuance gap is selected: the MVP has one committed PAID aggregate with its Tickets and QR. A collision in generated QR/Ticket identifiers causes rollback and a bounded regeneration retry; never overwrite another identity.

### Expiry, cancellation, blocking and inconsistent provider events

If Booking is EXPIRED/CANCELLED, deadline passed, or a required unit became unsellable, do not finalize it. Persist the authentic attempt outcome and audit/reconciliation evidence without PAID, sold markers or Tickets. If still PENDING at its elapsed deadline, expire/release it under the same transaction. Do not repurpose another customer's Hold or reinstate an old Booking.

An authentic additional successful attempt after Booking already became PAID is financial evidence, not another sale. Preserve SUCCESS on that attempt and flag reconciliation; no unique “one SUCCESS row per Booking” constraint is used, because that would suppress truthful gateway evidence. At most one unresolved attempt and one finalized Booking aggregate are different rules.

A late SUCCESS correcting a previously terminal failure/cancellation takes the dedicated reconciliation route. It is never allowed to modify the frozen basket; automatic fulfillment is not retried through that correction path. Store prior/new provider evidence in audit and resolve operationally. This conservative path avoids treating a formerly failed attempt as authority over a newer retry. Automated refunds and production money handling remain excluded.

### Promotion boundary

The database can enforce positive limits, code uniqueness, dates and amounts, but the sources do not choose whether usage is consumed at application, freeze or PAID, nor its release policy and discount basis. Do not invent a redemption entity or silently select that business behavior.

Implementation must resolve these rules before enabling Promotions. Once approved, every usage-affecting operation must take the relevant Promotion row lock after its Booking lock, re-evaluate the approved count/reservation predicate, and update eligible state in the same transaction. Count Bookings with nonlocking reads after that lock; do not then acquire other Booking locks in reverse order. All writers that change the count, including cancellation/expiry and any admin limit changes, must participate. The `bookings(promotion_id,status)` index supports evaluation, but an unlocked COUNT followed by a write is not safe. No arbitrary usage counter with undefined lifecycle is added.

## 7. Ticket check-in and configuration changes

### Check-in

The Booking QR resolves Booking and Tickets; scanning alone changes nothing. Check-in authenticates Staff/authorized operator, resolves actual Cinema, validates assignment and time window, and accepts only selected Tickets from that Booking whose state is VALID.

Acquire actor scope and the normal Showtime/Booking gate, then selected Ticket rows in ID order. For each successful VALID → CHECKED_IN transition, set checked_in_at and checked_in_by_user_id and append audit in the same transaction. Competing commands re-read the new state and cannot succeed twice. A repeated request returns current state/ALREADY_USED for an already used Ticket, without consuming other Tickets or the Booking QR. A multi-Ticket request can validate its full selection before writes; the API's per-item versus all-or-nothing error response remains API design, but each success is atomic and auditable.

One COUPLE Ticket still permits one unit-level check-in. Ticket expiry/cancellation never frees a sold Seat for resale or erases prior paid state. No Ticket can bypass its Booking Seat ownership through a redundant direct booking_id or seat_id.

### Physical and per-Showtime eligibility

Configuration writers take Cinema/Hall barriers in the shared global order. Physical Seat/Hall changes take Hall FOR UPDATE before affected Showtime gates, which prevents a payment holding Hall SHARE from observing eligibility half-changed. Per-pair sale-flag changes take the normal Hall SHARE/Showtime/pair gate. If finalization wins, preserve sale and record maintenance as an operational issue; if blocking wins, finalization rejects eligibility. Neither silently cancels/refunds a PAID Booking.

Showtime membership initialization occurs before sales open. Validate completeness against the Hall's unit layout and create all pair rows; absent rows are not implicitly sellable. Composite FKs prove Hall identity, not completeness or non-overlapping physical geometry. The layout writer must validate labels/occupied positions and people capacity before opening; the current logical model has labels, not full geometry. Do not claim a string unique constraint detects overlapping H9-10/H9/H10 fixtures.

Schedule changes use Hall-exclusive coordination and `ex_showtimes_hall_occupancy`. Compute occupied_until from the accepted end/buffer and preserve it. The GiST exclusion is the database backstop for concurrent schedule creation. Reparenting or rescheduling that would break existing Holds/sales is rejected; a separate approved operational change workflow is needed, not mutation of historical references.

## 8. Preservation and rollout boundary

V1/V2 are immutable inputs. This design does not rename, recreate or checksum-repair them. Domain references use existing users.id; refresh_tokens remain Auth support only. Future strengthening of legacy checks is a separate forward migration and data review.

The domain rollout must enable constraints, supporting indexes, guarded write interfaces, trigger permissions and deferred assertions before accepting concurrent writes. Installing only tables and letting services issue arbitrary DML would not implement this design. The role/privilege change applies to new domain persistence and must not break existing Auth access.

No migration version is allocated here. No database extension, routine, trigger, role or index has been created. The files are a specification; executable SQL, data backfills, deployment scheduling and rollback planning require the next authorized task.

## 9. Required later verification

These are acceptance cases for future migrations/application work; none is claimed executed by this documentation task.

| Case | Required result |
|---|---|
| All 20 table definitions against dictionary | Types/defaults/nullability/PK/FK/checks and permitted legacy differences match |
| Valid IDs with mismatched Hall or Booking Showtime/owner | Composite FK rejects; nullable unattached Hold still succeeds |
| Empty Booking, missing origin Hold, detached attached Hold | Guard/deferred assertion rejects commit |
| Multiple attempted owners, same Showtime/Seat | Exactly one ACTIVE Hold; timeout/conflict deterministic |
| Expired ACTIVE row and replacement before worker runs | Old row retired, replacement succeeds; no double owner |
| Multi-seat acquisition with one unavailable pair | No partial new Holds |
| Same physical Seat at different Showtimes | Independent availability |
| Two paid Bookings for same pair, including direct privileged test DML | Sold-pair uniqueness and PAID assertions reject the second; bypass test does not disable triggers |
| PAID parent with missing marker/Ticket/QR or no successful payment | Deferred assertion rejects |
| Frozen parent untouched but child price/quantity/delete attempted | Child guard rejects |
| Edit and first payment race | Either edited basket freezes or edit fails; amount cannot diverge |
| First submission timeout/crash/retry | Resume same stored reference; no new attempt while unresolved |
| Duplicate and concurrent provider SUCCESS | Exactly one finalized aggregate, no duplicate Tickets |
| Provider SUCCESS after expiry/reallocation or correction of FAILED | Evidence retained; no resurrection/reallocation or automatic refund |
| Two Staff select same Ticket; repeated QR scan | One successful check-in; unchanged other Ticket states; audit matches |
| Admin maintenance and finalization race | Deterministic eligibility ordering; paid history preserved |
| Two overlapping Hall schedules, including buffer-only overlap | Exclusion rejects; touching half-open boundaries allowed |
| Incorrect totals, zero concession quantity, NaN/infinite numeric, over-precision API input | DB/service validation rejects at appropriate boundary |
| Time crosses expiry while waiting on locks | Fresh authoritative time rejects expired ownership |
| Permission tests | Runtime cannot directly mutate protected tables or disable guards; reporting read-only |
| Existing Auth regression / Flyway upgrade | Existing V1/V2 checksums and data remain valid; registration/renewal still function |

Run real PostgreSQL integration and multi-connection concurrency tests, schema introspection and EXPLAIN for the chosen queries. Measure per-Showtime gate contention against NFR targets; document tuning or revisit the lock design if it fails. Parser/static review is not evidence that triggers or races work.

## 10. Remaining decisions and known limits

The physical structure, composite enforcement, static uniqueness, expiry handling, freeze and finalization boundaries are specified. Remaining prerequisites are business Promotion usage/scope, exact Movie publication statuses, provider identity/currency/reconciliation contract, detailed physical layout validation and check-in time-window configuration. Do not deploy these features with guessed policy.

The selected decimal bounds, storage tokens, outer Showtime gate, partial indexes, three physical supporting columns and atomic paid issuance are engineering decisions documented here. They do not modify the approved entity scope or permit full HRM, inventory, refund, multi-tenant or event-platform expansion. Runtime safety remains unverified until the future implementation and tests above.
