"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { StatusFeedback } from "@/components/ui/status-feedback";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useAdmin } from "@/features/admin/admin-shell";
import { getAdminReportBreakdowns, getAdminReportDaily, getAdminReportSummary } from "@/features/admin/admin-report-api";
import { ReportError, ReportKpis, ReportLoading, RevenueChart } from "@/features/admin/admin-report-components";
import { REPORT_DIMENSIONS, REPORT_ZONE, reportAddDays, reportCount, reportDateLabel, reportDates, reportMoney, reportOccupancy, reportPreset, reportRange, type ReportDimension, type ReportRange } from "@/features/admin/admin-report-service";
import { useMovieRequest } from "@/features/movie/use-movie-request";

export function AdminReportingScreen() {
  const query = useSearchParams();
  const [fallback] = useState(() => reportPreset("month"));
  const hasRange = query.has("from") || query.has("to");
  const range = hasRange ? { from: query.get("from") ?? "", to: query.get("to") ?? "" } : fallback;
  const valid = (!hasRange || query.getAll("from").length === 1 && query.getAll("to").length === 1) && reportDates(range).length > 0;
  return <ReportWorkspace key={query.toString()} initialRange={range} valid={valid} />;
}
function ReportWorkspace({ initialRange, valid }: { initialRange: ReportRange; valid: boolean }) {
  const { accessToken } = useAdmin();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [from, setFrom] = useState(initialRange.from), [until, setUntil] = useState(reportAddDays(initialRange.to, -1) ?? "");
  const [error, setError] = useState("");
  const [dimension, setDimension] = useState<ReportDimension>("CINEMA"), [page, setPage] = useState(0);
  // Draft edits/page changes do not change the identity of the applied period.
  const [range] = useState(initialRange);
  const load = useCallback((signal: AbortSignal) => valid ? Promise.all([getAdminReportSummary(accessToken, range, signal), getAdminReportDaily(accessToken, range, signal)]) : Promise.resolve(null), [accessToken, range, valid]);
  const loadRows = useCallback((signal: AbortSignal) => valid ? getAdminReportBreakdowns(accessToken, range, dimension, page, 10, signal) : Promise.resolve(null), [accessToken, range, dimension, page, valid]);
  const summary = useMovieRequest(load), rows = useMovieRequest(loadRows);
  function submit(event: FormEvent) {
    event.preventDefault();const result = reportRange(from, until);
    if (result.error) { setError(result.error);return; }
    setError("");const q = result.range!;
    if (valid && q.from === range.from && q.to === range.to) { summary.retry();rows.retry(); }
    else startTransition(() => router.replace(`/admin/reports?${new URLSearchParams(q)}`, { scroll: false }));
  }
  const message = error || (!valid ? "Khoảng ngày trong liên kết chưa hợp lệ. Vui lòng chọn lại." : "");
  return <section className="space-y-6 text-base [&_button]:text-base [&_label]:text-base [&_p]:text-base">
    <h1 className="font-heading text-3xl font-bold">Báo cáo</h1>
    <SurfaceCard>
      <form noValidate onSubmit={submit} className="grid items-end gap-5 lg:grid-cols-[1fr_1fr_auto]" aria-label="Khoảng ngày báo cáo">
        <FormField inputId="report-from" label="Từ ngày"><input id="report-from" type="date" value={from} min="0001-01-01" max="9999-12-30" onChange={e => setFrom(e.target.value)} className="form-input py-3 text-base" aria-invalid={!!message} aria-describedby={message ? "report-date-error" : undefined} required /></FormField>
        <FormField inputId="report-until" label="Đến ngày"><input id="report-until" type="date" value={until} min="0001-01-01" max="9999-12-30" onChange={e => setUntil(e.target.value)} className="form-input py-3 text-base" aria-invalid={!!message} aria-describedby={message ? "report-date-error" : "report-date-help"} required /></FormField>
        <Button type="submit" disabled={pending}>{pending ? "Đang mở báo cáo…" : "Xem báo cáo"}</Button>
      </form>
      {message ? <p id="report-date-error" role="alert" className="mt-4 text-base text-error">{message}</p> : <p id="report-date-help" className="mt-4 text-base text-muted">Bao gồm ngày kết thúc · Tối đa 366 ngày · Giờ Việt Nam</p>}
      {valid && <p className="mt-3 text-base text-muted">Khoảng ngày áp dụng: {reportDateLabel(range.from)} – {reportDateLabel(reportAddDays(range.to, -1)!)}</p>}
    </SurfaceCard>
    <p className="text-base text-muted">Dữ liệu thanh toán thử nghiệm. Doanh thu theo ngày thanh toán; suất chiếu theo ngày chiếu.</p>
    {valid && <>
      {summary.loading ? <ReportLoading /> : summary.error ? <ReportError key={summary.error.message} error={summary.error} retry={summary.retry} /> : summary.data && <>
        <ReportKpis metrics={summary.data[0].metrics} detailed /><RevenueChart daily={summary.data[1]} />
      </>}
      <SurfaceCard className="space-y-5">
        <h2 className="text-xl font-semibold">Chi tiết theo nhóm</h2>
        <div role="group" aria-label="Nhóm báo cáo" className="flex flex-wrap gap-2">{(Object.keys(REPORT_DIMENSIONS) as ReportDimension[]).map(key => <Button variant={dimension === key ? "primary" : "secondary"} aria-pressed={dimension === key} key={key} onClick={() => { setDimension(key);setPage(0); }}>{REPORT_DIMENSIONS[key]}</Button>)}</div>
        {rows.loading ? <div role="status">Đang tải chi tiết…</div> : rows.error ? <ReportError key={rows.error.message} error={rows.error} retry={rows.retry} /> : rows.data && <>
          {!rows.data.items.length ? <StatusFeedback title="Chưa có dữ liệu trong kỳ" message="Thử chọn khoảng thời gian khác." /> : <div className="overflow-x-auto" role="region" aria-label="Bảng báo cáo chi tiết" tabIndex={0}>
            <table className="w-full min-w-[760px] text-left text-base"><caption className="sr-only">{REPORT_DIMENSIONS[dimension]}. Doanh thu theo ngày thanh toán; suất chiếu theo ngày chiếu.</caption>
              <thead><tr className="border-b border-outline/50 text-muted"><th scope="col" className="p-3">{dimension === "CINEMA" ? "Rạp" : dimension === "MOVIE" ? "Phim" : "Suất chiếu"}</th>{dimension !== "SHOWTIME" && <th scope="col" className="p-3 text-right">Suất chiếu</th>}<th scope="col" className="p-3 text-right">Vé đã bán</th><th scope="col" className="p-3 text-right">Tỷ lệ lấp đầy</th><th scope="col" className="p-3 text-right">Đơn đã thanh toán</th><th scope="col" className="p-3 text-right">Doanh thu xác nhận</th></tr></thead>
              <tbody>{rows.data.items.map(row => <tr key={row.id} className="border-b border-outline/25">
                <th scope="row" className="min-w-48 max-w-80 break-words p-3 font-medium">{row.name}{row.startsAt && <span className="mt-2 block font-normal text-muted">{new Intl.DateTimeFormat("vi-VN", { timeZone: REPORT_ZONE, dateStyle: "short", timeStyle: "short" }).format(new Date(row.startsAt))}</span>}</th>
                {dimension !== "SHOWTIME" && <td className="p-3 text-right tabular-nums">{reportCount(row.metrics.showtimes)}</td>}<td className="p-3 text-right tabular-nums">{reportCount(row.metrics.ticketsSold)}</td><td className="p-3 text-right tabular-nums">{reportOccupancy(row.metrics.occupancyPercent)}</td><td className="p-3 text-right tabular-nums">{reportCount(row.metrics.confirmedBookings)}</td><td className="p-3 text-right tabular-nums">{reportMoney(row.metrics.confirmedRevenue)}</td>
              </tr>)}</tbody>
            </table>
          </div>}
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-base text-muted">{reportCount(rows.data.totalElements)} kết quả · Trang {reportCount(String(page + 1))}</p><div className="flex gap-2"><Button variant="secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trang trước</Button><Button variant="secondary" disabled={page >= 2147483647 || BigInt(page + 1) * BigInt(10) >= BigInt(rows.data.totalElements)} onClick={() => setPage(p => p + 1)}>Trang sau</Button></div></div>
        </>}
      </SurfaceCard>
    </>}
  </section>;
}
