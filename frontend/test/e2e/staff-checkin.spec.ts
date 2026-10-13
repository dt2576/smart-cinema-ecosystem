import { test, expect } from "@playwright/test";
import { mockStaffCheckIn, resolveManualStaffQr, confirmStaffTickets } from "./helpers/staff-checkin";
import { STAFF_QR_FIXTURE, staffCheckInFixture } from "../fixtures/staff-checkin";

const ROUTE = "/staff/check-in", region = "Thông tin đặt vé và vé";
const commands = (state: Awaited<ReturnType<typeof mockStaffCheckIn>>) => state.requests.filter(r => r.path.endsWith("check-ins"));

for (const width of [390, 768, 1440]) {
  test(`Staff Stitch scanner/manual/tickets/confirmation and keyboard at ${width}px`, async ({ page }, info) => {
    const state = await mockStaffCheckIn(page); await page.setViewportSize({ width, height: 1000 }); const response = await page.goto(ROUTE);
    expect(response?.headers()["cache-control"]).toContain("no-store"); await expect(page.getByRole("button", { name: "Mở camera", exact: true })).toBeVisible();
    const header = await page.locator("header").boundingBox(), title = await page.getByRole("heading", { level: 1 }).boundingBox(); expect(title!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    expect(state.requests).toHaveLength(1); await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: info.outputPath(`workspace-${width}.png`), fullPage: true });
    await resolveManualStaffQr(page, STAFF_QR_FIXTURE); await expect(page.getByRole("region", { name: region })).toBeVisible();
    expect(state.requests.find(r => r.path.endsWith("booking-qr-resolutions"))?.body?.bookingQr).toBe(STAFF_QR_FIXTURE); expect(commands(state)).toHaveLength(0);
    const used = page.getByRole("checkbox", { name: /Ghế A2 —/ }), couple = page.getByRole("checkbox", { name: /Ghế H9-10 —/ }); await expect(used).toBeDisabled(); await expect(couple).toBeEnabled();
    await couple.focus(); await page.keyboard.press("Space"); await expect(couple).toBeChecked(); await expect(page.getByRole("status").filter({ hasText: "Đang chọn" })).toContainText("1 vé · sức chứa 2 khách");
    await page.getByRole("button", { name: "Soát vé đã chọn", exact: true }).focus(); await page.keyboard.press("Enter"); await expect(page.getByRole("dialog")).toBeVisible(); expect(commands(state)).toHaveLength(0);
    await expect(page.getByRole("button", { name: "Quay lại chọn vé", exact: true })).toBeFocused(); await page.keyboard.press("Shift+Tab"); await expect(page.getByRole("button", { name: "Xác nhận soát vé", exact: true })).toBeFocused();
    await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: info.outputPath(`confirmation-${width}.png`), fullPage: true }); await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "Soát vé đã chọn", exact: true })).toBeFocused(); expect(commands(state)).toHaveLength(0);
    await page.getByRole("button", { name: "Soát vé đã chọn", exact: true }).click(); await page.getByRole("button", { name: "Xác nhận soát vé", exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Soát vé thành công" })).toBeVisible();
    expect(commands(state)).toHaveLength(1); expect(commands(state)[0].body).toEqual({ cinemaId: "71", ticketIds: ["9007199254741003"] }); await expect(couple).toBeDisabled(); await expect(page.getByRole("checkbox", { name: /Ghế A1 —/ })).toBeEnabled();
    await expect(page.getByLabel("Nhập nội dung mã QR đặt vé", { exact: true })).toHaveValue(""); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await page.getByRole("button", { name: "Mở camera", exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: info.outputPath(`result-${width}.png`), fullPage: true }); expect(await page.locator("body").innerText()).not.toContain(STAFF_QR_FIXTURE);
    expect(await page.evaluate(token => Object.values(localStorage).concat(Object.values(sessionStorage)).some(v => v.includes(token)), STAFF_QR_FIXTURE)).toBe(false);
  });
  test(`Staff long Vietnamese, reduced motion, loading and safe error at ${width}px`, async ({ page }, info) => {
    const state = await mockStaffCheckIn(page); state.booking.movieTitle = "Tên bộ phim tiếng Việt rất dài trong trải nghiệm điện ảnh ".repeat(4); state.booking.bookingCode = "SC".repeat(50); state.booking.hallName = "Phòng chiếu rộng cho trải nghiệm điện ảnh ".repeat(3);
    await page.setViewportSize({ width, height: 1000 }); await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto(ROUTE); let release!: () => void; state.delayResolution = new Promise<void>(r => { release = r; }); await resolveManualStaffQr(page);
    await expect(page.getByRole("heading", { name: "Đang kiểm tra mã QR", exact: true })).toBeVisible(); await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: info.outputPath(`loading-${width}.png`), fullPage: true }); release(); state.delayResolution = undefined;
    await expect(page.getByRole("region", { name: region })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: info.outputPath(`long-${width}.png`), fullPage: true });
    state.recoveryError = 503; await page.getByRole("button", { name: "Kiểm tra lại trạng thái", exact: true }).click(); await expect(page.getByRole("main").getByRole("alert")).toContainText("Chưa thể"); await expect(page.getByRole("checkbox").first()).toBeDisabled(); expect(await page.locator("body").innerText()).not.toContain("private-token-sql"); await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: info.outputPath(`error-${width}.png`), fullPage: true });
  });
}
test("Staff unauthenticated entry resumes existing login without operational requests", async ({ page }) => {
  const state = await mockStaffCheckIn(page, { seed: false }); await page.goto(ROUTE); await expect(page.getByRole("heading", { name: "Cần đăng nhập", exact: true })).toBeVisible(); expect(state.requests).toHaveLength(0);
  await page.getByRole("link", { name: "Đăng nhập nhân viên", exact: true }).click(); await expect(page).toHaveURL(/\/login\?returnTo=/);
  await page.route("**/api/v1/auth/tokens", route => route.fulfill({ json: { accessToken: "qa-staff-access", tokenType: "Bearer", expiresIn: 3600, refreshToken: "qa-staff-refresh", refreshExpiresIn: 86400, userId: 37, email: "staff@example.test", fullName: "Nhân viên", role: "STAFF" } }));
  await page.getByLabel("Địa chỉ email", { exact: true }).fill("staff@example.test"); await page.getByLabel("Mật khẩu", { exact: true }).fill("fixture-password"); await page.getByRole("button", { name: "Đăng nhập", exact: true }).click(); await expect(page).toHaveURL(/\/staff\/check-in$/); await expect(page.getByRole("button", { name: "Mở camera", exact: true })).toBeVisible();
});
for (const role of ["CUSTOMER", "ADMIN", "MANAGER"]) test(`Staff operational UI is denied for${role}`, async ({ page }) => {
  const state = await mockStaffCheckIn(page, { role }); await page.goto(ROUTE); await expect(page.getByRole("heading", { name: "Cần tài khoản nhân viên", exact: true })).toBeVisible(); expect(state.requests).toHaveLength(0); await expect(page.locator("video")).toHaveCount(0);
});
test("Staff navigation appears only for Staff and current403 invalidates it operationally", async ({ page }) => {
  const state = await mockStaffCheckIn(page); await page.goto("/"); await page.locator("summary").filter({ hasText: "Mở menu tài khoản" }).click(); await expect(page.getByRole("link", { name: "Khu vực soát vé", exact: true })).toBeVisible(); state.assignmentsError = 403; await page.getByRole("link", { name: "Khu vực soát vé", exact: true }).click(); await expect(page.getByRole("heading", { name: "Chưa thể xác minh quyền soát vé", exact: true })).toBeVisible(); await expect(page.locator("video")).toHaveCount(0);
});
test("Staff empty and multiple Cinema assignments require actual returned scope", async ({ page }) => {
  const state = await mockStaffCheckIn(page, { multiple: true }); await page.goto(ROUTE); await expect(page.getByRole("heading", { name: "Chọn rạp để bắt đầu", exact: true })).toBeVisible(); await expect(page.locator("video")).toHaveCount(0); await page.getByLabel("Rạp đang làm việc", { exact: true }).selectOption("71"); await resolveManualStaffQr(page); await expect(page.getByRole("region", { name: region })).toBeVisible(); await page.getByRole("checkbox", { name: /Ghế H9-10 —/ }).check();
  await page.getByLabel("Rạp đang làm việc", { exact: true }).selectOption("72"); await expect(page.getByRole("region", { name: region })).toHaveCount(0); await expect(page.getByLabel("Nhập nội dung mã QR đặt vé", { exact: true })).toHaveValue("");
  state.assignments.assignments = []; await page.getByRole("button", { name: "Kiểm tra phân công", exact: true }).click(); await expect(page.getByRole("heading", { name: "Chưa được phân công rạp", exact: true })).toBeVisible(); await expect(page.locator("video")).toHaveCount(0);
});
test("Staff resolution loading, repeated click and Cinema switch suppress stale responses", async ({ page }) => {
  const state = await mockStaffCheckIn(page, { multiple: true }); await page.goto(ROUTE); await page.getByLabel("Rạp đang làm việc", { exact: true }).selectOption("71"); let release!: () => void; state.delayResolution = new Promise<void>(r => { release = r; }); await resolveManualStaffQr(page); await expect(page.getByRole("button", { name: "Đang kiểm tra mã QR…", exact: true })).toBeDisabled();
  await page.getByLabel("Rạp đang làm việc", { exact: true }).selectOption("72"); release(); state.delayResolution = undefined; await expect(page.getByRole("region", { name: region })).toHaveCount(0); await resolveManualStaffQr(page); await expect(page.getByRole("region", { name: region })).toContainText("Smart Cinema Thủ Đức"); expect(commands(state)).toHaveLength(0);
});
test("Staff reload/direct entry clears QR and Ticket selection and never sends Check-in", async ({ page }) => {
  const state = await mockStaffCheckIn(page); await page.goto(ROUTE + "?bookingQr=forged#forged"); await expect(page).toHaveURL(/\/staff\/check-in$/); await resolveManualStaffQr(page); await page.getByRole("checkbox", { name: /Ghế A1 —/ }).check(); await page.reload(); await expect(page.getByRole("region", { name: region })).toHaveCount(0); await expect(page.getByLabel("Nhập nội dung mã QR đặt vé", { exact: true })).toHaveValue(""); expect(commands(state)).toHaveLength(0); expect(state.requests.every(r => !r.path.includes("forged"))).toBe(true);
});
test("Staff in-flight confirmation submits once and has no optimistic result", async ({ page }) => {
  const state = await mockStaffCheckIn(page); await page.goto(ROUTE); await resolveManualStaffQr(page); let release!: () => void; state.delayCommand = new Promise<void>(r => { release = r; }); await confirmStaffTickets(page); await expect(page.getByRole("button", { name: "Xác nhận soát vé", exact: true })).toBeDisabled(); await expect(page.getByRole("dialog")).toContainText("1 vé"); await expect(page.getByRole("status").filter({ hasText: "Soát vé thành công" })).toHaveCount(0); expect(commands(state)).toHaveLength(1); release(); state.delayCommand = undefined; await expect(page.getByRole("dialog")).toHaveCount(0); await expect(page.getByRole("status").filter({ hasText: "Soát vé thành công" })).toBeVisible();
});
test("Staff lost committed command response recovers by GET and never replays POST", async ({ page }) => {
  const state = await mockStaffCheckIn(page); await page.goto(ROUTE); await resolveManualStaffQr(page); state.commandLost = true; await confirmStaffTickets(page); await expect(page.getByRole("main").getByRole("alert")).toContainText("Chưa thể xác định"); await expect(page.getByRole("checkbox").first()).toBeDisabled(); expect(commands(state)).toHaveLength(1); await page.getByRole("button", { name: "Kiểm tra lại trạng thái", exact: true }).click(); await expect(page.getByRole("checkbox", { name: /Ghế H9-10 —/ })).toBeDisabled(); await expect(page.getByRole("checkbox", { name: /Ghế A1 —/ })).toBeEnabled(); expect(commands(state)).toHaveLength(1); expect(state.requests.at(-1)?.method).toBe("GET");
});
test("Staff409 recheck consumes authoritative mixed Ticket statuses", async ({ page }) => {
  const state = await mockStaffCheckIn(page); await page.goto(ROUTE); await resolveManualStaffQr(page); state.commandError = 409; await confirmStaffTickets(page); await expect(page.getByRole("main").getByRole("alert")).toContainText("Trạng thái vé"); state.booking = staffCheckInFixture(state.booking, [state.booking.tickets[2].id]).booking; await page.getByRole("button", { name: "Kiểm tra lại trạng thái", exact: true }).click(); await expect(page.getByRole("checkbox", { name: /Ghế H9-10 —/ })).toBeDisabled(); expect(commands(state)).toHaveLength(1);
});
for (const status of [400, 404, 429, 503]) test(`Staff resolution safe${status} handling and Retry-After`, async ({ page }) => {
  const state = await mockStaffCheckIn(page); state.resolutionError = status; state.retryAfter = "60"; await page.goto(ROUTE); await resolveManualStaffQr(page); await expect(page.getByRole("main").getByRole("alert")).toBeVisible(); await expect(page.getByRole("region", { name: region })).toHaveCount(0); expect(await page.locator("body").innerText()).not.toContain("private-token-sql"); if (status === 429) { await expect(page.getByRole("button", { name: "Kiểm tra mã QR", exact: true })).toBeDisabled(); await expect(page.getByText("Máy chủ yêu cầu chờ 60 giây trước khi kiểm tra lại.")).toBeVisible(); } expect(commands(state)).toHaveLength(0);
});
test("Staff401 session expiry removes sensitive workspace and resumes login", async ({ page }) => {
  const state = await mockStaffCheckIn(page); await page.goto(ROUTE); await resolveManualStaffQr(page); state.recoveryError = 401; await page.getByRole("button", { name: "Kiểm tra lại trạng thái", exact: true }).click(); await expect(page.getByRole("heading", { name: "Cần đăng nhập", exact: true })).toBeVisible(); await expect(page.getByRole("region", { name: region })).toHaveCount(0); expect(await page.evaluate(() => localStorage.getItem("smart-cinema.auth-session"))).toBeNull();
});
test("Staff current403 and assignment revocation wipe selection and camera", async ({ page }) => {
  const state = await mockStaffCheckIn(page); await page.goto(ROUTE); await resolveManualStaffQr(page); state.recoveryError = 403; await page.getByRole("button", { name: "Kiểm tra lại trạng thái", exact: true }).click(); await expect(page.getByRole("heading", { name: "Chưa thể xác minh quyền soát vé", exact: true })).toBeVisible(); await expect(page.locator("video")).toHaveCount(0); await expect(page.getByRole("checkbox")).toHaveCount(0);
});
test("Staff malformed/mismatched server projection cannot enable admission", async ({ page }) => {
  const state = await mockStaffCheckIn(page); state.malformedResolution = true; await page.goto(ROUTE); await resolveManualStaffQr(page); await expect(page.getByRole("main").getByRole("alert")).toContainText("chưa đầy đủ"); await expect(page.getByRole("checkbox")).toHaveCount(0); expect(commands(state)).toHaveLength(0);
});
test("Staff malformed committed response is uncertain until GET, without premature success", async ({ page }) => {
  const state = await mockStaffCheckIn(page); await page.goto(ROUTE); await resolveManualStaffQr(page); state.commandMalformed = true; await confirmStaffTickets(page); await expect(page.getByRole("main").getByRole("alert")).toContainText("Chưa thể xác định"); await expect(page.getByRole("status").filter({ hasText: "Soát vé thành công" })).toHaveCount(0); await page.getByRole("button", { name: "Kiểm tra lại trạng thái", exact: true }).click(); await expect(page.getByRole("checkbox", { name: /Ghế H9-10 —/ })).toBeDisabled(); expect(commands(state)).toHaveLength(1);
});
test("Staff paste preserves invalid control input for validation instead of silently stripping", async ({ page }) => {
  const state = await mockStaffCheckIn(page); await page.goto(ROUTE); await page.getByLabel("Nhập nội dung mã QR đặt vé", { exact: true }).evaluate(element => { const clipboardData = new DataTransfer(); clipboardData.setData("text/plain", "invalid\ncontrol"); element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData })); }); await page.getByRole("button", { name: "Kiểm tra mã QR", exact: true }).click(); await expect(page.getByRole("main").getByRole("alert")).toContainText("chưa hợp lệ"); expect(state.requests.filter(r => r.path.endsWith("booking-qr-resolutions"))).toHaveLength(0);
  await resolveManualStaffQr(page, "\u2000"); await expect(page.getByRole("main").getByRole("alert")).toContainText("chưa hợp lệ"); expect(state.requests.filter(r => r.path.endsWith("booking-qr-resolutions"))).toHaveLength(0);
  await resolveManualStaffQr(page, "\u00a0"); await expect(page.getByRole("region", { name: region })).toBeVisible(); expect(state.requests.at(-1)?.body?.bookingQr).toBe("\u00a0"); expect(commands(state)).toHaveLength(0);
});
test("Staff logout during request clears state and ignores late response", async ({ page }) => {
  const state = await mockStaffCheckIn(page); await page.goto(ROUTE); let release!: () => void; state.delayResolution = new Promise<void>(r => { release = r; }); await resolveManualStaffQr(page); await page.getByRole("button", { name: "Đăng xuất", exact: true }).click(); release(); await expect(page).toHaveURL(/\/$/); expect(await page.evaluate(() => localStorage.getItem("smart-cinema.auth-session"))).toBeNull(); expect(commands(state)).toHaveLength(0);
});
test("Staff independent batches require separate explicit confirmations for each unit", async ({ page }) => {
  const state = await mockStaffCheckIn(page); await page.goto(ROUTE); await resolveManualStaffQr(page); await confirmStaffTickets(page, "H9-10"); await expect(page.getByRole("checkbox", { name: /Ghế H9-10 —/ })).toBeDisabled(); await confirmStaffTickets(page, "A1"); await expect(page.getByRole("checkbox", { name: /Ghế A1 —/ })).toBeDisabled(); expect(commands(state).map(r => r.body?.ticketIds)).toEqual([["9007199254741003"], ["9007199254741001"]]); await expect(page.getByText("Không còn vé đủ điều kiện để chọn trong lần kiểm tra này.")).toBeVisible();
});
test("Staff EXPIRED/CANCELLED units are disabled and no partial COUPLE selection exists", async ({ page }) => {
  const state = await mockStaffCheckIn(page); state.booking.tickets[0].status = "CANCELLED"; state.booking.tickets[0].canCheckIn = false; state.booking.tickets[2].status = "EXPIRED"; state.booking.tickets[2].canCheckIn = false; await page.goto(ROUTE); await resolveManualStaffQr(page); await expect(page.getByRole("checkbox")).toHaveCount(3); for (const checkbox of await page.getByRole("checkbox").all()) await expect(checkbox).toBeDisabled(); await expect(page.getByRole("button", { name: "Soát vé đã chọn", exact: true })).toBeDisabled(); expect(commands(state)).toHaveLength(0);
});
