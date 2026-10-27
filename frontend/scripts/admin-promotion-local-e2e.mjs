import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dir = path.join(root, 'frontend/target/admin-promotion-frontend-2026-10-27/real');
const journal = path.join(dir, 'journal.json');
await mkdir(dir, { recursive: true });
let evidence;
try { evidence = JSON.parse(await readFile(journal, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const resume = process.argv.includes('--resume');
if (evidence && !resume) throw new Error('Existing real-run journal; never replay creation. Inspect before explicit resume.');
if (evidence?.pending) throw new Error('Prior write outcome needs manual server review; automatic mutation replay refused.');
evidence ??= { tag: `QAUI-20261027-${crypto.randomUUID().slice(0,8).toUpperCase()}`, stage: 'start', checks: [], http: [], screenshots: [] };
const save = () => writeFile(journal, JSON.stringify(evidence, null, 2));
await save();
const privateLines = (await readFile(path.join(root, 'backend/.env.local-test-admin'), 'utf8')).trim().split(/\r?\n/);
const credential = Object.fromEntries(privateLines.map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
assert.ok(credential.DEV_ADMIN_EMAIL.endsWith('@example.test'));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'vi-VN', reducedMotion: 'reduce' });
const page = await context.newPage();
page.on('response', response => {
  const url = new URL(response.url());
  if (url.origin === 'http://127.0.0.1:3000' && url.pathname.startsWith('/api/v1/')) evidence.http.push({ method: response.request().method(), path: url.pathname, status: response.status() });
});
const base = '/admin/promotions', api = '/api/v1/admin/promotions';
async function check(name, action) {
  try { await action(); evidence.checks.push({ name, result: 'PASS' });console.log(`PASS ${name}`); }
  catch { evidence.checks.push({ name, result: 'FAIL' });console.log(`FAIL ${name}; no automatic write retry`);throw new Error(`Real UI check stopped: ${name}`); }
  finally { await save(); }
}
let token;
async function get(resource, authenticated = true) {
  const response = await context.request.get('http://127.0.0.1:3000' + resource, { headers: authenticated ? { Authorization: `Bearer ${token}` } : {}, maxRetries: 0 });
  assert.equal(response.status(), 200);return response.json();
}
async function screenshots(label) {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
    const file = `${label}-${width}.png`;await page.screenshot({ path: path.join(dir, file), fullPage: true });evidence.screenshots.push(file);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });await save();
}
async function mutate(method, resource, action, stage) {
  evidence.pending = { method, resource };await save();
  const wait = page.waitForResponse(r => new URL(r.url()).pathname === resource && r.request().method() === method);
  await action();const response = await wait;
  assert.equal(response.status(), method === 'POST' ? 201 : 200);
  const value = await response.json();assert.match(value.id, /^[1-9]\d*$/);
  if (!evidence.id) evidence.id = value.id;
  evidence.pending = null;evidence.stage = stage;await save();return value;
}
try {
  await page.goto('http://127.0.0.1:3000/login');
  await page.locator('input[name="email"]').fill(credential.DEV_ADMIN_EMAIL);
  await page.locator('input[name="password"]').fill(credential.DEV_ADMIN_PASSWORD);
  const login = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/tokens' && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const authenticated = await login;assert.equal(authenticated.status(), 200);token = (await authenticated.json()).accessToken;
  if (process.argv.includes('--polish')) {
    assert.ok(evidence.completed && evidence.id, 'Polish requires the completed, known synthetic record');
    await check('final Vietnamese date input, exact no-op persistence and tablet readability', async () => {
      const original = await get(api + '/' + evidence.id);assert.equal(original.code, evidence.tag);
      await page.goto('http://127.0.0.1:3000' + base + '/' + evidence.id + '/edit');
      await expect(page.getByLabel('Ngày và giờ bắt đầu', { exact: true })).toHaveValue('27/10/2026 09:00');
      await expect(page.getByLabel('Ngày và giờ kết thúc', { exact: true })).toHaveValue('30/11/2026 23:59');
      await page.getByLabel('Ngày và giờ kết thúc', { exact: true }).fill('31/02/2026 09:00');await page.getByRole('button', { name: 'Lưu thay đổi' }).click();await expect(page.getByText('Nhập ngày và giờ kết thúc hợp lệ.')).toBeVisible();
      await page.getByLabel('Ngày và giờ kết thúc', { exact: true }).fill('30/11/2026 23:59');await screenshots('edit-final');
      const result = await mutate('PUT', api + '/' + evidence.id, () => page.getByRole('button', { name: 'Lưu thay đổi' }).click(), 'polished');
      assert.deepEqual(result, original);evidence.finalDateRoundTrip = true;
    });
    await check('final keyboard, touch targets and remaining responsive screens', async () => {
      for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });await page.goto('http://127.0.0.1:3000' + base + '/new');
        const code = page.getByLabel('Mã khuyến mãi', { exact: true });await code.focus();assert.ok(await code.evaluate(el => { const s=getComputedStyle(el);return s.outlineStyle!=='none' && parseFloat(s.outlineWidth)>0; }));
        const controls = await page.locator('form input,form select,form button,form a[href]').evaluateAll(els => els.filter(el=>el.getClientRects().length).map(el=>({height:el.getBoundingClientRect().height,font:parseFloat(getComputedStyle(el).fontSize)})));
        assert.ok(controls.every(c=>c.height>=44 && c.font>=16));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      }
      await screenshots('create-final');await page.goto('http://127.0.0.1:3000' + base + '/' + evidence.id);await screenshots('detail-final');
      await page.getByRole('button', { name: 'Ngừng áp dụng', exact: true }).click();await screenshots('disable-final');await page.keyboard.press('Escape');
      await page.goto('http://127.0.0.1:3000' + base);await page.getByLabel('Tìm mã khuyến mãi', { exact: true }).fill(evidence.tag);await screenshots('list-final');
      const after = await get(api);for (const original of evidence.originalCatalog)assert.deepEqual(after.find(i=>i.id===original.id),original);
      evidence.finalPolishVerified = true;
    });
  } else {
  await page.goto('http://127.0.0.1:3000' + base);
  const before = await get(api);evidence.originalCatalog ??= before;await save();
  await check('actual ADMIN list, navigation and local filters', async () => {
    await expect(page.getByRole('heading', { name: 'Quản lý khuyến mãi' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Điều hướng quản trị' }).getByRole('link', { name: 'Khuyến mãi', exact: true })).toHaveAttribute('aria-current', 'page');
    await page.getByLabel('Tìm mã khuyến mãi', { exact: true }).fill('NO-MATCH-' + evidence.tag);await expect(page.getByRole('heading', { name: 'Không tìm thấy khuyến mãi' })).toBeVisible();
    await page.getByLabel('Tìm mã khuyến mãi', { exact: true }).fill('');
  });
  if (evidence.stage === 'start') await check('actual UI create, exact money and UTC submission', async () => {
    await page.getByRole('link', { name: 'Thêm khuyến mãi', exact: true }).click();
    await page.getByRole('button', { name: 'Thêm khuyến mãi', exact: true }).click();await expect(page.getByText('Nhập mã khuyến mãi từ 1 đến 50 ký tự.')).toBeVisible();
    await page.getByLabel('Mã khuyến mãi', { exact: true }).fill(evidence.tag);
    await page.getByLabel('Mức giảm (%)', { exact: true }).fill('20,1234');await page.getByLabel('Giảm tối đa (₫, không bắt buộc)', { exact: true }).fill('50000,4321');
    await page.getByLabel('Ngày và giờ bắt đầu', { exact: true }).fill('27/10/2026 09:00:00.123');await page.getByLabel('Ngày và giờ kết thúc', { exact: true }).fill('30/11/2026 23:59:00.456');
    await page.getByLabel('Giá trị đơn hàng tối thiểu (₫)', { exact: true }).fill('150000,1111');await page.getByLabel('Giới hạn lượt sử dụng (không bắt buộc)', { exact: true }).fill('50');await page.getByLabel('Trạng thái ban đầu', { exact: true }).selectOption('ACTIVE');await screenshots('create');
    const result = await mutate('POST', api, () => page.getByRole('button', { name: 'Thêm khuyến mãi', exact: true }).evaluate(button => { button.click();button.click(); }), 'created');
    assert.equal(result.discountValue, '20.1234');assert.equal(result.validFrom, '2026-10-27T02:00:00.123Z');assert.equal(result.validUntil, '2026-11-30T16:59:00.456Z');assert.equal(result.maxDiscountAmount, '50000.4321');assert.equal(result.minimumOrderAmount, '150000.1111');assert.equal(result.status, 'ACTIVE');
    evidence.originalTimes = { validFrom: result.validFrom, validUntil: result.validUntil };await save();
  });
  await page.goto('http://127.0.0.1:3000' + base + '/' + evidence.id);await expect(page.getByRole('heading', { name: 'Chi tiết khuyến mãi' })).toBeVisible();await screenshots('detail');
  if (evidence.stage === 'created') await check('actual edit immutable code and preserved dates/status', async () => {
    await page.getByRole('link', { name: 'Sửa khuyến mãi', exact: true }).click();await expect(page.getByLabel('Mã khuyến mãi', { exact: true })).toHaveAttribute('readonly', '');await expect(page.locator('[name="status"]')).toHaveCount(0);
    await page.getByLabel('Loại giảm giá', { exact: true }).selectOption('FIXED_AMOUNT');await expect(page.getByLabel('Giảm tối đa (₫, không bắt buộc)', { exact: true })).toHaveCount(0);await page.getByLabel('Mức giảm (₫)', { exact: true }).fill('12345,6789');await screenshots('edit');
    const result = await mutate('PUT', api + '/' + evidence.id, () => page.getByRole('button', { name: 'Lưu thay đổi' }).click(), 'edited');
    assert.equal(result.code, evidence.tag);assert.equal(result.discountValue, '12345.6789');assert.equal(result.maxDiscountAmount, null);assert.equal(result.status, 'ACTIVE');assert.equal(result.validFrom, evidence.originalTimes.validFrom);assert.equal(result.validUntil, evidence.originalTimes.validUntil);
    await expect(page).toHaveURL('http://127.0.0.1:3000' + base + '/' + evidence.id);
  });
  if (evidence.stage === 'edited') await check('actual disable dialog, focus containment and stored status', async () => {
    await page.getByRole('button', { name: 'Ngừng áp dụng', exact: true }).click();const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Khách hàng sẽ không thể sử dụng mã này khi đặt vé.')).toBeVisible();for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(el => el.contains(document.activeElement))); }
    await screenshots('disable-dialog');await mutate('PUT', api + '/' + evidence.id + '/status', () => dialog.getByRole('button', { name: 'Ngừng áp dụng', exact: true }).click(), 'disabled');await expect(page.getByRole('button', { name: 'Bật lại', exact: true })).toBeVisible();assert.equal((await get(api + '/' + evidence.id)).status, 'INACTIVE');
  });
  if (evidence.stage === 'disabled') await check('actual enable dialog and persisted ACTIVE', async () => {
    await page.getByRole('button', { name: 'Bật lại', exact: true }).click();await expect(page.getByRole('dialog').getByText('Mã sẽ có thể được sử dụng nếu còn hiệu lực và đáp ứng điều kiện.')).toBeVisible();await screenshots('enable-dialog');
    await mutate('PUT', api + '/' + evidence.id + '/status', () => page.getByRole('dialog').getByRole('button', { name: 'Bật lại', exact: true }).click(), 'enabled');await expect(page.getByRole('button', { name: 'Ngừng áp dụng', exact: true })).toBeVisible();assert.equal((await get(api + '/' + evidence.id)).status, 'ACTIVE');
  });
  await check('reload/direct entry/filter and original Promotion records preserved', async () => {
    await page.reload();await expect(page.getByRole('heading', { name: 'Chi tiết khuyến mãi' })).toBeVisible();await page.goto('http://127.0.0.1:3000' + base);await page.getByLabel('Tìm mã khuyến mãi', { exact: true }).fill(evidence.tag);await page.getByLabel('Trạng thái', { exact: true }).selectOption('ACTIVE');await expect(page.getByText('12.345,6789 ₫').filter({ visible: true }).first()).toBeVisible();await screenshots('list');
    const after = await get(api);for (const original of evidence.originalCatalog) assert.deepEqual(after.find(i => i.id === original.id), original);evidence.preservedOriginalCount = evidence.originalCatalog.length;
    evidence.createdPromotion = await get(api + '/' + evidence.id);assert.equal(evidence.http.filter(r => r.method === 'POST' && r.path === api).length, 1);
  });
  await check('anonymous real application access denied', async () => {
    const anonymous = await browser.newContext();try { const p = await anonymous.newPage();await p.goto('http://127.0.0.1:3000' + base);await expect(p.getByRole('heading', { name: 'Cần đăng nhập' })).toBeVisible(); } finally { await anonymous.close(); }
  });
  }
  evidence.completed = true;await save();console.log('REAL_LOCAL_PROMOTION_E2E=PASS; no interceptions; synthetic Promotion retained');
} finally { token = undefined;await context.close();await browser.close();await save(); }
