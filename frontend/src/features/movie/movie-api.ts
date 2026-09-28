import type { Genre, MovieDetail, MoviePage } from "@/features/movie/movie.types";

export class MovieApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "MovieApiError";
    this.status = status;
  }
}

async function read<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/${path}`, {
      method: "GET", headers: { Accept: "application/json" }, cache: "no-store", credentials: "omit", signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new MovieApiError(0, "We couldn’t connect. Check your connection and try again.");
  }
  if (!response.ok) {
    if (response.status === 404) throw new MovieApiError(404, "This Movie is unavailable.");
    if (response.status === 400) {
      const problem = await response.json().catch(() => null);
      throw new MovieApiError(400, typeof problem?.detail === "string" ? problem.detail : "Check your filters and try again.");
    }
    throw new MovieApiError(response.status, "We couldn’t load this content. Please try again.");
  }
  try { return await response.json() as T; }
  catch { throw new MovieApiError(502, "We couldn’t read this response. Please try again."); }
}

export function getMovies(query: string, signal?: AbortSignal): Promise<MoviePage> {
  return read(`movies${query ? `?${query}` : ""}`, signal);
}
export function getMovie(movieId: string, signal?: AbortSignal): Promise<MovieDetail> {
  return read(`movies/${encodeURIComponent(movieId)}`, signal);
}
export function getGenres(signal?: AbortSignal): Promise<Genre[]> {
  return read("genres", signal);
}
