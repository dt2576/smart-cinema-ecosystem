export type PaymentAttemptStatus = "INITIATED" | "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";

// Only the initiation/recovery projection is consumed. Ticket/QR data is deliberately excluded.
export interface OwnedPaymentAttempt {
  paymentId: string; bookingId: string; status: PaymentAttemptStatus; amount: string;
  bookingStatus: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED"; reconciliationRequired: boolean;
}
export interface PaymentInitiationReceipt {
  id: string; bookingId: string; internalReference: string; status: "INITIATED" | "PENDING";
  amount: string; currency: null | "VND"; provider: null | "VNPAY"; initiatedAt: string; expiresAt: string;
}
export interface SandboxPaymentSubmission {
  paymentId: string; bookingId: string; status: "PENDING"; provider: "VNPAY";
  environment: "SANDBOX"; currency: "VND"; amount: string; expiresAt: string; redirectUrl: string;
}
