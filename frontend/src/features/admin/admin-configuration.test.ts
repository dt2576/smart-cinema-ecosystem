import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
const api = await import("./admin-api" + ".ts") as typeof import("./admin-api");
const { layoutGuestCapacity } = await import("./admin-configuration.types" + ".ts") as typeof import("./admin-configuration.types");
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("hierarchy API preserves bigint strings and only calls approved Admin resources", async () => {
  const id = "9007199254740993";
  const calls: { url: string; method?: string; body?: string; credentials?: RequestCredentials }[] = [];
  globalThis.fetch = async (url, options) => { calls.push({ url: String(url), method: options?.method, body: options?.body as string, credentials: options?.credentials }); return Response.json({ id, cinemaId: id }); };
  const cinema = { name: "Branch", address: "Địa chỉ", contact: null, operatingInformation: null, status: "ACTIVE" as const };
  const hall = { name: "Phòng chiếu", capacity: 2, type: "Configured", status: "ACTIVE" as const };
  const couple = { row: "B", number: "1-2", type: "COUPLE" as const, physicalStatus: "ACTIVE" as const };
  assert.equal((await api.saveAdminCinema("token", undefined, cinema)).id, id);
  await api.getAdminCinemas("token"); await api.getAdminCinema("token", id); await api.saveAdminCinema("token", id, cinema);
  await api.getAdminHalls("token", id); await api.getAdminHall("token", id); await api.saveAdminHall("token", id, undefined, hall); await api.saveAdminHall("token", id, id, hall);
  await api.getAdminSeats("token", id); await api.initializeAdminSeats("token", id, [couple]); await api.updateAdminSeat("token", id, couple);
  assert.ok(calls.every(call => call.url.startsWith("/api/v1/admin/") && call.credentials === "omit"));
  assert.equal(calls.at(-1)?.url, `/api/v1/admin/seats/${id}`);
  assert.deepEqual(JSON.parse(calls.at(-2)!.body!), { units: [couple] });
  assert.equal(calls.at(-1)?.method, "PUT");
});
test("guest capacity counts COUPLE as exactly one two-guest unit", () => {
  assert.equal(layoutGuestCapacity([{ type: "STANDARD" }, { type: "VIP" }, { type: "COUPLE" }]), 4);
  assert.equal(layoutGuestCapacity([]), 0);
});
test("configuration conflicts remain safe ProblemDetail errors", async () => {
  globalThis.fetch = async () => Response.json({ detail: "Referenced Seat is protected." }, { status: 409 });
  await assert.rejects(api.updateAdminSeat("token", "9007199254740993", { row: "B", number: "1-2", type: "COUPLE", physicalStatus: "INACTIVE" }), (error: unknown) => error instanceof api.AdminApiError && error.status === 409 && error.message === "Dữ liệu đã thay đổi hoặc thao tác bị xung đột. Vui lòng kiểm tra và thử lại.");
});

const { orderSeatRowForDisplay } = await import("./admin-seat-presentation" + ".ts") as typeof import("./admin-seat-presentation");

test("display order naturally sorts numeric labels without changing identity or API array", () => {
  const seats = Object.freeze(["1", "10", "2", "03"].map((number, i) => Object.freeze({ number, id: `900719925474099${i}`, row: "A", type: "VIP" })));
  const ordered = orderSeatRowForDisplay(seats);
  assert.deepEqual(ordered.map(s => s.number), ["1", "2", "03", "10"]);
  assert.deepEqual(seats.map(s => s.number), ["1", "10", "2", "03"]);
  assert.equal(ordered[1], seats[2]);
  assert.equal(ordered[1].id, "9007199254740992");
});

test("numeric ranges remain whole units and large numeric labels retain exact precision", () => {
  const couple = { id: "9007199254740995", number: "9-10", type: "COUPLE", guestCapacity: 2 };
  const ordered = orderSeatRowForDisplay([{ number: "9007199254740994" }, couple, { number: "11-12" }, { number: "1-2" }, { number: "9007199254740993" }]);
  assert.deepEqual(ordered.map(s => s.number), ["1-2", "9-10", "11-12", "9007199254740993", "9007199254740994"]);
  assert.equal(ordered[1], couple); assert.equal(ordered.length, 5);
});

test("opaque, equivalent, overlapping or descending labels keep the whole row in API order", () => {
  for (const labels of [["10", "Box", "2"], ["01", "1", "2"], ["9-10", "10", "1"], ["4-2", "1"], ["2.5", "1"], ["A10", "A2"]]) {
    const seats = labels.map(number => ({ number }));
    assert.deepEqual(orderSeatRowForDisplay(seats), seats);
  }
  assert.deepEqual(orderSeatRowForDisplay([]), []);
});
