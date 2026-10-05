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
