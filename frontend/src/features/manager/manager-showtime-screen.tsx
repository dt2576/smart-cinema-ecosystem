"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { clearFieldValidation, localizeInvalidField } from "@/components/ui/native-validation";
import { displayLabel } from "@/lib/display-labels";
import { formatLocalDateTime } from "@/lib/display-format";
import { useManager } from "@/features/manager/manager-shell";
import { getManagerHalls, getManagerShowtime, getManagerShowtimes, saveManagerShowtime, OperationsApiError, isOperationId } from "@/features/manager/manager-api";
import { getMovies } from "@/features/movie/movie-api";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { SHOWTIME_STATUSES, showtimeLocalInput, showtimeLocalInstant, validShowtimePrice, type AdminShowtimeDetail, type ShowtimeStatus } from "@/features/admin/admin-showtime.types";
import { OperationsCard, OperationsEmpty, OperationsFrame, OperationsState, OP_INPUT, OP_LINK, CommandFeedback, useOperationsCommand } from "@/features/manager/operations-ui";

export function ManagerShowtimeList() {
  const { accessToken, cinemas } = useManager();
  const [filters, setFilters] = useState({ cinemaId: "", hallId: "", movieId: "", date: "", status: "" }); const [query, setQuery] = useState("");
  const load = useCallback((signal: AbortSignal) => getManagerShowtimes(accessToken, query, signal), [accessToken, query]); const result = useMovieRequest(load);
  const hallLoad = useCallback((signal: AbortSignal) => filters.cinemaId ? getManagerHalls(accessToken, filters.cinemaId, signal) : Promise.resolve([]), [accessToken, filters.cinemaId]); const halls = useMovieRequest(hallLoad);
  function submit(e: FormEvent) { e.preventDefault(); setQuery(new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()); }
  return <OperationsFrame title="Quản lý suất chiếu"><Link href="/manager/showtimes/new" className={OP_LINK}>+ Thêm suất chiếu</Link>
    <OperationsCard><form onSubmit={submit} onInvalidCapture={localizeInvalidField} onChangeCapture={clearFieldValidation} onInputCapture={clearFieldValidation} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label>Rạp chiếu phim<select aria-label="Rạp chiếu phim" className={OP_INPUT} value={filters.cinemaId} onChange={e => setFilters({ ...filters, cinemaId: e.target.value, hallId: "" })}><option value="">Tất cả rạp được phân công</option>{cinemas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Phòng chiếu<select aria-label="Phòng chiếu" className={OP_INPUT} disabled={!filters.cinemaId || halls.loading || !!halls.error} value={filters.hallId} onChange={e => setFilters({ ...filters, hallId: e.target.value })}><option value="">Tất cả phòng</option>{halls.data?.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
      <label>Ngày chiếu<input type="date" className={OP_INPUT} value={filters.date} onChange={e => setFilters({ ...filters, date: e.target.value })} /></label>
      <label>Mã phim<input className={OP_INPUT} inputMode="numeric" pattern="[1-9][0-9]{0,18}" value={filters.movieId} onChange={e => setFilters({ ...filters, movieId: e.target.value })} /></label>
      <label>Trạng thái suất chiếu<select aria-label="Trạng thái suất chiếu" className={OP_INPUT} value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}><option value="">Tất cả trạng thái</option>{SHOWTIME_STATUSES.map(s => <option key={s} value={s}>{displayLabel(s)}</option>)}</select></label>
      <div className="flex flex-wrap items-end gap-3"><Button type="submit">Lọc suất chiếu</Button><Button variant="secondary" onClick={() => { setFilters({ cinemaId: "", hallId: "", movieId: "", date: "", status: "" }); setQuery(""); }}>Xóa bộ lọc</Button></div>
    </form>{halls.error && <OperationsState {...halls} />}</OperationsCard>
    {result.loading || result.error ? <OperationsState {...result} /> : <><p className="text-muted">Múi giờ lịch chiếu: {result.data?.timeZone}</p>{!result.data?.items.length ? <OperationsEmpty message="Không có suất chiếu phù hợp." /> : result.data.items.map(s => <OperationsCard key={s.id}><h2 className="text-xl font-semibold">{s.movieTitle}</h2><p>{s.cinemaName} · {s.hallName}</p><p>{formatLocalDateTime(showtimeLocalInput(s.startsAt, result.data!.timeZone))} → {formatLocalDateTime(showtimeLocalInput(s.endsAt, result.data!.timeZone))}</p><p className="tabular-nums">Giá cơ bản: {s.basePrice} VND</p><StatusBadge>{displayLabel(s.status)}</StatusBadge><div><Link className={OP_LINK} href={`/manager/showtimes/${s.id}/edit`}>{s.editable ? "Chỉnh sửa suất chiếu" : "Xem suất chiếu"}</Link></div></OperationsCard>)}</>}
  </OperationsFrame>;
}
export function ManagerShowtimeEditor({ showtimeId }: { showtimeId?: string }) {
  const { accessToken } = useManager(); const load = useCallback(async (signal: AbortSignal) => showtimeId ? getManagerShowtime(accessToken, showtimeId, signal) : { timeZone: (await getManagerShowtimes(accessToken, "", signal)).timeZone, showtime: undefined }, [accessToken, showtimeId]); const result = useMovieRequest(load);
  return <OperationsFrame title={showtimeId ? "Thông tin suất chiếu" : "Thêm suất chiếu"} back={{ href: "/manager/showtimes", label: "Suất chiếu" }}>{result.loading || result.error ? <OperationsState {...result} /> : result.data && <ShowtimeForm key={showtimeId ?? "new"} initial={result.data.showtime ? result.data as AdminShowtimeDetail : undefined} timeZone={result.data.timeZone} />}</OperationsFrame>;
}
function ShowtimeForm({ initial, timeZone }: { initial?: AdminShowtimeDetail; timeZone: string }) {
  const { accessToken, cinemas } = useManager(); const router = useRouter(); const command = useOperationsCommand();
  const [current, setCurrent] = useState(initial?.showtime), [movieId, setMovieId] = useState(initial?.showtime.movieId ?? "");
  const [cinemaId, setCinemaId] = useState(initial?.showtime.cinemaId ?? ""), [hallId, setHallId] = useState(initial?.showtime.hallId ?? "");
  const [local, setLocal] = useState(initial ? showtimeLocalInput(initial.showtime.startsAt, timeZone) : ""), [price, setPrice] = useState(initial?.showtime.basePrice ?? "");
  const [status, setStatus] = useState<ShowtimeStatus>(initial?.showtime.status ?? "DRAFT"), [validation, setValidation] = useState<string>();
  const [search, setSearch] = useState(""), [movieQuery, setMovieQuery] = useState(""), [page, setPage] = useState(0);
  const movieLoad = useCallback(async (signal: AbortSignal) => { const value = await getMovies(new URLSearchParams({ q: movieQuery, page: String(page), size: "50", sort: "title,asc" }).toString(), signal); if (!Array.isArray(value.items) || !Number.isSafeInteger(value.totalPages) || value.totalPages < 0 || value.page !== page || value.items.some(m => !isOperationId(m.id) || typeof m.title !== "string" || m.status !== "PUBLISHED")) throw new OperationsApiError(502); return value; }, [movieQuery, page]); const movies = useMovieRequest(movieLoad);
  const hallLoad = useCallback((signal: AbortSignal) => cinemaId ? getManagerHalls(accessToken, cinemaId, signal) : Promise.resolve([]), [accessToken, cinemaId]); const halls = useMovieRequest(hallLoad);
  const choices = current ? [current.status, ...current.transitions.filter(s => s !== "CANCELLED")] : ["DRAFT", "SCHEDULED", "OPEN_FOR_BOOKING"];
  const editable = !current || current.editable;
  async function read() { if (current) { const s = (await getManagerShowtime(accessToken, current.id)).showtime; setCurrent(s); setMovieId(s.movieId); setCinemaId(s.cinemaId); setHallId(s.hallId); setLocal(showtimeLocalInput(s.startsAt, timeZone)); setPrice(s.basePrice); setStatus(s.status); } else { await getManagerShowtimes(accessToken); router.replace("/manager/showtimes"); } }
  function submit(e: FormEvent) {
    e.preventDefault(); setValidation(undefined); if (!editable || !choices.includes(status)) return;
    let startsAt: string;
    try { if (!validShowtimePrice(price)) throw new Error("Giá phải không âm, tối đa bốn chữ số thập phân và nhỏ hơn 1000000000000000."); startsAt = current && local === showtimeLocalInput(current.startsAt, timeZone) ? current.startsAt : showtimeLocalInstant(local, timeZone); }
    catch (cause) { setValidation(cause instanceof Error ? cause.message : "Kiểm tra ngày giờ và giá."); return; }
    void command.run(() => saveManagerShowtime(accessToken, current?.id, { movieId, hallId, startsAt, basePrice: price, status }), value => { setCurrent(value.showtime); if (!current) router.replace(`/manager/showtimes/${value.showtime.id}/edit`); });
  }
  return <OperationsCard><p className="text-accent">Múi giờ lịch chiếu: {timeZone}</p>{!editable && <p role="status">Suất chiếu chỉ được xem vì đã qua, kết thúc hoặc có lịch sử giao dịch.</p>}
    <div className="space-y-4"><form onSubmit={e => { e.preventDefault(); setMovieQuery(search.trim()); setPage(0); }} className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1">Tìm phim đã công bố<input className={OP_INPUT} value={search} onChange={e => setSearch(e.target.value)} /></label><Button variant="secondary" type="submit">Tìm phim</Button></form>{movies.loading || movies.error ? <OperationsState {...movies} /> : movies.data && <div className="flex flex-wrap items-center gap-3"><Button variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Trang phim trước</Button><span>Trang phim {page + 1} / {Math.max(1, movies.data.totalPages)}</span><Button variant="secondary" disabled={page + 1 >= movies.data.totalPages} onClick={() => setPage(page + 1)}>Trang phim sau</Button></div>}</div>
    <form onSubmit={submit} onInvalidCapture={localizeInvalidField} onChangeCapture={clearFieldValidation} onInputCapture={clearFieldValidation} className="space-y-5"><fieldset disabled={command.blocked || !editable} className="grid gap-5 sm:grid-cols-2">
      <label>Phim<select aria-label="Phim" required disabled={movies.loading || !!movies.error} className={OP_INPUT} value={movieId} onChange={e => setMovieId(e.target.value)}><option value="">Chọn phim</option>{current && !movies.data?.items.some(m => m.id === current.movieId) && <option value={current.movieId}>{current.movieTitle}</option>}{movies.data?.items.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
      <label>Rạp chiếu phim<select aria-label="Rạp chiếu phim" required disabled={!!current} className={OP_INPUT} value={cinemaId} onChange={e => { setCinemaId(e.target.value); setHallId(""); }}><option value="">Chọn rạp</option>{cinemas.filter(c => c.status === "ACTIVE" || c.id === current?.cinemaId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Phòng chiếu<select aria-label="Phòng chiếu" required disabled={!!current || !cinemaId || halls.loading || !!halls.error} className={OP_INPUT} value={hallId} onChange={e => setHallId(e.target.value)}><option value="">Chọn phòng đã có sơ đồ ghế</option>{halls.data?.filter(h => h.status === "ACTIVE" && h.layoutInitialized || h.id === current?.hallId).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
      <label>Ngày giờ bắt đầu<input required type="datetime-local" className={OP_INPUT} value={local} onChange={e => setLocal(e.target.value)} /></label>
      <label>Giá cơ bản (VND)<input required inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,4})?" className={OP_INPUT} value={price} onChange={e => setPrice(e.target.value)} /></label>
      <label>Trạng thái suất chiếu<select aria-label="Trạng thái suất chiếu" className={OP_INPUT} value={status} onChange={e => setStatus(e.target.value as ShowtimeStatus)}>{choices.map(s => <option key={s} value={s}>{displayLabel(s)}</option>)}</select></label>
      <div><Button type="submit" disabled={movies.loading || !!movies.error || halls.loading || !!halls.error}>Lưu suất chiếu</Button></div>
    </fieldset><p className="text-muted">Giờ kết thúc tính theo thời lượng phim. Phòng chiếu cố định sau khi tạo.</p>{validation && <p role="alert" className="text-error">{validation}</p>}<CommandFeedback command={command} read={read} /></form>
    {halls.error && <OperationsState {...halls} />}{current && <section aria-label="Suất chiếu đã lưu" className="space-y-3 border-t border-outline pt-5"><h2 className="text-xl font-semibold">Suất chiếu đã lưu · {current.id}</h2><p>{current.movieTitle} · {current.cinemaName} · {current.hallName}</p><p>Bắt đầu: {formatLocalDateTime(showtimeLocalInput(current.startsAt, timeZone))}</p><p>Kết thúc: {formatLocalDateTime(showtimeLocalInput(current.endsAt, timeZone))}</p><p>Hạn đặt vé: {formatLocalDateTime(showtimeLocalInput(current.bookingCutOff, timeZone))}</p><p>{current.basePrice} VND · {displayLabel(current.status)}</p></section>}
  </OperationsCard>;
}
