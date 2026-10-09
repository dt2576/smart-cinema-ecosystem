import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getOwnedPaymentAttempt, initiateBookingPayment, isSafeSandboxRedirect, PaymentApiError, submitSandboxPayment } from "@/features/payment/payment-initiation-api";
import { paymentIneligibility, paymentMatchesBooking, sameBookingComposition, sameBookingOrigins } from "@/features/payment/payment-initiation-service";
import { readPaymentHint, savePaymentHint } from "@/features/payment/payment-initiation-storage";
import type { Booking } from "@/features/booking/booking.types";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; savePaymentHint(null, booking.id); });
const booking: Booking = {
  id: "9223372036854775807", bookingCode: "SERVER-BOOKING", status: "PENDING", showtimeId: "9007199254741001", movieId: "1", movieTitle: "Phim", cinemaId: "2", cinemaName: "Rạp", hallId: "3", hallName: "Phòng chiếu",
  startsAt: "2030-01-01T03:00:00Z", createdAt: "2030-01-01T02:00:00Z", expiresAt: "2030-01-01T02:09:00Z", serverTime: "2030-01-01T02:00:00Z", seatUnitCount: 1, guestCount: 2,
  seatAmount: "90001.4321", concessionAmount: "0.0000", subtotal: "90001.4321", discount: "0.0000", finalAmount: "90001.4321",
  seats: [{ id: "4", seatId: "5", holdId: "6", row: "E", number: "1-2", type: "COUPLE", guestCount: 2, unitPrice: "90001.4321", finalPrice: "90001.4321" }], concessions: [], promotion: null, paymentStartedAt: null,
};
const receipt = { id: "9007199254740993", bookingId: booking.id, internalReference: "P-" + "a".repeat(32), status: "INITIATED", amount: booking.finalAmount, provider: null, currency: null, initiatedAt: "2030-01-01T02:00:01Z", expiresAt: booking.expiresAt };
const lookup = { paymentId: receipt.id, bookingId: booking.id, amount: booking.finalAmount, status: "INITIATED" as const, bookingStatus: "PENDING" as const, reconciliationRequired: false };
const url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=server-reference&vnp_SecureHash=server-signature";
const submission = { paymentId: receipt.id, bookingId: booking.id, status: "PENDING", provider: "VNPAY", environment: "SANDBOX", currency: "VND", amount: booking.finalAmount, expiresAt: "2030-01-01T02:08:59Z", redirectUrl: url };
const signal = () => new AbortController().signal;

test("Payment initiation and submission send only exact empty JSON, owned IDs, JWT and no-store", async () => {
  const paths: string[] = [];
  globalThis.fetch = async (path, init) => {
    paths.push(String(path)); assert.equal(init?.method, "POST"); assert.equal(init?.body, "{}");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer customer-token"); assert.equal(init?.cache, "no-store"); assert.equal(init?.credentials, "omit"); assert.ok(init?.signal);
    return Response.json(String(path).endsWith("vnpay-submission") ? submission : receipt);
  };
  assert.deepEqual(await initiateBookingPayment(booking, "customer-token", signal()), receipt);
  assert.deepEqual(await submitSandboxPayment(booking, receipt.id, "customer-token", signal()), submission);
  assert.deepEqual(paths, [`/api/v1/bookings/${booking.id}/payment-transactions`, `/api/v1/bookings/${booking.id}/payment-transactions/${receipt.id}/vnpay-submission`]);
});
test("known identity recovery GET excludes all Ticket/QR data and cannot write or replay", async () => {
  let calls = 0;
  globalThis.fetch = async (path, init) => { calls++; assert.equal(path, `/api/v1/bookings/${booking.id}/payment-transactions/${receipt.id}`); assert.equal(init?.method, "GET"); assert.equal(init?.body, undefined); assert.equal(init?.cache, "no-store"); return Response.json({ ...lookup, bookingQr: "private-qr", tickets: [{ id: "123" }] }); };
  assert.deepEqual(await getOwnedPaymentAttempt(booking.id, receipt.id, "token", signal()), lookup); assert.equal(calls, 1);
});
test("invalid IDs and missing auth are rejected before any payment HTTP", async () => {
  globalThis.fetch = async () => { assert.fail("Unexpected HTTP"); };
  for (const id of ["0", "01", "9223372036854775808", "1/2"]) {
    await assert.rejects(initiateBookingPayment({ ...booking, id }, "token", signal()), { status: 400 });
    await assert.rejects(getOwnedPaymentAttempt(booking.id, id, "token", signal()), { status: 400 });
    await assert.rejects(submitSandboxPayment(booking, id, "token", signal()), { status: 400 });
  }
  await assert.rejects(initiateBookingPayment(booking, "", signal()), { status: 401 });
});
test("first initiation preserves fractional and zero exact amounts without gateway conversion", async () => {
  for (const amount of ["0.0000", "123.4567", "999999999999999.9999"]) {
    globalThis.fetch = async () => Response.json({ ...receipt, amount });
    assert.equal((await initiateBookingPayment(booking, "token", signal())).amount, amount);
  }
});
test("wrong identity, amount type, renewed deadline, missing fields and unknown provider are uncertain success responses", async () => {
  for (const change of [{ id: 2 }, { bookingId: "2" }, { amount: 90001 }, { amount: "1.00" }, { expiresAt: "2030-01-01T02:30:00Z" }, { initiatedAt: "invalid" }, { internalReference: undefined }, { provider: "OTHER" }, { provider: "VNPAY", currency: null }, { status: "SUCCESS" }]) {
    globalThis.fetch = async () => Response.json({ ...receipt, ...change });
    await assert.rejects(initiateBookingPayment(booking, "token", signal()), e => e instanceof PaymentApiError && e.outcomeUncertain && e.status === 502);
  }
});
test("network, abort, 5xx and broken JSON remain ambiguous and never replay writes", async () => {
  for (const response of [() => { throw new TypeError("private-network"); }, () => { throw new DOMException("aborted", "AbortError"); }, () => Response.json({}, { status: 503 }), () => new Response("{", { status: 200 })]) {
    let calls = 0; globalThis.fetch = async () => { calls++; return response(); };
    await assert.rejects(initiateBookingPayment(booking, "token", signal()), e => e instanceof PaymentApiError && e.outcomeUncertain); assert.equal(calls, 1);
  }
});
test("malformed nonidentity fields retain only matching validated scalar IDs for untrusted owned GET recovery", async () => {
  for (const change of [{ amount: 1 }, { expiresAt: "invalid" }, { status: "UNKNOWN" }]) {
    globalThis.fetch = async () => Response.json({ ...receipt, ...change });
    await assert.rejects(initiateBookingPayment(booking, "token", signal()), e => e instanceof PaymentApiError && e.outcomeUncertain && e.paymentIdHint === receipt.id);
  }
  for (const change of [{ id: 2 }, { bookingId: "2" }]) {
    globalThis.fetch = async () => Response.json({ ...receipt, ...change });
    await assert.rejects(initiateBookingPayment(booking, "token", signal()), e => e instanceof PaymentApiError && e.outcomeUncertain && e.paymentIdHint === undefined);
  }
});
test("known HTTP failures expose only safe messages and exact documented titles", async () => {
  for (const status of [400, 401, 403, 404, 409, 500, 503]) {
    globalThis.fetch = async () => Response.json({ title: "private SQL", detail: "secret token" }, { status });
    await assert.rejects(initiateBookingPayment(booking, "token", signal()), e => e instanceof PaymentApiError && e.status === status && e.outcomeUncertain === (status >= 500) && !/SQL|secret|token/.test(e.message));
  }
  for (const [title, message] of [["Promotion unavailable", "không còn khả dụng"], ["Composition review required", "đã thay đổi"], ["Sandbox unavailable", "chưa sẵn sàng"]]) {
    globalThis.fetch = async () => Response.json({ title }, { status: title === "Sandbox unavailable" ? 503 : 409 });
    await assert.rejects(initiateBookingPayment(booking, "token", signal()), e => e instanceof PaymentApiError && e.message.includes(message));
  }
});
test("only exact pinned HTTPS Sandbox host/path can receive the untouched server URL", () => {
  assert.equal(isSafeSandboxRedirect(url), true);
  for (const bad of ["javascript:alert(1)", url.replace("https:", "http:"), url.replace("sandbox.vnpayment.vn", "sandbox.vnpay.vn"), url.replace(".vn", ".vn.evil.test"), url.replace("sandbox.", "attacker@sandbox."), url.replace(".vn/", ".vn:444/"), url.replace("vpcpay.html", "other.html"), url + "#fragment", " " + url, url.replace("https://", "https:\\\\"), "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"]) assert.equal(isSafeSandboxRedirect(bad), false, bad);
});
test("submission rejects altered amount, identity, provider, environment, deadline and unsafe URL", async () => {
  for (const change of [{ amount: "1.0000" }, { paymentId: "2" }, { bookingId: "2" }, { provider: "OTHER" }, { environment: "PRODUCTION" }, { currency: "USD" }, { status: "SUCCESS" }, { expiresAt: "2030-01-01T02:10:00Z" }, { redirectUrl: "https://evil.test/" }]) {
    globalThis.fetch = async () => Response.json({ ...submission, ...change });
    await assert.rejects(submitSandboxPayment(booking, receipt.id, "token", signal()), { status: 502, outcomeUncertain: true });
  }
});
test("lookup must match owned identity, exact amount shape, status and reconciliation flag", async () => {
  for (const change of [{ paymentId: "2" }, { bookingId: "2" }, { amount: 1 }, { status: "VERIFIED" }, { bookingStatus: "INITIATED" }, { reconciliationRequired: undefined }]) {
    globalThis.fetch = async () => Response.json({ ...lookup, ...change });
    await assert.rejects(getOwnedPaymentAttempt(booking.id, receipt.id, "token", signal()), { status: 502, outcomeUncertain: false });
  }
});
test("eligibility uses server clock, original deadline and immutable first-attempt freeze", () => {
  const now = Date.parse(booking.serverTime);
  assert.equal(paymentIneligibility(booking, now), null);
  for (const status of ["PAID", "EXPIRED", "CANCELLED"] as const) assert.ok(paymentIneligibility({ ...booking, status }, now));
  assert.ok(paymentIneligibility(booking, Date.parse(booking.expiresAt))); assert.ok(paymentIneligibility({ ...booking, startsAt: booking.serverTime }, now));
  const frozen = { ...booking, paymentStartedAt: receipt.initiatedAt };
  assert.ok(paymentIneligibility(frozen, now)); assert.equal(paymentIneligibility(frozen, now, false), null); assert.ok(paymentIneligibility(booking, now, false));
});
test("recovery compares complete authoritative composition, origins and frozen amount without repricing", () => {
  const frozen = { ...booking, paymentStartedAt: receipt.initiatedAt };
  assert.equal(sameBookingComposition(booking, frozen), true); assert.equal(paymentMatchesBooking(frozen, lookup), true);
  assert.equal(paymentMatchesBooking(booking, lookup), false); assert.equal(paymentMatchesBooking(frozen, { ...lookup, amount: "1.0000" }), false);
  assert.equal(sameBookingOrigins(booking, { ...booking, expiresAt: submission.expiresAt }), false);
  assert.equal(sameBookingComposition(booking, { ...booking, finalAmount: "1.0000" }), false);
});
test("per-tab recovery hints contain only identity and review intent, including blocked storage fallback", () => {
  const hint = { bookingId: booking.id, paymentId: receipt.id, reviewRequired: true };
  savePaymentHint(hint, booking.id); assert.deepEqual(readPaymentHint(booking.id), hint);
  assert.equal(readPaymentHint("0"), null); savePaymentHint(null, booking.id); assert.equal(readPaymentHint(booking.id), null);
});
