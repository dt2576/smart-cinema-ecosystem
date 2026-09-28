"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CONCESSION_PREVIEW_PATH, useConcessionPreview } from "@/features/concession/concession-preview-provider";
import { createMockCinemaService } from "@/features/cinema/cinema-service";
import type { CinemaOption } from "@/features/cinema/cinema.types";
import { getMovie, MovieApiError } from "@/features/movie/movie-api";
import { MovieFeedback, MovieLoading } from "@/features/movie/movie-feedback";
import { MoviePoster } from "@/features/movie/movie-poster";
import { isMovieId } from "@/features/movie/movie-query";
import type { MovieDetail } from "@/features/movie/movie.types";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { canSelectShowtime, createMockShowtimeService, formatShowtimeDate, formatShowtimeTime } from "@/features/showtime/showtime-service";
import type { ShowtimeOption } from "@/features/showtime/showtime.types";
import { createConcessionPreviewHandoff, createMockSeatService, parseSeatPreviewScenario, seatUnitCapacity, toggleSeatUnit } from "@/features/seat/seat-service";
import type { SeatMap, SeatPreviewSelection } from "@/features/seat/seat.types";

function usePreviewClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  return now;
}

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
  const now = usePreviewClock();
  const cinemaService = useMemo(() => createMockCinemaService(), []);
  const showtimeService = useMemo(() => createMockShowtimeService(), []);
  const load = useCallback(async (signal: AbortSignal) => {
    const [movie, cinemas, schedule] = await Promise.all([getMovie(movieId, signal), cinemaService.listForMovie(movieId, signal), showtimeService.list(movieId, cinemaId, signal)]);
    return { movie, cinema: cinemas.find(item => item.id === cinemaId && item.selectionState === "AVAILABLE"), showtime: schedule.items.find(item => item.id === showtimeId && schedule.dates.includes(date) && canSelectShowtime(item, movieId, cinemaId, date, Date.now())) };
  }, [movieId, cinemaId, date, showtimeId, cinemaService, showtimeService]);
  const { data, loading, error, retry } = useMovieRequest(load);
  const params = new URLSearchParams({ date, showtimeId });
  const from = search.get("from");
  if (from) params.set("from", from);
  const backHref = `/movies/${movieId}/cinemas/${cinemaId}/showtimes?${params}`;
  if (loading) return <MovieLoading detail />;
  if (error) return <><MovieFeedback title={error instanceof MovieApiError && error.status === 404 ? "Movie unavailable" : "Selection couldn’t load"} message={error.message} retry={error instanceof MovieApiError && [400, 404].includes(error.status) ? undefined : retry} /><Link href="/movies" className="mt-6 inline-flex min-h-11 items-center text-accent">Browse Movies</Link></>;
  if (!data?.cinema || !data.showtime || !canSelectShowtime(data.showtime, movieId, cinemaId, date, now)) return <><MovieFeedback title="Showtime unavailable" message="This Showtime or Cinema is unavailable, has started, or does not match your selection." /><Link href={backHref} className="mt-6 inline-flex min-h-11 items-center text-accent">Choose Showtime</Link></>;
  return <SeatOptions movie={data.movie} cinema={data.cinema} showtime={data.showtime} date={date} backHref={backHref} />;
}

function SeatOptions({ movie, cinema, showtime, date, backHref }: { movie: MovieDetail; cinema: CinemaOption; showtime: ShowtimeOption; date: string; backHref: string }) {
  const search = useSearchParams();
  const scenario = parseSeatPreviewScenario(search.get("seatPreview"));
  const service = useMemo(() => createMockSeatService(scenario), [scenario]);
  const load = useCallback((signal: AbortSignal) => service.load(showtime, signal), [service, showtime]);
  const { data, loading, error, retry } = useMovieRequest(load);
  return <>
    <nav aria-label="Selection progress" className="mb-6 flex flex-wrap items-center gap-3 font-heading text-xs uppercase tracking-wide text-muted"><Link href={backHref} className="inline-flex min-h-11 items-center text-accent">1. Showtime</Link><span aria-hidden="true">→</span><span aria-current="step" className="text-accent">2. Seats</span><span aria-hidden="true">→</span><span>3. Concessions</span></nav>
    <section aria-label="Selected screening" className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl bg-panel p-5">
      <div className="w-16 shrink-0"><MoviePoster url={movie.posterUrl} title={movie.title} /></div><div className="min-w-0 flex-1"><h1 className="text-2xl font-bold">Select Seats</h1><h2 className="mt-2 break-words text-lg font-semibold">{movie.title}</h2><p className="mt-1 text-sm text-muted">{cinema.name} · {showtime.hall.name}</p><p className="mt-1 text-sm text-accent">{formatShowtimeDate(date)} · {formatShowtimeTime(showtime.startsAt)} · Vietnam time</p></div>
      <Link href={backHref} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-panel-high px-4 text-sm hover:bg-panel-hover sm:w-auto">Change Showtime</Link>
    </section>
    <p className="mb-6 rounded-lg border border-outline/40 bg-panel-low p-4 text-sm leading-6 text-muted">Preview · Seats and availability are sample data. The countdown does not reserve Seats. Continue carries your preview to Concessions. Reloading or returning to Seats clears the selection.</p>
    {loading && <p role="status" className="rounded-xl bg-panel-low p-10 text-center text-muted">Loading Seat map…</p>}
    {error && <MovieFeedback title="Seat map couldn’t load" message={error.message} retry={retry} />}
    {data && (data.units.length ? <SeatMapSelection key={scenario} map={data} showtime={showtime} movie={movie} cinema={cinema} seatHref={`/showtimes/${showtime.id}/seats?${search}`} /> : <MovieFeedback title="No Seats to display" message="No sample Seat map is available for this Showtime. Try again or choose another Showtime." retry={retry} />)}
  </>;
}

function SeatMapSelection({ map, showtime, movie, cinema, seatHref }: { map: SeatMap; showtime: ShowtimeOption; movie: MovieDetail; cinema: CinemaOption; seatHref: string }) {
  const router = useRouter();
  const { start } = useConcessionPreview();
  const [selection, setSelection] = useState<SeatPreviewSelection>({ unitIds: [], expiresAt: null });
  const [validationError, setValidationError] = useState(false);
  const now = usePreviewClock();
  const expired = selection.expiresAt !== null && now >= selection.expiresAt;
  const selectedUnits = expired ? [] : map.units.filter(unit => selection.unitIds.includes(unit.id));
  const guestCount = selectedUnits.reduce((sum, unit) => sum + seatUnitCapacity(unit), 0);
  const selectionCount = `${selectedUnits.length} Seat Unit${selectedUnits.length === 1 ? "" : "s"} · ${guestCount} guest${guestCount === 1 ? "" : "s"}`;
  const handoff = createConcessionPreviewHandoff(selection, map, showtime, now);
  const seconds = Math.max(0, Math.ceil(((selection.expiresAt ?? now) - now) / 1000));
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const rows = [...new Set(map.units.map(unit => unit.row))];
  const available = map.units.some(unit => unit.availability === "AVAILABLE");

  function continueToConcessions(currentTime: number) {
    const valid = createConcessionPreviewHandoff(selection, map, showtime, currentTime);
    setValidationError(!valid);
    if (valid) {
      start({ movie, cinema, showtime, map, selection, seatHref });
      const scenario = new URL(seatHref, "https://preview.local").searchParams.get("concessionPreview");
      router.push(CONCESSION_PREVIEW_PATH + (scenario ? `?concessionPreview=${encodeURIComponent(scenario)}` : ""));
    }
  }

  return <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
    <section aria-label="Hall Seat map" className="min-w-0 rounded-2xl border border-outline/30 bg-panel-low p-4 sm:p-6">
      <h2 className="text-lg font-bold">{showtime.hall.name} · Seat map</h2>
      <p className="mt-2 text-xs leading-6 text-muted">Choose whole Seat Units. Scroll the map horizontally on smaller screens.</p>
      {!available && <p role="status" className="mt-4 text-sm text-error">No selectable Seat Units in this preview.</p>}
      <div role="region" aria-label="Scrollable Seat map" tabIndex={0} className="mt-6 overflow-x-auto pb-4">
        <div className="min-w-[520px] px-2">
          <div className="mx-auto mb-10 w-4/5 rounded-t-[50%] border-t-4 border-action pt-4 text-center font-heading text-xs uppercase tracking-widest text-accent">Screen · All eyes this way</div>
          <div className="space-y-3">{rows.map(row => <div key={row} className="flex items-center gap-3"><span className="w-4 shrink-0 font-heading text-sm text-muted" aria-hidden="true">{row}</span><div className="grid flex-1 gap-2" style={{ gridTemplateColumns: "repeat(4, minmax(44px, 1fr)) 16px repeat(4, minmax(44px, 1fr))" }}>
            {map.units.filter(unit => unit.row === row).map(unit => {
              const selected = selectedUnits.some(item => item.id === unit.id);
              const disabled = unit.availability !== "AVAILABLE" || expired;
              const state = selected ? "Selected" : unit.availability === "BOOKED" ? "Sold" : unit.availability === "UNAVAILABLE" ? "Unavailable" : "Available";
              const type = unit.type === "COUPLE" ? "Couple, 2 guests" : "Standard, 1 guest";
              return <button key={unit.id} type="button" aria-label={`${unit.row}${unit.number}, ${type}, ${state}`} aria-pressed={selected} disabled={disabled} onClick={() => { const currentTime = Date.now(); setSelection(value => toggleSeatUnit(value, unit.id, map, currentTime)); setValidationError(false); }} style={{ gridColumn: `${unit.column} / span ${unit.type === "COUPLE" ? 2 : 1}` }} className={`flex min-h-12 flex-col items-center justify-center rounded-t-xl rounded-b-md border-b-4 px-1 py-2 text-xs font-semibold transition-colors ${selected ? "border-success bg-success/20 text-success ring-2 ring-success" : unit.availability !== "AVAILABLE" ? "border-outline/40 bg-panel-high text-muted" : "border-outline bg-panel hover:bg-panel-hover"} ${unit.type === "COUPLE" ? "border-x border-x-action/50" : ""}`}>
                <span>{unit.row}{unit.number}</span><span className="mt-1 text-[10px]">{selected ? "✓" : unit.availability === "BOOKED" ? "Sold" : unit.availability === "UNAVAILABLE" ? "×" : unit.type === "COUPLE" ? "2 guests" : "1 guest"}</span>
              </button>;
            })}
          </div><span className="w-4 shrink-0 font-heading text-sm text-muted" aria-hidden="true">{row}</span></div>)}</div>
        </div>
      </div>
      <section aria-label="Seat legend" className="mt-5 border-t border-outline/30 pt-5 text-xs leading-6 text-muted"><h3 className="mb-2 font-heading text-sm font-semibold text-foreground">Seat legend</h3><ul className="flex flex-wrap gap-x-5 gap-y-2"><li>□ Available</li><li className="text-success">✓ Selected</li><li>Sold · Booked</li><li>× Unavailable</li><li>Standard · 1 guest</li><li className="text-accent">Couple · 2 guests, one unit</li></ul></section>
    </section>
    <aside aria-label="Seat selection summary" className="rounded-2xl border border-outline/40 bg-panel p-5 lg:sticky lg:top-24">
      <h2 className="text-xl font-bold">Selection summary</h2>
      <div className="my-5 rounded-lg border border-outline/40 bg-panel-low p-4"><p className="text-sm font-semibold text-accent">Seat-hold countdown preview</p><p role="timer" aria-label="Preview time remaining" className="mt-2 font-heading text-2xl tabular-nums">{selection.expiresAt === null ? "Not started" : countdown}</p><p className="mt-2 text-xs leading-6 text-muted">Local demonstration only. No server Hold or exclusive reservation.</p></div>
      {expired && <div role="alert" className="mb-4 text-sm text-error"><p>Preview expired. Choose your Seat Units again.</p><Button variant="secondary" onClick={() => { setSelection({ unitIds: [], expiresAt: null }); setValidationError(false); }} className="mt-3 w-full">Restart preview</Button></div>}
      <div aria-live="polite"><p className="text-sm font-semibold">{selectionCount}</p>{selectedUnits.length ? <ul className="mt-3 space-y-2 text-sm text-muted">{selectedUnits.map(unit => <li key={unit.id}>{unit.row}{unit.number} · {unit.type === "COUPLE" ? "Couple · 2 guests" : "Standard · 1 guest"}</li>)}</ul> : <p className="mt-3 text-sm text-muted">Choose available Seat Units from the map.</p>}</div>
      <p className="mt-5 text-xs leading-6 text-muted">A Couple Seat Unit is selected and removed as a whole. It accommodates two guests.</p>
      {selection.unitIds.length > 0 && !expired && <Button variant="text" onClick={() => { setSelection({ unitIds: [], expiresAt: null }); setValidationError(false); }} className="mt-3">Clear selection</Button>}
      {validationError && <p role="alert" className="mt-4 text-sm text-error">This preview selection is no longer valid. Check the time and choose again.</p>}
      <Button disabled={!handoff} onClick={() => continueToConcessions(Date.now())} className="mt-5 w-full">Continue to Concessions</Button>
    </aside>
  </div>;
}
