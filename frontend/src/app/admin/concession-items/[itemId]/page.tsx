import { AdminConcessionDetail } from "@/features/admin/admin-concession-screen";

export default async function Page({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  return <AdminConcessionDetail itemId={itemId} />;
}
