import type { AdminIdentity, AdminMovie, AdminMovieContent, AdminMoviePage, MoviePublicationStatus } from "@/features/admin/admin-movie.types";

export class AdminApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;
  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message); this.name = "AdminApiError"; this.status = status; this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, token: string, method = "GET", body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/admin${path}`, {
      method, headers: { Accept: "application/json", Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", credentials: "omit", signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AdminApiError(0, "Unable to reach Movie management. Please try again.");
  }
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new AdminApiError(response.status, typeof problem?.detail === "string" ? problem.detail : "Movie management failed. Please try again.", problem?.errors ?? {});
  }
  try { return await response.json() as T; }
  catch { throw new AdminApiError(502, "Unable to read the server response. Please try again."); }
}

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
