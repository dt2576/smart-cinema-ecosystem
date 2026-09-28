import type { ShowtimeOption } from "@/features/showtime/showtime.types";

// Preview representation of an existing Seat, not a new persistence entity.
export type SeatUnit = {
  id: string;
  hallId: string;
  showtimeId: string;
  row: string;
  number: string;
  column: number;
  type: "STANDARD" | "COUPLE";
  availability: "AVAILABLE" | "BOOKED" | "UNAVAILABLE";
};
export type SeatMap = { showtimeId: string; hallId: string; units: SeatUnit[] };
export type SeatPreviewScenario = "default" | "empty" | "error" | "unavailable";
export type SeatSelectionService = { load: (showtime: ShowtimeOption, signal: AbortSignal) => Promise<SeatMap> };
export type SeatPreviewSelection = { unitIds: string[]; expiresAt: number | null };
export type ConcessionPreviewHandoff = {
  movieId: string;
  cinemaId: string;
  showtimeId: string;
  hallId: string;
  seatUnitIds: string[];
  guestCount: number;
};
