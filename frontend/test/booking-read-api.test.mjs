import test from "node:test";
import assert from "node:assert/strict";
import { bookingFixture, historyFixture, ticketsFixture } from "./fixtures/customer-entitlements.ts";
import { BookingReadError, getBookingHistory, getBookingTickets, getOwnedBookingEntitlements, isReadInstant, validateBookingHistory, validateBookingTickets, validateOwnedEntitlements } from "@/features/booking/booking-read-api";

test("history preserves exact decimals/bigint strings and projects only approved fields", () => {
  const h = historyFixture(bookingFixture());
  const value = validateBookingHistory({ ...h, items: [{ ...h.items[0], bookingQr: "private" }] }, 0, 20);
  assert.equal(value.items[0].movieId, "9223372036854775807"); assert.equal(value.items[0].finalAmount, "290004.2963");
  assert.equal("bookingQr" in value.items[0], false);
});
test("empty and out-of-range pages validate with exact metadata", () => {
  const h = historyFixture(bookingFixture());
  assert.equal(validateBookingHistory({ ...h, items: [], page: 2 }, 2, 20).items.length, 0);
  assert.equal(validateBookingHistory({ ...h, items: [], totalElements: 0, totalPages: 0 }, 0, 20).totalPages, 0);
});
test("malformed history envelopes, order, counts, amounts, timestamps and enums fail safe", () => {
  const h = historyFixture(bookingFixture());
  for (const v of [null, [], { ...h, page: 1 }, { ...h, totalElements: Number.MAX_SAFE_INTEGER + 1 }, { ...h, totalPages: 3 }, { ...h, items: [] }, { ...h, serverTime: "2030-02-30T00:00:00Z" }, ...[{ id: 1 }, { finalAmount: 100 }, { status: "SUCCESS" }, { guestCount: 7 }, { paymentStartedAt: undefined }].map(change => ({ ...h, items: [{ ...h.items[0], ...change }] }))]) assert.throws(() => validateBookingHistory(v, 0, 20), BookingReadError);
  const items = [h.items[0], { ...h.items[0], id: "1" }];
  assert.throws(() => validateBookingHistory({ ...h, items, totalElements: 2 }, 0, 20));
});
test("strict UTC instant validation rejects normalization, local date and invalid time", () => {
  assert.ok(isReadInstant("2030-01-01T01:02:03.123456789Z"));
  for (const v of ["2030-02-30T00:00:00Z", "2030-01-01", "2030-01-01T25:00:00Z", "2030-01-01T01:00:00+07:00"]) assert.equal(isReadInstant(v), false);
});
test("nanosecond server times reject stale projections within the same millisecond", () => {
  const b = bookingFixture(), e = ticketsFixture(b);
  const previous = { booking: { ...b, serverTime: "2030-01-01T02:00:00.000000009Z" }, entitlements: { ...e, serverTime: "2030-01-01T02:00:00.000000009Z" } };
  assert.throws(() => validateOwnedEntitlements({ booking: { ...b, serverTime: "2030-01-01T02:00:00.000000008Z" }, entitlements: previous.entitlements }, previous));
  assert.throws(() => validateOwnedEntitlements({ booking: previous.booking, entitlements: { ...e, serverTime: "2030-01-01T02:00:00.000000008Z" } }, previous));
});
test("paid Tickets preserve independent statuses, one COUPLE unit and exact opaque QR", () => {
  const b = bookingFixture(), e = ticketsFixture(b);
  e.tickets[0].status = "EXPIRED"; e.tickets[1].status = "CANCELLED";
  const result = validateOwnedEntitlements({ booking: b, entitlements: validateBookingTickets(e, b.id) });
  assert.equal(result.entitlements.bookingQr, e.bookingQr); assert.equal(result.entitlements.tickets.length, 3);
  assert.equal(result.entitlements.tickets[2].guestCount, 2);
});
test("nonpaid has no Tickets or QR; paid remains readable after original expiry", () => {
  for (const status of ["PENDING", "EXPIRED", "CANCELLED"]) {
    const b = bookingFixture(status), e = ticketsFixture(b);
    assert.equal(validateBookingTickets(e, b.id).bookingQr, null);
    assert.throws(() => validateBookingTickets({ ...e, bookingQr: "token" }, b.id));
  }
  const b = bookingFixture(); assert.ok(validateOwnedEntitlements({ booking: b, entitlements: ticketsFixture(b) }));
});
test("incomplete, duplicate identities/codes/units, malformed and wrong-seat aggregates reject", () => {
  const b = bookingFixture(), e = ticketsFixture(b);
  for (const change of [{ id: e.tickets[1].id }, { ticketCode: e.tickets[1].ticketCode }, { bookingSeatId: e.tickets[1].bookingSeatId }, { seatId: e.tickets[1].seatId }, { status: "USED" }, { seatType: "DOUBLE" }, { guestCount: 3 }]) {
    const malformed = { ...e, tickets: [{ ...e.tickets[0], ...change }, ...e.tickets.slice(1)] };
    assert.throws(() => validateBookingTickets(malformed, b.id));
  }
  for (const token of [null, "", "\nprivate", "a".repeat(129), "\ud800"]) assert.throws(() => validateBookingTickets({ ...e, bookingQr: token }, b.id));
  assert.throws(() => validateBookingTickets({ ...e, bookingId: "1" }, b.id));
  assert.throws(() => validateOwnedEntitlements({ booking: b, entitlements: { ...e, tickets: e.tickets.slice(1) } }));
  assert.throws(() => validateOwnedEntitlements({ booking: b, entitlements: { ...e, tickets: [{ ...e.tickets[0], seatId: "1" }, ...e.tickets.slice(1)] } }));
});
test("stale reads, paid downgrade, changed QR and frozen snapshot changes require review", () => {
  const b = bookingFixture(), e = ticketsFixture(b), previous = { booking: b, entitlements: e };
  for (const next of [{ booking: { ...b, status: "PENDING" }, entitlements: e }, { booking: { ...b, serverTime: "2030-01-01T01:00:00Z" }, entitlements: e }, { booking: b, entitlements: { ...e, serverTime: "2030-01-01T01:00:00Z" } }, { booking: b, entitlements: { ...e, bookingQr: "replacement" } }, { booking: { ...b, finalAmount: "1.0000" }, entitlements: e }]) assert.throws(() => validateOwnedEntitlements(next, previous));
});
test("authenticated readers use GET/no-store/omit credentials and exact approved URLs", async () => {
  const original = globalThis.fetch, b = bookingFixture(), calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return Response.json(String(url).endsWith("/tickets") ? ticketsFixture(b) : String(url).includes("?") ? historyFixture(b) : b); };
  try {
    const signal = new AbortController().signal;
    await getBookingHistory(0, 20, "fixture-token", signal); await getOwnedBookingEntitlements(b.id, "fixture-token", signal);
    assert.deepEqual(calls.map(c => c.url), ["/api/v1/bookings?page=0&size=20", `/api/v1/bookings/${b.id}`, `/api/v1/bookings/${b.id}/tickets`]);
    for (const c of calls) { assert.equal(c.init?.method, "GET"); assert.equal(c.init?.cache, "no-store"); assert.equal(c.init?.credentials, "omit"); assert.equal(c.init?.headers.Authorization, "Bearer fixture-token"); }
    for (const [page, size] of [[-1, 20], [2147483648, 20], [0, 101], [0, 0], [0.5, 20]]) await assert.rejects(getBookingHistory(page, size, "fixture", signal));
    await assert.rejects(getBookingTickets("0", "fixture", signal));
    await assert.rejects(getBookingTickets(b.id, "", signal));
    assert.equal(calls.length, 3);
  } finally { globalThis.fetch = original; }
});
test("network, safe HTTP errors and malformed JSON never expose raw payload", async () => {
  const original = globalThis.fetch, b = bookingFixture(), signal = new AbortController().signal;
  try {
    for (const status of [401, 403, 404, 429, 503]) {
      globalThis.fetch = async () => new Response("SECRET-QR-SQL", { status });
      await assert.rejects(getBookingTickets(b.id, "fixture", signal), e => e instanceof BookingReadError && e.status === status && !e.message.includes("SECRET"));
    }
    globalThis.fetch = async () => new Response("invalid-json"); await assert.rejects(getBookingTickets(b.id, "fixture", signal));
    globalThis.fetch = async () => { throw new Error("private-network-token"); }; await assert.rejects(getBookingHistory(0, 20, "fixture", signal), BookingReadError);
  } finally { globalThis.fetch = original; }
});
