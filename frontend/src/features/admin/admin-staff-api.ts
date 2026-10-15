import { AdminApiError, getAdminCinemas } from "@/features/admin/admin-api";
import { isBookingId as isStaffId } from "@/features/booking/booking-api";
import { validateStaffContent } from "@/features/admin/admin-staff-service";
import type { StaffAccount, StaffAccountStatus, StaffAssignment, StaffContent, AssignmentContent } from "@/features/admin/admin-staff.types";
export { isStaffId };

export class AdminStaffApiError extends AdminApiError {
  readonly outcomeUncertain: boolean;
  readonly retryAfter: number;
  constructor(status: number, outcomeUncertain = false, retryAfter = 0) {
    super(status, status === 400 ? "Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường."
      : status === 401 ? "Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại."
      : status === 403 ? "Cần tài khoản quản trị viên đang hoạt động để quản lý nhân viên."
      : status === 404 ? "Nhân viên hoặc phân công không còn khả dụng."
      : status === 409 ? "Thông tin hoặc điều kiện thao tác đã thay đổi. Kiểm tra lại trạng thái trước khi tiếp tục."
      : status === 429 ? "Đã có nhiều yêu cầu. Vui lòng chờ rồi kiểm tra lại."
      : "Chưa thể xác nhận phản hồi từ máy chủ. Vui lòng kiểm tra lại trạng thái.");
    this.name = "AdminStaffApiError"; this.outcomeUncertain = outcomeUncertain; this.retryAfter = retryAfter;
  }
}
const bad = (): never => { throw new AdminStaffApiError(502); };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const instant = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 19) === v.slice(0, 19);
const nanos = (v: string) => BigInt(Date.parse(v.slice(0, 19) + "Z")) * BigInt(1000000) + BigInt((v.match(/\.(\d+)/)?.[1] ?? "").padEnd(9, "0"));
export function validateAdminStaff(v: unknown, id?: string): StaffAccount {
  if (!record(v) || !isStaffId(v.id) || id && v.id !== id || ![v.fullName, v.email, v.phone].every(text)
    || typeof v.status !== "string" || !["ACTIVE", "BLOCKED"].includes(v.status) || typeof v.passwordSetupCompleted !== "boolean"
    || v.status === "ACTIVE" && !v.passwordSetupCompleted || v.invitationExpiresAt !== null && !instant(v.invitationExpiresAt)
    || typeof v.deliveryStatus !== "string" || !["NONE", "QUEUED", "LEASED", "SENT", "FAILED", "EXPIRED", "REVOKED"].includes(v.deliveryStatus)
    || !Number.isSafeInteger(v.deliveryAttempts) || (v.deliveryAttempts as number) < 0 || (v.deliveryAttempts as number) > 2147483647) return bad();
  const a = v as unknown as StaffAccount;
  return { id: a.id, fullName: a.fullName, email: a.email, phone: a.phone, status: a.status, passwordSetupCompleted: a.passwordSetupCompleted,
    invitationExpiresAt: a.invitationExpiresAt, deliveryStatus: a.deliveryStatus, deliveryAttempts: a.deliveryAttempts };
}
export function validateAdminAssignment(v: unknown, staffId: string): StaffAssignment {
  if (!record(v) || !isStaffId(v.id) || !isStaffId(v.userId) || v.userId !== staffId || !isStaffId(v.cinemaId) || !text(v.cinemaName)
    || typeof v.assignmentType !== "string" || !["STAFF", "MANAGER"].includes(v.assignmentType) || typeof v.status !== "string" || !["ACTIVE", "INACTIVE"].includes(v.status) || !instant(v.effectiveAt)) return bad();
  const a = v as unknown as StaffAssignment;
  return { id: a.id, userId: a.userId, cinemaId: a.cinemaId, cinemaName: a.cinemaName, assignmentType: a.assignmentType, status: a.status, effectiveAt: a.effectiveAt };
}
function ordered<T extends { id: string }>(values: T[]) {
  if (values.some((v, i) => i > 0 && BigInt(values[i - 1].id) >= BigInt(v.id))) return bad();
  return values;
}
async function request<T>(path: string, token: string, method: "GET" | "POST" | "PUT", body: unknown, parse: (v: unknown) => T, expected: number, signal?: AbortSignal) {
  const write = method !== "GET";
  let response: Response;
  try { response = await fetch(`/api/v1/admin/staff${path}`, { method, headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(write ? { "Content-Type": "application/json" } : {}) },
    body: write ? JSON.stringify(body) : undefined, credentials: "omit", cache: "no-store", signal: signal ?? (write ? AbortSignal.timeout(15_000) : undefined) }); }
  catch (cause) { if (signal?.aborted) throw cause; throw new AdminStaffApiError(0, write); }
  if (!response.ok) {
    const raw = response.headers.get("Retry-After");
    const seconds = raw && /^\d+$/.test(raw) ? Number(raw) : raw ? Math.ceil((Date.parse(raw) - Date.now()) / 1000) : 0;
    throw new AdminStaffApiError(response.status, write && response.status >= 500, Number.isSafeInteger(seconds) && seconds > 0 ? seconds : 0);
  }
  try { if (response.status !== expected) return bad(); return parse(await response.json()); }
  catch { throw new AdminStaffApiError(502, write); }
}
function idPath(id: string) { if (!isStaffId(id)) throw new AdminStaffApiError(400); return `/${id}`; }
export function getAdminStaffList(token: string, page = 0, size = 20, signal?: AbortSignal) {
  if (!Number.isInteger(page) || page < 0 || page > 2147483647 || !Number.isInteger(size) || size < 1 || size > 100) throw new AdminStaffApiError(400);
  return request(`?page=${page}&size=${size}`, token, "GET", undefined, v => {
    if (!Array.isArray(v) || v.length > size) return bad(); return ordered(v.map(a => validateAdminStaff(a)));
  }, 200, signal);
}
export const getAdminStaff = (token: string, id: string, signal?: AbortSignal) => request(idPath(id), token, "GET", undefined, v => validateAdminStaff(v, id), 200, signal);
export function createAdminStaff(token: string, content: StaffContent) {
  if (Object.keys(validateStaffContent(content)).length) throw new AdminStaffApiError(400);
  return request("", token, "POST", { fullName: content.fullName.trim(), email: content.email.trim(), phone: content.phone }, v => {
    const a = validateAdminStaff(v); if (a.status !== "BLOCKED" || a.passwordSetupCompleted) return bad(); return a;
  }, 201);
}
export const reissueAdminStaffInvitation = (token: string, id: string) => request(`${idPath(id)}/invitations`, token, "POST", {}, v => validateAdminStaff(v, id), 200);
export const setAdminStaffStatus = (token: string, id: string, status: StaffAccountStatus) => {
  if (!["ACTIVE", "BLOCKED"].includes(status)) throw new AdminStaffApiError(400);
  return request(`${idPath(id)}/status`, token, "PUT", { status }, v => { const a = validateAdminStaff(v, id); if (a.status !== status) return bad(); return a; }, 200);
};
export const getAdminStaffAssignments = (token: string, id: string, signal?: AbortSignal) => request(`${idPath(id)}/cinema-assignments`, token, "GET", undefined, v => {
  if (!Array.isArray(v)) return bad(); const assignments = ordered(v.map(a => validateAdminAssignment(a, id)));
  const active = assignments.filter(a => a.status === "ACTIVE").map(a => `${a.assignmentType}:${a.cinemaId}`);
  if (new Set(active).size !== active.length) return bad(); return assignments;
}, 200, signal);
export function addAdminStaffAssignment(token: string, id: string, content: AssignmentContent) {
  if (!isStaffId(content.cinemaId) || !instant(content.effectiveAt)) throw new AdminStaffApiError(400);
  return request(`${idPath(id)}/cinema-assignments`, token, "POST", { cinemaId: content.cinemaId, effectiveAt: content.effectiveAt }, v => {
    const a = validateAdminAssignment(v, id);
    if (a.cinemaId !== content.cinemaId || a.status !== "ACTIVE" || a.assignmentType !== "STAFF" || nanos(a.effectiveAt) !== nanos(content.effectiveAt)) return bad(); return a;
  }, 201);
}
export function setAdminStaffAssignmentStatus(token: string, staffId: string, previous: StaffAssignment, status: "ACTIVE" | "INACTIVE") {
  if (previous.userId !== staffId || previous.assignmentType !== "STAFF" || !["ACTIVE", "INACTIVE"].includes(status)) throw new AdminStaffApiError(400);
  return request(`${idPath(staffId)}/cinema-assignments${idPath(previous.id)}/status`, token, "PUT", { status }, v => {
    const a = validateAdminAssignment(v, staffId);
    if (a.id !== previous.id || a.cinemaId !== previous.cinemaId || a.assignmentType !== "STAFF" || a.status !== status || nanos(a.effectiveAt) !== nanos(previous.effectiveAt)) return bad(); return a;
  }, 200);
}
// Reuse the existing supported Admin Cinema catalogue, never a fabricated Staff endpoint.
export async function getStaffCinemaOptions(token: string, signal?: AbortSignal) {
  const values = await getAdminCinemas(token, signal);
  if (!Array.isArray(values) || values.some(c => !c || !isStaffId(c.id) || !text(c.name) || !["ACTIVE", "TEMPORARILY_CLOSED", "INACTIVE"].includes(c.status)) || new Set(values.map(c => c.id)).size !== values.length) return bad();
  return values.map(c => ({ id: c.id, name: c.name, status: c.status }));
}
