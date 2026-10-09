import type { Booking } from "@/features/booking/booking.types";
import type { OwnedPaymentAttempt, PaymentInitiationReceipt } from "@/features/payment/payment-initiation.types";

export function paymentIneligibility(booking: Booking, now: number, firstAttempt = true): string | null {
  if (booking.status !== "PENDING") return "Đơn không còn chờ thanh toán. Chỉ có thể xem thông tin đã lưu.";
  if (!Number.isFinite(now) || now >= Date.parse(booking.expiresAt) || now >= Date.parse(booking.startsAt)) return "Đã qua hạn thanh toán hoặc giờ chiếu. Không thể tiếp tục thanh toán hay gia hạn đơn.";
  if (firstAttempt && booking.paymentStartedAt !== null) return "Đã bắt đầu thanh toán. Ghế, bắp nước và khuyến mãi đã được khóa.";
  if (!firstAttempt && booking.paymentStartedAt === null) return "Cần xác nhận lần thanh toán đã lưu trước khi mở cổng thanh toán.";
  return null;
}
export function sameBookingOrigins(before: Booking, after: Booking) {
  return before.id === after.id && before.showtimeId === after.showtimeId && before.createdAt === after.createdAt
    && before.expiresAt === after.expiresAt && before.seatAmount === after.seatAmount
    && JSON.stringify(before.seats) === JSON.stringify(after.seats);
}
export function sameBookingComposition(before: Booking, after: Booking) {
  return sameBookingOrigins(before, after) && before.finalAmount === after.finalAmount
    && before.concessionAmount === after.concessionAmount && before.discount === after.discount
    && JSON.stringify(before.concessions) === JSON.stringify(after.concessions) && JSON.stringify(before.promotion) === JSON.stringify(after.promotion);
}
export function paymentMatchesBooking(booking: Booking, attempt: OwnedPaymentAttempt, receipt?: PaymentInitiationReceipt) {
  return booking.paymentStartedAt !== null && attempt.bookingId === booking.id && attempt.amount === booking.finalAmount
    && attempt.bookingStatus === booking.status && (!receipt || (receipt.id === attempt.paymentId && receipt.amount === attempt.amount
      && receipt.expiresAt === booking.expiresAt && receipt.initiatedAt === booking.paymentStartedAt));
}
