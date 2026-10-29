"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";
import { useManager } from "@/features/manager/manager-shell";
import { getManagerBookings, managerBookingQuery } from "@/features/manager/manager-booking-api";
import { BOOKING_LABELS, PAYMENT_LABELS, managerBookingDate, managerBookingDays, managerBookingMoney, managerBookingPreset } from "@/features/manager/manager-booking-service";
import type { ManagerBookingItem } from "@/features/manager/manager-booking.types";
import { BookingBadge, BookingIcon, BookingReadState, managerBookingStyles as styles } from "@/features/manager/manager-booking-ui";
import { useMovieRequest } from "@/features/movie/use-movie-request";

function tone(status: string) { return status === "PAID" ? "success" : status === "PENDING" ? "pending" : status === "CANCELLED" ? "error" : "neutral"; }
const href = (id: string) => `/manager/bookings/${id}`;
const localDay = (value: string | null) => value ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)) : "";
export function ManagerBookingListScreen({ queryString }: { queryString: string }) {
  let query: URLSearchParams;
  try { query = managerBookingQuery(queryString); }
  catch { return <div className={styles.feedback} role="alert"><h1>Bộ lọc chưa hợp lệ</h1><p>Kiểm tra mã, trạng thái và khoảng thời gian.</p><Link className={styles.secondaryButton} href="/manager/bookings">Đặt lại bộ lọc</Link></div>; }
  return <BookingList key={queryString} queryString={query.toString()} />;
}
function BookingList({ queryString }: { queryString: string }) {
  const { accessToken, cinemas } = useManager(), router = useRouter();
  const query = new URLSearchParams(queryString);
  const load = useCallback((signal: AbortSignal) => getManagerBookings(accessToken, queryString, signal), [accessToken, queryString]);
  const result = useMovieRequest(load);
  const [validation, setValidation] = useState("");
  const [more, setMore] = useState(false);
  const [period, setPeriod] = useState(query.has("createdFrom") || query.has("createdTo") ? "custom" : "all");
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setValidation("");
    const form = new FormData(event.currentTarget), next = new URLSearchParams();
    for (const key of ["cinemaId", "status", "paymentStatus", "showtimeId", "size"]) {
      const value = String(form.get(key) ?? ""); if (value) next.set(key, value);
    }
    const term = String(form.get("search") ?? "").trim();
    if (term) next.set(form.get("searchBy") === "id" ? "bookingId" : "bookingCode", term);
    const dates = period === "custom" ? managerBookingDays(String(form.get("from") ?? ""), String(form.get("through") ?? "")) : managerBookingPreset(period);
    if (!dates) { setValidation("Chọn khoảng ngày hợp lệ; ngày kết thúc phải từ ngày bắt đầu trở đi."); return; }
    for (const [key, value] of Object.entries(dates)) if (value) next.set(key, value);
    try { managerBookingQuery(next); router.push(`/manager/bookings${next.size ? `?${next}` : ""}`); }
    catch { setValidation("Mã đặt vé, ID hoặc bộ lọc chưa hợp lệ. ID chỉ gồm chữ số và lớn hơn 0."); }
  }
  function page(value: number) { const next = new URLSearchParams(query); next.set("page", String(value)); router.push(`/manager/bookings?${next}`); }
  const data = result.data;
  const context = cinemas.find(c => c.id === query.get("cinemaId"))?.name ?? (cinemas.length === 1 ? cinemas[0].name : "Các rạp được phân công");
  const lastDay = query.get("createdTo") ? localDay(new Date(Date.parse(query.get("createdTo")!) - 1).toISOString()) : "";
  return <section className={styles.list}>
    <div className={styles.pageHeading}><div><nav className={styles.breadcrumb} aria-label="Đường dẫn"><span>VẬN HÀNH RẠP</span><span>/</span><span>QUẢN LÝ ĐẶT VÉ</span></nav><h1>Quản lý đặt vé</h1><p>Tra cứu và theo dõi các đơn đặt vé tại các rạp được phân công.</p></div><div className={styles.contextChip}><BookingIcon name="theaters" />{context}</div></div>
    {data && <div className={styles.summary} aria-label="Tóm tắt kết quả"><Summary label="Kết quả phù hợp" value={data.totalElements} icon="confirmation_number" /><Summary label="Đã thanh toán · trang này" value={data.items.filter(b => b.status === "PAID").length} icon="check_circle" /><Summary label="Chờ thanh toán · trang này" value={data.items.filter(b => b.status === "PENDING").length} icon="hourglass_top" /></div>}
    <form className={styles.filters} onSubmit={search} aria-label="Tìm đặt vé">
      <div className={styles.filterRow}><label className={styles.searchField}><span className="sr-only">Tìm mã đặt vé hoặc ID</span><BookingIcon name="search" /><input className={styles.control} type="search" name="search" defaultValue={query.get("bookingCode") ?? query.get("bookingId") ?? ""} placeholder="Tìm theo mã đặt vé…" maxLength={40} /></label>
        <label className={styles.selectField}><span className="sr-only">Trạng thái đặt vé</span><select aria-label="Trạng thái đặt vé" className={styles.control} name="status" defaultValue={query.get("status") ?? ""}><option value="">Tất cả trạng thái</option>{Object.entries(BOOKING_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className={styles.selectField}><span className="sr-only">Thời gian tạo đơn</span><select aria-label="Thời gian tạo đơn" className={styles.control} value={period} onChange={e => setPeriod(e.target.value)}><option value="all">Tất cả thời gian</option><option value="today">Hôm nay</option><option value="yesterday">Hôm qua</option><option value="week">7 ngày gần đây</option><option value="custom">Tùy chọn ngày…</option></select></label>
        <div className={styles.actions}><button className={styles.primaryButton} type="submit"><BookingIcon name="search" />Tìm kiếm</button><Link href="/manager/bookings" className={styles.iconButton} aria-label="Đặt lại bộ lọc" onClick={event => { event.currentTarget.closest("form")?.reset(); setPeriod("all"); setMore(false); setValidation(""); }}><BookingIcon name="restart_alt" /></Link><button type="button" className={styles.iconButton} aria-label="Bộ lọc khác" aria-expanded={more} aria-controls="booking-extra-filters" onClick={() => setMore(value => !value)}><BookingIcon name="tune" /></button></div></div>
      {period === "custom" && <div className={styles.extraFilterGrid}><label>Tạo từ ngày<input className={styles.control} type="date" name="from" defaultValue={localDay(query.get("createdFrom"))} /></label><label>Đến hết ngày<input className={styles.control} type="date" name="through" defaultValue={lastDay} /></label><p className={styles.note}>Theo giờ Việt Nam.</p></div>}
      <div id="booking-extra-filters" hidden={!more} className={styles.extraFilterGrid}><label>Tìm theo<select aria-label="Tìm theo" name="searchBy" className={styles.control} defaultValue={query.has("bookingId") ? "id" : "code"}><option value="code">Mã đặt vé chính xác</option><option value="id">ID đặt vé</option></select></label><label>Rạp chiếu phim<select aria-label="Rạp chiếu phim" className={styles.control} name="cinemaId" defaultValue={query.get("cinemaId") ?? ""}><option value="">Tất cả rạp được phân công</option>{cinemas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Thanh toán gần nhất<select aria-label="Thanh toán gần nhất" className={styles.control} name="paymentStatus" defaultValue={query.get("paymentStatus") ?? ""}><option value="">Tất cả thanh toán</option>{Object.entries(PAYMENT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>ID suất chiếu<input className={styles.control} name="showtimeId" inputMode="numeric" defaultValue={query.get("showtimeId") ?? ""} /></label><label>Số đơn mỗi trang<select aria-label="Số đơn mỗi trang" name="size" className={styles.control} defaultValue={query.get("size") ?? "20"}>{[5, 10, 20, 50, 100, ...(![5, 10, 20, 50, 100].includes(Number(query.get("size") ?? 20)) ? [Number(query.get("size"))] : [])].map(n => <option key={n} value={n}>{n}</option>)}</select></label></div>
      {validation && <p className={styles.fieldError} role="alert">{validation}</p>}
    </form>
    {result.loading || result.error ? <BookingReadState {...result} /> : data && <>
      <div className={styles.tablePanel}>{!data.items.length ? <div className={styles.feedback} role="status"><BookingIcon name="confirmation_number" /><h2>Không có đơn đặt vé</h2><p>Không tìm thấy đơn phù hợp với bộ lọc trong các rạp được phân công.</p></div> : <>
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Danh sách đặt vé"><table className={styles.table}><caption className="sr-only">Đặt vé trong phạm vi được phân công</caption><thead><tr>{["Mã đặt vé", "Phim / Suất chiếu", "Rạp & Phòng", "Trạng thái", "Tổng tiền", "Thao tác"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{data.items.map(b => <BookingRow key={b.id} booking={b} />)}</tbody></table></div>
        <div className={styles.mobileCards}>{data.items.map(b => <article key={b.id} className={styles.mobileCard}><div><span className={styles.bookingCode}>{b.bookingCode}</span><BookingBadge tone={tone(b.status)}>{BOOKING_LABELS[b.status]}</BookingBadge></div><h2>{b.movieTitle}</h2><p>{managerBookingDate(b.startsAt)} · {b.seatUnitCount} ghế</p><p>{b.cinemaName} · {b.hallName}</p><div><span className={styles.amount}>{managerBookingMoney(b.finalAmount)}</span><Link className={styles.secondaryButton} href={href(b.id)}>Xem chi tiết<BookingIcon name="chevron_right" /></Link></div></article>)}</div></>}
        <div className={styles.pagination}><p>Hiển thị {data.items.length} trên {data.totalElements} đơn{data.totalPages > 0 ? ` (Trang ${data.page + 1} / ${data.totalPages})` : ""}</p><div aria-label="Phân trang"><button type="button" className={styles.pageButton} disabled={data.page === 0} aria-label="Trang trước" onClick={() => page(data.page - 1)}><BookingIcon name="chevron_left" /></button>{Array.from({ length: Math.min(data.totalPages, 3) }, (_, i) => Math.min(Math.max(data.page - 1, 0), Math.max(data.totalPages - 3, 0)) + i).map(n => <button type="button" key={n} className={styles.pageButton} aria-label={`Trang ${n + 1}`} aria-current={n === data.page ? "page" : undefined} onClick={() => page(n)}>{n + 1}</button>)}<button type="button" className={styles.pageButton} disabled={data.page + 1 >= data.totalPages} aria-label="Trang sau" onClick={() => page(data.page + 1)}><BookingIcon name="chevron_right" /></button></div></div>
      </div><div className={styles.pageHeading}><p className={styles.resultTime}>Cập nhật {managerBookingDate(data.serverTime)} · Giờ Việt Nam</p><button className={styles.secondaryButton} type="button" onClick={result.retry}>Tải lại danh sách</button></div>
    </>}
  </section>;
}
function Summary({ label, value, icon }: { label: string; value: number; icon: string }) {
  return <div className={styles.summaryCard}><div><small>{label}</small><strong>{value}</strong></div><BookingIcon name={icon} /></div>;
}
function BookingRow({ booking: b }: { booking: ManagerBookingItem }) {
  return <tr className={b.status === "CANCELLED" ? styles.cancelled : undefined}><td><span className={styles.bookingCode}>{b.bookingCode}</span></td><td><strong>{b.movieTitle}</strong><small>{managerBookingDate(b.startsAt)} · {b.seatUnitCount} ghế</small></td><td>{b.cinemaName}<small>{b.hallName}</small></td><td><BookingBadge tone={tone(b.status)}>{BOOKING_LABELS[b.status]}</BookingBadge></td><td><span className={styles.amount}>{managerBookingMoney(b.finalAmount)}</span></td><td><Link className={styles.secondaryButton} href={href(b.id)}>Xem chi tiết<BookingIcon name="chevron_right" /></Link></td></tr>;
}
