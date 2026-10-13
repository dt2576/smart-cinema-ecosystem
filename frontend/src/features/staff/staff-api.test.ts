import { test } from "node:test";
import assert from "node:assert/strict";
import { StaffApiError, validStaffQr, validateStaffAssignments, validateStaffBooking, validateStaffCheckIn, getStaffAssignments, resolveStaffQr, getStaffBooking, checkInStaffTickets, staffRetryAfter } from "@/features/staff/staff-api";
import { staffLoginReturn } from "@/features/auth/auth-return";
const { staffAssignmentsFixture, staffBookingFixture, staffCheckInFixture, STAFF_QR_FIXTURE } = await import("../../../test/fixtures/staff-checkin" + ".ts") as typeof import("../../../test/fixtures/staff-checkin");

test("Staff exact opaque text validation preserves normalization, spaces and Unicode", () => {
  assert.equal(validStaffQr(STAFF_QR_FIXTURE), true); assert.equal(validStaffQr("😀".repeat(128)), true);
  for (const opaque of ["\u00a0", "\u2007", "\u202f", "\ufeff"]) assert.equal(validStaffQr(opaque), true);
  for (const blank of ["", "\u1680", "\u2000", "\u2028", "\u205f", "\u3000"]) assert.equal(validStaffQr(blank), false);
  for (const invalid of [" ", "x".repeat(129), "x\n", "x\u007f", "x\uD800", "x\uDC00", null, 1]) assert.equal(validStaffQr(invalid), false);
});
test("Staff assignments are effective unique canonical numeric-order records", () => {
  assert.deepEqual(validateStaffAssignments(staffAssignmentsFixture(true)), staffAssignmentsFixture(true));
  for (const change of [(a: ReturnType<typeof staffAssignmentsFixture>) => { a.assignments[0].id = "01"; }, (a: ReturnType<typeof staffAssignmentsFixture>) => { a.assignments.reverse(); }, (a: ReturnType<typeof staffAssignmentsFixture>) => { a.assignments[0].effectiveAt = "2027-01-01T00:00:00Z"; }, (a: ReturnType<typeof staffAssignmentsFixture>) => { a.assignments[1].cinemaId = "71"; }]) {
    const a = staffAssignmentsFixture(true); change(a); assert.throws(() => validateStaffAssignments(a), StaffApiError);
  }
});
test("Staff paid projection retains exact bigint, whole COUPLE and only approved fields", () => {
  const value = { ...staffBookingFixture(), bookingQr: "private-qr", customerEmail: "private-email", paymentId: "private-payment" };
  const b = validateStaffBooking(value, "71"); assert.equal(b.bookingId, "9007199254740993"); assert.equal(b.tickets[2].guestCount, 2);
  assert.equal(JSON.stringify(b).includes("private-"), false);
});
test("Staff mismatched identities and malformed/incoherent flags fail closed", () => {
  const changes = [b => { b.cinemaId = "72"; }, b => { b.bookingId = "01"; }, b => { b.admissionAllowed = false; }, b => { b.tickets[1].canCheckIn = true; }, b => { b.tickets[2].guestCount = 1; }, b => { b.tickets[1].checkedInAt = null; }, b => { b.tickets[0].id = b.tickets[1].id; }, b => { b.tickets[2].seatId = b.tickets[0].seatId; }, b => { b.tickets = []; }, b => { b.endsAt = b.startsAt; }] as ((b: ReturnType<typeof staffBookingFixture>) => void)[];
  for (const change of changes) { const b = staffBookingFixture(); change(b); assert.throws(() => validateStaffBooking(b, "71"), StaffApiError); }
  assert.throws(() => validateStaffBooking(staffBookingFixture(), "71", "1"), StaffApiError);
});
test("Staff nonpaid response has no entitlements and exact NOT_PAID explanation", () => {
  const b = staffBookingFixture(); b.bookingStatus = "PENDING"; b.tickets = []; b.admissionAllowed = false; b.admissionReason = "NOT_PAID";
  assert.equal(validateStaffBooking(b, "71").tickets.length, 0); b.tickets = staffBookingFixture().tickets; assert.throws(() => validateStaffBooking(b, "71"), StaffApiError);
});
test("Staff existing checked Ticket cannot regress, change timestamp or identity", () => {
  const old = staffBookingFixture();
  for (const change of [(b: typeof old) => { b.serverTime = "2026-10-13T12:00:04Z"; }, (b: typeof old) => { b.tickets[1].status = "VALID"; b.tickets[1].checkedInAt = null; b.tickets[1].canCheckIn = true; }, (b: typeof old) => { b.tickets[0].bookingSeatId = "501"; }, (b: typeof old) => { b.tickets[1].checkedInAt = "2026-10-13T12:00:03Z"; }]) {
    const b = structuredClone(old); change(b); assert.throws(() => validateStaffBooking(b, "71", old.bookingId, old), StaffApiError);
  }
});
test("Staff current server flags determine advisory admission without browser-time policy", () => {
  const b = staffBookingFixture(); b.admissionAllowed = false; b.admissionReason = "OUTSIDE_ADMISSION_WINDOW"; b.tickets.forEach(t => { t.canCheckIn = false; });
  assert.equal(validateStaffBooking(b, "71").admissionAllowed, false);
});
test("Staff confirmed command validates exact selected set and all confirmed states", () => {
  const old = staffBookingFixture(), selected = [old.tickets[0].id, old.tickets[2].id];
  assert.deepEqual(validateStaffCheckIn(staffCheckInFixture(old, selected), "71", old, selected).checkedInTicketIds, selected);
  for (const value of [{ ...staffCheckInFixture(old, selected), checkedInTicketIds: [selected[0]] }, { ...staffCheckInFixture(old, selected), checkedInTicketIds: [selected[0], selected[0]] }, { ...staffCheckInFixture(old, selected), booking: old }]) assert.throws(() => validateStaffCheckIn(value, "71", old, selected), StaffApiError);
});
test("Staff refresh rejects nanosecond stale snapshots", () => {
  const old = staffBookingFixture(); old.serverTime = "2026-10-13T12:00:05.000000002Z";
  const next = structuredClone(old); next.serverTime = "2026-10-13T12:00:05.000000001Z";
  assert.throws(() => validateStaffBooking(next, "71", old.bookingId, old), StaffApiError);
});
test("Staff authenticated transport uses exact four contracts, no-store and body-only QR", async () => {
  const requests: { path: string; options: RequestInit }[] = [], original = globalThis.fetch;
  const old = staffBookingFixture(), selected = [old.tickets[2].id];
  globalThis.fetch = async (input, options) => { const path = String(input); requests.push({ path, options: options! }); return Response.json(path.endsWith("cinema-assignments") ? staffAssignmentsFixture() : path.endsWith("check-ins") ? staffCheckInFixture(old, selected) : old); };
  try {
    const signal = new AbortController().signal; await getStaffAssignments("fixture-access", signal); await resolveStaffQr("71", STAFF_QR_FIXTURE, "fixture-access", signal); await getStaffBooking(old.bookingId, "71", "fixture-access", signal); await checkInStaffTickets(old, selected, "fixture-access", signal);
    assert.equal(requests.length, 4); assert.deepEqual(requests.map(r => r.options.method), ["GET", "POST", "GET", "POST"]);
    assert.equal(JSON.parse(String(requests[1].options.body)).bookingQr, STAFF_QR_FIXTURE);
    assert.deepEqual(JSON.parse(String(requests[3].options.body)), { cinemaId: "71", ticketIds: selected });
    assert.equal(requests[2].path, `/api/v1/staff/bookings/${old.bookingId}?cinemaId=71`);
    for (const r of requests) { assert.equal(r.path.includes(STAFF_QR_FIXTURE), false); assert.equal(r.options.cache, "no-store"); assert.equal(r.options.credentials, "omit"); assert.equal(r.options.redirect, "error"); assert.equal((r.options.headers as Record<string, string>).Authorization, "Bearer fixture-access"); }
  } finally { globalThis.fetch = original; }
});
test("Staff invalid request inputs cannot reach fetch or mutate a Ticket", async () => {
  const original = globalThis.fetch; let count = 0; globalThis.fetch = async () => { count++; return Response.json({}); };
  try { const signal = new AbortController().signal, b = staffBookingFixture(); await assert.rejects(resolveStaffQr("01", "a", "fixture", signal), StaffApiError); await assert.rejects(resolveStaffQr("71", " ", "fixture", signal), StaffApiError); await assert.rejects(checkInStaffTickets(b, [b.tickets[1].id], "fixture", signal), StaffApiError); await assert.rejects(checkInStaffTickets(b, [b.tickets[0].id, b.tickets[0].id], "fixture", signal), StaffApiError); assert.equal(count, 0); } finally { globalThis.fetch = original; }
});
test("Staff safe errors never echo backend details and respect Retry-After", async () => {
  const original = globalThis.fetch;
  try { for (const status of [400, 401, 403, 404, 409, 429, 503]) { globalThis.fetch = async () => Response.json({ detail: "private-token-sql" }, { status, headers: { "Retry-After": "60" } }); await assert.rejects(getStaffAssignments("fixture", new AbortController().signal), error => error instanceof StaffApiError && error.status === status && !error.message.includes("private-token") && (status !== 429 || error.retryAfter === 60)); } } finally { globalThis.fetch = original; }
  assert.equal(staffRetryAfter("120"), 120); assert.equal(staffRetryAfter("invalid"), 60); assert.equal(staffRetryAfter("Thu, 01 Jan 2026 00:01:00 GMT", Date.parse("2026-01-01T00:00:00Z")), 60);
});
test("Staff network/malformed/redirect-like outcomes remain safe uncertainty", async () => {
  const original = globalThis.fetch;
  try { globalThis.fetch = async () => { throw new Error("private network internals"); }; await assert.rejects(getStaffAssignments("fixture", new AbortController().signal), error => error instanceof StaffApiError && error.status === 0 && !error.message.includes("private")); globalThis.fetch = async () => new Response("not-json"); await assert.rejects(getStaffAssignments("fixture", new AbortController().signal), error => error instanceof StaffApiError && error.status === 502); } finally { globalThis.fetch = original; }
});
test("Staff login resume is exact, no external/query/fragment or Customer destination", () => {
  assert.equal(staffLoginReturn("/staff/check-in"), "/staff/check-in");
  for (const value of [null, "//evil.test", "https://evil.test", "/staff/check-in?bookingQr=private", "/staff/check-in#private", "/my-bookings", "/staff/check-in/../admin"]) assert.equal(staffLoginReturn(value), null);
});
test("Staff unexpected2xx and pre-aborted requests cannot establish confirmed results", async () => {
  const original = globalThis.fetch; let calls = 0;
  try {
    globalThis.fetch = async () => { calls++; return Response.json(staffAssignmentsFixture(), { status: 201 }); };
    await assert.rejects(getStaffAssignments("fixture", new AbortController().signal), error => error instanceof StaffApiError && error.status === 502);
    const controller = new AbortController(); controller.abort(); await assert.rejects(getStaffAssignments("fixture", controller.signal), error => error instanceof StaffApiError && error.status === 0); assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});
