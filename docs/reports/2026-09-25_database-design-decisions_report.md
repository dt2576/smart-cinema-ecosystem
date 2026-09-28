# Smart Cinema Database Design Decisions Report

## 1. Task Information

Task: Resolve four high-impact database design decisions  
Date: 2026-09-25  
Module: Seat, Seat Hold, Showtime Seat Availability, Booking and Payment  
Type: Database design documentation  
Status: Complete at design-selection level; no implementation

Actors affected by design: Customer, Staff, Manager/Admin and payment/system events. No actor-facing feature implemented.

## 2. Requested Work

Create a decision document covering COUPLE representation, PostgreSQL versus Redis Hold authority, per-Showtime Seat Availability and Booking freeze during Payment. For each, record requirements, viable options, tradeoffs, selected minimal MVP design, ERD effects and deferred work. Preserve migrations, BRD/SRS and application code.

Pre-implementation plan: create `docs/db/database-design-decisions-v1.0.md` and this report only. Verify source identifiers, source preservation, local links, naming and cross-decision consistency. No ERD artifact or unrelated entity is created.

## 3. Documents Reviewed

- [Prior database model analysis](2026-09-23_database-model-analysis_report.md), §§5 and 10.
- [BRD v1.2](../brd/brd-v1.2.md), Seat/Hold/Booking/Payment/Ticket and Concession scope and requirements.
- [SRS v1.2](../srs/srs-v1.2.md), §§3.5–3.10, 4.2, 5, 8 and 11.
- [Business Analysis v2.1](../business-analysis/business-analysis-v2.1.md), §§15–24, 26–28, 33–36 and 49–50.
- [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx), relevant use cases, business rules, model and persistence responsibility; paragraphs and tables extracted read-only.
- [Project Scope v1.0](<../project-scope/project-scope v1.0.md>), Hold/Booking/concurrency and historical QR text.
- [V1](../../backend/src/main/resources/db/migration/V1__create_users_table.sql) and [V2](../../backend/src/main/resources/db/migration/V2__create_refresh_tokens_table.sql), complete SQL definitions.
- Canonical Development workflow, Backend and Review workflows, Document/Requirement Traceability/Project Conventions/Coding rules, [project conventions](../development/project-conventions.md), and [report template](templates/TASK_REPORT_TEMPLATE.md).

## 4. Requirements Traceability

Results below concern design coverage, not implementation verification. Full source and UC/BRULE mappings appear in the decision document §2.

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| BRD BR-044 and BA-07; SRS FR-SEAT-003, FR-TICKET-002, DR-009, DR-023–DR-024 | One Ticket per sellable Seat Unit and individual Ticket check-in | Yes | PASS: one indivisible COUPLE unit; admission limitation explicit |
| BRD BR-018–BR-024; SRS FR-SEAT-005–FR-SEAT-012, DR-006–DR-007, DR-014, NFR-CONC-001/002 | Exclusive time-limited ownership and no double sale | Yes | PASS: PostgreSQL authority and shared pair serialization contract |
| BRD BR-017; SRS FR-SEAT-001/004/016/017, DR-005 | Per-Showtime availability and proper Hall membership | Yes | PASS: one association per pair, sale flag plus derived occupancy |
| BRD BR-030/031, BR-038–BR-041, BR-066/067; SRS FR-BOOKING-014–FR-BOOKING-018, FR-PAYMENT-010/012/014 | Price snapshots, edits before Payment, retries and late results | Yes | PASS: first-initiation freeze and explicit reconciliation behavior |
| Design UC-CUS-010/016/018, UC-SYS-001/006/008 and UC-STF-004 | Hold, Booking, Payment, expiry, issuance and check-in | Yes | PASS: transaction sequence and scenarios reviewed |
| Design BRULE-SEAT-003–BRULE-SEAT-007, BRULE-BOOK-005, BRULE-PAY-001–BRULE-PAY-006, BRULE-TICKET-001/004 | Ownership, immutability, trusted payment and single use | Yes | PASS: selected designs preserve invariants |

## 5. Implementation Summary

Created a design document selecting:

1. One Seat record per physical sellable unit; COUPLE is indivisible and produces one Ticket.
2. PostgreSQL as Hold authority, with attached Booking entitlement using the original Hold deadline; Redis is optional optimization.
3. `showtime_seats` as the sole newly justified associative entity, with per-Showtime eligibility and derived occupancy.
4. Permanent composition/price freeze on the first payment attempt for that Booking, using `payment_started_at`; failed attempts can retry unchanged, and late outcomes cannot revive expired/cancelled Bookings.

Included option comparisons, complete FK/cardinality implications, cross-table constraints, failure scenarios, runtime dependencies and deferred details. New fields/entities are design selections only. V1/V2 identity and refresh-token responsibilities remain unchanged.

## 6. Files Created

- [Database design decisions v1.0](../db/database-design-decisions-v1.0.md).
- `docs/reports/2026-09-25_database-design-decisions_report.md`.

## 7. Files Modified

None. The pre-existing untracked analysis report and `docs/db/erd/smart-cinema-erd.pdf` are preserved. Neither is overwritten or regenerated.

## 8. Verification

| Check | Result |
|---|---|
| Requirements and design review | PASS: four decisions traced to actual source requirements; selections separated from source mandates |
| Scenario review | PASS at design level: concurrent acquisition, expiry, blocking, edit/payment race, retry and late success reviewed in document §7 |
| Local links, explicit IDs, report structure and whitespace | PASS: Python read-only checks found no missing links, unknown explicit requirement IDs or unexpected trailing whitespace in either new file; report sections 1–12 and Convention Compliance present; `git diff --check` passed |
| Source and migration preservation | PASS: SHA-256 of BRD v1.2, SRS v1.2, V1 and V2 matches pre-authoring values; `git status --short` shows only the two new documents plus the two pre-existing untracked files |
| TypeScript | NOT RUN: no application changes |
| ESLint | NOT RUN: Markdown design work only |
| Build | NOT RUN: no executable changes |
| Tests | NOT RUN: scenario walkthroughs are design checks, not runtime tests |
| Database / Flyway | NOT RUN: no migrations or database operations authorized by this task |

## 9. Requirement Reconciliation

- PASS: every requested topic includes requirement, options, tradeoffs, selection, ERD effects and deferred work.
- PASS: no BRD/SRS edits, migrations, application code or unrelated entities.
- PASS: explicit COUPLE capacity/check-in consequences and first-payment freeze policy avoid silently presenting new choices as existing requirements.
- PASS: Hold expiry, availability and Payment rules form one ownership contract with no Redis/SQL dual authority.
- PARTIAL for implementation readiness: physical constraints/locking, provider reconciliation and promotion usage policy require later detailed design; these do not reopen the four selected logical decisions.

## 10. Deviations / Conflicts

No requirement or convention exception is introduced. The current request authorizes selecting designs for previously unresolved decisions.

- HIGH, resolved at design level: COUPLE representation, Hold authority, Showtime-specific availability and freeze boundary now have explicit selections.
- MEDIUM, explicit product consequences: COUPLE is admitted as one unit; a failed-payment basket stays frozen. Separate occupant admission or post-failure editing would require revising this design.
- MEDIUM, deferred implementation dependency: a trusted payment can succeed after Booking expiry; preserve outcome/audit and reconcile without auto-ticket or automatic refund. Provider integration must implement this path.
- MEDIUM, remaining earlier findings: promotion limits/rounding, assignment history and other unrelated decisions remain outside the four-topic resolution.
- LOW, existing document drift: older scope QR/F&B text and HOLDING/HELD differences remain recorded; no baseline document was edited.

Existing Convention Conflicts: historical DOCX capitalization/underscores and historical scope filename spaces are preserved under canonical §5. No approved exception is needed for the two new convention-compliant Markdown files.

## Convention Compliance

Reviewed against [project conventions](../development/project-conventions.md), including this report.

| Area | Result | Notes |
|---|---|---|
| Folder naming | PASS | Existing `docs/db/` and `docs/reports/`; no new folder |
| File naming | PASS | Versioned kebab-case design document and dated report pattern |
| Code naming | NOT APPLICABLE | No application code |
| Domain terminology | PASS | Canonical Seat, Seat Hold, Showtime, Booking and Ticket terms |
| API/routes/imports | NOT APPLICABLE | No API implementation or contract changes |
| Database convention | PASS | Plural snake_case table proposal, `id` PKs, snake_case columns/FKs |
| Status convention | PASS | Existing uppercase business labels; no new Booking status |
| Documentation convention | PASS | Linked sources, template sections, actual limitations and distinct decisions versus requirements |
| Branch/commit naming | NOT APPLICABLE | No branch or commit created |

## 11. Known Limitations

No live database or executable concurrency behavior was tested. No ERD was generated. Physical SQL constraints and provider behavior still require separate design and validation. Existing untracked files are not evidence of approval of their content and were left untouched.

## 12. Next Recommended Step

Update the logical ERD in a separately requested task using the decision document, then specify physical keys/constraints and transaction protocols before any new Flyway migration.
