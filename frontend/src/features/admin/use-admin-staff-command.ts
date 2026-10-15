"use client";

import { useEffect, useRef, useState } from "react";
import { AdminStaffApiError } from "@/features/admin/admin-staff-api";
import { clearStaffReview, readStaffReview, writeStaffReview, type StaffReviewHint } from "@/features/admin/admin-staff-review";
import { useAdmin } from "@/features/admin/admin-shell";

export function useAdminStaffCommand(staffId?: string) {
  const { reportError } = useAdmin();
  const locked = useRef(false), alive = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AdminStaffApiError>();
  const [review, setReview] = useState<StaffReviewHint | null>(readStaffReview);
  const [retryAt, setRetryAt] = useState(0), [clock, setClock] = useState(Date.now);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (retryAt <= clock) return;
    const timer = setTimeout(() => setClock(Date.now()), Math.min(retryAt - clock, 1000));
    return () => clearTimeout(timer);
  }, [retryAt, clock]);
  const wait = Math.max(0, Math.ceil((retryAt - clock) / 1000));
  async function run<T>(execute: () => Promise<T>, success: (value: T) => void) {
    if (locked.current || review || Date.now() < retryAt) return;
    locked.current = true; setBusy(true); setError(undefined);
    const hint: StaffReviewHint = { nonce: crypto.randomUUID(), ...(staffId ? { staffId } : {}) };
    writeStaffReview(hint);
    try {
      const value = await execute(); clearStaffReview(hint.nonce);
      if (alive.current) success(value);
    } catch (cause) {
      const failure = cause instanceof AdminStaffApiError ? cause : new AdminStaffApiError(0, true);
      if (failure.outcomeUncertain || failure.status === 409) { if (alive.current) setReview(hint); }
      else clearStaffReview(hint.nonce);
      if (alive.current) {
        setError(failure); reportError(failure);
        if (failure.retryAfter) { const now = Date.now(); setClock(now); setRetryAt(now + failure.retryAfter * 1000); }
      }
    } finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  function acknowledge() { if (review) clearStaffReview(review.nonce); setReview(null); setError(undefined); }
  return { run, busy, error, review, wait, acknowledge, blocked: busy || !!review || wait > 0 };
}
