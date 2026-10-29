import { isOperationId, operationInstant, operationsRequest, OperationsApiError } from "@/features/manager/manager-api";
import { MANAGER_BOOKING_STATUSES, MANAGER_PAYMENT_STATUSES, type ManagerBookingItem, type ManagerBookingPage, type ManagerBookingDetail, type ManagerBookingPayment } from "@/features/manager/manager-booking.types";

const bad = (): never => { throw new OperationsApiError(502); };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0 && !/[\x00-\x1f\x7f-\x9f]/.test(v);
const money = (v: unknown): v is string => typeof v === "string" && /^(0|[1-9][0-9]{0,14})\.\d{4}$/.test(v);
const count = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const nullableInstant = (v: unknown): v is string | null => v === null || operationInstant(v);
const instantKey = (v: string) => v.slice(0, 19) + "." + (v.split(".")[1]?.slice(0, -1) ?? "").padEnd(6, "0");
// Request filters accept explicit offsets. Preserve microseconds while comparing instants.
function filterInstant(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match || Number(value.slice(0, 4)) < 1 || !operationInstant(match[1] + "Z")) return null;
  if (match[3] !== "Z") {
    const [hours, minutes] = match[3].slice(1).split(":").map(Number);
    if (hours > 18 || minutes > 59 || hours === 18 && minutes !== 0) return null;
  }
  const date = new Date(match[1] + match[3]);
  return Number.isFinite(date.getTime()) ? date.toISOString().split(".")[0] + "." + (match[2] ?? "").padEnd(6, "0") : null;
}
function unique<T extends { id: string }>(v: unknown, parse: (v: unknown) => T): T[] {
  if (!Array.isArray(v)) return bad();
  const result = v.map(parse);
  if (new Set(result.map(row => row.id)).size !== result.length) return bad();
  return result;
}
function payment(v: unknown): ManagerBookingPayment {
  if (!record(v) || !isOperationId(v.id) || !MANAGER_PAYMENT_STATUSES.includes(v.status as never) || !money(v.amount)
    || v.currency !== null && !text(v.currency) || v.provider !== null && !text(v.provider)
    || !operationInstant(v.initiatedAt) || !nullableInstant(v.completedAt) || typeof v.reconciliationRequired !== "boolean") return bad();
  return { id: v.id, status: v.status as ManagerBookingPayment["status"], amount: v.amount,
    currency: v.currency as string | null, provider: v.provider as string | null,
    initiatedAt: v.initiatedAt, completedAt: v.completedAt, reconciliationRequired: v.reconciliationRequired };
}
function item(v: unknown): ManagerBookingItem {
  if (!record(v) || ![v.id, v.cinemaId, v.hallId, v.movieId, v.showtimeId].every(isOperationId)
    || ![v.bookingCode, v.cinemaName, v.hallName, v.movieTitle].every(text)
    || !MANAGER_BOOKING_STATUSES.includes(v.status as never) || !MANAGER_BOOKING_STATUSES.includes(v.storedStatus as never)
    || ![v.startsAt, v.createdAt, v.expiresAt].every(operationInstant) || !nullableInstant(v.paymentStartedAt) || !nullableInstant(v.paidAt)
    || ![v.seatUnitCount, v.guestCount, v.issuedTicketCount].every(count) || !money(v.finalAmount)) return bad();
  // Explicit projection: unexpected Customer/provider/QR data is never retained.
  return { id: v.id as string, bookingCode: v.bookingCode as string, status: v.status as ManagerBookingItem["status"], storedStatus: v.storedStatus as ManagerBookingItem["storedStatus"],
    cinemaId: v.cinemaId as string, cinemaName: v.cinemaName as string, hallId: v.hallId as string, hallName: v.hallName as string,
    movieId: v.movieId as string, movieTitle: v.movieTitle as string, showtimeId: v.showtimeId as string, startsAt: v.startsAt as string,
    createdAt: v.createdAt as string, expiresAt: v.expiresAt as string, paymentStartedAt: v.paymentStartedAt, paidAt: v.paidAt,
    seatUnitCount: v.seatUnitCount as number, guestCount: v.guestCount as number, issuedTicketCount: v.issuedTicketCount as number,
    finalAmount: v.finalAmount, latestPayment: v.latestPayment === null ? null : payment(v.latestPayment) };
}

export function managerBookingQuery(input: string | URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(input);
  const allowed = ["cinemaId", "showtimeId", "bookingId", "bookingCode", "status", "paymentStatus", "createdFrom", "createdTo", "page", "size"];
  const invalid = () => { throw new OperationsApiError(400); };
  for (const [key, value] of params) {
    if (!allowed.includes(key) || params.getAll(key).length !== 1 || !value.trim()) invalid();
    if (["cinemaId", "showtimeId", "bookingId"].includes(key) && !isOperationId(value)) invalid();
    if (key === "bookingCode" && (!text(value) || [...value].length > 40)) invalid();
    if (key === "status" && !MANAGER_BOOKING_STATUSES.includes(value as never)) invalid();
    if (key === "paymentStatus" && !MANAGER_PAYMENT_STATUSES.includes(value as never)) invalid();
    if (key === "page" && (!/^(0|[1-9][0-9]*)$/.test(value) || Number(value) > 2147483647)) invalid();
    if (key === "size" && (!/^[1-9][0-9]*$/.test(value) || Number(value) > 100)) invalid();
    if (["createdFrom", "createdTo"].includes(key) && !filterInstant(value)) invalid();
  }
  if (params.has("createdFrom") && params.has("createdTo") && filterInstant(params.get("createdFrom")!)! >= filterInstant(params.get("createdTo")!)!) invalid();
  return params;
}
export function validateManagerBookingPage(v: unknown, query = new URLSearchParams()): ManagerBookingPage {
  if (!record(v) || ![v.page, v.size, v.totalElements, v.totalPages].every(count) || !operationInstant(v.serverTime)
    || v.page !== Number(query.get("page") ?? 0) || v.size !== Number(query.get("size") ?? 20)
    || v.totalPages !== Math.ceil(Number(v.totalElements) / Number(v.size))) return bad();
  const items = unique(v.items, item);
  const remaining = Math.max(0, Number(v.totalElements) - Number(v.page) * Number(v.size));
  if (items.length !== Math.min(Number(v.size), remaining)) return bad();
  for (let i = 0; i < items.length; i++) {
    const row = items[i], previous = items[i - 1];
    for (const key of ["cinemaId", "showtimeId", "bookingId", "bookingCode", "status"] as const) {
      if (query.has(key) && row[key === "bookingId" ? "id" : key] !== query.get(key)) return bad();
    }
    if (query.has("paymentStatus") && row.latestPayment?.status !== query.get("paymentStatus")) return bad();
    if (query.has("createdFrom") && instantKey(row.createdAt) < filterInstant(query.get("createdFrom")!)!
      || query.has("createdTo") && instantKey(row.createdAt) >= filterInstant(query.get("createdTo")!)!) return bad();
    if (previous && (instantKey(previous.createdAt) < instantKey(row.createdAt)
      || instantKey(previous.createdAt) === instantKey(row.createdAt) && BigInt(previous.id) >= BigInt(row.id))) return bad();
  }
  return { items, page: v.page as number, size: v.size as number, totalElements: v.totalElements as number, totalPages: v.totalPages as number, serverTime: v.serverTime };
}
export function validateManagerBookingDetail(v: unknown, expectedId: string): ManagerBookingDetail {
  if (!record(v) || !record(v.amounts) || !operationInstant(v.serverTime)) return bad();
  const booking = item(v.booking), a = v.amounts;
  if (booking.id !== expectedId || ![a.seatAmount, a.concessionAmount, a.subtotal, a.discount, a.finalAmount].every(money) || a.finalAmount !== booking.finalAmount) return bad();
  const seats = unique(v.seats, s => {
    if (!record(s) || ![s.id, s.seatId].every(isOperationId) || ![s.row, s.number].every(text) || !["STANDARD", "VIP", "COUPLE"].includes(String(s.type))
      || s.guestCount !== (s.type === "COUPLE" ? 2 : 1) || ![s.unitPrice, s.finalPrice].every(money)) return bad();
    return { id: s.id as string, seatId: s.seatId as string, row: s.row as string, number: s.number as string, type: s.type as ManagerBookingDetail["seats"][number]["type"], guestCount: s.guestCount as number, unitPrice: s.unitPrice as string, finalPrice: s.finalPrice as string };
  });
  const concessions = unique(v.concessions, c => {
    if (!record(c) || ![c.id, c.itemId].every(isOperationId) || !text(c.name) || !["POPCORN", "DRINK", "COMBO"].includes(String(c.category))
      || !count(c.quantity) || c.quantity < 1 || c.quantity > 2147483647 || ![c.unitPrice, c.totalPrice].every(money)) return bad();
    return { id: c.id as string, itemId: c.itemId as string, name: c.name, category: c.category as ManagerBookingDetail["concessions"][number]["category"], quantity: c.quantity, unitPrice: c.unitPrice as string, totalPrice: c.totalPrice as string };
  });
  const payments = unique(v.payments, payment);
  const tickets = unique(v.tickets, t => {
    if (!record(t) || ![t.id, t.bookingSeatId, t.seatId].every(isOperationId) || !["VALID", "CHECKED_IN", "EXPIRED", "CANCELLED"].includes(String(t.status))
      || !operationInstant(t.issuedAt) || !nullableInstant(t.checkedInAt) || !seats.some(s => s.id === t.bookingSeatId && s.seatId === t.seatId)) return bad();
    return { id: t.id as string, bookingSeatId: t.bookingSeatId as string, seatId: t.seatId as string, status: t.status as ManagerBookingDetail["tickets"][number]["status"], issuedAt: t.issuedAt, checkedInAt: t.checkedInAt };
  });
  if (seats.length !== booking.seatUnitCount || tickets.length !== booking.issuedTicketCount
    || new Set(seats.map(s => s.seatId)).size !== seats.length || new Set(tickets.map(t => t.bookingSeatId)).size !== tickets.length
    || (payments[0] ? JSON.stringify(payments[0]) : null) !== (booking.latestPayment ? JSON.stringify(booking.latestPayment) : null)) return bad();
  return { booking, amounts: { seatAmount: a.seatAmount as string, concessionAmount: a.concessionAmount as string, subtotal: a.subtotal as string, discount: a.discount as string, finalAmount: a.finalAmount as string }, seats, concessions, payments, tickets, serverTime: v.serverTime };
}
export function getManagerBookings(token: string, input: string | URLSearchParams, signal?: AbortSignal) {
  const query = managerBookingQuery(input);
  return operationsRequest(`/manager/bookings${query.size ? `?${query}` : ""}`, token, v => validateManagerBookingPage(v, query), "GET", undefined, signal);
}
export function getManagerBooking(token: string, bookingId: string, signal?: AbortSignal) {
  if (!isOperationId(bookingId)) throw new OperationsApiError(400);
  return operationsRequest(`/manager/bookings/${bookingId}`, token, v => validateManagerBookingDetail(v, bookingId), "GET", undefined, signal);
}
