"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookingApiError, getBooking } from "@/features/booking/booking-api";
import type { Booking } from "@/features/booking/booking.types";
import { holdClock, projectedServerNow } from "@/features/seat/seat-hold-service";
import type { SeatHoldClock } from "@/features/seat/seat-hold.types";

export function useBookingDetail(id: string, token: string) {
  const [data, setData] = useState<{ booking: Booking; clock: SeatHoldClock }>();
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<BookingApiError>();
  const [tick, setTick] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const expiryRead = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    if (controller.current) return;
    const current = new AbortController(); controller.current = current;
    const started = performance.now(); setLoading(true); setConfirmed(false); setError(undefined);
    try {
      const booking = await getBooking(id, token, current.signal);
      if (!current.signal.aborted) {
        const received = performance.now();
        setData({ booking, clock: holdClock(booking.serverTime, started, received) });
        setTick(received); setConfirmed(true);
      }
    } catch (failure) {
      if (!current.signal.aborted) {
        const problem = failure instanceof BookingApiError ? failure : new BookingApiError(503);
        setError(problem);
        if ([401, 403, 404].includes(problem.status)) setData(undefined);
      }
    } finally {
      if (controller.current === current) { controller.current = null; setLoading(false); }
    }
  }, [id, token]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const activeRefresh = () => { if (document.visibilityState === "visible") void refresh(); };
    const poll = setInterval(activeRefresh, 30_000);
    const timer = setInterval(() => setTick(performance.now()), 1000);
    window.addEventListener("focus", activeRefresh); window.addEventListener("pageshow", activeRefresh);
    document.addEventListener("visibilitychange", activeRefresh);
    return () => { clearTimeout(initial); clearInterval(poll); clearInterval(timer); window.removeEventListener("focus", activeRefresh); window.removeEventListener("pageshow", activeRefresh); document.removeEventListener("visibilitychange", activeRefresh); controller.current?.abort(); controller.current = null; };
  }, [refresh]);
  const now = data ? projectedServerNow(data.clock, tick) : Infinity;
  useEffect(() => {
    if (data?.booking.status === "PENDING" && now >= Date.parse(data.booking.expiresAt) && !loading && expiryRead.current !== data.booking.expiresAt) {
      expiryRead.current = data.booking.expiresAt; void refresh();
    }
  }, [data, now, loading, refresh]);
  return { booking: data?.booking, now, loading, confirmed, error, refresh };
}
