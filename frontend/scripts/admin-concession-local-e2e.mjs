import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dir = path.join(root, 'frontend/target/admin-concession-frontend-2026-10-27/real');
const journal = path.join(dir, 'journal.json');
await mkdir(dir, { recursive: true });
let evidence;
try { evidence = JSON.parse(await readFile(journal, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const resume = process.argv.includes('--resume');
if (evidence && !resume) throw new Error('Existing real-run journal; never replay creation. Inspect before explicit resume.');
if (evidence?.pending) throw new Error('Prior write outcome needs manual server review; automatic mutation replay refused.');
evidence ??= { tag: `QA Bắp nước 2026-10-27 ${crypto.randomUUID().slice(0, 8)}`, stage: 'start', checks: [], http: [], screenshots: [] };
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
const base = '/admin/concession-items', api = '/api/v1/admin/concession-items';
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
  await page.locator('form').getByRole('button', { name: 'Đăng nhập', exact: true }).click();assert.equal((await login).status(), 200);
  await expect.poll(() => page.evaluate(() => !!localStorage.getItem('smart-cinema.auth-session'))).toBe(true);
  token = await page.evaluate(() => JSON.parse(localStorage.getItem('smart-cinema.auth-session')).accessToken);
  const before = await get(api);
  await check('real ADMIN list and navigation', async () => {
    await page.goto('http://127.0.0.1:3000' + base);await expect(page.getByRole('heading', { name: 'Quản lý bắp nước' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Điều hướng quản trị' }).getByRole('link', { name: 'Bắp nước', exact: true })).toHaveAttribute('aria-current', 'page');await screenshots('list');
  });
  if (evidence.stage === 'start') await check('real create, validation and duplicate-submit prevention', async () => {
    await page.getByRole('link', { name: 'Thêm sản phẩm', exact: true }).click();
    await page.getByRole('button', { name: 'Thêm sản phẩm', exact: true }).click();await expect(page.getByText('Nhập tên sản phẩm từ 1 đến 150 ký tự.')).toBeVisible();
    await page.getByLabel('Tên sản phẩm', { exact: true }).fill(evidence.tag);await page.getByLabel('Giá bán (₫)').fill('55000,1234');await page.getByLabel('Mô tả (không bắt buộc)').fill('Sản phẩm kiểm thử giao diện local.');await screenshots('create');
    await mutate('POST', api, () => page.getByRole('button', { name: 'Thêm sản phẩm', exact: true }).evaluate(button => { button.click();button.click(); }), 'created');
    await expect(page).toHaveURL('http://127.0.0.1:3000' + base + '/' + evidence.id);
    assert.equal((await get(api + '/' + evidence.id)).sellingPrice, '55000.1234');
    assert.equal(evidence.http.filter(r => r.method === 'POST' && r.path === api).length, 1);
  });
  await page.goto('http://127.0.0.1:3000' + base + '/' + evidence.id);await expect(page.getByRole('heading', { name: 'Chi tiết sản phẩm' })).toBeVisible();await screenshots('detail');
  if (evidence.stage === 'created') await check('real edit preserves selling status and exact price', async () => {
    await page.getByRole('link', { name: 'Sửa sản phẩm', exact: true }).click();await expect(page.getByLabel('Tên sản phẩm', { exact: true })).toHaveValue(evidence.tag);await expect(page.locator('[name="status"]')).toHaveCount(0);
    await page.getByLabel('Giá bán (₫)').fill('65000,4321');await page.getByLabel('Mô tả (không bắt buộc)').fill('Đã kiểm tra chỉnh sửa, giữ nguyên trạng thái bán.');await screenshots('edit');
    const value = await mutate('PUT', api + '/' + evidence.id, () => page.getByRole('button', { name: 'Lưu thay đổi' }).click(), 'edited');
    assert.equal(value.sellingPrice, '65000.4321');assert.equal(value.status, 'ACTIVE');await expect(page).toHaveURL('http://127.0.0.1:3000' + base + '/' + evidence.id);
  });
  if (evidence.stage === 'edited') await check('real deactivation dialog, keyboard and public exclusion', async () => {
    await page.getByRole('button', { name: 'Ngừng bán', exact: true }).click();const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Khách hàng sẽ không thể chọn sản phẩm này khi đặt vé.')).toBeVisible();
    for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(el => el.contains(document.activeElement))); }
    await screenshots('deactivate-dialog');
    await mutate('PUT', api + '/' + evidence.id + '/status', () => dialog.getByRole('button', { name: 'Ngừng bán', exact: true }).click(), 'deactivated');
    await expect(page.getByRole('button', { name: 'Bán lại', exact: true })).toBeVisible();assert.ok(!(await get('/api/v1/concession-items', false)).some(i => i.id === evidence.id));
  });
  if (evidence.stage === 'deactivated') await check('real reactivation and Customer catalog compatibility', async () => {
    await page.getByRole('button', { name: 'Bán lại', exact: true }).click();await screenshots('reactivate-dialog');
    await mutate('PUT', api + '/' + evidence.id + '/status', () => page.getByRole('dialog').getByRole('button', { name: 'Bán lại', exact: true }).click(), 'reactivated');
    await expect(page.getByRole('button', { name: 'Ngừng bán', exact: true })).toBeVisible();assert.ok((await get('/api/v1/concession-items', false)).some(i => i.id === evidence.id && i.sellingPrice === '65000.4321'));
  });
  await check('reload, local search and persisted state; old products preserved', async () => {
    await page.goto('http://127.0.0.1:3000' + base);await page.getByLabel('Tìm sản phẩm').fill(evidence.tag);await expect(page.getByText('65.000,4321 ₫').filter({ visible: true }).first()).toBeVisible();await page.reload();await page.getByLabel('Tìm sản phẩm').fill(evidence.tag);
    const after = await get(api);for (const original of before.filter(i => i.id !== evidence.id)) assert.deepEqual(after.find(i => i.id === original.id), original);
    evidence.createdProduct = { id: evidence.id, status: (await get(api + '/' + evidence.id)).status, price: '65000.4321' };
  });
  await check('real anonymous access is denied', async () => {
    const anonymous = await browser.newContext();try { const p = await anonymous.newPage();await p.goto('http://127.0.0.1:3000' + base);await expect(p.getByRole('heading', { name: 'Cần đăng nhập' })).toBeVisible(); } finally { await anonymous.close(); }
  });
  evidence.completed = true;await save();console.log('REAL_CONCESSION_UI=PASS; all five real endpoints; ' + evidence.screenshots.length + ' responsive screenshots; no mocks');
} finally { token = undefined;await context.close();await browser.close(); }
