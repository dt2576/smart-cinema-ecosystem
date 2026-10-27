"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useAdmin } from "@/features/admin/admin-shell";
import { AdminPromotionApiError, isPromotionId } from "@/features/admin/admin-promotion-api";

const KEY = "smart-cinema.admin-promotion-review";
const EVENT = "smart-cinema-promotion-review";
type Review = { nonce: string; promotionId?: string };
const snapshot = () => { try { return sessionStorage.getItem(KEY); } catch { return null; } };
function subscribe(notify: () => void) {
  window.addEventListener(EVENT, notify); window.addEventListener("storage", notify);
  return () => { window.removeEventListener(EVENT, notify); window.removeEventListener("storage", notify); };
}
function store(hint: Review | null) {
  try { if (hint) sessionStorage.setItem(KEY, JSON.stringify(hint)); else sessionStorage.removeItem(KEY); } catch { /* Current view still retains its in-memory recovery gate. */ }
  window.dispatchEvent(new Event(EVENT));
}
function clear(nonce: string) { try { if (JSON.parse(snapshot() ?? "null")?.nonce === nonce) store(null); } catch { /* Untrusted hint. */ } }
export function parsePromotionReview(raw: string | null): Review | null {
  try {
    const value = JSON.parse(raw ?? "null");
    return value && typeof value.nonce === "string" && /^[a-zA-Z0-9-]{1,100}$/.test(value.nonce) && (value.promotionId === undefined || isPromotionId(value.promotionId))
      ? { nonce: value.nonce, ...(value.promotionId ? { promotionId: value.promotionId } : {}) } : null;
  } catch { return null; }
}
export function useAdminPromotionCommand(promotionId?: string) {
  const { accessToken, reportError } = useAdmin();
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const saved = useMemo(() => parsePromotionReview(raw), [raw]);
  const [localReview, setLocalReview] = useState<Review | null>(null);
  const review = localReview ?? saved;
  const locked = useRef(false), alive = useRef(true), token = useRef(accessToken);
  const [busy, setBusy] = useState(false), [error, setError] = useState<AdminPromotionApiError>();
  const [retryAt, setRetryAt] = useState(0), [clock, setClock] = useState(Date.now);
  useEffect(() => { token.current = accessToken; }, [accessToken]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (retryAt <= clock) return; const timer = setTimeout(() => setClock(Date.now()), Math.min(retryAt - clock, 1000)); return () => clearTimeout(timer); }, [retryAt, clock]);
  async function run<T>(action: () => Promise<T>, success: (v: T) => void) {
    if (locked.current || review || Date.now() < retryAt) return;
    locked.current = true; setBusy(true); setError(undefined);
    const startedToken = accessToken;
    const hint: Review = { nonce: crypto.randomUUID(), ...(promotionId ? { promotionId } : {}) };
    store(hint);
    try {
      const value = await action(); clear(hint.nonce);
      if (alive.current && token.current === startedToken) success(value);
    } catch (cause) {
      const failure = cause instanceof AdminPromotionApiError ? cause : new AdminPromotionApiError(0, true);
      if (failure.outcomeUncertain || failure.status === 409) { if (alive.current) setLocalReview(hint); }
      else clear(hint.nonce);
      if (alive.current && token.current === startedToken) {
        setError(failure); reportError(failure);
        if (failure.retryAfter) { const now = Date.now(); setClock(now); setRetryAt(now + failure.retryAfter * 1000); }
      }
    } finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  function acknowledge() { if (review) clear(review.nonce); setLocalReview(null); setError(undefined); }
  const wait = Math.max(0, Math.ceil((retryAt - clock) / 1000));
  return { run, busy, error, review, acknowledge, wait, blocked: busy || !!review || wait > 0 };
}
