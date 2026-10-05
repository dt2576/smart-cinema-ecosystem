import type { SeatSelectionHandoff, ShowtimeOption, ShowtimePreviewState, ShowtimeSelectionService } from "@/features/showtime/showtime.types";

// All current sample branches are in Vietnam. This is preview configuration only.
export const SHOWTIME_PREVIEW_TIME_ZONE = "Asia/Ho_Chi_Minh";

export function showtimeDate(value: string | number, timeZone = SHOWTIME_PREVIEW_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export function formatShowtimeTime(value: string, timeZone = SHOWTIME_PREVIEW_TIME_ZONE): string {
  return new Intl.DateTimeFormat("vi-VN", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}

export function formatShowtimeDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: SHOWTIME_PREVIEW_TIME_ZONE, weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00+07:00`));
}

export function parseShowtimePreviewState(value: string | null): ShowtimePreviewState {
  return value === "empty" || value === "error" || value === "sold-out" || value === "past" ? value : "default";
}

export function canSelectShowtime(option: ShowtimeOption, movieId: string, cinemaId: string, date: string, now: number): boolean {
  const start = Date.parse(option.startsAt);
  return Number.isFinite(start) && start > now && option.hasAvailableSeats !== false && (!option.bookingCutOff || Date.parse(option.bookingCutOff) > now) && option.movieId === movieId && option.cinemaId === cinemaId && showtimeDate(start, option.timeZone) === date;
}

export function createSeatSelectionHandoff(option: ShowtimeOption, movieId: string, cinemaId: string, date: string, now: number): SeatSelectionHandoff | null {
  return canSelectShowtime(option, movieId, cinemaId, date, now)
    ? { movieId, cinemaId, showtimeId: option.id, seatPath: `/showtimes/${encodeURIComponent(option.id)}/seats` }
    : null;
}

export function createMockShowtimeService(state: ShowtimePreviewState = "default", delayMs = 350, now: () => number = Date.now): ShowtimeSelectionService {
  let failed = false;
  return {
    async list(movieId, cinemaId, signal) {
      await new Promise<void>((resolve, reject) => {
        if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
        const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
        const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, delayMs);
        signal.addEventListener("abort", abort, { once: true });
      });
      if (state === "error" && !failed) { failed = true; throw new Error("Không thể tải suất chiếu. Vui lòng thử lại."); }
      const today = showtimeDate(now());
      const midnight = Date.parse(`${today}T00:00:00+07:00`);
      // Seven days is a fixture window, not a product booking-window rule.
      const dates = Array.from({ length: 7 }, (_, day) => showtimeDate(midnight + day * 86_400_000));
      const items: ShowtimeOption[] = [];
      if (state !== "empty") for (const [day, date] of dates.entries()) {
        if (state === "past" && day > 0) continue;
        for (const [slot, hour] of [0, 10, 14, 18, 12, 16, 20].entries()) {
          if (state === "past" && slot > 0) continue;
          const hall = slot < 4 ? "1" : "2";
          items.push({
            id: `${cinemaId}${day}${slot}`, movieId, cinemaId,
            hall: { id: `${cinemaId}${hall}`, name: `Phòng chiếu ${hall}` },
            startsAt: `${state === "past" ? today : date}T${String(state === "past" ? 0 : hour).padStart(2, "0")}:00:00+07:00`,
            hasAvailableSeats: state !== "sold-out" && slot !== 2,
          });
        }
      }
      return { dates, items };
    },
  };
}
