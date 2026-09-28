import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";

const BIG_ID = "9007199254740993";
const genres = [{ id: "11", name: "Action" }, { id: "12", name: "Action" }, { id: BIG_ID, name: "Drama" }];
const movie = {
  id: BIG_ID, title: "Across the Stars", duration: 142, releaseDate: "2026-09-25", ageRating: "T13",
  language: "English", posterUrl: "https://media.example.test/poster.jpg", status: "PUBLISHED", genres: [genres[2]],
};

async function mockCatalog(page: Page) {
  await page.route("https://media.example.test/**", route => route.abort());
  await page.route("**/api/v1/genres", route => route.fulfill({ json: genres }));
  await page.route("**/api/v1/movies?**", route => {
    const query = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: { items: [movie], page: Number(query.get("page")), size: Number(query.get("size")), totalElements: 41, totalPages: 3, sort: query.get("sort") } });
  });
  await page.route(`**/api/v1/movies/${BIG_ID}`, route => route.fulfill({ json: { ...movie, description: "A journey through distant worlds.", trailerUrl: "https://example.test/trailer" } }));
}

test("public catalog, real options contract, string IDs, filters, pagination and detail return navigation", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/movies?page=2");
  await expect(page.getByRole("heading", { name: movie.title })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Genre", exact: true }).locator("option")).toHaveCount(4);
  await page.getByLabel("Search by title").fill("  stars %_  ");
  await page.getByRole("combobox", { name: "Genre", exact: true }).selectOption(BIG_ID);
  await page.getByRole("combobox", { name: "Sort by", exact: true }).selectOption("releaseDate,desc");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/page=0/);
  await expect(page.getByRole("combobox", { name: "Genre", exact: true })).toHaveValue(BIG_ID);
  const query = new URL(page.url()).searchParams;
  expect(query.get("q")).toBe("stars %_");
  expect(query.get("genreId")).toBe(BIG_ID);
  expect(query.get("sort")).toBe("releaseDate,desc");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=1/);
  await page.getByRole("link", { name: `View details for ${movie.title}` }).click();
  await expect(page).toHaveURL(new RegExp(`/movies/${BIG_ID}`));
  await expect(page.getByRole("heading", { name: movie.title })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Synopsis" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Watch Trailer/ })).toHaveAttribute("href", "https://example.test/trailer");
  await expect(page.getByRole("button", { name: /showtime|cinema|book/i })).toHaveCount(0);
  await page.getByRole("link", { name: "Back to Movies" }).click();
  await expect(page).toHaveURL(/page=1/);
  await expect(page.getByLabel("Search by title")).toHaveValue("stars %_");
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Genre", exact: true })).toHaveValue(BIG_ID);
  await page.goBack();
  await expect(page.getByRole("heading", { name: movie.title })).toBeVisible();
});

test("catalog and Genre failures retry independently; loading and successful empty metadata remain distinct", async ({ page }) => {
  await mockCatalog(page);
  let movieCalls = 0;
  let genreCalls = 0;
  await page.route("**/api/v1/genres", route => route.fulfill(++genreCalls === 1 ? { status: 503, json: { detail: "temporary" } } : { json: [] }));
  await page.route("**/api/v1/movies?**", async route => {
    await new Promise(resolve => setTimeout(resolve, 250));
    await route.fulfill(++movieCalls === 1 ? { status: 503, body: "proxy failure" } : { json: { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0, sort: "title,asc" } });
  });
  await page.goto("/movies");
  await expect(page.getByRole("status", { name: "Loading Movies" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Movies couldn’t load" })).toBeVisible();
  await page.getByRole("button", { name: "Retry Genres" }).click();
  await expect(page.getByText("No Genre options are available yet.")).toBeVisible();
  expect(movieCalls).toBe(1);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "The next story is on its way" })).toBeVisible();
});

test("empty search, out-of-range pages and malformed filters provide recovery", async ({ page }) => {
  await mockCatalog(page);
  await page.route("**/api/v1/movies?**", route => route.fulfill({ json: { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0, sort: "title,asc" } }));
  await page.goto("/movies?q=absent");
  await expect(page.getByRole("heading", { name: "No matching Movies" })).toBeVisible();
  await page.goto("/movies?page=999");
  await expect(page.getByRole("heading", { name: "No Movies on this page" })).toBeVisible();
  await page.getByRole("button", { name: "Go to first page" }).click();
  await expect(page).toHaveURL(/page=0/);
  await page.goto("/movies?q=one&q=two");
  await expect(page.getByRole("heading", { name: "Check your filters" })).toBeVisible();
  await page.getByRole("link", { name: "Reset filters" }).click();
  await expect(page.getByRole("heading", { name: "The next story is on its way" })).toBeVisible();
});

test("server validation, overlong title input and unknown Genre links preserve recoverability", async ({ page }) => {
  await mockCatalog(page);
  await page.route("**/api/v1/movies?**", route => route.fulfill({ status: 400, json: { title: "Invalid request", detail: "Check the selected Genre." } }));
  await page.goto("/movies?genreId=777");
  await expect(page.getByText("Check the selected Genre.")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Genre", exact: true })).toHaveValue("777");
  await page.getByLabel("Search by title").fill("🎬".repeat(256));
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("search", { name: "Search Movies" }).getByRole("alert")).toContainText("at most 255");
});

test("detail missing/hidden, invalid ID and transient error states", async ({ page }) => {
  await mockCatalog(page);
  await page.route("**/api/v1/movies/12", route => route.fulfill({ status: 404, json: { detail: "Movie is unavailable." } }));
  await page.goto("/movies/12");
  await expect(page.getByRole("heading", { name: "Movie unavailable" })).toBeVisible();
  await page.goto("/movies/not-an-id");
  await expect(page.getByRole("heading", { name: "Invalid Movie link" })).toBeVisible();
  let calls = 0;
  await page.route(`**/api/v1/movies/${BIG_ID}`, route => route.fulfill(++calls === 1 ? { status: 503, body: "temporary" } : { json: { ...movie, description: null, trailerUrl: null, posterUrl: null, releaseDate: null, genres: [] } }));
  await page.goto(`/movies/${BIG_ID}`);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: movie.title })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Synopsis" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Watch Trailer/ })).toHaveCount(0);
  await expect(page.getByText("Poster unavailable")).toBeVisible();
});

test("late search responses cannot replace a newer result", async ({ page }) => {
  await mockCatalog(page);
  let releaseOld!: () => void;
  const oldResponse = new Promise<void>(resolve => { releaseOld = resolve; });
  let oldRequested!: () => void;
  const requested = new Promise<void>(resolve => { oldRequested = resolve; });
  await page.route("**/api/v1/movies?**", async route => {
    const q = new URL(route.request().url()).searchParams.get("q");
    if (q === "old") { oldRequested(); await oldResponse; }
    await route.fulfill({ json: { items: [{ ...movie, title: q === "old" ? "Old result" : "New result" }], page: 0, size: 20, totalElements: 1, totalPages: 1, sort: "title,asc" } }).catch(() => {});
  });
  await page.goto("/movies");
  await page.getByLabel("Search by title").fill("old");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await requested;
  await page.getByLabel("Search by title").fill("new");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "New result" })).toBeVisible();
  releaseOld();
  await expect(page.getByRole("heading", { name: "Old result" })).toHaveCount(0);
});

test("desktop and mobile layout, keyboard navigation, media fallback and reduced motion", async ({ page }, testInfo) => {
  await mockCatalog(page);
  await page.route("**/api/v1/movies?**", route => route.fulfill({ json: { items: Array.from({ length: 5 }, (_, index) => ({ ...movie, id: index === 0 ? BIG_ID : String(index + 1), title: index === 0 ? movie.title : `Story ${index + 1}` })), page: 0, size: 20, totalElements: 5, totalPages: 1, sort: "title,asc" } }));
  await page.goto("/movies");
  await expect(page.getByRole("heading", { name: movie.title })).toBeVisible();
  await expect(page.getByText("Poster unavailable")).toHaveCount(5);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.screenshot({ path: testInfo.outputPath("movie-list-desktop.png"), fullPage: true });
  await page.getByRole("link", { name: `View details for ${movie.title}` }).click();
  await expect(page.getByRole("heading", { name: movie.title })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("movie-detail-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("heading", { name: movie.title })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("movie-detail-mobile.png"), fullPage: true });
  await page.getByRole("link", { name: "Back to Movies" }).click();
  await expect(page.getByRole("heading", { name: movie.title })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.getByRole("button", { name: "Close navigation" }).click();
  await page.screenshot({ path: testInfo.outputPath("movie-list-mobile.png"), fullPage: true });
});

test("populated poster layouts retain the canonical catalog grid and detail hierarchy", async ({ page }, testInfo) => {
  await mockCatalog(page);
  const posters = ["dune-part-two", "oppenheimer", "civil-war", "past-lives", "spider-man-across-the-spider-verse"];
  const titles = ["Dune: Part Two", "Oppenheimer", "Civil War", "Past Lives", "Across the Spider-Verse"];
  await page.route("https://media.example.test/**", route => {
    const index = Number(new URL(route.request().url()).searchParams.get("index") || 0);
    return route.fulfill({ path: resolve(`public/images/movies/${posters[index]}.jpg`) });
  });
  await page.route("**/api/v1/movies?**", route => route.fulfill({ json: { items: titles.map((title, index) => ({ ...movie, id: index === 0 ? BIG_ID : String(index + 1), title, posterUrl: `https://media.example.test/poster.jpg?index=${index}` })), page: 0, size: 20, totalElements: 5, totalPages: 1, sort: "title,asc" } }));
  await page.goto("/movies");
  await expect(page.getByRole("img")).toHaveCount(5);
  await expect.poll(() => page.getByRole("img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("movie-list-posters-desktop.png"), fullPage: true });
  await page.getByRole("link", { name: "View details for Dune: Part Two" }).click();
  await expect(page.getByRole("img", { name: `${movie.title} poster` })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("movie-detail-poster-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("movie-detail-poster-mobile.png"), fullPage: true });
  await page.getByRole("link", { name: "Back to Movies" }).click();
  await expect(page.getByRole("heading", { name: "Dune: Part Two" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("movie-list-posters-mobile.png"), fullPage: true });
});
