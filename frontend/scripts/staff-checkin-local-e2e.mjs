// Real Phase 4F negative integration only. No API fixtures, financial simulator or session injection.
import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const frontendRoot = fileURLToPath(new URL('../', import.meta.url));
const repositoryRoot = path.dirname(frontendRoot);
const evidenceRoot = path.join(frontendRoot, 'target/staff-qr-checkin-real-local-2026-10-15');
if (process.argv[2] !== 'negative') throw new Error('Explicit negative mode required; positive issuance is blocked.');
execFileSync(path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe'), ['-NoProfile', '-File', path.join(repositoryRoot, 'backend/scripts/local-test-environment.ps1'), '-Action', 'Verify'], { cwd: repositoryRoot, stdio: 'inherit' });
await mkdir(evidenceRoot, { recursive: true });
const evidence = { startedAt: new Date().toISOString(), mode: 'real-local-negative-only', checks: [], http: [], screenshots: [], externalHosts: [], positiveCheckIn: 'BLOCKED: no approved local verified-payment mechanism or issued Ticket' };
const journal = path.join(evidenceRoot, 'results.json');
// Authentication creates a normal session. Never silently replay a previous execution.
await writeFile(journal, JSON.stringify(evidence, null, 2), { flag: 'wx' });
const save = () => writeFile(journal, JSON.stringify(evidence, null, 2));
function assert(value) { if (!value) throw new Error('Sanitized assertion failed.'); }
async function check(name, action) {
  try { await action(); evidence.checks.push({ name, result: 'PASS' }); console.log(`PASS ${name}`); }
  catch { evidence.checks.push({ name, result: 'FAIL' }); console.log(`FAIL ${name}; details withheld; no automatic replay`); throw new Error('Stopped safely.'); }
  finally { await save(); }
}
function credentials(text) { return Object.fromEntries(text.trim().split(/\r?\n/).map(line => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)]; })); }
const adminInput = credentials(await readFile(path.join(repositoryRoot, 'backend/.env.local-test-admin'), 'utf8'));
const staffInput = credentials(await readFile(path.join(repositoryRoot, 'backend/.env.local-test-staff'), 'utf8'));
assert(adminInput.DEV_ADMIN_EMAIL.endsWith('@example.test') && staffInput.STAFF_EMAIL.endsWith('@example.test') && staffInput.STAFF_ID === '2');
const browser = await chromium.launch({ channel: 'msedge' });
const options = { viewport: { width: 1440, height: 1000 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' };
const adminContext = await browser.newContext(options), publicContext = await browser.newContext(options);
const admin = await adminContext.newPage(), publicPage = await publicContext.newPage();
let adminToken;
for (const page of [admin, publicPage]) {
  page.setDefaultTimeout(20000);
  page.on('request', request => { const url = new URL(request.url()); if (['http:', 'https:'].includes(url.protocol) && url.hostname !== '127.0.0.1' && !evidence.externalHosts.includes(url.hostname)) evidence.externalHosts.push(url.hostname); });
  page.on('response', response => { const url = new URL(response.url()); if (url.hostname === '127.0.0.1' && url.pathname.startsWith('/api/v1/')) evidence.http.push({ source: 'browser', method: response.request().method(), path: url.pathname, status: response.status() }); });
}
async function api(method, resource, expected, body, token, origin = 'http://127.0.0.1:3000') {
  assert(['http://127.0.0.1:3000', 'http://127.0.0.1:8080'].includes(origin));
  const response = await adminContext.request.fetch(origin + resource, { method, headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { data: body }), maxRetries: 0, maxRedirects: 0, timeout: 15000 });
  evidence.http.push({ source: 'real-api-probe', origin, method, path: resource, status: response.status() });
  assert(response.status() === expected);
  if (resource.startsWith('/api/v1/staff/') || resource.startsWith('/api/v1/admin/staff')) assert(response.headers()['cache-control']?.includes('no-store'));
  return expected === 200 ? response.json() : undefined;
}
const sentinel = '9223372036854775807'; // Known absent; authorization probes, never a claimed Booking/Ticket.
const operations = [
  ['GET', '/api/v1/staff/cinema-assignments', undefined],
  ['POST', '/api/v1/staff/booking-qr-resolutions', { cinemaId: '1', bookingQr: 'phase4f-negative-non-issued-input' }],
  ['GET', `/api/v1/staff/bookings/${sentinel}?cinemaId=1`, undefined],
  ['POST', `/api/v1/staff/bookings/${sentinel}/check-ins`, { cinemaId: '1', ticketIds: [sentinel] }],
];
async function login(page, email, password, status) {
  await page.goto('http://127.0.0.1:3000/login');
  await page.getByLabel('Địa chỉ email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  const pending = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/auth/tokens');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const response = await pending; assert(response.status() === status);
  // Existing auth DTO serializes userId as a number; no admission ID is derived from it.
  if (status === 200) { const result = await response.json(); assert(result.role === 'ADMIN' && result.userId === 1); return result.accessToken; }
}
async function responsive(page, prefix, heading) {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert(!new URL(page.url()).search && !new URL(page.url()).hash && !page.url().includes('/login'));
    assert(await page.locator('input').evaluateAll(inputs => inputs.every(input => !input.value)));
    const filename = `${prefix}-${width}.png`;
    await page.screenshot({ path: path.join(evidenceRoot, filename), fullPage: true }); evidence.screenshots.push(filename);
  }
}
try {
  await check('Real backend and frontend rewrite public reads agree', async () => {
    const direct = await api('GET', '/api/v1/cinemas', 200, undefined, undefined, 'http://127.0.0.1:8080');
    const proxied = await api('GET', '/api/v1/cinemas', 200);
    assert(direct.length === 1 && direct[0].id === '1' && JSON.stringify(direct) === JSON.stringify(proxied));
  });
  await check('Anonymous four operational endpoints denied401 direct and rewrite', async () => {
    for (const origin of ['http://127.0.0.1:8080', 'http://127.0.0.1:3000']) for (const [method, resource, body] of operations) await api(method, resource, 401, body, undefined, origin);
  });
  await check('Anonymous real workspace guard responsive and keyboard login resume', async () => {
    await publicPage.goto('http://127.0.0.1:3000/staff/check-in');
    await responsive(publicPage, 'anonymous-staff-guard', 'Cần đăng nhập');
    const link = publicPage.getByRole('link', { name: 'Đăng nhập nhân viên', exact: true });
    await publicPage.keyboard.press('Tab'); await link.focus(); await expect(link).toBeFocused();
    assert(await link.evaluate(element => getComputedStyle(element).outlineStyle !== 'none'));
    await publicPage.keyboard.press('Enter'); await publicPage.waitForURL('**/login?returnTo=%2Fstaff%2Fcheck-in');
    await expect(publicPage.getByLabel('Địa chỉ email', { exact: true })).toBeVisible();
  });
  await check('Actual ADMIN UI login and persisted synthetic Staff identity', async () => {
    adminToken = await login(admin, adminInput.DEV_ADMIN_EMAIL, adminInput.DEV_ADMIN_PASSWORD, 200);
    const account = await api('GET', '/api/v1/admin/staff/2', 200, undefined, adminToken);
    const assignments = await api('GET', '/api/v1/admin/staff/2/cinema-assignments', 200, undefined, adminToken);
    assert(account.id === '2' && account.email === staffInput.STAFF_EMAIL && account.status === 'BLOCKED' && account.passwordSetupCompleted);
    assert(assignments.length === 1 && assignments[0].id === '1' && assignments[0].cinemaId === '1' && assignments[0].status === 'ACTIVE' && assignments[0].effectiveAt === '2026-10-21T18:24:00Z');
    evidence.staff = { id: account.id, status: account.status, passwordSetupCompleted: account.passwordSetupCompleted, assignmentId: assignments[0].id, effectiveAt: assignments[0].effectiveAt };
  });
  await check('ADMIN cannot act as STAFF four endpoints denied403 direct and rewrite', async () => {
    for (const origin of ['http://127.0.0.1:8080', 'http://127.0.0.1:3000']) for (const [method, resource, body] of operations) await api(method, resource, 403, body, adminToken, origin);
  });
  await check('Real ADMIN workspace denial responsive without scanner', async () => {
    await admin.goto('http://127.0.0.1:3000/staff/check-in');
    await responsive(admin, 'admin-staff-role-denied', 'Cần tài khoản nhân viên');
    await expect(admin.locator('#staff-cinema')).toHaveCount(0);
    const link = admin.getByRole('link', { name: 'Quay về khu vực của bạn', exact: true });
    await link.focus(); await expect(link).toBeFocused();
    await admin.keyboard.press('Enter'); await admin.waitForURL('**/admin');
  });
  await check('Real BLOCKED STAFF credentials rejected401 without session creation', async () => {
    await login(publicPage, staffInput.STAFF_EMAIL, staffInput.STAFF_PASSWORD, 401);
    await expect(publicPage.getByRole('status')).toContainText('Email hoặc mật khẩu không đúng.');
    await publicPage.getByLabel('Địa chỉ email', { exact: true }).fill('');
    await publicPage.getByLabel('Mật khẩu', { exact: true }).fill('');
    await publicPage.goto('http://127.0.0.1:3000/staff/check-in');
    await expect(publicPage.getByRole('heading', { name: 'Cần đăng nhập', exact: true })).toBeVisible();
  });
  await check('No Staff mutation or external browser request; final owned state preserved', async () => {
    const account = await api('GET', '/api/v1/admin/staff/2', 200, undefined, adminToken);
    assert(account.status === 'BLOCKED' && account.passwordSetupCompleted);
    assert(evidence.externalHosts.length === 0);
    assert(evidence.http.every(row => row.method === 'GET' || row.path === '/api/v1/auth/tokens' || (row.path.startsWith('/api/v1/staff/') && [401, 403].includes(row.status))));
  });
} finally {
  await browser.close(); evidence.finishedAt = new Date().toISOString(); await save();
  console.log(`RESULT ${evidence.checks.filter(row => row.result === 'PASS').length} PASS; ${evidence.checks.filter(row => row.result === 'FAIL').length} FAIL; ${evidence.screenshots.length} screenshots`);
}
