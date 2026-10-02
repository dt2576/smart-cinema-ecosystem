export interface CreateBookingInput { showtimeId: string; holdIds: string[] }
export interface BookingSeatLine {
  id: string; seatId: string; holdId: string; row: string; number: string;
  type: "STANDARD" | "VIP" | "COUPLE"; guestCount: number;
  unitPrice: string; finalPrice: string;
}
export interface BookingConcessionLine {
  id: string; itemId: string; name: string; category: "POPCORN" | "DRINK" | "COMBO";
  quantity: number; unitPrice: string; totalPrice: string;
}
export interface BookingPromotionSnapshot {
  id: string; code: string; type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: string; minimumOrderAmount: string; maxDiscountAmount: string | null;
}
// Current labels are referenced display metadata; Seat type/prices and totals
// are stored snapshots. This response contains no currency, Tickets or QR.
export interface Booking {
  id: string; bookingCode: string; status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  showtimeId: string; movieId: string; movieTitle: string; cinemaId: string;
  cinemaName: string; hallId: string; hallName: string;
  startsAt: string; createdAt: string; expiresAt: string; serverTime: string;
  seatUnitCount: number; guestCount: number;
  seatAmount: string; concessionAmount: string; subtotal: string; discount: string; finalAmount: string;
  seats: BookingSeatLine[]; concessions: BookingConcessionLine[];
  promotion: BookingPromotionSnapshot | null; paymentStartedAt: string | null;
}
