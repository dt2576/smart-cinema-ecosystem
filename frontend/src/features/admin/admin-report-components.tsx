"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusFeedback } from "@/components/ui/status-feedback";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useAdmin } from "@/features/admin/admin-shell";
import { AdminReportApiError } from "@/features/admin/admin-report-api";
import { reportBarPermille, reportCount, reportDateLabel, reportMoney, reportOccupancy, type ReportDaily, type ReportMetrics } from "@/features/admin/admin-report-service";

export function ReportLoading() {
  return <div role="status" className="space-y-4"><p>Đang tải báo cáo…</p><div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-32" /><Skeleton className="h-32" /></div><Skeleton className="h-60" /></div>;
}
export function ReportError({ error, retry }: { error: Error; retry: () => void }) {
  const { reportError } = useAdmin();
  const [deadline] = useState(() => Date.now() + (error instanceof AdminReportApiError ? error.retryAfter : 0) * 1000);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { reportError(error); }, [error, reportError]);
  const waiting = now < deadline;
  useEffect(() => {
    if (!waiting) return;
    // Countdown only; never polls or retries the API automatically.
    const timer = setTimeout(() => setNow(Date.now()), Math.min(deadline - Date.now(), 1000));
    return () => clearTimeout(timer);
  }, [waiting, deadline, now]);
  return <StatusFeedback title="Chưa tải được báo cáo" role="alert" tone="error"
    message={error instanceof AdminReportApiError ? error.message : "Vui lòng thử lại."}
    actions={<Button onClick={retry} disabled={waiting}>{waiting ? "Vui lòng chờ…" : "Thử lại"}</Button>} />;
}
export function ReportKpis({ metrics, detailed = false }: { metrics: ReportMetrics; detailed?: boolean }) {
  const cards = [
    { label: "Doanh thu xác nhận", value: reportMoney(metrics.confirmedRevenue) },
    { label: "Vé đã bán", value: reportCount(metrics.ticketsSold) },
    { label: "Đơn đã thanh toán", value: reportCount(metrics.confirmedBookings) },
    { label: "Tỷ lệ lấp đầy", value: reportOccupancy(metrics.occupancyPercent) },
    ...(detailed ? [{ label: "Suất chiếu", value: reportCount(metrics.showtimes) }] : []),
  ];
  return <dl aria-label="Chỉ số trong kỳ" className={`grid gap-4 sm:grid-cols-2 ${detailed ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}>
    {cards.map(card => <SurfaceCard as="div" padding="none" key={card.label} className="space-y-4 p-5">
      <dt className="text-base font-medium text-muted">{card.label}</dt>
      <dd className="break-words font-heading text-2xl font-bold tabular-nums leading-snug [overflow-wrap:anywhere]">{card.value}</dd>
    </SurfaceCard>)}
  </dl>;
}
export function RevenueChart({ daily }: { daily: ReportDaily }) {
  const id = useId();
  const maximum = daily.items.reduce((max, item) => { const value = BigInt(item.metrics.confirmedRevenue.replace(".", "")); return value > max ? value : max; }, BigInt(0));
  return <SurfaceCard className="space-y-5" aria-labelledby={`${id}-title`}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id={`${id}-title`} className="text-xl font-semibold">Doanh thu theo ngày</h2><span className="text-base text-muted">Đơn vị: VND</span></div>
    {maximum === BigInt(0) && <p role="status" className="text-muted">Chưa có doanh thu xác nhận trong kỳ.</p>}
    <p id={`${id}-description`} className="sr-only">Doanh thu xác nhận cho từng ngày. Xem bảng dữ liệu bên dưới để đọc đầy đủ số tiền.</p>
    <div className="overflow-x-auto rounded-control bg-canvas p-4" role="region" aria-label="Biểu đồ doanh thu theo ngày" tabIndex={0}>
      <div role="img" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} className="flex h-60 items-end gap-3" style={{ minWidth: Math.max(420, daily.items.length * 48) }}>
        {daily.items.map(day => <div aria-hidden="true" key={day.date} className="flex h-full min-w-9 flex-1 flex-col justify-end" title={`${reportDateLabel(day.date)}: ${reportMoney(day.metrics.confirmedRevenue)}`}>
          <div className="flex min-h-0 flex-1 items-end border-b border-outline/60"><div className="w-full rounded-t bg-action" style={{ height: `${reportBarPermille(day.metrics.confirmedRevenue, maximum) / 10}%` }} /></div>
          <span className="mt-3 text-center text-xs tabular-nums text-muted">{day.date.slice(8, 10)}/{day.date.slice(5, 7)}</span>
        </div>)}
      </div>
    </div>
    <details className="rounded-control border border-outline/40">
      <summary className="min-h-control cursor-pointer px-4 py-3 font-semibold text-accent">Xem dữ liệu theo ngày</summary>
      <div className="max-h-96 overflow-auto px-4 pb-4" tabIndex={0} role="region" aria-label="Bảng doanh thu theo ngày"><table className="w-full text-left text-base">
        <caption className="sr-only">Doanh thu xác nhận theo ngày, đơn vị VND</caption>
        <thead><tr className="border-b border-outline/40"><th scope="col" className="py-3 pr-4">Ngày</th><th scope="col" className="py-3 text-right">Doanh thu xác nhận</th></tr></thead>
        <tbody>{daily.items.map(day => <tr key={day.date} className="border-b border-outline/25"><th scope="row" className="whitespace-nowrap py-3 pr-4 font-normal">{reportDateLabel(day.date)}</th><td className="py-3 text-right tabular-nums">{reportMoney(day.metrics.confirmedRevenue)}</td></tr>)}</tbody>
      </table></div>
    </details>
  </SurfaceCard>;
}
