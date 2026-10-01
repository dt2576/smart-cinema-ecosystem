# Admin Movie contract v1.0

Date: 2026-10-01. Status: implemented first Admin slice; migration head V10.

## 1. Authority and scope

Sources: [SRS v1.2](../srs/srs-v1.2.md) sections 3.1/3.2, 6.4, 7.2/7.6
(FR-AUTH-007, FR-MOVIE-004/005/006/007), [BRD v1.2](../brd/brd-v1.2.md)
BR-002/004/005/006 and the finalized [Movie contract](movie-service-contract-v1.0.md).
This is an additive Admin surface. Customer Movie/Genre contracts remain unchanged.
No Cinema, Showtime, Genre administration, analytics, deletion or Payment operation.

## 2. Access

All `/api/v1/admin/**` routes require an authenticated JWT with `ADMIN` authority.
Each implemented operation independently resolves the JWT subject against `users`
and requires current `role=ADMIN` and `status=ACTIVE`. A stale Admin token, unknown
subject or locally edited browser role cannot grant access. Admin scope is chain-wide.

`GET /api/v1/admin` returns `{id: string, fullName: string, role: "ADMIN"}` after
the same database check. No query parameters. This is the frontend access check,
not a replacement for authorization on each Movie operation.

Existing login/renewal/revocation and session storage are reused. Movie writes
accept explicit Bearer authorization and ignore CSRF only on this Movie resource,
consistent with existing token-based write endpoints. Responses use `no-store`.
Unauthenticated requests return 401; insufficient/stale/blocked authority returns 403.

## 3. Resources

| Method | Resource | Result |
|---|---|---|
| GET | `/api/v1/admin` | Verified active Admin identity |
| GET | `/api/v1/admin/movies` | Paginated catalog including hidden Movies |
| GET | `/api/v1/admin/movies/{movieId}` | Existing Movie detail, regardless of visibility |
| POST | `/api/v1/admin/movies` | Create DRAFT; 201 and Location header |
| PUT | `/api/v1/admin/movies/{movieId}` | Replace supported content/Genre associations; preserve status |
| PUT | `/api/v1/admin/movies/{movieId}/publication` | Apply approved publication transition |

IDs use positive decimal bigint strings in paths, responses and Genre inputs.
Malformed/out-of-range IDs return 400; absent Movie returns 404. DELETE is absent;
an authorized request receives 405. There is no hard/soft-delete state.

### Collection

Reuses Customer `q`, `genreId`, `page`, `size`, `sort` validation and deterministic
ordering from Movie v1.0. The only difference is that no PUBLISHED predicate is
applied. No status filter is added. Unknown/repeated parameters return 400.
Envelope and summary fields match the public Movie shape, with `status: string`
so unexpected stored values remain visible to Admin for diagnosis. No guessed
transition or relabeling is provided for unknown stored statuses.

### Content body

```json
{
  "title": "Movie title",
  "duration": 120,
  "releaseDate": "2026-10-01",
  "ageRating": "T13",
  "language": "Vietnamese",
  "posterUrl": "https://example.test/poster.jpg",
  "description": null,
  "trailerUrl": null,
  "genreIds": ["9007199254740993"]
}
```

- `title`: nonblank string, at most 255 Unicode code points; trimmed.
- `duration`: positive integer within PostgreSQL integer range.
- `releaseDate`: null/omitted or valid `YYYY-MM-DD`, years 0001–9999.
- `ageRating`, `language`, `posterUrl`, `trailerUrl`: null/omitted or nonblank
  text, maximum 20/100/2048/2048 code points respectively; trimmed.
- `description`: null/omitted or nonblank text; trimmed; existing TEXT storage.
- `genreIds`: required array; empty is allowed. Every element is a string ID of
  an existing Genre; duplicate identities (including `1` and `01`) are rejected.
- Unknown fields, including `status`, client IDs and unsupported Movie fields,
  are rejected. Numeric Genre IDs and fractional/string duration are rejected.
- PUT is full replacement: omitted nullable fields become null and the supplied
  Genre set replaces associations. It is not a partial patch.

Creation explicitly supplies DRAFT. A draft requires title/duration and may have
incomplete publication metadata. All write results use the existing Movie detail
fields including ordered Genres. No Movie/Genre field or schema is added.

### Publication resource

Body contains exactly `{"status":"PUBLISHED"}` or another recognized status.
Existing Movie v1.0 transitions are enforced: DRAFT → PUBLISHED,
PUBLISHED → UNPUBLISHED, UNPUBLISHED → PUBLISHED, or same-state no-op.
Returning to DRAFT and DRAFT → UNPUBLISHED are rejected. Publishing/republishing
requires title, positive duration, releaseDate, ageRating, language and posterUrl.
Description/trailer remain optional; zero Genres does not prevent publication.
Editing a PUBLISHED Movie revalidates completeness in the same transaction.

Public catalog/detail always keep their explicit PUBLISHED predicate, including
when called by an Admin. Unpublished/missing detail remains indistinguishable.
Customers must reload/refetch to see a committed catalog change; no push/cache
invalidation service is introduced.

## 4. Persistence, concurrency and historical data

Uses existing JPA `Movie`/`Genre` mappings and V3 junction persistence. No migration.
Writes lock the current User first, then the target Movie, then selected Genres
in ID order. All content, Genre links and publication validation commit together.
The Movie lock serializes concurrent edits/publication and cooperates with existing
checkout Movie locks. No Showtime, Booking, Hold, Payment, Ticket or QR writer is
called. Existing snapshots, origin identities, expiry and scheduled timestamps
remain unchanged; updating duration does not reschedule stored Showtimes.
Booking detail continues to project Movie/Cinema/Hall labels from live references
under the existing Booking contract; a title edit changes that display label,
not a stored monetary or Seat Unit snapshot. No title snapshot is introduced.

Collection/detail run in a consistent repeatable-read transaction. Administrative
writes use normal read-committed row locking. Concurrent full content edits use
serialized last-writer-wins; this slice introduces no edit version/ETag contract.

Committed mutations log actorId, movieId and action through the application logger;
rollback attempts do not emit a success audit entry. No password/token/content
payload is logged. Durable searchable administrative audit persistence/retention
remains a separate requirement and is not claimed complete here.

## 5. Errors and limitations

ProblemDetail: 400 for malformed/invalid content, Genre or transition;
401/403 for access; 404 for missing Movie; 409 for concurrency failure; 503 for
database/service unavailability. Validation supplies an `errors` field map.
Internal SQL, stack traces and secrets are excluded.

There is no approved development Admin provisioning command. Registration remains
CUSTOMER-only; this slice never seeds/promotes an Admin or invents credentials.
Manual Neon Admin verification requires a separately approved provisioning workflow
or an existing active Admin account. See [developer guide](../development/admin-movie-management.md)
and [implementation report](../reports/2026-10-01_admin-foundation-movie-management_report.md).
