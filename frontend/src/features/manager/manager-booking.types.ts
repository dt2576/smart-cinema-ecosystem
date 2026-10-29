export const MANAGER_BOOKING_STATUSES = ["PENDING", "PAID", "EXPIRED", "CANCELLED"] as const;
export const MANAGER_PAYMENT_STATUSES = ["INITIATED", "PENDING", "SUCCESS", "FAILED", "CANCELLED"] as const;
export type ManagerBookingStatus = typeof MANAGER_BOOKING_STATUSES[number];
export type ManagerPaymentStatus = typeof MANAGER_PAYMENT_STATUSES[number];
export type ManagerBookingPayment = {
  id: string; status: ManagerPaymentStatus; amount: string; currency: string | null;
  provider: string | null; initiatedAt: string; completedAt: string | null; reconciliationRequired: boolean;
};
export type ManagerBookingItem = {
  id: string; bookingCode: string; status: ManagerBookingStatus; storedStatus: ManagerBookingStatus;
  cinemaId: string; cinemaName: string; hallId: string; hallName: string; movieId: string; movieTitle: string;
  showtimeId: string; startsAt: string; createdAt: string; expiresAt: string; paymentStartedAt: string | null;
  paidAt: string | null; seatUnitCount: number; guestCount: number; issuedTicketCount: number;
  finalAmount: string; latestPayment: ManagerBookingPayment | null;
};
export type ManagerBookingPage = {
  items: ManagerBookingItem[]; page: number; size: number; totalElements: number; totalPages: number; serverTime: string;
};
export type ManagerBookingSeat = {
  id: string; seatId: string; row: string; number: string; type: "STANDARD" | "VIP" | "COUPLE";
  guestCount: number; unitPrice: string; finalPrice: string;
};
export type ManagerBookingConcession = {
  id: string; itemId: string; name: string; category: "POPCORN" | "DRINK" | "COMBO";
  quantity: number; unitPrice: string; totalPrice: string;
};
export type ManagerBookingTicket = {
  id: string; bookingSeatId: string; seatId: string; status: "VALID" | "CHECKED_IN" | "EXPIRED" | "CANCELLED";
  issuedAt: string; checkedInAt: string | null;
};
export type ManagerBookingDetail = {
  booking: ManagerBookingItem;
  amounts: { seatAmount: string; concessionAmount: string; subtotal: string; discount: string; finalAmount: string };
  seats: ManagerBookingSeat[]; concessions: ManagerBookingConcession[];
  payments: ManagerBookingPayment[]; tickets: ManagerBookingTicket[]; serverTime: string;
};
