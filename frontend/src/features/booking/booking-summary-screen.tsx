"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MovieFeedback } from "@/features/movie/movie-feedback";
import { MoviePoster } from "@/features/movie/movie-poster";
import { createConcessionPreviewHandoff } from "@/features/seat/seat-service";
import { formatShowtimeDate, formatShowtimeTime, showtimeDate } from "@/features/showtime/showtime-service";
import { PAYMENT_METHOD_PREVIEW_PATH, useConcessionPreview, type ConcessionSeatContext } from "@/features/concession/concession-preview-provider";
import { formatConcessionPrice } from "@/features/concession/concession-service";
import { PREVIEW_SEAT_PRICES, createBookingSummaryPreview, createMockPromotionService, normalizePreviewCode, previewGrandTotal } from "@/features/booking/booking-summary-service";
import type { PromotionPreviewResult } from "@/features/booking/booking-summary.types";

export function BookingSummaryScreen() {
  const { preview } = useConcessionPreview();
  if (!preview?.concessions) return <><MovieFeedback title="No Booking preview to review" message="Choose your Seats and continue through Concessions first. Reloading or leaving the preview clears its local selections. No Booking has been created." /><Link href="/movies" className="mt-6 inline-flex min-h-11 items-center text-accent">Browse Movies</Link></>;
  return <BookingSummaryContent context={preview} />;
}

function BookingSummaryContent({ context }: { context: ConcessionSeatContext }) {
  const { movie, cinema, showtime, map, selection, seatHref, concessions } = context;
  const [now, setNow] = useState(() => Date.now());
  const [code, setCode] = useState(context.reviewedSummary?.promotion?.code ?? "");
  const [result, setResult] = useState<PromotionPreviewResult | null>(context.reviewedSummary?.promotion ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const { reviewSummary } = useConcessionPreview();
  const request = useRef<AbortController | null>(null);
  const service = useMemo(() => createMockPromotionService(), []);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); request.current?.abort(); };
  }, []);

  const units = map.units.filter(unit => selection.unitIds.includes(unit.id));
  const quote = createBookingSummaryPreview(units, concessions?.catalog ?? [], concessions?.quantities ?? {}, context.holdHandoff?.holds.map(hold => hold.seatId));
  const validAt = (time: number) => !!quote && !!concessions && movie.id === showtime.movieId && cinema.id === showtime.cinemaId && !!createConcessionPreviewHandoff(selection, map, showtime, time, context.holdHandoff?.holds.map(hold => hold.seatId));
  const eligible = validAt(now);
  const applied = eligible && result?.outcome === "APPLIED" && result.code === normalizePreviewCode(code) && result.baseAmount === quote?.subtotal ? result : null;
  const total = quote ? previewGrandTotal(quote.subtotal, applied?.discount ?? 0) : null;
  const seconds = Math.max(0, Math.ceil(((selection.expiresAt ?? now) - now) / 1000));
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const count = `${units.length} Seat Unit${units.length === 1 ? "" : "s"} · ${quote?.guestCount ?? 0} guest${quote?.guestCount === 1 ? "" : "s"}`;

  function resetPromotion(value: string) {
    request.current?.abort();
    setCode(value);
    setResult(null);
    setError(null);
    setPending(false);
    reviewSummary(null);
  }

  async function applyPromotion(readTime: () => number) {
    const current = readTime();
    setNow(current);
    if (!validAt(current) || !quote || !code.trim()) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setResult(null);
    setError(null);
    reviewSummary(null);
    try {
      const response = await service.apply(code, quote.subtotal, controller.signal);
      if (!controller.signal.aborted && validAt(readTime())) setResult(response);
    } catch (failure) {
      if (!controller.signal.aborted && validAt(readTime())) setError(failure instanceof Error ? failure.message : "Promotion preview failed. Please retry.");
    } finally {
      if (!controller.signal.aborted) { setPending(false); setNow(readTime()); }
    }
  }

  function continueToPayment(current: number) {
    setNow(current);
    if (validAt(current) && quote && total !== null && !pending && !error) {
      reviewSummary({ quote, promotion: applied, total });
      const scenario = new URL(seatHref, "https://preview.local").searchParams.get("paymentPreview");
      router.push(PAYMENT_METHOD_PREVIEW_PATH + (scenario ? `?paymentPreview=${encodeURIComponent(scenario)}` : ""));
    }
  }

  const seatRecovery = <Link href={seatHref} className="inline-flex min-h-11 items-center text-accent">Return to Seat Selection</Link>;
  if (!quote) return <><MovieFeedback title="Preview selection is invalid" message="Some selected items are unavailable or invalid. Return to Seat Selection and choose again." />{seatRecovery}</>;
  const money = formatConcessionPrice;

  return <>
    <nav aria-label="Selection progress" className="mb-6 flex flex-wrap items-center gap-3 font-heading text-xs uppercase tracking-wide text-muted"><Link href={concessions!.returnHref} className="inline-flex min-h-11 items-center text-accent">3. Concessions</Link><span aria-hidden="true">→</span><span aria-current="step" className="text-accent">4. Summary</span><span aria-hidden="true">→</span><span>5. Payment</span></nav>
    <h1 className="text-3xl font-bold sm:text-4xl">Booking Summary</h1><p className="mt-3 text-muted">Review your movie moment before the next step.</p>
    <section aria-label="Selected screening" className="my-6 flex flex-wrap items-center gap-5 rounded-2xl border border-outline/30 bg-panel p-5 sm:p-6">
      <div className="w-20 shrink-0"><MoviePoster url={movie.posterUrl} title={movie.title} /></div>
      <div className="min-w-0 flex-1"><h2 className="break-words text-xl font-bold">{movie.title}</h2><p className="mt-2 text-sm text-muted">{movie.duration} min · {movie.ageRating} · {movie.language}</p><p className="mt-2 text-sm">{cinema.name} · {showtime.hall.name}</p><p className="mt-2 text-sm text-accent">{formatShowtimeDate(showtimeDate(showtime.startsAt))} · {formatShowtimeTime(showtime.startsAt)} · Vietnam time</p></div>
      <div className="w-full rounded-xl bg-panel-low p-4 sm:w-auto"><p className="text-xs text-muted">Seat-hold countdown preview</p><p role="timer" aria-label="Preview time remaining" className="mt-2 font-heading text-2xl tabular-nums text-accent">{countdown}</p><p className="mt-2 text-xs text-muted">Return to Seats to confirm current Hold availability</p></div>
    </section>
    <p className="mb-6 rounded-lg border border-outline/40 bg-panel-low p-4 text-sm leading-6 text-muted">Local preview only · All prices, discounts and totals below are sample VND amounts, not authoritative server totals. No Booking or Payment has been created. Existing Seat Holds retain their server deadlines.</p>
    {!eligible && <section role="alert" className="mb-6 rounded-xl border border-error bg-panel p-5"><h2 className="font-bold text-error">Preview expired or Showtime unavailable</h2><p className="mt-2 text-sm text-muted">You can no longer continue. Return to Seat Selection and choose again; check current Hold availability there.</p>{seatRecovery}</section>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        <section aria-label="Selected Seat Units" className="rounded-2xl border border-outline/30 bg-panel p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">Selected Seats</h2><Link href={seatHref} className="inline-flex min-h-11 items-center text-sm text-accent">Change Seats (check Holds)</Link></div><p className="mb-4 text-sm text-muted">{count}</p><ul className="divide-y divide-outline/30">{quote.seats.map(line => <li key={line.unit.id} className="flex items-center justify-between gap-4 py-4"><div><p className="font-semibold">{line.unit.row}{line.unit.number} · {line.unit.type === "COUPLE" ? "Couple" : "Standard"}</p><p className="mt-1 text-xs text-muted">{line.unit.type === "COUPLE" ? "One indivisible Seat Unit · 2 guests" : "One Seat Unit · 1 guest"}</p></div><span className="shrink-0 font-heading tabular-nums">{money(line.amount)}</span></li>)}</ul><p className="mt-3 text-xs leading-6 text-muted">Sample price per whole unit: Standard {money(PREVIEW_SEAT_PRICES.STANDARD)}; Couple {money(PREVIEW_SEAT_PRICES.COUPLE)}. Couple pricing is independent of guest count.</p></section>
        <section aria-label="Selected Concessions" className="rounded-2xl border border-outline/30 bg-panel p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">Food &amp; Drinks</h2><Link href={concessions!.returnHref} className="inline-flex min-h-11 items-center text-sm text-accent">Edit Concessions</Link></div>{quote.concessions.length ? <ul className="divide-y divide-outline/30">{quote.concessions.map(line => <li key={line.item.id} className="flex items-center gap-3 py-4"><Image src={`/images/concessions/${line.item.image}.png`} width={56} height={56} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="break-words font-semibold">{line.item.name} × {line.quantity}</p><p className="mt-1 text-xs text-muted">{money(line.item.price)} each</p></div><span className="font-heading tabular-nums">{money(line.amount)}</span></li>)}</ul> : <p className="mt-3 text-sm text-muted">No add-ons selected.</p>}</section>
        <section aria-label="Promotion preview" className="rounded-2xl border border-outline/30 bg-panel p-5 sm:p-6"><h2 className="text-xl font-bold">Promotion Code</h2><p className="mt-2 text-sm text-muted">Try a sample code for this preview.</p><form onSubmit={event => { event.preventDefault(); void applyPromotion(Date.now); }} className="mt-5"><label htmlFor="promotion-code" className="text-sm font-semibold">Promotion code</label><div className="mt-2 flex flex-col gap-3 sm:flex-row"><input id="promotion-code" value={code} onChange={event => resetPromotion(event.target.value)} disabled={!eligible} autoComplete="off" spellCheck={false} aria-describedby="promotion-demo-rules" className="min-h-11 min-w-0 flex-1 rounded-lg border border-outline bg-panel-low px-4 text-foreground disabled:opacity-50" placeholder="e.g. DEMO10" /><Button type="submit" disabled={!eligible || pending || !code.trim()}>{pending ? "Applying..." : "Apply Promotion"}</Button></div></form>
          {eligible && pending && <p role="status" className="mt-4 text-sm text-muted">Checking sample Promotion...</p>}
          {applied && <p role="status" className="mt-4 rounded-lg bg-success/10 p-4 text-sm text-success">{applied.code} applied · Preview discount {money(applied.discount)}</p>}
          {eligible && result && result.outcome !== "APPLIED" && <p role="alert" className="mt-4 text-sm text-error">{result.message} You can continue without a Promotion.</p>}
          {eligible && error && <div role="alert" className="mt-4 text-sm text-error"><p>{error}</p><Button variant="secondary" onClick={() => void applyPromotion(Date.now)} className="mt-3">Retry Promotion</Button></div>}
          {code && <Button variant="text" disabled={!eligible} onClick={() => resetPromotion("")} className="mt-3">Remove Promotion</Button>}
          <details id="promotion-demo-rules" className="mt-4 text-xs leading-6 text-muted"><summary className="cursor-pointer py-2">Sample codes and preview rules</summary><p>DEMO10: 10% of the combined Seat and Concession subtotal, rounded down to whole VND. One sample code at a time; no stacking.</p><p className="mt-2">DEMOEXPIRED: expired. DEMOINELIGIBLE: ineligible. DEMORETRY: first request fails, retry applies the same 10% demo discount. Other codes are invalid.</p><p className="mt-2">These fixtures do not define production eligibility, discount scope, usage limits or rounding policy. Editing a code or returning from Concessions clears its applied preview discount; apply again after reviewing changes.</p></details>
        </section>
      </div>
      <aside aria-label="Preview order totals" className="rounded-2xl border border-outline/50 bg-panel p-5 sm:p-6 lg:sticky lg:top-24"><h2 className="text-xl font-bold">Order Summary</h2><p className="mt-2 text-xs text-accent">NON-AUTHORITATIVE PREVIEW · VND</p><dl aria-live="polite" className="mt-6 space-y-4 text-sm"><div className="flex justify-between gap-4"><dt>Seat subtotal</dt><dd className="font-heading tabular-nums">{money(quote.seatAmount)}</dd></div><div className="flex justify-between gap-4"><dt>Concession subtotal</dt><dd className="font-heading tabular-nums">{money(quote.concessionAmount)}</dd></div><div className="flex justify-between gap-4"><dt>Promotion discount</dt><dd className="font-heading tabular-nums text-success">−{money(applied?.discount ?? 0)}</dd></div><div className="flex justify-between gap-4 border-t border-outline/40 pt-5 text-lg font-bold"><dt>Preview grand total</dt><dd className="font-heading tabular-nums text-accent">{money(total ?? quote.subtotal)}</dd></div></dl><p className="mt-5 text-xs leading-6 text-muted">No extra fees in this demonstration. A future Booking service must confirm all amounts and eligibility.</p><Button disabled={!eligible || pending || !!error || total === null} onClick={() => continueToPayment(Date.now())} className="mt-6 w-full">Continue to Payment Method</Button><Link href={concessions!.returnHref} className="mt-3 inline-flex min-h-11 w-full items-center justify-center text-sm text-accent">Back to Concessions</Link><p className="mt-3 text-xs leading-6 text-muted">Opening the next preview does not initiate Payment or freeze your selection. Promotion changes never extend the Seat countdown.</p></aside>
    </div>
  </>;
}
