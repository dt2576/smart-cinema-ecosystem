import { expect, test, type Page } from "@playwright/test";

const CINEMA = "9007199254740993";
const HALL = "9007199254740994";
const COUPLE = "9007199254740995";
async function setup(page: Page) {
  await page.addInitScript(() => localStorage.setItem("smart-cinema.auth-session", JSON.stringify({ accessToken: "fixture-token", tokenType: "Bearer", expiresAt: Date.now() + 3600_000, refreshToken: "fixture-refresh", refreshExpiresAt: Date.now() + 86400_000, user: { id: 1, fullName: "Quản trị", email: "admin@example.test", role: "ADMIN" } })));
  await page.route("**/api/v1/admin", route => route.fulfill({ json: { id: "1", fullName: "Đã xác minh Quản trị", role: "ADMIN" } }));
  let cinema = { id: CINEMA, name: "Fixture Cinema", address: "Địa chỉ", contact: null, operatingInformation: null, status: "ACTIVE" };
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
  await page.getByRole("link", { name: "Thêm rạp", exact: true }).click();
  await page.getByRole("button", { name: "Lưu rạp" }).click();
  expect(await page.getByLabel("Tên rạp", { exact: true }).evaluate((field: HTMLInputElement) => field.validationMessage)).toBe("Không được để trống.");
  await page.getByLabel("Tên rạp", { exact: true }).fill("New Cinema"); await page.getByLabel("Địa chỉ", { exact: true }).fill("New address");
  await page.getByRole("button", { name: "Lưu rạp" }).click(); await expect(page.getByText("Đã lưu cấu hình.")).toBeVisible();
  await page.getByRole("link", { name: "Quản lý phòng chiếu", exact: true }).click(); await expect(page).toHaveURL(`/admin/cinemas/${CINEMA}/halls`);
  await page.getByRole("link", { name: "Thêm phòng chiếu", exact: true }).click(); await page.getByLabel("Tên phòng chiếu").fill("New Hall");
  await page.getByLabel("Sức chứa (số khách)").fill("4"); await page.getByLabel("Loại phòng chiếu").fill("Configured"); await page.getByRole("button", { name: "Lưu phòng chiếu" }).click();
  await expect(page.getByRole("link", { name: "Quản lý ghế", exact: true })).toHaveAttribute("href", `/admin/halls/${HALL}/seats`);
  await page.goto(`/admin/cinemas/${CINEMA}/edit`); await page.getByLabel("Trạng thái rạp").selectOption("TEMPORARILY_CLOSED"); await page.getByRole("button", { name: "Lưu rạp" }).click();
  await expect(page.getByText("Đã lưu cấu hình.")).toBeVisible();
});

test("whole layout capacity and referenced COUPLE status remain protected on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await setup(page); await page.goto(`/admin/halls/${HALL}/seats`);
  await expect(page.getByRole("button", { name: "Khởi tạo toàn bộ sơ đồ ghế" })).toBeDisabled();
  await page.getByRole("button", { name: "Thêm ghế nháp" }).click(); await page.getByLabel("Loại ghế").nth(1).selectOption("VIP");
  await page.getByRole("button", { name: "Thêm ghế nháp" }).click(); await page.getByLabel("Hàng ghế").nth(2).fill("B"); await page.getByLabel("Số ghế").nth(2).fill("1-2"); await page.getByLabel("Loại ghế").nth(2).selectOption("COUPLE");
  await expect(page.getByText("Sức chứa phòng chiếu: 4 khách. Sơ đồ: 4 khách trên 3 ghế.")).toBeVisible();
  await page.getByRole("button", { name: "Khởi tạo toàn bộ sơ đồ ghế" }).click();
  await expect(page.getByText("Sơ đồ đã khởi tạo: 3 ghế, 4 khách / sức chứa phòng chiếu 4.")).toBeVisible();
  await page.getByRole("button", { name: "B1-2 Ghế đôi · 2 khách Hoạt động" }).click();
  await expect(page.getByLabel("Loại ghế")).toBeDisabled(); await expect(page.getByLabel("Hàng ghế")).toBeDisabled(); await expect(page.getByLabel("Số ghế")).toBeDisabled();
  await page.getByLabel("Trạng thái vật lý").selectOption("MAINTENANCE"); await page.getByRole("button", { name: "Lưu ghế" }).click();
  await expect(page.getByRole("button", { name: "B1-2 Ghế đôi · 2 khách Bảo trì" })).toBeVisible();
  await page.goto(`/admin/halls/${HALL}/edit`); await expect(page.getByLabel("Sức chứa (số khách)")).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("Cinema loading is controlled, errors retry and empty list is explicit", async ({ page }) => {
  await setup(page);
  let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve; }); let calls = 0;
  await page.route("**/api/v1/admin/cinemas", async route => {
    if (++calls === 1) { await pending; return route.fulfill({ status: 503, json: { detail: "Không thể kết nối hoặc xác nhận phản hồi từ máy chủ. Vui lòng thử lại." } }); }
    return route.fulfill({ json: [] });
  });
  await page.goto("/admin/cinemas"); await expect(page.getByText("Đang tải cấu hình…")).toBeVisible(); release();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Không thể kết nối hoặc xác nhận phản hồi từ máy chủ. Vui lòng thử lại."); await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByText("Chưa có rạp chiếu phim.")).toBeVisible();
});

test("all hierarchy deep links deny anonymous access", async ({ page }) => {
  let calls = 0; await page.route("**/api/v1/admin/**", route => { calls++; return route.abort(); });
  for (const path of ["/admin/cinemas", "/admin/cinemas/new", `/admin/cinemas/${CINEMA}/edit`, `/admin/cinemas/${CINEMA}/halls`, `/admin/cinemas/${CINEMA}/halls/new`, `/admin/halls/${HALL}/edit`, `/admin/halls/${HALL}/seats`]) {
    await page.goto(path); await expect(page.getByRole("heading", { name: "Cần đăng nhập" })).toBeVisible();
  }
  expect(calls).toBe(0);
});

test("Seat save conflict remains visible without discarding the proposed edit", async ({ page }) => {
  await setup(page);
  await page.route(`**/api/v1/admin/halls/${HALL}/seats`, route => route.fulfill({ json: [{ id: COUPLE, hallId: HALL, row: "B", number: "1-2", type: "COUPLE", physicalStatus: "ACTIVE", guestCapacity: 2, structureEditable: true }] }));
  await page.route(`**/api/v1/admin/seats/${COUPLE}`, route => route.fulfill({ status: 409, json: { detail: "Dữ liệu đã thay đổi hoặc thao tác bị xung đột. Vui lòng kiểm tra và thử lại." } }));
  await page.goto(`/admin/halls/${HALL}/seats`); await page.getByRole("button", { name: "B1-2 Ghế đôi · 2 khách Hoạt động" }).click();
  await page.getByLabel("Hàng ghế").fill("C"); await page.getByRole("button", { name: "Lưu ghế" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Dữ liệu đã thay đổi hoặc thao tác bị xung đột. Vui lòng kiểm tra và thử lại."); await expect(page.getByLabel("Hàng ghế")).toHaveValue("C");
});

// HTTP fixtures below exercise presentation and guarded interactions; they are
// not evidence of writes to PRIMARY Neon or an exact physical Hall geometry.
async function denseLayout(page: Page) {
  await setup(page);
  const seats = "ABCDEFGHIJ".split("").flatMap((row, r) => Array.from({ length: row === "J" ? 8 : 16 }, (_, i) => ({
    id: String(BigInt("9007199254741000") + BigInt(r * 16 + i)), hallId: HALL, row,
    number: row === "J" ? `${i * 2 + 1}-${i * 2 + 2}` : String(i + 1).padStart(2, "0"),
    type: row === "J" ? "COUPLE" : "EFGH".includes(row) ? "VIP" : "STANDARD",
    physicalStatus: row === "A" && i === 0 ? "MAINTENANCE" : row === "I" && i === 15 ? "INACTIVE" : "ACTIVE",
    guestCapacity: row === "J" ? 2 : 1, structureEditable: false,
  })));
  await page.route(`**/api/v1/admin/halls/${HALL}`, route => route.fulfill({ json: { id: HALL, cinemaId: CINEMA, name: "Phòng chiếu 01", capacity: 160, type: "2D", status: "ACTIVE", layoutInitialized: true } }));
  await page.route(`**/api/v1/admin/halls/${HALL}/seats`, route => route.fulfill({ json: seats }));
  return seats;
}

for (const width of [390, 768, 1440]) test(`Stitch seat presentation: rows, whole units, inspector and responsive layout at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const seats = await denseLayout(page); let writes = 0;
  page.on("request", request => { if (/\/api\/v1\/admin\//.test(request.url()) && request.method() !== "GET") writes++; });
  await page.goto(`/admin/halls/${HALL}/seats`);
  const grid = page.getByRole("region", { name: "Lưới ghế" });
  await expect(grid.getByRole("button")).toHaveCount(seats.length);
  await expect(page.locator('[data-seat-row="J"]').getByRole("button")).toHaveCount(8);
  await expect(page.getByText("MÀN HÌNH CHIẾU", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "F08 VIP · 1 khách Hoạt động", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Thông tin ghế" }).getByText("F08", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Loại ghế")).toBeDisabled();
  await expect(page.getByLabel("Trạng thái vật lý")).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `target/admin-cinema-stitch-2026-10-28/fixture-seat-${width}.png`, fullPage: true });
  await page.reload(); await expect(grid.getByRole("button")).toHaveCount(seats.length);
  expect(writes).toBe(0);
});

test("Seat keyboard navigation retains exact opaque labels without synthesizing geometry", async ({ page }) => {
  await setup(page);
  await page.route(`**/api/v1/admin/halls/${HALL}/seats`, route => route.fulfill({ json: [
    { id: "9007199254741001", hallId: HALL, row: "Balcony", number: "09-10", type: "COUPLE", guestCapacity: 2, physicalStatus: "ACTIVE", structureEditable: false },
    { id: "9007199254741002", hallId: HALL, row: "Balcony", number: "Box", type: "STANDARD", guestCapacity: 1, physicalStatus: "INACTIVE", structureEditable: true },
  ] }));
  await page.goto(`/admin/halls/${HALL}/seats`);
  const first = page.getByRole("button", { name: "Balcony09-10 Ghế đôi · 2 khách Hoạt động" });
  await first.focus(); await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("button", { name: "BalconyBox Thường · 1 khách Ngừng hoạt động" })).toBeFocused();
  await page.keyboard.press("Home"); await expect(first).toBeFocused();
  await expect(page.getByRole("region", { name: "Lưới ghế" }).getByRole("button")).toHaveCount(2);
  await expect(page.getByLabel("Số ghế")).toHaveValue("09-10");
});

test("Mobile ADMIN navigation dialog traps focus, closes with Escape and restores its trigger", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await setup(page); await page.goto("/admin/cinemas");
  const trigger = page.getByRole("button", { name: "Mở điều hướng quản trị" });
  await trigger.click(); const dialog = page.getByRole("dialog", { name: "Điều hướng quản trị" });
  await expect(dialog).toBeVisible(); await dialog.getByRole("link").last().focus(); await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Đóng hộp thoại" })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
});

test("Seat mutation remains explicit, single-flight and server-authoritative", async ({ page }) => {
  const seats = await denseLayout(page); let puts = 0; let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**/api/v1/admin/seats/${seats[0].id}`, async route => {
    puts++; expect(route.request().method()).toBe("PUT"); expect(route.request().postDataJSON()).toEqual({ row: "A", number: "01", type: "STANDARD", physicalStatus: "ACTIVE" });
    await pending; return route.fulfill({ status: 503, json: {} });
  });
  await page.goto(`/admin/halls/${HALL}/seats`); expect(puts).toBe(0);
  await page.getByLabel("Trạng thái vật lý").selectOption("ACTIVE"); await page.getByRole("button", { name: "Lưu ghế", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đang lưu…", exact: true })).toBeDisabled();
  await expect(page.getByRole("region", { name: "Lưới ghế" }).getByRole("button").first()).toBeDisabled();
  expect(puts).toBe(1); release(); await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Trạng thái vật lý")).toHaveValue("ACTIVE");
  await expect(page.getByRole("button", { name: "A01 Thường · 1 khách Bảo trì" })).toHaveAttribute("aria-pressed", "true");
  expect(puts).toBe(1);
});

test("numeric display ordering preserves API identities, whole COUPLE units and keyboard order", async ({ page }) => {
  await setup(page);
  const seats = [
    { id: "9007199254741001", number: "10", row: "A", type: "VIP", guestCapacity: 1 },
    { id: "9007199254741002", number: "2", row: "A", type: "STANDARD", guestCapacity: 1 },
    { id: "9007199254741003", number: "1", row: "A", type: "STANDARD", guestCapacity: 1 },
    { id: "9007199254741004", number: "9-10", row: "B", type: "COUPLE", guestCapacity: 2 },
    { id: "9007199254741005", number: "1-2", row: "B", type: "COUPLE", guestCapacity: 2 },
  ].map(s => ({ ...s, hallId: HALL, physicalStatus: "ACTIVE", structureEditable: false }));
  await page.route(`**/api/v1/admin/halls/${HALL}/seats`, route => route.fulfill({ json: seats }));
  let submitted: unknown;
  await page.route("**/api/v1/admin/seats/*", route => { submitted = { url: route.request().url(), body: route.request().postDataJSON() }; return route.fulfill({ status: 409, json: {} }); });
  await page.goto(`/admin/halls/${HALL}/seats`);
  await expect(page.locator('[data-seat-row="A"] button')).toHaveText(["1", "2", "10"]);
  await expect(page.locator('[data-seat-row="B"] button')).toHaveText(["1-2", "9-10"]);
  const first = page.getByRole("button", { name: "A1 Thường · 1 khách Hoạt động" });
  await first.focus(); await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("button", { name: "A2 Thường · 1 khách Hoạt động" })).toBeFocused();
  await page.getByLabel("Trạng thái vật lý").selectOption("MAINTENANCE"); await page.getByRole("button", { name: "Lưu ghế", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  expect(submitted).toEqual({ url: `http://127.0.0.1:3100/api/v1/admin/seats/9007199254741002`, body: { row: "A", number: "2", type: "STANDARD", physicalStatus: "MAINTENANCE" } });
});

test("Stitch typography is loaded, rendered by web fonts and uses explicit hierarchy", async ({ page }) => {
  await denseLayout(page); await page.goto(`/admin/halls/${HALL}/seats`);
  await expect(page.getByRole("region", { name: "Lưới ghế" }).getByRole("button")).toHaveCount(152);
  await page.evaluate(() => document.fonts.ready);
  const heading = page.getByRole("heading", { name: "Quản lý tình trạng ghế", exact: true });
  expect(await heading.evaluate(el => { const c = getComputedStyle(el); return [c.fontSize, c.lineHeight, c.fontWeight]; })).toEqual(["28px", "36px", "600"]);
  const label = page.getByText("Hàng ghế", { exact: true });
  expect(await label.evaluate(el => getComputedStyle(el).fontFamily)).toContain("Space Grotesk");
  expect(await page.getByLabel("Hàng ghế").evaluate(el => getComputedStyle(el).fontFamily)).toContain("Plus Jakarta Sans");
  const cdp = await page.context().newCDPSession(page); await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument"); const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "main h1" });
  const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
  expect(fonts.some(f => f.isCustomFont && f.familyName.includes("Space Grotesk") && f.glyphCount > 0)).toBe(true);
  expect(fonts.filter(f => f.glyphCount > 0).every(f => f.isCustomFont)).toBe(true);
  await cdp.detach();
});

test("tablet summary headings retain usable width beside wrapped metrics", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1000 }); await denseLayout(page);
  for (const path of [`/admin/cinemas/${CINEMA}/halls`, `/admin/halls/${HALL}/seats`]) {
    await page.goto(path); await expect(page.locator("#admin-content")).toBeVisible();
    await expect(page.getByText("Đang tải cấu hình…")).toHaveCount(0);
    const heading = await page.getByRole("main").getByRole("heading", { level: 1 }).boundingBox();
    const main = await page.locator("#admin-content").boundingBox();
    expect(heading!.width).toBeGreaterThan(main!.width * 0.6);
    expect(heading!.height).toBeLessThan(150);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
