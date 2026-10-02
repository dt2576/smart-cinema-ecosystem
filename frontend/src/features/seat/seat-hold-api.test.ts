import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
const { acquireSeatHolds, getOwnedSeatHolds, releaseSeatHold, SeatHoldApiError, isSeatHoldId } = await import("./seat-hold-api" + ".ts") as typeof import("./seat-hold-api");
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const id = "9223372036854775807", seat = "9007199254740993", holdId = "9007199254740994";
const batch = { serverTime: "2030-01-01T02:00:00Z", holds: [{ id: holdId, showtimeId: id, seatId: seat, createdAt: "2030-01-01T02:00:00Z", expiresAt: "2030-01-01T02:10:00Z", status: "ACTIVE" }] };
const signal = () => new AbortController().signal;
test("Hold adapter uses authenticated exact existing resources, strings and atomic body", async () => {
  const calls: string[] = [];
  globalThis.fetch = async (url, init) => {
    calls.push(`${init?.method} ${url}`);
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer customer-test-token");
    assert.equal(init?.cache, "no-store"); assert.equal(init?.credentials, "omit"); assert.ok(init?.signal);
    if (init?.method === "POST") assert.deepEqual(JSON.parse(init.body as string), { seatIds: [seat] });
    return init?.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json(batch);
  };
  assert.deepEqual(await acquireSeatHolds(id, [seat], "customer-test-token", signal()), batch);
  assert.equal((await getOwnedSeatHolds(id, "customer-test-token", signal())).holds[0].id, holdId);
  await releaseSeatHold(id, holdId, "customer-test-token", signal());
  assert.deepEqual(calls, [`POST /api/v1/showtimes/${id}/seat-holds`, `GET /api/v1/showtimes/${id}/seat-holds`, `DELETE /api/v1/showtimes/${id}/seat-holds/${holdId}`]);
});
test("Hold IDs remain string-safe and invalid/duplicate inputs never fetch", async () => {
  globalThis.fetch = async () => { assert.fail("invalid request reached HTTP"); };
  assert.ok(isSeatHoldId(id));
  for (const bad of [9007199254740993, "0", "01", "9223372036854775808", "-1", "1.0"]) assert.equal(isSeatHoldId(bad), false);
  await assert.rejects(acquireSeatHolds(id, [seat, seat], "token", signal()), { status: 400 });
  await assert.rejects(acquireSeatHolds(id, [seat], "", signal()), { status: 401 });
});
test("Hold errors are safe typed responses without raw upstream details or fallback", async () => {
  for (const status of [400, 401, 403, 404, 409, 503]) {
    globalThis.fetch = async () => Response.json({ detail: "sensitive SQL owner data" }, { status });
    await assert.rejects(getOwnedSeatHolds(id, "token", signal()), error => error instanceof SeatHoldApiError && error.status === status && !error.message.includes("sensitive"));
  }
  globalThis.fetch = async () => { throw new Error("network"); };
  await assert.rejects(getOwnedSeatHolds(id, "token", signal()), { status: 0 });
});
test("Abort is retained and partial/malformed successful acquisition is rejected", async () => {
  const control = new AbortController(); control.abort();
  globalThis.fetch = async () => { throw new DOMException("Aborted", "AbortError"); };
  await assert.rejects(getOwnedSeatHolds(id, "token", control.signal), { name: "AbortError" });
  for (const result of [{ ...batch, holds: [] }, { ...batch, holds: [{ ...batch.holds[0], id: 123 }] }, { ...batch, serverTime: "invalid" }]) {
    globalThis.fetch = async () => Response.json(result);
    await assert.rejects(acquireSeatHolds(id, [seat], "token", signal()), { status: 502 });
  }
});
