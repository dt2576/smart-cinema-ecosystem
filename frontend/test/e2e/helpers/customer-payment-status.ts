import type { Page } from "@playwright/test";
import type { Booking } from "@/features/booking/booking.types";
import type { OwnedPaymentAttempt } from "@/features/payment/payment-initiation.types";
import { mockDiscoveryReads } from "./customer-discovery";
import { mockCustomerHolds } from "./customer-holds";
import { mockCustomerBookings, BOOKING_ID } from "./customer-bookings";
import { mockCustomerPayments, paymentFixture, PAYMENT_ID } from "./customer-payments";

export const RETURN_PATH = "/payments/vnpay/return";
export const SUMMARY_PATH = `/bookings/${BOOKING_ID}/summary`;

// Fixture-backed browser contract scenarios only. Not a provider/IPN simulator
// in production, not evidence of signed Sandbox callbacks or actual SUCCESS/PAID.
export async function preparePaymentStatus(page: Page, authenticated = true, withHint = true) {
  await page.clock.install({ time: new Date("2030-01-01T02:01:00Z") });
  const discovery = await mockDiscoveryReads(page), holds = await mockCustomerHolds(page, discovery, authenticated), bookings = await mockCustomerBookings(page, holds);
  const booking: Booking = {
    id: BOOKING_ID, bookingCode: "FIXTURE-RETURN-BOOKING", status: "PENDING", showtimeId: "9007199254741001", movieId: "9223372036854775807", movieTitle: "Phim fixture", cinemaId: "9007199254740993", cinemaName: "Smart Cinema Landmark", hallId: "90071992547409931", hallName: "Phòng chiếu 1",
    startsAt: "2030-01-01T03:00:00Z", createdAt: "2030-01-01T02:00:00Z", expiresAt: "2030-01-01T02:10:00Z", serverTime: "2030-01-01T02:01:00Z", paymentStartedAt: "2030-01-01T02:00:01Z",
    seatUnitCount: 1, guestCount: 2, seatAmount: "90001.4321", concessionAmount: "0.0000", subtotal: "90001.4321", discount: "0.0000", finalAmount: "90001.4321", promotion: null, concessions: [],
    seats: [{ id: "9007199254771001", seatId: "9007199254742041", holdId: "9007199254750000", row: "E", number: "1-2", type: "COUPLE", guestCount: 2, unitPrice: "90001.4321", finalPrice: "90001.4321" }],
  };
  bookings.booking = booking;
  const payments = paymentFixture(); payments.status = "PENDING";
  payments.receipt = { id: PAYMENT_ID, bookingId: BOOKING_ID, internalReference: "P-" + "a".repeat(32), status: "PENDING", amount: booking.finalAmount, provider: "VNPAY", currency: "VND", initiatedAt: booking.paymentStartedAt!, expiresAt: booking.expiresAt };
  await mockCustomerPayments(page, bookings, payments);
  const state = { override: {} as Partial<OwnedPaymentAttempt>, fault: "" as "" | "network" | "json", reads: [] as { path: string; authorization?: string; method: string }[], writes: [] as string[] };
  page.on("request", request => { if (request.method() !== "GET" && new URL(request.url()).pathname.startsWith("/api/")) state.writes.push(new URL(request.url()).pathname); });
  await page.route(`/api/v1/bookings/${BOOKING_ID}/payment-transactions/${PAYMENT_ID}`, async route => {
    const request = route.request(); state.reads.push({ path: new URL(request.url()).pathname, authorization: request.headers().authorization, method: request.method() });
    if (state.fault === "network") return route.abort("failed");
    if (state.fault === "json") return route.fulfill({ contentType: "application/json", body: "{" });
    if (Object.keys(state.override).length) return route.fulfill({ json: { paymentId: PAYMENT_ID, bookingId: BOOKING_ID, amount: booking.finalAmount, status: payments.status, bookingStatus: booking.status, reconciliationRequired: payments.reconciliationRequired, ...state.override } });
    return route.fallback();
  });
  if (withHint) await page.addInitScript(({ bookingId, paymentId }) => {
    if (sessionStorage.getItem("qa.return-hint-seeded")) return;
    sessionStorage.setItem("qa.return-hint-seeded", "true");
    const hint = { bookingId, paymentId, reviewRequired: true };
    sessionStorage.setItem(`smart-cinema.payment-initiation:${bookingId}`, JSON.stringify(hint));
    sessionStorage.setItem("smart-cinema.payment-return", JSON.stringify(hint));
  }, { bookingId: BOOKING_ID, paymentId: PAYMENT_ID });
  return { booking, bookings, payments, state };
}
