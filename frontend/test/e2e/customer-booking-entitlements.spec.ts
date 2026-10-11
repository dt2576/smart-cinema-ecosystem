import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import jsQR from "jsqr";
import { mockCustomerEntitlements } from "./helpers/customer-entitlements";
import { ENTITLEMENT_ID, QR_FIXTURE, ticketsFixture } from "../fixtures/customer-entitlements";
const { PNG } = createRequire(resolve("package.json"))("pngjs");
const DETAIL = `/my-bookings/${ENTITLEMENT_ID}`;
const qr = 'img[alt^="Mã QR đặt vé cho"]';

// All backend states are HTTP fixtures. No real financial/provider/Staff proof.
for (const width of [390, 768, 1440]) {
  test(`Stitch history/detail/QR, keyboard, quiet zone and overflow at ${width}px`, async ({ page }, info) => {
    const state = await mockCustomerEntitlements(page); await page.setViewportSize({ width, height: 1000 }); await page.goto("/my-bookings");
    await expect(page.getByRole("article")).toHaveCount(1); expect(await page.locator('html').getAttribute('lang')).toBe("vi");
    await page.screenshot({ path: info.outputPath(`history-${width}.png`), fullPage: true }); await page.getByRole("link", { name: "Xem đơn đặt vé SC-FIXTURE-1101" }).click(); await expect(page.locator(qr)).toBeVisible();
    const header = await page.locator('header').boundingBox(), h1 = await page.getByRole('heading', { level: 1 }).boundingBox(); expect(h1!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const trigger = page.getByRole("button", { name: "Phóng to mã QR đặt vé" }); expect((await trigger.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: info.outputPath(`detail-${width}.png`), fullPage: true }); await trigger.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.locator(qr)).toHaveCount(1); await page.screenshot({ path: info.outputPath(`qr-${width}.png`), fullPage: true });
    const src = await page.locator(qr).getAttribute('src'); const png = PNG.sync.read(Buffer.from(src!.split(',')[1], 'base64')); const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(decoded?.data).toBe(QR_FIXTURE); expect(decoded?.binaryData).toEqual([...new TextEncoder().encode(QR_FIXTURE)]); expect([...png.data.subarray(0, 4)]).toEqual([255, 255, 255, 255]);
    await page.keyboard.press('Escape'); await expect(trigger).toBeFocused(); expect(state.requests.every(r => r.method === 'GET')).toBe(true);
  });
  test(`long Vietnamese values and loading/error/reduced-motion states at ${width}px`, async ({ page }, info) => {
    const state = await mockCustomerEntitlements(page); await page.setViewportSize({ width, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
    state.booking.movieTitle = 'Bộ phim có tên rất dài dành cho trải nghiệm điện ảnh Việt Nam '.repeat(3); state.booking.bookingCode = 'SC'.repeat(60);
    for (const s of state.booking.seats) { s.finalPrice = '333333333333333.3333'; s.unitPrice = s.finalPrice; }
    Object.assign(state.booking, { seatAmount: '999999999999999.9999', concessionAmount: '0.0000', subtotal: '999999999999999.9999', discount: '0.0000', finalAmount: '999999999999999.9999', concessions: [] });
    let release!: () => void; state.delay = new Promise<void>(resolve => { release = resolve; }); await page.goto(DETAIL); await expect(page.getByRole('status')).toContainText('Đang tải');
    await page.screenshot({ path: info.outputPath(`loading-${width}.png`), fullPage: true }); release(); state.delay = undefined; await expect(page.locator(qr)).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`long-${width}.png`), fullPage: true }); state.ticketError = 503; await page.getByRole('button', { name: 'Kiểm tra lại trạng thái', exact: true }).click(); await expect(page.getByRole('main').getByRole('alert')).toBeVisible(); await expect(page.locator(qr)).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`error-${width}.png`), fullPage: true }); expect(await page.locator('body').innerText()).not.toContain('private-token-sql');
  });
}
test('real paginated history uses only page/size, no invented filters or global counters', async ({ page }) => {
  const state = await mockCustomerEntitlements(page); state.history.items = Array.from({ length: 21 }, (_, i) => ({ ...state.history.items[0], id: String(BigInt(ENTITLEMENT_ID) + BigInt(i)), bookingCode: `SC-${i}` })); state.history.totalElements = 21; state.history.totalPages = 2;
  await page.goto('/my-bookings'); await expect(page.getByRole('article')).toHaveCount(20); await expect(page.getByRole('button', { name: 'Trang trước' })).toBeDisabled(); await page.getByRole('button', { name: 'Trang sau' }).click();
  await expect(page.getByRole('article')).toHaveCount(1); await expect(page.getByRole('article')).toContainText('SC-20'); await expect(page.getByRole('button', { name: 'Trang sau' })).toBeDisabled(); await page.getByRole('button', { name: 'Trang trước' }).click(); await expect(page.getByRole('article')).toHaveCount(20);
  expect(state.requests.some(r => r.path === '/api/v1/bookings?page=1&size=20')).toBe(true); await expect(page.getByRole('searchbox')).toHaveCount(0);
});
test('direct entry/reload/back restores entitlements without Payment identity or POST', async ({ page }) => {
  const state = await mockCustomerEntitlements(page); await page.goto(DETAIL); await expect(page.locator(qr)).toBeVisible(); await page.reload(); await expect(page.locator(qr)).toBeVisible(); await page.getByRole('link', { name: 'Về vé của tôi', exact: true }).click(); await expect(page.getByRole('article')).toHaveCount(1); await page.goBack(); await expect(page.locator(qr)).toBeVisible();
  expect(state.requests.every(r => r.method === 'GET' && !r.path.includes('payment'))).toBe(true); expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, tab: { ...sessionStorage } }))).not.toContain(QR_FIXTURE);
});
test('anonymous direct entry has narrow login resume and no preview/API fallback', async ({ page }) => {
  const state = await mockCustomerEntitlements(page, false); await page.goto(DETAIL); await expect(page.getByRole('heading', { name: 'Đăng nhập để xem vé của bạn' })).toBeVisible(); expect(state.requests).toHaveLength(0);
  await page.getByRole('main').getByRole('link', { name: 'Đăng nhập', exact: true }).click(); expect(new URL(page.url()).searchParams.get('returnTo')).toBe(DETAIL);
  await page.route('**/api/v1/auth/tokens', route => route.fulfill({ json: { accessToken: 'qa-access', tokenType: 'Bearer', expiresIn: 3600, refreshToken: 'qa-refresh', refreshExpiresIn: 86400, userId: 1, fullName: 'Khách hàng', email: 'customer@example.test', role: 'CUSTOMER' } }));
  await page.getByLabel('Địa chỉ email', { exact: true }).fill('customer@example.test'); await page.getByLabel('Mật khẩu', { exact: true }).fill('FixtureOnly123!'); await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await expect(page).toHaveURL(DETAIL); await expect(page.locator(qr)).toBeVisible();
});
test('401 clears entitlement display and exposes safe login resume', async ({ page }) => {
  const state = await mockCustomerEntitlements(page); await page.goto(DETAIL); await expect(page.locator(qr)).toBeVisible(); state.ticketError = 401;
  await page.getByRole('button', { name: 'Kiểm tra lại trạng thái', exact: true }).click(); await expect(page.locator(qr)).toHaveCount(0); await expect(page.getByRole('link', { name: 'Đăng nhập lại' })).toHaveAttribute('href', `/login?returnTo=${encodeURIComponent(DETAIL)}`);
});
for (const role of ['ADMIN', 'MANAGER', 'STAFF']) test(`${role} cannot render Customer entitlements from cached navigation`, async ({ page }) => {
  const state = await mockCustomerEntitlements(page, false); await page.addInitScript(role => localStorage.setItem('smart-cinema.auth-session', JSON.stringify({ accessToken: 'qa-access', tokenType: 'Bearer', expiresAt: Date.now() + 3600000, refreshToken: 'qa-refresh', refreshExpiresAt: Date.now() + 86400000, user: { id: 1, fullName: 'Tài khoản', email: 'role@example.test', role } })), role);
  await page.goto(DETAIL); await expect(page.getByRole('heading', { name: 'Cần quyền khách hàng' })).toBeVisible(); expect(state.requests).toHaveLength(0); await expect(page.locator(qr)).toHaveCount(0);
});
test('mismatch/incomplete/duplicate/bad-token aggregates suppress all Tickets and QR', async ({ page }) => {
  const state = await mockCustomerEntitlements(page);
  for (const mutate of [() => { state.entitlements.bookingStatus = 'PENDING'; }, () => { state.entitlements.bookingId = '1'; }, () => { state.entitlements.tickets.pop(); }, () => { state.entitlements.tickets[0].id = state.entitlements.tickets[1].id; }, () => { state.entitlements.tickets[0].seatId = '1'; }, () => { state.entitlements.bookingQr = '\ninvalid'; }]) {
    state.entitlements = ticketsFixture(state.booking); mutate(); await page.goto(DETAIL); await expect(page.getByRole('main').getByRole('alert')).toContainText('Mã QR được ẩn'); await expect(page.locator(qr)).toHaveCount(0); await expect(page.getByRole('region', { name: 'Vé riêng lẻ' })).toHaveCount(0);
  }
  state.entitlements = ticketsFixture(state.booking); await page.getByRole('main').getByRole('alert').getByRole('button').click(); await expect(page.locator(qr)).toBeVisible();
});
test('stale Booking and stale Ticket snapshots are never accepted as paid entitlements', async ({ page }) => {
  const state = await mockCustomerEntitlements(page); await page.goto(DETAIL); await expect(page.locator(qr)).toBeVisible(); state.booking.serverTime = '2030-01-01T01:00:00Z'; await page.getByRole('button', { name: 'Kiểm tra lại trạng thái', exact: true }).click(); await expect(page.getByRole('main').getByRole('alert')).toBeVisible(); await expect(page.locator(qr)).toHaveCount(0);
  state.booking.serverTime = '2030-01-01T02:00:00Z'; state.entitlements.serverTime = '2030-01-01T01:00:00Z'; await page.getByRole('main').getByRole('alert').getByRole('button').click(); await expect(page.getByRole('main').getByRole('alert')).toBeVisible(); await expect(page.locator(qr)).toHaveCount(0);
});
test('forged financial/preview query parameters cannot establish issuance or change API reads', async ({ page }) => {
  const state = await mockCustomerEntitlements(page); state.booking.status = 'PENDING'; state.entitlements = ticketsFixture(state.booking);
  await page.goto(`${DETAIL}?vnp_ResponseCode=00&status=PAID&bookingPreview=default&ticketPreview=default#SUCCESS`); await expect(page.getByRole('heading', { name: 'Chưa có mã QR đặt vé' })).toBeVisible(); await expect(page.locator(qr)).toHaveCount(0); expect(state.requests.every(r => !r.path.includes('?'))).toBe(true);
});
test('account change clears QR/dialog and ignores a delayed old-account response', async ({ page }) => {
  const state = await mockCustomerEntitlements(page); await page.goto(DETAIL); await expect(page.locator(qr)).toBeVisible(); await page.getByRole('button', { name: 'Phóng to mã QR đặt vé' }).click();
  let release!: () => void; state.delay = new Promise<void>(resolve => { release = resolve; });
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Kiểm tra lại trạng thái', exact: true }).click();
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('smart-cinema.auth-session')!); s.accessToken = 'other-account'; s.user.id = 2; const raw = JSON.stringify(s); localStorage.setItem('smart-cinema.auth-session', raw); window.dispatchEvent(new StorageEvent('storage', { key: 'smart-cinema.auth-session', newValue: raw })); });
  release(); state.delay = undefined; await expect(page.locator(qr)).toHaveCount(0); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByRole('region', { name: 'Vé riêng lẻ' })).toHaveCount(0); await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
});
test('logout through another tab clears sensitive Ticket/QR data immediately', async ({ page }) => {
  await mockCustomerEntitlements(page); await page.goto(DETAIL); await expect(page.locator(qr)).toBeVisible(); await page.getByRole('button', { name: 'Phóng to mã QR đặt vé' }).click();
  await page.evaluate(() => { localStorage.removeItem('smart-cinema.auth-session'); window.dispatchEvent(new StorageEvent('storage', { key: 'smart-cinema.auth-session', newValue: null })); });
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator(qr)).toHaveCount(0); await expect(page.getByRole('region', { name: 'Vé riêng lẻ' })).toHaveCount(0); await expect(page.getByRole('heading', { name: 'Đăng nhập để xem vé của bạn' })).toBeVisible();
});
test('network loss and malformed JSON have safe retry with no Payment POST', async ({ page }) => {
  const state = await mockCustomerEntitlements(page); await page.route('**/api/v1/bookings/*/tickets', route => route.abort('failed')); await page.goto(DETAIL); await expect(page.getByRole('main').getByRole('alert')).toBeVisible(); await expect(page.locator(qr)).toHaveCount(0);
  await page.unroute('**/api/v1/bookings/*/tickets'); await page.route('**/api/v1/bookings/*/tickets', route => route.fulfill({ body: 'private malformed', contentType: 'application/json' })); await page.getByRole('main').getByRole('alert').getByRole('button').click(); await expect(page.getByRole('main').getByRole('alert')).toBeVisible(); expect(await page.locator('body').innerText()).not.toContain('private malformed');
  await page.unroute('**/api/v1/bookings/*/tickets'); await page.getByRole('main').getByRole('alert').getByRole('button').click(); await expect(page.locator(qr)).toBeVisible(); expect(state.requests.every(r => r.method === 'GET')).toBe(true);
});
test('rate limited reads stop automatic focus rechecks until explicit safe retry', async ({ page }) => {
  const state = await mockCustomerEntitlements(page); state.ticketError = 429; await page.goto(DETAIL); await expect(page.getByRole('main').getByRole('alert')).toContainText('Vui lòng chờ'); const before = state.requests.length;
  await page.evaluate(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('pageshow')); }); expect(state.requests.length).toBe(before); state.ticketError = 0; await page.getByRole('main').getByRole('alert').getByRole('button').click(); await expect(page.locator(qr)).toBeVisible();
});
test('tab hide invalidates visible QR and tab return rechecks owned GETs', async ({ page }) => {
  const state = await mockCustomerEntitlements(page); await page.goto(DETAIL); await expect(page.locator(qr)).toBeVisible();
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); }); await expect(page.locator(qr)).toHaveCount(0);
  const before = state.requests.length; await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange')); }); await expect(page.locator(qr)).toBeVisible(); expect(state.requests.length).toBeGreaterThan(before);
});
test('two actual tabs recover independently and cross-tab logout clears the first tab', async ({ page, context }) => {
  const first = await mockCustomerEntitlements(page); await page.goto(DETAIL); await expect(page.locator(qr)).toBeVisible();
  const secondPage = await context.newPage(); const second = await mockCustomerEntitlements(secondPage, false); await secondPage.goto(DETAIL); await expect(secondPage.locator(qr)).toBeVisible();
  await secondPage.evaluate(() => localStorage.removeItem('smart-cinema.auth-session')); await expect(page.locator(qr)).toHaveCount(0); await expect(page.getByRole('heading', { name: 'Đăng nhập để xem vé của bạn' })).toBeVisible();
  expect([...first.requests, ...second.requests].every(r => r.method === 'GET' && !r.path.includes('payment'))).toBe(true); await secondPage.close();
});
