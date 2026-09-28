// Local preview models, not a backend DTO or persisted Showtime status enum.
export type ShowtimeOption = {
  id: string;
  movieId: string;
  cinemaId: string;
  hall: { id: string; name: string };
  startsAt: string;
  hasAvailableSeats: boolean;
};

export type ShowtimeSchedule = { dates: string[]; items: ShowtimeOption[] };
export type ShowtimePreviewState = "default" | "empty" | "error" | "sold-out" | "past";
export type ShowtimeSelectionService = {
  list: (movieId: string, cinemaId: string, signal: AbortSignal) => Promise<ShowtimeSchedule>;
};
export type SeatSelectionHandoff = { movieId: string; cinemaId: string; showtimeId: string; seatPath: string };
