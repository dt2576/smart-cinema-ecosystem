import { AdminApiError } from "@/features/admin/admin-api";
import { isBookingId as isPromotionId } from "@/features/booking/booking-api";
import { PROMOTION_STATUSES, promotionAmountExact, promotionCode, promotionInstantKey, validPromotionCode, validatePromotionContent, type AdminPromotion, type PromotionContent, type PromotionStatus } from "@/features/admin/admin-promotion-service";
export { isPromotionId };

export class AdminPromotionApiError extends AdminApiError {
  readonly outcomeUncertain: boolean;
  readonly retryAfter: number;
  constructor(status: number, outcomeUncertain = false, retryAfter = 0) {
    super(status, status === 400 ? "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại các trường."
      : status === 401 ? "Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại."
      : status === 403 ? "Bạn không có quyền quản lý khuyến mãi."
      : status === 404 ? "Không tìm thấy khuyến mãi."
      : status === 409 ? "Mã bị trùng hoặc thông tin vừa thay đổi. Vui lòng kiểm tra lại."
      : status === 429 ? "Vui lòng chờ một lát rồi thử lại."
      : outcomeUncertain ? "Chưa xác nhận được lần lưu. Vui lòng kiểm tra khuyến mãi trước khi thử lại."
      : "Chưa tải được khuyến mãi. Vui lòng thử lại.");
    this.name = "AdminPromotionApiError"; this.outcomeUncertain = outcomeUncertain; this.retryAfter = retryAfter;
  }
}
const invalid = (): never => { throw new AdminPromotionApiError(502); };
export function validateAdminPromotion(value: unknown, id?: string): AdminPromotion {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  const v = value as AdminPromotion;
  if (!isPromotionId(v.id) || id !== undefined && v.id !== id || typeof v.code !== "string" || !validPromotionCode(v.code)
    || typeof v.status !== "string" || !Object.hasOwn(PROMOTION_STATUSES, v.status)
    || typeof v.discountValue !== "string" || !/^(0|[1-9]\d{0,14})\.\d{4}$/.test(v.discountValue)
    || typeof v.minimumOrderAmount !== "string" || !/^(0|[1-9]\d{0,14})\.\d{4}$/.test(v.minimumOrderAmount)
    || v.maxDiscountAmount !== null && (typeof v.maxDiscountAmount !== "string" || !/^(0|[1-9]\d{0,14})\.\d{4}$/.test(v.maxDiscountAmount))
    || Object.keys(validatePromotionContent(v)).length) return invalid();
  return { id: v.id, code: v.code, status: v.status, discountType: v.discountType, discountValue: v.discountValue,
    minimumOrderAmount: v.minimumOrderAmount, maxDiscountAmount: v.maxDiscountAmount, usageLimit: v.usageLimit, validFrom: v.validFrom, validUntil: v.validUntil };
}
async function request<T>(path: string, token: string, method: "GET" | "POST" | "PUT", body: unknown, parse: (v: unknown) => T, expected: number, signal?: AbortSignal): Promise<T> {
  const write = method !== "GET";
  const encoded = write ? JSON.stringify(body) : undefined;
  if (encoded && new TextEncoder().encode(encoded).length > 1048576) throw new AdminPromotionApiError(400);
  let response: Response;
  try {
    response = await fetch(`/api/v1/admin/promotions${path}`, { method, headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(write ? { "Content-Type": "application/json" } : {}) },
      body: encoded, credentials: "omit", cache: "no-store", redirect: "error", signal: signal ?? AbortSignal.timeout(15_000) });
  } catch (cause) { if (signal?.aborted) throw cause; throw new AdminPromotionApiError(0, write); }
  if (!response.ok) {
    const raw = response.headers.get("Retry-After");
    const seconds = raw && /^\d+$/.test(raw) ? Number(raw) : raw ? Math.ceil((Date.parse(raw) - Date.now()) / 1000) : 0;
    throw new AdminPromotionApiError(response.status, write && response.status >= 500, Number.isSafeInteger(seconds) && seconds > 0 && seconds < 2147483647 ? seconds : 0);
  }
  try {
    if (response.status !== expected) return invalid();
    const result = parse(await response.json());
    if (method === "POST" && response.headers.get("Location") !== `/api/v1/admin/promotions/${(result as AdminPromotion).id}`) return invalid();
    return result;
  } catch { throw new AdminPromotionApiError(502, write); }
}
function segment(id: string) { if (!isPromotionId(id)) throw new AdminPromotionApiError(400); return `/${id}`; }
export const getAdminPromotions = (token: string, signal?: AbortSignal) => request("", token, "GET", undefined, v => {
  if (!Array.isArray(v)) return invalid(); const items = v.map(i => validateAdminPromotion(i)); if (new Set(items.map(i => i.id)).size !== items.length) return invalid(); return items;
}, 200, signal);
export const getAdminPromotion = (token: string, id: string, signal?: AbortSignal) => request(segment(id), token, "GET", undefined, v => validateAdminPromotion(v, id), 200, signal);
function content(input: PromotionContent): PromotionContent {
  const v = { discountType: input.discountType, discountValue: input.discountValue, validFrom: input.validFrom, validUntil: input.validUntil,
    minimumOrderAmount: input.minimumOrderAmount, usageLimit: input.usageLimit, maxDiscountAmount: input.maxDiscountAmount };
  if (Object.keys(validatePromotionContent(v)).length) throw new AdminPromotionApiError(400);
  return v;
}
function receipt(v: unknown, input: PromotionContent, id?: string) {
  const item = validateAdminPromotion(v, id);
  if (item.discountType !== input.discountType || item.discountValue !== promotionAmountExact(input.discountValue)
    || item.minimumOrderAmount !== promotionAmountExact(input.minimumOrderAmount) || item.maxDiscountAmount !== (input.maxDiscountAmount === null ? null : promotionAmountExact(input.maxDiscountAmount))
    || item.usageLimit !== input.usageLimit || promotionInstantKey(item.validFrom) !== promotionInstantKey(input.validFrom) || promotionInstantKey(item.validUntil) !== promotionInstantKey(input.validUntil)) return invalid();
  return item;
}
export function createAdminPromotion(token: string, code: string, input: PromotionContent, status: PromotionStatus) {
  code = promotionCode(code); const body = content(input);
  if (!validPromotionCode(code) || !Object.hasOwn(PROMOTION_STATUSES, status)) throw new AdminPromotionApiError(400);
  return request("", token, "POST", { code, ...body, status }, v => { const item = receipt(v, body); if (item.code !== code || item.status !== status) return invalid(); return item; }, 201);
}
export function updateAdminPromotion(token: string, id: string, code: string, input: PromotionContent) {
  if (!validPromotionCode(code)) throw new AdminPromotionApiError(400);
  const body = content(input);
  return request(segment(id), token, "PUT", body, v => { const item = receipt(v, body, id); if (item.code !== code) return invalid(); return item; }, 200);
}
export function setAdminPromotionStatus(token: string, id: string, status: PromotionStatus) {
  if (!Object.hasOwn(PROMOTION_STATUSES, status)) throw new AdminPromotionApiError(400);
  return request(`${segment(id)}/status`, token, "PUT", { status }, v => { const item = validateAdminPromotion(v, id); if (item.status !== status) return invalid(); return item; }, 200);
}
