import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

const MOVIE_ID = "9223372036854775807";
const CINEMA_ID = "9007199254740993";
const SHOWTIME_ID = `${CINEMA_ID}01`;
const SHOWTIMES = `/movies/${MOVIE_ID}/cinemas/${CINEMA_ID}/showtimes`;
const ROUTE = `/showtimes/${SHOWTIME_ID}/seats?movieId=${MOVIE_ID}&cinemaId=${CINEMA_ID}&date=2030-01-01`;
const movie = { id: MOVIE_ID, title: "Seat Journey", duration: 125, releaseDate: "2029-01-01", ageRating: "T13", language: "English", posterUrl: "https://media.example.test/seat.jpg", status: "PUBLISHED", genres: [], description: null, trailerUrl: null };
const coupleName = "E1-2, Couple, 2 guests, Available";

async function prepare(page: Page) {
  await page.clock.setFixedTime(new Date("2030-01-01T09:00:00+07:00"));
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ json: movie }));
  await page.route("https://media.example.test/**", route => route.fulfill({ path: resolve("public/images/movies/dune-part-two.jpg") }));
}

test("Showtime opens canonical Seats with context and indivisible couple selection", async ({ page }) => {
  await prepare(page);
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (document.body?.textContent?.includes("Loading Seat map…")) document.documentElement.dataset.seatLoadingObserved = "true";
    }).observe(document, { childList: true, subtree: true });
  });
  const apiPaths: string[] = [];
  page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/api/")) apiPaths.push(path); });
  await page.goto(`${SHOWTIMES}?from=${encodeURIComponent("/movies?q=journey&page=2")}`);
  await page.getByRole("radio", { name: "Hall 1 10:00 Available" }).check();
  await page.getByRole("button", { name: "Continue to Seat Selection" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-seat-loading-observed", "true");
  await expect(page).toHaveURL(new RegExp(`/showtimes/${SHOWTIME_ID}/seats\\?`));
  await expect(page.getByRole("region", { name: "Selected screening" })).toContainText("Seat Journey");
  await expect(page.getByRole("region", { name: "Selected screening" })).toContainText("Smart Cinema Landmark · Hall 1");
  await expect(page.getByRole("button", { name: "A3, Standard, 1 guest, Sold", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "C2, Standard, 1 guest, Unavailable", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "E3-4, Couple, 2 guests, Sold", exact: true })).toBeDisabled();
  const next = page.getByRole("button", { name: "Continue to Concessions" });
  await expect(next).toBeDisabled();
  await page.getByRole("button", { name: coupleName, exact: true }).click();
  const summary = page.getByRole("complementary", { name: "Seat selection summary" });
  await expect(summary).toContainText("1 Seat Unit · 2 guests");
  await expect(page.getByRole("button", { name: /^E1,/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^E2,/ })).toHaveCount(0);
  await page.getByRole("button", { name: "A1, Standard, 1 guest, Available", exact: true }).click();
  await expect(summary).toContainText("2 Seat Units · 3 guests");
  await page.getByRole("button", { name: "E1-2, Couple, 2 guests, Selected", exact: true }).click();
  await expect(summary).toContainText("1 Seat Unit · 1 guest");
  await page.getByRole("link", { name: "Change Showtime" }).click();
  await expect(page.getByRole("radio", { name: "Hall 1 10:00 Available" })).toBeChecked();
  await expect(page).toHaveURL(/from=/);
  expect(apiPaths.every(path => path === `/api/v1/movies/${MOVIE_ID}`)).toBe(true);
});

test("preview countdown never extends when adding units and expiry blocks Concession handoff", async ({ page }) => {
  await prepare(page);
  await page.goto(ROUTE);
  await page.getByRole("button", { name: coupleName, exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("10:00");
  await page.clock.setFixedTime(new Date("2030-01-01T09:05:00+07:00"));
  await page.getByRole("button", { name: "A1, Standard, 1 guest, Available", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("05:00");
  await page.clock.setFixedTime(new Date("2030-01-01T09:10:00+07:00"));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Preview expired. Choose your Seat Units again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to Concessions" })).toBeDisabled();
  await expect(page.getByRole("button", { name: coupleName, exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Restart preview" }).click();
  await expect(page.getByRole("timer")).toHaveText("Not started");
  await page.getByRole("button", { name: coupleName, exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("10:00");
});

test("empty, failed/retry and unavailable Seat maps stay separate", async ({ page }) => {
  await prepare(page);
  await page.goto(`${ROUTE}&seatPreview=empty`);
  await expect(page.getByRole("heading", { name: "No Seats to display" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to Concessions" })).toHaveCount(0);
  await page.goto(`${ROUTE}&seatPreview=error`);
  await expect(page.getByRole("heading", { name: "Seat map couldn’t load" })).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("button", { name: coupleName, exact: true })).toBeEnabled();
  await page.goto(`${ROUTE}&seatPreview=unavailable`);
  await expect(page.getByText("No selectable Seat Units in this preview.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to Concessions" })).toBeDisabled();
  for (const seat of await page.getByRole("region", { name: "Hall Seat map", exact: true }).getByRole("button").all()) await expect(seat).toBeDisabled();
});

test("missing, foreign, sold-out, past and hidden Movie contexts cannot expose selectable Seats", async ({ page }) => {
  await prepare(page);
  await page.goto(`/showtimes/${SHOWTIME_ID}/seats`);
  await expect(page.getByRole("heading", { name: "Invalid Seat Selection link" })).toBeVisible();
  for (const route of [ROUTE.replace(`cinemaId=${CINEMA_ID}`, "cinemaId=102"), ROUTE.replace("date=2030-01-01", "date=2030-01-02"), ROUTE.replace(`/showtimes/${SHOWTIME_ID}`, `/showtimes/${CINEMA_ID}02`), ROUTE.replace(`/showtimes/${SHOWTIME_ID}`, `/showtimes/${CINEMA_ID}00`)]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: "Showtime unavailable" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue to Concessions" })).toHaveCount(0);
  }
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ status: 404, json: { detail: "Movie unavailable." } }));
  await page.goto(ROUTE);
  await expect(page.getByRole("heading", { name: "Movie unavailable" })).toBeVisible();
  let attempt = 0;
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill(++attempt === 1 ? { status: 503, body: "temporary" } : { json: movie }));
  await page.reload();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("button", { name: coupleName, exact: true })).toBeEnabled();
});

test("Showtime start invalidates Seat selection even before the preview countdown expires", async ({ page }) => {
  await prepare(page);
  await page.clock.setFixedTime(new Date("2030-01-01T09:59:00+07:00"));
  await page.goto(ROUTE);
  await page.getByRole("button", { name: coupleName, exact: true }).click();
  await page.clock.setFixedTime(new Date("2030-01-01T10:00:00+07:00"));
  await expect(page.getByRole("heading", { name: "Showtime unavailable" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to Concessions" })).toHaveCount(0);
});

test("keyboard/mobile map and Concession route are usable; returning clears preview selection", async ({ page }, testInfo) => {
  await prepare(page);
  await page.goto(ROUTE);
  const couple = page.getByRole("button", { name: coupleName, exact: true });
  await couple.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "E1-2, Couple, 2 guests, Selected", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: testInfo.outputPath("seat-selection-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const map = page.getByRole("region", { name: "Scrollable Seat map" });
  await map.focus();
  await page.keyboard.press("End");
  await page.getByRole("button", { name: "E5-6, Couple, 2 guests, Available", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("seat-selection-mobile.png"), fullPage: true });
  const next = page.getByRole("button", { name: "Continue to Concessions" });
  await next.click();
  await expect(page.getByRole("heading", { name: "Food & Drinks", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Change Seats (select again)" }).click();
  await expect(page.getByRole("timer")).toHaveText("Not started");
  await expect(next).toBeDisabled();
  await expect(page.getByText("0 Seat Units · 0 guests", { exact: true })).toBeVisible();
});
