import { getBooking, isBookingId } from "@/features/booking/booking-api";
import type { BookingHistoryResponse, BookingTicketsResponse, OwnedBookingEntitlements } from "@/features/booking/booking-read.types";
import { frozenBookingUnchanged } from "@/features/payment/payment-status-service";
import { sameBookingOrigins } from "@/features/payment/payment-initiation-service";

const statuses = ["PENDING", "PAID", "EXPIRED", "CANCELLED"];
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const isReadInstant = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 19) === v.slice(0, 19);
const count = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const text = (v: unknown) => typeof v === "string" && v.trim().length > 0;
export const safeOpaqueText = (v: unknown, max: number): v is string => text(v) && typeof v === "string" && [...v].length <= max && !/[\u0000-\u001f\u007f-\u009f]/u.test(v) && !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(v);

export class BookingReadError extends Error {
  readonly status: number;
  readonly review: boolean;
  constructor(status: number, review = false) {
    super(status === 401 ? "Phiên đăng nhập đã kết thúc. Đăng nhập lại để xem vé của bạn."
      : status === 403 ? "Cần tài khoản khách hàng đang hoạt động để xem thông tin này."
      : status === 404 ? "Đơn đặt vé không khả dụng hoặc không thuộc tài khoản của bạn."
      : status === 400 ? "Liên kết hoặc trang đặt vé không hợp lệ."
      : status === 429 ? "Đã có nhiều yêu cầu. Vui lòng chờ rồi kiểm tra lại."
      : review ? "Thông tin đặt vé và vé chưa đầy đủ hoặc chưa thống nhất. Mã QR được ẩn; hãy kiểm tra lại trạng thái."
      : "Chưa thể tải thông tin từ máy chủ. Vui lòng kiểm tra lại.");
    this.name = "BookingReadError";
    this.status = status; this.review = review;
  }
}
const invalid = () => { throw new BookingReadError(502, true); };
// Java Instant may serialize nine fractional digits; retain their ordering.
const instantValue = (v: string) => BigInt(Date.parse(v.slice(0, 19) + "Z")) * BigInt(1000000)
  + BigInt((v.match(/\.(\d+)/)?.[1] ?? "").padEnd(9, "0"));

export function validateBookingHistory(value: unknown, page: number, size: number): BookingHistoryResponse {
  if (!record(value)) return invalid();
  const h = value as unknown as BookingHistoryResponse;
  if (h.page !== page || h.size !== size || !count(h.totalElements) || !count(h.totalPages)
    || h.totalPages !== Math.ceil(h.totalElements / size) || !isReadInstant(h.serverTime) || !Array.isArray(h.items)
    || h.items.length !== Math.min(size, Math.max(0, h.totalElements - page * size))) return invalid();
  const ids = new Set<string>();
  for (const [index, b] of h.items.entries()) {
    if (!record(b) || ![b.id, b.movieId, b.cinemaId, b.hallId, b.showtimeId].every(isBookingId)
      || ![b.bookingCode, b.movieTitle, b.cinemaName, b.hallName].every(text) || !statuses.includes(b.status)
      || ![b.startsAt, b.createdAt, b.expiresAt].every(isReadInstant)
      || (b.paymentStartedAt !== null && !isReadInstant(b.paymentStartedAt))
      || instantValue(b.expiresAt) <= instantValue(b.createdAt) || (b.status === "PENDING" && instantValue(b.expiresAt) <= instantValue(h.serverTime))
      || !Number.isInteger(b.seatUnitCount) || b.seatUnitCount < 1 || b.seatUnitCount > 2147483647
      || !Number.isInteger(b.guestCount) || b.guestCount < b.seatUnitCount || b.guestCount > b.seatUnitCount * 2
      || typeof b.finalAmount !== "string" || !/^\d{1,15}\.\d{4}$/.test(b.finalAmount) || ids.has(b.id)) return invalid();
    const previous = h.items[index - 1];
    if (previous && (instantValue(previous.createdAt) < instantValue(b.createdAt)
      || (instantValue(previous.createdAt) === instantValue(b.createdAt) && BigInt(previous.id) >= BigInt(b.id)))) return invalid();
    ids.add(b.id);
  }
  // Project only approved collection fields; never retain unexpected entitlement metadata.
  return { page, size, totalElements: h.totalElements, totalPages: h.totalPages, serverTime: h.serverTime, items: h.items.map(b => ({ id: b.id, bookingCode: b.bookingCode, status: b.status, movieId: b.movieId, movieTitle: b.movieTitle, cinemaId: b.cinemaId, cinemaName: b.cinemaName, hallId: b.hallId, hallName: b.hallName, showtimeId: b.showtimeId, startsAt: b.startsAt, createdAt: b.createdAt, expiresAt: b.expiresAt, paymentStartedAt: b.paymentStartedAt, seatUnitCount: b.seatUnitCount, guestCount: b.guestCount, finalAmount: b.finalAmount })) };
}

export function validateBookingTickets(value: unknown, id: string): BookingTicketsResponse {
  if (!record(value)) return invalid();
  const e = value as unknown as BookingTicketsResponse;
  if (e.bookingId !== id || !isBookingId(e.bookingId) || !statuses.includes(e.bookingStatus) || !isReadInstant(e.serverTime) || !Array.isArray(e.tickets)) return invalid();
  if (e.bookingStatus !== "PAID") {
    if (e.bookingQr !== null || e.tickets.length) return invalid();
  } else if (!safeOpaqueText(e.bookingQr, 128) || !e.tickets.length) return invalid();
  const ids = new Set<string>(), codes = new Set<string>(), units = new Set<string>(), seats = new Set<string>();
  for (const [index, t] of e.tickets.entries()) {
    if (!record(t) || ![t.id, t.bookingSeatId, t.seatId].every(isBookingId) || !safeOpaqueText(t.ticketCode, 64)
      || !["VALID", "CHECKED_IN", "EXPIRED", "CANCELLED"].includes(t.status) || !["STANDARD", "VIP", "COUPLE"].includes(t.seatType)
      || t.guestCount !== (t.seatType === "COUPLE" ? 2 : 1) || ids.has(t.id) || codes.has(t.ticketCode) || units.has(t.bookingSeatId) || seats.has(t.seatId)
      || (index > 0 && BigInt(e.tickets[index - 1].id) >= BigInt(t.id))) return invalid();
    ids.add(t.id); codes.add(t.ticketCode); units.add(t.bookingSeatId); seats.add(t.seatId);
  }
  return { bookingId: id, bookingStatus: e.bookingStatus, serverTime: e.serverTime, bookingQr: e.bookingQr, tickets: e.tickets.map(t => ({ id: t.id, bookingSeatId: t.bookingSeatId, seatId: t.seatId, ticketCode: t.ticketCode, status: t.status, seatType: t.seatType, guestCount: t.guestCount })) };
}

export function validateOwnedEntitlements(current: OwnedBookingEntitlements, previous?: OwnedBookingEntitlements): OwnedBookingEntitlements {
  const { booking: b, entitlements: e } = current;
  if (b.id !== e.bookingId || b.status !== e.bookingStatus || !isReadInstant(b.serverTime)
    || ![b.startsAt, b.createdAt, b.expiresAt].every(isReadInstant) || (b.paymentStartedAt !== null && !isReadInstant(b.paymentStartedAt))) return invalid();
  if (b.status === "PAID" && (e.tickets.length !== b.seats.length || e.tickets.some(t => {
    const seat = b.seats.find(s => s.id === t.bookingSeatId);
    return !seat || seat.seatId !== t.seatId || seat.type !== t.seatType || seat.guestCount !== t.guestCount;
  }))) return invalid();
  if (previous && (!sameBookingOrigins(previous.booking, b) || !frozenBookingUnchanged(previous.booking, b)
    || instantValue(b.serverTime) < instantValue(previous.booking.serverTime) || instantValue(e.serverTime) < instantValue(previous.entitlements.serverTime)
    || (previous.booking.status === "PAID" && (b.status !== "PAID" || e.bookingQr !== previous.entitlements.bookingQr
      || e.tickets.some(t => !previous.entitlements.tickets.some(p => p.id === t.id && p.ticketCode === t.ticketCode && p.bookingSeatId === t.bookingSeatId)))))) return invalid();
  return current;
}

async function read(path: string, token: string, signal: AbortSignal): Promise<unknown> {
  if (!token) throw new BookingReadError(401);
  let response: Response;
  try { response = await fetch(`/api/v1/bookings${path}`, { method: "GET", signal, cache: "no-store", credentials: "omit", headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }); }
  catch (error) { if (signal.aborted) throw error; throw new BookingReadError(0); }
  if (!response.ok) throw new BookingReadError(response.status);
  try { return await response.json(); } catch { return invalid(); }
}
export async function getBookingHistory(page: number, size: number, token: string, signal: AbortSignal) {
  if (!Number.isInteger(page) || page < 0 || page > 2147483647 || !Number.isInteger(size) || size < 1 || size > 100) throw new BookingReadError(400);
  return validateBookingHistory(await read(`?page=${page}&size=${size}`, token, signal), page, size);
}
export async function getBookingTickets(id: string, token: string, signal: AbortSignal) {
  if (!isBookingId(id)) throw new BookingReadError(400);
  return validateBookingTickets(await read(`/${id}/tickets`, token, signal), id);
}
export async function getOwnedBookingEntitlements(id: string, token: string, signal: AbortSignal, previous?: OwnedBookingEntitlements) {
  try {
    const [booking, entitlements] = await Promise.all([getBooking(id, token, signal), getBookingTickets(id, token, signal)]);
    return validateOwnedEntitlements({ booking, entitlements }, previous);
  } catch (error) {
    if (error instanceof BookingReadError || signal.aborted) throw error;
    const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 0;
    throw new BookingReadError(status, status === 502);
  }
}
