import type { PaymentProcessingScenario, PaymentPreviewOutcome } from "@/features/payment/payment-processing.types";

// A local presentation handoff, not a Payment Transaction or provider response.
export interface PaymentResultPreview {
  outcome: PaymentPreviewOutcome;
  scenario: PaymentProcessingScenario;
}
export interface PaymentResultPresentation {
  title: string;
  message: string;
  tone: "success" | "error" | "pending";
  resumeLabel: string;
}
