# Integrity enforcement design v1.1 — Payment finalization addendum

Date: 2026-09-30. Status: approved design, not implemented.
This additive revision supersedes the lock ordering in
[v1.0 §4](integrity-enforcement-design-v1.0.md#4-transaction-and-lock-contract)
where it conflicts below. All other constraints remain unless explicitly refined
by the [VNPAY Sandbox contract](../api/vnpay-sandbox-payment-contract-v1.0.md).
Historical migrations and documents are unchanged.

## 1. Evidence and corrected global order

Actual V5 `lock_hold_context`, V6 `lock_booking_resources`, V7 Concession writes,
V8 Promotion writes and V9 `validate_payment_composition` establish the order below.
The old numbered sequence put Promotion before Holds; runtime already takes Holds
before Promotion. This addendum adopts that established runtime order, adds the
omitted Movie barrier and defines where future result rows fit.

1. User SHARE for authenticated new Customer commands; perform ACTIVE/role checks.
   Trusted result processing must use the system path, not impersonate the owner.
   If it needs a User lock, take it here without rejecting later BLOCKED status.
2. Cinema SHARE, then Hall SHARE.
3. Showtime UPDATE; verify discovered parent identities have not changed.
4. Movie SHARE. Catalog-only Movie writers must not acquire earlier resource locks.
5. All Hall Seat rows for the target Showtime, ascending Seat id, SHARE.
6. All target Showtime Seat rows, ascending seat_id, UPDATE.
7. All target Showtime Booking rows, ascending id, UPDATE.
8. All target Showtime Hold rows, ascending id, UPDATE.
9. Command-specific Concession catalog SHARE / existing Concession line UPDATE
   locks as already needed for editable composition, before Promotion locking.
   Frozen settlement does not reprice or acquire current Concession catalog rows.
10. Applicable Promotion rows UPDATE, ascending id. Count PAID usage after this
    lock using a fresh statement; do not lock other Bookings afterward.
11. Future Payment Transaction rows UPDATE, ascending id, then Tickets UPDATE in
    deterministic order where existing rows need checking. Append audit/evidence
    last; no later step may acquire an earlier resource lock.

The first eight steps reflect the broad existing per-Showtime gate; this task does
not optimize it to a narrower set. Additional Payment/Ticket placement is the
required future extension, not a claim those row locks exist in V9. Multiple
Showtime operations must acquire all earlier resource sets deterministically
before later ranks, or be split into single-Showtime transactions; no lock-order
shortcut for background workers or operator reconciliation.

Use READ COMMITTED with explicit locks, fresh reads and `clock_timestamp()` after
waiting. Candidate discovery is nonlocking. Never lock a Payment/case/Hold first
and then wait for its Showtime. Workers discover references, acquire the complete
gate, recheck and mutate. Query/signature network work is outside these locks.
An evidence-only write that takes no domain locks must finish independently and
must not enter the domain gate while holding an evidence/Payment lock.

Promotion master writers lock only their Promotion rows and never wait for a
Booking gate. Customer block administration must not take a User lock after a
Showtime lock. Cinema/Hall/Seat configuration follows the existing parent barriers.
Future result writers need dedicated eligibility checks: the current composition
helper requires an unfrozen Booking and must not be relaxed to allow basket edits.

## 2. Settlement policy refinements

The approved contract refines v1.0 without changing historical evidence:

- Existing legitimate Payment can settle despite subsequent Customer BLOCKED;
  ACTIVE checks still govern new protected customer actions and retries.
- Frozen Promotion terms/window/status do not reprice or reject the accepted
  discount. Current usage limit is serialized at sale; no usage reservation exists.
- Financial SUCCESS is recordable without PAID when entitlement is unavailable.
  Late correction after FAILED/CANCELLED is reconciliation, not automatic sale.
- Scope is sandbox only. Automatic refunds/production money are excluded.
- PAID implies complete verified evidence, sold lines, exact consumed origins,
  one Ticket per whole Seat Unit, one QR and audit in one transaction. The reverse
  implication SUCCESS -> PAID is intentionally false for unfulfillable payments.
- accepted paid_at must be before original expiry/cutoff using actual locked-time
  eligibility. No provider timestamp backdating or Hold replacement is allowed.
- A committed sale's notification is after-commit work and cannot undo that sale.

## 3. Migration and test obligations

The next forward migration must evolve all interacting stage guards, assertions,
reference/first-attempt rules and grants together. No intermediate deployment may
permit sold/consumed/PAID writes without full issuance assertions. Preserve V9
unbound rows and exact numeric(19,4); provider-positive-whole-VND validation applies
only to submission. Keep the prepared partial sold-pair unique index.

Add the approved Ticket/audit model, binding/evidence/reconciliation persistence
and narrowly privileged result functions. Use a distinct trusted system entry
point; no public execute grant or Customer-settable verified-result flag. Test
grants and invalid direct writes, not just happy-path HTTP behavior.

Concurrency evidence must cover acquisition/cancel/expiry/configuration versus
finalization, duplicate results, Promotion last-use across separate Showtimes,
blocked-after-initiation settlement and all-or-nothing Ticket/QR creation. Assert
no reverse-order helper acquires Hold/Booking after Promotion or Showtime after
Payment. Fresh migration/V9 upgrade and complete historical checksum preservation
remain mandatory. No migration or runtime test is performed by this design task.
