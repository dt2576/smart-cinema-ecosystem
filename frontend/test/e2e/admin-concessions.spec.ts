import { expect, test, type Page } from "@playwright/test";

// Clearly fixture-backed UI cases. The separate local browser harness uses real APIs/PostgreSQL.
const BASE = "/admin/concession-items", API = "/api/v1/admin/concession-items";
const item = { id: "9007199254740993", name: "Bắp phô mai", description: "Bắp rang thơm", category: "POPCORN", sellingPrice: "55000.1234", imageUrl: null, status: "ACTIVE", createdAt: "2026-10-27T00:00:00Z", updatedAt: "2026-10-27T00:00:00Z" };
async function setup(page: Page, values = [item]) {
  await page.addInitScript(() => localStorage.setItem("smart-cinema.auth-session", JSON.stringify({ accessToken: "fixture-admin", tokenType: "Bearer", expiresAt: Date.now() + 3600000, refreshToken: "fixture-refresh", refreshExpiresAt: Date.now() + 86400000, user: { id: 1, email: "admin@example.test", fullName: "Quản trị test", role: "ADMIN" } })));
  await page.route("**/api/v1/admin", route => route.fulfill({ json: { id: "1", fullName: "Quản trị test", role: "ADMIN" } }));
  const state = { values: structuredClone(values), writes: [] as { method: string; path: string; body: Record<string, unknown> }[], reads: [] as string[] };
  await page.route("**/api/v1/admin/concession-items**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname, method = request.method();
    if (method === "GET") {
      state.reads.push(request.url());const value = path === API ? state.values : state.values.find(i => path === `${API}/${i.id}`);
      return route.fulfill(value ? { json: value } : { status: 404, json: { detail: "fixture internal detail" } });
    }
    const body = request.postDataJSON();state.writes.push({ method, path, body });
    if (method === "POST") { const created = { ...item, ...body }; state.values.push(created);return route.fulfill({ status: 201, headers: { Location: `${API}/${created.id}` }, json: created }); }
    const found = state.values.find(i => path === `${API}/${i.id}` || path === `${API}/${i.id}/status`)!;
    Object.assign(found, body);return route.fulfill({ json: found });
  });
  return state;
}
async function fill(page: Page) { await page.getByLabel("Tên sản phẩm", { exact: true }).fill(item.name);await page.getByLabel("Giá bán (₫)").fill("55000,1234");await page.getByLabel("Mô tả (không bắt buộc)").fill(item.description); }
test("four pages require authentication; backend role is authoritative", async ({ page }) => {
  for (const path of [BASE, `${BASE}/new`, `${BASE}/${item.id}`, `${BASE}/${item.id}/edit`]) { await page.goto(path);await expect(page.getByRole("heading", { name: "Cần đăng nhập" })).toBeVisible(); }
  await setup(page);await page.route("**/api/v1/admin", route => route.fulfill({ status: 403, json: {} }));await page.goto(BASE);await expect(page.getByRole("heading", { name: "Không có quyền quản trị" })).toBeVisible();
});
test("list filters locally and paginates actual fixture items with no invented API queries", async ({ page }) => {
  const values = Array.from({ length: 13 }, (_, i) => ({ ...item, id: String(i + 1), name: `Sản phẩm ${i + 1}` }));
  const state = await setup(page, values);await page.goto(BASE);await expect(page.getByText("Trang 1 / 2")).toBeVisible();await page.getByRole("button", { name: "Trang sau" }).click();await expect(page.getByText("Trang 2 / 2")).toBeVisible();
  await page.getByLabel("Tìm sản phẩm").fill("Sản phẩm 13");await expect(page.getByRole("rowheader", { name: "Sản phẩm 13", exact: true })).toBeVisible();await page.getByLabel("Loại sản phẩm", { exact: true }).selectOption("DRINK");await expect(page.getByRole("heading", { name: "Không tìm thấy sản phẩm" })).toBeVisible();
  expect(state.reads.every(url => !new URL(url).search)).toBe(true);await page.getByRole("button", { name: "Xóa bộ lọc" }).click();await expect(page.getByText("Trang 1 / 2")).toBeVisible();
});
test("empty catalog and loading/error states are contextual, without design demonstration boards", async ({ page }) => {
  await setup(page, []);await page.goto(BASE);await expect(page.getByRole("heading", { name: "Chưa có sản phẩm" })).toBeVisible();
  await page.route("**/api/v1/admin/concession-items", async route => { await new Promise(r => setTimeout(r, 600));await route.fulfill({ status: 503, json: { detail: "secret SQL" } }); });
  await page.getByRole("button", { name: "Tải lại", exact: true }).click();await expect(page.getByText("Đang tải sản phẩm…")).toBeVisible();await expect(page.getByRole("heading", { name: "Chưa mở được sản phẩm" })).toBeVisible();await expect(page.getByText("secret SQL")).toHaveCount(0);
});
test("create validates fields and sends exact strings and required initial status", async ({ page }) => {
  const state = await setup(page, []);await page.goto(`${BASE}/new`);await page.getByRole("button", { name: "Thêm sản phẩm", exact: true }).click();await expect(page.getByText("Nhập tên sản phẩm từ 1 đến 150 ký tự.")).toBeVisible();expect(state.writes).toHaveLength(0);
  await fill(page);await expect(page.getByText("Nhập tên sản phẩm từ 1 đến 150 ký tự.")).toHaveCount(0);await page.getByLabel("Trạng thái bán hàng").selectOption("INACTIVE");await page.getByRole("button", { name: "Thêm sản phẩm", exact: true }).click();await expect(page).toHaveURL(`${BASE}/${item.id}`);
  expect(state.writes).toHaveLength(1);expect(state.writes[0].body).toEqual({ name: item.name, category: "POPCORN", sellingPrice: "55000.1234", description: item.description, status: "INACTIVE" });await expect(page.getByText("Ngừng bán", { exact: true })).toBeVisible();
});
test("edit prefills actual data, excludes status/read-only fields and preserves server status", async ({ page }) => {
  const state = await setup(page, [{ ...item, status: "INACTIVE" }]);await page.goto(`${BASE}/${item.id}/edit`);await expect(page.getByLabel("Tên sản phẩm", { exact: true })).toHaveValue(item.name);await expect(page.getByLabel("Trạng thái bán hàng")).toHaveCount(0);
  await page.getByLabel("Giá bán (₫)").fill("999999999999999,9999");await page.getByRole("button", { name: "Lưu thay đổi" }).click();await expect(page).toHaveURL(`${BASE}/${item.id}`);expect(state.writes[0].body).not.toHaveProperty("status");expect(state.writes[0].body).not.toHaveProperty("imageUrl");await expect(page.getByText("999.999.999.999.999,9999 ₫")).toBeVisible();
});
test("status dialogs have Vietnamese copy, trap focus, cancel with Escape and confirm server reads", async ({ page }) => {
  const state = await setup(page);await page.goto(`${BASE}/${item.id}`);await page.getByRole("button", { name: "Ngừng bán", exact: true }).click();const dialog = page.getByRole("dialog");await expect(dialog.getByRole("heading", { name: "Ngừng bán sản phẩm này?" })).toBeVisible();await expect(dialog.getByText("Khách hàng sẽ không thể chọn sản phẩm này khi đặt vé.")).toBeVisible();
  for (let i = 0; i < 8; i++) { await page.keyboard.press("Tab");expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true); }await page.keyboard.press("Escape");expect(state.writes).toHaveLength(0);
  await page.getByRole("button", { name: "Ngừng bán", exact: true }).click();await page.getByRole("dialog").getByRole("button", { name: "Ngừng bán", exact: true }).click();await expect(page.getByRole("button", { name: "Bán lại", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Bán lại", exact: true }).click();await page.getByRole("dialog").getByRole("button", { name: "Bán lại", exact: true }).click();await expect(page.getByRole("button", { name: "Ngừng bán", exact: true })).toBeVisible();expect(state.writes.map(w => w.path)).toEqual([`${API}/${item.id}/status`, `${API}/${item.id}/status`]);
});
test("pending writes disable duplicate clicks and no write occurs on mount/reload", async ({ page }) => {
  const state = await setup(page, []);let posts = 0;
  await page.route("**/api/v1/admin/concession-items", async route => { if (route.request().method() !== "POST") return route.fallback();posts++;await new Promise(r => setTimeout(r, 500));return route.fulfill({ status: 400, json: {} }); });
  await page.goto(`${BASE}/new`);await fill(page);await page.getByRole("button", { name: "Thêm sản phẩm", exact: true }).evaluate((button: HTMLButtonElement) => { button.click();button.click(); });await expect(page.getByRole("button", { name: "Đang lưu…" })).toBeDisabled();await expect(page.getByText("Thông tin chưa hợp lệ. Vui lòng kiểm tra lại các trường.")).toBeVisible();expect(posts).toBe(1);expect(state.writes).toHaveLength(0);
});
test("lost response blocks duplicate creation across reload until explicit GET review", async ({ page }) => {
  await setup(page, []);let posts = 0;await page.route("**/api/v1/admin/concession-items", route => { if (route.request().method() !== "POST") return route.fallback();posts++;return route.abort(); });
  await page.goto(`${BASE}/new`);await fill(page);await page.getByRole("button", { name: "Thêm sản phẩm", exact: true }).click();await expect(page.getByText(/Chưa xác nhận được lần lưu trước/)).toBeVisible();await page.reload();await expect(page.getByRole("button", { name: "Thêm sản phẩm", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Kiểm tra lại", exact: true }).click();await page.getByRole("button", { name: "Đã kiểm tra, tiếp tục" }).click();await expect(page.getByRole("button", { name: "Thêm sản phẩm", exact: true })).toBeEnabled();expect(posts).toBe(1);
});
test("uncertain edit rechecks server data before explicit acknowledgement, without replay", async ({ page }) => {
  await setup(page);let puts = 0;await page.route(`**/api/v1/admin/concession-items/${item.id}`, route => { if (route.request().method() !== "PUT") return route.fallback();puts++;return route.abort(); });
  await page.goto(`${BASE}/${item.id}/edit`);await page.getByLabel("Giá bán (₫)").fill("65000");await page.getByRole("button", { name: "Lưu thay đổi" }).click();await expect(page.getByText(/Chưa xác nhận được lần lưu trước/)).toBeVisible();
  await page.getByRole("button", { name: "Kiểm tra lại", exact: true }).click();await expect(page.getByText(/Thông tin hiện tại: Đang bán/)).toBeVisible();await page.getByRole("button", { name: "Đã kiểm tra, tiếp tục" }).click();
  await expect(page.getByRole("button", { name: "Lưu thay đổi" })).toBeEnabled();await expect(page.getByLabel("Giá bán (₫)")).toHaveValue("55000,1234");expect(puts).toBe(1);
});
test("not-found, malformed response and forbidden refresh never expose internal data", async ({ page }) => {
  await setup(page);await page.goto(`${BASE}/2`);await expect(page.getByText("Không tìm thấy sản phẩm.")).toBeVisible();
  await page.route("**/api/v1/admin/concession-items", route => route.fulfill({ json: [{ ...item, id: 1 }] }));await page.goto(BASE);await expect(page.getByRole("heading", { name: "Chưa mở được sản phẩm" })).toBeVisible();
  await page.route("**/api/v1/admin/concession-items", route => route.fulfill({ status: 403, json: { detail: "secret" } }));await page.getByRole("button", { name: "Thử lại", exact: true }).click();await expect(page.getByRole("heading", { name: "Không có quyền quản trị" })).toBeVisible();
});
for (const width of [390, 768, 1440]) test(`readable responsive content and controls at ${width}px`, async ({ page }) => {
  await setup(page, [{ ...item, name: "Sản phẩm với tên rất dài ".repeat(5), sellingPrice: "999999999999999.9999" }]);await page.setViewportSize({ width, height: 950 });await page.goto(BASE);await expect(page.getByRole("heading", { name: "Quản lý bắp nước" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Thêm sản phẩm", exact: true }).click();await page.getByLabel("Tên sản phẩm", { exact: true }).focus();await expect(page.getByLabel("Tên sản phẩm", { exact: true })).toBeFocused();expect(await page.getByRole("button", { name: "Thêm sản phẩm", exact: true }).evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
});
