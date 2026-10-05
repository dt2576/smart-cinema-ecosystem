"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createMockBookingHistoryService, parseBookingHistoryScenario } from "@/features/booking/booking-history-service";
import { BOOKING_LINK_STYLE, BookingStatusBadge, BookingHistoryLoading, BookingPreviewPoster, bookingPreviewShowtime } from "@/features/booking/booking-history-shared";
import { BookingQrPreview } from "@/features/booking/booking-qr-preview";
import { createMockTicketPreviewService, summarizeTicketPreview } from "@/features/ticket/ticket-preview-service";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { MovieFeedback } from "@/features/movie/movie-feedback";
import { formatConcessionPrice } from "@/features/concession/concession-service";

export function BookingDetailPreview({ bookingId }: { bookingId: string }) {
  const search = useSearchParams();
  const scenario = parseBookingHistoryScenario(search.get("bookingPreview"));
  const ticketScenario = parseBookingHistoryScenario(search.get("ticketPreview"));
  const service = useMemo(() => createMockBookingHistoryService(scenario), [scenario]);
  const ticketService = useMemo(() => createMockTicketPreviewService(ticketScenario), [ticketScenario]);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const load = useCallback(async (signal: AbortSignal) => {
    const booking = qrPayload ? await service.resolveQr(qrPayload, signal) : await service.get(bookingId, signal);
    if (!booking || booking.id !== bookingId) return null;
    const tickets = await ticketService.listForBooking(booking.id, signal);
    return { booking, tickets };
  }, [service, ticketService, bookingId, qrPayload]);
  const request = useMovieRequest(load);
  const back = <Link href="/my-bookings" className={`${BOOKING_LINK_STYLE} mb-6`}>Về vé của tôi</Link>;
  if (request.loading) return <>{back}<BookingHistoryLoading /></>;
  if (request.error) return <>{back}<MovieFeedback title="Không thể tải chi tiết đặt vé" message={request.error.message} retry={request.retry} /></>;
  if (!request.data) return <>{back}<MovieFeedback title="Không tìm thấy đơn đặt vé mẫu" message="Mã này không khớp với ví dụ mẫu. Chưa tra cứu đơn đặt vé thật hay kiểm tra quyền sở hữu." /></>;
  const { booking, tickets } = request.data;
  const summary = summarizeTicketPreview(tickets);
  const concessionSubtotal = booking.concessions.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return <>
    {back}
    {qrPayload && <p role="status" className="mb-5 rounded-lg bg-accent/10 p-4 text-sm text-accent">Đã tải lại đơn đặt vé và vé mẫu từ cùng mã QR đặt vé. Trạng thái vé không thay đổi; chưa có thao tác soát vé.</p>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        <section aria-label="Suất chiếu và số tiền đặt vé" className="rounded-2xl border border-outline/40 bg-panel-low p-5 sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><BookingStatusBadge status={booking.status} /><span className="break-all font-mono text-xs text-muted">{booking.code}</span></div>
          <div className="flex items-start gap-5"><div className="w-24 shrink-0 sm:w-32"><BookingPreviewPoster url={booking.movie.posterUrl} title={booking.movie.title} /></div><div className="min-w-0"><h2 className="text-2xl font-bold sm:text-3xl">{booking.movie.title}</h2><p className="mt-4 text-sm">{booking.cinema.name}</p><p className="mt-2 text-sm text-muted">{booking.hall.name}</p><p className="mt-3 text-sm text-accent">{bookingPreviewShowtime(booking.showtime.startsAt)}</p><p className="mt-1 text-xs text-muted">Giờ Việt Nam · suất chiếu giả định</p></div></div>
          <dl className="mt-6 space-y-3 border-t border-outline/30 pt-5 text-sm"><div className="flex justify-between gap-3"><dt>Tạm tính tiền vé</dt><dd>{formatConcessionPrice(booking.seatSubtotal)}</dd></div><div className="flex justify-between gap-3"><dt>Bắp nước</dt><dd>{formatConcessionPrice(concessionSubtotal)}</dd></div><div className="flex justify-between gap-3"><dt>Giảm giá mẫu</dt><dd>−{formatConcessionPrice(booking.discount)}</dd></div><div className="flex justify-between gap-3 text-lg font-bold"><dt>Tổng tiền mẫu</dt><dd className="text-accent">{formatConcessionPrice(booking.amount)}</dd></div></dl>
          <p className="mt-3 text-xs leading-5 text-muted">SỐ TIỀN MINH HỌA · Các số tiền mẫu cố định này không phải biên nhận hay thanh toán đã xác minh.</p>
          <h3 className="mt-6 font-semibold">Bắp nước đi kèm</h3>{booking.concessions.length ? <ul className="mt-3 space-y-2 text-sm text-muted">{booking.concessions.map(item => <li key={item.id}>{item.name} × {item.quantity} · {formatConcessionPrice(item.quantity * item.unitPrice)}</li>)}</ul> : <p className="mt-2 text-sm text-muted">Đơn mẫu này không có bắp nước.</p>}
        </section>
        <section aria-label="Vé riêng lẻ" className="rounded-2xl border border-outline/40 bg-panel-low p-5 sm:p-7">
          <h2 className="text-xl font-bold">Vé riêng lẻ</h2>
          {tickets.length ? <>
            <p className="mt-3 text-sm text-muted">{summary.units} vé · {summary.units} ghế · {summary.guests} khách</p>
            <p className="mt-2 text-sm text-accent">{summary.checkedIn} đã soát vé · {summary.valid} còn hiệu lực · chỉ là trạng thái mẫu</p>
            <ul className="mt-5 space-y-3">{tickets.map(ticket => <li key={ticket.id} aria-label={`Vé cho ghế ${ticket.seatUnit.label}`} className="rounded-xl border border-outline/40 bg-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">{ticket.seatUnit.label}</h3><BookingStatusBadge status={ticket.status} /></div>
              <p className="mt-2 text-sm text-muted">{ticket.seatUnit.type === "COUPLE" ? "Ghế đôi · 2 khách · một ghế không thể tách" : "Ghế thường · 1 khách · một ghế"}</p>
              <p className="mt-3 break-all font-mono text-xs text-muted">Vé {ticket.id}</p>
            </li>)}</ul>
            <p className="mt-5 text-sm leading-6 text-muted">Mỗi vé có trạng thái riêng. Soát một vé không làm thay đổi các vé khác. Một ghế đôi đã mua có một vé cho hai khách và không thể tách.</p>
          </> : <p className="mt-4 text-sm leading-6 text-muted">{booking.status === "PAID" ? "Không có vé mẫu trong trạng thái xem trước này." : "Đơn mẫu chưa thanh toán này chưa phát hành vé. Phát hành vé thật cần thanh toán đã xác minh."}</p>}
        </section>
      </div>
      <BookingQrPreview booking={booking} reload={payload => { setQrPayload(payload); request.retry(); }} />
    </div>
  </>;
}
