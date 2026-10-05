"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PreviewDialog } from "@/components/ui/preview-dialog";
import { MovieFeedback } from "@/features/movie/movie-feedback";
import { MoviePoster } from "@/features/movie/movie-poster";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { createConcessionPreviewHandoff } from "@/features/seat/seat-service";
import { formatShowtimeDate, formatShowtimeTime, showtimeDate } from "@/features/showtime/showtime-service";
import { BOOKING_SUMMARY_PREVIEW_PATH, CONCESSION_PREVIEW_PATH, useConcessionPreview, type ConcessionSeatContext } from "@/features/concession/concession-preview-provider";
import { changeConcessionQuantity, concessionSubtotal, createMockConcessionService, formatConcessionPrice, parseConcessionPreviewScenario } from "@/features/concession/concession-service";
import type { ConcessionCategory, ConcessionQuantities } from "@/features/concession/concession.types";

const CATEGORIES: { value: ConcessionCategory | "ALL"; label: string }[] = [{ value: "ALL", label: "Tất cả" }, { value: "COMBO", label: "Combo" }, { value: "POPCORN", label: "Bắp rang" }, { value: "DRINK", label: "Đồ uống" }];

export function ConcessionSelectionScreen() {
  const { preview } = useConcessionPreview();
  if (!preview) return <><MovieFeedback title="Chọn ghế trước" message="Bản xem trước được giữ khi bạn chuyển giữa bắp nước và thông tin đặt vé. Tải lại hoặc rời bản xem trước sẽ xóa lựa chọn. Quay lại chọn ghế để kiểm tra ghế đang giữ trên máy chủ." /><Link href="/movies" className="mt-6 inline-flex min-h-11 items-center text-accent">Xem danh sách phim</Link></>;
  return <ConcessionOptions context={preview} />;
}

function ConcessionOptions({ context }: { context: ConcessionSeatContext }) {
  const search = useSearchParams();
  const scenario = parseConcessionPreviewScenario(search.get("concessionPreview"));
  const service = useMemo(() => createMockConcessionService(scenario), [scenario]);
  const load = useCallback((signal: AbortSignal) => service.list(signal), [service]);
  const { data, loading, error, retry } = useMovieRequest(load);
  const [category, setCategory] = useState<ConcessionCategory | "ALL">("ALL");
  const [quantities, setQuantities] = useState<ConcessionQuantities>(context.concessions?.quantities ?? {});
  const [now, setNow] = useState(() => Date.now());
  const router = useRouter();
  const { selectConcessions } = useConcessionPreview();
  const [expiryDismissed, setExpiryDismissed] = useState(false);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  const { movie, cinema, showtime, map, selection, seatHref } = context;
  const validAt = (time: number) => movie.id === showtime.movieId && cinema.id === showtime.cinemaId && createConcessionPreviewHandoff(selection, map, showtime, time, context.holdHandoff?.holds.map(hold => hold.seatId));
  const handoff = validAt(now);
  const expired = !handoff;
  const units = map.units.filter(unit => selection.unitIds.includes(unit.id));
  const guests = units.reduce((total, unit) => total + (unit.type === "COUPLE" ? 2 : 1), 0);
  const count = `${units.length} ghế · ${guests} khách`;
  const seconds = Math.max(0, Math.ceil(((selection.expiresAt ?? now) - now) / 1000));
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const subtotal = concessionSubtotal(data ?? [], quantities);
  const selectedItems = (data ?? []).filter(item => quantities[item.id]);
  function change(id: string, delta: 1 | -1, current: number) {
    setNow(current);
    if (validAt(current) && data) {
      const next = changeConcessionQuantity(data, quantities, id, delta);
      setQuantities(next);
      selectConcessions({ catalog: data, quantities: next, returnHref: `${CONCESSION_PREVIEW_PATH}?${search}` });
    }
  }
  function continueToSummary() {
    const current = Date.now();
    setNow(current);
    if (validAt(current) && data && concessionSubtotal(data, quantities) !== null) {
      selectConcessions({ catalog: data, quantities, returnHref: `${CONCESSION_PREVIEW_PATH}?${search}` });
      router.push(BOOKING_SUMMARY_PREVIEW_PATH);
    }
  }
  const recovery = <Link href={seatHref} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-action px-5 font-semibold text-on-action">Quay lại chọn ghế</Link>;
  return <>
    <nav aria-label="Tiến trình chọn vé" className="mb-6 flex flex-wrap items-center gap-3 font-heading text-xs uppercase tracking-wide text-muted"><Link href={seatHref} className="inline-flex min-h-11 items-center text-accent">2. Ghế</Link><span aria-hidden="true">→</span><span aria-current="step" className="text-accent">3. Bắp nước</span><span aria-hidden="true">→</span><span>4. Thông tin đặt vé</span></nav>
    <section aria-label="Suất chiếu đã chọn" className="mb-6 flex items-center gap-4 rounded-2xl bg-panel p-5"><div className="w-16 shrink-0"><MoviePoster url={movie.posterUrl} title={movie.title} /></div><div className="min-w-0"><h2 className="break-words text-lg font-bold">{movie.title}</h2><p className="mt-1 text-sm text-muted">{cinema.name} · {showtime.hall.name}</p><p className="mt-1 text-sm text-accent">{formatShowtimeDate(showtimeDate(showtime.startsAt))} · {formatShowtimeTime(showtime.startsAt)} · Giờ Việt Nam</p></div></section>
    <h1 className="text-3xl font-bold sm:text-4xl">Bắp nước</h1><p className="mt-3 text-muted">Thêm chút hương vị cho buổi xem phim. Bạn có thể bỏ qua món đi kèm.</p>
    <p className="my-6 rounded-lg border border-outline/40 bg-panel-low p-4 text-sm leading-6 text-muted">Bản xem trước · Thực đơn và giá mẫu bằng VND. Đếm ngược theo hạn giữ ghế gốc; quay lại ghế để xác nhận tình trạng hiện tại. Đổi món không gia hạn. Chưa tạo đơn đặt vé hay thanh toán.</p>
    {expired && <section role="alert" className="mb-6 rounded-xl border border-error bg-panel p-5"><h2 className="font-bold text-error">Ghế xem trước hết hạn hoặc không khả dụng</h2><p className="mt-2 text-sm text-muted">Quay lại ghế và chọn lại. Cần kiểm tra tình trạng giữ ghế hiện tại tại bước chọn ghế.</p>{recovery}</section>}
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section aria-label="Thực đơn bắp nước" className="min-w-0">
        <div role="group" aria-label="Danh mục bắp nước" className="mb-6 flex flex-wrap gap-2">{CATEGORIES.map(item => <button key={item.value} type="button" aria-pressed={category === item.value} onClick={() => setCategory(item.value)} className={`min-h-11 rounded-lg px-5 text-sm font-semibold ${category === item.value ? "bg-action text-on-action" : "bg-panel text-muted hover:bg-panel-hover"}`}>{item.label}</button>)}</div>
        {loading && <p role="status" className="rounded-xl bg-panel p-10 text-center text-muted">Đang tải bắp nước...</p>}
        {error && <MovieFeedback title="Không thể tải bắp nước" message={error.message} retry={retry} />}
        {data?.length === 0 && <MovieFeedback title="Chưa có bắp nước" message="Bạn có thể tiếp tục không kèm món hoặc thử tải lại thực đơn." retry={retry} />}
        {data && data.length > 0 && !data.some(item => item.available) && <p role="status" className="mb-4 text-sm text-muted">Tất cả món mẫu đều không khả dụng. Bạn có thể tiếp tục không kèm món.</p>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data?.filter(item => category === "ALL" || category === item.category).map(item => <article key={item.id} aria-label={item.name} className="overflow-hidden rounded-2xl border border-outline/30 bg-panel">
          <div className="relative aspect-[4/3] bg-panel-high"><Image src={`/images/concessions/${item.image}.png`} alt="" fill sizes="(max-width: 639px) 100vw, (max-width: 1279px) 45vw, 260px" className={`object-cover ${!item.available ? "opacity-50" : ""}`} /></div>
          <div className="p-4"><h3 className="font-bold">{item.name}</h3><p className="mt-2 font-heading text-sm text-accent">{formatConcessionPrice(item.price)}</p><p className="mt-2 min-h-12 text-sm leading-6 text-muted">{item.description}</p><div className="mt-4 flex items-center justify-between gap-2 border-t border-outline/30 pt-4"><span className="text-xs text-muted">{item.available ? "Số lượng" : "Không khả dụng"}</span><div className="flex items-center gap-2"><button type="button" aria-label={`Giảm ${item.name}`} disabled={expired || !item.available || !quantities[item.id]} onClick={() => change(item.id, -1, Date.now())} className="min-h-11 min-w-11 rounded-lg bg-panel-high disabled:opacity-40">−</button><output aria-label={`${item.name} số lượng`} className="min-w-5 text-center tabular-nums">{quantities[item.id] ?? 0}</output><button type="button" aria-label={`Tăng ${item.name}`} disabled={expired || !item.available} onClick={() => change(item.id, 1, Date.now())} className="min-h-11 min-w-11 rounded-lg bg-action text-on-action disabled:opacity-40">+</button></div></div></div>
        </article>)}</div>
        {data && data.length > 0 && !data.some(item => category === "ALL" || category === item.category) && <p role="status">Danh mục này chưa có món. Chọn danh mục khác hoặc tiếp tục không kèm món.</p>}
      </section>
      <aside aria-label="Tóm tắt lựa chọn bắp nước" className="rounded-2xl border border-outline/40 bg-panel p-5 lg:sticky lg:top-24"><h2 className="text-xl font-bold">Lựa chọn của bạn</h2><div className="my-5 rounded-lg border border-outline/40 bg-panel-low p-4"><p className="text-sm text-accent">Đếm ngược giữ ghế — bản xem trước</p><p role="timer" aria-label="Thời gian xem trước còn lại" className="mt-2 font-heading text-2xl tabular-nums">{countdown}</p><p className="mt-2 text-xs leading-6 text-muted">Chỉ theo hạn giữ ghế gốc. Món đi kèm vẫn là bản xem trước trên thiết bị; quay lại ghế để kiểm tra giữ ghế.</p></div><p className="font-semibold">{count}</p><p className="mt-2 text-sm text-muted">{units.map(unit => `${unit.row}${unit.number}${unit.type === "COUPLE" ? " (Ghế đôi, 2 khách)" : ""}`).join(", ")}</p><Link href={seatHref} className="mt-2 inline-flex min-h-11 items-center text-sm text-accent">Đổi ghế (kiểm tra giữ ghế)</Link><h3 className="mt-4 border-t border-outline/30 pt-4 font-semibold">Bắp nước</h3><div aria-live="polite">{selectedItems.length ? <ul className="mt-3 space-y-3 text-sm">{selectedItems.map(item => <li key={item.id} className="flex justify-between gap-3"><span>{item.name} × {quantities[item.id]}</span><span>{formatConcessionPrice(item.price * quantities[item.id])}</span></li>)}</ul> : <p className="mt-3 text-sm text-muted">Chưa chọn món đi kèm.</p>}<div className="mt-5 flex justify-between gap-3 border-t border-outline/30 pt-5 font-bold"><span>Tạm tính bắp nước mẫu</span><span>{subtotal === null ? "Không khả dụng" : formatConcessionPrice(subtotal)}</span></div></div><p className="mt-3 text-xs leading-6 text-muted">Chỉ tính bắp nước. Bản xem trước này không tính giá ghế hay tổng tiền đặt vé cuối cùng.</p>{subtotal === null && <p role="alert" className="mt-3 text-sm text-error">Món đi kèm không còn khả dụng. Quay lại ghế để bắt đầu bản xem trước mới.</p>}<Button onClick={continueToSummary} disabled={expired || !data || subtotal === null} className="mt-5 w-full">Tiếp tục xem thông tin đặt vé</Button><p className="mt-3 text-center text-xs text-muted">Tiếp tục có hoặc không kèm món.</p></aside>
    </div>
    {expired && !expiryDismissed && <PreviewDialog title="Ghế xem trước đã hết hạn" closeLabel="Xem lại bản xem trước hết hạn" onClose={() => setExpiryDismissed(true)}><p className="text-sm leading-7 text-muted">Thời gian xem trước đã hết hoặc suất chiếu không còn khả dụng. Quay lại chọn ghế để chọn lại và kiểm tra tình trạng giữ ghế hiện tại.</p>{recovery}</PreviewDialog>}
  </>;
}
