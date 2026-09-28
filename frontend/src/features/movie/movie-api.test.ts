import assert from "node:assert/strict";
import test from "node:test";

const { getMovies, getMovie, getGenres, MovieApiError } = await import("./movie-api" + ".ts") as typeof import("./movie-api");

test("public Movie and Genre reads preserve string IDs, queries and abort signals without session credentials", async () => {
  const original = globalThis.fetch;
  const paths: string[] = [];
  const controller = new AbortController();
  globalThis.fetch = async (input, init) => {
    paths.push(String(input));
    assert.equal(init?.credentials, "omit");
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.signal, controller.signal);
    assert.equal(new Headers(init?.headers).has("Authorization"), false);
    return Response.json({ id: "9007199254740993", name: "Drama" });
  };
  try {
    await getMovies("q=100%25&page=0&size=20&sort=title%2Casc", controller.signal);
    assert.equal((await getMovie("9007199254740993", controller.signal)).id, "9007199254740993");
    await getGenres(controller.signal);
    assert.deepEqual(paths, ["/api/v1/movies?q=100%25&page=0&size=20&sort=title%2Casc", "/api/v1/movies/9007199254740993", "/api/v1/genres"]);
  } finally { globalThis.fetch = original; }
});

test("Movie 404 is a uniform unavailable state and ProblemDetail 400 supplies filter feedback", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ detail: "private hidden reason" }, { status: 404 });
    await assert.rejects(getMovie("12"), (error: unknown) => error instanceof MovieApiError && error.status === 404 && error.message === "This Movie is unavailable.");
    globalThis.fetch = async () => Response.json({ detail: "Invalid sort." }, { status: 400 });
    await assert.rejects(getMovies("sort=bad"), /Invalid sort/);
  } finally { globalThis.fetch = original; }
});

test("transient, network and non-JSON failures stay errors rather than empty successes", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("internal proxy details", { status: 503 });
    await assert.rejects(getGenres(), (error: unknown) => error instanceof MovieApiError && error.status === 503 && !error.message.includes("internal"));
    globalThis.fetch = async () => { throw new TypeError("network failed"); };
    await assert.rejects(getMovies(""), /Check your connection/);
    globalThis.fetch = async () => new Response("not JSON");
    await assert.rejects(getMovies(""), /read this response/);
  } finally { globalThis.fetch = original; }
});

test("abort rejection remains recognizable to callers", async () => {
  const original = globalThis.fetch;
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async () => { throw new DOMException("Aborted", "AbortError"); };
  try { await assert.rejects(getGenres(controller.signal), { name: "AbortError" }); }
  finally { globalThis.fetch = original; }
});
