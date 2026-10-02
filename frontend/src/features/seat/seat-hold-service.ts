import type { SeatMap } from "@/features/seat/seat.types";
import type { ShowtimeOption } from "@/features/showtime/showtime.types";
import type { BookingHoldHandoff, SeatHold, SeatHoldBatch, SeatHoldClock } from "@/features/seat/seat-hold.types";

export function holdClock(serverTime: string, requestStarted: number, receivedAt: number): SeatHoldClock {
  // Conservative transport allowance: never grant a new client TTL after receipt.
  return { serverTimeMs: Date.parse(serverTime) + Math.max(0, receivedAt - requestStarted), receivedAt };
}
export function projectedServerNow(clock: SeatHoldClock, monotonicNow: number): number {
  return clock.serverTimeMs + Math.max(0, monotonicNow - clock.receivedAt);
}
export function usableOwnedHolds(holds: SeatHold[], map: SeatMap, now: number): SeatHold[] {
  return holds.filter(hold => hold.showtimeId === map.showtimeId && Date.parse(hold.expiresAt) > now
    && map.units.some(unit => unit.id === hold.seatId && unit.hallId === map.hallId && unit.showtimeId === map.showtimeId && ["AVAILABLE", "HELD"].includes(unit.availability)));
}
export function bookingHoldHandoff(batch: SeatHoldBatch, map: SeatMap, showtime: ShowtimeOption, selectedIds: string[], now: number): BookingHoldHandoff | null {
  const holds = usableOwnedHolds(batch.holds, map, now);
  if (!selectedIds.length || new Set(selectedIds).size !== selectedIds.length || holds.length !== selectedIds.length
    || holds.some(hold => !selectedIds.includes(hold.seatId)) || map.showtimeId !== showtime.id || map.hallId !== showtime.hall.id
    || !(Date.parse(showtime.startsAt) > now) || !(Date.parse(showtime.bookingCutOff ?? showtime.startsAt) > now)) return null;
  const expiresAt = holds.reduce((earliest, hold) => Date.parse(hold.expiresAt) < Date.parse(earliest) ? hold.expiresAt : earliest, holds[0].expiresAt);
  return { showtimeId: showtime.id, holdIds: holds.map(hold => hold.id), holds: holds.map(hold => ({ ...hold })), serverTime: batch.serverTime, expiresAt };
}
