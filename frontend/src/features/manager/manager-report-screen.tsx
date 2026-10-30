"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { REPORT_DIMENSIONS, reportAddDays } from "@/features/admin/admin-report-service";
import { useManager } from "@/features/manager/manager-shell";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { getManagerDashboard, getManagerReportBreakdowns, getManagerReportConcessions, getManagerReportDaily, getManagerReportSummary } from "@/features/manager/manager-report-api";
import { managerReportPreset, managerReportQuery, managerReportSearch, reportCount, reportMoney, reportOccupancy, reportRange } from "@/features/manager/manager-report-service";
import { BookingStatusChart, ConcessionRanking, DashboardKpis, ManagerRevenueChart, MovieHighlights, ReportFinancials, ReportIcon, ReportPanel, ReportPagination, ReportReadState, ShowtimeActivity } from "@/features/manager/manager-report-components";
import type { ManagerReportQuery, ReportDimension } from "@/features/manager/manager-report.types";
import styles from "@/features/manager/manager-report.module.css";

function ReportFilters({ query, detailed, apply, refresh, loading }: { query: ManagerReportQuery; detailed: boolean; apply: (q: ManagerReportQuery) => void; refresh: () => void; loading: boolean }) {
  const { cinemas } = useManager();
  const [cinema, setCinema] = useState(query.filters.cinemaId ?? "");
  const [from, setFrom] = useState(query.filters.from), [through, setThrough] = useState(reportAddDays(query.filters.to, -1)!);
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const result = reportRange(from, through);
    if (result.error) { setError(result.error); return; }
    setError("");
    apply({ ...query, filters: { ...query.filters, ...result.range, cinemaId: cinema || undefined }, page: 0, productPage: 0 });
  }
  function preset(days: 1 | 7 | 30) {
    const range = managerReportPreset(days);
    apply({ ...query, filters: { ...query.filters, ...range, cinemaId: cinema || undefined }, page: 0, productPage: 0 });
  }
  return <form className={`${styles.filters} ${detailed ? styles.reportFilters : ""}`} onSubmit={submit} aria-label="Bộ lọc báo cáo" noValidate>
    <div className={styles.filterFields}><label className={styles.cinemaField}><span><ReportIcon name="theater_comedy" />{detailed ? "Cụm rạp phân công" : "Rạp đang chọn"}</span><select aria-label="Rạp chiếu phim" value={cinema} onChange={e => setCinema(e.target.value)} className={styles.control}><option value="">Tất cả rạp được phân công</option>{cinemas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <fieldset className={styles.dateFields}><legend><ReportIcon name="calendar_today" />Khoảng thời gian</legend><div><label className="sr-only" htmlFor="report-from">Từ ngày</label><input id="report-from" aria-invalid={!!error} aria-describedby={error ? "report-filter-error" : undefined} className={styles.control} type="date" min="0001-01-01" max="9999-12-30" value={from} onChange={e => setFrom(e.target.value)} /><span aria-hidden="true">–</span><label className="sr-only" htmlFor="report-through">Đến hết ngày</label><input id="report-through" aria-invalid={!!error} aria-describedby={error ? "report-filter-error" : undefined} className={styles.control} type="date" min="0001-01-01" max="9999-12-30" value={through} onChange={e => setThrough(e.target.value)} /></div></fieldset>
    {!detailed && <div className={styles.presets} aria-label="Chọn nhanh thời gian">{([1, 7, 30] as const).map(n => <button key={n} type="button" onClick={() => preset(n)} aria-pressed={query.filters.from === managerReportPreset(n).from && query.filters.to === managerReportPreset(n).to}>{n === 1 ? "Hôm nay" : `${n} ngày`}</button>)}</div>}</div>
    <div className={styles.filterActions}>{detailed && <button type="button" className={styles.secondaryButton} onClick={() => apply({ ...query, filters: managerReportPreset(30), page: 0, productPage: 0 })}><ReportIcon name="restart_alt" />Đặt lại</button>}<button type="submit" className={styles.primaryButton}><ReportIcon name="filter_alt" />{detailed ? "Áp dụng bộ lọc" : "Áp dụng"}</button><button type="button" className={styles.secondaryButton} onClick={refresh} disabled={loading} aria-label="Làm mới dữ liệu"><ReportIcon name="refresh" /><span>Làm mới</span></button></div>
    {error && <p role="alert" id="report-filter-error" className={styles.fieldError}>{error}</p>}
    {(query.filters.movieId || query.filters.showtimeId) && <div className={styles.filterHints}><span>{query.filters.movieId && `Phim #${query.filters.movieId}`}{query.filters.movieId && query.filters.showtimeId && " · "}{query.filters.showtimeId && `Suất chiếu #${query.filters.showtimeId}`}</span><button type="button" className={styles.secondaryButton} onClick={() => apply({ ...query, filters: { from: query.filters.from, to: query.filters.to, cinemaId: cinema || undefined }, page: 0, productPage: 0 })}>Bỏ lọc phim và suất chiếu</button></div>}
  </form>;
}
export function ManagerReportScreen({ queryString, detailed }: { queryString: string; detailed: boolean }) {
  const query = useMemo(() => managerReportQuery(queryString, detailed), [queryString, detailed]);
  const route = detailed ? "/manager/reports" : "/manager/dashboard";
  const heading = <div className={styles.heading}><span className={styles.eyebrow}><ReportIcon name="analytics" />BÁO CÁO VẬN HÀNH RẠP</span><h1>{detailed ? "Báo cáo & Thống kê" : "Tổng quan"}</h1><p>{detailed ? "Xem chi tiết doanh thu và hoạt động kinh doanh của rạp." : "Theo dõi hoạt động và kết quả kinh doanh tại rạp."}</p></div>;
  return <div className={`${styles.screen} ${detailed ? styles.detailed : ""}`}>{heading}{query ? <ReportWorkspace key={route} query={query} detailed={detailed} route={route} /> : <div role="alert" className={styles.feedback}><h2>Bộ lọc chưa hợp lệ</h2><p>Chọn khoảng ngày tối đa 366 ngày và mã hợp lệ.</p><Link className={styles.secondaryButton} href={route}>Đặt lại bộ lọc</Link></div>}</div>;
}
function ReportWorkspace({ query, detailed, route }: { query: ManagerReportQuery; detailed: boolean; route: string }) {
  const { accessToken } = useManager(), router = useRouter();
  const load = useCallback(async (signal: AbortSignal) => {
    const [summary, daily, ranking, products] = await Promise.all([
      detailed ? getManagerReportSummary(accessToken, query.filters, signal) : getManagerDashboard(accessToken, query.filters, signal),
      getManagerReportDaily(accessToken, query.filters, signal),
      getManagerReportBreakdowns(accessToken, query.filters, detailed ? query.dimension : "MOVIE", detailed ? query.page : 0, detailed ? 5 : 4, signal),
      detailed ? getManagerReportConcessions(accessToken, query.filters, query.productPage, 5, signal) : Promise.resolve(null),
    ]);
    return { summary, daily, ranking, products };
  }, [accessToken, query, detailed]);
  const state = useMovieRequest(load);
  const navigate = (next: ManagerReportQuery) => {
    const search = detailed ? managerReportSearch(next) : new URLSearchParams(Object.entries(next.filters).filter(([, v]) => v !== undefined) as [string, string][]).toString();
    // Same filters are an explicit safe GET recheck rather than a no-op navigation.
    if (search === (detailed ? managerReportSearch(query) : new URLSearchParams(Object.entries(query.filters).filter(([, v]) => v !== undefined) as [string, string][]).toString())) state.retry();
    else router.push(`${route}?${search}`, { scroll: false });
  };
  const data = state.data;
  return <><ReportFilters key={managerReportSearch(query)} query={query} detailed={detailed} apply={navigate} refresh={state.retry} loading={state.loading} />
    {state.loading || state.error || !data ? <ReportReadState key={state.loading ? "loading" : `${state.error?.name}:${state.error?.message}`} loading={state.loading} error={state.error} retry={state.retry} route={route} /> : <>
      {detailed ? <ReportFinancials summary={data.summary} /> : <DashboardKpis summary={data.summary} />}
      {!detailed ? <><div className={styles.primaryGrid}><ManagerRevenueChart daily={data.daily} /><BookingStatusChart summary={data.summary} /></div><div className={styles.secondaryGrid}><MovieHighlights data={data.ranking} href={`/manager/reports?${managerReportSearch({ ...query, dimension: "MOVIE", page: 0, productPage: 0 })}`} /><ShowtimeActivity summary={data.summary} /></div></>
        : <><ManagerRevenueChart daily={data.daily} bars /><div className={styles.secondaryGrid}>
          <ReportPanel title="Xếp hạng hiệu quả" icon="bar_chart" subtitle="Theo doanh thu xác nhận" className={styles.ranking} extra={<div className={styles.tabs} role="group" aria-label="Chiều xếp hạng">{(["MOVIE", "SHOWTIME", "CINEMA"] as ReportDimension[]).map(d => <button key={d} aria-pressed={query.dimension === d} onClick={() => navigate({ ...query, dimension: d, page: 0 })}>{REPORT_DIMENSIONS[d]}</button>)}</div>}>
            {!data.ranking.items.length ? <div className={styles.emptyLine}><p>Chưa có dữ liệu xếp hạng trên trang này.</p>{query.page > 0 && <button className={styles.secondaryButton} onClick={() => navigate({ ...query, page: 0 })}>Về trang đầu</button>}</div> : <div className={styles.tableScroll} role="region" tabIndex={0} aria-label="Bảng xếp hạng hiệu quả"><table className={styles.table}><thead><tr><th scope="col">Hạng</th><th scope="col">{query.dimension === "MOVIE" ? "Tên phim" : query.dimension === "CINEMA" ? "Rạp" : "Suất chiếu"}</th><th scope="col">Số suất</th><th scope="col">Vé bán</th><th scope="col">Lấp đầy</th><th scope="col">Doanh thu</th></tr></thead><tbody>{data.ranking.items.map((r, i) => <tr key={r.id}><td><b className={styles.rank}>{query.page * data.ranking.size + i + 1}</b></td><th scope="row"><div className={styles.rankingName}><span className={styles.poster} aria-hidden="true"><ReportIcon name={query.dimension === "MOVIE" ? "videocam" : "theaters"} /></span><div><strong>{r.name}</strong><small>ID: {r.id}{r.startsAt && ` · ${new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(r.startsAt))}`}</small></div></div></th><td>{reportCount(r.metrics.showtimes)}</td><td>{reportCount(r.metrics.ticketsSold)}</td><td>{reportOccupancy(r.metrics.occupancyPercent)}</td><td>{reportMoney(r.metrics.confirmedRevenue)}</td></tr>)}</tbody></table></div>}
            <ReportPagination page={data.ranking.page} size={data.ranking.size} total={data.ranking.totalElements} count={data.ranking.items.length} label="kết quả" change={page => navigate({ ...query, page })} />
          </ReportPanel>{data.products && <ConcessionRanking data={data.products} gross={data.summary.metrics.concessionGrossAmount} change={productPage => navigate({ ...query, productPage })} />}
        </div></>}
    </>}
  </>;
}
