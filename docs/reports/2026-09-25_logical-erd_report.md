# Smart Cinema Logical ERD Report

## 1. Task Information

Task: Create the canonical Smart Cinema logical ERD  
Date: 2026-09-25  
Module: Cross-domain persistence  
Type: Documentation and Mermaid logical model  
Status: Complete at logical design level

Actors represented: Customer, Staff, Manager and Admin through User roles; system actions through audit. No actor-facing implementation.

## 2. Requested Work

Create canonical Mermaid ERD documentation applying the approved COUPLE, PostgreSQL Hold, Showtime Seat eligibility, first-payment freeze, Booking QR and Ticket-level check-in decisions. Show entities, references, cardinalities, important logical constraints and implementation status. No migrations, BRD/SRS changes, unrelated entities or physical enforcement strategies.

Pre-implementation convention/scope check: use the existing `docs/db/erd/` directory, lowercase kebab-case document/source names, plural snake_case entities and a new dated report. Plan two ERD files and this report; preserve the existing PDF and earlier reports. Verification covers source/reference consistency, diagram structure, documentation links and unchanged source hashes. Code/routes/imports/API changes are NOT APPLICABLE.

## 3. Documents Reviewed

- [Prior analysis](2026-09-23_database-model-analysis_report.md), inventory, relationships, auth reconciliation and conflicts.
- [Approved database design decisions](../db/database-design-decisions-v1.0.md), all four selections and ERD effects.
- [BRD v1.2](../brd/brd-v1.2.md), relevant identity, catalog, Seat, Booking, Payment, Ticket, assignments and Concession requirements.
- [SRS v1.2](../srs/srs-v1.2.md), Data Requirements, Logical Relationships and Data Integrity Constraints; applicable FR/NFR and lifecycle sections.
- [System Analysis & Design v1.1](../system-analysis/Smart_Cinema_Ecosystem_System_Analysis_Design_v1_1.docx), domain model and logical ERD tables/paragraphs; related rules and use cases reviewed in the preceding analysis and decision task.
- [V1](../../backend/src/main/resources/db/migration/V1__create_users_table.sql) and [V2](../../backend/src/main/resources/db/migration/V2__create_refresh_tokens_table.sql), complete definitions.
- Canonical Development, Backend and Review workflows, applicable Document/Requirement Traceability/Project Conventions/Coding rules, [conventions](../development/project-conventions.md) and [report template](templates/TASK_REPORT_TEMPLATE.md).

## 4. Requirements Traceability

PASS means logical coverage, not runtime enforcement.

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| SRS §§5.1–5.17 | Core entities, attributes and relationships | Yes | PASS: 20 entities, including approved association and Auth support entity |
| SRS DR-001–DR-007 | Membership, no duplicate sale, exclusive Hold | Yes | PASS: pair references and logical invariants |
| SRS DR-008–DR-010, DR-020–DR-024 | Ticket issuance, unique QR/code and individual check-in | Yes | PASS: Booking QR attribute and one Ticket per Booking Seat |
| SRS DR-011–DR-019 | References, amounts, time, snapshots and history | Yes | PASS: documented without physical mechanisms |
| BRD BR-017–BR-031; SRS FR-SEAT-003/004 and FR-BOOKING-018 | Unit identity, availability and immutable transactions | Yes | PASS: approved design refinements applied |
| BRD BR-043–BR-046, BR-051; design UC-SYS-008/009 and UC-STF-004 | One purchased unit/Ticket and Booking QR check-in | Yes | PASS |
| SRS FR-AUTH-004; V1/V2 | Existing User and refresh persistence | Yes | PASS: separately marked implemented |
| SRS NFR-CONC-002/004; design BRULE-PAY-005 | No double sale or duplicate issuance | Yes | PASS as constraints; enforcement deferred |
| Design UC-CUS-010/016/018 and BRULE-BOOK-005 | Holds, Booking, Payment and snapshots | Yes | PASS |

## 5. Implementation Summary

Created one canonical Mermaid source and a companion document with an identical embedded Mermaid view. All 20 entities carry implementation-status comments. The model includes logical keys, 25 relationship edges, composite Showtime/Seat references, lifecycle minima, derived Ticket ownership, snapshots and constraint sections.

The valid-created-Booking view shows 1..N attached origin Holds, specializing the decision document's broad 0..N notation under its explicit one-origin-Hold-per-line rule. No new Booking draft state or relation entity was introduced. Existing SQL structures remain unchanged; PK/FK/UK labels describe logical identities and do not choose physical strategies.

## 6. Files Created

- [Canonical Mermaid source](../db/erd/smart-cinema-logical-erd.mmd).
- [Logical ERD documentation](../db/erd/smart-cinema-logical-erd.md).
- `docs/reports/2026-09-25_logical-erd_report.md`.

## 7. Files Modified

None. Earlier untracked analysis/decision documents, reports and `docs/db/erd/smart-cinema-erd.pdf` remain untouched. The retained PDF is not designated the canonical model.

## 8. Verification

| Check | Result |
|---|---|
| Source/diagram reconciliation | PASS: 20 entities, 25 edges, all endpoints declared; 2 implemented and 18 proposed labels; automated comparison confirms all nine V1 and six V2 attributes exactly represented |
| Mermaid source and embedded view | PASS: exact content equality; Mermaid 11 `parse` returned `diagramType: er` without errors |
| Links, IDs, naming and report structure | PASS: no missing local links or unknown explicit requirement IDs; numbered report sections 1–12 plus Convention Compliance; whitespace checks passed for all three new files and `git diff --check` |
| BRD/SRS and V1/V2 preservation | PASS: SHA-256 matches pre-edit values for all four files; repository status adds only the three requested documentation artifacts to the pre-existing untracked files |
| Diagram visual rendering | NOT RUN: syntax parsed with Mermaid, but no rendered-image layout inspection performed; canonical artifact is editable Mermaid with companion relationship tables |
| TypeScript / ESLint / build / application tests | NOT RUN: documentation-only task |
| Database / Flyway | NOT RUN: no migrations or live database changes |

Validation used read-only Python checks and a Mermaid/DOM parser installed in a task-specific system temporary directory. No repository package manifest, dependency or application file was changed. The retained PDF was not regenerated.

## 9. Requirement Reconciliation

- PASS: canonical Mermaid ERD documents the 20 in-scope entities and lifecycle cardinalities.
- PASS: implemented Auth persistence distinguished from proposed domain persistence throughout.
- PASS: all seven explicitly approved decisions reflected in the model and constraints.
- PASS: no migrations, BRD/SRS changes, application code, unrelated entities or physical enforcement strategy selected.
- PARTIAL for implementation readiness: deferred provider, assignment, promotion and detailed lifecycle policies remain explicit; no runtime enforcement claimed.

## 10. Deviations / Conflicts

No new high-impact requirement conflict found. The approved decision document resolves the earlier four design ambiguities. Existing terminology drift and remaining policy gaps are listed in the companion document. Genre normalization and logical unique lookup identifiers are retained from the inventory proposals and explicitly presented as proposed domain design.

Existing Convention Conflicts: historical scope/DOCX naming is retained per convention preservation rules. No new convention exception or rename. The existing PDF is preserved without claiming its contents match the new canonical source.

## Convention Compliance

Validated against [project conventions](../development/project-conventions.md), including this report.

| Area | Result | Notes |
|---|---|---|
| Folder naming | PASS | Existing `docs/db/erd/` and `docs/reports/` |
| File naming | PASS | Lowercase kebab-case ERD files; required dated report |
| Code naming | NOT APPLICABLE | No application code |
| Domain terminology | PASS | Canonical approved domain names |
| API/routes/imports | NOT APPLICABLE | No changes |
| Database convention | PASS | Plural snake_case, `id` identities, role-qualified FK names |
| Status convention | PASS | Uppercase logical business labels; unresolved enum details deferred |
| Documentation convention | PASS | Linked baselines, source ownership, traceability and preservation |

## 11. Known Limitations

This is a logical model, not SQL DDL or proof of database enforcement. Audit resource targets are logical references, not polymorphic FKs. Composite references and lifecycle-dependent constraints need later physical design. Live database state and the pre-existing PDF were not audited.

## 12. Next Recommended Step

Use this canonical logical model for a separately authorized physical data dictionary and integrity-enforcement design. Resolve listed policy gaps before implementation; preserve V1/V2 history.
