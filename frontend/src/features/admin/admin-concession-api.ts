import { AdminApiError } from "@/features/admin/admin-api";
import { isBookingId } from "@/features/booking/booking-api";
import { CONCESSION_CATEGORIES, CONCESSION_STATUSES, concessionPriceExact, concessionText, stripConcessionText, validateConcessionContent, type AdminConcessionItem, type ConcessionContent, type ConcessionStatus } from "@/features/admin/admin-concession-service";
export { isBookingId as isConcessionId };

export class AdminConcessionApiError extends AdminApiError {
  readonly outcomeUncertain: boolean;
  readonly retryAfter: number;
  constructor(status: number, outcomeUncertain = false, retryAfter = 0) {
    super(status, status === 400 ? "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại các trường."
      : status === 401 ? "Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại."
      : status === 403 ? "Bạn không có quyền quản lý bắp nước."
      : status === 404 ? "Không tìm thấy sản phẩm."
      : status === 409 ? "Sản phẩm vừa có thay đổi. Vui lòng kiểm tra lại trước khi tiếp tục."
      : status === 429 ? "Vui lòng chờ một lát rồi thử lại."
      : outcomeUncertain ? "Chưa xác nhận được lần lưu. Vui lòng kiểm tra sản phẩm trước khi thử lại."
      : "Chưa tải được sản phẩm. Vui lòng thử lại.");
    this.name = "AdminConcessionApiError"; this.outcomeUncertain = outcomeUncertain; this.retryAfter = retryAfter;
  }
}
const invalid = (): never => { throw new AdminConcessionApiError(502); };
const instant = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 19) === v.slice(0, 19);
export function validateAdminConcession(value: unknown, id?: string): AdminConcessionItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  const v = value as Record<string, unknown>;
  if (!isBookingId(v.id) || id !== undefined && v.id !== id || typeof v.name !== "string" || !stripConcessionText(v.name) || [...v.name].length > 150 || !concessionText(v.name)
    || typeof v.category !== "string" || !Object.hasOwn(CONCESSION_CATEGORIES, v.category) || typeof v.status !== "string" || !Object.hasOwn(CONCESSION_STATUSES, v.status)
    || typeof v.sellingPrice !== "string" || !/^(0|[1-9]\d{0,14})\.\d{4}$/.test(v.sellingPrice)
    || v.description !== null && (typeof v.description !== "string" || !concessionText(v.description)) || v.imageUrl !== null && typeof v.imageUrl !== "string"
    || !instant(v.createdAt) || !instant(v.updatedAt) || Date.parse(v.updatedAt) < Date.parse(v.createdAt)) return invalid();
  return { id: v.id, name: v.name, category: v.category as AdminConcessionItem["category"], status: v.status as ConcessionStatus, sellingPrice: v.sellingPrice,
    description: v.description as string | null, imageUrl: v.imageUrl as string | null, createdAt: v.createdAt, updatedAt: v.updatedAt };
}
async function request<T>(path: string, token: string, method: "GET" | "POST" | "PUT", body: unknown, parse: (v: unknown) => T, expected: number, signal?: AbortSignal): Promise<T> {
  const write = method !== "GET";
  const encoded = write ? JSON.stringify(body) : undefined;
  if (encoded && new TextEncoder().encode(encoded).length > 1048576) throw new AdminConcessionApiError(400);
  let response: Response;
  try {
    response = await fetch(`/api/v1/admin/concession-items${path}`, { method, headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(write ? { "Content-Type": "application/json" } : {}) },
      body: encoded, credentials: "omit", cache: "no-store", redirect: "error", signal: signal ?? AbortSignal.timeout(15_000) });
  } catch (cause) { if (signal?.aborted) throw cause; throw new AdminConcessionApiError(0, write); }
  if (!response.ok) {
    const raw = response.headers.get("Retry-After");
    const seconds = raw && /^\d+$/.test(raw) ? Number(raw) : raw ? Math.ceil((Date.parse(raw) - Date.now()) / 1000) : 0;
    throw new AdminConcessionApiError(response.status, write && response.status >= 500, Number.isSafeInteger(seconds) && seconds > 0 && seconds < 2147483647 ? seconds : 0);
  }
  try {
    if (response.status !== expected) return invalid();
    const result = parse(await response.json());
    if (method === "POST" && response.headers.get("Location") !== `/api/v1/admin/concession-items/${(result as AdminConcessionItem).id}`) return invalid();
    return result;
  } catch { throw new AdminConcessionApiError(502, write); }
}
function segment(id: string) { if (!isBookingId(id)) throw new AdminConcessionApiError(400); return `/${id}`; }
export const getAdminConcessions = (token: string, signal?: AbortSignal) => request("", token, "GET", undefined, v => {
  if (!Array.isArray(v)) return invalid(); const items = v.map(i => validateAdminConcession(i)); if (new Set(items.map(i => i.id)).size !== items.length) return invalid(); return items;
}, 200, signal);
export const getAdminConcession = (token: string, id: string, signal?: AbortSignal) => request(segment(id), token, "GET", undefined, v => validateAdminConcession(v, id), 200, signal);
function content(input: ConcessionContent): ConcessionContent {
  const v = { name: stripConcessionText(input.name), description: input.description === null ? null : stripConcessionText(input.description), category: input.category, sellingPrice: input.sellingPrice };
  if (Object.keys(validateConcessionContent(v)).length) throw new AdminConcessionApiError(400);
  return v;
}
function receipt(v: unknown, input: ConcessionContent, id?: string) {
  const item = validateAdminConcession(v, id);
  if (item.name !== input.name || item.description !== input.description || item.category !== input.category || item.sellingPrice !== concessionPriceExact(input.sellingPrice)) return invalid();
  return item;
}
export function createAdminConcession(token: string, input: ConcessionContent, status: ConcessionStatus) {
  const body = content(input); if (!Object.hasOwn(CONCESSION_STATUSES, status)) throw new AdminConcessionApiError(400);
  return request("", token, "POST", { ...body, status }, v => { const item = receipt(v, body); if (item.status !== status || item.imageUrl !== null) return invalid(); return item; }, 201);
}
export function updateAdminConcession(token: string, id: string, input: ConcessionContent) {
  const body = content(input); return request(segment(id), token, "PUT", body, v => receipt(v, body, id), 200);
}
export function setAdminConcessionStatus(token: string, id: string, status: ConcessionStatus) {
  if (!Object.hasOwn(CONCESSION_STATUSES, status)) throw new AdminConcessionApiError(400);
  return request(`${segment(id)}/status`, token, "PUT", { status }, v => { const item = validateAdminConcession(v, id); if (item.status !== status) return invalid(); return item; }, 200);
}
