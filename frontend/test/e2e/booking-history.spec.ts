import { displayLabel } from "@/lib/display-labels";
import { test, expect } from "@playwright/test";

const DETAIL = "/my-bookings/9007199254741101";
const QR = "Mã QR đặt vé mẫu cho DEMO-SC-1101, không có giá trị vào rạp";

test("history navigates to whole-unit Tickets and one reusable Booking QR without domain requests", async ({ page }) => {
  const unexpected: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) unexpected.push(request.url()); });
  await page.goto("/my-bookings");
  await expect(page.getByRole("status")).toContainText("Đang tải đơn đặt vé và vé mẫu");
  await expect(page.getByRole("article")).toHaveCount(5);
  await expect(page.getByRole("article").first()).toContainText("DEMO-SC-1101");
  await page.getByRole("link", { name: "Xem đơn đặt vé DEMO-SC-1101", exact: true }).click();
  await expect(page).toHaveURL(DETAIL);
  const tickets = page.getByRole("region", { name: "Vé riêng lẻ" });
  await expect(tickets).toContainText("3 vé · 3 ghế · 4 khách");
  await expect(tickets).toContainText("2 đã soát vé · 1 còn hiệu lực");
  await expect(tickets.getByRole("listitem")).toHaveCount(3);
  await expect(page.getByRole("listitem", { name: "Vé cho ghế H9-10", exact: true })).toContainText("Ghế đôi · 2 khách · một ghế không thể tách");
  await expect(page.getByRole("listitem", { name: "Vé cho ghế H9-10", exact: true })).toContainText("Còn hiệu lực");
  await expect(tickets.getByRole("img")).toHaveCount(0);
  await expect(page.getByRole("img", { name: QR, exact: true })).toHaveCount(1);
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Tải lại ví dụ từ mã QR đặt vé", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Trạng thái vé không thay đổi");
    await expect(tickets).toContainText("2 đã soát vé · 1 còn hiệu lực");
    await expect(page.getByRole("img", { name: QR, exact: true })).toHaveCount(1);
  }
  await expect(page.getByRole("region", { name: "Suất chiếu và số tiền đặt vé" })).toContainText("600.000");
  await expect(page.getByRole("button", { name: /^(?:Soát vé|Quét|Chuyển vé|Tải vé)(?: |$)|^Ví(?: điện tử)?$/i })).toHaveCount(0);
  await page.getByRole("link", { name: "Về vé của tôi", exact: true }).click();
  await expect(page).toHaveURL("/my-bookings");
  expect(unexpected).toEqual([]);
});

test("enlarged QR replaces inline QR, keeps background inert and closes back to trigger", async ({ page }) => {
  await page.goto(DETAIL);
  const trigger = page.getByRole("button", { name: "Phóng to mã QR đặt vé", exact: true });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator('img[alt^="Mã QR đặt vé mẫu cho"]')).toHaveCount(1);
  await expect(page.getByRole("dialog").getByRole("img", { name: QR })).toBeVisible();
  // Native modal dialogs may let Tab visit browser chrome; the page behind remains inert.
  await expect(page.getByRole("dialog")).toHaveJSProperty("open", true);
  await page.getByRole("link", { name: "Về vé của tôi", exact: true }).evaluate(element => element.focus());
  await expect(page.getByRole("link", { name: "Về vé của tôi", exact: true })).not.toBeFocused();
  await expect(page.getByRole("button", { name: "Đóng hộp thoại" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Về đơn đặt vé", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("img", { name: QR })).toHaveCount(1);
});

test("unpaid Bookings have neither Tickets nor QR; paid historical Tickets have independent invalid states", async ({ page }) => {
  for (const [id, status] of [["9007199254741103", "PENDING"], ["9007199254741104", "EXPIRED"], ["9007199254741105", "CANCELLED"]]) {
    await page.goto(`/my-bookings/${id}`);
    await expect(page.getByRole("region", { name: "Suất chiếu và số tiền đặt vé" })).toContainText(displayLabel(status));
    await expect(page.getByRole("region", { name: "Vé riêng lẻ" })).toContainText("chưa phát hành vé");
    await expect(page.getByRole("heading", { name: "Chưa có mã QR đặt vé" })).toBeVisible();
    await expect(page.locator('img[alt^="Mã QR đặt vé mẫu cho"]')).toHaveCount(0);
  }
  await page.goto("/my-bookings/9007199254741102");
  const tickets = page.getByRole("region", { name: "Vé riêng lẻ" });
  await expect(tickets).toContainText("Đã hết hạn");
  await expect(tickets).toContainText("Đã hủy");
  await expect(tickets).toContainText("0 đã soát vé · 0 còn hiệu lực");
  await expect(page.locator('img[alt^="Mã QR đặt vé mẫu cho"]')).toHaveCount(1);
});

test("history and combined detail support loading, empty, failure and retry", async ({ page }) => {
  await page.goto("/my-bookings?bookingPreview=empty");
  await expect(page.getByRole("heading", { name: "Chưa có đơn đặt vé mẫu" })).toBeVisible();
  await page.goto("/my-bookings?bookingPreview=error");
  await expect(page.getByRole("heading", { name: "Không thể tải đơn đặt vé" })).toBeVisible();
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(page.getByRole("article")).toHaveCount(5);
  for (const query of ["bookingPreview=error", "ticketPreview=error"]) {
    await page.goto(`${DETAIL}?${query}`);
    await expect(page.getByRole("heading", { name: "Không thể tải chi tiết đặt vé" })).toBeVisible();
    await page.getByRole("button", { name: "Thử lại" }).click();
    await expect(page.getByRole("region", { name: "Vé riêng lẻ" })).toContainText("3 vé");
  }
  await page.goto(`${DETAIL}?ticketPreview=empty`);
  await expect(page.getByRole("region", { name: "Vé riêng lẻ" })).toContainText("Không có vé mẫu");
  await page.goto("/my-bookings/9007199254741100");
  await expect(page.getByRole("heading", { name: "Không tìm thấy đơn đặt vé mẫu" })).toBeVisible();
  await expect(page.locator('img[alt^="Mã QR đặt vé mẫu cho"]')).toHaveCount(0);
});

test("desktop canonical list and detail remain readable", async ({ page }) => {
  await page.goto("/my-bookings");
  await expect(page.getByRole("article")).toHaveCount(5);
  await page.screenshot({ path: "test-results/booking-history-desktop.png", fullPage: true });
  await page.goto(DETAIL);
  await expect(page.getByRole("img", { name: QR })).toBeVisible();
  await expect(page.getByRole("img", { name: "Dune: Part Two áp phích mẫu", exact: true })).toHaveJSProperty("complete", true);
  expect(await page.getByRole("img", { name: "Dune: Part Two áp phích mẫu", exact: true }).evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/booking-detail-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Phóng to mã QR đặt vé" }).click();
  await page.screenshot({ path: "test-results/booking-qr-desktop.png", fullPage: true });
});

test("mobile list, detail and QR stay within viewport; shared navigation reaches history", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/my-bookings");
  await expect(page.getByRole("article")).toHaveCount(5);
  await page.screenshot({ path: "test-results/booking-history-mobile.png", fullPage: true });
  await page.getByRole("link", { name: "Xem đơn đặt vé DEMO-SC-1101", exact: true }).click();
  await expect(page.getByRole("img", { name: QR })).toBeVisible();
  await page.screenshot({ path: "test-results/booking-detail-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Phóng to mã QR đặt vé" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: "test-results/booking-qr-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Về đơn đặt vé", exact: true }).click();
  await page.getByRole("button", { name: "Mở menu điều hướng" }).click();
  await page.getByRole("navigation", { name: "Điều hướng trên điện thoại" }).getByRole("link", { name: "Vé của tôi", exact: true }).click();
  await expect(page).toHaveURL("/my-bookings");
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto(DETAIL);
  await expect(page.getByRole("img", { name: QR })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
