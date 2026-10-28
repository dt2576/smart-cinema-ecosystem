"use client";

import { useEffect, useRef, useState } from "react";
import { OperationsApiError } from "@/features/manager/manager-api";
import { MANAGER_STAFF_REVIEW_KEY, parseStaffReview, type ManagerStaffReview } from "@/features/manager/manager-staff-service";

function storedReview() { try { return parseStaffReview(sessionStorage.getItem(MANAGER_STAFF_REVIEW_KEY)); } catch { return null; } }
function storeReview(hint: ManagerStaffReview | null) { try { if (hint) sessionStorage.setItem(MANAGER_STAFF_REVIEW_KEY, JSON.stringify(hint)); else sessionStorage.removeItem(MANAGER_STAFF_REVIEW_KEY); } catch { /* In-memory protection still applies. */ } }
export function useManagerStaffCommand(onRejected: (cause: unknown) => void) {
  const locked = useRef(false), alive = useRef(true);
  const [review, setReview] = useState(storedReview), [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string>();
  const [retryAt, setRetryAt] = useState(0), [clock, setClock] = useState(Date.now);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (clock >= retryAt) return; const timer = setTimeout(() => setClock(Date.now()), Math.min(1000, retryAt - clock)); return () => clearTimeout(timer); }, [clock, retryAt]);
  const wait = Math.max(0, Math.ceil((retryAt - clock) / 1000));
  function failed(cause: unknown) { const failure = cause instanceof OperationsApiError ? cause : new OperationsApiError(0, true); setError(failure.message); if (failure.retryAfterMs) { const now = Date.now(); setClock(now); setRetryAt(now + failure.retryAfterMs); } onRejected(cause); return failure; }
  async function run<T>(hint: ManagerStaffReview, execute: () => Promise<T>, success: (value: T) => void) {
    if (locked.current || review || storedReview() || Date.now() < retryAt) return;
    locked.current = true; setBusy(true); setError(undefined); setChecked(false); storeReview(hint);
    try { const value = await execute(); storeReview(null); if (alive.current) { setReview(null); success(value); } }
    catch (cause) {
      const uncertain = !(cause instanceof OperationsApiError) || cause.outcomeUncertain || [409, 429].includes(cause.status);
      if (!uncertain) storeReview(null);
      if (alive.current) { setReview(uncertain ? hint : null); failed(cause); }
    } finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  async function check(read: (hint: ManagerStaffReview) => Promise<void>) {
    if (!review || locked.current || Date.now() < retryAt) return;
    locked.current = true; setBusy(true); setChecked(false); setError(undefined);
    try { await read(review); if (alive.current) setChecked(true); }
    catch (cause) { if (alive.current) failed(cause); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  function acknowledge() { if (busy || !checked) return; storeReview(null); setReview(null); setChecked(false); setError(undefined); }
  return { run, check, acknowledge, busy, review, checked, error, wait, blocked: busy || !!review || wait > 0 };
}
