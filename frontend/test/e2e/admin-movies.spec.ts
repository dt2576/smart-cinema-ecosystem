import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";

const BIG_ID = "9007199254740993";
const genre = { id: BIG_ID, name: "Drama" };
const movie = { id: BIG_ID, title: "Admin Movie", duration: 120, releaseDate: "2026-10-01", ageRating: "T13", language: "Vietnamese", posterUrl: "/file.svg", description: null, trailerUrl: null, status: "DRAFT", genres: [genre] };

async function session(page: Page, role = "ADMIN") {
  await page.addInitScript(({ role }) => localStorage.setItem("smart-cinema.auth-session", JSON.stringify({
    accessToken: "admin-test-token", tokenType: "Bearer", expiresAt: Date.now() + 3600_000,
    refreshToken: "test-refresh", refreshExpiresAt: Date.now() + 86400_000,
    user: { id: 1, fullName: "Quản trị Test", email: "admin@example.test", role },
  })), { role });
}
async function api(page: Page) {
  await page.route("**/api/v1/admin", route => route.fulfill({ json: { id: "1", fullName: "Đã xác minh Quản trị", role: "ADMIN" } }));
  await page.route("**/api/v1/genres", route => route.fulfill({ json: [genre] }));
  await page.route("**/api/v1/admin/movies?**", route => route.fulfill({ json: { items: [movie], page: 0, size: 20, totalElements: 1, totalPages: 1, sort: "title,asc" } }));
  await page.route(`**/api/v1/admin/movies/${BIG_ID}`, route => route.fulfill({ json: movie }));
}

test("all Admin deep links deny unauthenticated access before rendering management", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/v1/admin/**", route => { calls++; return route.abort(); });
  for (const path of ["/admin", "/admin/movies", "/admin/movies/new", `/admin/movies/${BIG_ID}/edit`]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Cần đăng nhập" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Đăng nhập", exact: true })).toHaveAttribute("href", "/login");
    await expect(page.getByRole("button", { name: /Tạo bản nháp|Lưu thay đổi/ })).toHaveCount(0);
  }
  expect(calls).toBe(0);
});
test("CUSTOMER and forged local Admin role cannot bypass backend authorization", async ({ page }) => {
  await session(page, "CUSTOMER"); await api(page);
  let movies = 0;
  await page.route("**/api/v1/admin/movies?**", route => { movies++; return route.abort(); });
  await page.route("**/api/v1/admin", route => route.fulfill({ status: 403, json: { detail: "Denied" } }));
  await page.goto("/admin/movies");
  await expect(page.getByRole("heading", { name: "Không có quyền quản trị" })).toBeVisible();
  await page.evaluate(() => { const saved = JSON.parse(localStorage.getItem("smart-cinema.auth-session")!); saved.user.role = "ADMIN"; localStorage.setItem("smart-cinema.auth-session", JSON.stringify(saved)); });
  await page.goto("/admin/movies/new");
  await expect(page.getByRole("heading", { name: "Không có quyền quản trị" })).toBeVisible();
  expect(movies).toBe(0);
});
test("Admin verification failure can retry and verified backend identity controls shell", async ({ page }) => {
  await session(page, "CUSTOMER"); await api(page);
  let calls = 0;
  await page.route("**/api/v1/admin", route => route.fulfill(++calls === 1 ? { status: 503, json: { detail: "Không thể kết nối hoặc xác nhận phản hồi từ máy chủ. Vui lòng thử lại." } } : { json: { id: "1", fullName: "Đã xác minh Quản trị", role: "ADMIN" } }));
  await page.goto("/admin");
  await expect(page.getByText("Không thể kết nối hoặc xác nhận phản hồi từ máy chủ. Vui lòng thử lại.")).toBeVisible();
  await page.getByRole("button", { name: "Kiểm tra lại quyền truy cập" }).click();
  await expect(page.getByRole("heading", { name: "Tổng quan" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Điều hướng quản trị" }).getByRole("link")).toHaveCount(4);
  await page.getByRole("link", { name: "Phim", exact: true }).click();
  await expect(page.getByRole("heading", { name: movie.title })).toBeVisible();
  expect(calls).toBe(3);
});
test("Movie list loading, API failure, retry, empty and pagination", async ({ page }) => {
  await session(page); await api(page);
  let calls = 0;
  await page.route("**/api/v1/admin/movies?**", async route => {
    await new Promise(resolve => setTimeout(resolve, 200));
    calls++;
    const query = new URL(route.request().url()).searchParams;
    await route.fulfill(calls === 1 ? { status: 503, json: { detail: "Try later" } } : { json: { items: query.get("q") === "missing" ? [] : [movie], page: Number(query.get("page")), size: 20, totalElements: 21, totalPages: 2, sort: "title,asc" } });
  });
  await page.goto("/admin/movies");
  await expect(page.getByText("Đang tải phim…")).toBeVisible();
  await page.getByRole("button", { name: "Tải lại phim" }).click();
  await expect(page.getByRole("heading", { name: movie.title })).toBeVisible();
  await expect(page.getByRole("link", { name: `Chỉnh sửa ${movie.title}` })).toHaveAttribute("href", `/admin/movies/${BIG_ID}/edit`);
  await page.getByRole("button", { name: "Sau", exact: true }).click();
  await expect(page.getByText("Trang 2 trên 2", { exact: false })).toBeVisible();
  await page.getByLabel("Tìm theo tên phim").fill("missing");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Không tìm thấy phim" })).toBeVisible();
});
test("create form uses real Genre options, validates and saves a draft with string IDs", async ({ page }) => {
  await session(page); await api(page);
  let payload: unknown;
  await page.route("**/api/v1/admin/movies", route => { payload = route.request().postDataJSON(); return route.fulfill({ status: 201, json: movie }); });
  await page.goto("/admin/movies/new");
  await page.getByRole("button", { name: "Tạo bản nháp" }).click();
  await expect(page.getByText("Nhập tên phim không quá 255 ký tự.")).toBeVisible();
  await page.getByLabel("Tên phim", { exact: false }).fill("New draft");
  await page.getByLabel("Thời lượng (phút)", { exact: false }).fill("120");
  await page.getByRole("checkbox", { name: "Drama" }).check();
  await page.getByRole("button", { name: "Tạo bản nháp" }).click();
  await expect(page).toHaveURL(/\/admin\/movies\?created=1$/);
  await expect(page.getByText("Đã tạo bản nháp phim.", { exact: false })).toBeVisible();
  expect(payload).toEqual({ title: "New draft", duration: 120, releaseDate: null, ageRating: null, language: null, posterUrl: null, description: null, trailerUrl: null, genreIds: [BIG_ID] });
});
test("edit saves supported fields and publication failures retain useful feedback", async ({ page }) => {
  await session(page); await api(page);
  let saved: unknown;
  await page.route(`**/api/v1/admin/movies/${BIG_ID}`, route => {
    if (route.request().method() === "PUT") { saved = route.request().postDataJSON(); return route.fulfill({ json: movie }); }
    return route.fulfill({ json: movie });
  });
  await page.goto(`/admin/movies/${BIG_ID}/edit`);
  await expect(page.getByLabel("Tên phim", { exact: false })).toHaveValue(movie.title);
  await page.getByLabel("Tên phim", { exact: false }).fill("Edited Movie");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByText("Đã lưu thay đổi của phim.")).toBeVisible();
  expect((saved as { title: string }).title).toBe("Edited Movie");
  await page.getByRole("link", { name: "Về danh sách phim", exact: false }).click();
  await page.route(`**/api/v1/admin/movies/${BIG_ID}/publication`, route => route.fulfill({ status: 400, json: { detail: "Thông tin không hợp lệ. Vui lòng kiểm tra các trường và thử lại.", errors: { posterUrl: "Required" } } }));
  await page.getByRole("button", { name: `Công bố ${movie.title}` }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Thông tin không hợp lệ. Vui lòng kiểm tra các trường và thử lại.");
  await expect(page.getByRole("button", { name: /Xóa/ })).toHaveCount(0);
});
test("publication and unpublication reload authoritative server state", async ({ page }) => {
  await session(page); await api(page);
  let status = "DRAFT";
  await page.route("**/api/v1/admin/movies?**", route => route.fulfill({ json: { items: [{ ...movie, status }], page: 0, size: 20, totalElements: 1, totalPages: 1, sort: "title,asc" } }));
  await page.route(`**/api/v1/admin/movies/${BIG_ID}/publication`, route => {
    status = route.request().postDataJSON().status;
    return route.fulfill({ json: { ...movie, status } });
  });
  await page.goto("/admin/movies");
  await page.getByRole("button", { name: `Công bố ${movie.title}` }).click();
  await expect(page.getByRole("button", { name: `Ngừng công bố ${movie.title}` })).toBeVisible();
  await page.getByRole("button", { name: `Ngừng công bố ${movie.title}` }).click();
  await expect(page.getByText("Ngừng công bố", { exact: true })).toBeVisible();
});
test("form missing Movie, Genre retry, server validation and expired access", async ({ page }) => {
  await session(page); await api(page);
  await page.route("**/api/v1/admin/movies/404", route => route.fulfill({ status: 404, json: { detail: "Không tìm thấy dữ liệu hoặc dữ liệu không còn khả dụng." } }));
  await page.goto("/admin/movies/404/edit");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Không tìm thấy dữ liệu hoặc dữ liệu không còn khả dụng.");
  let genres = 0;
  await page.route("**/api/v1/genres", route => route.fulfill(++genres === 1 ? { status: 503, body: "outage" } : { json: [genre] }));
  await page.goto("/admin/movies/new");
  await page.getByRole("button", { name: "Tải lại biểu mẫu" }).click();
  await page.getByLabel("Tên phim", { exact: false }).fill("Invalid");
  await page.getByLabel("Thời lượng (phút)", { exact: false }).fill("120");
  await page.route("**/api/v1/admin/movies", route => route.fulfill({ status: 400, json: { detail: "Invalid title", errors: { title: "Rejected by server" } } }));
  await page.getByRole("button", { name: "Tạo bản nháp" }).click();
  await expect(page.getByText("Thông tin không hợp lệ. Vui lòng kiểm tra các trường và thử lại.")).toBeVisible();
  await page.route("**/api/v1/admin/movies", route => route.fulfill({ status: 401, json: { detail: "Expired token" } }));
  await page.getByRole("button", { name: "Tạo bản nháp" }).click();
  await expect(page.getByRole("heading", { name: "Không có quyền quản trị" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tạo bản nháp" })).toHaveCount(0);
});
test("desktop/mobile shell and forms have no overflow and keyboard controls work", async ({ page }) => {
  await session(page); await api(page);
  await page.goto("/admin/movies");
  await expect(page.getByRole("heading", { name: movie.title })).toBeVisible();
  await page.screenshot({ path: resolve("test-results/admin-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Thêm phim", exact: true }).click();
  await expect(page.getByRole("button", { name: "Tạo bản nháp" })).toBeVisible();
  await page.getByLabel("Tên phim", { exact: false }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Thời lượng (phút)", { exact: false })).toBeFocused();
  await page.getByRole("checkbox", { name: "Drama" }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("checkbox", { name: "Drama" })).toBeChecked();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: resolve("test-results/admin-mobile.png"), fullPage: true });
});
