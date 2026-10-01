import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";

const BIG_ID = "9007199254740993";
const genre = { id: BIG_ID, name: "Drama" };
const movie = { id: BIG_ID, title: "Admin Movie", duration: 120, releaseDate: "2026-10-01", ageRating: "T13", language: "Vietnamese", posterUrl: "/file.svg", description: null, trailerUrl: null, status: "DRAFT", genres: [genre] };

async function session(page: Page, role = "ADMIN") {
  await page.addInitScript(({ role }) => localStorage.setItem("smart-cinema.auth-session", JSON.stringify({
    accessToken: "admin-test-token", tokenType: "Bearer", expiresAt: Date.now() + 3600_000,
    refreshToken: "test-refresh", refreshExpiresAt: Date.now() + 86400_000,
    user: { id: 1, fullName: "Admin Test", email: "admin@example.test", role },
  })), { role });
}
async function api(page: Page) {
  await page.route("**/api/v1/admin", route => route.fulfill({ json: { id: "1", fullName: "Verified Admin", role: "ADMIN" } }));
  await page.route("**/api/v1/genres", route => route.fulfill({ json: [genre] }));
  await page.route("**/api/v1/admin/movies?**", route => route.fulfill({ json: { items: [movie], page: 0, size: 20, totalElements: 1, totalPages: 1, sort: "title,asc" } }));
  await page.route(`**/api/v1/admin/movies/${BIG_ID}`, route => route.fulfill({ json: movie }));
}

test("all Admin deep links deny unauthenticated access before rendering management", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/v1/admin/**", route => { calls++; return route.abort(); });
  for (const path of ["/admin", "/admin/movies", "/admin/movies/new", `/admin/movies/${BIG_ID}/edit`]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Sign in required" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/login");
    await expect(page.getByRole("button", { name: /Create draft|Save changes/ })).toHaveCount(0);
  }
  expect(calls).toBe(0);
});
test("CUSTOMER and forged local Admin role cannot bypass backend authorization", async ({ page }) => {
  await session(page, "CUSTOMER"); await api(page);
  let movies = 0;
  await page.route("**/api/v1/admin/movies?**", route => { movies++; return route.abort(); });
  await page.route("**/api/v1/admin", route => route.fulfill({ status: 403, json: { detail: "Denied" } }));
  await page.goto("/admin/movies");
  await expect(page.getByRole("heading", { name: "Admin access denied" })).toBeVisible();
  await page.evaluate(() => { const saved = JSON.parse(localStorage.getItem("smart-cinema.auth-session")!); saved.user.role = "ADMIN"; localStorage.setItem("smart-cinema.auth-session", JSON.stringify(saved)); });
  await page.goto("/admin/movies/new");
  await expect(page.getByRole("heading", { name: "Admin access denied" })).toBeVisible();
  expect(movies).toBe(0);
});
test("Admin verification failure can retry and verified backend identity controls shell", async ({ page }) => {
  await session(page, "CUSTOMER"); await api(page);
  let calls = 0;
  await page.route("**/api/v1/admin", route => route.fulfill(++calls === 1 ? { status: 503, json: { detail: "Temporary outage" } } : { json: { id: "1", fullName: "Verified Admin", role: "ADMIN" } }));
  await page.goto("/admin");
  await expect(page.getByText("Temporary outage")).toBeVisible();
  await page.getByRole("button", { name: "Retry access check" }).click();
  await expect(page.getByRole("heading", { name: "Admin Home" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Admin navigation" }).getByRole("link")).toHaveCount(4);
  await page.getByRole("link", { name: "Movies", exact: true }).click();
  await expect(page.getByRole("heading", { name: movie.title })).toBeVisible();
  expect(calls).toBe(3);
});
test("Movie list loading, API failure, retry, empty and pagination", async ({ page }) => {
  await session(page); await api(page);
  let calls = 0;
  await page.route("**/api/v1/admin/movies?**", async route => {
    await new Promise(resolve => setTimeout(resolve, 200));
    calls++;
    const query = new URL(route.request().url()).searchParams;
    await route.fulfill(calls === 1 ? { status: 503, json: { detail: "Try later" } } : { json: { items: query.get("q") === "missing" ? [] : [movie], page: Number(query.get("page")), size: 20, totalElements: 21, totalPages: 2, sort: "title,asc" } });
  });
  await page.goto("/admin/movies");
  await expect(page.getByText("Loading Movies…")).toBeVisible();
  await page.getByRole("button", { name: "Retry Movies" }).click();
  await expect(page.getByRole("heading", { name: movie.title })).toBeVisible();
  await expect(page.getByRole("link", { name: `Edit ${movie.title}` })).toHaveAttribute("href", `/admin/movies/${BIG_ID}/edit`);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2 of 2", { exact: false })).toBeVisible();
  await page.getByLabel("Search by title").fill("missing");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No Movies found" })).toBeVisible();
});
test("create form uses real Genre options, validates and saves a draft with string IDs", async ({ page }) => {
  await session(page); await api(page);
  let payload: unknown;
  await page.route("**/api/v1/admin/movies", route => { payload = route.request().postDataJSON(); return route.fulfill({ status: 201, json: movie }); });
  await page.goto("/admin/movies/new");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText("Enter a title of at most 255 characters.")).toBeVisible();
  await page.getByLabel("Title", { exact: false }).fill("New draft");
  await page.getByLabel("Duration (minutes)", { exact: false }).fill("120");
  await page.getByRole("checkbox", { name: "Drama" }).check();
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/admin\/movies\?created=1$/);
  await expect(page.getByText("Movie draft created.", { exact: false })).toBeVisible();
  expect(payload).toEqual({ title: "New draft", duration: 120, releaseDate: null, ageRating: null, language: null, posterUrl: null, description: null, trailerUrl: null, genreIds: [BIG_ID] });
});
test("edit saves supported fields and publication failures retain useful feedback", async ({ page }) => {
  await session(page); await api(page);
  let saved: unknown;
  await page.route(`**/api/v1/admin/movies/${BIG_ID}`, route => {
    if (route.request().method() === "PUT") { saved = route.request().postDataJSON(); return route.fulfill({ json: movie }); }
    return route.fulfill({ json: movie });
  });
  await page.goto(`/admin/movies/${BIG_ID}/edit`);
  await expect(page.getByLabel("Title", { exact: false })).toHaveValue(movie.title);
  await page.getByLabel("Title", { exact: false }).fill("Edited Movie");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Movie changes saved.")).toBeVisible();
  expect((saved as { title: string }).title).toBe("Edited Movie");
  await page.getByRole("link", { name: "Back to Movies", exact: false }).click();
  await page.route(`**/api/v1/admin/movies/${BIG_ID}/publication`, route => route.fulfill({ status: 400, json: { detail: "Poster required", errors: { posterUrl: "Required" } } }));
  await page.getByRole("button", { name: `Publish ${movie.title}` }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Poster required");
  await expect(page.getByRole("button", { name: /Delete/ })).toHaveCount(0);
});
test("publication and unpublication reload authoritative server state", async ({ page }) => {
  await session(page); await api(page);
  let status = "DRAFT";
  await page.route("**/api/v1/admin/movies?**", route => route.fulfill({ json: { items: [{ ...movie, status }], page: 0, size: 20, totalElements: 1, totalPages: 1, sort: "title,asc" } }));
  await page.route(`**/api/v1/admin/movies/${BIG_ID}/publication`, route => {
    status = route.request().postDataJSON().status;
    return route.fulfill({ json: { ...movie, status } });
  });
  await page.goto("/admin/movies");
  await page.getByRole("button", { name: `Publish ${movie.title}` }).click();
  await expect(page.getByRole("button", { name: `Unpublish ${movie.title}` })).toBeVisible();
  await page.getByRole("button", { name: `Unpublish ${movie.title}` }).click();
  await expect(page.getByText("UNPUBLISHED", { exact: true })).toBeVisible();
});
test("form missing Movie, Genre retry, server validation and expired access", async ({ page }) => {
  await session(page); await api(page);
  await page.route("**/api/v1/admin/movies/404", route => route.fulfill({ status: 404, json: { detail: "Movie is unavailable." } }));
  await page.goto("/admin/movies/404/edit");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Movie is unavailable.");
  let genres = 0;
  await page.route("**/api/v1/genres", route => route.fulfill(++genres === 1 ? { status: 503, body: "outage" } : { json: [genre] }));
  await page.goto("/admin/movies/new");
  await page.getByRole("button", { name: "Retry form" }).click();
  await page.getByLabel("Title", { exact: false }).fill("Invalid");
  await page.getByLabel("Duration (minutes)", { exact: false }).fill("120");
  await page.route("**/api/v1/admin/movies", route => route.fulfill({ status: 400, json: { detail: "Invalid title", errors: { title: "Rejected by server" } } }));
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText("Rejected by server")).toBeVisible();
  await page.route("**/api/v1/admin/movies", route => route.fulfill({ status: 401, json: { detail: "Expired token" } }));
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByRole("heading", { name: "Admin access denied" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create draft" })).toHaveCount(0);
});
test("desktop/mobile shell and forms have no overflow and keyboard controls work", async ({ page }) => {
  await session(page); await api(page);
  await page.goto("/admin/movies");
  await expect(page.getByRole("heading", { name: movie.title })).toBeVisible();
  await page.screenshot({ path: resolve("test-results/admin-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Create Movie", exact: true }).click();
  await expect(page.getByRole("button", { name: "Create draft" })).toBeVisible();
  await page.getByLabel("Title", { exact: false }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Duration (minutes)", { exact: false })).toBeFocused();
  await page.getByRole("checkbox", { name: "Drama" }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("checkbox", { name: "Drama" })).toBeChecked();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: resolve("test-results/admin-mobile.png"), fullPage: true });
});
