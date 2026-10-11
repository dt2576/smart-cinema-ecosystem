"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { StatusFeedback } from "@/components/ui/status-feedback";
import { renderBookingQr } from "@/features/ticket/booking-qr-renderer";

export function BookingQrPass({ token, code }: { token: string; code: string }) {
  const [image, setImage] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let active = true;
    void renderBookingQr(token).then(value => { if (active) setImage(value); }, () => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [token]);
  const qr = image && <Image src={image} alt={`Mã QR đặt vé cho ${code}`} width={320} height={320} unoptimized className="mx-auto h-auto w-full max-w-80 rounded-control" />;
  return <SurfaceCard aria-label="Mã QR đặt vé" className="min-w-0 border-action/30 bg-panel-low text-center"><p className="font-heading text-xs uppercase tracking-widest text-accent">Một mã QR · Một đơn đặt vé</p><h2 className="mt-3 text-heading-md font-bold">Mã QR đặt vé</h2><p className="my-5 break-all font-heading text-xl font-semibold text-accent">{code}</p>
    {failed ? <StatusFeedback role="alert" message="Chưa thể hiển thị mã QR. Kiểm tra lại trạng thái đặt vé." /> : !image ? <p role="status">Đang hiển thị mã QR…</p> : !open && qr}
    <Button disabled={!image} onClick={() => setOpen(true)} className="mt-5 w-full">Phóng to mã QR đặt vé</Button><p className="mt-5 text-body-sm leading-6 text-muted">Mã QR dùng chung cho đơn đặt vé. Nhân viên kiểm tra trạng thái từng vé tại rạp; trạng thái chưa sử dụng không tự xác nhận quyền vào rạp.</p>
    {open && <BookingQrDialog onClose={() => setOpen(false)}><p className="mb-5 break-all text-center font-heading text-accent">{code}</p>{qr}<p className="mt-5 text-center text-body-sm text-muted">Một mã QR cho toàn bộ vé trong đơn đặt vé.</p></BookingQrDialog>}
  </SurfaceCard>;
}
function BookingQrDialog({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current, previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    dialog?.showModal(); document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} aria-labelledby="booking-qr-title" onCancel={onClose} onKeyDown={event => {
    if (event.key !== "Tab") return;
    const controls = ref.current?.querySelectorAll<HTMLButtonElement>("button");
    if (!controls?.length) return;
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-card border border-outline bg-panel p-5 text-foreground shadow-2xl sm:p-7">
    <div className="mb-5 flex items-start justify-between gap-4"><h2 id="booking-qr-title" className="text-heading-md font-bold">Mã QR đặt vé</h2><Button variant="secondary" autoFocus aria-label="Đóng hộp thoại" onClick={onClose}>Đóng</Button></div>{children}<Button variant="secondary" onClick={onClose} className="mt-6 w-full">Về đơn đặt vé</Button>
  </dialog>;
}
