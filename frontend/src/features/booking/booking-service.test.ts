import assert from "node:assert/strict";
import { test } from "node:test";
const { formatBookingAmount, bookingSummaryHref } = await import("./booking-service" + ".ts") as typeof import("./booking-service");
const { readCreation } = await import("./booking-creation-storage" + ".ts") as typeof import("./booking-creation-storage");
const { customerLoginReturn } = await import("../auth/auth-return" + ".ts") as typeof import("../auth/auth-return");
test("money and Booking routes retain exact large string values", () => {
  assert.equal(formatBookingAmount("999999999999999.9999"), "999,999,999,999,999.9999");
  assert.equal(formatBookingAmount("0.0000"), "0.0000");
  assert.equal(bookingSummaryHref("9223372036854775807"), "/bookings/9223372036854775807/summary");
});
test("recovery intent validates exact distinct origins, context and optional server identity", () => {
  const intent = { input: { showtimeId: "9007199254740993", holdIds: ["9007199254740994", "9007199254740995"] }, bookingId: "9223372036854775807" };
  assert.deepEqual(readCreation(JSON.stringify(intent), intent.input.showtimeId), intent);
  assert.equal(readCreation(JSON.stringify(intent), "1"), null);
  for (const raw of ["invalid", JSON.stringify({ input: { showtimeId: "1", holdIds: ["2", "2"] } }), JSON.stringify({ input: { showtimeId: "1", holdIds: [2] } }), JSON.stringify({ input: { showtimeId: "1", holdIds: ["2"] }, bookingId: "9223372036854775808" })]) assert.equal(readCreation(raw, "1"), null);
});
test("Customer login resume accepts only supported local Seat or owned Booking paths", () => {
  assert.equal(customerLoginReturn("/bookings/9223372036854775807/summary"), "/bookings/9223372036854775807/summary");
  for (const bad of ["https://evil.test/bookings/1/summary", "//evil.test", "/bookings/1/summary?admin=true", "/bookings/1/summary#fragment", "/bookings/01/summary", "/bookings/9223372036854775808/summary", "/admin", null]) assert.equal(customerLoginReturn(bad), null);
});
