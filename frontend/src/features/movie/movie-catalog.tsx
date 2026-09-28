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
    return <MovieFeedback title="Check your filters" message={error instanceof Error ? error.message : "Invalid filters."} reset />;
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
    catch (error) { setFormError(error instanceof Error ? error.message : "Check your filters."); }
  }

  return <>
    <form onSubmit={search} role="search" aria-label="Search Movies" className="mb-8 rounded-2xl border border-outline/30 bg-panel-low p-4 sm:p-5">
      <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1.2fr_1.5fr_.8fr_auto]">
        <label className="min-w-0 font-heading text-xs font-semibold text-muted" htmlFor="movie-search">Search by title
          <input id="movie-search" name="q" type="search" defaultValue={query.q} placeholder="Find your next Movie…" className={CONTROL_STYLE} aria-describedby={formError ? "movie-filter-error" : undefined} />
        </label>
        <label className="min-w-0 font-heading text-xs font-semibold text-muted" htmlFor="movie-genre">Genre
          <select id="movie-genre" name="genreId" value={selectedGenre} onChange={event => setSelectedGenre(event.target.value)} className={CONTROL_STYLE} aria-describedby="genre-options-status">
            <option value="">All Genres</option>
            {unknownGenre && <option value={selectedGenre}>Selected Genre ({selectedGenre})</option>}
            {genres.data?.map(genre => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
          </select>
        </label>
        <label className="min-w-0 font-heading text-xs font-semibold text-muted" htmlFor="movie-sort">Sort by
          <select id="movie-sort" name="sort" defaultValue={query.sort} className={CONTROL_STYLE}>{MOVIE_SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        </label>
        <label className="min-w-0 font-heading text-xs font-semibold text-muted" htmlFor="movie-size">Per page
          <select id="movie-size" name="size" defaultValue={query.size} className={CONTROL_STYLE}>{[...new Set([10, 20, 50, 100, query.size])].sort((a, b) => a - b).map(size => <option key={size} value={size}>{size}</option>)}</select>
        </label>
        <Button type="submit"><Icon name="search" />Search</Button>
      </div>
      <div id="genre-options-status" className="mt-3 text-xs text-muted" aria-live="polite">
        {genres.loading && "Loading Genre options…"}
        {genres.error && <span>Genre options couldn’t load. You can still search by title. <button type="button" onClick={genres.retry} className="min-h-11 px-2 font-semibold text-accent underline">Retry Genres</button></span>}
        {genres.data?.length === 0 && "No Genre options are available yet."}
      </div>
      {formError && <p id="movie-filter-error" role="alert" className="mt-3 text-sm text-error">{formError}</p>}
    </form>

    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <p role="status" className="text-sm text-muted">{page ? <><span className="font-semibold text-foreground">{page.totalElements.toLocaleString()}</span> {page.totalElements === 1 ? "Movie" : "Movies"}{hasFilters ? " matching your filters" : " in the catalog"}</> : "Explore the Movie catalog"}</p>
      <Link href="/movies" className="inline-flex min-h-11 items-center gap-2 font-heading text-xs font-semibold uppercase tracking-wider text-accent hover:underline">Reset filters <Icon name="close" width={14} height={14} /></Link>
    </div>
    {movies.loading && <MovieLoading />}
    {movies.error && <MovieFeedback title="Movies couldn’t load" message={movies.error.message} retry={movies.retry} reset />}
    {page && page.items.length === 0 && (page.totalElements > 0 || query.page > 0
      ? <div><MovieFeedback title="No Movies on this page" message="The catalog may have changed, or this page is beyond the available results." /><div className="mt-4 text-center"><Button onClick={() => navigate({ ...query, page: 0 })}>Go to first page</Button></div></div>
      : <MovieFeedback title={hasFilters ? "No matching Movies" : "The next story is on its way"} message={hasFilters ? "Try a different title or Genre, or reset your filters to explore all Movies." : "There are no Movies in the catalog yet. Check back soon."} reset={hasFilters} />)}
    {page && page.items.length > 0 && <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
      {page.items.map(movie => <MovieCard key={movie.id} movie={movie} href={`/movies/${movie.id}?from=${encodeURIComponent(`/movies?${queryString}`)}`} />)}
    </div>}
    {page && page.totalPages > 0 && <nav aria-label="Movie pages" className="mt-10 flex flex-wrap items-center justify-center gap-4">
      <Button variant="secondary" disabled={query.page === 0} onClick={() => navigate({ ...query, page: query.page - 1 })}>Previous</Button>
      <span className="text-sm tabular-nums text-muted">Page {query.page + 1} of {page.totalPages.toLocaleString()}</span>
      <Button variant="secondary" disabled={query.page >= page.totalPages - 1} onClick={() => navigate({ ...query, page: query.page + 1 })}>Next</Button>
    </nav>}
  </>;
}
