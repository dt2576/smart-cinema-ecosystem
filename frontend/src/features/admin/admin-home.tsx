"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/features/admin/admin-shell";
import { getAdminDashboard, getAdminReportDaily } from "@/features/admin/admin-report-api";
import { ReportError, ReportKpis, ReportLoading, RevenueChart } from "@/features/admin/admin-report-components";
import { reportAddDays, reportDateLabel, reportPreset, type ReportPreset } from "@/features/admin/admin-report-service";
import { useMovieRequest } from "@/features/movie/use-movie-request";

export function AdminHome() {
  const { accessToken } = useAdmin();
  const [selection, setSelection] = useState(() => ({ preset: "week" as ReportPreset, range: reportPreset("week") }));
  const { range, preset } = selection;
  const load = useCallback((signal: AbortSignal) => Promise.all([getAdminDashboard(accessToken, range, signal), getAdminReportDaily(accessToken, range, signal)]), [accessToken, range]);
  const request = useMovieRequest(load);
  return <section className="space-y-6 text-base [&_button]:text-base [&_p]:text-base">
    <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="font-heading text-3xl font-bold">Tổng quan</h1>
      <Link href={`/admin/reports?${new URLSearchParams(range)}`} className="inline-flex min-h-control items-center rounded-control bg-action px-5 py-3 text-base font-bold text-on-action hover:bg-action-hover">Xem báo cáo chi tiết</Link></div>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div role="group" aria-label="Khoảng thời gian" className="flex flex-wrap gap-2">{([ ["today", "Hôm nay"], ["week", "7 ngày qua"], ["month", "Tháng này"] ] as const).map(([key, label]) =>
        <Button key={key} variant={preset === key ? "primary" : "secondary"} aria-pressed={preset === key} onClick={() => setSelection({ preset: key, range: reportPreset(key) })}>{label}</Button>)}</div>
      <p className="text-base text-muted">{reportDateLabel(range.from)} – {reportDateLabel(reportAddDays(range.to, -1)!)}</p>
    </div>
    <p className="text-base text-muted">Dữ liệu thanh toán thử nghiệm · Giờ Việt Nam</p>
    {request.loading ? <ReportLoading /> : request.error ? <ReportError key={request.error.message} error={request.error} retry={request.retry} /> : request.data && <>
      <ReportKpis metrics={request.data[0].metrics} />
      <RevenueChart daily={request.data[1]} />
    </>}
  </section>;
}
