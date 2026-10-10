import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { Booking } from "@/features/booking/booking.types";
import type { OwnedPaymentAttempt } from "@/features/payment/payment-initiation.types";
import { getOwnedPaymentAttempt, PaymentApiError } from "@/features/payment/payment-initiation-api";
import { frozenBookingUnchanged, paymentStateCoherent, paymentStatusPresentation } from "@/features/payment/payment-status-service";
import { readPaymentReturnHint, savePaymentHint } from "@/features/payment/payment-initiation-storage";
import { customerLoginReturn } from "@/features/auth/auth-return";

// Isolated HTTP/data fixtures only; no claim of provider or financial execution.
const booking: Booking = {
  id: "9007199254740993", bookingCode: "FIXTURE", status: "PENDING", showtimeId: "2", movieId: "3", movieTitle: "Phim", cinemaId: "4", cinemaName: "Rạp", hallId: "5", hallName: "Phòng",
  startsAt: "2030-01-01T03:00:00Z", createdAt: "2030-01-01T02:00:00Z", serverTime: "2030-01-01T02:01:00Z", expiresAt: "2030-01-01T02:10:00Z", paymentStartedAt: "2030-01-01T02:00:01Z",
  seatUnitCount: 1, guestCount: 2, seatAmount: "999999999999999.9999", concessionAmount: "0.0000", subtotal: "999999999999999.9999", discount: "0.0000", finalAmount: "999999999999999.9999",
  seats: [{ id: "6", seatId: "7", holdId: "8", row: "E", number: "1-2", type: "COUPLE", guestCount: 2, unitPrice: "999999999999999.9999", finalPrice: "999999999999999.9999" }], concessions: [], promotion: null,
};
const attempt: OwnedPaymentAttempt = { paymentId: "9223372036854775807", bookingId: booking.id, status: "PENDING", amount: booking.finalAmount, bookingStatus: "PENDING", reconciliationRequired: false };
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; savePaymentHint(null, booking.id); Reflect.deleteProperty(globalThis, "sessionStorage"); });

for (const [status, title] of [["INITIATED", "Thanh toán đang chờ hoàn tất"], ["PENDING", "Thanh toán đang chờ xử lý"], ["FAILED", "Thanh toán không thành công"], ["CANCELLED", "Thanh toán đã hủy"]] as const) test(`authoritative ${status} has distinct Vietnamese presentation`, () => {
  assert.equal(paymentStatusPresentation(booking, { ...attempt, status }, true, false).title, title);
});

test("success requires agreeing authoritative PAID and SUCCESS projections", () => {
  assert.equal(paymentStatusPresentation({ ...booking, status: "PAID" }, { ...attempt, status: "SUCCESS", bookingStatus: "PAID" }, true, false).title, "Thanh toán thành công");
  assert.equal(paymentStateCoherent(booking, { ...attempt, status: "SUCCESS" }), false);
  assert.equal(paymentStateCoherent({ ...booking, status: "PAID" }, { ...attempt, bookingStatus: "PAID" }), false);
});
test("late financial success requires reconciliation without promising fulfillment", () => {
  for (const status of ["PENDING", "EXPIRED", "CANCELLED"] as const) {
    const value = { ...attempt, status: "SUCCESS" as const, bookingStatus: status, reconciliationRequired: true };
    assert.equal(paymentStateCoherent({ ...booking, status }, value), true);
    const view = paymentStatusPresentation({ ...booking, status }, value, true, false);
    assert.equal(view.title, "Đang đối soát thanh toán"); assert.match(view.detail, /giao dịch thành công/);
  }
});
test("unknown, refreshing and stale reads never display confirmed success", () => {
  const paid = { ...booking, status: "PAID" as const }, success = { ...attempt, status: "SUCCESS" as const, bookingStatus: "PAID" as const };
  assert.equal(paymentStatusPresentation(paid, success, false, false).title, "Chưa thể xác định kết quả thanh toán");
  assert.equal(paymentStatusPresentation(paid, success, true, true).title, "Đang xác minh thanh toán");
  assert.equal(paymentStatusPresentation(booking, undefined, true, false).title, "Chưa thể xác định kết quả thanh toán");
});
test("stale attempt cannot downgrade previously read success, correction can be reviewed", () => {
  assert.equal(paymentStateCoherent(booking, attempt, { ...attempt, status: "SUCCESS" }), false);
  assert.equal(paymentStateCoherent(booking, { ...attempt, status: "SUCCESS", reconciliationRequired: true }, { ...attempt, status: "FAILED" }), true);
});
test("freeze, snapshots, amount and original expiry cannot change on recovery", () => {
  for (const change of [{ paymentStartedAt: null }, { paymentStartedAt: "2030-01-01T02:05:00Z" }, { expiresAt: "2030-01-01T02:30:00Z" }, { finalAmount: "0.0000" }, { concessions: [{ id: "9" }] }]) {
    assert.equal(frozenBookingUnchanged(booking, { ...booking, ...change } as Booking), false);
  }
  assert.equal(frozenBookingUnchanged(booking, { ...booking, status: "EXPIRED" }), true);
  assert.equal(frozenBookingUnchanged({ ...booking, status: "PAID" }, booking), false);
  assert.equal(paymentStateCoherent(booking, { ...attempt, amount: "0.0000" }), false);
});
test("pre-Payment Booking reads retain existing server-authoritative lifecycle behavior", () => {
  const before = { ...booking, paymentStartedAt: null, status: "EXPIRED" as const };
  assert.equal(frozenBookingUnchanged(before, { ...before, status: "CANCELLED" }), true);
  assert.equal(frozenBookingUnchanged(before, { ...booking, status: "PAID" }), true);
});
test("owned result GET uses JWT, exact string IDs and amounts, drops issuance/secrets", async () => {
  globalThis.fetch = async (path, init) => {
    assert.equal(path, `/api/v1/bookings/${booking.id}/payment-transactions/${attempt.paymentId}`);
    assert.equal(init?.method, "GET"); assert.equal(init?.body, undefined); assert.equal(init?.cache, "no-store");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer customer-token");
    return Response.json({ ...attempt, bookingQr: "private", tickets: [{ id: "10" }], vnp_SecureHash: "private", internalReference: "not-in-get-contract" });
  };
  assert.deepEqual(await getOwnedPaymentAttempt(booking.id, attempt.paymentId, "customer-token", new AbortController().signal), attempt);
});
for (const status of [401, 403, 404, 429, 500, 503]) test(`HTTP ${status} is unavailable state, never financial failure or replay`, async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ detail: "private callback secret" }, { status }); };
  await assert.rejects(getOwnedPaymentAttempt(booking.id, attempt.paymentId, "token", new AbortController().signal), error => error instanceof PaymentApiError && error.status === status && !/private|secret/.test(error.message));
  assert.equal(calls, 1);
});
test("malformed, mismatched identity and invented EXPIRED payment states are rejected", async () => {
  for (const change of [{ paymentId: "2" }, { bookingId: "2" }, { amount: 1 }, { status: "EXPIRED" }, { reconciliationRequired: "false" }]) {
    globalThis.fetch = async () => Response.json({ ...attempt, ...change });
    await assert.rejects(getOwnedPaymentAttempt(booking.id, attempt.paymentId, "token", new AbortController().signal), { status: 502 });
  }
  globalThis.fetch = async () => new Response("{");
  await assert.rejects(getOwnedPaymentAttempt(booking.id, attempt.paymentId, "token", new AbortController().signal), { status: 502 });
});
test("return pointer requires matching per-tab hints and excludes financial authority", () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } });
  savePaymentHint({ bookingId: booking.id, paymentId: attempt.paymentId, reviewRequired: true }, booking.id);
  assert.deepEqual(readPaymentReturnHint(), { bookingId: booking.id, paymentId: attempt.paymentId, reviewRequired: true });
  assert.doesNotMatch(values.get("smart-cinema.payment-return")!, /status|amount|token|https|signature/);
  values.set("smart-cinema.payment-return", JSON.stringify({ bookingId: booking.id, paymentId: "2", status: "SUCCESS" })); assert.equal(readPaymentReturnHint(), null);
  values.set("smart-cinema.payment-return", "{"); assert.equal(readPaymentReturnHint()?.paymentId, attempt.paymentId);
});
test("login resumes only clean fixed return route, no callback forwarding or open redirect", () => {
  assert.equal(customerLoginReturn("/payments/vnpay/return"), "/payments/vnpay/return");
  for (const path of ["/payments/vnpay/return?vnp_ResponseCode=00", "//evil.test", "https://evil.test", "/payments/vnpay/return#hash", "/api/v1/payments/vnpay/ipn"]) assert.equal(customerLoginReturn(path), null);
});
