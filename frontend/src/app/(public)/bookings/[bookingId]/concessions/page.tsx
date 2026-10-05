import { OwnedConcessionScreen } from "@/features/concession/owned-concession-screen";

export default async function OwnedConcessionPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return <OwnedConcessionScreen bookingId={bookingId} />;
}
