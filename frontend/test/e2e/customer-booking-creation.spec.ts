import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";
import { mockDiscoveryReads, isCustomerReadPath, isCustomerHoldPath } from "./helpers/customer-discovery";
import { mockCustomerHolds, confirmSelectedHolds } from "./helpers/customer-holds";
import { BOOKING_ID, mockCustomerBookings } from "./helpers/customer-bookings";

const MOVIE = "9223372036854775807", CINEMA = "9007199254740993", SHOWTIME = "9007199254741001";
const SEATS = `/showtimes/${SHOWTIME}/seats?movieId=${MOVIE}&cinemaId=${CINEMA}&date=2030-01-01`;
const SUMMARY = `/bookings/${BOOKING_ID}/summary`;
const createName = "Tạo đơn đặt vé & xem thông tin";
async function prepare(page: Page, authenticated = true) {
  await page.clock.install({ time: new Date("2030-01-01T02:00:00Z") });
  const discovery = await mockDiscoveryReads(page), holds = await mockCustomerHolds(page, discovery, authenticated);
  const bookings = await mockCustomerBookings(page, holds);
  await page.route(`**/api/v1/movies/${MOVIE}`, route => route.fulfill({ json: { id: MOVIE, title: "Seat Journey", duration: 125, releaseDate: "2029-01-01", ageRating: "T13", language: "English", posterUrl: "https://media.example.test/seat.jpg", status: "PUBLISHED", genres: [], description: null, trailerUrl: null } }));
  await page.route("https://media.example.test/**", route => route.fulfill({ path: resolve("public/images/movies/dune-part-two.jpg") }));
  return { holds, bookings };
}
async function choose(page: Page, names = ["E1-2, Ghế đôi, 2 khách, Còn trống"]) {
  await page.goto(SEATS);
  for (const name of names) await page.getByRole("button", { name, exact: true }).click();
  await confirmSelectedHolds(page);
}
async function create(page: Page) {
  await page.getByRole("button", { name: createName, exact: true }).click();
  await expect(page).toHaveURL(SUMMARY);
  await expect(page.getByRole("heading", { name: "Thông tin đặt vé", exact: true })).toBeVisible();
  await expect(page.getByText("Trạng thái: Chờ thanh toán", { exact: true })).toBeVisible();
}

test("atomic STANDARD VIP COUPLE Booking uses exact owned origins, snapshots and original deadline", async ({ page }, info) => {
  const { holds, bookings } = await prepare(page); const requests: string[] = [];
  page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/api/")) requests.push(path); });
  await choose(page, ["A1, Ghế thường, 1 khách, Còn trống", "D1, VIP, 1 khách, Còn trống", "E1-2, Ghế đôi, 2 khách, Còn trống"]);
  const origins = structuredClone(holds.holds); await page.clock.fastForward(60000); await create(page);
  expect(bookings.posts).toEqual([{ showtimeId: SHOWTIME, holdIds: origins.map(hold => hold.id) }]);
  expect(holds.holds).toHaveLength(0); expect(holds.attachedHolds).toEqual(origins);
  await expect(page.getByText("3 ghế · 4 khách", { exact: true })).toBeVisible();
  const units = page.getByRole("region", { name: "Ghế đã đặt" });
  await expect(units.getByRole("listitem")).toHaveCount(3); await expect(units).toContainText("E1-2 · Ghế đôi");
  await expect(page.getByRole("complementary", { name: "Tổng tiền đặt vé từ máy chủ" })).toContainText("270,004.2963");
  await expect(page.locator(`time[datetime="${origins[0].expiresAt}"]`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Chưa tích hợp thanh toán" })).toBeDisabled();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath("vietnamese-booking-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath("vietnamese-booking-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect(requests.every(path => isCustomerReadPath(path) || isCustomerHoldPath(path) || /^\/api\/v1\/bookings(?:\/\d+)?$/.test(path))).toBe(true);
});

test("reload and back/forward never release attached Holds or recreate/renew the Booking", async ({ page }) => {
  const { holds, bookings } = await prepare(page); await choose(page); await create(page);
  const before = structuredClone(bookings.booking); await page.reload();
  await expect(page.getByText(`ID đặt vé: ${BOOKING_ID}`, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Quay lại chọn ghế", exact: true }).click();
  await expect(page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Đang được giữ", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: createName })).toBeDisabled();
  await expect(page.getByRole("timer")).toHaveText("Xem đơn đặt vé");
  await page.getByRole("link", { name: "Về đơn đặt vé", exact: true }).click();
  await expect(page.getByText("Trạng thái: Chờ thanh toán", { exact: true })).toBeVisible();
  await page.goBack(); await expect(page.getByRole("link", { name: "Về đơn đặt vé", exact: true })).toBeVisible();
  await page.goForward(); await expect(page.getByText("Trạng thái: Chờ thanh toán", { exact: true })).toBeVisible();
  expect(bookings.posts).toHaveLength(1); expect(holds.deletes).toHaveLength(0);
  expect(bookings.booking).toEqual(before);
});

test("rapid submit is gated while one complete-set POST is pending", async ({ page }) => {
  const { bookings } = await prepare(page); await choose(page);
  let finish!: () => void; bookings.delay = new Promise<void>(resolve => { finish = resolve; });
  const button = page.getByRole("button", { name: createName }); await button.click();
  await expect(button).toBeDisabled(); await expect(page.getByRole("button", { name: "Xóa lựa chọn / trả ghế đang giữ" })).toBeDisabled();
  await expect(page.getByText("Đang tạo đơn từ đúng bộ ghế đang giữ đã gửi…", { exact: true })).toBeVisible();
  await expect.poll(() => bookings.posts.length).toBe(1); finish();
  await expect(page).toHaveURL(SUMMARY); expect(bookings.posts).toHaveLength(1);
});

test("lost committed response recovers only exact saved Hold set after reload with one Booking identity", async ({ page }) => {
  const { bookings, holds } = await prepare(page); await choose(page); const origins = holds.holds.map(hold => hold.id);
  bookings.lostResponse = true; await page.getByRole("button", { name: createName }).click();
  await expect(page.getByRole("button", { name: "Khôi phục đơn đặt vé", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: createName })).toBeDisabled();
  await expect(page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Đang được giữ", exact: true })).toBeDisabled();
  const deadline = bookings.booking!.expiresAt; await page.reload();
  // Wait for the restored map rather than clicking the temporary loading fallback.
  const recovery = page.getByRole("complementary", { name: "Tóm tắt lựa chọn ghế" }).getByRole("button", { name: "Khôi phục đơn đặt vé", exact: true });
  await expect(recovery).toBeVisible(); await expect(recovery).toBeEnabled();
  expect(bookings.posts).toHaveLength(1); await recovery.click();
  await expect(page).toHaveURL(SUMMARY);
  expect(bookings.posts).toEqual([{ showtimeId: SHOWTIME, holdIds: origins }, { showtimeId: SHOWTIME, holdIds: origins }]);
  expect(bookings.booking!.id).toBe(BOOKING_ID); expect(bookings.booking!.expiresAt).toBe(deadline); expect(holds.deletes).toHaveLength(0);
});

test("expired Holds before submit never create a local Booking or automatically reacquire", async ({ page }) => {
  const { bookings, holds } = await prepare(page); await choose(page); await page.clock.fastForward(601000);
  await expect(page.getByRole("button", { name: createName })).toBeDisabled();
  expect(bookings.posts).toHaveLength(0); expect(bookings.booking).toBeUndefined(); expect(holds.posts).toHaveLength(1);
});
test("expiry during creation rejects entire multi-origin set and reconciles server map", async ({ page }) => {
  const { bookings, holds } = await prepare(page); await choose(page, ["A1, Ghế thường, 1 khách, Còn trống", "E1-2, Ghế đôi, 2 khách, Còn trống"]);
  bookings.expireDuring = true; await page.getByRole("button", { name: createName }).click();
  await expect(page.getByRole("complementary", { name: "Tóm tắt lựa chọn ghế" }).getByRole("alert")).toContainText("Ghế đang giữ có thể đã hết hạn");
  await expect(page.getByRole("button", { name: createName })).toBeDisabled();
  expect(bookings.booking).toBeUndefined(); expect(holds.attachedHolds).toHaveLength(0); expect(bookings.posts[0].holdIds).toHaveLength(2);
});
for (const reason of ["foreign", "released", "conflicting attached"]) {
  test(`${reason} origin rejected atomically with safe error and no fabricated Booking`, async ({ page }) => {
    const { bookings, holds } = await prepare(page); await choose(page, ["A1, Ghế thường, 1 khách, Còn trống", "E1-2, Ghế đôi, 2 khách, Còn trống"]);
    bookings.rejectNext = 409; await page.getByRole("button", { name: createName }).click();
    await expect(page.getByRole("complementary", { name: "Tóm tắt lựa chọn ghế" }).getByRole("alert")).toContainText("Không thể đặt vé.");
    expect(bookings.booking).toBeUndefined(); expect(holds.attachedHolds).toHaveLength(0);
    await expect(page.getByText("private SQL owner information")).toHaveCount(0);
  });
}
test("direct owned read survives hidden public catalog and safe auth resume never trusts Booking code", async ({ page }) => {
  const { bookings } = await prepare(page); await choose(page); await create(page);
  await page.route(`**/api/v1/movies/${MOVIE}`, route => route.fulfill({ status: 404, json: {} }));
  await page.evaluate(() => { sessionStorage.clear(); sessionStorage.setItem("qa.disable-auto-login", "true"); localStorage.removeItem("smart-cinema.auth-session"); });

  await page.goto(SUMMARY); await expect(page.getByRole("heading", { name: "Đăng nhập để xem đơn đặt vé" })).toBeVisible();
  await page.route("**/api/v1/auth/tokens", route => route.fulfill({ json: { accessToken: "qa-access", tokenType: "Bearer", expiresIn: 3600, refreshToken: "qa-refresh", refreshExpiresIn: 86400, userId: 1, email: "customer@example.test", fullName: "Customer", role: "CUSTOMER" } }));
  await page.getByRole("main").getByRole("link", { name: "Đăng nhập", exact: true }).click();
  await page.getByLabel("Địa chỉ email", { exact: true }).fill("customer@example.test"); await page.getByLabel("Mật khẩu", { exact: true }).fill("test-customer-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(SUMMARY); await expect(page.getByText("Trạng thái: Chờ thanh toán", { exact: true })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Tổng tiền đặt vé từ máy chủ" }).getByRole("link", { name: "Chọn suất chiếu", exact: true })).toHaveAttribute("href", `/movies/${MOVIE}/cinemas/${CINEMA}/showtimes?showtimeId=${SHOWTIME}`);
  expect(bookings.posts).toHaveLength(1);
});
test("owned detail read supports loading/service retry and rejects foreign/customer role access", async ({ page }) => {
  const { bookings } = await prepare(page); await choose(page); await create(page);
  for (const status of [503, 403, 404, 401]) {
    bookings.readError = status; await page.reload();
    await expect(page.getByRole("heading", { name: status === 404 ? "Đơn đặt vé không khả dụng" : status === 403 ? "Cần quyền khách hàng" : "Không thể tải đơn đặt vé" })).toBeVisible();
    await expect(page.getByText("private SQL owner information")).toHaveCount(0);
    if (status === 503) { bookings.readError = 0; await page.getByRole("button", { name: "Thử lại" }).click(); await expect(page.getByText("Trạng thái: Chờ thanh toán", { exact: true })).toBeVisible(); }
  }
  await expect(page.getByRole("link", { name: "Đăng nhập lại", exact: true })).toBeVisible(); expect(bookings.posts).toHaveLength(1);
});
test("server expiry and cancellation remain readable without local status or deadline renewal", async ({ page }) => {
  const { bookings } = await prepare(page); await choose(page); await create(page); const deadline = bookings.booking!.expiresAt;
  await page.clock.fastForward(601000); await expect(page.getByText("Trạng thái: Đã hết hạn", { exact: true })).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText("Đã đóng"); expect(bookings.booking!.expiresAt).toBe(deadline);
  bookings.booking!.status = "CANCELLED"; await page.getByRole("button", { name: "Cập nhật đơn đặt vé", exact: true }).click();
  await expect(page.getByText("Trạng thái: Đã hủy", { exact: true })).toBeVisible(); expect(bookings.posts).toHaveLength(1);
});
test("Summary keyboard/mobile layout preserves complete unit and string-safe exact zero/large money", async ({ page }, info) => {
  const { bookings } = await prepare(page); await choose(page); await create(page);
  await page.getByRole("button", { name: "Cập nhật đơn đặt vé", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Cập nhật đơn đặt vé", exact: true })).toBeEnabled();
  await page.screenshot({ path: info.outputPath("booking-summary-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const amount of ["0.0000", "999999999999999.9999"]) {
    const b = bookings.booking!; b.seatAmount = b.subtotal = b.finalAmount = b.seats[0].unitPrice = b.seats[0].finalPrice = amount;
    await page.getByRole("button", { name: "Cập nhật đơn đặt vé", exact: true }).click();
    await expect(page.getByRole("button", { name: "Cập nhật đơn đặt vé", exact: true })).toBeEnabled();
    await expect(page.getByRole("region", { name: "Ghế đã đặt" })).toContainText("1 ghế · 2 khách");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: info.outputPath("booking-summary-mobile.png"), fullPage: true });
});
test("public catalog hiding after create retains a useful owned Booking link on back navigation", async ({ page }) => {
  const { bookings } = await prepare(page); await choose(page); await create(page);
  await page.route(`**/api/v1/movies/${MOVIE}`, route => route.fulfill({ status: 404, json: {} }));
  await page.goto(SEATS); await expect(page.getByRole("heading", { name: "Phim không khả dụng" })).toBeVisible();
  await page.getByRole("link", { name: "Về đơn đặt vé", exact: true }).click();
  await expect(page.getByText("Trạng thái: Chờ thanh toán", { exact: true })).toBeVisible(); expect(bookings.posts).toHaveLength(1);
});
