import { test, expect, type Page } from "@playwright/test";
const ID = "9007199254740993", MOVIE = "9007199254740994", CINEMA = "9007199254740995", HALL = "9007199254740996";
const initial = { id: ID, movieId: MOVIE, movieTitle: "Published Movie", cinemaId: CINEMA, cinemaName: "Rạp chiếu phim A", hallId: HALL, hallName: "Phòng chiếu A", startsAt: "2030-01-01T03:00:00Z", endsAt: "2030-01-01T05:00:00Z", occupiedUntil: "2030-01-01T05:00:00Z", bookingCutOff: "2030-01-01T03:00:00Z", basePrice: "90000.1234", status: "DRAFT", editable: true, transitions: ["SCHEDULED", "OPEN_FOR_BOOKING", "CANCELLED"] };
async function setup(page: Page) {
  await page.addInitScript(() => localStorage.setItem("smart-cinema.auth-session", JSON.stringify({ accessToken: "fixture-token", tokenType: "Bearer", expiresAt: Date.now() + 3600000, refreshToken: "fixture-refresh", refreshExpiresAt: Date.now() + 86400000, user: { id: 1, fullName: "Quản trị", email: "admin@example.test", role: "ADMIN" } })));
  await page.route("**/api/v1/admin", route => route.fulfill({ json: { id: "1", fullName: "Đã xác minh Quản trị", role: "ADMIN" } }));
  let saved = { ...initial }; const writes: Record<string, string>[] = [];
  await page.route("**/api/v1/admin/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    if (path === "/api/v1/admin/cinemas") return route.fulfill({ json: [{ id: CINEMA, name: "Rạp chiếu phim A", address: "Địa chỉ", status: "ACTIVE" }, { id: "102", name: "Rạp chiếu phim B", address: "Địa chỉ", status: "ACTIVE" }] });
    if (/\/cinemas\/\d+\/halls$/.test(path)) return route.fulfill({ json: path.includes(CINEMA) ? [{ id: HALL, cinemaId: CINEMA, name: "Phòng chiếu A", status: "ACTIVE", layoutInitialized: true, capacity: 4 }] : [] });
    if (path === "/api/v1/admin/movies") return route.fulfill({ json: { items: [{ id: MOVIE, title: "Published Movie", status: "PUBLISHED" }, { id: "103", title: "Hidden Phim", status: "DRAFT" }], page: 0, totalPages: 1 } });
    if (path === "/api/v1/admin/showtimes" && request.method() === "GET") return route.fulfill({ json: { timeZone: "Asia/Ho_Chi_Minh", items: url.searchParams.get("status") === "ENDED" ? [] : [saved] } });
    if (path === `/api/v1/admin/showtimes/${ID}` && request.method() === "GET") return route.fulfill({ json: { timeZone: "Asia/Ho_Chi_Minh", showtime: saved } });
    if (path.startsWith("/api/v1/admin/showtimes") && ["POST", "PUT"].includes(request.method())) {
      const body = request.postDataJSON(); writes.push(body);
      const retimed = body.startsAt !== saved.startsAt;
      const endsAt = retimed ? new Date(Date.parse(body.startsAt) + 120 * 60000).toISOString() : saved.endsAt;
      saved = { ...saved, ...body, endsAt, occupiedUntil: retimed ? endsAt : saved.occupiedUntil, bookingCutOff: retimed ? body.startsAt : saved.bookingCutOff, editable: body.status !== "CANCELLED", transitions: body.status === "CANCELLED" ? [] : body.status === "OPEN_FOR_BOOKING" ? ["CANCELLED"] : ["OPEN_FOR_BOOKING", "CANCELLED"] };
      return route.fulfill({ status: request.method() === "POST" ? 201 : 200, json: { timeZone: "Asia/Ho_Chi_Minh", showtime: saved } });
    }
    return route.fallback();
  });
  return writes;
}
test("Showtime routes independently guard anonymous, forged and stale Admin", async ({ page }) => {
  for (const path of ["/admin/showtimes", "/admin/showtimes/new", `/admin/showtimes/${ID}/edit`]) {
    await page.goto(path); await expect(page.getByRole("heading", { name: "Cần đăng nhập" })).toBeVisible();
  }
  await setup(page);
  await page.route("**/api/v1/admin", route => route.fulfill({ status: 403, json: { detail: "Active Quản trị required." } }));
  await page.goto("/admin/showtimes/new"); await expect(page.getByRole("heading", { name: "Không có quyền quản trị" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lưu suất chiếu" })).toHaveCount(0);
});
test("list, strict filters, empty and retry states are accessible", async ({ page }) => {
  await setup(page); let calls = 0;
  await page.route("**/api/v1/admin/showtimes", route => ++calls === 1 ? route.fulfill({ status: 503, json: { detail: "Temporary schedule outage" } }) : route.fallback());
  await page.goto("/admin/showtimes"); await expect(page.getByRole("main").getByRole("alert")).toContainText("Không thể kết nối hoặc xác nhận phản hồi từ máy chủ. Vui lòng thử lại.");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("article")).toContainText("90000.1234");
  await expect(page.getByRole("article")).toContainText("01/01/2030 10:00");
  await page.getByRole("combobox", { name: "Trạng thái", exact: true }).selectOption("ENDED");
  await page.getByRole("button", { name: "Áp dụng bộ lọc" }).click(); await expect(page.getByRole("status")).toHaveText("Không có suất chiếu phù hợp với bộ lọc.");
  await page.getByRole("button", { name: "Xóa", exact: true }).click(); await expect(page.getByRole("article")).toHaveCount(1);
});
test("dependent hierarchy, exact price, configured-zone create and forward lifecycle", async ({ page }, info) => {
  const writes = await setup(page); await page.goto("/admin/showtimes/new");
  await expect(page.getByText("Múi giờ lịch chiếu: Asia/Ho_Chi_Minh", { exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "Hidden Phim" })).toHaveCount(0);
  await expect(page.getByRole("option", { name: "STARTED", exact: true })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Phim", exact: true }).selectOption(MOVIE); await page.getByRole("combobox", { name: "Rạp chiếu phim", exact: true }).selectOption(CINEMA);
  await page.getByRole("combobox", { name: "Phòng chiếu", exact: true }).selectOption(HALL);
  await page.getByRole("combobox", { name: "Rạp chiếu phim", exact: true }).selectOption("102"); await expect(page.getByRole("combobox", { name: "Phòng chiếu", exact: true })).toHaveValue("");
  await page.getByRole("combobox", { name: "Rạp chiếu phim", exact: true }).selectOption(CINEMA); await page.getByRole("combobox", { name: "Phòng chiếu", exact: true }).selectOption(HALL);
  await page.getByLabel("Ngày", { exact: true }).fill("2030-01-02"); await page.getByLabel("Giờ", { exact: true }).fill("00:30");
  await page.getByLabel("Giá cơ bản", { exact: true }).fill("90000.1234"); await page.getByRole("combobox", { name: "Trạng thái suất chiếu", exact: true }).selectOption("OPEN_FOR_BOOKING");
  await page.getByRole("button", { name: "Lưu suất chiếu" }).click(); await expect(page.getByText("Đã lưu suất chiếu.", { exact: true })).toBeVisible();
  expect(writes).toEqual([{ movieId: MOVIE, hallId: HALL, startsAt: "2030-01-01T17:30:00.000Z", basePrice: "90000.1234", status: "OPEN_FOR_BOOKING" }]);
  await expect(page.getByRole("combobox", { name: "Phòng chiếu", exact: true })).toBeDisabled();
  await expect(page.getByRole("option", { name: "Bản nháp", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Suất chiếu đã lưu" })).toContainText("02/01/2030 02:30");
  await page.screenshot({ path: info.outputPath("showtime-admin-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("showtime-admin-mobile.png"), fullPage: true });
  await page.getByRole("combobox", { name: "Trạng thái suất chiếu", exact: true }).selectOption("CANCELLED"); await page.getByRole("button", { name: "Lưu suất chiếu" }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Lưu suất chiếu" })).toBeDisabled();
  await expect(page.getByRole("region", { name: "Suất chiếu đã lưu" })).toContainText("Đã hủy");
});
test("duplicate submission remains one request and expected conflict can retry", async ({ page }) => {
  await setup(page); let calls = 0; let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**/api/v1/admin/showtimes/${ID}`, async route => {
    if (route.request().method() === "GET") return route.fallback();
    calls++; await pending;
    return calls === 1 ? route.fulfill({ status: 409, json: { detail: "Hiệntime Dữ liệu đã thay đổi hoặc thao tác bị xung đột. another screening." } }) : route.fallback();
  });
  await page.goto(`/admin/showtimes/${ID}/edit`); const save = page.getByRole("button", { name: "Lưu suất chiếu" });
  await save.click(); await expect(page.getByRole("button", { name: "Đang lưu…" })).toBeDisabled();
  await page.keyboard.press("Enter"); expect(calls).toBe(1); release();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Dữ liệu đã thay đổi hoặc thao tác bị xung đột."); await save.click(); await expect(page.getByText("Đã lưu suất chiếu.", { exact: true })).toBeVisible();
  expect(calls).toBe(2);
});
test("history/terminal detail is readable with no mutation controls", async ({ page }) => {
  await setup(page);
  await page.route(`**/api/v1/admin/showtimes/${ID}`, route => route.fulfill({ json: { timeZone: "Asia/Ho_Chi_Minh", showtime: { ...initial, editable: false, transitions: [] } } }));
  await page.goto(`/admin/showtimes/${ID}/edit`); await expect(page.getByRole("button", { name: "Lưu suất chiếu" })).toBeDisabled();
  await expect(page.getByRole("status").filter({ hasText: "Suất chiếu này chỉ được xem" })).toBeVisible(); await expect(page.getByRole("region", { name: "Suất chiếu đã lưu" })).toContainText(ID);
});
