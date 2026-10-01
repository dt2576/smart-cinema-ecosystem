import { mockDiscoveryReads, isCustomerReadPath } from "./helpers/customer-discovery";
import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

const MOVIE_ID = "9223372036854775807";
const CINEMA_ID = "9007199254740993";
const PROCESSING = "/bookings/preview/payment/processing";
const SEATS = `/showtimes/9007199254741001/seats?movieId=${MOVIE_ID}&cinemaId=${CINEMA_ID}&date=2030-01-01`;

async function enter(page: Page, time = "09:00:00", addOns = true) {
  await mockDiscoveryReads(page);
  await page.clock.setFixedTime(new Date(`2030-01-01T${time}+07:00`));
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ json: { id: MOVIE_ID, title: "Processing Journey", duration: 125, releaseDate: "2029-01-01", ageRating: "T13", language: "English", posterUrl: "https://media.example.test/processing.jpg", status: "PUBLISHED", genres: [], description: null, trailerUrl: null } }));
  await page.route("https://media.example.test/**", route => route.fulfill({ path: resolve("public/images/movies/dune-part-two.jpg") }));
  await page.goto(SEATS);
  await page.getByRole("button", { name: "E1-2, Couple, 2 guests, Available", exact: true }).click();
  await page.getByRole("button", { name: "A1, Standard, 1 guest, Available", exact: true }).click();
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

test("processing preserves complete reviewed context; duplicate actions cannot produce multiple local runs or provider calls", async ({ page }) => {
  const unexpected: string[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if ((url.pathname.startsWith("/api/") && (!isCustomerReadPath(url.pathname) || request.method() !== "GET")) || !["127.0.0.1", "localhost", "media.example.test"].includes(url.hostname)) unexpected.push(url.href);
  });
  await enter(page);
  const screening = page.getByRole("region", { name: "Selected screening" });
  for (const text of ["Processing Journey", "Smart Cinema Landmark", "Hall 1", "10:00"]) await expect(screening).toContainText(text);
  const context = page.getByRole("region", { name: "Reviewed payment context" });
  for (const text of ["MoMo (preview)", "2 Seat Units · 3 guests", "E1-2 · Couple, 2 guests, one unit", "Movie Combo × 1", "DEMO10 applied", "240,000", "120,000", "36,000", "324,000", "NON-AUTHORITATIVE"]) await expect(context).toContainText(text);
  await page.getByRole("button", { name: "Start processing preview", exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(page.getByRole("status")).toHaveText("Processing preview...");
  await expect(page.getByRole("button", { name: "Preview in progress...", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Demo outcome", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Continue to Payment Result preview" })).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("Verifying preview...");
  await expect(page.getByRole("status")).toHaveText("Success preview");
  await page.getByRole("button", { name: "Continue to Payment Result preview" }).click();
  await expect(page.getByRole("heading", { name: "Payment success preview", exact: true })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("not server-verified");
  await expect(page.getByRole("main")).toContainText("No real Payment Transaction, Booking ID, Ticket or Booking QR exists");
  expect(unexpected).toEqual([]);
});

test("failed, unresolved pending and retryable error have distinct outcomes without deadline reset", async ({ page }) => {
  await enter(page, "09:00:00", false);
  await expect(page.getByRole("region", { name: "Reviewed payment context" })).toContainText("No add-ons selected.");
  for (const scenario of ["failed", "pending"]) {
    await page.getByLabel("Demo outcome", { exact: true }).selectOption(scenario);
    await page.getByRole("button", { name: "Start processing preview", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText(scenario === "failed" ? "Failed preview" : "Pending preview");
    await page.getByRole("button", { name: "Continue to Payment Result preview" }).click();
    await expect(page.getByRole("heading", { name: scenario === "failed" ? "Payment failed preview" : "Payment pending preview", exact: true })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Payment Processing", exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Check preview again", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Pending preview");
  await page.getByLabel("Demo outcome", { exact: true }).selectOption("error");
  await page.getByRole("button", { name: "Start processing preview", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("no payment was attempted");
  await expect(page.getByRole("button", { name: "Continue to Payment Result preview" })).toHaveCount(0);
  await page.clock.setFixedTime(new Date("2030-01-01T09:04:00+07:00"));
  await page.getByRole("button", { name: "Retry preview", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Success preview");
  await expect(page.getByRole("timer")).toHaveText("06:00");
});

test("expiry during processing rejects late outcomes and recovery clears all context", async ({ page }) => {
  await enter(page);
  await page.getByRole("button", { name: "Start processing preview", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Verifying preview...");
  await page.clock.setFixedTime(new Date("2030-01-01T09:10:00+07:00"));
  await expect(page.getByRole("main").getByRole("alert")).toContainText("can no longer continue");
  await expect(page.getByRole("timer")).toHaveText("00:00");
  await expect(page.getByRole("button", { name: "Continue to Payment Result preview" })).toHaveCount(0);
  await expect(page.getByLabel("Demo outcome", { exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "Return to Seat Selection", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("Not started");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Choose a Payment Method first" })).toBeVisible();
});

test("Showtime start blocks result navigation; direct URLs, reload and edited method context cannot restore an outcome", async ({ page }) => {
  await page.goto(`${PROCESSING}?status=success&method=preview-momo&total=1&expiresAt=9999999999999`);
  await expect(page.getByRole("heading", { name: "Choose a Payment Method first" })).toBeVisible();
  await enter(page, "09:59:00");
  await page.getByRole("button", { name: "Start processing preview", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Success preview");
  await page.clock.setFixedTime(new Date("2030-01-01T10:00:00+07:00"));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("Preview expired or Showtime unavailable");
  await expect(page.getByRole("button", { name: "Continue to Payment Result preview" })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Choose a Payment Method first" })).toBeVisible();
  await enter(page);
  await page.getByRole("button", { name: "Start processing preview", exact: true }).click();
  await page.getByRole("link", { name: "Back to Payment Methods", exact: true }).click();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Choose a Payment Method first" })).toBeVisible();
  await page.getByRole("link", { name: "Back to Payment Methods", exact: true }).click();
  await page.getByRole("radio", { name: "VNPay · Available preview", exact: true }).check();
  await page.getByRole("button", { name: "Continue to Payment Processing" }).click();
  await expect(page.getByRole("status")).toHaveText("Ready to preview processing");
  await expect(page.getByRole("region", { name: "Reviewed payment context" })).toContainText("VNPay (preview)");
  await expect(page.getByRole("timer")).toHaveText("10:00");
});

test("canonical processing layout, pending result and expiry are usable on desktop/mobile with reduced motion", async ({ page }, testInfo) => {
  await enter(page);
  await page.getByLabel("Demo outcome", { exact: true }).selectOption("pending");
  await page.getByRole("button", { name: "Start processing preview", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Processing preview...");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: testInfo.outputPath("payment-processing-desktop.png"), fullPage: true });
  await expect(page.getByRole("status")).toHaveText("Pending preview");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("payment-processing-mobile.png"), fullPage: true });
  const next = page.getByRole("button", { name: "Continue to Payment Result preview" });
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Payment pending preview", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("payment-processing-result-mobile.png") });
  await page.getByRole("button", { name: "Return to verification preview", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Payment Processing", exact: true })).toBeVisible();
  await page.clock.setFixedTime(new Date("2030-01-01T09:10:00+07:00"));
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: testInfo.outputPath("payment-processing-expired-mobile.png"), fullPage: true });
});
