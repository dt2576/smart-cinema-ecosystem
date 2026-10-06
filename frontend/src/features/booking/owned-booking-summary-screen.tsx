"use client";
import { formatUtcInstant } from "@/lib/display-format";

import Link from "next/link";
import { displayLabel } from "@/lib/display-labels";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/features/auth/auth-context";
import { seatLoginReturn } from "@/features/auth/auth-return";
import { creationSnapshot, readCreation, subscribeCreation } from "@/features/booking/booking-creation-storage";
import { isBookingId } from "@/features/booking/booking-api";
import { bookingSummaryHref, formatBookingAmount } from "@/features/booking/booking-service";
import { useBookingDetail } from "@/features/booking/use-booking-detail";
import { bookingConcessionsHref, CONCESSION_CATEGORY_LABELS, concessionEditability } from "@/features/concession/concession-composition-service";
import { MovieFeedback } from "@/features/movie/movie-feedback";
import { OwnedPromotionPanel } from "@/features/promotion/owned-promotion-panel";

export function OwnedBookingSummaryScreen({ bookingId }: { bookingId: string }) {
  const { session, isHydrated } = useAuth();
  if (!isBookingId(bookingId)) return <MovieFeedback title="Liên kết đặt vé không hợp lệ" message="Dùng liên kết đặt vé do máy chủ tạo từ bước chọn ghế." />;
  if (!isHydrated) return <p role="status">Đang tải phiên đăng nhập…</p>;
  if (!session) return <><MovieFeedback title="Đăng nhập để xem đơn đặt vé" message="Chi tiết đặt vé yêu cầu tài khoản khách hàng của bạn. Chỉ có mã đặt vé không đủ để truy cập." /><Link href={`/login?${new URLSearchParams({ returnTo: bookingSummaryHref(bookingId) })}`} className="mt-6 inline-flex min-h-11 items-center text-accent">Đăng nhập</Link></>;
  return <OwnedBookingSummaryContent key={`${bookingId}:${session.accessToken}`} id={bookingId} token={session.accessToken} />;
}

function OwnedBookingSummaryContent({ id, token }: { id: string; token: string }) {
  const { booking, now, loading, confirmed, error, refresh, reviewRequired, notice, mutatePromotion, acknowledgeReview } = useBookingDetail(id, token);
  const { clearSession } = useAuth();
  const creation = useSyncExternalStore(subscribeCreation, creationSnapshot, () => null);
  const signIn = <Link onClick={clearSession} href={`/login?${new URLSearchParams({ returnTo: bookingSummaryHref(id) })}`} className="mt-4 inline-flex min-h-11 items-center text-accent">Đăng nhập lại</Link>;
  if (!booking) return <>{loading ? <p role="status" className="rounded-xl bg-panel p-10 text-center text-muted">Đang tải đơn đặt vé…</p> : <MovieFeedback title={error?.status === 404 ? "Đơn đặt vé không khả dụng" : error?.status === 403 ? "Cần quyền khách hàng" : "Không thể tải đơn đặt vé"} message={error?.message ?? "Chưa thể xác nhận trạng thái đặt vé."} retry={error && ![400, 401, 403, 404].includes(error.status) ? () => void refresh() : undefined} />}{error?.status === 401 && signIn}<Link href="/movies" className="mt-6 inline-flex min-h-11 items-center text-accent">Xem danh sách phim</Link></>;
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
    <h1 className="text-3xl font-bold sm:text-4xl">Thông tin đặt vé</h1>
    <p className="mt-3 text-muted">Đơn đặt vé đã lưu của bạn, được đọc từ máy chủ. Tạo đơn không khởi tạo thanh toán.</p>
    <section aria-label="Thông tin nhận diện đơn đặt vé" className="my-6 rounded-xl border border-outline/40 bg-panel p-5"><p className="break-all font-semibold">{booking.bookingCode}</p><p className="mt-2 break-all text-sm text-muted">ID đặt vé: {booking.id}</p><p className="mt-2 text-sm text-accent">Trạng thái: {displayLabel(booking.status)}{!confirmed && " · xác nhận lần cuối, cần cập nhật"}</p></section>
    {loading && <p role="status" className="mb-4 text-sm text-muted">Đang cập nhật trạng thái đặt vé…</p>}
    {error && <div role="alert" className="mb-6 rounded-xl border border-error bg-panel p-5"><p className="text-sm text-error">{error.message}</p><Button variant="secondary" onClick={() => void refresh()} className="mt-3">Tải lại đơn đặt vé</Button></div>}
    {booking.status === "PENDING" && elapsed && <p role="status" className="mb-6 rounded-xl border border-outline bg-panel p-5 text-sm text-muted">Đã qua hạn thanh toán. Đang kiểm tra trạng thái từ máy chủ; không tạo hạn mới hay thanh toán.</p>}
    {["EXPIRED", "CANCELLED"].includes(booking.status) && <p role="status" className="mb-6 rounded-xl bg-panel p-5 text-sm text-muted">Đơn đặt vé này {displayLabel(booking.status).toLowerCase()}. Thông tin đã lưu vẫn có thể xem; không thể tiếp tục như một đơn mới.</p>}
    <section aria-label="Suất chiếu đã đặt" className="mb-6 flex flex-wrap items-center gap-5 rounded-2xl border border-outline/30 bg-panel p-5 sm:p-6"><div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg bg-panel-high text-accent"><Icon name="film" width={36} height={36} /></div><div className="min-w-0 flex-1"><h2 className="break-words text-xl font-bold">{booking.movieTitle}</h2><p className="mt-2 break-words text-sm">{booking.cinemaName} · {booking.hallName}</p><p className="mt-2 text-sm text-accent"><time dateTime={booking.startsAt}>{starts}</time></p><p className="mt-2 text-xs leading-6 text-muted">Thông tin suất chiếu là thông tin hiện tại. Giá ghế và tổng tiền giữ nguyên như khi lưu đơn đặt vé.</p></div></section>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        <section aria-label="Ghế đã đặt" className="rounded-2xl border border-outline/30 bg-panel p-5 sm:p-6"><h2 className="text-xl font-bold">Ghế đã chọn</h2><p className="mt-3 text-sm text-muted">{booking.seatUnitCount} ghế · {booking.guestCount} khách</p><ul className="mt-3 divide-y divide-outline/30">{booking.seats.map(line => <li key={line.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="font-semibold">{line.row}{line.number} · {line.type === "COUPLE" ? "Ghế đôi" : line.type === "VIP" ? "VIP" : "Thường"}</p><p className="mt-1 text-xs text-muted">Một ghế không thể tách · {line.guestCount} khách</p><p className="mt-1 break-all text-xs text-muted">Ghế {line.seatId} · Mã giữ ghế {line.holdId}</p><p className="mt-1 text-xs text-muted">Giá khi đặt vé: {formatBookingAmount(line.unitPrice)}</p></div><span className="break-all font-heading tabular-nums">{formatBookingAmount(line.finalPrice)}</span></li>)}</ul><p className="mt-4 text-xs leading-6 text-muted">Ghế đang giữ đã gắn với đơn đặt vé này. Quay lại chọn ghế không tách, trả hay gia hạn ghế. Ghế đôi vẫn là một dòng cho hai khách.</p></section>
        <section aria-label="Bắp nước đã lưu" className="rounded-2xl border border-outline/30 bg-panel p-5 sm:p-6"><h2 className="text-xl font-bold">Bắp nước</h2>{booking.concessions.length ? <ul className="mt-3 space-y-3">{booking.concessions.map(line => <li key={line.id} className="flex flex-wrap justify-between gap-3 text-sm"><div className="min-w-0"><p className="break-words">{line.name} × {line.quantity}</p><p className="mt-1 text-xs text-muted">{CONCESSION_CATEGORY_LABELS[line.category]} · Đơn giá đã lưu: {formatBookingAmount(line.unitPrice)}</p></div><span className="break-all">{formatBookingAmount(line.totalPrice)}</span></li>)}</ul> : <p className="mt-3 text-sm text-muted">Đơn đặt vé này chưa có bắp nước.</p>}{confirmed && !loading && !reviewRequired && !concessionEditability(booking, now) ? <Link href={bookingConcessionsHref(booking.id)} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-action px-5 font-semibold text-on-action">{booking.concessions.length ? "Chỉnh sửa bắp nước" : "Thêm bắp nước"}</Link> : <p className="mt-4 text-xs leading-6 text-muted">{concessionEditability(booking, now) ?? (reviewRequired ? "Cần xem và xác nhận kết quả khuyến mãi trước khi chỉnh sửa bắp nước." : "Cần cập nhật đơn đặt vé trước khi chỉnh sửa bắp nước.")}</p>}</section>
        <OwnedPromotionPanel booking={booking} now={now} busy={loading} confirmed={confirmed} reviewRequired={reviewRequired} notice={notice} mutate={mutatePromotion} acknowledgeReview={acknowledgeReview} />
      </div>
      <aside aria-label="Tổng tiền đặt vé từ máy chủ" className="rounded-2xl border border-outline/50 bg-panel p-5 sm:p-6 lg:sticky lg:top-24"><h2 className="text-xl font-bold">Thông tin thanh toán</h2><p className="mt-2 text-xs text-accent">SỐ TIỀN ĐẶT VÉ ĐÃ LƯU</p><dl className="mt-6 space-y-4 text-sm">{[["Tiền vé", booking.seatAmount], ["Tiền bắp nước", booking.concessionAmount], ["Tạm tính", booking.subtotal], ["Giảm giá khuyến mãi", booking.discount], ["Tổng thanh toán", booking.finalAmount]].map(([name, amount]) => <div key={name} className={`flex flex-wrap justify-between gap-2 ${name === "Tổng thanh toán" ? "border-t border-outline/40 pt-5 text-lg font-bold text-accent" : ""}`}><dt>{name}</dt><dd className="break-all font-heading tabular-nums">{formatBookingAmount(amount)}</dd></div>)}</dl><p className="mt-4 text-xs leading-6 text-muted">Số tiền hiển thị chính xác như đã lưu cho đơn đặt vé này.</p>
        <div className="mt-6 rounded-lg border border-outline/40 bg-panel-low p-4"><p className="text-sm font-semibold text-accent">Hạn thanh toán từ máy chủ</p><p role="timer" aria-label="Thời gian thanh toán còn lại" className="mt-2 font-heading text-2xl tabular-nums">{booking.status === "PENDING" ? countdown : "Đã đóng"}</p><p className="mt-2 break-all text-xs text-muted"><time dateTime={booking.expiresAt}>{formatUtcInstant(booking.expiresAt)}</time></p><p className="mt-2 text-xs leading-6 text-muted">Hạn đặt vé gốc từ máy chủ. Tải lại và điều hướng không gia hạn.</p></div>
        <p className="mt-5 text-xs leading-6 text-muted">{booking.paymentStartedAt ? `Nội dung đơn đã bị khóa bởi lần khởi tạo thanh toán trước vào ${booking.paymentStartedAt}. Đây không phải bằng chứng thanh toán thành công.` : "Chưa bắt đầu thanh toán. Quy trình này chưa thu tiền, tạo vé hay mã QR đặt vé."}</p><Button disabled className="mt-6 w-full">Chưa tích hợp thanh toán</Button><Button variant="secondary" disabled={loading} onClick={() => void refresh()} className="mt-3 w-full">Cập nhật đơn đặt vé</Button><Link href={seatHref} className="mt-3 inline-flex min-h-11 w-full items-center justify-center text-sm text-accent">{recoveryLabel}</Link>
      </aside>
    </div>
  </>;
}
