import { mockDiscoveryReads, isCustomerReadPath } from "./helpers/customer-discovery";
import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

const MOVIE_ID = "9223372036854775807";
const CINEMA_ID = "9007199254740993";
const SHOWTIME_ID = "9007199254741001";
const SEATS = `/showtimes/${SHOWTIME_ID}/seats?movieId=${MOVIE_ID}&cinemaId=${CINEMA_ID}&date=2030-01-01`;
const CONCESSIONS = "/bookings/preview/concessions";
async function enter(page: Page, scenario = "default", time = "09:00:00") {
  await mockDiscoveryReads(page);
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (document.body?.textContent?.includes("Loading Concessions...")) document.documentElement.dataset.concessionLoadingObserved = "true";
    }).observe(document, { childList: true, subtree: true });
  });
  await page.clock.setFixedTime(new Date(`2030-01-01T${time}+07:00`));
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ json: { id: MOVIE_ID, title: "Concession Journey", duration: 125, releaseDate: "2029-01-01", ageRating: "T13", language: "English", posterUrl: "https://media.example.test/movie.jpg", status: "PUBLISHED", genres: [], description: null, trailerUrl: null } }));
  await page.route("https://media.example.test/**", route => route.fulfill({ path: resolve("public/images/movies/dune-part-two.jpg") }));
  await page.goto(`${SEATS}&concessionPreview=${scenario}`);
  await page.getByRole("button", { name: "E1-2, Couple, 2 guests, Available", exact: true }).click();
  await page.getByRole("button", { name: "A1, Standard, 1 guest, Available", exact: true }).click();
  await page.getByRole("button", { name: "Continue to Concessions" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-concession-loading-observed", "true");
  await expect(page.getByRole("heading", { name: "Food & Drinks", exact: true })).toBeVisible();
}

test("Concessions retain screening and whole Seat Units, filter categories and calculate optional add-ons", async ({ page }) => {
  const apiPaths: string[] = [];
  page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/api/")) apiPaths.push(path); });
  await enter(page);
  await expect(page).toHaveURL(new RegExp(CONCESSIONS));
  const summary = page.getByRole("complementary", { name: "Concession selection summary" });
  await expect(summary).toContainText("2 Seat Units · 3 guests");
  await expect(summary).toContainText("E1-2 (Couple, 2 guests)");
  await expect(page.getByRole("region", { name: "Selected screening" })).toContainText("Smart Cinema Landmark · Hall 1");
  await expect(page.getByRole("region", { name: "Selected screening" })).toContainText("10:00");
  const next = page.getByRole("button", { name: "Continue to Booking Summary" });
  await next.click();
  await expect(page.getByRole("region", { name: "Selected Concessions" })).toContainText("No add-ons selected.");
  await page.getByRole("link", { name: "Back to Concessions", exact: true }).click();
  await page.getByRole("button", { name: "Increase Movie Combo", exact: true }).click();
  await page.getByRole("button", { name: "Drinks", exact: true }).click();
  await expect(page.getByRole("article", { name: "Movie Combo", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Increase Cola", exact: true }).click();
  await expect(summary).toContainText("155,000");
  await page.getByRole("button", { name: "Decrease Cola", exact: true }).click();
  await expect(page.getByRole("button", { name: "Decrease Cola", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.getByRole("button", { name: "Increase Caramel Popcorn" })).toBeDisabled();
  await next.click();
  await expect(page.getByRole("region", { name: "Selected Concessions" })).toContainText("Movie Combo × 1");
  await expect(page.getByRole("region", { name: "Selected Concessions" })).toContainText("120,000");
  await expect(page.getByText(/No Seat Hold, Booking or Payment has been created/)).toBeVisible();
  expect(apiPaths.every(isCustomerReadPath)).toBe(true);
});

test("changing add-ons cannot extend deadline; expiry blocks summary and requires Seat reselection", async ({ page }, testInfo) => {
  await enter(page);
  await page.clock.setFixedTime(new Date("2030-01-01T09:05:00+07:00"));
  await page.getByRole("button", { name: "Increase Movie Combo" }).click();
  await expect(page.getByRole("timer")).toHaveText("05:00");
  await page.clock.setFixedTime(new Date("2030-01-01T09:10:00+07:00"));
  await expect(page.getByRole("dialog")).toHaveAccessibleName("Seat preview expired");
  await page.screenshot({ path: testInfo.outputPath("concession-expired-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("concession-expired-mobile.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Continue to Booking Summary" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Increase Movie Combo" })).toBeDisabled();
  await page.getByRole("link", { name: "Return to Seat Selection" }).click();
  await expect(page.getByRole("timer")).toHaveText("Not started");
  await expect(page.getByText("0 Seat Units · 0 guests", { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Choose your Seats first" })).toBeVisible();
});

test("empty and unavailable menus allow no add-ons; retry retains original deadline", async ({ page }) => {
  for (const scenario of ["empty", "unavailable"]) {
    await enter(page, scenario);
    await page.getByRole("button", { name: "Continue to Booking Summary" }).click();
    await expect(page.getByRole("region", { name: "Selected Concessions" })).toContainText("No add-ons selected.");
    await page.getByRole("link", { name: "Back to Concessions", exact: true }).click();
    if (scenario === "unavailable") for (const button of await page.getByRole("button", { name: /^Increase / }).all()) await expect(button).toBeDisabled();
  }
  await enter(page, "error");
  await expect(page.getByRole("heading", { name: "Concessions couldn't load" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to Booking Summary" })).toBeDisabled();
  await page.clock.setFixedTime(new Date("2030-01-01T09:04:00+07:00"));
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("button", { name: "Increase Movie Combo" })).toBeEnabled();
  await expect(page.getByRole("timer")).toHaveText("06:00");
});

test("responsive menu, keyboard controls and reload recovery", async ({ page }, testInfo) => {
  await enter(page);
  const add = page.getByRole("button", { name: "Increase Movie Combo" });
  await add.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("status", { name: "Movie Combo quantity" })).toHaveText("1");
  await page.screenshot({ path: testInfo.outputPath("concession-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Drinks", exact: true }).click();
  await page.getByRole("button", { name: "Increase Cola", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("concession-mobile.png"), fullPage: true });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Choose your Seats first" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to Booking Summary" })).toHaveCount(0);
});

test("direct URLs cannot invent preview context and Showtime start invalidates selection", async ({ page }) => {
  await page.goto(`${CONCESSIONS}?movieId=${MOVIE_ID}&seatUnitIds=E1&expiresAt=9999999999999`);
  await expect(page.getByRole("heading", { name: "Choose your Seats first" })).toBeVisible();
  await enter(page, "default", "09:59:00");
  await page.clock.setFixedTime(new Date("2030-01-01T10:00:00+07:00"));
  await expect(page.getByRole("dialog")).toHaveAccessibleName("Seat preview expired");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Continue to Booking Summary" })).toBeDisabled();
});
