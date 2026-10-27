import test from "node:test";
import assert from "node:assert/strict";
import { AdminReportApiError, getAdminDashboard, getAdminReportBreakdowns, getAdminReportDaily, getAdminReportSummary, parseReportBreakdowns, parseReportDaily, parseReportSummary } from "@/features/admin/admin-report-api";
import { reportAddDays, reportBarPermille, reportDates, reportMoney, reportOccupancy, reportPreset, reportRange, type ReportRange, type ReportDimension, type ReportMetrics } from "@/features/admin/admin-report-service";
const reportFixtureMetrics: ReportMetrics = {
  confirmedRevenue: "99990.0000", grossAmount: "100000.1234", discountAmount: "10.1234", seatGrossAmount: "80000.0000", concessionGrossAmount: "20000.1234",
  confirmedBookings: "1", ticketsSold: "1", guestsSold: "2", bookingsCreated: "7", showtimes: "3", capacitySeatUnits: "10", soldSeatUnits: "1", occupancyPercent: "10.0000",
};
const reportZeroMetrics: ReportMetrics = { ...Object.fromEntries(Object.keys(reportFixtureMetrics).map(key => [key, key.endsWith("Amount") || key === "confirmedRevenue" ? "0.0000" : "0"])), occupancyPercent: null } as ReportMetrics;
const reportFixturePeriod = (q: ReportRange) => ({ ...q, startInclusive: new Date(`${q.from}T00:00:00+07:00`).toISOString(), endExclusive: new Date(`${q.to}T00:00:00+07:00`).toISOString(), timezone: "Asia/Ho_Chi_Minh", currency: "VND", paymentEnvironment: "SANDBOX", cinemaId: null, movieId: null, showtimeId: null });
const reportFixtureSummary = (q: ReportRange, metrics = reportFixtureMetrics) => ({ period: reportFixturePeriod(q), metrics });
const reportFixtureDaily = (q: ReportRange, metrics = reportFixtureMetrics) => ({ period: reportFixturePeriod(q), items: reportDates(q).map((date, index) => ({ date, metrics: index === 0 ? metrics : reportZeroMetrics })) });
function reportFixtureRows(q: ReportRange, dimension: ReportDimension, page = 0, size = 10, total = 11) {
  return { period: reportFixturePeriod(q), dimension, page, size, totalElements: String(total), items: Array.from({ length: Math.max(0, Math.min(size, total - page * size)) }, (_, i) => ({
    id: String(BigInt("9007199254740993") + BigInt(page * size + i)), name: `${dimension === "CINEMA" ? "Rạp" : dimension === "MOVIE" ? "Phim" : "Phim / Rạp / Phòng"} ${page * size + i + 1}`,
    cinemaId: dimension === "SHOWTIME" ? "1" : null, movieId: dimension === "SHOWTIME" ? "2" : null, startsAt: dimension === "SHOWTIME" ? "2026-10-27T10:00:00Z" : null, metrics: reportFixtureMetrics,
  })) };
}


const q = { from: "2026-10-27", to: "2026-10-29" };
test("Vietnam presets are dynamic across UTC day, month and leap-year boundaries", () => {
  const time = new Date("2026-10-26T17:00:00Z");
  assert.deepEqual(reportPreset("today", time), { from: "2026-10-27", to: "2026-10-28" });
  assert.deepEqual(reportPreset("week", time), { from: "2026-10-21", to: "2026-10-28" });
  assert.deepEqual(reportPreset("month", new Date("2024-02-29T17:00:00Z")), { from: "2024-03-01", to: "2024-03-02" });
});
test("inclusive dates convert to exclusive API end without changing user's calendar", () => {
  assert.deepEqual(reportRange("2026-10-27", "2026-10-27"), { range: { from: "2026-10-27", to: "2026-10-28" } });
  assert.equal(reportAddDays("2024-02-28", 1), "2024-02-29");assert.equal(reportAddDays("0099-12-31", 1), "0100-01-01");
  assert.equal(reportDates({ from: "2024-01-01", to: "2025-01-01" }).length, 366);
});
test("invalid missing reversed too-long and unrepresentable ranges never silently normalize", () => {
  for (const [from, until] of [["", ""], ["2026-02-30", "2026-03-01"], ["2026-10-28", "2026-10-27"], ["2024-01-01", "2025-01-01"], ["0000-01-01", "0001-01-01"], ["9999-12-31", "9999-12-31"], ["2026-1-01", "2026-10-27"]]) assert.ok(reportRange(from, until).error);
});
test("arbitrary aggregate precision and null occupancy remain exact", () => {
  assert.equal(reportMoney("1999999999999998.1234"), "1.999.999.999.999.998,1234 ₫");assert.equal(reportMoney("0.0000"), "0 ₫");
  assert.equal(reportOccupancy(null), "Chưa có dữ liệu");assert.equal(reportOccupancy("0.0000"), "0%");
  assert.equal(reportBarPermille("0.0000", BigInt(0)), 0);assert.equal(reportBarPermille("1.0000", BigInt(30000)), 333);
});
test("valid summary zeros and huge exact strings are accepted without coercion", () => {
  const body = reportFixtureSummary(q, { ...reportZeroMetrics, confirmedRevenue: "1999999999999998.1234" });
  assert.equal(parseReportSummary(body, q).metrics.confirmedRevenue, body.metrics.confirmedRevenue);
});
test("mismatched period, environment, malformed metrics and unknown authority are rejected", () => {
  const body = reportFixtureSummary(q);
  for (const raw of [null, {}, { ...body, period: { ...body.period, from: "2026-10-26" } }, { ...body, period: { ...body.period, paymentEnvironment: "LIVE" } }, { ...body, period: { ...body.period, cinemaId: "1" } },
    ...[99990, "NaN", "-1.0000", "1e3", "01.0000"].map(confirmedRevenue => ({ ...body, metrics: { ...body.metrics, confirmedRevenue } })), { ...body, metrics: { ...body.metrics, ticketsSold: 1 } }, { ...body, metrics: { ...body.metrics, occupancyPercent: null } }])
    assert.throws(() => parseReportSummary(raw, q), AdminReportApiError);
});
test("daily series must be complete ordered zero-filled dates in the requested range", () => {
  const body = reportFixtureDaily(q);assert.equal(parseReportDaily(body, q).items.length, 2);
  for (const items of [body.items.slice(0, 1), [...body.items].reverse(), [body.items[0], body.items[0]]]) assert.throws(() => parseReportDaily({ ...body, items }, q), AdminReportApiError);
});
test("dimension-specific identity metadata and paginated count are checked", () => {
  for (const dimension of ["CINEMA", "MOVIE", "SHOWTIME"] as const) {
    const body = reportFixtureRows(q, dimension);assert.equal(parseReportBreakdowns(body, q, dimension, 0, 10).items[0].id, "9007199254740993");
    assert.throws(() => parseReportBreakdowns({ ...body, page: 1 }, q, dimension, 0, 10), AdminReportApiError);
    assert.throws(() => parseReportBreakdowns({ ...body, totalElements: "1" }, q, dimension, 0, 10), AdminReportApiError);
    const bad = structuredClone(body);bad.items[0].id = "01";assert.throws(() => parseReportBreakdowns(bad, q, dimension, 0, 10), AdminReportApiError);
  }
});
test("duplicate rows and wrong dimension metadata are rejected", () => {
  const body = reportFixtureRows(q, "SHOWTIME");body.items[1].id = body.items[0].id;assert.throws(() => parseReportBreakdowns(body, q, "SHOWTIME", 0, 10), AdminReportApiError);
  const wrong = reportFixtureRows(q, "CINEMA");wrong.items[0].cinemaId = "1";assert.throws(() => parseReportBreakdowns(wrong, q, "CINEMA", 0, 10), AdminReportApiError);
});
test("all four adapters make only authenticated no-store GETs with exact query and cancellation", async () => {
  const original = global.fetch;const paths: string[] = [];
  global.fetch = async (input, init) => {
    const url = new URL(String(input), "http://local.test");paths.push(url.pathname);assert.equal(url.searchParams.get("from"), q.from);assert.equal(url.searchParams.get("to"), q.to);
    assert.equal(init?.method, "GET");assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer fixture");assert.equal(init?.cache, "no-store");assert.equal(init?.redirect, "error");assert.equal(init?.body, undefined);assert.ok(init?.signal);
    return Response.json(url.pathname.endsWith("daily") ? reportFixtureDaily(q) : url.pathname.endsWith("breakdowns") ? reportFixtureRows(q, "SHOWTIME", 0, 10) : reportFixtureSummary(q));
  };
  try { await getAdminDashboard("fixture", q);await getAdminReportSummary("fixture", q);await getAdminReportDaily("fixture", q);await getAdminReportBreakdowns("fixture", q, "SHOWTIME");assert.equal(paths.length, 4); }
  finally { global.fetch = original; }
});
test("unsafe period or paging is rejected before any HTTP read", async () => {
  const original = global.fetch;let calls = 0;global.fetch = async () => { calls++;throw new Error("unexpected"); };
  try { await assert.rejects(getAdminDashboard("fixture", { ...q, to: q.from }), AdminReportApiError);assert.throws(() => getAdminReportBreakdowns("fixture", q, "CINEMA", -1), AdminReportApiError);assert.equal(calls, 0); }
  finally { global.fetch = original; }
});
test("safe status errors never reflect raw details and respect Retry-After without retries", async () => {
  const original = global.fetch;let calls = 0;
  try { for (const status of [400, 401, 403, 429, 503]) {
    global.fetch = async () => { calls++;return Response.json({ detail: "private SQL credential" }, { status, headers: { "Retry-After": "2" } }); };
    await assert.rejects(getAdminDashboard("fixture", q), (error: unknown) => error instanceof AdminReportApiError && error.status === status && error.retryAfter === 2 && !error.message.includes("private"));
  }assert.equal(calls, 5); } finally { global.fetch = original; }
});
test("network, malformed JSON, unexpected status and cancellation have safe outcomes", async () => {
  const original = global.fetch;
  try {
    global.fetch = async () => { throw new Error("private"); };await assert.rejects(getAdminDashboard("fixture", q), (e: unknown) => e instanceof AdminReportApiError && e.status === 0);
    global.fetch = async () => new Response("bad", { status: 200 });await assert.rejects(getAdminDashboard("fixture", q), AdminReportApiError);
    global.fetch = async () => Response.json(reportFixtureSummary(q), { status: 201 });await assert.rejects(getAdminDashboard("fixture", q), AdminReportApiError);
    const abort = new AbortController();abort.abort();global.fetch = async (_input, init) => { assert.ok(init?.signal?.aborted);throw abort.signal.reason; };await assert.rejects(getAdminDashboard("fixture", q, abort.signal));
  } finally { global.fetch = original; }
});
