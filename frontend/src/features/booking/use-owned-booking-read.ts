"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookingReadError } from "@/features/booking/booking-read-api";

// Caller is keyed by account/token/resource. No entitlement is persisted or polled.
export function useOwnedBookingRead<T>(reader: (signal: AbortSignal, previous?: T) => Promise<T>) {
  const [state, setState] = useState<{ data?: T; error?: BookingReadError; loading: boolean }>({ loading: true });
  const previous = useRef<T>(undefined);
  const controller = useRef<AbortController>(undefined);
  const blocked = useRef(false), lastRead = useRef(0);
  const refresh = useCallback(async (automatic = false) => {
    if (automatic && (blocked.current || Date.now() - lastRead.current < 2000)) return;
    if (controller.current) return;
    const current = new AbortController(); controller.current = current; lastRead.current = Date.now();
    setState({ loading: true });
    const timeout = setTimeout(() => current.abort(), 30_000);
    try {
      const data = await reader(current.signal, previous.current);
      if (!current.signal.aborted && controller.current === current) { previous.current = data; blocked.current = false; setState({ data, loading: false }); }
    } catch (error) {
      if (controller.current === current) {
        const failure = error instanceof BookingReadError ? error : new BookingReadError(503);
        blocked.current = [400, 401, 403, 404, 429].includes(failure.status);
        if ([401, 403, 404].includes(failure.status)) previous.current = undefined;
        setState({ error: failure, loading: false });
      }
    } finally {
      clearTimeout(timeout);
      if (controller.current === current) controller.current = undefined;
    }
  }, [reader]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const active = () => { if (document.visibilityState === "visible") void refresh(true); };
    const visibility = () => {
      if (document.visibilityState === "hidden") {
        controller.current?.abort(); controller.current = undefined; lastRead.current = 0;
        setState({ loading: true });
      } else active();
    };
    window.addEventListener("focus", active); window.addEventListener("pageshow", active);
    document.addEventListener("visibilitychange", visibility);
    return () => { clearTimeout(initial); controller.current?.abort(); controller.current = undefined; previous.current = undefined; window.removeEventListener("focus", active); window.removeEventListener("pageshow", active); document.removeEventListener("visibilitychange", visibility); };
  }, [refresh]);
  return { ...state, refresh };
}
