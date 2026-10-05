import { mockDiscoveryReads, isCustomerReadPath } from "./helpers/customer-discovery";
import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

const MOVIE_ID = "9223372036854775807";
const CINEMA_ID = "9007199254740993";
const ROUTE = `/movies/${MOVIE_ID}/cinemas`;
const movie = { id: MOVIE_ID, title: "Cinema Journey", duration: 125, releaseDate: "2040-01-01", ageRating: "T13", language: "English", posterUrl: "https://media.example.test/cinema-movie.jpg", status: "PUBLISHED", genres: [{ id: "1", name: "Drama" }], description: null, trailerUrl: null };

async function prepare(page: Page) {
  await mockDiscoveryReads(page);
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ json: movie }));
  await page.route("https://media.example.test/**", route => route.fulfill({ path: resolve("public/images/movies/dune-part-two.jpg") }));
}

test("detail to Cinema route preserves Movie/filter context and selects only eligible API options", async ({ page }) => {
  await prepare(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/v1/cinemas?**", async route => { await pending; await route.fallback(); });
  const apiPaths: string[] = [];
  page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/api/")) apiPaths.push(path); });
  await page.goto(`/movies/${MOVIE_ID}?from=${encodeURIComponent("/movies?q=journey&page=2")}`);
  await page.getByRole("link", { name: /Chọn rạp/ }).click();
  await expect(page).toHaveURL(new RegExp(`${ROUTE}\\?`));
  await expect(page.getByRole("region", { name: "Phim đã chọn" })).toContainText(movie.title);
  await expect(page.getByText("Đang tải danh sách rạp…", { exact: true })).toBeVisible();
  release();
  await expect(page.getByRole("radio")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Tiếp tục chọn suất chiếu" })).toBeDisabled();
  await expect(page.getByRole("radio", { name: "Smart Rạp chiếu phim Riverside", exact: true })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "Smart Rạp chiếu phim West Lake", exact: true })).toHaveCount(0);
  await page.getByRole("radio", { name: "Smart Cinema Landmark", exact: true }).check();
  await expect(page).toHaveURL(new RegExp(`cinemaId=${CINEMA_ID}`));
  await expect(page.getByRole("complementary", { name: "Tóm tắt lựa chọn rạp" })).toContainText("Smart Cinema Landmark");
  await page.reload();
  await expect(page.getByRole("radio", { name: "Smart Cinema Landmark", exact: true })).toBeChecked();
  await page.getByRole("link", { name: "Về chi tiết phim", exact: true }).click();
  await expect(page.getByRole("link", { name: "Về danh sách phim", exact: true })).toHaveAttribute("href", /q=journey&page=2/);
  expect(apiPaths.every(isCustomerReadPath)).toBe(true);
});

test("Continue opens Showtime Selection with Movie/Cinema context", async ({ page }) => {
  await prepare(page);
  await page.goto(`${ROUTE}?cinemaId=${CINEMA_ID}`);
  const continueButton = page.getByRole("button", { name: "Tiếp tục chọn suất chiếu" });
  await expect(continueButton).toBeEnabled();
  await continueButton.click();
  await expect(page).toHaveURL(new RegExp(`${ROUTE}/${CINEMA_ID}/showtimes`));
  await expect(page.getByRole("region", { name: "Phim và rạp đã chọn" })).toContainText(movie.title);
  await expect(page.getByRole("region", { name: "Phim và rạp đã chọn" })).toContainText("Smart Cinema Landmark");
  await page.getByRole("link", { name: "Đổi rạp" }).click();
  await page.getByRole("radio", { name: "Smart Rạp chiếu phim Nguyen Trai", exact: true }).check();
  await expect(page.getByRole("radio", { name: "Smart Cinema Landmark", exact: true })).not.toBeChecked();
  await page.goBack();
  await expect(page.getByRole("radio", { name: "Smart Cinema Landmark", exact: true })).toBeChecked();
});

test("empty, closed/unavailable, stale choice and retry scenarios are accessible", async ({ page }) => {
  await prepare(page);
  await page.goto(`${ROUTE}?previewState=empty`);
  await expect(page.getByRole("heading", { name: "Chưa có rạp để chọn" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tiếp tục chọn suất chiếu" })).toBeDisabled();
  await page.goto(`${ROUTE}?previewState=unavailable&cinemaId=${CINEMA_ID}&step=showtimes`);
  await expect(page.getByText("Lựa chọn trước không còn khả dụng. Vui lòng chọn rạp khác.")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tiếp tục chọn suất chiếu" })).toBeDisabled();
  for (const radio of await page.getByRole("radio").all()) await expect(radio).toBeDisabled();
  await page.goto(`${ROUTE}?previewState=error`);
  await expect(page.getByRole("heading", { name: "Không thể tải rạp chiếu phim" })).toBeVisible();
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(page.getByRole("radio")).toHaveCount(2);
});

test("search is local and clearing no-match results restores options", async ({ page }) => {
  await prepare(page);
  await page.goto(ROUTE);
  await expect(page.getByRole("radio")).toHaveCount(2);
  await page.getByRole("searchbox", { name: "Tìm tên hoặc địa chỉ rạp" }).fill("not present");
  await expect(page.getByText("Không có rạp phù hợp với tìm kiếm.")).toBeVisible();
  await page.getByRole("button", { name: "Xóa tìm kiếm" }).click();
  await expect(page.getByRole("radio")).toHaveCount(2);
  await page.getByRole("searchbox", { name: "Tìm tên hoặc địa chỉ rạp" }).fill("Hanoi");
  await expect(page.getByText("Không có rạp phù hợp với tìm kiếm.")).toBeVisible();
});

test("invalid/hidden Movie contexts block Cinema selection and Movie failures can retry", async ({ page }) => {
  await prepare(page);
  await page.goto("/movies/invalid/cinemas");
  await expect(page.getByRole("heading", { name: "Liên kết phim không hợp lệ" })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ status: 404, json: { detail: "Không tìm thấy dữ liệu hoặc dữ liệu không còn khả dụng." } }));
  await page.goto(ROUTE);
  await expect(page.getByRole("heading", { name: "Phim không khả dụng" })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  let attempt = 0;
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill(++attempt === 1 ? { status: 503, body: "temporary" } : { json: movie }));
  await page.reload();
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(page.getByRole("radio")).toHaveCount(2);
});

test("canonical branch layout adapts to mobile and radio selection works with the keyboard", async ({ page }, testInfo) => {
  await prepare(page);
  await page.goto(ROUTE);
  const first = page.getByRole("radio", { name: "Smart Cinema Landmark", exact: true });
  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).toBeChecked();
  await page.screenshot({ path: testInfo.outputPath("cinema-selection-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("cinema-selection-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Tiếp tục chọn suất chiếu" }).click();
  await expect(page.getByRole("heading", { name: "Chọn suất chiếu", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Đổi rạp" }).click();
  await expect(first).toBeChecked();
});
