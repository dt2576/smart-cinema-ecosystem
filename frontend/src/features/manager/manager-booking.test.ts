import assert from "node:assert/strict";
import { test } from "node:test";
import { getManagerBooking, getManagerBookings, managerBookingQuery, validateManagerBookingDetail, validateManagerBookingPage } from "@/features/manager/manager-booking-api";
import { OperationsApiError } from "@/features/manager/manager-api";
import { managerLoginReturn } from "@/features/manager/manager-navigation";
import { managerBookingDays, managerBookingMoney, managerBookingPreset, managerBookingDate } from "@/features/manager/manager-booking-service";
import { managerBookingFixture, managerBookingPageFixture } from "../../../test/fixtures/manager-booking.mjs";

async function fixture(body: unknown, run: (calls: { path: string; init: RequestInit }[]) => Promise<void>, status = 200) {
  const previous = globalThis.fetch, calls: { path: string; init: RequestInit }[] = [];
  globalThis.fetch = async (path, init) => { calls.push({ path: String(path), init: init! }); return new Response(JSON.stringify(body), { status }); };
  try { await run(calls); } finally { globalThis.fetch = previous; }
}
test("Booking GETs preserve string identities, Bearer/no-store/signal and never send a body", async () => {
  await fixture(managerBookingPageFixture(), async calls => {
    const signal = new AbortController().signal;
    const page = await getManagerBookings("fixture", "cinemaId=11&paymentStatus=SUCCESS", signal);
    assert.equal(page.items[0].id, "9007199254740993"); assert.equal(page.items[0].latestPayment?.id, "9223372036854775807");
    assert.equal(calls[0].path, "/api/v1/manager/bookings?cinemaId=11&paymentStatus=SUCCESS");
    assert.deepEqual([calls[0].init.method, calls[0].init.cache, calls[0].init.credentials, calls[0].init.signal, calls[0].init.body], ["GET", "no-store", "omit", signal, undefined]);
    assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer fixture");
  });
  await fixture(managerBookingFixture, async calls => { const d = await getManagerBooking("fixture", "9007199254740993"); assert.equal(d.amounts.finalAmount, "380000.0000"); assert.equal(calls[0].path, "/api/v1/manager/bookings/9007199254740993"); });
});
test("all contract filters validate before any request and safely encode exact Booking codes", () => {
  for (const value of ["foo=1", "cinemaId=01", "bookingId=9223372036854775808", "status=SUCCESS", "paymentStatus=PAID", "page=-1", "page=01", "page=2147483648", "size=0", "size=101", "status=PAID&status=PENDING", "bookingCode=", "createdFrom=2026-02-30T00:00:00Z", "createdFrom=2026-01-01T00:00:00.1234567Z", "createdFrom=2026-01-01T00:00:00Z&createdTo=2026-01-01T00:00:00Z"]) assert.throws(() => managerBookingQuery(value), e => e instanceof OperationsApiError && e.status === 400);
  const query = managerBookingQuery(new URLSearchParams({ bookingCode: "BK+/&?", createdFrom: "2026-01-01T00:00:00.000001Z", createdTo: "2026-01-01T00:00:00.000002Z", page: "2147483647", size: "100" }));
  assert.equal(query.get("bookingCode"), "BK+/&?"); assert.match(query.toString(), /bookingCode=BK%2B%2F%26%3F/);
  const offset = new URLSearchParams({ createdFrom: "2026-04-14T18:42:00.123456+07:00", createdTo: "2026-04-14T18:42:00.123457+07:00" });
  assert.equal(validateManagerBookingPage(managerBookingPageFixture(), managerBookingQuery(offset)).items.length, 1);
});
test("page rejects malformed payload, foreign filters, unknown states, numeric IDs and stale ordering", () => {
  for (const patch of [{ id: 1 }, { status: "SUCCESS" }, { finalAmount: 380000 }, { createdAt: "2026-02-30T00:00:00Z" }, { latestPayment: undefined }]) {
    const p = managerBookingPageFixture(); Object.assign(p.items[0], patch); assert.throws(() => validateManagerBookingPage(p));
  }
  for (const q of ["cinemaId=12", "bookingId=9", "status=PENDING", "paymentStatus=FAILED", "page=1", "createdFrom=2030-01-01T00:00:00Z"]) assert.throws(() => validateManagerBookingPage(managerBookingPageFixture(), new URLSearchParams(q)));
  const page = managerBookingPageFixture(); page.items.push({ ...page.items[0], id: "1", createdAt: "2026-04-14T11:42:00.123457Z" }); page.totalElements = 2;
  assert.throws(() => validateManagerBookingPage(page));
  assert.throws(() => validateManagerBookingPage({ ...page, totalElements: Number.MAX_SAFE_INTEGER + 1 }));
});
test("empty, beyond-last and tied stable pagination preserve authoritative totals", () => {
  assert.deepEqual(validateManagerBookingPage({ items: [], page: 5, size: 20, totalElements: 1, totalPages: 1, serverTime: managerBookingFixture.serverTime }, new URLSearchParams("page=5")).items, []);
  const p = managerBookingPageFixture(); p.items.push({ ...p.items[0], id: "9007199254740994" }); p.totalElements = 2;
  assert.equal(validateManagerBookingPage(p).items.length, 2); p.items.reverse(); assert.throws(() => validateManagerBookingPage(p));
});
test("detail validates identity/Seat relationships and strips all uncontracted sensitive fields", () => {
  assert.throws(() => validateManagerBookingDetail(managerBookingFixture, "1"));
  const d = structuredClone(managerBookingFixture); d.tickets[0].seatId = "999"; assert.throws(() => validateManagerBookingDetail(d, d.booking.id));
  const raw = { ...managerBookingFixture, bookingQr: "secret", customer: "private", booking: { ...managerBookingFixture.booking, email: "private" }, payments: managerBookingFixture.payments.map(p => ({ ...p, metadata: "private", signature: "secret" })) };
  const parsed = JSON.stringify(validateManagerBookingDetail(raw, raw.booking.id)); assert.doesNotMatch(parsed, /secret|private|metadata|signature|email|bookingQr/);
});
test("SUCCESS never synthesizes PAID or Ticket rows and absent attempts stay null", () => {
  const d = structuredClone(managerBookingFixture); d.booking.status = "PENDING"; d.booking.storedStatus = "PENDING"; d.booking.paidAt = null; d.tickets = []; d.booking.issuedTicketCount = 0;
  const result = validateManagerBookingDetail(d, d.booking.id); assert.equal(result.booking.status, "PENDING"); assert.equal(result.payments[0].status, "SUCCESS"); assert.equal(result.tickets.length, 0);
  d.payments = []; d.booking.latestPayment = null; assert.equal(validateManagerBookingDetail(d, d.booking.id).booking.latestPayment, null);
});
test("whole COUPLE snapshots, all Ticket states and exact large/fractional money survive", () => {
  const d = structuredClone(managerBookingFixture); d.seats[0].type = "COUPLE"; d.seats[0].guestCount = 2; d.booking.guestCount = 3;
  for (const status of ["VALID", "CHECKED_IN", "EXPIRED", "CANCELLED"] as const) { d.tickets[0].status = status; assert.equal(validateManagerBookingDetail(d, d.booking.id).tickets[0].status, status); }
  assert.equal(managerBookingMoney("999999999999999.1234"), "999.999.999.999.999,1234 đ");
  assert.equal(managerBookingMoney("0.0001"), "0,0001 đ"); assert.equal(managerBookingMoney("380000.0000"), "380.000 đ");
  assert.equal(d.seats.length, 2);
});
test("date presets use Vietnam creation days and half-open UTC instants", () => {
  assert.deepEqual(managerBookingPreset("today", new Date("2026-10-28T18:00:00Z")), { createdFrom: "2026-10-28T17:00:00.000Z", createdTo: "2026-10-29T17:00:00.000Z" });
  assert.deepEqual(managerBookingDays("2026-10-29", "2026-10-29"), { createdFrom: "2026-10-28T17:00:00.000Z", createdTo: "2026-10-29T17:00:00.000Z" });
  assert.equal(managerBookingDays("2026-02-30", ""), null); assert.equal(managerBookingDays("2026-10-29", "2026-10-28"), null);
  assert.match(managerBookingDate("2026-10-28T18:00:00Z"), /29\/10\/2026/);
});
test("read failures preserve safe status, never expose backend payload and do not retry", async () => {
  for (const status of [401, 403, 404, 409, 429, 503]) await fixture({ detail: "private SQL / signature" }, async calls => { await assert.rejects(getManagerBooking("t", managerBookingFixture.booking.id), e => e instanceof OperationsApiError && e.status === status && !/private|SQL|signature/.test(e.message)); assert.equal(calls.length, 1); }, status);
  await fixture({}, async calls => { await assert.rejects(getManagerBookings("t", ""), e => e instanceof OperationsApiError && e.status === 502); assert.equal(calls.length, 1); });
});
test("login resume allows only canonical Manager Booking routes", () => {
  for (const value of ["/manager/bookings", "/manager/bookings/9007199254740993"]) assert.equal(managerLoginReturn(value), value);
  for (const value of ["//evil.test/manager/bookings", "/manager/bookings/01", "/manager/bookings/9223372036854775808", "/manager/bookings/1?returnTo=//evil", "/manager/bookings/1/qr"]) assert.equal(managerLoginReturn(value), null);
});
