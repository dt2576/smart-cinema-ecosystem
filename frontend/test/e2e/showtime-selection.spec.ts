import { mockDiscoveryReads, isCustomerReadPath } from "./helpers/customer-discovery";
import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

const MOVIE_ID = "9223372036854775807";
const CINEMA_ID = "9007199254740993";
const ROUTE = `/movies/${MOVIE_ID}/cinemas/${CINEMA_ID}/showtimes`;
const movie = { id: MOVIE_ID, title: "Showtime Journey", duration: 125, releaseDate: "2029-01-01", ageRating: "T13", language: "English", posterUrl: "https://media.example.test/showtime.jpg", status: "PUBLISHED", genres: [], description: null, trailerUrl: null };

async function prepare(page: Page) {
  await mockDiscoveryReads(page);
  await page.clock.setFixedTime(new Date("2030-01-01T09:00:00+07:00"));
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ json: movie }));
  await page.route("https://media.example.test/**", route => route.fulfill({ path: resolve("public/images/movies/dune-part-two.jpg") }));
}

test("Cinema to Showtime preserves context, groups Halls and omits ineligible options", async ({ page }) => {
  await prepare(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/v1/showtimes?**", async route => { await pending; await route.fallback(); });
  const requests: string[] = [];
  page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/api/")) requests.push(path); });
  await page.goto(`/movies/${MOVIE_ID}/cinemas?cinemaId=${CINEMA_ID}&from=${encodeURIComponent("/movies?q=journey&page=2")}`);
  await expect(page.getByRole("button", { name: "Tiếp tục chọn suất chiếu" })).toBeEnabled();
  await page.getByRole("button", { name: "Tiếp tục chọn suất chiếu" }).click();
  await expect(page).toHaveURL(new RegExp(ROUTE));
  const context = page.getByRole("region", { name: "Phim và rạp đã chọn" });
  await expect(context).toContainText(movie.title);
  await expect(context).toContainText("Smart Cinema Landmark");
  await expect(page.getByText("Đang tải suất chiếu…", { exact: true })).toBeVisible();
  release();
  await expect(page.getByRole("radio")).toHaveCount(5);
  await expect(page.getByRole("radio", { name: "Phòng chiếu 1 00:00 Đã bắt đầu / đã qua" })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "Phòng chiếu 1 14:00 Đã hết vé" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Phòng chiếu 2", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tiếp tục chọn ghế" })).toBeDisabled();
  await page.getByRole("radio", { name: "Phòng chiếu 1 10:00 Đang mở bán" }).check();
  await expect(page).toHaveURL(new RegExp(`showtimeId=9007199254741001`));
  await page.reload();
  await expect(page.getByRole("radio", { name: "Phòng chiếu 1 10:00 Đang mở bán" })).toBeChecked();
  await page.getByRole("link", { name: "Đổi rạp" }).click();
  await expect(page.getByRole("radio", { name: "Smart Cinema Landmark", exact: true })).toBeChecked();
  await page.getByRole("link", { name: "Về chi tiết phim" }).click();
  await expect(page.getByRole("link", { name: "Về danh sách phim", exact: true })).toHaveAttribute("href", /q=journey&page=2/);
  expect(requests.every(isCustomerReadPath)).toBe(true);
});

test("date changes reset selection; back/reload preserve it and Continue opens Seats", async ({ page }) => {
  await prepare(page);
  await page.goto(ROUTE);
  await page.getByRole("radio", { name: "Phòng chiếu 1 10:00 Đang mở bán" }).check();
  await page.getByRole("button", { name: /Thứ 4,? 2 thg 1/ }).click();
  await expect(page.getByRole("button", { name: "Tiếp tục chọn ghế" })).toBeDisabled();
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole("radio", { name: "Phòng chiếu 1 10:00 Đang mở bán" })).toBeChecked();
  const next = page.getByRole("button", { name: "Tiếp tục chọn ghế" });
  await next.click();
  await expect(page.getByRole("heading", { name: "Chọn ghế", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Suất chiếu đã chọn" })).toContainText("Smart Cinema Landmark");
  await expect(page.getByRole("region", { name: "Suất chiếu đã chọn" })).toContainText("Phòng chiếu 1");
  await page.getByRole("link", { name: "Đổi suất chiếu" }).click();
  await expect(page.getByRole("radio", { name: "Phòng chiếu 1 10:00 Đang mở bán" })).toBeChecked();
});

test("empty, retry, all sold-out/past and invalid selection/date states recover", async ({ page }) => {
  await prepare(page);
  await page.goto(`${ROUTE}?previewState=empty`);
  await expect(page.getByRole("heading", { name: "Ngày này chưa có suất chiếu" })).toBeVisible();
  await page.goto(`${ROUTE}?previewState=error`);
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(page.getByRole("radio")).toHaveCount(5);
  for (const state of ["sold-out", "past"]) {
    await page.goto(`${ROUTE}?previewState=${state}&showtimeId=9007199254741001&step=seats`);
    await expect(page.getByText("Lựa chọn không còn khả dụng. Vui lòng chọn suất chiếu khác.")).toBeVisible();
    for (const radio of await page.getByRole("radio").all()) await expect(radio).toBeDisabled();
    await expect(page.getByRole("button", { name: "Tiếp tục chọn ghế" })).toBeDisabled();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await page.goto(`${ROUTE}?date=invalid&showtimeId=unknown&step=seats`);
  await expect(page.getByRole("heading", { name: "Không thể tải suất chiếu" })).toBeVisible();
  await page.getByRole("button", { name: "Chọn ngày chiếu" }).click();
  await page.getByRole("button", { name: /Thứ 4,? 2 thg 1/ }).click();
  await expect(page.getByRole("radio")).toHaveCount(5);
  await expect(page.getByRole("button", { name: "Tiếp tục chọn ghế" })).toBeDisabled();
});

test("invalid, closed or missing context blocks selection; Movie failures can retry", async ({ page }) => {
  await prepare(page);
  await page.goto(`/movies/${MOVIE_ID}/cinemas/invalid/showtimes`);
  await expect(page.getByRole("heading", { name: "Liên kết lựa chọn không hợp lệ" })).toBeVisible();
  for (const id of ["103", "104", "999"]) {
    await page.goto(`/movies/${MOVIE_ID}/cinemas/${id}/showtimes`);
    await expect(page.getByRole("heading", { name: "Rạp không khả dụng" })).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(0);
  }
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ status: 404, json: { detail: "Không tìm thấy dữ liệu hoặc dữ liệu không còn khả dụng." } }));
  await page.goto(ROUTE);
  await expect(page.getByRole("heading", { name: "Phim không khả dụng" })).toBeVisible();
  let attempt = 0;
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill(++attempt === 1 ? { status: 503, body: "temporary" } : { json: movie }));
  await page.reload();
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(page.getByRole("radio")).toHaveCount(5);
});

test("a selected Showtime becomes disabled at its start time", async ({ page }) => {
  await prepare(page);
  await page.goto(ROUTE);
  await page.getByRole("radio", { name: "Phòng chiếu 1 10:00 Đang mở bán" }).check();
  await page.clock.setFixedTime(new Date("2030-01-01T10:00:00+07:00"));
  await expect(page.getByRole("radio", { name: "Phòng chiếu 1 10:00 Đã bắt đầu / đã qua" })).toBeDisabled();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tiếp tục chọn ghế" })).toBeDisabled();
});

test("canonical schedule responds to mobile and supports keyboard selection and Seat route return", async ({ page }, testInfo) => {
  await prepare(page);
  await page.goto(ROUTE);
  const first = page.getByRole("radio", { name: "Phòng chiếu 1 10:00 Đang mở bán" });
  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).toBeChecked();
  await page.screenshot({ path: testInfo.outputPath("showtime-selection-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("showtime-selection-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Tiếp tục chọn ghế" }).click();
  await page.getByRole("link", { name: "Đổi suất chiếu" }).click();
  await expect(first).toBeChecked();
});

test("server timezone and cutoff govern display without invented Seat availability", async ({ page }) => {
  await prepare(page); await page.clock.setFixedTime(new Date("2030-01-01T14:00:00Z"));
  await page.route("**/api/v1/showtimes?**", route => route.fulfill({ json: { timeZone: "America/New_York", serverTime: "2030-01-01T14:00:00Z", date: "2030-01-01", dates: ["2030-01-01"], items: [{ id: "9007199254741001", movieId: MOVIE_ID, cinemaId: CINEMA_ID, hall: { id: "90071992547409931", name: "Phòng chiếu 1" }, startsAt: "2030-01-01T15:00:00Z", endsAt: "2030-01-01T17:00:00Z", bookingCutOff: "2030-01-01T14:30:00Z" }] } }));
  await page.goto(ROUTE); await expect(page.getByText(/Thời gian hiển thị theo America\/New_York/)).toBeVisible();
  await page.getByRole("radio", { name: "Phòng chiếu 1 10:00 Đang mở bán", exact: true }).check();
  await page.clock.setFixedTime(new Date("2030-01-01T14:30:00Z"));
  await expect(page.getByRole("radio", { name: "Phòng chiếu 1 10:00 Đã ngừng đặt vé", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Tiếp tục chọn ghế" })).toBeDisabled();
  await expect(page.getByText("Đã hết vé", { exact: true })).toHaveCount(0);
});
