"use client";

import { useCallback, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getGenres, getMovies } from "@/features/movie/movie-api";
import { MovieFeedback, MovieLoading } from "@/features/movie/movie-feedback";
import { MovieCard } from "@/features/movie/movie-card";
import { MOVIE_SORT_OPTIONS, movieQueryString, parseMovieQuery } from "@/features/movie/movie-query";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import type { MovieQuery } from "@/features/movie/movie.types";

const CONTROL_STYLE = "mt-2 min-h-11 w-full min-w-0 rounded-lg border border-outline/50 bg-panel-high px-3 text-sm text-foreground";

export function MovieCatalog() {
  const search = useSearchParams();
  let query: MovieQuery;
  try { query = parseMovieQuery(new URLSearchParams(search.toString())); }
  catch (error) {
    return <MovieFeedback title="Kiểm tra bộ lọc" message={error instanceof Error ? error.message : "Bộ lọc không hợp lệ."} reset />;
  }
  return <CatalogResults key={movieQueryString(query)} query={query} />;
}

function CatalogResults({ query }: { query: MovieQuery }) {
  const router = useRouter();
  const queryString = movieQueryString(query);
  const loadMovies = useCallback((signal: AbortSignal) => getMovies(queryString, signal), [queryString]);
  const movies = useMovieRequest(loadMovies);
  const genres = useMovieRequest(getGenres);
  const [formError, setFormError] = useState("");
  const [selectedGenre, setSelectedGenre] = useState(query.genreId);
  const navigate = (next: MovieQuery) => router.push(`/movies?${movieQueryString(next)}`, { scroll: false });
  const page = movies.data;
  const hasFilters = Boolean(query.q || query.genreId);
  const unknownGenre = selectedGenre && !genres.data?.some(genre => genre.id === selectedGenre);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ["q", "genreId", "sort", "size"]) {
      const value = String(values.get(key) ?? "");
      if (key !== "genreId" || value) params.set(key, value);
    }
    try { navigate(parseMovieQuery(params)); setFormError(""); }
    catch (error) { setFormError(error instanceof Error ? error.message : "Kiểm tra bộ lọc."); }
  }

  return <>
    <form onSubmit={search} role="search" aria-label="Tìm phim" className="mb-8 rounded-2xl border border-outline/30 bg-panel-low p-4 sm:p-5">
      <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1.2fr_1.5fr_.8fr_auto]">
        <label className="min-w-0 font-heading text-xs font-semibold text-muted" htmlFor="movie-search">Tìm theo tên phim
          <input id="movie-search" name="q" type="search" defaultValue={query.q} placeholder="Tìm phim bạn muốn xem…" className={CONTROL_STYLE} aria-describedby={formError ? "movie-filter-error" : undefined} />
        </label>
        <label className="min-w-0 font-heading text-xs font-semibold text-muted" htmlFor="movie-genre">Thể loại
          <select id="movie-genre" name="genreId" value={selectedGenre} onChange={event => setSelectedGenre(event.target.value)} className={CONTROL_STYLE} aria-describedby="genre-options-status">
            <option value="">Tất cả thể loại</option>
            {unknownGenre && <option value={selectedGenre}>Thể loại đã chọn ({selectedGenre})</option>}
            {genres.data?.map(genre => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
          </select>
        </label>
        <label className="min-w-0 font-heading text-xs font-semibold text-muted" htmlFor="movie-sort">Sắp xếp theo
          <select id="movie-sort" name="sort" defaultValue={query.sort} className={CONTROL_STYLE}>{MOVIE_SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        </label>
        <label className="min-w-0 font-heading text-xs font-semibold text-muted" htmlFor="movie-size">Số phim mỗi trang
          <select id="movie-size" name="size" defaultValue={query.size} className={CONTROL_STYLE}>{[...new Set([10, 20, 50, 100, query.size])].sort((a, b) => a - b).map(size => <option key={size} value={size}>{size}</option>)}</select>
        </label>
        <Button type="submit"><Icon name="search" />Tìm kiếm</Button>
      </div>
      <div id="genre-options-status" className="mt-3 text-xs text-muted" aria-live="polite">
        {genres.loading && "Đang tải thể loại…"}
        {genres.error && <span>Không thể tải thể loại. Bạn vẫn có thể tìm theo tên phim. <button type="button" onClick={genres.retry} className="min-h-11 px-2 font-semibold text-accent underline">Tải lại thể loại</button></span>}
        {genres.data?.length === 0 && "Chưa có thể loại để chọn."}
      </div>
      {formError && <p id="movie-filter-error" role="alert" className="mt-3 text-sm text-error">{formError}</p>}
    </form>

    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <p role="status" className="text-sm text-muted">{page ? <><span className="font-semibold text-foreground">{page.totalElements.toLocaleString("vi-VN")}</span> phim{hasFilters ? " phù hợp với bộ lọc" : " trong danh sách"}</> : "Khám phá danh sách phim"}</p>
      <Link href="/movies" className="inline-flex min-h-11 items-center gap-2 font-heading text-xs font-semibold uppercase tracking-wider text-accent hover:underline">Đặt lại bộ lọc <Icon name="close" width={14} height={14} /></Link>
    </div>
    {movies.loading && <MovieLoading />}
    {movies.error && <MovieFeedback title="Không thể tải phim" message={movies.error.message} retry={movies.retry} reset />}
    {page && page.items.length === 0 && (page.totalElements > 0 || query.page > 0
      ? <div><MovieFeedback title="Trang này chưa có phim" message="Danh sách có thể đã thay đổi hoặc trang này vượt quá số kết quả hiện có." /><div className="mt-4 text-center"><Button onClick={() => navigate({ ...query, page: 0 })}>Về trang đầu</Button></div></div>
      : <MovieFeedback title={hasFilters ? "Không có phim phù hợp" : "Câu chuyện tiếp theo đang đến"} message={hasFilters ? "Thử tên phim hoặc thể loại khác, hoặc đặt lại bộ lọc để xem tất cả phim." : "Danh sách chưa có phim. Vui lòng quay lại sau."} reset={hasFilters} />)}
    {page && page.items.length > 0 && <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
      {page.items.map(movie => <MovieCard key={movie.id} movie={movie} href={`/movies/${movie.id}?from=${encodeURIComponent(`/movies?${queryString}`)}`} />)}
    </div>}
    {page && page.totalPages > 0 && <nav aria-label="Các trang phim" className="mt-10 flex flex-wrap items-center justify-center gap-4">
      <Button variant="secondary" disabled={query.page === 0} onClick={() => navigate({ ...query, page: query.page - 1 })}>Trước</Button>
      <span className="text-sm tabular-nums text-muted">Trang {query.page + 1} trên {page.totalPages.toLocaleString("vi-VN")}</span>
      <Button variant="secondary" disabled={query.page >= page.totalPages - 1} onClick={() => navigate({ ...query, page: query.page + 1 })}>Sau</Button>
    </nav>}
  </>;
}
