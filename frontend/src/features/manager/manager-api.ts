import { AdminApiError } from "@/features/admin/admin-api";
import { isBookingId } from "@/features/booking/booking-api";
import type { AdminCinema, AdminHall, AdminSeat, HallContent, SeatContent } from "@/features/admin/admin-configuration.types";
import { SHOWTIME_STATUSES, validShowtimePrice, type AdminShowtime, type AdminShowtimeDetail, type AdminShowtimeSchedule, type ShowtimeContent } from "@/features/admin/admin-showtime.types";
import type { StaffAssignment } from "@/features/admin/admin-staff.types";

export { isBookingId as isOperationId };
export type ManagerAccount = { id: string; fullName: string; email: string; phone: string; status: "ACTIVE" | "BLOCKED" };
export type CinemaStaff = ManagerAccount & { assignmentId: string; effectiveAt: string };
export type ManagerAssignment = StaffAssignment & { assignmentType: "MANAGER" };
export class OperationsApiError extends AdminApiError {
  readonly outcomeUncertain: boolean;
  readonly retryAfterMs: number;
  constructor(status: number, outcomeUncertain = false, retryAfterMs = 0) {
    super(status, status === 400 ? "Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường."
      : status === 401 ? "Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại."
      : status === 403 ? "Tài khoản chưa có quyền hoặc phân công có hiệu lực. Liên hệ quản trị viên hoặc kiểm tra lại."
      : status === 404 ? "Thông tin không còn khả dụng trong phạm vi được phân công."
      : status === 409 ? "Thao tác xung đột với phân công, sơ đồ ghế, lịch chiếu hoặc lịch sử giao dịch. Tải lại để kiểm tra."
      : status === 429 ? "Có nhiều yêu cầu. Vui lòng chờ rồi kiểm tra lại."
      : "Chưa thể xác nhận phản hồi. Vui lòng kiểm tra lại dữ liệu trước khi tiếp tục.");
    this.name = "OperationsApiError"; this.outcomeUncertain = outcomeUncertain; this.retryAfterMs = retryAfterMs;
  }
}
const bad = (): never => { throw new OperationsApiError(502); };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0 && !v.includes("\0");
export const operationInstant = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 19) === v.slice(0, 19);
const sameInstant = (a: string, b: string) => a.replace(/(?:\.0+)?Z$/, "Z").replace(/(\.\d*?)0+Z$/, "$1Z") === b.replace(/(?:\.0+)?Z$/, "Z").replace(/(\.\d*?)0+Z$/, "$1Z");
const money = (v: string) => v.split(".")[0].replace(/^0+(?=\d)/, "") + "." + (v.split(".")[1] ?? "").padEnd(4, "0");
const id = (v: string) => { if (!isBookingId(v)) throw new OperationsApiError(400); return v; };
function list<T extends { id: string }>(v: unknown, parse: (v: unknown) => T, ordered = true): T[] {
  if (!Array.isArray(v)) return bad(); const items = v.map(parse);
  if (new Set(items.map(a => a.id)).size !== items.length || ordered && items.some((a, i) => i > 0 && BigInt(items[i - 1].id) >= BigInt(a.id))) return bad();
  return items;
}
export function validateCinema(v: unknown, expected?: string): AdminCinema {
  if (!record(v) || !isBookingId(v.id) || expected && v.id !== expected || !text(v.name) || !text(v.address)
    || v.contact !== null && !text(v.contact) || v.operatingInformation !== null && !text(v.operatingInformation)
    || !["ACTIVE", "TEMPORARILY_CLOSED", "INACTIVE"].includes(String(v.status))) return bad();
  return { id: v.id, name: v.name, address: v.address, contact: v.contact, operatingInformation: v.operatingInformation, status: v.status } as AdminCinema;
}
export function validateHall(v: unknown, expected?: string, cinema?: string): AdminHall {
  if (!record(v) || !isBookingId(v.id) || expected && v.id !== expected || !isBookingId(v.cinemaId) || cinema && v.cinemaId !== cinema
    || !text(v.name) || !text(v.type) || !Number.isSafeInteger(v.capacity) || Number(v.capacity) < 1 || Number(v.capacity) > 2147483647
    || !["ACTIVE", "MAINTENANCE", "INACTIVE"].includes(String(v.status)) || typeof v.layoutInitialized !== "boolean") return bad();
  return { id: v.id, cinemaId: v.cinemaId, name: v.name, capacity: v.capacity, type: v.type, status: v.status, layoutInitialized: v.layoutInitialized } as AdminHall;
}
export function validateSeat(v: unknown, expected?: string, hall?: string): AdminSeat {
  if (!record(v) || !isBookingId(v.id) || expected && v.id !== expected || !isBookingId(v.hallId) || hall && v.hallId !== hall
    || !text(v.row) || !text(v.number) || !["STANDARD", "VIP", "COUPLE"].includes(String(v.type))
    || !["ACTIVE", "MAINTENANCE", "INACTIVE"].includes(String(v.physicalStatus)) || v.guestCapacity !== (v.type === "COUPLE" ? 2 : 1)
    || typeof v.structureEditable !== "boolean") return bad();
  return { id: v.id, hallId: v.hallId, row: v.row, number: v.number, type: v.type, physicalStatus: v.physicalStatus, guestCapacity: v.guestCapacity, structureEditable: v.structureEditable } as AdminSeat;
}
export function validateManager(v: unknown): ManagerAccount {
  if (!record(v) || !isBookingId(v.id) || ![v.fullName, v.email, v.phone].every(text) || !["ACTIVE", "BLOCKED"].includes(String(v.status))) return bad();
  return { id: v.id, fullName: v.fullName, email: v.email, phone: v.phone, status: v.status } as ManagerAccount;
}
function staff(v: unknown): CinemaStaff {
  const a = validateManager(v); if (!record(v) || !isBookingId(v.assignmentId) || !operationInstant(v.effectiveAt)) return bad();
  return { ...a, assignmentId: v.assignmentId, effectiveAt: v.effectiveAt };
}
export function validateManagerAssignment(v: unknown, userId: string): ManagerAssignment {
  if (!record(v) || !isBookingId(v.id) || v.userId !== userId || !isBookingId(v.cinemaId) || !text(v.cinemaName)
    || v.assignmentType !== "MANAGER" || !["ACTIVE", "INACTIVE"].includes(String(v.status)) || !operationInstant(v.effectiveAt)) return bad();
  return { id: v.id, userId, cinemaId: v.cinemaId, cinemaName: v.cinemaName, assignmentType: "MANAGER", status: v.status, effectiveAt: v.effectiveAt } as ManagerAssignment;
}
function showtime(v: unknown, expected?: string): AdminShowtime {
  if (!record(v) || ![v.id, v.movieId, v.cinemaId, v.hallId].every(isBookingId) || expected && v.id !== expected
    || ![v.movieTitle, v.cinemaName, v.hallName].every(text) || ![v.startsAt, v.endsAt, v.occupiedUntil, v.bookingCutOff].every(operationInstant)
    || typeof v.basePrice !== "string" || !validShowtimePrice(v.basePrice) || !SHOWTIME_STATUSES.includes(v.status as never)
    || typeof v.editable !== "boolean" || !Array.isArray(v.transitions) || v.transitions.some(s => !["SCHEDULED", "OPEN_FOR_BOOKING", "CANCELLED"].includes(s))
    || new Set(v.transitions).size !== v.transitions.length || !v.editable && v.transitions.length > 0) return bad();
  return v as unknown as AdminShowtime;
}
function zone(v: unknown): string { if (typeof v !== "string") return bad(); try { new Intl.DateTimeFormat("vi-VN", { timeZone: v }).format(); return v; } catch { return bad(); } }
function detail(v: unknown, expected?: string): AdminShowtimeDetail {
  if (!record(v)) return bad(); return { timeZone: zone(v.timeZone), showtime: showtime(v.showtime, expected) };
}
export async function operationsRequest<T>(path: string, token: string, parse: (v: unknown) => T, method: "GET" | "POST" | "PUT" = "GET", body?: unknown, signal?: AbortSignal): Promise<T> {
  const write = method !== "GET"; let response: Response;
  try { response = await fetch(`/api/v1${path}`, { method, headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(write ? { "Content-Type": "application/json" } : {}) }, body: write ? JSON.stringify(body) : undefined, credentials: "omit", cache: "no-store", signal: signal ?? AbortSignal.timeout(15000) }); }
  catch (cause) { if (signal?.aborted) throw cause; throw new OperationsApiError(0, write); }
  if (!response.ok) {
    const raw = response.headers.get("Retry-After");
    const wait = raw && /^\d+$/.test(raw) ? Number(raw) * 1000 : raw ? Date.parse(raw) - Date.now() : 0;
    throw new OperationsApiError(response.status, write && response.status >= 500, Number.isSafeInteger(wait) && wait > 0 ? wait : 0);
  }
  try { if (response.status !== (method === "POST" ? 201 : 200)) return bad(); return parse(await response.json()); }
  catch { throw new OperationsApiError(502, write); }
}
export const getManagerCinemas = (token: string, signal?: AbortSignal) => operationsRequest("/manager/cinemas", token, v => list(v, a => validateCinema(a)), "GET", undefined, signal);
export const getManagerCinema = (token: string, cinema: string, signal?: AbortSignal) => operationsRequest(`/manager/cinemas/${id(cinema)}`, token, v => validateCinema(v, cinema), "GET", undefined, signal);
export const getManagerHalls = (token: string, cinema: string, signal?: AbortSignal) => operationsRequest(`/manager/cinemas/${id(cinema)}/halls`, token, v => list(v, a => validateHall(a, undefined, cinema)), "GET", undefined, signal);
export const getManagerHall = (token: string, hall: string, signal?: AbortSignal) => operationsRequest(`/manager/halls/${id(hall)}`, token, v => validateHall(v, hall), "GET", undefined, signal);
export function saveManagerHall(token: string, cinema: string, hall: string | undefined, input: HallContent) {
  id(cinema); if (hall) id(hall);
  return operationsRequest(hall ? `/manager/halls/${hall}` : `/manager/cinemas/${cinema}/halls`, token, v => validateHall(v, hall, cinema), hall ? "PUT" : "POST", { name: input.name, capacity: input.capacity, type: input.type, status: input.status });
}
export const getManagerSeats = (token: string, hall: string, signal?: AbortSignal) => operationsRequest(`/manager/halls/${id(hall)}/seats`, token, v => list(v, a => validateSeat(a, undefined, hall), false), "GET", undefined, signal);
export const getManagerSeat = (token: string, seat: string, hall: string, signal?: AbortSignal) => operationsRequest(`/manager/seats/${id(seat)}`, token, v => validateSeat(v, seat, id(hall)), "GET", undefined, signal);
const seatBody = (v: SeatContent): SeatContent => ({ row: v.row, number: v.number, type: v.type, physicalStatus: v.physicalStatus });
export const initializeManagerSeats = (token: string, hall: string, units: SeatContent[]) => operationsRequest(`/manager/halls/${id(hall)}/seats`, token, v => { const result = list(v, a => validateSeat(a, undefined, hall), false); if (!result.length || result.length !== units.length) return bad(); return result; }, "POST", { units: units.map(seatBody) });
export const updateManagerSeat = (token: string, previous: AdminSeat, input: SeatContent) => operationsRequest(`/manager/seats/${id(previous.id)}`, token, v => validateSeat(v, previous.id, previous.hallId), "PUT", seatBody(input));
export const getManagerStaff = (token: string, cinema: string, signal?: AbortSignal) => operationsRequest(`/manager/cinemas/${id(cinema)}/staff`, token, v => list(v, staff), "GET", undefined, signal);
export function getManagerShowtimes(token: string, query = "", signal?: AbortSignal) {
  const params = new URLSearchParams(query);
  for (const key of params.keys()) if (!["date", "movieId", "cinemaId", "hallId", "status"].includes(key) || params.getAll(key).length !== 1) throw new OperationsApiError(400);
  for (const key of ["movieId", "cinemaId", "hallId"]) if (params.has(key)) id(params.get(key)!);
  return operationsRequest(`/manager/showtimes${query ? `?${params}` : ""}`, token, v => {
    if (!record(v)) return bad(); const items = list(v.items, a => showtime(a), false);
    if (items.some(a => (["cinemaId", "movieId", "hallId", "status"] as const).some(key => params.has(key) && a[key] !== params.get(key)))) return bad();
    return { timeZone: zone(v.timeZone), items } satisfies AdminShowtimeSchedule;
  }, "GET", undefined, signal);
}
export const getManagerShowtime = (token: string, value: string, signal?: AbortSignal) => operationsRequest(`/manager/showtimes/${id(value)}`, token, v => detail(v, value), "GET", undefined, signal);
export function saveManagerShowtime(token: string, value: string | undefined, input: ShowtimeContent) {
  if (value) id(value); id(input.movieId); id(input.hallId);
  if (!validShowtimePrice(input.basePrice) || !operationInstant(input.startsAt) || !["DRAFT", "SCHEDULED", "OPEN_FOR_BOOKING", "CANCELLED"].includes(input.status)) throw new OperationsApiError(400);
  return operationsRequest(value ? `/manager/showtimes/${value}` : "/manager/showtimes", token, v => {
    const result = detail(v, value), s = result.showtime;
    if (s.movieId !== input.movieId || s.hallId !== input.hallId || s.status !== input.status || money(s.basePrice) !== money(input.basePrice) || !sameInstant(s.startsAt, input.startsAt)) return bad(); return result;
  }, value ? "PUT" : "POST", { movieId: input.movieId, hallId: input.hallId, startsAt: input.startsAt, basePrice: input.basePrice, status: input.status });
}
export const getManagerAccounts = (token: string, signal?: AbortSignal) => operationsRequest("/admin/managers", token, v => list(v, validateManager), "GET", undefined, signal);
export const getManagerCinemaOptions = (token: string, signal?: AbortSignal) => operationsRequest("/admin/cinemas", token, v => list(v, a => validateCinema(a)), "GET", undefined, signal);
export const getManagerAssignments = (token: string, user: string, signal?: AbortSignal) => operationsRequest(`/admin/managers/${id(user)}/cinema-assignments`, token, v => list(v, a => validateManagerAssignment(a, user)), "GET", undefined, signal);
export function addManagerAssignment(token: string, user: string, cinema: string, effectiveAt: string) {
  id(user); id(cinema); if (!operationInstant(effectiveAt)) throw new OperationsApiError(400);
  return operationsRequest(`/admin/managers/${user}/cinema-assignments`, token, v => { const a = validateManagerAssignment(v, user); if (a.cinemaId !== cinema || a.status !== "ACTIVE" || !sameInstant(a.effectiveAt, effectiveAt)) return bad(); return a; }, "POST", { cinemaId: cinema, effectiveAt });
}
export function setManagerAssignmentStatus(token: string, previous: ManagerAssignment, status: "ACTIVE" | "INACTIVE") {
  id(previous.userId); id(previous.id); if (!["ACTIVE", "INACTIVE"].includes(status)) throw new OperationsApiError(400);
  return operationsRequest(`/admin/managers/${previous.userId}/cinema-assignments/${previous.id}/status`, token, v => { const a = validateManagerAssignment(v, previous.userId); if (a.id !== previous.id || a.cinemaId !== previous.cinemaId || a.status !== status || a.effectiveAt !== previous.effectiveAt) return bad(); return a; }, "PUT", { status });
}
