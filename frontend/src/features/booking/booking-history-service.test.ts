import test from "node:test";
import assert from "node:assert/strict";

const { createMockBookingHistoryService, parseBookingHistoryScenario } = await import("./booking-history-service" + ".ts");
const signal = () => new AbortController().signal;

test("history preserves string identities, deterministic ordering and snapshot totals", async () => {
  const service = createMockBookingHistoryService("default", 0);
  const bookings = await service.list(signal());
  assert.equal(bookings.length, 5);
  assert.equal(bookings[0].id, "9007199254741101");
  assert.deepEqual(bookings.map((booking: { status: string }) => booking.status), ["PAID", "PAID", "PENDING", "EXPIRED", "CANCELLED"]);
  for (const booking of bookings) {
    for (const value of [booking.id, booking.movie.id, booking.cinema.id, booking.showtime.id, booking.hall.id]) assert.equal(typeof value, "string");
    assert.equal(booking.amount, booking.seatSubtotal + booking.concessions.reduce((sum: number, item: { quantity: number; unitPrice: number }) => sum + item.quantity * item.unitPrice, 0) - booking.discount);
    assert.deepEqual(await service.get(booking.id, signal()), booking);
  }
  bookings[0].movie.title = "mutated client copy";
  assert.equal((await service.get("9007199254741101", signal())).movie.title, "Dune: Part Two");
});

test("one stable demo QR belongs to each paid sample, resolves repeatedly and rejects unknown payloads", async () => {
  const service = createMockBookingHistoryService("default", 0);
  const bookings = await service.list(signal());
  const payloads = new Set<string>();
  for (const booking of bookings) {
    if (booking.status !== "PAID") { assert.equal(booking.qr, null); continue; }
    assert.ok(booking.qr.payload.startsWith("SMART_CINEMA_PREVIEW:BOOKING:"));
    payloads.add(booking.qr.payload);
    assert.deepEqual(await service.resolveQr(booking.qr.payload, signal()), booking);
    assert.deepEqual(await service.resolveQr(booking.qr.payload, signal()), booking);
  }
  assert.equal(payloads.size, 2);
  for (const payload of ["", "9007199254741101", "SMART_CINEMA_PREVIEW:BOOKING:9007199254741103", "https://example.com"]) assert.equal(await service.resolveQr(payload, signal()), null);
  for (const id of ["missing", "9007199254741100", "09007199254741101"]) assert.equal(await service.get(id, signal()), null);
});

test("empty, retry and cancellation are isolated local adapter states", async () => {
  const empty = createMockBookingHistoryService("empty", 0);
  assert.deepEqual(await empty.list(signal()), []);
  assert.equal(await empty.get("9007199254741101", signal()), null);
  const service = createMockBookingHistoryService("error", 0);
  await assert.rejects(service.list(signal()), /Không thể tải/);
  assert.equal((await service.list(signal())).length, 5);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(service.list(controller.signal), { name: "AbortError" });
  const pendingController = new AbortController();
  const pending = createMockBookingHistoryService("default", 100).list(pendingController.signal);
  pendingController.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(parseBookingHistoryScenario("PAID"), "default");
  assert.equal(parseBookingHistoryScenario("error"), "error");
});
