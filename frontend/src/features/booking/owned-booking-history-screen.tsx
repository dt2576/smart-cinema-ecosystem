"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatusFeedback } from "@/components/ui/status-feedback";
import { getBookingHistory } from "@/features/booking/booking-read-api";
import { OwnedBookingAccess, OwnedBookingError, OwnedBookingLoading } from "@/features/booking/owned-booking-feedback";
import { useOwnedBookingRead } from "@/features/booking/use-owned-booking-read";
import { formatBookingAmount } from "@/features/booking/booking-service";
import { formatUtcInstant } from "@/lib/display-format";

export const BOOKING_READ_LABELS = { PENDING: "Chờ thanh toán", PAID: "Đã thanh toán", EXPIRED: "Hết hạn", CANCELLED: "Đã hủy" };
export function OwnedBookingHistoryScreen() {
  const { session, isHydrated } = useAuth();
  return <><div className="mb-8"><p className="mb-3 font-heading text-label uppercase tracking-wide text-accent">Đặt vé của bạn</p><h1 className="text-3xl font-bold sm:text-4xl">Vé của tôi</h1><p className="mt-3 text-body text-muted">Xem các đơn đặt vé, thông tin vé và mã QR của bạn.</p></div>
    {!isHydrated ? <OwnedBookingLoading /> : !session ? <OwnedBookingAccess returnTo="/my-bookings" /> : session.user.role !== "CUSTOMER" ? <StatusFeedback title="Cần quyền khách hàng" message="Lịch sử đặt vé dành cho tài khoản khách hàng. Quyền truy cập được kiểm tra bởi máy chủ." /> : <HistoryPages key={`${session.user.id}:${session.accessToken}`} token={session.accessToken} />}</>;
}
function HistoryPages({ token }: { token: string }) {
  const [page, setPage] = useState(0);
  return <HistoryPage key={page} page={page} token={token} changePage={setPage} />;
}
function HistoryPage({ page, token, changePage }: { page: number; token: string; changePage: (page: number) => void }) {
  const reader = useCallback((signal: AbortSignal) => getBookingHistory(page, 20, token, signal), [page, token]);
  const { data, loading, error, refresh } = useOwnedBookingRead(reader);
  return <>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-body-sm text-muted">Trang {page + 1}</p><Button variant="secondary" aria-disabled={loading} onClick={() => { if (!loading) void refresh(); }}>Kiểm tra lại trạng thái</Button></div>
    {loading ? <OwnedBookingLoading /> : error ? <OwnedBookingError error={error} retry={() => void refresh()} returnTo="/my-bookings" /> : data && <>
      {!data.items.length ? <StatusFeedback title={data.totalElements === 0 ? "Chưa có đơn đặt vé" : "Trang này không có đơn đặt vé"} message="Các đơn đặt vé của bạn sẽ xuất hiện tại đây." actions={<Link href="/movies" className="inline-flex min-h-11 items-center text-accent">Khám phá phim</Link>} /> : <div className="grid gap-5">{data.items.map(b => <article key={b.id} className="surface-card min-w-0 overflow-hidden bg-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline/30 px-5 py-4 sm:px-7"><p className="min-w-0 break-all font-heading text-body-sm text-muted">{b.bookingCode}</p><StatusBadge tone={b.status === "PAID" ? "success" : b.status === "CANCELLED" || b.status === "EXPIRED" ? "error" : "neutral"}>{BOOKING_READ_LABELS[b.status]}</StatusBadge></div>
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:p-7"><div aria-hidden="true" className="flex h-24 w-16 shrink-0 items-center justify-center rounded-control bg-panel-high text-accent"><Icon name="film" width={32} height={32} /></div><div className="min-w-0 flex-1"><h2 className="break-words text-heading-md font-bold">{b.movieTitle}</h2><dl className="mt-4 grid gap-4 text-body-sm md:grid-cols-3"><div><dt className="text-muted">Rạp và phòng chiếu</dt><dd className="mt-1 break-words">{b.cinemaName} · {b.hallName}</dd></div><div><dt className="text-muted">Suất chiếu (UTC)</dt><dd className="mt-1"><time dateTime={b.startsAt}>{formatUtcInstant(b.startsAt)}</time></dd></div><div><dt className="text-muted">Ghế và khách</dt><dd className="mt-1">{b.seatUnitCount} ghế · {b.guestCount} khách</dd></div></dl>{b.paymentStartedAt && <p className="mt-4 text-body-sm text-muted">Thành phần đơn đã khóa từ lần bắt đầu thanh toán đầu tiên.</p>}</div></div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-outline/30 bg-panel-low px-5 py-4 sm:px-7"><div className="min-w-0"><p className="text-body-sm text-muted">Tổng thanh toán đã lưu</p><p className="mt-1 break-all font-heading text-xl font-bold tabular-nums text-accent">{formatBookingAmount(b.finalAmount)}</p></div><Link href={`/my-bookings/${b.id}`} aria-label={`Xem đơn đặt vé ${b.bookingCode}`} className="inline-flex min-h-11 items-center rounded-control bg-action px-5 font-heading text-sm font-semibold text-on-action">Xem chi tiết đặt vé</Link></div>
      </article>)}</div>}
      <nav aria-label="Phân trang lịch sử đặt vé" className="mt-6 flex flex-wrap items-center justify-center gap-4"><Button variant="secondary" disabled={page === 0} onClick={() => changePage(page - 1)}>Trang trước</Button><span className="text-body-sm">Trang {page + 1}{data.totalPages > 0 && ` / ${data.totalPages}`}</span><Button variant="secondary" disabled={page + 1 >= data.totalPages || page === 2147483647} onClick={() => changePage(page + 1)}>Trang sau</Button></nav>
    </>}
  </>;
}
