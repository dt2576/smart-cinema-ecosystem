import assert from "node:assert/strict";
import test from "node:test";
import { getManagerDashboard, getManagerReportSummary, getManagerReportDaily, getManagerReportBreakdowns, getManagerReportConcessions, parseManagerReportSummary, parseManagerReportDaily, parseManagerReportBreakdowns, parseManagerReportConcessions } from "@/features/manager/manager-report-api";
import { managerReportPreset, managerReportQuery, managerReportSearch, reportChartCeiling, reportMoney, reportOccupancy, reportRatio, reportUnits, reportRange } from "@/features/manager/manager-report-service";
import { managerLoginReturn } from "@/features/manager/manager-navigation";
import { OperationsApiError } from "@/features/manager/manager-api";
import { reportSummaryFixture, reportDailyFixture, reportBreakdownsFixture, reportConcessionsFixture, reportFixtureRange as q } from "../../../test/fixtures/manager-reporting.mjs";

test("Manager reporting navigation and dates use strict filters and exclusive Vietnam days", () => {
  assert.equal(managerLoginReturn("/manager/dashboard"), "/manager/dashboard"); assert.equal(managerLoginReturn("/manager/reports"), "/manager/reports");
  assert.equal(managerLoginReturn("//evil.test/manager/reports"), null);
  const now = new Date("2026-10-28T18:00:00Z"); assert.deepEqual(managerReportPreset(7, now), { from: "2026-10-23", to: "2026-10-30" });
  assert.deepEqual(reportRange("2026-05-10", "2026-05-16"), { range: { from: "2026-05-10", to: "2026-05-17" } });
  for (const raw of ["from=2026-02-30&to=2026-03-01", "from=2025-01-01&to=2026-01-03", "from=2026-01-01", "from=&to=", "from=2026-01-01&from=2026-01-02&to=2026-02-01", "foo=1", "cinemaId=01", "showtimeId=9223372036854775808", "movieId=1e2", "dimension=HALL", "page=-1", "page=01", "productPage=2147483648"]) assert.equal(managerReportQuery(raw, true), undefined, raw);
  const parsed = managerReportQuery("from=2024-01-01&to=2025-01-01&cinemaId=9223372036854775807&page=2147483647", true)!; assert.equal(parsed.filters.cinemaId, "9223372036854775807");
  assert.equal(managerReportQuery("dimension=MOVIE", false), undefined);
  assert.doesNotMatch(managerReportSearch({ ...parsed, filters: { ...parsed.filters, cinemaId: undefined } }), /undefined/);
});
test("Exact reporting money and BigInt geometry preserve arbitrary aggregate precision", () => {
  assert.equal(reportMoney("123456789012345678901234567890.1234"), "123.456.789.012.345.678.901.234.567.890,1234 ₫");
  assert.equal(reportOccupancy(null), "Chưa có dữ liệu"); assert.equal(reportOccupancy("68.5000"), "68,5%");
  assert.equal(reportRatio(reportUnits("0.0001"), reportUnits("0.0003")), 333);
  assert.equal(reportRatio(BigInt(5), BigInt(0)), 0); assert.equal(reportRatio(BigInt(10), BigInt(5)), 1000);
});
test("Chart scales preserve positive fractional and very large revenue without flattening to zero", () => {
  for (const amount of ["0.0001", "1000.0000", "26400000.0000", "123456789012345678901234567890.1234"]) {
    const units = reportUnits(amount), ceiling = reportChartCeiling(units);
    assert.ok(ceiling >= units); assert.ok(reportRatio(units, ceiling, 180) > 0);
  }
  assert.equal(reportChartCeiling(reportUnits("26400000.0000")), reportUnits("30000000.0000"));
  assert.equal(reportChartCeiling(BigInt(0)), BigInt(0));
});
test("Manager Summary projects all authoritative activity and strips unsolicited secrets", () => {
  const raw = { ...reportSummaryFixture(q), customerEmail: "private" };
  const result = parseManagerReportSummary(raw, q); assert.equal(result.metrics.confirmedRevenue, "128500000.0000"); assert.equal(result.activity.checkedInTickets, "1180"); assert.equal(result.period.cinemaId, "11"); assert.equal(Object.hasOwn(result, "customerEmail"), false);
  for (const mutate of [(v: typeof raw) => { v.metrics.confirmedRevenue = "1e3"; }, (v: typeof raw) => { Object.assign(v.activity.bookingsByStatus[0], { status: "SUCCESS" }); }, (v: typeof raw) => { v.activity.bookingsByStatus.pop(); }, (v: typeof raw) => { v.period.cinemaId = "12"; }, (v: typeof raw) => { v.period.startInclusive = "2026-05-10T00:00:00Z"; }, (v: typeof raw) => { v.metrics.occupancyPercent = null; }]) { const v = structuredClone(raw); mutate(v); assert.throws(() => parseManagerReportSummary(v, q)); }
});
test("Daily requires complete ordered local dates and validates every row", () => {
  const raw = reportDailyFixture(q); assert.equal(parseManagerReportDaily(raw, q).items.length, 7);
  for (const alter of [(v: typeof raw) => v.items.reverse(), (v: typeof raw) => v.items.pop(), (v: typeof raw) => { v.items[0].activity.checkedInTickets = "01"; }]) { const v = structuredClone(raw); alter(v); assert.throws(() => parseManagerReportDaily(v, q)); }
});
test("Rank pages reject stale identity, page totals, dimension and duplicate rows", () => {
  const raw = reportBreakdownsFixture(q); const r = parseManagerReportBreakdowns(raw, q, "MOVIE", 0, 5); assert.equal(r.items[0].id, "9007199254740993");
  for (const alter of [(v: typeof raw) => { Object.assign(v.items[0], { id: 1 }); }, (v: typeof raw) => { v.items[1].id = v.items[0].id; }, (v: typeof raw) => { v.page = 1; }, (v: typeof raw) => { v.dimension = "CINEMA"; }, (v: typeof raw) => { Object.assign(v, { totalElements: 5 }); }]) { const v = structuredClone(raw); alter(v); assert.throws(() => parseManagerReportBreakdowns(v, q, "MOVIE", 0, 5)); }
  const show = reportBreakdownsFixture(q, "SHOWTIME"); show.items[0].cinemaId = "99"; assert.throws(() => parseManagerReportBreakdowns(show, q, "SHOWTIME", 0, 5));
  assert.deepEqual(parseManagerReportBreakdowns(reportBreakdownsFixture(q,"MOVIE",3,5), q,"MOVIE",3,5).items, []);
});
test("Concessions preserve quantities and frozen gross, reject malformed categories and counts", () => {
  const raw = reportConcessionsFixture(q); assert.equal(parseManagerReportConcessions(raw,q,0,5).items[0].quantity,"420");
  for(const patch of [{quantity:420},{grossAmount:12},{category:"INVENTORY"},{id:"01"}]) { const v=structuredClone(raw);Object.assign(v.items[0],patch);assert.throws(()=>parseManagerReportConcessions(v,q,0,5)); }
});
test("All five Manager reads use exact authenticated GET contracts with no financial write", async () => {
  const original=globalThis.fetch; const calls: { url:string; init:RequestInit }[]=[];
  globalThis.fetch=async(input,init)=>{const url=String(input);calls.push({url,init:init!});return new Response(JSON.stringify(url.includes("/daily")?reportDailyFixture(q):url.includes("/breakdowns")?reportBreakdownsFixture(q):url.includes("/concessions")?reportConcessionsFixture(q):reportSummaryFixture(q)),{status:200});};
  try {
    const controller=new AbortController(); await getManagerDashboard("fixture",q,controller.signal);await getManagerReportSummary("fixture",q);await getManagerReportDaily("fixture",q);await getManagerReportBreakdowns("fixture",q,"MOVIE");await getManagerReportConcessions("fixture",q);
    assert.equal(calls.length,5);for(const c of calls){assert.match(c.url,/^\/api\/v1\/manager\//);assert.match(c.url,/from=2026-05-10&to=2026-05-17&cinemaId=11/);assert.equal(c.init.method,"GET");assert.equal(c.init.body,undefined);assert.equal(c.init.cache,"no-store");assert.equal(c.init.credentials,"omit");assert.equal((c.init.headers as Record<string,string>).Authorization,"Bearer fixture");assert.ok(c.init.signal);}
    assert.match(calls[3].url,/page=0&size=5&dimension=MOVIE/);assert.doesNotMatch(calls[4].url,/dimension/);
    assert.throws(()=>getManagerReportDaily("fixture",{...q,from:"2026-02-30"}));assert.throws(()=>getManagerReportBreakdowns("fixture",q,"MOVIE",-1));assert.throws(()=>getManagerReportConcessions("fixture",q,0,101));assert.equal(calls.length,5);
  } finally {globalThis.fetch=original;}
});
test("Report HTTP errors, Retry-After, malformed JSON and network failures stay safe",async()=>{
  const original=globalThis.fetch;
  try {
    for(const status of [400,401,403,404,409,429,503]){globalThis.fetch=async()=>new Response('private SQL',{status,headers:{'Retry-After':'1'}});await assert.rejects(getManagerDashboard('fixture',q),e=>e instanceof OperationsApiError&&e.status===status&&e.retryAfterMs===1000&&!e.message.includes('SQL'));}
    globalThis.fetch=async()=>new Response('{private',{status:200});await assert.rejects(getManagerDashboard('fixture',q),e=>e instanceof OperationsApiError&&e.status===502);
    globalThis.fetch=async()=>{throw new Error('private host')};await assert.rejects(getManagerDashboard('fixture',q),e=>e instanceof OperationsApiError&&e.status===0&&!e.message.includes('host'));
  }finally{globalThis.fetch=original;}
});
