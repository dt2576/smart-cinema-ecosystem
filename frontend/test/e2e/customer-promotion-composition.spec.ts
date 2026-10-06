import { expect, test, type Page } from "@playwright/test";
import { mockDiscoveryReads } from "./helpers/customer-discovery";
import { mockCustomerHolds, confirmSelectedHolds } from "./helpers/customer-holds";
import { mockCustomerBookings, BOOKING_ID } from "./helpers/customer-bookings";
import { mockCustomerConcessions, POPCORN_ID, DRINK_ID } from "./helpers/customer-concessions";
import { mockCustomerPromotions } from "./helpers/customer-promotions";

const MOVIE = "9223372036854775807", CINEMA = "9007199254740993";
const SEATS = `/showtimes/9007199254741001/seats?movieId=${MOVIE}&cinemaId=${CINEMA}&date=2030-01-01`;
const SUMMARY = `/bookings/${BOOKING_ID}/summary`, CONCESSIONS = `/bookings/${BOOKING_ID}/concessions`;
const panel = (page: Page) => page.getByRole("region", { name: "Khuyến mãi đã lưu", exact: true });
const applyButton = (page: Page) => panel(page).getByRole("button", { name: "Áp dụng khuyến mãi", exact: true });
const reviewButton = (page: Page) => panel(page).getByRole("button", { name: "Đã xem dữ liệu máy chủ, tiếp tục chỉnh sửa", exact: true });

async function prepare(page: Page) {
  await page.clock.install({ time: new Date("2030-01-01T02:00:00Z") });
  const discovery = await mockDiscoveryReads(page), holds = await mockCustomerHolds(page, discovery), bookings = await mockCustomerBookings(page, holds);
  const concessions = await mockCustomerConcessions(page, bookings), promotions = await mockCustomerPromotions(page, bookings, concessions);
  const movie = { id: MOVIE, title: "Phim thật", duration: 125, releaseDate: "2029-01-01", ageRating: "T13", language: "Tiếng Việt", posterUrl: null, status: "PUBLISHED", genres: [], description: null, trailerUrl: null };
  await page.route(`**/api/v1/movies/${MOVIE}`, route => route.fulfill({ json: movie }));
  await page.route("**/api/v1/movies?**", route => { const query = new URL(route.request().url()).searchParams; return route.fulfill({ json: { items: [movie], page: 0, size: Number(query.get("size") ?? 20), totalElements: 1, totalPages: 1, sort: query.get("sort") ?? "title,asc" } }); });
  await page.route("**/api/v1/genres", route => route.fulfill({ json: [] }));
  return { holds, bookings, concessions, promotions };
}
async function create(page: Page) {
  await page.goto(SEATS); await page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Còn trống", exact: true }).click(); await confirmSelectedHolds(page);
  await page.getByRole("button", { name: "Tạo đơn đặt vé & xem thông tin", exact: true }).click(); await expect(page).toHaveURL(SUMMARY); await expect(applyButton(page)).toBeEnabled();
}
async function apply(page: Page, code: string) {
  await expect(applyButton(page)).toBeEnabled(); await panel(page).getByRole("textbox", { name: "Mã khuyến mãi", exact: true }).fill(code); await applyButton(page).click();
  await expect(panel(page).getByRole("status")).toContainText("Đã lưu khuyến mãi vào đơn đặt vé."); await expect(applyButton(page)).toBeEnabled();
}
async function remove(page: Page) {
  await panel(page).getByRole("button", { name: "Xóa khuyến mãi", exact: true }).click(); await expect(panel(page).getByRole("status")).toContainText("Đã xóa khuyến mãi khỏi đơn đặt vé."); await expect(applyButton(page)).toBeEnabled();
}
async function add(page: Page, item = POPCORN_ID, quantity = "2") {
  const card = page.getByRole("article", { name: `Món ${item}`, exact: true }); await expect(card.getByRole("button", { name: "Thêm món" })).toBeEnabled();
  await card.getByRole("textbox").fill(quantity); await card.getByRole("button", { name: "Thêm món" }).click(); await expect(page.getByRole("status").filter({ hasText: "Đã lưu bắp nước vào đơn đặt vé." })).toBeVisible(); await expect(card.getByRole("button", { name: "Thêm món" })).toBeEnabled();
}
async function summary(page: Page) {
  await page.getByRole("link", { name: "Về thông tin đặt vé", exact: true }).click(); await expect(page).toHaveURL(SUMMARY); await expect(applyButton(page)).toBeEnabled();
}

for (const mobile of [false, true]) test(`real-contract journey applies replaces removes Promotion with persisted exact totals on ${mobile ? "mobile" : "desktop"}`, async ({ page }, info) => {
  const { bookings, concessions, promotions, holds } = await prepare(page);
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  const requests: string[] = []; page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) requests.push(`${request.method()} ${new URL(request.url()).pathname}`); });
  await page.goto("/movies"); await page.getByRole("link", { name: "Xem chi tiết phim Phim thật" }).click(); await page.getByRole("link", { name: /Chọn rạp/ }).click();
  await page.getByRole("radio", { name: "Smart Cinema Landmark", exact: true }).check(); await page.getByRole("button", { name: "Tiếp tục chọn suất chiếu" }).click();
  await page.getByRole("radio", { name: "Phòng chiếu 1 10:00 Đang mở bán", exact: true }).check(); await page.getByRole("button", { name: "Tiếp tục chọn ghế" }).click();
  await page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Còn trống", exact: true }).click(); await confirmSelectedHolds(page); const origins = structuredClone(holds.holds);
  await page.getByRole("button", { name: "Tạo đơn đặt vé & xem thông tin" }).click(); await expect(page).toHaveURL(SUMMARY); const before = structuredClone(bookings.booking!);
  await page.getByRole("link", { name: "Thêm bắp nước", exact: true }).click(); await add(page); await summary(page); await apply(page, " fixed ");
  expect(promotions.requests[0]).toEqual({ method: "PUT", path: `/api/v1/bookings/${BOOKING_ID}/promotion`, body: { code: " fixed " }, authorization: "Bearer qa-access" });
  await expect(panel(page)).toContainText("Khuyến mãi đã áp dụng: FIXED"); await expect(panel(page)).toContainText("9223372036854775807"); await expect(panel(page)).toContainText("1.2345");
  await expect(page.getByRole("complementary")).toContainText("90,020.4444"); await expect(page.locator(`time[datetime="${before.expiresAt}"]`)).toBeVisible();
  await page.reload(); await expect(panel(page)).toContainText("Khuyến mãi đã áp dụng: FIXED"); await expect(applyButton(page)).toBeEnabled();
  await page.getByRole("link", { name: "Chỉnh sửa bắp nước", exact: true }).click(); await expect(page).toHaveURL(CONCESSIONS);
  await expect(page.getByRole("region", { name: "Khuyến mãi trong đơn đang chỉnh sửa" })).toContainText("FIXED"); await summary(page);
  await page.goBack(); await expect(page).toHaveURL(CONCESSIONS); await page.goForward(); await expect(page).toHaveURL(SUMMARY); await expect(panel(page)).toContainText("FIXED");
  await panel(page).getByRole("textbox").focus(); await page.keyboard.press("Tab"); await expect(applyButton(page)).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: info.outputPath("promotion-summary.png"), fullPage: true });
  await apply(page, "CAPPED"); await expect(panel(page)).toContainText("9.0000"); expect(bookings.booking!.promotion!.maxDiscountAmount).toBe("9.7500");
  await remove(page); await expect(panel(page)).toContainText("Chưa áp dụng khuyến mãi."); await page.reload(); await expect(panel(page)).toContainText("Chưa áp dụng khuyến mãi.");
  expect(promotions.requests.map(request => request.method)).toEqual(["PUT", "PUT", "DELETE"]); expect(promotions.requests[2].body).toBeUndefined(); expect(concessions.requests).toHaveLength(1);
  expect(bookings.booking!.expiresAt).toBe(before.expiresAt); expect(bookings.booking!.seats).toEqual(before.seats); expect(bookings.booking!.seatAmount).toBe(before.seatAmount); expect(holds.attachedHolds).toEqual(origins); expect(holds.deletes).toEqual([]); expect(bookings.posts).toHaveLength(1);
  expect(bookings.booking!.finalAmount).toBe("90021.6789"); expect(bookings.booking!.discount).toBe("0.0000");
  expect(requests.some(request => /payment|ticket|vnpay|qr/i.test(request))).toBe(false); expect(requests.some(request => /GET .*promotion/.test(request))).toBe(false);
});

test("invalid code and all supported unavailable categories retain prior snapshots without leaking reasons", async ({ page }) => {
  const { promotions, bookings } = await prepare(page); await create(page); await applyButton(page).click(); await expect(panel(page).getByRole("alert")).toContainText("Vui lòng nhập mã"); expect(promotions.requests).toEqual([]);
  await apply(page, "FIXED"); const before = structuredClone(bookings.booking!);
  for (const code of ["X".repeat(51), "UNKNOWN", "INACTIVE", "FUTURE", "EXPIRED", "MINIMUM", "EXHAUSTED"]) {
    await panel(page).getByRole("textbox").fill(code); await applyButton(page).click(); await expect(page.getByRole("main").getByRole("alert").first()).toContainText(code.length > 50 ? "Mã khuyến mãi không hợp lệ" : "Khuyến mãi không khả dụng"); await expect(applyButton(page)).toBeEnabled();
    expect(bookings.booking!.promotion).toEqual(before.promotion); expect(bookings.booking!.discount).toBe(before.discount); expect(bookings.booking!.expiresAt).toBe(before.expiresAt); await expect(page.getByRole("main")).not.toContainText("private SQL");
  }
  expect(promotions.requests).toHaveLength(8);
});

test("stored terms survive master changes until explicit reapplication; zero, capped percentage and full fixed remain server values", async ({ page }) => {
  const { promotions, bookings } = await prepare(page); await create(page); await apply(page, "PERCENT"); await expect(panel(page)).toContainText("9,000.0000"); const saved = structuredClone(bookings.booking!.promotion);
  promotions.masters.PERCENT.value = "20.0000"; promotions.masters.PERCENT.maxDiscountAmount = "15.7500"; await page.reload(); await expect(panel(page)).toContainText("9,000.0000"); expect(bookings.booking!.promotion).toEqual(saved);
  await apply(page, "PERCENT"); await expect(panel(page)).toContainText("15.0000"); expect(bookings.booking!.promotion!.value).toBe("20.0000");
  await apply(page, "ZERO"); await expect(panel(page)).toContainText("0.0000"); expect(bookings.booking!.promotion).not.toBeNull();
  await apply(page, "FULL"); expect(bookings.booking!.finalAmount).toBe("0.0000"); await expect(page.getByRole("complementary").getByRole("definition").last()).toHaveText("0.0000");
});

test("all Concession edits refresh Promotion terms and invalid minimum rolls back until real removal", async ({ page }) => {
  const { promotions, bookings } = await prepare(page); await create(page); await apply(page, "PERCENT"); promotions.masters.PERCENT.value = "20.0000"; promotions.masters.PERCENT.maxDiscountAmount = "15.0000";
  await page.getByRole("link", { name: "Thêm bắp nước" }).click(); await add(page, POPCORN_ID, "3");
  const saved = structuredClone(bookings.booking!), line = saved.concessions[0]; expect(saved.discount).toBe("15.0000"); expect(saved.promotion!.value).toBe("20.0000"); await expect(page.getByRole("region", { name: "Khuyến mãi trong đơn đang chỉnh sửa" })).toContainText("15.0000");
  promotions.masters.PERCENT.minimumOrderAmount = "90030.0000";
  const row = page.getByRole("listitem", { name: `Dòng bắp nước ${line.id}`, exact: true }); await row.getByRole("textbox").fill("2"); await row.getByRole("button", { name: "Lưu số lượng" }).click(); await expect(page.getByRole("main").getByRole("alert")).toBeVisible(); await expect(row.getByRole("button", { name: "Lưu số lượng" })).toBeEnabled();
  expect(bookings.booking!.concessions).toEqual(saved.concessions); expect(bookings.booking!.promotion).toEqual(saved.promotion); expect(bookings.booking!.finalAmount).toBe(saved.finalAmount);
  await row.getByRole("button", { name: "Xóa món" }).click(); await expect(row.getByRole("button", { name: "Lưu số lượng" })).toBeEnabled(); expect(bookings.booking!.concessions).toEqual(saved.concessions);
  await summary(page); await remove(page); await page.getByRole("link", { name: "Chỉnh sửa bắp nước" }).click(); await row.getByRole("textbox").fill("2"); await row.getByRole("button", { name: "Lưu số lượng" }).click(); await expect(row).toContainText("× 2"); await expect(row.getByRole("button", { name: "Lưu số lượng" })).toBeEnabled();
  await row.getByRole("button", { name: "Xóa món" }).click(); await expect(page.getByRole("listitem")).toHaveCount(0); await summary(page); expect(bookings.booking!.promotion).toBeNull(); expect(bookings.booking!.discount).toBe("0.0000"); expect(bookings.booking!.expiresAt).toBe(saved.expiresAt);
});

test("rapid duplicate submit and focus refresh cannot race the Summary mutation", async ({ page }) => {
  const { promotions } = await prepare(page); await create(page); await panel(page).getByRole("textbox").fill("FIXED"); let finish!: () => void; promotions.delay = new Promise<void>(resolve => { finish = resolve; });
  await applyButton(page).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); }); await expect.poll(() => promotions.requests.length).toBe(1); await expect(applyButton(page)).toBeDisabled(); await expect(page.getByRole("link", { name: "Thêm bắp nước" })).toHaveCount(0);
  await page.evaluate(() => { window.dispatchEvent(new Event("focus")); window.dispatchEvent(new Event("pageshow")); }); finish(); await expect(applyButton(page)).toBeEnabled(); await expect(panel(page)).toContainText("FIXED"); expect(promotions.requests).toHaveLength(1);
});

for (const outcome of ["lost", "malformed", "service"] as const) test(`${outcome} committed apply and remove require owned reconciliation and explicit review without replay`, async ({ page }) => {
  const { promotions, bookings } = await prepare(page); await create(page); promotions.outcome = outcome; await panel(page).getByRole("textbox").fill("FIXED"); await applyButton(page).click();
  await expect(reviewButton(page)).toBeEnabled(); await expect(panel(page)).toContainText("Khuyến mãi đã áp dụng: FIXED"); await expect(applyButton(page)).toBeDisabled(); await expect(page.getByRole("link", { name: "Thêm bắp nước" })).toHaveCount(0); expect(promotions.requests).toHaveLength(1);
  await reviewButton(page).click(); await expect(applyButton(page)).toBeEnabled(); promotions.outcome = outcome; await panel(page).getByRole("button", { name: "Xóa khuyến mãi" }).click();
  await expect(reviewButton(page)).toBeEnabled(); await expect(panel(page)).toContainText("Chưa áp dụng khuyến mãi."); await expect(applyButton(page)).toBeDisabled(); expect(promotions.requests).toHaveLength(2); expect(bookings.booking!.promotion).toBeNull();
  await reviewButton(page).click(); await page.reload(); await expect(applyButton(page)).toBeEnabled(); expect(promotions.requests).toHaveLength(2);
});

test("failed owned reconciliation keeps writes blocked through retry until Customer review", async ({ page }) => {
  const { promotions, bookings } = await prepare(page); await create(page); promotions.outcome = "lost"; promotions.beforeWrite = () => { bookings.readError = 503; }; await panel(page).getByRole("textbox").fill("FIXED"); await applyButton(page).click();
  await expect(reviewButton(page)).toBeDisabled(); await expect(applyButton(page)).toBeDisabled(); expect(promotions.requests).toHaveLength(1); bookings.readError = 0; promotions.beforeWrite = undefined;
  await page.getByRole("button", { name: "Tải lại đơn đặt vé", exact: true }).click(); await expect(reviewButton(page)).toBeEnabled(); await expect(panel(page)).toContainText("FIXED"); await expect(applyButton(page)).toBeDisabled(); await reviewButton(page).click(); await expect(applyButton(page)).toBeEnabled(); expect(promotions.requests).toHaveLength(1);
});

for (const frozen of [false, true]) test(`${frozen ? "freeze" : "expiry"} while Promotion is in flight rejects without deadline renewal or another Booking`, async ({ page }) => {
  const { promotions, bookings } = await prepare(page); await create(page); const before = structuredClone(bookings.booking!); let finish!: () => void; promotions.delay = new Promise<void>(resolve => { finish = resolve; });
  await panel(page).getByRole("textbox").fill("FIXED"); await applyButton(page).click(); await expect.poll(() => promotions.requests.length).toBe(1);
  if (frozen) bookings.booking!.paymentStartedAt = before.serverTime; else await page.clock.fastForward(600001); finish();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Chưa thể thay đổi khuyến mãi"); await expect(applyButton(page)).toHaveCount(0); expect(bookings.booking!.promotion).toBeNull(); expect(bookings.booking!.expiresAt).toBe(before.expiresAt); expect(bookings.posts).toHaveLength(1);
});

test("stale Summary freshly checks eligibility and reconciles conflict without restoring old Promotion", async ({ page }) => {
  const { promotions, bookings } = await prepare(page); await create(page); await apply(page, "FIXED");
  promotions.rejectNext = 409; promotions.beforeWrite = () => { bookings.booking!.promotion = null; bookings.booking!.discount = "0.0000"; bookings.booking!.finalAmount = bookings.booking!.subtotal; };
  await panel(page).getByRole("textbox").fill("PERCENT"); await applyButton(page).click(); await expect(page.getByRole("main").getByRole("alert")).toContainText("Chưa thể thay đổi khuyến mãi"); await expect(panel(page)).toContainText("Chưa áp dụng khuyến mãi."); await expect(applyButton(page)).toBeEnabled(); expect(promotions.requests).toHaveLength(2);
  promotions.beforeWrite = undefined; bookings.booking!.paymentStartedAt = bookings.booking!.serverTime; await applyButton(page).click(); await expect(applyButton(page)).toHaveCount(0); expect(promotions.requests).toHaveLength(2);
});

test("terminal and first-attempt frozen direct Summary URLs retain stored Promotion without controls", async ({ page }) => {
  const { bookings, promotions } = await prepare(page); await create(page); await apply(page, "FIXED");
  for (const status of ["PAID", "EXPIRED", "CANCELLED"] as const) { bookings.booking!.status = status; await page.reload(); await expect(panel(page)).toContainText("FIXED"); await expect(applyButton(page)).toHaveCount(0); await expect(panel(page).getByRole("button", { name: "Xóa khuyến mãi" })).toHaveCount(0); }
  bookings.booking!.status = "PENDING"; bookings.booking!.paymentStartedAt = bookings.booking!.serverTime; await page.reload(); await expect(panel(page)).toContainText("Nội dung đơn đã khóa"); await expect(applyButton(page)).toHaveCount(0); expect(promotions.requests).toHaveLength(1);
});

test("two tabs apply different codes then race apply versus remove using only the final server snapshot", async ({ page, context }) => {
  const { bookings, concessions, promotions } = await prepare(page); await create(page); const second = await context.newPage(); await second.clock.install({ time: new Date("2030-01-01T02:00:00Z") }); await mockCustomerConcessions(second, bookings, concessions); await mockCustomerPromotions(second, bookings, concessions, promotions); await second.goto(SUMMARY);
  await Promise.all([apply(page, "FIXED"), apply(second, "PERCENT")]); await page.getByRole("button", { name: "Cập nhật đơn đặt vé", exact: true }).click(); await second.getByRole("button", { name: "Cập nhật đơn đặt vé", exact: true }).click(); await expect(panel(page)).toContainText(bookings.booking!.promotion!.code); await expect(panel(second)).toContainText(bookings.booking!.promotion!.code);
  await Promise.all([apply(page, "CAPPED"), remove(second)]); await page.getByRole("button", { name: "Cập nhật đơn đặt vé", exact: true }).click(); await expect(panel(page)).toContainText(bookings.booking!.promotion ? `Khuyến mãi đã áp dụng: ${bookings.booking!.promotion.code}` : "Chưa áp dụng khuyến mãi.");
  expect(promotions.requests).toHaveLength(4); for (const request of promotions.requests) if (request.method === "PUT") expect(Object.keys(request.body as object)).toEqual(["code"]); await second.close();
});

test("Promotion and Concession mutations across tabs keep the complete aggregate and original expiry", async ({ page, context }) => {
  const { bookings, concessions, promotions } = await prepare(page); await create(page); const deadline = bookings.booking!.expiresAt; const second = await context.newPage(); await second.clock.install({ time: new Date("2030-01-01T02:00:00Z") }); await mockCustomerConcessions(second, bookings, concessions); await mockCustomerPromotions(second, bookings, concessions, promotions); await second.goto(CONCESSIONS);
  await Promise.all([apply(page, "FIXED"), add(second, DRINK_ID, "3")]); await page.getByRole("button", { name: "Cập nhật đơn đặt vé", exact: true }).click(); await expect(page.getByRole("region", { name: "Bắp nước đã lưu" })).toContainText("Nước uống × 3"); await expect(panel(page)).toContainText("FIXED"); expect(bookings.booking!.finalAmount).toBe("90000.1979"); expect(bookings.booking!.expiresAt).toBe(deadline); expect(promotions.requests).toHaveLength(1); expect(concessions.requests).toHaveLength(1); await second.close();
});

test("foreign, wrong-role and expired-auth access stay safe; login resumes owned reads without command replay", async ({ page }) => {
  const { bookings, promotions } = await prepare(page); await create(page); await page.goto("/bookings/9007199254770002/summary"); await expect(page.getByRole("heading", { name: "Đơn đặt vé không khả dụng" })).toBeVisible();
  bookings.readError = 403; await page.goto(SUMMARY); await expect(page.getByRole("heading", { name: "Cần quyền khách hàng" })).toBeVisible(); expect(promotions.requests).toEqual([]);
  bookings.readError = 0; await page.reload(); await expect(applyButton(page)).toBeEnabled(); promotions.rejectNext = 401; promotions.beforeWrite = () => { bookings.readError = 401; }; await panel(page).getByRole("textbox").fill("FIXED"); await applyButton(page).click(); await page.getByRole("link", { name: "Đăng nhập lại", exact: true }).click(); await expect(page).toHaveURL(`/login?returnTo=${encodeURIComponent(SUMMARY)}`);
  await page.route("**/api/v1/auth/tokens", route => { bookings.readError = 0; return route.fulfill({ json: { accessToken: "qa-access", tokenType: "Bearer", expiresIn: 3600, refreshToken: "qa-refresh", refreshExpiresIn: 86400, userId: 1, email: "customer@example.test", fullName: "Customer", role: "CUSTOMER" } }); });
  await page.getByLabel("Địa chỉ email", { exact: true }).fill("customer@example.test"); await page.getByLabel("Mật khẩu", { exact: true }).fill("CustomerOnly123!"); await page.getByRole("button", { name: "Đăng nhập", exact: true }).click(); await expect(page).toHaveURL(SUMMARY); await expect(applyButton(page)).toBeEnabled(); await expect(panel(page)).toContainText("Chưa áp dụng khuyến mãi."); expect(promotions.requests).toHaveLength(1); expect(bookings.posts).toHaveLength(1);
});

test("leaving an in-flight Promotion aborts the client request; return restores owned state without replay", async ({ page }) => {
  const { promotions } = await prepare(page); await create(page); let finish!: () => void; promotions.delay = new Promise<void>(resolve => { finish = resolve; }); await panel(page).getByRole("textbox").fill("FIXED"); await applyButton(page).click(); await expect.poll(() => promotions.requests.length).toBe(1);
  await page.goto(CONCESSIONS); finish(); await expect.poll(() => promotions.requests.length).toBe(1); await page.getByRole("button", { name: "Cập nhật dữ liệu", exact: true }).click(); await summary(page); await expect(panel(page)).toContainText("FIXED"); expect(promotions.requests).toHaveLength(1);
});
