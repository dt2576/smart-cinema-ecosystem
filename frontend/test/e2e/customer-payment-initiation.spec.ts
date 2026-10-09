import { expect, test, type Page } from "@playwright/test";
import { mockDiscoveryReads } from "./helpers/customer-discovery";
import { mockCustomerHolds, confirmSelectedHolds } from "./helpers/customer-holds";
import { mockCustomerBookings, BOOKING_ID } from "./helpers/customer-bookings";
import { mockCustomerConcessions, POPCORN_ID } from "./helpers/customer-concessions";
import { mockCustomerPromotions } from "./helpers/customer-promotions";
import { mockCustomerPayments, PAYMENT_ID, SANDBOX_URL } from "./helpers/customer-payments";

const MOVIE = "9223372036854775807", CINEMA = "9007199254740993";
const SEATS = `/showtimes/9007199254741001/seats?movieId=${MOVIE}&cinemaId=${CINEMA}&date=2030-01-01`;
const SUMMARY = `/bookings/${BOOKING_ID}/summary`, CONCESSIONS = `/bookings/${BOOKING_ID}/concessions`;
const panel = (page: Page) => page.getByRole("region", { name: "Khởi tạo thanh toán", exact: true });
const initiate = (page: Page) => panel(page).getByRole("button", { name: "Tiến hành thanh toán", exact: true });
const gateway = (page: Page) => panel(page).getByRole("button", { name: "Mở VNPAY Sandbox", exact: true });
const review = (page: Page) => panel(page).getByRole("button", { name: "Đã xem dữ liệu thanh toán máy chủ", exact: true });
async function prepare(page: Page, authenticated = true) {
  await page.clock.install({ time: new Date("2030-01-01T02:00:00Z") });
  const discovery = await mockDiscoveryReads(page), holds = await mockCustomerHolds(page, discovery, authenticated), bookings = await mockCustomerBookings(page, holds);
  const concessions = await mockCustomerConcessions(page, bookings), promotions = await mockCustomerPromotions(page, bookings, concessions), payments = await mockCustomerPayments(page, bookings);
  const movie = { id: MOVIE, title: "Phim thật", duration: 125, releaseDate: "2029-01-01", ageRating: "T13", language: "Tiếng Việt", posterUrl: null, status: "PUBLISHED", genres: [], description: null, trailerUrl: null };
  await page.route(`**/api/v1/movies/${MOVIE}`, route => route.fulfill({ json: movie }));
  await page.route("**/api/v1/movies?**", route => { const query = new URL(route.request().url()).searchParams; return route.fulfill({ json: { items: [movie], page: 0, size: Number(query.get("size") ?? 20), totalElements: 1, totalPages: 1, sort: query.get("sort") ?? "title,asc" } }); });
  await page.route("**/api/v1/genres", route => route.fulfill({ json: [] }));
  return { holds, bookings, concessions, promotions, payments };
}
async function create(page: Page) {
  await page.goto(SEATS); await page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Còn trống", exact: true }).click(); await confirmSelectedHolds(page);
  await page.getByRole("button", { name: "Tạo đơn đặt vé & xem thông tin", exact: true }).click(); await expect(page).toHaveURL(SUMMARY); await expect(initiate(page)).toBeEnabled();
}
async function start(page: Page) { await expect(initiate(page)).toBeEnabled(); await initiate(page).click(); await expect(panel(page).getByRole("heading", { name: "Đã bắt đầu thanh toán" })).toBeVisible(); }
async function wholeAmount(page: Page, state: Awaited<ReturnType<typeof prepare>>) {
  Object.assign(state.bookings.booking!, { seatAmount: "90000.0000", subtotal: "90000.0000", finalAmount: "90000.0000" });
  for (const seat of state.bookings.booking!.seats) Object.assign(seat, { unitPrice: "90000.0000", finalPrice: "90000.0000" });
  await page.reload(); await expect(initiate(page)).toBeEnabled();
}

for (const mobile of [false, true]) test(`owned Movie to Payment journey preserves exact complete frozen composition on ${mobile ? "mobile" : "desktop"}`, async ({ page }, info) => {
  const state = await prepare(page); const { bookings, holds, payments, concessions, promotions } = state;
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  const writes: string[] = []; page.on("request", request => { if (request.method() !== "GET" && new URL(request.url()).pathname.startsWith("/api/")) writes.push(new URL(request.url()).pathname); });
  await page.goto("/movies"); await page.getByRole("link", { name: "Xem chi tiết phim Phim thật" }).click(); await page.getByRole("link", { name: /Chọn rạp/ }).click();
  await page.getByRole("radio", { name: "Smart Cinema Landmark", exact: true }).check(); await page.getByRole("button", { name: "Tiếp tục chọn suất chiếu" }).click();
  await page.getByRole("radio", { name: "Phòng chiếu 1 10:00 Đang mở bán", exact: true }).check(); await page.getByRole("button", { name: "Tiếp tục chọn ghế" }).click();
  await page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Còn trống", exact: true }).click(); await confirmSelectedHolds(page); const origins = structuredClone(holds.holds);
  await page.getByRole("button", { name: "Tạo đơn đặt vé & xem thông tin", exact: true }).click(); await expect(page).toHaveURL(SUMMARY);
  await page.getByRole("link", { name: "Thêm bắp nước", exact: true }).click(); const item = page.getByRole("article", { name: `Món ${POPCORN_ID}` });
  await expect(item.getByRole("button", { name: "Thêm món" })).toBeEnabled(); await item.getByRole("textbox").fill("2"); await item.getByRole("button", { name: "Thêm món" }).click();
  await expect(item.getByRole("button", { name: "Thêm món" })).toBeEnabled(); await page.getByRole("link", { name: "Về thông tin đặt vé", exact: true }).click();
  await page.getByRole("textbox", { name: "Mã khuyến mãi" }).fill(" fixed "); await page.getByRole("button", { name: "Áp dụng khuyến mãi", exact: true }).click(); await expect(initiate(page)).toBeEnabled();
  const before = structuredClone(bookings.booking!); expect(before.finalAmount).toBe("90020.4444"); await start(page); await expect(gateway(page)).toBeEnabled();
  expect(payments.requests).toEqual([{ method: "POST", path: `/api/v1/bookings/${BOOKING_ID}/payment-transactions`, body: {}, authorization: "Bearer qa-access" }]);
  expect(payments.created).toBe(1); expect(bookings.booking).toEqual({ ...before, paymentStartedAt: payments.receipt!.initiatedAt });
  expect(holds.attachedHolds).toEqual(origins); expect(holds.deletes).toHaveLength(0); expect(bookings.posts).toHaveLength(1);
  await expect(panel(page)).toContainText(PAYMENT_ID); await expect(panel(page)).toContainText("90,020.4444"); await expect(panel(page)).toContainText("Chưa có xác nhận đã trả tiền");
  await expect(page.getByText("Trạng thái: Chờ thanh toán", { exact: true })).toBeVisible(); await expect(page.getByRole("button", { name: "Áp dụng khuyến mãi", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Chỉnh sửa bắp nước", exact: true })).toHaveCount(0); await expect(page.locator("canvas, img[alt*='QR']")).toHaveCount(0);
  await page.reload(); await expect(gateway(page)).toBeEnabled(); expect(payments.requests).toHaveLength(1); expect(payments.reads).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath(`payment-frozen-${mobile ? "mobile" : "desktop"}.png`), fullPage: true }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto(CONCESSIONS); await expect(page.getByRole("button", { name: "Thêm món" })).toHaveCount(0); await page.goBack(); await expect(gateway(page)).toBeEnabled();
  expect(concessions.requests).toHaveLength(1); expect(promotions.requests).toHaveLength(1); expect(writes.every(path => !/ipn|return|tickets|check-in|query/.test(path))).toBe(true);
});
test("rapid click and Enter share one gate with Summary reads and Promotion writes", async ({ page }) => {
  const { payments, promotions } = await prepare(page); await create(page); let finish!: () => void; payments.delay = new Promise<void>(resolve => { finish = resolve; });
  await initiate(page).click(); await expect(initiate(page)).toBeDisabled(); await expect(page.getByRole("button", { name: "Áp dụng khuyến mãi", exact: true })).toBeDisabled();
  await page.keyboard.press("Enter"); await page.getByRole("button", { name: "Cập nhật đơn đặt vé", exact: true }).dispatchEvent("click");
  await expect.poll(() => payments.requests.length).toBe(1); expect(promotions.requests).toHaveLength(0); finish(); await expect(gateway(page)).toBeEnabled(); expect(payments.created).toBe(1);
});
for (const outcome of ["lost", "malformed", "service"] as const) test(`${outcome} committed initiation refetches frozen Booking without blind POST or invented ID`, async ({ page }) => {
  const { payments, bookings } = await prepare(page); await create(page); payments.outcome = outcome; await start(page);
  await expect(panel(page)).toContainText("chưa có mã lần thanh toán"); await expect(review(page)).toBeDisabled(); await expect(gateway(page)).toHaveCount(0);
  await page.reload(); await expect(panel(page)).toContainText("chưa có mã lần thanh toán"); await page.getByRole("button", { name: "Cập nhật đơn đặt vé", exact: true }).click();
  await expect(panel(page)).toContainText("chưa có mã lần thanh toán"); expect(payments.requests).toHaveLength(1); expect(payments.created).toBe(1); expect(bookings.booking!.status).toBe("PENDING");
});
test("navigation interruption and direct entry recover frozen unknown identity, never auto initiate", async ({ page }) => {
  const { payments } = await prepare(page); await create(page); let finish!: () => void; payments.delay = new Promise<void>(resolve => { finish = resolve; });
  await initiate(page).click(); await expect.poll(() => payments.requests.length).toBe(1); await page.goto("/movies"); finish(); await expect.poll(() => payments.created).toBe(1);
  await page.goto(SUMMARY); await expect(panel(page)).toContainText("chưa có mã lần thanh toán"); await page.goBack(); await page.goForward(); await expect(panel(page)).toContainText("chưa có mã lần thanh toán"); expect(payments.requests).toHaveLength(1);
});
for (const outcome of ["malformed-known", "mismatched-known"] as const) test(`${outcome} receipt recovers only through agreeing owned reads and explicit review`, async ({ page }) => {
  const { payments } = await prepare(page); await create(page); payments.outcome = outcome; await start(page);
  await expect(review(page)).toBeEnabled(); await expect(panel(page)).toContainText(PAYMENT_ID); await expect(panel(page)).toContainText("90,001.4321");
  await expect(gateway(page)).toBeDisabled(); expect(payments.requests).toHaveLength(1); expect(payments.reads).toBeGreaterThan(0);
  await page.reload(); await expect(review(page)).toBeEnabled(); await review(page).click(); await expect(gateway(page)).toBeEnabled(); expect(payments.requests).toHaveLength(1);
});
test("timed-out write persists review intent, then reads without automatically replaying", async ({ page }) => {
  const { payments } = await prepare(page); await create(page); let finish!: () => void; payments.delay = new Promise<void>(resolve => { finish = resolve; });
  await initiate(page).click(); await expect.poll(() => payments.requests.length).toBe(1); await page.clock.fastForward(31_000);
  await expect(review(page)).toBeEnabled(); await expect(initiate(page)).toBeDisabled(); finish(); await expect.poll(() => payments.created).toBe(1);
  await page.getByRole("button", { name: "Cập nhật đơn đặt vé", exact: true }).click(); await expect(panel(page)).toContainText("chưa có mã lần thanh toán"); expect(payments.requests).toHaveLength(1);
});
for (const status of [400, 401, 403, 404, 409]) test(`initiation HTTP ${status} displays safe error and rechecks owned Booking`, async ({ page }) => {
  const { payments, bookings } = await prepare(page); await create(page); payments.rejectNext = status; const reads = bookings.reads; await initiate(page).click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible(); await expect(page.getByRole("main").getByRole("alert")).not.toContainText("private"); await expect(initiate(page)).toBeEnabled();
  expect(payments.created).toBe(0); expect(bookings.reads).toBeGreaterThan(reads); expect(bookings.booking!.paymentStartedAt).toBeNull(); expect(payments.requests).toHaveLength(1);
});
for (const title of ["Promotion unavailable", "Composition review required"]) test(`first initiation ${title} preserves saved composition for explicit Promotion review`, async ({ page }) => {
  const { payments, bookings } = await prepare(page); await create(page); await page.getByRole("textbox", { name: "Mã khuyến mãi" }).fill("FIXED"); await page.getByRole("button", { name: "Áp dụng khuyến mãi", exact: true }).click(); await expect(initiate(page)).toBeEnabled();
  const before = structuredClone(bookings.booking!); payments.rejectNext = 409; payments.rejectTitle = title; await initiate(page).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(title === "Promotion unavailable" ? "không còn khả dụng" : "đã thay đổi"); await expect(initiate(page)).toBeEnabled(); expect(bookings.booking).toEqual(before); expect(payments.created).toBe(0);
});
test("concurrent composition update discovered before write requires explicit rereview", async ({ page }) => {
  const { bookings, payments } = await prepare(page); await create(page);
  Object.assign(bookings.booking!, { concessionAmount: "1.0000", subtotal: "90002.4321", finalAmount: "90002.4321", concessions: [{ id: "7", itemId: "8", name: "Máy chủ mới", category: "DRINK", quantity: 1, unitPrice: "1.0000", totalPrice: "1.0000" }] });
  await initiate(page).click(); await expect(review(page)).toBeEnabled(); expect(payments.requests).toHaveLength(0); await expect(initiate(page)).toBeDisabled();
  await review(page).click(); await start(page); await expect(gateway(page)).toBeEnabled(); expect(payments.receipt!.amount).toBe("90002.4321");
});
test("composition that commits just before freeze wins as a complete aggregate and needs review", async ({ page }) => {
  const { payments, bookings } = await prepare(page); await create(page);
  payments.beforeWrite = () => { Object.assign(bookings.booking!, { discount: "1.2345", finalAmount: "90000.1976", promotion: { id: "9", code: "FIXED", type: "FIXED_AMOUNT", value: "1.2345", minimumOrderAmount: "0.0000", maxDiscountAmount: null } }); };
  await start(page); await expect(review(page)).toBeEnabled(); await expect(gateway(page)).toBeDisabled(); await expect(panel(page)).toContainText("90,000.1976");
  await review(page).click(); await expect(gateway(page)).toBeEnabled(); expect(payments.created).toBe(1);
});
test("other tab freeze is discovered before POST and remains read-only after back/forward", async ({ page }) => {
  const { bookings, payments } = await prepare(page); await create(page); bookings.booking!.paymentStartedAt = "2030-01-01T02:00:01.000Z";
  await initiate(page).click(); await expect(panel(page)).toContainText("chưa có mã lần thanh toán"); expect(payments.requests).toHaveLength(0);
  await page.getByRole("link", { name: "Quay lại chọn ghế", exact: true }).click(); await expect(page.getByRole("button", { name: "Tạo đơn đặt vé & xem thông tin" })).toBeDisabled();
  await page.goBack(); await expect(panel(page)).toContainText("chưa có mã lần thanh toán"); await page.goForward(); await page.goBack(); expect(payments.requests).toHaveLength(0);
});
test("known identity survives reload and failed recovery blocks gateway until authoritative read", async ({ page }) => {
  const { payments } = await prepare(page); await create(page); await start(page); await expect(gateway(page)).toBeEnabled(); payments.readError = 503;
  await page.reload(); await expect(review(page)).toBeDisabled(); await expect(page.getByRole("main").getByRole("alert")).toBeVisible(); await expect(panel(page)).toContainText("Chưa thể đọc lần thanh toán"); expect(payments.requests).toHaveLength(1);
  payments.readError = 0; await page.getByRole("button", { name: "Cập nhật đơn đặt vé", exact: true }).click(); await expect(review(page)).toBeEnabled(); await review(page).click(); await expect(gateway(page)).toBeEnabled();
});
test("Sandbox unavailable stays on frozen Booking and never manufactures provider acceptance", async ({ page }) => {
  const { payments, bookings } = await prepare(page); await create(page); await start(page); await expect(gateway(page)).toBeEnabled(); const before = structuredClone(bookings.booking!);
  await gateway(page).click(); await expect(page.getByRole("main").getByRole("alert")).toContainText("Sandbox chưa sẵn sàng"); await expect(review(page)).toBeEnabled(); await expect(gateway(page)).toBeDisabled();
  expect(bookings.booking).toEqual(before); expect(payments.created).toBe(1); expect(payments.status).toBe("INITIATED"); await expect(page).toHaveURL(SUMMARY);
});
test("exact approved server URL alone is forwarded, no financial success or return processing", async ({ page }, info) => {
  const state = await prepare(page); await create(page); await wholeAmount(page, state); state.payments.submissionEnabled = true;
  await page.route("https://sandbox.vnpayment.vn/**", route => route.fulfill({ contentType: "text/html", body: "<html lang='vi'><title>Cổng thử nghiệm mô phỏng</title><p>Isolated HTTP fixture, not provider acceptance</p></html>" }));
  await start(page); await expect(gateway(page)).toBeEnabled(); await gateway(page).click(); await expect(page).toHaveURL(SANDBOX_URL);
  expect(state.payments.created).toBe(1); expect(state.payments.requests).toHaveLength(2); expect(state.payments.status).toBe("PENDING"); expect(state.bookings.booking!.status).toBe("PENDING");
  await page.goBack(); await expect(review(page)).toBeEnabled(); await expect(gateway(page)).toBeDisabled(); expect(state.payments.requests).toHaveLength(2);
  await page.screenshot({ path: info.outputPath("payment-returned-review.png"), fullPage: true });
});
for (const outcome of ["lost", "unsafe", "malformed"] as const) test(`submission ${outcome} recovers known PENDING without reopening or replacing`, async ({ page }) => {
  const state = await prepare(page); await create(page); await wholeAmount(page, state); state.payments.submissionEnabled = true; state.payments.submissionOutcome = outcome;
  await start(page); await expect(gateway(page)).toBeEnabled(); await gateway(page).click(); await expect(review(page)).toBeEnabled(); await expect(gateway(page)).toBeDisabled();
  await expect(page).toHaveURL(SUMMARY); await expect(panel(page)).toContainText(PAYMENT_ID); expect(state.payments.status).toBe("PENDING");
  await page.reload(); await expect(review(page)).toBeEnabled(); expect(state.payments.requests).toHaveLength(2); await review(page).click(); await gateway(page).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Sandbox chưa sẵn sàng"); expect(state.payments.created).toBe(1); expect(state.payments.requests).toHaveLength(3);
});
test("fractional internal amount freezes exactly while provider rejection never rounds or reprices", async ({ page }) => {
  const state = await prepare(page); await create(page); state.payments.submissionEnabled = true; await start(page); await expect(gateway(page)).toBeEnabled();
  const amount = state.bookings.booking!.finalAmount; await gateway(page).click(); await expect(page.getByRole("main").getByRole("alert")).toBeVisible(); expect(state.payments.receipt!.amount).toBe(amount); expect(state.bookings.booking!.finalAmount).toBe(amount); expect(state.payments.status).toBe("INITIATED");
});
test("full-discount zero amount remains an actual internal attempt with no fake paid state", async ({ page }) => {
  const { payments, bookings } = await prepare(page); await create(page); payments.submissionEnabled = true;
  await page.getByRole("textbox", { name: "Mã khuyến mãi" }).fill("FULL"); await page.getByRole("button", { name: "Áp dụng khuyến mãi", exact: true }).click(); await expect(initiate(page)).toBeEnabled();
  await start(page); await expect(gateway(page)).toBeEnabled(); await expect(panel(page)).toContainText("0.0000"); await gateway(page).click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible(); expect(payments.receipt!.amount).toBe("0.0000"); expect(bookings.booking!.status).toBe("PENDING"); expect(payments.status).toBe("INITIATED");
});
test("two tabs concurrently reuse one unresolved server attempt without extending original deadline", async ({ page, context }) => {
  const state = await prepare(page); await create(page); const other = await context.newPage();
  await other.clock.install({ time: new Date("2030-01-01T02:00:00Z") });
  await mockCustomerConcessions(other, state.bookings, state.concessions); await mockCustomerPayments(other, state.bookings, state.payments);
  await other.goto(SUMMARY); await expect(initiate(other)).toBeEnabled(); const deadline = state.bookings.booking!.expiresAt;
  let finish!: () => void; state.payments.delay = new Promise<void>(resolve => { finish = resolve; });
  await Promise.all([initiate(page).click(), initiate(other).click()]); await expect.poll(() => state.payments.requests.length).toBe(2); finish();
  await expect(gateway(page)).toBeEnabled(); await expect(gateway(other)).toBeEnabled(); expect(state.payments.created).toBe(1); expect(state.bookings.booking!.expiresAt).toBe(deadline);
  await other.reload(); await expect(gateway(other)).toBeEnabled(); expect(state.payments.requests).toHaveLength(2); await other.close();
});
test("forged recovery hint never grants ownership or creates a replacement on frozen Booking", async ({ page }) => {
  const { payments } = await prepare(page); await create(page); await start(page); await expect(gateway(page)).toBeEnabled();
  await page.evaluate(id => sessionStorage.setItem('smart-cinema.payment-initiation:' + id, JSON.stringify({ bookingId: id, paymentId: "9007199254740993", reviewRequired: false, amount: "0.0000", status: "SUCCESS" })), BOOKING_ID);
  await page.reload(); await expect(page.getByRole("main").getByRole("alert")).toContainText("không khả dụng"); await expect(review(page)).toBeDisabled(); await expect(panel(page)).toContainText("Chưa thể đọc lần thanh toán");
  expect(payments.requests).toHaveLength(1); await expect(panel(page)).not.toContainText("Thanh toán thành công");
});
test("terminal, reconciled and expired attempts never enable another initiation or gateway", async ({ page }) => {
  const { payments, bookings } = await prepare(page); await create(page); await start(page); await expect(gateway(page)).toBeEnabled();
  for (const status of ["FAILED", "CANCELLED", "SUCCESS"] as const) { payments.status = status; await page.reload(); await expect(gateway(page)).toBeDisabled(); await expect(initiate(page)).toHaveCount(0); await expect(panel(page)).not.toContainText("Thanh toán thành công"); }
  payments.status = "PENDING"; payments.reconciliationRequired = true; await page.reload(); await expect(gateway(page)).toBeDisabled(); await expect(panel(page)).toContainText("đối soát");
  payments.reconciliationRequired = false; await page.clock.fastForward(11 * 60_000); await expect(gateway(page)).toBeDisabled(); expect(bookings.booking!.status).toBe("EXPIRED"); expect(payments.requests).toHaveLength(1);
});
test("expired session and foreign Booking reads never auto write", async ({ page }) => {
  const { payments, bookings } = await prepare(page); await create(page); await start(page); await expect(gateway(page)).toBeEnabled(); bookings.readError = 401;
  await page.reload(); await expect(page.getByRole("link", { name: "Đăng nhập lại", exact: true })).toHaveAttribute("href", `/login?${new URLSearchParams({ returnTo: SUMMARY })}`); expect(payments.requests).toHaveLength(1);
  bookings.readError = 404; await page.goto(SUMMARY); await expect(page.getByRole("heading", { name: "Đơn đặt vé không khả dụng" })).toBeVisible(); expect(payments.requests).toHaveLength(1);
});
test("anonymous login resume restores owned frozen identity with GET only", async ({ page }) => {
  const { payments } = await prepare(page); await create(page); await start(page); await expect(gateway(page)).toBeEnabled();
  await page.evaluate(() => { sessionStorage.setItem("qa.disable-auto-login", "true"); localStorage.removeItem("smart-cinema.auth-session"); });
  await page.goto(SUMMARY); await expect(page.getByRole("heading", { name: "Đăng nhập để xem đơn đặt vé" })).toBeVisible();
  await page.route("**/api/v1/auth/tokens", route => route.fulfill({ json: { accessToken: "qa-access", tokenType: "Bearer", expiresIn: 3600, refreshToken: "qa-refresh", refreshExpiresIn: 86400, userId: 1, email: "customer@example.test", fullName: "Customer", role: "CUSTOMER" } }));
  await page.getByRole("main").getByRole("link", { name: "Đăng nhập", exact: true }).click();
  await page.getByLabel("Địa chỉ email", { exact: true }).fill("customer@example.test"); await page.getByLabel("Mật khẩu", { exact: true }).fill("test-customer-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click(); await expect(page).toHaveURL(SUMMARY); await expect(gateway(page)).toBeEnabled();
  await expect(panel(page)).toContainText(PAYMENT_ID); expect(payments.requests).toHaveLength(1); expect(payments.reads).toBeGreaterThan(1);
});
test("storage-denied reload trusts frozen server state and ignores forged client return success", async ({ page }) => {
  const { payments } = await prepare(page); await create(page);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error("blocked"); }; });
  await start(page); await expect(gateway(page)).toBeEnabled(); await page.goto(SUMMARY + "?vnp_ResponseCode=00&status=SUCCESS&amount=0");
  await expect(panel(page)).toContainText("chưa có mã lần thanh toán"); await expect(panel(page)).not.toContainText("Thanh toán thành công"); expect(payments.requests).toHaveLength(1);
});
