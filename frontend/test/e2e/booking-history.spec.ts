import { test, expect } from "@playwright/test";
import { mockCustomerEntitlements } from "./helpers/customer-entitlements";
import { ENTITLEMENT_ID, historyFixture, ticketsFixture } from "../fixtures/customer-entitlements";

// Six original preview scenarios migrated to explicit backend HTTP fixtures.
const DETAIL = `/my-bookings/${ENTITLEMENT_ID}`;
const QR = "Mã QR đặt vé cho SC-FIXTURE-1101";
test("history navigates to whole-unit Tickets and one reusable Booking QR through owned GETs", async ({ page }) => {
  const state = await mockCustomerEntitlements(page); await page.goto("/my-bookings"); await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByRole("link", { name: "Xem đơn đặt vé SC-FIXTURE-1101", exact: true }).click(); await expect(page).toHaveURL(DETAIL);
  const tickets = page.getByRole("region", { name: "Vé riêng lẻ" }); await expect(tickets).toContainText("3 vé · 3 ghế · 4 khách"); await expect(tickets.getByRole("listitem")).toHaveCount(3);
  await expect(page.getByRole("listitem", { name: "Vé cho ghế H9-10" })).toContainText("Ghế đôi · 2 khách · một vé"); await expect(tickets.getByRole("img")).toHaveCount(0);
  for (let i = 0; i < 2; i++) { await expect(page.getByRole("img", { name: QR })).toHaveCount(1); await page.getByRole("button", { name: "Kiểm tra lại trạng thái", exact: true }).click(); await expect(tickets).toContainText("Đã check-in"); }
  await expect(page.getByRole("region", { name: "Suất chiếu và số tiền đặt vé" })).toContainText("290,004.2963"); await expect(page.getByRole("button", { name: /^(Soát vé|Quét|Chuyển vé|Tải vé|Ví)/ })).toHaveCount(0);
  await page.getByRole("link", { name: "Về vé của tôi", exact: true }).click(); await expect(page).toHaveURL("/my-bookings"); expect(state.requests.every(r => r.method === "GET" && r.token === "Bearer qa-access")).toBe(true);
});
test("enlarged QR replaces inline QR, keeps background inert and closes back to trigger", async ({ page }) => {
  await mockCustomerEntitlements(page); await page.goto(DETAIL); const trigger = page.getByRole("button", { name: "Phóng to mã QR đặt vé", exact: true }); await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible(); await expect(page.getByRole("img", { name: QR })).toHaveCount(1);
  await page.getByRole("link", { name: "Về vé của tôi", exact: true }).evaluate(e => e.focus()); await expect(page.getByRole("button", { name: "Đóng hộp thoại" })).toBeFocused();
  await page.keyboard.press("Tab"); await expect(page.getByRole("button", { name: "Về đơn đặt vé", exact: true })).toBeFocused(); await page.keyboard.press("Tab"); await expect(page.getByRole("button", { name: "Đóng hộp thoại" })).toBeFocused();
  await page.keyboard.press("Shift+Tab"); await expect(page.getByRole("button", { name: "Về đơn đặt vé", exact: true })).toBeFocused(); await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0); await expect(trigger).toBeFocused(); await expect(page.getByRole("img", { name: QR })).toHaveCount(1);
});
test("unpaid Bookings have neither Tickets nor QR; paid historical Tickets have independent invalid states", async ({ page }) => {
  const state = await mockCustomerEntitlements(page);
  for (const status of ["PENDING", "EXPIRED", "CANCELLED"] as const) { state.booking.status = status; state.entitlements = ticketsFixture(state.booking); await page.goto(DETAIL); await expect(page.getByRole("region", { name: "Vé riêng lẻ" })).toContainText("chưa phát hành vé"); await expect(page.getByRole("heading", { name: "Chưa có mã QR đặt vé" })).toBeVisible(); await expect(page.getByRole("img", { name: QR })).toHaveCount(0); }
  state.booking.status = "PAID"; state.entitlements = ticketsFixture(state.booking); state.entitlements.tickets[0].status = "EXPIRED"; state.entitlements.tickets[1].status = "CANCELLED"; await page.goto(DETAIL);
  const tickets = page.getByRole("region", { name: "Vé riêng lẻ" }); await expect(tickets).toContainText("Hết hạn"); await expect(tickets).toContainText("Đã hủy"); await expect(page.getByRole("img", { name: QR })).toHaveCount(1);
});
test("history and combined detail support loading, empty, failure and retry", async ({ page }) => {
  const state = await mockCustomerEntitlements(page); let release!: () => void; state.delay = new Promise<void>(resolve => { release = resolve; }); await page.goto("/my-bookings"); await expect(page.getByRole("status")).toContainText("Đang tải thông tin"); release(); state.delay = undefined; await expect(page.getByRole("article")).toHaveCount(1);
  state.history = { ...state.history, items: [], totalElements: 0, totalPages: 0 }; await page.reload(); await expect(page.getByRole("heading", { name: "Chưa có đơn đặt vé", exact: true })).toBeVisible();
  state.historyError = 503; await page.reload(); await expect(page.getByRole("main").getByRole("alert")).toBeVisible(); state.historyError = 0; state.history = historyFixture(state.booking); await page.getByRole("main").getByRole("alert").getByRole("button").click(); await expect(page.getByRole("article")).toHaveCount(1);
  for (const field of ["detailError", "ticketError"] as const) { state[field] = 503; await page.goto(DETAIL); await expect(page.getByRole("main").getByRole("alert")).toBeVisible(); state[field] = 0; await page.getByRole("main").getByRole("alert").getByRole("button").click(); await expect(page.getByRole("region", { name: "Vé riêng lẻ" })).toContainText("3 vé"); }
  await page.goto("/my-bookings/1"); await expect(page.getByRole("heading", { name: "Đơn đặt vé không khả dụng" })).toBeVisible(); await expect(page.getByRole("img", { name: QR })).toHaveCount(0);
});
test("desktop canonical list and detail remain readable", async ({ page }, info) => {
  await mockCustomerEntitlements(page); await page.goto("/my-bookings"); await expect(page.getByRole("article")).toHaveCount(1); await page.screenshot({ path: info.outputPath("booking-history-desktop.png"), fullPage: true });
  await page.goto(DETAIL); await expect(page.getByRole("img", { name: QR })).toBeVisible(); await expect(page.locator('img[src*="movies/"]')).toHaveCount(0); await page.screenshot({ path: info.outputPath("booking-detail-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "Phóng to mã QR đặt vé" }).click(); await page.screenshot({ path: info.outputPath("booking-qr-desktop.png"), fullPage: true });
});
test("mobile list, detail and QR stay within viewport; shared navigation reaches history", async ({ page }, info) => {
  await mockCustomerEntitlements(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/my-bookings"); await expect(page.getByRole("article")).toHaveCount(1); await page.screenshot({ path: info.outputPath("booking-history-mobile.png"), fullPage: true });
  await page.getByRole("link", { name: "Xem đơn đặt vé SC-FIXTURE-1101", exact: true }).click(); await expect(page.getByRole("img", { name: QR })).toBeVisible(); await page.screenshot({ path: info.outputPath("booking-detail-mobile.png"), fullPage: true }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Phóng to mã QR đặt vé" }).click(); await page.screenshot({ path: info.outputPath("booking-qr-mobile.png"), fullPage: true }); await page.getByRole("button", { name: "Về đơn đặt vé", exact: true }).click(); await page.getByRole("button", { name: "Mở menu điều hướng" }).click(); await page.getByRole("navigation", { name: "Điều hướng trên điện thoại" }).getByRole("link", { name: "Vé của tôi", exact: true }).click(); await expect(page).toHaveURL("/my-bookings");
  await page.setViewportSize({ width: 320, height: 740 }); await page.goto(DETAIL); await expect(page.getByRole("img", { name: QR })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
