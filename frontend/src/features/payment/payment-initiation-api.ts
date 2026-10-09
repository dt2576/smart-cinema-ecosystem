import { isBookingId } from "@/features/booking/booking-api";
import type { Booking } from "@/features/booking/booking.types";
import type { OwnedPaymentAttempt, PaymentInitiationReceipt, SandboxPaymentSubmission } from "@/features/payment/payment-initiation.types";

const money = (v: unknown): v is string => typeof v === "string" && /^\d{1,15}\.\d{4}$/.test(v);
const instant = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(v) && Number.isFinite(Date.parse(v));

export class PaymentApiError extends Error {
  readonly status: number;
  readonly outcomeUncertain: boolean;
  readonly paymentIdHint?: string;
  constructor(status: number, outcomeUncertain = false, title = "", paymentIdHint?: string) {
    super(status === 401 ? "Phiên đăng nhập đã kết thúc. Đăng nhập lại để kiểm tra đơn đặt vé."
      : status === 403 ? "Cần tài khoản khách hàng đang hoạt động để thanh toán."
      : status === 404 ? "Đơn đặt vé hoặc lần thanh toán không khả dụng cho tài khoản của bạn."
      : status === 400 ? "Yêu cầu thanh toán không hợp lệ. Hãy tải lại đơn đặt vé."
      : status === 409 && title === "Promotion unavailable" ? "Khuyến mãi không còn khả dụng. Kiểm tra lại hoặc xóa khuyến mãi trước khi thanh toán."
      : status === 409 && title === "Composition review required" ? "Điều kiện khuyến mãi đã thay đổi. Áp dụng lại hoặc xóa khuyến mãi, rồi xem lại tổng tiền."
      : status === 409 ? "Máy chủ chưa cho phép tiếp tục thanh toán. Hãy kiểm tra đơn, số tiền và hạn thanh toán; đơn không được tự gia hạn."
      : status === 503 && title === "Sandbox unavailable" ? "Cổng VNPAY Sandbox chưa sẵn sàng. Lần thanh toán đã lưu vẫn giữ nguyên; chưa có xác nhận thanh toán."
      : "Chưa thể xác nhận kết quả thanh toán. Hãy tải lại dữ liệu máy chủ trước khi tiếp tục.");
    this.name = "PaymentApiError"; this.status = status; this.outcomeUncertain = outcomeUncertain; this.paymentIdHint = paymentIdHint;
  }
}

async function request(path: string, token: string, signal: AbortSignal, write: boolean) {
  if (!token) throw new PaymentApiError(401);
  let response: Response;
  try {
    response = await fetch(path, { method: write ? "POST" : "GET", cache: "no-store", credentials: "omit", signal,
      headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(write ? { "Content-Type": "application/json" } : {}) },
      ...(write ? { body: "{}" } : {}) });
  } catch { throw new PaymentApiError(0, write); }
  if (!response.ok) {
    let title = "";
    try { const problem = await response.json(); if (["Promotion unavailable", "Composition review required", "Sandbox unavailable"].includes(problem?.title)) title = problem.title; } catch { /* Never display server details. */ }
    throw new PaymentApiError(response.status, write && response.status >= 500, title);
  }
  try { return await response.json() as unknown; } catch { throw new PaymentApiError(502, write); }
}

export async function initiateBookingPayment(before: Booking, token: string, signal: AbortSignal): Promise<PaymentInitiationReceipt> {
  if (!isBookingId(before.id)) throw new PaymentApiError(400);
  const value = await request(`/api/v1/bookings/${before.id}/payment-transactions`, token, signal, true) as PaymentInitiationReceipt;
  // A malformed receipt is never accepted. Matching scalar identity can still
  // seed an untrusted hint, whose owned GET must establish the actual state.
  const paymentIdHint = value?.bookingId === before.id && isBookingId(value?.id) ? value.id : undefined;
  if (!value || !isBookingId(value.id) || value.bookingId !== before.id || !["INITIATED", "PENDING"].includes(value.status)
    || typeof value.internalReference !== "string" || !/^P-[a-f0-9]{32}$/.test(value.internalReference)
    || !money(value.amount) || !instant(value.initiatedAt) || !instant(value.expiresAt) || value.expiresAt !== before.expiresAt
    || Date.parse(value.initiatedAt) >= Date.parse(value.expiresAt)
    || !((value.provider === null && value.currency === null) || (value.provider === "VNPAY" && value.currency === "VND"))) throw new PaymentApiError(502, true, "", paymentIdHint);
  return { id: value.id, bookingId: value.bookingId, internalReference: value.internalReference, status: value.status,
    amount: value.amount, currency: value.currency, provider: value.provider, initiatedAt: value.initiatedAt, expiresAt: value.expiresAt };
}

export async function getOwnedPaymentAttempt(bookingId: string, paymentId: string, token: string, signal: AbortSignal): Promise<OwnedPaymentAttempt> {
  if (![bookingId, paymentId].every(isBookingId)) throw new PaymentApiError(400);
  const v = await request(`/api/v1/bookings/${bookingId}/payment-transactions/${paymentId}`, token, signal, false) as OwnedPaymentAttempt;
  if (!v || v.paymentId !== paymentId || v.bookingId !== bookingId || !money(v.amount)
    || !["INITIATED", "PENDING", "SUCCESS", "FAILED", "CANCELLED"].includes(v.status)
    || !["PENDING", "PAID", "EXPIRED", "CANCELLED"].includes(v.bookingStatus) || typeof v.reconciliationRequired !== "boolean") throw new PaymentApiError(502);
  return { paymentId: v.paymentId, bookingId: v.bookingId, status: v.status, amount: v.amount, bookingStatus: v.bookingStatus, reconciliationRequired: v.reconciliationRequired };
}

export function isSafeSandboxRedirect(raw: unknown): raw is string {
  if (typeof raw !== "string" || raw !== raw.trim() || /[\\\s\u0000-\u001f\u007f]/.test(raw)) return false;
  try {
    const url = new URL(raw);
    return raw.startsWith("https://sandbox.vnpayment.vn/") && url.origin === "https://sandbox.vnpayment.vn"
      && url.pathname === "/paymentv2/vpcpay.html" && !url.username && !url.password && !url.hash && !!url.search;
  } catch { return false; }
}

export async function submitSandboxPayment(booking: Booking, paymentId: string, token: string, signal: AbortSignal): Promise<SandboxPaymentSubmission> {
  if (![booking.id, paymentId].every(isBookingId)) throw new PaymentApiError(400);
  const v = await request(`/api/v1/bookings/${booking.id}/payment-transactions/${paymentId}/vnpay-submission`, token, signal, true) as SandboxPaymentSubmission;
  if (!v || v.paymentId !== paymentId || v.bookingId !== booking.id || v.status !== "PENDING" || v.provider !== "VNPAY"
    || v.environment !== "SANDBOX" || v.currency !== "VND" || !money(v.amount) || v.amount !== booking.finalAmount
    || !instant(v.expiresAt) || Date.parse(v.expiresAt) > Date.parse(booking.expiresAt) || !isSafeSandboxRedirect(v.redirectUrl)) throw new PaymentApiError(502, true);
  return { paymentId: v.paymentId, bookingId: v.bookingId, status: v.status, provider: v.provider, environment: v.environment,
    currency: v.currency, amount: v.amount, expiresAt: v.expiresAt, redirectUrl: v.redirectUrl };
}
