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
    throw new MovieApiError(0, "Không thể kết nối. Kiểm tra kết nối và thử lại.");
  }
  if (!response.ok) {
    if (response.status === 404) throw new MovieApiError(404, "Phim này không khả dụng.");
    if (response.status === 400) {
      throw new MovieApiError(400, "Kiểm tra bộ lọc và thử lại.");
    }
    throw new MovieApiError(response.status, "Không thể tải nội dung này. Vui lòng thử lại.");
  }
  try { return await response.json() as T; }
  catch { throw new MovieApiError(502, "Không thể đọc phản hồi này. Vui lòng thử lại."); }
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
