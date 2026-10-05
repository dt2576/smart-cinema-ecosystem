"use client";
import { formatUtcInstant } from "@/lib/display-format";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CONCESSION_PREVIEW_PATH, useConcessionPreview } from "@/features/concession/concession-preview-provider";
import { DiscoveryApiError, getCinema, getShowtimes, getShowtime } from "@/features/discovery/discovery-api";
import { useAuth } from "@/features/auth/auth-context";
import { bookingSummaryHref } from "@/features/booking/booking-service";
import { useBookingCreation } from "@/features/booking/use-booking-creation";
import type { CinemaOption } from "@/features/cinema/cinema.types";
import { getMovie, MovieApiError } from "@/features/movie/movie-api";
import { MovieFeedback, MovieLoading } from "@/features/movie/movie-feedback";
import { MoviePoster } from "@/features/movie/movie-poster";
import { isMovieId } from "@/features/movie/movie-query";
import type { MovieDetail } from "@/features/movie/movie.types";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { canSelectShowtime, formatShowtimeDate, formatShowtimeTime } from "@/features/showtime/showtime-service";
import type { ShowtimeOption } from "@/features/showtime/showtime.types";
import { seatUnitCapacity } from "@/features/seat/seat-service";
import { saveSeatIntent, useSeatHolds } from "@/features/seat/use-seat-holds";

export function SeatSelectionScreen({ showtimeId }: { showtimeId: string }) {
  const search = useSearchParams();
  const single = (name: string) => search.getAll(name).length === 1 ? search.get(name)! : "";
  const movieId = single("movieId");
  const cinemaId = single("cinemaId");
  const date = single("date");
  if (!isMovieId(showtimeId) || !isMovieId(movieId) || !isMovieId(cinemaId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return <><MovieFeedback title="Liên kết chọn ghế không hợp lệ" message="Chọn phim, rạp và suất chiếu để xem ghế." /><Link href="/movies" className="mt-6 inline-flex min-h-11 items-center text-accent">Xem danh sách phim</Link></>;
  return <SeatContext key={`${movieId}/${cinemaId}/${date}/${showtimeId}`} movieId={movieId} cinemaId={cinemaId} date={date} showtimeId={showtimeId} />;
}

function SeatContext({ movieId, cinemaId, date, showtimeId }: { movieId: string; cinemaId: string; date: string; showtimeId: string }) {
  const search = useSearchParams();
  const load = useCallback(async (signal: AbortSignal) => {
    const [movie, cinema, schedule, detail] = await Promise.all([getMovie(movieId, signal), getCinema(cinemaId, signal), getShowtimes(movieId, cinemaId, date, signal), getShowtime(showtimeId, signal)]);
    const showtime = { ...detail, timeZone: schedule.timeZone };
    return { movie, cinema, showtime: canSelectShowtime(showtime, movieId, cinemaId, date, Date.parse(schedule.serverTime)) ? showtime : undefined };
  }, [movieId, cinemaId, date, showtimeId]);
  const { data, loading, error, retry } = useMovieRequest(load);
  const params = new URLSearchParams({ date, showtimeId });
  const from = search.get("from");
  if (from) params.set("from", from);
  const backHref = `/movies/${movieId}/cinemas/${cinemaId}/showtimes?${params}`;
  if (loading) return <MovieLoading detail />;
  if (error) return <><MovieFeedback title={error instanceof MovieApiError && error.status === 404 ? "Phim không khả dụng" : error instanceof DiscoveryApiError && error.status === 404 ? "Suất chiếu không khả dụng" : "Không thể tải lựa chọn"} message={error.message} retry={(error instanceof MovieApiError || error instanceof DiscoveryApiError) && [400, 404].includes(error.status) ? undefined : retry} /><SeatBookingRecovery showtimeId={showtimeId} seatHref={`/showtimes/${showtimeId}/seats?${search}`} /><Link href={backHref} className="mt-6 inline-flex min-h-11 items-center text-accent">Chọn suất chiếu</Link></>;
  if (!data?.cinema || !data.showtime) return <><MovieFeedback title="Suất chiếu không khả dụng" message="Suất chiếu hoặc rạp này không khả dụng, đã bắt đầu hoặc không khớp với lựa chọn." /><SeatBookingRecovery showtimeId={showtimeId} seatHref={`/showtimes/${showtimeId}/seats?${search}`} /><Link href={backHref} className="mt-6 inline-flex min-h-11 items-center text-accent">Chọn suất chiếu</Link></>;
  return <SeatOptions movie={data.movie} cinema={data.cinema} showtime={data.showtime} date={date} backHref={backHref} />;
}

// Booking access/recovery must survive later public catalog hiding. Saved
// navigation intent never grants ownership; the backend revalidates each call.
function SeatBookingRecovery({ showtimeId, seatHref }: { showtimeId: string; seatHref: string }) {
  const { session } = useAuth();
  const creation = useBookingCreation(showtimeId, session?.accessToken, seatHref);
  const router = useRouter();
  if (!creation.record) return null;
  if (creation.record.bookingId) return <Link href={bookingSummaryHref(creation.record.bookingId)} className="mt-4 inline-flex min-h-11 items-center text-accent">Về đơn đặt vé</Link>;
  return <div className="mt-5 rounded-xl bg-panel p-5"><p className="text-sm text-muted">Chưa xác nhận kết quả đặt vé. Chỉ có thể thử lại đúng bộ ghế đang giữ đã gửi; điều kiện máy chủ và hạn gốc vẫn áp dụng.</p>{creation.error && <p role="alert" className="mt-3 text-sm text-error">{creation.error.message}</p>}{session ? <Button disabled={creation.pending} onClick={async () => { const booking = await creation.submit(creation.record!.input); if (booking) router.push(bookingSummaryHref(booking.id)); }} className="mt-4">Khôi phục đơn đặt vé</Button> : <Link href={`/login?${new URLSearchParams({ returnTo: seatHref })}`} className="mt-4 inline-flex min-h-11 items-center text-accent">Đăng nhập để khôi phục đơn đặt vé</Link>}</div>;
}

function SeatOptions({ movie, cinema, showtime, date, backHref }: { movie: MovieDetail; cinema: CinemaOption; showtime: ShowtimeOption; date: string; backHref: string }) {
  const search = useSearchParams();
  const { session, isHydrated } = useAuth();
  return <>
    <nav aria-label="Tiến trình chọn vé" className="mb-6 flex flex-wrap items-center gap-3 font-heading text-xs uppercase tracking-wide text-muted"><Link href={backHref} className="inline-flex min-h-11 items-center text-accent">1. Suất chiếu</Link><span aria-hidden="true">→</span><span aria-current="step" className="text-accent">2. Ghế</span><span aria-hidden="true">→</span><span>3. Thông tin đặt vé</span></nav>
    <section aria-label="Suất chiếu đã chọn" className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl bg-panel p-5">
      <div className="w-16 shrink-0"><MoviePoster url={movie.posterUrl} title={movie.title} /></div><div className="min-w-0 flex-1"><h1 className="text-2xl font-bold">Chọn ghế</h1><h2 className="mt-2 break-words text-lg font-semibold">{movie.title}</h2><p className="mt-1 text-sm text-muted">{cinema.name} · {showtime.hall.name}</p><p className="mt-1 text-sm text-accent">{formatShowtimeDate(date)} · {formatShowtimeTime(showtime.startsAt, showtime.timeZone)} · {showtime.timeZone}</p></div>
      <Link href={backHref} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-panel-high px-4 text-sm hover:bg-panel-hover sm:w-auto">Đổi suất chiếu</Link>
    </section>
    <p className="mb-6 rounded-lg border border-outline/40 bg-panel-low p-4 text-sm leading-6 text-muted">Chọn ghế rồi xác nhận cùng lúc bằng Giữ ghế đã chọn. Tạo đơn đặt vé sẽ gắn đúng các ghế bạn đang giữ và mở thông tin đặt vé từ máy chủ. Quay lại hay tải lại không gia hạn. Chưa khởi tạo thanh toán.</p>
    {isHydrated ? <SeatMapSelection key={session?.accessToken ?? "anonymous"} token={session?.accessToken} showtime={showtime} movie={movie} cinema={cinema} seatHref={`/showtimes/${showtime.id}/seats?${search}`} /> : <p role="status">Đang tải phiên đăng nhập…</p>}
  </>;
}

function SeatMapSelection({ token, showtime, movie, cinema, seatHref }: { token?: string; showtime: ShowtimeOption; movie: MovieDetail; cinema: CinemaOption; seatHref: string }) {
  const router = useRouter();
  const { start } = useConcessionPreview();
  const state = useSeatHolds(showtime, token, seatHref);
  const creation = useBookingCreation(showtime.id, token, seatHref);
  const { map, draft, owned, busy, confirmed, now, deadline, error, message, handoff } = state;
  const { clearSession } = useAuth();
  const writingBooking = creation.pending || creation.uncertain;
  function signIn() {
    saveSeatIntent(seatHref, draft);
    if (error?.status === 401 || creation.error?.status === 401) clearSession();
    router.push(`/login?${new URLSearchParams({ returnTo: seatHref })}`);
  }
  if (!map) return <>{busy && <p role="status" className="rounded-xl bg-panel-low p-10 text-center text-muted">Đang tải sơ đồ ghế…</p>}{error && <MovieFeedback title="Không thể tải sơ đồ ghế" message={error.message} retry={() => void state.refresh()} />}{error?.status === 401 && <Button onClick={signIn}>Đăng nhập lại</Button>}<SeatBookingRecovery showtimeId={showtime.id} seatHref={seatHref} /></>;
  if (!map.units.length) return <MovieFeedback title="Chưa có ghế để hiển thị" message="Chưa có sơ đồ ghế cho suất chiếu này. Thử lại hoặc chọn suất chiếu khác." retry={() => void state.refresh()} />;
  const selectedUnits = map.units.filter(unit => draft.includes(unit.id));
  const guestCount = selectedUnits.reduce((sum, unit) => sum + seatUnitCapacity(unit), 0);
  const selectionCount = `${selectedUnits.length} ghế · ${guestCount} khách`;
  const seconds = Math.max(0, Math.ceil(((deadline ? Date.parse(deadline) : now) - now) / 1000));
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const rows = [...new Set(map.units.map(unit => unit.row))];
  const columns = Math.max(8, ...rows.map(row => map.units.filter(unit => unit.row === row).reduce((sum, unit) => sum + seatUnitCapacity(unit), 0)));
  const available = map.units.some(unit => unit.availability === "AVAILABLE") || owned.length > 0;
  const cutoff = !(Date.parse(showtime.bookingCutOff ?? showtime.startsAt) > now) || !(Date.parse(showtime.startsAt) > now);
  const pendingCount = draft.filter(id => !owned.some(hold => hold.seatId === id)).length;

  async function continueToConcessions() {
    if (writingBooking) return;
    const fresh = await state.prepareHandoff();
    if (fresh?.handoff) {
      const selection = { unitIds: fresh.handoff.holds.map(hold => hold.seatId), expiresAt: Date.parse(fresh.handoff.expiresAt) };
      start({ movie, cinema, showtime, map: fresh.map, selection, seatHref, holdHandoff: fresh.handoff });
      const scenario = new URL(seatHref, "https://preview.local").searchParams.get("concessionPreview");
      router.push(CONCESSION_PREVIEW_PATH + (scenario ? `?concessionPreview=${encodeURIComponent(scenario)}` : ""));
    }
  }

  async function createAndReviewBooking() {
    if (creation.pending || creation.uncertain) return;
    const fresh = await state.prepareHandoff();
    if (!fresh?.handoff) return;
    const booking = await creation.submit({ showtimeId: fresh.handoff.showtimeId, holdIds: fresh.handoff.holdIds });
    if (booking) router.push(bookingSummaryHref(booking.id));
    else await state.refresh();
  }
  async function recoverBooking() {
    if (!creation.record || creation.pending) return;
    const booking = await creation.submit(creation.record.input);
    if (booking) router.push(bookingSummaryHref(booking.id));
    else await state.refresh();
  }

  return <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
    <section aria-label="Sơ đồ ghế phòng chiếu" className="min-w-0 rounded-2xl border border-outline/30 bg-panel-low p-4 sm:p-6">
      <h2 className="text-lg font-bold">{showtime.hall.name} · Sơ đồ ghế</h2>
      <p className="mt-2 text-xs leading-6 text-muted">Chọn ghế trên sơ đồ. Cuộn sơ đồ theo chiều ngang trên màn hình nhỏ.</p>
      {!available && <p role="status" className="mt-4 text-sm text-error">Không có ghế khả dụng để chọn.</p>}
      <div role="region" aria-label="Sơ đồ ghế có thể cuộn" tabIndex={0} className="mt-6 overflow-x-auto pb-4">
        <div className="min-w-[520px] px-2">
          <div className="mx-auto mb-10 w-4/5 rounded-t-[50%] border-t-4 border-action pt-4 text-center font-heading text-xs uppercase tracking-widest text-accent">Màn hình · Hướng nhìn</div>
          <div className="space-y-3">{rows.map(row => <div key={row} className="flex items-center gap-3"><span className="w-4 shrink-0 font-heading text-sm text-muted" aria-hidden="true">{row}</span><div className="grid flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(44px, 1fr))` }}>
            {map.units.filter(unit => unit.row === row).map(unit => {
              const selected = selectedUnits.some(item => item.id === unit.id);
              const mine = owned.some(hold => hold.seatId === unit.id);
              const disabled = busy || writingBooking || !confirmed || cutoff || (unit.availability !== "AVAILABLE" && !mine);
              const label = mine ? confirmed ? "Bạn đang giữ ghế này" : "Lượt giữ ghế xác nhận lần cuối" : selected ? "Đã chọn" : unit.availability === "BOOKED" ? "Đã bán" : unit.availability === "HELD" ? "Đang được giữ" : unit.availability === "UNAVAILABLE" ? "Không khả dụng" : "Còn trống";
              const type = unit.type === "COUPLE" ? "Ghế đôi, 2 khách" : unit.type === "VIP" ? "VIP, 1 khách" : "Ghế thường, 1 khách";
              return <button key={unit.id} type="button" aria-label={`${unit.row}${unit.number}, ${type}, ${label}`} aria-pressed={selected} disabled={disabled} onClick={() => state.toggle(unit.id)} style={{ gridColumn: `${unit.column} / span ${unit.type === "COUPLE" ? 2 : 1}` }} className={`flex min-h-12 flex-col items-center justify-center rounded-t-xl rounded-b-md border-b-4 px-1 py-2 text-xs font-semibold transition-colors ${mine ? "border-success bg-success/20 text-success ring-2 ring-success" : selected ? "border-action bg-action/20 text-accent ring-2 ring-action" : unit.availability !== "AVAILABLE" ? "border-outline/40 bg-panel-high text-muted" : "border-outline bg-panel hover:bg-panel-hover"} ${unit.type === "COUPLE" ? "border-x border-x-action/50" : ""}`}>
                <span>{unit.row}{unit.number}</span><span className="mt-1 text-[10px]">{mine ? "Bạn đang giữ ghế này" : selected ? "Đã chọn" : unit.availability === "BOOKED" ? "Đã bán" : unit.availability === "HELD" ? "Đang được giữ" : unit.availability === "UNAVAILABLE" ? "×" : unit.type === "COUPLE" ? "2 khách" : unit.type === "VIP" ? "VIP" : "1 khách"}</span>
              </button>;
            })}
          </div><span className="w-4 shrink-0 font-heading text-sm text-muted" aria-hidden="true">{row}</span></div>)}</div>
        </div>
      </div>
      <section aria-label="Chú thích ghế" className="mt-5 border-t border-outline/30 pt-5 text-xs leading-6 text-muted"><h3 className="mb-2 font-heading text-sm font-semibold text-foreground">Chú thích ghế</h3><ul className="flex flex-wrap gap-x-5 gap-y-2"><li>□ Còn trống</li><li className="text-accent">Đã chọn · chưa giữ</li><li className="text-success">Bạn đang giữ ghế này</li><li>Đang được giữ · khách khác hoặc đơn đặt vé</li><li>Đã bán · Đã đặt</li><li>× Không khả dụng</li><li>Ghế thường / VIP · 1 khách</li><li className="text-accent">Ghế đôi · 2 khách, một ghế</li></ul></section>
    </section>
    <aside aria-label="Tóm tắt lựa chọn ghế" className="rounded-2xl border border-outline/40 bg-panel p-5 lg:sticky lg:top-24">
      <h2 className="text-xl font-bold">Tóm tắt lựa chọn</h2>
      <div className="my-5 rounded-lg border border-outline/40 bg-panel-low p-4"><p className="text-sm font-semibold text-accent">Thời gian giữ ghế từ máy chủ</p><p role="timer" aria-label="Thời gian giữ ghế còn lại" className="mt-2 font-heading text-2xl tabular-nums">{deadline ? countdown : creation.record?.bookingId ? "Xem đơn đặt vé" : "Chưa bắt đầu"}</p>{deadline && <p className="mt-2 break-words text-xs text-muted">Hạn giữ ghế từ máy chủ: <time dateTime={deadline}>{formatUtcInstant(deadline)}</time></p>}<p className="mt-2 text-xs leading-6 text-muted">{creation.record?.bookingId && !deadline ? "Ghế đã gắn với đơn sử dụng hạn đặt vé gốc từ máy chủ, hiển thị trong thông tin đặt vé." : "Áp dụng hạn sớm nhất của ghế bạn đang giữ. Đổi lựa chọn và tải lại không gia hạn lượt giữ ghế hiện có."}</p></div>
      {cutoff && <p role="alert" className="mb-4 text-sm text-error">Đã qua hạn đặt vé của suất chiếu. Không thể giữ ghế mới hay tiếp tục.</p>}
      {busy && <p role="status" className="mb-4 text-sm text-accent">Đang xác nhận tình trạng ghế với máy chủ…</p>}
      {message && <p role="status" className="mb-4 text-sm text-muted">{message}</p>}
      {error && <p role="alert" className="mb-4 text-sm text-error">{error.message}</p>}
      {creation.pending && <p role="status" className="mb-4 text-sm text-accent">Đang tạo đơn từ đúng bộ ghế đang giữ đã gửi…</p>}
      {creation.error && <p role="alert" className="mb-4 text-sm text-error">{creation.error.message}</p>}
      {creation.uncertain && !creation.pending && <div className="mb-4 rounded-lg border border-outline bg-panel-low p-4"><p role="status" className="text-sm text-muted">Chưa xác nhận kết quả tạo đơn. Không trả hay đổi ghế đang giữ cho đến khi khôi phục. Khôi phục chỉ gửi lại đúng bộ đã gửi; không gia hạn hay khôi phục đơn hết hạn.</p><Button disabled={busy || !token} variant="secondary" onClick={() => void recoverBooking()} className="mt-3">Khôi phục đơn đặt vé</Button></div>}
      {creation.record?.bookingId && <p className="mb-4 text-sm text-muted">Đã xác nhận đơn đặt vé cho suất chiếu này. Ghế đã gắn với đơn hiển thị đang được giữ và không thể trả riêng tại đây. <Link href={bookingSummaryHref(creation.record.bookingId)} className="inline-flex min-h-11 items-center text-accent">Về đơn đặt vé</Link></p>}
      <div aria-live="polite"><p className="text-sm font-semibold">{selectionCount}</p>{selectedUnits.length ? <ul className="mt-3 space-y-2 text-sm text-muted">{selectedUnits.map(unit => <li key={unit.id}>{unit.row}{unit.number} · {unit.type === "COUPLE" ? "Ghế đôi · 2 khách" : unit.type === "VIP" ? "VIP · 1 khách" : "Ghế thường · 1 khách"}</li>)}</ul> : <p className="mt-3 text-sm text-muted">Chọn ghế còn trống trên sơ đồ.</p>}</div>
      <p className="mt-5 text-xs leading-6 text-muted">Ghế đôi được chọn và bỏ chọn nguyên ghế, dành cho hai khách.</p>
      <p className="mt-3 text-sm text-success">{owned.length} lượt giữ ghế {confirmed ? "của bạn đã được máy chủ xác nhận" : "được xác nhận lần cuối"}{!confirmed && " · cần cập nhật"}</p>
      {pendingCount > 0 && <p className="mt-2 text-xs text-accent">{pendingCount} ghế đã chọn chưa được giữ.</p>}
      {token && error?.status !== 401 && creation.error?.status !== 401 ? <Button disabled={busy || writingBooking || !confirmed || !pendingCount || cutoff} onClick={() => void state.acquire()} className="mt-4 w-full">Giữ ghế đã chọn</Button> : <Button disabled={busy || (!draft.length && creation.error?.status !== 401) || cutoff} onClick={signIn} className="mt-4 w-full">{error?.status === 401 || creation.error?.status === 401 ? "Đăng nhập lại" : "Đăng nhập để giữ ghế"}</Button>}
      {(draft.length > 0 || state.batch.holds.length > 0) && <Button variant="text" disabled={busy || writingBooking} onClick={state.clear} className="mt-3">Xóa lựa chọn / trả ghế đang giữ</Button>}
      <Button variant="secondary" disabled={busy} onClick={() => void state.refresh()} className="mt-3 w-full">Cập nhật tình trạng ghế</Button>
      <Button disabled={!handoff || writingBooking} onClick={() => void createAndReviewBooking()} className="mt-5 w-full">Tạo đơn đặt vé &amp; xem thông tin</Button>
      <p className="mt-3 text-xs leading-6 text-muted">Tạo một đơn chỉ gồm ghế qua máy chủ. Giá và hạn lấy từ phản hồi. Chưa tạo thanh toán, vé hay mã QR đặt vé.</p>
      <Button variant="text" disabled={!handoff || writingBooking} onClick={() => void continueToConcessions()} className="mt-3 w-full">Xem trước bắp nước</Button>
      <p className="mt-1 text-xs leading-6 text-muted">Bản xem trước thiết kế riêng. Món đi kèm, khuyến mãi và tổng tiền mẫu không được gửi vào đơn đặt vé.</p>
    </aside>
  </div>;
}
