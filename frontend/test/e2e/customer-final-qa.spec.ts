import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { resolve } from "node:path";

const MOVIE_ID = "9223372036854775807";
const GENRE_ID = "9007199254740993";
const MOVIE = { id: MOVIE_ID, title: "Dune: Part Two", duration: 166, releaseDate: "2024-03-01", ageRating: "T13", language: "English", posterUrl: "https://media.example.test/qa.jpg", status: "PUBLISHED", genres: [{ id: GENRE_ID, name: "Adventure" }], description: "A journey across the sands of Arrakis.", trailerUrl: null };
const PROFILE = { fullName: "Cinema Customer", email: "customer@example.test", phone: "0912345678", role: "CUSTOMER", status: "ACTIVE" };
const TOKEN = { accessToken: "qa-access", tokenType: "Bearer", expiresIn: 3600, refreshToken: "qa-refresh", refreshExpiresIn: 86400, userId: 1, email: PROFILE.email, fullName: PROFILE.fullName, role: "CUSTOMER" };

async function mockCatalog(page: Page) {
  await page.route("https://media.example.test/**", route => route.fulfill({ path: resolve("public/images/movies/dune-part-two.jpg") }));
  await page.route("**/api/v1/movies?**", route => {
    const params = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: { items: [MOVIE], page: Number(params.get("page") ?? 0), size: Number(params.get("size") ?? 20), totalElements: 1, totalPages: 1, sort: params.get("sort") ?? "title,asc" } });
  });
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ json: MOVIE }));
  await page.route("**/api/v1/genres", route => route.fulfill({ json: MOVIE.genres }));
}

async function seedSession(page: Page, expired = false) {
  await page.addInitScript(({ profile, expired }) => localStorage.setItem("smart-cinema.auth-session", JSON.stringify({ accessToken: "qa-access", tokenType: "Bearer", expiresAt: Date.now() + (expired ? -1000 : 3600000), refreshToken: "qa-refresh", refreshExpiresAt: Date.now() + 86400000, user: { id: 1, email: profile.email, fullName: profile.fullName, role: profile.role } })), { profile: PROFILE, expired });
}

async function capture(page: Page, info: TestInfo, name: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
  const badAnchors = await page.locator('a[href^="#"]').evaluateAll(links => links.map(link => link.getAttribute("href")!).filter(href => href === "#" || !document.getElementById(decodeURIComponent(href.slice(1)))));
  expect(badAnchors).toEqual([]);
}

for (const mobile of [false, true]) test(`complete Customer journey keeps boundaries and original deadline on ${mobile ? "mobile" : "desktop"}`, async ({ page }, info) => {
  test.setTimeout(90000);
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  await page.clock.setFixedTime(new Date("2030-01-01T09:00:00+07:00"));
  await mockCatalog(page);
  const unexpected: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/") && !["/api/v1/movies", `/api/v1/movies/${MOVIE_ID}`, "/api/v1/genres", "/api/v1/auth/tokens", "/api/v1/profile", "/api/v1/auth/token-revocations"].includes(url.pathname)) unexpected.push(url.pathname);
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(MOVIE.title);
  await capture(page, info, "01-home");
  await page.getByRole("link", { name: "Explore Movies", exact: true }).click();
  await expect(page.getByRole("link", { name: `View details for ${MOVIE.title}`, exact: true })).toBeVisible();
  await capture(page, info, "02-movies");
  await page.getByRole("link", { name: `View details for ${MOVIE.title}`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/movies/${MOVIE_ID}`));
  await expect(page.getByRole("link", { name: /Select Cinema/ })).toBeVisible();
  await capture(page, info, "03-movie-detail");
  await page.getByRole("link", { name: /Select Cinema/ }).click();
  await page.getByRole("radio", { name: "Smart Cinema Landmark", exact: true }).check();
  await capture(page, info, "04-cinema");
  await page.getByRole("button", { name: "Continue to Showtimes" }).click();
  await page.getByRole("radio", { name: "Hall 1 10:00 Available", exact: true }).check();
  await capture(page, info, "05-showtime");
  await page.getByRole("button", { name: "Continue to Seat Selection" }).click();
  await page.getByRole("button", { name: "E1-2, Couple, 2 guests, Available", exact: true }).click();
  await page.getByRole("button", { name: "A1, Standard, 1 guest, Available", exact: true }).click();
  await capture(page, info, "06-seats");
  await page.getByRole("button", { name: "Continue to Concessions" }).click();
  const countdown = page.getByRole("timer", { name: "Preview time remaining", exact: true });
  await expect(countdown).toHaveText("10:00");
  await page.getByRole("button", { name: "Increase Movie Combo", exact: true }).click();
  await capture(page, info, "07-concessions");
  await page.getByRole("button", { name: "Continue to Booking Summary" }).click();
  await page.getByRole("textbox", { name: "Promotion code", exact: true }).fill("DEMO10");
  await page.getByRole("button", { name: "Apply Promotion", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("DEMO10 applied");
  await page.clock.setFixedTime(new Date("2030-01-01T09:01:00+07:00"));
  await expect(countdown).toHaveText("09:00");
  await capture(page, info, "08-summary");
  await page.getByRole("button", { name: "Continue to Payment Method" }).click();
  await page.getByRole("radio", { name: "MoMo · Available preview", exact: true }).check();
  await expect(countdown).toHaveText("09:00");
  await capture(page, info, "09-payment-method");
  await page.getByRole("button", { name: "Continue to Payment Processing" }).click();
  await expect(page.getByRole("button", { name: "Start processing preview" })).toBeVisible();
  await capture(page, info, "10-processing");
  await page.getByRole("button", { name: "Start processing preview" }).click();
  await page.getByRole("button", { name: "Continue to Payment Result preview" }).click();
  await expect(page.getByRole("heading", { name: "Payment success preview" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("not server-verified");
  await expect(page.getByRole("region", { name: "Reviewed screening and selections" })).toContainText("2 Seat Units · 3 guests");
  await expect(page.getByRole("complementary", { name: "Payment Result summary" })).toContainText("324,000");
  await expect(countdown).toHaveText("09:00");
  await expect(page.locator('img[alt*="QR"]')).toHaveCount(0);
  await capture(page, info, "11-result");
  if (mobile) await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("navigation", { name: mobile ? "Mobile navigation" : "Main navigation", exact: true }).getByRole("link", { name: "My Bookings", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(5);
  await expect(page.getByText(/not your account history/)).toBeVisible();
  await capture(page, info, "12-my-bookings");
  await page.getByRole("link", { name: "View Booking DEMO-SC-1101", exact: true }).click();
  await expect(page.getByRole("region", { name: "Individual Tickets" })).toContainText("3 Tickets · 3 Seat Units · 4 guests");
  await expect(page.locator('img[alt^="Demo Booking QR"]')).toHaveCount(1);
  await capture(page, info, "13-booking-tickets");
  await page.getByRole("button", { name: "Enlarge Booking QR", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator('img[alt^="Demo Booking QR"]')).toHaveCount(1);
  await page.screenshot({ path: info.outputPath("14-booking-qr.png") });
  await page.keyboard.press("Escape");
  await page.route("**/api/v1/auth/tokens", route => route.fulfill({ json: TOKEN }));
  await page.route("**/api/v1/profile", route => route.fulfill({ json: PROFILE }));
  await page.route("**/api/v1/auth/token-revocations", route => route.fulfill({ status: 204 }));
  await page.getByRole("link", { name: "Sign In", exact: true }).click();
  await capture(page, info, "15-login");
  await page.getByLabel("Email Address", { exact: true }).fill(PROFILE.email);
  await page.getByLabel("Password", { exact: true }).fill("PreviewOnly123!");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.locator("summary").filter({ hasText: "Open account menu" }).click();
  await page.getByRole("link", { name: "My Profile", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Profile", exact: true })).toBeVisible();
  await capture(page, info, "16-profile");
  await page.locator("summary").filter({ hasText: "Open account menu" }).click();
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(page).toHaveURL("/");
  expect(await page.evaluate(() => localStorage.getItem("smart-cinema.auth-session"))).toBeNull();
  expect(unexpected).toEqual([]);
  expect(errors).toEqual([]);
});

test("Home Showtime shortcuts recover through Movie discovery instead of obsolete stopping points", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Showtimes", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Choose a Movie first");
  await page.getByRole("link", { name: "Choose a Movie", exact: true }).click();
  await expect(page).toHaveURL("/movies");
  await page.goto("/");
  await page.getByRole("button", { name: "View Showtimes", exact: true }).first().click();
  await page.getByRole("link", { name: "Choose a Movie", exact: true }).click();
  await expect(page).toHaveURL("/movies");
});

test("Auth forms expose truthful controls, accessible validation and existing API retries", async ({ page }, info) => {
  await mockCatalog(page);
  await page.goto("/login");
  await expect(page.getByRole("checkbox", { name: "Remember me" })).toHaveCount(0);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByLabel("Email Address", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await page.getByRole("link", { name: "Create Account", exact: true }).click();
  await capture(page, info, "register-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, info, "register-mobile");
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect(page.getByLabel("Full Name", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Full Name", { exact: true }).fill(PROFILE.fullName);
  await page.getByLabel("Email Address", { exact: true }).fill(PROFILE.email);
  await page.getByLabel("Phone Number", { exact: true }).fill(PROFILE.phone);
  await page.getByLabel("Password", { exact: true }).fill("PreviewOnly123!");
  await page.getByLabel("Confirm Password", { exact: true }).fill("PreviewOnly123!");
  let registrationCalls = 0;
  await page.route("**/api/v1/users", route => {
    expect(Object.keys(route.request().postDataJSON()).sort()).toEqual(["email", "fullName", "password", "phone"]);
    return ++registrationCalls === 1 ? route.fulfill({ status: 409, json: { detail: "Email already exists" } }) : route.fulfill({ status: 201, json: {} });
  });
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("already exists");
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect(page).toHaveURL("/login");
  let loginCalls = 0;
  await page.route("**/api/v1/auth/tokens", route => ++loginCalls === 1 ? route.fulfill({ status: 401, json: { detail: "Invalid credentials" } }) : route.fulfill({ json: TOKEN }));
  await page.getByLabel("Email Address", { exact: true }).fill(PROFILE.email);
  await page.getByLabel("Password", { exact: true }).fill("PreviewOnly123!");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Invalid credentials");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL("/");
  expect(registrationCalls).toBe(2);
  expect(loginCalls).toBe(2);
});

test("Profile loading/retry, edit/cancel, save errors and protected fields follow the existing contract", async ({ page }) => {
  await seedSession(page);
  await mockCatalog(page);
  let profile = { ...PROFILE };
  let gets = 0;
  let saves = 0;
  await page.route("**/api/v1/profile", async route => {
    expect(route.request().headers().authorization).toBe("Bearer qa-access");
    if (route.request().method() === "GET") {
      if (++gets === 1) { await new Promise(resolve => setTimeout(resolve, 300)); return route.fulfill({ status: 503, json: { detail: "Profile temporarily unavailable" } }); }
      return route.fulfill({ json: profile });
    }
    const payload = route.request().postDataJSON();
    expect(Object.keys(payload).sort()).toEqual(["fullName", "phone"]);
    if (++saves === 1) return route.fulfill({ status: 400, json: { detail: "Check your profile", errors: { phone: "Sample server phone validation" } } });
    profile = { ...profile, ...payload };
    return route.fulfill({ json: profile });
  });
  await page.goto("/profile");
  await expect(page.getByRole("status")).toContainText("Loading your profile");
  await expect(page.getByRole("alert").filter({ hasText: "Profile temporarily unavailable" })).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Profile", exact: true })).toBeVisible();
  await expect(page.getByText(/Verified/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Back to movies", exact: true })).toHaveAttribute("href", "/movies");
  for (const name of ["Email address", "Account role", "Account status"]) await expect(page.getByRole("textbox", { name: new RegExp(`^${name}`) })).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByRole("textbox", { name: "Full name", exact: true }).fill("Discard this");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Full name", exact: true })).toHaveValue(PROFILE.fullName);
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByRole("textbox", { name: "Full name", exact: true }).fill("Updated Customer");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Sample server phone validation", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Your profile has been updated.", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Full name", exact: true })).toHaveValue("Updated Customer");
  const summary = page.locator("summary").filter({ hasText: "Open account menu" });
  await summary.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Logout", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(page.locator("details")).not.toHaveAttribute("open", "");
  await expect(summary).toBeFocused();
});

test("Profile refuses anonymous and unauthorized sessions; expired sessions renew or recover to login", async ({ page }) => {
  await page.goto("/profile");
  await expect(page).toHaveURL("/login");
  await seedSession(page);
  await page.route("**/api/v1/profile", route => route.fulfill({ status: 401, json: { detail: "Session expired" } }));
  await page.goto("/profile");
  await expect(page).toHaveURL("/login");
  expect(await page.evaluate(() => localStorage.getItem("smart-cinema.auth-session"))).toBeNull();
});

test("expired Auth session renews through real contract and renewal failure clears the session", async ({ page }) => {
  await seedSession(page, true);
  let fail = false;
  await page.route("**/api/v1/auth/token-renewals", route => fail ? route.fulfill({ status: 401, json: { detail: "Refresh expired" } }) : route.fulfill({ json: TOKEN }));
  await page.route("**/api/v1/profile", route => route.fulfill({ json: PROFILE }));
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "My Profile", exact: true })).toBeVisible();
  fail = true;
  await page.reload();
  await expect(page).toHaveURL("/login");
  expect(await page.evaluate(() => localStorage.getItem("smart-cinema.auth-session"))).toBeNull();
});
