import { mockCustomerHolds, confirmSelectedHolds } from "./helpers/customer-holds";
import { mockDiscoveryReads, isCustomerReadPath, isCustomerHoldPath } from "./helpers/customer-discovery";
import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

const MOVIE_ID = "9223372036854775807";
const CINEMA_ID = "9007199254740993";
const SEATS = `/showtimes/9007199254741001/seats?movieId=${MOVIE_ID}&cinemaId=${CINEMA_ID}&date=2030-01-01`;
const SUMMARY = "/bookings/preview/summary";
async function enter(page: Page, withConcessions = true, time = "09:00:00") {
  const discovery = await mockDiscoveryReads(page);
  await mockCustomerHolds(page, discovery);
  await page.clock.setFixedTime(new Date(`2030-01-01T${time}+07:00`));
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ json: { id: MOVIE_ID, title: "Summary Journey", duration: 125, releaseDate: "2029-01-01", ageRating: "T13", language: "English", posterUrl: "https://media.example.test/summary.jpg", status: "PUBLISHED", genres: [], description: null, trailerUrl: null } }));
  await page.route("https://media.example.test/**", route => route.fulfill({ path: resolve("public/images/movies/dune-part-two.jpg") }));
  await page.goto(SEATS);
  await page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Còn trống", exact: true }).click();
  await page.getByRole("button", { name: "A1, Ghế thường, 1 khách, Còn trống", exact: true }).click();
  await confirmSelectedHolds(page);
  await page.getByRole("button", { name: "Xem trước bắp nước" }).click();
  if (withConcessions) await page.getByRole("button", { name: "Tăng Combo xem phim" }).click();
  await page.getByRole("button", { name: "Tiếp tục xem thông tin đặt vé" }).click();
  await expect(page).toHaveURL(SUMMARY);
  await expect(page.getByRole("heading", { name: "Thông tin đặt vé", exact: true })).toBeVisible();
}
async function apply(page: Page, code: string) {
  await page.getByRole("textbox", { name: "Mã khuyến mãi", exact: true }).fill(code);
  await page.getByRole("button", { name: "Áp dụng khuyến mãi", exact: true }).click();
}

test("summary preserves context, whole Couple pricing and concessions; Payment handoff does not freeze edits", async ({ page }) => {
  const apiPaths: string[] = [];
  page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/api/")) apiPaths.push(path); });
  await enter(page);
  await expect(page.getByRole("region", { name: "Suất chiếu đã chọn" })).toContainText("Summary Journey");
  await expect(page.getByRole("region", { name: "Suất chiếu đã chọn" })).toContainText("Smart Cinema Landmark · Phòng chiếu 1");
  await expect(page.getByRole("region", { name: "Suất chiếu đã chọn" })).toContainText("10:00");
  const seats = page.getByRole("region", { name: "Ghế đã chọn" });
  await expect(seats).toContainText("2 ghế · 3 khách");
  await expect(seats).toContainText("E1-2 · Ghế đôi");
  await expect(seats.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("region", { name: "Bắp nước đã chọn" })).toContainText("Combo xem phim × 1");
  const totals = page.getByRole("complementary", { name: "Tổng tiền xem trước" });
  await expect(totals).toContainText("240.000");
  await expect(totals).toContainText("120.000");
  await expect(totals).toContainText("360.000");
  await apply(page, " demo10 ");
  await expect(page.getByRole("status")).toContainText("DEMO10 đã áp dụng");
  await expect(totals).toContainText("324.000");
  const next = page.getByRole("button", { name: "Tiếp tục chọn phương thức thanh toán" });
  await next.click();
  await expect(page.getByRole("complementary", { name: "Tóm tắt thanh toán mẫu" })).toContainText("Chưa khởi tạo thanh toán và vẫn có thể sửa lựa chọn.");
  await expect(page.getByRole("complementary", { name: "Tóm tắt thanh toán mẫu" })).toContainText("324.000");
  await page.getByRole("link", { name: "Về thông tin đặt vé", exact: true }).click();
  await page.getByRole("link", { name: "Chỉnh sửa bắp nước", exact: true }).click();
  await expect(page.getByRole("status", { name: "Combo xem phim số lượng" })).toHaveText("1");
  await page.getByRole("button", { name: "Tăng Combo xem phim" }).click();
  await page.getByRole("button", { name: "Tiếp tục xem thông tin đặt vé" }).click();
  await expect(totals).toContainText("480.000");
  await expect(page.getByRole("textbox", { name: "Mã khuyến mãi", exact: true })).toBeEmpty();
  await expect(page.getByRole("timer")).toHaveText("10:00");
  expect(apiPaths.every(path => isCustomerReadPath(path) || isCustomerHoldPath(path))).toBe(true);
});

test("optional concessions and Promotion invalid, expired, ineligible, retry and removal states", async ({ page }) => {
  await enter(page, false);
  await expect(page.getByRole("region", { name: "Bắp nước đã chọn" })).toContainText("Chưa chọn món đi kèm.");
  for (const [code, message] of [["UNKNOWN", "Mã khuyến mãi mẫu không hợp lệ"], ["DEMOEXPIRED", "Khuyến mãi mẫu này đã hết hạn"], ["DEMOINELIGIBLE", "không đủ điều kiện"]]) {
    await apply(page, code);
    await expect(page.getByRole("main").getByRole("alert")).toContainText(message);
    await expect(page.getByRole("complementary", { name: "Tổng tiền xem trước" })).toContainText("240.000");
    await expect(page.getByRole("button", { name: "Tiếp tục chọn phương thức thanh toán" })).toBeEnabled();
  }
  await apply(page, "DEMORETRY");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Không thể tải");
  await expect(page.getByRole("button", { name: "Tiếp tục chọn phương thức thanh toán" })).toBeDisabled();
  await page.getByRole("button", { name: "Thử lại khuyến mãi" }).click();
  await expect(page.getByRole("status")).toContainText("DEMORETRY đã áp dụng");
  await expect(page.getByRole("complementary", { name: "Tổng tiền xem trước" })).toContainText("216.000");
  await page.getByRole("button", { name: "Gỡ khuyến mãi" }).click();
  await expect(page.getByRole("textbox", { name: "Mã khuyến mãi", exact: true })).toBeEmpty();
  await expect(page.getByRole("complementary", { name: "Tổng tiền xem trước" })).toContainText("240.000");
});

test("Promotion updates and retries retain Seat expiry; expiry blocks Payment route and recovery clears context", async ({ page }, testInfo) => {
  await enter(page);
  await page.clock.setFixedTime(new Date("2030-01-01T09:05:00+07:00"));
  await apply(page, "DEMORETRY");
  await page.getByRole("button", { name: "Thử lại khuyến mãi" }).click();
  await expect(page.getByRole("status")).toContainText("DEMORETRY đã áp dụng");
  await expect(page.getByRole("timer")).toHaveText("05:00");
  await page.getByRole("button", { name: "Gỡ khuyến mãi" }).click();
  await expect(page.getByRole("timer")).toHaveText("05:00");
  await page.clock.setFixedTime(new Date("2030-01-01T09:10:00+07:00"));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Bản xem trước hết hạn hoặc suất chiếu không khả dụng");
  await expect(page.getByRole("button", { name: "Tiếp tục chọn phương thức thanh toán" })).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "Mã khuyến mãi", exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: testInfo.outputPath("booking-summary-expired-mobile.png"), fullPage: true });
  await page.getByRole("link", { name: "Quay lại chọn ghế", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("Chưa bắt đầu");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Chưa có bản xem trước đặt vé" })).toBeVisible();
});

test("editing or removing a pending code discards stale responses; late responses cannot cross expiry", async ({ page }) => {
  await enter(page);
  await apply(page, "DEMO10");
  await page.getByRole("textbox", { name: "Mã khuyến mãi", exact: true }).fill("DEMOEXPIRED");
  await page.getByRole("button", { name: "Áp dụng khuyến mãi", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Khuyến mãi mẫu này đã hết hạn");
  await expect(page.getByText(/DEMO10 đã áp dụng/)).toHaveCount(0);
  await apply(page, "DEMO10");
  await page.getByRole("button", { name: "Gỡ khuyến mãi" }).click();
  await page.getByRole("button", { name: "Tiếp tục chọn phương thức thanh toán" }).click();
  await expect(page.getByRole("complementary", { name: "Tóm tắt thanh toán mẫu" })).toContainText("360.000");
  await page.getByRole("link", { name: "Về thông tin đặt vé", exact: true }).click();
  await apply(page, "DEMO10");
  await page.clock.setFixedTime(new Date("2030-01-01T09:10:00+07:00"));
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Bản xem trước hết hạn");
  await expect(page.getByText(/DEMO10 đã áp dụng/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tiếp tục chọn phương thức thanh toán" })).toBeDisabled();
});

test("Showtime start, reload and forged direct URL cannot continue", async ({ page }) => {
  await page.goto(`${SUMMARY}?bookingId=fake&expiresAt=9999999999999&discount=0`);
  await expect(page.getByRole("heading", { name: "Chưa có bản xem trước đặt vé" })).toBeVisible();
  await enter(page, false, "09:59:00");
  await page.clock.setFixedTime(new Date("2030-01-01T10:00:00+07:00"));
  await expect(page.getByRole("main").getByRole("alert")).toContainText("suất chiếu không khả dụng");
  await expect(page.getByRole("button", { name: "Tiếp tục chọn phương thức thanh toán" })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Chưa có bản xem trước đặt vé" })).toBeVisible();
});

test("desktop/mobile Summary preserves canonical panels and keyboard Promotion controls", async ({ page }, testInfo) => {
  await enter(page);
  const input = page.getByRole("textbox", { name: "Mã khuyến mãi", exact: true });
  await input.focus();
  await page.keyboard.type("DEMO10");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("DEMO10 đã áp dụng");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: testInfo.outputPath("booking-summary-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: testInfo.outputPath("booking-summary-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Tiếp tục chọn phương thức thanh toán" }).click();
  await expect(page.getByRole("heading", { name: "Phương thức thanh toán", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Về thông tin đặt vé", exact: true }).click();
  await expect(input).toHaveValue("DEMO10");
});
