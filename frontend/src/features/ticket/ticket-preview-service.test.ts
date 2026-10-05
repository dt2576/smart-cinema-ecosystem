import test from "node:test";
import assert from "node:assert/strict";
import type { TicketPreview } from "./ticket-preview.types";

const { createMockTicketPreviewService, summarizeTicketPreview } = await import("./ticket-preview-service" + ".ts");
const { createMockBookingHistoryService } = await import("../booking/booking-history-service" + ".ts");
const signal = () => new AbortController().signal;

test("mixed Tickets preserve atomic Couple unit, capacity and independent status", async () => {
  const service = createMockTicketPreviewService("default", 0);
  const tickets: TicketPreview[] = await service.listForBooking("9007199254741101", signal());
  assert.deepEqual(summarizeTicketPreview(tickets), { units: 3, guests: 4, checkedIn: 2, valid: 1 });
  assert.equal(new Set(tickets.map(ticket => ticket.seatUnit.id)).size, 3);
  const couple = tickets.filter(ticket => ticket.seatUnit.type === "COUPLE");
  assert.equal(couple.length, 1);
  assert.deepEqual(couple[0], { id: "9007199254741603", bookingId: "9007199254741101", status: "VALID", seatUnit: { id: "9007199254741703", label: "H9-10", type: "COUPLE", guests: 2 } });
  assert.equal(tickets.some(ticket => ["H9", "H10"].includes(ticket.seatUnit.label)), false);
  tickets[0].status = "CANCELLED";
  assert.equal((await service.listForBooking("9007199254741101", signal()))[0].status, "CHECKED_IN");
});

test("QR reuse loads same Ticket context without consuming QR or changing Ticket states", async () => {
  const bookings = createMockBookingHistoryService("default", 0);
  const tickets = createMockTicketPreviewService("default", 0);
  const original = await tickets.listForBooking("9007199254741101", signal());
  for (let i = 0; i < 3; i++) {
    const booking = await bookings.resolveQr("SMART_CINEMA_PREVIEW:BOOKING:9007199254741101", signal());
    assert.deepEqual(await tickets.listForBooking(booking.id, signal()), original);
  }
  const invalid: TicketPreview[] = await tickets.listForBooking("9007199254741102", signal());
  assert.deepEqual(invalid.map(ticket => ticket.status), ["EXPIRED", "CANCELLED"]);
  for (const id of ["9007199254741103", "9007199254741104", "9007199254741105", "unknown"]) assert.deepEqual(await tickets.listForBooking(id, signal()), []);
});

test("Ticket adapter supports empty, retry and abort without mutations", async () => {
  assert.deepEqual(await createMockTicketPreviewService("empty", 0).listForBooking("9007199254741101", signal()), []);
  const service = createMockTicketPreviewService("error", 0);
  await assert.rejects(service.listForBooking("9007199254741101", signal()), /Không thể tải/);
  assert.equal((await service.listForBooking("9007199254741101", signal())).length, 3);
  const controller = new AbortController();
  const pending = service.listForBooking("9007199254741101", controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  await assert.rejects(service.listForBooking("9007199254741101", controller.signal), { name: "AbortError" });
});
