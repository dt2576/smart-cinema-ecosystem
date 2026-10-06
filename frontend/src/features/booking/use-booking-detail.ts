"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookingApiError, getBooking } from "@/features/booking/booking-api";
import type { Booking } from "@/features/booking/booking.types";
import { editBookingPromotion, PromotionApiError, type PromotionCommand } from "@/features/promotion/promotion-api";
import { promotionEditability } from "@/features/promotion/promotion-service";
import { holdClock, projectedServerNow } from "@/features/seat/seat-hold-service";
import type { SeatHoldClock } from "@/features/seat/seat-hold.types";

export function useBookingDetail(id: string, token: string) {
  const [data, setData] = useState<{ booking: Booking; clock: SeatHoldClock }>();
  const dataRef = useRef<typeof data>(undefined);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const confirmedRef = useRef(false);
  const [error, setError] = useState<BookingApiError | PromotionApiError>();
  const [reviewRequired, setReviewRequired] = useState(false);
  const reviewRef = useRef(false);
  const [notice, setNotice] = useState("");
  const [tick, setTick] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const expiryRead = useRef<string | null>(null);
  const accept = useCallback((booking: Booking, started: number) => {
    const received = performance.now(), next = { booking, clock: holdClock(booking.serverTime, started, received) };
    dataRef.current = next; setData(next); setTick(received); confirmedRef.current = true; setConfirmed(true);
  }, []);
  const read = useCallback(async (current: AbortController) => {
    const started = performance.now(); confirmedRef.current = false; setConfirmed(false);
    try {
      const booking = await getBooking(id, token, current.signal);
      if (!current.signal.aborted) {
        accept(booking, started); return booking;
      }
    } catch (failure) {
      if (!current.signal.aborted) {
        const problem = failure instanceof BookingApiError ? failure : new BookingApiError(503);
        setError(problem);
        if ([401, 403, 404].includes(problem.status)) { dataRef.current = undefined; setData(undefined); }
      }
    }
  }, [id, token, accept]);
  const refresh = useCallback(async () => {
    if (controller.current) return;
    const current = new AbortController(); controller.current = current; setLoading(true); setError(undefined); setNotice("");
    try { await read(current); }
    finally { if (controller.current === current) { controller.current = null; setLoading(false); } }
  }, [read]);
  const mutatePromotion = useCallback(async (command: PromotionCommand) => {
    if (controller.current || !confirmedRef.current || reviewRef.current || !dataRef.current) return;
    if (promotionEditability(dataRef.current.booking, projectedServerNow(dataRef.current.clock, performance.now()))) return;
    const current = new AbortController(); controller.current = current; setLoading(true); setError(undefined); setNotice("");
    try {
      // One gate for all reads/writes: no late Summary GET can overwrite a receipt.
      const before = await read(current);
      if (!before || current.signal.aborted || promotionEditability(before, projectedServerNow(dataRef.current!.clock, performance.now()))) return;
      confirmedRef.current = false; setConfirmed(false);
      const started = performance.now(), booking = await editBookingPromotion(before, command, token, current.signal);
      if (current.signal.aborted) return;
      accept(booking, started); setNotice(command.operation === "APPLY" ? "Đã lưu khuyến mãi vào đơn đặt vé." : "Đã xóa khuyến mãi khỏi đơn đặt vé.");
    } catch (failure) {
      if (current.signal.aborted) return;
      const problem = failure instanceof PromotionApiError ? failure : new PromotionApiError(503, true);
      setError(problem);
      if (problem.outcomeUncertain) { reviewRef.current = true; setReviewRequired(true); }
    } finally {
      // Even PUT/DELETE can recalculate changing terms. Never automatically replay.
      if (!current.signal.aborted) await read(current);
      if (controller.current === current) { controller.current = null; setLoading(false); }
    }
  }, [read, token, accept]);
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
  function acknowledgeReview() {
    if (controller.current || !confirmedRef.current) return;
    reviewRef.current = false; setReviewRequired(false); setError(undefined); setNotice("Đã xác nhận dữ liệu máy chủ. Thao tác tiếp theo chỉ được gửi khi bạn chọn.");
  }
  return { booking: data?.booking, now, loading, confirmed, error, refresh, reviewRequired, notice, mutatePromotion, acknowledgeReview };
}
