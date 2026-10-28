import { isBookingId } from "@/features/booking/booking-api";

// Same-origin, exact route allowlist. Stored hints never authorize server reads.
export function managerLoginReturn(value: string | null): string | null {
  if (!value) return null;
  if (["/manager", "/manager/cinemas", "/manager/seats", "/manager/showtimes", "/manager/showtimes/new", "/manager/staff"].includes(value)) return value;
  const match = value.match(/^\/manager\/(?:cinemas\/([1-9][0-9]{0,18})(?:\/staff)?|halls\/([1-9][0-9]{0,18})\/seats|showtimes\/([1-9][0-9]{0,18})\/edit)$/);
  return match && isBookingId(match[1] ?? match[2] ?? match[3]) ? value : null;
}
