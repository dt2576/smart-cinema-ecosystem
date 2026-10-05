import { mockDiscoveryReads, isCustomerReadPath, isCustomerHoldPath } from "./helpers/customer-discovery";
import { mockCustomerHolds, confirmSelectedHolds } from "./helpers/customer-holds";
import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

const MOVIE_ID = "9223372036854775807", CINEMA_ID = "9007199254740993", SHOWTIME_ID = "9007199254741001";
const ROUTE = `/showtimes/${SHOWTIME_ID}/seats?movieId=${MOVIE_ID}&cinemaId=${CINEMA_ID}&date=2030-01-01`;
const couple = "E1-2, Ghế đôi, 2 khách, Còn trống";
const seat = "A1, Ghế thường, 1 khách, Còn trống";
async function prepare(page: Page, authenticated = true) {
  await page.clock.install({ time: new Date("2030-01-01T02:00:00Z") });
  const discovery = await mockDiscoveryReads(page);
  const state = await mockCustomerHolds(page, discovery, authenticated);
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ json: { id: MOVIE_ID, title: "Seat Journey", duration: 125, releaseDate: "2029-01-01", ageRating: "T13", language: "English", posterUrl: "https://media.example.test/seat.jpg", status: "PUBLISHED", genres: [], description: null, trailerUrl: null } }));
  await page.route("https://media.example.test/**", route => route.fulfill({ path: resolve("public/images/movies/dune-part-two.jpg") }));
  return state;
}

test("draft selection is separate from atomic owned Holds and whole COUPLE release", async ({ page }) => {
  const state = await prepare(page); const calls: string[] = [];
  page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/api/")) calls.push(path); });
  await page.goto(ROUTE);
  await expect(page.getByRole("button", { name: "A3, Ghế thường, 1 khách, Đã bán", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "C2, Ghế thường, 1 khách, Không khả dụng", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: couple, exact: true }).click();
  await page.getByRole("button", { name: seat, exact: true }).click();
  const summary = page.getByRole("complementary", { name: "Tóm tắt lựa chọn ghế" });
  await expect(summary).toContainText("2 ghế · 3 khách");
  await expect(summary).toContainText("0 lượt giữ ghế của bạn đã được máy chủ xác nhận");
  await expect(page.getByRole("button", { name: "Tạo đơn đặt vé & xem thông tin" })).toBeDisabled();
  await confirmSelectedHolds(page);
  expect(state.posts).toEqual([["9007199254742041", "9007199254742001"]]);
  await expect(summary).toContainText("2 lượt giữ ghế của bạn đã được máy chủ xác nhận");
  await expect(page.getByRole("button", { name: /^E[12],/ })).toHaveCount(0);
  await page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Bạn đang giữ ghế này", exact: true }).click();
  await expect(summary).toContainText("1 ghế · 1 khách");
  expect(state.deletes).toHaveLength(1); expect(state.holds[0].seatId).toBe("9007199254742001");
  expect(calls.every(path => isCustomerReadPath(path) || isCustomerHoldPath(path))).toBe(true);
});

test("anonymous draft resumes through normal Customer login without anonymous Hold", async ({ page }) => {
  const state = await prepare(page, false);
  await page.route("**/api/v1/auth/tokens", route => route.fulfill({ json: { accessToken: "qa-access", tokenType: "Bearer", expiresIn: 3600, refreshToken: "qa-refresh", refreshExpiresIn: 86400, userId: 1, email: "customer@example.test", fullName: "Customer", role: "CUSTOMER" } }));
  await page.goto(ROUTE);
  await page.getByRole("button", { name: couple, exact: true }).click();
  await page.getByRole("button", { name: "Đăng nhập để giữ ghế", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  expect(state.posts).toHaveLength(0);
  await page.getByLabel("Địa chỉ email", { exact: true }).fill("customer@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("test-customer-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(ROUTE);
  await expect(page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Đã chọn", exact: true })).toBeVisible();
  await confirmSelectedHolds(page);
});

test("reload/back/forward restore owned identities and original expiry; Continue is preview only", async ({ page }) => {
  const state = await prepare(page); await page.goto(ROUTE);
  await page.getByRole("button", { name: couple, exact: true }).click(); await confirmSelectedHolds(page);
  const original = structuredClone(state.holds);
  await page.clock.fastForward(60000); await page.reload();
  await expect(page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Bạn đang giữ ghế này", exact: true })).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText(/08:5[7-9]|09:00/);
  expect(state.holds).toEqual(original); expect(state.posts).toHaveLength(1);
  await page.getByRole("button", { name: "Xem trước bắp nước" }).click();
  await expect(page.getByRole("heading", { name: "Bắp nước", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByText(/Chưa tạo đơn đặt vé hay thanh toán/)).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Bạn đang giữ ghế này", exact: true })).toBeVisible();
  await page.goForward(); await expect(page.getByRole("heading", { name: "Chọn ghế trước", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Bạn đang giữ ghế này", exact: true })).toBeVisible();
  expect(state.holds).toEqual(original);
});

test("adding units never renews existing deadline; expiry reconciles without automatic reacquisition", async ({ page }) => {
  const state = await prepare(page); await page.goto(ROUTE);
  await page.getByRole("button", { name: couple, exact: true }).click(); await confirmSelectedHolds(page);
  const deadline = state.holds[0].expiresAt;
  await page.clock.fastForward(300000);
  await page.getByRole("button", { name: seat, exact: true }).click(); await confirmSelectedHolds(page);
  expect(state.holds.every(hold => hold.expiresAt === deadline)).toBe(true);
  await page.clock.fastForward(301000);
  await expect(page.getByRole("complementary", { name: "Tóm tắt lựa chọn ghế" })).toContainText("0 lượt giữ ghế của bạn đã được máy chủ xác nhận");
  await expect(page.getByRole("button", { name: "Tạo đơn đặt vé & xem thông tin" })).toBeDisabled();
  await expect(page.getByRole("button", { name: couple, exact: true })).toBeEnabled();
  expect(state.posts).toHaveLength(2); expect(state.holds).toHaveLength(0);
});

test("conflicting multi-unit acquisition grants nothing and refreshes the other-owner overlay", async ({ page }) => {
  const state = await prepare(page); await page.goto(ROUTE);
  await page.getByRole("button", { name: couple, exact: true }).click(); await page.getByRole("button", { name: seat, exact: true }).click();
  state.otherSeats.push("9007199254742041");
  await page.getByRole("button", { name: "Giữ ghế đã chọn", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Tóm tắt lựa chọn ghế" }).getByRole("alert")).toContainText("Lựa chọn ghế bị xung đột");
  await expect(page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Đang được giữ", exact: true })).toBeDisabled();
  expect(state.posts).toHaveLength(1); expect(state.holds).toHaveLength(0);
  await expect(page.getByRole("button", { name: "Tạo đơn đặt vé & xem thông tin" })).toBeDisabled();
});

test("rapid actions are gated and failed release preserves the owned Hold until confirmed", async ({ page }) => {
  const state = await prepare(page); await page.goto(ROUTE); await page.getByRole("button", { name: couple, exact: true }).click();
  let resolveRequest!: () => void; state.delay = new Promise<void>(resolve => { resolveRequest = resolve; });
  const hold = page.getByRole("button", { name: "Giữ ghế đã chọn", exact: true });
  await hold.click(); await expect(hold).toBeDisabled();
  await expect(page.getByRole("button", { name: "Tạo đơn đặt vé & xem thông tin" })).toBeDisabled();
  expect(state.posts).toHaveLength(1); resolveRequest();
  await expect(page.getByRole("button", { name: "Tạo đơn đặt vé & xem thông tin" })).toBeEnabled();
  state.failRelease = true;
  await page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Bạn đang giữ ghế này", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Tóm tắt lựa chọn ghế" }).getByRole("alert")).toContainText("Không thể kết nối hoặc xác nhận dịch vụ ghế.");
  await expect(page.getByRole("button", { name: "E1-2, Ghế đôi, 2 khách, Bạn đang giữ ghế này", exact: true })).toBeVisible();
  expect(state.holds).toHaveLength(1);
  await page.getByRole("button", { name: "Xóa lựa chọn / trả ghế đang giữ" }).click();
  await expect(page.getByRole("button", { name: couple, exact: true })).toBeEnabled(); expect(state.holds).toHaveLength(0);
});

test("lost acquisition response is reconciled by GET without blindly repeating POST", async ({ page }) => {
  const state = await prepare(page); await page.goto(ROUTE); await page.getByRole("button", { name: seat, exact: true }).click();
  state.lostResponse = true; await page.getByRole("button", { name: "Giữ ghế đã chọn", exact: true }).click();
  await expect(page.getByRole("button", { name: "A1, Ghế thường, 1 khách, Bạn đang giữ ghế này", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tạo đơn đặt vé & xem thông tin" })).toBeEnabled(); expect(state.posts).toHaveLength(1);
});

test("safe 400/401/403/404/409 errors never expose internals or create a preview Hold", async ({ page }) => {
  const state = await prepare(page); await page.goto(ROUTE);
  for (const status of [400, 403, 404, 409, 503, 401]) {
    await page.getByRole("button", { name: seat, exact: true }).click();
    state.failNext = status; await page.getByRole("button", { name: "Giữ ghế đã chọn", exact: true }).click();
    await expect(page.getByRole("complementary", { name: "Tóm tắt lựa chọn ghế" }).getByRole("alert")).toBeVisible(); await expect(page.getByText("private SQL must not reach the UI")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tạo đơn đặt vé & xem thông tin" })).toBeDisabled(); expect(state.holds).toHaveLength(0);
    if (status !== 401) await page.getByRole("button", { name: "Xóa lựa chọn / trả ghế đang giữ" }).click();
  }
  await expect(page.getByRole("button", { name: "Đăng nhập lại" })).toBeVisible();
});

test("empty/map error/retry and unavailable states remain truthful", async ({ page }) => {
  await prepare(page); await page.goto(`${ROUTE}&seatPreview=empty`);
  await expect(page.getByRole("heading", { name: "Chưa có ghế để hiển thị" })).toBeVisible();
  await page.goto(`${ROUTE}&seatPreview=error`); await expect(page.getByRole("heading", { name: "Không thể tải sơ đồ ghế" })).toBeVisible();
  await page.getByRole("button", { name: "Thử lại" }).click(); await expect(page.getByRole("button", { name: couple, exact: true })).toBeEnabled();
  await page.goto(`${ROUTE}&seatPreview=unavailable`); await expect(page.getByText("Không có ghế khả dụng để chọn.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Giữ ghế đã chọn", exact: true })).toBeDisabled();
});

test("unconfirmed owned read blocks continuation and retry restores the same deadline without POST", async ({ page }) => {
  const state = await prepare(page); await page.goto(ROUTE); await page.getByRole("button", { name: seat, exact: true }).click(); await confirmSelectedHolds(page);
  const original = structuredClone(state.holds);
  await page.route(`**/api/v1/showtimes/${SHOWTIME_ID}/seat-holds`, async route => { await route.abort("failed"); await page.unroute(`**/api/v1/showtimes/${SHOWTIME_ID}/seat-holds`); });
  await page.getByRole("button", { name: "Cập nhật tình trạng ghế" }).click();
  await expect(page.getByRole("button", { name: "Tạo đơn đặt vé & xem thông tin" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "A1, Ghế thường, 1 khách, Lượt giữ ghế xác nhận lần cuối", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Cập nhật tình trạng ghế" }).click();
  await expect(page.getByRole("button", { name: "Tạo đơn đặt vé & xem thông tin" })).toBeEnabled();
  expect(state.holds).toEqual(original); expect(state.posts).toHaveLength(1);
});

test("missing/foreign screening contexts and hidden Movies never permit Holds", async ({ page }) => {
  const state = await prepare(page); await page.goto(`/showtimes/${SHOWTIME_ID}/seats`);
  await expect(page.getByRole("heading", { name: "Liên kết chọn ghế không hợp lệ" })).toBeVisible();
  await page.goto(ROUTE.replace(`cinemaId=${CINEMA_ID}`, "cinemaId=102"));
  await expect(page.getByRole("heading", { name: "Suất chiếu không khả dụng" })).toBeVisible();
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ status: 404, json: { detail: "Phim không khả dụng" } }));
  await page.goto(ROUTE); await expect(page.getByRole("heading", { name: "Phim không khả dụng" })).toBeVisible();
  expect(state.posts).toHaveLength(0);
});

test("Showtime becoming ineligible rejects a write then blocks continuation after reconciliation", async ({ page }) => {
  const state = await prepare(page); await page.goto(ROUTE); await page.getByRole("button", { name: seat, exact: true }).click();
  state.closed = true;
  await page.route(`**/api/v1/showtimes/${SHOWTIME_ID}/seats`, route => route.fulfill({ status: 404, json: { detail: "unavailable" } }));
  await page.getByRole("button", { name: "Giữ ghế đã chọn", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Tóm tắt lựa chọn ghế" }).getByRole("alert")).toContainText("Lựa chọn ghế bị xung đột");
  await expect(page.getByRole("button", { name: "Tạo đơn đặt vé & xem thông tin" })).toBeDisabled(); expect(state.holds).toHaveLength(0);
});

test("server cutoff projection blocks new Holds even with an unexpired grant", async ({ page }) => {
  const state = await prepare(page); await page.clock.fastForward(3540000); await page.goto(ROUTE);
  await page.getByRole("button", { name: seat, exact: true }).click(); await confirmSelectedHolds(page);
  expect(state.holds[0].expiresAt).toBe("2030-01-01T03:00:00.000Z");
  await page.clock.fastForward(61000);
  await expect(page.getByRole("complementary", { name: "Tóm tắt lựa chọn ghế" }).getByRole("alert")).toContainText("Đã qua hạn đặt vé");
  await expect(page.getByRole("button", { name: "Tạo đơn đặt vé & xem thông tin" })).toBeDisabled(); expect(state.posts).toHaveLength(1);
});

test("STANDARD/VIP/COUPLE remain whole and keyboard/mobile have no page overflow", async ({ page }, info) => {
  const state = await prepare(page);
  await page.route(`**/api/v1/showtimes/${SHOWTIME_ID}/seats`, route => route.fulfill({ json: { showtimeId: SHOWTIME_ID, movieId: MOVIE_ID, cinemaId: CINEMA_ID, hallId: "90071992547409931", serverTime: "2030-01-01T02:00:00Z", units: [
    { id: "9007199254743001", row: "A", number: "1", type: "VIP", guestCount: 1, availability: "HELD" },
    { id: "9007199254743002", row: "A", number: "2", type: "VIP", guestCount: 1, availability: state.holds.some(h => h.seatId === "9007199254743002") ? "HELD" : "AVAILABLE" },
    { id: "9007199254743003", row: "B", number: "1-2", type: "COUPLE", guestCount: 2, availability: state.holds.some(h => h.seatId === "9007199254743003") ? "HELD" : "AVAILABLE" },
  ] } }));
  await page.goto(ROUTE); await expect(page.getByRole("button", { name: "A1, VIP, 1 khách, Đang được giữ", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "A2, VIP, 1 khách, Còn trống", exact: true }).focus(); await page.keyboard.press("Space");
  await page.getByRole("button", { name: "B1-2, Ghế đôi, 2 khách, Còn trống", exact: true }).click(); await confirmSelectedHolds(page);
  await expect(page.getByRole("complementary", { name: "Tóm tắt lựa chọn ghế" })).toContainText("2 ghế · 3 khách");
  await page.screenshot({ path: info.outputPath("authoritative-holds-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("region", { name: "Sơ đồ ghế có thể cuộn" }).focus(); await page.keyboard.press("End");
  await page.screenshot({ path: info.outputPath("authoritative-holds-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "B1-2, Ghế đôi, 2 khách, Bạn đang giữ ghế này", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Tóm tắt lựa chọn ghế" })).toContainText("1 ghế · 1 khách");
});
