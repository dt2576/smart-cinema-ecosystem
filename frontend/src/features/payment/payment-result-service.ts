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
      title: "Payment success preview", tone: "success", resumeLabel: "Back to Processing preview",
      message: "Confirmation-style demonstration only. This success is not server-verified. No Booking has been paid and no Tickets have been issued.",
    };
    case "failed": return {
      title: "Payment failed preview", tone: "error", resumeLabel: "Retry processing preview",
      message: "The local simulation returned a failed outcome. No money was charged. You can retry the preview or choose another sample method while the original preview remains valid.",
    };
    case "pending": return {
      title: "Payment pending preview", tone: "pending", resumeLabel: "Return to verification preview",
      message: "Verification is unresolved in this demonstration. Pending is neither success nor failure. Return to Processing to check the same local preview; no real provider is being queried.",
    };
  }
}
