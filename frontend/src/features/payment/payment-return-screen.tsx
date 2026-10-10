"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { bookingSummaryHref, formatBookingAmount } from "@/features/booking/booking-service";
import { useBookingDetail } from "@/features/booking/use-booking-detail";
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
    <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold focus:outline-none sm:text-4xl">Kiểm tra kết quả thanh toán</h1>
    <p className="mt-3 text-sm leading-6 text-muted">Quay về từ VNPAY chưa xác nhận thanh toán. Kết quả được đọc từ máy chủ bằng tài khoản khách hàng của bạn.</p>
    {!isHydrated || hint === undefined ? <p role="status" className="mt-6">Đang tải thông tin tra cứu…</p>
      : !session ? <div className="mt-6 rounded-xl border border-outline/40 bg-panel p-6"><p>Đăng nhập để kiểm tra kết quả thanh toán.</p><Link className="mt-4 inline-flex min-h-11 items-center text-accent" href={LOGIN_HREF}>Đăng nhập</Link></div>
      : !hint?.paymentId ? <div role="status" className="mt-6 rounded-xl border border-outline/40 bg-panel p-6"><h2 className="text-xl font-bold text-accent">Chưa thể xác định kết quả thanh toán</h2><p className="mt-3 text-sm leading-6 text-muted">Không có mã lần thanh toán trong tab này để tra cứu. Quay về thông tin đặt vé trong tab đã mở thanh toán hoặc dùng liên kết đặt vé đã lưu. Nếu đã mất mã, hãy liên hệ hỗ trợ. Không gửi lại hay tạo lần thanh toán mới; thành phần đơn đã khóa vẫn giữ nguyên.</p></div>
      : <PaymentReturnContent key={`${hint.bookingId}:${hint.paymentId}:${session.accessToken}`} id={hint.bookingId} paymentId={hint.paymentId} token={session.accessToken} />}
    <Link href="/movies" className="mt-6 inline-flex min-h-11 items-center text-accent">Xem danh sách phim</Link>
  </>;
}

function PaymentReturnContent({ id, paymentId, token }: { id: string; paymentId: string; token: string }) {
  const { booking, payment, loading, confirmed, paymentConfirmed, error, refresh } = useBookingDetail(id, token, paymentId);
  const { clearSession } = useAuth();
  return <div className="mt-6 max-w-2xl rounded-2xl border border-outline/40 bg-panel p-5 sm:p-7">
    {error && <div role="alert" className="mb-4 text-sm text-error"><p>{error.message}</p>{error.status === 401 && <Link onClick={clearSession} href={LOGIN_HREF} className="mt-3 inline-flex min-h-11 items-center text-accent">Đăng nhập lại</Link>}</div>}
    {booking ? <>
      <dl className="space-y-3 text-sm">
        <div><dt>Mã đặt vé</dt><dd className="break-all font-semibold">{booking.bookingCode}</dd></div>
        <div><dt>Trạng thái đặt vé từ máy chủ</dt><dd>{displayLabel(booking.status)}{!confirmed && " · cần cập nhật"}</dd></div>
        {payment && <><div><dt>Mã lần thanh toán</dt><dd className="break-all">{payment.paymentId}</dd></div><div><dt>Số tiền máy chủ đã chốt</dt><dd className="break-all font-heading tabular-nums">{formatBookingAmount(payment.amount)}</dd></div></>}
        {booking.paymentStartedAt && <div><dt>Bắt đầu thanh toán</dt><dd><time dateTime={booking.paymentStartedAt}>{formatUtcInstant(booking.paymentStartedAt)}</time></dd></div>}
        <div><dt>Hạn đặt vé gốc</dt><dd><time dateTime={booking.expiresAt}>{formatUtcInstant(booking.expiresAt)}</time></dd></div>
      </dl>
      <p className="mt-4 text-xs leading-6 text-muted">Ghế, bắp nước và khuyến mãi giữ nguyên theo đơn đã khóa. Kiểm tra trạng thái không gia hạn đặt vé.</p>
      <OwnedPaymentStatusPanel booking={booking} payment={payment} busy={loading} confirmed={confirmed && paymentConfirmed} refresh={refresh} />
      <Link href={bookingSummaryHref(booking.id)} className="mt-5 inline-flex min-h-11 items-center text-accent">Quay về thông tin đặt vé</Link>
    </> : <><p role="status">{loading ? "Đang xác minh thanh toán…" : "Chưa thể xác định kết quả thanh toán. Chưa đọc được đơn đặt vé thuộc tài khoản của bạn."}</p><Button variant="secondary" className="mt-4" disabled={loading} onClick={() => void refresh()}>Kiểm tra lại trạng thái</Button></>}
  </div>;
}
