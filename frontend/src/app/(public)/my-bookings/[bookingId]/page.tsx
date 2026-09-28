import { Suspense } from "react";
import type { Metadata } from "next";
import { BookingDetailPreview } from "@/features/booking/booking-detail-preview";
import { BookingHistoryLoading, BookingPreviewHeading } from "@/features/booking/booking-history-shared";

export const metadata: Metadata = { title: "Booking & Tickets Preview | Smart Cinema", robots: { index: false, follow: false } };

export default async function BookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return <><BookingPreviewHeading detail /><Suspense fallback={<BookingHistoryLoading />}><BookingDetailPreview key={bookingId} bookingId={bookingId} /></Suspense></>;
}
