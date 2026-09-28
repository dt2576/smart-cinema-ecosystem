import assert from "node:assert/strict";
import test from "node:test";

const { parseMovieQuery, movieQueryString, isMovieId, safeMediaUrl, MOVIE_SORT_OPTIONS } = await import("./movie-query" + ".ts") as typeof import("./movie-query");

test("query defaults match the approved contract", () => {
  assert.deepEqual(parseMovieQuery(new URLSearchParams()), { q: "", genreId: "", page: 0, size: 20, sort: "title,asc" });
});

test("literal title input, Unicode and large Genre IDs survive query round trip", () => {
  const query = parseMovieQuery(new URLSearchParams({ q: "  Ánh sáng %_  ", genreId: "9007199254740993", page: "2", size: "17", sort: "releaseDate,desc" }));
  assert.equal(query.q, "Ánh sáng %_");
  assert.equal(query.genreId, "9007199254740993");
  assert.deepEqual(parseMovieQuery(new URLSearchParams(movieQueryString(query))), query);
  assert.equal(new URLSearchParams(movieQueryString({ ...query, genreId: "" })).has("genreId"), false);
});

test("all six approved sorts are accepted without rating or popularity aliases", () => {
  for (const option of MOVIE_SORT_OPTIONS) assert.equal(parseMovieQuery(new URLSearchParams({ sort: option.value })).sort, option.value);
  for (const sort of ["rating,desc", "popularity,desc", "releaseDate,ASC"]) assert.throws(() => parseMovieQuery(new URLSearchParams({ sort })));
});

test("invalid, repeated and unsupported URL parameters produce recoverable validation errors", () => {
  for (const raw of ["q=a&q=b", "status=PUBLISHED", "genreId=", "genreId=9223372036854775808", "page=-1", "page=2147483648", "page=1.1", "size=0", "size=101", "sort="]) {
    assert.throws(() => parseMovieQuery(new URLSearchParams(raw)), Error, raw);
  }
  assert.equal(parseMovieQuery(new URLSearchParams({ q: "🎬".repeat(255) })).q.length, 510);
  assert.throws(() => parseMovieQuery(new URLSearchParams({ q: "🎬".repeat(256) })));
});

test("Movie IDs remain strings across the full positive bigint range", () => {
  for (const id of ["1", "0001", "9007199254740993", "9223372036854775807"]) assert.equal(isMovieId(id), true);
  for (const id of [0, 1, "0", "-1", "1e3", "dune", "1/2", "9223372036854775808"]) assert.equal(isMovieId(id), false);
});

test("media accepts HTTP(S) only, without embedded credentials or executable links", () => {
  assert.equal(safeMediaUrl("https://example.test/trailer?id=1"), "https://example.test/trailer?id=1");
  for (const url of [null, "", "javascript:alert(1)", "data:text/html,hi", "//example.test/image", "https://user:secret@example.test"]) assert.equal(safeMediaUrl(url), null);
});
