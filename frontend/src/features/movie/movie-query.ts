import type { MovieQuery, MovieSort } from "@/features/movie/movie.types";

export const MOVIE_SORT_OPTIONS: { value: MovieSort; label: string }[] = [
  { value: "title,asc", label: "Tên phim: A–Z" },
  { value: "title,desc", label: "Tên phim: Z–A" },
  { value: "releaseDate,desc", label: "Ngày khởi chiếu: mới nhất trước" },
  { value: "releaseDate,asc", label: "Ngày khởi chiếu: cũ nhất trước" },
  { value: "id,asc", label: "Mã phim: tăng dần" },
  { value: "id,desc", label: "Mã phim: giảm dần" },
];

export function isMovieId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9]+$/.test(value)
    && BigInt(value) > BigInt(0) && BigInt(value) <= BigInt("9223372036854775807");
}

export function parseMovieQuery(params: URLSearchParams): MovieQuery {
  const allowed = new Set(["q", "genreId", "page", "size", "sort"]);
  for (const key of params.keys()) {
    if (!allowed.has(key) || params.getAll(key).length !== 1) {
      throw new Error("Chỉ dùng mỗi bộ lọc một lần. Đặt lại bộ lọc để bắt đầu lại.");
    }
  }
  const q = (params.get("q") ?? "").trim();
  if ([...q].length > 255) throw new Error("Tìm tên phim với tối đa 255 ký tự.");
  const genreId = params.get("genreId") ?? "";
  if (params.has("genreId") && !isMovieId(genreId)) throw new Error("Chọn thể loại hợp lệ hoặc đặt lại bộ lọc.");
  function integer(key: string, fallback: number, min: number, max: number) {
    const raw = params.get(key);
    if (raw === null) return fallback;
    const value = Number(raw);
    if (!/^[0-9]+$/.test(raw) || !Number.isSafeInteger(value) || value < min || value > max) {
      throw new Error(`${key === "page" ? "Trang" : "Số mục mỗi trang"} phải nằm trong khoảng ${min} và ${max}.`);
    }
    return value;
  }
  const sort = params.get("sort") ?? "title,asc";
  if (!MOVIE_SORT_OPTIONS.some(option => option.value === sort)) throw new Error("Chọn kiểu sắp xếp được hỗ trợ.");
  return { q, genreId, page: integer("page", 0, 0, 2147483647), size: integer("size", 20, 1, 100), sort: sort as MovieSort };
}

export function movieQueryString(query: MovieQuery): string {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set("q", query.q.trim());
  if (query.genreId) params.set("genreId", query.genreId);
  params.set("page", String(query.page));
  params.set("size", String(query.size));
  params.set("sort", query.sort);
  return params.toString();
}

export function safeMediaUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
