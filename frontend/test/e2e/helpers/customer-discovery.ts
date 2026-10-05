import type { Page } from "@playwright/test";

export const DISCOVERY_SHOWTIME_ID = "9007199254741001";
const MOVIE = "9223372036854775807", CINEMA = "9007199254740993";
export function isCustomerReadPath(path: string) { return /^\/api\/v1\/(movies(?:\/\d+)?|genres|cinemas(?:\/\d+)?|showtimes(?:\/\d+(?:\/seats)?)?)$/.test(path); }
export function isCustomerHoldPath(path: string) { return /^\/api\/v1\/showtimes\/\d+\/seat-holds(?:\/\d+)?$/.test(path); }

// Contract-shaped HTTP fixtures only. Production adapters never import this file.
export async function mockDiscoveryReads(page: Page) {
  let ownedSeats: () => string[] = () => [];
  let serverNow: () => Promise<string> = async () => "2030-01-01T02:00:00Z";
  const failures = new Set<string>();
  const cinemas = [{ id: CINEMA, name: "Smart Cinema Landmark", address: "Ho Chi Minh City", contact: null, operatingInformation: null }, { id: "102", name: "Smart Rạp chiếu phim Nguyen Trai", address: "Ho Chi Minh City", contact: null, operatingInformation: null }];
  const dates = Array.from({ length: 7 }, (_, day) => `2030-01-0${day + 1}`);
  const items = dates.flatMap((date, day) => [10, 18, 12, 16, 20].map((hour, slot) => ({ id: String(BigInt("9007199254741001") + BigInt(day * 10 + slot)), movieId: MOVIE, cinemaId: CINEMA, hall: { id: slot < 2 ? "90071992547409931" : "90071992547409932", name: slot < 2 ? "Phòng chiếu 1" : "Phòng chiếu 2" }, startsAt: `${date}T${hour}:00:00+07:00`, endsAt: `${date}T${hour + 2}:00:00+07:00`, bookingCutOff: `${date}T${hour}:00:00+07:00` })));
  await page.route(/\/api\/v1\/(cinemas|showtimes)(\/|\?|$)/, async route => {
    const url = new URL(route.request().url()), path = url.pathname;
    const view = new URL(page.url());
    const scenario = path.endsWith("/seats") ? view.searchParams.get("seatPreview") : path === "/api/v1/cinemas" && view.pathname.endsWith("/cinemas") || path === "/api/v1/showtimes" && view.pathname.endsWith("/showtimes") ? view.searchParams.get("previewState") : null;
    if (route.request().method() !== "GET") throw new Error("Discovery tests must never authorize a write");
    if (scenario === "error" && !failures.has(path)) { failures.add(path); return route.fulfill({ status: 503, json: { detail: "Temporary discovery error. Vui lòng thử lại." } }); }
    if (path === "/api/v1/cinemas") return route.fulfill({ json: scenario === "empty" || scenario === "unavailable" ? [] : cinemas });
    if (path.startsWith("/api/v1/cinemas/")) return route.fulfill(cinemas.some(cinema => cinema.id === path.split("/").at(-1)) ? { json: cinemas.find(cinema => cinema.id === path.split("/").at(-1)) } : { status: 404, json: { detail: "Rạp không khả dụng." } });
    if (path === "/api/v1/showtimes") {
      const date = url.searchParams.get("date") ?? "2030-01-01";
      if (!/^2030-01-0[1-7]$/.test(date)) return route.fulfill({ status: 400, json: { detail: "Invalid date. Choose a valid schedule date." } });
      return route.fulfill({ json: { timeZone: "Asia/Ho_Chi_Minh", serverTime: "2030-01-01T02:00:00Z", date, dates, items: ["empty", "unavailable", "sold-out", "past"].includes(scenario ?? "") ? [] : items.filter(item => item.startsAt.startsWith(date)) } });
    }
    const id = path.split("/")[4]; const item = items.find(item => item.id === id);
    if (!item) return route.fulfill({ status: 404, json: { detail: "Suất chiếu không khả dụng." } });
    if (!path.endsWith("/seats")) return route.fulfill({ json: item });
    const units = ["A", "B", "C", "D", "E"].flatMap((row, rowIndex) => Array.from({ length: row === "E" ? 4 : 8 }, (_, index) => {
      const position = row === "E" ? index * 2 + 1 : index + 1;
      const booked = row === "A" && position === 3 || row === "B" && position === 5 || row === "E" && position === 3;
      const unavailable = row === "C" && position === 2 || row === "E" && position === 7;
      return { id: String(BigInt("9007199254742000") + BigInt(rowIndex * 10 + position)), row, number: row === "E" ? `${position}-${position + 1}` : String(position), type: row === "E" ? "COUPLE" : row === "D" ? "VIP" : "STANDARD", guestCount: row === "E" ? 2 : 1, availability: booked ? "BOOKED" : unavailable || scenario === "unavailable" ? "UNAVAILABLE" : "AVAILABLE" };
    }));
    return route.fulfill({ json: { showtimeId: id, movieId: MOVIE, cinemaId: CINEMA, hallId: item.hall.id, serverTime: await serverNow(), units: scenario === "empty" ? [] : units.map(unit => ownedSeats().includes(unit.id) ? { ...unit, availability: "HELD" } : unit) } });
  });
  return { setHoldOverlay(seats: () => string[], now: () => Promise<string>) { ownedSeats = seats; serverNow = now; } };
}
