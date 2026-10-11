"use client";
import { formatUtcInstant } from "@/lib/display-format";

import Link from "next/link";
import { displayLabel } from "@/lib/display-labels";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SurfaceCard } from "@/components/ui/surface-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { BookingShowtimeCard } from "@/features/booking/booking-showtime-card";
import { BookingSummarySkeleton } from "@/features/booking/booking-summary-skeleton";
import { useAuth } from "@/features/auth/auth-context";
import { seatLoginReturn } from "@/features/auth/auth-return";
import { creationSnapshot, readCreation, subscribeCreation } from "@/features/booking/booking-creation-storage";
import { isBookingId } from "@/features/booking/booking-api";
import { bookingSummaryHref, formatBookingAmount } from "@/features/booking/booking-service";
import { useBookingDetail } from "@/features/booking/use-booking-detail";
import { bookingConcessionsHref, CONCESSION_CATEGORY_LABELS, concessionEditability } from "@/features/concession/concession-composition-service";
import { MovieFeedback } from "@/features/movie/movie-feedback";
import { OwnedPromotionPanel } from "@/features/promotion/owned-promotion-panel";
import { OwnedPaymentInitiationPanel } from "@/features/payment/owned-payment-initiation-panel";

export function OwnedBookingSummaryScreen({ bookingId }: { bookingId: string }) {
  const { session, isHydrated } = useAuth();
  if (!isBookingId(bookingId)) return <MovieFeedback title="Liên kết đặt vé không hợp lệ" message="Dùng liên kết đặt vé do máy chủ tạo từ bước chọn ghế." />;
  if (!isHydrated) return <p role="status">Đang tải phiên đăng nhập…</p>;
  if (!session) return <><MovieFeedback title="Đăng nhập để xem đơn đặt vé" message="Chi tiết đặt vé yêu cầu tài khoản khách hàng của bạn. Chỉ có mã đặt vé không đủ để truy cập." /><Link href={`/login?${new URLSearchParams({ returnTo: bookingSummaryHref(bookingId) })}`} className="mt-6 inline-flex min-h-11 items-center text-accent">Đăng nhập</Link></>;
  return <OwnedBookingSummaryContent key={`${bookingId}:${session.accessToken}`} id={bookingId} token={session.accessToken} />;
}

function OwnedBookingSummaryContent({ id, token }: { id: string; token: string }) {
  const { booking, now, loading, confirmed, error, refresh, reviewRequired, notice, mutatePromotion, acknowledgeReview,
    payment, paymentReceipt, hasPaymentIdentityHint, paymentConfirmed, paymentReviewRequired, paymentNotice, providerExpiresAt, mutatePayment, acknowledgePaymentReview } = useBookingDetail(id, token);
  const { clearSession } = useAuth();
  const creation = useSyncExternalStore(subscribeCreation, creationSnapshot, () => null);
  const signIn = <Link onClick={clearSession} href={`/login?${new URLSearchParams({ returnTo: bookingSummaryHref(id) })}`} className="mt-4 inline-flex min-h-11 items-center text-accent">Đăng nhập lại</Link>;
  if (!booking) return <>{loading ? <BookingSummarySkeleton /> : <MovieFeedback title={error?.status === 404 ? "Đơn đặt vé không khả dụng" : error?.status === 403 ? "Cần quyền khách hàng" : "Không thể tải đơn đặt vé"} message={error?.message ?? "Chưa thể xác nhận trạng thái đặt vé."} retry={error && ![400, 401, 403, 404].includes(error.status) ? () => void refresh() : undefined} />}{error?.status === 401 && signIn}<Link href="/movies" className="mt-6 inline-flex min-h-11 items-center text-accent">Xem danh sách phim</Link></>;
  const elapsed = now >= Date.parse(booking.expiresAt);
  const seconds = Math.max(0, Math.ceil((Date.parse(booking.expiresAt) - now) / 1000));
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const starts = new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(new Date(booking.startsAt));
  const record = readCreation(creation, booking.showtimeId);
  const originalSeatHref = record?.bookingId === booking.id ? seatLoginReturn(record.seatHref ?? null) : null;
  const seatUrl = originalSeatHref ? new URL(originalSeatHref, "https://smart-cinema.local") : null;
  const matchingContext = seatUrl?.pathname === `/showtimes/${booking.showtimeId}/seats` && seatUrl.searchParams.get("movieId") === booking.movieId && seatUrl.searchParams.get("cinemaId") === booking.cinemaId;
  // Booking exposes no display zone. Never derive a local query date by slicing
  // a UTC instant. Direct-entry recovery uses server-owned Showtime date options.
  const seatHref = matchingContext ? originalSeatHref! : `/movies/${booking.movieId}/cinemas/${booking.cinemaId}/showtimes?${new URLSearchParams({ showtimeId: booking.showtimeId })}`;
  const recoveryLabel = matchingContext ? "Quay lại chọn ghế" : "Chọn suất chiếu";
  return <>
    <nav aria-label="Tiến trình chọn vé" className="mb-6 flex flex-wrap items-center gap-3 font-heading text-xs uppercase tracking-wide text-muted"><Link href={seatHref} className="inline-flex min-h-11 items-center text-accent">{matchingContext ? "Chọn ghế" : "Chọn suất chiếu"}</Link><span aria-hidden="true">→</span><span aria-current="step" className="text-accent">Thông tin đặt vé</span></nav>
    <p className="mb-3 flex items-center gap-2 font-heading text-label font-semibold uppercase tracking-wide text-accent"><Icon name="film" /> Xem lại đơn đặt vé</p>
    <h1 className="text-3xl font-bold sm:text-4xl">Thông tin đặt vé</h1>
    <p className="mt-3 max-w-3xl text-body leading-6 text-muted">Đơn đặt vé đã lưu của bạn, được đọc từ máy chủ. Tạo đơn không khởi tạo thanh toán.</p>
    <SurfaceCard padding="none" aria-label="Thông tin nhận diện đơn đặt vé" className="my-6 flex flex-wrap items-center justify-between gap-4 p-5"><div className="min-w-0"><p className="mb-2 text-body-sm text-muted">Mã đặt vé</p><p className="break-all font-heading text-lg font-semibold">{booking.bookingCode}</p><p className="mt-2 break-all text-body-sm text-muted">ID đặt vé: {booking.id}</p></div><StatusBadge>Trạng thái: {displayLabel(booking.status)}{!confirmed && " · xác nhận lần cuối, cần cập nhật"}</StatusBadge></SurfaceCard>
    {booking.paymentStartedAt && <SurfaceCard tone="subtle" padding="none" className="mb-6 flex items-start gap-3 border-action/20 p-5"><Icon name="info" className="mt-1 shrink-0 text-accent" /><div className="min-w-0"><p className="font-heading text-label font-semibold text-accent">Thành phần đơn đã khóa</p><p className="mt-2 text-body-sm leading-6 text-muted">Ghế, bắp nước và khuyến mãi giữ nguyên từ lần bắt đầu thanh toán đầu tiên. Khóa đơn không xác nhận đã trả tiền; hạn đặt vé gốc giữ nguyên.</p></div></SurfaceCard>}
    {loading && <p role="status" className="mb-4 text-sm text-muted">Đang cập nhật trạng thái đặt vé…</p>}
    {error && <div role="alert" className="mb-6 rounded-xl border border-error bg-panel p-5"><p className="text-sm text-error">{error.message}</p>{error.status === 401 ? signIn : <Button variant="secondary" onClick={() => void refresh()} className="mt-3">Tải lại đơn đặt vé</Button>}</div>}
    {booking.status === "PENDING" && elapsed && <p role="status" className="mb-6 rounded-xl border border-outline bg-panel p-5 text-sm text-muted">Đã qua hạn thanh toán. Đang kiểm tra trạng thái từ máy chủ; không tạo hạn mới hay thanh toán.</p>}
    {["EXPIRED", "CANCELLED"].includes(booking.status) && <p role="status" className="mb-6 rounded-xl bg-panel p-5 text-sm text-muted">Đơn đặt vé này {displayLabel(booking.status).toLowerCase()}. Thông tin đã lưu vẫn có thể xem; không thể tiếp tục như một đơn mới.</p>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div className="min-w-0 space-y-6">
        <BookingShowtimeCard booking={booking} startsLabel={starts} />
        <SurfaceCard aria-label="Ghế đã đặt"><h2 className="flex items-center gap-3 text-heading-md font-bold"><Icon name="user" className="shrink-0 text-accent" />Ghế đã chọn</h2><p className="mt-3 text-body-sm text-muted">{booking.seatUnitCount} ghế · {booking.guestCount} khách</p><ul className="mt-5 grid gap-4 sm:grid-cols-2">{booking.seats.map(line => <li key={line.id} className="min-w-0 rounded-control border border-outline/20 bg-panel-low p-4"><div className="min-w-0"><p className="break-words font-heading text-lg font-semibold text-accent">{line.row}{line.number} · {line.type === "COUPLE" ? "Ghế đôi" : line.type === "VIP" ? "VIP" : "Thường"}</p><p className="mt-2 text-body-sm text-muted">Một ghế không thể tách · {line.guestCount} khách</p><p className="mt-2 break-all text-body-sm text-muted">Ghế {line.seatId} · Mã giữ ghế {line.holdId}</p><p className="mt-2 break-all text-body-sm text-muted">Giá khi đặt vé: {formatBookingAmount(line.unitPrice)}</p></div><p className="mt-4 break-all font-heading text-xl font-bold tabular-nums">{formatBookingAmount(line.finalPrice)}</p></li>)}</ul><p className="mt-5 border-t border-outline/30 pt-4 text-body-sm leading-6 text-muted">Ghế đang giữ đã gắn với đơn đặt vé này. Quay lại chọn ghế không tách, trả hay gia hạn ghế. Ghế đôi vẫn là một dòng cho hai khách.</p></SurfaceCard>
        <SurfaceCard aria-label="Bắp nước đã lưu"><h2 className="flex items-center gap-3 text-heading-md font-bold"><Icon name="gift" className="shrink-0 text-accent" />Bắp nước</h2>{booking.concessions.length ? <ul className="mt-5 space-y-3">{booking.concessions.map(line => <li key={line.id} className="flex flex-wrap justify-between gap-3 rounded-control bg-panel-low p-4 text-body"><div className="min-w-0"><p className="break-words font-semibold">{line.name} × {line.quantity}</p><p className="mt-2 break-all text-body-sm text-muted">{CONCESSION_CATEGORY_LABELS[line.category]} · Đơn giá đã lưu: {formatBookingAmount(line.unitPrice)}</p></div><span className="max-w-full break-all font-heading text-lg font-semibold tabular-nums text-accent">{formatBookingAmount(line.totalPrice)}</span></li>)}</ul> : <p className="mt-3 text-body text-muted">Đơn đặt vé này chưa có bắp nước.</p>}{confirmed && !loading && !reviewRequired && !paymentReviewRequired && !concessionEditability(booking, now) ? <Link href={bookingConcessionsHref(booking.id)} className="mt-5 inline-flex min-h-control items-center rounded-control bg-action px-5 font-heading text-label font-semibold text-on-action">{booking.concessions.length ? "Chỉnh sửa bắp nước" : "Thêm bắp nước"}</Link> : <p className="mt-4 text-body-sm leading-6 text-muted">{concessionEditability(booking, now) ?? (reviewRequired ? "Cần xem và xác nhận kết quả khuyến mãi trước khi chỉnh sửa bắp nước." : "Cần cập nhật đơn đặt vé trước khi chỉnh sửa bắp nước.")}</p>}</SurfaceCard>
        <OwnedPromotionPanel booking={booking} now={now} busy={loading} confirmed={confirmed && !paymentReviewRequired} reviewRequired={reviewRequired} notice={notice} mutate={mutatePromotion} acknowledgeReview={acknowledgeReview} />
      </div>
      <aside aria-label="Tổng tiền đặt vé từ máy chủ" className="surface-card min-w-0 border-action/30 bg-panel p-6 sm:p-8 lg:sticky lg:top-28"><h2 className="text-heading-md font-bold">Thông tin thanh toán</h2><p className="mt-3 font-heading text-body-sm font-semibold tracking-wide text-accent">SỐ TIỀN ĐẶT VÉ ĐÃ LƯU</p><dl className="mt-6 space-y-4 text-body">{[["Tiền vé", booking.seatAmount], ["Tiền bắp nước", booking.concessionAmount], ["Tạm tính", booking.subtotal], ["Giảm giá khuyến mãi", booking.discount], ["Tổng thanh toán", booking.finalAmount]].map(([name, amount]) => <div key={name} className={`flex flex-wrap justify-between gap-2 ${name === "Tổng thanh toán" ? "border-t border-outline/40 pt-5 font-bold text-accent" : ""}`}><dt>{name}</dt><dd className={`max-w-full break-all font-heading tabular-nums ${name === "Tổng thanh toán" ? "text-2xl" : "font-semibold"}`}>{formatBookingAmount(amount)}</dd></div>)}</dl><p className="mt-4 text-body-sm leading-6 text-muted">Số tiền hiển thị chính xác như đã lưu cho đơn đặt vé này.</p>
        <div className="mt-6 rounded-lg border border-outline/40 bg-panel-low p-4"><p className="text-sm font-semibold text-accent">Hạn thanh toán từ máy chủ</p><p role="timer" aria-label="Thời gian thanh toán còn lại" className="mt-2 font-heading text-2xl tabular-nums">{booking.status === "PENDING" ? countdown : "Đã đóng"}</p><p className="mt-2 break-all text-xs text-muted"><time dateTime={booking.expiresAt}>{formatUtcInstant(booking.expiresAt)}</time></p><p className="mt-2 text-xs leading-6 text-muted">Hạn đặt vé gốc từ máy chủ. Tải lại và điều hướng không gia hạn.</p></div>
        <OwnedPaymentInitiationPanel booking={booking} now={now} busy={loading} confirmed={confirmed} compositionReviewRequired={reviewRequired}
          payment={payment} receipt={paymentReceipt} hasIdentityHint={hasPaymentIdentityHint} paymentConfirmed={paymentConfirmed} reviewRequired={paymentReviewRequired}
          notice={paymentNotice} providerExpiresAt={providerExpiresAt} mutate={mutatePayment} acknowledgeReview={acknowledgePaymentReview} refresh={refresh} />
        <Button variant="secondary" disabled={loading} onClick={() => void refresh()} className="mt-3 w-full">Cập nhật đơn đặt vé</Button><Link href={seatHref} className="mt-3 inline-flex min-h-11 w-full items-center justify-center text-sm text-accent">{recoveryLabel}</Link>
      </aside>
    </div>
  </>;
}
