import { Suspense } from "react";
import type { Metadata } from "next";
import { BookingHistoryPreview } from "@/features/booking/booking-history-preview";
import { BookingHistoryLoading, BookingPreviewHeading } from "@/features/booking/booking-history-shared";

export const metadata: Metadata = { title: "Vé của tôi — bản xem trước | Smart Cinema", robots: { index: false, follow: false } };

export default function MyBookingsPage() {
  return <><BookingPreviewHeading /><Suspense fallback={<BookingHistoryLoading />}><BookingHistoryPreview /></Suspense></>;
}
