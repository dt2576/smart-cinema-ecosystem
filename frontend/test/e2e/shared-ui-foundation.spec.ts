import { test, expect, type Page, type TestInfo } from "@playwright/test";

// HTTP fixtures for shared presentation/accessibility only. No live account,
// financial state, Ticket issuance or Check-in outcome is manufactured here.
type FixtureRole = "CUSTOMER" | "ADMIN" | "STAFF" | "MANAGER";
const PROFILE = { fullName: "Khách hàng kiểm thử", email: "foundation@example.test", phone: "0912345678", role: "CUSTOMER", status: "ACTIVE" };
const TOKEN = { accessToken: "foundation-fixture-access", tokenType: "Bearer", expiresIn: 3600, refreshToken: "foundation-fixture-refresh", refreshExpiresIn: 86400, userId: 1, email: PROFILE.email, fullName: PROFILE.fullName, role: "CUSTOMER" };

async function fixtures(page: Page) {
  await page.route("**/api/v1/genres", route => route.fulfill({ json: [] }));
  await page.route("**/api/v1/movies?**", route => route.fulfill({ json: { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0, sort: "title,asc" } }));
  await page.route("**/api/v1/profile", route => route.fulfill({ json: PROFILE }));
  await page.route("**/api/v1/auth/token-revocations", route => route.fulfill({ status: 204 }));
}

async function session(page: Page, role: FixtureRole) {
  await page.addInitScript(({ role, profile }) => localStorage.setItem("smart-cinema.auth-session", JSON.stringify({ accessToken: "foundation-fixture-access", tokenType: "Bearer", expiresAt: Date.now() + 3600000, refreshToken: "foundation-fixture-refresh", refreshExpiresAt: Date.now() + 86400000, user: { id: 1, email: profile.email, fullName: profile.fullName, role } })), { role, profile: PROFILE });
}

async function screenshot(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator("html").getAttribute("lang")).toBe("vi");
  const header = await page.locator("header").boundingBox();
  const heading = await page.getByRole("heading", { level: 1 }).first().boundingBox();
  if (header && heading) expect(heading.y).toBeGreaterThanOrEqual(header.y + header.height);
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
}

async function targetSize(page: Page, selector: string) {
  const sizes = await page.locator(selector).evaluateAll(elements => elements.filter(el => el.getClientRects().length > 0).map(el => { const box = el.getBoundingClientRect(); return { width: box.width, height: box.height }; }));
  expect(sizes.length).toBeGreaterThan(0);
  for (const size of sizes) { expect(size.height).toBeGreaterThanOrEqual(44); expect(size.width).toBeGreaterThanOrEqual(44); }
}

for (const width of [390, 768, 1440]) {
  test(`Auth fields, native validation presentation and focus at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await fixtures(page);
    await page.goto("/login");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Chuyển đến nội dung", exact: true });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    expect(await skip.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
    await page.keyboard.press("Enter");
    await expect(page.locator("#auth-content")).toBeFocused();
    await page.getByLabel("Địa chỉ email", { exact: true }).focus();
    expect(await page.locator("#email").evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
    await screenshot(page, info, `login-${width}-focus`);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page.locator("#email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#email")).toHaveAttribute("aria-describedby", "email-error");
    await expect(page.locator("#email-error")).toHaveText("Nhập địa chỉ email của bạn.");
    await targetSize(page, "form button, form input");
    await screenshot(page, info, `login-${width}-errors`);

    await page.getByRole("link", { name: "Tạo tài khoản", exact: true }).click();
    await screenshot(page, info, `register-${width}`);
    await expect(page.locator("#password")).toHaveAttribute("aria-describedby", "password-help");
    await expect(page.locator("#password-help")).toContainText("8 ký tự");
    await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
    for (const id of ["fullName", "registerEmail", "phone", "password", "confirmPassword"]) {
      await expect(page.locator(`#${id}`)).toHaveAttribute("aria-invalid", "true");
      await expect(page.locator(`#${id}`)).toHaveAttribute("aria-describedby", `${id}-error`);
      await expect(page.locator(`#${id}-error`)).toBeVisible();
    }
    await targetSize(page, "form button, form input");
    await screenshot(page, info, `register-${width}-errors`);
  });

  test(`Profile loading, protected fields and editing at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await fixtures(page);
    await session(page, "CUSTOMER");
    let finishLoading!: () => void;
    const loading = new Promise<void>(resolve => { finishLoading = resolve; });
    await page.route("**/api/v1/profile", async route => { await loading; await route.fulfill({ json: PROFILE }); });
    await page.goto("/profile");
    await expect(page.getByRole("status")).toContainText("Đang tải hồ sơ");
    const skeleton = page.locator('[aria-hidden="true"].bg-panel-high').first();
    await expect(skeleton).toBeVisible();
    expect(await skeleton.evaluate(el => getComputedStyle(el).animationName)).toBe("none");
    await page.screenshot({ path: info.outputPath(`profile-${width}-loading.png`), fullPage: true });
    finishLoading();
    await expect(page.getByRole("heading", { name: "Hồ sơ của tôi", exact: true })).toBeVisible();
    await screenshot(page, info, `profile-${width}`);
    for (const label of ["Địa chỉ email", "Vai trò tài khoản", "Trạng thái tài khoản"]) {
      const field = page.getByLabel(label, { exact: true });
      await expect(field).toHaveAttribute("readonly", "");
      const hint = await field.getAttribute("aria-describedby");
      await expect(page.locator(`[id="${hint}"]`)).toBeVisible();
    }
    await page.getByRole("button", { name: "Chỉnh sửa hồ sơ" }).click();
    await page.getByLabel("Họ tên", { exact: true }).fill("");
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(page.locator("#fullName")).toHaveAttribute("aria-describedby", "fullName-error");
    await expect(page.locator("#fullName-error")).toHaveText("Họ tên không được để trống.");
    await targetSize(page, "form button, form input");
    await screenshot(page, info, `profile-${width}-edit-errors`);
    await page.getByRole("button", { name: "Hủy", exact: true }).click();
    await expect(page.getByLabel("Họ tên", { exact: true })).toHaveValue(PROFILE.fullName);
  });

  test(`Discovery skeleton, empty and safe error feedback at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await fixtures(page);
    let finishLoading!: () => void;
    const loading = new Promise<void>(resolve => { finishLoading = resolve; });
    await page.route("**/api/v1/movies?**", async route => { await loading; await route.fulfill({ json: { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0, sort: "title,asc" } }); });
    await page.goto("/movies");
    await expect(page.getByRole("status", { name: "Đang tải phim" })).toBeVisible();
    const skeleton = page.locator('[aria-hidden="true"].bg-panel-high').first();
    expect(await skeleton.evaluate(el => getComputedStyle(el).animationName)).toBe("none");
    await screenshot(page, info, `movies-${width}-loading`);
    finishLoading();
    await expect(page.getByRole("heading", { name: "Câu chuyện tiếp theo đang đến" })).toBeVisible();
    await screenshot(page, info, `movies-${width}-empty`);
    await page.route("**/api/v1/movies?**", route => route.fulfill({ status: 503, json: { detail: "INTERNAL_FIXTURE_DETAILS_MUST_STAY_PRIVATE" } }));
    await page.reload();
    await expect(page.getByRole("heading", { name: "Không thể tải phim" })).toBeVisible();
    await expect(page.getByText("INTERNAL_FIXTURE_DETAILS_MUST_STAY_PRIVATE")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Thử lại", exact: true })).toBeVisible();
    await targetSize(page, "header button, header summary, form button");
    await screenshot(page, info, `movies-${width}-error`);
  });
}

for (const role of ["CUSTOMER", "ADMIN", "STAFF", "MANAGER"] as const) for (const width of [390, 1440]) {
  test(`HTTP fixture role ${role} gets appropriate shared links at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await fixtures(page);
    await session(page, role);
    await page.goto("/movies");
    const account = page.locator("summary").filter({ hasText: "Mở menu tài khoản" });
    await account.click();
    await expect(page.getByRole("link", { name: "Hồ sơ của tôi", exact: true })).toHaveCount(role === "CUSTOMER" ? 1 : 0);
    await expect(page.getByRole("link", { name: "Khu vực quản trị", exact: true })).toHaveCount(role === "ADMIN" ? 1 : 0);
    await page.getByRole("button", { name: "Đăng xuất", exact: true }).focus();
    await page.keyboard.press("Escape");
    await expect(account).toBeFocused();
    await expect(page.locator("details")).not.toHaveAttribute("open", "");
    if (width === 390) {
      const toggle = page.getByRole("button", { name: "Mở menu điều hướng" });
      await toggle.click();
      const nav = page.getByRole("navigation", { name: "Điều hướng trên điện thoại" });
      await expect(nav.locator('a[href="/profile"]')).toHaveCount(role === "CUSTOMER" ? 1 : 0);
      await expect(nav.locator('a[href="/admin"]')).toHaveCount(role === "ADMIN" ? 1 : 0);
      await expect(nav.getByRole("link", { name: "Vé của tôi", exact: true })).toHaveCount(role === "CUSTOMER" ? 1 : 0);
      await account.click();
      await page.locator("details").getByRole("button", { name: "Đăng xuất", exact: true }).focus();
      await page.keyboard.press("Escape");
      await expect(account).toBeFocused();
      await expect(nav).toBeVisible();
      await nav.getByRole("link", { name: "Phim", exact: true }).focus();
      await page.keyboard.press("Escape");
      await expect(toggle).toBeFocused();
      await expect(nav).toHaveCount(0);
    }
    await page.goto("/");
    await expect(page.locator("summary")).toBeVisible();
    await expect(page.locator('a[href="/my-bookings"]')).toHaveCount(role === "CUSTOMER" ? 2 : 0);
    await expect(page.locator('a[href^="/staff"], a[href^="/manager"]')).toHaveCount(0);
  });
}

test("Keyboard login remains disabled in flight and resumes the approved Payment return route", async ({ page }) => {
  await fixtures(page);
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  let calls = 0;
  await page.route("**/api/v1/auth/tokens", async route => { calls++; await pending; await route.fulfill({ json: TOKEN }); });
  await page.goto("/login?returnTo=%2Fpayments%2Fvnpay%2Freturn");
  await page.getByLabel("Địa chỉ email", { exact: true }).fill(PROFILE.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("FixtureOnly123!");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Đang đăng nhập", exact: false })).toBeDisabled();
  await expect(page.locator("form")).toHaveAttribute("aria-busy", "true");
  finish();
  await expect(page).toHaveURL("/payments/vnpay/return");
  expect(calls).toBe(1);
});

test("Cached Admin role cannot bypass backend denial after shared navigation", async ({ page }) => {
  await fixtures(page);
  await session(page, "ADMIN");
  let checks = 0;
  await page.route("**/api/v1/admin", route => { checks++; return route.fulfill({ status: 403 }); });
  await page.goto("/movies");
  await page.locator("summary").click();
  await page.getByRole("link", { name: "Khu vực quản trị", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Không có quyền quản trị" })).toBeVisible();
  expect(checks).toBeGreaterThan(0);
  await expect(page.getByRole("navigation", { name: "Điều hướng quản trị" })).toHaveCount(0);
});
