import type { ReportMetrics, ReportRange, ReportDimension } from "@/features/admin/admin-report-service";

export type { ReportMetrics, ReportDimension };
export type ManagerReportFilters = ReportRange & { cinemaId?: string; movieId?: string; showtimeId?: string };
export type ManagerReportPeriod = ReportRange & {
  startInclusive: string; endExclusive: string; timezone: "Asia/Ho_Chi_Minh";
  currency: "VND"; paymentEnvironment: "SANDBOX";
  cinemaId: string | null; movieId: string | null; showtimeId: string | null;
};
export const REPORT_ACTIVITY_STATES = {
  bookingsByStatus: ["PENDING", "PAID", "EXPIRED", "CANCELLED"],
  paymentsByStatus: ["INITIATED", "PENDING", "SUCCESS", "FAILED", "CANCELLED"],
  ticketsByStatus: ["VALID", "CHECKED_IN", "EXPIRED", "CANCELLED"],
  showtimesByStatus: ["DRAFT", "SCHEDULED", "OPEN_FOR_BOOKING", "STARTED", "ENDED", "CANCELLED"],
} as const;
export type ManagerReportActivity = { [K in keyof typeof REPORT_ACTIVITY_STATES]: { status: typeof REPORT_ACTIVITY_STATES[K][number]; count: string }[] } & { checkedInTickets: string; reconciliationAttempts: string };
export type ManagerReportSummary = { period: ManagerReportPeriod; metrics: ReportMetrics; activity: ManagerReportActivity };
export type ManagerReportDay = { date: string; metrics: ReportMetrics; activity: ManagerReportActivity };
export type ManagerReportDaily = { period: ManagerReportPeriod; items: ManagerReportDay[] };
export type ManagerPerformance = { id: string; name: string; cinemaId: string | null; movieId: string | null; startsAt: string | null; metrics: ReportMetrics; activity: ManagerReportActivity };
export type ManagerReportBreakdowns = { period: ManagerReportPeriod; dimension: ReportDimension; page: number; size: number; totalElements: string; items: ManagerPerformance[] };
export type ManagerReportConcessions = { period: ManagerReportPeriod; page: number; size: number; totalElements: string; items: { id: string; name: string; category: "POPCORN" | "DRINK" | "COMBO"; quantity: string; grossAmount: string; confirmedBookings: string }[] };
export type ManagerReportQuery = { filters: ManagerReportFilters; dimension: ReportDimension; page: number; productPage: number };
