import type { ConcessionItem } from "@/features/concession/concession.types";
import type { SeatUnit } from "@/features/seat/seat.types";

export interface PreviewSeatLine { unit: SeatUnit; amount: number }
export interface PreviewConcessionLine { item: ConcessionItem; quantity: number; amount: number }
export interface BookingSummaryPreview {
  seats: PreviewSeatLine[];
  concessions: PreviewConcessionLine[];
  guestCount: number;
  seatAmount: number;
  concessionAmount: number;
  subtotal: number;
}
// Presentation outcomes for local fixtures, not persisted Promotion statuses.
export type PromotionPreviewResult =
  | { outcome: "APPLIED"; code: string; discount: number; baseAmount: number }
  | { outcome: "INVALID" | "EXPIRED" | "INELIGIBLE"; code: string; message: string };
export interface PromotionPreviewService {
  apply(code: string, baseAmount: number, signal: AbortSignal): Promise<PromotionPreviewResult>;
}
