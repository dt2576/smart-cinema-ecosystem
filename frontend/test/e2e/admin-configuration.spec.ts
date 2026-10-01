import { expect, test, type Page } from "@playwright/test";

const CINEMA = "9007199254740993";
const HALL = "9007199254740994";
const COUPLE = "9007199254740995";
async function setup(page: Page) {
  await page.addInitScript(() => localStorage.setItem("smart-cinema.auth-session", JSON.stringify({ accessToken: "fixture-token", tokenType: "Bearer", expiresAt: Date.now() + 3600_000, refreshToken: "fixture-refresh", refreshExpiresAt: Date.now() + 86400_000, user: { id: 1, fullName: "Admin", email: "admin@example.test", role: "ADMIN" } })));
  await page.route("**/api/v1/admin", route => route.fulfill({ json: { id: "1", fullName: "Verified Admin", role: "ADMIN" } }));
  let cinema = { id: CINEMA, name: "Fixture Cinema", address: "Address", contact: null, operatingInformation: null, status: "ACTIVE" };
  let hall = { id: HALL, cinemaId: CINEMA, name: "Fixture Hall", capacity: 4, type: "Configured", status: "ACTIVE", layoutInitialized: false };
  let seats: { id: string; hallId: string; row: string; number: string; type: string; physicalStatus: string; guestCapacity: number; structureEditable: boolean }[] = [];
  await page.route("**/api/v1/admin/**", async route => {
    const request = route.request(); const path = new URL(request.url()).pathname; const write = request.method() !== "GET";
    const body = write ? request.postDataJSON() : undefined;
    if (path === "/api/v1/admin/cinemas") {
      if (write) { cinema = { ...cinema, ...body }; return route.fulfill({ status: 201, json: cinema }); }
      return route.fulfill({ json: [cinema] });
    }
    if (path === `/api/v1/admin/cinemas/${CINEMA}`) { if (write) cinema = { ...cinema, ...body }; return route.fulfill({ json: cinema }); }
    if (path === `/api/v1/admin/cinemas/${CINEMA}/halls`) {
      if (write) { hall = { ...hall, ...body }; return route.fulfill({ status: 201, json: hall }); }
      return route.fulfill({ json: [hall] });
    }
    if (path === `/api/v1/admin/halls/${HALL}`) { if (write) hall = { ...hall, ...body }; return route.fulfill({ json: hall }); }
    if (path === `/api/v1/admin/halls/${HALL}/seats`) {
      if (write) { seats = body.units.map((unit: object, index: number) => ({ ...unit, id: index === 2 ? COUPLE : `900719925474099${index + 6}`, hallId: HALL, guestCapacity: (unit as { type: string }).type === "COUPLE" ? 2 : 1, structureEditable: false })); hall.layoutInitialized = true; }
      return route.fulfill({ status: write ? 201 : 200, json: seats });
    }
    if (path === `/api/v1/admin/seats/${COUPLE}`) { seats = seats.map(seat => seat.id === COUPLE ? { ...seat, ...body } : seat); return route.fulfill({ json: seats.find(seat => seat.id === COUPLE) }); }
    return route.fallback();
  });
}

test("Cinema create/edit and Hall create preserve hierarchy and string identities", async ({ page }) => {
  await setup(page); await page.goto("/admin/cinemas");
  await page.getByRole("link", { name: "Create Cinema", exact: true }).click();
  await page.getByLabel("Cinema name", { exact: true }).fill("New Cinema"); await page.getByLabel("Address", { exact: true }).fill("New address");
  await page.getByRole("button", { name: "Save Cinema" }).click(); await expect(page.getByText("Configuration saved.")).toBeVisible();
  await page.getByRole("link", { name: "Manage Halls", exact: true }).click(); await expect(page).toHaveURL(`/admin/cinemas/${CINEMA}/halls`);
  await page.getByRole("link", { name: "Create Hall", exact: true }).click(); await page.getByLabel("Hall name").fill("New Hall");
  await page.getByLabel("Guest capacity").fill("4"); await page.getByLabel("Hall type").fill("Configured"); await page.getByRole("button", { name: "Save Hall" }).click();
  await expect(page.getByRole("link", { name: "Manage Seats", exact: true })).toHaveAttribute("href", `/admin/halls/${HALL}/seats`);
  await page.goto(`/admin/cinemas/${CINEMA}/edit`); await page.getByLabel("Cinema status").selectOption("TEMPORARILY_CLOSED"); await page.getByRole("button", { name: "Save Cinema" }).click();
  await expect(page.getByText("Configuration saved.")).toBeVisible();
});

test("whole layout capacity and referenced COUPLE status remain protected on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await setup(page); await page.goto(`/admin/halls/${HALL}/seats`);
  await expect(page.getByRole("button", { name: "Initialize complete layout" })).toBeDisabled();
  await page.getByRole("button", { name: "Add draft unit" }).click(); await page.getByLabel("Seat type").nth(1).selectOption("VIP");
  await page.getByRole("button", { name: "Add draft unit" }).click(); await page.getByLabel("Seat row").nth(2).fill("B"); await page.getByLabel("Seat number").nth(2).fill("1-2"); await page.getByLabel("Seat type").nth(2).selectOption("COUPLE");
  await expect(page.getByText("Hall capacity: 4 guests. Layout: 4 guests across 3 units.")).toBeVisible();
  await page.getByRole("button", { name: "Initialize complete layout" }).click();
  await expect(page.getByText("Initialized layout: 3 Seat Units, 4 guests / Hall capacity 4.")).toBeVisible();
  await page.getByRole("button", { name: "B1-2 COUPLE · 2 guests ACTIVE" }).click();
  await expect(page.getByLabel("Seat type")).toBeDisabled(); await expect(page.getByLabel("Seat row")).toBeDisabled(); await expect(page.getByLabel("Seat number")).toBeDisabled();
  await page.getByLabel("Physical status").selectOption("MAINTENANCE"); await page.getByRole("button", { name: "Save Seat Unit" }).click();
  await expect(page.getByRole("button", { name: "B1-2 COUPLE · 2 guests MAINTENANCE" })).toBeVisible();
  await page.goto(`/admin/halls/${HALL}/edit`); await expect(page.getByLabel("Guest capacity")).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("Cinema loading is controlled, errors retry and empty list is explicit", async ({ page }) => {
  await setup(page);
  let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve; }); let calls = 0;
  await page.route("**/api/v1/admin/cinemas", async route => {
    if (++calls === 1) { await pending; return route.fulfill({ status: 503, json: { detail: "Temporary configuration failure" } }); }
    return route.fulfill({ json: [] });
  });
  await page.goto("/admin/cinemas"); await expect(page.getByText("Loading configuration…")).toBeVisible(); release();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Temporary configuration failure"); await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("No Cinemas yet.")).toBeVisible();
});

test("all hierarchy deep links deny anonymous access", async ({ page }) => {
  let calls = 0; await page.route("**/api/v1/admin/**", route => { calls++; return route.abort(); });
  for (const path of ["/admin/cinemas", "/admin/cinemas/new", `/admin/cinemas/${CINEMA}/edit`, `/admin/cinemas/${CINEMA}/halls`, `/admin/cinemas/${CINEMA}/halls/new`, `/admin/halls/${HALL}/edit`, `/admin/halls/${HALL}/seats`]) {
    await page.goto(path); await expect(page.getByRole("heading", { name: "Sign in required" })).toBeVisible();
  }
  expect(calls).toBe(0);
});

test("Seat save conflict remains visible without discarding the proposed edit", async ({ page }) => {
  await setup(page);
  await page.route(`**/api/v1/admin/halls/${HALL}/seats`, route => route.fulfill({ json: [{ id: COUPLE, hallId: HALL, row: "B", number: "1-2", type: "COUPLE", physicalStatus: "ACTIVE", guestCapacity: 2, structureEditable: true }] }));
  await page.route(`**/api/v1/admin/seats/${COUPLE}`, route => route.fulfill({ status: 409, json: { detail: "Referenced Seat structure is permanent." } }));
  await page.goto(`/admin/halls/${HALL}/seats`); await page.getByRole("button", { name: "B1-2 COUPLE · 2 guests ACTIVE" }).click();
  await page.getByLabel("Seat row").fill("C"); await page.getByRole("button", { name: "Save Seat Unit" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Referenced Seat structure is permanent."); await expect(page.getByLabel("Seat row")).toHaveValue("C");
});
