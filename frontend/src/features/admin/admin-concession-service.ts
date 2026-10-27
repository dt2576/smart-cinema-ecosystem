export const CONCESSION_CATEGORIES = { POPCORN: "Bắp rang", DRINK: "Đồ uống", COMBO: "Combo" } as const;
export const CONCESSION_STATUSES = { ACTIVE: "Đang bán", INACTIVE: "Ngừng bán" } as const;
export type ConcessionCategory = keyof typeof CONCESSION_CATEGORIES;
export type ConcessionStatus = keyof typeof CONCESSION_STATUSES;
export type ConcessionContent = { name: string; description: string | null; category: ConcessionCategory; sellingPrice: string };
export type AdminConcessionItem = ConcessionContent & { id: string; status: ConcessionStatus; imageUrl: string | null; createdAt: string; updatedAt: string };
export const CONCESSION_BASE = "/admin/concession-items";
// Java Character.isWhitespace, preserving nonbreaking spaces as the backend does.
export const stripConcessionText = (v: string) => v.replace(/^[\u0009-\u000d\u001c-\u0020\u1680\u2000-\u2006\u2008-\u200a\u2028\u2029\u205f\u3000]+|[\u0009-\u000d\u001c-\u0020\u1680\u2000-\u2006\u2008-\u200a\u2028\u2029\u205f\u3000]+$/g, "");
export function concessionText(v: string) { return !v.includes("\0") && ![...v].some(c => { const n = c.codePointAt(0)!; return n >= 0xd800 && n <= 0xdfff; }); }
export function concessionPriceInput(v: string): string | undefined {
  const value = v.trim();
  return /^(0|[1-9]\d{0,14})(?:[.,]\d{1,4})?$/.test(value) ? value.replace(",", ".") : undefined;
}
export function concessionPrice(v: string) {
  const [whole, fraction = ""] = v.split(".");
  const tail = fraction.replace(/0+$/, "");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${tail ? `,${tail}` : ""} ₫`;
}
export const concessionPriceExact = (v: string) => { const [whole, fraction = ""] = v.split("."); return `${whole}.${fraction.padEnd(4, "0")}`; };
export function validateConcessionContent(v: ConcessionContent): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!stripConcessionText(v.name) || [...stripConcessionText(v.name)].length > 150 || !concessionText(v.name)) errors.name = "Nhập tên sản phẩm từ 1 đến 150 ký tự.";
  if (!Object.hasOwn(CONCESSION_CATEGORIES, v.category)) errors.category = "Chọn loại sản phẩm.";
  if (!/^(0|[1-9]\d{0,14})(?:\.\d{1,4})?$/.test(v.sellingPrice)) errors.sellingPrice = "Nhập giá không âm, tối đa 15 chữ số trước và 4 chữ số sau dấu phẩy.";
  if (v.description !== null && (!stripConcessionText(v.description) || !concessionText(v.description))) errors.description = "Kiểm tra lại mô tả sản phẩm.";
  return errors;
}
export function filterConcessions(items: AdminConcessionItem[], search: string, category: string) {
  const query = search.trim().toLocaleLowerCase("vi").normalize("NFC");
  return items.filter(item => (!category || item.category === category) && item.name.toLocaleLowerCase("vi").normalize("NFC").includes(query));
}
