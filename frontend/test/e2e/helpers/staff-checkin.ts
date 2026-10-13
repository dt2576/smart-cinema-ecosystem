import type { Page } from "@playwright/test";
import { staffAssignmentsFixture, staffBookingFixture, staffCheckInFixture } from "../../fixtures/staff-checkin";

// Explicit HTTP fixtures, not real financial/admission/employee-onboarding evidence.
export async function mockStaffCheckIn(page: Page, options: { role?: string; multiple?: boolean; seed?: boolean } = {}) {
  const state = { assignments: staffAssignmentsFixture(options.multiple), booking: staffBookingFixture(), assignmentsError: 0, resolutionError: 0, recoveryError: 0, commandError: 0, commandLost: false, commandMalformed: false, retryAfter: "1", malformedResolution: false,
    delayResolution: undefined as Promise<void> | undefined, delayCommand: undefined as Promise<void> | undefined,
    requests: [] as { path: string; method: string; body: Record<string, unknown> | null; token: string | undefined }[] };
  if (options.seed !== false) await page.addInitScript(({ role }) => {
    if (sessionStorage.getItem("qa.staff.seeded")) return;
    sessionStorage.setItem("qa.staff.seeded", "true");
    localStorage.setItem("smart-cinema.auth-session", JSON.stringify({ accessToken: "qa-staff-access", tokenType: "Bearer", expiresAt: Date.now() + 3600000, refreshToken: "qa-staff-refresh", refreshExpiresAt: Date.now() + 86400000, user: { id: 37, email: "staff@example.test", fullName: "Nhân viên kiểm soát vé", role } }));
  }, { role: options.role ?? "STAFF" });
  await page.route(/\/api\/v1\/auth\/token-revocations$/, route => route.fulfill({ status: 204 }));
  await page.route(/\/api\/v1\/staff\//, async route => {
    const request = route.request(), url = new URL(request.url()), body = request.postData() ? request.postDataJSON() as Record<string, unknown> : null;
    state.requests.push({ path: url.pathname + url.search, method: request.method(), body, token: request.headers().authorization });
    const fail = (status: number) => route.fulfill({ status, headers: { "Cache-Control": "no-store", "Retry-After": state.retryAfter }, json: { detail: "private-token-sql" } });
    if (request.headers().authorization !== "Bearer qa-staff-access") return fail(401);
    if (url.pathname.endsWith("cinema-assignments")) return state.assignmentsError ? fail(state.assignmentsError) : route.fulfill({ headers: { "Cache-Control": "no-store" }, json: state.assignments });
    if (url.pathname.endsWith("booking-qr-resolutions")) {
      const error = state.resolutionError, data = structuredClone(state.booking); data.cinemaId = String(body?.cinemaId); data.cinemaName = data.cinemaId === "71" ? "Smart Cinema Landmark" : "Smart Cinema Thủ Đức";
      if (state.delayResolution) await state.delayResolution;
      return error ? fail(error) : route.fulfill({ headers: { "Cache-Control": "no-store" }, json: state.malformedResolution ? { ...data, cinemaId: "999" } : data });
    }
    if (url.pathname.endsWith("check-ins")) {
      if (state.delayCommand) await state.delayCommand;
      if (state.commandError) return fail(state.commandError);
      const ids = body?.ticketIds as string[], result = staffCheckInFixture(state.booking, ids); state.booking = result.booking;
      if (state.commandLost) return route.abort("failed");
      return route.fulfill({ headers: { "Cache-Control": "no-store" }, json: state.commandMalformed ? { ...result, checkedInTicketIds: [] } : result });
    }
    return state.recoveryError ? fail(state.recoveryError) : route.fulfill({ headers: { "Cache-Control": "no-store" }, json: state.booking });
  });
  return state;
}
export async function resolveManualStaffQr(page: Page, token = "opaque-staff-fixture") {
  await page.getByLabel("Nhập nội dung mã QR đặt vé", { exact: true }).fill(token);
  await page.getByRole("button", { name: "Kiểm tra mã QR", exact: true }).click();
}
export async function confirmStaffTickets(page: Page, seat = "H9-10") {
  await page.getByRole("checkbox", { name: new RegExp(`Ghế ${seat} —`) }).check();
  await page.getByRole("button", { name: "Soát vé đã chọn", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận soát vé", exact: true }).click();
}
