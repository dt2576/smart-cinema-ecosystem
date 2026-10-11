"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatusFeedback } from "@/components/ui/status-feedback";
import { useAuth } from "@/features/auth/auth-context";
import { bookingSummaryHref, formatBookingAmount } from "@/features/booking/booking-service";
import { useBookingDetail } from "@/features/booking/use-booking-detail";
import { BookingShowtimeCard } from "@/features/booking/booking-showtime-card";
import { BookingSummarySkeleton } from "@/features/booking/booking-summary-skeleton";
import { readPaymentReturnHint, type PaymentRecoveryHint } from "@/features/payment/payment-initiation-storage";
import { OwnedPaymentStatusPanel } from "@/features/payment/owned-payment-status-panel";
import { PAYMENT_RETURN_PATH } from "@/features/payment/payment-status-service";
import { displayLabel } from "@/lib/display-labels";
import { formatUtcInstant } from "@/lib/display-format";

const LOGIN_HREF = `/login?${new URLSearchParams({ returnTo: PAYMENT_RETURN_PATH })}`;

export function PaymentReturnScreen() {
  const { session, isHydrated } = useAuth();
  const [hint, setHint] = useState<PaymentRecoveryHint | null>();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // Backend redirects to a fixed clean URL. Unexpected browser parameters are
    // discarded, never parsed, forwarded, logged or interpreted financially.
    if (window.location.search || window.location.hash) window.history.replaceState(window.history.state, "", PAYMENT_RETURN_PATH);
    const initial = setTimeout(() => { setHint(readPaymentReturnHint()); heading.current?.focus(); }, 0);
    return () => clearTimeout(initial);
  }, []);
  return <>
    <p className="mb-3 font-heading text-label font-semibold uppercase tracking-wide text-accent">Kết quả giao dịch</p>
    <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold focus:outline-none sm:text-4xl">Kiểm tra kết quả thanh toán</h1>
    <p className="mt-3 max-w-3xl text-body leading-6 text-muted">Quay về từ VNPAY chưa xác nhận thanh toán. Kết quả được đọc từ máy chủ bằng tài khoản khách hàng của bạn.</p>
    {!isHydrated || hint === undefined ? <div className="mt-6"><BookingSummarySkeleton compact message="Đang tải thông tin tra cứu…" /></div>
      : !session ? <SurfaceCard className="mt-6 max-w-2xl"><p>Đăng nhập để kiểm tra kết quả thanh toán.</p><Link className="mt-5 inline-flex min-h-control items-center justify-center rounded-control bg-action px-5 font-heading text-label font-semibold text-on-action" href={LOGIN_HREF}>Đăng nhập</Link></SurfaceCard>
      : !hint?.paymentId ? <StatusFeedback role="status" className="mt-6 max-w-2xl" title="Chưa thể xác định kết quả thanh toán" message="Không có mã lần thanh toán trong tab này để tra cứu. Quay về thông tin đặt vé trong tab đã mở thanh toán hoặc dùng liên kết đặt vé đã lưu. Nếu đã mất mã, hãy liên hệ hỗ trợ. Không gửi lại hay tạo lần thanh toán mới; thành phần đơn đã khóa vẫn giữ nguyên." />
      : <PaymentReturnContent key={`${hint.bookingId}:${hint.paymentId}:${session.accessToken}`} id={hint.bookingId} paymentId={hint.paymentId} token={session.accessToken} />}
    <Link href="/movies" className="mt-6 inline-flex min-h-11 items-center text-accent">Xem danh sách phim</Link>
  </>;
}

function PaymentReturnContent({ id, paymentId, token }: { id: string; paymentId: string; token: string }) {
  const { booking, payment, loading, confirmed, paymentConfirmed, error, refresh } = useBookingDetail(id, token, paymentId);
  const { clearSession } = useAuth();
  return <div className="mt-6 grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
    {error && <SurfaceCard tone="subtle" role="alert" className="border-error/30 text-body text-error lg:col-span-2"><p>{error.message}</p>{error.status === 401 && <Link onClick={clearSession} href={LOGIN_HREF} className="mt-3 inline-flex min-h-11 items-center text-accent">Đăng nhập lại</Link>}</SurfaceCard>}
    {booking ? <>
      <div className="min-w-0 space-y-6">
      <OwnedPaymentStatusPanel booking={booking} payment={payment} busy={loading} confirmed={confirmed && paymentConfirmed} refresh={refresh} />
      <SurfaceCard aria-label="Thông tin giao dịch đã lưu"><h2 className="text-heading-md font-bold">Thông tin thanh toán đã lưu</h2>
      <dl className="mt-5 grid min-w-0 gap-5 text-body sm:grid-cols-2 [&>div]:min-w-0 [&_dt]:text-body-sm [&_dt]:text-muted [&_dd]:mt-2 [&_dd]:break-words">
        <div><dt>Mã đặt vé</dt><dd className="break-all font-semibold">{booking.bookingCode}</dd></div>
        <div><dt>Trạng thái đặt vé từ máy chủ</dt><dd><StatusBadge>{displayLabel(booking.status)}{!confirmed && " · cần cập nhật"}</StatusBadge></dd></div>
        {payment && <><div><dt>Mã lần thanh toán</dt><dd className="break-all font-heading font-semibold">{payment.paymentId}</dd></div><div><dt>Số tiền máy chủ đã chốt</dt><dd className="break-all font-heading text-2xl font-bold tabular-nums text-accent">{formatBookingAmount(payment.amount)}</dd></div></>}
        {booking.paymentStartedAt && <div><dt>Bắt đầu thanh toán</dt><dd><time dateTime={booking.paymentStartedAt}>{formatUtcInstant(booking.paymentStartedAt)}</time></dd></div>}
        <div><dt>Hạn đặt vé gốc</dt><dd><time dateTime={booking.expiresAt}>{formatUtcInstant(booking.expiresAt)}</time></dd></div>
      </dl>
      <p className="mt-5 border-t border-outline/30 pt-4 text-body-sm leading-6 text-muted">Ghế, bắp nước và khuyến mãi giữ nguyên theo đơn đã khóa. Kiểm tra trạng thái không gia hạn đặt vé.</p>
      </SurfaceCard>
      <Link href={bookingSummaryHref(booking.id)} className="inline-flex min-h-control w-full items-center justify-center rounded-control bg-action px-5 py-3 text-center font-heading text-label font-semibold text-on-action shadow-lg shadow-action/15 sm:w-auto">Quay về thông tin đặt vé</Link>
      </div>
      <aside aria-label="Chi tiết đặt vé đang tra cứu" className="min-w-0 space-y-6">
        <BookingShowtimeCard booking={booking} compact />
        <SurfaceCard><h2 className="text-heading-md font-bold">Ghế và bắp nước đã lưu</h2><p className="mt-3 text-body-sm text-muted">{booking.seatUnitCount} ghế · {booking.guestCount} khách</p><ul className="mt-4 space-y-3">{booking.seats.map(line => <li key={line.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-panel-low p-3 text-body-sm"><span className="break-words font-heading font-semibold text-accent">{line.row}{line.number} · {line.type === "COUPLE" ? "Ghế đôi" : line.type === "VIP" ? "VIP" : "Thường"}</span><span>{line.guestCount} khách</span></li>)}</ul>{booking.concessions.length ? <ul className="mt-4 space-y-2 border-t border-outline/30 pt-4 text-body-sm text-muted">{booking.concessions.map(line => <li key={line.id} className="break-words">{line.name} × {line.quantity}</li>)}</ul> : <p className="mt-4 text-body-sm text-muted">Đơn đặt vé này chưa có bắp nước.</p>}</SurfaceCard>
      </aside>
    </> : <SurfaceCard className="lg:col-span-2">{loading ? <BookingSummarySkeleton compact message="Đang xác minh thanh toán…" /> : <StatusFeedback compact role="status" message="Chưa thể xác định kết quả thanh toán. Chưa đọc được đơn đặt vé thuộc tài khoản của bạn." />}<Button variant="secondary" className="mt-4" disabled={loading} onClick={() => void refresh()}>Kiểm tra lại trạng thái</Button></SurfaceCard>}
  </div>;
}
