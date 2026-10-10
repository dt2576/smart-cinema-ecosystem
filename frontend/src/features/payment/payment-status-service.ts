import type { Booking } from "@/features/booking/booking.types";
import type { OwnedPaymentAttempt } from "@/features/payment/payment-initiation.types";
import { paymentMatchesBooking, sameBookingComposition } from "@/features/payment/payment-initiation-service";

// Operational read bounds only; these never change provider/Booking deadlines.
export const PAYMENT_STATUS_READ_INTERVAL = 30_000;
export const PAYMENT_STATUS_READ_LIMIT = 6;
export const PAYMENT_RETURN_PATH = "/payments/vnpay/return";

export function frozenBookingUnchanged(before: Booking, after: Booking) {
  if (before.paymentStartedAt === null) return true;
  if (before.status !== "PENDING" && before.status !== after.status) return false;
  return before.paymentStartedAt === after.paymentStartedAt && sameBookingComposition(before, after);
}

export function paymentStateCoherent(booking: Booking, payment: OwnedPaymentAttempt, previous?: OwnedPaymentAttempt) {
  if (!paymentMatchesBooking(booking, payment)) return false;
  // A stale read cannot downgrade a previously observed verified success.
  if (previous?.paymentId === payment.paymentId && previous.status === "SUCCESS" && payment.status !== "SUCCESS") return false;
  if (booking.status === "PAID") return payment.status === "SUCCESS";
  return payment.status !== "SUCCESS" || payment.reconciliationRequired;
}

export function paymentStatusPresentation(booking: Booking, payment: OwnedPaymentAttempt | undefined, confirmed: boolean, busy: boolean) {
  if (busy) return { title: "Đang xác minh thanh toán", detail: "Đang đọc trạng thái đặt vé và lần thanh toán từ máy chủ." };
  if (!payment || !confirmed || !paymentStateCoherent(booking, payment)) return {
    title: "Chưa thể xác định kết quả thanh toán",
    detail: "Chưa có dữ liệu máy chủ đầy đủ và thống nhất. Kiểm tra lại trạng thái; không tự gửi lại hoặc tạo lần thanh toán mới.",
  };
  if (payment.reconciliationRequired) return {
    title: "Đang đối soát thanh toán",
    detail: payment.status === "SUCCESS"
      ? "Máy chủ đã xác nhận giao dịch thành công, nhưng cần đối soát đơn đặt vé. Kết quả giao dịch không tự xác nhận quyền nhận vé. Hãy liên hệ hỗ trợ với mã lần thanh toán."
      : "Máy chủ yêu cầu đối soát. Kết quả chưa cho phép tiếp tục thanh toán; hãy liên hệ hỗ trợ với mã lần thanh toán.",
  };
  switch (payment.status) {
    case "SUCCESS": return { title: "Thanh toán thành công", detail: "Máy chủ đã xác nhận giao dịch thành công và đơn đặt vé đã thanh toán." };
    case "FAILED": return { title: "Thanh toán không thành công", detail: "Máy chủ xác nhận lần thanh toán này thất bại. Thành phần đơn vẫn khóa; không tự tạo lần thay thế." };
    case "CANCELLED": return { title: "Thanh toán đã hủy", detail: "Máy chủ xác nhận lần thanh toán này đã hủy. Trạng thái đơn đặt vé được hiển thị riêng." };
    case "INITIATED": return { title: "Thanh toán đang chờ hoàn tất", detail: "Lần thanh toán đã khởi tạo; chưa có xác nhận gửi cổng hoặc đã trả tiền." };
    case "PENDING": return { title: "Thanh toán đang chờ xử lý", detail: "Máy chủ chưa xác nhận kết quả cuối cùng. Quay về từ cổng thanh toán không xác nhận đã trả tiền." };
  }
}
