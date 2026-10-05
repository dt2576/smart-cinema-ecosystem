import assert from "node:assert/strict";
import test from "node:test";
const { DISPLAY_LABELS, displayLabel } = await import("./display-labels" + ".ts") as typeof import("./display-labels");
const { presentationError, presentationFieldErrors } = await import("./presentation-errors" + ".ts") as typeof import("./presentation-errors");
const { formatCalendarDate, formatLocalDateTime, formatUtcInstant } = await import("./display-format" + ".ts") as typeof import("./display-format");

test("Vietnamese labels preserve serialized domain keys and whole Couple meaning", () => {
  assert.equal(displayLabel("OPEN_FOR_BOOKING"), "Đang mở bán");
  assert.equal(displayLabel("COUPLE"), "Ghế đôi");
  assert.equal(displayLabel("STANDARD"), "Thường");
  assert.equal(displayLabel("HELD"), "Đang được giữ");
  assert.equal(displayLabel("PAID"), "Đã thanh toán");
  assert.equal(displayLabel("TEMPORARILY_CLOSED"), "Tạm đóng");
  assert.equal(displayLabel("CHECKED_IN"), "Đã soát vé");
  assert.equal(displayLabel("unexpected"), "Chưa xác định");
  assert.equal(displayLabel("__proto__"), "Chưa xác định");
  assert.ok(Object.keys(DISPLAY_LABELS).every(key => /^[A-Z_]+$/.test(key)));
});

test("server errors localize safe semantics and never echo unknown internals", () => {
  assert.equal(presentationError(401), "Bạn cần đăng nhập lại để tiếp tục.");
  assert.equal(presentationError(403), "Bạn không có quyền thực hiện thao tác này.");
  assert.equal(presentationError(401, "Invalid email or password."), "Email hoặc mật khẩu không đúng.");
  assert.equal(presentationError(503, "SQL password secret"), "Không thể kết nối hoặc xác nhận phản hồi từ máy chủ. Vui lòng thử lại.");
  assert.equal(presentationError(503, "toString"), "Không thể kết nối hoặc xác nhận phản hồi từ máy chủ. Vui lòng thử lại.");
  assert.deepEqual(presentationFieldErrors({email: "must be a well-formed email address", title: "SQL constraint"}), {
    email: "Email không hợp lệ.", title: "Thông tin không hợp lệ. Vui lòng kiểm tra lại.",
  });
});

test("calendar date presentation keeps the API date independent of browser timezone", () => {
  assert.equal(formatCalendarDate("2026-10-02"), "02/10/2026");
  assert.equal(formatCalendarDate("0001-01-01"), "01/01/0001");
  assert.equal(formatCalendarDate("2026-10-02T00:00:00Z"), "2026-10-02T00:00:00Z");
  assert.equal(formatLocalDateTime("2030-01-02T00:30"), "02/01/2030 00:30");
  assert.equal(formatUtcInstant("2026-10-02T19:00:00Z"), "19:00:00 02/10/2026 UTC");
});
