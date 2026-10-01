// UI projections shared by real discovery reads and isolated legacy test fixtures.
export type ShowtimeOption = {
  id: string;
  movieId: string;
  cinemaId: string;
  hall: { id: string; name: string };
  startsAt: string;
  // Legacy fixture hint only. Public discovery does not promise Seat availability.
  hasAvailableSeats?: boolean;
  endsAt?: string;
  bookingCutOff?: string;
  timeZone?: string;
};

export type ShowtimeSchedule = { dates: string[]; items: ShowtimeOption[] };
export type ShowtimePreviewState = "default" | "empty" | "error" | "sold-out" | "past";
export type ShowtimeSelectionService = {
  list: (movieId: string, cinemaId: string, signal: AbortSignal) => Promise<ShowtimeSchedule>;
};
export type SeatSelectionHandoff = { movieId: string; cinemaId: string; showtimeId: string; seatPath: string };
