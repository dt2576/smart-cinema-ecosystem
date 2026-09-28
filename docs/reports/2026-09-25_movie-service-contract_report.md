# Smart Cinema Movie Service Contract Report

## 1. Task Information

Task: Define Movie service behavior before implementation.
Date: 2026-09-25.
Module: Movie catalog.
Type: Contract documentation.
Status: Contract documented; lifecycle adoption and publication prerequisites remain open.

## 2. Requested Work

Define Movie states/lifecycle, customer visibility, detail access, search/filter inputs, pagination/sorting and Genre filtering; document unresolved publication rules. No code, migrations or Cinema/Showtime behavior.

## 3. Documents Reviewed

- Development/backend workflows, coding/document/traceability rules, project conventions and report template.
- [BRD v1.2](../brd/brd-v1.2.md), BR-005–BR-007.
- [SRS v1.2](../srs/srs-v1.2.md), sections 3.2, 5.3 and View Movie role matrix.
- Business Analysis v2.1, chain-wide Movie catalog and distinction from Cinema screening availability.
- [Physical dictionary](../db/physical-data-dictionary-v1.0.md), [integrity design](../db/integrity-enforcement-design-v1.0.md), [logical ERD](../db/erd/smart-cinema-logical-erd.md) and prior model analysis's unresolved policy notes.
- [V3 migration](../../backend/src/main/resources/db/migration/V3__create_movie_catalog_tables.sql); current security matcher and ProblemDetail usage inspected for compatibility, without modification.

## 4. Requirements Traceability

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| FR-MOVIE-001 | Customer catalog, permitted display only | Yes | PASS contract scope: visibility allowlist and consistent filtering defined |
| FR-MOVIE-002 | Movie detail | Yes | PASS contract scope: response fields and hidden/missing behavior defined |
| FR-MOVIE-003 | Valid Movie search filters | Yes | PASS contract scope: inputs, matching, pagination and ordering defined |
| FR-MOVIE-007 | Valid Genre association | Yes | PASS contract scope: ID-based association filtering, duplicates and missing Genre semantics |
| FR-MOVIE-006 | Admin Movie status management | Supporting lifecycle context | PARTIAL: lifecycle proposal explicit; adoption not asserted |
| BR-005–BR-007 | Shared catalog, information and discovery | Yes | PARTIAL full business scope: Cinema/Showtime discovery deferred |

No requirement ID was created. PASS above refers to documentation coverage, not implemented behavior.

## 5. Implementation Summary

Created [Movie service contract v1.0](../api/movie-service-contract-v1.0.md). Proposed DRAFT/PUBLISHED/UNPUBLISHED separates publication from screening dates; only PUBLISHED is customer-visible. Source documents do not define this vocabulary, so it is explicitly pending confirmation rather than falsely marked previously approved.

Specified list/detail read operations, fail-closed visibility, authenticated role baseline, title substring search, one Genre ID filter, zero-based pagination, bounded size, sort allowlist and deterministic tie-breaking. Defined DTO fields, bigint ID representation, nullable attributes, errors, Genre semantics, database/service responsibility boundaries and acceptance scenarios. Publication completeness and related policy remain explicit prerequisites.

## 6. Files Created

- `docs/api/movie-service-contract-v1.0.md`
- `docs/reports/2026-09-25_movie-service-contract_report.md`

## 7. Files Modified

None during this documentation task. The prior Movie migration, SQL verification script and report already existed when this task began; they were not changed. Other untracked artifacts were preserved.

## 8. Verification

| Check | Result |
|---|---|
| Source/schema reconciliation | PASS: no unsupported database fields, Genre status, uniqueness or date-driven visibility |
| Contract consistency | PASS: list/search/detail share visibility; Genre matching/counts do not multiply Movie rows; hidden IDs return uniform 404 |
| Documentation links and whitespace | PASS: relative local links checked; new files checked for trailing whitespace; git diff --check |
| V1/V2/V3 and BRD/SRS preservation | PASS: no edits in this task; file hashes inspected |
| Build/tests/TypeScript/ESLint | NOT RUN: documentation only; no new executable behavior |
| Acceptance scenarios | Specified, NOT EXECUTED; future implementation validation |

## 9. Requirement Reconciliation

PASS: requested contract topics covered, no code/migration edits, no Cinema/Showtime functionality, no unrelated entities. PARTIAL: approved status vocabulary cannot be inferred from source documents. A user clarification was requested; pending response, the recommended lifecycle remains clearly labeled a proposal. Publication completeness is unresolved as permitted by the task.

## 10. Deviations / Conflicts

The request says approved status values, while the current dictionary expressly defers that vocabulary. Approval is not fabricated. The contract provides a concrete candidate and records the adoption gap. Exact required publication fields and guest access are also absent from the requirements; no requirement document is silently changed.

Current application security has no Movie-specific routes. The proposed read access contract describes future behavior, not existing access. BR-007's screening-related discovery cannot be fully delivered within this task's exclusion of Cinema/Showtime behavior.

Existing Convention Conflicts: historical filenames retain existing styles. No new exception requested.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md), including this report.

| Area | Result | Notes |
|---|---|---|
| Folder/file naming | PASS | Existing docs/api and docs/reports; versioned kebab-case contract and dated report |
| Domain terminology | PASS | Movie, Genre and Movie catalog retained |
| API convention | PASS | Proposed /api/v1/movies resource routes; camelCase parameters/DTO fields |
| Status naming | PASS | Proposed uppercase snake-case tokens; approval explicitly distinguished |
| Database convention | PASS | Existing snake_case schema referenced accurately; no objects changed |
| Documentation | PASS | Relative source links, required report sections, history preserved |
| Code/import/component naming | NOT APPLICABLE | No implementation |

## 11. Known Limitations

This is a proposed contract, not an implemented service or proof of product approval. Lifecycle, publication completeness and access decisions must be reconciled before affected implementation. No query performance measurements or service tests were performed. Genre filter-option discovery and administration endpoints remain deferred.

## 12. Next Recommended Step

Adopt the lifecycle vocabulary and publication/access policy, update the contract's decision status with that evidence, then implement only separately authorized Movie service scope.
