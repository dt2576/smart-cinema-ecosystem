import { OwnedBookingSummaryScreen } from "@/features/booking/owned-booking-summary-screen";

export default async function OwnedBookingSummaryPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return <OwnedBookingSummaryScreen bookingId={bookingId} />;
}
