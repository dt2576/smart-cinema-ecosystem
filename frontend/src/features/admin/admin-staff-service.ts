import type { InvitationDeliveryStatus, StaffAccount, StaffContent } from "@/features/admin/admin-staff.types";

export function validateStaffContent(value: StaffContent): Partial<Record<keyof StaffContent, string>> {
  const errors: Partial<Record<keyof StaffContent, string>> = {};
  if (!value.fullName.trim() || value.fullName.length > 150) errors.fullName = "Nhập họ và tên, tối đa 150 ký tự.";
  if (value.email.length > 254 || !/^\s*[^\s@]+@[^\s@]+\.[^\s@]+\s*$/.test(value.email)) errors.email = "Nhập địa chỉ email hợp lệ, tối đa 254 ký tự.";
  if (value.phone.length > 30 || !/^(?:0\d{9}|\d{9}|\+84\d{9})$/.test(value.phone.replace(/[\s()-]/g, ""))) errors.phone = "Nhập số điện thoại Việt Nam hợp lệ (ví dụ 0912 345 678 hoặc +84912345678).";
  return errors;
}
export function canReissueStaff(account: StaffAccount) { return account.status === "BLOCKED" && !account.passwordSetupCompleted; }
export function canActivateStaff(account: StaffAccount) { return account.status === "BLOCKED" && account.passwordSetupCompleted; }

// The control explicitly uses Vietnam time, independent of the browser's zone.
// Round-trip the local wall time to reject calendar normalization (e.g. Feb 31).
export function staffEffectiveAtUtc(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(local)) return null;
  const normalized = local.length === 16 ? `${local}:00` : local;
  const ms = Date.parse(`${normalized}+07:00`);
  if (!Number.isFinite(ms) || new Date(ms + 7 * 3600_000).toISOString().slice(0, 19) !== normalized) return null;
  return new Date(ms).toISOString();
}
export function staffDate(instant: string | null) {
  return instant ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(instant)) + " (GMT+7)" : "Không có lời mời hiện hành";
}
export const STAFF_DELIVERY_LABELS: Record<InvitationDeliveryStatus, string> = {
  NONE: "Chưa có thư mời", QUEUED: "Đang chờ gửi", LEASED: "Đang xử lý gửi", SENT: "Máy chủ thư đã chấp nhận",
  FAILED: "Chưa gửi được thư", EXPIRED: "Lời mời hết hạn", REVOKED: "Lời mời đã thu hồi",
};
