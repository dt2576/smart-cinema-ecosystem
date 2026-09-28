import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

const MOVIE_ID = "9223372036854775807";
const CINEMA_ID = "9007199254740993";
const ROUTE = `/movies/${MOVIE_ID}/cinemas/${CINEMA_ID}/showtimes`;
const movie = { id: MOVIE_ID, title: "Showtime Journey", duration: 125, releaseDate: "2029-01-01", ageRating: "T13", language: "English", posterUrl: "https://media.example.test/showtime.jpg", status: "PUBLISHED", genres: [], description: null, trailerUrl: null };

async function prepare(page: Page) {
  await page.clock.setFixedTime(new Date("2030-01-01T09:00:00+07:00"));
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ json: movie }));
  await page.route("https://media.example.test/**", route => route.fulfill({ path: resolve("public/images/movies/dune-part-two.jpg") }));
}

test("Cinema to Showtime preserves context, groups Halls and blocks sold-out/past options", async ({ page }) => {
  await prepare(page);
  const requests: string[] = [];
  page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/api/")) requests.push(path); });
  await page.goto(`/movies/${MOVIE_ID}/cinemas?cinemaId=${CINEMA_ID}&from=${encodeURIComponent("/movies?q=journey&page=2")}`);
  await page.getByRole("button", { name: "Continue to Showtimes" }).click();
  await expect(page).toHaveURL(new RegExp(ROUTE));
  const context = page.getByRole("region", { name: "Selected Movie and Cinema" });
  await expect(context).toContainText(movie.title);
  await expect(context).toContainText("Smart Cinema Landmark");
  await expect(page.getByText("Loading Showtimes…", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(7);
  await expect(page.getByRole("radio", { name: "Hall 1 00:00 Started / past" })).toBeDisabled();
  await expect(page.getByRole("radio", { name: "Hall 1 14:00 Sold out" })).toBeDisabled();
  await expect(page.getByRole("region", { name: "Hall 2", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to Seat Selection" })).toBeDisabled();
  await page.getByRole("radio", { name: "Hall 1 10:00 Available" }).check();
  await expect(page).toHaveURL(new RegExp(`showtimeId=${CINEMA_ID}01`));
  await page.reload();
  await expect(page.getByRole("radio", { name: "Hall 1 10:00 Available" })).toBeChecked();
  await page.getByRole("link", { name: "Change Cinema" }).click();
  await expect(page.getByRole("radio", { name: "Smart Cinema Landmark", exact: true })).toBeChecked();
  await page.getByRole("link", { name: "Back to Movie" }).click();
  await expect(page.getByRole("link", { name: "Back to Movies", exact: true })).toHaveAttribute("href", /q=journey&page=2/);
  expect(requests.every(path => path === `/api/v1/movies/${MOVIE_ID}`)).toBe(true);
});

test("date changes reset selection; back/reload preserve it and Continue opens Seats", async ({ page }) => {
  await prepare(page);
  await page.goto(ROUTE);
  await page.getByRole("radio", { name: "Hall 1 10:00 Available" }).check();
  await page.getByRole("button", { name: /Wed,? 2 Jan/ }).click();
  await expect(page.getByRole("button", { name: "Continue to Seat Selection" })).toBeDisabled();
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole("radio", { name: "Hall 1 10:00 Available" })).toBeChecked();
  const next = page.getByRole("button", { name: "Continue to Seat Selection" });
  await next.click();
  await expect(page.getByRole("heading", { name: "Select Seats", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Selected screening" })).toContainText("Smart Cinema Landmark");
  await expect(page.getByRole("region", { name: "Selected screening" })).toContainText("Hall 1");
  await page.getByRole("link", { name: "Change Showtime" }).click();
  await expect(page.getByRole("radio", { name: "Hall 1 10:00 Available" })).toBeChecked();
});

test("empty, retry, all sold-out/past and invalid selection/date states recover", async ({ page }) => {
  await prepare(page);
  await page.goto(`${ROUTE}?previewState=empty`);
  await expect(page.getByRole("heading", { name: "No Showtimes on this date" })).toBeVisible();
  await page.goto(`${ROUTE}?previewState=error`);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("radio")).toHaveCount(7);
  for (const state of ["sold-out", "past"]) {
    await page.goto(`${ROUTE}?previewState=${state}&showtimeId=${CINEMA_ID}01&step=seats`);
    await expect(page.getByText("Your choice is no longer available. Choose another Showtime.")).toBeVisible();
    for (const radio of await page.getByRole("radio").all()) await expect(radio).toBeDisabled();
    await expect(page.getByRole("button", { name: "Continue to Seat Selection" })).toBeDisabled();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await page.goto(`${ROUTE}?date=invalid&showtimeId=unknown&step=seats`);
  await expect(page.getByRole("heading", { name: "Choose a preview date" })).toBeVisible();
  await page.getByRole("button", { name: /Wed,? 2 Jan/ }).click();
  await expect(page.getByRole("radio")).toHaveCount(7);
  await expect(page.getByRole("button", { name: "Continue to Seat Selection" })).toBeDisabled();
});

test("invalid, closed or missing context blocks selection; Movie failures can retry", async ({ page }) => {
  await prepare(page);
  await page.goto(`/movies/${MOVIE_ID}/cinemas/invalid/showtimes`);
  await expect(page.getByRole("heading", { name: "Invalid selection link" })).toBeVisible();
  for (const id of ["103", "104", "999"]) {
    await page.goto(`/movies/${MOVIE_ID}/cinemas/${id}/showtimes`);
    await expect(page.getByRole("heading", { name: "Cinema unavailable" })).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(0);
  }
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ status: 404, json: { detail: "Movie is unavailable." } }));
  await page.goto(ROUTE);
  await expect(page.getByRole("heading", { name: "Movie unavailable" })).toBeVisible();
  let attempt = 0;
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill(++attempt === 1 ? { status: 503, body: "temporary" } : { json: movie }));
  await page.reload();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("radio")).toHaveCount(7);
});

test("a selected Showtime becomes disabled at its start time", async ({ page }) => {
  await prepare(page);
  await page.goto(ROUTE);
  await page.getByRole("radio", { name: "Hall 1 10:00 Available" }).check();
  await page.clock.setFixedTime(new Date("2030-01-01T10:00:00+07:00"));
  await expect(page.getByRole("radio", { name: "Hall 1 10:00 Started / past" })).toBeDisabled();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continue to Seat Selection" })).toBeDisabled();
});

test("canonical schedule responds to mobile and supports keyboard selection and Seat route return", async ({ page }, testInfo) => {
  await prepare(page);
  await page.goto(ROUTE);
  const first = page.getByRole("radio", { name: "Hall 1 10:00 Available" });
  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).toBeChecked();
  await page.screenshot({ path: testInfo.outputPath("showtime-selection-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("showtime-selection-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Continue to Seat Selection" }).click();
  await page.getByRole("link", { name: "Change Showtime" }).click();
  await expect(first).toBeChecked();
});
