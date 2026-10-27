import { AdminPromotionDetail } from "@/features/admin/admin-promotion-screen";
export default async function Page({ params }: { params: Promise<{ promotionId: string }> }) { const { promotionId } = await params; return <AdminPromotionDetail promotionId={promotionId} />; }
