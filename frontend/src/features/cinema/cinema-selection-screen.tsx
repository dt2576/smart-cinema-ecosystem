"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getMovie, MovieApiError } from "@/features/movie/movie-api";
import { MovieFeedback, MovieLoading } from "@/features/movie/movie-feedback";
import { MoviePoster } from "@/features/movie/movie-poster";
import { isMovieId } from "@/features/movie/movie-query";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { createCinemaHandoff } from "@/features/cinema/cinema-service";
import { getCinemasForMovie } from "@/features/discovery/discovery-api";
import type { MovieDetail } from "@/features/movie/movie.types";

export function CinemaSelectionScreen({ movieId }: { movieId: string }) {
  if (!isMovieId(movieId)) return <><h1 className="mb-6 text-3xl font-bold">Select Cinema</h1><MovieFeedback title="Invalid Movie link" message="Choose a Movie from the catalog to continue." /><Link href="/movies" className="mt-6 inline-flex min-h-11 items-center text-accent">Browse Movies</Link></>;
  return <CinemaMovieContext key={movieId} movieId={movieId} />;
}

function CinemaMovieContext({ movieId }: { movieId: string }) {
  const load = useCallback((signal: AbortSignal) => getMovie(movieId, signal), [movieId]);
  const { data: movie, error, loading, retry } = useMovieRequest(load);
  if (loading) return <MovieLoading detail />;
  if (error) return <><MovieFeedback title={error instanceof MovieApiError && error.status === 404 ? "Movie unavailable" : "Movie couldn’t load"} message={error.message} retry={error instanceof MovieApiError && [400, 404].includes(error.status) ? undefined : retry} /><Link href="/movies" className="mt-6 inline-flex min-h-11 items-center text-accent">Browse Movies</Link></>;
  return movie ? <CinemaOptions movie={movie} /> : null;
}

function CinemaOptions({ movie }: { movie: MovieDetail }) {
  const search = useSearchParams();
  const router = useRouter();
  const load = useCallback((signal: AbortSignal) => getCinemasForMovie(movie.id, signal), [movie.id]);
  const { data: options, error, loading, retry } = useMovieRequest(load);
  const [query, setQuery] = useState("");
  const url = search.toString();
  const urlSelectedId = search.getAll("cinemaId").length === 1 ? search.get("cinemaId") : null;
  const [selection, setSelection] = useState({ url, id: urlSelectedId });
  // Reflect radio input immediately; reconcile external URL/back navigation before rendering children.
  if (selection.url !== url) setSelection({ url, id: urlSelectedId });
  const selectedId = selection.url === url ? selection.id : urlSelectedId;
  const selected = options?.find(cinema => cinema.id === selectedId && cinema.selectionState === "AVAILABLE");
  const handoff = selected ? createCinemaHandoff(movie.id, selected) : null;
  const visible = options?.filter(cinema => `${cinema.name} ${cinema.address}`.toLowerCase().includes(query.trim().toLowerCase())) ?? [];
  const from = search.get("from");
  const detailHref = `/movies/${movie.id}${from ? `?from=${encodeURIComponent(from)}` : ""}`;

  function navigate(cinemaId: string) {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (cinemaId) params.set("cinemaId", cinemaId);
    const href = `/movies/${movie.id}/cinemas${params.size ? `?${params}` : ""}`;
    router.push(href, { scroll: false });
  }

  return <>
    <nav aria-label="Selection progress" className="mb-6 flex flex-wrap items-center gap-3 font-heading text-xs uppercase tracking-wide text-muted">
      <Link href={detailHref} className="inline-flex min-h-11 items-center text-accent">1. Movie</Link><span aria-hidden="true">→</span><span aria-current="step" className="text-accent">2. Cinema</span><span aria-hidden="true">→</span><span>3. Showtime</span>
    </nav>
    <section aria-label="Selected Movie" className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl bg-linear-to-r from-panel to-action/10 p-4 sm:p-5">
      <div className="w-16 shrink-0"><MoviePoster url={movie.posterUrl} title={movie.title} /></div>
      <div className="min-w-0 flex-1"><p className="text-xs text-muted">{movie.ageRating && `${movie.ageRating} · `}{movie.duration} min</p><h2 className="mt-1 break-words text-xl font-bold">{movie.title}</h2><p className="mt-1 text-xs text-muted">{movie.genres.map(genre => genre.name).join(" · ")}</p></div>
      <Link href={detailHref} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-panel-high px-4 font-heading text-xs font-semibold hover:bg-panel-hover"><Icon name="arrow" className="rotate-180" />Back to Movie</Link>
    </section>
    <p className="mb-3 font-heading text-xs font-semibold uppercase tracking-wider text-accent">Choose your Cinema</p>
    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Select Cinema Branch</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Choose a branch for the next step of your Movie journey.</p>
    <p className="mb-6 mt-4 rounded-lg border border-outline/40 bg-panel-low px-4 py-3 text-sm text-muted">Cinema options come from the live catalog for this Movie. Choose a branch to view eligible Showtimes.</p>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-panel-low p-4">
      <p className="font-heading text-sm text-accent">All branches{options ? ` (${options.length})` : ""}</p>
      <label className="flex w-full max-w-sm items-center gap-3 rounded-lg border border-outline/50 bg-panel-high px-3"><Icon name="search" /><span className="sr-only">Search Cinema name or address</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search branch name or address…" className="min-h-11 min-w-0 flex-1 bg-transparent text-sm" /></label>
    </div>
    {loading && <div role="status" className="rounded-2xl bg-panel-low p-10 text-center text-muted">Loading Cinema options…</div>}
    {error && <MovieFeedback title="Cinemas couldn’t load" message={error.message} retry={retry} />}
    {options && options.length === 0 && <MovieFeedback title="No Cinema options" message="There are no eligible Cinema schedules for this Movie. You can retry or return to the Movie." retry={retry} />}
    {options && options.length > 0 && !options.some(cinema => cinema.selectionState === "AVAILABLE") && <p role="status" className="mb-6 rounded-lg border border-outline/50 p-4 text-sm text-muted">No branches are available to select. Closed and unavailable branches cannot be selected.</p>}
    {options && options.length > 0 && visible.length === 0 && <div role="status" className="rounded-xl bg-panel-low p-8 text-center"><p>No branches match your search.</p><Button variant="text" onClick={() => setQuery("")}>Clear search</Button></div>}
    {options && <fieldset><legend className="sr-only">Choose a Cinema</legend><div className="grid gap-5 md:grid-cols-2">
      {visible.map(cinema => {
        const active = selected?.id === cinema.id;
        const available = cinema.selectionState === "AVAILABLE";
        return <label key={cinema.id} className={`relative flex min-w-0 flex-col gap-4 rounded-xl border-t-2 p-5 transition-colors ${active ? "border-action bg-action/10 ring-1 ring-action" : "border-outline/40 bg-panel-low"} ${available ? "cursor-pointer hover:bg-panel" : "cursor-not-allowed"}`}>
          <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className={`mb-2 text-xs font-semibold ${available ? "text-success" : "text-muted"}`}>{active ? "Selected" : "Eligible Showtimes"}</p><h2 className="break-words text-lg font-bold">{cinema.name}</h2></div><input type="radio" name="cinema" value={cinema.id} checked={active} disabled={!available} aria-label={cinema.name} onChange={() => { setSelection({ url, id: cinema.id }); navigate(cinema.id); }} className="mt-1 size-5 shrink-0 accent-action" /></div>
          <p className="flex gap-2 text-sm leading-6 text-muted"><Icon name="pin" className="shrink-0" />{cinema.address}</p>
          <p className="text-xs text-muted">{cinema.contact}</p><p className="text-xs text-muted">{cinema.operatingInformation}</p>
          <span className={`mt-auto flex min-h-11 items-center justify-center rounded-lg px-4 font-heading text-xs font-semibold ${active ? "bg-action text-on-action" : "bg-panel-high text-muted"}`}>{active ? "Selected branch" : available ? "Select branch" : "Not selectable"}</span>
        </label>;
      })}
    </div></fieldset>}
    <aside aria-label="Cinema selection summary" className="sticky bottom-3 z-20 mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-outline/50 bg-panel p-4 shadow-xl sm:p-5">
      <div className="min-w-0 flex-1" aria-live="polite"><p className="font-heading text-xs uppercase tracking-wider text-accent">Selected Cinema</p><p className="mt-1 break-words font-semibold">{selected?.name ?? "Choose an available branch"}</p>{selectedId && options && !selected && <p className="mt-1 text-xs text-error">Your previous choice is unavailable. Choose another branch.</p>}</div>
      <Button disabled={!handoff} onClick={() => { if (handoff) router.push(`${handoff.showtimePath}${from ? `?from=${encodeURIComponent(from)}` : ""}`); }} className="w-full sm:w-auto">Continue to Showtimes<Icon name="arrow" /></Button>
    </aside>
  </>;
}
