import type { ConcessionPreviewHandoff, SeatMap, SeatPreviewScenario, SeatPreviewSelection, SeatSelectionService, SeatUnit } from "@/features/seat/seat.types";
import type { ShowtimeOption } from "@/features/showtime/showtime.types";

// Local countdown demonstration only. No Hold record, ownership or entitlement exists.
export const SEAT_PREVIEW_DURATION_MS = 10 * 60 * 1000;

export function parseSeatPreviewScenario(value: string | null): SeatPreviewScenario {
  return value === "empty" || value === "error" || value === "unavailable" ? value : "default";
}

export function createMockSeatService(scenario: SeatPreviewScenario = "default", delayMs = 350): SeatSelectionService {
  let failed = false;
  return {
    async load(showtime, signal) {
      await new Promise<void>((resolve, reject) => {
        if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
        const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
        const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, delayMs);
        signal.addEventListener("abort", abort, { once: true });
      });
      if (scenario === "error" && !failed) { failed = true; throw new Error("Seat map couldn’t load. Please try again."); }
      const units: SeatUnit[] = [];
      if (scenario !== "empty") for (const [rowIndex, row] of ["A", "B", "C", "D", "E"].entries()) {
        const couple = row === "E";
        for (let position = 1; position <= 8; position += couple ? 2 : 1) {
          const booked = (row === "A" && position === 3) || (row === "B" && position === 5) || (couple && position === 3);
          const unavailable = (row === "C" && position === 2) || (couple && position === 7);
          units.push({ id: `${showtime.hall.id}${rowIndex}${position}`, hallId: showtime.hall.id, showtimeId: showtime.id,
            row, number: couple ? `${position}-${position + 1}` : String(position), column: position > 4 ? position + 1 : position,
            type: couple ? "COUPLE" : "STANDARD", availability: booked ? "BOOKED" : unavailable || scenario === "unavailable" ? "UNAVAILABLE" : "AVAILABLE" });
        }
      }
      return { showtimeId: showtime.id, hallId: showtime.hall.id, units };
    },
  };
}

export function seatUnitCapacity(unit: SeatUnit): number { return unit.type === "COUPLE" ? 2 : 1; }

export function toggleSeatUnit(selection: SeatPreviewSelection, unitId: string, map: SeatMap, now: number): SeatPreviewSelection {
  if (selection.expiresAt !== null && now >= selection.expiresAt) return selection;
  const unit = map.units.find(item => item.id === unitId && item.hallId === map.hallId && item.showtimeId === map.showtimeId && item.availability === "AVAILABLE");
  if (!unit) return selection;
  const unitIds = selection.unitIds.includes(unitId) ? selection.unitIds.filter(id => id !== unitId) : [...selection.unitIds, unitId];
  return { unitIds, expiresAt: unitIds.length ? selection.expiresAt ?? now + SEAT_PREVIEW_DURATION_MS : null };
}

export function createConcessionPreviewHandoff(selection: SeatPreviewSelection, map: SeatMap, showtime: ShowtimeOption, now: number): ConcessionPreviewHandoff | null {
  if (!selection.unitIds.length || new Set(selection.unitIds).size !== selection.unitIds.length || selection.expiresAt === null || now >= selection.expiresAt || !(Date.parse(showtime.startsAt) > now) || !showtime.hasAvailableSeats || map.showtimeId !== showtime.id || map.hallId !== showtime.hall.id) return null;
  const units = selection.unitIds.map(id => map.units.find(unit => unit.id === id));
  if (units.some(unit => !unit || unit.availability !== "AVAILABLE" || unit.hallId !== map.hallId || unit.showtimeId !== map.showtimeId)) return null;
  return { movieId: showtime.movieId, cinemaId: showtime.cinemaId, showtimeId: showtime.id, hallId: map.hallId, seatUnitIds: [...selection.unitIds], guestCount: units.reduce((sum, unit) => sum + seatUnitCapacity(unit!), 0) };
}
