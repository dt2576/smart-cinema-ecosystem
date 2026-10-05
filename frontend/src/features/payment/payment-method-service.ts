import type { BookingSummaryPreview } from "@/features/booking/booking-summary.types";
import type { PaymentMethodPreview, PaymentMethodScenario, PaymentMethodService, ReviewedSummaryPreview } from "@/features/payment/payment-method.types";

// These UI fixtures do not establish a configured production provider or external integration.
const SAMPLE_METHODS: PaymentMethodPreview[] = [
  { id: "preview-vnpay", name: "VNPay", label: "VNP", description: "Cổng thanh toán mẫu. Không chuyển trang hay gửi yêu cầu thanh toán.", available: true },
  { id: "preview-momo", name: "MoMo", label: "MoMo", description: "Nhà cung cấp mẫu. Không kết nối tài khoản hay truy cập ví.", available: true },
  { id: "preview-other", name: "Nhà cung cấp khác đã cấu hình", label: "Khác", description: "Không khả dụng trong ví dụ này. Phương thức thật cần cấu hình nhà cung cấp trên máy chủ.", available: false },
];

export function parsePaymentMethodScenario(value: string | null): PaymentMethodScenario {
  return value === "empty" || value === "error" || value === "unavailable" ? value : "default";
}

export function createMockPaymentMethodService(scenario: PaymentMethodScenario = "default", delayMs = 350): PaymentMethodService {
  let failed = false;
  return { async list(signal) {
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
      const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
      const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, delayMs);
      signal.addEventListener("abort", abort, { once: true });
    });
    if (scenario === "error" && !failed) { failed = true; throw new Error("Không thể tải phương thức thanh toán mẫu. Vui lòng thử lại."); }
    return scenario === "empty" ? [] : SAMPLE_METHODS.map(method => ({ ...method, available: method.available && scenario !== "unavailable" }));
  } };
}

export function availablePaymentMethod(methods: PaymentMethodPreview[], id: string | null): PaymentMethodPreview | null {
  const matches = methods.filter(method => method.id === id);
  return matches.length === 1 && matches[0].available ? matches[0] : null;
}

export function isReviewedSummaryCurrent(review: ReviewedSummaryPreview, current: BookingSummaryPreview): boolean {
  // Both quotes originate from the same deterministic local summary builder.
  // Comparing the complete view also rejects changed units, quantities, names and sample prices.
  if (JSON.stringify(review.quote) !== JSON.stringify(current)) return false;
  const discount = review.promotion?.discount ?? 0;
  if (!Number.isSafeInteger(current.subtotal) || current.subtotal < 0 || !Number.isSafeInteger(discount) || discount < 0 || discount > current.subtotal) return false;
  if (review.promotion && (review.promotion.outcome !== "APPLIED" || !review.promotion.code || review.promotion.baseAmount !== current.subtotal)) return false;
  return Number.isSafeInteger(review.total) && review.total === current.subtotal - discount;
}
