"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusFeedback } from "@/components/ui/status-feedback";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Skeleton } from "@/components/ui/skeleton";
import { OperationsApiError } from "@/features/manager/manager-api";

export const OP_INPUT = "form-input mt-2 min-w-0 text-base";
export const OP_LINK = "inline-flex min-h-11 items-center rounded-control px-2 text-base font-semibold text-accent underline underline-offset-4";
export function OperationsFrame({ title, children, back }: { title: string; children: ReactNode; back?: { href: string; label: string } }) {
  return <section className="space-y-6 text-base [&_button]:text-base">{back && <Link className={OP_LINK} href={back.href}>← {back.label}</Link>}<h1 className="font-heading text-3xl font-bold sm:text-4xl">{title}</h1>{children}</section>;
}
export function OperationsState({ loading, error, retry }: { loading: boolean; error?: Error; retry: () => void }) {
  if (loading) return <div role="status" className="space-y-3"><p>Đang tải dữ liệu…</p><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;
  return <StatusFeedback tone="error" role="alert" title="Chưa tải được thông tin" message={error instanceof OperationsApiError ? error.message : "Dịch vụ chưa khả dụng. Vui lòng kiểm tra lại."} actions={<Button onClick={retry}>Kiểm tra lại</Button>} />;
}
export function OperationsEmpty({ message }: { message: string }) { return <StatusFeedback message={message} role="status" />; }
export function OperationsCard({ children }: { children: ReactNode }) { return <SurfaceCard className="space-y-4 break-words p-5 sm:p-6">{children}</SurfaceCard>; }

const REVIEW_KEY = "smart-cinema.operations-review";
// Navigation/review hint only. No credentials, form content, financial state or PII.
function readReview() { try { return sessionStorage.getItem(REVIEW_KEY) !== null; } catch { return false; } }
function writeReview() { try { sessionStorage.setItem(REVIEW_KEY, "review-required"); } catch { /* In-memory protection remains. */ } }
function clearReview() { try { sessionStorage.removeItem(REVIEW_KEY); } catch { /* A retained hint fails closed. */ } }
export function useOperationsCommand(reportError?: (cause: unknown) => void) {
  const locked = useRef(false), alive = useRef(true);
  const [busy, setBusy] = useState(false), [review, setReview] = useState(readReview);
  const [error, setError] = useState<string>(), [saved, setSaved] = useState(false);
  const [retryAt, setRetryAt] = useState(0), [clock, setClock] = useState(Date.now);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (clock >= retryAt) return; const timer = setTimeout(() => setClock(Date.now()), Math.min(1000, retryAt - clock)); return () => clearTimeout(timer); }, [clock, retryAt]);
  const wait = Math.max(0, Math.ceil((retryAt - clock) / 1000));
  async function run<T>(execute: () => Promise<T>, success: (value: T) => void) {
    if (locked.current || review || readReview() || Date.now() < retryAt) return;
    locked.current = true; setBusy(true); setError(undefined); setSaved(false); writeReview();
    try { const value = await execute(); clearReview(); if (alive.current) { success(value); setSaved(true); } }
    catch (cause) {
      const failure = cause instanceof OperationsApiError ? cause : new OperationsApiError(0, true);
      if (!failure.outcomeUncertain && ![409, 429].includes(failure.status)) clearReview();
      if (alive.current) { setError(failure.message); setReview(failure.outcomeUncertain || [409, 429].includes(failure.status)); if (failure.retryAfterMs) { const now = Date.now(); setClock(now); setRetryAt(now + failure.retryAfterMs); } reportError?.(failure); }
    } finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  async function recheck(read: () => Promise<unknown>) {
    if (locked.current || Date.now() < retryAt) return; locked.current = true; setBusy(true);
    try { await read(); clearReview(); if (alive.current) { setReview(false); setError(undefined); setSaved(false); } }
    catch (cause) { if (alive.current) { setError(cause instanceof OperationsApiError ? cause.message : "Chưa thể kiểm tra dữ liệu."); reportError?.(cause); } }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  return { run, recheck, busy, review, error, saved, wait, blocked: busy || review || wait > 0 };
}
export function CommandFeedback({ command, read }: { command: ReturnType<typeof useOperationsCommand>; read: () => Promise<unknown> }) {
  return <div aria-live="polite" className="space-y-3">{command.error && <p role="alert" className="text-error">{command.error}</p>}
    {command.saved && <p role="status" className="text-success">Đã lưu thay đổi.</p>}
    {command.review && <OperationsCard><p role="status">Cần kiểm tra dữ liệu đã lưu trước khi thao tác tiếp. Yêu cầu trước sẽ không được gửi lại tự động.</p>{command.wait > 0 && <p>Vui lòng chờ {command.wait} giây.</p>}<Button variant="secondary" disabled={command.busy || command.wait > 0} onClick={() => void command.recheck(read)}>Kiểm tra dữ liệu đã lưu</Button></OperationsCard>}
  </div>;
}
