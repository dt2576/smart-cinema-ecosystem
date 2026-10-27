import { AdminApiError } from "@/features/admin/admin-api";
import { isBookingId } from "@/features/booking/booking-api";
import { REPORT_AMOUNTS, REPORT_COUNTS, REPORT_DIMENSIONS, REPORT_ZONE, reportDates, type ReportBreakdowns, type ReportDaily, type ReportDimension, type ReportMetrics, type ReportPeriod, type ReportRange, type ReportSummary } from "@/features/admin/admin-report-service";

export class AdminReportApiError extends AdminApiError {
  readonly retryAfter: number;
  constructor(status: number, retryAfter = 0) {
    super(status, status === 400 ? "Khoảng ngày chưa hợp lệ. Vui lòng kiểm tra lại."
      : status === 401 ? "Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại."
      : status === 403 ? "Bạn không có quyền xem báo cáo."
      : status === 429 ? "Vui lòng chờ một lát rồi thử lại."
      : status === 502 ? "Dữ liệu báo cáo chưa hợp lệ. Vui lòng tải lại."
      : "Chưa tải được báo cáo. Vui lòng thử lại.");
    this.name = "AdminReportApiError"; this.retryAfter = retryAfter;
  }
}
const invalid = (): never => { throw new AdminReportApiError(502); };
function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return invalid(); return v as Record<string, unknown>;
}
const decimal = (v: unknown): v is string => typeof v === "string" && /^(0|[1-9]\d*)\.\d{4}$/.test(v);
const count = (v: unknown): v is string => typeof v === "string" && /^(0|[1-9]\d*)$/.test(v);
const instant = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 19) === v.slice(0, 19);
function metrics(raw: unknown): ReportMetrics {
  const v = object(raw);
  if (REPORT_AMOUNTS.some(key => !decimal(v[key])) || REPORT_COUNTS.some(key => !count(v[key]))
    || !(v.occupancyPercent === null || decimal(v.occupancyPercent))
    || (v.capacitySeatUnits === "0") !== (v.occupancyPercent === null)) return invalid();
  return Object.fromEntries([...REPORT_AMOUNTS, ...REPORT_COUNTS, "occupancyPercent"].map(key => [key, v[key]])) as ReportMetrics;
}
function period(raw: unknown, q: ReportRange): ReportPeriod {
  const v = object(raw);
  if (v.from !== q.from || v.to !== q.to || v.timezone !== REPORT_ZONE || v.currency !== "VND" || v.paymentEnvironment !== "SANDBOX"
    || v.cinemaId !== null || v.movieId !== null || v.showtimeId !== null || !instant(v.startInclusive) || !instant(v.endExclusive)
    || Date.parse(v.startInclusive) >= Date.parse(v.endExclusive)) return invalid();
  return { from: q.from, to: q.to, timezone: REPORT_ZONE, currency: "VND", paymentEnvironment: "SANDBOX", cinemaId: null, movieId: null, showtimeId: null, startInclusive: v.startInclusive, endExclusive: v.endExclusive };
}
export function parseReportSummary(raw: unknown, q: ReportRange): ReportSummary {
  const v = object(raw); return { period: period(v.period, q), metrics: metrics(v.metrics) };
}
export function parseReportDaily(raw: unknown, q: ReportRange): ReportDaily {
  const v = object(raw), dates = reportDates(q);
  if (!Array.isArray(v.items) || v.items.length !== dates.length) return invalid();
  return { period: period(v.period, q), items: v.items.map((raw, i) => { const row = object(raw); if (row.date !== dates[i]) return invalid(); return { date: dates[i], metrics: metrics(row.metrics) }; }) };
}
export function parseReportBreakdowns(raw: unknown, q: ReportRange, dimension: ReportDimension, page: number, size: number): ReportBreakdowns {
  const v = object(raw);
  if (v.dimension !== dimension || v.page !== page || v.size !== size || !count(v.totalElements) || !Array.isArray(v.items)) return invalid();
  const remaining = BigInt(v.totalElements) - BigInt(page) * BigInt(size);
  const length = remaining < BigInt(0) ? BigInt(0) : remaining > BigInt(size) ? BigInt(size) : remaining;
  if (BigInt(v.items.length) !== length) return invalid();
  const items = v.items.map(raw => {
    const r = object(raw);
    if (!isBookingId(r.id) || typeof r.name !== "string" || !r.name.trim()) return invalid();
    if (dimension === "SHOWTIME" ? !isBookingId(r.cinemaId) || !isBookingId(r.movieId) || !instant(r.startsAt)
      : r.cinemaId !== null || r.movieId !== null || r.startsAt !== null) return invalid();
    return { id: r.id, name: r.name, cinemaId: r.cinemaId as string | null, movieId: r.movieId as string | null, startsAt: r.startsAt as string | null, metrics: metrics(r.metrics) };
  });
  if (new Set(items.map(row => row.id)).size !== items.length) return invalid();
  return { period: period(v.period, q), dimension, page, size, totalElements: v.totalElements, items };
}
async function read<T>(path: string, token: string, q: ReportRange, parse: (v: unknown) => T, signal?: AbortSignal, extra?: Record<string, string>): Promise<T> {
  if (!reportDates(q).length) throw new AdminReportApiError(400);
  const query = new URLSearchParams({ from: q.from, to: q.to, ...extra });
  let response: Response;
  try {
    const timeout = AbortSignal.timeout(15_000);
    response = await fetch(`/api/v1/admin${path}?${query}`, { method: "GET", headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, credentials: "omit", cache: "no-store", redirect: "error", signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  } catch (cause) { if (signal?.aborted) throw cause; throw new AdminReportApiError(0); }
  if (!response.ok) {
    const header = response.headers.get("Retry-After");
    const seconds = header && /^\d+$/.test(header) ? Number(header) : header ? Math.ceil((Date.parse(header) - Date.now()) / 1000) : 0;
    throw new AdminReportApiError(response.status, Number.isSafeInteger(seconds) && seconds > 0 && seconds <= 2147483647 ? seconds : 0);
  }
  try { if (response.status !== 200) return invalid(); return parse(await response.json()); }
  catch { throw new AdminReportApiError(502); }
}
export const getAdminDashboard = (token: string, q: ReportRange, signal?: AbortSignal) => read("/dashboard", token, q, v => parseReportSummary(v, q), signal);
export const getAdminReportSummary = (token: string, q: ReportRange, signal?: AbortSignal) => read("/reports/summary", token, q, v => parseReportSummary(v, q), signal);
export const getAdminReportDaily = (token: string, q: ReportRange, signal?: AbortSignal) => read("/reports/daily", token, q, v => parseReportDaily(v, q), signal);
export function getAdminReportBreakdowns(token: string, q: ReportRange, dimension: ReportDimension, page = 0, size = 10, signal?: AbortSignal) {
  if (!Object.hasOwn(REPORT_DIMENSIONS, dimension) || !Number.isInteger(page) || page < 0 || page > 2147483647 || !Number.isInteger(size) || size < 1 || size > 100) throw new AdminReportApiError(400);
  return read("/reports/breakdowns", token, q, v => parseReportBreakdowns(v, q, dimension, page, size), signal, { dimension, page: String(page), size: String(size) });
}
