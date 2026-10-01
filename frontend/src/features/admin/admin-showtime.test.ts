import assert from "node:assert/strict";
import { test } from "node:test";
const { showtimeLocalInput, showtimeLocalInstant, validShowtimePrice } = await import("./admin-showtime.types" + ".ts") as typeof import("./admin-showtime.types");
test("configured-zone authoring ignores browser timezone and handles midnight", () => {
  assert.equal(showtimeLocalInstant("2030-01-02T00:30", "Asia/Ho_Chi_Minh"), "2030-01-01T17:30:00.000Z");
  assert.equal(showtimeLocalInput("2030-01-01T17:30:00Z", "Asia/Ho_Chi_Minh"), "2030-01-02T00:30");
  assert.equal(showtimeLocalInstant("2030-07-01T10:00", "America/New_York"), "2030-07-01T14:00:00.000Z");
  for (const value of ["2030-02-30T10:00", "invalid", "2030-01-01T24:00"]) assert.throws(() => showtimeLocalInstant(value, "Asia/Ho_Chi_Minh"));
  assert.throws(() => showtimeLocalInstant("2030-03-10T02:30", "America/New_York"));
  assert.throws(() => showtimeLocalInstant("2030-11-03T01:30", "America/New_York"));
});
test("exact price text allows zero and fractional persistence without rounding", () => {
  for (const value of ["0", "0.0001", "90000.1234", "999999999999999.9999"]) assert.equal(validShowtimePrice(value), true);
  for (const value of ["", "-1", "1e3", "NaN", "1.00001", "1000000000000000"]) assert.equal(validShowtimePrice(value), false);
});
