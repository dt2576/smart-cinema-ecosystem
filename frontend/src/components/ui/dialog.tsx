"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function Dialog({ title, children, onClose, busy = false, initialFocus }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; initialFocus?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    dialog?.showModal(); document.body.style.overflow = "hidden";
    if (initialFocus) dialog?.querySelector<HTMLElement>(initialFocus)?.focus();
    return () => {
      dialog?.close(); document.body.style.overflow = overflow;
      if (previous?.isConnected && !previous.matches(":disabled")) previous.focus({ preventScroll: true });
      else document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
    };
  }, [initialFocus]);
  return <dialog ref={ref} aria-labelledby={titleId} aria-busy={busy} onKeyDown={event => {
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter(element => element.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1);
    if (!first) { event.preventDefault(); event.currentTarget.focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => { if (!busy && event.target === event.currentTarget) onClose(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-card border border-outline bg-panel p-6 text-foreground shadow-2xl">
    <div className="mb-6 flex items-start justify-between gap-4"><h2 id={titleId} className="min-w-0 text-heading-md font-semibold">{title}</h2><Button variant="secondary" aria-label="Đóng hộp thoại" disabled={busy} onClick={onClose} className="min-w-control shrink-0">×</Button></div>
    {children}
  </dialog>;
}
