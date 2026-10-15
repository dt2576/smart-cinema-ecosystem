// Real local integration evidence. No routes, fixtures, session injection, HAR or traces.
// Run local-test-environment.ps1 -Action Verify immediately before this command.
// Mutation phases are one-shot. read logs in normally but performs no Staff/Cinema writes.
import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const frontendRoot = fileURLToPath(new URL('../', import.meta.url));
const repositoryRoot = path.dirname(frontendRoot);
const evidenceRoot = path.join(frontendRoot, 'target/phase4e-real-local-2026-10-15');
const journalPath = path.join(evidenceRoot, 'results.json');
const mode = process.argv[2];
if (!['write', 'continue', 'block', 'read'].includes(mode)) throw new Error('Specify write, continue, block or read; no default mutation mode.');
const powershell = path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
execFileSync(powershell, ['-NoProfile', '-File', path.join(repositoryRoot, 'backend/scripts/local-test-environment.ps1'), '-Action', 'Verify'], { cwd: repositoryRoot, stdio: 'inherit' });
await mkdir(evidenceRoot, { recursive: true });
let evidence;
try { evidence = JSON.parse(await readFile(journalPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw new Error('Evidence file cannot be read safely.'); }
if (mode === 'write' && evidence) throw new Error('One-shot write already started. Inspect persisted state; never replay automatically.');
if (mode !== 'write' && !evidence?.staff?.id) throw new Error('Known Staff identity required for recovery.');
if (mode === 'continue' && (evidence.continueStartedAt || evidence.assignment || evidence.http.some(row => row.method === 'POST' && row.path.endsWith('/invitations')))) throw new Error('Continuation already attempted or mutation history differs; no replay.');
if (mode === 'block' && (!evidence.assignment || evidence.blockAttemptStartedAt)) throw new Error('Known assignment and unattempted block phase required; no replay.');
evidence ??= { startedAt: new Date().toISOString(), database: '127.0.0.1:5432/smartcinema_phase4e_test', checks: [], http: [], screenshots: [] };
const save = () => writeFile(journalPath, JSON.stringify(evidence, null, 2));
await save();
if (mode === 'continue') { evidence.continueStartedAt = new Date().toISOString(); await save(); }
if (mode === 'block') { evidence.blockAttemptStartedAt = new Date().toISOString(); await save(); }
function assert(value, message) { if (!value) throw new Error(message); }
async function check(name, action) {
  try { await action(); evidence.checks.push({ name, mode, result: 'PASS' }); console.log(`PASS ${name}`); }
  catch { evidence.checks.push({ name, mode, result: 'FAIL' }); console.log(`FAIL ${name}; sanitized evidence only, no automatic replay`); throw new Error(`Stopped check: ${name}`); }
  finally { await save(); }
}
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, timezoneId: 'Asia/Ho_Chi_Minh', locale: 'vi-VN' });
const page = await context.newPage();
page.setDefaultTimeout(15000);
let accessToken;
page.on('response', response => {
  const url = new URL(response.url());
  if (url.origin === 'http://127.0.0.1:3000' && url.pathname.startsWith('/api/v1/')) {
    evidence.http.push({ source: 'browser', method: response.request().method(), path: url.pathname + url.search, status: response.status() });
  }
});
async function api(method, resource, expected, body, authenticated = true, origin = 'http://127.0.0.1:3000') {
  assert(['http://127.0.0.1:3000', 'http://127.0.0.1:8080'].includes(origin), 'Nonlocal origin rejected.');
  const response = await context.request.fetch(origin + resource, {
    method, headers: { ...(authenticated ? { Authorization: `Bearer ${accessToken}` } : {}), Accept: 'application/json' },
    ...(body === undefined ? {} : { data: body }), timeout: 15000, maxRetries: 0,
  });
  evidence.http.push({ source: 'real-api-probe', method, path: resource, status: response.status(), origin });
  assert(response.status() === expected, 'Unexpected real HTTP status.');
  if (resource.includes('/admin/staff') || expected === 403) assert(response.headers()['cache-control']?.includes('no-store'), 'Missing no-store.');
  return expected < 300 ? response.json() : undefined;
}
function waitResponse(method, resource) { return page.waitForResponse(response => response.request().method() === method && new URL(response.url()).pathname === resource); }
async function screenshot(name) {
  assert(!page.url().includes('/login') && !page.url().includes('#'), 'Unsafe screenshot destination.');
  await page.screenshot({ path: path.join(evidenceRoot, name + '.png'), fullPage: true });
  evidence.screenshots.push(name + '.png'); await save();
}
async function dialogKeyboard() {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (let index = 0; index < 9; index++) {
    await page.keyboard.press(index % 3 === 0 ? 'Shift+Tab' : 'Tab');
    assert(await dialog.evaluate(element => element.contains(document.activeElement)), 'Dialog focus escaped.');
  }
}
async function overflow() { assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal document overflow.'); }
async function openDetail() {
  await page.goto(`http://127.0.0.1:3000/admin/staff/${evidence.staff.id}`);
  await expect(page.getByRole('heading', { level: 1, name: evidence.staff.fullName })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Kích hoạt tài khoản', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Khóa tài khoản', exact: true })).toBeDisabled();
}
try {
  await check('Real anonymous Staff API 401 direct and proxied', async () => {
    await api('GET', '/api/v1/admin/staff?page=0&size=20', 401, undefined, false);
    await api('GET', '/api/v1/admin/staff?page=0&size=20', 401, undefined, false, 'http://127.0.0.1:8080');
  });
  await check('Real frontend ADMIN login and protected navigation', async () => {
    const credentialText = await readFile(path.join(repositoryRoot, 'backend/.env.local-test-admin'), 'utf8');
    const credentials = Object.fromEntries(credentialText.trim().split(/\r?\n/).map(line => { const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)]; }));
    assert(credentials.DEV_ADMIN_EMAIL.endsWith('@example.test'), 'Synthetic identity required.');
    await page.goto('http://127.0.0.1:3000/login');
    await page.getByLabel('Địa chỉ email', { exact: true }).fill(credentials.DEV_ADMIN_EMAIL);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(credentials.DEV_ADMIN_PASSWORD);
    const responsePromise = waitResponse('POST', '/api/v1/auth/tokens');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    const response = await responsePromise;
    assert(response.status() === 200, 'Login rejected.');
    const session = await response.json();
    assert(session.role === 'ADMIN' && typeof session.accessToken === 'string', 'Real ADMIN session required.');
    accessToken = session.accessToken; // Only in process memory; never serialize session or token.
    await page.waitForURL('**/admin');
    await page.getByRole('link', { name: 'Nhân viên', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Quản lý nhân viên', exact: true })).toBeVisible();
  });
  await check('ADMIN denied Staff operational API 403', async () => { await api('GET', '/api/v1/staff/cinema-assignments', 403); });
  if (mode === 'block') {
    await check('Supported BLOCKED status 200 revokes invitation and preserves assignments', async () => {
      const before = await api('GET', `/api/v1/admin/staff/${evidence.staff.id}`, 200);
      const assignments = await api('GET', `/api/v1/admin/staff/${evidence.staff.id}/cinema-assignments`, 200);
      assert(before.status === 'BLOCKED' && !before.passwordSetupCompleted && before.deliveryStatus === 'QUEUED', 'Unexpected state; no status write.');
      const blocked = await api('PUT', `/api/v1/admin/staff/${evidence.staff.id}/status`, 200, { status: 'BLOCKED' });
      assert(blocked.status === 'BLOCKED' && !blocked.passwordSetupCompleted && blocked.deliveryStatus === 'REVOKED', 'Block projection differs.');
      const persisted = await api('GET', `/api/v1/admin/staff/${evidence.staff.id}`, 200);
      const history = await api('GET', `/api/v1/admin/staff/${evidence.staff.id}/cinema-assignments`, 200);
      assert(persisted.deliveryStatus === 'REVOKED' && JSON.stringify(history) === JSON.stringify(assignments), 'History or revocation not persisted.');
      evidence.staff = persisted; await save();
      await openDetail();
      await expect(page.getByText('Lời mời đã thu hồi', { exact: true })).toBeVisible();
      await screenshot('blocked-revoked-persisted-1440');
    });
  } else {
  const staffContent = mode === 'write' ? { fullName: 'Phase4E Nhân viên Test ' + randomUUID().slice(0, 8), email: 'phase4e-staff-' + randomUUID() + '@example.test', phone: '+84910000003' } : { fullName: evidence.staff.fullName, email: evidence.staff.email, phone: evidence.staff.phone };
  if (mode === 'write') {
    await check('Empty Staff inventory and pagination before creation', async () => {
      await expect(page.getByText('Chưa có nhân viên trên trang này', { exact: true })).toBeVisible();
      assert((await api('GET', '/api/v1/admin/staff?page=0&size=20', 200)).length === 0, 'Unexpected prior Staff data.');
      await screenshot('empty-list-1440');
    });
    await check('Synthetic ACTIVE Cinema via supported ADMIN service', async () => {
      assert((await api('GET', '/api/v1/admin/cinemas', 200)).length === 0, 'Unexpected existing Cinema; no blind create.');
      evidence.cinema = await api('POST', '/api/v1/admin/cinemas', 201, { name: 'Phase4E Local Test Cinema ' + randomUUID().slice(0, 8), address: 'Địa chỉ tổng hợp chỉ dành cho kiểm thử local', contact: '0910000002', operatingInformation: 'Dữ liệu kiểm thử tổng hợp', status: 'ACTIVE' });
      assert(typeof evidence.cinema.id === 'string' && /^[1-9][0-9]*$/.test(evidence.cinema.id), 'Cinema ID invalid.');
      await save();
    });
    await check('Create dialog keyboard and invalid-phone inline feedback without POST', async () => {
      await page.getByRole('button', { name: '+ Tạo nhân viên', exact: true }).click();
      await dialogKeyboard();
      await page.getByLabel('Họ và tên *', { exact: true }).fill(staffContent.fullName);
      await page.getByLabel('Email *', { exact: true }).fill(staffContent.email);
      await page.getByLabel('Số điện thoại *', { exact: true }).fill('123');
      const before = evidence.http.filter(r => r.method === 'POST' && r.path === '/api/v1/admin/staff').length;
      await page.getByRole('button', { name: 'Tạo nhân viên', exact: true }).click();
      await expect(page.getByLabel('Số điện thoại *', { exact: true })).toHaveAttribute('aria-invalid', 'true');
      assert(evidence.http.filter(r => r.method === 'POST' && r.path === '/api/v1/admin/staff').length === before, 'Invalid input sent.');
      await screenshot('invalid-phone-create-1440');
    });
    await check('Browser Create Staff 201 BLOCKED incomplete QUEUED and GET persistence', async () => {
      await page.getByLabel('Số điện thoại *', { exact: true }).fill(staffContent.phone);
      const promise = waitResponse('POST', '/api/v1/admin/staff');
      await page.getByRole('button', { name: 'Tạo nhân viên', exact: true }).click();
      const response = await promise;
      assert(response.status() === 201, 'Create failed; no replay.');
      evidence.staff = await response.json(); await save();
      assert(typeof evidence.staff.id === 'string' && /^[1-9][0-9]*$/.test(evidence.staff.id), 'Staff ID invalid.');
      assert(evidence.staff.status === 'BLOCKED' && !evidence.staff.passwordSetupCompleted && evidence.staff.deliveryStatus === 'QUEUED' && evidence.staff.deliveryAttempts === 0, 'Create projection invalid.');
      const persisted = await api('GET', `/api/v1/admin/staff/${evidence.staff.id}`, 200);
      assert(persisted.id === evidence.staff.id && persisted.email === staffContent.email && persisted.phone === staffContent.phone, 'Persisted identity differs.');
      await expect(page.getByRole('link', { name: 'Xem nhân viên vừa tạo' })).toBeVisible();
      await screenshot('created-success-1440');
      await page.getByRole('link', { name: 'Xem nhân viên vừa tạo' }).click();
      await expect(page.getByRole('heading', { level: 1, name: evidence.staff.fullName })).toBeVisible();
    });
  }
  if (mode === 'continue') {
    await check('Known created Staff recovery correct +84 normalization without create replay', async () => {
      assert(evidence.http.filter(row => row.method === 'POST' && row.path === '/api/v1/admin/staff' && row.status === 201).length === 1, 'One successful creation required.');
      const persisted = await api('GET', `/api/v1/admin/staff/${evidence.staff.id}`, 200);
      assert(persisted.id === evidence.staff.id && persisted.email === staffContent.email && persisted.phone === staffContent.phone && persisted.status === 'BLOCKED' && !persisted.passwordSetupCompleted, 'Owned persisted Staff differs.');
      await openDetail(); await screenshot('created-persisted-detail-1440');
    });
  }
  if (mode !== 'read') {
    await check('Activation before setup 409 and unchanged BLOCKED persisted', async () => {
      await expect(page.getByRole('button', { name: 'Kích hoạt tài khoản', exact: true })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Khóa tài khoản', exact: true })).toBeDisabled();
      await api('PUT', `/api/v1/admin/staff/${evidence.staff.id}/status`, 409, { status: 'ACTIVE' });
      const account = await api('GET', `/api/v1/admin/staff/${evidence.staff.id}`, 200);
      assert(account.status === 'BLOCKED' && account.passwordSetupCompleted === false, 'Activation gate bypassed.');
      assert((await api('GET', `/api/v1/admin/staff/${evidence.staff.id}/cinema-assignments`, 200)).length === 0, 'Unexpected assignment.');
    });
    await check('Browser reissue invitation 200 and truthful queue projection', async () => {
      const oldExpiry = evidence.staff.invitationExpiresAt;
      await page.getByRole('button', { name: 'Cấp lại lời mời', exact: true }).click();
      await dialogKeyboard(); await screenshot('reissue-dialog-1440');
      const promise = waitResponse('POST', `/api/v1/admin/staff/${evidence.staff.id}/invitations`);
      await page.getByRole('button', { name: 'Xác nhận cấp lại lời mời', exact: true }).click();
      const response = await promise; assert(response.status() === 200, 'Reissue failed; no replay.');
      evidence.staff = await response.json(); await save();
      assert(evidence.staff.invitationExpiresAt !== oldExpiry && evidence.staff.deliveryStatus === 'QUEUED' && evidence.staff.deliveryAttempts === 0, 'Reissue projection invalid.');
      await expect(page.getByText('Đã phát hành lời mời mới.', { exact: false })).toBeVisible();
    });
    await check('Browser future assignment 201 and immutable UTC persistence', async () => {
      await page.getByRole('button', { name: '+ Thêm phân công', exact: true }).click();
      await page.getByLabel('Rạp chiếu phim *', { exact: true }).selectOption(evidence.cinema.id);
      const utcMilliseconds = Math.ceil((Date.now() + 7 * 86400000) / 60000) * 60000;
      evidence.expectedEffectiveAt = new Date(utcMilliseconds).toISOString(); await save();
      await page.getByLabel('Thời điểm có hiệu lực *', { exact: true }).fill(new Date(utcMilliseconds + 7 * 3600000).toISOString().slice(0, 16));
      await dialogKeyboard(); await screenshot('add-assignment-dialog-1440');
      const promise = waitResponse('POST', `/api/v1/admin/staff/${evidence.staff.id}/cinema-assignments`);
      await page.getByRole('button', { name: 'Xác nhận phân công', exact: true }).click();
      const response = await promise; assert(response.status() === 201, 'Assignment failed; no replay.');
      evidence.assignment = await response.json(); await save();
      assert(evidence.assignment.userId === evidence.staff.id && evidence.assignment.cinemaId === evidence.cinema.id && evidence.assignment.status === 'ACTIVE' && Date.parse(evidence.assignment.effectiveAt) === utcMilliseconds, 'Assignment identity/time differs.');
      await expect(page.getByText('Hiệu lực từ ngày sắp tới', { exact: true })).toBeVisible();
    });
    for (const transition of [{ trigger: 'Ngừng phân công', submit: 'Xác nhận ngừng phân công', status: 'INACTIVE' }, { trigger: 'Kích hoạt lại phân công', submit: 'Xác nhận kích hoạt lại phân công', status: 'ACTIVE' }]) {
      await check(`Browser assignment ${transition.status} 200 preserves history and effectiveAt`, async () => {
        await page.getByRole('button', { name: transition.trigger, exact: true }).click();
        await dialogKeyboard(); await screenshot(`assignment-${transition.status.toLowerCase()}-dialog-1440`);
        const promise = waitResponse('PUT', `/api/v1/admin/staff/${evidence.staff.id}/cinema-assignments/${evidence.assignment.id}/status`);
        await page.getByRole('button', { name: transition.submit, exact: true }).click();
        const response = await promise; assert(response.status() === 200, 'Assignment transition failed; no replay.');
        const assignment = await response.json();
        assert(assignment.id === evidence.assignment.id && assignment.status === transition.status && assignment.effectiveAt === evidence.assignment.effectiveAt, 'Immutable time/history changed.');
        const persisted = await api('GET', `/api/v1/admin/staff/${evidence.staff.id}/cinema-assignments`, 200);
        assert(persisted.length === 1 && persisted[0].id === assignment.id && persisted[0].status === transition.status && persisted[0].effectiveAt === assignment.effectiveAt, 'History not retained.');
        await expect(page.getByRole('button', { name: transition.status === 'ACTIVE' ? 'Ngừng phân công' : 'Kích hoạt lại phân công', exact: true })).toBeVisible();
      });
    }
    await check('Duplicate ACTIVE assignment 409 leaves same history', async () => {
      await api('POST', `/api/v1/admin/staff/${evidence.staff.id}/cinema-assignments`, 409, { cinemaId: evidence.cinema.id, effectiveAt: evidence.expectedEffectiveAt });
      const assignments = await api('GET', `/api/v1/admin/staff/${evidence.staff.id}/cinema-assignments`, 200);
      assert(assignments.length === 1 && assignments[0].id === evidence.assignment.id, 'Duplicate changed history.');
    });
    await check('Backend invalid phone 400 creates no additional Staff', async () => {
      await api('POST', '/api/v1/admin/staff', 400, { ...staffContent, email: 'invalid-' + randomUUID() + '@example.test', phone: '123' });
      assert((await api('GET', '/api/v1/admin/staff?page=0&size=20', 200)).length === 1, 'Invalid Staff persisted.');
    });
    await check('Browser duplicate email 409 with safe review feedback', async () => {
      await page.goto('http://127.0.0.1:3000/admin/staff');
      await page.getByRole('button', { name: '+ Tạo nhân viên', exact: true }).click();
      await page.getByLabel('Họ và tên *', { exact: true }).fill(staffContent.fullName);
      await page.getByLabel('Email *', { exact: true }).fill(staffContent.email);
      await page.getByLabel('Số điện thoại *', { exact: true }).fill(staffContent.phone);
      const promise = waitResponse('POST', '/api/v1/admin/staff');
      await page.getByRole('button', { name: 'Tạo nhân viên', exact: true }).click();
      assert((await promise).status() === 409, 'Duplicate email not rejected.');
      await expect(page.getByRole('dialog').getByRole('alert').first()).toBeVisible();
      await screenshot('duplicate-email-review-1440');
      await page.getByRole('button', { name: 'Hủy', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Cần kiểm tra lại trạng thái' })).toBeVisible();
      await page.getByRole('button', { name: 'Kiểm tra lại trạng thái', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Đã kiểm tra, tiếp tục' })).toBeEnabled();
      await page.getByRole('button', { name: 'Đã kiểm tra, tiếp tục' }).click();
    });
  }
  await check('Canonical invalid IDs 400 and absent canonical ID 404', async () => {
    for (const id of ['0', '001', '9223372036854775808']) await api('GET', `/api/v1/admin/staff/${id}`, 400);
    await api('GET', '/api/v1/admin/staff/9223372036854775807', 404);
    await page.goto('http://127.0.0.1:3000/admin/staff/001');
    await expect(page.getByText('Mã nhân viên không hợp lệ', { exact: true })).toBeVisible();
  });
  await check('Real pagination page1 empty previous page and page0 persisted Staff', async () => {
    const first = await api('GET', '/api/v1/admin/staff?page=0&size=1', 200);
    const second = await api('GET', '/api/v1/admin/staff?page=1&size=1', 200);
    assert(first.length === 1 && first[0].id === evidence.staff.id && second.length === 0, 'Pagination differs.');
    await page.goto('http://127.0.0.1:3000/admin/staff?page=1');
    await expect(page.getByText('Chưa có nhân viên trên trang này', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Trang trước', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Xem chi tiết', exact: true }).filter({ visible: true })).toBeVisible();
  });
  await check('Known Staff direct entry reload persisted account assignment', async () => {
    await openDetail(); await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: evidence.staff.fullName })).toBeVisible();
    await expect(page.getByText('Hiệu lực từ ngày sắp tới', { exact: true })).toBeVisible();
  });
  if (evidence.staff.deliveryStatus === 'REVOKED') {
    await check('Read-only recovery confirms BLOCKED REVOKED UI and unchanged assignment', async () => {
      const account = await api('GET', `/api/v1/admin/staff/${evidence.staff.id}`, 200);
      const assignments = await api('GET', `/api/v1/admin/staff/${evidence.staff.id}/cinema-assignments`, 200);
      assert(account.status === 'BLOCKED' && !account.passwordSetupCompleted && account.deliveryStatus === 'REVOKED', 'Revoked account projection differs.');
      assert(assignments.length === 1 && assignments[0].id === evidence.assignment.id && assignments[0].status === 'ACTIVE' && assignments[0].effectiveAt === evidence.assignment.effectiveAt, 'Assignment history differs.');
      await expect(page.getByText('Lời mời đã thu hồi', { exact: true })).toBeVisible();
      await screenshot('blocked-revoked-persisted-1440');
    });
  }
  await check('Real network latency loading feedback and offline GET error safe recovery', async () => {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 1500, downloadThroughput: -1, uploadThroughput: -1 });
    await page.getByRole('button', { name: 'Tải lại thông tin', exact: true }).click();
    await expect(page.getByText('Đang tải thông tin nhân viên…', { exact: true })).toBeVisible();
    await screenshot('actual-loading-1440');
    await expect(page.getByRole('heading', { level: 1, name: evidence.staff.fullName })).toBeVisible();
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Tải lại thông tin', exact: true }).click();
    await expect(page.getByText('Không thể tải thông tin', { exact: true })).toBeVisible();
    await screenshot('actual-offline-read-error-1440');
    await context.setOffline(false);
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: evidence.staff.fullName })).toBeVisible();
  });
  for (const width of [390, 768, 1440]) {
    await check(`Real responsive List Detail dialogs keyboard overflow ${width}px`, async () => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('http://127.0.0.1:3000/admin/staff');
      await expect(page.getByRole('link', { name: 'Xem chi tiết', exact: true }).filter({ visible: true })).toBeVisible();
      await overflow(); await screenshot(`list-${width}`);
      await page.getByRole('button', { name: '+ Tạo nhân viên', exact: true }).click();
      await dialogKeyboard(); await overflow(); await screenshot(`create-dialog-${width}`);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: '+ Tạo nhân viên', exact: true })).toBeFocused();
      await page.getByRole('link', { name: 'Xem chi tiết', exact: true }).filter({ visible: true }).click();
      await expect(page.getByRole('heading', { level: 1, name: evidence.staff.fullName })).toBeVisible();
      await overflow(); await screenshot(`detail-${width}`);
      for (const dialog of [{ trigger: 'Cấp lại lời mời', name: 'reissue' }, { trigger: '+ Thêm phân công', name: 'add' }, { trigger: 'Ngừng phân công', name: 'deactivate' }]) {
        await page.getByRole('button', { name: dialog.trigger, exact: true }).click();
        if (dialog.name === 'add') await expect(page.getByLabel('Rạp chiếu phim *', { exact: true })).toBeVisible();
        await dialogKeyboard(); await overflow(); await screenshot(`${dialog.name}-dialog-${width}`);
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: dialog.trigger, exact: true })).toBeFocused();
      }
    });
  }
  }
  evidence.finishedAt = new Date().toISOString();
  await save();
  console.log(`EVIDENCE ${evidence.checks.filter(c => c.result === 'PASS').length} PASS; ${evidence.checks.filter(c => c.result === 'FAIL').length} FAIL; ${evidence.screenshots.length} safe screenshots`);
} catch {
  process.exitCode = 1;
  console.log('Workflow stopped; inspect known IDs using read mode, never replay write mode.');
} finally { await context.setOffline(false); await save(); await browser.close(); }
