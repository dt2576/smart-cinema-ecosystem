# Smart Cinema Movie Service Contract v1.0

Date: 2026-09-25

Status: MVP lifecycle, visibility, public GET access and publication fields adopted by explicit user instruction on 2026-09-25. Implementation remains separate.

## 1. Scope and authority

This contract defines the Movie catalog read service and the minimum lifecycle semantics needed to control visibility. Sources: [SRS v1.2](../srs/srs-v1.2.md) sections 3.2 and 5.3 (FR-MOVIE-001/002/003/007), [BRD v1.2](../brd/brd-v1.2.md) BR-005–BR-007, [logical ERD](../db/erd/smart-cinema-logical-erd.md), [physical dictionary](../db/physical-data-dictionary-v1.0.md) and [integrity enforcement design](../db/integrity-enforcement-design-v1.0.md). [V3](../../backend/src/main/resources/db/migration/V3__create_movie_catalog_tables.sql) is implemented persistence, not an implementation of this service.

The requirements establish a chain-wide catalog, Movie details, valid filters and Genre association. They do not enumerate Movie states, public anonymous access, publication completeness or pagination defaults. The user's 2026-09-25 decision adopts lifecycle, PUBLISHED-only visibility, public GET access and publication fields below; these are service decisions, not quotations or amendments to BRD/SRS. Existing search/pagination choices are retained. The [finalization report](../reports/2026-09-25_movie-service-contract-finalization_report.md) supersedes the earlier report's pending status for these decisions. Lifecycle ownership relates to FR-MOVIE-006; write endpoints and the full administration workflow are outside this contract.

No Cinema/Showtime filter, screening availability, ticket price, booking action or Movie-to-Cinema association is defined. Release date is descriptive metadata and does not establish whether a film is showing or bookable. BR-007's full screening discovery remains deferred with FR-MOVIE-008.

## 2. Movie status and lifecycle

Adopted MVP vocabulary:

| Status | Meaning | Customer list/search/detail |
|---|---|---|
| DRAFT | Catalog content being prepared; never yet published in this lifecycle | Hidden |
| PUBLISHED | Explicitly released for customer catalog display | Visible |
| UNPUBLISHED | Previously published content withdrawn from customer display | Hidden |

MVP lifecycle:

| From | To | Rule |
|---|---|---|
| Creation | DRAFT | Future service explicitly supplies status; no database default |
| DRAFT | PUBLISHED | Admin action; publication policy must pass |
| PUBLISHED | UNPUBLISHED | Admin withdraws visibility; retain Movie and Genre links |
| UNPUBLISHED | PUBLISHED | Admin republishes; revalidate publication policy |
| Any recognized state | Same state | No-op; not a new publication event |

Other transitions are rejected; no automatic date-based transitions, terminal deletion state or scheduled publishing. Editing a PUBLISHED Movie must preserve publication validity in the same committed operation; otherwise reject the edit or explicitly unpublish first. A later implementation must validate transitions against the current persisted state atomically. No locking implementation is selected here.

The three labels fit V3's varchar/format checks. V3 deliberately accepts other uppercase tokens: service writes must enforce the adopted vocabulary, and customer reads must use an explicit PUBLISHED allowlist. Unknown stored tokens are hidden, never interpreted as published or mapped to a guessed state. Review existing values before service rollout; do not rewrite V3 or silently relabel stored records.

## 3. Visibility and access

- Customer collection and search results contain only PUBLISHED Movies. Filters can narrow this set, never broaden it. No caller-supplied `status` parameter is supported.
- Detail uses the identical visibility predicate. A valid ID that is missing, DRAFT, UNPUBLISHED or an unknown status yields the same 404 response; do not reveal a hidden title/status in errors.
- Both catalog and detail GET routes are public: anonymous callers require no authentication or role. Authenticated callers receive the same visible data; an Admin receives no hidden-content bypass. This adopted access decision supplements the SRS role matrix, which did not specify anonymous readers.
- A future administration preview uses a separately authorized surface; none is defined here. No read permission implies Movie/Genre write permission.
- Future or past release dates and zero Genre associations do not independently change visibility. Publication requires a non-null releaseDate under section 8; drafts/withdrawn records may retain NULL. Visibility uses the status allowlist, not a date-based status. Audit any pre-existing PUBLISHED rows against publication requirements before rollout.
- Each request evaluates committed visibility at read time. A Movie can disappear between list and detail requests after unpublication. The service must not serve hidden details from a stale cache; this contract introduces no caching mechanism.

## 4. Read operations and filter inputs

Public read routes use existing repository API conventions:

- `GET /api/v1/movies`: catalog and search through one collection contract.
- `GET /api/v1/movies/{movieId}`: visible Movie detail.

`movieId` is a positive base-10 bigint ID within PostgreSQL signed bigint range. Invalid syntax/range is 400; valid but unavailable is 404.

| Query parameter | Format/default | Semantics and validation |
|---|---|---|
| q | Optional string, max 255 Unicode code points after trimming | Case-insensitive literal substring of title only. Trim surrounding whitespace; blank becomes absent. Preserve internal spaces and diacritics; no fuzzy/stem/accent-insensitive or description search. `%` and `_` are literal input, never wildcard operators |
| genreId | Optional single positive bigint ID | Match exact Genre identity through movie_genres. A well-formed nonexistent/unassociated Genre yields an empty result, not 404. Multiple IDs/repeated parameter are rejected |
| page | Integer, default 0 | Zero-based; 0 through 2147483647; calculate offset without integer overflow |
| size | Integer, default 20 | 1 through 100 inclusive |
| sort | Single `field,direction`, default `title,asc` | Allow fields title, releaseDate, id and directions asc/desc only; exact case-sensitive tokens |

All supplied nonblank filters combine with AND, after the visibility predicate. Optional does not mean malformed values are ignored: empty genreId/page/size/sort, invalid numbers, unsupported sort values, duplicate scalar parameters and unknown query parameters return 400. Parameter order is irrelevant. No language, age-rating, duration, status, release-window or Cinema/Showtime filters are introduced in this MVP. Adding them requires a contract revision.

Case-insensitive matching follows PostgreSQL case conversion under the deployed database locale; this is not a promise of locale-independent Unicode case folding. The service must bind values and escape substring wildcard metacharacters. These are behavior requirements, not a query/index implementation.

Example: `GET /api/v1/movies?q=star&genreId=12&page=0&size=20&sort=releaseDate,desc` returns visible Movies whose title contains the literal term and which are associated with Genre 12.

## 5. Pagination, sorting and response shape

Offset pagination returns one logical Movie per item, even when it has several Genres. Count distinct Movies after every filter and visibility rule; never paginate joined Genre rows.

Title sorting uses case-insensitive title ordering under the deployed database locale, then `id ASC`. Release-date sorting uses requested direction with NULLS LAST in both directions, then `id ASC`. ID sorting uses requested direction and is already unique. Tie-breakers are mandatory. Duplicate titles remain legal. Sorting is stable for an unchanged dataset, not a cross-request snapshot: concurrent edits/publication may shift later pages.

Collection envelope:

| Field | Meaning |
|---|---|
| items | Array of Movie summaries; empty when no matches/page beyond last |
| page, size | Effective requested page and size |
| totalElements | Count of all visible matching Movies, independent of page |
| totalPages | ceil(totalElements / size), zero when no matches |
| sort | Effective normalized sort string, e.g. title,asc |

Summary fields: `id`, `title`, `duration`, `releaseDate`, `ageRating`, `language`, `posterUrl`, `status`, `genres`. Detail adds `description` and `trailerUrl`. API `posterUrl` maps to existing `movies.poster`; `trailerUrl` maps to existing `movies.trailer`. These names do not add or rename database columns. Each Genre contains `id` and `name`. No persistence association ID, availability, Showtime data or invented Movie fields are returned.

IDs serialize as decimal strings to preserve bigint precision in JavaScript clients. Duration is an integer in minutes. Dates serialize as `YYYY-MM-DD`; absent optional attributes remain explicit JSON null. Genres is an array (possibly empty), deduplicated by ID and ordered by case-insensitive name then ID ascending. Status is PUBLISHED on this surface. Pagination numeric values must be serialized without truncation. Count and items must reflect one consistent database snapshot within a response; transaction mechanics are deferred to implementation.

Successful empty searches and out-of-range pages return 200 with empty items and accurate totals. Invalid parameters return 400. Missing authentication or role does not produce 401/403 on these public GET routes. Missing/hidden detail returns 404. Error bodies follow the existing ProblemDetail-style project pattern with status, title and safe detail; validation errors identify the parameter without exposing SQL or hidden Movie data.

## 6. Genre usage

Genre is reusable chain-wide metadata. `movie_genres` supplies the many-to-many association; no minimum number of Genres is imposed by V3. Filter by ID, never by name: duplicate names are allowed by the approved schema and are not silently merged. A Movie matching the Genre is returned once and includes all its Genre associations, not only the matching Genre.

No Genre status or independent visibility flag exists. A Genre association cannot make a hidden Movie visible. Removing the selected Genre association makes the Movie stop matching that filter without unpublishing it. Foreign keys and pair uniqueness remain the integrity authority for links. Future administration must validate the referenced Genre and preserve parent links according to NO ACTION policies.

The separately authorized public `GET /api/v1/genres` endpoint now supplies filter options under the [Genre options contract](genre-options-contract-v1.0.md). It returns all stored Genres once per ID, ordered by case-insensitive name then ID; duplicate names remain separate identities. Duplicate-name editing policy and Genre administration remain deferred. Existing Movie read behavior is unchanged.

## 7. Persistence and service boundary

V3 already guarantees required title/duration/status, positive duration, finite optional release date, nonblank stored optional text, bounded varchar fields, valid Genre parents and unique association pairs. It does not enforce the three-state vocabulary, transitions, publication completeness, visibility, authorization, filter validity or pagination.

No database changes are necessary to represent the adopted vocabulary. This document creates no SQL CHECK tightening, seed values, default, timestamp, trigger, role or new entity. Future mutations must also honor the [integrity design](../db/integrity-enforcement-design-v1.0.md)'s configuration write boundary. A future schema constraint, if separately authorized, belongs in a new migration after a data audit.

## 8. Adopted publication policy and decision status

Publication requires all six fields below on initial publication, republication and edits that retain PUBLISHED status. Reject a mutation that would publish incomplete content or leave published content incomplete; do not silently unpublish it. DRAFT/UNPUBLISHED records continue to follow existing database nullability rules.

| API field | Publication requirement | Existing column |
|---|---|---|
| title | Required, nonblank, max 255 characters | movies.title |
| duration | Required positive integer, in minutes | movies.duration |
| releaseDate | Required finite calendar date | movies.release_date |
| ageRating | Required, nonblank, max 20 characters | movies.age_rating |
| language | Required, nonblank, max 100 characters | movies.language |
| posterUrl | Required, nonblank, max 2048 characters | movies.poster |

`description` and `trailerUrl` remain optional; absent values are NULL. Supplied values obey existing nonblank checks, and trailerUrl has a 2048-character limit. No minimum Genre count is introduced. Required means present and valid under these field constraints, not an empty string. The database retains nullable release_date, age_rating, language and poster for incomplete catalog records; the service enforces publication completeness.

| Decision | Status | Authority/effect |
|---|---|---|
| DRAFT / PUBLISHED / UNPUBLISHED lifecycle | ADOPTED | Explicit user MVP decision, 2026-09-25; lifecycle in section 2 |
| Only PUBLISHED customer-visible | ADOPTED | Same allowlist for catalog, search and detail |
| Public catalog/detail GET access | ADOPTED | Anonymous and authenticated readers; no role requirement |
| Six required publication fields above | ADOPTED | Validate publication, republication and edits to visible content |
| Optional description and trailerUrl | ADOPTED | No publication completeness requirement for either |
| Rating/language vocabulary and detailed URL validation | DEFERRED technical/content policy | No new vocabulary, media provider, URL reachability check or extra required field adopted here |
| Genre filter-option discovery | IMPLEMENTED separate contract | Public GET /api/v1/genres; see [Genre options contract](genre-options-contract-v1.0.md) |

The prior open status, anonymous-access and required-field decisions are closed. Remaining validation refinements do not reopen those decisions. No release-date threshold, Genre minimum or Cinema/Showtime prerequisite is required for publication. This document authorizes no implementation, seed data or database constraint change.

## 9. Acceptance scenarios for later implementation

1. Only PUBLISHED Movies appear in list/search; each hidden/unknown status and a missing ID return equivalent detail 404 responses.
2. Changing a release date alone never changes status or visibility; no Cinema/Showtime dependency is consulted.
3. Null optional fields and zero Genres serialize predictably; duplicate titles and Genre names remain separate identities.
4. Title search is case-insensitive, literal and combined with genreId using AND; wildcard-looking input is literal.
5. Multiple Genre associations do not duplicate Movie items/counts; responses include all Genres of matched Movies.
6. Defaults, page boundaries, invalid/repeated parameters, unsupported sorting, NULLS LAST and ID tie-breakers follow sections 4–5.
7. Missing Genre yields an empty collection; invalid Genre ID syntax yields 400.
8. Adopted transitions are enforced atomically by future writes; unknown statuses fail closed; publication checks apply to republishing and edits.
9. Anonymous catalog/detail requests succeed for visible Movies without credentials; authenticated callers see the same data, with no Admin bypass. Hidden detail is 404 for all readers.
10. Publication and republication reject each missing required field; edits to PUBLISHED content cannot remove one. Description/trailerUrl may be null and Genres empty. API URL fields map to existing poster/trailer columns.

These are specified acceptance scenarios, not executed application tests.
