import type { Page } from "@playwright/test";
import type { PaymentInitiationReceipt } from "@/features/payment/payment-initiation.types";
import type { BookingState } from "./customer-concessions";

export const PAYMENT_ID = "9223372036854775806";
export const SANDBOX_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=isolated-fixture&vnp_SecureHash=isolated-fixture";
export function paymentFixture() {
  return { receipt: undefined as PaymentInitiationReceipt | undefined,
    requests: [] as { method: string; path: string; body: unknown; authorization: string | undefined }[],
    reads: 0, created: 0, submissionEnabled: false, reopenAllowed: false, reconciliationRequired: false,
    status: "INITIATED" as "INITIATED" | "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED",
    rejectNext: 0, rejectTitle: "", readError: 0, outcome: "" as "" | "lost" | "malformed" | "malformed-known" | "mismatched-known" | "service",
    submissionOutcome: "" as "" | "lost" | "unsafe" | "malformed", delay: undefined as Promise<void> | undefined,
    beforeWrite: undefined as (() => void) | undefined };
}
// Isolated resource HTTP simulator. No merchant/provider contact or claim of Neon persistence.
// Payment/VNPAY PostgreSQL regression independently proves the actual transaction rules.
export async function mockCustomerPayments(page: Page, bookings: BookingState, state = paymentFixture()) {
  let now = "2030-01-01T02:00:00Z";
  await page.route(/\/api\/v1\/bookings\/\d+\/payment-transactions(?:\/\d+(?:\/vnpay-submission)?)?$/, async route => {
    const request = route.request(), method = request.method(), path = new URL(request.url()).pathname;
    if (method === "POST") state.requests.push({ method, path, body: request.postDataJSON(), authorization: request.headers().authorization }); else state.reads++;
    if (state.delay && method === "POST") await state.delay;
    if (method === "POST") state.beforeWrite?.();
    try { now = await page.evaluate(() => new Date(Date.now()).toISOString()); } catch { /* Interrupted document. */ }
    const b = bookings.booking;
    if (request.headers().authorization !== "Bearer qa-access") return route.fulfill({ status: 401, json: {} });
    if (!b || b.id !== path.split("/")[4]) return route.fulfill({ status: 404, json: {} });
    if (method === "GET") {
      if (state.readError) return route.fulfill({ status: state.readError, json: { detail: "private SQL" } });
      if (!state.receipt || path.split("/").at(-1) !== state.receipt.id) return route.fulfill({ status: 404, json: {} });
      return route.fulfill({ json: { paymentId: state.receipt.id, bookingId: b.id, status: state.status, amount: state.receipt.amount,
        bookingStatus: b.status, reconciliationRequired: state.reconciliationRequired, bookingQr: null, tickets: [] } });
    }
    if (Object.keys(request.postDataJSON()).length) return route.fulfill({ status: 400, json: {} });
    if (state.rejectNext) { const status = state.rejectNext; state.rejectNext = 0; return route.fulfill({ status, json: { title: state.rejectTitle, detail: "private SQL policy" } }); }
    if (b.status !== "PENDING" || Date.parse(now) >= Date.parse(b.expiresAt) || Date.parse(now) >= Date.parse(b.startsAt)) return route.fulfill({ status: 409, json: {} });
    if (path.endsWith("vnpay-submission")) {
      if (!state.receipt || path.split("/").at(-2) !== state.receipt.id) return route.fulfill({ status: 404, json: {} });
      if (!state.submissionEnabled || (state.status === "PENDING" && !state.reopenAllowed)) return route.fulfill({ status: 503, json: { title: "Sandbox unavailable" } });
      if (state.reconciliationRequired || !["INITIATED", "PENDING"].includes(state.status) || BigInt(b.finalAmount.replace(".", "")) === BigInt(0) || BigInt(b.finalAmount.replace(".", "")) % BigInt(10000) !== BigInt(0)) return route.fulfill({ status: 409, json: {} });
      state.status = "PENDING";
      if (state.submissionOutcome === "lost") { state.submissionOutcome = ""; return route.abort("failed"); }
      const expiresAt = new Date(Date.parse(b.expiresAt) - 1000).toISOString();
      return route.fulfill({ json: { paymentId: state.receipt.id, bookingId: b.id, status: "PENDING", provider: "VNPAY", environment: "SANDBOX", currency: "VND", amount: b.finalAmount,
        expiresAt: state.submissionOutcome === "malformed" ? "2030-01-01T04:00:00Z" : expiresAt,
        redirectUrl: state.submissionOutcome === "unsafe" ? "https://evil.test/" : SANDBOX_URL } });
    }
    if (!state.receipt) {
      state.receipt = { id: PAYMENT_ID, bookingId: b.id, status: "INITIATED", internalReference: "P-" + "a".repeat(32), amount: b.finalAmount,
        initiatedAt: now, expiresAt: b.expiresAt, provider: null, currency: null };
      b.paymentStartedAt = now; state.created++;
    }
    const outcome = state.outcome; state.outcome = "";
    if (outcome === "lost") return route.abort("failed");
    if (outcome === "service") return route.fulfill({ status: 503, json: { detail: "private committed SQL" } });
    return route.fulfill({ json: { ...state.receipt, status: state.status, ...(outcome === "malformed" ? { id: 2 } : outcome === "malformed-known" ? { amount: 1 } : outcome === "mismatched-known" ? { amount: "1.0000" } : {}) } });
  });
  return state;
}
