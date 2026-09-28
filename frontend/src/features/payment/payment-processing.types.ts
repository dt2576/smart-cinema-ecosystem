// UI simulation states only; never persisted Payment lifecycle statuses.
export type PaymentProcessingScenario = "success" | "failed" | "pending" | "error";
export type PaymentProcessingPhase = "processing" | "verifying";
export type PaymentPreviewOutcome = "success" | "failed" | "pending";
export interface PaymentProcessingService {
  run(signal: AbortSignal, onPhase: (phase: PaymentProcessingPhase) => void): Promise<PaymentPreviewOutcome>;
}
