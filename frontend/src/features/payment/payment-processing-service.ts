import type { PaymentProcessingScenario, PaymentProcessingService, PaymentPreviewOutcome } from "@/features/payment/payment-processing.types";

function waitForPreview(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
    const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, delayMs);
    signal.addEventListener("abort", abort, { once: true });
  });
}

// No network, references, signatures or business side effects. Pending remains unresolved.
export function createMockPaymentProcessingService(scenario: PaymentProcessingScenario, delayMs = 900): PaymentProcessingService {
  let active: Promise<PaymentPreviewOutcome> | null = null;
  let failedOnce = false;
  return { run(signal, onPhase) {
    // All concurrent callers share the same local work, not another processing action.
    if (active) return active;
    active = (async () => {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      onPhase("processing");
      await waitForPreview(delayMs, signal);
      onPhase("verifying");
      await waitForPreview(delayMs, signal);
      if (scenario === "error" && !failedOnce) { failedOnce = true; throw new Error("Mô phỏng đã bị gián đoạn. Thử lại bản xem trước; chưa thực hiện thanh toán."); }
      return scenario === "error" ? "success" : scenario;
    })().finally(() => { active = null; });
    return active;
  } };
}
