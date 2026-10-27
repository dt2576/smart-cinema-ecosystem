import { Suspense } from "react";
import { AdminReportingScreen } from "@/features/admin/admin-report-screen";
import { ReportLoading } from "@/features/admin/admin-report-components";

export default function AdminReportsPage() {
  return <Suspense fallback={<ReportLoading />}><AdminReportingScreen /></Suspense>;
}
