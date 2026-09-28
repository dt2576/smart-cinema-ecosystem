# Smart Cinema Movie Catalog Backend Report

## 1. Task Information

Task: Implement the finalized Movie catalog backend.
Date: 2026-09-25.
Module: Movie catalog.
Type: Backend implementation and PostgreSQL verification.
Status: COMPLETE for the authorized read endpoints, mappings and validation scope.

## 2. Requested Work

Implement Movie/Genre persistence mappings and repositories, public catalog/detail reads, title search, Genre filtering, pagination/sorting, PUBLISHED-only visibility, DTOs, ProblemDetail errors and applicable publication/lifecycle validation. Preserve V3; exclude Cinema/Showtime discovery and admin CRUD.

## 3. Documents Reviewed

- Development/backend workflows; canonical project conventions; coding, documentation, traceability and convention-enforcement rules; report template.
- [Finalized Movie contract](../api/movie-service-contract-v1.0.md) and its adopted decision context.
- [SRS v1.2](../srs/srs-v1.2.md), section 3.2 FR-MOVIE-001/002/003/006/007; BRD/database authority referenced by the contract.
- [V3](../../backend/src/main/resources/db/migration/V3__create_movie_catalog_tables.sql), current Auth mappings/security, Maven configuration and test patterns.
- Technical references: [PostgreSQL transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html) and [Spring declarative transactions](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html).

## 4. Requirements Traceability

| Requirement | Description | Applicable | Result |
|---|---|---|---|
| FR-MOVIE-001 | Visible catalog | Yes | PASS: public GET, explicit PUBLISHED predicate |
| FR-MOVIE-002 | Movie detail | Yes | PASS: public detail DTO, hidden/missing uniform 404 |
| FR-MOVIE-003 | Movie search | Yes | PASS: title literal substring, strict filters, deterministic sorting and pagination |
| FR-MOVIE-006 | Movie lifecycle | Validation subset | PASS scoped validator; full status-management feature remains PARTIAL because no writes were requested |
| FR-MOVIE-007 | Genre association | Read/filter subset | PASS mappings/filter/all-associated-Genre responses; administration remains deferred |

No new requirement IDs or Movie states were introduced.

## 5. Implementation Summary

### Persistence and queries

Added JPA mappings for all V3 Movie/Genre/association columns. MovieGenre preserves the association's surrogate ID and pair uniqueness; no cascading write behavior is introduced. Stored Movie status is mapped as text so an unknown legacy token can be excluded safely instead of causing enum hydration failure. MovieStatus declares only DRAFT, PUBLISHED and UNPUBLISHED for service validation.

MovieRepository binds filter values in PostgreSQL queries, escapes literal percent/underscore/escape characters and selects ordering from fixed SQL fragments. Genre matching uses EXISTS so Movie counts and pages are not multiplied by association rows. A separate bounded query loads all Genres for the selected page, ordered using database case conversion and ID tie-breaking. MovieService wraps count, page and Genre reads in one read-only REPEATABLE_READ transaction; no shared cache is introduced.

### Public HTTP contract

Added only GET `/api/v1/movies` and GET `/api/v1/movies/{id}`. Security permits these exact GET route patterns without granting write or preview access. Both reads require PUBLISHED in the database predicate; Admin has no bypass.

MovieQuery validates unknown/repeated parameters, numeric ranges, query length by Unicode code points and the approved sort allowlist. It uses long offset arithmetic. Pagination returns accurate totals even for pages beyond the result set; release-date ordering places NULL last in either direction. DTOs preserve bigint IDs as strings, optional nulls, and posterUrl/trailerUrl mappings. Invalid requests return 400 ProblemDetail with parameter errors; missing/hidden detail returns uniform 404 ProblemDetail.

### Publication boundary

MoviePublicationPolicy validates the adopted transition matrix and all six publication fields, including positive duration, finite release date and text bounds. It revalidates publication for PUBLISHED-to-PUBLISHED content changes and UNPUBLISHED-to-PUBLISHED transitions; optional description/trailerUrl may be null. Unknown status tokens are rejected by the validator.

This is a validation service, not a mutation service: it performs no database writes and is not invoked during GET reads. Future administration must authorize the caller, validate the current persisted state, and write atomically through the approved configuration boundary. No admin CRUD, creation endpoint, transaction locking for mutations, or schema change was added.

## 6. Files Created

Under `backend/src/main/java/com/smartcinema/movie/`:

- `Movie.java`, `Genre.java`, `MovieGenre.java`, `MovieStatus.java`.
- `MovieRepository.java`, `GenreRepository.java`, `MovieService.java`.
- `MovieController.java`, `MovieQuery.java`, `MovieExceptionHandler.java`.
- `InvalidMovieRequestException.java`, `MovieNotFoundException.java`, `MoviePublicationPolicy.java`.
- `dto/GenreResponse.java`, `dto/MovieSummary.java`, `dto/MovieDetail.java`, `dto/MoviePage.java`.

Under `backend/src/test/java/com/smartcinema/movie/`:

- `MovieQueryTests.java`.
- `MoviePublicationPolicyTests.java`.
- `MovieCatalogPostgresTests.java`.
- `MovieSnapshotPostgresTests.java`.

Also created this report.

## 7. Files Modified

- `backend/src/main/java/com/smartcinema/auth/AuthSecurityConfiguration.java`: public GET matchers only.
- `backend/src/test/java/com/smartcinema/SmartCinemaApplicationTests.java`: mock new repositories in the existing database-free context and test anonymous Movie reads.

No migration, dependency, application configuration, contract, BRD or SRS change. Existing untracked artifacts were preserved.

## 8. Verification

| Check | Result |
|---|---|
| Build and full test suite | PASS: `mvn verify`, 84 tests, zero failures/errors/skips |
| PostgreSQL integration | PASS: 8 endpoint/data tests plus 1 independent-connection snapshot test on PostgreSQL 18.4 |
| Hibernate schema validation | PASS: full application contexts initialized against Flyway V1–V3 with existing ddl-auto=validate and all new entities |
| Public access/visibility | PASS: anonymous list/detail, authenticated reads, hidden/unknown/missing detail, no Admin bypass; write/preview access not made public |
| Search/filter | PASS: case-insensitive title-only matching; literal %, _, ! and backslash; preserved accents; Genre AND title, missing Genre, all associations and no duplicate Movie results |
| Pagination/sorting | PASS: every approved field/direction, ties, NULLS LAST, long offsets, page totals and out-of-range pages |
| DTO/errors | PASS: large bigint string ID, explicit optional nulls, empty Genres, media names, parameter ProblemDetail and uniform hidden 404 |
| Lifecycle/publication | PASS: transition matrix, unknown states, each missing publication field, republication/published edits, invalid values and optional fields |
| Snapshot consistency | PASS: asserted transaction_isolation=repeatable read and transaction_read_only=on inside the actual service transaction; an independent connection committed a second Movie after count, but the response still contained one item and total=1 |
| Database cleanup | PASS: verification movies/genres/movie_genres counts are all zero after tests |
| Local existing catalog audit | PASS: smart_cinema currently contains zero Movies, zero unknown statuses and zero incomplete PUBLISHED rows |
| Preservation/format | PASS: V1/V2/V3 and BRD/SRS SHA256 unchanged; git diff --check and new-file whitespace/link checks |
| Frontend/TypeScript/ESLint | NOT RUN: no frontend changes |

### Reproduction and environment

A dedicated local database `smart_cinema_movie_test_20260925_1857` was created for this run; the existing application database was only read for the catalog audit. Verification used these process environment variables before running `mvn verify` in `backend`:

```powershell
$env:DB_URL = 'jdbc:postgresql://localhost:5432/smart_cinema_movie_test_20260925_1857'
$env:MOVIE_DB_TESTS = 'true'
mvn verify
```

Supply database credentials through the existing environment configuration where needed; no credentials were added to files. For repeat runs, use a disposable empty database with Flyway enabled. PostgreSQL test classes are opt-in through MOVIE_DB_TESTS; without it, the nine database tests are skipped while database-free tests remain runnable. The actual final verification enabled them and skipped none.

Endpoint fixtures roll back. The snapshot test commits uniquely named temporary Movies on separate connections and removes them in finally. The verification database remains available with schema/history and no Movie fixtures; identity sequences may have advanced. No verification application process remains running. The Maven log is in the operating-system temporary directory; compiled artifacts remain under ignored backend/target.

Flyway checksums observed: V1 `1536752408`, V2 `1495804464`, V3 `1822747767`; all successful. V3 file SHA256 remains `261CA377E66BAF275FDC184FE75683DF1936EFCFD96E661E68E5FE3329800851`.

## 9. Requirement Reconciliation

PASS for all requested implementation scope. The public catalog is independent of screening dates, Cinema and Showtime. Unknown statuses fail closed. Migrations and approved status vocabulary are preserved. Full admin Movie/Genre management is intentionally not implemented; the publication validator does not claim to enforce direct SQL writes or provide an atomic mutation workflow.

## 10. Deviations / Conflicts

No approved-contract deviation. The nullable-date integration fixture deliberately exercises legacy PUBLISHED data admitted by V3 and NULLS LAST behavior; it does not weaken publication validation. Production data must still satisfy the adopted publication policy before rollout.

Existing Convention Conflicts: historical requirement filenames remain untouched. Git reports its existing LF-to-CRLF checkout normalization advisory for changed Java files; no whitespace errors or convention exceptions were introduced.

## Convention Compliance

Checked against [project conventions](../development/project-conventions.md), including this report.

| Area | Result | Evidence |
|---|---|---|
| Folder/file naming | PASS | Lowercase Java movie/dto packages, PascalCase Java classes, dated kebab-case report |
| Code naming | PASS | Standard Java names and records; no Service/ServiceImpl duplication |
| Domain/status terminology | PASS | Movie, Genre, MovieGenre and three adopted uppercase states |
| API convention | PASS | Existing /api/v1 plural resource routes; camelCase DTO/query fields |
| Database convention | PASS | Exact V3 table/column mappings and no migration edits |
| Documentation convention | PASS | New report with traceability, evidence, limitations and source links |
| Frontend routes/imports/components | NOT APPLICABLE | No frontend changes |

## 11. Known Limitations

No admin writes or Genre-list endpoint. Lifecycle/publication validation requires future authorized writers to invoke it atomically; it does not retroactively change V3 constraints. Detailed rating/language vocabularies and media URL validation remain deferred by the contract. Explicitly invalid Bearer credentials still follow existing resource-server authentication failure handling; anonymous requests need no credentials. Search/index performance was not load-tested. Pagination is consistent within a response, not a snapshot across separate requests.

## 12. Next Recommended Step

Integrate the public Movie endpoints into the client using the finalized response contract. Scope any future catalog mutation workflow separately, including authorization and the approved configuration-write boundary.
