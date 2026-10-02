import type { ShowtimeOption } from "@/features/showtime/showtime.types";

// Whole-unit UI projection. Public availability and owned Holds have separate reads.
export type SeatUnit = {
  id: string;
  hallId: string;
  showtimeId: string;
  row: string;
  number: string;
  column: number; // Display order only; public API supplies no physical coordinates.
  type: "STANDARD" | "VIP" | "COUPLE";
  availability: "AVAILABLE" | "HELD" | "BOOKED" | "UNAVAILABLE";
};
export type SeatMap = { showtimeId: string; hallId: string; serverTime?: string; units: SeatUnit[] };
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
