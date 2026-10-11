"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatusFeedback } from "@/components/ui/status-feedback";
import { isBookingId } from "@/features/booking/booking-api";
import { getOwnedBookingEntitlements } from "@/features/booking/booking-read-api";
import type { OwnedBookingEntitlements } from "@/features/booking/booking-read.types";
import { OwnedBookingAccess, OwnedBookingError, OwnedBookingLoading } from "@/features/booking/owned-booking-feedback";
import { BOOKING_READ_LABELS } from "@/features/booking/owned-booking-history-screen";
import { BookingShowtimeCard } from "@/features/booking/booking-showtime-card";
import { formatBookingAmount } from "@/features/booking/booking-service";
import { useOwnedBookingRead } from "@/features/booking/use-owned-booking-read";
import { BookingQrPass } from "@/features/ticket/booking-qr-pass";
import { formatUtcInstant } from "@/lib/display-format";

const TICKET_LABELS = { VALID: "Chưa sử dụng", CHECKED_IN: "Đã check-in", EXPIRED: "Hết hạn", CANCELLED: "Đã hủy" };
const SEAT_LABELS = { STANDARD: "Ghế thường", VIP: "Ghế VIP", COUPLE: "Ghế đôi" };
export function OwnedBookingDetailScreen({ bookingId }: { bookingId: string }) {
  const { session, isHydrated } = useAuth();
  return <><Link href="/my-bookings" className="mb-5 inline-flex min-h-11 items-center text-accent">Về vé của tôi</Link><h1 className="mb-7 text-3xl font-bold sm:text-4xl">Chi tiết đặt vé</h1>
    {!isBookingId(bookingId) ? <StatusFeedback title="Liên kết đặt vé không hợp lệ" message="Mở đơn đặt vé từ lịch sử vé của bạn." /> : !isHydrated ? <OwnedBookingLoading /> : !session ? <OwnedBookingAccess returnTo={`/my-bookings/${bookingId}`} /> : session.user.role !== "CUSTOMER" ? <StatusFeedback title="Cần quyền khách hàng" message="Chi tiết vé chỉ dành cho tài khoản khách hàng sở hữu đơn." /> : <OwnedBookingContent key={`${bookingId}:${session.user.id}:${session.accessToken}`} id={bookingId} token={session.accessToken} />}</>;
}
function OwnedBookingContent({ id, token }: { id: string; token: string }) {
  const reader = useCallback((signal: AbortSignal, previous?: OwnedBookingEntitlements) => getOwnedBookingEntitlements(id, token, signal, previous), [id, token]);
  const { data, loading, error, refresh } = useOwnedBookingRead(reader);
  return <><div className="mb-5 flex justify-end"><Button variant="secondary" aria-disabled={loading} onClick={() => { if (!loading) void refresh(); }}>Kiểm tra lại trạng thái</Button></div>
    {loading ? <OwnedBookingLoading /> : error ? <OwnedBookingError error={error} retry={() => void refresh()} returnTo={`/my-bookings/${id}`} /> : data && <BookingContent data={data} />}
  </>;
}
function BookingContent({ data }: { data: OwnedBookingEntitlements }) {
  const { booking: b, entitlements: e } = data;
  return <><SurfaceCard padding="none" aria-label="Thông tin đơn đặt vé" className="mb-6 flex flex-wrap items-center justify-between gap-4 p-5"><div className="min-w-0"><p className="text-body-sm text-muted">Mã đặt vé</p><p className="mt-2 break-all font-heading text-xl font-bold text-accent">{b.bookingCode}</p><p className="mt-2 break-all text-body-sm text-muted">ID đặt vé: {b.id}</p></div><StatusBadge tone={b.status === "PAID" ? "success" : "neutral"}>{BOOKING_READ_LABELS[b.status]}</StatusBadge></SurfaceCard>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]"><div className="min-w-0 space-y-6">
      <BookingShowtimeCard booking={b} />
      <SurfaceCard aria-label="Ghế đã đặt"><h2 className="text-heading-md font-bold">Ghế đã đặt</h2><p className="mt-3 text-body-sm text-muted">{b.seatUnitCount} ghế · {b.guestCount} khách</p><ul className="mt-5 grid gap-4 sm:grid-cols-2">{b.seats.map(s => <li key={s.id} className="min-w-0 rounded-control border border-outline/30 bg-panel-low p-4"><p className="break-words font-heading text-xl font-semibold text-accent">{s.row}{s.number}</p><p className="mt-2 text-body-sm">{SEAT_LABELS[s.type]} · {s.guestCount} khách</p>{s.type === "COUPLE" && <p className="mt-2 text-body-sm text-muted">Một ghế đôi không thể tách · một vé cho hai khách</p>}<p className="mt-3 break-all font-heading tabular-nums">{formatBookingAmount(s.finalPrice)}</p></li>)}</ul></SurfaceCard>
      <SurfaceCard aria-label="Vé riêng lẻ"><h2 className="text-heading-md font-bold">Vé riêng lẻ</h2><p className="mt-3 text-body-sm text-muted">{e.tickets.length} vé · {b.seatUnitCount} ghế · {b.guestCount} khách</p>
        {!e.tickets.length ? <p className="mt-4 text-body-sm text-muted">Máy chủ chưa phát hành vé cho đơn đặt vé này.</p> : <><p className="mt-3 text-body-sm text-muted">Mỗi vé có trạng thái riêng từ máy chủ. Khách hàng không thực hiện check-in.</p><ul className="mt-5 grid gap-4">{e.tickets.map(t => { const s = b.seats.find(s => s.id === t.bookingSeatId)!; return <li key={t.id} aria-label={`Vé cho ghế ${s.row}${s.number}`} className="min-w-0 rounded-control border border-outline/30 bg-panel-low p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-heading text-lg font-semibold text-accent">{s.row}{s.number}</p><StatusBadge tone={t.status === "VALID" ? "success" : t.status === "CANCELLED" || t.status === "EXPIRED" ? "error" : "neutral"}>{TICKET_LABELS[t.status]}</StatusBadge></div><p className="mt-3 text-body-sm">{SEAT_LABELS[t.seatType]} · {t.guestCount} khách · một vé</p><p className="mt-3 break-all text-body-sm text-muted">Mã vé: {t.ticketCode}</p><p className="mt-2 break-all text-body-sm text-muted">ID vé: {t.id}</p></li>; })}</ul></>}
      </SurfaceCard>
      <SurfaceCard aria-label="Bắp nước và khuyến mãi"><h2 className="text-heading-md font-bold">Bắp nước và khuyến mãi</h2>{b.concessions.length ? <ul className="mt-5 space-y-4">{b.concessions.map(c => <li key={c.id} className="flex flex-wrap justify-between gap-3 border-b border-outline/20 pb-3"><span className="min-w-0 break-words">{c.name} × {c.quantity}</span><span className="max-w-full break-all font-heading tabular-nums">{formatBookingAmount(c.totalPrice)}</span></li>)}</ul> : <p className="mt-4 text-body-sm text-muted">Không có bắp nước trong đơn.</p>}<p className="mt-5 break-all text-body-sm">{b.promotion ? `Khuyến mãi đã lưu: ${b.promotion.code}` : "Không có khuyến mãi trong đơn."}</p>{b.paymentStartedAt && <p className="mt-4 text-body-sm leading-6 text-muted">Thành phần đơn đã khóa từ lần bắt đầu thanh toán đầu tiên; không thể sửa ghế, bắp nước hoặc khuyến mãi.</p>}</SurfaceCard>
      <SurfaceCard aria-label="Suất chiếu và số tiền đặt vé"><h2 className="text-heading-md font-bold">Chi tiết thanh toán</h2><dl className="mt-5 space-y-4">{[["Tiền vé", b.seatAmount], ["Tiền bắp nước", b.concessionAmount], ["Tạm tính", b.subtotal], ["Giảm giá khuyến mãi", b.discount], ["Tổng thanh toán", b.finalAmount]].map(([name, amount]) => <div key={name} className={`flex flex-wrap justify-between gap-3 ${name === "Tổng thanh toán" ? "border-t border-outline/30 pt-5 font-bold text-accent" : ""}`}><dt>{name}</dt><dd className="max-w-full break-all font-heading tabular-nums">{formatBookingAmount(amount)}</dd></div>)}</dl><p className="mt-5 text-body-sm text-muted">Số tiền chính xác theo đơn đã lưu.</p><p className="mt-4 break-words text-body-sm text-muted">Hạn đặt vé gốc: <time dateTime={b.expiresAt}>{formatUtcInstant(b.expiresAt)}</time>. {b.status === "PAID" ? "Hạn trước thanh toán không phải hạn sử dụng vé." : "Trạng thái đặt vé do máy chủ xác nhận."}</p></SurfaceCard>
    </div><aside className="min-w-0 space-y-5 lg:sticky lg:top-28">
      {b.status === "PAID" && e.bookingQr ? <BookingQrPass token={e.bookingQr} code={b.bookingCode} /> : <StatusFeedback title="Chưa có mã QR đặt vé" message="Máy chủ chưa xác nhận quyền nhận vé và mã QR cho đơn đặt vé này." />}
      {b.status === "PENDING" && <Link href={`/bookings/${b.id}/summary`} className="inline-flex min-h-11 w-full items-center justify-center rounded-control border border-outline/40 px-4 py-3 text-center font-heading text-sm text-accent">Quay về thông tin đặt vé và thanh toán</Link>}
      <p className="text-body-sm leading-6 text-muted">Kiểm tra lại để đọc trạng thái mới nhất từ máy chủ. Việc xem hoặc tải lại không đổi trạng thái vé.</p>
    </aside></div>
  </>;
}
