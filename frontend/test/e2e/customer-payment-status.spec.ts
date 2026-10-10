import { expect, test, type Page } from "@playwright/test";
import { preparePaymentStatus, RETURN_PATH, SUMMARY_PATH } from "./helpers/customer-payment-status";
import { BOOKING_ID } from "./helpers/customer-bookings";
import { PAYMENT_ID } from "./helpers/customer-payments";

const status = (page: Page) => page.getByRole("region", { name: "Kết quả thanh toán từ máy chủ" });
const recheck = (page: Page) => page.getByRole("button", { name: "Kiểm tra lại trạng thái", exact: true });
async function noIssuance(page: Page) { await expect(page.locator("canvas, img[alt*='QR']")).toHaveCount(0); await expect(page.getByRole("link", { name: /Xem vé|Mã QR/ })).toHaveCount(0); }

test("fixture: fixed backend 303 return before IPN stays pending, delayed server success is read only", async ({ page }) => {
  const fixture = await preparePaymentStatus(page);
  await page.route("**/api/v1/payments/vnpay/return?**", route => route.fulfill({ status: 303, headers: { location: RETURN_PATH } }));
  await page.goto("/api/v1/payments/vnpay/return?vnp_ResponseCode=00&vnp_SecureHash=fixture");
  await expect(page).toHaveURL(RETURN_PATH); await expect(status(page)).toContainText("Thanh toán đang chờ xử lý");
  fixture.payments.status = "SUCCESS"; fixture.booking.status = "PAID";
  await recheck(page).click(); await expect(status(page)).toContainText("Thanh toán thành công"); await noIssuance(page);
  expect(fixture.state.reads.every(read => read.authorization === "Bearer qa-access" && read.method === "GET")).toBe(true); expect(fixture.state.writes).toEqual([]);
});
test("fixture: IPN before return, duplicate return and reload preserve authoritative success without writes", async ({ page }) => {
  const fixture = await preparePaymentStatus(page); fixture.payments.status = "SUCCESS"; fixture.booking.status = "PAID";
  for (let index = 0; index < 2; index++) { await page.goto(RETURN_PATH); await expect(status(page)).toContainText("Thanh toán thành công"); }
  await page.reload(); await expect(status(page)).toContainText("Thanh toán thành công"); await noIssuance(page); expect(fixture.state.writes).toEqual([]);
});
for (const [value, label] of [["INITIATED", "Thanh toán đang chờ hoàn tất"], ["PENDING", "Thanh toán đang chờ xử lý"], ["FAILED", "Thanh toán không thành công"], ["CANCELLED", "Thanh toán đã hủy"]] as const) test(`fixture: ${value} is distinct and cannot create a replacement on return`, async ({ page }) => {
  const fixture = await preparePaymentStatus(page); fixture.payments.status = value;
  await page.goto(RETURN_PATH); await expect(status(page)).toContainText(label); await page.reload(); await expect(status(page)).toContainText(label);
  await noIssuance(page); expect(fixture.state.writes).toEqual([]); await expect(page.getByRole("button", { name: /Mở VNPAY|Tiến hành thanh toán/ })).toHaveCount(0);
});
test("fixture: reconciled financial success on expired Booking is truthful without PAID or issuance", async ({ page }) => {
  const fixture = await preparePaymentStatus(page); fixture.booking.status = "EXPIRED"; fixture.payments.status = "SUCCESS"; fixture.payments.reconciliationRequired = true;
  await page.goto(RETURN_PATH); await expect(status(page)).toContainText("Đang đối soát thanh toán"); await expect(status(page)).toContainText("giao dịch thành công");
  await expect(status(page)).toContainText("Đơn đặt vé đã hết hạn"); await expect(status(page)).not.toContainText("Thanh toán thành công"); await noIssuance(page); expect(fixture.state.writes).toEqual([]);
});
test("fixture: special reconciliation remains unresolved and cannot reopen gateway", async ({ page }) => {
  const fixture = await preparePaymentStatus(page); fixture.payments.reconciliationRequired = true;
  await page.goto(SUMMARY_PATH); await expect(status(page)).toContainText("Đang đối soát thanh toán"); await expect(page.getByRole("button", { name: "Mở VNPAY Sandbox", exact: true })).toBeDisabled(); expect(fixture.state.writes).toEqual([]);
});
for (const stale of ["booking", "payment"] as const) test(`fixture: stale ${stale} projection blocks success until both owned reads agree`, async ({ page }) => {
  const fixture = await preparePaymentStatus(page); fixture.payments.status = "SUCCESS";
  if (stale === "booking") fixture.state.override = { bookingStatus: "PAID" };
  else { fixture.booking.status = "PAID"; fixture.state.override = { status: "PENDING", bookingStatus: "PENDING" }; }
  await page.goto(RETURN_PATH); await expect(status(page)).toContainText("Chưa thể xác định kết quả thanh toán"); await expect(status(page)).not.toContainText("Thanh toán thành công");
  fixture.booking.status = "PAID"; fixture.state.override = {}; await recheck(page).click(); await expect(status(page)).toContainText("Thanh toán thành công"); expect(fixture.state.writes).toEqual([]);
});
test("fixture: stale success downgrade remains uncertain across repeated reads", async ({ page }) => {
  const fixture = await preparePaymentStatus(page); fixture.payments.status = "SUCCESS"; fixture.booking.status = "PAID";
  await page.goto(RETURN_PATH); await expect(status(page)).toContainText("Thanh toán thành công");
  fixture.state.override = { status: "FAILED" }; await recheck(page).click(); await expect(status(page)).toContainText("Chưa thể xác định kết quả thanh toán");
  await recheck(page).click(); await expect(status(page)).not.toContainText("Thanh toán không thành công");
  fixture.state.override = {}; await recheck(page).click(); await expect(status(page)).toContainText("Thanh toán thành công"); expect(fixture.state.writes).toEqual([]);
});
for (const failure of ["network", "json", "500", "503", "429"] as const) test(`fixture: ${failure} status read is uncertain, explicit GET recovery does not replay payment`, async ({ page }) => {
  const fixture = await preparePaymentStatus(page);
  if (failure === "network" || failure === "json") fixture.state.fault = failure; else fixture.payments.readError = Number(failure);
  await page.goto(RETURN_PATH); await expect(recheck(page)).toBeEnabled(); await expect(status(page)).toContainText("Chưa thể xác định kết quả thanh toán");
  await expect(page.getByRole("main")).not.toContainText("private SQL"); fixture.state.fault = ""; fixture.payments.readError = 0;
  await recheck(page).click(); await expect(status(page)).toContainText("Thanh toán đang chờ xử lý"); expect(fixture.state.writes).toEqual([]);
});
for (const mismatch of ["bookingId", "paymentId", "amount"] as const) test(`fixture: wrong ${mismatch} rejects the attempt and any success claim`, async ({ page }) => {
  const fixture = await preparePaymentStatus(page); fixture.state.override = { [mismatch]: mismatch === "amount" ? "1.0000" : "2", status: "SUCCESS", bookingStatus: "PAID" };
  await page.goto(RETURN_PATH); await expect(status(page)).toContainText("Chưa thể xác định kết quả thanh toán"); await noIssuance(page); expect(fixture.state.writes).toEqual([]);
});
test("fixture: forged callback/query identity is discarded and never changes owned GET target", async ({ page }) => {
  const fixture = await preparePaymentStatus(page);
  await page.goto(RETURN_PATH + "?vnp_ResponseCode=00&vnp_TransactionStatus=00&vnp_SecureHash=fixture&bookingId=2&paymentId=2&status=SUCCESS#fixture");
  await expect(page).toHaveURL(RETURN_PATH); await expect(status(page)).toContainText("Thanh toán đang chờ xử lý");
  expect(fixture.state.reads.every(read => read.path.endsWith(`/${PAYMENT_ID}`))).toBe(true); await expect(page.getByRole("main")).not.toContainText("vnp_SecureHash"); expect(fixture.state.writes).toEqual([]);
});
test("fixture: lost identity remains blocked even with forged success parameters", async ({ page }) => {
  const fixture = await preparePaymentStatus(page, true, false);
  await page.goto(RETURN_PATH + "?vnp_ResponseCode=00&paymentId=2"); await expect(page).toHaveURL(RETURN_PATH);
  await expect(page.getByRole("heading", { name: "Chưa thể xác định kết quả thanh toán" })).toBeVisible(); expect(fixture.state.reads).toEqual([]); expect(fixture.state.writes).toEqual([]);
  await page.goto(SUMMARY_PATH); await expect(page.getByRole("region", { name: "Khởi tạo thanh toán" })).toContainText("chưa có mã lần thanh toán"); await expect(page.getByRole("button", { name: "Tiến hành thanh toán", exact: true })).toHaveCount(0);
});
test("fixture: anonymous return safely resumes login through clean route and known attempt GET", async ({ page }) => {
  const fixture = await preparePaymentStatus(page, false);
  await page.route("**/api/v1/auth/tokens", route => route.fulfill({ json: { accessToken: "qa-access", tokenType: "Bearer", expiresIn: 3600, refreshToken: "qa-refresh", refreshExpiresIn: 86400, userId: 1, email: "customer@example.test", fullName: "Customer", role: "CUSTOMER" } }));
  await page.goto(RETURN_PATH); await expect(page.getByRole("main").getByRole("link", { name: "Đăng nhập", exact: true })).toHaveAttribute("href", `/login?${new URLSearchParams({ returnTo: RETURN_PATH })}`);
  expect(fixture.state.reads).toEqual([]); await page.getByRole("main").getByRole("link", { name: "Đăng nhập", exact: true }).click();
  await page.getByLabel("Địa chỉ email", { exact: true }).fill("customer@example.test"); await page.getByLabel("Mật khẩu", { exact: true }).fill("fixture-password"); await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(RETURN_PATH); await expect(status(page)).toContainText("Thanh toán đang chờ xử lý"); expect(fixture.state.writes).toEqual(["/api/v1/auth/tokens"]);
});
for (const code of [401, 403, 404]) test(`fixture: owned Payment ${code} never grants access or financial status`, async ({ page }) => {
  const fixture = await preparePaymentStatus(page); fixture.payments.readError = code;
  await page.goto(RETURN_PATH); await expect(status(page)).toContainText("Chưa thể xác định kết quả thanh toán");
  if (code === 401) await expect(page.getByRole("link", { name: "Đăng nhập lại", exact: true })).toBeVisible(); await noIssuance(page); expect(fixture.state.writes).toEqual([]);
});
test("fixture: delayed return after original deadline remains pending financially, late success needs reconciliation", async ({ page }) => {
  const fixture = await preparePaymentStatus(page); await page.goto(RETURN_PATH); await expect(status(page)).toContainText("Thanh toán đang chờ xử lý");
  await page.clock.fastForward(11 * 60_000); await recheck(page).click(); await expect(status(page)).toContainText("Đơn đặt vé đã hết hạn");
  fixture.payments.status = "SUCCESS"; fixture.payments.reconciliationRequired = true; await recheck(page).click(); await expect(status(page)).toContainText("Đang đối soát thanh toán");
  expect(fixture.booking.expiresAt).toBe("2030-01-01T02:10:00Z"); expect(fixture.booking.paymentStartedAt).toBe("2030-01-01T02:00:01Z"); await noIssuance(page); expect(fixture.state.writes).toEqual([]);
});
test("fixture: bounded reads stop, explicit recheck and tab focus recover delayed status", async ({ page }) => {
  const fixture = await preparePaymentStatus(page); await page.goto(RETURN_PATH); await expect(recheck(page)).toBeEnabled();
  for (let index = 0; index < 6; index++) { await page.clock.runFor(30_001); await expect(recheck(page)).toBeEnabled(); }
  const count = fixture.state.reads.length; await page.clock.runFor(30_001); expect(fixture.state.reads).toHaveLength(count);
  fixture.payments.status = "SUCCESS"; fixture.booking.status = "PAID"; await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(status(page)).toContainText("Thanh toán thành công"); expect(fixture.state.writes).toEqual([]);
});
test("fixture: back/forward and direct Summary retain known identity with GET only", async ({ page }) => {
  const fixture = await preparePaymentStatus(page); await page.goto(RETURN_PATH); await expect(recheck(page)).toBeEnabled();
  await page.getByRole("link", { name: "Quay về thông tin đặt vé", exact: true }).click(); await expect(page).toHaveURL(SUMMARY_PATH); await expect(status(page)).toContainText("Thanh toán đang chờ xử lý");
  await page.goBack(); await expect(page).toHaveURL(RETURN_PATH); await expect(status(page)).toContainText("Thanh toán đang chờ xử lý");
  await page.goForward(); await expect(page).toHaveURL(SUMMARY_PATH); await noIssuance(page); expect(fixture.state.writes).toEqual([]);
});
test("fixture: tabs have independent return identities and a missing tab cannot infer another attempt", async ({ page, context }) => {
  const first = await preparePaymentStatus(page); await page.goto(RETURN_PATH); await expect(status(page)).toContainText("Thanh toán đang chờ xử lý");
  const secondPage = await context.newPage(), second = await preparePaymentStatus(secondPage, true, false); await secondPage.goto(RETURN_PATH);
  await expect(secondPage.getByRole("heading", { name: "Chưa thể xác định kết quả thanh toán" })).toBeVisible(); expect(second.state.reads).toEqual([]); expect(second.state.writes).toEqual([]); expect(first.state.writes).toEqual([]);
});
for (const mobile of [false, true]) test(`fixture: return accessible keyboard and ${mobile ? "mobile" : "desktop"} layout has exact amounts and no QR`, async ({ page }, info) => {
  const fixture = await preparePaymentStatus(page); await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  await page.goto(RETURN_PATH); await expect(status(page)).toContainText("Thanh toán đang chờ xử lý");
  await expect(page.getByRole("main")).toContainText(PAYMENT_ID); await expect(page.getByRole("main")).toContainText("90,001.4321");
  await recheck(page).focus(); await expect(recheck(page)).toBeFocused(); await page.keyboard.press("Enter"); await expect(recheck(page)).toBeEnabled(); await noIssuance(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: info.outputPath(`return-${mobile ? "mobile" : "desktop"}.png`), fullPage: true }); expect(fixture.state.writes).toEqual([]);
});
test("fixture: tampered return pointer cannot select a mismatching per-Booking attempt", async ({ page }) => {
  const fixture = await preparePaymentStatus(page); await page.goto(RETURN_PATH); await expect(recheck(page)).toBeEnabled();
  await page.evaluate(bookingId => sessionStorage.setItem("smart-cinema.payment-return", JSON.stringify({ bookingId, paymentId: "2", status: "SUCCESS" })), BOOKING_ID);
  const reads = fixture.state.reads.length; await page.reload(); await expect(page.getByRole("heading", { name: "Chưa thể xác định kết quả thanh toán" })).toBeVisible(); expect(fixture.state.reads).toHaveLength(reads); expect(fixture.state.writes).toEqual([]);
});

test("fixture: read-time expired Booking versus persisted PENDING projection stays under review", async ({ page }) => {
  const fixture = await preparePaymentStatus(page); fixture.booking.status = "EXPIRED"; fixture.state.override = { bookingStatus: "PENDING" };
  await page.goto(RETURN_PATH); await expect(status(page)).toContainText("Chưa thể xác định kết quả thanh toán"); await expect(status(page)).toContainText("Đơn đặt vé đã hết hạn");
  fixture.state.override = {}; await recheck(page).click(); await expect(status(page)).toContainText("Thanh toán đang chờ xử lý"); expect(fixture.state.writes).toEqual([]);
});
test("fixture: 429 stops automatic reads until an explicit supported recheck", async ({ page }) => {
  const fixture = await preparePaymentStatus(page); fixture.payments.readError = 429;
  await page.goto(RETURN_PATH); await expect(recheck(page)).toBeEnabled(); const count = fixture.state.reads.length;
  await page.clock.fastForward(11 * 60_000); await page.evaluate(() => window.dispatchEvent(new Event("focus"))); expect(fixture.state.reads).toHaveLength(count);
  fixture.payments.readError = 0; await recheck(page).click(); await expect(status(page)).toContainText("Thanh toán đang chờ xử lý"); expect(fixture.state.writes).toEqual([]);
});
test("fixture: mounted return cannot switch attempt when the per-Booking hint is changed", async ({ page }) => {
  const fixture = await preparePaymentStatus(page); await page.goto(RETURN_PATH); await expect(status(page)).toContainText("Thanh toán đang chờ xử lý");
  const count = fixture.state.reads.length;
  await page.evaluate(bookingId => sessionStorage.setItem(`smart-cinema.payment-initiation:${bookingId}`, JSON.stringify({ bookingId, paymentId: "2", reviewRequired: false, status: "SUCCESS" })), BOOKING_ID);
  await recheck(page).click(); await expect(status(page)).toContainText("Chưa thể xác định kết quả thanh toán"); expect(fixture.state.reads).toHaveLength(count); expect(fixture.state.writes).toEqual([]);
});
test("fixture: frozen amount, original deadline and freeze instant cannot be overwritten by later Booking read", async ({ page }) => {
  const fixture = await preparePaymentStatus(page); await page.goto(RETURN_PATH); await expect(status(page)).toContainText("Thanh toán đang chờ xử lý");
  fixture.booking.expiresAt = "2030-01-01T02:30:00Z"; fixture.booking.paymentStartedAt = "2030-01-01T02:05:00Z";
  await recheck(page).click(); await expect(status(page)).toContainText("Chưa thể xác định kết quả thanh toán"); await expect(page.getByRole("main")).not.toContainText("02:30");
  expect(fixture.state.writes).toEqual([]);
});
test("fixture: interrupted return read and lost response recover a known attempt on Summary without POST", async ({ page }) => {
  const fixture = await preparePaymentStatus(page); fixture.state.fault = "network";
  await page.goto(RETURN_PATH); await expect(recheck(page)).toBeEnabled(); await expect(status(page)).toContainText("Chưa thể xác định kết quả thanh toán");
  fixture.state.fault = ""; await page.goto(SUMMARY_PATH); await expect(status(page)).toContainText("Thanh toán đang chờ xử lý");
  await page.goto(RETURN_PATH); await expect(status(page)).toContainText("Thanh toán đang chờ xử lý"); expect(fixture.state.writes).toEqual([]);
});
