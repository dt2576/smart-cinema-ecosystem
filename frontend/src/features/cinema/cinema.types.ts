// UI projection: selectionState is selectable presentation, not stored Cinema status.
export type CinemaOption = {
  id: string;
  name: string;
  address: string;
  contact: string;
  operatingInformation: string;
  selectionState: "AVAILABLE" | "CLOSED" | "UNAVAILABLE";
};

export type CinemaPreviewState = "default" | "empty" | "error" | "unavailable";
export type CinemaSelectionService = {
  listForMovie: (movieId: string, signal: AbortSignal) => Promise<CinemaOption[]>;
};

export type CinemaHandoff = { movieId: string; cinemaId: string; showtimePath: string };
