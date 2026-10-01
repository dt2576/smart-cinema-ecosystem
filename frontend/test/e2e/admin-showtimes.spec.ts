import { test, expect, type Page } from "@playwright/test";
const ID = "9007199254740993", MOVIE = "9007199254740994", CINEMA = "9007199254740995", HALL = "9007199254740996";
const initial = { id: ID, movieId: MOVIE, movieTitle: "Published Movie", cinemaId: CINEMA, cinemaName: "Cinema A", hallId: HALL, hallName: "Hall A", startsAt: "2030-01-01T03:00:00Z", endsAt: "2030-01-01T05:00:00Z", occupiedUntil: "2030-01-01T05:00:00Z", bookingCutOff: "2030-01-01T03:00:00Z", basePrice: "90000.1234", status: "DRAFT", editable: true, transitions: ["SCHEDULED", "OPEN_FOR_BOOKING", "CANCELLED"] };
async function setup(page: Page) {
  await page.addInitScript(() => localStorage.setItem("smart-cinema.auth-session", JSON.stringify({ accessToken: "fixture-token", tokenType: "Bearer", expiresAt: Date.now() + 3600000, refreshToken: "fixture-refresh", refreshExpiresAt: Date.now() + 86400000, user: { id: 1, fullName: "Admin", email: "admin@example.test", role: "ADMIN" } })));
  await page.route("**/api/v1/admin", route => route.fulfill({ json: { id: "1", fullName: "Verified Admin", role: "ADMIN" } }));
  let saved = { ...initial }; const writes: Record<string, string>[] = [];
  await page.route("**/api/v1/admin/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    if (path === "/api/v1/admin/cinemas") return route.fulfill({ json: [{ id: CINEMA, name: "Cinema A", address: "Address", status: "ACTIVE" }, { id: "102", name: "Cinema B", address: "Address", status: "ACTIVE" }] });
    if (/\/cinemas\/\d+\/halls$/.test(path)) return route.fulfill({ json: path.includes(CINEMA) ? [{ id: HALL, cinemaId: CINEMA, name: "Hall A", status: "ACTIVE", layoutInitialized: true, capacity: 4 }] : [] });
    if (path === "/api/v1/admin/movies") return route.fulfill({ json: { items: [{ id: MOVIE, title: "Published Movie", status: "PUBLISHED" }, { id: "103", title: "Hidden Movie", status: "DRAFT" }], page: 0, totalPages: 1 } });
    if (path === "/api/v1/admin/showtimes" && request.method() === "GET") return route.fulfill({ json: { timeZone: "Asia/Ho_Chi_Minh", items: url.searchParams.get("status") === "ENDED" ? [] : [saved] } });
    if (path === `/api/v1/admin/showtimes/${ID}` && request.method() === "GET") return route.fulfill({ json: { timeZone: "Asia/Ho_Chi_Minh", showtime: saved } });
    if (path.startsWith("/api/v1/admin/showtimes") && ["POST", "PUT"].includes(request.method())) {
      const body = request.postDataJSON(); writes.push(body);
      const retimed = body.startsAt !== saved.startsAt;
      const endsAt = retimed ? new Date(Date.parse(body.startsAt) + 120 * 60000).toISOString() : saved.endsAt;
      saved = { ...saved, ...body, endsAt, occupiedUntil: retimed ? endsAt : saved.occupiedUntil, bookingCutOff: retimed ? body.startsAt : saved.bookingCutOff, editable: body.status !== "CANCELLED", transitions: body.status === "CANCELLED" ? [] : body.status === "OPEN_FOR_BOOKING" ? ["CANCELLED"] : ["OPEN_FOR_BOOKING", "CANCELLED"] };
      return route.fulfill({ status: request.method() === "POST" ? 201 : 200, json: { timeZone: "Asia/Ho_Chi_Minh", showtime: saved } });
    }
    return route.fallback();
  });
  return writes;
}
test("Showtime routes independently guard anonymous, forged and stale Admin", async ({ page }) => {
  for (const path of ["/admin/showtimes", "/admin/showtimes/new", `/admin/showtimes/${ID}/edit`]) {
    await page.goto(path); await expect(page.getByRole("heading", { name: "Sign in required" })).toBeVisible();
  }
  await setup(page);
  await page.route("**/api/v1/admin", route => route.fulfill({ status: 403, json: { detail: "Active Admin required." } }));
  await page.goto("/admin/showtimes/new"); await expect(page.getByRole("heading", { name: "Admin access denied" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Showtime" })).toHaveCount(0);
});
test("list, strict filters, empty and retry states are accessible", async ({ page }) => {
  await setup(page); let calls = 0;
  await page.route("**/api/v1/admin/showtimes", route => ++calls === 1 ? route.fulfill({ status: 503, json: { detail: "Temporary schedule outage" } }) : route.fallback());
  await page.goto("/admin/showtimes"); await expect(page.getByRole("main").getByRole("alert")).toContainText("Temporary schedule outage");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("article")).toContainText("90000.1234");
  await expect(page.getByRole("article")).toContainText("2030-01-01 10:00");
  await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("ENDED");
  await page.getByRole("button", { name: "Apply filters" }).click(); await expect(page.getByRole("status")).toHaveText("No Showtimes match these filters.");
  await page.getByRole("button", { name: "Clear", exact: true }).click(); await expect(page.getByRole("article")).toHaveCount(1);
});
test("dependent hierarchy, exact price, configured-zone create and forward lifecycle", async ({ page }, info) => {
  const writes = await setup(page); await page.goto("/admin/showtimes/new");
  await expect(page.getByText("Scheduled timezone: Asia/Ho_Chi_Minh", { exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "Hidden Movie" })).toHaveCount(0);
  await expect(page.getByRole("option", { name: "STARTED", exact: true })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Movie", exact: true }).selectOption(MOVIE); await page.getByRole("combobox", { name: "Cinema", exact: true }).selectOption(CINEMA);
  await page.getByRole("combobox", { name: "Hall", exact: true }).selectOption(HALL);
  await page.getByRole("combobox", { name: "Cinema", exact: true }).selectOption("102"); await expect(page.getByRole("combobox", { name: "Hall", exact: true })).toHaveValue("");
  await page.getByRole("combobox", { name: "Cinema", exact: true }).selectOption(CINEMA); await page.getByRole("combobox", { name: "Hall", exact: true }).selectOption(HALL);
  await page.getByLabel("Date", { exact: true }).fill("2030-01-02"); await page.getByLabel("Time", { exact: true }).fill("00:30");
  await page.getByLabel("Base price", { exact: true }).fill("90000.1234"); await page.getByRole("combobox", { name: "Lifecycle", exact: true }).selectOption("OPEN_FOR_BOOKING");
  await page.getByRole("button", { name: "Save Showtime" }).click(); await expect(page.getByText("Showtime saved.", { exact: true })).toBeVisible();
  expect(writes).toEqual([{ movieId: MOVIE, hallId: HALL, startsAt: "2030-01-01T17:30:00.000Z", basePrice: "90000.1234", status: "OPEN_FOR_BOOKING" }]);
  await expect(page.getByRole("combobox", { name: "Hall", exact: true })).toBeDisabled();
  await expect(page.getByRole("option", { name: "DRAFT", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Stored Showtime" })).toContainText("2030-01-02 02:30");
  await page.screenshot({ path: info.outputPath("showtime-admin-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("showtime-admin-mobile.png"), fullPage: true });
  await page.getByRole("combobox", { name: "Lifecycle", exact: true }).selectOption("CANCELLED"); await page.getByRole("button", { name: "Save Showtime" }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Save Showtime" })).toBeDisabled();
  await expect(page.getByRole("region", { name: "Stored Showtime" })).toContainText("CANCELLED");
});
test("duplicate submission remains one request and expected conflict can retry", async ({ page }) => {
  await setup(page); let calls = 0; let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**/api/v1/admin/showtimes/${ID}`, async route => {
    if (route.request().method() === "GET") return route.fallback();
    calls++; await pending;
    return calls === 1 ? route.fulfill({ status: 409, json: { detail: "Showtime overlaps another screening." } }) : route.fallback();
  });
  await page.goto(`/admin/showtimes/${ID}/edit`); const save = page.getByRole("button", { name: "Save Showtime" });
  await save.click(); await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await page.keyboard.press("Enter"); expect(calls).toBe(1); release();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("overlaps"); await save.click(); await expect(page.getByText("Showtime saved.", { exact: true })).toBeVisible();
  expect(calls).toBe(2);
});
test("history/terminal detail is readable with no mutation controls", async ({ page }) => {
  await setup(page);
  await page.route(`**/api/v1/admin/showtimes/${ID}`, route => route.fulfill({ json: { timeZone: "Asia/Ho_Chi_Minh", showtime: { ...initial, editable: false, transitions: [] } } }));
  await page.goto(`/admin/showtimes/${ID}/edit`); await expect(page.getByRole("button", { name: "Save Showtime" })).toBeDisabled();
  await expect(page.getByRole("status").filter({ hasText: "This Showtime is read-only" })).toBeVisible(); await expect(page.getByRole("region", { name: "Stored Showtime" })).toContainText(ID);
});
