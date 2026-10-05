import { mockCustomerHolds, confirmSelectedHolds } from "./helpers/customer-holds";
import { mockDiscoveryReads, isCustomerReadPath, isCustomerHoldPath } from "./helpers/customer-discovery";
import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

const MOVIE_ID = "9223372036854775807";
const CINEMA_ID = "9007199254740993";
const PROCESSING = "/bookings/preview/payment/processing";
const SEATS = `/showtimes/9007199254741001/seats?movieId=${MOVIE_ID}&cinemaId=${CINEMA_ID}&date=2030-01-01`;

async function enter(page: Page, time = "09:00:00", addOns = true) {
  const discovery = await mockDiscoveryReads(page);
  await mockCustomerHolds(page, discovery);
  await page.clock.setFixedTime(new Date(`2030-01-01T${time}+07:00`));
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ json: { id: MOVIE_ID, title: "Processing Journey", duration: 125, releaseDate: "2029-01-01", ageRating: "T13", language: "English", posterUrl: "https://media.example.test/processing.jpg", status: "PUBLISHED", genres: [], description: null, trailerUrl: null } }));
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

test("processing preserves complete reviewed context; duplicate actions cannot produce multiple local runs or provider calls", async ({ page }) => {
  const unexpected: string[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if ((url.pathname.startsWith("/api/") && !((isCustomerReadPath(url.pathname) && request.method() === "GET") || (isCustomerHoldPath(url.pathname) && ["GET", "POST", "DELETE"].includes(request.method())))) || !["127.0.0.1", "localhost", "media.example.test"].includes(url.hostname)) unexpected.push(url.href);
  });
  await enter(page);
  const screening = page.getByRole("region", { name: "Suất chiếu đã chọn" });
  for (const text of ["Processing Journey", "Smart Cinema Landmark", "Phòng chiếu 1", "10:00"]) await expect(screening).toContainText(text);
  const context = page.getByRole("region", { name: "Thông tin thanh toán đã kiểm tra" });
  for (const text of ["MoMo (bản xem trước)", "2 ghế · 3 khách", "E1-2 · Ghế đôi, 2 khách, một ghế", "Combo xem phim × 1", "DEMO10 đã áp dụng", "240.000", "120.000", "36.000", "324.000", "CHỈ MINH HỌA"]) await expect(context).toContainText(text);
  await page.getByRole("button", { name: "Bắt đầu xử lý mẫu", exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(page.getByRole("status")).toHaveText("Đang xử lý mẫu...");
  await expect(page.getByRole("button", { name: "Bản xem trước đang chạy...", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Kết quả mô phỏng", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Tiếp tục xem kết quả thanh toán mẫu" })).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("Đang xác minh mẫu...");
  await expect(page.getByRole("status")).toHaveText("Mẫu thành công");
  await page.getByRole("button", { name: "Tiếp tục xem kết quả thanh toán mẫu" }).click();
  await expect(page.getByRole("heading", { name: "Thanh toán thành công — mẫu", exact: true })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("chưa được máy chủ xác minh");
  await expect(page.getByRole("main")).toContainText("Chưa có giao dịch thanh toán thật, mã đặt vé, vé hay mã QR đặt vé.");
  expect(unexpected).toEqual([]);
});

test("failed, unresolved pending and retryable error have distinct outcomes without deadline reset", async ({ page }) => {
  await enter(page, "09:00:00", false);
  await expect(page.getByRole("region", { name: "Thông tin thanh toán đã kiểm tra" })).toContainText("Chưa chọn món đi kèm.");
  for (const scenario of ["failed", "pending"]) {
    await page.getByLabel("Kết quả mô phỏng", { exact: true }).selectOption(scenario);
    await page.getByRole("button", { name: "Bắt đầu xử lý mẫu", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText(scenario === "failed" ? "Mẫu thất bại" : "Mẫu chờ xử lý");
    await page.getByRole("button", { name: "Tiếp tục xem kết quả thanh toán mẫu" }).click();
    await expect(page.getByRole("heading", { name: scenario === "failed" ? "Thanh toán thất bại — mẫu" : "Thanh toán chờ xử lý — mẫu", exact: true })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Xử lý thanh toán", exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Kiểm tra lại bản xem trước", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Mẫu chờ xử lý");
  await page.getByLabel("Kết quả mô phỏng", { exact: true }).selectOption("error");
  await page.getByRole("button", { name: "Bắt đầu xử lý mẫu", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("chưa thực hiện thanh toán");
  await expect(page.getByRole("button", { name: "Tiếp tục xem kết quả thanh toán mẫu" })).toHaveCount(0);
  await page.clock.setFixedTime(new Date("2030-01-01T09:04:00+07:00"));
  await page.getByRole("button", { name: "Thử lại bản xem trước", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Mẫu thành công");
  await expect(page.getByRole("timer")).toHaveText("06:00");
});

test("expiry during processing rejects late outcomes and recovery clears all context", async ({ page }) => {
  await enter(page);
  await page.getByRole("button", { name: "Bắt đầu xử lý mẫu", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Đang xác minh mẫu...");
  await page.clock.setFixedTime(new Date("2030-01-01T09:10:00+07:00"));
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Không thể tiếp tục");
  await expect(page.getByRole("timer")).toHaveText("00:00");
  await expect(page.getByRole("button", { name: "Tiếp tục xem kết quả thanh toán mẫu" })).toHaveCount(0);
  await expect(page.getByLabel("Kết quả mô phỏng", { exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "Quay lại chọn ghế", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("Chưa bắt đầu");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Chọn phương thức thanh toán trước" })).toBeVisible();
});

test("Showtime start blocks result navigation; direct URLs, reload and edited method context cannot restore an outcome", async ({ page }) => {
  await page.goto(`${PROCESSING}?status=success&method=preview-momo&total=1&expiresAt=9999999999999`);
  await expect(page.getByRole("heading", { name: "Chọn phương thức thanh toán trước" })).toBeVisible();
  await enter(page, "09:59:00");
  await page.getByRole("button", { name: "Bắt đầu xử lý mẫu", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Mẫu thành công");
  await page.clock.setFixedTime(new Date("2030-01-01T10:00:00+07:00"));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("Bản xem trước hết hạn hoặc suất chiếu không khả dụng");
  await expect(page.getByRole("button", { name: "Tiếp tục xem kết quả thanh toán mẫu" })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Chọn phương thức thanh toán trước" })).toBeVisible();
  await enter(page);
  await page.getByRole("button", { name: "Bắt đầu xử lý mẫu", exact: true }).click();
  await page.getByRole("link", { name: "Về phương thức thanh toán", exact: true }).click();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Chọn phương thức thanh toán trước" })).toBeVisible();
  await page.getByRole("link", { name: "Về phương thức thanh toán", exact: true }).click();
  await page.getByRole("radio", { name: "VNPay · Bản xem trước khả dụng", exact: true }).check();
  await page.getByRole("button", { name: "Tiếp tục xử lý thanh toán mẫu" }).click();
  await expect(page.getByRole("status")).toHaveText("Sẵn sàng xem xử lý mẫu");
  await expect(page.getByRole("region", { name: "Thông tin thanh toán đã kiểm tra" })).toContainText("VNPay (bản xem trước)");
  await expect(page.getByRole("timer")).toHaveText("10:00");
});

test("canonical processing layout, pending result and expiry are usable on desktop/mobile with reduced motion", async ({ page }, testInfo) => {
  await enter(page);
  await page.getByLabel("Kết quả mô phỏng", { exact: true }).selectOption("pending");
  await page.getByRole("button", { name: "Bắt đầu xử lý mẫu", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Đang xử lý mẫu...");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: testInfo.outputPath("payment-processing-desktop.png"), fullPage: true });
  await expect(page.getByRole("status")).toHaveText("Mẫu chờ xử lý");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("payment-processing-mobile.png"), fullPage: true });
  const next = page.getByRole("button", { name: "Tiếp tục xem kết quả thanh toán mẫu" });
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Thanh toán chờ xử lý — mẫu", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("payment-processing-result-mobile.png") });
  await page.getByRole("button", { name: "Về xác minh mẫu", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Xử lý thanh toán", exact: true })).toBeVisible();
  await page.clock.setFixedTime(new Date("2030-01-01T09:10:00+07:00"));
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: testInfo.outputPath("payment-processing-expired-mobile.png"), fullPage: true });
});
