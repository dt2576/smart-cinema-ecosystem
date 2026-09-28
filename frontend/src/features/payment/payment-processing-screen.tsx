"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MovieFeedback } from "@/features/movie/movie-feedback";
import { MoviePoster } from "@/features/movie/movie-poster";
import { createBookingSummaryPreview } from "@/features/booking/booking-summary-service";
import { PAYMENT_METHOD_PREVIEW_PATH, PAYMENT_PROCESSING_PREVIEW_PATH, PAYMENT_RESULT_PREVIEW_PATH, useConcessionPreview, type ConcessionSeatContext } from "@/features/concession/concession-preview-provider";
import { formatConcessionPrice } from "@/features/concession/concession-service";
import { createConcessionPreviewHandoff } from "@/features/seat/seat-service";
import { formatShowtimeDate, formatShowtimeTime, showtimeDate } from "@/features/showtime/showtime-service";
import { isReviewedSummaryCurrent } from "@/features/payment/payment-method-service";
import { createPaymentResultPreview } from "@/features/payment/payment-result-service";
import { createMockPaymentProcessingService } from "@/features/payment/payment-processing-service";
import type { PaymentProcessingPhase, PaymentProcessingScenario, PaymentPreviewOutcome } from "@/features/payment/payment-processing.types";

const OUTCOME_LABELS: Record<PaymentPreviewOutcome, string> = {
  success: "Success preview", failed: "Failed preview", pending: "Pending preview",
};

export function PaymentProcessingScreen() {
  const { preview } = useConcessionPreview();
  if (!preview?.reviewedSummary || !preview.concessions || !preview.selectedPaymentMethod?.available) return <><MovieFeedback title="Choose a Payment Method first" message="Continue from the reviewed Payment Method preview. Reloading or leaving the flow clears local context; URL values cannot create a payment." /><Link href={preview ? PAYMENT_METHOD_PREVIEW_PATH : "/movies"} className="mt-6 inline-flex min-h-11 items-center text-accent">{preview ? "Back to Payment Methods" : "Browse Movies"}</Link></>;
  return <ProcessingPreview context={preview} />;
}

function ProcessingPreview({ context }: { context: ConcessionSeatContext }) {
  const { movie, cinema, showtime, map, selection, concessions, reviewedSummary: review, selectedPaymentMethod: method, seatHref } = context;
  const pathname = usePathname();
  const router = useRouter();
  const { recordPaymentResult } = useConcessionPreview();
  const [scenario, setScenario] = useState<PaymentProcessingScenario>(context.paymentResult?.scenario ?? "success");
  const service = useMemo(() => createMockPaymentProcessingService(scenario), [scenario]);
  const [phase, setPhase] = useState<PaymentProcessingPhase | "ready" | "error" | PaymentPreviewOutcome>(context.paymentResult?.outcome ?? "ready");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const active = useRef<AbortController | null>(null);
  const quote = useMemo(() => createBookingSummaryPreview(map.units.filter(unit => selection.unitIds.includes(unit.id)), concessions?.catalog ?? [], concessions?.quantities ?? {}), [map, selection, concessions]);
  const validAt = useCallback((time: number) => !!review && !!quote && isReviewedSummaryCurrent(review, quote) && !!method?.available && movie.id === showtime.movieId && cinema.id === showtime.cinemaId && !!createConcessionPreviewHandoff(selection, map, showtime, time), [review, quote, method, movie.id, cinema.id, selection, map, showtime]);
  const eligible = pathname === PAYMENT_PROCESSING_PREVIEW_PATH && validAt(now);
  const busy = phase === "processing" || phase === "verifying";
  const outcome = phase === "success" || phase === "failed" || phase === "pending" ? phase : null;

  useEffect(() => {
    const refresh = () => {
      const time = Date.now();
      setNow(time);
      if (!validAt(time)) active.current?.abort();
    };
    const timer = setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); active.current?.abort(); active.current = null; };
  }, [validAt, pathname]);

  async function runPreview() {
    const time = Date.now();
    setNow(time);
    if (active.current || !validAt(time) || pathname !== PAYMENT_PROCESSING_PREVIEW_PATH) return;
    const controller = new AbortController();
    active.current = controller;
    setError(null);
    recordPaymentResult(null);
    try {
      const result = await service.run(controller.signal, setPhase);
      if (active.current === controller && !controller.signal.aborted) {
        const completedAt = Date.now();
        setNow(completedAt);
        if (validAt(completedAt)) setPhase(result);
      }
    } catch (failure) {
      if (active.current === controller && !controller.signal.aborted) {
        setError(failure instanceof Error ? failure.message : "The local preview could not complete. Try again.");
        setPhase("error");
      }
    } finally {
      if (active.current === controller) active.current = null;
    }
  }

  function viewResult() {
    const time = Date.now();
    setNow(time);
    const result = createPaymentResultPreview(outcome, scenario);
    if (!validAt(time) || !result || active.current) return;
    recordPaymentResult(result);
    router.push(PAYMENT_RESULT_PREVIEW_PATH);
  }

  if (!review || !quote || !isReviewedSummaryCurrent(review, quote) || !method) return <><MovieFeedback title="Review changed preview context" message="Return to Payment Methods and review the current selection before continuing." /><Link href={PAYMENT_METHOD_PREVIEW_PATH} className="inline-flex min-h-11 items-center text-accent">Back to Payment Methods</Link></>;
  const seconds = Math.max(0, Math.ceil(((selection.expiresAt ?? now) - now) / 1000));
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const money = formatConcessionPrice;
  const count = `${review.quote.seats.length} Seat Unit${review.quote.seats.length === 1 ? "" : "s"} · ${review.quote.guestCount} guest${review.quote.guestCount === 1 ? "" : "s"}`;
  const status = !eligible ? "Preview expired or Showtime unavailable" : phase === "ready" ? "Ready to preview processing" : phase === "processing" ? "Processing preview..." : phase === "verifying" ? "Verifying preview..." : phase === "error" ? "Preview couldn't complete" : OUTCOME_LABELS[phase];

  return <>
    <nav aria-label="Selection progress" className="mb-6 flex flex-wrap items-center gap-3 font-heading text-xs uppercase tracking-wide text-muted"><Link href={PAYMENT_METHOD_PREVIEW_PATH} className="inline-flex min-h-11 items-center text-accent">5. Payment Method</Link><span aria-hidden="true">→</span><span aria-current="step" className="text-accent">Processing preview</span></nav>
    <section aria-label="Selected screening" className="mb-8 flex flex-wrap items-center gap-4 rounded-xl border border-outline/30 bg-panel p-5"><div className="w-14 shrink-0"><MoviePoster url={movie.posterUrl} title={movie.title} /></div><div className="min-w-0 flex-1 basis-40"><h2 className="break-words text-xl font-bold">{movie.title}</h2><p className="mt-2 text-sm text-muted">{cinema.name} · {showtime.hall.name}</p><p className="mt-2 text-sm text-accent">{formatShowtimeDate(showtimeDate(showtime.startsAt))} · {formatShowtimeTime(showtime.startsAt)} · Vietnam time</p></div><div className="w-full rounded-lg bg-panel-low p-3 sm:w-auto"><p className="text-xs text-muted">Seat countdown preview</p><p role="timer" aria-label="Preview time remaining" className="mt-1 font-heading text-xl tabular-nums text-accent">{countdown}</p><p className="mt-1 text-xs text-muted">No Seats reserved</p></div></section>
    <section aria-label="Payment Processing preview" className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-outline/30 border-t-action bg-panel p-5 shadow-xl sm:p-8">
      <div aria-hidden="true" className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 font-heading text-2xl ${eligible && busy ? "border-outline border-t-action motion-safe:animate-spin" : eligible && outcome === "success" ? "border-success text-success" : "border-action text-accent"}`}>{busy && eligible ? "" : outcome === "success" && eligible ? "✓" : "···"}</div>
      <h1 className="text-center text-2xl font-bold sm:text-3xl">Payment Processing</h1>
      <p role="status" aria-live="polite" className="mt-4 text-center font-heading text-lg text-accent">{status}</p>
      <p className="mt-3 text-center text-sm leading-6 text-muted">Local simulation only. No provider is contacted, no money is charged, and success is not server-verified.</p>
      {!eligible && <div role="alert" className="mt-5 rounded-lg border border-error p-4"><p className="text-error">This preview can no longer continue.</p><p className="mt-2 text-sm text-muted">Return to Seat Selection to start a fresh preview. A late simulated outcome cannot restore expired Seats.</p><Link href={seatHref} className="mt-2 inline-flex min-h-11 items-center text-accent">Return to Seat Selection</Link></div>}
      {eligible && error && <p role="alert" className="mt-5 rounded-lg border border-error p-4 text-sm text-error">{error}</p>}
      {eligible && outcome === "pending" && <p className="mt-4 text-sm leading-6 text-muted">The preview remains unresolved. Pending is neither success nor failure. Checking again resumes this local simulation.</p>}
      {eligible && outcome === "failed" && <p className="mt-4 text-sm text-muted">This is a simulated failure. No Booking is paid and no Tickets are issued.</p>}
      <section aria-label="Reviewed payment context" className="mt-6 rounded-xl bg-panel-low p-4 sm:p-5">
        <div className="flex flex-wrap justify-between gap-4"><div><p className="text-xs uppercase tracking-wide text-muted">Selected method</p><p className="mt-2 font-heading font-bold">{method.name} (preview)</p></div><div><p className="text-xs uppercase tracking-wide text-muted">Preview total · VND</p><p className="mt-2 font-heading text-2xl font-bold tabular-nums text-accent">{money(review.total)}</p></div></div>
        <p className="mt-4 text-xs text-muted">NON-AUTHORITATIVE · No Booking or Payment reference exists</p>
        <div className="mt-5 border-t border-outline/30 pt-4"><h2 className="font-semibold">{count}</h2><ul className="mt-2 space-y-2 text-sm text-muted">{review.quote.seats.map(line => <li key={line.unit.id}>{line.unit.row}{line.unit.number} · {line.unit.type === "COUPLE" ? "Couple, 2 guests, one unit" : "Standard, 1 guest"}</li>)}</ul><h3 className="mt-4 font-semibold">Food &amp; Drinks</h3>{review.quote.concessions.length ? <ul className="mt-2 space-y-2 text-sm text-muted">{review.quote.concessions.map(line => <li key={line.item.id}>{line.item.name} × {line.quantity}</li>)}</ul> : <p className="mt-2 text-sm text-muted">No add-ons selected.</p>}</div>
        <dl className="mt-4 space-y-3 border-t border-outline/30 pt-4 text-sm"><div className="flex justify-between gap-3"><dt>Seat subtotal</dt><dd>{money(review.quote.seatAmount)}</dd></div><div className="flex justify-between gap-3"><dt>Concession subtotal</dt><dd>{money(review.quote.concessionAmount)}</dd></div><div className="flex justify-between gap-3"><dt>Promotion discount{review.promotion && <span className="block text-xs text-success">{review.promotion.code} applied</span>}</dt><dd className="text-success">−{money(review.promotion?.discount ?? 0)}</dd></div></dl>
      </section>
      <div className="mt-6"><label htmlFor="processing-scenario" className="block text-sm font-semibold">Demo outcome</label><select id="processing-scenario" value={scenario} disabled={busy || !eligible} onChange={event => { setScenario(event.target.value as PaymentProcessingScenario); setPhase("ready"); setError(null); recordPaymentResult(null); }} className="mt-2 min-h-11 w-full rounded-lg border border-outline bg-panel-low px-3 text-sm disabled:opacity-50"><option value="success">Success preview</option><option value="failed">Failed preview</option><option value="pending">Pending preview</option><option value="error">Retryable error preview</option></select><p className="mt-2 text-xs leading-6 text-muted">Demo controls affect presentation only. They cannot confirm a real payment.</p></div>
      <div className="mt-5 space-y-3">
        {(phase === "ready" || busy || phase === "error" || phase === "failed" || phase === "pending") && <Button className="w-full" disabled={!eligible || busy} onClick={runPreview}>{busy ? "Preview in progress..." : phase === "error" ? "Retry preview" : phase === "failed" ? "Retry processing preview" : phase === "pending" ? "Check preview again" : "Start processing preview"}</Button>}
        {outcome && <Button className="w-full" disabled={!eligible || busy} onClick={viewResult}>Continue to Payment Result preview</Button>}
        <Link href={PAYMENT_METHOD_PREVIEW_PATH} className="flex min-h-11 items-center justify-center text-sm text-accent">Back to Payment Methods</Link>
      </div>
      <p className="mt-4 text-center text-xs leading-6 text-muted">The original deadline never extends. This simulation does not freeze composition. The real freeze occurs atomically at actual first Payment initiation.</p>
    </section>
  </>;
}
