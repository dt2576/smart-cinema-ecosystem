import { AdminStaffList } from "@/features/admin/admin-staff-screen";

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const query = (await searchParams).page;
  const page = typeof query === "string" && /^(?:0|[1-9][0-9]*)$/.test(query) && Number(query) <= 2147483647 ? Number(query) : 0;
  return <AdminStaffList page={page} />;
}
