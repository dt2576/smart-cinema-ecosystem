import { expect, test, type Page } from "@playwright/test";
import type { StaffAccount, StaffAssignment } from "../../src/features/admin/admin-staff.types";

// HTTP fixtures only; these tests never provision live Staff or send mail.
const ID = "9007199254740993", CINEMA = "9223372036854775807", ASSIGNMENT = "9007199254740994";
function staff(): StaffAccount { return { id: ID, fullName: "Nhân viên Fixture", email: "staff@example.test", phone: "+84912345678", status: "BLOCKED", passwordSetupCompleted: false, invitationExpiresAt: "2099-10-15T00:00:00Z", deliveryStatus: "QUEUED", deliveryAttempts: 0 }; }
function assigned(): StaffAssignment { return { id: ASSIGNMENT, userId: ID, cinemaId: CINEMA, cinemaName: "Rạp Fixture", assignmentType: "STAFF", status: "ACTIVE", effectiveAt: "2099-10-15T02:00:00Z" }; }
async function setup(page: Page) {
  await page.addInitScript(() => localStorage.setItem("smart-cinema.auth-session", JSON.stringify({ accessToken: "fixture-admin-token", tokenType: "Bearer", expiresAt: Date.now() + 3600_000, refreshToken: "fixture-refresh", refreshExpiresAt: Date.now() + 86400_000, user: { id: 1, fullName: "Admin Fixture", email: "admin@example.test", role: "ADMIN" } })));
  await page.route("**/api/v1/admin", r => r.fulfill({ json: { id: "1", fullName: "Admin Fixture", role: "ADMIN" } }));
  const state = { account: staff(), assignments: [assigned()], list: [staff()], calls: [] as { path: string; method: string; body: unknown }[] };
  await page.route("**/api/v1/admin/**", async r => {
    const req = r.request(), url = new URL(req.url()), path = url.pathname, method = req.method();
    const body = method === "GET" ? undefined : req.postDataJSON(); state.calls.push({ path, method, body });
    if (path === "/api/v1/admin/cinemas") return r.fulfill({ json: [{ id: CINEMA, name: "Rạp Fixture", status: "INACTIVE" }, { id: "4", name: "Rạp Thứ Hai", status: "ACTIVE" }] });
    if (path === "/api/v1/admin/staff") {
      if (method === "GET") return r.fulfill({ json: state.list });
      state.account = { ...staff(), ...body }; state.list = [state.account]; return r.fulfill({ status: 201, json: state.account });
    }
    if (path === `/api/v1/admin/staff/${ID}`) return r.fulfill({ json: state.account });
    if (path.endsWith("/invitations")) { state.account = { ...state.account, deliveryStatus: "QUEUED", deliveryAttempts: 0 }; return r.fulfill({ json: state.account }); }
    if (path === `/api/v1/admin/staff/${ID}/status`) { state.account = { ...state.account, status: body.status }; return r.fulfill({ json: state.account }); }
    if (path === `/api/v1/admin/staff/${ID}/cinema-assignments`) {
      if (method === "GET") return r.fulfill({ json: state.assignments });
      const a: StaffAssignment = { ...assigned(), id: "9007199254740995", cinemaId: body.cinemaId, cinemaName: "Rạp Thứ Hai", effectiveAt: body.effectiveAt };
      state.assignments.push(a); return r.fulfill({ status: 201, json: a });
    }
    if (path.endsWith(`/cinema-assignments/${ASSIGNMENT}/status`)) { state.assignments = state.assignments.map(a => a.id === ASSIGNMENT ? { ...a, status: body.status } : a); return r.fulfill({ json: state.assignments.find(a => a.id === ASSIGNMENT) }); }
    return r.fulfill({ status: 404, json: {} });
  });
  return state;
}
const writes = (s: Awaited<ReturnType<typeof setup>>) => s.calls.filter(c => c.method !== "GET");

test("Staff List/Create/Detail follows real contract, validated phone, exact identities and queued mail", async ({ page }) => {
  const s = await setup(page); await page.goto("/admin/staff");
  await page.getByRole("button", { name: "+ Tạo nhân viên", exact: true }).click(); const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Tạo nhân viên", exact: true }).click();
  await expect(page.getByLabel("Họ và tên *")).toBeFocused(); await expect(page.getByText("Nhập họ và tên, tối đa 150 ký tự.")).toBeVisible();
  await page.getByLabel("Họ và tên *").fill("Nhân viên mới"); await page.getByLabel("Email *", { exact: true }).fill("person@gmail.com"); await page.getByLabel("Số điện thoại *").fill("912345678");
  await dialog.getByRole("button", { name: "Tạo nhân viên", exact: true }).click();
  await expect(page.getByText(/Đã tạo tài khoản #9007199254740993 ở trạng thái Đã khóa/)).toBeVisible();
  expect(writes(s)).toHaveLength(1); expect(writes(s)[0].body).toEqual({ fullName: "Nhân viên mới", email: "person@gmail.com", phone: "912345678" });
  await page.getByRole("link", { name: "Xem nhân viên vừa tạo" }).click(); await expect(page).toHaveURL(`/admin/staff/${ID}`);
  await expect(page.getByRole("button", { name: "Kích hoạt tài khoản", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cấp lại lời mời", exact: true })).toBeEnabled();
  await expect(page.getByText("Đang chờ gửi", { exact: true })).toBeVisible();
  await expect(page.getByText("Hiệu lực từ ngày sắp tới")).toBeVisible();
});
test("account confirmations obey A/B/C prerequisites and reissue does not fabricate SMTP success", async ({ page }) => {
  const s = await setup(page); await page.goto(`/admin/staff/${ID}`);
  await page.getByRole("button", { name: "Cấp lại lời mời", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận cấp lại lời mời" }).click();
  await expect(page.getByText("Đang chờ gửi", { exact: true })).toBeVisible(); expect(writes(s)[0].body).toEqual({});
  s.account.passwordSetupCompleted = true; await page.getByRole("button", { name: "Tải lại thông tin" }).click();
  await expect(page.getByRole("button", { name: "Cấp lại lời mời", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Kích hoạt tài khoản", exact: true }).click(); await page.getByRole("dialog").getByRole("button", { name: "Xác nhận kích hoạt tài khoản" }).click();
  await expect(page.getByRole("button", { name: "Khóa tài khoản", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Khóa tài khoản", exact: true }).click(); await page.getByRole("dialog").getByRole("button", { name: "Xác nhận khóa tài khoản" }).click();
  await expect(page.getByRole("button", { name: "Kích hoạt tài khoản", exact: true })).toBeEnabled();
  expect(writes(s).map(c => c.body)).toEqual([{}, { status: "ACTIVE" }, { status: "BLOCKED" }]); expect(s.assignments).toHaveLength(1);
});
test("Add/Deactivate/Reactivate preserve original effectiveAt and UTC, no privilege fields or auto POST", async ({ page }) => {
  const s = await setup(page); await page.goto(`/admin/staff/${ID}`); await expect(page.getByRole("heading", { name: "Phân công rạp chiếu", exact: true })).toBeVisible(); expect(writes(s)).toHaveLength(0);
  await page.getByRole("button", { name: "Ngừng phân công", exact: true }).click(); await page.getByRole("dialog").getByRole("button", { name: "Xác nhận ngừng phân công" }).click();
  await page.getByRole("button", { name: "Kích hoạt lại phân công", exact: true }).click(); await page.getByRole("dialog").getByRole("button", { name: "Xác nhận kích hoạt lại phân công" }).click();
  await expect(page.getByText("Hiệu lực từ ngày sắp tới")).toBeVisible(); expect(s.assignments[0].effectiveAt).toBe(assigned().effectiveAt);
  await page.getByRole("button", { name: "+ Thêm phân công" }).click();
  await expect(page.getByLabel("Rạp chiếu phim *")).toBeVisible(); await page.getByLabel("Rạp chiếu phim *").selectOption("4");
  await page.getByLabel("Thời điểm có hiệu lực *").fill("2020-01-01T08:00"); await page.getByRole("button", { name: "Xác nhận phân công", exact: true }).click();
  await expect(page.getByText("Đã tạo phân công rạp.", { exact: true })).toBeVisible();
  expect(writes(s).map(c => c.body)).toEqual([{ status: "INACTIVE" }, { status: "ACTIVE" }, { cinemaId: "4", effectiveAt: "2020-01-01T01:00:00.000Z" }]);
});
test("pending command locks fields/buttons and Escape, duplicate submit is prevented", async ({ page }) => {
  const s = await setup(page); let release!: () => void; const pending = new Promise<void>(r => { release = r; }); let posts = 0;
  await page.route(`**/api/v1/admin/staff/${ID}/invitations`, async r => { posts++; await pending; return r.fulfill({ json: s.account }); });
  await page.goto(`/admin/staff/${ID}`); await page.getByRole("button", { name: "Cấp lại lời mời", exact: true }).click(); await page.getByRole("button", { name: "Xác nhận cấp lại lời mời" }).click();
  await expect(page.getByRole("button", { name: "Đang xử lý…" })).toBeDisabled(); await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toBeVisible();
  expect(posts).toBe(1); release(); await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("unknown Create result persists across reload; recovery reads only, no guessed identity/retry", async ({ page }) => {
  const s = await setup(page); let posts = 0;
  await page.route("**/api/v1/admin/staff", r => { if (r.request().method() === "POST") { posts++; return r.abort(); } return r.fallback(); });
  await page.goto("/admin/staff"); await page.getByRole("button", { name: "+ Tạo nhân viên" }).click();
  await page.getByLabel("Họ và tên *").fill("Mất phản hồi"); await page.getByLabel("Email *", { exact: true }).fill("lost@example.test"); await page.getByLabel("Số điện thoại *").fill("0912 345 678"); await page.getByRole("dialog").getByRole("button", { name: "Tạo nhân viên", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cần kiểm tra lại trạng thái" })).toBeVisible(); await page.reload();
  await expect(page.getByRole("button", { name: "+ Tạo nhân viên" })).toBeDisabled(); await expect(page.getByRole("button", { name: "Đã kiểm tra, tiếp tục" })).toBeDisabled();
  await page.getByRole("button", { name: "Kiểm tra lại trạng thái" }).click(); await page.getByRole("button", { name: "Đã kiểm tra, tiếp tục" }).click();
  await expect(page.getByRole("button", { name: "+ Tạo nhân viên" })).toBeEnabled(); expect(posts).toBe(1); expect(writes(s)).toHaveLength(0);
});
test("known command 503/malformed response stays uncertain and explicit owned GET permits a new decision", async ({ page }) => {
  const s = await setup(page); s.account.passwordSetupCompleted = true; let posts = 0;
  await page.route(`**/api/v1/admin/staff/${ID}/status`, r => { posts++; s.account.status = "ACTIVE"; return r.fulfill({ status: 503, json: { detail: "private SMTP password" } }); });
  await page.goto(`/admin/staff/${ID}`); await page.getByRole("button", { name: "Kích hoạt tài khoản", exact: true }).click(); await page.getByRole("button", { name: "Xác nhận kích hoạt tài khoản" }).click();
  await expect(page.getByRole("heading", { name: "Cần kiểm tra lại trạng thái" })).toBeVisible(); await page.getByRole("dialog").getByRole("button", { name: "Hủy" }).click();
  await page.getByRole("button", { name: "Kiểm tra lại trạng thái" }).click(); await page.getByRole("button", { name: "Đã kiểm tra, tiếp tục" }).click();
  await expect(page.getByRole("button", { name: "Khóa tài khoản", exact: true })).toBeEnabled(); expect(posts).toBe(1); await expect(page.getByText("private SMTP password")).toHaveCount(0);
});
test("429 honors Retry-After without reissuing or leaking provider errors", async ({ page }) => {
  await setup(page); let posts = 0; await page.route(`**/api/v1/admin/staff/${ID}/invitations`, r => { posts++; return r.fulfill({ status: 429, headers: { "Retry-After": "2" }, json: { detail: "private" } }); });
  await page.goto(`/admin/staff/${ID}`); await page.getByRole("button", { name: "Cấp lại lời mời", exact: true }).click(); await page.getByRole("button", { name: "Xác nhận cấp lại lời mời" }).click();
  await expect(page.getByRole("button", { name: "Xác nhận cấp lại lời mời" })).toBeDisabled(); await expect(page.getByRole("button", { name: "Xác nhận cấp lại lời mời" })).toBeEnabled({ timeout: 5000 }); expect(posts).toBe(1);
});
test("list pagination uses supported GET page/size without invented totals", async ({ page }) => {
  const s = await setup(page); s.list = Array.from({ length: 20 }, (_, i) => ({ ...staff(), id: String(BigInt(ID) + BigInt(i)) }));
  await page.route("**/api/v1/admin/staff?**", r => r.fulfill({ json: new URL(r.request().url()).searchParams.get("page") === "1" ? [] : s.list }));
  await page.goto("/admin/staff"); await page.getByRole("link", { name: "Trang tiếp", exact: true }).click(); await expect(page).toHaveURL("/admin/staff?page=1");
  await expect(page.getByRole("heading", { name: "Chưa có nhân viên trên trang này" })).toBeVisible(); await expect(page.getByRole("link", { name: "Trang trước" })).toBeVisible(); await expect(page.getByRole("link", { name: "Trang tiếp" })).toHaveCount(0);
});
test("list loading/unavailable/empty states and Cinema selector failure stay read-only", async ({ page }) => {
  const s = await setup(page); let release!: () => void; const pending = new Promise<void>(r => { release = r; }); let reads = 0;
  await page.route("**/api/v1/admin/staff?**", async r => { if (++reads === 1) { await pending; return r.fulfill({ status: 503, json: { detail: "private" } }); } return r.fulfill({ json: [] }); });
  await page.goto("/admin/staff"); await expect(page.getByText("Đang tải thông tin nhân viên…")).toBeVisible(); release();
  await expect(page.getByRole("heading", { name: "Không thể tải thông tin" })).toBeVisible(); await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chưa có nhân viên trên trang này" })).toBeVisible();
  await page.route("**/api/v1/admin/cinemas", r => r.fulfill({ status: 503, json: {} }));
  await page.goto(`/admin/staff/${ID}`); await page.getByRole("button", { name: "+ Thêm phân công" }).click(); await expect(page.getByRole("dialog").getByRole("heading", { name: "Không thể tải thông tin" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Xác nhận phân công", exact: true })).toHaveCount(0); expect(writes(s)).toHaveLength(0);
});
test("malformed mutation response and 409 require review without exposing secrets or retrying", async ({ page }) => {
  const s = await setup(page); let posts = 0;
  await page.route(`**/api/v1/admin/staff/${ID}/invitations`, r => { posts++; return r.fulfill({ status: 200, contentType: "application/json", body: '{"id":123,"private":"never display"}' }); });
  await page.goto(`/admin/staff/${ID}`); await page.getByRole("button", { name: "Cấp lại lời mời", exact: true }).click(); await page.getByRole("button", { name: "Xác nhận cấp lại lời mời" }).click();
  await expect(page.getByRole("heading", { name: "Cần kiểm tra lại trạng thái" })).toBeVisible(); await expect(page.getByRole("button", { name: "Xác nhận cấp lại lời mời" })).toBeDisabled(); await expect(page.getByText("never display")).toHaveCount(0);
  await page.getByRole("dialog").getByRole("button", { name: "Hủy" }).click(); await page.getByRole("button", { name: "Kiểm tra lại trạng thái" }).click(); await page.getByRole("button", { name: "Đã kiểm tra, tiếp tục" }).click();
  await page.route(`**/api/v1/admin/staff/${ID}/invitations`, r => { posts++; return r.fulfill({ status: 409, json: {} }); });
  await page.getByRole("button", { name: "Cấp lại lời mời", exact: true }).click(); await page.getByRole("button", { name: "Xác nhận cấp lại lời mời" }).click();
  await expect(page.getByRole("heading", { name: "Cần kiểm tra lại trạng thái" })).toBeVisible(); expect(posts).toBe(2); expect(writes(s)).toHaveLength(0);
});
test("interrupted navigation preserves known Staff review through validated direct-entry reads", async ({ page }) => {
  await setup(page);
  await page.addInitScript(({ id }) => sessionStorage.setItem("smart-cinema.admin-staff-review", JSON.stringify({ nonce: "interrupted-fixture", staffId: id })), { id: ID });
  await page.goto("/admin/staff"); await page.getByRole("link", { name: `Kiểm tra nhân viên #${ID}` }).click();
  await expect(page).toHaveURL(`/admin/staff/${ID}`); await expect(page.getByRole("button", { name: "Cấp lại lời mời", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Kiểm tra lại trạng thái" }).click(); await page.getByRole("button", { name: "Đã kiểm tra, tiếp tục" }).click();
  await expect(page.getByRole("button", { name: "Cấp lại lời mời", exact: true })).toBeEnabled();
});
for (const status of [401, 403, 404]) test(`owned Staff read ${status} is safe and no command is rendered`, async ({ page }) => {
  await setup(page); await page.route(`**/api/v1/admin/staff/${ID}`, r => r.fulfill({ status, json: { detail: "private diagnostics" } }));
  await page.goto(`/admin/staff/${ID}`); await expect(page.getByRole("heading", { name: "Không thể tải thông tin" })).toBeVisible(); await expect(page.getByRole("button", { name: "Khóa tài khoản", exact: true })).toHaveCount(0); await expect(page.getByText("private diagnostics")).toHaveCount(0);
});
test("invalid/mismatched identifiers, forged local ADMIN and anonymous direct entry fail closed", async ({ page }) => {
  const s = await setup(page); await page.goto("/admin/staff/001"); await expect(page.getByRole("heading", { name: "Mã nhân viên không hợp lệ" })).toBeVisible(); expect(s.calls).toHaveLength(0);
  await page.route(`**/api/v1/admin/staff/${ID}`, r => r.fulfill({ json: { ...staff(), id: "1" } })); await page.goto(`/admin/staff/${ID}`); await expect(page.getByRole("heading", { name: "Không thể tải thông tin" })).toBeVisible();
  await page.route("**/api/v1/admin", r => r.fulfill({ status: 403, json: {} })); await page.goto("/admin/staff"); await expect(page.getByRole("heading", { name: "Không có quyền quản trị" })).toBeVisible();
});
test("anonymous Staff list/detail do not perform administration reads", async ({ page }) => {
  let reads = 0; await page.route("**/api/v1/admin**", r => { reads++; return r.abort(); });
  for (const url of ["/admin/staff", `/admin/staff/${ID}`]) { await page.goto(url); await expect(page.getByRole("heading", { name: "Cần đăng nhập" })).toBeVisible(); } expect(reads).toBe(0);
});
for (const width of [390, 768, 1440]) test(`Staff dialog keyboard/focus, long text and responsive UI at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 }); const s = await setup(page); s.account.fullName = "Nhân viên với họ tên tiếng Việt rất dài để kiểm tra bố cục";
  s.list[0].fullName = `Nhân viên ${"N".repeat(100)}`;
  await page.goto(`/admin/staff/${ID}`); const trigger = page.getByRole("button", { name: "Cấp lại lời mời", exact: true }); await trigger.focus(); await page.keyboard.press("Enter");
  const d = page.getByRole("dialog"); await expect(d).toBeVisible(); await page.screenshot({ path: `target/admin-staff-implementation-qa/reissue-${width}.png` }); const last = d.getByRole("button", { name: "Xác nhận cấp lại lời mời" }); await last.focus(); await page.keyboard.press("Tab"); expect(await d.evaluate(e => e.contains(document.activeElement))).toBe(true);
  await d.getByRole("button", { name: "Đóng hộp thoại" }).focus(); await page.keyboard.press("Shift+Tab"); expect(await d.evaluate(e => e.contains(document.activeElement))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.keyboard.press("Escape"); await expect(trigger).toBeFocused(); await page.screenshot({ path: `target/admin-staff-implementation-qa/detail-${width}.png`, fullPage: true });
  await page.getByRole("button", { name: "+ Thêm phân công" }).click(); await expect(page.getByLabel("Thời điểm có hiệu lực *")).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: `target/admin-staff-implementation-qa/add-${width}.png` }); await page.keyboard.press("Escape");
  await page.goto("/admin/staff"); await expect(page.getByRole("link", { name: "Xem chi tiết", exact: true }).filter({ visible: true })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: `target/admin-staff-implementation-qa/list-${width}.png`, fullPage: true }); await page.getByRole("button", { name: "+ Tạo nhân viên" }).click(); await expect(page.getByLabel("Số điện thoại *")).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: `target/admin-staff-implementation-qa/create-${width}.png` });
});
