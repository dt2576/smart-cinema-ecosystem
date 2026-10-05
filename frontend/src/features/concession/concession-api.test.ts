import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { ConcessionApiError, editBookingConcession, getConcessionCatalog, parseConcessionQuantity, validateConcessionCatalog } from "@/features/concession/concession-api";
import { bookingConcessionsHref, concessionEditability } from "@/features/concession/concession-composition-service";
import { customerLoginReturn } from "@/features/auth/auth-return";
import { validateBooking } from "@/features/booking/booking-api";
import { formatBookingAmount } from "@/features/booking/booking-service";
import type { Booking } from "@/features/booking/booking.types";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const item = { id: "9223372036854775807", name: "Bắp rang", description: null, category: "POPCORN", sellingPrice: "10.1234", imageUrl: null };
const booking: Booking = {
  id: "9007199254770001", bookingCode: "SERVER-BOOKING", status: "PENDING", showtimeId: "9007199254741001", movieId: "1", movieTitle: "Phim", cinemaId: "2", cinemaName: "Rạp", hallId: "3", hallName: "Phòng chiếu",
  startsAt: "2030-01-01T03:00:00Z", createdAt: "2030-01-01T02:00:00Z", expiresAt: "2030-01-01T02:09:00Z", serverTime: "2030-01-01T02:00:00Z", seatUnitCount: 1, guestCount: 2,
  seatAmount: "0.0000", concessionAmount: "0.0000", subtotal: "0.0000", discount: "0.0000", finalAmount: "0.0000",
  seats: [{ id: "4", seatId: "5", holdId: "6", row: "E", number: "1-2", type: "COUPLE", guestCount: 2, unitPrice: "0.0000", finalPrice: "0.0000" }], concessions: [], promotion: null, paymentStartedAt: null,
};
const line = { id: "9007199254780001", itemId: item.id, name: item.name, category: "POPCORN" as const, quantity: 2, unitPrice: "10.1234", totalPrice: "20.2468" };
const added: Booking = { ...booking, concessions: [line], concessionAmount: "20.2468", subtotal: "20.2468", finalAmount: "20.2468" };
const signal = () => new AbortController().signal;

test("real catalog preserves public no-store contract, exact prices and distinct IDs without invented availability", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "/api/v1/concession-items"); assert.equal(init?.cache, "no-store"); assert.equal(init?.credentials, "omit"); assert.ok(init?.signal);
    assert.equal(new Headers(init?.headers).has("Authorization"), false);
    return Response.json([item, { ...item, id: "9007199254740993" }]);
  };
  const catalog = await getConcessionCatalog(signal());
  assert.equal(catalog.length, 2); assert.equal(catalog[0].sellingPrice, "10.1234"); assert.equal(catalog[1].name, item.name);
  assert.equal("available" in catalog[0], false); assert.deepEqual(validateConcessionCatalog([]), []);
  for (const invalid of [[{ ...item, id: 9007199254740993 }], [{ ...item, category: "STOCK" }], [{ ...item, sellingPrice: 10 }], [item, item], {}]) assert.throws(() => validateConcessionCatalog(invalid), { status: 502 });
});

test("quantity follows positive PostgreSQL integer capacity; zero removal, fractional and malformed input are rejected", () => {
  assert.equal(parseConcessionQuantity("1"), 1); assert.equal(parseConcessionQuantity("2147483647"), 2147483647);
  for (const value of ["0", "-1", "1.5", "1.0", "1e2", "2147483648", "", " 2", "NaN", "01"]) assert.equal(parseConcessionQuantity(value), null);
});

test("add update and remove use only approved fields with Bearer auth and preserve original deadline and snapshots", async () => {
  const calls: { method: string | undefined; path: unknown; body: unknown }[] = [];
  globalThis.fetch = async (path, init) => {
    calls.push({ method: init?.method, path, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer customer-token"); assert.equal(init?.cache, "no-store"); assert.equal(init?.credentials, "omit");
    return Response.json(init?.method === "DELETE" ? booking : added);
  };
  assert.deepEqual(await editBookingConcession(booking, { operation: "ADD", itemId: item.id, quantity: 2, ownerId: "99", price: "1" } as Parameters<typeof editBookingConcession>[1], "customer-token", signal()), added);
  assert.deepEqual(await editBookingConcession(added, { operation: "UPDATE", lineId: line.id, quantity: 2 }, "customer-token", signal()), added);
  assert.deepEqual(await editBookingConcession(added, { operation: "REMOVE", lineId: line.id }, "customer-token", signal()), booking);
  assert.deepEqual(calls, [
    { method: "POST", path: `/api/v1/bookings/${booking.id}/concessions`, body: { itemId: item.id, quantity: 2 } },
    { method: "PATCH", path: `/api/v1/bookings/${booking.id}/concessions/${line.id}`, body: { quantity: 2 } },
    { method: "DELETE", path: `/api/v1/bookings/${booking.id}/concessions/${line.id}`, body: undefined },
  ]);
});

test("invalid quantity or identity and missing auth never send a composition request", async () => {
  globalThis.fetch = async () => { assert.fail("invalid command reached HTTP"); };
  for (const quantity of [0, -1, 1.5, 2147483648, NaN]) await assert.rejects(editBookingConcession(booking, { operation: "ADD", itemId: item.id, quantity }, "token", signal()), { status: 400 });
  await assert.rejects(editBookingConcession(booking, { operation: "REMOVE", lineId: "0" }, "token", signal()), { status: 400 });
  await assert.rejects(editBookingConcession(booking, { operation: "ADD", itemId: item.id, quantity: 1 }, "", signal()), { status: 401 });
});

test("safe errors preserve HTTP semantics, including inactive/stale items, foreign lines and uncertain writes", async () => {
  for (const status of [400, 401, 403, 404, 409, 503]) {
    globalThis.fetch = async () => Response.json({ detail: "private SQL owner secret" }, { status });
    await assert.rejects(editBookingConcession(booking, { operation: "ADD", itemId: item.id, quantity: 1 }, "token", signal()), error => error instanceof ConcessionApiError && error.status === status && error.outcomeUncertain === (status >= 500) && !error.message.includes("SQL"));
    await assert.rejects(getConcessionCatalog(signal()), { status, outcomeUncertain: false });
  }
});

test("lost response is uncertain and never blindly retried; abort stays aborted", async () => {
  let calls = 0; globalThis.fetch = async () => { calls++; throw new TypeError("network"); };
  await assert.rejects(editBookingConcession(booking, { operation: "ADD", itemId: item.id, quantity: 1 }, "token", signal()), { status: 0, outcomeUncertain: true });
  assert.equal(calls, 1);
  const controller = new AbortController(); controller.abort();
  globalThis.fetch = async () => { throw new DOMException("Aborted", "AbortError"); };
  await assert.rejects(editBookingConcession(booking, { operation: "REMOVE", lineId: line.id }, "token", controller.signal), { name: "AbortError" });
});

test("invalid successful receipt cannot replace Booking or renew deadline and remains uncertain", async () => {
  for (const result of [{ ...added, id: "7" }, { ...added, expiresAt: "2030-01-01T02:10:00Z" }, { ...added, finalAmount: "20.24" }, { ...added, concessions: [{ ...line, totalPrice: "20.2469" }] }]) {
    globalThis.fetch = async () => Response.json(result);
    await assert.rejects(editBookingConcession(booking, { operation: "ADD", itemId: item.id, quantity: 2 }, "token", signal()), { status: 502, outcomeUncertain: true });
  }
});

test("persisted snapshots and authoritative exact totals are independent of catalog names and prices", () => {
  const changedCatalog = validateConcessionCatalog([{ ...item, name: "Tên mới", sellingPrice: "999.0000" }]);
  assert.equal(changedCatalog[0].sellingPrice, "999.0000"); assert.equal(validateBooking(added).concessions[0].unitPrice, "10.1234");
  assert.equal(formatBookingAmount(added.finalAmount), "20.2468");
  const huge = "999999999999999.9999";
  assert.equal(validateBooking({ ...added, concessions: [{ ...line, quantity: 1, unitPrice: huge, totalPrice: huge }], concessionAmount: huge, subtotal: huge, finalAmount: huge }).finalAmount, huge);
  assert.throws(() => validateBooking({ ...added, concessions: [line, line], concessionAmount: "40.4936", subtotal: "40.4936", finalAmount: "40.4936" }), { status: 502 });
});

test("editability respects server deadline, status, start and permanent Payment freeze", () => {
  const now = Date.parse(booking.serverTime);
  assert.equal(concessionEditability(booking, now), null);
  for (const status of ["PAID", "EXPIRED", "CANCELLED"] as const) assert.ok(concessionEditability({ ...booking, status }, now));
  assert.ok(concessionEditability({ ...booking, paymentStartedAt: booking.serverTime }, now));
  assert.ok(concessionEditability(booking, Date.parse(booking.expiresAt)));
  assert.ok(concessionEditability({ ...booking, startsAt: booking.serverTime }, now));
});

test("login resumes only validated owned Concession URLs without open redirects or mutation intent", () => {
  const href = bookingConcessionsHref(item.id); assert.equal(customerLoginReturn(href), href);
  for (const bad of ["https://evil.test" + href, "//evil.test" + href, href + "?quantity=2", href + "#save", "/bookings/9223372036854775808/concessions", "/bookings/preview/concessions"]) assert.equal(customerLoginReturn(bad), null);
});
