// HTTP fixtures only; never imported by production or written to operational PostgreSQL.
import { reportDates, type ReportMetrics, type ReportRange, type ReportDimension } from "@/features/admin/admin-report-service";

export const reportFixtureMetrics: ReportMetrics = {
  confirmedRevenue: "99990.0000", grossAmount: "100000.1234", discountAmount: "10.1234", seatGrossAmount: "80000.0000", concessionGrossAmount: "20000.1234",
  confirmedBookings: "1", ticketsSold: "1", guestsSold: "2", bookingsCreated: "7", showtimes: "3", capacitySeatUnits: "10", soldSeatUnits: "1", occupancyPercent: "10.0000",
};
export const reportZeroMetrics: ReportMetrics = { ...Object.fromEntries(Object.keys(reportFixtureMetrics).map(key => [key, key.endsWith("Amount") || key === "confirmedRevenue" ? "0.0000" : "0"])), occupancyPercent: null } as ReportMetrics;
export const reportFixturePeriod = (q: ReportRange) => ({ ...q, startInclusive: new Date(`${q.from}T00:00:00+07:00`).toISOString(), endExclusive: new Date(`${q.to}T00:00:00+07:00`).toISOString(), timezone: "Asia/Ho_Chi_Minh", currency: "VND", paymentEnvironment: "SANDBOX", cinemaId: null, movieId: null, showtimeId: null });
export const reportFixtureSummary = (q: ReportRange, metrics = reportFixtureMetrics) => ({ period: reportFixturePeriod(q), metrics });
export const reportFixtureDaily = (q: ReportRange, metrics = reportFixtureMetrics) => ({ period: reportFixturePeriod(q), items: reportDates(q).map((date, index) => ({ date, metrics: index === 0 ? metrics : reportZeroMetrics })) });
export function reportFixtureRows(q: ReportRange, dimension: ReportDimension, page = 0, size = 10, total = 11) {
  return { period: reportFixturePeriod(q), dimension, page, size, totalElements: String(total), items: Array.from({ length: Math.max(0, Math.min(size, total - page * size)) }, (_, i) => ({
    id: String(BigInt("9007199254740993") + BigInt(page * size + i)), name: `${dimension === "CINEMA" ? "Rạp" : dimension === "MOVIE" ? "Phim" : "Phim / Rạp / Phòng"} ${page * size + i + 1}`,
    cinemaId: dimension === "SHOWTIME" ? "1" : null, movieId: dimension === "SHOWTIME" ? "2" : null, startsAt: dimension === "SHOWTIME" ? "2026-10-27T10:00:00Z" : null, metrics: reportFixtureMetrics,
  })) };
}
