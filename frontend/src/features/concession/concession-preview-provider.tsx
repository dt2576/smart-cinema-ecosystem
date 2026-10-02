"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { MovieDetail } from "@/features/movie/movie.types";
import type { CinemaOption } from "@/features/cinema/cinema.types";
import type { ShowtimeOption } from "@/features/showtime/showtime.types";
import type { SeatMap, SeatPreviewSelection } from "@/features/seat/seat.types";
import type { BookingHoldHandoff } from "@/features/seat/seat-hold.types";
import type { ConcessionItem, ConcessionQuantities } from "@/features/concession/concession.types";
import type { PaymentMethodPreview, ReviewedSummaryPreview } from "@/features/payment/payment-method.types";
import type { PaymentResultPreview } from "@/features/payment/payment-result.types";

export const CONCESSION_PREVIEW_PATH = "/bookings/preview/concessions";
export const BOOKING_SUMMARY_PREVIEW_PATH = "/bookings/preview/summary";
export const PAYMENT_METHOD_PREVIEW_PATH = "/bookings/preview/payment";
export const PAYMENT_PROCESSING_PREVIEW_PATH = "/bookings/preview/payment/processing";
export const PAYMENT_RESULT_PREVIEW_PATH = "/bookings/preview/payment/result";
export interface SelectedConcessionPreview {
  catalog: ConcessionItem[];
  quantities: ConcessionQuantities;
  returnHref: string;
}
export interface ConcessionSeatContext {
  movie: MovieDetail;
  cinema: CinemaOption;
  showtime: ShowtimeOption;
  map: SeatMap;
  selection: SeatPreviewSelection;
  seatHref: string;
  holdHandoff?: BookingHoldHandoff;
  concessions?: SelectedConcessionPreview;
  reviewedSummary?: ReviewedSummaryPreview;
  selectedPaymentMethod?: PaymentMethodPreview;
  paymentResult?: PaymentResultPreview;
}
const PreviewContext = createContext<{
  preview: ConcessionSeatContext | null;
  start: (value: ConcessionSeatContext) => void;
  selectConcessions: (value: SelectedConcessionPreview) => void;
  reviewSummary: (value: ReviewedSummaryPreview | null) => void;
  selectPaymentMethod: (value: PaymentMethodPreview) => void;
  recordPaymentResult: (value: PaymentResultPreview | null) => void;
} | null>(null);

// Memory only. `preview` is a static route segment, never a Booking identifier.
export function ConcessionPreviewProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<{ pathname: string; preview: ConcessionSeatContext | null }>({ pathname, preview: null });
  const withinPreview = [CONCESSION_PREVIEW_PATH, BOOKING_SUMMARY_PREVIEW_PATH, PAYMENT_METHOD_PREVIEW_PATH, PAYMENT_PROCESSING_PREVIEW_PATH, PAYMENT_RESULT_PREVIEW_PATH].includes(pathname);
  if (state.pathname !== pathname) {
    let preview = withinPreview ? state.preview : null;
    if (preview && pathname !== PAYMENT_PROCESSING_PREVIEW_PATH && pathname !== PAYMENT_RESULT_PREVIEW_PATH) preview = { ...preview, selectedPaymentMethod: undefined, paymentResult: undefined };
    if (preview && pathname === CONCESSION_PREVIEW_PATH) preview = { ...preview, reviewedSummary: undefined };
    setState({ pathname, preview });
  }
  return <PreviewContext.Provider value={{
    preview: state.preview,
    start: preview => setState({ pathname, preview }),
    selectConcessions: concessions => setState(value => ({ ...value, preview: value.preview ? { ...value.preview, concessions, reviewedSummary: undefined, selectedPaymentMethod: undefined, paymentResult: undefined } : null })),
    reviewSummary: reviewedSummary => setState(value => ({ ...value, preview: value.preview ? { ...value.preview, reviewedSummary: reviewedSummary ?? undefined, selectedPaymentMethod: undefined, paymentResult: undefined } : null })),
    selectPaymentMethod: selectedPaymentMethod => setState(value => ({ ...value, preview: value.preview?.reviewedSummary ? { ...value.preview, selectedPaymentMethod, paymentResult: undefined } : value.preview })),
    recordPaymentResult: paymentResult => setState(value => ({ ...value, preview: value.preview?.selectedPaymentMethod ? { ...value.preview, paymentResult: paymentResult ?? undefined } : value.preview })),
  }}>{children}</PreviewContext.Provider>;
}

export function useConcessionPreview() {
  const context = useContext(PreviewContext);
  if (!context) throw new Error("Concession preview provider is missing.");
  return context;
}
