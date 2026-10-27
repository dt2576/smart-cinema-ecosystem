import { expect, test, type Page } from "@playwright/test";

// HTTP fixtures only. The separate local harness verifies the actual Spring/PostgreSQL workflow.
const BASE = "/admin/promotions", API = "/api/v1/admin/promotions";
const item = { id: "9007199254740993", code: "XEMPHIM20", discountType: "PERCENTAGE", discountValue: "20.1234", maxDiscountAmount: "50000.4321", minimumOrderAmount: "150000.0000", usageLimit: 500, validFrom: "2026-10-27T02:00:00.000001Z", validUntil: "2026-11-30T16:59:00.123456Z", status: "ACTIVE" };
async function setup(page: Page, initial = [item]) {
  await page.addInitScript(() => localStorage.setItem("smart-cinema.auth-session", JSON.stringify({ accessToken: "fixture-admin", tokenType: "Bearer", expiresAt: Date.now() + 3600000, refreshToken: "fixture-refresh", refreshExpiresAt: Date.now() + 86400000, user: { id: 1, email: "admin@example.test", fullName: "Quản trị test", role: "ADMIN" } })));
  await page.route("**/api/v1/admin", r => r.fulfill({ json: { id: "1", fullName: "Quản trị test", role: "ADMIN" } }));
  const state = { values: structuredClone(initial), writes: [] as { method: string; body: Record<string, unknown>; path: string }[], reads: [] as string[] };
  await page.route("**/api/v1/admin/promotions**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method();
    expect(request.headers().authorization).toBe("Bearer fixture-admin");expect(url.search).toBe("");
    if (method === "GET") { state.reads.push(path);const value = path === API ? state.values : state.values.find(i => path === `${API}/${i.id}`);return route.fulfill({ status: value ? 200 : 404, json: value ?? {} }); }
    const body = request.postDataJSON();state.writes.push({ method, body, path });
    if (method === "POST") { const created = { ...body, id: "9007199254740995", discountValue: Number.isNaN(Number(body.discountValue)) ? "0.0000" : body.discountValue.includes(".") ? body.discountValue.padEnd(body.discountValue.indexOf(".") + 5, "0") : `${body.discountValue}.0000`, minimumOrderAmount: `${body.minimumOrderAmount.split(".")[0]}.${(body.minimumOrderAmount.split(".")[1] ?? "").padEnd(4, "0")}`, maxDiscountAmount: body.maxDiscountAmount === null ? null : `${body.maxDiscountAmount.split(".")[0]}.${(body.maxDiscountAmount.split(".")[1] ?? "").padEnd(4, "0")}` };state.values.push(created);return route.fulfill({ status: 201, headers: { Location: `${API}/${created.id}` }, json: created }); }
    const index = state.values.findIndex(i => path.startsWith(`${API}/${i.id}`));if (index < 0) return route.fulfill({ status: 404, json: {} });
    const updated = { ...state.values[index], ...body };for (const key of ["discountValue", "minimumOrderAmount", "maxDiscountAmount"] as const) if (body[key] !== undefined && body[key] !== null) { const [w, f = ""] = String(body[key]).split(".");updated[key] = `${w}.${f.padEnd(4, "0")}`; }
    state.values[index] = updated;return route.fulfill({ json: updated });
  });
  return state;
}
async function fill(page: Page) {
  await page.getByLabel("Mã khuyến mãi", { exact: true }).fill(" test20 ");await page.getByLabel("Mức giảm (%)", { exact: true }).fill("20,1234");
  await page.getByLabel("Ngày và giờ bắt đầu", { exact: true }).fill("27/10/2026 09:00:00.001");await page.getByLabel("Ngày và giờ kết thúc", { exact: true }).fill("30/11/2026 23:59:00.123");
}
test("simple local list search/status filter without pagination, stats or writes", async ({ page }) => {
  const state = await setup(page, [item, { ...item, id: "2", code: "FIXED", status: "INACTIVE" }]);await page.goto(BASE);await expect(page.getByRole("heading", { name: "Quản lý khuyến mãi" })).toBeVisible();
  await page.getByLabel("Tìm mã khuyến mãi", { exact: true }).fill("xem");await expect(page.getByText("FIXED", { exact: true })).toHaveCount(0);await page.getByLabel("Tìm mã khuyến mãi", { exact: true }).fill("");await page.getByLabel("Trạng thái", { exact: true }).selectOption("INACTIVE");await expect(page.getByText("XEMPHIM20", { exact: true })).toHaveCount(0);
  expect(state.writes).toHaveLength(0);await expect(page.getByRole("button", { name: "Trang sau" })).toHaveCount(0);
});
test("create exact decimals/UTC dates and separate initial status", async ({ page }) => {
  const state = await setup(page, []);await page.goto(`${BASE}/new`);await fill(page);await page.getByRole("button", { name: "Thêm khuyến mãi", exact: true }).click();await expect(page).toHaveURL(`${BASE}/9007199254740995`);
  expect(state.writes).toHaveLength(1);expect(state.writes[0].body).toEqual({ code: "TEST20", discountType: "PERCENTAGE", discountValue: "20.1234", validFrom: "2026-10-27T02:00:00.001Z", validUntil: "2026-11-30T16:59:00.123Z", minimumOrderAmount: "0", usageLimit: null, maxDiscountAmount: null, status: "INACTIVE" });
});
test("fixed discount hides cap; edit code readonly and preserves microseconds without status", async ({ page }) => {
  const state = await setup(page);await page.goto(`${BASE}/${item.id}/edit`);await expect(page.getByLabel("Mã khuyến mãi", { exact: true })).toHaveAttribute("readonly", "");await expect(page.getByLabel("Trạng thái ban đầu")).toHaveCount(0);
  await page.getByLabel("Loại giảm giá", { exact: true }).selectOption("FIXED_AMOUNT");await expect(page.getByLabel("Giảm tối đa (₫, không bắt buộc)")).toHaveCount(0);await page.getByLabel("Mức giảm (₫)", { exact: true }).fill("1,1234");await page.getByRole("button", { name: "Lưu thay đổi" }).click();await expect(page).toHaveURL(`${BASE}/${item.id}`);
  const b = state.writes[0].body;expect(b).not.toHaveProperty("code");expect(b).not.toHaveProperty("status");expect(b.maxDiscountAmount).toBeNull();expect(b.validFrom).toBe(item.validFrom);expect(b.validUntil).toBe(item.validUntil);
});
test("validation focuses relevant field and never sends invalid dates/percentage/usage", async ({ page }) => {
  const state = await setup(page, []);await page.goto(`${BASE}/new`);await page.getByRole("button", { name: "Thêm khuyến mãi", exact: true }).click();await expect(page.getByLabel("Mã khuyến mãi", { exact: true })).toBeFocused();await fill(page);await page.getByLabel("Mức giảm (%)", { exact: true }).fill("100,0001");await page.getByRole("button", { name: "Thêm khuyến mãi", exact: true }).click();await expect(page.getByText("Mức giảm theo phần trăm không vượt quá 100%.")).toBeVisible();expect(state.writes).toHaveLength(0);
});
test("both confirmation dialogs keyboard focus and explicit status writes", async ({ page }) => {
  const state = await setup(page);await page.goto(`${BASE}/${item.id}`);await page.getByRole("button", { name: "Ngừng áp dụng", exact: true }).click();let dialog = page.getByRole("dialog");await expect(dialog.getByText("Khách hàng sẽ không thể sử dụng mã này khi đặt vé.")).toBeVisible();
  for (let i = 0; i < 8; i++) { await page.keyboard.press("Tab");expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true); }
  await page.keyboard.press("Escape");await expect(page.getByRole("button", { name: "Ngừng áp dụng", exact: true })).toBeFocused();expect(state.writes).toHaveLength(0);
  await page.getByRole("button", { name: "Ngừng áp dụng", exact: true }).click();await page.getByRole("dialog").getByRole("button", { name: "Ngừng áp dụng", exact: true }).click();await expect(page.getByRole("button", { name: "Bật lại", exact: true })).toBeVisible();await page.getByRole("button", { name: "Bật lại", exact: true }).click();dialog = page.getByRole("dialog");await expect(dialog.getByText("Mã sẽ có thể được sử dụng nếu còn hiệu lực và đáp ứng điều kiện.")).toBeVisible();await dialog.getByRole("button", { name: "Bật lại", exact: true }).click();await expect(page.getByRole("button", { name: "Ngừng áp dụng", exact: true })).toBeVisible();expect(state.writes.map(w => w.body)).toEqual([{ status: "INACTIVE" }, { status: "ACTIVE" }]);
});
test("lost creation blocks replay across reload until explicit read and acknowledgement", async ({ page }) => {
  await setup(page, []);let posts = 0;await page.route("**/api/v1/admin/promotions", route => { if (route.request().method() !== "POST") return route.fallback();posts++;return route.abort(); });await page.goto(`${BASE}/new`);await fill(page);await page.getByRole("button", { name: "Thêm khuyến mãi", exact: true }).click();await expect(page.getByText(/Chưa xác nhận được lần lưu trước/)).toBeVisible();await page.reload();await expect(page.getByRole("button", { name: "Thêm khuyến mãi", exact: true })).toBeDisabled();await page.getByRole("button", { name: "Kiểm tra lại", exact: true }).click();await page.getByRole("button", { name: "Đã kiểm tra, tiếp tục" }).click();expect(posts).toBe(1);
});
test("uncertain edit rechecks server terms and refills without automatic retry", async ({ page }) => {
  await setup(page);let puts = 0;await page.route(`**/api/v1/admin/promotions/${item.id}`, route => { if (route.request().method() !== "PUT") return route.fallback();puts++;return route.abort(); });await page.goto(`${BASE}/${item.id}/edit`);await page.getByLabel("Mức giảm (%)", { exact: true }).fill("5");await page.getByRole("button", { name: "Lưu thay đổi" }).click();await page.getByRole("button", { name: "Kiểm tra lại", exact: true }).click();await expect(page.getByText(/Thông tin hiện tại: Đã bật/)).toBeVisible();await page.getByRole("button", { name: "Đã kiểm tra, tiếp tục" }).click();await expect(page.getByLabel("Mức giảm (%)", { exact: true })).toHaveValue("20,1234");expect(puts).toBe(1);
});
test("loading, empty, no-results and read error are alternative states", async ({ page }) => {
  await setup(page, []);await page.route("**/api/v1/admin/promotions", async r => { await new Promise(resolve => setTimeout(resolve, 400));return r.fulfill({ json: [] }); });await page.goto(BASE);await expect(page.getByText("Đang tải khuyến mãi…")).toBeVisible();await expect(page.getByRole("heading", { name: "Chưa có khuyến mãi" })).toBeVisible();await page.route("**/api/v1/admin/promotions", r => r.fulfill({ status: 503, json: { detail: "private SQL" } }));await page.getByRole("button", { name: "Tải lại", exact: true }).click();await expect(page.getByRole("heading", { name: "Chưa mở được khuyến mãi" })).toBeVisible();await expect(page.getByText("private SQL")).toHaveCount(0);
});
test("not-found, mismatched IDs and forbidden refresh are safe", async ({ page }) => {
  await setup(page);await page.goto(`${BASE}/2`);await expect(page.getByText("Không tìm thấy khuyến mãi.")).toBeVisible();await page.route(`**/api/v1/admin/promotions/${item.id}`, r => r.fulfill({ json: { ...item, id: "2" } }));await page.goto(`${BASE}/${item.id}`);await expect(page.getByRole("heading", { name: "Chưa mở được khuyến mãi" })).toBeVisible();await page.route(`**/api/v1/admin/promotions/${item.id}`, r => r.fulfill({ status: 403, json: {} }));await page.getByRole("button", { name: "Thử lại", exact: true }).click();await expect(page.getByRole("heading", { name: "Không có quyền quản trị" })).toBeVisible();
});
test("duplicate submission gate and rate-limit wait do not retry automatically", async ({ page }) => {
  await setup(page, []);let posts = 0;await page.route("**/api/v1/admin/promotions", async r => { if (r.request().method() !== "POST") return r.fallback();posts++;await new Promise(resolve => setTimeout(resolve, 300));return r.fulfill({ status: 429, headers: { "Retry-After": "2" }, json: {} }); });await page.goto(`${BASE}/new`);await fill(page);await page.getByRole("button", { name: "Thêm khuyến mãi", exact: true }).evaluate((button: HTMLButtonElement) => { button.click();button.click(); });await expect(page.getByRole("button", { name: "Đang lưu…" })).toBeDisabled();await expect(page.getByText(/Vui lòng chờ/).first()).toBeVisible();expect(posts).toBe(1);
});
test("anonymous entry requires login without any promotion writes", async ({ page }) => {
  let writes = 0;await page.route("**/api/v1/admin/promotions**", r => { if (r.request().method() !== "GET") writes++;return r.fulfill({ status: 401, json: {} }); });await page.goto(`${BASE}/new`);await expect(page.getByRole("heading", { name: "Cần đăng nhập" })).toBeVisible();expect(writes).toBe(0);
});
test("conflict or unavailable write requires review rather than automatic replay", async ({ page }) => {
  await setup(page, []);let posts = 0;await page.route("**/api/v1/admin/promotions", r => { if (r.request().method() !== "POST") return r.fallback();posts++;return r.fulfill({ status: 503, json: { detail: "internal diagnostic" } }); });
  await page.goto(`${BASE}/new`);await fill(page);await page.getByRole("button", { name: "Thêm khuyến mãi", exact: true }).click();await expect(page.getByText(/Chưa xác nhận được lần lưu trước/)).toBeVisible();await expect(page.getByRole("button", { name: "Thêm khuyến mãi", exact: true })).toBeDisabled();await expect(page.getByText("internal diagnostic")).toHaveCount(0);expect(posts).toBe(1);
});
test("forged malformed recovery hints and invalid direct IDs never trigger guessed reads or writes", async ({ page }) => {
  const state = await setup(page);await page.addInitScript(() => sessionStorage.setItem("smart-cinema.admin-promotion-review", JSON.stringify({ nonce: "valid-nonce", promotionId: "../1" })));
  await page.goto(`${BASE}/new`);await expect(page.getByRole("button", { name: "Thêm khuyến mãi", exact: true })).toBeEnabled();await page.goto(`${BASE}/01`);await expect(page.getByText("Không tìm thấy khuyến mãi.")).toBeVisible();expect(state.reads).toHaveLength(0);expect(state.writes).toHaveLength(0);
});
for (const width of [390, 768, 1440]) test(`large readable controls and no overflow at ${width}px`, async ({ page }) => {
  await setup(page, [{ ...item, code: "X".repeat(50), discountValue: "100.0000", minimumOrderAmount: "999999999999999.9999" }]);await page.setViewportSize({ width, height: 950 });await page.goto(BASE);await expect(page.getByRole("heading", { name: "Quản lý khuyến mãi" })).toBeVisible();expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);await page.getByRole("link", { name: "Thêm khuyến mãi", exact: true }).click();await page.getByLabel("Mã khuyến mãi", { exact: true }).focus();await expect(page.getByLabel("Mã khuyến mãi", { exact: true })).toBeFocused();expect(await page.getByRole("button", { name: "Thêm khuyến mãi", exact: true }).evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
