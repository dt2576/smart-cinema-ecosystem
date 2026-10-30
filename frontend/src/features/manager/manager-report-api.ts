import { REPORT_AMOUNTS, REPORT_COUNTS, REPORT_DIMENSIONS, reportDates } from "@/features/admin/admin-report-service";
import { OperationsApiError, isOperationId, operationInstant, operationsRequest } from "@/features/manager/manager-api";
import { REPORT_ACTIVITY_STATES, type ManagerReportActivity, type ManagerReportBreakdowns, type ManagerReportConcessions, type ManagerReportDaily, type ManagerReportFilters, type ManagerReportPeriod, type ManagerReportSummary, type ReportDimension, type ReportMetrics } from "@/features/manager/manager-report.types";

const invalid = (): never => { throw new OperationsApiError(502); };
function object(v: unknown): Record<string, unknown> { return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : invalid(); }
const count = (v: unknown): v is string => typeof v === "string" && /^(0|[1-9]\d*)$/.test(v);
const decimal = (v: unknown): v is string => typeof v === "string" && /^(0|[1-9]\d*)\.\d{4}$/.test(v);
const label = (v: unknown): v is string => typeof v === "string" && !!v.trim() && !v.includes("\0");
function metrics(raw: unknown): ReportMetrics {
  const v = object(raw);
  if (REPORT_AMOUNTS.some(k => !decimal(v[k])) || REPORT_COUNTS.some(k => !count(v[k])) || !(v.occupancyPercent === null || decimal(v.occupancyPercent)) || (v.capacitySeatUnits === "0") !== (v.occupancyPercent === null)) return invalid();
  return Object.fromEntries([...REPORT_AMOUNTS, ...REPORT_COUNTS, "occupancyPercent"].map(k => [k, v[k]])) as ReportMetrics;
}
function activity(raw: unknown): ManagerReportActivity {
  const v = object(raw), result: Record<string, unknown> = {};
  for (const [key, states] of Object.entries(REPORT_ACTIVITY_STATES)) {
    const rows = v[key];
    if (!Array.isArray(rows) || rows.length !== states.length) return invalid();
    const parsed = rows.map(raw => { const r = object(raw); if (!states.includes(r.status as never) || !count(r.count)) return invalid(); return { status: r.status, count: r.count }; });
    if (new Set(parsed.map(r => r.status)).size !== states.length) return invalid();
    result[key] = parsed;
  }
  if (!count(v.checkedInTickets) || !count(v.reconciliationAttempts)) return invalid();
  return { ...result, checkedInTickets: v.checkedInTickets, reconciliationAttempts: v.reconciliationAttempts } as ManagerReportActivity;
}
function localMidnight(instant: string, day: string): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
  const p = (key: string) => parts.find(v => v.type === key)?.value;
  return `${p("year")?.padStart(4, "0")}-${p("month")}-${p("day")}` === day && p("hour") === "00" && p("minute") === "00" && p("second") === "00";
}
function period(raw: unknown, q: ManagerReportFilters): ManagerReportPeriod {
  const v = object(raw);
  if (v.from !== q.from || v.to !== q.to || v.timezone !== "Asia/Ho_Chi_Minh" || v.currency !== "VND" || v.paymentEnvironment !== "SANDBOX" || !operationInstant(v.startInclusive) || !operationInstant(v.endExclusive)
    || !localMidnight(v.startInclusive, q.from) || !localMidnight(v.endExclusive, q.to) || Date.parse(v.startInclusive) >= Date.parse(v.endExclusive)
    || ["cinemaId", "movieId", "showtimeId"].some(k => v[k] !== (q[k as keyof ManagerReportFilters] ?? null))) return invalid();
  return { from: q.from, to: q.to, startInclusive: v.startInclusive, endExclusive: v.endExclusive, timezone: "Asia/Ho_Chi_Minh", currency: "VND", paymentEnvironment: "SANDBOX", cinemaId: q.cinemaId ?? null, movieId: q.movieId ?? null, showtimeId: q.showtimeId ?? null };
}
export function parseManagerReportSummary(raw: unknown, q: ManagerReportFilters): ManagerReportSummary {
  const v = object(raw); return { period: period(v.period, q), metrics: metrics(v.metrics), activity: activity(v.activity) };
}
export function parseManagerReportDaily(raw: unknown, q: ManagerReportFilters): ManagerReportDaily {
  const v = object(raw), dates = reportDates(q);
  if (!Array.isArray(v.items) || !dates.length || v.items.length !== dates.length) return invalid();
  return { period: period(v.period, q), items: v.items.map((raw, i) => { const r = object(raw); if (r.date !== dates[i]) return invalid(); return { date: dates[i], metrics: metrics(r.metrics), activity: activity(r.activity) }; }) };
}
function pageRows(v: Record<string, unknown>, page: number, size: number): unknown[] {
  if (v.page !== page || v.size !== size || !count(v.totalElements) || !Array.isArray(v.items)) return invalid();
  const remaining = BigInt(v.totalElements) - BigInt(page) * BigInt(size);
  const expected = remaining <= BigInt(0) ? BigInt(0) : remaining > BigInt(size) ? BigInt(size) : remaining;
  if (BigInt(v.items.length) !== expected) return invalid();
  return v.items;
}
export function parseManagerReportBreakdowns(raw: unknown, q: ManagerReportFilters, dimension: ReportDimension, page: number, size: number): ManagerReportBreakdowns {
  const v = object(raw); if (v.dimension !== dimension) return invalid();
  const items = pageRows(v, page, size).map(raw => {
    const r = object(raw);
    if (!isOperationId(r.id) || !label(r.name) || (dimension === "SHOWTIME" ? !isOperationId(r.cinemaId) || !isOperationId(r.movieId) || !operationInstant(r.startsAt) || q.cinemaId && r.cinemaId !== q.cinemaId || q.movieId && r.movieId !== q.movieId || q.showtimeId && r.id !== q.showtimeId
      : r.cinemaId !== null || r.movieId !== null || r.startsAt !== null || dimension === "CINEMA" && q.cinemaId && r.id !== q.cinemaId || dimension === "MOVIE" && q.movieId && r.id !== q.movieId)) return invalid();
    return { id: r.id, name: r.name, cinemaId: r.cinemaId as string | null, movieId: r.movieId as string | null, startsAt: r.startsAt as string | null, metrics: metrics(r.metrics), activity: activity(r.activity) };
  });
  if (new Set(items.map(r => r.id)).size !== items.length) return invalid();
  return { period: period(v.period, q), dimension, page, size, totalElements: v.totalElements as string, items };
}
export function parseManagerReportConcessions(raw: unknown, q: ManagerReportFilters, page: number, size: number): ManagerReportConcessions {
  const v = object(raw);
  const items = pageRows(v, page, size).map(raw => { const r = object(raw); if (!isOperationId(r.id) || !label(r.name) || !["POPCORN", "DRINK", "COMBO"].includes(String(r.category)) || !count(r.quantity) || !count(r.confirmedBookings) || !decimal(r.grossAmount)) return invalid(); return { id: r.id, name: r.name, category: r.category as "POPCORN" | "DRINK" | "COMBO", quantity: r.quantity, confirmedBookings: r.confirmedBookings, grossAmount: r.grossAmount }; });
  if (new Set(items.map(r => r.id)).size !== items.length) return invalid();
  return { period: period(v.period, q), page, size, totalElements: v.totalElements as string, items };
}
function read<T>(path: string, token: string, q: ManagerReportFilters, parse: (v: unknown) => T, signal?: AbortSignal, paging?: { page: number; size: number; dimension?: ReportDimension }): Promise<T> {
  if (!reportDates(q).length || [q.cinemaId, q.movieId, q.showtimeId].some(v => v !== undefined && !isOperationId(v)) || paging && (!Number.isInteger(paging.page) || paging.page < 0 || paging.page > 2147483647 || !Number.isInteger(paging.size) || paging.size < 1 || paging.size > 100 || paging.dimension !== undefined && !Object.hasOwn(REPORT_DIMENSIONS, paging.dimension))) throw new OperationsApiError(400);
  const query = new URLSearchParams({ from: q.from, to: q.to });
  for (const key of ["cinemaId", "movieId", "showtimeId"] as const) if (q[key]) query.set(key, q[key]);
  if (paging) { query.set("page", String(paging.page)); query.set("size", String(paging.size)); if (paging.dimension) query.set("dimension", paging.dimension); }
  const timeout = AbortSignal.timeout(15000);
  return operationsRequest(`/manager${path}?${query}`, token, parse, "GET", undefined, signal ? AbortSignal.any([signal, timeout]) : timeout);
}
export const getManagerDashboard = (token: string, q: ManagerReportFilters, signal?: AbortSignal) => read("/dashboard", token, q, v => parseManagerReportSummary(v, q), signal);
export const getManagerReportSummary = (token: string, q: ManagerReportFilters, signal?: AbortSignal) => read("/reports/summary", token, q, v => parseManagerReportSummary(v, q), signal);
export const getManagerReportDaily = (token: string, q: ManagerReportFilters, signal?: AbortSignal) => read("/reports/daily", token, q, v => parseManagerReportDaily(v, q), signal);
export const getManagerReportBreakdowns = (token: string, q: ManagerReportFilters, dimension: ReportDimension, page = 0, size = 5, signal?: AbortSignal) => read("/reports/breakdowns", token, q, v => parseManagerReportBreakdowns(v, q, dimension, page, size), signal, { dimension, page, size });
export const getManagerReportConcessions = (token: string, q: ManagerReportFilters, page = 0, size = 5, signal?: AbortSignal) => read("/reports/concessions", token, q, v => parseManagerReportConcessions(v, q, page, size), signal, { page, size });
