"use client";

import { useState } from "react";
import { displayLabel } from "@/lib/display-labels";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PreviewDialog } from "@/components/ui/preview-dialog";
import type { BookingHistoryPreview } from "@/features/booking/booking-history.types";

export function BookingQrPreview({ booking, reload }: { booking: BookingHistoryPreview; reload: (payload: string) => void }) {
  const [enlarged, setEnlarged] = useState(false);
  if (booking.status !== "PAID" || !booking.qr) return <aside aria-label="Mã QR đặt vé — bản xem trước" className="rounded-2xl border border-outline/40 bg-panel-low p-6"><h2 className="text-xl font-bold">Chưa có mã QR đặt vé</h2><p className="mt-4 text-sm leading-6 text-muted">Đơn {displayLabel(booking.status)} mẫu chưa có vé hay mã QR đặt vé. Mã QR đặt vé thật cần đơn đã thanh toán được xác minh.</p></aside>;
  const qr = booking.qr;
  const image = <Image src={qr.imageUrl} alt={`Mã QR đặt vé mẫu cho ${booking.code}, không có giá trị vào rạp`} width={370} height={370} unoptimized className="mx-auto h-auto w-full max-w-80 rounded-lg" />;
  return <aside aria-label="Mã QR đặt vé — bản xem trước" className="self-start rounded-2xl border border-accent/40 bg-panel-low p-5 sm:p-7">
    <p className="text-center font-heading text-xs uppercase tracking-widest text-accent">Một mã QR · Một đơn đặt vé</p>
    <h2 className="mt-3 text-center text-2xl font-bold">Mã QR đặt vé — bản xem trước</h2>
    <p className="my-5 text-center text-sm leading-6 text-muted">CHỈ MINH HỌA — không có giá trị vào rạp. Mã này chứa tham chiếu mẫu không có hiệu lực.</p>
    {!enlarged && image}
    <p className="mt-5 break-all text-center font-mono text-sm">{booking.code}</p>
    <Button variant="secondary" onClick={() => setEnlarged(true)} className="mt-5 w-full">Phóng to mã QR đặt vé</Button>
    <Button variant="secondary" onClick={() => reload(qr.payload)} className="mt-3 w-full">Tải lại ví dụ từ mã QR đặt vé</Button>
    <p className="mt-5 text-sm leading-6 text-muted">Dùng lại mã QR mẫu sẽ tải đơn này và trạng thái từng vé. Không soát vé hay đổi trạng thái vé của bất kỳ ai.</p>
    {enlarged && <PreviewDialog title="Mã QR đặt vé — bản xem trước" onClose={() => setEnlarged(false)} closeLabel="Về đơn đặt vé"><p className="mb-4 text-sm text-muted">CHỈ MINH HỌA — không có giá trị vào rạp. {booking.code}</p>{image}</PreviewDialog>}
  </aside>;
}
