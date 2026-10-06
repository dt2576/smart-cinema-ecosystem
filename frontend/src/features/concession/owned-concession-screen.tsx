"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/features/auth/auth-context";
import { isBookingId } from "@/features/booking/booking-api";
import { bookingSummaryHref, formatBookingAmount } from "@/features/booking/booking-service";
import { parseConcessionQuantity } from "@/features/concession/concession-api";
import { bookingConcessionsHref, CONCESSION_CATEGORY_LABELS, concessionEditability } from "@/features/concession/concession-composition-service";
import type { ConcessionCategory } from "@/features/concession/concession.types";
import { useConcessionComposition } from "@/features/concession/use-concession-composition";
import { MovieFeedback } from "@/features/movie/movie-feedback";
import { formatUtcInstant } from "@/lib/display-format";
import { displayLabel } from "@/lib/display-labels";

export function OwnedConcessionScreen({ bookingId }: { bookingId: string }) {
  const { session, isHydrated } = useAuth();
  if (!isBookingId(bookingId)) return <MovieFeedback title="Liên kết đặt vé không hợp lệ" message="Dùng liên kết bắp nước từ thông tin đơn đặt vé của bạn." />;
  if (!isHydrated) return <p role="status">Đang tải phiên đăng nhập…</p>;
  if (!session) return <><MovieFeedback title="Đăng nhập để xem bắp nước" message="Bạn cần đăng nhập bằng tài khoản khách hàng sở hữu đơn đặt vé." /><Link href={`/login?${new URLSearchParams({ returnTo: bookingConcessionsHref(bookingId) })}`} className="mt-6 inline-flex min-h-11 items-center text-accent">Đăng nhập</Link></>;
  return <OwnedConcessionContent key={`${bookingId}:${session.accessToken}`} id={bookingId} token={session.accessToken} />;
}

function QuantityForm({ label, initial = 1, disabled, action, onSave }: { label: string; initial?: number; disabled: boolean; action: string; onSave: (quantity: number) => void }) {
  const [value, setValue] = useState(String(initial)), [invalid, setInvalid] = useState(false);
  return <form noValidate onSubmit={event => {
    event.preventDefault();
    if (disabled) return;
    const quantity = parseConcessionQuantity(value);
    setInvalid(quantity === null);
    if (quantity !== null) onSave(quantity);
  }} className="mt-4 space-y-3">
    <label className="block text-sm"><span>Số lượng</span><input aria-label={label} aria-invalid={invalid} value={value} disabled={disabled} inputMode="numeric" onChange={event => { setValue(event.target.value); setInvalid(false); }} className="mt-2 min-h-11 w-full rounded-lg border border-outline bg-panel-low px-3 text-foreground disabled:opacity-50" /></label>
    {invalid && <p role="alert" className="text-sm text-error">Số lượng phải là số nguyên từ 1 đến 2147483647. Dùng Xóa món để bỏ món khỏi đơn.</p>}
    <Button type="submit" disabled={disabled} className="w-full">{action}</Button>
  </form>;
}

function CatalogImage({ url, name }: { url: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  // Images are optional supplied references, never a fabricated product photo.
  const safe = url && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url));
  return <div className="relative flex aspect-[4/3] items-center justify-center bg-panel-high text-muted">{safe && !failed ? <Image src={url} alt={name} fill unoptimized sizes="(max-width: 639px) 100vw, 320px" onError={() => setFailed(true)} className="object-cover" /> : <Icon name="gift" width={42} height={42} />}</div>;
}

function OwnedConcessionContent({ id, token }: { id: string; token: string }) {
  const state = useConcessionComposition(id, token), { booking, now, busy, confirmed, error, catalog, catalogError, reviewRequired } = state;
  const { clearSession } = useAuth();
  const [category, setCategory] = useState<ConcessionCategory | "ALL">("ALL");
  const signIn = <Link onClick={clearSession} href={`/login?${new URLSearchParams({ returnTo: bookingConcessionsHref(id) })}`} className="mt-4 inline-flex min-h-11 items-center text-accent">Đăng nhập lại</Link>;
  if (!booking) return <>{busy ? <p role="status" className="rounded-xl bg-panel p-10 text-center text-muted">Đang tải đơn đặt vé…</p> : <MovieFeedback title={error?.status === 404 ? "Đơn đặt vé không khả dụng" : "Không thể tải bắp nước của đơn đặt vé"} message={error?.message ?? "Chưa thể xác nhận đơn đặt vé từ máy chủ."} retry={error && ![400, 401, 403, 404].includes(error.status) ? () => void state.refresh() : undefined} />}{error?.status === 401 && signIn}<Link href={bookingSummaryHref(id)} className="mt-6 inline-flex min-h-11 items-center text-accent">Về thông tin đặt vé</Link></>;
  const readOnlyReason = concessionEditability(booking, now), disabled = busy || !confirmed || reviewRequired || !!readOnlyReason;
  const seconds = Math.max(0, Math.ceil((Date.parse(booking.expiresAt) - now) / 1000));
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const items = catalog?.filter(item => category === "ALL" || category === item.category);
  return <>
    <nav aria-label="Tiến trình đặt vé" className="mb-6 flex flex-wrap items-center gap-3 text-xs uppercase text-muted"><Link href={bookingSummaryHref(id)} className="inline-flex min-h-11 items-center text-accent">Thông tin đặt vé</Link><span aria-hidden="true">→</span><span aria-current="step">Bắp nước</span></nav>
    <h1 className="text-3xl font-bold sm:text-4xl">Bắp nước</h1><p className="mt-3 text-muted">{readOnlyReason ? "Bắp nước đã lưu được đọc từ máy chủ. Đơn này không còn cho phép chỉnh sửa." : "Chọn món cho buổi xem phim. Mỗi thao tác lưu sẽ cập nhật đơn đặt vé trên máy chủ."}</p>
    <section aria-label="Đơn đặt vé đang chỉnh sửa" className="my-6 rounded-2xl border border-outline/40 bg-panel p-5"><h2 className="break-words text-xl font-bold">{booking.movieTitle}</h2><p className="mt-2 break-words text-sm">{booking.cinemaName} · {booking.hallName}</p><p className="mt-2 break-all text-sm text-accent">{booking.bookingCode} · {displayLabel(booking.status)}</p><p className="mt-2 text-sm text-muted">{booking.seatUnitCount} ghế · {booking.guestCount} khách</p></section>
    {busy && <p role="status" className="mb-4 text-muted">Đang xác nhận dữ liệu từ máy chủ…</p>}
    {state.notice && <p role="status" className="mb-4 rounded-xl bg-panel p-4 text-sm text-success">{state.notice}</p>}
    {error && <div role="alert" className="mb-4 rounded-xl border border-error bg-panel p-5"><p className="text-sm text-error">{error.message}</p><Button variant="secondary" disabled={busy} onClick={() => void state.refresh()} className="mt-3">Tải lại đơn và thực đơn</Button></div>}
    {reviewRequired && <section role="alert" className="mb-6 rounded-xl border border-outline bg-panel p-5"><h2 className="font-bold">Cần kiểm tra kết quả lưu</h2><p className="mt-2 text-sm leading-6 text-muted">Yêu cầu vừa gửi có thể đã được lưu. Xem các món đã lưu bên dưới trước khi thao tác tiếp. Thêm lại một món sẽ tạo dòng mới; hệ thống không tự gửi lại yêu cầu.</p><Button disabled={busy || !confirmed} onClick={state.acknowledgeReview} className="mt-4">Đã xem dữ liệu máy chủ, tiếp tục chỉnh sửa</Button></section>}
    {readOnlyReason && <p role="status" className="mb-6 rounded-xl border border-outline bg-panel p-5 text-sm text-muted">{readOnlyReason}</p>}
    {!confirmed && !busy && <p role="status" className="mb-6 text-sm text-muted">Đang hiển thị lần xác nhận gần nhất. Cần tải lại đơn thành công trước khi chỉnh sửa.</p>}
    <section aria-label="Khuyến mãi trong đơn đang chỉnh sửa" className="mb-6 rounded-xl border border-outline/30 bg-panel p-5 text-sm"><p className="break-all">{booking.promotion ? `Khuyến mãi đã lưu: ${booking.promotion.code}` : "Chưa áp dụng khuyến mãi."}</p><p className="mt-2">Giảm giá đã lưu: <span className="font-heading tabular-nums">{formatBookingAmount(booking.discount)}</span></p><p className="mt-2 text-xs leading-6 text-muted">Máy chủ kiểm tra lại khuyến mãi khi lưu bắp nước. Nếu mã không còn hợp lệ, thao tác có thể bị từ chối; hãy về thông tin đặt vé để xóa hoặc thay mã.</p></section>
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        <section aria-label="Bắp nước đã lưu" className="rounded-2xl border border-outline/30 bg-panel p-5 sm:p-6"><h2 className="text-xl font-bold">Món đã lưu trong đơn</h2>{booking.concessions.length ? <ul className="mt-4 space-y-4">{booking.concessions.map(line => <li key={line.id} aria-label={`Dòng bắp nước ${line.id}`} className="rounded-xl border border-outline/40 bg-panel-low p-4">
          <h3 className="break-words font-bold">{line.name} × {line.quantity}</h3><p className="mt-2 text-sm text-muted">{CONCESSION_CATEGORY_LABELS[line.category]} · Mã dòng: {line.id}</p><p className="mt-2 text-sm">Đơn giá đã lưu: {formatBookingAmount(line.unitPrice)}</p><p className="mt-2 break-all text-sm text-accent">Thành tiền: {formatBookingAmount(line.totalPrice)}</p>
          {catalog && !catalog.some(item => item.id === line.itemId) && <p className="mt-2 text-xs leading-6 text-muted">Món này không có trong thực đơn hiện tại. Dòng đã lưu vẫn giữ nguyên tên và giá; có thể đổi số lượng hoặc xóa khi đơn còn cho phép.</p>}
          {!readOnlyReason && <><QuantityForm key={`${line.id}:${line.quantity}`} initial={line.quantity} label={`Số lượng dòng ${line.id}`} disabled={disabled} action="Lưu số lượng" onSave={quantity => void state.mutate({ operation: "UPDATE", lineId: line.id, quantity })} /><Button variant="text" disabled={disabled} onClick={() => void state.mutate({ operation: "REMOVE", lineId: line.id })} className="mt-2 w-full">Xóa món</Button></>}
        </li>)}</ul> : <p className="mt-3 text-sm text-muted">Đơn đặt vé này chưa có bắp nước. Bạn có thể giữ nguyên đơn không kèm món.</p>}<p className="mt-4 text-xs leading-6 text-muted">Tên, loại món, đơn giá và thành tiền lấy từ dòng đã lưu. Giá trong thực đơn không thay đổi giá của dòng này.</p></section>
        <section aria-label="Thực đơn bắp nước từ máy chủ"><h2 className="text-xl font-bold">Thực đơn bắp nước</h2><p className="mt-2 text-sm text-muted">Thực đơn chung của hệ thống, chỉ gồm món đang mở bán; không thể hiện tồn kho tại từng rạp.</p>
          <div role="group" aria-label="Danh mục bắp nước" className="my-5 flex flex-wrap gap-2">{(["ALL", "POPCORN", "DRINK", "COMBO"] as const).map(value => <Button key={value} variant={category === value ? "primary" : "secondary"} aria-pressed={category === value} onClick={() => setCategory(value)}>{value === "ALL" ? "Tất cả" : CONCESSION_CATEGORY_LABELS[value]}</Button>)}</div>
          {catalogError && <MovieFeedback title="Không thể tải thực đơn" message={catalogError.message} retry={() => void state.refresh()} />}
          {catalog?.length === 0 && <p role="status" className="rounded-xl bg-panel p-5 text-muted">Chưa có bắp nước đang mở bán. Các món đã lưu vẫn giữ nguyên.</p>}
          {catalog && catalog.length > 0 && items?.length === 0 && <p role="status" className="text-muted">Danh mục này chưa có món đang mở bán.</p>}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items?.map(item => <article key={item.id} aria-label={`Món ${item.id}`} className="overflow-hidden rounded-2xl border border-outline/30 bg-panel"><CatalogImage key={item.imageUrl} url={item.imageUrl} name={item.name} /><div className="p-4"><h3 className="break-words font-bold">{item.name}</h3><p className="mt-2 text-xs text-muted">{CONCESSION_CATEGORY_LABELS[item.category]} · Mã món: {item.id}</p>{item.description && <p className="mt-2 break-words text-sm leading-6 text-muted">{item.description}</p>}<p className="mt-3 break-all font-heading text-sm text-accent">Đơn giá hiện tại: {formatBookingAmount(item.sellingPrice)}</p>{!readOnlyReason && <QuantityForm label={`Số lượng món ${item.id}`} disabled={disabled || !!catalogError} action="Thêm món" onSave={quantity => void state.mutate({ operation: "ADD", itemId: item.id, quantity })} />}</div></article>)}</div>
        </section>
      </div>
      <aside aria-label="Tổng tiền đặt vé từ máy chủ" className="rounded-2xl border border-outline/50 bg-panel p-5 lg:sticky lg:top-24"><h2 className="text-xl font-bold">Thông tin thanh toán</h2><dl className="mt-6 space-y-4 text-sm">{[["Tiền vé", booking.seatAmount], ["Tiền bắp nước", booking.concessionAmount], ["Tạm tính", booking.subtotal], ["Giảm giá khuyến mãi", booking.discount], ["Tổng thanh toán", booking.finalAmount]].map(([name, amount]) => <div key={name} className="flex flex-wrap justify-between gap-2"><dt>{name}</dt><dd className="break-all font-heading tabular-nums">{formatBookingAmount(amount)}</dd></div>)}</dl><p className="mt-4 text-xs leading-6 text-muted">Số tiền từ máy chủ, không tính theo số lượng chưa lưu. Khuyến mãi đã có chỉ được xem.</p><div className="mt-6 rounded-lg border border-outline/40 bg-panel-low p-4"><p className="text-sm font-semibold text-accent">Hạn thanh toán từ máy chủ</p><p role="timer" aria-label="Thời gian thanh toán còn lại" className="mt-2 font-heading text-2xl tabular-nums">{booking.status === "PENDING" ? countdown : "Đã đóng"}</p><time dateTime={booking.expiresAt} className="mt-2 block break-all text-xs text-muted">{formatUtcInstant(booking.expiresAt)}</time><p className="mt-2 text-xs leading-6 text-muted">Thêm, đổi số lượng, xóa món hoặc tải lại đều không gia hạn đặt vé.</p></div><Button variant="secondary" disabled={busy} onClick={() => void state.refresh()} className="mt-5 w-full">Cập nhật dữ liệu</Button><Link href={bookingSummaryHref(id)} className="mt-3 inline-flex min-h-11 w-full items-center justify-center text-accent">Về thông tin đặt vé</Link><p className="mt-3 text-xs leading-6 text-muted">Chưa tích hợp thanh toán, tạo vé hoặc mã QR trong bước này.</p></aside>
    </div>
  </>;
}
