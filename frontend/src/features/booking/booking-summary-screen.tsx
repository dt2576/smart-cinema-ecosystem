"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MovieFeedback } from "@/features/movie/movie-feedback";
import { MoviePoster } from "@/features/movie/movie-poster";
import { createConcessionPreviewHandoff } from "@/features/seat/seat-service";
import { formatShowtimeDate, formatShowtimeTime, showtimeDate } from "@/features/showtime/showtime-service";
import { PAYMENT_METHOD_PREVIEW_PATH, useConcessionPreview, type ConcessionSeatContext } from "@/features/concession/concession-preview-provider";
import { formatConcessionPrice } from "@/features/concession/concession-service";
import { PREVIEW_SEAT_PRICES, createBookingSummaryPreview, createMockPromotionService, normalizePreviewCode, previewGrandTotal } from "@/features/booking/booking-summary-service";
import type { PromotionPreviewResult } from "@/features/booking/booking-summary.types";

export function BookingSummaryScreen() {
  const { preview } = useConcessionPreview();
  if (!preview?.concessions) return <><MovieFeedback title="Chưa có bản xem trước đặt vé" message="Chọn ghế và đi qua bước bắp nước trước. Tải lại hoặc rời bản xem trước sẽ xóa lựa chọn trên thiết bị. Chưa tạo đơn đặt vé." /><Link href="/movies" className="mt-6 inline-flex min-h-11 items-center text-accent">Xem danh sách phim</Link></>;
  return <BookingSummaryContent context={preview} />;
}

function BookingSummaryContent({ context }: { context: ConcessionSeatContext }) {
  const { movie, cinema, showtime, map, selection, seatHref, concessions } = context;
  const [now, setNow] = useState(() => Date.now());
  const [code, setCode] = useState(context.reviewedSummary?.promotion?.code ?? "");
  const [result, setResult] = useState<PromotionPreviewResult | null>(context.reviewedSummary?.promotion ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const { reviewSummary } = useConcessionPreview();
  const request = useRef<AbortController | null>(null);
  const service = useMemo(() => createMockPromotionService(), []);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); request.current?.abort(); };
  }, []);

  const units = map.units.filter(unit => selection.unitIds.includes(unit.id));
  const quote = createBookingSummaryPreview(units, concessions?.catalog ?? [], concessions?.quantities ?? {}, context.holdHandoff?.holds.map(hold => hold.seatId));
  const validAt = (time: number) => !!quote && !!concessions && movie.id === showtime.movieId && cinema.id === showtime.cinemaId && !!createConcessionPreviewHandoff(selection, map, showtime, time, context.holdHandoff?.holds.map(hold => hold.seatId));
  const eligible = validAt(now);
  const applied = eligible && result?.outcome === "APPLIED" && result.code === normalizePreviewCode(code) && result.baseAmount === quote?.subtotal ? result : null;
  const total = quote ? previewGrandTotal(quote.subtotal, applied?.discount ?? 0) : null;
  const seconds = Math.max(0, Math.ceil(((selection.expiresAt ?? now) - now) / 1000));
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const count = `${units.length} ghế · ${quote?.guestCount ?? 0} khách${quote?.guestCount === 1 ? "" : "s"}`;

  function resetPromotion(value: string) {
    request.current?.abort();
    setCode(value);
    setResult(null);
    setError(null);
    setPending(false);
    reviewSummary(null);
  }

  async function applyPromotion(readTime: () => number) {
    const current = readTime();
    setNow(current);
    if (!validAt(current) || !quote || !code.trim()) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setResult(null);
    setError(null);
    reviewSummary(null);
    try {
      const response = await service.apply(code, quote.subtotal, controller.signal);
      if (!controller.signal.aborted && validAt(readTime())) setResult(response);
    } catch (failure) {
      if (!controller.signal.aborted && validAt(readTime())) setError(failure instanceof Error ? failure.message : "Không thể tải khuyến mãi mẫu. Vui lòng thử lại.");
    } finally {
      if (!controller.signal.aborted) { setPending(false); setNow(readTime()); }
    }
  }

  function continueToPayment(current: number) {
    setNow(current);
    if (validAt(current) && quote && total !== null && !pending && !error) {
      reviewSummary({ quote, promotion: applied, total });
      const scenario = new URL(seatHref, "https://preview.local").searchParams.get("paymentPreview");
      router.push(PAYMENT_METHOD_PREVIEW_PATH + (scenario ? `?paymentPreview=${encodeURIComponent(scenario)}` : ""));
    }
  }

  const seatRecovery = <Link href={seatHref} className="inline-flex min-h-11 items-center text-accent">Quay lại chọn ghế</Link>;
  if (!quote) return <><MovieFeedback title="Lựa chọn xem trước không hợp lệ" message="Một số mục đã chọn không khả dụng hoặc không hợp lệ. Quay lại chọn ghế và chọn lại." />{seatRecovery}</>;
  const money = formatConcessionPrice;

  return <>
    <nav aria-label="Tiến trình chọn vé" className="mb-6 flex flex-wrap items-center gap-3 font-heading text-xs uppercase tracking-wide text-muted"><Link href={concessions!.returnHref} className="inline-flex min-h-11 items-center text-accent">3. Bắp nước</Link><span aria-hidden="true">→</span><span aria-current="step" className="text-accent">4. Thông tin đặt vé</span><span aria-hidden="true">→</span><span>5. Thanh toán</span></nav>
    <h1 className="text-3xl font-bold sm:text-4xl">Thông tin đặt vé</h1><p className="mt-3 text-muted">Kiểm tra thông tin trước khi sang bước tiếp theo.</p>
    <section aria-label="Suất chiếu đã chọn" className="my-6 flex flex-wrap items-center gap-5 rounded-2xl border border-outline/30 bg-panel p-5 sm:p-6">
      <div className="w-20 shrink-0"><MoviePoster url={movie.posterUrl} title={movie.title} /></div>
      <div className="min-w-0 flex-1"><h2 className="break-words text-xl font-bold">{movie.title}</h2><p className="mt-2 text-sm text-muted">{movie.duration} phút · {movie.ageRating} · {movie.language}</p><p className="mt-2 text-sm">{cinema.name} · {showtime.hall.name}</p><p className="mt-2 text-sm text-accent">{formatShowtimeDate(showtimeDate(showtime.startsAt))} · {formatShowtimeTime(showtime.startsAt)} · Giờ Việt Nam</p></div>
      <div className="w-full rounded-xl bg-panel-low p-4 sm:w-auto"><p className="text-xs text-muted">Đếm ngược giữ ghế — bản xem trước</p><p role="timer" aria-label="Thời gian xem trước còn lại" className="mt-2 font-heading text-2xl tabular-nums text-accent">{countdown}</p><p className="mt-2 text-xs text-muted">Quay lại ghế để xác nhận tình trạng giữ ghế hiện tại</p></div>
    </section>
    <p className="mb-6 rounded-lg border border-outline/40 bg-panel-low p-4 text-sm leading-6 text-muted">Chỉ là bản xem trước · Giá, giảm giá và tổng tiền dưới đây là số tiền mẫu bằng VND, không phải số tiền xác nhận từ máy chủ. Chưa tạo đơn đặt vé hay thanh toán. Ghế đang giữ vẫn theo hạn của máy chủ.</p>
    {!eligible && <section role="alert" className="mb-6 rounded-xl border border-error bg-panel p-5"><h2 className="font-bold text-error">Bản xem trước hết hạn hoặc suất chiếu không khả dụng</h2><p className="mt-2 text-sm text-muted">Không thể tiếp tục. Quay lại chọn ghế, chọn lại và kiểm tra tình trạng giữ ghế tại đó.</p>{seatRecovery}</section>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        <section aria-label="Ghế đã chọn" className="rounded-2xl border border-outline/30 bg-panel p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">Ghế đã chọn</h2><Link href={seatHref} className="inline-flex min-h-11 items-center text-sm text-accent">Đổi ghế (kiểm tra giữ ghế)</Link></div><p className="mb-4 text-sm text-muted">{count}</p><ul className="divide-y divide-outline/30">{quote.seats.map(line => <li key={line.unit.id} className="flex items-center justify-between gap-4 py-4"><div><p className="font-semibold">{line.unit.row}{line.unit.number} · {line.unit.type === "COUPLE" ? "Ghế đôi" : "Thường"}</p><p className="mt-1 text-xs text-muted">{line.unit.type === "COUPLE" ? "Một ghế không thể tách · 2 khách" : "Một ghế · 1 khách"}</p></div><span className="shrink-0 font-heading tabular-nums">{money(line.amount)}</span></li>)}</ul><p className="mt-3 text-xs leading-6 text-muted">Giá mẫu cho cả ghế: Ghế thường {money(PREVIEW_SEAT_PRICES.STANDARD)}; Ghế đôi {money(PREVIEW_SEAT_PRICES.COUPLE)}. Giá ghế đôi không tính theo số khách.</p></section>
        <section aria-label="Bắp nước đã chọn" className="rounded-2xl border border-outline/30 bg-panel p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">Bắp nước</h2><Link href={concessions!.returnHref} className="inline-flex min-h-11 items-center text-sm text-accent">Chỉnh sửa bắp nước</Link></div>{quote.concessions.length ? <ul className="divide-y divide-outline/30">{quote.concessions.map(line => <li key={line.item.id} className="flex items-center gap-3 py-4"><Image src={`/images/concessions/${line.item.image}.png`} width={56} height={56} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="break-words font-semibold">{line.item.name} × {line.quantity}</p><p className="mt-1 text-xs text-muted">{money(line.item.price)} mỗi món</p></div><span className="font-heading tabular-nums">{money(line.amount)}</span></li>)}</ul> : <p className="mt-3 text-sm text-muted">Chưa chọn món đi kèm.</p>}</section>
        <section aria-label="Khuyến mãi — bản xem trước" className="rounded-2xl border border-outline/30 bg-panel p-5 sm:p-6"><h2 className="text-xl font-bold">Mã khuyến mãi</h2><p className="mt-2 text-sm text-muted">Thử mã mẫu cho bản xem trước này.</p><form onSubmit={event => { event.preventDefault(); void applyPromotion(Date.now); }} className="mt-5"><label htmlFor="promotion-code" className="text-sm font-semibold">Mã khuyến mãi</label><div className="mt-2 flex flex-col gap-3 sm:flex-row"><input id="promotion-code" value={code} onChange={event => resetPromotion(event.target.value)} disabled={!eligible} autoComplete="off" spellCheck={false} aria-describedby="promotion-demo-rules" className="min-h-11 min-w-0 flex-1 rounded-lg border border-outline bg-panel-low px-4 text-foreground disabled:opacity-50" placeholder="Ví dụ: DEMO10" /><Button type="submit" disabled={!eligible || pending || !code.trim()}>{pending ? "Đang áp dụng..." : "Áp dụng khuyến mãi"}</Button></div></form>
          {eligible && pending && <p role="status" className="mt-4 text-sm text-muted">Đang kiểm tra khuyến mãi mẫu...</p>}
          {applied && <p role="status" className="mt-4 rounded-lg bg-success/10 p-4 text-sm text-success">{applied.code} đã áp dụng · Giảm giá mẫu {money(applied.discount)}</p>}
          {eligible && result && result.outcome !== "APPLIED" && <p role="alert" className="mt-4 text-sm text-error">{result.message} Bạn có thể tiếp tục mà không dùng khuyến mãi.</p>}
          {eligible && error && <div role="alert" className="mt-4 text-sm text-error"><p>{error}</p><Button variant="secondary" onClick={() => void applyPromotion(Date.now)} className="mt-3">Thử lại khuyến mãi</Button></div>}
          {code && <Button variant="text" disabled={!eligible} onClick={() => resetPromotion("")} className="mt-3">Gỡ khuyến mãi</Button>}
          <details id="promotion-demo-rules" className="mt-4 text-xs leading-6 text-muted"><summary className="cursor-pointer py-2">Mã mẫu và quy tắc xem trước</summary><p>DEMO10: giảm 10% tổng tiền vé và bắp nước, làm tròn xuống đồng VND. Mỗi lần một mã mẫu; không cộng dồn.</p><p className="mt-2">DEMOEXPIRED: hết hạn. DEMOINELIGIBLE: không đủ điều kiện. DEMORETRY: lần đầu lỗi, thử lại áp dụng cùng mức giảm mẫu 10%. Mã khác không hợp lệ.</p><p className="mt-2">Dữ liệu mẫu không xác định điều kiện, phạm vi giảm giá, giới hạn sử dụng hay cách làm tròn thực tế. Đổi mã hoặc quay về từ bắp nước sẽ xóa giảm giá mẫu; áp dụng lại sau khi kiểm tra thay đổi.</p></details>
        </section>
      </div>
      <aside aria-label="Tổng tiền xem trước" className="rounded-2xl border border-outline/50 bg-panel p-5 sm:p-6 lg:sticky lg:top-24"><h2 className="text-xl font-bold">Thông tin thanh toán</h2><p className="mt-2 text-xs text-accent">SỐ TIỀN MINH HỌA · VND</p><dl aria-live="polite" className="mt-6 space-y-4 text-sm"><div className="flex justify-between gap-4"><dt>Tiền vé</dt><dd className="font-heading tabular-nums">{money(quote.seatAmount)}</dd></div><div className="flex justify-between gap-4"><dt>Tiền bắp nước</dt><dd className="font-heading tabular-nums">{money(quote.concessionAmount)}</dd></div><div className="flex justify-between gap-4"><dt>Giảm giá khuyến mãi</dt><dd className="font-heading tabular-nums text-success">−{money(applied?.discount ?? 0)}</dd></div><div className="flex justify-between gap-4 border-t border-outline/40 pt-5 text-lg font-bold"><dt>Tổng thanh toán mẫu</dt><dd className="font-heading tabular-nums text-accent">{money(total ?? quote.subtotal)}</dd></div></dl><p className="mt-5 text-xs leading-6 text-muted">Ví dụ này không có phí bổ sung. Dịch vụ đặt vé thực tế phải xác nhận mọi số tiền và điều kiện.</p><Button disabled={!eligible || pending || !!error || total === null} onClick={() => continueToPayment(Date.now())} className="mt-6 w-full">Tiếp tục chọn phương thức thanh toán</Button><Link href={concessions!.returnHref} className="mt-3 inline-flex min-h-11 w-full items-center justify-center text-sm text-accent">Quay lại bắp nước</Link><p className="mt-3 text-xs leading-6 text-muted">Mở bước xem trước tiếp theo không khởi tạo thanh toán hay khóa lựa chọn. Thay đổi khuyến mãi không kéo dài thời gian giữ ghế.</p></aside>
    </div>
  </>;
}
