"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StaffBooking, StaffTicket } from "@/features/staff/staff.types";

const TICKET_LABELS = { VALID: "Chưa sử dụng", CHECKED_IN: "Đã soát vé", EXPIRED: "Đã hết hạn", CANCELLED: "Đã hủy" };
const SEAT_LABELS = { STANDARD: "Vé thường", VIP: "Vé VIP", COUPLE: "Vé đôi" };
const BOOKING_LABELS = { PENDING: "Chờ thanh toán", PAID: "Đã thanh toán", EXPIRED: "Đã hết hạn", CANCELLED: "Đã hủy" };
const REASONS = { NOT_PAID: "Đơn đặt vé chưa được xác nhận đã thanh toán. Chưa thể soát vé.", CONTEXT_UNAVAILABLE: "Rạp, phòng hoặc suất chiếu chưa cho phép soát vé.", OUTSIDE_ADMISSION_WINDOW: "Ngoài thời gian cho phép soát vé của suất chiếu." };
export function staffTime(value: string) { return `${new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value))} (UTC)`; }
export function ticketSeat(ticket: StaffTicket) { return `${ticket.row}${ticket.number}`; }
type Props = { booking: StaffBooking; selected: string[]; locked: boolean; onToggle: (id: string) => void; onConfirm: () => void; onRefresh: () => void; busy: boolean; throttled: boolean };
export function StaffBookingPanel({ booking: b, selected, locked, onToggle, onConfirm, onRefresh, busy, throttled }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [b.bookingId]);
  const capacity = b.tickets.filter(t => selected.includes(t.id)).reduce((sum, t) => sum + t.guestCount, 0);
  return <SurfaceCard aria-label="Thông tin đặt vé và vé" padding="none" className="overflow-hidden">
    <div className="space-y-5 border-b border-outline/40 bg-panel-low p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs uppercase tracking-widest text-muted">Thông tin đặt vé</p><StatusBadge tone={b.bookingStatus === "PAID" ? "success" : "neutral"}>{BOOKING_LABELS[b.bookingStatus]}</StatusBadge></div>
      <div><p className="break-all font-heading text-sm font-semibold text-accent">{b.bookingCode}</p><h2 ref={heading} tabIndex={-1} className="mt-2 break-words text-heading-lg font-bold">{b.movieTitle}</h2></div>
      <dl className="grid gap-4 text-body-sm sm:grid-cols-2"><div className="min-w-0"><dt className="text-muted">Rạp</dt><dd className="mt-1 break-words font-semibold">{b.cinemaName}</dd></div><div><dt className="text-muted">Phòng chiếu</dt><dd className="mt-1 break-words font-semibold">{b.hallName}</dd></div><div className="sm:col-span-2"><dt className="text-muted">Suất chiếu</dt><dd className="mt-1 break-words font-heading tabular-nums">{staffTime(b.startsAt)} — {staffTime(b.endsAt)}</dd></div></dl>
      {b.admissionReason ? <p role="status" className="rounded-control border border-error/25 bg-error/5 p-3 text-body-sm text-error">{REASONS[b.admissionReason]}</p> : <p className="text-body-sm text-success">Theo lần kiểm tra gần nhất, suất chiếu cho phép soát vé. Kiểm tra trạng thái từng vé bên dưới.</p>}
      {locked && <p role="status" className="text-body-sm text-accent">Lựa chọn vé đang khóa. Kiểm tra lại trạng thái trước khi tiếp tục.</p>}
    </div>
    <section aria-label="Vé trong đơn đặt vé" className="space-y-4 p-5 sm:p-7"><h3 className="font-heading text-xl font-semibold">Vé trong đơn đặt vé</h3><p className="text-body-sm leading-6 text-muted">Chọn vé đủ điều kiện. Một vé đôi gồm hai khách cùng một lượt soát vé.</p>
      {!b.tickets.length ? <p className="rounded-control bg-panel-high p-4 text-body-sm text-muted">Đơn đặt vé chưa có vé được cấp để soát vé.</p> : <div className="grid gap-3 sm:grid-cols-2">{b.tickets.map(t => <label key={t.id} className={`flex min-w-0 gap-3 rounded-control border p-4 ${selected.includes(t.id) ? "border-action bg-action/10" : "border-outline/40 bg-panel-high/50"} ${locked || !t.canCheckIn ? "opacity-75" : "cursor-pointer hover:border-action/60"}`}>
        <span className="flex min-h-11 min-w-11 items-center justify-center"><input type="checkbox" checked={selected.includes(t.id)} disabled={locked || throttled || !t.canCheckIn} onChange={() => onToggle(t.id)} aria-label={`Ghế ${ticketSeat(t)} — ${SEAT_LABELS[t.seatType]}, ${t.guestCount} khách — ${TICKET_LABELS[t.status]}`} className="size-5 accent-action" /></span>
        <span className="min-w-0 flex-1"><span className="block break-all font-heading text-lg font-bold text-accent">Ghế {ticketSeat(t)}</span><span className="mt-1 block text-body-sm">{SEAT_LABELS[t.seatType]} · {t.guestCount} khách{t.seatType === "COUPLE" ? " cùng lượt" : ""}</span><span className="mt-3 block"><StatusBadge tone={t.status === "CHECKED_IN" ? "success" : t.status === "VALID" ? "neutral" : "error"}>{TICKET_LABELS[t.status]}</StatusBadge></span><span className="mt-3 block break-all text-xs text-muted">Mã vé: {t.ticketCode}</span>{t.checkedInAt && <span className="mt-1 block break-words text-xs text-muted">Đã soát: {staffTime(t.checkedInAt)}</span>}</span>
      </label>)}</div>}
      {b.tickets.length > 0 && !b.tickets.some(t => t.canCheckIn) && <p className="text-body-sm text-muted">Không còn vé đủ điều kiện để chọn trong lần kiểm tra này.</p>}
    </section>
    {b.concessions.length > 0 && <section aria-label="Bắp nước đã mua" className="mx-5 mb-5 rounded-control bg-panel-low p-4 sm:mx-7"><h3 className="font-heading font-semibold">Bắp nước đã mua</h3><ul className="mt-3 space-y-2 text-body-sm text-muted">{b.concessions.map((c, i) => <li key={i} className="flex min-w-0 justify-between gap-4"><span className="break-words">{c.name}</span><span className="shrink-0 tabular-nums">× {c.quantity}</span></li>)}</ul></section>}
    <div className="space-y-4 border-t border-outline/40 bg-panel-low p-5 sm:p-7"><p role="status" className="text-body-sm">Đang chọn <strong className="font-heading text-accent">{selected.length} vé</strong> · sức chứa <strong className="font-heading text-accent">{capacity} khách</strong></p><div className="flex flex-wrap gap-3"><Button variant="secondary" disabled={busy || throttled} onClick={onRefresh} className="flex-1">Kiểm tra lại trạng thái</Button><Button disabled={locked || throttled || !selected.length} onClick={onConfirm} className="flex-1">Soát vé đã chọn</Button></div><p className="break-words text-xs leading-5 text-muted">Cập nhật gần nhất: {staffTime(b.serverTime)}. Đổi rạp hoặc rời trang không hủy lệnh đã gửi.</p></div>
  </SurfaceCard>;
}
export function StaffConfirmation({ booking, selected, submitting, onCancel, onConfirm }: { booking: StaffBooking; selected: string[]; submitting: boolean; onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!, previous = document.activeElement instanceof HTMLElement ? document.activeElement : null, overflow = document.body.style.overflow;
    element.showModal(); document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = overflow; if (previous?.isConnected && !(previous instanceof HTMLButtonElement && previous.disabled)) previous.focus({ preventScroll: true }); else document.getElementById("staff-content")?.focus({ preventScroll: true }); };
  }, []);
  const tickets = booking.tickets.filter(t => selected.includes(t.id)), capacity = tickets.reduce((sum, t) => sum + t.guestCount, 0);
  return <dialog ref={dialog} aria-labelledby="staff-confirm-title" aria-describedby="staff-confirm-description" aria-busy={submitting} onCancel={event => { event.preventDefault(); if (!submitting) onCancel(); }} onKeyDown={event => {
    if (event.key !== "Tab") return; const controls = dialog.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"); if (!controls?.length) return;
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-card border border-outline bg-panel p-6 text-foreground shadow-2xl">
    <h2 id="staff-confirm-title" className="text-heading-md font-bold">Xác nhận soát vé</h2><p id="staff-confirm-description" className="mt-4 text-body leading-6">Bạn sẽ soát cùng lúc <strong>{tickets.length} vé</strong>, sức chứa <strong>{capacity} khách</strong>. Vé đôi được xử lý nguyên vé, gồm hai khách cùng lượt.</p><p className="mt-3 break-all font-heading text-accent">{booking.bookingCode}</p><ul className="my-5 space-y-2 text-body-sm">{tickets.map(t => <li key={t.id}>Ghế {ticketSeat(t)} · {SEAT_LABELS[t.seatType]} · {t.guestCount} khách</li>)}</ul>{submitting && <p role="status" className="mb-4 text-accent">Đang xác nhận soát vé…</p>}<div className="flex flex-wrap gap-3"><Button autoFocus variant="secondary" disabled={submitting} onClick={onCancel} className="flex-1">Quay lại chọn vé</Button><Button disabled={submitting} onClick={onConfirm} className="flex-1">Xác nhận soát vé</Button></div>
  </dialog>;
}
