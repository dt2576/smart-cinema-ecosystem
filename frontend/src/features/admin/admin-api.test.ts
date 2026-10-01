import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
const { AdminApiError, createAdminMovie, getAdminIdentity, getAdminMovie, getAdminMovies, setMoviePublication, updateAdminMovie } = await import("./admin-api" + ".ts") as typeof import("./admin-api");

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const id = "9007199254740993";
const content = { title: "Movie", duration: 120, releaseDate: null, ageRating: null, language: null, posterUrl: null, trailerUrl: null, description: null, genreIds: [id] };

test("Admin reads use bearer authorization, no cache and string IDs", async () => {
  const requests: { url: string; options: RequestInit | undefined }[] = [];
  globalThis.fetch = async (url, options) => { requests.push({ url: String(url), options }); return Response.json({ id }); };
  assert.equal((await getAdminMovie("session-token", id)).id, id);
  await getAdminMovies("session-token", "q=film&page=0");
  await getAdminIdentity("session-token");
  assert.deepEqual(requests.map(request => request.url), [`/api/v1/admin/movies/${id}`, "/api/v1/admin/movies?q=film&page=0", "/api/v1/admin"]);
  for (const request of requests) {
    assert.equal(new Headers(request.options?.headers).get("Authorization"), "Bearer session-token");
    assert.equal(request.options?.cache, "no-store");
    assert.equal(request.options?.credentials, "omit");
  }
});
test("content writes and publication remain separate and preserve Genre IDs", async () => {
  const requests: { url: string; method: string; body: unknown }[] = [];
  globalThis.fetch = async (url, options) => { requests.push({ url: String(url), method: options?.method ?? "GET", body: JSON.parse(String(options?.body)) }); return Response.json({ id }); };
  await createAdminMovie("token", content);
  await updateAdminMovie("token", id, content);
  await setMoviePublication("token", id, "PUBLISHED");
  assert.deepEqual(requests, [
    { url: "/api/v1/admin/movies", method: "POST", body: content },
    { url: `/api/v1/admin/movies/${id}`, method: "PUT", body: content },
    { url: `/api/v1/admin/movies/${id}/publication`, method: "PUT", body: { status: "PUBLISHED" } },
  ]);
});
test("authorization and validation ProblemDetail are preserved", async () => {
  for (const status of [400, 401, 403, 404, 409, 503]) {
    globalThis.fetch = async () => Response.json({ detail: "Cannot save", errors: { title: "Required" } }, { status });
    await assert.rejects(createAdminMovie("token", content), error => error instanceof AdminApiError && error.status === status && error.fieldErrors.title === "Required");
  }
});
test("network and malformed response errors remain retryable", async () => {
  globalThis.fetch = async () => { throw new Error("network"); };
  await assert.rejects(getAdminIdentity("token"), error => error instanceof AdminApiError && error.status === 0);
  globalThis.fetch = async () => new Response("not json");
  await assert.rejects(getAdminIdentity("token"), error => error instanceof AdminApiError && error.status === 502);
});
test("request abort is preserved", async () => {
  const controller = new AbortController(); controller.abort();
  const abort = new Error("aborted");
  globalThis.fetch = async () => { throw abort; };
  await assert.rejects(getAdminMovie("token", id, controller.signal), error => error === abort);
});
