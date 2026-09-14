"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export function PreviewDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return <dialog ref={ref} aria-labelledby="preview-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border border-outline bg-panel p-6 text-foreground shadow-2xl">
    <div className="mb-5 flex items-start justify-between gap-4"><h2 id="preview-title" className="pt-2 text-2xl font-bold">{title}</h2><Button variant="secondary" aria-label="Close dialog" onClick={onClose} className="shrink-0 px-3"><Icon name="close" /></Button></div>
    {children}
    <Button variant="secondary" onClick={onClose} className="mt-6 w-full">Back to Home</Button>
  </dialog>;
}
