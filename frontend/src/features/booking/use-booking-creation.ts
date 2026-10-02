"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BookingApiError, createBooking } from "@/features/booking/booking-api";
import { creationSnapshot, readCreation, saveCreation, subscribeCreation, type BookingCreationRecord } from "@/features/booking/booking-creation-storage";
import type { CreateBookingInput } from "@/features/booking/booking.types";

export function useBookingCreation(showtimeId: string, token: string | undefined, seatHref: string) {
  const raw = useSyncExternalStore(subscribeCreation, creationSnapshot, () => null);
  const [localRecord, setLocalRecord] = useState<BookingCreationRecord | null | undefined>();
  const record = localRecord === undefined ? readCreation(raw, showtimeId) : localRecord;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<BookingApiError>();
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const uncertain = !!record && !record.bookingId;
  async function submit(input: CreateBookingInput) {
    if (controller.current || !token) return null;
    const current = new AbortController(); controller.current = current;
    const attempt = { input: { showtimeId: input.showtimeId, holdIds: [...input.holdIds] }, seatHref };
    // Save BEFORE the write: navigation/abort does not prove transaction rollback.
    saveCreation(attempt); setLocalRecord(attempt); setPending(true); setError(undefined);
    try {
      const booking = await createBooking(attempt.input, token, current.signal);
      if (current.signal.aborted) return null;
      const confirmed = { ...attempt, bookingId: booking.id };
      saveCreation(confirmed); setLocalRecord(confirmed);
      return booking;
    } catch (failure) {
      if (!current.signal.aborted) {
        const problem = failure instanceof BookingApiError ? failure : new BookingApiError(0, true);
        setError(problem);
        // A definitive rejection permits fresh Seat/Hold reconciliation. An
        // unknown outcome keeps the SAME input for explicit contract-safe retry.
        if (!problem.outcomeUncertain) { saveCreation(null); setLocalRecord(null); }
      }
      return null;
    } finally {
      if (controller.current === current) { controller.current = null; setPending(false); }
    }
  }
  return { pending, error, record, uncertain, submit };
}
