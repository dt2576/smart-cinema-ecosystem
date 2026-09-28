# Smart Cinema Physical Data Design Report

## 1. Task Information

Task: Create physical data dictionary and integrity-enforcement design  
Date: 2026-09-25  
Module: Cross-domain PostgreSQL persistence  
Type: Design documentation  
Status: Complete as specification; implementation and runtime validation not performed

Actors affected by design: Customer, Staff, Manager/Admin and system/payment events. No actor-facing code implemented.

## 2. Requested Work

Define physical columns/types/nullability/defaults, constraints/indexes, reference/update/delete policies, money/time/status representation, composite integrity and concurrency boundaries for the canonical ERD. Preserve V1/V2, BRD/SRS and application code. No unrelated entities or migrations.

Pre-implementation plan: create two versioned Markdown documents under existing `docs/db/` and this new dated report. Check canonical names, traceability, conflicts and scope before authoring. Verify entity/attribute coverage, reference consistency, technical PostgreSQL semantics, source hashes, links and report conventions. No existing file is planned for modification.

## 3. Documents Reviewed

- [Canonical Mermaid source](../db/erd/smart-cinema-logical-erd.mmd) and [logical documentation](../db/erd/smart-cinema-logical-erd.md).
- [Database design decisions v1.0](../db/database-design-decisions-v1.0.md), approved ownership, eligibility, COUPLE and freeze decisions.
- [BRD v1.2](../brd/brd-v1.2.md), relevant scheduling, ownership, snapshots, payment, Ticket and audit requirements.
- [SRS v1.2](../srs/srs-v1.2.md), §§3.5–3.10, 4.2–4.3, 5.1–5.18 and 8; explicit unresolved Promotion policy in §3.8.
- Business Analysis v2.1 status vocabulary; System Analysis & Design traceability inherited through the canonical ERD/approved decision documents from the preceding tasks.
- [V1](../../backend/src/main/resources/db/migration/V1__create_users_table.sql), [V2](../../backend/src/main/resources/db/migration/V2__create_refresh_tokens_table.sql), and backend configuration for current persistence stack.
- Canonical Development, Backend and Review workflows; applicable Document/Requirement Traceability/Project Conventions/Coding rules; [project conventions](../development/project-conventions.md); [report template](templates/TASK_REPORT_TEMPLATE.md).
- Official PostgreSQL 18 documentation for constraints, partial indexes, expression immutability, numeric/time semantics, locks/isolation, constraint triggers, ranges and btree_gist; links are placed next to technical claims in the delivered documents.

## 4. Requirements Traceability

PASS denotes design coverage, not executed database behavior.

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| SRS §§5.1–5.17 | All logical entity attributes and relationships | Yes | PASS: 20 table dictionaries plus explicit supporting columns |
| DR-001–DR-005 | Correct Hall/Showtime/Booking/owner membership | Yes | PASS: composite keys/FKs and origin-line assertions |
| DR-006–DR-007; NFR-CONC-001/002 | No duplicate paid seat or valid Hold | Yes | PASS: sold/active uniqueness plus ordered write protocol |
| DR-008–DR-011, DR-020–DR-024 | Payment-backed Ticket issuance, Booking QR, independent check-in | Yes | PASS: atomic aggregate, unique identities, guarded Ticket transition |
| DR-012–DR-018 | Arithmetic, time and immutable snapshots | Yes | PASS: precision/checks, server time, immediate guards and deferred totals |
| DR-019 | Historical integrity | Yes | PASS: no cascaded transaction deletion and immutable audit |
| BRD BR-013/BR-014 | Non-overlapping Hall occupancy including buffer | Yes | PASS: stored occupancy end and GiST exclusion design |
| FR-BOOKING-016–FR-BOOKING-018; approved freeze decision | Pre-payment edits then permanent composition lock | Yes | PASS: parent and child guard coverage |
| FR-PAYMENT-010/012/014 | Idempotency, amount match and late results | Yes | PASS: immutable attempt, trusted adapter and reconciliation boundary |
| NFR-CONC-005–NFR-CONC-007 | Bounded contention and concurrency verification | Yes | PARTIAL: strategy/test cases specified, tests not executed |
| FR-PROMO-003/004 | Usage and discount eligibility | Yes | PARTIAL: schema and serialization boundary specified; business counting/scope policy remains unresolved in sources |

## 5. Implementation Summary

Created a full physical dictionary and companion enforcement specification. Both retain the 20 canonical entities and distinguish existing Auth persistence from proposed domain objects.

Selected numeric(19,4), timezone-aware timestamps, varchar/check status storage, explicit composite FKs, active-Hold/sold-seat/unresolved-payment partial uniqueness, schedule exclusion and retention policies. Added only three supporting attributes: shared Hall discriminator, sold_at marker and occupied_until schedule snapshot. These are not new entities and are explained as physical refinements.

The transaction design chooses READ COMMITTED with a conservative Showtime write gate, ordered pair/aggregate locks, bounded timeouts, restricted mutation interfaces, immediate state/freeze guards and deferred final-state assertions. It explicitly handles stale expired Holds, child mutation after freeze, uncertain provider outcomes, late success and Ticket-level check-in. No runtime object was created.

## 6. Files Created

- [Physical data dictionary v1.0](../db/physical-data-dictionary-v1.0.md).
- [Integrity enforcement design v1.0](../db/integrity-enforcement-design-v1.0.md).
- `docs/reports/2026-09-25_physical-data-design_report.md`.

## 7. Files Modified

None. Existing untracked ERD/analysis/decision artifacts and prior reports remain untouched. V1/V2, BRD/SRS, canonical ERD and application files are preserved.

## 8. Verification

| Check | Result |
|---|---|
| Entity/column coverage | PASS: read-only Python comparison verified all 20 canonical entities and every Mermaid attribute; 151 physical columns include the 13 previously documented descriptive fields and three explicit supporting columns |
| Keys, composite targets and index design | PASS at specification level: all seven composite references use existing typed columns and declared nonpartial unique target tuples; V1/V2 column types/nullability match the dictionary; manual predicate/lock-order review and official PostgreSQL references checked |
| Links, requirement IDs, naming and template | PASS: no broken local links, unknown explicit BR/FR/DR/NFR identifiers, object names over 63 bytes or unexpected trailing whitespace; template sections 1–12 and Convention Compliance present; `git diff --check` passed |
| Source preservation | PASS: SHA-256 for BRD v1.2, SRS v1.2, V1 and V2 matches pre-authoring values; repository status adds only this task's three documents to pre-existing untracked artifacts |
| TypeScript / ESLint / build | NOT RUN: no application edits |
| SQL execution / Flyway / live schema | NOT RUN: no migration or database mutation requested |
| Concurrency / integration tests | NOT RUN: future acceptance cases documented; no implemented routines to test |

## 9. Requirement Reconciliation

- PASS: every requested physical-design topic is covered, including defaults and composite null semantics.
- PASS: existing V1/V2 structure and limitations distinguished from future proposed constraints.
- PASS: no unrelated entity, migration, application code or BRD/SRS change.
- PASS: logical choices remain unchanged; physical refinements and performance tradeoffs are explicit.
- PARTIAL: executable implementation, deployment permission validation, provider/promotion policy and load validation remain necessary before production readiness.

## 10. Deviations / Conflicts

No requirement document was changed and no new requirement ID was invented.

- HIGH, remaining policy prerequisite: SRS §3.8 does not resolve Promotion scope/usage timing. The design specifies serialization without inventing redemption behavior; enabling Promotions requires that policy first.
- MEDIUM, explicit physical refinements: Hall discriminator, sale marker and occupancy end are absent from the logical diagram but implement its existing invariants; the original ERD is preserved.
- MEDIUM, deliberate concurrency tradeoff: per-Showtime serialization favors simple MVP correctness over maximum throughput. Performance is not claimed without load tests.
- MEDIUM, external trust: constraints cannot verify gateway authenticity or operator permissions by themselves; protected routines trust authenticated/verified backend entry points.
- LOW, legacy gaps: User SQL status is nonblank rather than the Java enum; V2 hash length/shape and revocation chronology remain unchanged. Later tightening requires forward migration/data audit.

Existing Convention Conflicts: historical source filenames retain their established naming under the preservation rule. No new naming deviation or approved exception is required.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md), including this report.

| Area | Result | Notes |
|---|---|---|
| Folder naming | PASS | Existing docs/db and docs/reports |
| File naming | PASS | Versioned kebab-case specifications and dated report |
| Code naming | NOT APPLICABLE | No application code; proposed database objects use snake_case |
| Domain terminology | PASS | Canonical entities retained |
| API/routes/imports | NOT APPLICABLE | No API implementation or endpoint contract |
| Database convention | PASS | Plural tables, id keys, snake_case FK/check/index names; existing names retained |
| Enum/status convention | PASS | Uppercase tokens, proposed encodings separated from implemented constraints |
| Documentation convention | PASS | Linked requirements/technical sources, traceability, scope and actual verification limitations |

## 11. Known Limitations

This is a design specification, not runnable DDL. No PostgreSQL objects or extension were created. Runtime behavior of triggers, routines, privileges, deadlocks and query plans is unverified. Provider reference scope, currency contract, Promotion policy, Movie status vocabulary and layout validation need confirmation before their respective features are enabled.

## 12. Next Recommended Step

Resolve listed business/provider prerequisites, then request migration authoring and PostgreSQL integration/concurrency tests as a separate task. Preserve historical migration checksums and implement enforcement with tables rather than shipping an unguarded interim schema.
