import type { BookingSummaryPreview, PromotionPreviewResult } from "@/features/booking/booking-summary.types";

// A local reviewed view, never a Payment Transaction or frozen Booking snapshot.
export interface ReviewedSummaryPreview {
  quote: BookingSummaryPreview;
  promotion: Extract<PromotionPreviewResult, { outcome: "APPLIED" }> | null;
  total: number;
}
export interface PaymentMethodPreview {
  id: string;
  name: string;
  label: string;
  description: string;
  available: boolean;
}
export type PaymentMethodScenario = "default" | "empty" | "error" | "unavailable";
export interface PaymentMethodService {
  list(signal: AbortSignal): Promise<PaymentMethodPreview[]>;
}
