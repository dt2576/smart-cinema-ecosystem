"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { DiscoveryApiError, getCinema, getShowtimes } from "@/features/discovery/discovery-api";
import type { CinemaOption } from "@/features/cinema/cinema.types";
import { getMovie, MovieApiError } from "@/features/movie/movie-api";
import { MovieFeedback, MovieLoading } from "@/features/movie/movie-feedback";
import { MoviePoster } from "@/features/movie/movie-poster";
import { isMovieId } from "@/features/movie/movie-query";
import type { MovieDetail } from "@/features/movie/movie.types";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { canSelectShowtime, createSeatSelectionHandoff, formatShowtimeDate, formatShowtimeTime, showtimeDate } from "@/features/showtime/showtime-service";

export function ShowtimeSelectionScreen({ movieId, cinemaId }: { movieId: string; cinemaId: string }) {
  if (!isMovieId(movieId) || !isMovieId(cinemaId)) return <><MovieFeedback title="Liên kết lựa chọn không hợp lệ" message="Chọn phim và rạp để tiếp tục." /><Link href="/movies" className="mt-6 inline-flex min-h-11 items-center text-accent">Xem danh sách phim</Link></>;
  return <ShowtimeContext key={`${movieId}/${cinemaId}`} movieId={movieId} cinemaId={cinemaId} />;
}

function ShowtimeContext({ movieId, cinemaId }: { movieId: string; cinemaId: string }) {
  const search = useSearchParams();
  const load = useCallback(async (signal: AbortSignal) => {
    const [movie, cinema] = await Promise.all([getMovie(movieId, signal), getCinema(cinemaId, signal)]);
    return { movie, cinema };
  }, [movieId, cinemaId]);
  const { data, error, loading, retry } = useMovieRequest(load);
  const from = search.get("from");
  const back = `/movies/${movieId}/cinemas${from ? `?from=${encodeURIComponent(from)}` : ""}`;
  if (loading) return <MovieLoading detail />;
  if (error) return <><MovieFeedback title={error instanceof MovieApiError && error.status === 404 ? "Phim không khả dụng" : error instanceof DiscoveryApiError && error.status === 404 ? "Rạp không khả dụng" : "Không thể tải lựa chọn"} message={error.message} retry={(error instanceof MovieApiError || error instanceof DiscoveryApiError) && [400, 404].includes(error.status) ? undefined : retry} /><Link href={back} className="mt-6 inline-flex min-h-11 items-center text-accent">Chọn rạp</Link></>;
  if (!data?.cinema) return <><MovieFeedback title="Rạp không khả dụng" message="Không thể chọn rạp này. Vui lòng chọn rạp đang hoạt động." /><Link href={back} className="mt-6 inline-flex min-h-11 items-center text-accent">Chọn rạp</Link></>;
  return <ShowtimeOptions movie={data.movie} cinema={data.cinema} />;
}

function ShowtimeOptions({ movie, cinema }: { movie: MovieDetail; cinema: CinemaOption }) {
  const search = useSearchParams();
  const router = useRouter();
  const requestedDate = search.getAll("date").length > 1 ? "invalid" : search.get("date");
  const load = useCallback((signal: AbortSignal) => getShowtimes(movie.id, cinema.id, requestedDate, signal), [movie.id, cinema.id, requestedDate]);
  const { data, error, loading, retry } = useMovieRequest(load);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  const date = requestedDate ?? data?.date ?? "";
  const validDate = !!data && date === data.date;
  const url = search.toString();
  const urlId = search.getAll("showtimeId").length === 1 ? search.get("showtimeId") : null;
  const [selection, setSelection] = useState({ url, id: urlId });
  if (selection.url !== url) setSelection({ url, id: urlId });
  const selectedId = selection.url === url ? selection.id : urlId;
  const items = validDate ? data?.items.filter(item => item.movieId === movie.id && item.cinemaId === cinema.id && showtimeDate(item.startsAt, data.timeZone) === date) ?? [] : [];
  const selected = items.find(item => item.id === selectedId && canSelectShowtime(item, movie.id, cinema.id, date, now));
  const halls = [...new Map(items.map(item => [item.hall.id, item.hall])).values()];
  const [continuationError, setContinuationError] = useState(false);
  const from = search.get("from");
  const backParams = new URLSearchParams({ cinemaId: cinema.id });
  if (from) backParams.set("from", from);
  const cinemaHref = `/movies/${movie.id}/cinemas?${backParams}`;
  const movieHref = `/movies/${movie.id}${from ? `?from=${encodeURIComponent(from)}` : ""}`;

  function navigate(nextDate: string, id?: string) {
    const params = new URLSearchParams({ date: nextDate });
    if (from) params.set("from", from);
    if (id) params.set("showtimeId", id);
    const href = `/movies/${movie.id}/cinemas/${cinema.id}/showtimes?${params}`;
    router.push(href, { scroll: false });
  }

  function continueToSeats(currentTime: number) {
    const handoff = selected && createSeatSelectionHandoff(selected, movie.id, cinema.id, date, currentTime);
    setNow(currentTime);
    setContinuationError(!handoff);
    if (handoff) {
      const params = new URLSearchParams({ movieId: handoff.movieId, cinemaId: handoff.cinemaId, date });
      if (from) params.set("from", from);
      router.push(`${handoff.seatPath}?${params}`);
    }
  }

  return <>
    <nav aria-label="Tiến trình chọn vé" className="mb-6 flex flex-wrap items-center gap-3 font-heading text-xs uppercase tracking-wide text-muted">
      <Link href={movieHref} className="inline-flex min-h-11 items-center text-accent">1. Phim</Link><span aria-hidden="true">→</span><Link href={cinemaHref} className="inline-flex min-h-11 items-center text-accent">2. Rạp chiếu phim</Link><span aria-hidden="true">→</span><span aria-current="step" className="text-accent">3. Suất chiếu</span><span aria-hidden="true">→</span><span>4. Ghế</span>
    </nav>
    <section aria-label="Phim và rạp đã chọn" className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl bg-linear-to-r from-panel to-action/10 p-5">
      <div className="w-16 shrink-0"><MoviePoster url={movie.posterUrl} title={movie.title} /></div>
      <div className="min-w-0 flex-1"><p className="text-xs text-muted">{movie.ageRating && `${movie.ageRating} · `}{movie.duration} phút</p><h2 className="mt-1 break-words text-xl font-bold">{movie.title}</h2><p className="mt-2 text-sm text-accent">{cinema.name}</p><p className="mt-1 text-xs text-muted">{cinema.address}</p></div>
      <Link href={cinemaHref} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-panel-high px-4 font-heading text-xs font-semibold hover:bg-panel-hover sm:w-auto">Đổi rạp</Link>
    </section>
    <h1 className="text-3xl font-bold sm:text-4xl">Chọn suất chiếu</h1>
    <p className="mb-6 mt-4 rounded-lg border border-outline/40 bg-panel-low px-4 py-3 text-sm leading-6 text-muted">Suất chiếu lấy từ lịch chiếu thực tế. Thời gian hiển thị theo {data?.timeZone ?? "múi giờ rạp đã cấu hình"}. Tình trạng ghế được kiểm tra ở bước tiếp theo.</p>
    {loading && <p role="status" className="rounded-xl bg-panel-low p-10 text-center text-muted">Đang tải suất chiếu…</p>}
    {error && <MovieFeedback title="Không thể tải suất chiếu" message={error.message} retry={retry} />}
    {error instanceof DiscoveryApiError && error.status === 400 && <Button variant="secondary" onClick={() => router.push(`/movies/${movie.id}/cinemas/${cinema.id}/showtimes`)}>Chọn ngày chiếu</Button>}
    {data && <>
      <section aria-label="Chọn ngày" className="mb-8">
        <h2 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wide">Chọn ngày</h2>
        <div className="flex flex-wrap gap-3">{data.dates.map(value => <button key={value} type="button" aria-pressed={date === value} onClick={() => { setSelection({ url, id: null }); setContinuationError(false); navigate(value); }} className={`min-h-16 rounded-lg border px-4 py-3 font-heading text-sm font-semibold ${date === value ? "border-action bg-action text-on-action" : "border-outline/40 bg-panel-high hover:bg-panel-hover"}`}>{formatShowtimeDate(value)}</button>)}</div>
      </section>
      {!validDate ? <MovieFeedback title="Chọn ngày" message="Chọn một trong các ngày trên." /> : items.length === 0 ? <MovieFeedback title="Ngày này chưa có suất chiếu" message="Chọn ngày khác hoặc thử lại." retry={retry} /> : <>
        <p className="mb-4 text-sm text-muted">Đang mở bán · Chọn suất chiếu chưa bắt đầu để xem ghế</p>
        <fieldset><legend className="sr-only">Chọn suất chiếu</legend><div className="space-y-5">{halls.map(hall => <section key={hall.id} aria-label={hall.name} className="rounded-xl border border-outline/30 bg-panel-low p-5 sm:p-6">
          <h2 className="mb-5 text-lg font-bold">{hall.name}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{items.filter(item => item.hall.id === hall.id).map(item => {
            const available = canSelectShowtime(item, movie.id, cinema.id, date, now);
            const active = selected?.id === item.id;
            const label = Date.parse(item.startsAt) <= now ? "Đã bắt đầu / đã qua" : item.bookingCutOff && Date.parse(item.bookingCutOff) <= now ? "Đã ngừng đặt vé" : "Đang mở bán";
            return <label key={item.id} className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border p-3 text-center ${active ? "border-action bg-action/10 ring-1 ring-action" : "border-outline/40 bg-panel"} ${available ? "cursor-pointer hover:bg-panel-hover" : "cursor-not-allowed text-muted"}`}>
              <span className="font-heading text-lg font-bold tabular-nums">{formatShowtimeTime(item.startsAt, data.timeZone)}</span><span className={`text-xs ${available ? "text-success" : "text-muted"}`}>{active ? "Đã chọn" : label}</span>
              <input type="radio" name="showtime" aria-label={`${hall.name} ${formatShowtimeTime(item.startsAt, data.timeZone)} ${label}`} checked={active} disabled={!available} onChange={() => { setSelection({ url, id: item.id }); setContinuationError(false); navigate(date, item.id); }} className="size-4 accent-action" />
            </label>;
          })}</div>
        </section>)}</div></fieldset>
      </>}
    </>}
    <aside aria-label="Tóm tắt lựa chọn suất chiếu" className="sticky bottom-3 z-20 mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-outline/50 bg-panel p-5 shadow-xl">
      <div className="min-w-0 flex-1" aria-live="polite"><p className="font-heading text-xs uppercase tracking-wider text-accent">Suất chiếu đã chọn</p><p className="mt-2 break-words font-semibold">{selected ? `${formatShowtimeDate(date)} · ${formatShowtimeTime(selected.startsAt, data?.timeZone)} · ${selected.hall.name}` : "Chọn suất chiếu khả dụng chưa bắt đầu"}</p>{((selectedId && data && !selected) || continuationError) && <p className="mt-2 text-sm text-error">Lựa chọn không còn khả dụng. Vui lòng chọn suất chiếu khác.</p>}</div>
      <Button disabled={!selected} onClick={() => continueToSeats(Date.now())} className="w-full sm:w-auto">Tiếp tục chọn ghế<Icon name="arrow" /></Button>
    </aside>
  </>;
}
