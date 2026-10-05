import assert from "node:assert/strict";
import test from "node:test";

const { createMockCinemaService, createCinemaHandoff, parseCinemaPreviewState } = await import("./cinema-service" + ".ts") as typeof import("./cinema-service");

test("local adapter preserves string IDs and returns independent typed fixtures without network access", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Cinema preview must not use a backend endpoint"); };
  try {
    const service = createMockCinemaService("default", 0);
    const options = await service.listForMovie("9007199254740993", new AbortController().signal);
    assert.equal(options.length, 4);
    assert.equal(options[0].id, "9007199254740993");
    assert.deepEqual(options.map(option => option.selectionState), ["AVAILABLE", "AVAILABLE", "CLOSED", "UNAVAILABLE"]);
    options[0].name = "Changed by a caller";
    assert.notEqual((await service.listForMovie("2", new AbortController().signal))[0].name, options[0].name);
  } finally { globalThis.fetch = original; }
});

test("empty, unavailable and error/retry states are deterministic adapter scenarios", async () => {
  const signal = new AbortController().signal;
  assert.deepEqual(await createMockCinemaService("empty", 0).listForMovie("1", signal), []);
  assert.equal((await createMockCinemaService("unavailable", 0).listForMovie("1", signal)).some(option => option.selectionState === "AVAILABLE"), false);
  const retryable = createMockCinemaService("error", 0);
  await assert.rejects(retryable.listForMovie("1", signal), /Không thể tải/);
  assert.equal((await retryable.listForMovie("1", signal)).length, 4);
  assert.equal(parseCinemaPreviewState("unknown"), "default");
});

test("adapter cancellation does not consume the retryable error scenario", async () => {
  const service = createMockCinemaService("error", 10);
  const controller = new AbortController();
  const request = service.listForMovie("1", controller.signal);
  controller.abort();
  await assert.rejects(request, { name: "AbortError" });
  await assert.rejects(service.listForMovie("1", new AbortController().signal), /Không thể tải/);
});

test("only selectable Cinema options produce a typed handoff with both string identities", async () => {
  const options = await createMockCinemaService("default", 0).listForMovie("9223372036854775807", new AbortController().signal);
  assert.deepEqual(createCinemaHandoff("9223372036854775807", options[0]), {
    movieId: "9223372036854775807", cinemaId: "9007199254740993",
    showtimePath: "/movies/9223372036854775807/cinemas/9007199254740993/showtimes",
  });
  assert.equal(createCinemaHandoff("1", options[2]), null);
  assert.equal(createCinemaHandoff("1", options[3]), null);
});
