import { expect, test, type Page } from "@playwright/test";
import { managerCinema, managerHall, managerSeats, managerShowtime, managerAccount, managerAssignment } from "../fixtures/manager-operations";

// All scenarios here are HTTP fixtures. Real local browser evidence is reported separately.
async function setup(page: Page, role = "MANAGER") {
  await page.addInitScript(role => localStorage.setItem("smart-cinema.auth-session", JSON.stringify({ accessToken: "fixture-operations", tokenType: "Bearer", expiresAt: Date.now() + 3600000, refreshToken: "fixture-refresh", refreshExpiresAt: Date.now() + 86400000, user: { id: 61, email: "manager@example.test", fullName: "Quản lý thử nghiệm", role } })), role);
  const state = { cinemas: [structuredClone(managerCinema)], halls: [structuredClone(managerHall)], seats: structuredClone(managerSeats), showtime: structuredClone(managerShowtime), assignments: [structuredClone(managerAssignment)], writes: [] as { path: string; body: Record<string, unknown> }[], deny: false };
  await page.route("**/api/v1/**", async r => {
    const q = r.request(), u = new URL(q.url()), p = u.pathname, write = q.method() !== "GET";
    if (p.startsWith("/api/v1/manager")) { expect(q.headers().authorization).toBe("Bearer fixture-operations"); if (role !== "MANAGER" || state.deny) return r.fulfill({ status: 403, json: { detail: "private error" } }); }
    if (p.startsWith("/api/v1/admin") && role !== "ADMIN") return r.fulfill({ status: 403, json: {} });
    const body = write ? q.postDataJSON() : undefined;
    if (write) state.writes.push({ path: p, body });
    let value: unknown;
    if (p === "/api/v1/admin") value = { id: "1", fullName: "QA Admin", role: "ADMIN" };
    else if (p === "/api/v1/admin/managers") value = [managerAccount];
    else if (p === "/api/v1/admin/cinemas") value = [managerCinema];
    else if (p.endsWith("/cinema-assignments/71/status")) { state.assignments[0].status = body.status; value = state.assignments[0]; }
    else if (p.endsWith("/cinema-assignments")) { if (write) { state.assignments.push({ ...managerAssignment, id: "72", cinemaId: body.cinemaId, effectiveAt: body.effectiveAt }); value = state.assignments.at(-1); } else value = state.assignments; }
    else if (p === "/api/v1/manager/cinemas") value = state.cinemas;
    else if (p === "/api/v1/manager/cinemas/11") value = managerCinema;
    else if (p === "/api/v1/manager/cinemas/11/halls") { if (write) { state.halls.push({ ...managerHall, ...body, id: "22", layoutInitialized: false }); value = state.halls.at(-1); } else value = state.halls; }
    else if (p === "/api/v1/manager/halls/21") { if (write) Object.assign(state.halls[0], body); value = state.halls[0]; }
    else if (p === "/api/v1/manager/halls/21/seats") { if (write) { state.seats = body.units.map((s: object, i: number) => ({ ...s, id: String(31 + i), hallId: "21", guestCapacity: (s as { type: string }).type === "COUPLE" ? 2 : 1, structureEditable: true })); value = state.seats; } else value = state.seats; }
    else if (/\/manager\/seats\/3[12]$/.test(p)) { const seat = state.seats.find(s => p.endsWith("/" + s.id))!; if (write) Object.assign(seat, body); value = seat; }
    else if (p.endsWith("/cinemas/11/staff")) value = [{ ...managerAccount, id: "81", assignmentId: "91", effectiveAt: "2026-01-01T00:00:00Z" }];
    else if (p.endsWith("/cinemas/11/staff-assignments")) value = [{ staff: { ...managerAccount, id: "81" }, assignment: { id: "91", userId: "81", cinemaId: "11", cinemaName: managerCinema.name, assignmentType: "STAFF", status: "ACTIVE", effectiveAt: "2026-01-01T00:00:00Z" } }];
    else if (p === "/api/v1/manager/showtimes") { if (write) Object.assign(state.showtime, body); value = write ? { timeZone: "Asia/Ho_Chi_Minh", showtime: state.showtime } : { timeZone: "Asia/Ho_Chi_Minh", items: [state.showtime].filter(s => !u.searchParams.has("status") || s.status === u.searchParams.get("status")) }; }
    else if (p === "/api/v1/manager/showtimes/41") { if (write) Object.assign(state.showtime, body); value = { timeZone: "Asia/Ho_Chi_Minh", showtime: state.showtime }; }
    else if (p === "/api/v1/movies") value = { items: [{ id: "51", title: "Phim thử nghiệm", status: "PUBLISHED" }], page: 0, totalPages: 1, totalElements: 1, size: 50 };
    else return r.fulfill({ status: 404, json: {} });
    return r.fulfill({ status: q.method() === "POST" ? 201 : 200, json: value });
  });
  return state;
}
test("assigned Cinema detail keeps Admin controls absent and reports use Manager routes", async ({ page }) => {
  const state = await setup(page); await page.goto("/manager/cinemas"); await page.getByRole("link", { name: "Xem chi tiết" }).click();
  await expect(page.getByRole("heading", { name: "Danh sách phòng chiếu" })).toBeVisible(); await expect(page.getByRole("link", { name: "Quản lý tình trạng ghế", exact: true })).toHaveCount(2);
  await expect(page.getByRole("link", { name: /Phân công Quản lý/ })).toHaveCount(0);
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Tổng quan", exact: true })).toHaveAttribute("href", "/manager/dashboard");
  await expect(page.getByRole("link", { name: "Báo cáo & Thống kê", exact: true })).toHaveAttribute("href", "/manager/reports");
  expect(state.writes).toHaveLength(0);
});
test("Hall creation and frozen capacity edit use exact API fields", async ({ page }) => {
  const state = await setup(page); await page.goto("/manager/cinemas/11"); await page.getByRole("button", { name: "Thêm phòng chiếu", exact: true }).click();
  await page.getByLabel("Tên phòng chiếu", { exact: true }).fill("Phòng mới"); await page.getByLabel("Loại phòng chiếu").fill("2D"); await page.getByLabel("Sức chứa (số khách)").fill("3"); await page.getByRole("button", { name: "Lưu phòng chiếu", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Phòng mới", exact: true })).toBeVisible(); expect(state.writes[0].body).toEqual({ name: "Phòng mới", capacity: 3, type: "2D", status: "ACTIVE" });
  await page.getByRole("button", { name: "Sửa thông tin Phòng thử nghiệm" }).click(); await expect(page.getByLabel("Sức chứa (số khách)")).toBeDisabled(); await page.getByLabel("Trạng thái phòng chiếu").selectOption("MAINTENANCE"); await page.getByRole("button", { name: "Lưu phòng chiếu", exact: true }).click(); await expect(page.getByRole("dialog")).toHaveCount(0); expect(state.writes[1].body.status).toBe("MAINTENANCE");
});
test("operational Seat grid keeps whole COUPLE, freezes structure and confirms physical state", async ({ page }) => {
  const state = await setup(page); await page.goto("/manager/halls/21/seats"); await page.getByRole("button", { name: /^Ghế A2-3/ }).click();
  await expect(page.getByLabel("Hàng ghế", { exact: true })).toBeDisabled(); await expect(page.getByLabel("Loại ghế", { exact: true })).toBeDisabled(); await expect(page.getByLabel("Trạng thái ghế").locator("option")).toHaveCount(3);
  await page.getByLabel("Trạng thái ghế").selectOption("ACTIVE"); await page.getByRole("button", { name: "Lưu ghế", exact: true }).click(); expect(state.writes).toHaveLength(0); await page.getByRole("button", { name: "Xác nhận thay đổi", exact: true }).click(); await expect(page.getByRole("dialog")).toHaveCount(0); expect(state.writes).toEqual([{ path: "/api/v1/manager/seats/32", body: { row: "A", number: "2-3", type: "COUPLE", physicalStatus: "ACTIVE" } }]);
});
test("empty layout initializes once with complete guest capacity, no persistent append/delete", async ({ page }) => {
  const state = await setup(page); state.seats = []; state.halls[0].layoutInitialized = false;
  await page.goto("/manager/halls/21/seats"); await page.getByRole("button", { name: "Thêm ghế nháp" }).click(); const types = page.getByLabel("Loại ghế", { exact: true }); await types.nth(1).selectOption("COUPLE"); await page.getByLabel("Số ghế", { exact: true }).nth(1).fill("2-3");
  await page.getByRole("button", { name: "Khởi tạo sơ đồ", exact: true }).click(); await page.getByRole("button", { name: "Xác nhận khởi tạo" }).click(); await expect(page.getByRole("button", { name: /^Ghế A2-3/ })).toBeVisible(); expect(state.writes).toHaveLength(1); await expect(page.getByRole("button", { name: "Thêm ghế nháp" })).toHaveCount(0);
});
test("Showtime edit preserves exact price and unchanged microsecond instant, no unsupported transitions", async ({ page }) => {
  const state = await setup(page); await page.goto("/manager/showtimes/41/edit"); await expect(page.getByLabel("Giá cơ bản (VND)")).toHaveValue("999999999999999.1234");
  await expect(page.getByLabel("Trạng thái suất chiếu").locator('option[value="STARTED"],option[value="ENDED"],option[value="CANCELLED"]')).toHaveCount(0);
  await page.getByLabel("Giá cơ bản (VND)").fill("12345.6789"); await page.getByRole("button", { name: "Lưu suất chiếu" }).click(); await expect(page.getByText("Đã lưu thay đổi.")).toBeVisible(); expect(state.writes[0].body.startsAt).toBe(managerShowtime.startsAt); expect(state.writes[0].body.basePrice).toBe("12345.6789");
});
test("Showtime create uses public Movie options, scoped Hall and configured timezone", async ({ page }) => {
  const state = await setup(page); await page.goto("/manager/showtimes/new"); await page.getByLabel("Phim", { exact: true }).selectOption("51"); await page.getByLabel("Rạp chiếu phim", { exact: true }).selectOption("11"); await page.getByLabel("Phòng chiếu", { exact: true }).selectOption("21"); await page.getByLabel("Ngày giờ bắt đầu").fill("2035-10-29T10:00"); await page.getByLabel("Giá cơ bản (VND)").fill("90000.1234"); await page.getByRole("button", { name: "Lưu suất chiếu" }).click();
  await expect(page).toHaveURL(/\/manager\/showtimes\/41\/edit$/); expect(state.writes[0].body.startsAt).toBe("2035-10-29T03:00:00.000Z"); expect(state.writes).toHaveLength(1);
});
test("409 scheduling conflict requires authenticated recheck without automatic replay", async ({ page }) => {
  const state = await setup(page); let writes = 0; await page.route("**/api/v1/manager/showtimes/41", r => r.request().method() === "PUT" ? (writes++, r.fulfill({ status: 409, json: { detail: "private SQL" } })) : r.fallback());
  await page.goto("/manager/showtimes/41/edit"); await page.getByRole("button", { name: "Lưu suất chiếu" }).click(); await expect(page.getByRole("button", { name: "Kiểm tra dữ liệu đã lưu" })).toBeVisible(); await expect(page.getByRole("button", { name: "Lưu suất chiếu" })).toBeDisabled(); expect(writes).toBe(1); expect(state.writes).toHaveLength(0); await page.getByRole("button", { name: "Kiểm tra dữ liệu đã lưu" }).click(); await expect(page.getByRole("button", { name: "Lưu suất chiếu" })).toBeEnabled(); expect(writes).toBe(1); await expect(page.getByText("private SQL")).toHaveCount(0);
});
test("lost Hall create response survives reload and never repeats POST", async ({ page }) => {
  await setup(page); let posts = 0; await page.route("**/api/v1/manager/cinemas/11/halls", r => r.request().method() === "POST" ? (posts++, r.abort()) : r.fallback());
  await page.goto("/manager/cinemas/11"); await page.getByRole("button", { name: "Thêm phòng chiếu", exact: true }).click(); await page.getByLabel("Tên phòng chiếu", { exact: true }).fill("Hall"); await page.getByLabel("Loại phòng chiếu").fill("2D"); await page.getByRole("button", { name: "Lưu phòng chiếu" }).click(); await expect(page.getByRole("button", { name: "Kiểm tra dữ liệu đã lưu" })).toBeVisible();
  await page.reload(); await page.getByRole("button", { name: "Thêm phòng chiếu", exact: true }).click(); await expect(page.getByRole("button", { name: "Lưu phòng chiếu" })).toBeDisabled(); expect(posts).toBe(1); await page.getByRole("button", { name: "Kiểm tra dữ liệu đã lưu" }).click(); await expect(page.getByRole("dialog")).toHaveCount(0); expect(posts).toBe(1);
});
test("Staff screen preserves contact/account reads, adds scoped detail entry and no HR/account controls", async ({ page }) => {
  const state = await setup(page); await page.goto("/manager/staff"); await expect(page.getByText("manager@example.test", { exact: true }).filter({ visible: true })).toBeVisible(); await expect(page.getByRole("link", { name: "Xem chi tiết", exact: true })).toBeVisible(); await expect(page.getByRole("link", { name: "Xem chi tiết", exact: true })).toHaveAttribute("href", "/manager/cinemas/11/staff/81"); await expect(page.getByRole("button", { name: /Tạo nhân viên|Sửa hồ sơ|Mời|Ca trực|Khóa tài khoản/ })).toHaveCount(0); expect(state.writes).toHaveLength(0);
});
test("ADMIN Manager assignment keeps immutable history and distinguishes future grants", async ({ page }) => {
  const state = await setup(page, "ADMIN"); state.assignments = [];
  await page.goto("/admin/managers"); await page.getByLabel("Tài khoản Quản lý", { exact: true }).selectOption("61"); await page.getByRole("button", { name: "Thêm phân công rạp" }).click(); await page.getByRole("dialog").getByLabel("Rạp chiếu phim").selectOption("11"); await page.getByLabel("Bắt đầu phân công (GMT+7)").fill("2035-10-28T10:00"); await page.getByRole("button", { name: "Xác nhận phân công", exact: true }).click(); await expect(page.getByText("Sẽ có hiệu lực", { exact: true })).toBeVisible(); expect(state.writes[0].body).toEqual({ cinemaId: "11", effectiveAt: "2035-10-28T03:00:00.000Z" });
  // Fixture status endpoint follows the existing generated identity.
  await page.route("**/api/v1/admin/managers/61/cinema-assignments/72/status", r => { state.assignments[0].status = r.request().postDataJSON().status; return r.fulfill({ json: state.assignments[0] }); });
  await page.getByRole("button", { name: "Ngừng phân công", exact: true }).click(); await page.getByRole("button", { name: "Xác nhận thay đổi" }).click(); await expect(page.getByText("Đã ngừng phân công", { exact: true })).toBeVisible(); await page.getByRole("button", { name: "Khôi phục phân công", exact: true }).click(); await page.getByRole("button", { name: "Xác nhận thay đổi" }).click(); await expect(page.getByText("Sẽ có hiệu lực", { exact: true })).toBeVisible(); await expect(page.getByRole("button", { name: "Sửa phân công" })).toHaveCount(0);
});
for (const role of ["CUSTOMER", "STAFF", "ADMIN"]) test(`${role} cannot enter Manager workspace even with forged session hint`, async ({ page }) => { await setup(page, role); await page.goto("/manager/cinemas"); await expect(page.getByRole("heading", { name: "Chưa tải được thông tin" })).toBeVisible(); await expect(page.getByRole("navigation", { name: "Điều hướng quản lý rạp" })).toHaveCount(0); });
test("Manager cannot enter ADMIN assignment interface", async ({ page }) => { await setup(page); await page.goto("/admin/managers"); await expect(page.getByRole("heading", { name: "Không có quyền quản trị" })).toBeVisible(); await expect(page.getByRole("button", { name: "Thêm phân công rạp" })).toHaveCount(0); });
test("revoked scope on subsequent route removes operational UI", async ({ page }) => { const state = await setup(page); await page.goto("/manager/cinemas"); await expect(page.getByRole("heading", { name: "Rạp được phân công", exact: true })).toBeVisible(); state.deny = true; await page.getByRole("navigation").getByRole("link", { name: "Quản lý suất chiếu" }).click(); await expect(page.getByRole("heading", { name: "Chưa tải được thông tin" })).toBeVisible(); });
test("foreign nested Hall and mismatched server identity are rejected", async ({ page }) => { await setup(page); await page.goto("/manager/halls/999/seats"); await expect(page.getByRole("heading", { name: "Chưa tải được thông tin" })).toBeVisible(); await page.route("**/api/v1/manager/halls/21", r => r.fulfill({ json: { ...managerHall, id: "999" } })); await page.goto("/manager/halls/21/seats"); await expect(page.getByRole("heading", { name: "Chưa tải được thông tin" })).toBeVisible(); await expect(page.getByRole("button", { name: /^Ghế A/ })).toHaveCount(0); });
test("loading, empty and safe 503 recovery states", async ({ page }) => { const state = await setup(page); state.cinemas = []; await page.goto("/manager/cinemas"); await expect(page.getByText(/Chưa có rạp được phân công/)).toBeVisible(); await page.route("**/api/v1/manager/cinemas", async r => { await new Promise(resolve => setTimeout(resolve, 600)); await r.fulfill({ status: 503, json: { detail: "private SQL" } }); }); await page.reload(); await expect(page.getByText("Đang tải dữ liệu…")).toBeVisible(); await expect(page.getByRole("heading", { name: "Chưa tải được thông tin" })).toBeVisible(); await expect(page.getByText("private SQL")).toHaveCount(0); });
for (const width of [390, 768, 1440]) test(`responsive ${width}, dialog keyboard focus, labels and overflow`, async ({ page }) => {
  await setup(page); await page.setViewportSize({ width, height: 1000 }); await page.goto("/manager/cinemas/11"); await page.getByRole("button", { name: "Thêm phòng chiếu", exact: true }).click(); const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible(); await expect(page.getByLabel("Tên phòng chiếu", { exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Lưu phòng chiếu", exact: true }).focus(); await page.keyboard.press("Tab"); await expect(page.getByRole("button", { name: "Đóng hộp thoại" })).toBeFocused(); await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); await expect(page.getByRole("button", { name: "Thêm phòng chiếu", exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.goto("/manager/halls/21/seats"); await expect(page.getByRole("button", { name: /^Ghế A1/ })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("anonymous direct entry offers safe Manager login resume", async ({ page }) => { await page.goto("/manager/halls/21/seats"); await expect(page.getByRole("link", { name: "Đăng nhập", exact: true })).toHaveAttribute("href", "/login?returnTo=%2Fmanager%2Fhalls%2F21%2Fseats"); });
