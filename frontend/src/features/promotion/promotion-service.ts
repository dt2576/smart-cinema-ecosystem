import type { Booking } from "@/features/booking/booking.types";

export function promotionEditability(booking: Booking, now: number): string | null {
  if (booking.status !== "PENDING") return "Đơn đặt vé đã đóng; khuyến mãi đã lưu chỉ có thể xem.";
  if (booking.paymentStartedAt !== null) return "Nội dung đơn đã khóa do thanh toán đã được khởi tạo. Không thể áp dụng hoặc xóa khuyến mãi.";
  if (now >= Date.parse(booking.expiresAt)) return "Đã hết hạn đặt vé. Không thể thay đổi khuyến mãi.";
  if (now >= Date.parse(booking.startsAt)) return "Suất chiếu đã bắt đầu. Không thể thay đổi khuyến mãi.";
  return null;
}
