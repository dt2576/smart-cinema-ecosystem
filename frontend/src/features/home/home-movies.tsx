"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { getMovies } from "@/features/movie/movie-api";
import { MovieCard } from "@/features/movie/movie-card";
import { MovieFeedback, MovieLoading } from "@/features/movie/movie-feedback";
import { movieQueryString, safeMediaUrl } from "@/features/movie/movie-query";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import type { MovieSummary } from "@/features/movie/movie.types";

const CONTAINER = "mx-auto w-full max-w-7xl px-4 lg:px-10";
// A bounded Home selection in server catalog order, not a release or popularity classification.
const HOME_QUERY = movieQueryString({ q: "", genreId: "", page: 0, size: 9, sort: "title,asc" });
const loadHomeMovies = (signal: AbortSignal) => getMovies(HOME_QUERY, signal);

function HomeMovieHero({ movie }: { movie?: MovieSummary }) {
  const poster = safeMediaUrl(movie?.posterUrl ?? null);
  const [failedPoster, setFailedPoster] = useState<string | null>(null);
  return <section id="home" aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-canvas">
    {poster && poster !== failedPoster && <Image src={poster} alt="" fill unoptimized loading="eager" sizes="100vw" className="object-cover" onError={() => setFailedPoster(poster)} />}
    <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-background via-background/20 to-transparent" />
    <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-canvas/90 via-canvas/60 to-canvas/20" />
    <div className={`${CONTAINER} relative flex min-h-[680px] flex-col justify-end pb-20 pt-36 lg:min-h-[800px] lg:pb-32 lg:pt-48`}>
      <div className="max-w-3xl space-y-4">
        <p className="font-heading text-xs font-semibold uppercase tracking-wider text-accent">Khám phá câu chuyện tiếp theo</p>
        {movie && <div className="flex flex-wrap gap-1 text-xs">
          {movie.ageRating && <span className="rounded bg-panel-high px-2.5 py-1 font-bold text-accent">{movie.ageRating}</span>}
          <span className="rounded bg-panel-high/90 px-2.5 py-1 text-muted">{movie.duration} phút</span>
          {movie.genres.length > 0 && <span className="rounded bg-panel-high/90 px-2.5 py-1 text-muted">{movie.genres.map(genre => genre.name).join(" · ")}</span>}
        </div>}
        <h1 id="hero-title" className="break-words text-4xl font-bold tracking-tight lg:text-5xl">{movie?.title ?? "Câu chuyện tiếp theo của bạn bắt đầu tại đây"}</h1>
        <p className="max-w-2xl text-lg leading-8 text-muted">Khám phá danh sách phim. Tìm câu chuyện chạm đến cảm xúc và xem chi tiết.</p>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link href="/movies" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-action px-8 py-3.5 font-heading text-sm font-semibold text-on-action shadow-lg shadow-action/15 hover:bg-action-hover">Khám phá phim<Icon name="arrow" /></Link>
          {movie && <Link href={`/movies/${movie.id}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-outline/40 bg-panel-high px-6 py-3.5 font-heading text-sm font-semibold hover:bg-panel-hover"><Icon name="info" />Xem chi tiết</Link>}
        </div>
      </div>
    </div>
  </section>;
}

function MovieSectionHeading({ title, description, action }: { title: string; description: string; action: string }) {
  return <div className="flex flex-col justify-between gap-4 pb-6 sm:flex-row sm:items-end">
    <div className="space-y-1"><p className="font-heading text-xs font-semibold uppercase tracking-wider text-accent">Bộ sưu tập phim</p><h2 className="text-[28px] font-bold tracking-tight lg:text-4xl">{title}</h2><p className="text-sm leading-6 text-muted">{description}</p></div>
    <Link href="/movies" className="inline-flex min-h-11 items-center gap-2 self-start py-2.5 font-heading text-sm font-semibold text-accent hover:text-foreground sm:shrink-0">{action}<Icon name="arrow" /></Link>
  </div>;
}

export function HomeMovies() {
  const { data, loading, error, retry } = useMovieRequest(loadHomeMovies);
  const movies = data?.items ?? [];
  return <>
    <HomeMovieHero movie={movies[0]} />
    <section id="home-movies" aria-label="Khám phá phim" className={`${CONTAINER} py-10`}>
      <MovieSectionHeading title="Khám phá phim" description="Khám phá bộ sưu tập phim Smart Cinema và tìm câu chuyện tiếp theo của bạn." action="Xem tất cả phim" />
      {loading && <MovieLoading />}
      {error && <MovieFeedback title="Không thể tải phim" message={error.message} retry={retry} />}
      {data && movies.length === 0 && <MovieFeedback title="Câu chuyện tiếp theo đang đến" message="Danh sách chưa có phim. Vui lòng quay lại sau." />}
      {movies.length > 0 && <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-6 xl:grid-cols-5">{movies.slice(0, 5).map(movie => <MovieCard key={movie.id} movie={movie} headingLevel={3} />)}</div>}
    </section>
    <section id="more-movies" aria-label="Khám phá thêm" className="bg-canvas py-10">
      <div className={CONTAINER}>
        <MovieSectionHeading title="Khám phá thêm" description="Khám phá thêm trong bộ sưu tập hoặc tìm theo tên phim và thể loại." action="Duyệt danh sách phim" />
        {movies.length > 5
          ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">{movies.slice(5, 9).map(movie => <MovieCard key={movie.id} movie={movie} headingLevel={3} />)}</div>
          : <p className="rounded-xl bg-panel-low p-6 text-sm leading-6 text-muted">Duyệt toàn bộ danh sách để tìm theo tên phim và khám phá thể loại.</p>}
      </div>
    </section>
  </>;
}
