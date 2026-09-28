export type TicketPreviewStatus = "VALID" | "CHECKED_IN" | "EXPIRED" | "CANCELLED";
export interface TicketPreview {
  id: string;
  bookingId: string;
  status: TicketPreviewStatus;
  seatUnit: { id: string; label: string } & ({ type: "STANDARD"; guests: 1 } | { type: "COUPLE"; guests: 2 });
}
export interface TicketPreviewService {
  listForBooking(bookingId: string, signal: AbortSignal): Promise<TicketPreview[]>;
}
