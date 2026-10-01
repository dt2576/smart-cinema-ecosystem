import type { AdminIdentity, AdminMovie, AdminMovieContent, AdminMoviePage, MoviePublicationStatus } from "@/features/admin/admin-movie.types";

export class AdminApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;
  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message); this.name = "AdminApiError"; this.status = status; this.fieldErrors = fieldErrors;
  }
}

export async function adminRequest<T>(path: string, token: string, method = "GET", body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/admin${path}`, {
      method, headers: { Accept: "application/json", Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", credentials: "omit", signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AdminApiError(0, "Unable to reach Admin management. Please try again.");
  }
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new AdminApiError(response.status, typeof problem?.detail === "string" ? problem.detail : "Admin management failed. Please try again.", problem?.errors ?? {});
  }
  try { return await response.json() as T; }
  catch { throw new AdminApiError(502, "Unable to read the server response. Please try again."); }
}

const request = adminRequest;

export function getAdminIdentity(token: string, signal?: AbortSignal): Promise<AdminIdentity> { return request("", token, "GET", undefined, signal); }
export function getAdminMovies(token: string, query: string, signal?: AbortSignal): Promise<AdminMoviePage> {
  return request(`/movies${query ? `?${query}` : ""}`, token, "GET", undefined, signal);
}
export function getAdminMovie(token: string, id: string, signal?: AbortSignal): Promise<AdminMovie> { return request(`/movies/${encodeURIComponent(id)}`, token, "GET", undefined, signal); }
export function createAdminMovie(token: string, content: AdminMovieContent): Promise<AdminMovie> { return request("/movies", token, "POST", content); }
export function updateAdminMovie(token: string, id: string, content: AdminMovieContent): Promise<AdminMovie> { return request(`/movies/${encodeURIComponent(id)}`, token, "PUT", content); }
export function setMoviePublication(token: string, id: string, status: MoviePublicationStatus): Promise<AdminMovie> {
  return request(`/movies/${encodeURIComponent(id)}/publication`, token, "PUT", { status });
}
import type { AdminCinema, AdminHall, AdminSeat, CinemaContent, HallContent, SeatContent } from "@/features/admin/admin-configuration.types";

const segment = encodeURIComponent;
export const getAdminCinemas = (token: string, signal?: AbortSignal) => adminRequest<AdminCinema[]>("/cinemas", token, "GET", undefined, signal);
export const getAdminCinema = (token: string, id: string, signal?: AbortSignal) => adminRequest<AdminCinema>(`/cinemas/${segment(id)}`, token, "GET", undefined, signal);
export const saveAdminCinema = (token: string, id: string | undefined, content: CinemaContent) => adminRequest<AdminCinema>(id ? `/cinemas/${segment(id)}` : "/cinemas", token, id ? "PUT" : "POST", content);
export const getAdminHalls = (token: string, cinemaId: string, signal?: AbortSignal) => adminRequest<AdminHall[]>(`/cinemas/${segment(cinemaId)}/halls`, token, "GET", undefined, signal);
export const getAdminHall = (token: string, hallId: string, signal?: AbortSignal) => adminRequest<AdminHall>(`/halls/${segment(hallId)}`, token, "GET", undefined, signal);
export const saveAdminHall = (token: string, cinemaId: string, hallId: string | undefined, content: HallContent) => adminRequest<AdminHall>(hallId ? `/halls/${segment(hallId)}` : `/cinemas/${segment(cinemaId)}/halls`, token, hallId ? "PUT" : "POST", content);
export const getAdminSeats = (token: string, hallId: string, signal?: AbortSignal) => adminRequest<AdminSeat[]>(`/halls/${segment(hallId)}/seats`, token, "GET", undefined, signal);
export const initializeAdminSeats = (token: string, hallId: string, units: SeatContent[]) => adminRequest<AdminSeat[]>(`/halls/${segment(hallId)}/seats`, token, "POST", { units });
export const updateAdminSeat = (token: string, seatId: string, content: SeatContent) => adminRequest<AdminSeat>(`/seats/${segment(seatId)}`, token, "PUT", content);
import type { AdminShowtimeSchedule, AdminShowtimeDetail, ShowtimeContent } from "@/features/admin/admin-showtime.types";
export const getAdminShowtimes = (token: string, query = "", signal?: AbortSignal) => adminRequest<AdminShowtimeSchedule>(`/showtimes${query ? `?${query}` : ""}`, token, "GET", undefined, signal);
export const getAdminShowtime = (token: string, id: string, signal?: AbortSignal) => adminRequest<AdminShowtimeDetail>(`/showtimes/${segment(id)}`, token, "GET", undefined, signal);
export const saveAdminShowtime = (token: string, id: string | undefined, content: ShowtimeContent) => adminRequest<AdminShowtimeDetail>(id ? `/showtimes/${segment(id)}` : "/showtimes", token, id ? "PUT" : "POST", content);
