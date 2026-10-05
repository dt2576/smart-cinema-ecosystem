import { mockCustomerHolds, confirmSelectedHolds } from "./helpers/customer-holds";
import { mockDiscoveryReads, isCustomerReadPath, isCustomerHoldPath } from "./helpers/customer-discovery";
import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

const MOVIE_ID = "9223372036854775807";
const CINEMA_ID = "9007199254740993";
const RESULT = "/bookings/preview/payment/result";
const METHOD = "/bookings/preview/payment";
const PROCESSING = "/bookings/preview/payment/processing";
const SEATS = `/showtimes/9007199254741001/seats?movieId=${MOVIE_ID}&cinemaId=${CINEMA_ID}&date=2030-01-01`;

async function enter(page: Page, time = "09:00:00", addOns = true) {
  const discovery = await mockDiscoveryReads(page);
  await mockCustomerHolds(page, discovery);
  await page.clock.setFixedTime(new Date(`2030-01-01T${time}+07:00`));
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ json: { id: MOVIE_ID, title: "Result Journey", duration: 125, releaseDate: "2029-01-01", ageRating: "T13", language: "English", posterUrl: "https://media.example.test/processing.jpg", status: "PUBLISHED", genres: [], description: null, trailerUrl: null } }));
  await page.route("https://media.example.test/**", route => route.fulfill({ path: resolve("public/images/movies/dune-part-two.jpg") }));
  await page.goto(SEATS);
  await page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Còn trống", exact: true }).click();
  await page.getByRole("button", { name: "A1, Ghế thường, 1 khách, Còn trống", exact: true }).click();
  await confirmSelectedHolds(page);
  await page.getByRole("button", { name: "Xem trước bắp nước" }).click();
  if (addOns) await page.getByRole("button", { name: "Tăng Combo xem phim" }).click();
  await page.getByRole("button", { name: "Tiếp tục xem thông tin đặt vé" }).click();
  if (addOns) {
    await page.getByRole("textbox", { name: "Mã khuyến mãi", exact: true }).fill("DEMO10");
    await page.getByRole("button", { name: "Áp dụng khuyến mãi", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("DEMO10 đã áp dụng");
  }
  await page.getByRole("button", { name: "Tiếp tục chọn phương thức thanh toán" }).click();
  await page.getByRole("radio", { name: "MoMo · Bản xem trước khả dụng", exact: true }).check();
  await page.getByRole("button", { name: "Tiếp tục xử lý thanh toán mẫu" }).click();
  await expect(page).toHaveURL(PROCESSING);
  await expect(page.getByRole("heading", { name: "Xử lý thanh toán", exact: true })).toBeVisible();
}

async function finish(page: Page, outcome: "success" | "failed" | "pending") {
  await page.getByLabel("Kết quả mô phỏng", { exact: true }).selectOption(outcome);
  await page.getByRole("button", { name: "Bắt đầu xử lý mẫu", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục xem kết quả thanh toán mẫu", exact: true }).click();
  await expect(page).toHaveURL(RESULT);
  await expect(page.getByRole("heading", { name: `Thanh toán ${outcome === "success" ? "thành công" : outcome === "failed" ? "thất bại" : "chờ xử lý"} — mẫu`, exact: true })).toBeVisible();
}

test("success is a confirmation-style preview with complete context, whole Couple units and no issuance or provider calls", async ({ page }) => {
  const unexpected: string[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if ((url.pathname.startsWith("/api/") && !((isCustomerReadPath(url.pathname) && request.method() === "GET") || (isCustomerHoldPath(url.pathname) && ["GET", "POST", "DELETE"].includes(request.method())))) || !["127.0.0.1", "localhost", "media.example.test"].includes(url.hostname)) unexpected.push(url.href);
  });
  await enter(page);
  await finish(page, "success");
  const screening = page.getByRole("region", { name: "Suất chiếu và lựa chọn đã kiểm tra" });
  for (const text of ["Result Journey", "Smart Cinema Landmark", "Phòng chiếu 1", "10:00", "2 ghế · 3 khách", "E1-2", "Ghế đôi, 2 khách, một ghế", "Combo xem phim × 1"]) await expect(screening).toContainText(text);
  const summary = page.getByRole("complementary", { name: "Tóm tắt kết quả thanh toán" });
  for (const text of ["MoMo (bản xem trước)", "240.000", "120.000", "36.000", "324.000", "DEMO10 đã áp dụng", "SỐ TIỀN MINH HỌA", "Không phải số tiền đã thanh toán hay biên nhận."]) await expect(summary).toContainText(text);
  await expect(page.getByRole("status")).toContainText("chưa được máy chủ xác minh");
  await expect(page.getByRole("status")).toContainText("Chưa thanh toán đơn đặt vé");
  await expect(screening).toContainText("Chưa có giao dịch thanh toán thật, mã đặt vé, vé hay mã QR đặt vé.");
  await expect(page.getByRole("link", { name: /Xem vé|Tải xuống|Mã QR đặt vé/ })).toHaveCount(0);
  await expect(page.getByRole("img", { name: /QR/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /thử lại/i })).toHaveCount(0);
  await expect(page.getByRole("timer")).toHaveText("10:00");
  expect(unexpected).toEqual([]);
});

test("failed result retries the same reviewed preview and permits method changes without retaining a stale result", async ({ page }) => {
  await enter(page);
  await finish(page, "failed");
  await page.clock.setFixedTime(new Date("2030-01-01T09:03:00+07:00"));
  await page.getByRole("button", { name: "Thử lại xử lý mẫu", exact: true }).click();
  await expect(page).toHaveURL(PROCESSING);
  await expect(page.getByLabel("Kết quả mô phỏng", { exact: true })).toHaveValue("failed");
  await expect(page.getByRole("timer")).toHaveText("07:00");
  await page.getByRole("button", { name: "Thử lại xử lý mẫu", exact: true }).click();
  await expect(page.getByRole("button", { name: "Bản xem trước đang chạy...", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Tiếp tục xem kết quả thanh toán mẫu", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Thanh toán thất bại — mẫu", exact: true })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Tóm tắt kết quả thanh toán" })).toContainText("324.000");
  await page.getByRole("button", { name: "Về phương thức thanh toán", exact: true }).click();
  await expect(page).toHaveURL(METHOD);
  await expect(page.getByRole("radio", { name: "VNPay · Bản xem trước khả dụng", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Hoàn tất xử lý mẫu trước", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Về phương thức thanh toán", exact: true }).click();
  await page.getByRole("radio", { name: "VNPay · Bản xem trước khả dụng", exact: true }).check();
  await page.getByRole("button", { name: "Tiếp tục xử lý thanh toán mẫu" }).click();
  await expect(page.getByRole("status")).toHaveText("Sẵn sàng xem xử lý mẫu");
  await expect(page.getByRole("timer")).toHaveText("07:00");
});

test("pending stays unresolved across history and recheck; query values cannot promote it to success", async ({ page }) => {
  await enter(page, "09:00:00", false);
  await finish(page, "pending");
  await expect(page.getByRole("status")).toContainText("không có nghĩa là thành công hay thất bại");
  await expect(page.getByRole("region", { name: "Suất chiếu và lựa chọn đã kiểm tra" })).toContainText("Chưa chọn món đi kèm.");
  await page.evaluate(() => history.replaceState(null, "", `${location.pathname}?outcome=success&total=1`));
  await expect(page.getByRole("heading", { name: "Thanh toán chờ xử lý — mẫu", exact: true })).toBeVisible();
  await page.clock.setFixedTime(new Date("2030-01-01T09:04:00+07:00"));
  await page.getByRole("button", { name: "Về xác minh mẫu", exact: true }).click();
  await expect(page.getByLabel("Kết quả mô phỏng", { exact: true })).toHaveValue("pending");
  await page.getByRole("button", { name: "Kiểm tra lại bản xem trước", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục xem kết quả thanh toán mẫu", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Thanh toán chờ xử lý — mẫu", exact: true })).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText("06:00");
  await expect(page.getByRole("complementary", { name: "Tóm tắt kết quả thanh toán" })).toContainText("240.000");
});

test("original expiry and Showtime start block Result retry or verification without rewriting the demo outcome", async ({ page }) => {
  await enter(page);
  await finish(page, "failed");
  await page.clock.setFixedTime(new Date("2030-01-01T09:10:00+07:00"));
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Bản xem trước hết hạn hoặc suất chiếu không khả dụng");
  await expect(page.getByRole("button", { name: "Thử lại xử lý mẫu", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Về phương thức thanh toán", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "Quay lại chọn ghế", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("Chưa bắt đầu");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Hoàn tất xử lý mẫu trước", exact: true })).toBeVisible();
  await enter(page, "09:59:00", false);
  await finish(page, "pending");
  await page.clock.setFixedTime(new Date("2030-01-01T10:00:00+07:00"));
  await expect(page.getByRole("main").getByRole("alert")).toContainText("suất chiếu không khả dụng");
  await expect(page.getByRole("button", { name: "Về xác minh mẫu", exact: true })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Thanh toán chờ xử lý — mẫu", exact: true })).toBeVisible();
});

test("direct Result URLs, reload and leaving the preview cannot create or restore an outcome", async ({ page }) => {
  await page.goto(`${RESULT}?status=success&bookingId=fake&method=preview-momo&total=1`);
  await expect(page.getByRole("heading", { name: "Hoàn tất xử lý mẫu trước", exact: true })).toBeVisible();
  await enter(page);
  await finish(page, "success");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Hoàn tất xử lý mẫu trước", exact: true })).toBeVisible();
  await enter(page, "09:00:00", false);
  await finish(page, "failed");
  await page.getByRole("link", { name: "Về trang chủ", exact: true }).click();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Hoàn tất xử lý mẫu trước", exact: true })).toBeVisible();
});

test("canonical Result layout adapts to desktop/mobile for all three states with keyboard recovery", async ({ page }, testInfo) => {
  await enter(page);
  for (const outcome of ["success", "failed", "pending"] as const) {
    await finish(page, outcome);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: testInfo.outputPath(`payment-result-${outcome}-desktop.png`), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`payment-result-${outcome}-mobile.png`), fullPage: true });
    if (outcome === "success") await page.goBack();
    else {
      const resume = page.getByRole("button", { name: outcome === "failed" ? "Thử lại xử lý mẫu" : "Về xác minh mẫu", exact: true });
      await resume.focus();
      await page.keyboard.press("Enter");
    }
    await expect(page.getByRole("heading", { name: "Xử lý thanh toán", exact: true })).toBeVisible();
  }
});
