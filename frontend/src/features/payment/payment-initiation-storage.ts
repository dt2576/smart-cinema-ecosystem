import { isBookingId } from "@/features/booking/booking-api";

export interface PaymentRecoveryHint { bookingId: string; paymentId?: string; reviewRequired: boolean }
const KEY = "smart-cinema.payment-initiation:";
const memory = new Map<string, PaymentRecoveryHint>();
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
}
