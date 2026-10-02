"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MovieFeedback } from "@/features/movie/movie-feedback";
import { MoviePoster } from "@/features/movie/movie-poster";
import { createBookingSummaryPreview } from "@/features/booking/booking-summary-service";
import { PAYMENT_METHOD_PREVIEW_PATH, PAYMENT_PROCESSING_PREVIEW_PATH, useConcessionPreview, type ConcessionSeatContext } from "@/features/concession/concession-preview-provider";
import { formatConcessionPrice } from "@/features/concession/concession-service";
import { createConcessionPreviewHandoff } from "@/features/seat/seat-service";
import { formatShowtimeDate, formatShowtimeTime, showtimeDate } from "@/features/showtime/showtime-service";
import { isReviewedSummaryCurrent } from "@/features/payment/payment-method-service";
import { getPaymentResultPresentation } from "@/features/payment/payment-result-service";

export function PaymentResultScreen() {
  const { preview } = useConcessionPreview();
  if (!preview?.paymentResult || !preview.reviewedSummary || !preview.concessions || !preview.selectedPaymentMethod?.available) return <><MovieFeedback title="Complete the Processing preview first" message="No local result is available. Continue through Payment Method and Processing. Reloading or leaving the preview clears context; URL values cannot confirm a payment." /><Link href={preview ? PAYMENT_METHOD_PREVIEW_PATH : "/movies"} className="mt-6 inline-flex min-h-11 items-center text-accent">{preview ? "Back to Payment Methods" : "Browse Movies"}</Link></>;
  return <ResultPreview context={preview} />;
}

function ResultPreview({ context }: { context: ConcessionSeatContext }) {
  const { movie, cinema, showtime, map, selection, concessions, reviewedSummary: review, selectedPaymentMethod: method, paymentResult: result, seatHref } = context;
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  const quote = createBookingSummaryPreview(map.units.filter(unit => selection.unitIds.includes(unit.id)), concessions?.catalog ?? [], concessions?.quantities ?? {}, context.holdHandoff?.holds.map(hold => hold.seatId));
  const presentation = result ? getPaymentResultPresentation(result) : null;
  const reviewed = !!review && !!quote && isReviewedSummaryCurrent(review, quote) && movie.id === showtime.movieId && cinema.id === showtime.cinemaId;
  const validAt = (time: number) => reviewed && !!method?.available && !!createConcessionPreviewHandoff(selection, map, showtime, time, context.holdHandoff?.holds.map(hold => hold.seatId));
  const eligible = validAt(now);

  function resume(path: typeof PAYMENT_METHOD_PREVIEW_PATH | typeof PAYMENT_PROCESSING_PREVIEW_PATH) {
    const time = Date.now();
    setNow(time);
    if (validAt(time)) router.push(path);
  }

  if (!reviewed || !review || !method || !presentation || !result) return <><MovieFeedback title="Review changed Payment preview context" message="This local result does not match a valid reviewed selection. Return to Payment Methods and review again." /><Link href={PAYMENT_METHOD_PREVIEW_PATH} className="mt-6 inline-flex min-h-11 items-center text-accent">Back to Payment Methods</Link></>;
  const money = formatConcessionPrice;
  const seconds = Math.max(0, Math.ceil(((selection.expiresAt ?? now) - now) / 1000));
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const count = `${review.quote.seats.length} Seat Unit${review.quote.seats.length === 1 ? "" : "s"} · ${review.quote.guestCount} guest${review.quote.guestCount === 1 ? "" : "s"}`;
  const tone = presentation.tone === "success" ? "border-success/40 text-success" : presentation.tone === "error" ? "border-error/40 text-error" : "border-action/40 text-accent";

  return <>
    <nav aria-label="Selection progress" className="mb-6 flex flex-wrap items-center gap-3 font-heading text-xs uppercase tracking-wide text-muted"><span>5. Payment</span><span aria-hidden="true">→</span><span aria-current="step" className="text-accent">Result preview</span></nav>
    <section aria-label="Payment Result preview" className={`mb-6 flex items-start gap-4 rounded-2xl border bg-panel p-5 sm:p-6 ${tone}`}>
      <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-current font-heading text-2xl">{result.outcome === "success" ? "✓" : result.outcome === "failed" ? "×" : "…"}</span>
      <div className="min-w-0"><p className="mb-2 text-xs font-semibold uppercase tracking-wide">Local demonstration · Not server-verified</p><h1 className="text-2xl font-bold text-foreground sm:text-3xl">{presentation.title}</h1><p role="status" className="mt-3 text-sm leading-6 text-muted">{presentation.message}</p></div>
    </section>
    {!eligible && <section role="alert" className="mb-6 rounded-xl border border-error bg-panel p-5"><h2 className="font-bold text-error">Preview expired or Showtime unavailable</h2><p className="mt-2 text-sm leading-6 text-muted">This recorded demo outcome grants no reservation or admission. Retry and further processing are blocked. Return to Seat Selection to start a new preview.</p><Link href={seatHref} className="mt-2 inline-flex min-h-11 items-center text-accent">Return to Seat Selection</Link></section>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <section aria-label="Reviewed screening and selections" className="overflow-hidden rounded-2xl border border-outline/30 bg-panel">
          <div className="flex items-start gap-5 bg-panel-low p-5 sm:p-6"><div className="w-20 shrink-0 sm:w-28"><MoviePoster url={movie.posterUrl} title={movie.title} /></div><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-accent">Screening preview</p><h2 className="mt-2 break-words text-2xl font-bold sm:text-3xl">{movie.title}</h2><p className="mt-3 text-sm leading-6 text-muted">{cinema.name} · {showtime.hall.name}</p><p className="mt-2 text-sm text-accent">{formatShowtimeDate(showtimeDate(showtime.startsAt))} · {formatShowtimeTime(showtime.startsAt)} · Vietnam time</p></div></div>
          <div className="p-5 sm:p-6"><h3 className="font-heading text-lg font-semibold">Selected Seat Units</h3><p className="mt-2 text-sm text-muted">{count}</p><ul className="mt-4 flex flex-wrap gap-3">{review.quote.seats.map(line => <li key={line.unit.id} className="rounded-lg border border-outline/40 bg-panel-low px-4 py-3"><span className="font-heading font-bold text-accent">{line.unit.row}{line.unit.number}</span><span className="mt-1 block text-xs text-muted">{line.unit.type === "COUPLE" ? "Couple, 2 guests, one unit" : "Standard, 1 guest"}</span></li>)}</ul><p className="mt-4 text-xs leading-6 text-muted">Seat Units are preview selections, not issued Tickets. A Couple unit remains indivisible for two guests.</p>
            <h3 className="mt-6 border-t border-outline/30 pt-5 font-heading text-lg font-semibold">Food &amp; Drinks</h3>{review.quote.concessions.length ? <ul className="mt-3 space-y-3 text-sm text-muted">{review.quote.concessions.map(line => <li key={line.item.id}>{line.item.name} × {line.quantity}</li>)}</ul> : <p className="mt-3 text-sm text-muted">No add-ons selected.</p>}
            <div className="mt-6 rounded-xl border border-outline/30 bg-panel-low p-5"><h3 className="font-semibold">No admission pass is issued</h3><p className="mt-2 text-sm leading-6 text-muted">No real Payment Transaction, Booking ID, Ticket or Booking QR exists. This page cannot be used for entry. Only a future backend-verified payment can enable Ticket and Booking QR issuance.</p></div>
          </div>
        </section>
        <div className="mt-5 flex flex-wrap gap-3">
          {result.outcome !== "success" && <Button disabled={!eligible} onClick={() => resume(PAYMENT_PROCESSING_PREVIEW_PATH)}>{presentation.resumeLabel}</Button>}
          {result.outcome === "failed" && <Button variant="secondary" disabled={!eligible} onClick={() => resume(PAYMENT_METHOD_PREVIEW_PATH)}>Back to Payment Methods</Button>}
          {result.outcome === "success" && <Link href="/movies" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-action px-5 py-3 font-heading text-sm font-bold text-on-action hover:bg-action-hover">Browse Movies</Link>}
          <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-panel-high px-5 py-3 font-heading text-sm font-semibold hover:bg-panel-hover">Back to Home</Link>
        </div>
        <p className="mt-4 text-xs leading-6 text-muted">Local preview only. Returning to an earlier step does not create a payment or extend the original Seat deadline.</p>
      </div>
      <aside aria-label="Payment Result summary" className="rounded-2xl border border-outline/40 bg-panel p-5 sm:p-6 lg:sticky lg:top-24"><h2 className="font-heading text-xl font-bold">Payment Summary</h2><p className="mt-2 text-xs text-accent">NON-AUTHORITATIVE PREVIEW · VND</p><dl className="mt-5 space-y-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt className="text-muted">Selected method</dt><dd className="font-semibold">{method.name} (preview)</dd></div><div className="flex justify-between gap-3 border-t border-outline/30 pt-4"><dt>Seats · {count}</dt><dd className="shrink-0">{money(review.quote.seatAmount)}</dd></div></dl><ul className="mt-3 space-y-3 text-sm text-muted">{review.quote.seats.map(line => <li key={line.unit.id} className="flex justify-between gap-3"><span>{line.unit.row}{line.unit.number} · {line.unit.type === "COUPLE" ? "Couple unit" : "Standard"}</span><span className="shrink-0">{money(line.amount)}</span></li>)}</ul><dl className="mt-5 space-y-4 border-t border-outline/30 pt-4 text-sm"><div className="flex justify-between gap-3"><dt>Food &amp; Drinks</dt><dd>{money(review.quote.concessionAmount)}</dd></div></dl><ul className="mt-3 space-y-3 text-sm text-muted">{review.quote.concessions.map(line => <li key={line.item.id} className="flex justify-between gap-3"><span>{line.item.name} × {line.quantity}</span><span className="shrink-0">{money(line.amount)}</span></li>)}</ul><dl className="mt-5 space-y-4 border-t border-outline/30 pt-4 text-sm"><div className="flex justify-between gap-3"><dt>Promotion discount{review.promotion && <span className="mt-1 block text-xs text-success">{review.promotion.code} applied</span>}</dt><dd className="text-success">−{money(review.promotion?.discount ?? 0)}</dd></div><div className="flex flex-wrap justify-between gap-3 border-t border-outline/30 pt-4 text-lg font-bold"><dt>Preview total</dt><dd className="font-heading tabular-nums text-accent">{money(review.total)}</dd></div></dl><p className="mt-3 text-xs text-muted">Not an amount paid or a receipt.</p><div className="mt-6 rounded-lg bg-panel-low p-4"><p className="text-xs text-muted">Original Seat countdown preview</p><p role="timer" aria-label="Preview time remaining" className="mt-2 font-heading text-2xl tabular-nums text-accent">{countdown}</p><p className="mt-2 text-xs text-muted">Return to Seats to confirm current Hold availability</p></div></aside>
    </div>
  </>;
}
