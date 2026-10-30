"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { OperationsApiError } from "@/features/manager/manager-api";
import { reportChartCeiling, reportCount, reportDateLabel, reportMoney, reportOccupancy, reportRatio, reportUnits, reportWeekend } from "@/features/manager/manager-report-service";
import type { ManagerReportBreakdowns, ManagerReportConcessions, ManagerReportDaily, ManagerReportSummary } from "@/features/manager/manager-report.types";
import styles from "@/features/manager/manager-report.module.css";

export function ReportIcon({ name }: { name: string }) { return <span className={styles.icon} aria-hidden="true">{name}</span>; }
export function ReportPanel({ title, icon, subtitle, extra, children, className = "", trailingIcon = false }: { title: string; icon?: string; subtitle?: string; extra?: ReactNode; children: ReactNode; className?: string; trailingIcon?: boolean }) {
  const id = useId();
  return <section className={`${styles.panel} ${className}`} aria-labelledby={id}><div className={styles.panelHeading}><div><h2 id={id}>{icon && !trailingIcon && <ReportIcon name={icon} />}{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{trailingIcon && icon && <ReportIcon name={icon} />}{extra}</div>{children}</section>;
}
export function ReportReadState({ loading, error, retry, route }: { loading: boolean; error?: Error; retry: () => void; route: string }) {
  const status = error instanceof OperationsApiError ? error.status : 0;
  const [deadline] = useState(() => Date.now() + (error instanceof OperationsApiError ? error.retryAfterMs : 0));
  const [now, setNow] = useState(() => Date.now());
  const waiting = now < deadline;
  useEffect(() => { if (!waiting) return; const timer = setTimeout(() => setNow(Date.now()), Math.min(1000, deadline - now)); return () => clearTimeout(timer); }, [waiting, deadline, now]);
  if (loading) return <div role="status" className={styles.readState}><p>Đang tải báo cáo…</p><div className={styles.kpis}>{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}</div><Skeleton className="h-80" /></div>;
  const message = status === 400 ? "Bộ lọc chưa hợp lệ. Vui lòng kiểm tra khoảng ngày và rạp."
    : status === 401 ? "Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại."
    : status === 403 ? "Bạn chưa có quyền xem báo cáo tại các rạp được phân công."
    : status === 404 ? "Rạp hoặc suất chiếu không khả dụng trong phạm vi được phân công."
    : status === 409 ? "Dữ liệu đã thay đổi. Vui lòng kiểm tra lại."
    : status === 429 ? "Có nhiều yêu cầu. Vui lòng chờ rồi kiểm tra lại."
    : status === 502 ? "Dữ liệu báo cáo chưa hợp lệ. Vui lòng kiểm tra lại."
    : "Chưa tải được dữ liệu. Vui lòng kiểm tra kết nối và thử lại.";
  return <div role="alert" className={styles.feedback}><ReportIcon name="bar_chart" /><h2>Chưa tải được báo cáo</h2><p>{message}</p>{status === 401 ? <Link className={styles.primaryButton} href={`/login?returnTo=${encodeURIComponent(route)}`}>Đăng nhập lại</Link> : <button className={styles.secondaryButton} onClick={retry} disabled={waiting}>{waiting ? "Vui lòng chờ…" : "Kiểm tra lại"}</button>}</div>;
}
export function DashboardKpis({ summary }: { summary: ManagerReportSummary }) {
  const m = summary.metrics;
  const cards = [
    { label: "Doanh thu", value: reportMoney(m.confirmedRevenue), note: "Doanh thu xác nhận từ VNPAY Sandbox", icon: "payments" },
    { label: "Đơn đặt vé", value: reportCount(m.bookingsCreated), note: "Đơn được tạo trong kỳ", icon: "receipt_long" },
    { label: "Vé đã bán", value: reportCount(m.ticketsSold), note: `${reportCount(m.guestsSold)} khách theo vé đã bán`, icon: "confirmation_number" },
    { label: "Suất chiếu", value: reportCount(m.showtimes), note: "Suất phục vụ trong kỳ", icon: "videocam" },
  ];
  return <dl className={styles.kpis} aria-label="Chỉ số tổng quan">{cards.map(c => <div key={c.label} className={styles.kpi}><dt><span>{c.label}</span><ReportIcon name={c.icon} /></dt><dd>{c.value}</dd><p>{c.note}</p></div>)}</dl>;
}
export function ReportFinancials({ summary }: { summary: ManagerReportSummary }) {
  const m = summary.metrics;
  const cards = [
    { title: "Doanh thu xác nhận", overline: "Chỉ số cốt lõi", amount: m.confirmedRevenue, note: "Sau giảm giá toàn đơn · Sandbox", icon: "verified" },
    { title: "Tiền bán vé", overline: "Trước giảm giá", amount: m.seatGrossAmount, note: "Giá vé đã lưu trong đơn", icon: "confirmation_number" },
    { title: "Tiền bắp nước", overline: "Trước giảm giá", amount: m.concessionGrossAmount, note: "Giá bắp nước đã lưu trong đơn", icon: "fastfood" },
    { title: "Giảm giá khuyến mại", overline: "Khấu trừ", amount: m.discountAmount, note: "Giảm giá trên toàn đơn", icon: "loyalty" },
  ];
  return <section className={styles.financials} aria-labelledby="financial-title"><div className={styles.panelHeading}><h2 id="financial-title">Doanh thu kỳ báo cáo</h2><span className={styles.overline} title="Chưa phân bổ giảm giá cho vé và từng món. Đơn vị VND.">Trước giảm giá: {reportMoney(m.grossAmount)}</span></div><dl className={styles.kpis}>{cards.map((c, i) => <div key={c.title} className={`${styles.financialCard} ${i === 0 ? styles.confirmed : ""}`}><dt><div><small>{c.overline}</small><h3>{c.title}</h3></div><ReportIcon name={c.icon} /></dt><dd>{i === 3 && c.amount !== "0.0000" ? "−" : ""}{reportMoney(c.amount).slice(0, -2)} <span className={styles.currency}>₫</span></dd><p>{c.note}</p></div>)}</dl></section>;
}
function chartAxis(units: bigint): string {
  if (units >= BigInt(10_000_000_000)) return `${units / BigInt(10_000_000_000)} Tr`;
  if (units >= BigInt(10_000_000)) return `${units / BigInt(10_000_000)} N`;
  return reportMoney(`${units / BigInt(10_000)}.${String(units % BigInt(10_000)).padStart(4, "0")}`);
}
export function ManagerRevenueChart({ daily, bars = false }: { daily: ManagerReportDaily; bars?: boolean }) {
  const id = useId(), [selected, setSelected] = useState<string>();
  const maximum = daily.items.reduce((max, d) => { const n = reportUnits(d.metrics.confirmedRevenue); return n > max ? n : max; }, BigInt(0));
  const peak = daily.items.find(d => reportUnits(d.metrics.confirmedRevenue) === maximum)!;
  const active = daily.items.find(d => d.date === selected) ?? peak;
  const ceiling = reportChartCeiling(maximum);
  const points = daily.items.map((d, i) => ({ x: 90 + (daily.items.length === 1 ? 280 : i * 570 / (daily.items.length - 1)), y: 200 - reportRatio(reportUnits(d.metrics.confirmedRevenue), ceiling, 180), day: d }));
  return <ReportPanel title="Doanh thu theo ngày" icon={bars ? "bar_chart" : undefined} className={styles.chartPanel} subtitle={`${daily.items.length} ngày trong kỳ · doanh thu xác nhận`} extra={bars ? <div className={styles.legend}><span>Ngày trong tuần</span><span>Cuối tuần (T7, CN)</span></div> : <span className={styles.chartLegend}>Doanh thu xác nhận</span>}>
    {maximum === BigInt(0) && <p role="status" className={styles.emptyLine}>Chưa có doanh thu xác nhận trong kỳ.</p>}
    <div className={styles.chartScroll} role="region" aria-label="Biểu đồ doanh thu theo ngày" tabIndex={0}>
      {bars ? <div className={styles.barChart} style={{ minWidth: Math.max(720, daily.items.length * 54 + 22) }}>
        <div className={styles.chartGrid} aria-hidden="true">{[0, 1, 2, 3].map(n => <span key={n} />)}</div>
        <div className={styles.chartTooltip} aria-live="polite"><small>{reportDateLabel(active.date)}</small><strong>{reportMoney(active.metrics.confirmedRevenue)}</strong><span>{reportCount(active.metrics.ticketsSold)} vé đã bán</span></div>
        <div className={styles.bars}>{daily.items.map(d => <button key={d.date} type="button" onFocus={() => setSelected(d.date)} onMouseEnter={() => setSelected(d.date)} onClick={() => setSelected(d.date)} aria-label={`${reportDateLabel(d.date)}: ${reportMoney(d.metrics.confirmedRevenue)}, ${reportCount(d.metrics.ticketsSold)} vé`} data-weekend={reportWeekend(d.date)}><span style={{ height: `${reportRatio(reportUnits(d.metrics.confirmedRevenue), maximum) * .8 / 10}%` }} /><small>{d.date.slice(8, 10)}</small></button>)}</div>
      </div> : <div className={styles.lineChart} style={{ minWidth: daily.items.length > 10 ? Math.max(620, daily.items.length * 28) : undefined }}><svg viewBox="0 0 700 240" preserveAspectRatio="none" role="img" aria-label="Xu hướng doanh thu xác nhận; số tiền đầy đủ trong bảng theo ngày">
        <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--color-action)" stopOpacity=".28" /><stop offset="100%" stopColor="var(--color-action)" stopOpacity="0" /></linearGradient></defs>
        {[0, 1, 2, 3].map(i => <g key={i}><line x1="50" x2="680" y1={20 + i * 60} y2={20 + i * 60} stroke="var(--report-edge)" strokeDasharray={i < 3 ? "3 3" : undefined} /><text x="42" y={24 + i * 60} textAnchor="end">{chartAxis(ceiling * BigInt(3 - i) / BigInt(3))}</text></g>)}
        <polygon points={`${points[0].x},200 ${points.map(p => `${p.x},${p.y}`).join(" ")} ${points.at(-1)!.x},200`} fill={`url(#${id})`} />
        <polyline points={points.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="var(--color-action)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => <g key={p.day.date}><circle cx={p.x} cy={p.y} r={active.date === p.day.date ? 6 : 4.5} fill="var(--color-action)" onMouseEnter={() => setSelected(p.day.date)}><title>{reportDateLabel(p.day.date)}: {reportMoney(p.day.metrics.confirmedRevenue)}</title></circle>{(daily.items.length <= 10 || i % Math.ceil(daily.items.length / 7) === 0 || i === points.length - 1) && <text x={p.x} y="224" textAnchor="middle">{p.day.date.slice(8, 10)}/{p.day.date.slice(5, 7)}</text>}</g>)}
      </svg><div className={`${styles.chartTooltip} ${styles.lineTooltip}`}><small>{reportDateLabel(active.date)}</small><strong>{reportMoney(active.metrics.confirmedRevenue)}</strong><span>{reportCount(active.metrics.ticketsSold)} vé đã bán</span></div></div>}
    </div>
    <details className={styles.dailyData}><summary>Xem dữ liệu theo ngày</summary><div className={styles.tableScroll} role="region" aria-label="Bảng doanh thu theo ngày" tabIndex={0}><table className={styles.table}><thead><tr><th scope="col">Ngày</th><th scope="col">Doanh thu xác nhận</th><th scope="col">Vé đã bán</th></tr></thead><tbody>{daily.items.map(d => <tr key={d.date}><th scope="row">{reportDateLabel(d.date)}</th><td>{reportMoney(d.metrics.confirmedRevenue)}</td><td>{reportCount(d.metrics.ticketsSold)}</td></tr>)}</tbody></table></div></details>
  </ReportPanel>;
}
export function BookingStatusChart({ summary }: { summary: ManagerReportSummary }) {
  const rows = summary.activity.bookingsByStatus;
  const amount = (status: string) => BigInt(rows.find(r => r.status === status)!.count);
  const groups = [{ title: "Đã thanh toán", count: amount("PAID"), note: "Trạng thái đơn đã lưu", tone: "green" }, { title: "Chờ thanh toán", count: amount("PENDING"), note: "Trạng thái đơn đã lưu", tone: "amber" }, { title: "Đã hủy / Quá hạn", count: amount("CANCELLED") + amount("EXPIRED"), note: `${reportCount(String(amount("CANCELLED")))} hủy · ${reportCount(String(amount("EXPIRED")))} hết hạn`, tone: "red" }];
  const total = groups.reduce((sum, g) => sum + g.count, BigInt(0));
  return <ReportPanel title="Tình trạng đặt vé" subtitle="Các đơn được tạo trong kỳ" className={styles.statusPanel}>
    <div><div className={styles.segment} aria-hidden="true">{groups.map(g => <span key={g.title} data-tone={g.tone} style={{ width: `${reportRatio(g.count, total) / 10}%` }} />)}</div><p className={styles.statusTotal}>{reportCount(String(total))} tổng đơn</p></div>
    <div className={styles.statusRows}>{groups.map(g => <div key={g.title} data-tone={g.tone}><i aria-hidden="true" /><div><strong>{g.title}</strong><small>{g.note}</small></div><b>{reportCount(String(g.count))} đơn</b></div>)}</div><p className={styles.statusNote}>Trạng thái hiện tại, không phải ảnh chụp cuối ngày.</p>
  </ReportPanel>;
}
export function ShowtimeActivity({ summary }: { summary: ManagerReportSummary }) {
  const m = summary.metrics;
  return <ReportPanel title="Hoạt động suất chiếu" icon="sensors" trailingIcon subtitle="Suất phục vụ và soát vé trong kỳ" className={styles.operations}>
    <div className={styles.operationRows}><div><ReportIcon name="theaters" /><span>Tổng suất chiếu<small>Đã lên lịch phục vụ</small></span><strong>{reportCount(m.showtimes)}</strong></div>
      <div><ReportIcon name="qr_code_scanner" /><span>Vé đã soát vào rạp<small>Theo thời điểm soát vé trong kỳ</small></span><strong>{reportCount(summary.activity.checkedInTickets)}</strong></div>
      <div className={styles.occupancy}><div><ReportIcon name="chair" /><span>Tỷ lệ lấp đầy ghế</span><strong>{reportOccupancy(m.occupancyPercent)}</strong></div><div className={styles.track} aria-hidden="true"><span style={{ width: m.occupancyPercent === null ? "0%" : `${reportRatio(reportUnits(m.occupancyPercent), BigInt(1_000_000)) / 10}%` }} /></div><small>{reportCount(m.soldSeatUnits)} / {reportCount(m.capacitySeatUnits)} đơn vị ghế trong kỳ suất chiếu</small></div>
    </div>
  </ReportPanel>;
}
export function MovieHighlights({ data, href }: { data: ManagerReportBreakdowns; href: string }) {
  return <ReportPanel title="Phim bán chạy" icon="local_fire_department" trailingIcon subtitle="Xếp hạng theo doanh thu xác nhận">
    {!data.items.length ? <p className={styles.emptyLine}>Chưa có phim trong kỳ báo cáo.</p> : <ol className={styles.movieList}>{data.items.map((r, i) => <li key={r.id}><b className={styles.rank}>{i + 1}</b><span className={styles.poster} aria-hidden="true"><ReportIcon name="videocam" /></span><div><strong>{r.name}</strong><small>{reportCount(r.metrics.showtimes)} suất chiếu</small></div><div className={styles.movieAmount}><strong>{reportMoney(r.metrics.confirmedRevenue)}</strong><small>{reportCount(r.metrics.ticketsSold)} vé</small></div></li>)}</ol>}
    <Link className={styles.moreLink} href={href}>Xem toàn bộ phim <ReportIcon name="chevron_right" /></Link>
  </ReportPanel>;
}
export function ReportPagination({ page, size, total, count, label, change }: { page: number; size: number; total: string; count: number; label: string; change: (page: number) => void }) {
  const totalPages = (BigInt(total) + BigInt(size) - BigInt(1)) / BigInt(size);
  return <div className={styles.pagination}><span>Hiển thị {count} trên {reportCount(total)} {label}</span><div><button className={styles.iconButton} aria-label={`Trang ${label} trước`} disabled={page === 0} onClick={() => change(page - 1)}><ReportIcon name="chevron_left" /></button><span>Trang {reportCount(String(page + 1))} / {reportCount(String(totalPages || BigInt(1)))}</span><button className={styles.iconButton} aria-label={`Trang ${label} sau`} disabled={page === 2147483647 || BigInt(page + 1) * BigInt(size) >= BigInt(total)} onClick={() => change(page + 1)}><ReportIcon name="chevron_right" /></button></div></div>;
}
export function ConcessionRanking({ data, gross, change }: { data: ManagerReportConcessions; gross: string; change: (page: number) => void }) {
  const maximum = data.items.reduce((max, row) => BigInt(row.quantity) > max ? BigInt(row.quantity) : max, BigInt(0));
  const categories = { COMBO: "Combo", POPCORN: "Bắp rang", DRINK: "Đồ uống" };
  return <ReportPanel title="Bắp nước bán chạy" icon="local_cafe" subtitle="Xếp hạng theo số lượng đã mua" className={styles.concessions} extra={<div className={styles.productTotal}><small>Tổng trước giảm giá</small><strong>{reportMoney(gross)}</strong></div>}>
    {!data.items.length ? <div className={styles.emptyLine}><p>{data.totalElements === "0" ? "Chưa có bắp nước đã bán trong kỳ." : "Trang này chưa có mặt hàng."}</p>{data.page > 0 && <button type="button" className={styles.secondaryButton} onClick={() => change(0)}>Về trang đầu bắp nước</button>}</div> : <ol className={styles.productList}>{data.items.map((r, i) => <li key={r.id}><div><b className={styles.rank}>{data.page * data.size + i + 1}</b><strong>{r.name}</strong><b>{reportMoney(r.grossAmount)}</b></div><p><span>Số lượng bán: {reportCount(r.quantity)}</span><span>{categories[r.category]}</span></p><div className={styles.track} aria-hidden="true"><span style={{ width: `${reportRatio(BigInt(r.quantity), maximum) / 10}%` }} /></div></li>)}</ol>}
    <ReportPagination page={data.page} size={data.size} total={data.totalElements} count={data.items.length} label="món" change={change} />
  </ReportPanel>;
}
