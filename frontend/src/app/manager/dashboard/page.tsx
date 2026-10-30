import { ManagerReportScreen } from "@/features/manager/manager-report-screen";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) for (const part of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, part);
  return <ManagerReportScreen queryString={params.toString()} detailed={false} />;
}
