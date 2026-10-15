// Real local onboarding. Never serialize sessions, passwords, MIME or invitation URLs.
import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { X509Certificate, createHash, randomBytes } from 'node:crypto';
import https from 'node:https';
import { execFileSync } from 'node:child_process';

const frontendRoot = fileURLToPath(new URL('../', import.meta.url));
const repositoryRoot = path.dirname(frontendRoot);
const evidenceRoot = path.join(frontendRoot, 'target/staff-onboarding-local-e2e-2026-10-15');
const privateRoot = path.join(repositoryRoot, 'backend/target/staff-onboarding-local-e2e-2026-10-15/private');
const journalPath = path.join(evidenceRoot, 'results.json');
const staffCredentialPath = path.join(repositoryRoot, 'backend/.env.local-test-staff');
const mode = process.argv[2];
if (!['run', 'resume-preflight', 'resume-delivered'].includes(mode)) throw new Error('Explicit phase required; no default retry.');
const powershell = path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
execFileSync(powershell, ['-NoProfile', '-File', path.join(repositoryRoot, 'backend/scripts/local-staff-onboarding.ps1'), '-Action', 'Verify'], { cwd: repositoryRoot, stdio: 'inherit' });
await mkdir(evidenceRoot, { recursive: true });
let evidence;
try { evidence = JSON.parse(await readFile(journalPath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (mode === 'run' && evidence) throw new Error('One-shot onboarding already started; inspect state instead of replaying.');
if (mode === 'resume-preflight') {
  if (!evidence || evidence.preflightRecoveryStarted || evidence.reissueAttemptStarted || evidence.passwordSetupAttemptStarted || evidence.http.some(row => row.method !== 'GET')) throw new Error('Preflight-only recovery refused: possible mutation history.');
  evidence.preflightRecoveryStarted = true;
  evidence.infrastructureCorrection = 'HTTPS certificate validation passed; Next dev hydration needed WebSocket upgrade forwarding. Initial phase stopped before all mutations.';
}
if (mode === 'resume-delivered') {
  if (!evidence?.capture || !evidence.reissueAttemptStarted || evidence.passwordSetupAttemptStarted || evidence.http.some(row => row.path === '/api/v1/staff/password-setups')) throw new Error('Delivered recovery refused: possible password mutation history.');
  evidence.deliveredRecoveryStarted = true;
  evidence.deliveredRecoveryRuns = (evidence.deliveredRecoveryRuns ?? 0) + 1;
  evidence.activationHeaderCorrection = 'Next dev omitted no-store; loopback proxy now enforces activation no-store/no-referrer. Reuse captured delivered link, never reissue.';
}
evidence ??= { startedAt: new Date().toISOString(), checks: [], http: [], screenshots: [], database: '127.0.0.1:5432/smartcinema_phase4e_test' };
const save = () => writeFile(journalPath, JSON.stringify(evidence, null, 2));
await save();
function assert(value) { if (!value) throw new Error('Sanitized assertion failed.'); }
async function check(name, action) {
  try { await action(); evidence.checks.push({ name, result: 'PASS' }); console.log(`PASS ${name}`); }
  catch { evidence.checks.push({ name, result: 'FAIL' }); console.log(`FAIL ${name}; no mutation replay, exception details withheld`); throw new Error('Stopped safely.'); }
  finally { await save(); }
}
const certificatePem = await readFile(path.join(privateRoot, 'tls-cert.pem'));
const certificate = new X509Certificate(certificatePem);
const spki = createHash('sha256').update(certificate.publicKey.export({ type: 'spki', format: 'der' })).digest('base64');
assert(certificate.checkIP('127.0.0.1') === '127.0.0.1');
const browser = await chromium.launch({ channel: 'msedge', args: [`--ignore-certificate-errors-spki-list=${spki}`] });
const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
const publicContext = await browser.newContext({ viewport: { width: 390, height: 1000 }, locale: 'vi-VN' });
const staffContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'vi-VN' });
const admin = await adminContext.newPage(), activation = await publicContext.newPage(), staffPage = await staffContext.newPage();
let adminToken, staffToken, invitationLink, invitationToken, staffPassword;
const setupRequests = [];
for (const page of [admin, activation, staffPage]) {
  page.setDefaultTimeout(15000);
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.hostname === '127.0.0.1' && url.pathname.startsWith('/api/v1/')) evidence.http.push({ source: 'browser', method: response.request().method(), path: url.pathname, status: response.status() });
  });
}
activation.on('request', request => {
  if (new URL(request.url()).pathname === '/api/v1/staff/password-setups') {
    const headers = request.headers();
    setupRequests.push({ method: request.method(), noQuery: !new URL(request.url()).search, noAuthorization: !headers.authorization, noCookie: !headers.cookie, noReferrer: !headers.referer });
  }
});
async function api(method, resource, expected, body, token = adminToken) {
  const response = await adminContext.request.fetch('http://127.0.0.1:3000' + resource, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), Accept: 'application/json' }, ...(body === undefined ? {} : { data: body }), maxRetries: 0, timeout: 15000 });
  evidence.http.push({ source: 'real-api-probe', method, path: resource, status: response.status() });
  assert(response.status() === expected);
  if (resource.startsWith('/api/v1/admin/staff') || resource.startsWith('/api/v1/staff/')) assert(response.headers()['cache-control']?.includes('no-store'));
  return expected < 300 ? response.json() : undefined;
}
function waitResponse(page, method, resource) { return page.waitForResponse(response => response.request().method() === method && new URL(response.url()).pathname === resource); }
async function screenshot(page, name) {
  assert(!page.url().includes('/login') && !new URL(page.url()).hash && !new URL(page.url()).search);
  assert(await page.locator('input[type="password"]').evaluateAll(inputs => inputs.every(input => input.value === '')));
  const text = await page.locator('body').innerText();
  assert(!invitationToken || !text.includes(invitationToken)); assert(!staffPassword || !text.includes(staffPassword));
  await page.screenshot({ path: path.join(evidenceRoot, name + '.png'), fullPage: true });
  evidence.screenshots.push(name + '.png'); await save();
}
async function overflow(page) { assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); }
async function dialogKeyboard(page) {
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  for (let index = 0; index < 7; index++) { await page.keyboard.press(index % 2 ? 'Tab' : 'Shift+Tab'); assert(await dialog.evaluate(element => element.contains(document.activeElement))); }
}
async function login(page, origin, email, password, expected, role) {
  await page.goto(origin + '/login');
  await page.getByLabel('Địa chỉ email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  const promise = waitResponse(page, 'POST', '/api/v1/auth/tokens');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const response = await promise; assert(response.status() === expected);
  if (expected !== 200) return;
  const session = await response.json(); assert(session.role === role && typeof session.accessToken === 'string');
  return session.accessToken;
}
async function privateActivationSurface() {
  assert(activation.url() === 'https://127.0.0.1:8443/staff/activate');
  await expect(activation.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
  assert(!await activation.evaluate(token => Object.values(localStorage).concat(Object.values(sessionStorage), JSON.stringify(history.state)).some(value => value.includes(token)), invitationToken));
  assert(!(await activation.content()).includes(invitationToken));
}
try {
  await check('Loopback HTTPS certificate validated without global TLS bypass', async () => {
    await new Promise((resolve, reject) => {
      const request = https.get('https://127.0.0.1:8443/staff/activate', { ca: certificatePem, rejectUnauthorized: true }, response => { try { assert(response.statusCode === 200 && response.socket.authorized); response.resume(); response.on('end', resolve); } catch { reject(new Error('Local TLS verification failed.')); } });
      request.on('error', () => reject(new Error('Local HTTPS unavailable.')));
    });
    const response = await activation.goto('https://127.0.0.1:8443/staff/activate');
    assert(response.status() === 200 && response.headers()['cache-control']?.includes('no-store')); await expect(activation.getByRole('heading', { name: 'Cần liên kết lời mời', exact: true })).toBeVisible();
    evidence.tls = { ipSanVerified: true, nodeCertificateVerification: true, browserException: 'exact local certificate SPKI only', osTrustChanged: false, globalIgnoreHttpsErrors: false };
  });
  await check('Real ADMIN login and owned existing Staff recovery no recreation', async () => {
    const values = Object.fromEntries((await readFile(path.join(repositoryRoot, 'backend/.env.local-test-admin'), 'utf8')).trim().split(/\r?\n/).map(line => { const split = line.indexOf('='); return [line.slice(0, split), line.slice(split + 1)]; }));
    adminToken = await login(admin, 'http://127.0.0.1:3000', values.DEV_ADMIN_EMAIL, values.DEV_ADMIN_PASSWORD, 200, 'ADMIN');
    await admin.waitForURL('**/admin');
    const navigation = JSON.parse(await readFile(path.join(frontendRoot, 'target/phase4e-real-local-2026-10-15/results.json'), 'utf8'));
    const account = await api('GET', `/api/v1/admin/staff/${navigation.staff.id}`, 200);
    assert(account.id === '2' && account.email === navigation.staff.email && account.email.endsWith('@example.test') && account.status === 'BLOCKED' && !account.passwordSetupCompleted);
    const assignments = await api('GET', `/api/v1/admin/staff/${account.id}/cinema-assignments`, 200);
    assert(assignments.length === 1 && assignments[0].id === navigation.assignment.id && assignments[0].effectiveAt === navigation.assignment.effectiveAt && Date.parse(assignments[0].effectiveAt) > Date.now());
    evidence.staffId = account.id; evidence.staffEmail = account.email; evidence.staffName = account.fullName; evidence.originalAssignments = assignments;
    const privateCredentials = await readFile(staffCredentialPath, 'utf8');
    if (mode === 'resume-delivered') {
      const existing = Object.fromEntries(privateCredentials.trim().split(/\r?\n/).map(line => { const split = line.indexOf('='); return [line.slice(0,split),line.slice(split+1)]; }));
      assert(existing.STAFF_ID === account.id && existing.STAFF_EMAIL === account.email && /^[0-9a-f]{64}$/.test(existing.STAFF_PASSWORD)); staffPassword=existing.STAFF_PASSWORD;
    } else {
      assert(privateCredentials.length === 0); staffPassword = randomBytes(32).toString('hex');
      await writeFile(staffCredentialPath, `STAFF_ID=${account.id}\nSTAFF_EMAIL=${account.email}\nSTAFF_PASSWORD=${staffPassword}\n`);
    }
    await admin.goto(`http://127.0.0.1:3000/admin/staff/${account.id}`);
    await expect(admin.getByRole('heading', { level: 1, name: account.fullName })).toBeVisible();
    await expect(admin.getByRole('button', { name: 'Kích hoạt tài khoản', exact: true })).toBeDisabled();
  });
  await check(mode === 'resume-delivered' ? 'Recover genuine delivered Mailpit invitation without reissue' : 'One authorized browser reissue 200 and genuine Mailpit SMTP capture', async () => {
    if (mode !== 'resume-delivered') {
    const initial = await (await fetch('http://127.0.0.1:8027/api/v1/messages')).json(); assert(initial.total === 0);
    await admin.getByRole('button', { name: 'Cấp lại lời mời', exact: true }).click();
    await dialogKeyboard(admin);
    const promise = waitResponse(admin, 'POST', `/api/v1/admin/staff/${evidence.staffId}/invitations`);
    evidence.reissueAttemptStarted = true; await save();
    await admin.getByRole('button', { name: 'Xác nhận cấp lại lời mời', exact: true }).click();
    assert((await promise).status() === 200);
    }
    let messages, account;
    for (let attempt = 0; attempt < 20; attempt++) {
      messages = await (await fetch('http://127.0.0.1:8027/api/v1/messages')).json();
      account = await api('GET', `/api/v1/admin/staff/${evidence.staffId}`, 200);
      if (messages.total === 1 && account.deliveryStatus === 'SENT') break;
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    assert(messages.total === 1 && messages.messages.length === 1 && account.deliveryStatus === 'SENT' && account.deliveryAttempts === 1);
    const mail = await (await fetch(`http://127.0.0.1:8027/api/v1/message/${messages.messages[0].ID}`)).json();
    assert(mail.To.length === 1 && mail.To[0].Address === evidence.staffEmail && mail.Subject === 'Smart Cinema — Lời mời kích hoạt tài khoản nhân viên');
    const links = mail.Text.match(/https:\/\/127\.0\.0\.1:8443\/staff\/activate#token=[A-Za-z0-9_-]{43}/g);
    assert(links?.length === 1); invitationLink = links[0]; invitationToken = new URL(invitationLink).hash.slice('#token='.length);
    assert(/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(invitationToken) && mail.HTML.includes(invitationLink));
    evidence.capture = { messageCount: 1, recipientMatched: true, subjectMatched: true, activationOrigin: 'https://127.0.0.1:8443', activationPath: '/staff/activate', fragmentCanonical: true, deliveryStatus: account.deliveryStatus, deliveryAttempts: account.deliveryAttempts, rawMessageExported: false };
  });
  await check('Actual captured invitation public page responsive keyboard token privacy', async () => {
    const before = setupRequests.length;
    const response = await activation.goto(invitationLink);
    // Playwright returns null for this legitimate same-document fragment navigation.
    // The initial document's real200/no-store is verified in the TLS preflight above.
    if (response) assert(response.status() === 200 && response.headers()['cache-control']?.includes('no-store'));
    evidence.invitationNavigation = response ? 'new document200' : 'same-document fragment, no extra HTTP request';
    await expect(activation.getByRole('heading', { name: 'Thiết lập mật khẩu nhân viên', exact: true })).toBeVisible();
    await expect(activation.getByLabel('Mật khẩu mới', { exact: true })).toBeVisible();
    await privateActivationSurface(); assert(setupRequests.length === before);
    for (const width of [390, 768, 1440]) {
      await activation.setViewportSize({ width, height: 1000 });
      await overflow(activation); await screenshot(activation, `activation-empty-form-${width}`);
    }
    await activation.getByRole('button', { name: 'Thiết lập mật khẩu', exact: true }).click();
    await expect(activation.getByLabel('Mật khẩu mới', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(activation.getByLabel('Mật khẩu mới', { exact: true })).toBeFocused(); assert(setupRequests.length === before);
    await activation.getByLabel('Mật khẩu mới', { exact: true }).focus(); await activation.keyboard.press('Tab');
    await expect(activation.getByRole('button', { name: 'Hiện mật khẩu mới', exact: true })).toBeFocused();
  });
  await check('Real public password setup 204 single use leaves account BLOCKED', async () => {
    await activation.getByLabel('Mật khẩu mới', { exact: true }).fill(staffPassword);
    await activation.getByLabel('Xác nhận mật khẩu mới', { exact: true }).fill(staffPassword);
    const promise = waitResponse(activation, 'POST', '/api/v1/staff/password-setups');
    evidence.passwordSetupAttemptStarted = true; await save();
    await activation.getByRole('button', { name: 'Thiết lập mật khẩu', exact: true }).click();
    const response = await promise; assert(response.status() === 204 && response.headers()['cache-control']?.includes('no-store'));
    await expect(activation.getByRole('heading', { name: 'Đã thiết lập mật khẩu', exact: true })).toBeVisible();
    await privateActivationSurface(); assert(setupRequests.length === 1 && Object.values(setupRequests[0]).every(value => value === true || value === 'POST'));
    const account = await api('GET', `/api/v1/admin/staff/${evidence.staffId}`, 200);
    assert(account.passwordSetupCompleted && account.status === 'BLOCKED'); evidence.afterSetup = { status: account.status, passwordSetupCompleted: account.passwordSetupCompleted };
    await expect(activation.getByRole('heading', { name: 'Đã thiết lập mật khẩu', exact: true })).toBeFocused();
    for (const width of [390, 768, 1440]) { await activation.setViewportSize({ width, height: 1000 }); await overflow(activation); await screenshot(activation, `setup-success-awaiting-admin-${width}`); }
  });
  await check('Legitimate captured invitation reuse rejected 400 without new setup', async () => {
    await activation.goto(invitationLink);
    await expect(activation.getByLabel('Mật khẩu mới', { exact: true })).toBeVisible(); await privateActivationSurface();
    await activation.getByLabel('Mật khẩu mới', { exact: true }).fill(staffPassword);
    await activation.getByLabel('Xác nhận mật khẩu mới', { exact: true }).fill(staffPassword);
    const promise = waitResponse(activation, 'POST', '/api/v1/staff/password-setups');
    await activation.getByRole('button', { name: 'Thiết lập mật khẩu', exact: true }).click();
    assert((await promise).status() === 400);
    await expect(activation.getByRole('heading', { name: 'Chưa thể sử dụng lời mời', exact: true })).toBeVisible();
    await screenshot(activation, 'consumed-invitation-rejected');
    invitationLink = undefined; invitationToken = undefined;
  });
  await check('Real STAFF login rejected 401 before separate ADMIN activation', async () => {
    await login(staffPage, 'https://127.0.0.1:8443', evidence.staffEmail, staffPassword, 401, 'STAFF');
  });
  await check('ADMIN Activate dialog eligibility responsive keyboard and backend 200', async () => {
    await admin.getByRole('button', { name: 'Tải lại thông tin', exact: true }).click();
    await expect(admin.getByRole('button', { name: 'Kích hoạt tài khoản', exact: true })).toBeEnabled();
    await expect(admin.getByRole('button', { name: 'Cấp lại lời mời', exact: true })).toBeDisabled();
    for (const width of [390, 768, 1440]) {
      await admin.setViewportSize({ width, height: 1000 });
      await admin.getByRole('button', { name: 'Kích hoạt tài khoản', exact: true }).click();
      await dialogKeyboard(admin); await overflow(admin); await screenshot(admin, `activate-dialog-${width}`);
      await admin.keyboard.press('Escape'); await expect(admin.getByRole('button', { name: 'Kích hoạt tài khoản', exact: true })).toBeFocused();
    }
    await admin.getByRole('button', { name: 'Kích hoạt tài khoản', exact: true }).click();
    const promise = waitResponse(admin, 'PUT', `/api/v1/admin/staff/${evidence.staffId}/status`);
    evidence.activationAttemptStarted = true; await save();
    await admin.getByRole('button', { name: 'Xác nhận kích hoạt tài khoản', exact: true }).click();
    const response = await promise; assert(response.status() === 200 && (await response.json()).status === 'ACTIVE');
    const account = await api('GET', `/api/v1/admin/staff/${evidence.staffId}`, 200); assert(account.status === 'ACTIVE' && account.passwordSetupCompleted);
    await expect(admin.getByRole('button', { name: 'Khóa tài khoản', exact: true })).toBeEnabled();
    await screenshot(admin, 'admin-active-staff');
  });
  await check('Real ACTIVE STAFF frontend login 200 and check-in workspace', async () => {
    staffToken = await login(staffPage, 'https://127.0.0.1:8443', evidence.staffEmail, staffPassword, 200, 'STAFF');
    await staffPage.waitForURL('**/staff/check-in');
    await expect(staffPage.getByRole('heading', { name: 'Soát vé tại rạp', exact: true })).toBeVisible();
  });
  await check('STAFF denied ADMIN403 future assignment excluded and operational scope403', async () => {
    await api('GET', '/api/v1/admin/staff?page=0&size=20', 403, undefined, staffToken);
    const scope = await api('GET', '/api/v1/staff/cinema-assignments', 200, undefined, staffToken);
    assert(Array.isArray(scope.assignments) && scope.assignments.length === 0 && typeof scope.serverTime === 'string');
    await api('GET', `/api/v1/staff/bookings/9223372036854775807?cinemaId=${evidence.originalAssignments[0].cinemaId}`, 403, undefined, staffToken);
    await expect(staffPage.locator('#staff-cinema option')).toHaveCount(1);
    for (const width of [390, 768, 1440]) { await staffPage.setViewportSize({ width, height: 1000 }); await overflow(staffPage); await screenshot(staffPage, `staff-no-effective-scope-${width}`); }
    evidence.futureScope = { effectiveAssignments: 0, existingFutureAssignmentPreserved: true, bookingReadDeniedBeforeResourceLookup: true, positiveCheckIn: 'NOT RUN: no legitimate issued Booking/Ticket fixture' };
  });
  await check('ADMIN Block dialog real 200 preserves assignment history', async () => {
    for (const width of [390, 768, 1440]) {
      await admin.setViewportSize({ width, height: 1000 });
      await admin.getByRole('button', { name: 'Khóa tài khoản', exact: true }).click();
      await dialogKeyboard(admin); await overflow(admin); await screenshot(admin, `block-dialog-${width}`);
      await admin.keyboard.press('Escape'); await expect(admin.getByRole('button', { name: 'Khóa tài khoản', exact: true })).toBeFocused();
    }
    await admin.getByRole('button', { name: 'Khóa tài khoản', exact: true }).click();
    const promise = waitResponse(admin, 'PUT', `/api/v1/admin/staff/${evidence.staffId}/status`);
    evidence.blockAttemptStarted = true; await save();
    await admin.getByRole('button', { name: 'Xác nhận khóa tài khoản', exact: true }).click();
    const response = await promise; assert(response.status() === 200 && (await response.json()).status === 'BLOCKED');
    const assignments = await api('GET', `/api/v1/admin/staff/${evidence.staffId}/cinema-assignments`, 200);
    assert(JSON.stringify(assignments) === JSON.stringify(evidence.originalAssignments));
    const account = await api('GET', `/api/v1/admin/staff/${evidence.staffId}`, 200); assert(account.status === 'BLOCKED' && account.passwordSetupCompleted);
    evidence.finalAccount = { status: account.status, passwordSetupCompleted: account.passwordSetupCompleted, deliveryStatus: account.deliveryStatus, deliveryAttempts: account.deliveryAttempts };
  });
  await check('Already-issued STAFF JWT loses operational authorization403 after block', async () => {
    await api('GET', '/api/v1/staff/cinema-assignments', 403, undefined, staffToken);
    const promise = waitResponse(staffPage, 'GET', '/api/v1/staff/cinema-assignments');
    await staffPage.getByRole('button', { name: 'Kiểm tra phân công', exact: true }).click();
    assert((await promise).status() === 403); await expect(staffPage.getByRole('alert').first()).toBeVisible();
    await screenshot(staffPage, 'blocked-existing-staff-session');
  });
  await check('Fresh STAFF frontend login rejected401 after block and capture count stays1', async () => {
    await login(staffPage, 'https://127.0.0.1:8443', evidence.staffEmail, staffPassword, 401, 'STAFF');
    const messages = await (await fetch('http://127.0.0.1:8027/api/v1/messages')).json(); assert(messages.total === 1);
    await admin.getByRole('button', { name: 'Tải lại thông tin', exact: true }).click();
    await expect(admin.getByRole('button', { name: 'Khóa tài khoản', exact: true })).toBeDisabled();
    await screenshot(admin, 'admin-final-blocked-setup-complete');
  });
  evidence.finishedAt = new Date().toISOString(); await save();
} catch { process.exitCode = 1; console.log('Workflow stopped; inspect authoritative state; never replay an uncertain mutation.'); }
finally {
  invitationLink = undefined; invitationToken = undefined; adminToken = undefined; staffToken = undefined; staffPassword = undefined;
  evidence.setupRequestPrivacy = setupRequests;
  await save(); await browser.close();
  console.log(`RESULT ${evidence.checks.filter(check => check.result === 'PASS').length} PASS; ${evidence.checks.filter(check => check.result === 'FAIL').length} FAIL; ${evidence.screenshots.length} safe screenshots`);
}
