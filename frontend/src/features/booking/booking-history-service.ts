import type { BookingHistoryPreview, BookingHistoryScenario, BookingHistoryService } from "@/features/booking/booking-history.types";

const SAMPLES: BookingHistoryPreview[] = [
  {
    id: "9007199254741101", code: "DEMO-SC-1101", status: "PAID", createdAt: "2026-09-28T09:00:00+07:00",
    movie: { id: "9007199254741201", title: "Dune: Part Two", posterUrl: "/images/movies/dune-part-two.jpg" },
    cinema: { id: "9007199254740993", name: "Smart Cinema Landmark" },
    showtime: { id: "9007199254741301", startsAt: "2026-09-28T19:30:00+07:00" },
    hall: { id: "9007199254741401", name: "Phòng chiếu 1" }, seatSubtotal: 400000,
    concessions: [{ id: "9007199254741501", name: "Combo xem phim", quantity: 2, unitPrice: 120000 }],
    discount: 40000, amount: 600000,
    qr: { payload: "SMART_CINEMA_PREVIEW:BOOKING:9007199254741101", imageUrl: "/images/booking-preview/9007199254741101.png" },
  },
  {
    id: "9007199254741102", code: "DEMO-SC-1102", status: "PAID", createdAt: "2026-09-20T09:00:00+07:00",
    movie: { id: "9007199254741201", title: "Dune: Part Two", posterUrl: "/images/movies/dune-part-two.jpg" },
    cinema: { id: "102", name: "Smart Cinema Nguyen Trai" },
    showtime: { id: "9007199254741302", startsAt: "2026-09-21T18:00:00+07:00" },
    hall: { id: "9007199254741402", name: "Phòng chiếu 2" }, seatSubtotal: 200000,
    concessions: [], discount: 0, amount: 200000,
    qr: { payload: "SMART_CINEMA_PREVIEW:BOOKING:9007199254741102", imageUrl: "/images/booking-preview/9007199254741102.png" },
  },
  ...(["PENDING", "EXPIRED", "CANCELLED"] as const).map((status, index): BookingHistoryPreview => ({
    id: `900719925474110${index + 3}`, code: `DEMO-SC-110${index + 3}`, status,
    createdAt: `2026-09-${19 - index}T09:00:00+07:00`,
    movie: { id: "9007199254741201", title: "Dune: Part Two", posterUrl: "/images/movies/dune-part-two.jpg" },
    cinema: { id: "9007199254740993", name: "Smart Cinema Landmark" },
    showtime: { id: `900719925474130${index + 3}`, startsAt: `2026-09-${20 - index}T19:30:00+07:00` },
    hall: { id: "9007199254741401", name: "Phòng chiếu 1" }, seatSubtotal: 100000,
    concessions: [], discount: 0, amount: 100000, qr: null,
  })),
];

export function parseBookingHistoryScenario(value: string | null): BookingHistoryScenario {
  return value === "empty" || value === "error" ? value : "default";
}

export function createMockBookingHistoryService(scenario: BookingHistoryScenario = "default", delayMs = 350): BookingHistoryService {
  let failed = false;
  async function ready(signal: AbortSignal) {
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
      const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
      const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, delayMs);
      signal.addEventListener("abort", abort, { once: true });
    });
    if (scenario === "error" && !failed) { failed = true; throw new Error("Không thể tải đơn đặt vé mẫu. Vui lòng thử lại."); }
  }
  return {
    async list(signal) {
      await ready(signal);
      return scenario === "empty" ? [] : structuredClone(SAMPLES).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
    },
    async get(id, signal) {
      await ready(signal);
      return structuredClone(scenario === "empty" ? null : SAMPLES.find(booking => booking.id === id) ?? null);
    },
    async resolveQr(payload, signal) {
      await ready(signal);
      // Exact, inert fixture lookup. Reuse does not consume a QR or change any Ticket.
      return structuredClone(scenario === "empty" ? null : SAMPLES.find(booking => booking.status === "PAID" && booking.qr?.payload === payload) ?? null);
    },
  };
}
