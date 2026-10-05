import { displayLabel } from "@/lib/display-labels";
import Link from "next/link";
import Image from "next/image";
import type { BookingPreviewStatus } from "@/features/booking/booking-history.types";
import type { TicketPreviewStatus } from "@/features/ticket/ticket-preview.types";

export const BOOKING_LINK_STYLE = "inline-flex min-h-11 items-center justify-center rounded-lg bg-action px-5 py-3 font-heading text-sm font-semibold text-on-action hover:brightness-110";

export function BookingPreviewPoster({ title, url }: { title: string; url: string }) {
  // Bundled fixture asset, not a URL supplied by an API or user input.
  return <Image src={url} alt={`${title} áp phích mẫu`} width={240} height={360} unoptimized className="aspect-[2/3] w-full rounded-xl bg-panel-high object-cover" />;
}

export function BookingStatusBadge({ status }: { status: BookingPreviewStatus | TicketPreviewStatus }) {
  const tone = status === "PAID" || status === "VALID" ? "bg-accent/10 text-accent" : status === "CANCELLED" || status === "EXPIRED" ? "bg-error/10 text-error" : "bg-panel-high text-foreground";
  return <span className={`inline-flex rounded-full px-3 py-1 font-heading text-xs font-semibold ${tone}`}>{displayLabel(status)}</span>;
}

export function BookingPreviewHeading({ detail = false }: { detail?: boolean }) {
  return <div className="mb-8">
    <nav aria-label="Đường dẫn điều hướng" className="mb-5 flex flex-wrap gap-2 text-sm text-muted"><Link href="/" className="hover:text-accent">Trang chủ</Link><span aria-hidden="true">/</span>{detail ? <><Link href="/my-bookings" className="hover:text-accent">Vé của tôi</Link><span aria-hidden="true">/</span><span>Chi tiết đặt vé</span></> : <span>Vé của tôi</span>}</nav>
    <p className="mb-3 font-heading text-xs uppercase tracking-[.2em] text-accent">Khoảnh khắc điện ảnh của bạn</p>
    <h1 className="text-3xl font-bold sm:text-5xl">Đơn đặt vé & vé của tôi</h1>
    <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">Chỉ là bản xem trước. Đơn đặt vé, vé, trạng thái và số tiền giả định này không phải lịch sử tài khoản hay bằng chứng thanh toán của bạn. Mã QR mẫu không có giá trị vào rạp.</p>
  </div>;
}

export function BookingHistoryLoading() {
  return <div role="status" className="rounded-2xl border border-outline/40 bg-panel-low p-8"><p>Đang tải đơn đặt vé và vé mẫu...</p><div aria-hidden="true" className="mt-6 h-48 animate-pulse rounded-xl bg-panel-high" /></div>;
}

export function bookingPreviewShowtime(startsAt: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(startsAt));
}
