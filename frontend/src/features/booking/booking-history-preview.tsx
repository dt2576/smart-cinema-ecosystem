"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createMockBookingHistoryService, parseBookingHistoryScenario } from "@/features/booking/booking-history-service";
import { BOOKING_LINK_STYLE, BookingStatusBadge, BookingHistoryLoading, BookingPreviewPoster, bookingPreviewShowtime } from "@/features/booking/booking-history-shared";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { MovieFeedback } from "@/features/movie/movie-feedback";
import { formatConcessionPrice } from "@/features/concession/concession-service";

export function BookingHistoryPreview() {
  const search = useSearchParams();
  const scenario = parseBookingHistoryScenario(search.get("bookingPreview"));
  const service = useMemo(() => createMockBookingHistoryService(scenario), [scenario]);
  const load = useCallback((signal: AbortSignal) => service.list(signal), [service]);
  const request = useMovieRequest(load);
  if (request.loading) return <BookingHistoryLoading />;
  if (request.error) return <MovieFeedback title="Could not load Bookings" message={request.error.message} retry={request.retry} />;
  if (!request.data?.length) return <MovieFeedback title="No sample Bookings" message="There are no Bookings in this preview. Explore Movies to start a separate local selection preview." />;
  return <>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="font-heading text-lg font-semibold">Booking history</h2><p className="text-sm text-muted">{request.data.length} samples · Newest first</p></div>
    <div className="space-y-5">{request.data.map(booking => <article key={booking.id} aria-label={`Booking ${booking.code}`} className="flex flex-col gap-5 rounded-2xl border border-outline/40 bg-panel-low p-5 sm:flex-row sm:p-6">
      <div className="flex min-w-0 flex-1 gap-4 sm:gap-6"><div className="w-20 shrink-0 sm:w-28"><BookingPreviewPoster url={booking.movie.posterUrl} title={booking.movie.title} /></div><div className="min-w-0">
        <BookingStatusBadge status={booking.status} /><h3 className="mt-3 text-xl font-bold sm:text-2xl">{booking.movie.title}</h3>
        <p className="mt-2 text-sm">{booking.cinema.name} · {booking.hall.name}</p>
        <p className="mt-2 text-sm text-muted">{bookingPreviewShowtime(booking.showtime.startsAt)} (Vietnam time)</p>
        <p className="mt-3 break-all font-mono text-xs text-muted">{booking.code}</p>
      </div></div>
      <div className="flex flex-wrap items-center justify-between gap-4 sm:w-48 sm:flex-col sm:items-end sm:justify-center"><div className="sm:text-right"><p className="text-xs text-muted">Sample amount · not a receipt</p><p className="mt-1 text-xl font-bold text-accent">{formatConcessionPrice(booking.amount)}</p></div><Link className={BOOKING_LINK_STYLE} href={`/my-bookings/${encodeURIComponent(booking.id)}`} aria-label={`View Booking ${booking.code}`}>View Booking</Link></div>
    </article>)}</div>
  </>;
}
