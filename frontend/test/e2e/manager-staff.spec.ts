import { expect, test, type Page } from "@playwright/test";
import { managerCinema } from "../fixtures/manager-operations";
import type { ManagerStaffAssignment } from "../../src/features/manager/manager-staff-api";

// HTTP fixtures ONLY. Real local PostgreSQL/browser evidence is recorded separately.
const STAFF = "9007199254740993", PROFILE = { id: STAFF, fullName: "Nhân viên thử nghiệm có tên dài để kiểm tra giao diện", email: "nhanvien.rat.dai@example.test", phone: "+84912345678", status: "BLOCKED" };
const path = `/manager/cinemas/11/staff/${STAFF}`;
const original: ManagerStaffAssignment = { id: "91", userId: STAFF, cinemaId: "11", cinemaName: managerCinema.name, assignmentType: "STAFF", status: "ACTIVE", effectiveAt: "2026-01-01T00:00:00.123456Z" };
async function setup(page: Page, role = "MANAGER") {
  await page.addInitScript(role => localStorage.setItem("smart-cinema.auth-session", JSON.stringify({ accessToken: "fixture-manager-staff", tokenType: "Bearer", expiresAt: Date.now() + 3600000, refreshToken: "fixture-refresh", refreshExpiresAt: Date.now() + 86400000, user: { id: 61, fullName: "Quản lý QA", email: "manager@example.test", role } })), role);
  const state = { cinemas: [managerCinema, { ...managerCinema, id: "12", name: "Rạp nhận phân công QA" }], rows: [structuredClone(original), { ...original, id: "92", status: "INACTIVE" }, { ...original, id: "93", userId: "84", effectiveAt: "2099-01-01T00:00:00Z" }] as ManagerStaffAssignment[], calls: [] as { method: string; path: string; body: unknown }[], denied: false, empty: false };
  await page.route("**/api/v1/**", async route => {
    const request = route.request(), p = new URL(request.url()).pathname, method = request.method();
    expect(request.headers().authorization).toBe("Bearer fixture-manager-staff");
    const body = method === "GET" ? undefined : request.postDataJSON(); state.calls.push({ method, path: p, body });
    if (role !== "MANAGER" || state.denied) return route.fulfill({ status: 403, json: { detail: "private SQL invitation ciphertext" } });
    if (p.startsWith("/api/v1/admin")) return route.fulfill({ status: 403, json: {} });
    if (p === "/api/v1/manager/cinemas") return route.fulfill({ json: state.cinemas });
    const cinema = state.cinemas.find(c => p.startsWith(`/api/v1/manager/cinemas/${c.id}` + "/") || p === `/api/v1/manager/cinemas/${c.id}`);
    if (!cinema) return route.fulfill({ status: 404, json: {} });
    if (p === `/api/v1/manager/cinemas/${cinema.id}`) return route.fulfill({ json: cinema });
    const rows = state.empty ? [] : state.rows.filter(a => a.cinemaId === cinema.id);
    if (p.endsWith("/staff-assignments")) return route.fulfill({ json: rows.map(a => ({ staff: { ...PROFILE, id: a.userId }, assignment: a })) });
    if (p.endsWith("/staff")) return route.fulfill({ json: rows.filter(a => a.status === "ACTIVE" && Date.parse(a.effectiveAt) <= Date.now()).map(a => ({ ...PROFILE, id: a.userId, assignmentId: a.id, effectiveAt: a.effectiveAt })) });
    const detail = p.match(/\/staff\/([0-9]+)$/);
    if (detail) { const assignments = rows.filter(a => a.userId === detail[1]); return route.fulfill({ status: assignments.length ? 200 : 404, json: { staff: { ...PROFILE, id: detail[1] }, assignments } }); }
    if (p.endsWith(`/staff/${STAFF}/cinema-assignments`) && method === "POST") {
      const target = state.cinemas.find(c => c.id === body.cinemaId)!;
      const a = { ...original, id: "94", cinemaId: target.id, cinemaName: target.name, effectiveAt: new Date(body.effectiveAt).toISOString() }; state.rows.push(a); return route.fulfill({ status: 201, json: a });
    }
    const update = p.match(/\/staff\/([0-9]+)\/cinema-assignments\/([0-9]+)\/status$/);
    if (update && method === "PUT") { const a = rows.find(a => a.userId === update[1] && a.id === update[2]); if (!a) return route.fulfill({ status: 404, json: {} }); a.status = body.status; return route.fulfill({ json: a }); }
    return route.fulfill({ status: 404, json: {} });
  });
  return state;
}
const writes = (state: Awaited<ReturnType<typeof setup>>) => state.calls.filter(c => c.method !== "GET");
async function openAssign(page: Page) { await page.getByRole("button", { name: "Phân công nhân viên", exact: true }).click(); }
async function fillAssign(page: Page) { await page.getByLabel("Rạp nhận phân công *").selectOption("12"); await page.getByLabel("Bắt đầu hiệu lực (GMT+7) *").fill("2035-10-29T10:30"); }

test("scoped list shows current/future/inactive, contact data and loaded-only search without HR", async ({ page }) => {
  const s = await setup(page); await page.goto("/manager/staff");
  await expect(page.getByText("Hiển thị 3 phân công.", { exact: false })).toBeVisible();
  await page.getByLabel("Trạng thái phân công", { exact: true }).selectOption("future"); await expect(page.getByText("Hiển thị 1 phân công.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Xem chi tiết", exact: true })).toHaveAttribute("href", "/manager/cinemas/11/staff/84");
  await page.getByLabel("Trạng thái phân công", { exact: true }).selectOption("current"); await expect(page.getByRole("link", { name: "Xem chi tiết", exact: true })).toHaveAttribute("href", path);
  const reads = s.calls.length; await page.getByLabel("Tìm trong rạp").fill("Không tồn tại"); await expect(page.getByText("Không có phân công phù hợp với bộ lọc.")).toBeVisible(); expect(s.calls.length).toBe(reads);
  await expect(page.getByRole("button", { name: /Tạo nhân viên|Mời|Ca trực|Khóa tài khoản/ })).toHaveCount(0); expect(writes(s)).toHaveLength(0);
});
test("detail direct entry/reload/back has minimal profile, exact IDs and source-only history", async ({ page }) => {
  const s = await setup(page); await page.goto(path); await expect(page.getByRole("heading", { name: "Lịch sử phân công tại rạp" })).toBeVisible();
  await expect(page.getByText(`Mã nhân viên: ${STAFF}`, { exact: true })).toBeVisible(); await expect(page.getByText("Tài khoản bị khóa", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rạp nhận phân công QA" })).toHaveCount(0); await expect(page.getByRole("button", { name: "Kích hoạt tài khoản", exact: true })).toHaveCount(0);
  await page.reload(); await expect(page.getByRole("button", { name: "Phân công nhân viên", exact: true })).toBeEnabled();
  await expect(page.getByRole("navigation", { name: "Điều hướng quản lý rạp" }).getByRole("link", { name: "Nhân viên tại rạp" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Danh sách nhân viên", exact: false }).click(); await expect(page).toHaveURL("/manager/cinemas/11/staff"); expect(writes(s)).toHaveLength(0);
});
test("assign validates/focuses, restricts destinations, posts once and navigates to refreshed future grant", async ({ page }) => {
  const s = await setup(page); await page.goto(path); await openAssign(page); const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Xác nhận phân công", exact: true }).click(); await expect(page.getByLabel("Rạp nhận phân công *")).toBeFocused(); expect(writes(s)).toHaveLength(0);
  await expect(page.getByLabel("Rạp nhận phân công *").locator("option")).toHaveCount(2); await expect(dialog.getByLabel(/Lý do|Ghi chú|Vai trò/)).toHaveCount(0);
  await fillAssign(page); await dialog.getByRole("button", { name: "Xác nhận phân công", exact: true }).click(); await expect(dialog).toHaveCount(0);
  expect(writes(s)).toEqual([{ method: "POST", path: `/api/v1${path}/cinema-assignments`, body: { cinemaId: "12", effectiveAt: "2035-10-29T03:30:00.000Z" } }]);
  await page.getByRole("link", { name: "Xem phân công tại rạp vừa thêm" }).click(); await expect(page.getByText("Sắp có hiệu lực", { exact: true })).toBeVisible();
  expect(s.rows.find(a => a.id === "91")).toEqual(original);
});
test("specific assignment deactivate/reactivate retains microsecond instant and account state", async ({ page }) => {
  const s = await setup(page); await page.goto(path); await page.getByRole("button", { name: "Ngừng phân công", exact: true }).click();
  await expect(page.getByRole("button", { name: "Hủy", exact: true })).toBeFocused(); await expect(page.getByRole("dialog").getByText("91", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận ngừng phân công", exact: true }).click(); await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Kích hoạt lại phân công", exact: true }).first().click(); await expect(page.getByRole("dialog").getByLabel(/Thời điểm|Lý do/)).toHaveCount(0);
  await page.getByRole("button", { name: "Xác nhận kích hoạt lại", exact: true }).click(); await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(writes(s).map(c => c.body)).toEqual([{ status: "INACTIVE" }, { status: "ACTIVE" }]); expect(writes(s).every(c => c.path.endsWith("/91/status"))).toBe(true);
  expect(s.rows[0].effectiveAt).toBe(original.effectiveAt); expect(s.rows[1].status).toBe("INACTIVE"); await expect(page.getByText("Tài khoản bị khóa", { exact: true })).toBeVisible();
});
test("future reactivation never promises immediate access and conflicting historical activation is disabled", async ({ page }) => {
  const s = await setup(page); s.rows[0].effectiveAt = "2099-01-01T00:00:00Z";
  await page.goto(path); await expect(page.getByText("Sắp có hiệu lực", { exact: true })).toBeVisible(); await expect(page.getByRole("button", { name: "Kích hoạt lại phân công", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Ngừng phân công", exact: true }).click(); await page.getByRole("button", { name: "Xác nhận ngừng phân công" }).click();
  await page.getByRole("button", { name: "Kích hoạt lại phân công", exact: true }).first().click(); await expect(page.getByText(/Phân công trong tương lai vẫn phải chờ/)).toBeVisible(); await page.getByRole("button", { name: "Xác nhận kích hoạt lại" }).click();
  await expect(page.getByText("Sắp có hiệu lực", { exact: true })).toBeVisible(); expect(s.rows[0].effectiveAt).toBe("2099-01-01T00:00:00Z");
});
test("duplicate click and Enter while pending cannot create a second command", async ({ page }) => {
  const s = await setup(page); let posts = 0;
  await page.route(`**/api/v1${path}/cinema-assignments`, async r => { posts++; await new Promise(resolve => setTimeout(resolve, 800)); await r.fallback(); });
  await page.goto(path); await openAssign(page); await fillAssign(page); await page.getByRole("button", { name: "Xác nhận phân công", exact: true }).dblclick(); await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(0); expect(posts).toBe(1); expect(writes(s)).toHaveLength(1);
});
for (const status of [400, 401, 403, 404, 409, 429, 503]) test(`safe mutation ${status}, no replay or private details`, async ({ page }) => {
  const s = await setup(page); let writes = 0;
  await page.route(`**/api/v1${path}/cinema-assignments/91/status`, r => { writes++; return r.fulfill({ status, headers: status === 429 ? { "Retry-After": "1" } : {}, json: { detail: "private SQL invitation ciphertext" } }); });
  await page.goto(path); await page.getByRole("button", { name: "Ngừng phân công", exact: true }).click(); await page.getByRole("button", { name: "Xác nhận ngừng phân công" }).click();
  await expect(page.getByRole("alert").first()).toBeVisible(); await expect(page.getByText("private SQL invitation ciphertext", { exact: true })).toHaveCount(0); expect(writes).toBe(1); expect(s.rows[0].status).toBe("ACTIVE");
  if ([409, 429, 503].includes(status)) { await page.getByRole("button", { name: "Hủy", exact: true }).click(); await expect(page.getByRole("button", { name: "Phân công nhân viên", exact: true })).toBeDisabled(); await page.getByRole("button", { name: "Kiểm tra dữ liệu đã lưu", exact: true }).click(); await expect(page.getByRole("button", { name: "Đã kiểm tra, tiếp tục" })).toBeEnabled(); await page.getByRole("button", { name: "Đã kiểm tra, tiếp tục" }).click(); }
  expect(writes).toBe(1);
});
test("lost create response/reload checks both owned Cinemas and requires acknowledgement, never repeats POST", async ({ page }) => {
  const s = await setup(page); let posts = 0;
  await page.route(`**/api/v1${path}/cinema-assignments`, r => { posts++; s.rows.push({ ...original, id: "94", cinemaId: "12", cinemaName: "Rạp nhận phân công QA", effectiveAt: "2035-10-29T03:30:00Z" }); return r.abort(); });
  await page.goto(path); await openAssign(page); await fillAssign(page); await page.getByRole("button", { name: "Xác nhận phân công", exact: true }).click(); await expect(page.getByRole("dialog").getByText(/Đóng hộp thoại để kiểm tra/)).toBeVisible();
  await page.reload(); await expect(page.getByRole("button", { name: "Phân công nhân viên", exact: true })).toBeDisabled(); await page.getByRole("button", { name: "Kiểm tra dữ liệu đã lưu", exact: true }).click();
  await expect(page.getByText(/Rạp nhận phân công QA · Mã phân công 94/)).toBeVisible(); await expect(page.getByRole("button", { name: "Đã kiểm tra, tiếp tục" })).toBeEnabled();
  expect(s.calls.some(c => c.path.endsWith("/cinemas/12/staff-assignments") && c.method === "GET")).toBe(true); expect(posts).toBe(1);
  await page.getByRole("button", { name: "Đã kiểm tra, tiếp tục" }).click(); await expect(page.getByRole("button", { name: "Phân công nhân viên", exact: true })).toBeEnabled(); expect(posts).toBe(1);
});
test("mismatched mutation receipt and malformed GET never render fabricated success/profile", async ({ page }) => {
  await setup(page); let puts = 0; await page.route(`**/api/v1${path}/cinema-assignments/91/status`, r => { puts++; return r.fulfill({ json: { ...original, id: "999", status: "INACTIVE" } }); });
  await page.goto(path); await page.getByRole("button", { name: "Ngừng phân công", exact: true }).click(); await page.getByRole("button", { name: "Xác nhận ngừng phân công" }).click(); await expect(page.getByRole("dialog").getByText(/Đóng hộp thoại để kiểm tra/)).toBeVisible(); await expect(page.getByText("Đã ngừng phân công.", { exact: true })).toHaveCount(0); expect(puts).toBe(1);
  await page.route(`**/api/v1${path}`, r => r.fulfill({ json: { staff: { ...PROFILE, id: "99" }, assignments: [original] } })); await page.reload(); await expect(page.getByRole("heading", { name: "Chưa tải được thông tin" })).toBeVisible(); await expect(page.getByRole("button", { name: "Phân công nhân viên", exact: true })).toHaveCount(0);
});
test("cross-Cinema detail, forged nested identity and revocation are denied by server", async ({ page }) => {
  const s = await setup(page); await page.goto(`/manager/cinemas/13/staff/${STAFF}`); await expect(page.getByRole("heading", { name: "Chưa tải được thông tin" })).toBeVisible();
  await page.route(`**/api/v1${path}`, r => r.fulfill({ json: { staff: PROFILE, assignments: [{ ...original, cinemaId: "12" }] } })); await page.goto(path); await expect(page.getByRole("heading", { name: "Chưa tải được thông tin" })).toBeVisible();
  await page.unroute(`**/api/v1${path}`); await page.goto(path); await expect(page.getByRole("button", { name: "Phân công nhân viên", exact: true })).toBeVisible(); s.denied = true; await page.getByRole("button", { name: "Tải lại thông tin" }).click(); await expect(page.getByRole("heading", { name: "Chưa tải được thông tin" })).toBeVisible(); await expect(page.getByRole("button", { name: "Phân công nhân viên", exact: true })).toHaveCount(0);
});
for (const role of ["STAFF", "CUSTOMER", "ADMIN"]) test(`${role} denied on direct Manager Staff page despite local role hint`, async ({ page }) => {
  const s = await setup(page, role); await page.goto(path); await expect(page.getByRole("heading", { name: "Chưa tải được thông tin" })).toBeVisible(); await expect(page.getByRole("navigation", { name: "Điều hướng quản lý rạp" })).toHaveCount(0); expect(writes(s)).toHaveLength(0);
});
test("loading, empty and unavailable reads have clear safe feedback", async ({ page }) => {
  const s = await setup(page); s.empty = true; await page.goto("/manager/staff"); await expect(page.getByText("Chưa có nhân viên được phân công tại rạp này.")).toBeVisible();
  await page.route("**/api/v1/manager/cinemas/11/staff-assignments", async r => { await new Promise(resolve => setTimeout(resolve, 600)); await r.fulfill({ status: 503, json: { detail: "private SQL" } }); }); await page.reload(); await expect(page.getByText("Đang tải dữ liệu…")).toBeVisible(); await expect(page.getByRole("heading", { name: "Chưa tải được thông tin" })).toBeVisible();
});
test("stale response from old Cinema cannot replace the newly selected Cinema", async ({ page }) => {
  await setup(page); await page.route("**/api/v1/manager/cinemas/11/staff-assignments", async r => { await new Promise(resolve => setTimeout(resolve, 700)); await r.fallback(); });
  await page.goto("/manager/staff"); await page.getByLabel("Rạp chiếu phim", { exact: true }).selectOption("12"); await expect(page.getByRole("heading", { name: "Rạp nhận phân công QA", exact: true })).toBeVisible(); await expect(page.getByText("Chưa có nhân viên được phân công tại rạp này.")).toBeVisible(); await expect(page.getByRole("link", { name: "Xem chi tiết", exact: true })).toHaveCount(0);
});
for (const width of [390, 768, 1440]) test(`all three dialogs fit ${width}, keyboard focus and overflow`, async ({ page }) => {
  const s = await setup(page); await page.setViewportSize({ width, height: 844 }); await page.goto(path); const add = page.getByRole("button", { name: "Phân công nhân viên", exact: true }); await openAssign(page);
  const dialog = page.getByRole("dialog"); await expect(page.getByLabel("Rạp nhận phân công *")).toBeFocused(); await page.getByRole("button", { name: "Xác nhận phân công", exact: true }).focus(); await page.keyboard.press("Tab"); await expect(page.getByRole("button", { name: "Đóng hộp thoại" })).toBeFocused();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true); await page.getByRole("button", { name: "Xác nhận phân công", exact: true }).scrollIntoViewIfNeeded(); await expect(page.getByRole("button", { name: "Xác nhận phân công", exact: true })).toBeInViewport(); await page.keyboard.press("Escape"); await expect(add).toBeFocused();
  await page.getByRole("button", { name: "Ngừng phân công", exact: true }).click(); await expect(page.getByRole("button", { name: "Hủy", exact: true })).toBeFocused(); await page.getByRole("button", { name: "Xác nhận ngừng phân công" }).scrollIntoViewIfNeeded(); await expect(page.getByRole("button", { name: "Xác nhận ngừng phân công" })).toBeInViewport(); await page.keyboard.press("Escape");
  s.rows[0].status = "INACTIVE"; await page.getByRole("button", { name: "Tải lại thông tin" }).click(); await page.getByRole("button", { name: "Kích hoạt lại phân công", exact: true }).first().click(); await page.getByRole("button", { name: "Xác nhận kích hoạt lại" }).scrollIntoViewIfNeeded(); await expect(page.getByRole("button", { name: "Xác nhận kích hoạt lại" })).toBeInViewport(); expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true); await page.keyboard.press("Escape"); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect(writes(s)).toHaveLength(0);
});
test("anonymous direct entry provides exact login resume for Cinema and Staff identity", async ({ page }) => {
  await page.goto(path); await expect(page.getByRole("link", { name: "Đăng nhập", exact: true })).toHaveAttribute("href", `/login?returnTo=${encodeURIComponent(path)}`);
});
