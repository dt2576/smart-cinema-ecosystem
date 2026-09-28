import type { CinemaHandoff, CinemaOption, CinemaPreviewState, CinemaSelectionService } from "@/features/cinema/cinema.types";

// Local fixtures only. No network endpoints or real Movie/Cinema eligibility are inferred.
const OPTIONS: CinemaOption[] = [
  { id: "9007199254740993", name: "Smart Cinema Landmark", address: "Sample branch · Binh Thanh, Ho Chi Minh City", contact: "Contact information coming soon", operatingInformation: "Sample hours: 09:00–23:00", selectionState: "AVAILABLE" },
  { id: "102", name: "Smart Cinema Nguyen Trai", address: "Sample branch · District 1, Ho Chi Minh City", contact: "Contact information coming soon", operatingInformation: "Sample hours: 09:00–23:00", selectionState: "AVAILABLE" },
  { id: "103", name: "Smart Cinema Riverside", address: "Sample branch · District 7, Ho Chi Minh City", contact: "Contact information coming soon", operatingInformation: "This sample branch is closed", selectionState: "CLOSED" },
  { id: "104", name: "Smart Cinema West Lake", address: "Sample branch · Tay Ho, Hanoi", contact: "Contact information coming soon", operatingInformation: "This sample branch is unavailable", selectionState: "UNAVAILABLE" },
];

export function parseCinemaPreviewState(value: string | null): CinemaPreviewState {
  return value === "empty" || value === "error" || value === "unavailable" ? value : "default";
}

export function createMockCinemaService(state: CinemaPreviewState = "default", delayMs = 350): CinemaSelectionService {
  let failed = false;
  return {
    async listForMovie(_movieId, signal) {
      await new Promise<void>((resolve, reject) => {
        if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
        const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
        const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, delayMs);
        signal.addEventListener("abort", abort, { once: true });
      });
      if (state === "error" && !failed) { failed = true; throw new Error("Cinema options couldn’t load. Please try again."); }
      if (state === "empty") return [];
      return OPTIONS.map(option => ({ ...option, selectionState: state === "unavailable" && option.selectionState === "AVAILABLE" ? "UNAVAILABLE" : option.selectionState }));
    },
  };
}

export function createCinemaHandoff(movieId: string, cinema: CinemaOption): CinemaHandoff | null {
  if (cinema.selectionState !== "AVAILABLE") return null;
  return { movieId, cinemaId: cinema.id, showtimePath: `/movies/${encodeURIComponent(movieId)}/cinemas/${encodeURIComponent(cinema.id)}/showtimes` };
}
