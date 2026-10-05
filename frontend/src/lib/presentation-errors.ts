// Unknown server text must never expose SQL/internal details in the UI.
const SAFE_MESSAGES: Record<string, string> = {
  "Email or password is invalid, or the account is unavailable.": "Email hoặc mật khẩu không đúng, hoặc tài khoản không khả dụng.",
  "This Showtime overlaps another screening in the same Hall. Choose another time.": "Suất chiếu trùng lịch với suất khác trong cùng phòng chiếu. Vui lòng chọn giờ khác.",
  "Showtime conflicts with parent eligibility, layout readiness, lifecycle or protected history. Reload and check your changes.": "Suất chiếu không đáp ứng điều kiện phim, rạp, sơ đồ ghế, trạng thái hoặc lịch sử được bảo vệ. Tải lại và kiểm tra thay đổi.",
  "Configuration conflicts with layout capacity, existing identities or referenced history. Reload and check your changes.": "Cấu hình xung đột với sức chứa, thông tin ghế hiện có hoặc lịch sử đã sử dụng. Tải lại và kiểm tra thay đổi.",
  "Invalid Showtime time, price or status.": "Giờ chiếu, giá hoặc trạng thái suất chiếu không hợp lệ.",
  "Invalid configuration data.": "Thông tin cấu hình không hợp lệ.",
  "Showtime or Hall is unavailable.": "Suất chiếu hoặc phòng chiếu không khả dụng.",
  "Configuration resource is unavailable.": "Thông tin cấu hình không khả dụng.",
  "Invalid email or password.": "Email hoặc mật khẩu không đúng.",
  "Invalid email or password": "Email hoặc mật khẩu không đúng.",
  "An account with this email already exists.": "Email này đã có tài khoản. Đăng nhập hoặc dùng email khác.",
  "Email is already registered.": "Email này đã được đăng ký.",
  "must not be blank": "Không được để trống.",
  "Required": "Không được để trống.",
  "Full name is required.": "Họ tên không được để trống.",
  "Full name must not exceed 150 characters.": "Họ tên không được quá 150 ký tự.",
  "Email is required.": "Email không được để trống.",
  "Email must be valid.": "Email không hợp lệ.",
  "Email must not exceed 254 characters.": "Email không được quá 254 ký tự.",
  "Email must contain at most 254 characters.": "Email không được quá 254 ký tự.",
  "Phone is required.": "Số điện thoại không được để trống.",
  "must be a valid Vietnamese phone number": "Số điện thoại Việt Nam không hợp lệ.",
  "Phone must not exceed 30 characters.": "Số điện thoại không được quá 30 ký tự.",
  "Password is required.": "Mật khẩu không được để trống.",
  "Password must contain between 8 and 72 characters.": "Mật khẩu phải có từ 8 đến 72 ký tự.",
  "Password must contain at most 72 characters.": "Mật khẩu không được quá 72 ký tự.",
  "The customer profile is unavailable.": "Hồ sơ khách hàng không khả dụng.",
  "The authenticated account cannot access a Customer profile.": "Tài khoản này không có quyền truy cập hồ sơ khách hàng.",
  "must not be null": "Không được để trống.",
  "must be a well-formed email address": "Email không hợp lệ.",
};

export function presentationError(status: number, detail?: unknown): string {
  if (typeof detail === "string" && Object.hasOwn(SAFE_MESSAGES, detail)) return SAFE_MESSAGES[detail];
  if (status === 401) return "Bạn cần đăng nhập lại để tiếp tục.";
  if (status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (status === 404) return "Không tìm thấy dữ liệu hoặc dữ liệu không còn khả dụng.";
  if (status === 409) return "Dữ liệu đã thay đổi hoặc thao tác bị xung đột. Vui lòng kiểm tra và thử lại.";
  if (status === 400) return "Thông tin không hợp lệ. Vui lòng kiểm tra các trường và thử lại.";
  return "Không thể kết nối hoặc xác nhận phản hồi từ máy chủ. Vui lòng thử lại.";
}

export function presentationFieldErrors(errors: unknown): Record<string, string> {
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return {};
  return Object.fromEntries(Object.entries(errors).map(([field, detail]) => [field,
    typeof detail === "string" && Object.hasOwn(SAFE_MESSAGES, detail) ? SAFE_MESSAGES[detail] : "Thông tin không hợp lệ. Vui lòng kiểm tra lại.",
  ]));
}
