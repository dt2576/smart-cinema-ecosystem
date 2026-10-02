"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/features/auth/auth-context";
import { seatLoginReturn } from "@/features/auth/auth-return";
import { creationSnapshot, readCreation, subscribeCreation } from "@/features/booking/booking-creation-storage";
import { isBookingId } from "@/features/booking/booking-api";
import { bookingSummaryHref, formatBookingAmount } from "@/features/booking/booking-service";
import { useBookingDetail } from "@/features/booking/use-booking-detail";
import { MovieFeedback } from "@/features/movie/movie-feedback";

export function OwnedBookingSummaryScreen({ bookingId }: { bookingId: string }) {
  const { session, isHydrated } = useAuth();
  if (!isBookingId(bookingId)) return <MovieFeedback title="Invalid Booking link" message="Use the server-created Booking link from Seat Selection." />;
  if (!isHydrated) return <p role="status">Loading session…</p>;
  if (!session) return <><MovieFeedback title="Sign in to view your Booking" message="Booking details require your normal Customer account. A Booking code alone does not grant access." /><Link href={`/login?${new URLSearchParams({ returnTo: bookingSummaryHref(bookingId) })}`} className="mt-6 inline-flex min-h-11 items-center text-accent">Sign in</Link></>;
  return <OwnedBookingSummaryContent key={session.accessToken} id={bookingId} token={session.accessToken} />;
}

function OwnedBookingSummaryContent({ id, token }: { id: string; token: string }) {
  const { booking, now, loading, confirmed, error, refresh } = useBookingDetail(id, token);
  const { clearSession } = useAuth();
  const creation = useSyncExternalStore(subscribeCreation, creationSnapshot, () => null);
  const signIn = <Link onClick={clearSession} href={`/login?${new URLSearchParams({ returnTo: bookingSummaryHref(id) })}`} className="mt-4 inline-flex min-h-11 items-center text-accent">Sign in again</Link>;
  if (!booking) return <>{loading ? <p role="status" className="rounded-xl bg-panel p-10 text-center text-muted">Loading Booking…</p> : <MovieFeedback title={error?.status === 404 ? "Booking unavailable" : error?.status === 403 ? "Customer access required" : "Booking couldn’t load"} message={error?.message ?? "Booking state could not be confirmed."} retry={error && ![400, 401, 403, 404].includes(error.status) ? () => void refresh() : undefined} />}{error?.status === 401 && signIn}<Link href="/movies" className="mt-6 inline-flex min-h-11 items-center text-accent">Browse Movies</Link></>;
  const elapsed = now >= Date.parse(booking.expiresAt);
  const seconds = Math.max(0, Math.ceil((Date.parse(booking.expiresAt) - now) / 1000));
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const starts = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(new Date(booking.startsAt));
  const record = readCreation(creation, booking.showtimeId);
  const originalSeatHref = record?.bookingId === booking.id ? seatLoginReturn(record.seatHref ?? null) : null;
  const seatUrl = originalSeatHref ? new URL(originalSeatHref, "https://smart-cinema.local") : null;
  const matchingContext = seatUrl?.pathname === `/showtimes/${booking.showtimeId}/seats` && seatUrl.searchParams.get("movieId") === booking.movieId && seatUrl.searchParams.get("cinemaId") === booking.cinemaId;
  // Booking exposes no display zone. Never derive a local query date by slicing
  // a UTC instant. Direct-entry recovery uses server-owned Showtime date options.
  const seatHref = matchingContext ? originalSeatHref! : `/movies/${booking.movieId}/cinemas/${booking.cinemaId}/showtimes?${new URLSearchParams({ showtimeId: booking.showtimeId })}`;
  const recoveryLabel = matchingContext ? "Return to Seat Selection" : "Choose Showtime";
  return <>
    <nav aria-label="Selection progress" className="mb-6 flex flex-wrap items-center gap-3 font-heading text-xs uppercase tracking-wide text-muted"><Link href={seatHref} className="inline-flex min-h-11 items-center text-accent">{matchingContext ? "Seat Selection" : "Showtime Selection"}</Link><span aria-hidden="true">→</span><span aria-current="step" className="text-accent">Booking Summary</span></nav>
    <h1 className="text-3xl font-bold sm:text-4xl">Booking Summary</h1>
    <p className="mt-3 text-muted">Your saved Booking, read from the server. Creating it does not initiate Payment.</p>
    <section aria-label="Booking identity" className="my-6 rounded-xl border border-outline/40 bg-panel p-5"><p className="break-all font-semibold">{booking.bookingCode}</p><p className="mt-2 break-all text-sm text-muted">Booking ID: {booking.id}</p><p className="mt-2 text-sm text-accent">Status: {booking.status}{!confirmed && " · last confirmed, refresh required"}</p></section>
    {loading && <p role="status" className="mb-4 text-sm text-muted">Refreshing Booking state…</p>}
    {error && <div role="alert" className="mb-6 rounded-xl border border-error bg-panel p-5"><p className="text-sm text-error">{error.message}</p><Button variant="secondary" onClick={() => void refresh()} className="mt-3">Retry Booking read</Button></div>}
    {booking.status === "PENDING" && elapsed && <p role="status" className="mb-6 rounded-xl border border-outline bg-panel p-5 text-sm text-muted">The Booking deadline has passed. Checking its authoritative status; no new deadline or Payment is created.</p>}
    {["EXPIRED", "CANCELLED"].includes(booking.status) && <p role="status" className="mb-6 rounded-xl bg-panel p-5 text-sm text-muted">This Booking is {booking.status.toLowerCase()}. Its snapshots remain readable; it cannot be resumed as a new Booking.</p>}
    <section aria-label="Booked screening" className="mb-6 flex flex-wrap items-center gap-5 rounded-2xl border border-outline/30 bg-panel p-5 sm:p-6"><div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg bg-panel-high text-accent"><Icon name="film" width={36} height={36} /></div><div className="min-w-0 flex-1"><h2 className="break-words text-xl font-bold">{booking.movieTitle}</h2><p className="mt-2 break-words text-sm">{booking.cinemaName} · {booking.hallName}</p><p className="mt-2 text-sm text-accent"><time dateTime={booking.startsAt}>{starts}</time></p><p className="mt-2 text-xs leading-6 text-muted">Screening details are current. Seat prices and totals remain as saved for this Booking.</p></div></section>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        <section aria-label="Booked Seat Units" className="rounded-2xl border border-outline/30 bg-panel p-5 sm:p-6"><h2 className="text-xl font-bold">Selected Seats</h2><p className="mt-3 text-sm text-muted">{booking.seatUnitCount} Seat Unit{booking.seatUnitCount === 1 ? "" : "s"} · {booking.guestCount} guest{booking.guestCount === 1 ? "" : "s"}</p><ul className="mt-3 divide-y divide-outline/30">{booking.seats.map(line => <li key={line.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="font-semibold">{line.row}{line.number} · {line.type === "COUPLE" ? "Couple" : line.type === "VIP" ? "VIP" : "Standard"}</p><p className="mt-1 text-xs text-muted">One whole Seat Unit · {line.guestCount} guest{line.guestCount === 1 ? "" : "s"}</p><p className="mt-1 break-all text-xs text-muted">Seat {line.seatId} · Hold {line.holdId}</p><p className="mt-1 text-xs text-muted">Price at Booking: {formatBookingAmount(line.unitPrice)}</p></div><span className="break-all font-heading tabular-nums">{formatBookingAmount(line.finalPrice)}</span></li>)}</ul><p className="mt-4 text-xs leading-6 text-muted">Attached Holds belong to this Booking. Returning to Seats does not detach, release or renew them. A Couple unit remains one line for two guests.</p></section>
        <section aria-label="Persisted Concessions" className="rounded-2xl border border-outline/30 bg-panel p-5 sm:p-6"><h2 className="text-xl font-bold">Food &amp; Drinks</h2>{booking.concessions.length ? <ul className="mt-3 space-y-3">{booking.concessions.map(line => <li key={line.id} className="flex flex-wrap justify-between gap-3 text-sm"><span>{line.name} × {line.quantity}</span><span>{formatBookingAmount(line.totalPrice)}</span></li>)}</ul> : <p className="mt-3 text-sm text-muted">No Food & Drinks added to this Booking.</p>}</section>
        <section aria-label="Persisted Promotion" className="rounded-2xl border border-outline/30 bg-panel p-5 sm:p-6"><h2 className="text-xl font-bold">Promotion</h2><p className="mt-3 text-sm text-muted">{booking.promotion ? `Applied Promotion: ${booking.promotion.code}` : "No Promotion applied."}</p></section>
      </div>
      <aside aria-label="Authoritative Booking totals" className="rounded-2xl border border-outline/50 bg-panel p-5 sm:p-6 lg:sticky lg:top-24"><h2 className="text-xl font-bold">Order Summary</h2><p className="mt-2 text-xs text-accent">SAVED BOOKING AMOUNTS</p><dl className="mt-6 space-y-4 text-sm">{[["Seat subtotal", booking.seatAmount], ["Concession subtotal", booking.concessionAmount], ["Subtotal", booking.subtotal], ["Promotion discount", booking.discount], ["Booking total", booking.finalAmount]].map(([name, amount]) => <div key={name} className={`flex flex-wrap justify-between gap-2 ${name === "Booking total" ? "border-t border-outline/40 pt-5 text-lg font-bold text-accent" : ""}`}><dt>{name}</dt><dd className="break-all font-heading tabular-nums">{formatBookingAmount(amount)}</dd></div>)}</dl><p className="mt-4 text-xs leading-6 text-muted">Amounts are shown exactly as saved for this Booking.</p>
        <div className="mt-6 rounded-lg border border-outline/40 bg-panel-low p-4"><p className="text-sm font-semibold text-accent">Server Booking deadline</p><p role="timer" aria-label="Booking time remaining" className="mt-2 font-heading text-2xl tabular-nums">{booking.status === "PENDING" ? countdown : "Closed"}</p><p className="mt-2 break-all text-xs text-muted"><time dateTime={booking.expiresAt}>{booking.expiresAt}</time></p><p className="mt-2 text-xs leading-6 text-muted">Original server Booking expiry. Reload and navigation never renew it.</p></div>
        <p className="mt-5 text-xs leading-6 text-muted">{booking.paymentStartedAt ? `Composition was frozen by an existing Payment attempt at ${booking.paymentStartedAt}. This is not proof of Payment success.` : "Payment has not started. No charge, Ticket or Booking QR is created by this flow."}</p><Button disabled className="mt-6 w-full">Payment integration unavailable</Button><Button variant="secondary" disabled={loading} onClick={() => void refresh()} className="mt-3 w-full">Refresh Booking</Button><Link href={seatHref} className="mt-3 inline-flex min-h-11 w-full items-center justify-center text-sm text-accent">{recoveryLabel}</Link>
      </aside>
    </div>
  </>;
}
