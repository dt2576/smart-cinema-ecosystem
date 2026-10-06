import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { editBookingPromotion, PromotionApiError, type PromotionCommand } from "@/features/promotion/promotion-api";
import { promotionEditability } from "@/features/promotion/promotion-service";
import { formatBookingAmount } from "@/features/booking/booking-service";
import { customerLoginReturn } from "@/features/auth/auth-return";
import type { Booking } from "@/features/booking/booking.types";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const booking: Booking = {
  id: "9223372036854775807", bookingCode: "SERVER-BOOKING", status: "PENDING", showtimeId: "9007199254741001", movieId: "1", movieTitle: "Phim", cinemaId: "2", cinemaName: "Rạp", hallId: "3", hallName: "Phòng chiếu",
  startsAt: "2030-01-01T03:00:00Z", createdAt: "2030-01-01T02:00:00Z", expiresAt: "2030-01-01T02:09:00Z", serverTime: "2030-01-01T02:00:00Z", seatUnitCount: 1, guestCount: 2,
  seatAmount: "90001.4321", concessionAmount: "0.0000", subtotal: "90001.4321", discount: "0.0000", finalAmount: "90001.4321",
  seats: [{ id: "4", seatId: "5", holdId: "6", row: "E", number: "1-2", type: "COUPLE", guestCount: 2, unitPrice: "90001.4321", finalPrice: "90001.4321" }], concessions: [], promotion: null, paymentStartedAt: null,
};
const applied: Booking = { ...booking, promotion: { id: "9007199254740993", code: "SAVED-CODE", type: "FIXED_AMOUNT", value: "1.2345", minimumOrderAmount: "0.0000", maxDiscountAmount: null }, discount: "1.2345", finalAmount: "90000.1976" };
const signal = () => new AbortController().signal;

test("Promotion PUT sends only entered code, Bearer, no-store and exact bigint identity; DELETE has no body", async () => {
  const calls: { method: string | undefined; body: unknown }[] = [];
  globalThis.fetch = async (path, init) => {
    assert.equal(path, `/api/v1/bookings/${booking.id}/promotion`);
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer customer-token"); assert.equal(init?.cache, "no-store"); assert.equal(init?.credentials, "omit"); assert.ok(init?.signal);
    calls.push({ method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    assert.equal(new Headers(init?.headers).has("Content-Type"), init?.method === "PUT");
    return Response.json(init?.method === "PUT" ? applied : booking);
  };
  assert.deepEqual(await editBookingPromotion(booking, { operation: "APPLY", code: " saved-code ", discount: "99", userId: "999" } as PromotionCommand, "customer-token", signal()), applied);
  assert.deepEqual(await editBookingPromotion(applied, { operation: "REMOVE" }, "customer-token", signal()), booking);
  assert.deepEqual(calls, [{ method: "PUT", body: { code: " saved-code " } }, { method: "DELETE", body: undefined }]);
});

test("invalid IDs, blank or wrong-type codes and missing token never reach HTTP", async () => {
  globalThis.fetch = async () => { assert.fail("Invalid input reached HTTP"); };
  for (const id of ["0", "01", "9223372036854775808"]) await assert.rejects(editBookingPromotion({ ...booking, id }, { operation: "REMOVE" }, "token", signal()), { status: 400 });
  for (const code of ["", "  ", 42]) await assert.rejects(editBookingPromotion(booking, { operation: "APPLY", code } as PromotionCommand, "token", signal()), { status: 400 });
  await assert.rejects(editBookingPromotion(booking, { operation: "REMOVE" }, "", signal()), { status: 401 });
});

test("backend handles code normalization, length and unavailable rules without a client catalog or formula", async () => {
  for (const code of ["X".repeat(51), "a.b/ß", "  x  "]) {
    globalThis.fetch = async (_path, init) => { assert.deepEqual(JSON.parse(String(init?.body)), { code }); return Response.json({ title: "Promotion unavailable", detail: "private SQL" }, { status: 409 }); };
    await assert.rejects(editBookingPromotion(booking, { operation: "APPLY", code }, "token", signal()), e => e instanceof PromotionApiError && e.status === 409 && !e.outcomeUncertain && e.message.includes("không khả dụng") && !e.message.includes("SQL"));
  }
});

test("known HTTP errors stay safe, only exact approved ProblemDetail title refines the conflict", async () => {
  for (const status of [400, 401, 403, 404, 409, 500, 503]) {
    globalThis.fetch = async () => Response.json({ title: "private SQL owner", detail: "private token" }, { status });
    await assert.rejects(editBookingPromotion(booking, { operation: "APPLY", code: "X" }, "token", signal()), e => e instanceof PromotionApiError && e.status === status && e.outcomeUncertain === (status >= 500) && !/private|SQL|owner|token/.test(e.message));
  }
});

test("network loss is uncertain and never automatically replays an apply or remove", async () => {
  for (const command of [{ operation: "APPLY", code: "X" }, { operation: "REMOVE" }] as PromotionCommand[]) {
    let calls = 0; globalThis.fetch = async () => { calls++; throw new TypeError("private network"); };
    await assert.rejects(editBookingPromotion(booking, command, "token", signal()), e => e instanceof PromotionApiError && e.status === 0 && e.outcomeUncertain);
    assert.equal(calls, 1);
  }
});

test("malformed success, changed deadline/seat origins and wrong mutation result remain uncertain", async () => {
  for (const result of [{}, { ...applied, id: "7" }, { ...applied, expiresAt: "2030-01-01T02:10:00Z" }, { ...applied, seats: [{ ...applied.seats[0], holdId: "8" }] }, { ...applied, promotion: null }]) {
    globalThis.fetch = async () => Response.json(result);
    await assert.rejects(editBookingPromotion(booking, { operation: "APPLY", code: "X" }, "token", signal()), e => e instanceof PromotionApiError && e.status === 502 && e.outcomeUncertain);
  }
  globalThis.fetch = async () => Response.json(applied);
  await assert.rejects(editBookingPromotion(applied, { operation: "REMOVE" }, "token", signal()), { status: 502, outcomeUncertain: true });
});

test("authoritative stored fixed and percentage/capped snapshots, fractions and zero stay exact", async () => {
  for (const result of [applied, { ...applied, promotion: { ...applied.promotion!, type: "PERCENTAGE" as const, value: "100.0000", maxDiscountAmount: "9.7500" }, discount: "9.0000", finalAmount: "89992.4321" }, { ...applied, promotion: { ...applied.promotion!, value: "99999.0000" }, discount: booking.subtotal, finalAmount: "0.0000" }]) {
    globalThis.fetch = async () => Response.json(result);
    const saved = await editBookingPromotion(booking, { operation: "APPLY", code: "X" }, "token", signal());
    assert.deepEqual(saved, result); assert.equal(saved.expiresAt, booking.expiresAt); assert.deepEqual(saved.seats, booking.seats);
  }
  assert.equal(formatBookingAmount(applied.discount), "1.2345"); assert.equal(formatBookingAmount("0.0000"), "0.0000");
});

test("concurrent accepted Concession aggregate is reconciled without restoring the old composition", async () => {
  const result: Booking = { ...applied, concessions: [{ id: "9", itemId: "10", name: "Bắp", category: "POPCORN", quantity: 1, unitPrice: "10.1234", totalPrice: "10.1234" }], concessionAmount: "10.1234", subtotal: "90011.5555", finalAmount: "90010.3210" };
  globalThis.fetch = async () => Response.json(result);
  assert.deepEqual(await editBookingPromotion(booking, { operation: "APPLY", code: "X" }, "token", signal()), result);
});

test("abort propagates without replay or invented rollback", async () => {
  const controller = new AbortController(), aborted = new DOMException("Aborted", "AbortError");
  let calls = 0; globalThis.fetch = async () => { calls++; controller.abort(); throw aborted; };
  await assert.rejects(editBookingPromotion(booking, { operation: "REMOVE" }, "token", controller.signal), e => e === aborted);
  assert.equal(calls, 1);
});

test("known terminal/freeze/start/deadline state blocks edits and Summary auth return stays internal", () => {
  const now = Date.parse(booking.serverTime); assert.equal(promotionEditability(booking, now), null);
  for (const status of ["PAID", "CANCELLED", "EXPIRED"] as const) assert.ok(promotionEditability({ ...applied, status }, now));
  assert.ok(promotionEditability({ ...applied, paymentStartedAt: booking.serverTime }, now));
  assert.ok(promotionEditability(booking, Date.parse(booking.expiresAt))); assert.ok(promotionEditability({ ...booking, startsAt: booking.serverTime }, now));
  const href = `/bookings/${booking.id}/summary`; assert.equal(customerLoginReturn(href), href);
  for (const href of ["https://evil.test", "//evil.test", "/bookings/1/summary?code=X", "/bookings/9223372036854775808/summary"]) assert.equal(customerLoginReturn(href), null);
});
