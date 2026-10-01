import { AdminShowtimeEditor } from "@/features/admin/admin-showtime-screen";
export default async function Page({ params }: { params: Promise<{ showtimeId: string }> }) { const { showtimeId } = await params; return <AdminShowtimeEditor showtimeId={showtimeId} />; }
