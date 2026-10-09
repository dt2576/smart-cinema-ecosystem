"use client";

import { Button } from "@/components/ui/button";
import type { Booking } from "@/features/booking/booking.types";
import { formatBookingAmount } from "@/features/booking/booking-service";
import { paymentIneligibility } from "@/features/payment/payment-initiation-service";
import type { OwnedPaymentAttempt, PaymentInitiationReceipt } from "@/features/payment/payment-initiation.types";
import { formatUtcInstant } from "@/lib/display-format";

interface Props {
  booking: Booking; now: number; busy: boolean; confirmed: boolean; compositionReviewRequired: boolean;
  payment?: OwnedPaymentAttempt; receipt?: PaymentInitiationReceipt; hasIdentityHint: boolean; paymentConfirmed: boolean;
  reviewRequired: boolean; notice: string; providerExpiresAt?: string;
  mutate: (operation: "INITIATE" | "SUBMIT") => Promise<void>; acknowledgeReview: () => void;
}
export function OwnedPaymentInitiationPanel({ booking, now, busy, confirmed, compositionReviewRequired, payment, receipt,
  hasIdentityHint, paymentConfirmed, reviewRequired, notice, providerExpiresAt, mutate, acknowledgeReview }: Props) {
  const frozen = booking.paymentStartedAt !== null;
  const reason = paymentIneligibility(booking, now, !frozen);
  const blocked = busy || !confirmed || compositionReviewRequired || reviewRequired || !!reason;
  const unresolved = payment && ["INITIATED", "PENDING"].includes(payment.status) && !payment.reconciliationRequired;
  return <section aria-label="Khởi tạo thanh toán" className="mt-6 border-t border-outline/40 pt-6">
    <h3 className="text-lg font-bold">{frozen ? "Đã bắt đầu thanh toán" : "Thanh toán"}</h3>
    <p className="mt-3 text-xs leading-6 text-muted">{frozen
      ? "Ghế, bắp nước và khuyến mãi đã khóa theo đơn trên máy chủ. Hạn đặt vé gốc giữ nguyên. Khởi tạo chưa xác nhận đã trả tiền."
      : "Xem lại ghế, bắp nước, khuyến mãi và tổng tiền. Khi máy chủ chấp nhận khởi tạo, các thành phần đơn sẽ được khóa."}</p>
    {booking.paymentStartedAt && <p className="mt-3 break-all text-xs text-muted">Bắt đầu thanh toán: <time dateTime={booking.paymentStartedAt}>{formatUtcInstant(booking.paymentStartedAt)}</time></p>}
    {payment && <dl className="mt-4 space-y-3 text-xs">
      <div><dt>Mã lần thanh toán</dt><dd className="mt-1 break-all font-heading">{payment.paymentId}</dd></div>
      <div><dt>Số tiền máy chủ đã chốt</dt><dd className="mt-1 break-all font-heading tabular-nums">{formatBookingAmount(payment.amount)}</dd></div>
      <div><dt>Thông tin lần thanh toán</dt><dd className="mt-1">{!paymentConfirmed ? "Cần kiểm tra lại từ máy chủ"
        : payment.reconciliationRequired ? "Máy chủ yêu cầu đối soát; chưa thể tiếp tục"
        : payment.status === "INITIATED" ? "Đã khởi tạo, chưa gửi cổng thanh toán"
        : payment.status === "PENDING" ? "Đang chờ xác nhận từ máy chủ"
        : "Máy chủ đã ghi nhận kết quả. Cần tra cứu qua luồng sau thanh toán."}</dd></div>
    </dl>}
    {receipt && paymentConfirmed && <p className="mt-3 break-all text-xs text-muted">Mã tham chiếu nội bộ: {receipt.internalReference}</p>}
    {providerExpiresAt && <p className="mt-3 break-all text-xs text-muted">Hạn gửi VNPAY Sandbox (VND): <time dateTime={providerExpiresAt}>{formatUtcInstant(providerExpiresAt)}</time>. Đây là hạn cổng do máy chủ trả về, có thể sớm hơn hạn đặt vé gốc.</p>}
    {frozen && !payment && <p role="status" className="mt-3 text-xs leading-6 text-muted">{hasIdentityHint
      ? "Đơn đã khóa. Chưa thể đọc lần thanh toán từ máy chủ. Hãy cập nhật đơn để kiểm tra lại mã đã nhận; không tự gửi lại hay tạo lần thanh toán mới."
      : "Đơn đã khóa nhưng chưa có mã lần thanh toán để tra cứu. Không thể tự tạo lần mới. Hãy kiểm tra lại đơn đặt vé; thông tin thanh toán sẽ cần được khôi phục qua hỗ trợ hoặc luồng tra cứu được máy chủ cung cấp."}</p>}
    {notice && <p role="status" className="mt-3 text-sm text-accent">{notice}</p>}
    {reviewRequired && <div className="mt-4 rounded-lg border border-outline bg-panel-low p-3"><p role="status" className="text-xs leading-6 text-muted">Cần xem lại dữ liệu máy chủ trước khi tiếp tục. Yêu cầu trước có thể đã được ghi nhận; không tự gửi lại hay tạo lần thanh toán mới.</p><Button variant="secondary" className="mt-3 w-full" disabled={busy || !confirmed || (frozen && !paymentConfirmed)} onClick={acknowledgeReview}>Đã xem dữ liệu thanh toán máy chủ</Button></div>}
    {reason && <p className="mt-3 text-xs leading-6 text-muted">{reason}</p>}
    {!frozen ? <Button className="mt-5 w-full" disabled={blocked} onClick={() => void mutate("INITIATE")}>Tiến hành thanh toán</Button>
      : payment && <><p className="mt-4 text-xs leading-6 text-muted">VNPAY Sandbox là cổng thử nghiệm. Máy chủ kiểm tra cấu hình và điều kiện chuyển cổng; chỉ xác minh trên máy chủ mới xác nhận kết quả thanh toán.</p><Button className="mt-4 w-full" disabled={blocked || !paymentConfirmed || !unresolved} onClick={() => void mutate("SUBMIT")}>Mở VNPAY Sandbox</Button></>}
  </section>;
}
