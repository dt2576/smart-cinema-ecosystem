import { expect, test } from "@playwright/test";
import { installManagerReportingFixtures } from "../fixtures/manager-reporting-browser.mjs";
import { reportDailyFixture } from "../fixtures/manager-reporting.mjs";
import { reportMoney } from "../../src/features/admin/admin-report-service";

const dashboard = "/manager/dashboard?from=2026-05-10&to=2026-05-17&cinemaId=11";
const reports = "/manager/reports?from=2026-05-01&to=2026-05-17&cinemaId=11";
// Isolated HTTP response fixtures, not authenticated PRIMARY/financial evidence.
test("reporting navigation, exact KPI and all five authenticated read contracts", async ({ page }) => {
  const state = await installManagerReportingFixtures(page); await page.goto(dashboard);
  await expect(page.getByRole("heading", { name: "Tổng quan", exact: true })).toBeVisible();
  await expect(page.getByText("128.500.000 ₫", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Tổng quan", exact: true })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: /Xem toàn bộ phim/ }).click();
  await expect(page.getByRole("heading", { name: "Bắp nước bán chạy", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/from=2026-05-10&to=2026-05-17&cinemaId=11/);
  expect(new Set(state.requests.filter(r=>r.path.includes("reports/")||r.path.endsWith("dashboard")).map(r=>r.path)).size).toBe(5);
  expect(state.requests.every(r=>r.method==="GET"&&r.authorization==="Bearer fixture-manager-reporting")).toBe(true); expect(state.writes).toEqual([]);
});
test("inclusive input days become exclusive API dates, Cinema filters and reload persist", async ({ page }) => {
  const state = await installManagerReportingFixtures(page); await page.goto(reports);
  await page.getByLabel("Rạp chiếu phim", { exact: true }).selectOption("12");
  await page.getByLabel("Từ ngày", { exact: true }).fill("2026-10-27"); await page.getByLabel("Đến hết ngày", { exact: true }).fill("2026-10-28");
  await page.getByRole("button", { name: "Áp dụng bộ lọc", exact: true }).click();
  await expect(page).toHaveURL(/from=2026-10-27&to=2026-10-29&cinemaId=12/);
  await expect(page.getByRole("heading", { name: "Bắp nước bán chạy", exact: true })).toBeVisible(); await page.reload();
  await expect(page.getByLabel("Rạp chiếu phim", { exact: true })).toHaveValue("12"); await expect(page.getByLabel("Đến hết ngày", { exact: true })).toHaveValue("2026-10-28");
  expect(state.writes).toEqual([]);
});
test("ranking dimensions and independent pagination retain filters and bigint identities", async ({ page }) => {
  const state = await installManagerReportingFixtures(page); state.large = true; await page.goto(reports);
  await expect(page.getByText("ID: 9007199254740993", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Trang kết quả sau", exact: true }).click(); await expect(page).toHaveURL(/page=1/);
  await expect(page.getByText("ID: 9007199254740998", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Theo suất chiếu", exact: true }).click(); await expect(page).toHaveURL(/dimension=SHOWTIME/); await expect(page).not.toHaveURL(/&page=1/);
  await page.getByRole("button", { name: "Theo rạp", exact: true }).click(); await expect(page).toHaveURL(/dimension=CINEMA/);
  await expect(page.getByRole("heading", { name: "Bắp nước bán chạy", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Trang món sau", exact: true }).click(); await expect(page).toHaveURL(/productPage=1/);
  await expect(page.getByText("Hiển thị 3 trên 8 món", { exact: true })).toBeVisible(); expect(state.writes).toEqual([]);
});
test("zero revenue, no rankings and unavailable capacity remain truthful", async ({ page }) => {
  const state = await installManagerReportingFixtures(page); state.empty = true; await page.goto(dashboard);
  await expect(page.getByText("Chưa có doanh thu xác nhận trong kỳ.")).toBeVisible(); await expect(page.getByText("Chưa có dữ liệu", { exact: true })).toBeVisible();
  await expect(page.getByText("Chưa có phim trong kỳ báo cáo.")).toBeVisible(); await page.goto(reports);
  await expect(page.getByText("Chưa có bắp nước đã bán trong kỳ.")).toBeVisible(); expect(state.writes).toEqual([]);
});
test("beyond-last product page does not claim the period has no sales and recovers safely",async({page})=>{
  const state=await installManagerReportingFixtures(page);await page.goto(`${reports}&productPage=999`);
  await expect(page.getByText("Trang này chưa có mặt hàng.",{exact:true})).toBeVisible();
  await expect(page.getByText("Chưa có bắp nước đã bán trong kỳ.",{exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Về trang đầu bắp nước",exact:true}).click();
  await expect(page.getByText("Hiển thị 5 trên 5 món",{exact:true})).toBeVisible();await expect(page).not.toHaveURL(/productPage=/);expect(state.writes).toEqual([]);
});
test("daily exact values are keyboard readable and chart bars select real fixture days", async ({ page }) => {
  await installManagerReportingFixtures(page); await page.goto(reports);
  const amount=reportMoney(reportDailyFixture({from:"2026-05-01",to:"2026-05-17",cinemaId:"11"}).items[0].metrics.confirmedRevenue);
  const point = page.getByRole("button", { name: `01/05/2026: ${amount}, 1.256 vé`, exact: true });
  await point.focus(); await expect(point).toBeFocused(); await page.keyboard.press("Enter");
  await page.getByText("Xem dữ liệu theo ngày", { exact: true }).click();
  await expect(page.getByRole("region", { name: "Bảng doanh thu theo ngày", exact: true })).toBeVisible();
  await expect(page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "01/05/2026", exact: true }) })).toContainText(amount);
});
test("date validation and tampered route queries never dispatch unsupported report reads", async ({ page }) => {
  const state=await installManagerReportingFixtures(page); await page.goto(reports);
  await expect(page.getByRole("heading",{name:"Bắp nước bán chạy",exact:true})).toBeVisible(); const before=state.requests.length;
  await page.getByLabel("Từ ngày",{exact:true}).fill("2025-01-01"); await page.getByLabel("Đến hết ngày",{exact:true}).fill("2026-10-29");await page.getByRole("button",{name:"Áp dụng bộ lọc",exact:true}).click();
  await expect(page.getByRole("form",{name:"Bộ lọc báo cáo"}).getByRole("alert")).toContainText("366 ngày"); expect(state.requests.length).toBe(before);
  await page.goto("/manager/reports?cinemaId=01&dimension=HALL");await expect(page.getByRole("heading",{name:"Bộ lọc chưa hợp lệ"})).toBeVisible();
  expect(state.requests.filter(r=>r.query.includes("dimension=HALL"))).toEqual([]);
});
test("quick presets, reset and safe explicit refresh are functional GETs", async ({ page }) => {
  const state=await installManagerReportingFixtures(page);await page.goto(dashboard);await page.getByRole("button",{name:"30 ngày",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Phim bán chạy",exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"30 ngày",exact:true})).toHaveAttribute("aria-pressed","true");
  const count=state.requests.filter(r=>r.path.endsWith("dashboard")).length;await page.getByRole("button",{name:"Làm mới dữ liệu",exact:true}).click();await expect(page.getByRole("heading",{name:"Phim bán chạy",exact:true})).toBeVisible();
  expect(state.requests.filter(r=>r.path.endsWith("dashboard")).length).toBe(count+1);expect(state.writes).toEqual([]);
  await page.goto(reports);await page.getByRole("button",{name:"Đặt lại",exact:true}).click();await expect(page.getByLabel("Rạp chiếu phim",{exact:true})).toHaveValue("");
});
test("old delayed reads cannot replace a newer date range", async ({ page }) => {
  const state=await installManagerReportingFixtures(page);state.delay=1200;await page.goto(reports);
  await expect(page.getByRole("status")).toContainText("Đang tải báo cáo");state.delay=0;
  await page.getByLabel("Từ ngày",{exact:true}).fill("2026-10-28");await page.getByLabel("Đến hết ngày",{exact:true}).fill("2026-10-29");await page.getByRole("button",{name:"Áp dụng bộ lọc",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Bắp nước bán chạy",exact:true})).toBeVisible();await page.waitForTimeout(1400);
  await expect(page.getByLabel("Từ ngày",{exact:true})).toHaveValue("2026-10-28");await expect(page.getByRole("heading",{name:"Bắp nước bán chạy",exact:true})).toBeVisible();
});
for(const status of [400,401,403,404,409,429,503]) test(`report safe ${status} without automatic retry or private payload`,async({page})=>{
  const state=await installManagerReportingFixtures(page);state.failure=status;await page.goto(reports);
  await expect(page.getByRole("heading",{name:"Chưa tải được báo cáo"})).toBeVisible();await expect(page.getByText("private SQL must not render")).toHaveCount(0);
  const count=state.requests.length;await page.waitForTimeout(1100);expect(state.requests.length).toBe(count);
  if(status===401){await expect(page.getByRole("link",{name:"Đăng nhập lại",exact:true})).toHaveAttribute("href","/login?returnTo=%2Fmanager%2Freports");}
  else {state.failure=0;await page.getByRole("button",{name:"Kiểm tra lại",exact:true}).click();await expect(page.getByRole("heading",{name:"Bắp nước bán chạy",exact:true})).toBeVisible();}
  expect(state.writes).toEqual([]);
});
for(const mode of ["malformed","mismatch","network"] as const)test(`report ${mode} recovery hides stale and untrusted values`,async({page})=>{
  const state=await installManagerReportingFixtures(page);state[mode]=true;await page.goto(dashboard);await expect(page.getByRole("heading",{name:"Chưa tải được báo cáo"})).toBeVisible();
  await expect(page.getByText("128.500.000 ₫",{exact:true})).toHaveCount(0);state[mode]=false;await page.getByRole("button",{name:"Kiểm tra lại",exact:true}).click();await expect(page.getByRole("heading",{name:"Phim bán chạy",exact:true})).toBeVisible();expect(state.writes).toEqual([]);
});
for(const role of ["CUSTOMER","STAFF","ADMIN"])test(`stored ${role} cannot bypass current Manager scope`,async({page})=>{
  const state=await installManagerReportingFixtures(page,role);await page.goto(reports);await expect(page.getByRole("heading",{name:"Khu vực quản lý rạp"})).toBeVisible();await expect(page.getByRole("heading",{name:"Báo cáo & Thống kê"})).toHaveCount(0);expect(state.requests.some(r=>r.path.includes("/reports/"))).toBe(false);
});
test("long exact aggregate and Vietnamese text fit mobile without financial rounding",async({page})=>{
  const state=await installManagerReportingFixtures(page);state.huge=true;await page.setViewportSize({width:390,height:844});await page.goto(dashboard);
  await expect(page.getByText("123.456.789.012.345.678.901.234.567.890,1234 ₫",{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(state.writes).toEqual([]);
});
test("anonymous direct entry and login resume use the canonical reporting route",async({page})=>{
  await installManagerReportingFixtures(page);await page.addInitScript(()=>localStorage.removeItem('smart-cinema.auth-session'));await page.goto('/manager/reports');
  await page.getByRole('link',{name:'Đăng nhập',exact:true}).click();await expect(page).toHaveURL(/returnTo=%2Fmanager%2Freports/);
  await page.route('**/api/v1/auth/tokens',r=>r.fulfill({status:200,json:{accessToken:'fixture-manager-reporting',tokenType:'Bearer',expiresIn:3600,refreshToken:'fixture-only',refreshExpiresIn:86400,userId:61,email:'manager@example.test',fullName:'Quản lý QA',role:'MANAGER'}}));
  await page.getByLabel('Địa chỉ email',{exact:true}).fill('manager@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('fixture-only-password');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await expect(page).toHaveURL(/\/manager\/reports$/);await expect(page.getByRole('heading',{name:'Bắp nước bán chạy',exact:true})).toBeVisible();
});
test("Back and Forward restore filters while every view remains server-read only",async({page})=>{
  const state=await installManagerReportingFixtures(page);await page.goto(reports);await page.getByRole('button',{name:'Theo rạp',exact:true}).click();await expect(page).toHaveURL(/dimension=CINEMA/);
  await page.goBack();await expect(page.getByRole('button',{name:'Theo phim',exact:true})).toHaveAttribute('aria-pressed','true');await page.goForward();await expect(page.getByRole('button',{name:'Theo rạp',exact:true})).toHaveAttribute('aria-pressed','true');expect(state.writes).toEqual([]);
});
test("revoked effective scope hides previously rendered data on next recheck",async({page})=>{
  const state=await installManagerReportingFixtures(page);await page.goto(dashboard);await expect(page.getByRole('heading',{name:'Phim bán chạy',exact:true})).toBeVisible();state.denied=true;await page.getByRole('button',{name:'Làm mới dữ liệu',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Chưa tải được báo cáo'})).toBeVisible();await expect(page.getByText('128.500.000 ₫',{exact:true})).toHaveCount(0);expect(state.writes).toEqual([]);
});
for(const route of ["dashboard","reports"])for(const width of [1440,1280,768,390])test(`${route} ${width}px responsive, actual fonts, keyboard and no overflow`,async({page})=>{
  await installManagerReportingFixtures(page);await page.setViewportSize({width,height:1000});await page.goto(route==="dashboard"?dashboard:reports);
  await expect(page.getByRole("heading",{name:route==="dashboard"?"Phim bán chạy":"Bắp nước bán chạy",exact:true})).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);expect(await page.locator("h1").evaluate(n=>getComputedStyle(n).fontFamily)).toContain("Space Grotesk");expect(await page.locator("select").evaluate(n=>getComputedStyle(n).fontFamily)).toContain("Plus Jakarta Sans");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(width<1024){const opener=page.getByRole("button",{name:"Mở điều hướng quản lý rạp"});await opener.click();await expect(page.getByRole("dialog")).toBeVisible();await page.keyboard.press("Escape");await expect(opener).toBeFocused();}
  await page.getByLabel("Từ ngày",{exact:true}).focus();await expect(page.getByLabel("Từ ngày",{exact:true})).toBeFocused();
  expect(await page.getByLabel("Từ ngày",{exact:true}).evaluate(n=>getComputedStyle(n).outlineStyle)).not.toBe("none");
  expect(await page.getByRole("button",{name:route==="dashboard"?"Áp dụng":"Áp dụng bộ lọc",exact:true}).evaluate(n=>n.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
});
