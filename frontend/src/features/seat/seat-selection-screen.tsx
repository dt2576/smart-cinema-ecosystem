"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CONCESSION_PREVIEW_PATH, useConcessionPreview } from "@/features/concession/concession-preview-provider";
import { DiscoveryApiError, getCinema, getShowtimes, getShowtime } from "@/features/discovery/discovery-api";
import { useAuth } from "@/features/auth/auth-context";
import type { CinemaOption } from "@/features/cinema/cinema.types";
import { getMovie, MovieApiError } from "@/features/movie/movie-api";
import { MovieFeedback, MovieLoading } from "@/features/movie/movie-feedback";
import { MoviePoster } from "@/features/movie/movie-poster";
import { isMovieId } from "@/features/movie/movie-query";
import type { MovieDetail } from "@/features/movie/movie.types";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { canSelectShowtime, formatShowtimeDate, formatShowtimeTime } from "@/features/showtime/showtime-service";
import type { ShowtimeOption } from "@/features/showtime/showtime.types";
import { seatUnitCapacity } from "@/features/seat/seat-service";
import { saveSeatIntent, useSeatHolds } from "@/features/seat/use-seat-holds";

export function SeatSelectionScreen({ showtimeId }: { showtimeId: string }) {
  const search = useSearchParams();
  const single = (name: string) => search.getAll(name).length === 1 ? search.get(name)! : "";
  const movieId = single("movieId");
  const cinemaId = single("cinemaId");
  const date = single("date");
  if (!isMovieId(showtimeId) || !isMovieId(movieId) || !isMovieId(cinemaId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return <><MovieFeedback title="Invalid Seat Selection link" message="Choose a Movie, Cinema and Showtime to view its Seats." /><Link href="/movies" className="mt-6 inline-flex min-h-11 items-center text-accent">Browse Movies</Link></>;
  return <SeatContext key={`${movieId}/${cinemaId}/${date}/${showtimeId}`} movieId={movieId} cinemaId={cinemaId} date={date} showtimeId={showtimeId} />;
}

function SeatContext({ movieId, cinemaId, date, showtimeId }: { movieId: string; cinemaId: string; date: string; showtimeId: string }) {
  const search = useSearchParams();
  const load = useCallback(async (signal: AbortSignal) => {
    const [movie, cinema, schedule, detail] = await Promise.all([getMovie(movieId, signal), getCinema(cinemaId, signal), getShowtimes(movieId, cinemaId, date, signal), getShowtime(showtimeId, signal)]);
    const showtime = { ...detail, timeZone: schedule.timeZone };
    return { movie, cinema, showtime: canSelectShowtime(showtime, movieId, cinemaId, date, Date.parse(schedule.serverTime)) ? showtime : undefined };
  }, [movieId, cinemaId, date, showtimeId]);
  const { data, loading, error, retry } = useMovieRequest(load);
  const params = new URLSearchParams({ date, showtimeId });
  const from = search.get("from");
  if (from) params.set("from", from);
  const backHref = `/movies/${movieId}/cinemas/${cinemaId}/showtimes?${params}`;
  if (loading) return <MovieLoading detail />;
  if (error) return <><MovieFeedback title={error instanceof MovieApiError && error.status === 404 ? "Movie unavailable" : error instanceof DiscoveryApiError && error.status === 404 ? "Showtime unavailable" : "Selection couldn’t load"} message={error.message} retry={(error instanceof MovieApiError || error instanceof DiscoveryApiError) && [400, 404].includes(error.status) ? undefined : retry} /><Link href={backHref} className="mt-6 inline-flex min-h-11 items-center text-accent">Choose Showtime</Link></>;
  if (!data?.cinema || !data.showtime) return <><MovieFeedback title="Showtime unavailable" message="This Showtime or Cinema is unavailable, has started, or does not match your selection." /><Link href={backHref} className="mt-6 inline-flex min-h-11 items-center text-accent">Choose Showtime</Link></>;
  return <SeatOptions movie={data.movie} cinema={data.cinema} showtime={data.showtime} date={date} backHref={backHref} />;
}

function SeatOptions({ movie, cinema, showtime, date, backHref }: { movie: MovieDetail; cinema: CinemaOption; showtime: ShowtimeOption; date: string; backHref: string }) {
  const search = useSearchParams();
  const { session, isHydrated } = useAuth();
  return <>
    <nav aria-label="Selection progress" className="mb-6 flex flex-wrap items-center gap-3 font-heading text-xs uppercase tracking-wide text-muted"><Link href={backHref} className="inline-flex min-h-11 items-center text-accent">1. Showtime</Link><span aria-hidden="true">→</span><span aria-current="step" className="text-accent">2. Seats</span><span aria-hidden="true">→</span><span>3. Concessions</span></nav>
    <section aria-label="Selected screening" className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl bg-panel p-5">
      <div className="w-16 shrink-0"><MoviePoster url={movie.posterUrl} title={movie.title} /></div><div className="min-w-0 flex-1"><h1 className="text-2xl font-bold">Select Seats</h1><h2 className="mt-2 break-words text-lg font-semibold">{movie.title}</h2><p className="mt-1 text-sm text-muted">{cinema.name} · {showtime.hall.name}</p><p className="mt-1 text-sm text-accent">{formatShowtimeDate(date)} · {formatShowtimeTime(showtime.startsAt, showtime.timeZone)} · {showtime.timeZone}</p></div>
      <Link href={backHref} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-panel-high px-4 text-sm hover:bg-panel-hover sm:w-auto">Change Showtime</Link>
    </section>
    <p className="mb-6 rounded-lg border border-outline/40 bg-panel-low p-4 text-sm leading-6 text-muted">Choose Seat Units, then confirm them together with Hold selected Seats. Only server-confirmed owned Holds reserve Seats. Returning or reloading checks those Holds without renewing their deadlines. Continue opens a Concessions preview; no Booking or Payment is created.</p>
    {isHydrated ? <SeatMapSelection key={session?.accessToken ?? "anonymous"} token={session?.accessToken} showtime={showtime} movie={movie} cinema={cinema} seatHref={`/showtimes/${showtime.id}/seats?${search}`} /> : <p role="status">Loading session…</p>}
  </>;
}

function SeatMapSelection({ token, showtime, movie, cinema, seatHref }: { token?: string; showtime: ShowtimeOption; movie: MovieDetail; cinema: CinemaOption; seatHref: string }) {
  const router = useRouter();
  const { start } = useConcessionPreview();
  const state = useSeatHolds(showtime, token, seatHref);
  const { map, draft, owned, busy, confirmed, now, deadline, error, message, handoff } = state;
  const { clearSession } = useAuth();
  function signIn() {
    saveSeatIntent(seatHref, draft);
    if (error?.status === 401) clearSession();
    router.push(`/login?${new URLSearchParams({ returnTo: seatHref })}`);
  }
  if (!map) return <>{busy && <p role="status" className="rounded-xl bg-panel-low p-10 text-center text-muted">Loading Seat map…</p>}{error && <MovieFeedback title="Seat map couldn’t load" message={error.message} retry={() => void state.refresh()} />}{error?.status === 401 && <Button onClick={signIn}>Sign in again</Button>}</>;
  if (!map.units.length) return <MovieFeedback title="No Seats to display" message="No Seat map is available for this Showtime. Try again or choose another Showtime." retry={() => void state.refresh()} />;
  const selectedUnits = map.units.filter(unit => draft.includes(unit.id));
  const guestCount = selectedUnits.reduce((sum, unit) => sum + seatUnitCapacity(unit), 0);
  const selectionCount = `${selectedUnits.length} Seat Unit${selectedUnits.length === 1 ? "" : "s"} · ${guestCount} guest${guestCount === 1 ? "" : "s"}`;
  const seconds = Math.max(0, Math.ceil(((deadline ? Date.parse(deadline) : now) - now) / 1000));
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const rows = [...new Set(map.units.map(unit => unit.row))];
  const columns = Math.max(8, ...rows.map(row => map.units.filter(unit => unit.row === row).reduce((sum, unit) => sum + seatUnitCapacity(unit), 0)));
  const available = map.units.some(unit => unit.availability === "AVAILABLE") || owned.length > 0;
  const cutoff = !(Date.parse(showtime.bookingCutOff ?? showtime.startsAt) > now) || !(Date.parse(showtime.startsAt) > now);
  const pendingCount = draft.filter(id => !owned.some(hold => hold.seatId === id)).length;

  async function continueToConcessions() {
    const fresh = await state.prepareHandoff();
    if (fresh?.handoff) {
      const selection = { unitIds: fresh.handoff.holds.map(hold => hold.seatId), expiresAt: Date.parse(fresh.handoff.expiresAt) };
      start({ movie, cinema, showtime, map: fresh.map, selection, seatHref, holdHandoff: fresh.handoff });
      const scenario = new URL(seatHref, "https://preview.local").searchParams.get("concessionPreview");
      router.push(CONCESSION_PREVIEW_PATH + (scenario ? `?concessionPreview=${encodeURIComponent(scenario)}` : ""));
    }
  }

  return <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
    <section aria-label="Hall Seat map" className="min-w-0 rounded-2xl border border-outline/30 bg-panel-low p-4 sm:p-6">
      <h2 className="text-lg font-bold">{showtime.hall.name} · Seat map</h2>
      <p className="mt-2 text-xs leading-6 text-muted">Choose whole Seat Units. Scroll the map horizontally on smaller screens.</p>
      {!available && <p role="status" className="mt-4 text-sm text-error">No selectable Seat Units available.</p>}
      <div role="region" aria-label="Scrollable Seat map" tabIndex={0} className="mt-6 overflow-x-auto pb-4">
        <div className="min-w-[520px] px-2">
          <div className="mx-auto mb-10 w-4/5 rounded-t-[50%] border-t-4 border-action pt-4 text-center font-heading text-xs uppercase tracking-widest text-accent">Screen · All eyes this way</div>
          <div className="space-y-3">{rows.map(row => <div key={row} className="flex items-center gap-3"><span className="w-4 shrink-0 font-heading text-sm text-muted" aria-hidden="true">{row}</span><div className="grid flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(44px, 1fr))` }}>
            {map.units.filter(unit => unit.row === row).map(unit => {
              const selected = selectedUnits.some(item => item.id === unit.id);
              const mine = owned.some(hold => hold.seatId === unit.id);
              const disabled = busy || !confirmed || cutoff || (unit.availability !== "AVAILABLE" && !mine);
              const label = mine ? confirmed ? "Held by you" : "Last confirmed Hold" : selected ? "Selected" : unit.availability === "BOOKED" ? "Sold" : unit.availability === "HELD" ? "Held" : unit.availability === "UNAVAILABLE" ? "Unavailable" : "Available";
              const type = unit.type === "COUPLE" ? "Couple, 2 guests" : unit.type === "VIP" ? "VIP, 1 guest" : "Standard, 1 guest";
              return <button key={unit.id} type="button" aria-label={`${unit.row}${unit.number}, ${type}, ${label}`} aria-pressed={selected} disabled={disabled} onClick={() => state.toggle(unit.id)} style={{ gridColumn: `${unit.column} / span ${unit.type === "COUPLE" ? 2 : 1}` }} className={`flex min-h-12 flex-col items-center justify-center rounded-t-xl rounded-b-md border-b-4 px-1 py-2 text-xs font-semibold transition-colors ${mine ? "border-success bg-success/20 text-success ring-2 ring-success" : selected ? "border-action bg-action/20 text-accent ring-2 ring-action" : unit.availability !== "AVAILABLE" ? "border-outline/40 bg-panel-high text-muted" : "border-outline bg-panel hover:bg-panel-hover"} ${unit.type === "COUPLE" ? "border-x border-x-action/50" : ""}`}>
                <span>{unit.row}{unit.number}</span><span className="mt-1 text-[10px]">{mine ? "Held by you" : selected ? "Selected" : unit.availability === "BOOKED" ? "Sold" : unit.availability === "HELD" ? "Held" : unit.availability === "UNAVAILABLE" ? "×" : unit.type === "COUPLE" ? "2 guests" : unit.type === "VIP" ? "VIP" : "1 guest"}</span>
              </button>;
            })}
          </div><span className="w-4 shrink-0 font-heading text-sm text-muted" aria-hidden="true">{row}</span></div>)}</div>
        </div>
      </div>
      <section aria-label="Seat legend" className="mt-5 border-t border-outline/30 pt-5 text-xs leading-6 text-muted"><h3 className="mb-2 font-heading text-sm font-semibold text-foreground">Seat legend</h3><ul className="flex flex-wrap gap-x-5 gap-y-2"><li>□ Available</li><li className="text-accent">Selected · not held yet</li><li className="text-success">Held by you</li><li>Held · another Customer or Booking</li><li>Sold · Booked</li><li>× Unavailable</li><li>Standard / VIP · 1 guest</li><li className="text-accent">Couple · 2 guests, one unit</li></ul></section>
    </section>
    <aside aria-label="Seat selection summary" className="rounded-2xl border border-outline/40 bg-panel p-5 lg:sticky lg:top-24">
      <h2 className="text-xl font-bold">Selection summary</h2>
      <div className="my-5 rounded-lg border border-outline/40 bg-panel-low p-4"><p className="text-sm font-semibold text-accent">Server Seat Hold countdown</p><p role="timer" aria-label="Hold time remaining" className="mt-2 font-heading text-2xl tabular-nums">{deadline ? countdown : "Not started"}</p>{deadline && <p className="mt-2 break-words text-xs text-muted">Server expiresAt: <time dateTime={deadline}>{deadline}</time></p>}<p className="mt-2 text-xs leading-6 text-muted">The earliest owned Hold deadline applies. Selection changes and reload never renew an existing Hold.</p></div>
      {cutoff && <p role="alert" className="mb-4 text-sm text-error">Showtime booking cutoff has passed. No new Holds or continuation are allowed.</p>}
      {busy && <p role="status" className="mb-4 text-sm text-accent">Confirming Seat state with the server…</p>}
      {message && <p role="status" className="mb-4 text-sm text-muted">{message}</p>}
      {error && <p role="alert" className="mb-4 text-sm text-error">{error.message}</p>}
      <div aria-live="polite"><p className="text-sm font-semibold">{selectionCount}</p>{selectedUnits.length ? <ul className="mt-3 space-y-2 text-sm text-muted">{selectedUnits.map(unit => <li key={unit.id}>{unit.row}{unit.number} · {unit.type === "COUPLE" ? "Couple · 2 guests" : unit.type === "VIP" ? "VIP · 1 guest" : "Standard · 1 guest"}</li>)}</ul> : <p className="mt-3 text-sm text-muted">Choose available Seat Units from the map.</p>}</div>
      <p className="mt-5 text-xs leading-6 text-muted">A Couple Seat Unit is selected and removed as a whole. It accommodates two guests.</p>
      <p className="mt-3 text-sm text-success">{owned.length} {confirmed ? "server-confirmed owned" : "last-confirmed"} Hold{owned.length === 1 ? "" : "s"}{!confirmed && " · refresh required"}</p>
      {pendingCount > 0 && <p className="mt-2 text-xs text-accent">{pendingCount} selected Seat Unit{pendingCount === 1 ? "" : "s"} not held yet.</p>}
      {token && error?.status !== 401 ? <Button disabled={busy || !confirmed || !pendingCount || cutoff} onClick={() => void state.acquire()} className="mt-4 w-full">Hold selected Seats</Button> : <Button disabled={busy || !draft.length || cutoff} onClick={signIn} className="mt-4 w-full">{error?.status === 401 ? "Sign in again" : "Sign in to hold Seats"}</Button>}
      {(draft.length > 0 || state.batch.holds.length > 0) && <Button variant="text" disabled={busy} onClick={state.clear} className="mt-3">Clear selection / release Holds</Button>}
      <Button variant="secondary" disabled={busy} onClick={() => void state.refresh()} className="mt-3 w-full">Refresh Seat availability</Button>
      <Button disabled={!handoff} onClick={() => void continueToConcessions()} className="mt-5 w-full">Continue to Concessions</Button>
      <p className="mt-3 text-xs leading-6 text-muted">Continue preserves Hold IDs for future Booking integration. Concessions and totals remain previews.</p>
    </aside>
  </div>;
}
