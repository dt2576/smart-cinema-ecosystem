import type { CinemaHandoff, CinemaOption, CinemaPreviewState, CinemaSelectionService } from "@/features/cinema/cinema.types";

// Local fixtures only. No network endpoints or real Movie/Cinema eligibility are inferred.
const OPTIONS: CinemaOption[] = [
  { id: "9007199254740993", name: "Smart Cinema Landmark", address: "Rạp mẫu · Bình Thạnh, TP. Hồ Chí Minh", contact: "Sắp có thông tin liên hệ", operatingInformation: "Giờ mẫu: 09:00–23:00", selectionState: "AVAILABLE" },
  { id: "102", name: "Smart Cinema Nguyen Trai", address: "Rạp mẫu · Quận 1, TP. Hồ Chí Minh", contact: "Sắp có thông tin liên hệ", operatingInformation: "Giờ mẫu: 09:00–23:00", selectionState: "AVAILABLE" },
  { id: "103", name: "Smart Cinema Riverside", address: "Rạp mẫu · Quận 7, TP. Hồ Chí Minh", contact: "Sắp có thông tin liên hệ", operatingInformation: "Rạp mẫu này đã đóng cửa", selectionState: "CLOSED" },
  { id: "104", name: "Smart Cinema West Lake", address: "Rạp mẫu · Tây Hồ, Hà Nội", contact: "Sắp có thông tin liên hệ", operatingInformation: "Rạp mẫu này không khả dụng", selectionState: "UNAVAILABLE" },
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
      if (state === "error" && !failed) { failed = true; throw new Error("Không thể tải danh sách rạp. Vui lòng thử lại."); }
      if (state === "empty") return [];
      return OPTIONS.map(option => ({ ...option, selectionState: state === "unavailable" && option.selectionState === "AVAILABLE" ? "UNAVAILABLE" : option.selectionState }));
    },
  };
}

export function createCinemaHandoff(movieId: string, cinema: CinemaOption): CinemaHandoff | null {
  if (cinema.selectionState !== "AVAILABLE") return null;
  return { movieId, cinemaId: cinema.id, showtimePath: `/movies/${encodeURIComponent(movieId)}/cinemas/${encodeURIComponent(cinema.id)}/showtimes` };
}
