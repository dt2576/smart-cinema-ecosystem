"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DiscoveryApiError, getSeatMap } from "@/features/discovery/discovery-api";
import { acquireSeatHolds, getOwnedSeatHolds, releaseSeatHold, SeatHoldApiError } from "@/features/seat/seat-hold-api";
import { bookingHoldHandoff, holdClock, projectedServerNow, usableOwnedHolds } from "@/features/seat/seat-hold-service";
import type { SeatHoldBatch, SeatHoldClock } from "@/features/seat/seat-hold.types";
import type { SeatMap } from "@/features/seat/seat.types";
import type { ShowtimeOption } from "@/features/showtime/showtime.types";

const EMPTY_BATCH: SeatHoldBatch = { serverTime: "", holds: [] };
const INTENT_KEY = "smart-cinema.seat-intent";
export function saveSeatIntent(href: string, seatIds: string[]) {
  try { sessionStorage.setItem(INTENT_KEY, JSON.stringify({ href, seatIds })); } catch { /* Navigation can still resume without the draft. */ }
}
function takeSeatIntent(href: string): string[] {
  try {
    const value = JSON.parse(sessionStorage.getItem(INTENT_KEY) ?? "null");
    sessionStorage.removeItem(INTENT_KEY);
    return value?.href === href && Array.isArray(value.seatIds) && value.seatIds.every((id: unknown) => typeof id === "string") ? [...new Set<string>(value.seatIds)] : [];
  } catch { return []; }
}
function safeError(error: unknown) {
  return error instanceof SeatHoldApiError ? error : error instanceof DiscoveryApiError && [400, 404, 409].includes(error.status)
    ? new SeatHoldApiError(error.status) : new SeatHoldApiError(503);
}

export function useSeatHolds(showtime: ShowtimeOption, token: string | undefined, seatHref: string) {
  const [map, setMap] = useState<SeatMap>();
  const [batch, setBatch] = useState<SeatHoldBatch>(EMPTY_BATCH);
  const [clock, setClock] = useState<SeatHoldClock>();
  const [monotonicNow, setMonotonicNow] = useState(0);
  const [draft, setDraft] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<SeatHoldApiError>();
  const [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  const lastBatch = useRef(EMPTY_BATCH);
  const draftRef = useRef(draft);
  useEffect(() => { draftRef.current = draft; }, [draft]);
  const restored = useRef(false);
  const expiredDeadline = useRef<string | undefined>(undefined);

  const read = useCallback(async (signal: AbortSignal) => {
    const started = performance.now();
    const owned = token ? await getOwnedSeatHolds(showtime.id, token, signal) : EMPTY_BATCH;
    const freshMap = await getSeatMap(showtime, signal);
    if (signal.aborted) return null;
    const received = performance.now();
    const freshClock = holdClock(freshMap.serverTime!, started, received);
    const freshNow = projectedServerNow(freshClock, received);
    const usable = usableOwnedHolds(owned.holds, freshMap, freshNow);
    const priorOwnedIds = lastBatch.current.holds.map(hold => hold.seatId);
    const intent = token && !restored.current ? takeSeatIntent(seatHref) : [];
    restored.current = true;
    setDraft(previous => [...new Set([...previous, ...intent, ...usable.map(hold => hold.seatId)])].filter(id =>
      usable.some(hold => hold.seatId === id) || (!priorOwnedIds.includes(id) && freshMap.units.some(unit => unit.id === id && unit.availability === "AVAILABLE"))));
    lastBatch.current = owned;
    setBatch(owned); setMap(freshMap); setClock(freshClock); setMonotonicNow(received); setConfirmed(true);
    return { map: freshMap, batch: owned, now: freshNow, clock: freshClock };
  }, [showtime, token, seatHref]);

  // One local operation at a time. Aborting a write does not mean it rolled back;
  // the next entry/retry always GETs owned Holds before permitting another write.
  const run = useCallback(async (operation: "refresh" | "acquire" | "release" | "continue", holdIds: string[] = []) => {
    if (controller.current) return null;
    const current = new AbortController(); controller.current = current;
    setBusy(true); setError(undefined); setConfirmed(false);
    let operationError: SeatHoldApiError | undefined;
    try {
      if (operation === "acquire" && token) {
        const result = await acquireSeatHolds(showtime.id, [...draftRef.current], token, current.signal);
        lastBatch.current = result; setBatch(result);
      }
      if (operation === "release" && token) {
        // Contract only offers individual DELETE. Stop on a failure, then GET
        // all owned Holds; never claim an all-or-nothing multi-release.
        for (const id of holdIds) {
          await releaseSeatHold(showtime.id, id, token, current.signal);
          const remaining = lastBatch.current.holds.filter(hold => hold.id !== id);
          const releasedSeat = lastBatch.current.holds.find(hold => hold.id === id)?.seatId;
          lastBatch.current = { ...lastBatch.current, holds: remaining }; setBatch(lastBatch.current);
          setDraft(previous => previous.filter(seatId => seatId !== releasedSeat));
        }
      }
    } catch (failure) {
      if (!current.signal.aborted) operationError = safeError(failure);
    }
    try {
      if (current.signal.aborted) return null;
      const fresh = await read(current.signal);
      if (current.signal.aborted) return null;
      setError(operationError);
      if (operationError) setMessage(operation === "release" ? "Chưa xác nhận trả toàn bộ ghế. Các ghế còn lại bạn đang giữ hiển thị bên dưới." : "Chưa xác nhận yêu cầu. Lựa chọn đã được đối chiếu với máy chủ.");
      else if (operation === "acquire") setMessage("Máy chủ đã xác nhận ghế đang giữ. Hạn gốc không được gia hạn.");
      else if (operation === "release") setMessage("Đã xác nhận trả ghế. Ghế còn đang giữ giữ nguyên hạn gốc.");
      return operationError ? null : fresh;
    } catch (failure) {
      if (!current.signal.aborted) { setError(operationError ?? safeError(failure)); setConfirmed(false); setMessage("Chưa thể xác nhận tình trạng giữ ghế. Cập nhật trước khi tiếp tục hoặc thử thay đổi lại."); }
      return null;
    } finally {
      if (controller.current === current) { controller.current = null; setBusy(false); }
    }
  }, [read, showtime.id, token]);

  useEffect(() => {
    void run("refresh");
    const refresh = () => { if (document.visibilityState === "visible") void run("refresh"); };
    const timer = setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh); window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("pageshow", refresh); document.removeEventListener("visibilitychange", refresh); controller.current?.abort(); controller.current = null; };
  }, [run]);
  useEffect(() => { const timer = setInterval(() => setMonotonicNow(performance.now()), 1000); return () => clearInterval(timer); }, []);
  const now = clock ? projectedServerNow(clock, monotonicNow) : Infinity;
  const owned = map ? usableOwnedHolds(batch.holds, map, now) : [];
  const deadline = batch.holds.length ? batch.holds.reduce((a, b) => Date.parse(a.expiresAt) < Date.parse(b.expiresAt) ? a : b).expiresAt : undefined;
  useEffect(() => {
    if (deadline && now >= Date.parse(deadline) && !busy && expiredDeadline.current !== deadline) {
      expiredDeadline.current = deadline;
      setMessage("Thời gian giữ ghế đã hết. Đang cập nhật tình trạng từ máy chủ; không tự động gia hạn.");
      void run("refresh");
    }
  }, [deadline, now, busy, run]);
  const handoff = map && confirmed && !busy ? bookingHoldHandoff(batch, map, showtime, draft, now) : null;
  async function prepareHandoff() {
    const selectedIds = [...draftRef.current];
    const fresh = await run("continue");
    return fresh ? { ...fresh, handoff: bookingHoldHandoff(fresh.batch, fresh.map, showtime, selectedIds, fresh.now) } : null;
  }
  function toggle(id: string) {
    if (busy || !confirmed || !map || !(Date.parse(showtime.bookingCutOff ?? showtime.startsAt) > now)) return;
    const hold = owned.find(item => item.seatId === id);
    if (hold) { void run("release", [hold.id]); return; }
    if (map.units.some(unit => unit.id === id && unit.availability === "AVAILABLE")) setDraft(value => value.includes(id) ? value.filter(item => item !== id) : [...value, id]);
  }
  function clear() {
    if (busy) return;
    setDraft(lastBatch.current.holds.map(hold => hold.seatId));
    if (lastBatch.current.holds.length) void run("release", lastBatch.current.holds.map(hold => hold.id));
  }
  return { map, batch, clock, now, draft, owned, deadline, busy, confirmed, error, message, handoff, toggle, clear, prepareHandoff, refresh: () => run("refresh"), acquire: () => run("acquire") };
}
