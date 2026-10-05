import { presentationError } from "@/lib/presentation-errors";
import type { CinemaOption } from "@/features/cinema/cinema.types";
import type { ShowtimeOption } from "@/features/showtime/showtime.types";
import type { SeatMap, SeatUnit } from "@/features/seat/seat.types";

export class DiscoveryApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.name = "DiscoveryApiError"; this.status = status; }
}
type Cinema = { id: string; name: string; address: string; contact: string | null; operatingInformation: string | null };
export type PublicShowtime = Omit<ShowtimeOption, "hasAvailableSeats"> & { endsAt: string; bookingCutOff: string };
export type DiscoverySchedule = { timeZone: string; serverTime: string; date: string; dates: string[]; items: PublicShowtime[] };
type PublicSeatMap = { showtimeId: string; movieId: string; cinemaId: string; hallId: string; serverTime: string; units: { id: string; row: string; number: string; type: SeatUnit["type"]; guestCount: number; availability: SeatUnit["availability"] }[] };

async function read<T>(path: string, signal: AbortSignal): Promise<T> {
  let response: Response;
  try { response = await fetch(`/api/v1${path}`, { headers: { Accept: "application/json" }, cache: "no-store", credentials: "omit", signal }); }
  catch (error) { if (signal.aborted) throw error; throw new DiscoveryApiError(0, "Không thể kết nối dịch vụ tìm rạp. Vui lòng thử lại."); }
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new DiscoveryApiError(response.status, presentationError(response.status, problem?.detail));
  }
  try { return await response.json() as T; }
  catch { throw new DiscoveryApiError(502, "Không thể đọc thông tin rạp. Vui lòng thử lại."); }
}
function cinemaOption(cinema: Cinema): CinemaOption {
  return { ...cinema, contact: cinema.contact ?? "", operatingInformation: cinema.operatingInformation ?? "", selectionState: "AVAILABLE" };
}
export async function getCinemasForMovie(movieId: string, signal: AbortSignal): Promise<CinemaOption[]> {
  return (await read<Cinema[]>(`/cinemas?${new URLSearchParams({ movieId })}`, signal)).map(cinemaOption);
}
export async function getCinema(id: string, signal: AbortSignal): Promise<CinemaOption> { return cinemaOption(await read<Cinema>(`/cinemas/${encodeURIComponent(id)}`, signal)); }
export async function getShowtimes(movieId: string, cinemaId: string, date: string | null, signal: AbortSignal): Promise<DiscoverySchedule> {
  const params = new URLSearchParams({ movieId, cinemaId }); if (date !== null) params.set("date", date);
  const schedule = await read<DiscoverySchedule>(`/showtimes?${params}`, signal);
  return { ...schedule, items: schedule.items.map(item => ({ ...item, timeZone: schedule.timeZone })) };
}
export function getShowtime(id: string, signal: AbortSignal): Promise<PublicShowtime> { return read(`/showtimes/${encodeURIComponent(id)}`, signal); }
export async function getSeatMap(showtime: ShowtimeOption, signal: AbortSignal): Promise<SeatMap> {
  const map = await read<PublicSeatMap>(`/showtimes/${encodeURIComponent(showtime.id)}/seats`, signal);
  if (map.showtimeId !== showtime.id || map.hallId !== showtime.hall.id || map.movieId !== showtime.movieId || map.cinemaId !== showtime.cinemaId) throw new DiscoveryApiError(409, "Sơ đồ ghế không khớp với suất chiếu. Vui lòng chọn lại suất chiếu.");
  const columns = new Map<string, number>();
  if (!Number.isFinite(Date.parse(map.serverTime)) || map.units.some(unit => typeof unit.id !== "string" || !/^[1-9][0-9]{0,18}$/.test(unit.id) || unit.guestCount !== (unit.type === "COUPLE" ? 2 : 1))) throw new DiscoveryApiError(502, "Không thể xác nhận sơ đồ ghế. Vui lòng thử lại.");
  return { showtimeId: map.showtimeId, hallId: map.hallId, serverTime: map.serverTime, units: map.units.map(unit => {
    // Presentation order only: the public contract has no physical coordinates.
    const column = columns.get(unit.row) ?? 1; columns.set(unit.row, column + (unit.type === "COUPLE" ? 2 : 1));
    return { ...unit, showtimeId: map.showtimeId, hallId: map.hallId, column };
  }) };
}
