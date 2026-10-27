import { expect, test, type Page } from "@playwright/test";
import { reportFixtureDaily, reportFixtureMetrics, reportFixtureRows, reportFixtureSummary, reportZeroMetrics } from "../fixtures/admin-reporting";
import type { ReportDimension } from "../../src/features/admin/admin-report-service";

// HTTP fixtures, not operational Payment/Booking or signed-provider evidence.
async function setup(page: Page) {
  await page.clock.install({ time: new Date("2026-10-26T17:00:00Z") });
  await page.addInitScript(() => localStorage.setItem("smart-cinema.auth-session", JSON.stringify({ accessToken: "fixture-admin", tokenType: "Bearer", expiresAt: Date.now() + 3600000, refreshToken: "fixture-refresh", refreshExpiresAt: Date.now() + 86400000, user: { id: 1, email: "admin@example.test", fullName: "Quản trị test", role: "ADMIN" } })));
  await page.route("**/api/v1/admin", r => r.fulfill({ json: { id: "1", fullName: "Quản trị test", role: "ADMIN" } }));
  const state = { requests: [] as URL[], zero: false, huge: false };
  await page.route("**/api/v1/admin/**", async r => {
    expect(r.request().method()).toBe("GET");expect(r.request().headers().authorization).toBe("Bearer fixture-admin");
    const url = new URL(r.request().url());state.requests.push(url);
    const q = { from: url.searchParams.get("from")!, to: url.searchParams.get("to")! };
    expect(Object.keys(Object.fromEntries(url.searchParams)).every(k => ["from", "to", "dimension", "page", "size"].includes(k))).toBe(true);
    const metrics = state.zero ? reportZeroMetrics : state.huge ? { ...reportFixtureMetrics, confirmedRevenue: "1999999999999998.0000" } : reportFixtureMetrics;
    const body = url.pathname.endsWith("daily") ? reportFixtureDaily(q, metrics) : url.pathname.endsWith("breakdowns") ? reportFixtureRows(q, url.searchParams.get("dimension") as ReportDimension, Number(url.searchParams.get("page")), Number(url.searchParams.get("size")), state.zero ? 0 : 11) : reportFixtureSummary(q, metrics);
    return r.fulfill({ json: body });
  });
  return state;
}
test("dashboard has exactly four real-field KPIs and consistent dynamic period/chart/link", async ({ page }) => {
  const state = await setup(page);await page.goto("/admin");
  const cards = page.getByRole("definition");await expect(cards).toHaveCount(4);await expect(cards.first()).toHaveText("99.990 ₫");
  for (const [label, from] of [["Hôm nay", "2026-10-27"], ["7 ngày qua", "2026-10-21"], ["Tháng này", "2026-10-01"]]) {
    await page.getByRole("button", { name: label, exact: true }).click();await expect(page.getByRole("img", { name: "Doanh thu theo ngày" })).toBeVisible();
    expect(state.requests.slice(-2).every(r => r.searchParams.get("from") === from && r.searchParams.get("to") === "2026-10-28")).toBe(true);
  }
  await page.getByRole("link", { name: "Xem báo cáo chi tiết" }).click();await expect(page.getByRole("heading", { name: "Báo cáo", exact: true })).toBeVisible();
  await expect(page.getByLabel("Đến ngày", { exact: true })).toHaveValue("2026-10-27");await expect(cards.first()).toHaveText("99.990 ₫");
  await expect(page.getByText(/đồng bộ|dự báo|Quản lý vé/i)).toHaveCount(0);
});
test("inclusive filter submits once with exclusive end and survives reload", async ({ page }) => {
  const state = await setup(page);await page.goto("/admin/reports");await expect(page.getByRole("definition")).toHaveCount(5);
  await page.getByLabel("Từ ngày", { exact: true }).fill("2024-02-28");await page.getByLabel("Đến ngày", { exact: true }).fill("2024-02-29");await page.getByRole("button", { name: "Xem báo cáo", exact: true }).click();
  await expect(page).toHaveURL(/from=2024-02-28&to=2024-03-01/);await expect(page.getByRole("definition")).toHaveCount(5);
  expect(state.requests.slice(-3).every(r => r.searchParams.get("to") === "2024-03-01")).toBe(true);
  await page.reload();await expect(page.getByLabel("Đến ngày", { exact: true })).toHaveValue("2024-02-29");
});
test("invalid missing reversed and over-limit dates do not fetch or change inputs", async ({ page }) => {
  const state = await setup(page);await page.goto("/admin/reports");await expect(page.getByRole("definition")).toHaveCount(5);const before = state.requests.length;
  for (const [from, to, message] of [["", "", /chọn đủ/], ["2026-10-28", "2026-10-27", /Ngày kết thúc phải/], ["2024-01-01", "2025-01-01", /tối đa 366/]] as const) {
    await page.getByLabel("Từ ngày", { exact: true }).fill(from);await page.getByLabel("Đến ngày", { exact: true }).fill(to);await page.getByRole("button", { name: "Xem báo cáo", exact: true }).click();await expect(page.locator("#report-date-error")).toContainText(message);await expect(page.getByLabel("Từ ngày", { exact: true })).toHaveValue(from);
  }
  expect(state.requests.length).toBe(before);
});
test("all dimensions and backend pagination work and changing dimension resets page", async ({ page }) => {
  const state = await setup(page);await page.goto("/admin/reports");await expect(page.getByText("11 kết quả · Trang 1")).toBeVisible();
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();await expect(page.getByText("11 kết quả · Trang 2")).toBeVisible();await expect(page.getByRole("button", { name: "Trang sau", exact: true })).toBeDisabled();
  for (const [name, dimension] of [["Theo phim", "MOVIE"], ["Theo suất chiếu", "SHOWTIME"], ["Theo rạp", "CINEMA"]]) {
    await page.getByRole("button", { name, exact: true }).click();await expect(page.getByText("11 kết quả · Trang 1")).toBeVisible();expect(state.requests.at(-1)?.searchParams.get("dimension")).toBe(dimension);
  }
});
test("stale slow dimension response cannot overwrite newer selection", async ({ page }) => {
  await setup(page);await page.route("**/api/v1/admin/reports/breakdowns?**", async r => {
    const url = new URL(r.request().url()), dimension = url.searchParams.get("dimension") as ReportDimension;
    if (dimension === "MOVIE") await new Promise(resolve => setTimeout(resolve, 700));
    await r.fulfill({ json: reportFixtureRows({ from: url.searchParams.get("from")!, to: url.searchParams.get("to")! }, dimension, 0, 10) }).catch(() => {});
  });
  await page.goto("/admin/reports");await page.getByRole("button", { name: "Theo phim", exact: true }).click();await page.getByRole("button", { name: "Theo suất chiếu", exact: true }).click();
  await expect(page.getByRole("rowheader", { name: /Phim \/ Rạp \/ Phòng 1/ }).first()).toBeVisible();await page.waitForTimeout(800);await expect(page.getByRole("button", { name: "Theo suất chiếu", exact: true })).toHaveAttribute("aria-pressed", "true");await expect(page.getByRole("rowheader", { name: "Phim 1", exact: true })).toHaveCount(0);
});
test("forged direct date query never makes a report request", async ({ page }) => {
  const state = await setup(page);await page.goto("/admin/reports?from=2026-02-30&to=2026-03-02");await expect(page.locator("#report-date-error")).toContainText("liên kết chưa hợp lệ");expect(state.requests).toHaveLength(0);
});
test("zero revenue and empty dataset remain truthful, null occupancy is not zero", async ({ page }) => {
  const state = await setup(page);state.zero = true;await page.goto("/admin/reports");await expect(page.getByRole("definition").first()).toHaveText("0 ₫");await expect(page.getByRole("definition").nth(3)).toHaveText("Chưa có dữ liệu");await expect(page.getByRole("heading", { name: "Chưa có dữ liệu trong kỳ" })).toBeVisible();await expect(page.getByText("Chưa có doanh thu xác nhận trong kỳ.")).toBeVisible();
});
for (const status of [400, 429, 503]) test(`safe ${status} feedback and manual recovery without raw error details`, async ({ page }) => {
  await setup(page);let calls = 0;await page.route("**/api/v1/admin/dashboard?**", r => { calls++;return r.fulfill({ status, headers: { "Retry-After": "1" }, json: { detail: "private SQL credentials" } }); });
  await page.goto("/admin");await expect(page.getByRole("heading", { name: "Chưa tải được báo cáo" })).toBeVisible();await expect(page.getByText("private SQL credentials")).toHaveCount(0);expect(calls).toBe(1);
  await page.unroute("**/api/v1/admin/dashboard?**");if (status === 429) await expect(page.getByRole("button", { name: "Thử lại", exact: true })).toBeEnabled();await page.getByRole("button", { name: "Thử lại", exact: true }).click();await expect(page.getByRole("definition")).toHaveCount(4);
});
for (const kind of ["network", "malformed", "mismatch"]) test(`${kind} report is unavailable rather than fabricated zero`, async ({ page }) => {
  await setup(page);await page.route("**/api/v1/admin/dashboard?**", r => kind === "network" ? r.abort() : r.fulfill({ json: kind === "malformed" ? {} : reportFixtureSummary({ from: "2020-01-01", to: "2020-01-02" }) }));await page.goto("/admin");await expect(page.getByRole("heading", { name: "Chưa tải được báo cáo" })).toBeVisible();await expect(page.getByRole("definition")).toHaveCount(0);
});
test("loading feedback precedes real-field values", async ({ page }) => {
  await setup(page);await page.route("**/api/v1/admin/dashboard?**", async r => { await new Promise(resolve => setTimeout(resolve, 700));const url = new URL(r.request().url());await r.fulfill({ json: reportFixtureSummary({ from: url.searchParams.get("from")!, to: url.searchParams.get("to")! }) }); });await page.goto("/admin");await expect(page.getByText("Đang tải báo cáo…")).toBeVisible();await expect(page.getByRole("definition")).toHaveCount(4);
});
for (const role of ["CUSTOMER", "STAFF", "MANAGER"]) test(`${role} cannot render report data through forged local ADMIN state`, async ({ page }) => {
  const state = await setup(page);await page.route("**/api/v1/admin", r => r.fulfill({ status: 403, json: {} }));await page.goto("/admin/reports");await expect(page.getByRole("heading", { name: "Không có quyền quản trị" })).toBeVisible();expect(state.requests).toHaveLength(0);
});
test("anonymous and expired/forbidden report sessions reveal no metrics", async ({ page }) => {
  await page.goto("/admin/reports");await expect(page.getByRole("heading", { name: "Cần đăng nhập" })).toBeVisible();await setup(page);
  for (const status of [401, 403]) {
    await page.route("**/api/v1/admin/dashboard?**", r => r.fulfill({ status, json: {} }));await page.goto("/admin");await expect(page.getByRole("heading", { name: "Không có quyền quản trị" })).toBeVisible();await expect(page.getByRole("definition")).toHaveCount(0);
  }
});
for (const width of [390, 768, 1440]) test(`responsive long amounts keyboard focus and readable controls at ${width}px`, async ({ page }) => {
  const state = await setup(page);state.huge = true;await page.setViewportSize({ width, height: 1000 });await page.emulateMedia({ reducedMotion: "reduce" });await page.goto("/admin");await expect(page.getByRole("definition").first()).toHaveText("1.999.999.999.999.998 ₫");
  await page.getByRole("button", { name: "Hôm nay", exact: true }).focus();await page.keyboard.press("Enter");await expect(page.getByRole("button", { name: "Hôm nay", exact: true })).toBeFocused();
  expect(await page.getByRole("button", { name: "Hôm nay", exact: true }).evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
  await page.getByRole("link", { name: "Xem báo cáo chi tiết" }).click();await expect(page.getByRole("definition")).toHaveCount(5);await page.getByText("Xem dữ liệu theo ngày", { exact: true }).focus();await page.keyboard.press("Enter");await expect(page.getByRole("region", { name: "Bảng doanh thu theo ngày" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const control of await page.locator("#admin-content button, #admin-content input").all()) { const box = await control.boundingBox();if (box) { expect(box.height).toBeGreaterThanOrEqual(44);expect(await control.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16); } }
});
