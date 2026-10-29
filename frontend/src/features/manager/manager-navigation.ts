import { isBookingId } from "@/features/booking/booking-api";

// Same-origin, exact route allowlist. Stored hints never authorize server reads.
export function managerLoginReturn(value: string | null): string | null {
  if (!value) return null;
  if (["/manager", "/manager/cinemas", "/manager/seats", "/manager/showtimes", "/manager/showtimes/new", "/manager/staff", "/manager/bookings"].includes(value)) return value;
  const booking = value.match(/^\/manager\/bookings\/([1-9][0-9]{0,18})$/);
  if (booking) return isBookingId(booking[1]) ? value : null;
  const match = value.match(/^\/manager\/(?:cinemas\/([1-9][0-9]{0,18})(?:\/staff(?:\/([1-9][0-9]{0,18}))?)?|halls\/([1-9][0-9]{0,18})\/seats|showtimes\/([1-9][0-9]{0,18})\/edit)$/);
  return match && match.slice(1).filter(Boolean).every(isBookingId) ? value : null;
}
