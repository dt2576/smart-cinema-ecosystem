export type StaffAssignment = { id: string; cinemaId: string; cinemaName: string; effectiveAt: string };
export type StaffAssignments = { serverTime: string; assignments: StaffAssignment[] };
export type StaffTicket = {
  id: string; bookingSeatId: string; seatId: string; ticketCode: string; row: string; number: string;
  seatType: "STANDARD" | "VIP" | "COUPLE"; guestCount: number;
  status: "VALID" | "CHECKED_IN" | "EXPIRED" | "CANCELLED";
  checkedInAt: string | null; canCheckIn: boolean;
};
export type StaffBooking = {
  bookingId: string; bookingCode: string; bookingStatus: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  movieId: string; movieTitle: string; cinemaId: string; cinemaName: string; hallId: string; hallName: string; showtimeId: string;
  startsAt: string; endsAt: string; showtimeStatus: "DRAFT" | "SCHEDULED" | "OPEN_FOR_BOOKING" | "STARTED" | "ENDED" | "CANCELLED";
  serverTime: string; admissionAllowed: boolean;
  admissionReason: null | "NOT_PAID" | "CONTEXT_UNAVAILABLE" | "OUTSIDE_ADMISSION_WINDOW";
  tickets: StaffTicket[]; concessions: { name: string; category: "POPCORN" | "DRINK" | "COMBO"; quantity: number }[];
};
export type StaffCheckIn = { checkedInTicketIds: string[]; booking: StaffBooking };
