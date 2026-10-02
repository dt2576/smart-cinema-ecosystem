import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { Booking } from "./booking.types";
const { createBooking, getBooking, validateBooking, BookingApiError, isBookingId } = await import("./booking-api" + ".ts") as typeof import("./booking-api");
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const id = "9223372036854775807", holdId = "9007199254740993";
const input = { showtimeId: "9007199254741001", holdIds: [holdId] };
const signal = () => new AbortController().signal;
const booking: Booking = {
  id, bookingCode: "SERVER-BOOKING", status: "PENDING", showtimeId: input.showtimeId,
  movieId: "9007199254741002", movieTitle: "Movie", cinemaId: "1", cinemaName: "Cinema", hallId: "2", hallName: "Hall",
  startsAt: "2030-01-01T03:00:00Z", createdAt: "2030-01-01T02:00:00Z", expiresAt: "2030-01-01T02:09:00Z", serverTime: "2030-01-01T02:00:00Z",
  seatUnitCount: 1, guestCount: 2, seatAmount: "90001.4321", concessionAmount: "0.0000", subtotal: "90001.4321", discount: "0.0000", finalAmount: "90001.4321",
  seats: [{ id: "9007199254741003", seatId: "9007199254741004", holdId, row: "E", number: "1-2", type: "COUPLE", guestCount: 2, unitPrice: "90001.4321", finalPrice: "90001.4321" }],
  concessions: [], promotion: null, paymentStartedAt: null,
};
test("Booking adapter sends only exact string Hold origins to the existing authenticated resource", async () => {
  const calls: string[] = [];
  globalThis.fetch = async (url, init) => {
    calls.push(`${init?.method} ${url}`);
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer customer-token");
    assert.equal(init?.cache, "no-store"); assert.equal(init?.credentials, "omit"); assert.ok(init?.signal);
    if (init?.method === "POST") assert.deepEqual(JSON.parse(init.body as string), input);
    return Response.json(booking);
  };
  assert.deepEqual(await createBooking({ ...input, userId: "8", amount: "1" } as typeof input, "customer-token", signal()), booking);
  assert.deepEqual(await getBooking(id, "customer-token", signal()), booking);
  assert.deepEqual(calls, ["POST /api/v1/bookings", `GET /api/v1/bookings/${id}`]);
});
test("invalid, numeric, duplicate and unauthenticated inputs never reach HTTP", async () => {
  globalThis.fetch = async () => { assert.fail("invalid request reached HTTP"); };
  assert.ok(isBookingId(id));
  for (const invalid of [9007199254740993, "0", "01", "9223372036854775808", "-1", "1.0"]) assert.equal(isBookingId(invalid), false);
  await assert.rejects(createBooking({ ...input, holdIds: [holdId, holdId] }, "token", signal()), { status: 400 });
  await assert.rejects(createBooking({ ...input, holdIds: [] }, "token", signal()), { status: 400 });
  await assert.rejects(getBooking(id, "", signal()), { status: 401 });
});
test("safe typed errors exclude private upstream details and classify uncertain write outcomes", async () => {
  for (const status of [400, 401, 403, 404, 409, 503]) {
    globalThis.fetch = async () => Response.json({ detail: "private SQL privilege credentials" }, { status });
    await assert.rejects(createBooking(input, "token", signal()), e => e instanceof BookingApiError && e.status === status && e.outcomeUncertain === (status >= 500) && !e.message.includes("private"));
  }
});
test("network failure never automatically retries a Booking POST or substitutes local data", async () => {
  let calls = 0; globalThis.fetch = async () => { calls++; throw new Error("network"); };
  await assert.rejects(createBooking(input, "token", signal()), { status: 0, outcomeUncertain: true });
  assert.equal(calls, 1);
  await assert.rejects(getBooking(id, "token", signal()), { status: 0, outcomeUncertain: false });
});
test("aborted request remains aborted and never claims transaction rollback", async () => {
  const controller = new AbortController(); controller.abort();
  globalThis.fetch = async () => { throw new DOMException("Aborted", "AbortError"); };
  await assert.rejects(createBooking(input, "token", controller.signal), { name: "AbortError" });
});
test("malformed, numeric or partial successful receipts remain unknown and cannot create local Bookings", async () => {
  for (const result of [{ ...booking, id: 123 }, { ...booking, seats: [] }, { ...booking, guestCount: 1 }, { ...booking, finalAmount: "90001.43" }, { ...booking, seats: [{ ...booking.seats[0], holdId: "7" }] }]) {
    globalThis.fetch = async () => Response.json(result);
    await assert.rejects(createBooking(input, "token", signal()), { status: 502, outcomeUncertain: true });
  }
  globalThis.fetch = async () => Response.json({ ...booking, id: "7" });
  await assert.rejects(getBooking(id, "token", signal()), { status: 502 });
});
test("exact server snapshots accept zero and large fractional totals without repricing or type adjustment", () => {
  for (const amount of ["0.0000", "999999999999999.9999"]) {
    const b = { ...booking, seatAmount: amount, subtotal: amount, finalAmount: amount, seats: [{ ...booking.seats[0], unitPrice: amount, finalPrice: amount }] };
    assert.deepEqual(validateBooking(b), b);
  }
  assert.throws(() => validateBooking({ ...booking, finalAmount: "90001.4322" }), { status: 502 });
});
test("STANDARD VIP and whole COUPLE identities validate as three units for four guests", () => {
  const seats = ["STANDARD", "VIP", "COUPLE"].map((type, index) => ({ ...booking.seats[0], id: String(index + 1), seatId: String(index + 11), holdId: String(index + 21), type, guestCount: type === "COUPLE" ? 2 : 1 }));
  assert.equal(validateBooking({ ...booking, seats, seatUnitCount: 3, guestCount: 4, seatAmount: "270004.2963", subtotal: "270004.2963", finalAmount: "270004.2963" }).seats.length, 3);
});
