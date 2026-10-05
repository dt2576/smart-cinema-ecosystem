"use client";

import { useCallback } from "react";
import Link from "next/link";
import { formatCalendarDate } from "@/lib/display-format";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { getMovie, MovieApiError } from "@/features/movie/movie-api";
import { MovieFeedback, MovieLoading } from "@/features/movie/movie-feedback";
import { MoviePoster } from "@/features/movie/movie-poster";
import { isMovieId, movieQueryString, parseMovieQuery, safeMediaUrl } from "@/features/movie/movie-query";
import { useMovieRequest } from "@/features/movie/use-movie-request";

export function MovieDetailScreen({ movieId }: { movieId: string }) {
  const search = useSearchParams();
  let backHref = "/movies";
  const from = search.get("from");
  if (from?.startsWith("/movies?")) {
    try { backHref = `/movies?${movieQueryString(parseMovieQuery(new URLSearchParams(from.slice(8))))}`; }
    catch { /* An invalid return filter falls back to the catalog. */ }
  }
  return <>
    <Link href={backHref} className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-accent"><Icon name="arrow" className="rotate-180" />Về danh sách phim</Link>
    {isMovieId(movieId) ? <DetailContent key={movieId} movieId={movieId} backHref={backHref} /> : <MovieFeedback title="Liên kết phim không hợp lệ" message="Liên kết này không có mã phim hợp lệ. Duyệt danh sách để tìm phim." />}
  </>;
}

function DetailContent({ movieId, backHref }: { movieId: string; backHref: string }) {
  const load = useCallback((signal: AbortSignal) => getMovie(movieId, signal), [movieId]);
  const { data: movie, error, loading, retry } = useMovieRequest(load);
  if (loading) return <MovieLoading detail />;
  if (error) return <MovieFeedback title={error instanceof MovieApiError && error.status === 404 ? "Phim không khả dụng" : "Không thể tải chi tiết phim"} message={error.message} retry={error instanceof MovieApiError && [400, 404].includes(error.status) ? undefined : retry} />;
  if (!movie) return null;
  const trailer = safeMediaUrl(movie.trailerUrl);
  return <article>
    <div className="relative isolate overflow-hidden rounded-2xl border border-outline/30 bg-linear-to-br from-action/10 via-panel-low to-background p-5 sm:p-8 lg:p-10">
      <div className="relative grid items-end gap-8 sm:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr] lg:gap-12">
        <div className="mx-auto w-full max-w-64 sm:mx-0"><MoviePoster url={movie.posterUrl} title={movie.title} priority /></div>
        <div className="min-w-0 pb-2">
          <p className="mb-4 font-heading text-xs font-semibold uppercase tracking-[.2em] text-accent">Smart Cinema · Bộ sưu tập phim</p>
          <h1 className="break-words text-3xl font-bold uppercase leading-tight sm:text-4xl lg:text-6xl">{movie.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted">
            {movie.ageRating && <span className="rounded border border-accent/50 px-2 py-1 font-heading text-xs font-bold text-accent">{movie.ageRating}</span>}
            <span>{movie.duration} phút</span>{movie.language && <span>· {movie.language}</span>}
          </div>
          {movie.genres.length > 0 && <ul aria-label="Thể loại" className="mt-4 flex flex-wrap gap-2">{movie.genres.map(genre => <li key={genre.id} className="rounded-full bg-panel-high px-3 py-1 text-xs text-muted">{genre.name}</li>)}</ul>}
          <Link href={`/movies/${movie.id}/cinemas?from=${encodeURIComponent(backHref)}`} className="mr-3 mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-panel-high px-6 font-heading text-sm font-bold hover:bg-panel-hover">Chọn rạp<Icon name="arrow" /></Link>
          {trailer && <a href={trailer} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-action px-6 font-heading text-sm font-bold text-on-action hover:bg-action-hover"><Icon name="play" />Xem đoạn giới thiệu <span className="sr-only">(mở trong tab mới)</span></a>}
        </div>
      </div>
    </div>
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
      {movie.description && <section className="rounded-2xl bg-panel-low p-6 sm:p-8"><h2 className="border-l-2 border-action pl-3 text-lg font-bold uppercase tracking-wide">Nội dung phim</h2><p className="mt-5 whitespace-pre-line break-words text-sm leading-7 text-muted">{movie.description}</p></section>}
      <section className="rounded-2xl bg-panel-low p-6 sm:p-8"><h2 className="border-l-2 border-action pl-3 text-lg font-bold uppercase tracking-wide">Thông tin phim</h2>
        <dl className="mt-5 space-y-4 text-sm">
          <div><dt className="text-xs text-muted">Thời lượng</dt><dd className="mt-1">{movie.duration} phút</dd></div>
          {movie.releaseDate && <div><dt className="text-xs text-muted">Ngày khởi chiếu</dt><dd className="mt-1"><time dateTime={movie.releaseDate}>{formatCalendarDate(movie.releaseDate)}</time></dd></div>}
          {movie.language && <div><dt className="text-xs text-muted">Ngôn ngữ</dt><dd className="mt-1">{movie.language}</dd></div>}
          {movie.ageRating && <div><dt className="text-xs text-muted">Phân loại độ tuổi</dt><dd className="mt-1">{movie.ageRating}</dd></div>}
        </dl>
      </section>
    </div>
  </article>;
}
