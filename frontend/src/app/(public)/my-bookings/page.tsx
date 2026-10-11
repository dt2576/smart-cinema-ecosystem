import type { Metadata } from "next";
import { OwnedBookingHistoryScreen } from "@/features/booking/owned-booking-history-screen";

export const metadata: Metadata = { title: "Vé của tôi | Smart Cinema", robots: { index: false, follow: false } };

export default function MyBookingsPage() {
  return <OwnedBookingHistoryScreen />;
}
