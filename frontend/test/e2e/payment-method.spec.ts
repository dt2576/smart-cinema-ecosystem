import { mockDiscoveryReads, isCustomerReadPath } from "./helpers/customer-discovery";
import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

const MOVIE_ID = "9223372036854775807";
const CINEMA_ID = "9007199254740993";
const SEATS = `/showtimes/9007199254741001/seats?movieId=${MOVIE_ID}&cinemaId=${CINEMA_ID}&date=2030-01-01`;
const PAYMENT = "/bookings/preview/payment";
const VNPAY = "VNPay · Available preview";
const MOMO = "MoMo · Available preview";
async function enter(page: Page, scenario = "default", time = "09:00:00", withAddOns = true) {
  await mockDiscoveryReads(page);
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (document.body?.textContent?.includes("Loading payment methods...")) document.documentElement.dataset.paymentLoadingObserved = "true";
    }).observe(document, { childList: true, subtree: true });
  });
  await page.clock.setFixedTime(new Date(`2030-01-01T${time}+07:00`));
  await page.route(`**/api/v1/movies/${MOVIE_ID}`, route => route.fulfill({ json: { id: MOVIE_ID, title: "Payment Journey", duration: 125, releaseDate: "2029-01-01", ageRating: "T13", language: "English", posterUrl: "https://media.example.test/payment.jpg", status: "PUBLISHED", genres: [], description: null, trailerUrl: null } }));
  await page.route("https://media.example.test/**", route => route.fulfill({ path: resolve("public/images/movies/dune-part-two.jpg") }));
  await page.goto(`${SEATS}&paymentPreview=${scenario}`);
  await page.getByRole("button", { name: "E1-2, Couple, 2 guests, Available", exact: true }).click();
  await page.getByRole("button", { name: "A1, Standard, 1 guest, Available", exact: true }).click();
  await page.getByRole("button", { name: "Continue to Concessions" }).click();
  if (withAddOns) await page.getByRole("button", { name: "Increase Movie Combo" }).click();
  await page.getByRole("button", { name: "Continue to Booking Summary" }).click();
  if (withAddOns) {
    await page.getByRole("textbox", { name: "Promotion code", exact: true }).fill("DEMO10");
    await page.getByRole("button", { name: "Apply Promotion", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("DEMO10 applied");
  }
  await page.getByRole("button", { name: "Continue to Payment Method" }).click();
  await expect(page.getByRole("heading", { name: "Payment Method", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-payment-loading-observed", "true");
}

test("Payment preserves complete reviewed context and allows exactly one available method without provider calls", async ({ page }) => {
  const unexpected: string[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/") && (!isCustomerReadPath(url.pathname) || request.method() !== "GET")) unexpected.push(url.href);
    if (!['127.0.0.1', 'localhost', 'media.example.test'].includes(url.hostname)) unexpected.push(url.href);
  });
  await enter(page);
  await expect(page).toHaveURL(new RegExp(PAYMENT));
  const summary = page.getByRole("complementary", { name: "Payment preview summary" });
  await expect(page.getByRole("region", { name: "Selected screening" })).toContainText("Payment Journey");
  await expect(page.getByRole("region", { name: "Selected screening" })).toContainText("Smart Cinema Landmark · Hall 1");
  await expect(page.getByRole("region", { name: "Selected screening" })).toContainText("10:00");
  for (const text of ["2 Seat Units · 3 guests", "E1-2 · Couple, 2 guests, one unit", "Movie Combo × 1", "DEMO10 applied", "240,000", "120,000", "36,000", "324,000"]) await expect(summary).toContainText(text);
  const next = page.getByRole("button", { name: "Continue to Payment Processing" });
  await expect(next).toBeDisabled();
  await expect(page.getByRole("radio", { name: "Other configured provider · Unavailable preview" })).toBeDisabled();
  await page.getByRole("radio", { name: VNPAY, exact: true }).check();
  await page.getByRole("radio", { name: MOMO, exact: true }).check();
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(1);
  await expect(page.getByRole("radio", { name: VNPAY, exact: true })).not.toBeChecked();
  await expect(summary).toContainText("324,000");
  await next.click();
  await expect(page.getByRole("heading", { name: "Payment Processing", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Reviewed payment context" })).toContainText("MoMo (preview)");
  await expect(page.getByRole("region", { name: "Reviewed payment context" })).toContainText("324,000");
  await page.getByRole("link", { name: "Back to Payment Methods", exact: true }).click();
  expect(unexpected).toEqual([]);
});

test("back to Summary preserves Promotion and permits edits; changed context requires a fresh review", async ({ page }) => {
  await enter(page);
  await page.getByRole("radio", { name: VNPAY, exact: true }).check();
  await page.getByRole("button", { name: "Continue to Payment Processing" }).click();
  await page.getByRole("link", { name: "Back to Payment Methods", exact: true }).click();
  await page.getByRole("link", { name: "Back to Booking Summary", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Promotion code", exact: true })).toHaveValue("DEMO10");
  await expect(page.getByRole("status")).toContainText("DEMO10 applied");
  await page.getByRole("button", { name: "Remove Promotion" }).click();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Review your Booking preview first" })).toBeVisible();
  await page.getByRole("link", { name: "Back to Booking Summary", exact: true }).click();
  await page.getByRole("link", { name: "Edit Concessions", exact: true }).click();
  await page.getByRole("button", { name: "Increase Movie Combo" }).click();
  await page.getByRole("button", { name: "Continue to Booking Summary" }).click();
  await page.getByRole("button", { name: "Continue to Payment Method" }).click();
  await expect(page.getByRole("complementary", { name: "Payment preview summary" })).toContainText("Movie Combo × 2");
  await expect(page.getByRole("complementary", { name: "Payment preview summary" })).toContainText("480,000");
  await expect(page.getByRole("timer")).toHaveText("10:00");
});

test("loading, empty, unavailable and retry states cannot bypass method eligibility", async ({ page }) => {
  await enter(page, "empty", "09:00:00", false);
  await expect(page.getByRole("heading", { name: "No payment methods available" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to Payment Processing" })).toBeDisabled();
  await expect(page.getByRole("complementary", { name: "Payment preview summary" })).toContainText("No add-ons selected.");
  await enter(page, "unavailable");
  await expect(page.getByRole("status")).toContainText("All sample payment methods are unavailable");
  for (const radio of await page.getByRole("radio").all()) await expect(radio).toBeDisabled();
  await expect(page.getByRole("button", { name: "Continue to Payment Processing" })).toBeDisabled();
  await enter(page, "error");
  await expect(page.getByRole("heading", { name: "Payment methods couldn't load" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to Payment Processing" })).toBeDisabled();
  await page.clock.setFixedTime(new Date("2030-01-01T09:04:00+07:00"));
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("radio", { name: VNPAY, exact: true })).toBeEnabled();
  await expect(page.getByRole("timer")).toHaveText("06:00");
  await expect(page.getByRole("button", { name: "Continue to Payment Processing" })).toBeDisabled();
});

test("method changes keep original expiry; expiry blocks continuation and recovery clears context", async ({ page }, testInfo) => {
  await enter(page);
  await page.getByRole("radio", { name: VNPAY, exact: true }).check();
  await page.clock.setFixedTime(new Date("2030-01-01T09:05:00+07:00"));
  await page.getByRole("radio", { name: MOMO, exact: true }).check();
  await expect(page.getByRole("timer")).toHaveText("05:00");
  await page.clock.setFixedTime(new Date("2030-01-01T09:10:00+07:00"));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Preview expired or Showtime unavailable");
  await expect(page.getByRole("button", { name: "Continue to Payment Processing" })).toBeDisabled();
  await expect(page.getByRole("radio", { name: MOMO, exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: testInfo.outputPath("payment-method-expired-mobile.png"), fullPage: true });
  await page.getByRole("link", { name: "Return to Seat Selection", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("Not started");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Review your Booking preview first" })).toBeVisible();
});

test("Showtime start and reload block continuation; query parameters cannot create payment context", async ({ page }) => {
  await page.goto(`${PAYMENT}?method=preview-vnpay&total=1&expiresAt=9999999999999&bookingId=fake`);
  await expect(page.getByRole("heading", { name: "Review your Booking preview first" })).toBeVisible();
  await enter(page, "default", "09:59:00", false);
  await page.getByRole("radio", { name: VNPAY, exact: true }).check();
  await page.clock.setFixedTime(new Date("2030-01-01T10:00:00+07:00"));
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Showtime unavailable");
  await expect(page.getByRole("button", { name: "Continue to Payment Processing" })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Review your Booking preview first" })).toBeVisible();
});

test("canonical Payment layout adapts to desktop/mobile and supports radio keyboard selection", async ({ page }, testInfo) => {
  await enter(page);
  const first = page.getByRole("radio", { name: VNPAY, exact: true });
  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).toBeChecked();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: MOMO, exact: true })).toBeChecked();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: testInfo.outputPath("payment-method-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await first.check();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: testInfo.outputPath("payment-method-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Continue to Payment Processing" }).click();
  await expect(page.getByRole("heading", { name: "Payment Processing", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to Payment Methods", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Payment Method", exact: true })).toBeVisible();
});
