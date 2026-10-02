import { mockCustomerHolds, confirmSelectedHolds } from "./helpers/customer-holds";
import { mockDiscoveryReads, isCustomerReadPath, isCustomerHoldPath } from "./helpers/customer-discovery";
import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

const MOVIE_ID = "9223372036854775807";
const CINEMA_ID = "9007199254740993";
const RESULT = "/bookings/preview/payment/result";
const PROCESSING = "/bookings/preview/payment/processing";
const SEATS = `/showtimes/9007199254741001/seats?movieId=${MOVIE_ID}&cinemaId=${CINEMA_ID}&date=2030-01-01`;

async function enter(page: Page, time = "09:00:00", addOns = true) {
  const discovery = await mockDiscoveryReads(page);
  await mockCustomerHolds(page, discovery);
  await page.clock.setFixedTime(new Date(`2030-01-01T${time}+07:00`));
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ json: { id: MOVIE_ID, title: "Result Journey", duration: 125, releaseDate: "2029-01-01", ageRating: "T13", language: "English", posterUrl: "https://media.example.test/processing.jpg", status: "PUBLISHED", genres: [], description: null, trailerUrl: null } }));
  await page.route("https://media.example.test/**", route => route.fulfill({ path: resolve("public/images/movies/dune-part-two.jpg") }));
  await page.goto(SEATS);
  await page.getByRole("button", { name: "E1-2, Couple, 2 guests, Available", exact: true }).click();
  await page.getByRole("button", { name: "A1, Standard, 1 guest, Available", exact: true }).click();
  await confirmSelectedHolds(page);
  await page.getByRole("button", { name: "Continue to Concessions" }).click();
  if (addOns) await page.getByRole("button", { name: "Increase Movie Combo" }).click();
  await page.getByRole("button", { name: "Continue to Booking Summary" }).click();
  if (addOns) {
    await page.getByRole("textbox", { name: "Promotion code", exact: true }).fill("DEMO10");
    await page.getByRole("button", { name: "Apply Promotion", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("DEMO10 applied");
  }
  await page.getByRole("button", { name: "Continue to Payment Method" }).click();
  await page.getByRole("radio", { name: "MoMo · Available preview", exact: true }).check();
  await page.getByRole("button", { name: "Continue to Payment Processing" }).click();
  await expect(page).toHaveURL(PROCESSING);
  await expect(page.getByRole("heading", { name: "Payment Processing", exact: true })).toBeVisible();
}

async function finish(page: Page, outcome: "success" | "failed" | "pending") {
  await page.getByLabel("Demo outcome", { exact: true }).selectOption(outcome);
  await page.getByRole("button", { name: "Start processing preview", exact: true }).click();
  await page.getByRole("button", { name: "Continue to Payment Result preview", exact: true }).click();
  await expect(page).toHaveURL(RESULT);
  await expect(page.getByRole("heading", { name: `Payment ${outcome} preview`, exact: true })).toBeVisible();
}

test("success is a confirmation-style preview with complete context, whole Couple units and no issuance or provider calls", async ({ page }) => {
  const unexpected: string[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if ((url.pathname.startsWith("/api/") && !((isCustomerReadPath(url.pathname) && request.method() === "GET") || (isCustomerHoldPath(url.pathname) && ["GET", "POST", "DELETE"].includes(request.method())))) || !["127.0.0.1", "localhost", "media.example.test"].includes(url.hostname)) unexpected.push(url.href);
  });
  await enter(page);
  await finish(page, "success");
  const screening = page.getByRole("region", { name: "Reviewed screening and selections" });
  for (const text of ["Result Journey", "Smart Cinema Landmark", "Hall 1", "10:00", "2 Seat Units · 3 guests", "E1-2", "Couple, 2 guests, one unit", "Movie Combo × 1"]) await expect(screening).toContainText(text);
  const summary = page.getByRole("complementary", { name: "Payment Result summary" });
  for (const text of ["MoMo (preview)", "240,000", "120,000", "36,000", "324,000", "DEMO10 applied", "NON-AUTHORITATIVE", "Not an amount paid or a receipt."]) await expect(summary).toContainText(text);
  await expect(page.getByRole("status")).toContainText("not server-verified");
  await expect(page.getByRole("status")).toContainText("No Booking has been paid");
  await expect(screening).toContainText("No real Payment Transaction, Booking ID, Ticket or Booking QR exists");
  await expect(page.getByRole("link", { name: /View Tickets|Download|Booking QR/ })).toHaveCount(0);
  await expect(page.getByRole("img", { name: /QR/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /retry/i })).toHaveCount(0);
  await expect(page.getByRole("timer")).toHaveText("10:00");
  expect(unexpected).toEqual([]);
});

test("failed result retries the same reviewed preview and permits method changes without retaining a stale result", async ({ page }) => {
  await enter(page);
  await finish(page, "failed");
  await page.clock.setFixedTime(new Date("2030-01-01T09:03:00+07:00"));
  await page.getByRole("button", { name: "Retry processing preview", exact: true }).click();
  await expect(page).toHaveURL(PROCESSING);
  await expect(page.getByLabel("Demo outcome", { exact: true })).toHaveValue("failed");
  await expect(page.getByRole("timer")).toHaveText("07:00");
  await page.getByRole("button", { name: "Retry processing preview", exact: true }).click();
  await expect(page.getByRole("button", { name: "Preview in progress...", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Continue to Payment Result preview", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Payment failed preview", exact: true })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Payment Result summary" })).toContainText("324,000");
  await page.getByRole("button", { name: "Back to Payment Methods", exact: true }).click();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Complete the Processing preview first", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to Payment Methods", exact: true }).click();
  await page.getByRole("radio", { name: "VNPay · Available preview", exact: true }).check();
  await page.getByRole("button", { name: "Continue to Payment Processing" }).click();
  await expect(page.getByRole("status")).toHaveText("Ready to preview processing");
  await expect(page.getByRole("timer")).toHaveText("07:00");
});

test("pending stays unresolved across history and recheck; query values cannot promote it to success", async ({ page }) => {
  await enter(page, "09:00:00", false);
  await finish(page, "pending");
  await expect(page.getByRole("status")).toContainText("neither success nor failure");
  await expect(page.getByRole("region", { name: "Reviewed screening and selections" })).toContainText("No add-ons selected.");
  await page.evaluate(() => history.replaceState(null, "", `${location.pathname}?outcome=success&total=1`));
  await expect(page.getByRole("heading", { name: "Payment pending preview", exact: true })).toBeVisible();
  await page.clock.setFixedTime(new Date("2030-01-01T09:04:00+07:00"));
  await page.getByRole("button", { name: "Return to verification preview", exact: true }).click();
  await expect(page.getByLabel("Demo outcome", { exact: true })).toHaveValue("pending");
  await page.getByRole("button", { name: "Check preview again", exact: true }).click();
  await page.getByRole("button", { name: "Continue to Payment Result preview", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Payment pending preview", exact: true })).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText("06:00");
  await expect(page.getByRole("complementary", { name: "Payment Result summary" })).toContainText("240,000");
});

test("original expiry and Showtime start block Result retry or verification without rewriting the demo outcome", async ({ page }) => {
  await enter(page);
  await finish(page, "failed");
  await page.clock.setFixedTime(new Date("2030-01-01T09:10:00+07:00"));
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Preview expired or Showtime unavailable");
  await expect(page.getByRole("button", { name: "Retry processing preview", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Back to Payment Methods", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "Return to Seat Selection", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("Not started");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Complete the Processing preview first", exact: true })).toBeVisible();
  await enter(page, "09:59:00", false);
  await finish(page, "pending");
  await page.clock.setFixedTime(new Date("2030-01-01T10:00:00+07:00"));
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Showtime unavailable");
  await expect(page.getByRole("button", { name: "Return to verification preview", exact: true })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Payment pending preview", exact: true })).toBeVisible();
});

test("direct Result URLs, reload and leaving the preview cannot create or restore an outcome", async ({ page }) => {
  await page.goto(`${RESULT}?status=success&bookingId=fake&method=preview-momo&total=1`);
  await expect(page.getByRole("heading", { name: "Complete the Processing preview first", exact: true })).toBeVisible();
  await enter(page);
  await finish(page, "success");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Complete the Processing preview first", exact: true })).toBeVisible();
  await enter(page, "09:00:00", false);
  await finish(page, "failed");
  await page.getByRole("link", { name: "Back to Home", exact: true }).click();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Complete the Processing preview first", exact: true })).toBeVisible();
});

test("canonical Result layout adapts to desktop/mobile for all three states with keyboard recovery", async ({ page }, testInfo) => {
  await enter(page);
  for (const outcome of ["success", "failed", "pending"] as const) {
    await finish(page, outcome);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: testInfo.outputPath(`payment-result-${outcome}-desktop.png`), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`payment-result-${outcome}-mobile.png`), fullPage: true });
    if (outcome === "success") await page.goBack();
    else {
      const resume = page.getByRole("button", { name: outcome === "failed" ? "Retry processing preview" : "Return to verification preview", exact: true });
      await resume.focus();
      await page.keyboard.press("Enter");
    }
    await expect(page.getByRole("heading", { name: "Payment Processing", exact: true })).toBeVisible();
  }
});

