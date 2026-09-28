import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";

const BIG_ID = "9007199254740993";
const movies = Array.from({ length: 9 }, (_, index) => ({
  id: index === 0 ? BIG_ID : String(index + 1), title: `Catalog Story ${index + 1}`, duration: 120 + index,
  releaseDate: index % 2 === 0 ? "2040-01-01" : "2000-01-01", ageRating: "T13", language: "English",
  posterUrl: "https://media.example.test/home-poster.jpg", status: "PUBLISHED", genres: [{ id: BIG_ID, name: "Drama" }],
}));
const envelope = (items = movies) => ({ items, page: 0, size: 9, totalElements: items.length, totalPages: items.length ? 1 : 0, sort: "title,asc" });

async function mockHome(page: Page) {
  await page.route("https://media.example.test/**", route => route.fulfill({ path: resolve("public/images/movies/dune-part-two.jpg") }));
  await page.route("**/api/v1/movies?**", route => route.fulfill({ json: envelope() }));
  await page.route(`**/api/v1/movies/${BIG_ID}`, route => route.fulfill({ json: { ...movies[0], description: null, trailerUrl: null } }));
  await page.route("**/api/v1/genres", route => route.fulfill({ json: [] }));
}

test("Home uses one bounded catalog request, preserves server order/string IDs and offers real discovery links", async ({ page }) => {
  await mockHome(page);
  const requests: URL[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/v1/movies") requests.push(new URL(request.url())); });
  await page.goto("/");
  const firstRow = page.getByRole("region", { name: "Explore Movies", exact: true });
  const secondRow = page.getByRole("region", { name: "More to Explore", exact: true });
  await expect(firstRow.getByRole("article")).toHaveCount(5);
  await expect(secondRow.getByRole("article")).toHaveCount(4);
  await expect(firstRow.getByRole("heading", { level: 3 })).toHaveText(movies.slice(0, 5).map(movie => movie.title));
  await expect(secondRow.getByRole("heading", { level: 3 })).toHaveText(movies.slice(5).map(movie => movie.title));
  expect(requests).toHaveLength(1);
  expect(Object.fromEntries(requests[0].searchParams)).toEqual({ page: "0", size: "9", sort: "title,asc" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(movies[0].title);
  for (const name of ["Now Showing", "Coming Soon", "Opening Soon", "In Theatres Now", "Dune: Part Two"]) await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Explore Movies", exact: true })).toHaveAttribute("href", "/movies");
  await expect(page.getByRole("link", { name: "View All Movies" })).toHaveAttribute("href", "/movies");
  await expect(page.getByRole("link", { name: "Browse the Catalog" })).toHaveAttribute("href", "/movies");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Movies", exact: true })).toHaveAttribute("href", "/movies");
  await expect(page.getByRole("navigation", { name: "Footer navigation" }).getByRole("link", { name: "Movies", exact: true })).toHaveAttribute("href", "/movies");
  await expect(page.getByRole("region", { name: movies[0].title }).getByRole("link", { name: "View Details", exact: true })).toHaveAttribute("href", `/movies/${BIG_ID}`);
  await firstRow.getByRole("link", { name: `View details for ${movies[0].title}` }).click();
  await expect(page).toHaveURL(new RegExp(`/movies/${BIG_ID}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(movies[0].title);
});

test("loading and empty responses use a neutral hero with no sample Movie or fabricated detail link", async ({ page }) => {
  await mockHome(page);
  let release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/v1/movies?**", async route => { await ready; await route.fulfill({ json: envelope([]) }); });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Loading Movies" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your next story starts here");
  await expect(page.locator('a[href^="/movies/"]')).toHaveCount(0);
  release();
  await expect(page.getByRole("heading", { name: "The next story is on its way" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Explore Movies", exact: true }).getByRole("article")).toHaveCount(0);
  await page.getByRole("link", { name: "View All Movies" }).click();
  await expect(page).toHaveURL(/\/movies$/);
});

test("Home server failures retry, and a short catalog never pads with mock Movies", async ({ page }) => {
  await mockHome(page);
  await page.route("https://media.example.test/**", route => route.abort());
  let attempts = 0;
  await page.route("**/api/v1/movies?**", route => route.fulfill(++attempts === 1 ? { status: 503, body: "temporary" } : { json: envelope(movies.slice(0, 1)) }));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Movies couldn’t load" })).toBeVisible();
  await expect(page.locator('a[href^="/movies/"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(movies[0].title);
  await expect(page.getByRole("region", { name: "Explore Movies", exact: true }).getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "More to Explore", exact: true }).getByRole("article")).toHaveCount(0);
  await expect(page.getByText("Poster unavailable", { exact: true })).toBeVisible();
  expect(attempts).toBe(2);
});

test("network failure and nullable media recover without Movie-specific hero facts", async ({ page }) => {
  await mockHome(page);
  let attempts = 0;
  await page.route("**/api/v1/movies?**", route => ++attempts === 1 ? route.abort() : route.fulfill({ json: { ...envelope(), items: [{ ...movies[0], posterUrl: null, ageRating: null, genres: [] }] } }));
  await page.goto("/");
  await expect(page.getByText(/Check your connection/)).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(movies[0].title);
  await expect(page.getByRole("region", { name: movies[0].title }).getByRole("img")).toHaveCount(0);
  await expect(page.getByText("Poster unavailable", { exact: true })).toBeVisible();
});

test("existing authenticated account menu/profile/logout behavior survives Home integration", async ({ page }) => {
  await mockHome(page);
  await page.addInitScript(() => localStorage.setItem("smart-cinema.auth-session", JSON.stringify({
    accessToken: "test-access", tokenType: "Bearer", expiresAt: Date.now() + 3600000,
    refreshToken: "test-refresh", refreshExpiresAt: Date.now() + 86400000,
    user: { id: 1, email: "customer@example.test", fullName: "Cinema Customer", role: "CUSTOMER" },
  })));
  let revoked = false;
  await page.route("**/api/v1/auth/token-revocations", route => { revoked = true; return route.fulfill({ status: 204 }); });
  await page.goto("/");
  await page.locator("summary").filter({ hasText: "Open account menu" }).click();
  await expect(page.getByRole("link", { name: "My Profile", exact: true })).toHaveAttribute("href", "/profile");
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(page.getByRole("link", { name: "Sign In", exact: true })).toBeVisible();
  expect(revoked).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("smart-cinema.auth-session"))).toBeNull();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(movies[0].title);
});

test("Home retains its hero and two responsive Movie rows with keyboard and mobile navigation", async ({ page }, testInfo) => {
  await mockHome(page);
  await page.goto("/");
  await expect(page.getByRole("region", { name: "More to Explore", exact: true }).getByRole("article")).toHaveCount(4);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.locator('#home img').evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("home-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("home-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Movies", exact: true }).click();
  await expect(page).toHaveURL(/\/movies$/);
});
