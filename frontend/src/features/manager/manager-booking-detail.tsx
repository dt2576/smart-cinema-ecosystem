"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { isOperationId } from "@/features/manager/manager-api";
import { getManagerBooking } from "@/features/manager/manager-booking-api";
import { useManager } from "@/features/manager/manager-shell";
import { BOOKING_LABELS, PAYMENT_LABELS, managerBookingDate, managerBookingMoney } from "@/features/manager/manager-booking-service";
import { BookingBadge, BookingIcon, BookingPanel, BookingReadState, managerBookingStyles as styles } from "@/features/manager/manager-booking-ui";
import { useMovieRequest } from "@/features/movie/use-movie-request";

export function ManagerBookingDetailScreen({ bookingId }: { bookingId: string }) {
  const { accessToken } = useManager();
  if (!isOperationId(bookingId)) return <div className={styles.feedback} role="alert"><h1>Mã đặt vé chưa hợp lệ</h1><Link className={styles.secondaryButton} href="/manager/bookings">Quay lại danh sách</Link></div>;
  return <BookingDetail key={`${accessToken}:${bookingId}`} bookingId={bookingId} />;
}
function BookingDetail({ bookingId }: { bookingId: string }) {
  const { accessToken } = useManager();
  const load = useCallback((signal: AbortSignal) => getManagerBooking(accessToken, bookingId, signal), [accessToken, bookingId]);
  const result = useMovieRequest(load), [copy, setCopy] = useState("");
  const d = result.data, b = d?.booking;
  async function copyCode() {
    if (!b) return;
    try { await navigator.clipboard.writeText(b.bookingCode); setCopy("Đã sao chép mã đặt vé."); }
    catch { setCopy("Chưa sao chép được. Bạn có thể chọn mã đặt vé để sao chép."); }
  }
  const paymentAmount = (amount: string, currency: string | null) => currency === "VND" ? managerBookingMoney(amount) : `${amount}${currency ? ` ${currency}` : ""}`;
  return <section className={styles.detail}>
    <div className={styles.pageHeading}><div><nav className={styles.breadcrumb} aria-label="Đường dẫn"><Link href="/manager/bookings">Quản lý đặt vé</Link><BookingIcon name="chevron_right" /><span>Chi tiết đơn đặt vé</span></nav><div className={styles.titleLine}><h1>{b ? `Đơn đặt vé #${b.bookingCode}` : "Chi tiết đơn đặt vé"}</h1>{b && <button type="button" onClick={() => void copyCode()} className={styles.copyCode} aria-label="Sao chép mã đặt vé">#{b.bookingCode}<BookingIcon name="content_copy" /></button>}</div></div><Link className={styles.secondaryButton} href="/manager/bookings"><BookingIcon name="arrow_back" />Quay lại danh sách</Link></div>
    {copy && <p role="status" className={styles.note}>{copy}</p>}
    {result.loading || result.error ? <BookingReadState {...result} /> : d && b && <>
      <div className={styles.statuses}><BookingBadge tone={b.status === "PAID" ? "success" : b.status === "PENDING" ? "pending" : b.status === "CANCELLED" ? "error" : "neutral"}>{BOOKING_LABELS[b.status]}</BookingBadge>{b.latestPayment && <BookingBadge tone={b.latestPayment.reconciliationRequired ? "pending" : "neutral"}>{b.latestPayment.reconciliationRequired ? "Cần kiểm tra thanh toán" : `Thanh toán: ${PAYMENT_LABELS[b.latestPayment.status]}`}</BookingBadge>}<time dateTime={b.createdAt}>Tạo lúc {managerBookingDate(b.createdAt)}</time></div>
      <div className={styles.detailGrid}><div className={styles.column}>
        <BookingPanel title="Thông tin suất chiếu" icon="movie"><div className={styles.showtime}><div className={styles.posterPlaceholder} role="img" aria-label="Chưa có ảnh phim"><BookingIcon name="movie" /></div><div><h3>{b.movieTitle}</h3><div className={styles.showtimeGrid}><div><small>Rạp chiếu & Phòng</small><strong>{b.cinemaName}</strong><p>{b.hallName}</p></div><div><small>Thời gian chiếu</small><strong><time dateTime={b.startsAt}>{managerBookingDate(b.startsAt)}</time></strong><p>Giờ Việt Nam</p></div></div></div></div></BookingPanel>
        <BookingPanel title="Ghế đã đặt" icon="event_seat" extra={<BookingBadge>{b.seatUnitCount} ghế · {b.guestCount} khách</BookingBadge>}><div className={styles.seatGrid}>{d.seats.map(s => <div key={s.id} className={styles.lineItem}><div className={styles.lineMain}><span className={styles.seatLabel}>{s.row}{s.number}</span><div><strong>{s.type === "COUPLE" ? "Ghế đôi" : s.type === "VIP" ? "Ghế VIP" : "Ghế thường"}</strong><small>Hàng {s.row} · {s.guestCount} khách</small></div></div><div><small>{s.unitPrice === s.finalPrice ? "Đơn giá" : `Đơn giá ${managerBookingMoney(s.unitPrice)}`}</small><span className={styles.amount}>{managerBookingMoney(s.finalPrice)}</span></div></div>)}</div>{!d.seats.length && <p className={styles.note}>Chưa có thông tin ghế.</p>}<div className={styles.subTotal}><span>Tổng cộng tiền ghế</span><span className={styles.amount}>{managerBookingMoney(d.amounts.seatAmount)}</span></div></BookingPanel>
        <BookingPanel title="Bắp nước" icon="fastfood" extra={<span className={styles.note}>{d.concessions.length} mục</span>}>{d.concessions.length ? d.concessions.map(c => <div className={styles.lineItem} key={c.id}><div className={styles.lineMain}><span className={styles.iconBox}><BookingIcon name="fastfood" /></span><div><strong>{c.name}</strong><small>Số lượng: {c.quantity} · Đơn giá {managerBookingMoney(c.unitPrice)}</small></div></div><div><small>Thành tiền</small><span className={styles.amount}>{managerBookingMoney(c.totalPrice)}</span></div></div>) : <p className={styles.note}>Đơn đặt vé không có bắp nước.</p>}</BookingPanel>
      </div><div className={styles.column}>
        <BookingPanel title="Thanh toán" icon="account_balance_wallet"><dl className={styles.amountList}>{[["Tiền vé", d.amounts.seatAmount], ["Tiền bắp nước", d.amounts.concessionAmount]].map(([label, amount]) => <div key={label}><dt>{label}</dt><dd className={styles.amount}>{managerBookingMoney(amount)}</dd></div>)}</dl><div className={styles.total}><dl><dt>Tổng cộng</dt><dd>{managerBookingMoney(d.amounts.finalAmount)}</dd></dl><BookingBadge tone={b.status === "PAID" ? "success" : "neutral"}>{BOOKING_LABELS[b.status]}</BookingBadge></div>
          {b.latestPayment ? <><div className={styles.paymentSummary}><small>Cổng thanh toán gần nhất</small><strong>{b.latestPayment.provider ?? "Chưa có thông tin"}</strong></div><div className={styles.paymentSummary}><small>{b.latestPayment.completedAt ? "Thời gian hoàn tất" : "Thời gian khởi tạo"}</small><strong>{managerBookingDate(b.latestPayment.completedAt ?? b.latestPayment.initiatedAt)}</strong></div></> : <p className={styles.note}>Chưa có lần thanh toán.</p>}
          <details className={styles.amountDetails}><summary>Chi tiết số tiền và thanh toán</summary><dl className={styles.amountList}><div><dt>Tạm tính</dt><dd className={styles.amount}>{managerBookingMoney(d.amounts.subtotal)}</dd></div><div><dt>Giảm giá</dt><dd className={styles.amount}>{managerBookingMoney(d.amounts.discount)}</dd></div></dl><div className={styles.paymentRows}>{d.payments.map(p => <div key={p.id} className={styles.paymentRow}><strong>Thanh toán #{p.id}</strong><BookingBadge tone={p.reconciliationRequired ? "pending" : p.status === "SUCCESS" ? "success" : ["FAILED", "CANCELLED"].includes(p.status) ? "error" : "pending"}>{PAYMENT_LABELS[p.status]}</BookingBadge>{p.reconciliationRequired && <p>Cần kiểm tra thanh toán.</p>}<span className={styles.amount}>{paymentAmount(p.amount, p.currency)}</span><p>{p.provider ?? "Chưa có thông tin cổng thanh toán"}</p><p>Khởi tạo {managerBookingDate(p.initiatedAt)}</p>{p.completedAt && <p>Hoàn tất {managerBookingDate(p.completedAt)}</p>}</div>)}</div></details>
        </BookingPanel>
        <BookingPanel title="Vé đã phát hành" icon="confirmation_number" extra={<BookingBadge>{d.tickets.length} vé</BookingBadge>}>{d.tickets.length ? d.tickets.map(t => {
          const seat = d.seats.find(s => s.id === t.bookingSeatId)!;
          return <div key={t.id} className={styles.ticketRow}><div><div className={styles.lineMain}><span className={styles.seatLabel}>{seat.row}{seat.number}</span><div><strong>Vé ghế {seat.row}{seat.number}</strong><p>ID vé: {t.id}</p></div></div><BookingBadge tone={t.status === "VALID" || t.status === "CHECKED_IN" ? "success" : "neutral"}>{{ VALID: "Hợp lệ", CHECKED_IN: "Đã soát vé", EXPIRED: "Đã hết hạn", CANCELLED: "Đã hủy" }[t.status]}</BookingBadge></div></div>;
        }) : <p className={styles.note}>Chưa có vé được phát hành.</p>}</BookingPanel>
      </div></div><details className={styles.bookingDetails}><summary>Thông tin đặt vé</summary><dl className={styles.showtimeGrid}><div><small>ID đặt vé</small><strong>{b.id}</strong></div><div><small>Hạn đặt vé ban đầu</small><strong>{managerBookingDate(b.expiresAt)}</strong></div><div><small>Bắt đầu thanh toán</small><strong>{b.paymentStartedAt ? managerBookingDate(b.paymentStartedAt) : "Chưa bắt đầu"}</strong></div><div><small>Ghi nhận đã thanh toán</small><strong>{b.paidAt ? managerBookingDate(b.paidAt) : "Chưa ghi nhận"}</strong></div>{d.tickets.map(t => <div key={t.id}><small>Vé #{t.id}</small><strong>Phát hành {managerBookingDate(t.issuedAt)}</strong>{t.checkedInAt && <p>Soát vé {managerBookingDate(t.checkedInAt)}</p>}</div>)}</dl></details><div className={styles.pageHeading}><p className={styles.resultTime}>Cập nhật {managerBookingDate(d.serverTime)} · Giờ Việt Nam</p><button className={styles.secondaryButton} type="button" onClick={result.retry}>Tải lại thông tin</button></div>
    </>}
  </section>;
}
