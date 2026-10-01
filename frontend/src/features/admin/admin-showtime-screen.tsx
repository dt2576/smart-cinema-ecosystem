"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/features/admin/admin-shell";
import { getAdminShowtimes, getAdminShowtime, saveAdminShowtime, getAdminMovies, getAdminCinemas, getAdminHalls } from "@/features/admin/admin-api";
import { SHOWTIME_STATUSES, showtimeLocalInput, showtimeLocalInstant, validShowtimePrice, type AdminShowtime, type ShowtimeStatus } from "@/features/admin/admin-showtime.types";
import type { AdminCinema } from "@/features/admin/admin-configuration.types";
import { useMovieRequest } from "@/features/movie/use-movie-request";

const INPUT = "mt-1 min-h-11 w-full rounded-lg border border-outline/50 bg-panel px-3 py-2 disabled:opacity-60";
const LINK = "text-accent underline underline-offset-4";
function Feedback({ loading, error, retry }: { loading: boolean; error?: Error; retry: () => void }) {
  if (loading) return <p role="status">Loading Showtimes…</p>;
  return <div className="space-y-3"><p role="alert">{error?.message}</p><Button onClick={retry}>Retry</Button></div>;
}

export function AdminShowtimeList() {
  const { accessToken } = useAdmin();
  const [filters, setFilters] = useState({ date: "", movieId: "", cinemaId: "", hallId: "", status: "" });
  const [query, setQuery] = useState("");
  const load = useCallback((signal: AbortSignal) => getAdminShowtimes(accessToken, query, signal), [accessToken, query]);
  const result = useMovieRequest(load);
  function filter(event: FormEvent) { event.preventDefault(); setQuery(new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()); }
  return <section className="space-y-6"><h1 className="text-3xl font-bold">Showtime management</h1><Link href="/admin/showtimes/new" className={LINK}>Create Showtime</Link>
    <p className="text-muted">Timezone: {result.data?.timeZone ?? "Loading configured timezone…"}. Seat membership and schedule eligibility are validated by the server.</p>
    <form onSubmit={filter} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label>Date<input type="date" className={INPUT} value={filters.date} onChange={event => setFilters({ ...filters, date: event.target.value })} /></label>
      {(["movieId", "cinemaId", "hallId"] as const).map(key => <label key={key}>{key === "movieId" ? "Movie ID" : key === "cinemaId" ? "Cinema ID" : "Hall ID"}<input className={INPUT} inputMode="numeric" pattern="[1-9][0-9]*" value={filters[key]} onChange={event => setFilters({ ...filters, [key]: event.target.value })} /></label>)}
      <label>Status<select className={INPUT} value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option>{SHOWTIME_STATUSES.map(value => <option key={value}>{value}</option>)}</select></label>
      <div className="flex items-end gap-2"><Button type="submit">Apply filters</Button><Button variant="secondary" onClick={() => { setFilters({ date: "", movieId: "", cinemaId: "", hallId: "", status: "" }); setQuery(""); }}>Clear</Button></div>
    </form>
    {result.loading || result.error ? <Feedback {...result} /> : !result.data?.items.length ? <p role="status">No Showtimes match these filters.</p> : <div className="grid gap-4">{result.data.items.map(item => <article key={item.id} className="min-w-0 space-y-3 rounded-xl border border-outline/40 bg-panel p-5"><h2 className="break-words text-xl font-semibold">{item.movieTitle}</h2><p>{item.cinemaName} · {item.hallName}</p><p>{showtimeLocalInput(item.startsAt, result.data!.timeZone).replace("T", " ")} · {result.data!.timeZone}</p><p className="break-words">Base price: <span className="font-mono">{item.basePrice}</span> · {item.status}</p><Link className={LINK} href={`/admin/showtimes/${item.id}/edit`}>{item.editable ? "Edit Showtime" : "View Showtime"}</Link></article>)}</div>}
  </section>;
}

async function publishedMovies(token: string, signal: AbortSignal) {
  const items: { id: string; title: string; status: string }[] = [];
  for (let page = 0; ; page++) {
    const result = await getAdminMovies(token, `size=100&page=${page}&sort=title,asc`, signal);
    items.push(...result.items.filter(movie => movie.status === "PUBLISHED"));
    if (page + 1 >= result.totalPages) return items;
  }
}
export function AdminShowtimeEditor({ showtimeId }: { showtimeId?: string }) {
  const { accessToken } = useAdmin();
  const load = useCallback(async (signal: AbortSignal) => {
    const [schedule, movies, cinemas] = await Promise.all([showtimeId ? getAdminShowtime(accessToken, showtimeId, signal) : getAdminShowtimes(accessToken, "", signal), publishedMovies(accessToken, signal), getAdminCinemas(accessToken, signal)]);
    return { timeZone: schedule.timeZone, initial: "showtime" in schedule ? schedule.showtime : undefined, movies, cinemas };
  }, [accessToken, showtimeId]);
  const result = useMovieRequest(load);
  return <section className="space-y-6"><Link className={LINK} href="/admin/showtimes">← Showtimes</Link><h1 className="text-3xl font-bold">{showtimeId ? "Edit Showtime" : "Create Showtime"}</h1>
    {result.loading || result.error ? <Feedback {...result} /> : result.data && <ShowtimeForm key={showtimeId} {...result.data} />}
  </section>;
}
function ShowtimeForm({ timeZone, initial, movies, cinemas }: { timeZone: string; initial?: AdminShowtime; movies: { id: string; title: string }[]; cinemas: AdminCinema[] }) {
  const { accessToken, reportError } = useAdmin();
  const [current, setCurrent] = useState(initial);
  const [movieId, setMovieId] = useState(initial?.movieId ?? "");
  const [cinemaId, setCinemaId] = useState(initial?.cinemaId ?? "");
  const [hallId, setHallId] = useState(initial?.hallId ?? "");
  const originalLocal = initial ? showtimeLocalInput(initial.startsAt, timeZone) : "";
  const [date, setDate] = useState(originalLocal.split("T")[0]);
  const [time, setTime] = useState(originalLocal.split("T")[1] ?? "");
  const [price, setPrice] = useState(initial?.basePrice ?? "");
  const [status, setStatus] = useState<ShowtimeStatus>(initial?.status ?? "DRAFT");
  const [busy, setBusy] = useState(false); const submitting = useRef(false);
  const [error, setError] = useState<string>(); const [saved, setSaved] = useState(false);
  const load = useCallback((signal: AbortSignal) => cinemaId ? getAdminHalls(accessToken, cinemaId, signal) : Promise.resolve([]), [accessToken, cinemaId]);
  const halls = useMovieRequest(load);
  const editable = !current || current.editable;
  const choices: ShowtimeStatus[] = current ? [current.status, ...current.transitions] : ["DRAFT", "SCHEDULED", "OPEN_FOR_BOOKING"];
  async function submit(event: FormEvent) {
    event.preventDefault(); if (submitting.current || !editable) return;
    submitting.current = true; setBusy(true); setError(undefined); setSaved(false);
    try {
      const cancel = status === "CANCELLED" && current;
      if (!cancel && !validShowtimePrice(price)) throw new Error("Base price must be an exact nonnegative decimal with at most four fractional digits.");
      const local = `${date}T${time}`;
      const startsAt = cancel ? current.startsAt : current && local === showtimeLocalInput(current.startsAt, timeZone) ? current.startsAt : showtimeLocalInstant(local, timeZone);
      const result = await saveAdminShowtime(accessToken, current?.id, { movieId: cancel ? current.movieId : movieId, hallId: cancel ? current.hallId : hallId, startsAt, basePrice: cancel ? current.basePrice : price, status });
      setCurrent(result.showtime); setSaved(true);
    } catch (cause) { reportError(cause); setError(cause instanceof Error ? cause.message : "Unable to save Showtime."); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <form onSubmit={submit} className="max-w-3xl space-y-5"><p className="text-accent">Scheduled timezone: {timeZone}</p><p className="text-sm text-muted">Server uses Movie duration, no occupancy buffer and cutoff at start. Exact price is preserved. Hall cannot change after creation.</p>
    {!editable && <p role="status" className="rounded-lg bg-panel p-4">This Showtime is read-only: past, terminal or transactional history prevents edits.</p>}
    <fieldset disabled={busy || !editable} className="grid gap-5 sm:grid-cols-2">
      <label>Movie<select required className={INPUT} value={movieId} onChange={event => setMovieId(event.target.value)}><option value="">Select PUBLISHED Movie</option>{current && !movies.some(movie => movie.id === current.movieId) && <option value={current.movieId}>{current.movieTitle} (historical)</option>}{movies.map(movie => <option key={movie.id} value={movie.id}>{movie.title}</option>)}</select></label>
      <label>Cinema<select required disabled={!!current} className={INPUT} value={cinemaId} onChange={event => { setCinemaId(event.target.value); setHallId(""); }}><option value="">Select Cinema</option>{cinemas.filter(cinema => cinema.status === "ACTIVE" || cinema.id === current?.cinemaId).map(cinema => <option key={cinema.id} value={cinema.id}>{cinema.name}</option>)}</select></label>
      <label>Hall<select required disabled={!!current || halls.loading || !!halls.error || !cinemaId} className={INPUT} value={hallId} onChange={event => setHallId(event.target.value)}><option value="">Select configured Hall</option>{halls.data?.filter(hall => hall.status === "ACTIVE" && hall.layoutInitialized || hall.id === current?.hallId).map(hall => <option key={hall.id} value={hall.id}>{hall.name}</option>)}</select></label>
      <label>Date<input type="date" required className={INPUT} value={date ?? ""} onChange={event => setDate(event.target.value)} /></label>
      <label>Time<input type="time" required className={INPUT} value={time} onChange={event => setTime(event.target.value)} /></label>
      <label>Base price<input type="text" inputMode="decimal" required pattern="[0-9]+(\.[0-9]{1,4})?" className={INPUT} value={price} onChange={event => setPrice(event.target.value)} /></label>
      <label>Lifecycle<select className={INPUT} value={status} onChange={event => setStatus(event.target.value as ShowtimeStatus)}>{choices.map(value => <option key={value}>{value}</option>)}</select></label>
      <div className="flex items-end"><Button type="submit" disabled={halls.loading || !!halls.error}>{busy ? "Saving…" : "Save Showtime"}</Button></div>
    </fieldset>
    {halls.loading && <p role="status">Loading Halls…</p>}{halls.error && <Feedback {...halls} />}
    {status === "CANCELLED" && editable && <p className="text-muted">Cancellation preserves saved content and ignores unsaved field changes. No Hold, Booking or Payment is altered.</p>}
    {error && <p role="alert" className="text-error">{error}</p>}{saved && <p role="status" className="text-success">Showtime saved.</p>}
    {current && <section aria-label="Stored Showtime" className="space-y-2 break-words rounded-xl bg-panel p-5 text-sm"><h2 className="font-semibold">Stored Showtime · {current.id}</h2><p>{current.movieTitle} · {current.cinemaName} · {current.hallName}</p><p>Start: {showtimeLocalInput(current.startsAt, timeZone).replace("T", " ")}</p><p>End: {showtimeLocalInput(current.endsAt, timeZone).replace("T", " ")}</p><p>Occupancy ends: {showtimeLocalInput(current.occupiedUntil, timeZone).replace("T", " ")}</p><p>Booking cutoff: {showtimeLocalInput(current.bookingCutOff, timeZone).replace("T", " ")}</p><p>Base price: {current.basePrice} · {current.status}</p><Link className={LINK} href={`/admin/showtimes/${current.id}/edit`}>View saved Showtime</Link></section>}
  </form>;
}
