"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PreviewDialog } from "@/components/ui/preview-dialog";
import type { BookingHistoryPreview } from "@/features/booking/booking-history.types";

export function BookingQrPreview({ booking, reload }: { booking: BookingHistoryPreview; reload: (payload: string) => void }) {
  const [enlarged, setEnlarged] = useState(false);
  if (booking.status !== "PAID" || !booking.qr) return <aside aria-label="Booking QR preview" className="rounded-2xl border border-outline/40 bg-panel-low p-6"><h2 className="text-xl font-bold">Booking QR unavailable</h2><p className="mt-4 text-sm leading-6 text-muted">This {booking.status} sample has no issued Tickets or Booking QR. A real Booking QR requires a paid Booking with verified Payment.</p></aside>;
  const qr = booking.qr;
  const image = <Image src={qr.imageUrl} alt={`Demo Booking QR for ${booking.code}, not valid for admission`} width={370} height={370} unoptimized className="mx-auto h-auto w-full max-w-80 rounded-lg" />;
  return <aside aria-label="Booking QR preview" className="self-start rounded-2xl border border-accent/40 bg-panel-low p-5 sm:p-7">
    <p className="text-center font-heading text-xs uppercase tracking-widest text-accent">One QR · One Booking</p>
    <h2 className="mt-3 text-center text-2xl font-bold">Booking QR preview</h2>
    <p className="my-5 text-center text-sm leading-6 text-muted">DEMO ONLY — not an admission pass. This code contains an inert sample reference.</p>
    {!enlarged && image}
    <p className="mt-5 break-all text-center font-mono text-sm">{booking.code}</p>
    <Button variant="secondary" onClick={() => setEnlarged(true)} className="mt-5 w-full">Enlarge Booking QR</Button>
    <Button variant="secondary" onClick={() => reload(qr.payload)} className="mt-3 w-full">Reload sample from Booking QR</Button>
    <p className="mt-5 text-sm leading-6 text-muted">Reusing the sample QR loads this Booking and its individual Ticket states. It never checks anyone in or changes a Ticket status.</p>
    {enlarged && <PreviewDialog title="Booking QR preview" onClose={() => setEnlarged(false)} closeLabel="Back to Booking"><p className="mb-4 text-sm text-muted">DEMO ONLY — not valid for admission. {booking.code}</p>{image}</PreviewDialog>}
  </aside>;
}
