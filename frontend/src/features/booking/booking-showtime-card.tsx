import { Icon } from "@/components/ui/icon";
import { SurfaceCard } from "@/components/ui/surface-card";
import type { Booking } from "@/features/booking/booking.types";
import { formatUtcInstant } from "@/lib/display-format";

// Only the validated Booking's referenced labels are available; no poster,
// duration, address, language or screening format is inferred here.
export function BookingShowtimeCard({ booking, startsLabel, compact = false }: { booking: Booking; startsLabel?: string; compact?: boolean }) {
  return <SurfaceCard aria-label="Suất chiếu đã đặt" className="min-w-0 overflow-hidden">
    <div className={`flex gap-5 ${compact ? "flex-col" : "flex-col sm:flex-row"}`}>
      <div aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-control border border-outline/30 bg-panel-low text-accent ${compact ? "h-24 w-full" : "h-28 w-20 sm:h-44 sm:w-28"}`}><Icon name="film" width={40} height={40} /></div>
      <div className="min-w-0 flex-1">
        <p className="mb-3 font-heading text-label font-semibold uppercase tracking-wide text-accent">Suất chiếu của bạn</p>
        <h2 className="break-words text-heading-lg font-bold">{booking.movieTitle}</h2>
        <dl className="mt-5 space-y-4 text-body">
          <div className="flex gap-3"><Icon name="pin" className="mt-1 shrink-0 text-accent" /><div className="min-w-0"><dt className="text-body-sm text-muted">Rạp và phòng chiếu</dt><dd className="mt-1 break-words font-semibold">{booking.cinemaName} · {booking.hallName}</dd></div></div>
          <div className="flex gap-3"><Icon name="calendar" className="mt-1 shrink-0 text-accent" /><div className="min-w-0"><dt className="text-body-sm text-muted">Suất chiếu (UTC)</dt><dd className="mt-1 break-words font-heading font-semibold text-accent"><time dateTime={booking.startsAt}>{startsLabel ?? formatUtcInstant(booking.startsAt)}</time></dd></div></div>
        </dl>
      </div>
    </div>
    <p className="mt-5 border-t border-outline/30 pt-4 text-body-sm leading-6 text-muted">Thông tin suất chiếu là thông tin hiện tại. Giá ghế và tổng tiền giữ nguyên như khi lưu đơn đặt vé.</p>
  </SurfaceCard>;
}
