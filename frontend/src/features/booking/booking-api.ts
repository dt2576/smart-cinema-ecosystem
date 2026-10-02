import type { Booking, CreateBookingInput } from "@/features/booking/booking.types";

export function isBookingId(id: unknown): id is string {
  return typeof id === "string" && /^[1-9][0-9]{0,18}$/.test(id) && (id.length < 19 || id <= "9223372036854775807");
}
const instant = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));
const label = (value: unknown) => typeof value === "string" && value.length > 0;
const money = (value: unknown): value is string => typeof value === "string" && /^\d{1,15}\.\d{4}$/.test(value);
const minor = (value: string) => BigInt(value.replace(".", ""));

export class BookingApiError extends Error {
  readonly status: number;
  readonly outcomeUncertain: boolean;
  constructor(status: number, outcomeUncertain = false) {
    super(status === 400 ? "Invalid Booking request. Return to Seat Selection and refresh your Holds."
      : status === 401 ? "Your session has ended. Sign in again to access your Booking."
      : status === 403 ? "An active Customer account is required for this Booking operation."
      : status === 404 ? "Booking or Showtime unavailable. Only your own eligible Booking can be accessed."
      : status === 409 ? "Booking could not be accepted. A Hold may have expired, been released, belong to another Customer or already be attached; the Showtime may be unavailable or past cutoff. Refresh server availability before choosing again."
      : "Booking service could not be reached or confirmed. No local Booking will be substituted.");
    this.name = "BookingApiError"; this.status = status; this.outcomeUncertain = outcomeUncertain;
  }
}

export function validateBooking(value: unknown): Booking {
  const b = value as Booking;
  if (!b || ![b.id, b.showtimeId, b.movieId, b.cinemaId, b.hallId].every(isBookingId)
    || ![b.bookingCode, b.movieTitle, b.cinemaName, b.hallName].every(label)
    || !["PENDING", "PAID", "EXPIRED", "CANCELLED"].includes(b.status)
    || ![b.startsAt, b.createdAt, b.expiresAt, b.serverTime].every(instant)
    || (b.paymentStartedAt !== null && !instant(b.paymentStartedAt))
    || !(Date.parse(b.expiresAt) > Date.parse(b.createdAt))
    || ![b.seatAmount, b.concessionAmount, b.subtotal, b.discount, b.finalAmount].every(money)
    || !Array.isArray(b.seats) || !b.seats.length || !Array.isArray(b.concessions)
    || b.seats.some(s => !s || ![s.id, s.seatId, s.holdId].every(isBookingId)
      || ![s.row, s.number].every(label) || !["STANDARD", "VIP", "COUPLE"].includes(s.type)
      || s.guestCount !== (s.type === "COUPLE" ? 2 : 1) || ![s.unitPrice, s.finalPrice].every(money))
    || b.concessions.some(c => !c || ![c.id, c.itemId].every(isBookingId) || !label(c.name)
      || !["POPCORN", "DRINK", "COMBO"].includes(c.category) || !Number.isInteger(c.quantity)
      || c.quantity < 1 || c.quantity > 2147483647 || ![c.unitPrice, c.totalPrice].every(money))
    || b.seatUnitCount !== b.seats.length || b.guestCount !== b.seats.reduce((sum, s) => sum + s.guestCount, 0)
    || new Set(b.seats.map(s => s.seatId)).size !== b.seats.length
    || new Set(b.seats.map(s => s.holdId)).size !== b.seats.length
    || new Set(b.seats.map(s => s.id)).size !== b.seats.length
    || (b.promotion !== null && (!b.promotion || !isBookingId(b.promotion.id) || !label(b.promotion.code)
      || !["PERCENTAGE", "FIXED_AMOUNT"].includes(b.promotion.type)
      || ![b.promotion.value, b.promotion.minimumOrderAmount].every(money)
      || (b.promotion.maxDiscountAmount !== null && !money(b.promotion.maxDiscountAmount))))) throw new BookingApiError(502);
  // Validate server arithmetic using exact integers; never reprice or replace it.
  if (minor(b.subtotal) !== minor(b.seatAmount) + minor(b.concessionAmount)
    || minor(b.finalAmount) + minor(b.discount) !== minor(b.subtotal)
    || b.seats.reduce((sum, s) => sum + minor(s.finalPrice), BigInt(0)) !== minor(b.seatAmount)
    || b.concessions.reduce((sum, c) => sum + minor(c.totalPrice), BigInt(0)) !== minor(b.concessionAmount)) throw new BookingApiError(502);
  return b;
}

async function request(path: string, token: string, signal: AbortSignal, input?: CreateBookingInput): Promise<Booking> {
  if (!token) throw new BookingApiError(401);
  let response: Response;
  try {
    response = await fetch(`/api/v1/bookings${path}`, {
      method: input ? "POST" : "GET", signal, cache: "no-store", credentials: "omit",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(input ? { "Content-Type": "application/json" } : {}) },
      ...(input ? { body: JSON.stringify({ showtimeId: input.showtimeId, holdIds: [...input.holdIds] }) } : {}),
    });
  } catch (error) { if (signal.aborted) throw error; throw new BookingApiError(0, !!input); }
  if (!response.ok) throw new BookingApiError(response.status, !!input && response.status >= 500);
  try { return validateBooking(await response.json()); }
  catch { throw new BookingApiError(502, !!input); }
}
export async function createBooking(input: CreateBookingInput, token: string, signal: AbortSignal): Promise<Booking> {
  if (!isBookingId(input.showtimeId) || !Array.isArray(input.holdIds) || !input.holdIds.length
    || !input.holdIds.every(isBookingId) || new Set(input.holdIds).size !== input.holdIds.length) throw new BookingApiError(400);
  const booking = await request("", token, signal, input);
  if (booking.showtimeId !== input.showtimeId || booking.seats.length !== input.holdIds.length
    || booking.seats.some(s => !input.holdIds.includes(s.holdId))) throw new BookingApiError(502, true);
  return booking;
}
export async function getBooking(id: string, token: string, signal: AbortSignal): Promise<Booking> {
  if (!isBookingId(id)) throw new BookingApiError(400);
  const booking = await request(`/${id}`, token, signal);
  if (booking.id !== id) throw new BookingApiError(502);
  return booking;
}
