// Display numeric(19,4) exactly, including fractional/zero amounts. The Booking
// DTO has no currency; this is not VNPAY conversion or client pricing.
export function formatBookingAmount(value: string): string {
  const [whole, fraction] = value.split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction}`;
}
export function bookingSummaryHref(id: string) { return `/bookings/${id}/summary`; }
