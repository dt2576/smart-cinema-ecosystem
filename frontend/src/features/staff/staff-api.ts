import { isBookingId as isId } from "@/features/booking/booking-api";
import type { StaffAssignments, StaffBooking, StaffCheckIn, StaffTicket } from "@/features/staff/staff.types";

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const instant = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 19) === v.slice(0, 19);
const nanos = (v: string) => BigInt(Date.parse(v.slice(0, 19) + "Z")) * BigInt(1000000) + BigInt((v.match(/\.(\d+)/)?.[1] ?? "").padEnd(9, "0"));
// Java String.isBlank/Character.isWhitespace excludes NBSP, figure space,
// narrow NBSP and BOM. Mirror that boundary without changing the token.
export const validStaffQr = (v: unknown): v is string => typeof v === "string" && /[^\u0009-\u000d\u001c-\u0020\u1680\u2000-\u2006\u2008-\u200a\u2028-\u2029\u205f\u3000]/u.test(v) && [...v].length <= 128 && !/[\u0000-\u001f\u007f-\u009f]/u.test(v) && !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(v);

export class StaffApiError extends Error {
  readonly status: number;
  readonly retryAfter: number;
  constructor(status: number, retryAfter = 0) {
    super(status === 400 ? "Nội dung mã QR hoặc lựa chọn vé chưa hợp lệ. Vui lòng kiểm tra lại."
      : status === 401 ? "Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại."
      : status === 403 ? "Quyền nhân viên hoặc phân công tại rạp không còn khả dụng. Kiểm tra lại phân công."
      : status === 404 ? "Mã QR hoặc đơn đặt vé không khả dụng tại rạp đã chọn."
      : status === 409 ? "Trạng thái vé hoặc điều kiện vào rạp đã thay đổi. Kiểm tra lại trạng thái trước khi chọn vé."
      : status === 429 ? "Đã có nhiều yêu cầu. Vui lòng chờ rồi kiểm tra lại."
      : status === 502 ? "Thông tin trả về chưa đầy đủ hoặc chưa thống nhất. Kiểm tra lại trạng thái."
      : "Chưa thể xác minh trạng thái từ máy chủ. Vui lòng kiểm tra lại.");
    this.name = "StaffApiError"; this.status = status; this.retryAfter = retryAfter;
  }
}
const invalid = (): never => { throw new StaffApiError(502); };
export function validateStaffAssignments(value: unknown): StaffAssignments {
  if (!record(value)) return invalid();
  const a = value as unknown as StaffAssignments;
  if (!instant(a.serverTime) || !Array.isArray(a.assignments)) return invalid();
  const ids = new Set<string>(), cinemas = new Set<string>();
  for (const [i, item] of a.assignments.entries()) {
    if (!record(item) || !isId(item.id) || !isId(item.cinemaId) || !text(item.cinemaName) || !instant(item.effectiveAt)
      || nanos(item.effectiveAt) > nanos(a.serverTime) || ids.has(item.id) || cinemas.has(item.cinemaId)
      || (i > 0 && BigInt(a.assignments[i - 1].id) >= BigInt(item.id))) return invalid();
    ids.add(item.id); cinemas.add(item.cinemaId);
  }
  return { serverTime: a.serverTime, assignments: a.assignments.map(a => ({ id: a.id, cinemaId: a.cinemaId, cinemaName: a.cinemaName, effectiveAt: a.effectiveAt })) };
}
export function validateStaffBooking(value: unknown, cinemaId: string, bookingId?: string, previous?: StaffBooking): StaffBooking {
  if (!record(value)) return invalid();
  const b = value as unknown as StaffBooking;
  if (![b.bookingId, b.movieId, b.cinemaId, b.hallId, b.showtimeId].every(isId) || b.cinemaId !== cinemaId || (bookingId && b.bookingId !== bookingId)
    || ![b.bookingCode, b.movieTitle, b.cinemaName, b.hallName].every(text)
    || !["PENDING", "PAID", "EXPIRED", "CANCELLED"].includes(b.bookingStatus)
    || !["DRAFT", "SCHEDULED", "OPEN_FOR_BOOKING", "STARTED", "ENDED", "CANCELLED"].includes(b.showtimeStatus)
    || ![b.startsAt, b.endsAt, b.serverTime].every(instant) || nanos(b.endsAt) <= nanos(b.startsAt)
    || typeof b.admissionAllowed !== "boolean" || ![null, "NOT_PAID", "CONTEXT_UNAVAILABLE", "OUTSIDE_ADMISSION_WINDOW"].includes(b.admissionReason)
    || b.admissionAllowed !== (b.admissionReason === null) || !Array.isArray(b.tickets) || !Array.isArray(b.concessions)
    || (b.bookingStatus !== "PAID" ? b.tickets.length > 0 || b.admissionReason !== "NOT_PAID" : !b.tickets.length || b.admissionReason === "NOT_PAID")) return invalid();
  const ids = new Set<string>(), lines = new Set<string>(), seats = new Set<string>(), codes = new Set<string>();
  for (const [i, t] of b.tickets.entries()) {
    if (!record(t) || ![t.id, t.bookingSeatId, t.seatId].every(isId) || !validStaffQr(t.ticketCode) || [...t.ticketCode].length > 64
      || ![t.row, t.number].every(text) || !["STANDARD", "VIP", "COUPLE"].includes(t.seatType)
      || t.guestCount !== (t.seatType === "COUPLE" ? 2 : 1) || !["VALID", "CHECKED_IN", "EXPIRED", "CANCELLED"].includes(t.status)
      || typeof t.canCheckIn !== "boolean" || t.canCheckIn !== (b.admissionAllowed && t.status === "VALID")
      || (t.status === "CHECKED_IN" ? !instant(t.checkedInAt) || nanos(t.checkedInAt) > nanos(b.serverTime) : t.checkedInAt !== null)
      || ids.has(t.id) || lines.has(t.bookingSeatId) || seats.has(t.seatId) || codes.has(t.ticketCode)
      || (i > 0 && BigInt(b.tickets[i - 1].id) >= BigInt(t.id))) return invalid();
    ids.add(t.id); lines.add(t.bookingSeatId); seats.add(t.seatId); codes.add(t.ticketCode);
  }
  for (const c of b.concessions) if (!record(c) || !text(c.name) || !["POPCORN", "DRINK", "COMBO"].includes(c.category) || !Number.isSafeInteger(c.quantity) || c.quantity < 1 || c.quantity > 2147483647) return invalid();
  if (previous) {
    if (["bookingId", "bookingCode", "cinemaId", "hallId", "movieId", "showtimeId", "startsAt", "endsAt"].some(key => previous[key as keyof StaffBooking] !== b[key as keyof StaffBooking])
      || nanos(b.serverTime) < nanos(previous.serverTime) || (previous.bookingStatus === "PAID" && b.bookingStatus !== "PAID")) return invalid();
    if (previous.tickets.length) {
      if (previous.tickets.length !== b.tickets.length) return invalid();
      for (const [i, t] of b.tickets.entries()) {
        const old = previous.tickets[i];
        if (["id", "bookingSeatId", "seatId", "ticketCode", "seatType", "guestCount"].some(key => old[key as keyof StaffTicket] !== t[key as keyof StaffTicket])
          || (old.status !== "VALID" && (t.status !== old.status || t.checkedInAt !== old.checkedInAt))) return invalid();
      }
    }
  }
  // Explicit allowlist: never retain provider/Customer/QR/other unexpected fields.
  return { bookingId: b.bookingId, bookingCode: b.bookingCode, bookingStatus: b.bookingStatus, movieId: b.movieId, movieTitle: b.movieTitle,
    cinemaId: b.cinemaId, cinemaName: b.cinemaName, hallId: b.hallId, hallName: b.hallName, showtimeId: b.showtimeId,
    startsAt: b.startsAt, endsAt: b.endsAt, showtimeStatus: b.showtimeStatus, serverTime: b.serverTime, admissionAllowed: b.admissionAllowed, admissionReason: b.admissionReason,
    tickets: b.tickets.map(t => ({ id: t.id, bookingSeatId: t.bookingSeatId, seatId: t.seatId, ticketCode: t.ticketCode, row: t.row, number: t.number, seatType: t.seatType, guestCount: t.guestCount, status: t.status, checkedInAt: t.checkedInAt, canCheckIn: t.canCheckIn })),
    concessions: b.concessions.map(c => ({ name: c.name, category: c.category, quantity: c.quantity })) };
}
export function validateStaffCheckIn(value: unknown, cinema: string, previous: StaffBooking, selected: string[]): StaffCheckIn {
  if (!record(value) || !Array.isArray(value.checkedInTicketIds) || value.checkedInTicketIds.length !== selected.length
    || new Set(value.checkedInTicketIds).size !== selected.length || !value.checkedInTicketIds.every(id => isId(id) && selected.includes(id))) return invalid();
  const b = validateStaffBooking(value.booking, cinema, previous.bookingId, previous);
  if (b.bookingStatus !== "PAID" || selected.some(id => b.tickets.find(t => t.id === id)?.status !== "CHECKED_IN")) return invalid();
  return { checkedInTicketIds: [...value.checkedInTicketIds] as string[], booking: b };
}
export function staffRetryAfter(value: string | null, now = Date.now()): number {
  const seconds = value && /^\d{1,6}$/.test(value) ? Number(value) : value ? Math.ceil((Date.parse(value) - now) / 1000) : 60;
  return Number.isFinite(seconds) && seconds >= 0 && seconds <= 86400 ? seconds : 60;
}
async function request(path: string, token: string, signal: AbortSignal, body?: unknown): Promise<unknown> {
  const controller = new AbortController(), abort = () => controller.abort();
  if (signal.aborted) controller.abort(); else signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 15_000);
  try {
    if (controller.signal.aborted) throw new StaffApiError(0);
    const response = await fetch(`/api/v1/staff/${path}`, { method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal, cache: "no-store", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer" });
    if (!response.ok) throw new StaffApiError(response.status, response.status === 429 ? staffRetryAfter(response.headers.get("Retry-After")) : 0);
    if (response.status !== 200 || controller.signal.aborted) throw new StaffApiError(502);
    try { return await response.json(); } catch { throw new StaffApiError(502); }
  } catch (error) { if (error instanceof StaffApiError) throw error; throw new StaffApiError(0); }
  finally { clearTimeout(timer); signal.removeEventListener("abort", abort); }
}
export async function getStaffAssignments(token: string, signal: AbortSignal) {
  return validateStaffAssignments(await request("cinema-assignments", token, signal));
}
export async function resolveStaffQr(cinemaId: string, bookingQr: string, token: string, signal: AbortSignal) {
  if (!isId(cinemaId) || !validStaffQr(bookingQr)) throw new StaffApiError(400);
  return validateStaffBooking(await request("booking-qr-resolutions", token, signal, { cinemaId, bookingQr }), cinemaId);
}
export async function getStaffBooking(bookingId: string, cinemaId: string, token: string, signal: AbortSignal, previous?: StaffBooking) {
  if (!isId(bookingId) || !isId(cinemaId)) throw new StaffApiError(400);
  return validateStaffBooking(await request(`bookings/${bookingId}?cinemaId=${cinemaId}`, token, signal), cinemaId, bookingId, previous);
}
export async function checkInStaffTickets(previous: StaffBooking, ticketIds: string[], token: string, signal: AbortSignal) {
  if (!isId(previous.bookingId) || !isId(previous.cinemaId) || !ticketIds.length || new Set(ticketIds).size !== ticketIds.length
    || ticketIds.some(id => !isId(id) || !previous.tickets.find(t => t.id === id)?.canCheckIn)) throw new StaffApiError(400);
  return validateStaffCheckIn(await request(`bookings/${previous.bookingId}/check-ins`, token, signal, { cinemaId: previous.cinemaId, ticketIds }), previous.cinemaId, previous, ticketIds);
}
