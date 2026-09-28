# Customer Genre Options Contract v1.0

Date: 2026-09-25  
Status: Implemented under the Customer Genre options endpoint task.

## 1. Scope and sources

Public Movie filter metadata supporting SRS v1.2 FR-MOVIE-003 and FR-MOVIE-007. This is a separately authorized addition to the [Movie service contract](movie-service-contract-v1.0.md), closing the option-source dependency in the [Customer frontend implementation plan](../ui-ux/customer-frontend-implementation-plan-v1.0.md). It does not change Movie visibility, filtering, pagination or publication rules.

## 2. Request and response

`GET /api/v1/genres` is public; no session is required. It accepts no query parameters and returns `200 application/json` with a flat array:

```json
[
  { "id": "11", "name": "Action" },
  { "id": "9007199254740993", "name": "Drama" }
]
```

- `id`: Genre bigint identity serialized as a decimal string, matching Movie response Genres and the Movie catalog `genreId` input. Clients must preserve its precision.
- `name`: stored Genre name, without synthesized labels or normalization in the response.
- Empty vocabulary returns `[]`, not 404. No pagination, counts or Movie associations are returned.
- Ordering: PostgreSQL `lower(name) ASC, id ASC`, using the database locale. The ID tie-breaker makes equal/case-equivalent names deterministic.

## 3. Option membership and duplicate semantics

Return all stored Genres, including Genres with no Movie association or with only hidden Movie associations. Genre is reusable metadata with no status or visibility field. This endpoint does not disclose associated Movies or imply that matching published Movies exist. Selecting an option may correctly return an empty Movie result.

Return each Genre ID exactly once. Query the Genre table directly so multiple Movie associations cannot multiply options. V3 and the finalized Movie contract allow duplicate names: different IDs with equal or case-equivalent names remain distinct options. Merging by name would discard valid filter identities and is outside this task. No new uniqueness constraint, seed data or name-cleanup policy is introduced.

## 4. Errors and security

| Condition | HTTP result | Behavior |
|---|---|---|
| Any supplied query parameter, including empty or repeated parameters | 400 | `application/problem+json`, title `Invalid request`, detail `Genre options do not accept query parameters.`, `errors` keyed by a rejected parameter |
| Repository `DataAccessException` | 503 | `application/problem+json`, title `Genre options unavailable`, detail `Genre options are temporarily unavailable. Please try again.`; database internals are not returned |
| Invalid supplied bearer credentials | Existing security behavior | Public access does not bypass credential validation |

The public security rule covers GET on this collection path. No Genre detail or administration route is added. Existing authentication, CSRF and unmatched-route behavior remain in force. Error handling is scoped to the Genre controller and does not change Movie errors. Database failures are not represented as an empty successful vocabulary.

## 5. Frontend use and deferred scope

Fetch this complete vocabulary for the Genre selector, key options by ID, preserve server order, and send the selected ID as the single Movie `genreId`. The UI's All Genres choice means omitting that filter; it is not a fabricated Genre. Handle empty metadata and retryable failures separately. Do not derive a complete vocabulary from a paginated Movie response.

Frontend integration, Genre administration, duplicate-name editing policy, localization and any future search-dependent facet counts remain deferred. No Cinema or Showtime behavior is defined. See the [implementation report](../reports/2026-09-25_genre-options-endpoint_report.md) for verification evidence.
