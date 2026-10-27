export const REPORT_ZONE = "Asia/Ho_Chi_Minh";
export const REPORT_DIMENSIONS = { CINEMA: "Theo rạp", MOVIE: "Theo phim", SHOWTIME: "Theo suất chiếu" } as const;
export type ReportDimension = keyof typeof REPORT_DIMENSIONS;
export type ReportRange = { from: string; to: string };
export const REPORT_AMOUNTS = ["confirmedRevenue", "grossAmount", "discountAmount", "seatGrossAmount", "concessionGrossAmount"] as const;
export const REPORT_COUNTS = ["confirmedBookings", "ticketsSold", "guestsSold", "bookingsCreated", "showtimes", "capacitySeatUnits", "soldSeatUnits"] as const;
export type ReportMetrics = Record<typeof REPORT_AMOUNTS[number] | typeof REPORT_COUNTS[number], string> & { occupancyPercent: string | null };
export type ReportPeriod = ReportRange & { startInclusive: string; endExclusive: string; timezone: typeof REPORT_ZONE; currency: "VND"; paymentEnvironment: "SANDBOX"; cinemaId: null; movieId: null; showtimeId: null };
export type ReportSummary = { period: ReportPeriod; metrics: ReportMetrics };
export type ReportDay = { date: string; metrics: ReportMetrics };
export type ReportDaily = { period: ReportPeriod; items: ReportDay[] };
export type ReportRow = { id: string; name: string; cinemaId: string | null; movieId: string | null; startsAt: string | null; metrics: ReportMetrics };
export type ReportBreakdowns = { period: ReportPeriod; dimension: ReportDimension; page: number; size: number; totalElements: string; items: ReportRow[] };
export type ReportPreset = "today" | "week" | "month";

// UTC is used only for calendar arithmetic. Monetary strings are never passed to Number.
export function isReportDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function reportAddDays(value: string, days: number): string | undefined {
  if (!isReportDate(value)) return;
  const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days);
  const result = date.toISOString().slice(0, 10); return isReportDate(result) ? result : undefined;
}
export function reportDates(range: ReportRange): string[] {
  if (!isReportDate(range.from) || !isReportDate(range.to) || range.from >= range.to) return [];
  const days = (Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86400000;
  return days <= 366 ? Array.from({ length: days }, (_, i) => reportAddDays(range.from, i)!) : [];
}
export function reportRange(from: string, inclusiveTo: string): { range: ReportRange; error?: never } | { range?: never; error: string } {
  if (!from || !inclusiveTo) return { error: "Vui lòng chọn đủ ngày bắt đầu và kết thúc." };
  if (!isReportDate(from) || !isReportDate(inclusiveTo)) return { error: "Ngày chưa hợp lệ. Vui lòng kiểm tra lại." };
  if (from > inclusiveTo) return { error: "Ngày kết thúc phải từ ngày bắt đầu trở đi." };
  const to = reportAddDays(inclusiveTo, 1);
  if (!to) return { error: "Ngày kết thúc vượt giới hạn báo cáo." };
  const range = { from, to };
  if (!reportDates(range).length) return { error: "Vui lòng chọn khoảng thời gian tối đa 366 ngày." };
  return { range };
}
export function reportPreset(preset: ReportPreset, now = new Date()): ReportRange {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: REPORT_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  const today = `${part("year").padStart(4, "0")}-${part("month")}-${part("day")}`;
  return { from: preset === "month" ? `${today.slice(0, 7)}-01` : preset === "week" ? reportAddDays(today, -6)! : today, to: reportAddDays(today, 1)! };
}
export const reportDateLabel = (value: string) => `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
export const reportCount = (value: string) => value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export function reportDecimal(value: string): string {
  const [whole, fraction] = value.split("."); const tail = fraction?.replace(/0+$/, "");
  return `${reportCount(whole)}${tail ? `,${tail}` : ""}`;
}
export const reportMoney = (value: string) => `${reportDecimal(value)} ₫`;
export const reportOccupancy = (value: string | null) => value === null ? "Chưa có dữ liệu" : `${reportDecimal(value)}%`;
// BigInt determines an exact ratio; this bounded integer is only a drawing coordinate, never a financial value.
export function reportBarPermille(value: string, maximum: bigint): number {
  return maximum === BigInt(0) ? 0 : Number(BigInt(value.replace(".", "")) * BigInt(1000) / maximum);
}
