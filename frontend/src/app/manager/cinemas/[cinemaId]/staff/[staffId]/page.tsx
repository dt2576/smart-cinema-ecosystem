import { ManagerStaffDetailScreen } from "@/features/manager/manager-staff-screen";

export default async function Page({ params }: { params: Promise<{ cinemaId: string; staffId: string }> }) {
  const { cinemaId, staffId } = await params;
  return <ManagerStaffDetailScreen cinemaId={cinemaId} staffId={staffId} />;
}
