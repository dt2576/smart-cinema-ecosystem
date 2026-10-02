import assert from "node:assert/strict";
import test from "node:test";
const { holdClock, projectedServerNow, usableOwnedHolds, bookingHoldHandoff } = await import("./seat-hold-service" + ".ts") as typeof import("./seat-hold-service");
const { seatLoginReturn } = await import("../auth/auth-return" + ".ts") as typeof import("../auth/auth-return");
const time = "2030-01-01T02:00:00Z", now = Date.parse(time);
const showtime = { id: "9007199254740993", movieId: "1", cinemaId: "2", hall: { id: "3", name: "Hall" }, startsAt: "2030-01-01T03:00:00Z", bookingCutOff: "2030-01-01T02:45:00Z" };
const map = { showtimeId: showtime.id, hallId: "3", units: [{ id: "9007199254740994", showtimeId: showtime.id, hallId: "3", type: "COUPLE" as const, availability: "HELD" as const, row: "E", number: "1-2", column: 1 }] };
const hold = { id: "9007199254740995", showtimeId: showtime.id, seatId: map.units[0].id, status: "ACTIVE" as const, createdAt: time, expiresAt: "2030-01-01T02:10:00Z" };
const batch = { serverTime: time, holds: [hold] };
test("server clock uses monotonic elapsed time with conservative transport, never local TTL", () => {
  const clock = holdClock(time, 100, 350);
  assert.equal(projectedServerNow(clock, 350), now + 250);
  assert.equal(projectedServerNow(clock, 10350), now + 10250);
  assert.equal(projectedServerNow(clock, 100), now + 250);
});
test("future Booking handoff preserves whole unit/origin and original earliest expiry", () => {
  const result = bookingHoldHandoff(batch, map, showtime, [hold.seatId], now)!;
  assert.deepEqual(result.holdIds, [hold.id]); assert.equal(result.holds.length, 1); assert.equal(result.expiresAt, hold.expiresAt);
  result.holds[0].expiresAt = "changed"; assert.equal(batch.holds[0].expiresAt, hold.expiresAt);
  assert.equal(bookingHoldHandoff(batch, map, showtime, [hold.seatId], Date.parse(hold.expiresAt)), null);
  assert.equal(bookingHoldHandoff(batch, map, { ...showtime, bookingCutOff: time }, [hold.seatId], now), null);
  assert.equal(bookingHoldHandoff(batch, map, showtime, [hold.seatId, hold.seatId], now), null);
  assert.equal(bookingHoldHandoff(batch, map, showtime, ["999"], now), null);
});
test("public HELD never identifies an owner and sold/unavailable/foreign origins cannot continue", () => {
  assert.deepEqual(usableOwnedHolds([], map, now), []);
  for (const availability of ["BOOKED", "UNAVAILABLE"] as const) assert.equal(bookingHoldHandoff(batch, { ...map, units: [{ ...map.units[0], availability }] }, showtime, [hold.seatId], now), null);
  assert.equal(usableOwnedHolds([{ ...hold, showtimeId: "4" }], map, now).length, 0);
});
test("login resumption is limited to validated internal Seat routes", () => {
  const path = `/showtimes/${showtime.id}/seats?movieId=1&cinemaId=2&date=2030-01-01`;
  assert.equal(seatLoginReturn(path), path);
  for (const value of ["https://evil.test/", "//evil.test", "javascript:alert(1)", "/admin", path + "&movieId=2", path + "#fragment"]) assert.equal(seatLoginReturn(value), null);
});
