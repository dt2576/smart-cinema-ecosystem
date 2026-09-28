import { test, expect } from "@playwright/test";

const DETAIL = "/my-bookings/9007199254741101";
const QR = "Demo Booking QR for DEMO-SC-1101, not valid for admission";

test("history navigates to whole-unit Tickets and one reusable Booking QR without domain requests", async ({ page }) => {
  const unexpected: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) unexpected.push(request.url()); });
  await page.goto("/my-bookings");
  await expect(page.getByRole("status")).toContainText("Loading sample");
  await expect(page.getByRole("article")).toHaveCount(5);
  await expect(page.getByRole("article").first()).toContainText("DEMO-SC-1101");
  await page.getByRole("link", { name: "View Booking DEMO-SC-1101", exact: true }).click();
  await expect(page).toHaveURL(DETAIL);
  const tickets = page.getByRole("region", { name: "Individual Tickets" });
  await expect(tickets).toContainText("3 Tickets · 3 Seat Units · 4 guests");
  await expect(tickets).toContainText("2 checked in · 1 valid");
  await expect(tickets.getByRole("listitem")).toHaveCount(3);
  await expect(page.getByRole("listitem", { name: "Ticket for Seat Unit H9-10", exact: true })).toContainText("Couple · 2 guests · one indivisible Seat Unit");
  await expect(page.getByRole("listitem", { name: "Ticket for Seat Unit H9-10", exact: true })).toContainText("VALID");
  await expect(tickets.getByRole("img")).toHaveCount(0);
  await expect(page.getByRole("img", { name: QR, exact: true })).toHaveCount(1);
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Reload sample from Booking QR", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Ticket states are unchanged");
    await expect(tickets).toContainText("2 checked in · 1 valid");
    await expect(page.getByRole("img", { name: QR, exact: true })).toHaveCount(1);
  }
  await expect(page.getByRole("region", { name: "Booking screening and amount" })).toContainText("600,000");
  await expect(page.getByRole("button", { name: /Check in|Scan|Transfer|Wallet|Download Ticket/i })).toHaveCount(0);
  await page.getByRole("link", { name: "Back to My Bookings", exact: true }).click();
  await expect(page).toHaveURL("/my-bookings");
  expect(unexpected).toEqual([]);
});

test("enlarged QR replaces inline QR, keeps background inert and closes back to trigger", async ({ page }) => {
  await page.goto(DETAIL);
  const trigger = page.getByRole("button", { name: "Enlarge Booking QR", exact: true });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator('img[alt^="Demo Booking QR"]')).toHaveCount(1);
  await expect(page.getByRole("dialog").getByRole("img", { name: QR })).toBeVisible();
  // Native modal dialogs may let Tab visit browser chrome; the page behind remains inert.
  await expect(page.getByRole("dialog")).toHaveJSProperty("open", true);
  await page.getByRole("link", { name: "Back to My Bookings", exact: true }).evaluate(element => element.focus());
  await expect(page.getByRole("link", { name: "Back to My Bookings", exact: true })).not.toBeFocused();
  await expect(page.getByRole("button", { name: "Close dialog" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Back to Booking", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("img", { name: QR })).toHaveCount(1);
});

test("unpaid Bookings have neither Tickets nor QR; paid historical Tickets have independent invalid states", async ({ page }) => {
  for (const [id, status] of [["9007199254741103", "PENDING"], ["9007199254741104", "EXPIRED"], ["9007199254741105", "CANCELLED"]]) {
    await page.goto(`/my-bookings/${id}`);
    await expect(page.getByRole("region", { name: "Booking screening and amount" })).toContainText(status);
    await expect(page.getByRole("region", { name: "Individual Tickets" })).toContainText("No Tickets issued");
    await expect(page.getByRole("heading", { name: "Booking QR unavailable" })).toBeVisible();
    await expect(page.locator('img[alt^="Demo Booking QR"]')).toHaveCount(0);
  }
  await page.goto("/my-bookings/9007199254741102");
  const tickets = page.getByRole("region", { name: "Individual Tickets" });
  await expect(tickets).toContainText("EXPIRED");
  await expect(tickets).toContainText("CANCELLED");
  await expect(tickets).toContainText("0 checked in · 0 valid");
  await expect(page.locator('img[alt^="Demo Booking QR"]')).toHaveCount(1);
});

test("history and combined detail support loading, empty, failure and retry", async ({ page }) => {
  await page.goto("/my-bookings?bookingPreview=empty");
  await expect(page.getByRole("heading", { name: "No sample Bookings" })).toBeVisible();
  await page.goto("/my-bookings?bookingPreview=error");
  await expect(page.getByRole("heading", { name: "Could not load Bookings" })).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("article")).toHaveCount(5);
  for (const query of ["bookingPreview=error", "ticketPreview=error"]) {
    await page.goto(`${DETAIL}?${query}`);
    await expect(page.getByRole("heading", { name: "Could not load Booking details" })).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("region", { name: "Individual Tickets" })).toContainText("3 Tickets");
  }
  await page.goto(`${DETAIL}?ticketPreview=empty`);
  await expect(page.getByRole("region", { name: "Individual Tickets" })).toContainText("No sample Tickets are available");
  await page.goto("/my-bookings/9007199254741100");
  await expect(page.getByRole("heading", { name: "Sample Booking not found" })).toBeVisible();
  await expect(page.locator('img[alt^="Demo Booking QR"]')).toHaveCount(0);
});

test("desktop canonical list and detail remain readable", async ({ page }) => {
  await page.goto("/my-bookings");
  await expect(page.getByRole("article")).toHaveCount(5);
  await page.screenshot({ path: "test-results/booking-history-desktop.png", fullPage: true });
  await page.goto(DETAIL);
  await expect(page.getByRole("img", { name: QR })).toBeVisible();
  await expect(page.getByRole("img", { name: "Dune: Part Two sample poster", exact: true })).toHaveJSProperty("complete", true);
  expect(await page.getByRole("img", { name: "Dune: Part Two sample poster", exact: true }).evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/booking-detail-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Enlarge Booking QR" }).click();
  await page.screenshot({ path: "test-results/booking-qr-desktop.png", fullPage: true });
});

test("mobile list, detail and QR stay within viewport; shared navigation reaches history", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/my-bookings");
  await expect(page.getByRole("article")).toHaveCount(5);
  await page.screenshot({ path: "test-results/booking-history-mobile.png", fullPage: true });
  await page.getByRole("link", { name: "View Booking DEMO-SC-1101", exact: true }).click();
  await expect(page.getByRole("img", { name: QR })).toBeVisible();
  await page.screenshot({ path: "test-results/booking-detail-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Enlarge Booking QR" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: "test-results/booking-qr-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Back to Booking", exact: true }).click();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "My Bookings", exact: true }).click();
  await expect(page).toHaveURL("/my-bookings");
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto(DETAIL);
  await expect(page.getByRole("img", { name: QR })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
