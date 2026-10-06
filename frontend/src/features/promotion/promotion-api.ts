import { isBookingId, validateBooking } from "@/features/booking/booking-api";
import type { Booking } from "@/features/booking/booking.types";

export type PromotionCommand = { operation: "APPLY"; code: string } | { operation: "REMOVE" };

export class PromotionApiError extends Error {
  readonly status: number;
  readonly outcomeUncertain: boolean;
  constructor(status: number, outcomeUncertain = false, unavailable = false) {
    super(status === 400 ? "Mã khuyến mãi không hợp lệ. Máy chủ yêu cầu 1–50 ký tự sau khi chuẩn hóa."
      : status === 401 ? "Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại."
      : status === 403 ? "Cần tài khoản khách hàng đang hoạt động để thay đổi khuyến mãi."
      : status === 404 ? "Đơn đặt vé không khả dụng cho tài khoản của bạn."
      : status === 409 && unavailable ? "Khuyến mãi không khả dụng hoặc đơn chưa đủ điều kiện áp dụng. Khuyến mãi đã lưu được kiểm tra lại từ máy chủ."
      : status === 409 ? "Chưa thể thay đổi khuyến mãi. Đơn có thể không còn cho phép chỉnh sửa hoặc đang được cập nhật. Vui lòng xem dữ liệu mới từ máy chủ."
      : "Không thể kết nối hoặc xác nhận phản hồi khuyến mãi. Vui lòng cập nhật đơn đặt vé từ máy chủ.");
    this.name = "PromotionApiError"; this.status = status; this.outcomeUncertain = outcomeUncertain;
  }
}

export async function editBookingPromotion(before: Booking, command: PromotionCommand, token: string, signal: AbortSignal): Promise<Booking> {
  if (!isBookingId(before.id) || (command.operation === "APPLY" && (typeof command.code !== "string" || !command.code.trim()))) throw new PromotionApiError(400);
  if (!token) throw new PromotionApiError(401);
  let response: Response;
  try {
    response = await fetch(`/api/v1/bookings/${before.id}/promotion`, {
      method: command.operation === "APPLY" ? "PUT" : "DELETE", signal, cache: "no-store", credentials: "omit",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(command.operation === "APPLY" ? { "Content-Type": "application/json" } : {}) },
      // Send the entered code only. Locale.ROOT normalization and all rules belong to the backend.
      ...(command.operation === "APPLY" ? { body: JSON.stringify({ code: command.code }) } : {}),
    });
  } catch (error) { if (signal.aborted) throw error; throw new PromotionApiError(0, true); }
  if (!response.ok) {
    let unavailable = false;
    if (response.status === 409) {
      try { unavailable = (await response.json())?.title === "Promotion unavailable"; } catch { /* Use generic status presentation. */ }
    }
    // Never present raw ProblemDetail text or assume which eligibility check failed.
    throw new PromotionApiError(response.status, response.status >= 500, unavailable);
  }
  try {
    const booking = validateBooking(await response.json());
    if (command.operation === "APPLY" ? booking.promotion === null : booking.promotion !== null || booking.discount !== "0.0000") throw new Error("Invalid Promotion result");
    if (booking.id !== before.id || booking.showtimeId !== before.showtimeId || booking.createdAt !== before.createdAt
      || booking.expiresAt !== before.expiresAt || booking.seatAmount !== before.seatAmount
      || JSON.stringify(booking.seats) !== JSON.stringify(before.seats)) throw new Error("Invalid Promotion receipt");
    // Concurrent Concession edits can change its lines/totals; the complete server aggregate wins.
    return booking;
  } catch { throw new PromotionApiError(502, true); }
}
