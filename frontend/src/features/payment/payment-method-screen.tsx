"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MovieFeedback } from "@/features/movie/movie-feedback";
import { MoviePoster } from "@/features/movie/movie-poster";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { createBookingSummaryPreview } from "@/features/booking/booking-summary-service";
import { BOOKING_SUMMARY_PREVIEW_PATH, PAYMENT_PROCESSING_PREVIEW_PATH, useConcessionPreview, type ConcessionSeatContext } from "@/features/concession/concession-preview-provider";
import { formatConcessionPrice } from "@/features/concession/concession-service";
import { createConcessionPreviewHandoff } from "@/features/seat/seat-service";
import { formatShowtimeDate, formatShowtimeTime, showtimeDate } from "@/features/showtime/showtime-service";
import { availablePaymentMethod, createMockPaymentMethodService, isReviewedSummaryCurrent, parsePaymentMethodScenario } from "@/features/payment/payment-method-service";
import type { PaymentMethodScenario } from "@/features/payment/payment-method.types";

export function PaymentMethodScreen() {
  const { preview } = useConcessionPreview();
  const search = useSearchParams();
  const scenario = parsePaymentMethodScenario(search.get("paymentPreview"));
  if (!preview?.reviewedSummary || !preview.concessions) return <><MovieFeedback title="Review your Booking preview first" message="Continue from Booking Summary to choose a sample payment method. Reloading or leaving the preview clears local context; no Booking or Payment exists." /><Link href={preview ? BOOKING_SUMMARY_PREVIEW_PATH : "/movies"} className="mt-6 inline-flex min-h-11 items-center text-accent">{preview ? "Back to Booking Summary" : "Browse Movies"}</Link></>;
  return <PaymentMethodOptions key={scenario} context={preview} scenario={scenario} />;
}

function PaymentMethodOptions({ context, scenario }: { context: ConcessionSeatContext; scenario: PaymentMethodScenario }) {
  const { movie, cinema, showtime, map, selection, concessions, reviewedSummary: review, seatHref } = context;
  const service = useMemo(() => createMockPaymentMethodService(scenario), [scenario]);
  const load = useCallback((signal: AbortSignal) => service.list(signal), [service]);
  const { data, loading, error, retry } = useMovieRequest(load);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const router = useRouter();
  const { selectPaymentMethod } = useConcessionPreview();
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);

  const units = map.units.filter(unit => selection.unitIds.includes(unit.id));
  const currentQuote = createBookingSummaryPreview(units, concessions?.catalog ?? [], concessions?.quantities ?? {});
  const reviewed = !!review && !!currentQuote && isReviewedSummaryCurrent(review, currentQuote);
  const validAt = (time: number) => reviewed && movie.id === showtime.movieId && cinema.id === showtime.cinemaId && !!createConcessionPreviewHandoff(selection, map, showtime, time);
  const eligible = validAt(now);
  const method = availablePaymentMethod(data ?? [], selectedId);
  const seconds = Math.max(0, Math.ceil(((selection.expiresAt ?? now) - now) / 1000));
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const back = <Link href={BOOKING_SUMMARY_PREVIEW_PATH} className="inline-flex min-h-11 items-center text-accent">Back to Booking Summary</Link>;

  function chooseMethod(id: string, currentTime: number) {
    setNow(currentTime);

    if (validAt(currentTime) && availablePaymentMethod(data ?? [], id)) setSelectedId(id);
  }
  function continueToProcessing(currentTime: number) {
    setNow(currentTime);
    const selected = availablePaymentMethod(data ?? [], selectedId);
    if (!validAt(currentTime) || !selected || loading || error) return;
    selectPaymentMethod(selected);
    router.push(PAYMENT_PROCESSING_PREVIEW_PATH);
  }
  if (!reviewed || !review || !currentQuote) return <><MovieFeedback title="Review changed preview totals" message="The reviewed selection no longer matches this preview. Return to Booking Summary before continuing." />{back}</>;
  const count = `${review.quote.seats.length} Seat Unit${review.quote.seats.length === 1 ? "" : "s"} · ${review.quote.guestCount} guest${review.quote.guestCount === 1 ? "" : "s"}`;
  const money = formatConcessionPrice;

  return <>
    <nav aria-label="Selection progress" className="mb-6 flex flex-wrap items-center gap-3 font-heading text-xs uppercase tracking-wide text-muted"><Link href={BOOKING_SUMMARY_PREVIEW_PATH} className="inline-flex min-h-11 items-center text-accent">4. Summary</Link><span aria-hidden="true">→</span><span aria-current="step" className="text-accent">5. Payment</span></nav>
    <section aria-label="Selected screening" className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-outline/30 bg-panel p-5"><div className="w-16 shrink-0"><MoviePoster url={movie.posterUrl} title={movie.title} /></div><div className="min-w-0 flex-1"><h2 className="break-words text-xl font-bold">{movie.title}</h2><p className="mt-2 text-sm text-muted">{cinema.name} · {showtime.hall.name}</p><p className="mt-2 text-sm text-accent">{formatShowtimeDate(showtimeDate(showtime.startsAt))} · {formatShowtimeTime(showtime.startsAt)} · Vietnam time</p><p className="mt-2 text-sm text-muted">{units.map(unit => `${unit.row}${unit.number}`).join(", ")} · {count}</p></div></section>
    <h1 className="text-3xl font-bold sm:text-4xl">Payment Method</h1><p className="mt-3 text-muted">Choose one available sample method to preview the next step.</p>
    <p className="my-6 rounded-lg border border-outline/40 bg-panel-low p-4 text-sm leading-6 text-muted">Local preview only · No external provider will be contacted and no money will be charged. The total is non-authoritative. No Booking, Payment Transaction, Ticket or Booking QR is created.</p>
    {!eligible && <section role="alert" className="mb-6 rounded-xl border border-error bg-panel p-5"><h2 className="font-bold text-error">Preview expired or Showtime unavailable</h2><p className="mt-2 text-sm text-muted">Return to Seat Selection and choose again. Your previous Seats are not reserved.</p><Link href={seatHref} className="mt-2 inline-flex min-h-11 items-center text-accent">Return to Seat Selection</Link></section>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label="Payment methods" className="min-w-0">
        {loading && <p role="status" className="rounded-xl bg-panel p-10 text-center text-muted">Loading payment methods...</p>}
        {error && <MovieFeedback title="Payment methods couldn't load" message={error.message} retry={retry} />}
        {data?.length === 0 && <MovieFeedback title="No payment methods available" message="There are no sample methods to select. Try again or return to Booking Summary." retry={retry} />}
        {data && data.length > 0 && !data.some(item => item.available) && <p role="status" className="mb-4 rounded-lg bg-panel p-4 text-sm text-muted">All sample payment methods are unavailable. Return to Booking Summary or try again.</p>}
        {data && data.length > 0 && <fieldset className="space-y-4"><legend className="mb-4 font-heading text-lg font-semibold">Select a payment method</legend>{data.map(item => <label key={item.id} className={`flex min-h-28 items-start gap-4 rounded-xl border p-5 transition-colors ${selectedId === item.id ? "border-action bg-panel-high ring-1 ring-action" : "border-outline/30 bg-panel"} ${item.available && eligible ? "cursor-pointer hover:bg-panel-hover" : "opacity-60"}`}><input type="radio" name="payment-method" value={item.id} checked={selectedId === item.id} disabled={!item.available || !eligible} aria-label={`${item.name} · ${item.available ? "Available preview" : "Unavailable preview"}`} onChange={() => chooseMethod(item.id, Date.now())} className="mt-1 h-5 w-5 shrink-0 accent-action" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="font-heading font-bold">{item.name}</span><span className="rounded bg-panel-low px-2 py-1 text-xs text-muted">{item.available ? "Preview only" : "Unavailable"}</span></span><span className="mt-2 block text-sm leading-6 text-muted">{item.description}</span></span><span aria-hidden="true" className="hidden shrink-0 rounded-lg bg-panel-low px-3 py-2 font-heading text-sm font-semibold text-accent sm:block">{item.label}</span></label>)}</fieldset>}
        {data && data.length > 0 && !data.some(item => item.available) && <Button variant="secondary" onClick={retry} className="mt-4">Try again</Button>}
        <p className="mt-6 text-xs leading-6 text-muted">These fixtures demonstrate the selection UI. Actual supported methods depend on future backend configuration. No provider login, card details, wallet balance or payment QR is requested here.</p>
      </section>
      <aside aria-label="Payment preview summary" className="rounded-2xl border border-outline/50 bg-panel p-5 sm:p-6 lg:sticky lg:top-24"><h2 className="text-xl font-bold">Order Summary</h2><p className="mt-2 text-xs text-accent">NON-AUTHORITATIVE PREVIEW · VND</p><div className="my-5 rounded-lg border border-outline/30 bg-panel-low p-4"><p className="text-sm text-muted">Seat-hold countdown preview</p><p role="timer" aria-label="Preview time remaining" className="mt-2 font-heading text-2xl tabular-nums text-accent">{countdown}</p><p className="mt-2 text-xs text-muted">No Seats reserved</p></div><p className="font-semibold">{count}</p><ul className="mt-3 space-y-2 text-sm text-muted">{review.quote.seats.map(line => <li key={line.unit.id}>{line.unit.row}{line.unit.number} · {line.unit.type === "COUPLE" ? "Couple, 2 guests, one unit" : "Standard, 1 guest"}</li>)}</ul><h3 className="mt-5 border-t border-outline/30 pt-4 font-semibold">Food &amp; Drinks</h3>{review.quote.concessions.length ? <ul className="mt-3 space-y-2 text-sm text-muted">{review.quote.concessions.map(line => <li key={line.item.id}>{line.item.name} × {line.quantity}</li>)}</ul> : <p className="mt-3 text-sm text-muted">No add-ons selected.</p>}<dl className="mt-5 space-y-4 border-t border-outline/30 pt-5 text-sm"><div className="flex justify-between gap-3"><dt>Seat subtotal</dt><dd>{money(review.quote.seatAmount)}</dd></div><div className="flex justify-between gap-3"><dt>Concession subtotal</dt><dd>{money(review.quote.concessionAmount)}</dd></div><div className="flex justify-between gap-3"><dt>Promotion discount{review.promotion && <span className="mt-1 block text-xs text-success">{review.promotion.code} applied</span>}</dt><dd className="text-success">−{money(review.promotion?.discount ?? 0)}</dd></div><div className="flex justify-between gap-3 border-t border-outline/40 pt-5 text-lg font-bold"><dt>Preview grand total</dt><dd className="font-heading tabular-nums text-accent">{money(review.total)}</dd></div></dl><p aria-live="polite" className="mt-5 text-sm text-muted">{method ? `Selected: ${method.name} (preview)` : "Select an available method to continue."}</p><Button disabled={!eligible || !method || loading || !!error} onClick={() => continueToProcessing(Date.now())} className="mt-5 w-full">Continue to Payment Processing</Button><div className="mt-3 text-center text-sm">{back}</div><p className="mt-4 text-xs leading-6 text-muted">Changing methods never extends the deadline. No Payment has been initiated and composition remains editable.</p></aside>
    </div>
  </>;
}
