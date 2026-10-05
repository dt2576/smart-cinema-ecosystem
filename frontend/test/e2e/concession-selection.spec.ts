import { mockCustomerHolds, confirmSelectedHolds } from "./helpers/customer-holds";
import { mockDiscoveryReads, isCustomerReadPath, isCustomerHoldPath } from "./helpers/customer-discovery";
import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

const MOVIE_ID = "9223372036854775807";
const CINEMA_ID = "9007199254740993";
const SHOWTIME_ID = "9007199254741001";
const SEATS = `/showtimes/${SHOWTIME_ID}/seats?movieId=${MOVIE_ID}&cinemaId=${CINEMA_ID}&date=2030-01-01`;
const CONCESSIONS = "/bookings/preview/concessions";
async function enter(page: Page, scenario = "default", time = "09:00:00") {
  const discovery = await mockDiscoveryReads(page);
  await mockCustomerHolds(page, discovery);
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (document.body?.textContent?.includes("Đang tải bắp nước...")) document.documentElement.dataset.concessionLoadingObserved = "true";
    }).observe(document, { childList: true, subtree: true });
  });
  await page.clock.setFixedTime(new Date(`2030-01-01T${time}+07:00`));
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ json: { id: MOVIE_ID, title: "Concession Journey", duration: 125, releaseDate: "2029-01-01", ageRating: "T13", language: "English", posterUrl: "https://media.example.test/movie.jpg", status: "PUBLISHED", genres: [], description: null, trailerUrl: null } }));
  await page.route("https://media.example.test/**", route => route.fulfill({ path: resolve("public/images/movies/dune-part-two.jpg") }));
  await page.goto(`${SEATS}&concessionPreview=${scenario}`);
  await page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Còn trống", exact: true }).click();
  await page.getByRole("button", { name: "A1, Ghế thường, 1 khách, Còn trống", exact: true }).click();
  await confirmSelectedHolds(page);
  await page.getByRole("button", { name: "Xem trước bắp nước" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-concession-loading-observed", "true");
  await expect(page.getByRole("heading", { name: "Bắp nước", exact: true, level: 1 })).toBeVisible();
}

test("Concessions retain screening and whole Seat Units, filter categories and calculate optional add-ons", async ({ page }) => {
  const apiPaths: string[] = [];
  page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/api/")) apiPaths.push(path); });
  await enter(page);
  await expect(page).toHaveURL(new RegExp(CONCESSIONS));
  const summary = page.getByRole("complementary", { name: "Tóm tắt lựa chọn bắp nước" });
  await expect(summary).toContainText("2 ghế · 3 khách");
  await expect(summary).toContainText("E1-2 (Ghế đôi, 2 khách)");
  await expect(page.getByRole("region", { name: "Suất chiếu đã chọn" })).toContainText("Smart Cinema Landmark · Phòng chiếu 1");
  await expect(page.getByRole("region", { name: "Suất chiếu đã chọn" })).toContainText("10:00");
  const next = page.getByRole("button", { name: "Tiếp tục xem thông tin đặt vé" });
  await next.click();
  await expect(page.getByRole("region", { name: "Bắp nước đã chọn" })).toContainText("Chưa chọn món đi kèm.");
  await page.getByRole("link", { name: "Quay lại bắp nước", exact: true }).click();
  await page.getByRole("button", { name: "Tăng Combo xem phim", exact: true }).click();
  await page.getByRole("button", { name: "Đồ uống", exact: true }).click();
  await expect(page.getByRole("article", { name: "Combo xem phim", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Tăng Cola", exact: true }).click();
  await expect(summary).toContainText("155.000");
  await page.getByRole("button", { name: "Giảm Cola", exact: true }).click();
  await expect(page.getByRole("button", { name: "Giảm Cola", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Tất cả", exact: true }).click();
  await expect(page.getByRole("button", { name: "Tăng Bắp rang caramel" })).toBeDisabled();
  await next.click();
  await expect(page.getByRole("region", { name: "Bắp nước đã chọn" })).toContainText("Combo xem phim × 1");
  await expect(page.getByRole("region", { name: "Bắp nước đã chọn" })).toContainText("120.000");
  await expect(page.getByText(/Chưa tạo đơn đặt vé hay thanh toán/)).toBeVisible();
  expect(apiPaths.every(path => isCustomerReadPath(path) || isCustomerHoldPath(path))).toBe(true);
});

test("changing add-ons cannot extend deadline; expiry blocks summary and requires Seat reselection", async ({ page }, testInfo) => {
  await enter(page);
  await page.clock.setFixedTime(new Date("2030-01-01T09:05:00+07:00"));
  await page.getByRole("button", { name: "Tăng Combo xem phim" }).click();
  await expect(page.getByRole("timer")).toHaveText("05:00");
  await page.clock.setFixedTime(new Date("2030-01-01T09:10:00+07:00"));
  await expect(page.getByRole("dialog")).toHaveAccessibleName("Ghế xem trước đã hết hạn");
  await page.screenshot({ path: testInfo.outputPath("concession-expired-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("concession-expired-mobile.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Tiếp tục xem thông tin đặt vé" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Tăng Combo xem phim" })).toBeDisabled();
  await page.getByRole("link", { name: "Quay lại chọn ghế" }).click();
  await expect(page.getByRole("timer")).toHaveText("Chưa bắt đầu");
  await expect(page.getByText("0 ghế · 0 khách", { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Chọn ghế trước" })).toBeVisible();
});

test("empty and unavailable menus allow no add-ons; retry retains original deadline", async ({ page }) => {
  for (const scenario of ["empty", "unavailable"]) {
    await enter(page, scenario);
    await page.getByRole("button", { name: "Tiếp tục xem thông tin đặt vé" }).click();
    await expect(page.getByRole("region", { name: "Bắp nước đã chọn" })).toContainText("Chưa chọn món đi kèm.");
    await page.getByRole("link", { name: "Quay lại bắp nước", exact: true }).click();
    if (scenario === "unavailable") for (const button of await page.getByRole("button", { name: /^Tăng / }).all()) await expect(button).toBeDisabled();
  }
  await enter(page, "error");
  await expect(page.getByRole("heading", { name: "Không thể tải bắp nước" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tiếp tục xem thông tin đặt vé" })).toBeDisabled();
  await page.clock.setFixedTime(new Date("2030-01-01T09:04:00+07:00"));
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(page.getByRole("button", { name: "Tăng Combo xem phim" })).toBeEnabled();
  await expect(page.getByRole("timer")).toHaveText("06:00");
});

test("responsive menu, keyboard controls and reload recovery", async ({ page }, testInfo) => {
  await enter(page);
  const add = page.getByRole("button", { name: "Tăng Combo xem phim" });
  await add.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("status", { name: "Combo xem phim số lượng" })).toHaveText("1");
  await page.screenshot({ path: testInfo.outputPath("concession-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Đồ uống", exact: true }).click();
  await page.getByRole("button", { name: "Tăng Cola", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("concession-mobile.png"), fullPage: true });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Chọn ghế trước" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tiếp tục xem thông tin đặt vé" })).toHaveCount(0);
});

test("direct URLs cannot invent preview context and Showtime start invalidates selection", async ({ page }) => {
  await page.goto(`${CONCESSIONS}?movieId=${MOVIE_ID}&seatUnitIds=E1&expiresAt=9999999999999`);
  await expect(page.getByRole("heading", { name: "Chọn ghế trước" })).toBeVisible();
  await enter(page, "default", "09:59:00");
  await page.clock.setFixedTime(new Date("2030-01-01T10:00:00+07:00"));
  await expect(page.getByRole("dialog")).toHaveAccessibleName("Ghế xem trước đã hết hạn");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Tiếp tục xem thông tin đặt vé" })).toBeDisabled();
});
