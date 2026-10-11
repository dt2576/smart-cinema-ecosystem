import test from "node:test";
import assert from "node:assert/strict";
import { customerLoginReturn } from "@/features/auth/auth-return";

test("Customer history resume allowlist accepts only exact local canonical routes", () => {
  for (const route of ["/my-bookings", "/my-bookings/1", "/my-bookings/9223372036854775807"]) assert.equal(customerLoginReturn(route), route);
  for (const route of ["https://evil.test/my-bookings", "//evil.test/my-bookings", "/my-bookings?x=1", "/my-bookings#qr", "/my-bookings/0", "/my-bookings/01", "/my-bookings/9223372036854775808", "/my-bookings/1?x=1", "/my-bookings/1#x", "/my-bookings/%31", "/my-bookings/1/", "/my-bookings\\1"]) assert.equal(customerLoginReturn(route), null);
});
