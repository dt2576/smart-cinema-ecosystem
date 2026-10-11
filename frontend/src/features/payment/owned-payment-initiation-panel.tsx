"use client";

import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatusFeedback } from "@/components/ui/status-feedback";
import type { Booking } from "@/features/booking/booking.types";
import { formatBookingAmount } from "@/features/booking/booking-service";
import { paymentIneligibility } from "@/features/payment/payment-initiation-service";
import type { OwnedPaymentAttempt, PaymentInitiationReceipt } from "@/features/payment/payment-initiation.types";
import { formatUtcInstant } from "@/lib/display-format";
import { OwnedPaymentStatusPanel } from "@/features/payment/owned-payment-status-panel";

interface Props {
  booking: Booking; now: number; busy: boolean; confirmed: boolean; compositionReviewRequired: boolean;
  payment?: OwnedPaymentAttempt; receipt?: PaymentInitiationReceipt; hasIdentityHint: boolean; paymentConfirmed: boolean;
  reviewRequired: boolean; notice: string; providerExpiresAt?: string;
  mutate: (operation: "INITIATE" | "SUBMIT") => Promise<void>; acknowledgeReview: () => void;
  refresh: () => Promise<void>;
}
export function OwnedPaymentInitiationPanel({ booking, now, busy, confirmed, compositionReviewRequired, payment, receipt,
  hasIdentityHint, paymentConfirmed, reviewRequired, notice, providerExpiresAt, mutate, acknowledgeReview, refresh }: Props) {
  const frozen = booking.paymentStartedAt !== null;
  const reason = paymentIneligibility(booking, now, !frozen);
  const blocked = busy || !confirmed || compositionReviewRequired || reviewRequired || !!reason;
  const unresolved = payment && ["INITIATED", "PENDING"].includes(payment.status) && !payment.reconciliationRequired;
  return <SurfaceCard tone="subtle" padding="none" aria-label="Khởi tạo thanh toán" aria-busy={busy} className="mt-6 p-4 sm:p-5">
    <div className="flex flex-wrap items-center gap-3"><span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-control bg-panel-high font-heading text-label font-bold text-accent">VN</span><div className="min-w-0"><p className="font-heading text-label font-semibold text-accent">VNPAY Sandbox</p><h3 className="mt-1 text-heading-md font-bold">{frozen ? "Đã bắt đầu thanh toán" : "Thanh toán"}</h3></div><StatusBadge>Thử nghiệm</StatusBadge></div>
    <p className="mt-4 text-body-sm leading-6 text-muted">{frozen
      ? "Ghế, bắp nước và khuyến mãi đã khóa theo đơn trên máy chủ. Hạn đặt vé gốc giữ nguyên. Khởi tạo chưa xác nhận đã trả tiền."
      : "Xem lại ghế, bắp nước, khuyến mãi và tổng tiền. Khi máy chủ chấp nhận khởi tạo, các thành phần đơn sẽ được khóa."}</p>
    {booking.paymentStartedAt && <p className="mt-3 break-all text-xs text-muted">Bắt đầu thanh toán: <time dateTime={booking.paymentStartedAt}>{formatUtcInstant(booking.paymentStartedAt)}</time></p>}
    {payment && <dl className="mt-5 space-y-4 rounded-control bg-canvas p-4 text-body-sm">
      <div><dt className="text-muted">Mã lần thanh toán</dt><dd className="mt-2 break-all font-heading text-label font-semibold">{payment.paymentId}</dd></div>
      <div><dt className="text-muted">Số tiền máy chủ đã chốt</dt><dd className="mt-2 break-all font-heading text-2xl font-bold tabular-nums text-accent">{formatBookingAmount(payment.amount)}</dd></div>
      <div><dt className="text-muted">Thông tin lần thanh toán</dt><dd className="mt-2 leading-6">{!paymentConfirmed ? "Cần kiểm tra lại từ máy chủ"
        : payment.reconciliationRequired ? "Máy chủ yêu cầu đối soát; chưa thể tiếp tục"
        : payment.status === "INITIATED" ? "Đã khởi tạo, chưa gửi cổng thanh toán"
        : payment.status === "PENDING" ? "Đang chờ xác nhận từ máy chủ"
        : payment.status === "FAILED" ? "Máy chủ xác nhận thất bại"
        : payment.status === "CANCELLED" ? "Máy chủ xác nhận đã hủy"
        : "Máy chủ đã xác nhận kết quả giao dịch"}</dd></div>
    </dl>}
    {receipt && paymentConfirmed && <p className="mt-3 break-all text-body-sm text-muted">Mã tham chiếu thanh toán: {receipt.internalReference}</p>}
    {providerExpiresAt && <p className="mt-3 break-all text-xs text-muted">Hạn gửi VNPAY Sandbox (VND): <time dateTime={providerExpiresAt}>{formatUtcInstant(providerExpiresAt)}</time>. Đây là hạn cổng do máy chủ trả về, có thể sớm hơn hạn đặt vé gốc.</p>}
    {frozen && !payment && <StatusFeedback compact role="status" className="mt-4 leading-6" message={hasIdentityHint
      ? "Đơn đã khóa. Chưa thể đọc lần thanh toán từ máy chủ. Hãy cập nhật đơn để kiểm tra lại mã đã nhận; không tự gửi lại hay tạo lần thanh toán mới."
      : "Đơn đã khóa nhưng chưa có mã lần thanh toán để tra cứu. Không thể tự tạo lần mới. Hãy kiểm tra lại đơn đặt vé; thông tin thanh toán sẽ cần được khôi phục qua hỗ trợ hoặc luồng tra cứu được máy chủ cung cấp."} />}
    {frozen && <OwnedPaymentStatusPanel booking={booking} payment={payment} confirmed={confirmed && paymentConfirmed} busy={busy} refresh={refresh} />}
    {notice && <StatusFeedback compact role="status" className="mt-4 text-accent" message={notice} />}
    {reviewRequired && <div className="mt-4 rounded-lg border border-outline bg-panel-low p-3"><p role="status" className="text-xs leading-6 text-muted">Cần xem lại dữ liệu máy chủ trước khi tiếp tục. Yêu cầu trước có thể đã được ghi nhận; không tự gửi lại hay tạo lần thanh toán mới.</p><Button variant="secondary" className="mt-3 w-full" disabled={busy || !confirmed || (frozen && !paymentConfirmed)} onClick={acknowledgeReview}>Đã xem dữ liệu thanh toán máy chủ</Button></div>}
    {reason && <p className="mt-3 text-xs leading-6 text-muted">{reason}</p>}
    {!frozen ? <Button className="mt-5 w-full shadow-lg shadow-action/15" disabled={blocked} onClick={() => void mutate("INITIATE")}>Tiến hành thanh toán</Button>
      : payment && <><p className="mt-4 text-body-sm leading-6 text-muted">VNPAY Sandbox là cổng thử nghiệm. Máy chủ kiểm tra cấu hình và điều kiện chuyển cổng; chỉ xác minh trên máy chủ mới xác nhận kết quả thanh toán.</p><Button className="mt-4 w-full shadow-lg shadow-action/15" disabled={blocked || !paymentConfirmed || !unresolved} onClick={() => void mutate("SUBMIT")}>Mở VNPAY Sandbox</Button></>}
  </SurfaceCard>;
}
