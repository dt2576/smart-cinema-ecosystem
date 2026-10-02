import type { CreateBookingInput } from "@/features/booking/booking.types";

export interface BookingCreationRecord { input: CreateBookingInput; bookingId?: string; seatHref?: string }
const KEY = "smart-cinema.booking-creation";
const EVENT = "smart-cinema.booking-creation-changed";
// Untrusted navigation/recovery intent only. No auth token, ownership or amount.
// Saved Hold IDs must always be revalidated by the exact-set backend operation.
export function creationSnapshot(): string | null {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
}
export function subscribeCreation(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
export function readCreation(raw: string | null, showtimeId: string): BookingCreationRecord | null {
  try {
    const value = JSON.parse(raw ?? "null");
    const id = (v: unknown) => typeof v === "string" && /^[1-9][0-9]{0,18}$/.test(v) && (v.length < 19 || v <= "9223372036854775807");
    return value?.input?.showtimeId === showtimeId && id(showtimeId) && Array.isArray(value.input.holdIds)
      && value.input.holdIds.length && value.input.holdIds.every(id)
      && new Set(value.input.holdIds).size === value.input.holdIds.length
      && (value.bookingId === undefined || id(value.bookingId)) ? value : null;
  } catch { return null; }
}
export function saveCreation(value: BookingCreationRecord | null) {
  try {
    if (value) sessionStorage.setItem(KEY, JSON.stringify(value)); else sessionStorage.removeItem(KEY);
  } catch { /* In-memory recovery still works; server remains authoritative. */ }
  window.dispatchEvent(new Event(EVENT));
}
