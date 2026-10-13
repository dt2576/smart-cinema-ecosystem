import { test, expect, type Page } from "@playwright/test";
import { mockStaffActivation, seedStaffActivationSession } from "./helpers/staff-activation";
import { STAFF_INVITATION_FIXTURE as TOKEN, STAFF_REPLACEMENT_INVITATION_FIXTURE as NEXT, STAFF_PASSWORD_FIXTURE as PASSWORD } from "../fixtures/staff-activation";

const ROUTE = "/staff/activate";
const entry = (token = TOKEN) => `${ROUTE}#token=${token}`;
const passwordField = (page: Page) => page.getByLabel("Mật khẩu mới", { exact: true });
const confirmationField = (page: Page) => page.getByLabel("Xác nhận mật khẩu mới", { exact: true });
async function fill(page: Page, password = PASSWORD, confirmation = password) { await passwordField(page).fill(password); await confirmationField(page).fill(confirmation); }
async function submit(page: Page) { await page.getByRole("button", { name: "Thiết lập mật khẩu", exact: true }).click(); }
async function privateSurface(page: Page) {
  expect(await page.locator("body").innerText()).not.toContain(TOKEN);
  expect(await page.locator("body").innerText()).not.toContain("private-account-token-password-sql");
  expect(await page.locator("a").evaluateAll(links => links.map(link => link.getAttribute("href")))).not.toContain(entry());
  expect(await page.evaluate(token => Object.values(localStorage).concat(Object.values(sessionStorage)).some(value => value.includes(token)), TOKEN)).toBe(false);
  expect(await page.context().cookies()).not.toEqual(expect.arrayContaining([expect.objectContaining({ value: TOKEN })]));
  expect(await page.evaluate(token => JSON.stringify(history.state).includes(token), TOKEN)).toBe(false);
  await expect(page).toHaveURL(new RegExp(`${ROUTE}$`));
}

for (const width of [390, 768, 1440]) {
  test(`invitation fixture: public form, keyboard, visibility and truthful204 at ${width}px`, async ({ page }, info) => {
    const state = await mockStaffActivation(page); const logs: string[] = []; page.on("console", message => logs.push(message.text()));
    await page.setViewportSize({ width, height: 1000 }); const response = await page.goto(entry());
    expect(response?.headers()["cache-control"]).toContain("no-store"); expect(await response!.text()).not.toContain(TOKEN);
    await expect(passwordField(page)).toBeVisible(); await privateSurface(page); expect(state.requests).toHaveLength(0);
    await expect(page.locator("form")).toHaveAttribute("method", "post");
    await page.getByRole("link", { name: "Chuyển đến nội dung", exact: true }).focus(); await page.keyboard.press("Enter"); await expect(passwordField(page)).toBeVisible(); await privateSurface(page); expect(state.requests).toHaveLength(0);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`activation-form-${width}.png`), fullPage: true });
    await submit(page); await expect(passwordField(page)).toBeFocused(); await expect(passwordField(page)).toHaveAttribute("aria-invalid", "true");
    await fill(page); await passwordField(page).focus(); await page.keyboard.press("Tab");
    const visibility = page.getByRole("button", { name: "Hiện mật khẩu mới", exact: true }); await expect(visibility).toBeFocused(); await page.keyboard.press("Space");
    await expect(passwordField(page)).toHaveAttribute("type", "text"); await expect(page.getByRole("button", { name: "Ẩn mật khẩu mới", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect((await page.getByRole("button", { name: "Ẩn mật khẩu mới", exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.getByRole("button", { name: "Ẩn mật khẩu mới", exact: true }).click(); await confirmationField(page).focus(); await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Đã thiết lập mật khẩu", exact: true })).toBeFocused();
    await expect(page.getByRole("status")).toContainText("vẫn đang chờ quản trị viên kích hoạt");
    await expect(page.getByText("Bạn chưa thể bắt đầu soát vé.", { exact: false })).toBeVisible(); expect(state.requests).toHaveLength(1);
    expect(state.requests[0].method).toBe("POST"); expect(new URL(state.requests[0].url).pathname).toBe("/api/v1/staff/password-setups"); expect(new URL(state.requests[0].url).search).toBe("");
    expect(state.requests[0].body).toEqual({ token: TOKEN, password: PASSWORD }); expect(state.requests[0].headers.authorization).toBeUndefined(); expect(state.requests[0].headers.cookie).toBeUndefined(); expect(state.requests[0].headers.referer).toBeUndefined();
    await expect(page.locator("input")).toHaveCount(0); await expect(page.locator('a[href="/staff/check-in"]')).toHaveCount(0); await expect(page.getByRole("link", { name: "Đến trang đăng nhập", exact: true })).toHaveAttribute("href", "/login");
    expect(await page.evaluate(() => localStorage.getItem("smart-cinema.auth-session"))).toBeNull(); await privateSurface(page);
    expect(logs.some(message => message.includes(TOKEN) || message.includes(PASSWORD))).toBe(false); await page.screenshot({ path: info.outputPath(`activation-awaiting-admin-${width}.png`), fullPage: true });
  });
  test(`invitation fixture: safe uncertain5xx, reduced motion and no retry at ${width}px`, async ({ page }, info) => {
    const state = await mockStaffActivation(page); state.status = 503; await page.setViewportSize({ width, height: 1000 }); await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto(entry()); await fill(page); await submit(page);
    await expect(page.getByRole("heading", { name: "Chưa thể xác nhận kết quả", exact: true })).toBeVisible(); await expect(page.getByRole("main").getByRole("alert")).toContainText("có thể đã được xử lý");
    await expect(page.getByRole("button", { name: /Thiết lập mật khẩu/ })).toHaveCount(0); expect(state.requests).toHaveLength(1); await privateSurface(page); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: info.outputPath(`activation-uncertain-${width}.png`), fullPage: true });
  });
}

test("invitation fixture: missing/query credential is rejected with no mount GET or POST", async ({ page }) => {
  const state = await mockStaffActivation(page); await page.goto(`${ROUTE}?token=${TOKEN}&next=https://forbidden.example.test/`); await expect(page.getByRole("heading", { name: "Cần liên kết lời mời", exact: true })).toBeVisible(); await expect(page.locator("input")).toHaveCount(0); expect(state.requests).toHaveLength(0); await privateSurface(page);
});
for (const fragment of ["#token=short", "#token=" + "A".repeat(42) + "B", "#token=%41" + TOKEN.slice(1), "#token=" + TOKEN + "&token=" + NEXT]) {
  test(`invitation fixture: malformed fragment is scrubbed safely (${fragment.includes("%") ? "encoded" : fragment.includes("&") ? "duplicate" : fragment.includes("short") ? "short" : "noncanonical"})`, async ({ page }) => {
    const state = await mockStaffActivation(page); await page.goto(ROUTE + fragment); await expect(page.getByRole("heading", { name: "Liên kết lời mời chưa hợp lệ", exact: true })).toBeVisible(); expect(state.requests).toHaveLength(0); await expect(page.locator("input")).toHaveCount(0); await privateSurface(page);
  });
}
test("invitation fixture: fragment alone is used, forged redirects/query fields discarded", async ({ page }) => {
  const state = await mockStaffActivation(page); await page.goto(`${ROUTE}?token=${NEXT}&returnUrl=https://forbidden.example.test/${"#token=" + TOKEN}`); await expect(passwordField(page)).toBeVisible(); await fill(page); await submit(page); await expect(page.getByRole("heading", { name: "Đã thiết lập mật khẩu", exact: true })).toBeVisible(); expect(state.requests[0].body.token).toBe(TOKEN); await privateSurface(page);
});
test("invitation fixture: refresh after URL scrub cannot recover the credential", async ({ page }) => {
  const state = await mockStaffActivation(page); await page.goto(entry()); await expect(passwordField(page)).toBeVisible(); await fill(page); await page.reload(); await expect(page.getByRole("heading", { name: "Cần liên kết lời mời", exact: true })).toBeVisible(); expect(state.requests).toHaveLength(0); await expect(page.locator("input")).toHaveCount(0); await privateSurface(page);
});
test("invitation fixture: browser back/forward returns no retained password or usable token", async ({ page }) => {
  const state = await mockStaffActivation(page); await page.goto(entry()); await fill(page); await page.getByRole("link", { name: "Đến trang đăng nhập", exact: true }).click(); await expect(page).toHaveURL(/\/login$/); await page.goBack(); await expect(page.getByRole("heading", { name: /Cần liên kết lời mời|Hãy mở lại lời mời/ })).toBeVisible(); await expect(page.locator("input")).toHaveCount(0); expect(state.requests).toHaveLength(0); await privateSurface(page); await page.goForward(); await expect(page).toHaveURL(/\/login$/);
});
test("invitation fixture: UTF8 limits, minimum, normalization and exact confirmation", async ({ page }) => {
  const state = await mockStaffActivation(page); await page.goto(entry());
  for (const password of ["1234567", "é".repeat(37), "😀".repeat(19), " ".repeat(8)]) { await fill(page, password); await submit(page); await expect(passwordField(page)).toHaveAttribute("aria-invalid", "true"); }
  await fill(page, PASSWORD, PASSWORD.normalize("NFC")); await submit(page); await expect(confirmationField(page)).toBeFocused(); await expect(confirmationField(page)).toHaveAttribute("aria-invalid", "true"); expect(state.requests).toHaveLength(0);
  await fill(page, "e\u0301".repeat(24)); await submit(page); await expect(page.getByRole("heading", { name: "Đã thiết lập mật khẩu", exact: true })).toBeVisible(); expect(state.requests[0].body.password).toBe("e\u0301".repeat(24));
});
test("invitation fixture: double submit is one POST and inputs clear before pending response", async ({ page }, info) => {
  const state = await mockStaffActivation(page); let release!: () => void; state.delay = new Promise<void>(resolve => { release = resolve; }); await page.goto(entry()); await fill(page); await submit(page);
  await expect(page.getByRole("button", { name: "Đang thiết lập mật khẩu…", exact: true })).toBeDisabled(); await expect(passwordField(page)).toHaveValue(""); await expect(confirmationField(page)).toHaveValue(""); await passwordField(page).evaluate(input => (input as HTMLInputElement).form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))); expect(state.requests).toHaveLength(1);
  await page.screenshot({ path: info.outputPath("activation-submitting.png"), fullPage: true }); release(); await expect(page.getByRole("heading", { name: "Đã thiết lập mật khẩu", exact: true })).toBeVisible(); expect(state.requests).toHaveLength(1);
});
for (const scenario of ["invalid", "expired", "revoked", "redeemed", "superseded", "ineligible", "password-rejected"]) test(`invitation fixture: public400 remains indistinguishable for ${scenario}`, async ({ page }) => {
  const state = await mockStaffActivation(page); state.status = 400; await page.goto(entry()); await fill(page); await submit(page); await expect(page.getByRole("heading", { name: "Chưa thể sử dụng lời mời", exact: true })).toBeVisible(); await expect(page.getByRole("main").getByRole("alert")).toContainText("Liên hệ quản trị viên"); await expect(page.getByRole("button")).toHaveCount(0); expect(state.requests).toHaveLength(1); await privateSurface(page);
});
for (const status of [401, 403, 404, 409]) test(`invitation fixture: safe public${status} has no auth redirect or internal detail`, async ({ page }) => {
  const state = await mockStaffActivation(page); state.status = status; await page.goto(entry()); await fill(page); await submit(page); await expect(page.getByRole("heading", { name: "Chưa thể sử dụng lời mời", exact: true })).toBeVisible(); await privateSurface(page); expect(state.requests).toHaveLength(1);
});
test("invitation fixture:429 RetryAfter guidance never polls, retries or mints another token", async ({ page }) => {
  const state = await mockStaffActivation(page); state.status = 429; await page.goto(entry()); await fill(page); await submit(page); await expect(page.getByRole("heading", { name: "Vui lòng chờ trước khi tiếp tục", exact: true })).toBeVisible(); await expect(page.getByRole("status")).toContainText("60 giây"); expect(state.requests).toHaveLength(1); await expect(page.locator("input")).toHaveCount(0); await privateSurface(page);
});
for (const mode of ["lost", "redirect", "misleading200"] as const) test(`invitation fixture: ${mode} is uncertain, never automatically retried`, async ({ page }) => {
  const state = await mockStaffActivation(page); state.lost = mode === "lost"; state.redirect = mode === "redirect"; if (mode === "misleading200") state.status = 200; const external: string[] = []; page.on("request", request => { if (request.url().includes("forbidden.example.test")) external.push(request.url()); }); await page.goto(entry()); await fill(page); await submit(page);
  await expect(page.getByRole("heading", { name: "Chưa thể xác nhận kết quả", exact: true })).toBeVisible(); expect(state.requests).toHaveLength(1); expect(external).toHaveLength(0); await expect(page.locator("input")).toHaveCount(0); await privateSurface(page);
});
for (const role of ["CUSTOMER", "ADMIN", "MANAGER", "STAFF"]) test(`invitation fixture: public route preserves existing ${role} session and sends no JWT`, async ({ page }) => {
  const state = await mockStaffActivation(page); await seedStaffActivationSession(page, role); await page.goto(entry()); await expect(passwordField(page)).toBeVisible(); const session = await page.evaluate(() => localStorage.getItem("smart-cinema.auth-session")); await fill(page); await submit(page); await expect(page.getByRole("heading", { name: "Đã thiết lập mật khẩu", exact: true })).toBeVisible(); expect(state.requests[0].headers.authorization).toBeUndefined(); expect(await page.evaluate(() => localStorage.getItem("smart-cinema.auth-session"))).toBe(session); await privateSurface(page);
});
test("invitation fixture: new hash context aborts stale request and cannot apply late204", async ({ page }) => {
  const state = await mockStaffActivation(page); let release!: () => void; state.delay = new Promise<void>(resolve => { release = resolve; }); await page.goto(entry()); await fill(page); await submit(page); await page.evaluate(token => { location.hash = "token=" + token; }, NEXT); await expect(passwordField(page)).toBeEnabled(); await expect(passwordField(page)).toHaveValue(""); release(); state.delay = undefined; await fill(page); await submit(page); await expect(page.getByRole("heading", { name: "Đã thiết lập mật khẩu", exact: true })).toBeVisible(); expect(state.requests).toHaveLength(2); expect(state.requests[1].body.token).toBe(NEXT); await privateSurface(page);
});
test("invitation fixture: session change aborts response and clears credentials", async ({ page }) => {
  const state = await mockStaffActivation(page); let release!: () => void; state.delay = new Promise<void>(resolve => { release = resolve; }); await page.goto(entry()); await fill(page); await submit(page); await page.evaluate(() => {
    const session = JSON.stringify({ accessToken: "qa-changed-access", tokenType: "Bearer", expiresAt: Date.now() + 3600000, refreshToken: "qa-changed-refresh", refreshExpiresAt: Date.now() + 86400000, user: { id: 91, email: "changed@example.test", fullName: "Tài khoản khác", role: "CUSTOMER" } }); localStorage.setItem("smart-cinema.auth-session", session); dispatchEvent(new StorageEvent("storage", { key: "smart-cinema.auth-session", newValue: session }));
  }); await expect(page.getByRole("heading", { name: "Chưa thể xác nhận kết quả", exact: true })).toBeVisible(); release(); await expect(page.locator("input")).toHaveCount(0); expect(state.requests).toHaveLength(1); await privateSurface(page);
});
test("invitation fixture: pagehide wipes private context, with no request on restore", async ({ page }) => {
  const state = await mockStaffActivation(page); await page.goto(entry()); await fill(page); await page.evaluate(() => dispatchEvent(new Event("pagehide"))); await expect(page.getByRole("heading", { name: "Hãy mở lại lời mời", exact: true })).toBeVisible(); await expect(page.locator("input")).toHaveCount(0); expect(state.requests).toHaveLength(0); await privateSurface(page);
});
