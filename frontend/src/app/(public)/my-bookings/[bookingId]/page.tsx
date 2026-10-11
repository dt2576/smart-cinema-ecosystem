import type { Metadata } from "next";
import { OwnedBookingDetailScreen } from "@/features/booking/owned-booking-detail-screen";

export const metadata: Metadata = { title: "Chi tiết đặt vé | Smart Cinema", robots: { index: false, follow: false } };

export default async function BookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return <OwnedBookingDetailScreen key={bookingId} bookingId={bookingId} />;
}
