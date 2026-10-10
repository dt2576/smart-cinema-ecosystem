"use client";

import { Button } from "@/components/ui/button";
import type { Booking } from "@/features/booking/booking.types";
import type { OwnedPaymentAttempt } from "@/features/payment/payment-initiation.types";
import { paymentStatusPresentation } from "@/features/payment/payment-status-service";

export function OwnedPaymentStatusPanel({ booking, payment, confirmed, busy, refresh }: {
  booking: Booking; payment?: OwnedPaymentAttempt; confirmed: boolean; busy: boolean; refresh: () => Promise<void>;
}) {
  const presentation = paymentStatusPresentation(booking, payment, confirmed, busy);
  return <section aria-label="Kết quả thanh toán từ máy chủ" aria-busy={busy} className="mt-5 rounded-xl border border-outline/50 bg-panel-low p-4">
    <div role="status" aria-live="polite"><h3 className="font-bold text-accent">{presentation.title}</h3><p className="mt-2 text-sm leading-6 text-muted">{presentation.detail}</p></div>
    {booking.status === "EXPIRED" && <p className="mt-3 text-sm text-muted">Đơn đặt vé đã hết hạn. Hết hạn đặt vé không có nghĩa giao dịch đã thất bại; hạn gốc không được gia hạn.</p>}
    {booking.status === "CANCELLED" && <p className="mt-3 text-sm text-muted">Đơn đặt vé đã hủy. Hủy đơn không tự xác nhận hủy giao dịch tại cổng thanh toán.</p>}
    <Button variant="secondary" className="mt-4 w-full" disabled={busy} onClick={() => void refresh()}>Kiểm tra lại trạng thái</Button>
    <p className="mt-3 text-xs leading-5 text-muted">Tự kiểm tra có giới hạn. Nếu chưa có kết quả, bạn có thể kiểm tra lại hoặc liên hệ hỗ trợ; không tự mở lại cổng thanh toán.</p>
  </section>;
}
