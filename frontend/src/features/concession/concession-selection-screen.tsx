"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PreviewDialog } from "@/components/ui/preview-dialog";
import { MovieFeedback } from "@/features/movie/movie-feedback";
import { MoviePoster } from "@/features/movie/movie-poster";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { createConcessionPreviewHandoff } from "@/features/seat/seat-service";
import { formatShowtimeDate, formatShowtimeTime, showtimeDate } from "@/features/showtime/showtime-service";
import { BOOKING_SUMMARY_PREVIEW_PATH, CONCESSION_PREVIEW_PATH, useConcessionPreview, type ConcessionSeatContext } from "@/features/concession/concession-preview-provider";
import { changeConcessionQuantity, concessionSubtotal, createMockConcessionService, formatConcessionPrice, parseConcessionPreviewScenario } from "@/features/concession/concession-service";
import type { ConcessionCategory, ConcessionQuantities } from "@/features/concession/concession.types";

const CATEGORIES: { value: ConcessionCategory | "ALL"; label: string }[] = [{ value: "ALL", label: "All" }, { value: "COMBO", label: "Combos" }, { value: "POPCORN", label: "Popcorn" }, { value: "DRINK", label: "Drinks" }];

export function ConcessionSelectionScreen() {
  const { preview } = useConcessionPreview();
  if (!preview) return <><MovieFeedback title="Choose your Seats first" message="This preview is kept while you move through Concessions and Summary. Reloading or leaving the preview clears it. Return to Seat Selection to check any existing server Holds." /><Link href="/movies" className="mt-6 inline-flex min-h-11 items-center text-accent">Browse Movies</Link></>;
  return <ConcessionOptions context={preview} />;
}

function ConcessionOptions({ context }: { context: ConcessionSeatContext }) {
  const search = useSearchParams();
  const scenario = parseConcessionPreviewScenario(search.get("concessionPreview"));
  const service = useMemo(() => createMockConcessionService(scenario), [scenario]);
  const load = useCallback((signal: AbortSignal) => service.list(signal), [service]);
  const { data, loading, error, retry } = useMovieRequest(load);
  const [category, setCategory] = useState<ConcessionCategory | "ALL">("ALL");
  const [quantities, setQuantities] = useState<ConcessionQuantities>(context.concessions?.quantities ?? {});
  const [now, setNow] = useState(() => Date.now());
  const router = useRouter();
  const { selectConcessions } = useConcessionPreview();
  const [expiryDismissed, setExpiryDismissed] = useState(false);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  const { movie, cinema, showtime, map, selection, seatHref } = context;
  const validAt = (time: number) => movie.id === showtime.movieId && cinema.id === showtime.cinemaId && createConcessionPreviewHandoff(selection, map, showtime, time, context.holdHandoff?.holds.map(hold => hold.seatId));
  const handoff = validAt(now);
  const expired = !handoff;
  const units = map.units.filter(unit => selection.unitIds.includes(unit.id));
  const guests = units.reduce((total, unit) => total + (unit.type === "COUPLE" ? 2 : 1), 0);
  const count = `${units.length} Seat Unit${units.length === 1 ? "" : "s"} · ${guests} guest${guests === 1 ? "" : "s"}`;
  const seconds = Math.max(0, Math.ceil(((selection.expiresAt ?? now) - now) / 1000));
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const subtotal = concessionSubtotal(data ?? [], quantities);
  const selectedItems = (data ?? []).filter(item => quantities[item.id]);
  function change(id: string, delta: 1 | -1, current: number) {
    setNow(current);
    if (validAt(current) && data) {
      const next = changeConcessionQuantity(data, quantities, id, delta);
      setQuantities(next);
      selectConcessions({ catalog: data, quantities: next, returnHref: `${CONCESSION_PREVIEW_PATH}?${search}` });
    }
  }
  function continueToSummary() {
    const current = Date.now();
    setNow(current);
    if (validAt(current) && data && concessionSubtotal(data, quantities) !== null) {
      selectConcessions({ catalog: data, quantities, returnHref: `${CONCESSION_PREVIEW_PATH}?${search}` });
      router.push(BOOKING_SUMMARY_PREVIEW_PATH);
    }
  }
  const recovery = <Link href={seatHref} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-action px-5 font-semibold text-on-action">Return to Seat Selection</Link>;
  return <>
    <nav aria-label="Selection progress" className="mb-6 flex flex-wrap items-center gap-3 font-heading text-xs uppercase tracking-wide text-muted"><Link href={seatHref} className="inline-flex min-h-11 items-center text-accent">2. Seats</Link><span aria-hidden="true">→</span><span aria-current="step" className="text-accent">3. Concessions</span><span aria-hidden="true">→</span><span>4. Summary</span></nav>
    <section aria-label="Selected screening" className="mb-6 flex items-center gap-4 rounded-2xl bg-panel p-5"><div className="w-16 shrink-0"><MoviePoster url={movie.posterUrl} title={movie.title} /></div><div className="min-w-0"><h2 className="break-words text-lg font-bold">{movie.title}</h2><p className="mt-1 text-sm text-muted">{cinema.name} · {showtime.hall.name}</p><p className="mt-1 text-sm text-accent">{formatShowtimeDate(showtimeDate(showtime.startsAt))} · {formatShowtimeTime(showtime.startsAt)} · Vietnam time</p></div></section>
    <h1 className="text-3xl font-bold sm:text-4xl">Food &amp; Drinks</h1><p className="mt-3 text-muted">Make your movie moment a little more delicious. Add-ons are optional.</p>
    <p className="my-6 rounded-lg border border-outline/40 bg-panel-low p-4 text-sm leading-6 text-muted">Preview · Sample menu and prices in VND. The countdown projects the original Seat deadline; return to Seats to confirm current Hold state. Changing items never extends it. No Booking or Payment is created.</p>
    {expired && <section role="alert" className="mb-6 rounded-xl border border-error bg-panel p-5"><h2 className="font-bold text-error">Seat preview expired or unavailable</h2><p className="mt-2 text-sm text-muted">Return to Seats and choose again. Current Hold availability must be checked on Seat Selection.</p>{recovery}</section>}
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section aria-label="Concession menu" className="min-w-0">
        <div role="group" aria-label="Concession categories" className="mb-6 flex flex-wrap gap-2">{CATEGORIES.map(item => <button key={item.value} type="button" aria-pressed={category === item.value} onClick={() => setCategory(item.value)} className={`min-h-11 rounded-lg px-5 text-sm font-semibold ${category === item.value ? "bg-action text-on-action" : "bg-panel text-muted hover:bg-panel-hover"}`}>{item.label}</button>)}</div>
        {loading && <p role="status" className="rounded-xl bg-panel p-10 text-center text-muted">Loading Concessions...</p>}
        {error && <MovieFeedback title="Concessions couldn't load" message={error.message} retry={retry} />}
        {data?.length === 0 && <MovieFeedback title="No Concessions available" message="You can continue without add-ons, or try loading the menu again." retry={retry} />}
        {data && data.length > 0 && !data.some(item => item.available) && <p role="status" className="mb-4 text-sm text-muted">All sample items are unavailable. You can continue without add-ons.</p>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data?.filter(item => category === "ALL" || category === item.category).map(item => <article key={item.id} aria-label={item.name} className="overflow-hidden rounded-2xl border border-outline/30 bg-panel">
          <div className="relative aspect-[4/3] bg-panel-high"><Image src={`/images/concessions/${item.image}.png`} alt="" fill sizes="(max-width: 639px) 100vw, (max-width: 1279px) 45vw, 260px" className={`object-cover ${!item.available ? "opacity-50" : ""}`} /></div>
          <div className="p-4"><h3 className="font-bold">{item.name}</h3><p className="mt-2 font-heading text-sm text-accent">{formatConcessionPrice(item.price)}</p><p className="mt-2 min-h-12 text-sm leading-6 text-muted">{item.description}</p><div className="mt-4 flex items-center justify-between gap-2 border-t border-outline/30 pt-4"><span className="text-xs text-muted">{item.available ? "Quantity" : "Unavailable"}</span><div className="flex items-center gap-2"><button type="button" aria-label={`Decrease ${item.name}`} disabled={expired || !item.available || !quantities[item.id]} onClick={() => change(item.id, -1, Date.now())} className="min-h-11 min-w-11 rounded-lg bg-panel-high disabled:opacity-40">−</button><output aria-label={`${item.name} quantity`} className="min-w-5 text-center tabular-nums">{quantities[item.id] ?? 0}</output><button type="button" aria-label={`Increase ${item.name}`} disabled={expired || !item.available} onClick={() => change(item.id, 1, Date.now())} className="min-h-11 min-w-11 rounded-lg bg-action text-on-action disabled:opacity-40">+</button></div></div></div>
        </article>)}</div>
        {data && data.length > 0 && !data.some(item => category === "ALL" || category === item.category) && <p role="status">No items in this category. Choose another category or continue without add-ons.</p>}
      </section>
      <aside aria-label="Concession selection summary" className="rounded-2xl border border-outline/40 bg-panel p-5 lg:sticky lg:top-24"><h2 className="text-xl font-bold">Your selection</h2><div className="my-5 rounded-lg border border-outline/40 bg-panel-low p-4"><p className="text-sm text-accent">Seat-hold countdown preview</p><p role="timer" aria-label="Preview time remaining" className="mt-2 font-heading text-2xl tabular-nums">{countdown}</p><p className="mt-2 text-xs leading-6 text-muted">Original Seat deadline only. Add-ons remain a local preview; return to Seats to reconcile Holds.</p></div><p className="font-semibold">{count}</p><p className="mt-2 text-sm text-muted">{units.map(unit => `${unit.row}${unit.number}${unit.type === "COUPLE" ? " (Couple, 2 guests)" : ""}`).join(", ")}</p><Link href={seatHref} className="mt-2 inline-flex min-h-11 items-center text-sm text-accent">Change Seats (check Holds)</Link><h3 className="mt-4 border-t border-outline/30 pt-4 font-semibold">Concessions</h3><div aria-live="polite">{selectedItems.length ? <ul className="mt-3 space-y-3 text-sm">{selectedItems.map(item => <li key={item.id} className="flex justify-between gap-3"><span>{item.name} × {quantities[item.id]}</span><span>{formatConcessionPrice(item.price * quantities[item.id])}</span></li>)}</ul> : <p className="mt-3 text-sm text-muted">No add-ons selected.</p>}<div className="mt-5 flex justify-between gap-3 border-t border-outline/30 pt-5 font-bold"><span>Preview concession subtotal</span><span>{subtotal === null ? "Unavailable" : formatConcessionPrice(subtotal)}</span></div></div><p className="mt-3 text-xs leading-6 text-muted">Concessions only. Seat prices and final Booking totals are not calculated in this preview.</p>{subtotal === null && <p role="alert" className="mt-3 text-sm text-error">Your add-ons are no longer available. Return to Seats to begin a new preview.</p>}<Button onClick={continueToSummary} disabled={expired || !data || subtotal === null} className="mt-5 w-full">Continue to Booking Summary</Button><p className="mt-3 text-center text-xs text-muted">Continue with or without add-ons.</p></aside>
    </div>
    {expired && !expiryDismissed && <PreviewDialog title="Seat preview expired" closeLabel="Review expired preview" onClose={() => setExpiryDismissed(true)}><p className="text-sm leading-7 text-muted">Your preview time has ended or the Showtime is no longer available. Return to Seat Selection to choose again. Current Hold availability must be checked there.</p>{recovery}</PreviewDialog>}
  </>;
}
