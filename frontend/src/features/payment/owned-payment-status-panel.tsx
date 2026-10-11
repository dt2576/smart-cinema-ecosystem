"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import type { Booking } from "@/features/booking/booking.types";
import type { OwnedPaymentAttempt } from "@/features/payment/payment-initiation.types";
import { paymentStatusPresentation } from "@/features/payment/payment-status-service";

export function OwnedPaymentStatusPanel({ booking, payment, confirmed, busy, refresh }: {
  booking: Booking; payment?: OwnedPaymentAttempt; confirmed: boolean; busy: boolean; refresh: () => Promise<void>;
}) {
  const presentation = paymentStatusPresentation(booking, payment, confirmed, busy);
  const recheckButton = useRef<HTMLButtonElement>(null);
  const restoreKeyboardFocus = useRef(false);
  useEffect(() => {
    if (busy || !restoreKeyboardFocus.current) return;
    restoreKeyboardFocus.current = false;
    // Native disabled buttons can lose keyboard focus during a read. Restore
    // only if focus was not moved to another control while awaiting the result.
    if (document.activeElement === document.body) recheckButton.current?.focus();
  }, [busy]);
  // Visual emphasis consumes the existing authoritative presentation. It never
  // interprets callback fields or independently decides a financial outcome.
  const successful = presentation.title === "Thanh toán thành công";
  const failed = presentation.title === "Thanh toán không thành công";
  const uncertain = presentation.title === "Chưa thể xác định kết quả thanh toán";
  const cancelled = presentation.title === "Thanh toán đã hủy";
  const tone = successful ? "success" : failed ? "error" : uncertain || cancelled ? "muted" : "pending";
  const emphasis = successful ? "border-success/30 bg-gradient-to-br from-success/10 to-panel-low text-success"
    : failed ? "border-error/30 bg-gradient-to-br from-error/10 to-panel-low text-error"
    : uncertain || cancelled ? "text-muted" : "border-action/30 bg-gradient-to-br from-action/10 to-panel-low text-accent";
  return <SurfaceCard tone="subtle" aria-label="Kết quả thanh toán từ máy chủ" aria-busy={busy} data-feedback-tone={tone} className={`mt-5 ${emphasis}`}>
    <div role="status" aria-live="polite">
      <div aria-hidden="true" className={`mb-5 flex size-16 items-center justify-center rounded-full border-2 border-current bg-panel-low ${busy ? "motion-safe:animate-pulse" : ""}`}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d={successful ? "m7 12 3 3 7-7" : failed || cancelled ? "m8 8 8 8M8 16l8-8" : uncertain ? "M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 16v.2" : "M12 6v6l4 2"} /></svg>
      </div>
      <h3 className="break-words text-heading-md font-bold">{presentation.title}</h3><p className="mt-3 text-body leading-6 text-muted">{presentation.detail}</p>
    </div>
    {booking.status === "EXPIRED" && <p className="mt-3 text-sm text-muted">Đơn đặt vé đã hết hạn. Hết hạn đặt vé không có nghĩa giao dịch đã thất bại; hạn gốc không được gia hạn.</p>}
    {booking.status === "CANCELLED" && <p className="mt-3 text-sm text-muted">Đơn đặt vé đã hủy. Hủy đơn không tự xác nhận hủy giao dịch tại cổng thanh toán.</p>}
    <Button ref={recheckButton} variant="secondary" className="mt-5 w-full" disabled={busy} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") restoreKeyboardFocus.current = true; }} onClick={() => void refresh()}>Kiểm tra lại trạng thái</Button>
    <p className="mt-4 text-body-sm leading-6 text-muted">Tự kiểm tra có giới hạn. Nếu chưa có kết quả, bạn có thể kiểm tra lại hoặc liên hệ hỗ trợ; không tự mở lại cổng thanh toán.</p>
  </SurfaceCard>;
}
