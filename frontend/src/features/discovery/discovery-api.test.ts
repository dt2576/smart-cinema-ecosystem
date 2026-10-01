import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
const { DiscoveryApiError, getCinemasForMovie, getCinema, getShowtimes, getShowtime, getSeatMap } = await import("./discovery-api" + ".ts") as typeof import("./discovery-api");
const fetchBefore = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchBefore; });
const id = "9007199254740993", signal = new AbortController().signal;
const showtime = { id, movieId: id, cinemaId: id, hall: { id, name: "Hall" }, startsAt: "2030-01-01T10:00:00Z" };
test("public adapters use existing GET resources, string IDs and server timezone", async () => {
  const urls: string[] = [];
  globalThis.fetch = async (url, options) => {
    urls.push(String(url)); assert.equal(options?.method ?? "GET", "GET"); assert.equal(options?.credentials, "omit");
    assert.equal(new Headers(options?.headers).has("Authorization"), false);
    if (String(url).includes("/cinemas?")) return Response.json([{ id, name: "Cinema", address: "Address", contact: null, operatingInformation: null }]);
    if (String(url).includes("/cinemas/")) return Response.json({ id, name: "Cinema", address: "Address" });
    if (String(url).includes("/showtimes?")) return Response.json({ timeZone: "America/New_York", date: "2030-01-01", dates: ["2030-01-01"], serverTime: "2030-01-01T00:00Z", items: [showtime] });
    return Response.json(showtime);
  };
  assert.equal((await getCinemasForMovie(id, signal))[0].id, id);
  await getCinema(id, signal);
  const schedule = await getShowtimes(id, id, "2030-01-01", signal);
  assert.equal(schedule.items[0].timeZone, "America/New_York"); assert.equal("hasAvailableSeats" in schedule.items[0] ? true : undefined, undefined);
  await getShowtime(id, signal);
  assert.deepEqual(urls, [`/api/v1/cinemas?movieId=${id}`, `/api/v1/cinemas/${id}`, `/api/v1/showtimes?movieId=${id}&cinemaId=${id}&date=2030-01-01`, `/api/v1/showtimes/${id}`]);
});
test("real Seat map preserves whole COUPLE, VIP and authoritative held/sold states", async () => {
  const map = { showtimeId: id, movieId: id, cinemaId: id, hallId: id, serverTime: "2030-01-01T00:00Z", units: [{ id, row: "A", number: "1-2", type: "COUPLE", guestCount: 2, availability: "AVAILABLE" }, { id: "9007199254740994", row: "A", number: "3", type: "VIP", guestCount: 1, availability: "HELD" }] };
  globalThis.fetch = async () => Response.json(map);
  const result = await getSeatMap(showtime, signal);
  assert.equal(result.units.length, 2); assert.equal(result.units[0].id, id); assert.equal(result.units[1].availability, "HELD"); assert.equal(result.units[1].column, 3);
  globalThis.fetch = async () => Response.json({ ...map, hallId: "1" });
  await assert.rejects(getSeatMap(showtime, signal), error => error instanceof DiscoveryApiError && error.status === 409);
});
test("read failures preserve ProblemDetail, retryability and cancellation", async () => {
  for (const status of [400, 404, 409, 503]) {
    globalThis.fetch = async () => Response.json({ detail: "Unavailable" }, { status });
    await assert.rejects(getCinema(id, signal), error => error instanceof DiscoveryApiError && error.status === status);
  }
  globalThis.fetch = async () => { throw new Error("network"); };
  await assert.rejects(getCinema(id, signal), error => error instanceof DiscoveryApiError && error.status === 0);
  const controller = new AbortController(); controller.abort(); const abort = new Error("aborted");
  globalThis.fetch = async () => { throw abort; };
  await assert.rejects(getCinema(id, controller.signal), error => error === abort);
});
