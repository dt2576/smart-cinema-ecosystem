import { isBookingId } from "@/features/booking/booking-api";

export interface PaymentRecoveryHint { bookingId: string; paymentId?: string; reviewRequired: boolean }
const KEY = "smart-cinema.payment-initiation:";
const RETURN_KEY = "smart-cinema.payment-return";
const memory = new Map<string, PaymentRecoveryHint>();
let returnMemory: PaymentRecoveryHint | null = null;
// Same per-tab navigation-intent mechanism as Booking creation. No money, status,
// credentials or hosted URL. Neither these IDs nor this marker establish ownership.
export function readPaymentHint(bookingId: string): PaymentRecoveryHint | null {
  if (!isBookingId(bookingId)) return null;
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY + bookingId) ?? "null");
    if (v?.bookingId === bookingId && (v.paymentId === undefined || isBookingId(v.paymentId)) && typeof v.reviewRequired === "boolean")
      return { bookingId, ...(v.paymentId ? { paymentId: v.paymentId } : {}), reviewRequired: v.reviewRequired };
  } catch { /* Storage can be unavailable; in-memory intent is still untrusted. */ }
  return memory.get(bookingId) ?? null;
}
export function savePaymentHint(hint: PaymentRecoveryHint | null, bookingId: string) {
  if (!isBookingId(bookingId)) return;
  if (hint) memory.set(bookingId, hint); else memory.delete(bookingId);
  try { if (hint) sessionStorage.setItem(KEY + bookingId, JSON.stringify(hint)); else sessionStorage.removeItem(KEY + bookingId); } catch { /* Frozen Booking still protects reload if storage is blocked. */ }
  if (hint?.paymentId && isBookingId(hint.paymentId)) {
    returnMemory = { bookingId, paymentId: hint.paymentId, reviewRequired: hint.reviewRequired };
    try { sessionStorage.setItem(RETURN_KEY, JSON.stringify(returnMemory)); } catch { /* Navigation hint only. */ }
  }
}

// The fixed backend redirect supplies no resource identity. This per-tab pointer
// selects an owned GET only; callback parameters never select or verify an attempt.
export function readPaymentReturnHint(): PaymentRecoveryHint | null {
  let pointer: PaymentRecoveryHint | null = returnMemory;
  try { pointer = JSON.parse(sessionStorage.getItem(RETURN_KEY) ?? "null"); } catch { /* In-memory fallback is untrusted too. */ }
  if (!pointer || !isBookingId(pointer.bookingId) || !isBookingId(pointer.paymentId)) return null;
  const hint = readPaymentHint(pointer.bookingId);
  return hint?.paymentId === pointer.paymentId ? hint : null;
}
