import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { preparePaymentStatus, RETURN_PATH, SUMMARY_PATH } from "./helpers/customer-payment-status";
import { BOOKING_ID } from "./helpers/customer-bookings";
import { PAYMENT_ID } from "./helpers/customer-payments";

// Explicit HTTP fixtures for presentation QA. These do not prove live VNPAY,
// signed callbacks, actual financial SUCCESS/PAID or Ticket issuance.
async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  const header = await page.locator("header").boundingBox();
  const heading = await page.getByRole("heading", { level: 1 }).first().boundingBox();
  if (header && heading) expect(heading.y).toBeGreaterThanOrEqual(header.y + header.height);
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
}

async function noUnsupportedResult(page: Page) {
  await expect(page.locator("canvas, img[alt*='QR']")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Xem vé|Mã QR|In hóa đơn/ })).toHaveCount(0);
  for (const text of ["IPN", "QueryDR", "SHA-256", "PCI", "VAT", "vnp_SecureHash", "PRIVATE_FIXTURE_DETAIL"]) await expect(page.getByRole("main")).not.toContainText(text);
}

for (const width of [390, 768, 1440]) {
  test(`HTTP fixture: Summary exact snapshots, long labels, focus and permanent freeze at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    const fixture = await preparePaymentStatus(page, true, false);
    Object.assign(fixture.booking, {
      paymentStartedAt: null,
      movieTitle: "Hành trình qua những miền ký ức — Phiên bản điện ảnh đặc biệt dành cho khán giả yêu những câu chuyện Việt Nam",
      cinemaName: "Smart Cinema — Trung tâm văn hóa và giải trí Thành phố Hồ Chí Minh",
      hallName: "Phòng chiếu dành cho những trải nghiệm điện ảnh đặc biệt",
      seatAmount: "900719925474.4321", concessionAmount: "24690.2468", subtotal: "900719950164.6789", discount: "1234.5678", finalAmount: "900719948930.1111",
      concessions: [{ id: "9007199254780001", itemId: "9007199254790001", name: "Combo bắp caramel và nước uống dành cho buổi chiếu đặc biệt", category: "COMBO", quantity: 2, unitPrice: "12345.1234", totalPrice: "24690.2468" }],
      promotion: { id: "9007199254791001", code: "STITCHPHASE2", type: "FIXED_AMOUNT", value: "1234.5678", minimumOrderAmount: "0.0000", maxDiscountAmount: null },
    });
    fixture.booking.seats[0].unitPrice = fixture.booking.seats[0].finalPrice = fixture.booking.seatAmount;
    fixture.payments.receipt!.amount = fixture.booking.finalAmount;
    fixture.payments.status = "INITIATED";
    await page.goto(SUMMARY_PATH);
    const totals = page.getByRole("complementary", { name: "Tổng tiền đặt vé từ máy chủ" });
    await expect(totals.locator("dl > div").filter({ hasText: "Tổng thanh toán" }).locator("dd")).toHaveText("900,719,948,930.1111");
    await expect(page.getByRole("region", { name: "Ghế đã đặt" })).toContainText("1 ghế · 2 khách");
    await expect(page.getByRole("region", { name: "Ghế đã đặt" }).locator("li")).toHaveCount(1);
    await expect(page.getByRole("region", { name: "Bắp nước đã lưu" })).toContainText("24,690.2468");
    await expect(page.getByRole("region", { name: "Khuyến mãi đã lưu" })).toContainText("1,234.5678");
    await expect(page.getByRole("button", { name: "Tiến hành thanh toán", exact: true })).toBeEnabled();
    const code = page.getByLabel("Mã khuyến mãi", { exact: true });
    await code.focus();
    expect(await code.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Áp dụng khuyến mãi" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#owned-promotion-error")).toHaveText("Vui lòng nhập mã khuyến mãi.");
    await expect(code).toHaveAttribute("aria-describedby", "owned-promotion-help owned-promotion-error");
    await expect(page.locator(`time[datetime="${fixture.booking.expiresAt}"]`)).toBeVisible();
    await capture(page, info, `summary-${width}-editable`);

    fixture.booking.paymentStartedAt = "2030-01-01T02:00:01Z";
    await page.evaluate(({ bookingId, paymentId }) => sessionStorage.setItem(`smart-cinema.payment-initiation:${bookingId}`, JSON.stringify({ bookingId, paymentId, reviewRequired: false })), { bookingId: BOOKING_ID, paymentId: PAYMENT_ID });
    await page.reload();
    await expect(page.getByText("Thành phần đơn đã khóa", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mở VNPAY Sandbox", exact: true })).toBeEnabled();
    await expect(code).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Chỉnh sửa bắp nước", exact: true })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Khởi tạo thanh toán" })).toContainText(PAYMENT_ID);
    await expect(page.locator(`time[datetime="${fixture.booking.expiresAt}"]`)).toBeVisible();
    await capture(page, info, `summary-${width}-frozen`);
    await noUnsupportedResult(page);
    expect(fixture.state.writes).toEqual([]);
  });

  test(`HTTP fixtures: truthful and distinct return states at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    const fixture = await preparePaymentStatus(page);
    // Existing backend fields may include a projection; Phase 2 still discards it.
    await page.route(`/api/v1/bookings/${BOOKING_ID}/payment-transactions/${PAYMENT_ID}`, route => {
      if (fixture.booking.status !== "PAID") return route.fallback();
      return route.fulfill({ json: { paymentId: PAYMENT_ID, bookingId: BOOKING_ID, status: fixture.payments.status, amount: fixture.booking.finalAmount, bookingStatus: "PAID", reconciliationRequired: false, bookingQr: "FIXTURE-NOT-A-CREDENTIAL", tickets: [{ id: "9007199254800001", status: "VALID" }] } });
    });
    const cases = [
      { key: "initiated", payment: "INITIATED", booking: "PENDING", reconciliation: false, title: "Thanh toán đang chờ hoàn tất", tone: "pending" },
      { key: "pending", payment: "PENDING", booking: "PENDING", reconciliation: false, title: "Thanh toán đang chờ xử lý", tone: "pending" },
      { key: "success", payment: "SUCCESS", booking: "PAID", reconciliation: false, title: "Thanh toán thành công", tone: "success" },
      { key: "failed", payment: "FAILED", booking: "PENDING", reconciliation: false, title: "Thanh toán không thành công", tone: "error" },
      { key: "cancelled", payment: "CANCELLED", booking: "CANCELLED", reconciliation: false, title: "Thanh toán đã hủy", tone: "muted" },
      { key: "reconciliation", payment: "SUCCESS", booking: "EXPIRED", reconciliation: true, title: "Đang đối soát thanh toán", tone: "pending" },
      { key: "inconsistent", payment: "SUCCESS", booking: "PENDING", reconciliation: false, title: "Chưa thể xác định kết quả thanh toán", tone: "muted" },
    ] as const;
    for (const item of cases) {
      fixture.payments.status = item.payment;
      fixture.booking.status = item.booking;
      fixture.payments.reconciliationRequired = item.reconciliation;
      await page.goto(RETURN_PATH);
      const panel = page.getByRole("region", { name: "Kết quả thanh toán từ máy chủ" });
      await expect(panel.getByRole("heading", { name: item.title, exact: true })).toBeVisible();
      await expect(panel).toHaveAttribute("data-feedback-tone", item.tone);
      await expect(page.getByRole("region", { name: "Thông tin giao dịch đã lưu" })).toContainText(PAYMENT_ID);
      await expect(page.getByRole("region", { name: "Thông tin giao dịch đã lưu" })).toContainText("90,001.4321");
      await expect(page.getByRole("button", { name: /Tiến hành thanh toán|Mở VNPAY/ })).toHaveCount(0);
      await noUnsupportedResult(page);
      await capture(page, info, `return-${width}-${item.key}`);
    }
    expect(fixture.state.writes).toEqual([]);
  });

  test(`HTTP fixture: reduced-motion loading, unavailable state and keyboard GET recovery at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const fixture = await preparePaymentStatus(page);
    let release!: () => void;
    const delay = new Promise<void>(resolve => { release = resolve; });
    await page.route(`/api/v1/bookings/${BOOKING_ID}`, async route => { await delay; await route.fallback(); });
    fixture.payments.readError = 503;
    await page.goto(RETURN_PATH);
    await expect(page.getByText("Đang xác minh thanh toán…", { exact: true })).toBeVisible();
    const skeleton = page.locator('[aria-hidden="true"].bg-panel-high').first();
    await expect(skeleton).toBeVisible();
    expect(await skeleton.evaluate(el => getComputedStyle(el).animationName)).toBe("none");
    await capture(page, info, `return-${width}-loading`);
    release();
    const panel = page.getByRole("region", { name: "Kết quả thanh toán từ máy chủ" });
    await expect(panel).toContainText("Chưa thể xác định kết quả thanh toán");
    await expect(panel).toHaveAttribute("data-feedback-tone", "muted");
    await expect(page.getByRole("main")).not.toContainText("private SQL");
    await capture(page, info, `return-${width}-unavailable`);
    const button = page.getByRole("button", { name: "Kiểm tra lại trạng thái", exact: true });
    await button.focus();
    expect(await button.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
    const size = await button.boundingBox();
    expect(size!.height).toBeGreaterThanOrEqual(44);
    expect(size!.width).toBeGreaterThanOrEqual(44);
    fixture.payments.readError = 0;
    await page.keyboard.press("Enter");
    await expect(panel).toContainText("Thanh toán đang chờ xử lý");
    await expect(button).toBeFocused();
    let finishRecheck!: () => void;
    const waiting = new Promise<void>(resolve => { finishRecheck = resolve; });
    await page.route(`/api/v1/bookings/${BOOKING_ID}/payment-transactions/${PAYMENT_ID}`, async route => { await waiting; await route.fallback(); });
    await page.keyboard.press("Enter");
    await expect(button).toBeDisabled();
    const summaryLink = page.getByRole("link", { name: "Quay về thông tin đặt vé", exact: true });
    await summaryLink.focus();
    finishRecheck();
    await expect(button).toBeEnabled();
    await expect(summaryLink).toBeFocused();
    expect(fixture.state.reads.every(read => read.method === "GET" && read.authorization === "Bearer qa-access")).toBe(true);
    expect(fixture.state.writes).toEqual([]);
  });

  test(`HTTP fixture: unknown attempt stays blocked after forged direct return and browser back at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    const fixture = await preparePaymentStatus(page, true, false);
    await page.goto(RETURN_PATH + "?vnp_ResponseCode=00&paymentId=2&status=SUCCESS#fixture");
    await expect(page).toHaveURL(RETURN_PATH);
    await expect(page.getByRole("heading", { name: "Chưa thể xác định kết quả thanh toán", exact: true })).toBeVisible();
    expect(fixture.state.reads).toEqual([]);
    await noUnsupportedResult(page);
    await capture(page, info, `return-${width}-unknown`);
    await page.goto(SUMMARY_PATH);
    await expect(page.getByRole("region", { name: "Khởi tạo thanh toán" })).toContainText("chưa có mã lần thanh toán");
    await expect(page.getByRole("button", { name: /Tiến hành thanh toán|Mở VNPAY/ })).toHaveCount(0);
    await capture(page, info, `summary-${width}-unknown`);
    await page.goBack();
    await expect(page).toHaveURL(RETURN_PATH);
    await expect(page.getByRole("heading", { name: "Chưa thể xác định kết quả thanh toán", exact: true })).toBeVisible();
    expect(fixture.state.writes).toEqual([]);
  });
}
