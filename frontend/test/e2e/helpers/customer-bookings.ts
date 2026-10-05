import type { Page } from "@playwright/test";
import type { Booking, CreateBookingInput } from "@/features/booking/booking.types";
import type { mockCustomerHolds } from "./customer-holds";

export const BOOKING_ID = "9007199254770001";
// Existing-resource HTTP simulator only. This is never a production adapter or
// evidence of PostgreSQL behavior; the live flow has no interception.
export async function mockCustomerBookings(page: Page, holds: Awaited<ReturnType<typeof mockCustomerHolds>>) {
  const state = { booking: undefined as Booking | undefined, posts: [] as CreateBookingInput[], reads: 0, rejectNext: 0, readError: 0, lostResponse: false, expireDuring: false, delay: undefined as Promise<void> | undefined };
  let now = "2030-01-01T02:00:00Z";
  await page.route(/\/api\/v1\/bookings(?:\/\d+)?$/, async route => {
    try { now = await page.evaluate(() => new Date(Date.now()).toISOString()); } catch { /* Aborted previous document. */ }
    if (route.request().headers().authorization !== "Bearer qa-access") return route.fulfill({ status: 401, json: { detail: "Cần đăng nhập" } });
    if (route.request().method() === "GET") {
      state.reads++;
      if (state.readError) return route.fulfill({ status: state.readError, json: { detail: "private SQL owner information" } });
      if (!state.booking || !route.request().url().endsWith(`/${state.booking.id}`)) return route.fulfill({ status: 404, json: {} });
      if (state.booking.status === "PENDING" && Date.parse(now) >= Date.parse(state.booking.expiresAt)) state.booking.status = "EXPIRED";
      return route.fulfill({ json: { ...state.booking, serverTime: now } });
    }
    const input = route.request().postDataJSON() as CreateBookingInput; state.posts.push(input);
    if (state.delay) await state.delay;
    if (state.rejectNext) { const status = state.rejectNext; state.rejectNext = 0; return route.fulfill({ status, json: { detail: "private SQL owner information" } }); }
    if (state.expireDuring) { holds.holds = []; return route.fulfill({ status: 409, json: {} }); }
    if (state.booking) {
      const sameSet = state.booking.seats.length === input.holdIds.length && state.booking.seats.every(seat => input.holdIds.includes(seat.holdId));
      if (!sameSet || state.booking.showtimeId !== input.showtimeId || state.booking.status !== "PENDING" || Date.parse(state.booking.expiresAt) <= Date.parse(now)) return route.fulfill({ status: 409, json: {} });
      return route.fulfill({ json: { ...state.booking, serverTime: now } });
    }
    const origins = input.holdIds.map(id => holds.holds.find(hold => hold.id === id && hold.showtimeId === input.showtimeId && Date.parse(hold.expiresAt) > Date.parse(now)));
    if (!origins.length || origins.some(origin => !origin) || new Set(input.holdIds).size !== input.holdIds.length) return route.fulfill({ status: 409, json: {} });
    const seats = origins.map((origin, index) => {
      const couple = origin!.seatId === "9007199254742041", vip = origin!.seatId === "9007199254742031";
      return { id: String(BigInt("9007199254771001") + BigInt(index)), seatId: origin!.seatId, holdId: origin!.id, row: couple ? "E" : vip ? "D" : "A", number: couple ? "1-2" : "1", type: couple ? "COUPLE" as const : vip ? "VIP" as const : "STANDARD" as const, guestCount: couple ? 2 : 1, unitPrice: "90001.4321", finalPrice: "90001.4321" };
    });
    const scaled = BigInt("900014321") * BigInt(seats.length), raw = scaled.toString().padStart(5, "0"), amount = `${raw.slice(0, -4)}.${raw.slice(-4)}`;
    state.booking = { id: BOOKING_ID, bookingCode: "SERVER-BOOKING-REF", status: "PENDING", showtimeId: input.showtimeId, movieId: "9223372036854775807", movieTitle: "Seat Journey", cinemaId: "9007199254740993", cinemaName: "Smart Cinema Landmark", hallId: "90071992547409931", hallName: "Phòng chiếu 1", startsAt: "2030-01-01T03:00:00Z", createdAt: now, expiresAt: new Date(Math.min(...origins.map(origin => Date.parse(origin!.expiresAt)))).toISOString(), serverTime: now, seatUnitCount: seats.length, guestCount: seats.reduce((sum, seat) => sum + seat.guestCount, 0), seatAmount: amount, concessionAmount: "0.0000", subtotal: amount, discount: "0.0000", finalAmount: amount, seats, concessions: [], promotion: null, paymentStartedAt: null };
    holds.attachedHolds = origins.map(origin => origin!); holds.holds = holds.holds.filter(hold => !input.holdIds.includes(hold.id));
    if (state.lostResponse) { state.lostResponse = false; return route.abort("failed"); }
    return route.fulfill({ json: state.booking });
  });
  return state;
}
