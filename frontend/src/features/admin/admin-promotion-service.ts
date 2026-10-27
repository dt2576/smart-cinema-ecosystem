export const PROMOTION_BASE = "/admin/promotions";
export const PROMOTION_TYPES = { PERCENTAGE: "Theo phần trăm", FIXED_AMOUNT: "Số tiền cố định" } as const;
export const PROMOTION_STATUSES = { ACTIVE: "Đã bật", INACTIVE: "Đã tắt" } as const;
export type PromotionType = keyof typeof PROMOTION_TYPES;
export type PromotionStatus = keyof typeof PROMOTION_STATUSES;
export type PromotionContent = { discountType: PromotionType; discountValue: string; validFrom: string; validUntil: string; minimumOrderAmount: string; usageLimit: number | null; maxDiscountAmount: string | null };
export type AdminPromotion = PromotionContent & { id: string; code: string; status: PromotionStatus };
const DECIMAL = /^(0|[1-9]\d{0,14})(?:\.\d{1,4})?$/;
export const promotionCode = (v: string) => v.replace(/^[\u0009-\u000d\u001c-\u0020\u1680\u2000-\u2006\u2008-\u200a\u2028\u2029\u205f\u3000]+|[\u0009-\u000d\u001c-\u0020\u1680\u2000-\u2006\u2008-\u200a\u2028\u2029\u205f\u3000]+$/g, "").toUpperCase();
export function validPromotionCode(v: string) {
  return !!v && v.length <= 50 && v === promotionCode(v) && !v.includes("\0") && ![...v].some(c => { const n = c.codePointAt(0)!; return n >= 0xd800 && n <= 0xdfff; });
}
export const promotionAmountInput = (v: string) => { const n = v.trim().replace(",", "."); return DECIMAL.test(n) ? n : undefined; };
export const promotionAmountExact = (v: string) => { const [w, f = ""] = v.split("."); return `${w}.${f.padEnd(4, "0")}`; };
export function promotionAmount(v: string) {
  const [w, f = ""] = v.split("."); const tail = f.replace(/0+$/, "");
  return `${w.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${tail ? `,${tail}` : ""}`;
}
export const promotionDiscount = (v: AdminPromotion) => `${promotionAmount(v.discountValue)}${v.discountType === "PERCENTAGE" ? "%" : " ₫"}`;
// Preserve all six PostgreSQL fractional digits. Date is used for calendar arithmetic only, never amounts/IDs.
export function isPromotionInstant(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(v)) return false;
  const ms = Date.parse(v); return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 19) === v.slice(0, 19);
}
export const promotionInstantKey = (v: string) => v.replace(/(?:\.(\d+))?Z$/, (_, fraction: string | undefined) => `.${(fraction ?? "").padEnd(6, "0")}Z`);
export function promotionLocal(v: string) {
  if (!isPromotionInstant(v)) return "";
  return new Date(Date.parse(`${v.slice(0, 19)}Z`) + 7 * 3600_000).toISOString().slice(0, 19) + (v.match(/\.\d+/)?.[0] ?? "");
}
export function promotionUtc(local: string): string | undefined {
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::(\d{2})(\.\d{1,6})?)?$/.exec(local);
  if (!m || local.startsWith("0000")) return undefined;
  const seconds = `${m[1]}:${m[2] ?? "00"}`, ms = Date.parse(`${seconds}+07:00`);
  if (!Number.isFinite(ms) || new Date(ms + 7 * 3600_000).toISOString().slice(0, 19) !== seconds) return undefined;
  const value = `${new Date(ms).toISOString().slice(0, 19)}${m[3] ?? ""}Z`;
  return isPromotionInstant(value) ? value : undefined;
}
// A Vietnamese text control avoids OS-dependent US dates/AM-PM in native datetime inputs.
// Reusing an unchanged display value preserves the original seconds/microseconds exactly.
export function promotionDateInput(v: string) {
  const local = promotionLocal(v);
  return local ? `${local.slice(8, 10)}/${local.slice(5, 7)}/${local.slice(0, 4)} ${local.slice(11, 16)}` : "";
}
export function promotionInputUtc(value: string, original?: string) {
  const v = value.trim();
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})(?::(\d{2})(\.\d{1,6})?)?$/.exec(v);
  if (!m) return undefined;
  if (original && v === promotionDateInput(original)) return original;
  return promotionUtc(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}${m[6] ? `:${m[6]}${m[7] ?? ""}` : ""}`);
}
export function promotionDate(v: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(v));
}
export function promotionUsage(v: string): number | null | undefined {
  const value = v.trim(); if (!value) return null;
  if (!/^[1-9]\d{0,9}$/.test(value)) return undefined;
  const n = Number(value); return n <= 2147483647 ? n : undefined;
}
export function validatePromotionContent(v: PromotionContent): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!Object.hasOwn(PROMOTION_TYPES, v.discountType)) errors.discountType = "Chọn loại giảm giá.";
  if (!DECIMAL.test(v.discountValue)) errors.discountValue = "Nhập số không âm, tối đa 15 chữ số trước và 4 chữ số sau dấu phẩy.";
  else if (v.discountType === "PERCENTAGE" && BigInt(promotionAmountExact(v.discountValue).replace(".", "")) > BigInt("1000000")) errors.discountValue = "Mức giảm theo phần trăm không vượt quá 100%.";
  if (!DECIMAL.test(v.minimumOrderAmount)) errors.minimumOrderAmount = "Nhập giá trị đơn hàng không âm; nhập 0 nếu không yêu cầu.";
  if (v.maxDiscountAmount !== null && (!DECIMAL.test(v.maxDiscountAmount) || v.discountType !== "PERCENTAGE")) errors.maxDiscountAmount = "Kiểm tra mức giảm tối đa.";
  if (!isPromotionInstant(v.validFrom)) errors.validFrom = "Nhập ngày và giờ bắt đầu hợp lệ.";
  if (!isPromotionInstant(v.validUntil)) errors.validUntil = "Nhập ngày và giờ kết thúc hợp lệ.";
  else if (!errors.validFrom && promotionInstantKey(v.validUntil) <= promotionInstantKey(v.validFrom)) errors.validUntil = "Thời gian kết thúc phải sau thời gian bắt đầu.";
  if (v.usageLimit !== null && (!Number.isInteger(v.usageLimit) || v.usageLimit < 1 || v.usageLimit > 2147483647)) errors.usageLimit = "Nhập số lượt từ 1 đến 2147483647 hoặc để trống.";
  return errors;
}
export function filterPromotions(items: AdminPromotion[], search: string, status: string) {
  const needle = promotionCode(search);
  return items.filter(item => (!status || item.status === status) && item.code.includes(needle));
}
