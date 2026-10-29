import { ManagerBookingDetailScreen } from "@/features/manager/manager-booking-detail";

export default async function Page({ params }: { params: Promise<{ bookingId: string }> }) {
  return <ManagerBookingDetailScreen bookingId={(await params).bookingId} />;
}
