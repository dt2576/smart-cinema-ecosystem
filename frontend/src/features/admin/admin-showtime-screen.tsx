"use client";
import { formatLocalDateTime } from "@/lib/display-format";

import { localizeInvalidField, clearFieldValidation } from "@/components/ui/native-validation";
import Link from "next/link";
import { displayLabel } from "@/lib/display-labels";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/features/admin/admin-shell";
import { getAdminShowtimes, getAdminShowtime, saveAdminShowtime, getAdminMovies, getAdminCinemas, getAdminHalls } from "@/features/admin/admin-api";
import { SHOWTIME_STATUSES, showtimeLocalInput, showtimeLocalInstant, validShowtimePrice, type AdminShowtime, type ShowtimeStatus } from "@/features/admin/admin-showtime.types";
import type { AdminCinema } from "@/features/admin/admin-configuration.types";
import { useMovieRequest } from "@/features/movie/use-movie-request";

const INPUT = "mt-1 min-h-11 w-full rounded-lg border border-outline/50 bg-panel px-3 py-2 disabled:opacity-60";
const LINK = "text-accent underline underline-offset-4";
function Feedback({ loading, error, retry }: { loading: boolean; error?: Error; retry: () => void }) {
  if (loading) return <p role="status">Đang tải suất chiếu…</p>;
  return <div className="space-y-3"><p role="alert">{error?.message}</p><Button onClick={retry}>Thử lại</Button></div>;
}

export function AdminShowtimeList() {
  const { accessToken } = useAdmin();
  const [filters, setFilters] = useState({ date: "", movieId: "", cinemaId: "", hallId: "", status: "" });
  const [query, setQuery] = useState("");
  const load = useCallback((signal: AbortSignal) => getAdminShowtimes(accessToken, query, signal), [accessToken, query]);
  const result = useMovieRequest(load);
  function filter(event: FormEvent) { event.preventDefault(); setQuery(new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()); }
  return <section className="space-y-6"><h1 className="text-3xl font-bold">Quản lý suất chiếu</h1><Link href="/admin/showtimes/new" className={LINK}>Thêm suất chiếu</Link>
    <p className="text-muted">Múi giờ: {result.data?.timeZone ?? "Đang tải múi giờ cấu hình…"}. Máy chủ kiểm tra ghế và điều kiện hợp lệ của lịch chiếu.</p>
    <form onInvalidCapture={localizeInvalidField} onInputCapture={clearFieldValidation} onChangeCapture={clearFieldValidation} onSubmit={filter} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label>Ngày<input type="date" className={INPUT} value={filters.date} onChange={event => setFilters({ ...filters, date: event.target.value })} /></label>
      {(["movieId", "cinemaId", "hallId"] as const).map(key => <label key={key}>{key === "movieId" ? "Mã phim" : key === "cinemaId" ? "Mã rạp" : "Mã phòng chiếu"}<input className={INPUT} inputMode="numeric" pattern="[1-9][0-9]*" value={filters[key]} onChange={event => setFilters({ ...filters, [key]: event.target.value })} /></label>)}
      <label>Trạng thái<select className={INPUT} value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })}><option value="">Tất cả trạng thái</option>{SHOWTIME_STATUSES.map(value => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></label>
      <div className="flex items-end gap-2"><Button type="submit">Áp dụng bộ lọc</Button><Button variant="secondary" onClick={() => { setFilters({ date: "", movieId: "", cinemaId: "", hallId: "", status: "" }); setQuery(""); }}>Xóa</Button></div>
    </form>
    {result.loading || result.error ? <Feedback {...result} /> : !result.data?.items.length ? <p role="status">Không có suất chiếu phù hợp với bộ lọc.</p> : <div className="grid gap-4">{result.data.items.map(item => <article key={item.id} className="min-w-0 space-y-3 rounded-xl border border-outline/40 bg-panel p-5"><h2 className="break-words text-xl font-semibold">{item.movieTitle}</h2><p>{item.cinemaName} · {item.hallName}</p><p>{formatLocalDateTime(showtimeLocalInput(item.startsAt, result.data!.timeZone))} · {result.data!.timeZone}</p><p className="break-words">Giá cơ bản: <span className="font-mono">{item.basePrice}</span> · {displayLabel(item.status)}</p><Link className={LINK} href={`/admin/showtimes/${item.id}/edit`}>{item.editable ? "Chỉnh sửa suất chiếu" : "Xem suất chiếu"}</Link></article>)}</div>}
  </section>;
}

async function publishedMovies(token: string, signal: AbortSignal) {
  const items: { id: string; title: string; status: string }[] = [];
  for (let page = 0; ; page++) {
    const result = await getAdminMovies(token, `size=100&page=${page}&sort=title,asc`, signal);
    items.push(...result.items.filter(movie => movie.status === "PUBLISHED"));
    if (page + 1 >= result.totalPages) return items;
  }
}
export function AdminShowtimeEditor({ showtimeId }: { showtimeId?: string }) {
  const { accessToken } = useAdmin();
  const load = useCallback(async (signal: AbortSignal) => {
    const [schedule, movies, cinemas] = await Promise.all([showtimeId ? getAdminShowtime(accessToken, showtimeId, signal) : getAdminShowtimes(accessToken, "", signal), publishedMovies(accessToken, signal), getAdminCinemas(accessToken, signal)]);
    return { timeZone: schedule.timeZone, initial: "showtime" in schedule ? schedule.showtime : undefined, movies, cinemas };
  }, [accessToken, showtimeId]);
  const result = useMovieRequest(load);
  return <section className="space-y-6"><Link className={LINK} href="/admin/showtimes">← Suất chiếu</Link><h1 className="text-3xl font-bold">{showtimeId ? "Chỉnh sửa suất chiếu" : "Thêm suất chiếu"}</h1>
    {result.loading || result.error ? <Feedback {...result} /> : result.data && <ShowtimeForm key={showtimeId} {...result.data} />}
  </section>;
}
function ShowtimeForm({ timeZone, initial, movies, cinemas }: { timeZone: string; initial?: AdminShowtime; movies: { id: string; title: string }[]; cinemas: AdminCinema[] }) {
  const { accessToken, reportError } = useAdmin();
  const [current, setCurrent] = useState(initial);
  const [movieId, setMovieId] = useState(initial?.movieId ?? "");
  const [cinemaId, setCinemaId] = useState(initial?.cinemaId ?? "");
  const [hallId, setHallId] = useState(initial?.hallId ?? "");
  const originalLocal = initial ? showtimeLocalInput(initial.startsAt, timeZone) : "";
  const [date, setDate] = useState(originalLocal.split("T")[0]);
  const [time, setTime] = useState(originalLocal.split("T")[1] ?? "");
  const [price, setPrice] = useState(initial?.basePrice ?? "");
  const [status, setStatus] = useState<ShowtimeStatus>(initial?.status ?? "DRAFT");
  const [busy, setBusy] = useState(false); const submitting = useRef(false);
  const [error, setError] = useState<string>(); const [saved, setSaved] = useState(false);
  const load = useCallback((signal: AbortSignal) => cinemaId ? getAdminHalls(accessToken, cinemaId, signal) : Promise.resolve([]), [accessToken, cinemaId]);
  const halls = useMovieRequest(load);
  const editable = !current || current.editable;
  const choices: ShowtimeStatus[] = current ? [current.status, ...current.transitions] : ["DRAFT", "SCHEDULED", "OPEN_FOR_BOOKING"];
  async function submit(event: FormEvent) {
    event.preventDefault(); if (submitting.current || !editable) return;
    submitting.current = true; setBusy(true); setError(undefined); setSaved(false);
    try {
      const cancel = status === "CANCELLED" && current;
      if (!cancel && !validShowtimePrice(price)) throw new Error("Giá cơ bản phải là số thập phân không âm, tối đa bốn chữ số sau dấu thập phân.");
      const local = `${date}T${time}`;
      const startsAt = cancel ? current.startsAt : current && local === showtimeLocalInput(current.startsAt, timeZone) ? current.startsAt : showtimeLocalInstant(local, timeZone);
      const result = await saveAdminShowtime(accessToken, current?.id, { movieId: cancel ? current.movieId : movieId, hallId: cancel ? current.hallId : hallId, startsAt, basePrice: cancel ? current.basePrice : price, status });
      setCurrent(result.showtime); setSaved(true);
    } catch (cause) { reportError(cause); setError(cause instanceof Error ? cause.message : "Không thể lưu suất chiếu."); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <form onInvalidCapture={localizeInvalidField} onInputCapture={clearFieldValidation} onChangeCapture={clearFieldValidation} onSubmit={submit} className="max-w-3xl space-y-5"><p className="text-accent">Múi giờ lịch chiếu: {timeZone}</p><p className="text-sm text-muted">Máy chủ tính theo thời lượng phim, không có thời gian đệm và ngừng đặt vé khi bắt đầu chiếu. Giá được giữ chính xác. Không thể đổi phòng chiếu sau khi tạo.</p>
    {!editable && <p role="status" className="rounded-lg bg-panel p-4">Suất chiếu này chỉ được xem: đã qua, đã kết thúc hoặc có lịch sử giao dịch nên không thể chỉnh sửa.</p>}
    <fieldset disabled={busy || !editable} className="grid gap-5 sm:grid-cols-2">
      <label>Phim<select required className={INPUT} value={movieId} onChange={event => setMovieId(event.target.value)}><option value="">Chọn phim đã công bố</option>{current && !movies.some(movie => movie.id === current.movieId) && <option value={current.movieId}>{current.movieTitle} (lịch sử)</option>}{movies.map(movie => <option key={movie.id} value={movie.id}>{movie.title}</option>)}</select></label>
      <label>Rạp chiếu phim<select required disabled={!!current} className={INPUT} value={cinemaId} onChange={event => { setCinemaId(event.target.value); setHallId(""); }}><option value="">Chọn rạp</option>{cinemas.filter(cinema => cinema.status === "ACTIVE" || cinema.id === current?.cinemaId).map(cinema => <option key={cinema.id} value={cinema.id}>{cinema.name}</option>)}</select></label>
      <label>Phòng chiếu<select required disabled={!!current || halls.loading || !!halls.error || !cinemaId} className={INPUT} value={hallId} onChange={event => setHallId(event.target.value)}><option value="">Chọn phòng chiếu đã cấu hình</option>{halls.data?.filter(hall => hall.status === "ACTIVE" && hall.layoutInitialized || hall.id === current?.hallId).map(hall => <option key={hall.id} value={hall.id}>{hall.name}</option>)}</select></label>
      <label>Ngày<input type="date" required className={INPUT} value={date ?? ""} onChange={event => setDate(event.target.value)} /></label>
      <label>Giờ<input type="time" required className={INPUT} value={time} onChange={event => setTime(event.target.value)} /></label>
      <label>Giá cơ bản<input type="text" inputMode="decimal" required pattern="[0-9]+(\.[0-9]{1,4})?" className={INPUT} value={price} onChange={event => setPrice(event.target.value)} /></label>
      <label>Trạng thái suất chiếu<select className={INPUT} value={status} onChange={event => setStatus(event.target.value as ShowtimeStatus)}>{choices.map(value => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></label>
      <div className="flex items-end"><Button type="submit" disabled={halls.loading || !!halls.error}>{busy ? "Đang lưu…" : "Lưu suất chiếu"}</Button></div>
    </fieldset>
    {halls.loading && <p role="status">Đang tải phòng chiếu…</p>}{halls.error && <Feedback {...halls} />}
    {status === "CANCELLED" && editable && <p className="text-muted">Hủy sẽ giữ nguyên nội dung đã lưu và bỏ qua thay đổi chưa lưu. Không thay đổi ghế đang giữ, đơn đặt vé hay thanh toán.</p>}
    {error && <p role="alert" className="text-error">{error}</p>}{saved && <p role="status" className="text-success">Đã lưu suất chiếu.</p>}
    {current && <section aria-label="Suất chiếu đã lưu" className="space-y-2 break-words rounded-xl bg-panel p-5 text-sm"><h2 className="font-semibold">Suất chiếu đã lưu · {current.id}</h2><p>{current.movieTitle} · {current.cinemaName} · {current.hallName}</p><p>Bắt đầu: {formatLocalDateTime(showtimeLocalInput(current.startsAt, timeZone))}</p><p>Kết thúc: {formatLocalDateTime(showtimeLocalInput(current.endsAt, timeZone))}</p><p>Phòng được sử dụng đến: {formatLocalDateTime(showtimeLocalInput(current.occupiedUntil, timeZone))}</p><p>Hạn đặt vé: {formatLocalDateTime(showtimeLocalInput(current.bookingCutOff, timeZone))}</p><p>Giá cơ bản: {current.basePrice} · {displayLabel(current.status)}</p><Link className={LINK} href={`/admin/showtimes/${current.id}/edit`}>Xem suất chiếu đã lưu</Link></section>}
  </form>;
}
