import type { Booking } from "@/features/booking/booking.types";

export const CONCESSION_CATEGORY_LABELS = { POPCORN: "Bắp rang", DRINK: "Đồ uống", COMBO: "Combo" } as const;
export function bookingConcessionsHref(id: string) { return `/bookings/${id}/concessions`; }

export function concessionEditability(booking: Booking, now: number): string | null {
  if (booking.status !== "PENDING") return "Đơn đặt vé đã đóng; bắp nước đã lưu chỉ có thể xem.";
  if (booking.paymentStartedAt !== null) return "Nội dung đơn đã khóa do thanh toán đã được khởi tạo. Bắp nước đã lưu chỉ có thể xem.";
  if (now >= Date.parse(booking.expiresAt)) return "Đã hết hạn đặt vé. Không thể thêm, đổi số lượng hoặc xóa bắp nước.";
  if (now >= Date.parse(booking.startsAt)) return "Suất chiếu đã bắt đầu. Không thể chỉnh sửa bắp nước.";
  return null;
}
