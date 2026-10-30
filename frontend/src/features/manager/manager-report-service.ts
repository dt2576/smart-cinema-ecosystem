import { isOperationId } from "@/features/manager/manager-api";
import { REPORT_DIMENSIONS, reportAddDays, reportDates, reportPreset } from "@/features/admin/admin-report-service";
import type { ManagerReportFilters, ManagerReportQuery } from "@/features/manager/manager-report.types";

export { reportCount, reportDateLabel, reportDecimal, reportMoney, reportOccupancy, reportRange } from "@/features/admin/admin-report-service";
export function managerReportPreset(days: 1 | 7 | 30, now = new Date()): ManagerReportFilters {
  const today = reportPreset("today", now);
  return { from: reportAddDays(today.from, 1 - days)!, to: today.to };
}
export function managerReportQuery(raw: string, detailed: boolean, now = new Date()): ManagerReportQuery | undefined {
  const q = new URLSearchParams(raw);
  const allowed = ["from", "to", "cinemaId", "movieId", "showtimeId", ...(detailed ? ["dimension", "page", "productPage"] : [])];
  if ([...q.keys()].some(k => !allowed.includes(k) || q.getAll(k).length !== 1 || !q.get(k))) return;
  if (q.has("from") !== q.has("to")) return;
  const defaults = detailed ? reportPreset("month", now) : managerReportPreset(7, now);
  const filters: ManagerReportFilters = { from: q.get("from") ?? defaults.from, to: q.get("to") ?? defaults.to };
  if (!reportDates(filters).length) return;
  for (const key of ["cinemaId", "movieId", "showtimeId"] as const) {
    if (q.has(key)) { if (!isOperationId(q.get(key))) return; filters[key] = q.get(key)!; }
  }
  const dimension = q.get("dimension") ?? "MOVIE";
  if (!Object.hasOwn(REPORT_DIMENSIONS, dimension)) return;
  const paging = ["page", "productPage"].map(k => q.get(k) ?? "0");
  if (paging.some(v => !/^(0|[1-9]\d{0,9})$/.test(v) || Number(v) > 2147483647)) return;
  return { filters, dimension: dimension as ManagerReportQuery["dimension"], page: Number(paging[0]), productPage: Number(paging[1]) };
}
export function managerReportSearch(query: ManagerReportQuery): string {
  const q = new URLSearchParams(Object.entries(query.filters).filter(([, v]) => v !== undefined) as [string, string][]);
  q.set("dimension", query.dimension);
  if (query.page) q.set("page", String(query.page));
  if (query.productPage) q.set("productPage", String(query.productPage));
  return q.toString();
}
// Exact integers first; Number is used only for a bounded drawing coordinate.
export function reportRatio(value: bigint, total: bigint, scale = 1000): number {
  if (total <= BigInt(0)) return 0;
  return Number((value < BigInt(0) ? BigInt(0) : value > total ? total : value) * BigInt(scale) / total);
}
export const reportUnits = (amount: string) => BigInt(amount.replace(".", ""));
export function reportChartCeiling(maximum: bigint): bigint {
  if (maximum <= BigInt(0)) return BigInt(0);
  let step = BigInt(1);
  while (maximum > step * BigInt(3)) step *= BigInt(10);
  return (maximum + step - BigInt(1)) / step * step;
}
export const reportWeekend = (date: string) => [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());
