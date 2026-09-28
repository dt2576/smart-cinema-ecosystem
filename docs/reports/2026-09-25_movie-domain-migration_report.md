# Smart Cinema Movie Domain Migration Report

## 1. Task Information

Task: Implement the approved Movie domain persistence.  
Date: 2026-09-25  
Module: Movie catalog  
Type: PostgreSQL/Flyway migration and database verification  
Status: COMPLETE for the requested migration scope.

## 2. Requested Work

Create the next Flyway migration for `movies`, `genres` and `movie_genres`, preserve V1/V2, verify on local PostgreSQL, and introduce no other domain tables or invented Movie business states.

## 3. Documents Reviewed

- [Physical dictionary v1.0](../db/physical-data-dictionary-v1.0.md), common rules, sections 3.4–3.6, keys, indexes and deletion policies.
- [Integrity enforcement v1.0](../db/integrity-enforcement-design-v1.0.md), enforcement boundaries and unresolved Movie publication policy.
- [Logical ERD](../db/erd/smart-cinema-logical-erd.md), Movie/Genre entities, cardinalities and duplicate-pair rule.
- [SRS v1.2](../srs/srs-v1.2.md), section 3.2; [BRD v1.2](../brd/brd-v1.2.md), BR-005–BR-007.
- Project Scope v1.0 Movie Management and Business Analysis v2.1 Movie context; canonical database documents provide the implementation baseline.
- Existing V1/V2 SQL, backend Maven/application configuration, development/backend workflows, coding/document/traceability rules, project conventions and report template.

## 4. Requirements Traceability

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| FR-MOVIE-001 | View Movie Catalog | Yes, persistence foundation | PARTIAL end-to-end: Movie storage provided; visibility/query behavior remains application work |
| FR-MOVIE-002 | Movie Detail | Yes, persistence foundation | PARTIAL end-to-end: approved detail columns provided; endpoint not implemented |
| FR-MOVIE-003 | Movie Search | Yes, persistence foundation | PARTIAL end-to-end: relational catalog and Genre links provided; search/filter behavior not implemented |
| FR-MOVIE-007 | Genre Management | Yes | PASS database scope: valid parent FKs and unique Movie/Genre pairs; administration flow deferred |
| BR-005–BR-007 | Shared catalog, Movie information and discovery | Yes, supporting requirements | PARTIAL end-to-end; no claim of complete user-facing functionality |

Requirement IDs above are from BRD/SRS v1.2. No new requirement IDs were introduced.

## 5. Implementation Summary

Added `V3__create_movie_catalog_tables.sql` with exactly 15 approved columns across three tables. IDs are bigint identities with named PKs. Text lengths, optional fields, positive integer duration, finite optional release date and required values follow the dictionary. Optional text accepts NULL but rejects space-only strings using the approved BTRIM rule.

Movie status is `varchar(30)` with nonblank and `^[A-Z][A-Z0-9_]*$` checks, without enum membership, default or seed states. Titles and Genre names are not unique. `movie_genres` implements two immediate, nondeferrable FKs with NO ACTION for update/delete, `uq_movie_genres_pair(movie_id, genre_id)`, and the B-tree reverse index `idx_movie_genres_genre(genre_id, movie_id)`. PK/unique constraints supply the other indexes; no redundant query indexes were added.

No application mappings, endpoints, dependencies, timestamps, monetary columns or unrelated tables were introduced. A repeatable PostgreSQL verification script tests valid values and expected SQLSTATE failures in a rolled-back transaction.

## 6. Files Created

- [V3 migration](../../backend/src/main/resources/db/migration/V3__create_movie_catalog_tables.sql)
- [Database verification script](../../test/backend/movie-domain-migration.sql)
- This report.

## 7. Files Modified

None. Existing untracked design documents/reports and PDF were preserved. V1/V2, BRD/SRS and application configuration were not edited.

## 8. Verification

| Check | Result and evidence |
|---|---|
| Build and existing tests | PASS — `mvn verify` in `backend`; 55 tests, zero failures/errors/skips; BUILD SUCCESS |
| Local database upgrade | PASS — PostgreSQL 18.4 at localhost:5432, database `smart_cinema`; application startup through packaged Spring Boot jar applied V3 to existing V1/V2 history |
| Repeat startup/Flyway validation | PASS — validated 3 migrations; schema public up to date, no migration necessary |
| Hibernate compatibility | PASS for existing Auth mappings — normal startup with existing `ddl-auto=validate`, EntityManagerFactory initialized and application ready. Movie mappings NOT APPLICABLE: none introduced |
| Catalog inspection | PASS — information_schema columns and pg_constraint/pg_indexes inspected: 15 columns, three identity PKs, two FKs, pair uniqueness, approved checks and five total indexes including constraint indexes |
| Integrity behavior | PASS — `psql -X -h localhost -U postgres -d smart_cinema -w -v ON_ERROR_STOP=1 -f test/backend/movie-domain-migration.sql`; notice: Movie migration integrity checks passed |
| Positive behavior | PASS — minimal nullable Movie, complete optional values, positive duration, duplicate titles and Genre names, valid association and explicit unlink before parent deletion |
| Negative behavior | PASS — blank text, required NULLs, zero/negative duration, infinite dates, malformed status, oversized title, blank/NULL Genre name, duplicate pair, NULL association keys, missing parents, linked parent deletes and key updates |
| Fixture cleanup | PASS — transaction rolled back; all three domain tables contained zero rows afterward. Identity sequences can advance despite rollback |
| Repository check | PASS — `git diff --check`; new files inspected for scope and whitespace; V1/V2 SHA256 unchanged |
| Frontend/TypeScript/ESLint | NOT RUN — no frontend changes |
| Fresh empty-database install | NOT RUN — verified the requested upgrade against the existing local V1/V2 database |

Runtime invocation: `java -jar target/smart-cinema-backend-0.0.1-SNAPSHOT.jar --server.port=0` from `backend`. A second run used INFO logging overrides for readable evidence. Both verification application processes were stopped afterward; the PostgreSQL service remains running and V3 remains applied. Maven/startup logs were written to the operating-system temporary directory; no credentials are stored in this report.

Flyway history after verification:

| Version | Checksum | Success |
|---|---|---|
| 1 | 1536752408 | true, unchanged |
| 2 | 1495804464 | true, unchanged |
| 3 | 1822747767 | true |

Preserved file SHA256:

- V1: `BB19D0F956053FCD2C7A9CC04B27565BB752036D918058088F61A20235DB4DEA`
- V2: `C3D7C8618D4C39A14BF74AAB1A572381723992AC9E0541FBD80207142899C87A`

## 9. Requirement Reconciliation

- PASS: approved Movie domain physical structure, relationships, checks and indexes implemented.
- PASS: V1/V2 history and file bytes preserved; migration version 3 was the next available version.
- PASS: no Cinema, Hall, Seat, Showtime, Booking, Promotion, Payment or Ticket table created.
- PASS: no additional Movie business states, requirement edits or application code.
- PARTIAL at feature level: catalog visibility, publication validation, search, authorization and Genre administration are future service work.

## 10. Deviations / Conflicts

No migration-level deviation from the approved dictionary. Exact Movie publication/status vocabulary remains unresolved in the design; the migration enforces only its approved format. `TEST_VALUE` in the verification script is synthetic and is never seeded or declared an allowed business state.

The enforcement design also describes guarded configuration writes, immutable identities and production privilege separation. Those routines/roles are outside this explicitly limited columns/keys/checks/indexes task; NO ACTION prevents changing referenced keys but does not make every unreferenced identity immutable. Complete the write boundary before enabling production catalog mutations.

Existing Convention Conflicts: historical requirement filenames contain spaces/underscores and are preserved. No exception is requested for new artifacts. Existing design documents still describe domain persistence as proposed; this dated report records the implemented Movie subset without rewriting the design baseline or claiming the remaining domain is implemented.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md), including this report.

| Area | Result | Evidence |
|---|---|---|
| Folder naming | PASS | Existing backend migration and test/backend locations |
| File naming | PASS | Established Flyway V-number convention; kebab-case test and dated report task name |
| Code/database naming | PASS | Plural snake_case tables, snake_case columns/constraints/indexes and SQL test helper |
| Domain terminology | PASS | Movie, Genre and Movie Genre retained |
| Status naming | PASS | Approved uppercase token format; no invented vocabulary |
| Documentation | PASS | New report, required sections, relative links, no historical report overwritten |
| API/routes/imports/Java | NOT APPLICABLE | No changes in these categories |

## 11. Known Limitations

The SQL verification script is run explicitly through psql, not by Maven. Existing Hibernate validation covers mapped Auth entities only; PostgreSQL catalog inspection and behavioral checks verify the new tables. Index performance was not benchmarked. URL syntax, Genre duplicate-name policy, Movie publication completeness and status vocabulary remain service/configuration responsibilities. V3 must remain immutable once shared; later schema corrections require a new migration.

## 12. Next Recommended Step

Resolve the approved Movie status vocabulary and service contracts before implementing Movie mappings and catalog operations. Preserve V3 history and rerun the database script against a disposable verification database for subsequent changes.
