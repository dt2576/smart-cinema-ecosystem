import type { PaymentResultPresentation, PaymentResultPreview } from "@/features/payment/payment-result.types";

// Only completed local simulator outcomes may enter Result. URL/provider values are not inputs.
export function createPaymentResultPreview(outcome: unknown, scenario: unknown): PaymentResultPreview | null {
  if (outcome !== "success" && outcome !== "failed" && outcome !== "pending") return null;
  if (scenario !== "success" && scenario !== "failed" && scenario !== "pending" && scenario !== "error") return null;
  if (outcome !== (scenario === "error" ? "success" : scenario)) return null;
  return { outcome, scenario };
}

export function getPaymentResultPresentation(result: PaymentResultPreview): PaymentResultPresentation | null {
  if (!createPaymentResultPreview(result.outcome, result.scenario)) return null;
  switch (result.outcome) {
    case "success": return {
      title: "Thanh toán thành công — mẫu", tone: "success", resumeLabel: "Về xử lý mẫu",
      message: "Chỉ minh họa giao diện xác nhận. Thành công này chưa được máy chủ xác minh. Chưa thanh toán đơn đặt vé hay phát hành vé.",
    };
    case "failed": return {
      title: "Thanh toán thất bại — mẫu", tone: "error", resumeLabel: "Thử lại xử lý mẫu",
      message: "Mô phỏng trả về thất bại. Chưa thu tiền. Bạn có thể thử lại hoặc chọn phương thức mẫu khác khi bản xem trước gốc còn hiệu lực.",
    };
    case "pending": return {
      title: "Thanh toán chờ xử lý — mẫu", tone: "pending", resumeLabel: "Về xác minh mẫu",
      message: "Chưa có kết quả xác minh trong ví dụ này. Chờ xử lý không có nghĩa là thành công hay thất bại. Quay về xử lý để kiểm tra cùng bản xem trước; không truy vấn nhà cung cấp thật.",
    };
  }
}
