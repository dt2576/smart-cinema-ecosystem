export type BookingPreviewStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
export type BookingHistoryScenario = "default" | "empty" | "error";

export interface BookingHistoryPreview {
  id: string;
  code: string;
  status: BookingPreviewStatus;
  createdAt: string;
  movie: { id: string; title: string; posterUrl: string };
  cinema: { id: string; name: string };
  showtime: { id: string; startsAt: string };
  hall: { id: string; name: string };
  seatSubtotal: number;
  concessions: { id: string; name: string; quantity: number; unitPrice: number }[];
  discount: number;
  amount: number;
  qr: { payload: string; imageUrl: string } | null;
}

// Fictional examples, not a customer ownership or payment-verification contract.
export interface BookingHistoryService {
  list(signal: AbortSignal): Promise<BookingHistoryPreview[]>;
  get(id: string, signal: AbortSignal): Promise<BookingHistoryPreview | null>;
  resolveQr(payload: string, signal: AbortSignal): Promise<BookingHistoryPreview | null>;
}
