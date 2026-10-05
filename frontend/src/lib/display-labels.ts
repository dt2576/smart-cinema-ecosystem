// Presentation only: keys remain the existing API/persisted values.
export const DISPLAY_LABELS = {
  DRAFT: "Bản nháp", PUBLISHED: "Đã công bố", UNPUBLISHED: "Ngừng công bố",
  SCHEDULED: "Đã lên lịch", OPEN_FOR_BOOKING: "Đang mở bán",
  STARTED: "Đang chiếu", ENDED: "Đã kết thúc", CANCELLED: "Đã hủy",
  ACTIVE: "Hoạt động", INACTIVE: "Ngừng hoạt động", MAINTENANCE: "Bảo trì",
  TEMPORARILY_CLOSED: "Tạm đóng", BLOCKED: "Bị khóa",
  STANDARD: "Thường", VIP: "VIP", COUPLE: "Ghế đôi",
  AVAILABLE: "Còn trống", HELD: "Đang được giữ", BOOKED: "Đã đặt", UNAVAILABLE: "Không khả dụng",
  PENDING: "Chờ thanh toán", PAID: "Đã thanh toán", EXPIRED: "Đã hết hạn",
  VALID: "Còn hiệu lực", CHECKED_IN: "Đã soát vé",
  CUSTOMER: "Khách hàng", STAFF: "Nhân viên", MANAGER: "Quản lý", ADMIN: "Quản trị viên",
} as const;

export function displayLabel(value: string): string {
  return Object.hasOwn(DISPLAY_LABELS, value) ? DISPLAY_LABELS[value as keyof typeof DISPLAY_LABELS] : "Chưa xác định";
}
