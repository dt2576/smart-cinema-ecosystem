export const BOOKING_LABELS = { PENDING: "Chờ thanh toán", PAID: "Đã thanh toán", EXPIRED: "Đã hết hạn", CANCELLED: "Đã hủy" } as const;
export const PAYMENT_LABELS = { INITIATED: "Đã khởi tạo", PENDING: "Đang xử lý", SUCCESS: "Thành công", FAILED: "Không thành công", CANCELLED: "Đã hủy" } as const;

// String formatting only: no Number conversion, repricing or rounding.
export function managerBookingMoney(value: string) {
  const [whole, decimal] = value.split(".");
  const fraction = decimal?.replace(/0+$/, "");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${fraction ? `,${fraction}` : ""} đ`;
}
export function managerBookingDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}
function day(value: string) {
  if (!/^[0-9]{4}-\d{2}-\d{2}$/.test(value) || value < "0001-01-01" || value > "9999-12-30") return null;
  const d = new Date(value + "T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value ? d : null;
}
export function managerBookingDays(from: string, through: string) {
  const first = from ? day(from) : null, last = through ? day(through) : null;
  if (from && !first || through && !last || first && last && first > last) return null;
  const result: { createdFrom?: string; createdTo?: string } = {};
  if (first) result.createdFrom = new Date(`${from}T00:00:00+07:00`).toISOString();
  if (last) { last.setUTCDate(last.getUTCDate() + 1); result.createdTo = new Date(`${last.toISOString().slice(0, 10)}T00:00:00+07:00`).toISOString(); }
  return result;
}
export function managerBookingPreset(preset: string, now = new Date()) {
  if (preset === "all" || preset === "custom") return {};
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const start = new Date(today + "T00:00:00Z"), end = new Date(start);
  if (preset === "yesterday") { start.setUTCDate(start.getUTCDate() - 1); end.setUTCDate(end.getUTCDate() - 1); }
  else if (preset === "week") start.setUTCDate(start.getUTCDate() - 6);
  return managerBookingDays(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10))!;
}
