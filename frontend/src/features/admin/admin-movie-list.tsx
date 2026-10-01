"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/features/admin/admin-shell";
import { getAdminMovies, setMoviePublication } from "@/features/admin/admin-api";
import { useMovieRequest } from "@/features/movie/use-movie-request";

export function AdminMovieList() {
  const params = useSearchParams();
  const { accessToken, reportError } = useAdmin();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState({ q: "", page: 0 });
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const load = useCallback((signal: AbortSignal) => {
    const query = new URLSearchParams({ q: filter.q, page: String(filter.page), size: "20", sort: "title,asc" });
    return getAdminMovies(accessToken, query.toString(), signal).catch(error => { reportError(error); throw error; });
  }, [accessToken, filter, reportError]);
  const result = useMovieRequest(load);

  async function changePublication(id: string, status: "PUBLISHED" | "UNPUBLISHED") {
    if (pending) return;
    setPending(id); setFeedback(null);
    try { await setMoviePublication(accessToken, id, status); setFeedback({ message: status === "PUBLISHED" ? "Movie published. Customers can now view it." : "Movie unpublished. It is hidden from Customers.", error: false }); result.retry(); }
    catch (error) { reportError(error); setFeedback({ message: error instanceof Error ? error.message : "Publication failed.", error: true }); }
    finally { setPending(null); }
  }
  function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setFilter({ q: q.trim(), page: 0 }); }

  return <section className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">Movies</h1><p className="mt-2 text-muted">The shared catalog, including drafts and unpublished Movies.</p></div><Link href="/admin/movies/new" className="rounded-lg bg-action px-4 py-3 font-semibold text-on-action hover:bg-action-hover">Create Movie</Link></div>
    <form onSubmit={search} className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><label htmlFor="admin-search" className="mb-2 block text-sm">Search by title</label><input id="admin-search" value={q} onChange={event => setQ(event.target.value)} maxLength={255} className="h-11 w-full rounded-lg bg-panel-high px-4" /></div><Button type="submit" variant="secondary">Search</Button></form>
    {params.get("created") === "1" && <p role="status" className="text-success">Movie draft created. Publish it when ready for Customers.</p>}
    {feedback && <p role={feedback.error ? "alert" : "status"} className={feedback.error ? "text-error" : "text-success"}>{feedback.message}</p>}
    {result.loading ? <p role="status">Loading Movies…</p> : result.error ? <div className="space-y-4"><p role="alert" className="text-error">{result.error.message}</p><Button onClick={result.retry}>Retry Movies</Button></div> : result.data && <>
      {result.data.items.length === 0 ? <div className="rounded-xl bg-panel p-8"><h2 className="text-xl font-semibold">No Movies found</h2><p className="mt-2 text-muted">Create a draft or try a different search.</p>{filter.page > 0 && <Button onClick={() => setFilter(current => ({ ...current, page: 0 }))} className="mt-4">Go to first page</Button>}</div> : <div className="space-y-3">{result.data.items.map(movie => <article key={movie.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-outline/30 bg-panel p-5">
        <div className="min-w-0 flex-1"><h2 className="break-words text-lg font-semibold">{movie.title}</h2><p className="mt-1 text-sm text-accent">{movie.status}</p><p className="mt-2 text-sm text-muted">{movie.duration} min · {movie.releaseDate ?? "Release date unset"} · {movie.ageRating ?? "Age rating unset"} · {movie.language ?? "Language unset"}</p><p className="mt-1 text-sm text-muted">{movie.genres.map(genre => genre.name).join(", ") || "No Genres"}</p></div>
        <div className="flex flex-wrap items-center gap-2"><Link href={`/admin/movies/${encodeURIComponent(movie.id)}/edit`} aria-label={`Edit ${movie.title}`} className="rounded-lg bg-panel-high px-4 py-3 text-sm font-semibold hover:bg-panel-hover">Edit</Link>
          {["DRAFT", "UNPUBLISHED", "PUBLISHED"].includes(movie.status) && <Button disabled={pending !== null} variant="secondary" aria-label={`${movie.status === "PUBLISHED" ? "Unpublish" : "Publish"} ${movie.title}`} onClick={() => void changePublication(movie.id, movie.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED")}>{pending === movie.id ? "Saving…" : movie.status === "PUBLISHED" ? "Unpublish" : "Publish"}</Button>}
        </div>
      </article>)}</div>}
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm"><span>{result.data.totalElements} Movies · Page {filter.page + 1} of {Math.max(1, result.data.totalPages)}</span><div className="flex gap-2"><Button variant="secondary" disabled={filter.page === 0} onClick={() => setFilter(current => ({ ...current, page: current.page - 1 }))}>Previous</Button><Button variant="secondary" disabled={filter.page + 1 >= result.data.totalPages} onClick={() => setFilter(current => ({ ...current, page: current.page + 1 }))}>Next</Button></div></div>
    </>}
  </section>;
}
