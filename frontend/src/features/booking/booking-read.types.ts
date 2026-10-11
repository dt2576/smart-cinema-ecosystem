import type { Booking } from "@/features/booking/booking.types";

export type BookingHistoryItem = Pick<Booking, "id" | "bookingCode" | "status" | "movieId" | "movieTitle" | "cinemaId" | "cinemaName" | "hallId" | "hallName" | "showtimeId" | "startsAt" | "createdAt" | "expiresAt" | "paymentStartedAt" | "seatUnitCount" | "guestCount" | "finalAmount">;
export interface BookingHistoryResponse {
  items: BookingHistoryItem[];
  page: number; size: number; totalElements: number; totalPages: number; serverTime: string;
}
export interface CustomerTicket {
  id: string; bookingSeatId: string; seatId: string; ticketCode: string;
  status: "VALID" | "CHECKED_IN" | "EXPIRED" | "CANCELLED";
  seatType: "STANDARD" | "VIP" | "COUPLE"; guestCount: number;
}
export interface BookingTicketsResponse {
  bookingId: string; bookingStatus: Booking["status"]; serverTime: string;
  bookingQr: string | null; tickets: CustomerTicket[];
}
export interface OwnedBookingEntitlements { booking: Booking; entitlements: BookingTicketsResponse }
