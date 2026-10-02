import { mockCustomerHolds, confirmSelectedHolds } from "./helpers/customer-holds";
import { mockDiscoveryReads, isCustomerReadPath, isCustomerHoldPath } from "./helpers/customer-discovery";
import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

const MOVIE_ID = "9223372036854775807";
const CINEMA_ID = "9007199254740993";
const SEATS = `/showtimes/9007199254741001/seats?movieId=${MOVIE_ID}&cinemaId=${CINEMA_ID}&date=2030-01-01`;
const SUMMARY = "/bookings/preview/summary";
async function enter(page: Page, withConcessions = true, time = "09:00:00") {
  const discovery = await mockDiscoveryReads(page);
  await mockCustomerHolds(page, discovery);
  await page.clock.setFixedTime(new Date(`2030-01-01T${time}+07:00`));
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ json: { id: MOVIE_ID, title: "Summary Journey", duration: 125, releaseDate: "2029-01-01", ageRating: "T13", language: "English", posterUrl: "https://media.example.test/summary.jpg", status: "PUBLISHED", genres: [], description: null, trailerUrl: null } }));
  await page.route("https://media.example.test/**", route => route.fulfill({ path: resolve("public/images/movies/dune-part-two.jpg") }));
  await page.goto(SEATS);
  await page.getByRole("button", { name: "E1-2, Couple, 2 guests, Available", exact: true }).click();
  await page.getByRole("button", { name: "A1, Standard, 1 guest, Available", exact: true }).click();
  await confirmSelectedHolds(page);
  await page.getByRole("button", { name: "Preview Concessions" }).click();
  if (withConcessions) await page.getByRole("button", { name: "Increase Movie Combo" }).click();
  await page.getByRole("button", { name: "Continue to Booking Summary" }).click();
  await expect(page).toHaveURL(SUMMARY);
  await expect(page.getByRole("heading", { name: "Booking Summary", exact: true })).toBeVisible();
}
async function apply(page: Page, code: string) {
  await page.getByRole("textbox", { name: "Promotion code", exact: true }).fill(code);
  await page.getByRole("button", { name: "Apply Promotion", exact: true }).click();
}

test("summary preserves context, whole Couple pricing and concessions; Payment handoff does not freeze edits", async ({ page }) => {
  const apiPaths: string[] = [];
  page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/api/")) apiPaths.push(path); });
  await enter(page);
  await expect(page.getByRole("region", { name: "Selected screening" })).toContainText("Summary Journey");
  await expect(page.getByRole("region", { name: "Selected screening" })).toContainText("Smart Cinema Landmark · Hall 1");
  await expect(page.getByRole("region", { name: "Selected screening" })).toContainText("10:00");
  const seats = page.getByRole("region", { name: "Selected Seat Units" });
  await expect(seats).toContainText("2 Seat Units · 3 guests");
  await expect(seats).toContainText("E1-2 · Couple");
  await expect(seats.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("region", { name: "Selected Concessions" })).toContainText("Movie Combo × 1");
  const totals = page.getByRole("complementary", { name: "Preview order totals" });
  await expect(totals).toContainText("240,000");
  await expect(totals).toContainText("120,000");
  await expect(totals).toContainText("360,000");
  await apply(page, " demo10 ");
  await expect(page.getByRole("status")).toContainText("DEMO10 applied");
  await expect(totals).toContainText("324,000");
  const next = page.getByRole("button", { name: "Continue to Payment Method" });
  await next.click();
  await expect(page.getByRole("complementary", { name: "Payment preview summary" })).toContainText("No Payment has been initiated and composition remains editable.");
  await expect(page.getByRole("complementary", { name: "Payment preview summary" })).toContainText("324,000");
  await page.getByRole("link", { name: "Back to Booking Summary", exact: true }).click();
  await page.getByRole("link", { name: "Edit Concessions", exact: true }).click();
  await expect(page.getByRole("status", { name: "Movie Combo quantity" })).toHaveText("1");
  await page.getByRole("button", { name: "Increase Movie Combo" }).click();
  await page.getByRole("button", { name: "Continue to Booking Summary" }).click();
  await expect(totals).toContainText("480,000");
  await expect(page.getByRole("textbox", { name: "Promotion code", exact: true })).toBeEmpty();
  await expect(page.getByRole("timer")).toHaveText("10:00");
  expect(apiPaths.every(path => isCustomerReadPath(path) || isCustomerHoldPath(path))).toBe(true);
});

test("optional concessions and Promotion invalid, expired, ineligible, retry and removal states", async ({ page }) => {
  await enter(page, false);
  await expect(page.getByRole("region", { name: "Selected Concessions" })).toContainText("No add-ons selected.");
  for (const [code, message] of [["UNKNOWN", "Invalid sample Promotion code"], ["DEMOEXPIRED", "sample Promotion has expired"], ["DEMOINELIGIBLE", "not eligible"]]) {
    await apply(page, code);
    await expect(page.getByRole("main").getByRole("alert")).toContainText(message);
    await expect(page.getByRole("complementary", { name: "Preview order totals" })).toContainText("240,000");
    await expect(page.getByRole("button", { name: "Continue to Payment Method" })).toBeEnabled();
  }
  await apply(page, "DEMORETRY");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("could not load");
  await expect(page.getByRole("button", { name: "Continue to Payment Method" })).toBeDisabled();
  await page.getByRole("button", { name: "Retry Promotion" }).click();
  await expect(page.getByRole("status")).toContainText("DEMORETRY applied");
  await expect(page.getByRole("complementary", { name: "Preview order totals" })).toContainText("216,000");
  await page.getByRole("button", { name: "Remove Promotion" }).click();
  await expect(page.getByRole("textbox", { name: "Promotion code", exact: true })).toBeEmpty();
  await expect(page.getByRole("complementary", { name: "Preview order totals" })).toContainText("240,000");
});

test("Promotion updates and retries retain Seat expiry; expiry blocks Payment route and recovery clears context", async ({ page }, testInfo) => {
  await enter(page);
  await page.clock.setFixedTime(new Date("2030-01-01T09:05:00+07:00"));
  await apply(page, "DEMORETRY");
  await page.getByRole("button", { name: "Retry Promotion" }).click();
  await expect(page.getByRole("status")).toContainText("DEMORETRY applied");
  await expect(page.getByRole("timer")).toHaveText("05:00");
  await page.getByRole("button", { name: "Remove Promotion" }).click();
  await expect(page.getByRole("timer")).toHaveText("05:00");
  await page.clock.setFixedTime(new Date("2030-01-01T09:10:00+07:00"));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Preview expired or Showtime unavailable");
  await expect(page.getByRole("button", { name: "Continue to Payment Method" })).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "Promotion code", exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: testInfo.outputPath("booking-summary-expired-mobile.png"), fullPage: true });
  await page.getByRole("link", { name: "Return to Seat Selection", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("Not started");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "No Booking preview to review" })).toBeVisible();
});

test("editing or removing a pending code discards stale responses; late responses cannot cross expiry", async ({ page }) => {
  await enter(page);
  await apply(page, "DEMO10");
  await page.getByRole("textbox", { name: "Promotion code", exact: true }).fill("DEMOEXPIRED");
  await page.getByRole("button", { name: "Apply Promotion", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("sample Promotion has expired");
  await expect(page.getByText(/DEMO10 applied/)).toHaveCount(0);
  await apply(page, "DEMO10");
  await page.getByRole("button", { name: "Remove Promotion" }).click();
  await page.getByRole("button", { name: "Continue to Payment Method" }).click();
  await expect(page.getByRole("complementary", { name: "Payment preview summary" })).toContainText("360,000");
  await page.getByRole("link", { name: "Back to Booking Summary", exact: true }).click();
  await apply(page, "DEMO10");
  await page.clock.setFixedTime(new Date("2030-01-01T09:10:00+07:00"));
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Preview expired");
  await expect(page.getByText(/DEMO10 applied/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continue to Payment Method" })).toBeDisabled();
});

test("Showtime start, reload and forged direct URL cannot continue", async ({ page }) => {
  await page.goto(`${SUMMARY}?bookingId=fake&expiresAt=9999999999999&discount=0`);
  await expect(page.getByRole("heading", { name: "No Booking preview to review" })).toBeVisible();
  await enter(page, false, "09:59:00");
  await page.clock.setFixedTime(new Date("2030-01-01T10:00:00+07:00"));
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Showtime unavailable");
  await expect(page.getByRole("button", { name: "Continue to Payment Method" })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("heading", { name: "No Booking preview to review" })).toBeVisible();
});

test("desktop/mobile Summary preserves canonical panels and keyboard Promotion controls", async ({ page }, testInfo) => {
  await enter(page);
  const input = page.getByRole("textbox", { name: "Promotion code", exact: true });
  await input.focus();
  await page.keyboard.type("DEMO10");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("DEMO10 applied");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: testInfo.outputPath("booking-summary-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: testInfo.outputPath("booking-summary-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Continue to Payment Method" }).click();
  await expect(page.getByRole("heading", { name: "Payment Method", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to Booking Summary", exact: true }).click();
  await expect(input).toHaveValue("DEMO10");
});
