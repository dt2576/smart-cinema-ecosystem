"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookingApiError, getBooking } from "@/features/booking/booking-api";
import type { Booking } from "@/features/booking/booking.types";
import { ConcessionApiError, editBookingConcession, getConcessionCatalog, type ConcessionCatalogItem, type ConcessionCommand } from "@/features/concession/concession-api";
import { concessionEditability } from "@/features/concession/concession-composition-service";
import { holdClock, projectedServerNow } from "@/features/seat/seat-hold-service";
import type { SeatHoldClock } from "@/features/seat/seat-hold.types";

export function useConcessionComposition(id: string, token: string) {
  const [data, setData] = useState<{ booking: Booking; clock: SeatHoldClock }>();
  const dataRef = useRef<typeof data>(undefined);
  const [catalog, setCatalog] = useState<ConcessionCatalogItem[]>();
  const [catalogError, setCatalogError] = useState<ConcessionApiError>();
  const [error, setError] = useState<BookingApiError | ConcessionApiError>();
  const [busy, setBusy] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const confirmedRef = useRef(false);
  const [reviewRequired, setReviewRequired] = useState(false);
  const reviewRef = useRef(false);
  const [notice, setNotice] = useState("");
  const [tick, setTick] = useState(0);
  const current = useRef<AbortController | null>(null);
  const expiryRead = useRef<string | undefined>(undefined);
  const accept = useCallback((booking: Booking, started: number) => {
    const received = performance.now(), next = { booking, clock: holdClock(booking.serverTime, started, received) };
    dataRef.current = next; setData(next); setTick(received); confirmedRef.current = true; setConfirmed(true);
  }, []);
  const read = useCallback(async (controller: AbortController) => {
    confirmedRef.current = false; setConfirmed(false);
    const started = performance.now();
    try {
      const booking = await getBooking(id, token, controller.signal);
      if (controller.signal.aborted) return;
      accept(booking, started); return booking;
    } catch (failure) {
      if (controller.signal.aborted) return;
      const problem = failure instanceof BookingApiError ? failure : new BookingApiError(503);
      setError(problem);
      if ([401, 403, 404].includes(problem.status)) { dataRef.current = undefined; setData(undefined); }
    }
  }, [id, token, accept]);
  const readCatalog = useCallback(async (controller: AbortController) => {
    setCatalogError(undefined);
    try { const items = await getConcessionCatalog(controller.signal); if (!controller.signal.aborted) setCatalog(items); }
    catch (failure) { if (!controller.signal.aborted) { setCatalog(undefined); setCatalogError(failure instanceof ConcessionApiError ? failure : new ConcessionApiError(503)); } }
  }, []);
  const refresh = useCallback(async () => {
    if (current.current) return;
    const controller = new AbortController(); current.current = controller; setBusy(true); setError(undefined);
    try { await Promise.all([read(controller), readCatalog(controller)]); }
    finally { if (current.current === controller) { current.current = null; setBusy(false); } }
  }, [read, readCatalog]);
  const mutate = useCallback(async (command: ConcessionCommand) => {
    if (current.current || !confirmedRef.current || reviewRef.current || !dataRef.current) return;
    const displayed = dataRef.current;
    if (concessionEditability(displayed.booking, projectedServerNow(displayed.clock, performance.now()))) return;
    const controller = new AbortController(); current.current = controller; setBusy(true); setError(undefined); setNotice("");
    try {
      // Fresh owned read before every explicit write; no stale GET can race this request.
      const before = await read(controller);
      if (!before || controller.signal.aborted) return;
      const reason = concessionEditability(before, projectedServerNow(dataRef.current!.clock, performance.now()));
      if (reason) { setNotice(reason); return; }
      confirmedRef.current = false; setConfirmed(false);
      const started = performance.now();
      const booking = await editBookingConcession(before, command, token, controller.signal);
      if (controller.signal.aborted) return;
      accept(booking, started); setNotice("Đã lưu bắp nước vào đơn đặt vé.");
    } catch (failure) {
      if (controller.signal.aborted) return;
      const problem = failure instanceof ConcessionApiError ? failure : new ConcessionApiError(503, true);
      setError(problem);
      if (problem.outcomeUncertain) { reviewRef.current = true; setReviewRequired(true); }
    } finally {
      // POST is not idempotent. Never replay; reconcile all server lines/totals instead.
      if (!controller.signal.aborted) await Promise.all([read(controller), readCatalog(controller)]);
      if (current.current === controller) { current.current = null; setBusy(false); }
    }
  }, [token, read, readCatalog, accept]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const activeRefresh = () => { if (document.visibilityState === "visible") void refresh(); };
    const poll = setInterval(activeRefresh, 30_000), timer = setInterval(() => setTick(performance.now()), 1000);
    window.addEventListener("focus", activeRefresh); window.addEventListener("pageshow", activeRefresh); document.addEventListener("visibilitychange", activeRefresh);
    return () => { clearTimeout(initial); clearInterval(poll); clearInterval(timer); window.removeEventListener("focus", activeRefresh); window.removeEventListener("pageshow", activeRefresh); document.removeEventListener("visibilitychange", activeRefresh); current.current?.abort(); current.current = null; };
  }, [refresh]);
  const now = data ? projectedServerNow(data.clock, tick) : Infinity;
  useEffect(() => {
    if (data?.booking.status === "PENDING" && now >= Date.parse(data.booking.expiresAt) && !busy && expiryRead.current !== data.booking.expiresAt) {
      expiryRead.current = data.booking.expiresAt; void refresh();
    }
  }, [data, now, busy, refresh]);
  function acknowledgeReview() {
    if (current.current || !confirmedRef.current) return;
    reviewRef.current = false; setReviewRequired(false); setError(undefined); setNotice("Đã xác nhận dữ liệu vừa đọc từ máy chủ. Thao tác tiếp theo chỉ được lưu khi bạn chọn.");
  }
  return { booking: data?.booking, now, busy, confirmed, error, catalog, catalogError, reviewRequired, notice, refresh, mutate, acknowledgeReview };
}
