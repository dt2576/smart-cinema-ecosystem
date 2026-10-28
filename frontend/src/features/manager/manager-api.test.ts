import assert from "node:assert/strict";
import { test } from "node:test";
import * as api from "@/features/manager/manager-api";
import { managerLoginReturn } from "@/features/manager/manager-navigation";
import { staffEffectiveAtUtc } from "@/features/admin/admin-staff-service";

// HTTP DTO fixtures only; no persisted business/financial outcome.
const cinema = { id: "1", name: "Rạp QA", address: "Địa chỉ QA", contact: null, operatingInformation: null, status: "ACTIVE" };
const hall = { id: "2", cinemaId: "1", name: "Phòng QA", capacity: 2, type: "2D", status: "ACTIVE", layoutInitialized: true };
const seat = { id: "3", hallId: "2", row: "A", number: "1-2", type: "COUPLE" as const, physicalStatus: "ACTIVE" as const, guestCapacity: 2, structureEditable: false };
const account = { id: "4", fullName: "QA Manager", email: "manager@example.test", phone: "+84910000000", status: "ACTIVE" };
const assignment = { id: "5", userId: "4", cinemaId: "1", cinemaName: "Rạp QA", assignmentType: "MANAGER" as const, status: "ACTIVE" as const, effectiveAt: "2026-10-28T00:00:00Z" };
const showtime = { id: "6", movieId: "7", movieTitle: "Phim QA", cinemaId: "1", cinemaName: "Rạp QA", hallId: "2", hallName: "Phòng QA", startsAt: "2031-01-01T03:00:00Z", endsAt: "2031-01-01T04:30:00Z", occupiedUntil: "2031-01-01T04:30:00Z", bookingCutOff: "2031-01-01T03:00:00Z", basePrice: "999999999999999.1234", status: "DRAFT" as const, editable: true, transitions: ["SCHEDULED", "OPEN_FOR_BOOKING", "CANCELLED"] };
async function fixture<T>(response: unknown, run: (calls: { path: string; init: RequestInit }[]) => Promise<T>, status = 200, headers?: Record<string, string>) {
  const previous = globalThis.fetch; const calls: { path: string; init: RequestInit }[] = [];
  globalThis.fetch = async (input, init) => { calls.push({ path: String(input), init: init! }); return new Response(JSON.stringify(response), { status, headers: { "Content-Type": "application/json", ...headers } }); };
  try { return await run(calls); } finally { globalThis.fetch = previous; }
}
test("canonical bigint and exact safe Manager login routes", () => {
  for (const id of ["1", "9007199254740993", "9223372036854775807"]) assert.equal(api.isOperationId(id), true);
  for (const id of [1, "0", "01", "-1", "9223372036854775808", " 1", "1e2"]) assert.equal(api.isOperationId(id), false);
  for (const path of ["/manager/cinemas", "/manager/cinemas/1/staff", "/manager/halls/2/seats", "/manager/showtimes/3/edit"]) assert.equal(managerLoginReturn(path), path);
  for (const path of ["//evil.test", "/admin/managers", "/manager/cinemas/01", "/manager/cinemas/1?next=//evil", "/manager/cinemas/9223372036854775808", "/manager\\evil"]) assert.equal(managerLoginReturn(path), null);
});
test("Vietnam wall time converts to UTC and rejects normalized dates", () => { assert.equal(staffEffectiveAtUtc("2030-01-01T10:30"), "2030-01-01T03:30:00.000Z"); assert.equal(staffEffectiveAtUtc("2030-02-30T10:30"), null); });
test("response validators reject numeric/mismatched IDs, wrong parents and unsupported states", () => {
  assert.throws(() => api.validateCinema({ ...cinema, id: 1 })); assert.throws(() => api.validateHall(hall, "99")); assert.throws(() => api.validateHall(hall, "2", "9"));
  assert.throws(() => api.validateSeat({ ...seat, guestCapacity: 1 })); assert.throws(() => api.validateSeat(seat, "3", "99"));
  assert.throws(() => api.validateSeat({ ...seat, physicalStatus: "BROKEN" })); assert.throws(() => api.validateManagerAssignment({ ...assignment, assignmentType: "STAFF" }, "4"));
  assert.throws(() => api.validateManagerAssignment(assignment, "99"));
});
test("scoped GET paths, Bearer auth, abort signal and no-store are preserved", async () => {
  const cases: [unknown, (signal: AbortSignal) => Promise<unknown>, string][] = [
    [[cinema], s => api.getManagerCinemas("fixture", s), "/cinemas"], [cinema, s => api.getManagerCinema("fixture", "1", s), "/cinemas/1"],
    [[hall], s => api.getManagerHalls("fixture", "1", s), "/cinemas/1/halls"], [hall, s => api.getManagerHall("fixture", "2", s), "/halls/2"],
    [[seat], s => api.getManagerSeats("fixture", "2", s), "/halls/2/seats"], [seat, s => api.getManagerSeat("fixture", "3", "2", s), "/seats/3"],
    [[{ ...account, assignmentId: "5", effectiveAt: assignment.effectiveAt }], s => api.getManagerStaff("fixture", "1", s), "/cinemas/1/staff"],
    [{ timeZone: "Asia/Ho_Chi_Minh", items: [showtime] }, s => api.getManagerShowtimes("fixture", "", s), "/showtimes"],
    [{ timeZone: "Asia/Ho_Chi_Minh", showtime }, s => api.getManagerShowtime("fixture", "6", s), "/showtimes/6"],
  ];
  for (const [body, call, path] of cases) await fixture(body, async calls => { const s = new AbortController().signal; await call(s); assert.equal(calls.length, 1); assert.equal(calls[0].path, `/api/v1/manager${path}`); assert.equal(calls[0].init.signal, s); assert.equal(calls[0].init.method, "GET"); assert.equal(calls[0].init.body, undefined); assert.equal(calls[0].init.cache, "no-store"); assert.equal(calls[0].init.credentials, "omit"); assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer fixture"); });
});
test("Manager Hall and Seat commands send only approved fields, never UI-derived metadata", async () => {
  await fixture(hall, async calls => { await api.saveManagerHall("t", "1", undefined, hall as never); assert.equal(calls[0].init.method, "POST"); assert.deepEqual(JSON.parse(String(calls[0].init.body)), { name: hall.name, capacity: 2, type: "2D", status: "ACTIVE" }); }, 201);
  await fixture(hall, async calls => { await api.saveManagerHall("t", "1", "2", hall as never); assert.equal(calls[0].path, "/api/v1/manager/halls/2"); assert.equal(calls[0].init.method, "PUT"); });
  await fixture([seat], async calls => { await api.initializeManagerSeats("t", "2", [seat]); assert.deepEqual(JSON.parse(String(calls[0].init.body)), { units: [{ row: "A", number: "1-2", type: "COUPLE", physicalStatus: "ACTIVE" }] }); }, 201);
  await fixture(seat, async calls => { await api.updateManagerSeat("t", seat, seat); assert.equal(calls[0].path, "/api/v1/manager/seats/3"); assert.equal(calls[0].init.method, "PUT"); });
});
test("Showtime exact decimal and instant are validated without Number conversion", async () => {
  const input = { movieId: "7", hallId: "2", startsAt: showtime.startsAt, basePrice: showtime.basePrice, status: "DRAFT" as const };
  for (const existing of [undefined, "6"]) await fixture({ timeZone: "Asia/Ho_Chi_Minh", showtime }, async calls => { const result = await api.saveManagerShowtime("t", existing, input); assert.equal(result.showtime.basePrice, input.basePrice); assert.deepEqual(JSON.parse(String(calls[0].init.body)), input); }, existing ? 200 : 201);
  assert.throws(() => api.saveManagerShowtime("t", undefined, { ...input, basePrice: "1e5" }));
});
test("all four ADMIN Manager endpoints use exact namespace and immutable status body", async () => {
  await fixture([account], async calls => { await api.getManagerAccounts("t"); assert.equal(calls[0].path, "/api/v1/admin/managers"); });
  await fixture([assignment], async calls => { await api.getManagerAssignments("t", "4"); assert.equal(calls[0].path, "/api/v1/admin/managers/4/cinema-assignments"); });
  await fixture(assignment, async calls => { await api.addManagerAssignment("t", "4", "1", assignment.effectiveAt); assert.deepEqual(JSON.parse(String(calls[0].init.body)), { cinemaId: "1", effectiveAt: assignment.effectiveAt }); }, 201);
  await fixture({ ...assignment, status: "INACTIVE" }, async calls => { await api.setManagerAssignmentStatus("t", assignment, "INACTIVE"); assert.deepEqual(JSON.parse(String(calls[0].init.body)), { status: "INACTIVE" }); assert.equal(calls[0].path, "/api/v1/admin/managers/4/cinema-assignments/5/status"); });
});
test("forged duplicate collections and mismatched command receipts fail closed", async () => {
  await fixture([cinema, cinema], () => assert.rejects(api.getManagerCinemas("t"), api.OperationsApiError));
  await fixture({ ...assignment, effectiveAt: "2026-10-29T00:00:00Z" }, () => assert.rejects(api.setManagerAssignmentStatus("t", assignment, "ACTIVE"), (e: unknown) => e instanceof api.OperationsApiError && e.outcomeUncertain));
  await fixture({ ...seat, id: "99" }, () => assert.rejects(api.updateManagerSeat("t", seat, seat), (e: unknown) => e instanceof api.OperationsApiError && e.outcomeUncertain));
});
test("foreign filtered Showtime responses and duplicate filters are rejected", async () => {
  await fixture({ timeZone: "Asia/Ho_Chi_Minh", items: [showtime] }, () => assert.rejects(api.getManagerShowtimes("t", "cinemaId=99"), api.OperationsApiError));
  assert.throws(() => api.getManagerShowtimes("t", "cinemaId=1&cinemaId=1")); assert.throws(() => api.getManagerShowtimes("t", "actor=4"));
});
for (const status of [400, 401, 403, 404, 409, 429, 503]) test(`safe ${status} handling without server details or automatic mutation replay`, async () => {
  await fixture({ detail: "private SQL credentials" }, async calls => { await assert.rejects(api.saveManagerHall("t", "1", undefined, hall as never), (e: unknown) => e instanceof api.OperationsApiError && e.status === status && !e.message.includes("SQL") && e.outcomeUncertain === (status >= 500)); assert.equal(calls.length, 1); }, status);
});
test("Retry-After honored as timing hint and aborted reads remain cancellation", async () => {
  await fixture({}, () => assert.rejects(api.getManagerCinemas("t"), (e: unknown) => e instanceof api.OperationsApiError && e.retryAfterMs === 2000), 429, { "Retry-After": "2" });
  const previous = globalThis.fetch; const controller = new AbortController(); controller.abort();
  globalThis.fetch = async () => { throw new DOMException("aborted", "AbortError"); };
  try { await assert.rejects(api.getManagerCinemas("t", controller.signal), { name: "AbortError" }); } finally { globalThis.fetch = previous; }
});
test("network failure and malformed successful JSON are uncertain for writes only", async () => {
  const previous = globalThis.fetch; globalThis.fetch = async () => { throw new Error("private-network-info"); };
  try { await assert.rejects(api.saveManagerHall("t", "1", undefined, hall as never), (e: unknown) => e instanceof api.OperationsApiError && e.outcomeUncertain && !e.message.includes("private")); await assert.rejects(api.getManagerCinemas("t"), (e: unknown) => e instanceof api.OperationsApiError && !e.outcomeUncertain); } finally { globalThis.fetch = previous; }
  await fixture({}, () => assert.rejects(api.saveManagerHall("t", "1", undefined, hall as never), (e: unknown) => e instanceof api.OperationsApiError && e.outcomeUncertain), 201);
});
