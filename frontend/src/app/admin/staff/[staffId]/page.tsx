import { AdminStaffDetail } from "@/features/admin/admin-staff-screen";

export default async function Page({ params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = await params;
  return <AdminStaffDetail staffId={staffId} />;
}
