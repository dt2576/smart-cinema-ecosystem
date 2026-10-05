import { test, expect, type Page } from "@playwright/test";
import { mockDiscoveryReads } from "./helpers/customer-discovery";
import { mockCustomerHolds, confirmSelectedHolds } from "./helpers/customer-holds";
import { BOOKING_ID, mockCustomerBookings } from "./helpers/customer-bookings";
import { DRINK_ID, POPCORN_ID, ZERO_ID, mockCustomerConcessions } from "./helpers/customer-concessions";

const MOVIE = "9223372036854775807", CINEMA = "9007199254740993", SHOWTIME = "9007199254741001";
const SEATS = `/showtimes/${SHOWTIME}/seats?movieId=${MOVIE}&cinemaId=${CINEMA}&date=2030-01-01`;
const SUMMARY = `/bookings/${BOOKING_ID}/summary`, CONCESSIONS = `/bookings/${BOOKING_ID}/concessions`;
async function prepare(page: Page) {
  await page.clock.install({ time: new Date("2030-01-01T02:00:00Z") });
  const discovery = await mockDiscoveryReads(page), holds = await mockCustomerHolds(page, discovery), bookings = await mockCustomerBookings(page, holds);
  const state = await mockCustomerConcessions(page, bookings);
  const movie = { id: MOVIE, title: "Phim thật", duration: 125, releaseDate: "2029-01-01", ageRating: "T13", language: "Tiếng Việt", posterUrl: null, status: "PUBLISHED", genres: [], description: null, trailerUrl: null };
  await page.route(`**/api/v1/movies/${MOVIE}`, route => route.fulfill({ json: movie }));
  await page.route("**/api/v1/movies?**", route => { const query = new URL(route.request().url()).searchParams; return route.fulfill({ json: { items: [movie], page: 0, size: Number(query.get("size") ?? 20), totalElements: 1, totalPages: 1, sort: query.get("sort") ?? "title,asc" } }); });
  await page.route("**/api/v1/genres", route => route.fulfill({ json: [] }));
  return { holds, bookings, state };
}
async function create(page: Page) {
  await page.goto(SEATS);
  await page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Còn trống", exact: true }).click(); await confirmSelectedHolds(page);
  await page.getByRole("button", { name: "Tạo đơn đặt vé & xem thông tin", exact: true }).click();
  await expect(page).toHaveURL(SUMMARY);
  await page.getByRole("link", { name: "Thêm bắp nước", exact: true }).click();
  await expect(page.getByRole("article", { name: `Món ${POPCORN_ID}` }).getByRole("button", { name: "Thêm món" })).toBeEnabled();
}
async function add(page: Page, item = POPCORN_ID, quantity = "2") {
  const card = page.getByRole("article", { name: `Món ${item}`, exact: true });
  await card.getByRole("textbox", { name: `Số lượng món ${item}`, exact: true }).fill(quantity);
  await card.getByRole("button", { name: "Thêm món", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu bắp nước vào đơn đặt vé." })).toBeVisible();
  await expect(card.getByRole("button", { name: "Thêm món" })).toBeEnabled();
}

for (const mobile of [false, true]) test(`real contract Customer journey persists Concessions and original deadline on ${mobile ? "mobile" : "desktop"}`, async ({ page }, info) => {
  const { holds, bookings, state } = await prepare(page);
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  const paths: string[] = []; page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/api/")) paths.push(path); });
  await page.goto("/movies"); await page.getByRole("link", { name: "Xem chi tiết phim Phim thật" }).click();
  await page.getByRole("link", { name: /Chọn rạp/ }).click(); await page.getByRole("radio", { name: "Smart Cinema Landmark", exact: true }).check();
  await page.getByRole("button", { name: "Tiếp tục chọn suất chiếu" }).click(); await page.getByRole("radio", { name: "Phòng chiếu 1 10:00 Đang mở bán", exact: true }).check();
  await page.getByRole("button", { name: "Tiếp tục chọn ghế" }).click(); await page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Còn trống", exact: true }).click(); await confirmSelectedHolds(page);
  const origins = structuredClone(holds.holds); await page.getByRole("button", { name: "Tạo đơn đặt vé & xem thông tin" }).click(); await expect(page).toHaveURL(SUMMARY);
  const before = structuredClone(bookings.booking!); await page.getByRole("link", { name: "Thêm bắp nước" }).click(); await expect(page).toHaveURL(CONCESSIONS); await add(page);
  const line = bookings.booking!.concessions[0];
  expect(state.requests[0]).toEqual({ method: "POST", path: `/api/v1/bookings/${BOOKING_ID}/concessions`, body: { itemId: POPCORN_ID, quantity: 2 }, authorization: "Bearer qa-access" });
  const row = page.getByRole("listitem", { name: `Dòng bắp nước ${line.id}`, exact: true });
  await expect(row).toContainText("Bắp rang thật × 2"); await expect(row).toContainText("Đơn giá đã lưu: 10.1234"); await expect(row).toContainText("Thành tiền: 20.2468");
  await expect(page.getByRole("complementary")).toContainText("90,021.6789");
  await row.getByRole("textbox").fill("3"); await row.getByRole("button", { name: "Lưu số lượng" }).click(); await expect(row).toContainText("Bắp rang thật × 3"); await expect(row.getByRole("button", { name: "Lưu số lượng" })).toBeEnabled();
  expect(state.requests[1].body).toEqual({ quantity: 3 }); expect(state.requests[1].method).toBe("PATCH");
  await page.reload(); await expect(page.getByRole("listitem")).toContainText("30.3702");
  await page.getByRole("link", { name: "Về thông tin đặt vé", exact: true }).click(); await expect(page.getByRole("region", { name: "Bắp nước đã lưu" })).toContainText("Bắp rang thật × 3");
  await expect(page.getByRole("region", { name: "Bắp nước đã lưu" })).toContainText("Đơn giá đã lưu: 10.1234"); await expect(page.getByRole("complementary")).toContainText("90,031.8023");
  await page.reload(); await expect(page.getByRole("region", { name: "Bắp nước đã lưu" })).toContainText("30.3702");
  await page.getByRole("link", { name: "Chỉnh sửa bắp nước" }).click(); await expect(page).toHaveURL(CONCESSIONS); await expect(page.getByRole("heading", { name: "Món đã lưu trong đơn" })).toBeVisible(); await expect(page.getByRole("region", { name: "Bắp nước đã lưu" }).getByRole("listitem")).toContainText("Bắp rang thật × 3");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("textbox", { name: `Số lượng dòng ${line.id}` }).focus(); await page.keyboard.press("Tab"); await expect(page.getByRole("button", { name: "Lưu số lượng" })).toBeFocused();
  await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: info.outputPath("concession-composition.png"), fullPage: true });
  await page.getByRole("listitem").getByRole("button", { name: "Xóa món" }).click(); await expect(page.getByRole("listitem")).toHaveCount(0); await expect(page.getByRole("button", { name: "Cập nhật dữ liệu" })).toBeEnabled();
  expect(state.requests[2].method).toBe("DELETE"); expect(state.requests[2].body).toBeUndefined();
  expect(bookings.booking!.expiresAt).toBe(before.expiresAt); expect(bookings.booking!.seats).toEqual(before.seats); expect(bookings.booking!.seatAmount).toBe(before.seatAmount); expect(bookings.booking!.concessionAmount).toBe("0.0000");
  expect(holds.attachedHolds).toEqual(origins); expect(holds.deletes).toEqual([]); expect(bookings.posts).toHaveLength(1);
  await expect(page.locator(`time[datetime="${before.expiresAt}"]`)).toBeVisible();
  expect(paths.some(path => /promotion|payment|ticket|vnpay|qr/i.test(path))).toBe(false);
});

test("persisted snapshots survive catalog repricing, inactive omission and quantity updates", async ({ page }) => {
  const { state, bookings } = await prepare(page); await create(page); await add(page);
  const line = bookings.booking!.concessions[0], deadline = bookings.booking!.expiresAt;
  state.catalog[0].name = "Tên mới"; state.catalog[0].sellingPrice = "999.0000"; await page.getByRole("button", { name: "Cập nhật dữ liệu" }).click();
  await expect(page.getByRole("article", { name: `Món ${POPCORN_ID}` })).toContainText("999.0000"); await expect(page.getByRole("listitem")).toContainText("Bắp rang thật × 2");
  state.catalog = state.catalog.filter(item => item.id !== POPCORN_ID); await page.reload();
  const row = page.getByRole("listitem"); await expect(row).toContainText("không có trong thực đơn hiện tại"); await expect(page.getByRole("article", { name: `Món ${POPCORN_ID}` })).toHaveCount(0);
  await row.getByRole("textbox").fill("4"); await row.getByRole("button", { name: "Lưu số lượng" }).click(); await expect(row).toContainText("40.4936");
  expect(bookings.booking!.concessions[0]).toEqual({ ...line, quantity: 4, totalPrice: "40.4936" }); expect(bookings.booking!.expiresAt).toBe(deadline);
});

test("zero fractional money, duplicate product lines and PostgreSQL quantity capacity remain exact", async ({ page }) => {
  const { bookings, state } = await prepare(page); await create(page); await add(page, ZERO_ID, "2147483647"); await add(page, DRINK_ID, "2147483647"); await add(page, DRINK_ID, "1");
  expect(bookings.booking!.concessions).toHaveLength(3); expect(new Set(bookings.booking!.concessions.map(line => line.id)).size).toBe(3);
  expect(bookings.booking!.concessionAmount).toBe("214748.3648"); expect(state.requests.map(request => request.body)).toEqual([{ itemId: ZERO_ID, quantity: 2147483647 }, { itemId: DRINK_ID, quantity: 2147483647 }, { itemId: DRINK_ID, quantity: 1 }]);
  await expect(page.getByRole("complementary")).toContainText("304,749.7969");
});

test("invalid quantities never write and catalog empty/error never substitutes mock products", async ({ page }) => {
  const { state } = await prepare(page); await create(page);
  const card = page.getByRole("article", { name: `Món ${POPCORN_ID}` });
  for (const value of ["0", "-1", "1.5", "bad", "2147483648"]) { await card.getByRole("textbox").fill(value); await card.getByRole("button", { name: "Thêm món" }).click(); await expect(card.getByRole("alert")).toContainText("Số lượng phải là số nguyên"); }
  expect(state.requests).toEqual([]);
  state.catalogError = 503; await page.getByRole("button", { name: "Cập nhật dữ liệu" }).click(); await expect(page.getByRole("heading", { name: "Không thể tải thực đơn" })).toBeVisible(); await expect(page.getByRole("article")).toHaveCount(0); await expect(page.getByRole("main")).not.toContainText("SQL");
  state.catalogError = 0; state.catalog = []; await page.getByRole("button", { name: "Thử lại", exact: true }).click(); await expect(page.getByText("Chưa có bắp nước đang mở bán. Các món đã lưu vẫn giữ nguyên.")).toBeVisible(); expect(state.requests).toEqual([]);
});

test("stale item 409 and externally removed line 404 reconcile owned composition without duplicate writes", async ({ page }) => {
  const { bookings, state } = await prepare(page); await create(page);
  state.catalog = state.catalog.filter(item => item.id !== POPCORN_ID);
  await page.getByRole("article", { name: `Món ${POPCORN_ID}` }).getByRole("button", { name: "Thêm món" }).click(); await expect(page.getByRole("main").getByRole("alert")).toContainText("Chưa thể lưu bắp nước"); expect(state.requests).toHaveLength(1);
  await expect(page.getByRole("article", { name: `Món ${POPCORN_ID}` })).toHaveCount(0); await add(page, DRINK_ID, "2");
  state.beforeWrite = () => { bookings.booking!.concessions = []; bookings.booking!.concessionAmount = "0.0000"; bookings.booking!.subtotal = bookings.booking!.seatAmount; bookings.booking!.finalAmount = bookings.booking!.seatAmount; };
  await page.getByRole("listitem").getByRole("button", { name: "Xóa món" }).click(); await expect(page.getByRole("main").getByRole("alert")).toContainText("không khả dụng"); await expect(page.getByRole("listitem")).toHaveCount(0); expect(state.requests).toHaveLength(3);
});

test("rapid repeated submit sends one POST while mutation is in flight", async ({ page }) => {
  const { state } = await prepare(page); await create(page);
  let finish!: () => void; state.delay = new Promise<void>(resolve => { finish = resolve; });
  const button = page.getByRole("article", { name: `Món ${POPCORN_ID}` }).getByRole("button", { name: "Thêm món" });
  await button.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(button).toBeDisabled(); await expect.poll(() => state.requests.length).toBe(1); finish();
  await expect(page.getByRole("listitem")).toHaveCount(1); await expect(button).toBeEnabled(); expect(state.requests).toHaveLength(1);
});

for (const invalidReceipt of [false, true]) test(`${invalidReceipt ? "invalid committed receipt" : "lost committed response"} requires authoritative read and explicit review without replay`, async ({ page }) => {
  const { state, bookings } = await prepare(page); await create(page); state.lostResponse = !invalidReceipt; state.invalidReceipt = invalidReceipt;
  await page.getByRole("article", { name: `Món ${POPCORN_ID}` }).getByRole("button", { name: "Thêm món" }).click();
  await expect(page.getByRole("heading", { name: "Cần kiểm tra kết quả lưu" })).toBeVisible(); await expect(page.getByRole("listitem")).toContainText("Bắp rang thật × 1");
  await expect(page.getByRole("article", { name: `Món ${POPCORN_ID}` }).getByRole("button", { name: "Thêm món" })).toBeDisabled();
  expect(state.requests).toHaveLength(1); expect(bookings.booking!.concessions).toHaveLength(1);
  await page.getByRole("button", { name: "Đã xem dữ liệu máy chủ, tiếp tục chỉnh sửa" }).click(); await expect(page.getByRole("listitem").getByRole("button", { name: "Lưu số lượng" })).toBeEnabled();
  await page.reload(); await expect(page.getByRole("listitem")).toHaveCount(1); expect(state.requests).toHaveLength(1);
});

test("failed reconciliation blocks writes until an owned GET succeeds", async ({ page }) => {
  const { state, bookings } = await prepare(page); await create(page); state.lostResponse = true; state.beforeWrite = () => { bookings.readError = 503; };
  await page.getByRole("article", { name: `Món ${POPCORN_ID}` }).getByRole("button", { name: "Thêm món" }).click();
  const review = page.getByRole("button", { name: "Đã xem dữ liệu máy chủ, tiếp tục chỉnh sửa" }); await expect(review).toBeDisabled(); expect(state.requests).toHaveLength(1);
  bookings.readError = 0; state.beforeWrite = undefined; await page.getByRole("button", { name: "Tải lại đơn và thực đơn" }).click(); await expect(page.getByRole("listitem")).toHaveCount(1); await expect(review).toBeEnabled();
  await review.click(); expect(state.requests).toHaveLength(1);
});

for (const frozen of [false, true]) test(`${frozen ? "Payment freeze" : "expiry"} during mutation rejects without replacement or deadline renewal`, async ({ page }) => {
  const { state, bookings, holds } = await prepare(page); await create(page); const deadline = bookings.booking!.expiresAt;
  let finish!: () => void; state.delay = new Promise<void>(resolve => { finish = resolve; });
  await page.getByRole("article", { name: `Món ${POPCORN_ID}` }).getByRole("button", { name: "Thêm món" }).click(); await expect.poll(() => state.requests.length).toBe(1);
  if (frozen) bookings.booking!.paymentStartedAt = bookings.booking!.serverTime; else await page.clock.fastForward(600001); finish();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Chưa thể lưu bắp nước"); await expect(page.getByRole("button", { name: "Thêm món" })).toHaveCount(0);
  expect(bookings.booking!.concessions).toEqual([]); expect(bookings.booking!.expiresAt).toBe(deadline); expect(bookings.posts).toHaveLength(1); expect(holds.deletes).toEqual([]); expect(state.requests).toHaveLength(1);
});

test("terminal and frozen direct URLs display persisted composition read-only", async ({ page }) => {
  const { bookings, state } = await prepare(page); await create(page); await add(page);
  for (const status of ["CANCELLED", "EXPIRED", "PAID"] as const) { bookings.booking!.status = status; await page.reload(); await expect(page.getByRole("listitem")).toContainText("Bắp rang thật × 2"); await expect(page.getByRole("button", { name: "Thêm món" })).toHaveCount(0); await expect(page.getByRole("button", { name: "Lưu số lượng" })).toHaveCount(0); await expect(page.getByRole("button", { name: "Xóa món" })).toHaveCount(0); }
  bookings.booking!.status = "PENDING"; bookings.booking!.paymentStartedAt = bookings.booking!.serverTime; await page.reload(); await expect(page.getByText(/Nội dung đơn đã khóa/)).toBeVisible(); expect(state.requests).toHaveLength(1);
});

test("two tabs retain both accepted lines and last accepted quantity wins", async ({ page, context }) => {
  const { bookings, state } = await prepare(page); await create(page);
  const second = await context.newPage(); await second.clock.install({ time: new Date("2030-01-01T02:00:00Z") }); await mockCustomerConcessions(second, bookings, state); await second.goto(CONCESSIONS);
  await expect(second.getByRole("article", { name: `Món ${POPCORN_ID}` }).getByRole("button", { name: "Thêm món" })).toBeEnabled();
  await Promise.all([add(page, POPCORN_ID, "2"), add(second, DRINK_ID, "3")]);
  await page.getByRole("button", { name: "Cập nhật dữ liệu" }).click(); await expect(page.getByRole("listitem")).toHaveCount(2);
  const line = bookings.booking!.concessions.find(line => line.itemId === POPCORN_ID)!;
  const row = page.getByRole("listitem", { name: `Dòng bắp nước ${line.id}` }), row2 = second.getByRole("listitem", { name: `Dòng bắp nước ${line.id}` });
  await second.getByRole("button", { name: "Cập nhật dữ liệu" }).click(); await row.getByRole("textbox").fill("4"); await row2.getByRole("textbox").fill("5");
  await row.getByRole("button", { name: "Lưu số lượng" }).click(); await expect(row).toContainText("× 4"); await row2.getByRole("button", { name: "Lưu số lượng" }).click(); await expect(row2).toContainText("× 5");
  await page.getByRole("button", { name: "Cập nhật dữ liệu" }).click(); await expect(row).toContainText("× 5"); expect(bookings.booking!.concessions).toHaveLength(2); expect(bookings.booking!.concessionAmount).toBe("50.6173"); await second.close();
});

test("foreign Booking, forbidden role and login resume respect ownership and safe return intent", async ({ page }) => {
  const { bookings, state } = await prepare(page); await create(page);
  await page.goto("/bookings/9007199254770002/concessions"); await expect(page.getByRole("heading", { name: "Đơn đặt vé không khả dụng" })).toBeVisible(); expect(state.requests).toEqual([]);
  bookings.readError = 403; await page.goto(CONCESSIONS); await expect(page.getByText(/Cần tài khoản khách hàng đang hoạt động/)).toBeVisible(); expect(state.requests).toEqual([]);
  bookings.readError = 401; await page.reload(); await page.getByRole("link", { name: "Đăng nhập lại", exact: true }).click(); await expect(page).toHaveURL(`/login?returnTo=${encodeURIComponent(CONCESSIONS)}`);
  await page.route("**/api/v1/auth/tokens", route => { bookings.readError = 0; return route.fulfill({ json: { accessToken: "qa-access", tokenType: "Bearer", expiresIn: 3600, refreshToken: "qa-refresh", refreshExpiresIn: 86400, userId: 1, email: "customer@example.test", fullName: "Customer", role: "CUSTOMER" } }); });
  await page.getByLabel("Địa chỉ email", { exact: true }).fill("customer@example.test"); await page.getByLabel("Mật khẩu", { exact: true }).fill("CustomerOnly123!"); await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(CONCESSIONS); await expect(page.getByRole("article", { name: `Món ${POPCORN_ID}` })).toBeVisible(); expect(state.requests).toEqual([]); expect(bookings.posts).toHaveLength(1);
});
