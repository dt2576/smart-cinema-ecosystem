"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MovieFeedback } from "@/features/movie/movie-feedback";
import { MoviePoster } from "@/features/movie/movie-poster";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { createBookingSummaryPreview } from "@/features/booking/booking-summary-service";
import { BOOKING_SUMMARY_PREVIEW_PATH, PAYMENT_PROCESSING_PREVIEW_PATH, useConcessionPreview, type ConcessionSeatContext } from "@/features/concession/concession-preview-provider";
import { formatConcessionPrice } from "@/features/concession/concession-service";
import { createConcessionPreviewHandoff } from "@/features/seat/seat-service";
import { formatShowtimeDate, formatShowtimeTime, showtimeDate } from "@/features/showtime/showtime-service";
import { availablePaymentMethod, createMockPaymentMethodService, isReviewedSummaryCurrent, parsePaymentMethodScenario } from "@/features/payment/payment-method-service";
import type { PaymentMethodScenario } from "@/features/payment/payment-method.types";

export function PaymentMethodScreen() {
  const { preview } = useConcessionPreview();
  const search = useSearchParams();
  const scenario = parsePaymentMethodScenario(search.get("paymentPreview"));
  if (!preview?.reviewedSummary || !preview.concessions) return <><MovieFeedback title="Kiểm tra bản xem trước đặt vé trước" message="Tiếp tục từ thông tin đặt vé để chọn phương thức thanh toán mẫu. Tải lại hoặc rời bản xem trước sẽ xóa dữ liệu trên thiết bị; chưa có đơn đặt vé hay thanh toán." /><Link href={preview ? BOOKING_SUMMARY_PREVIEW_PATH : "/movies"} className="mt-6 inline-flex min-h-11 items-center text-accent">{preview ? "Về thông tin đặt vé" : "Xem danh sách phim"}</Link></>;
  return <PaymentMethodOptions key={scenario} context={preview} scenario={scenario} />;
}

function PaymentMethodOptions({ context, scenario }: { context: ConcessionSeatContext; scenario: PaymentMethodScenario }) {
  const { movie, cinema, showtime, map, selection, concessions, reviewedSummary: review, seatHref } = context;
  const service = useMemo(() => createMockPaymentMethodService(scenario), [scenario]);
  const load = useCallback((signal: AbortSignal) => service.list(signal), [service]);
  const { data, loading, error, retry } = useMovieRequest(load);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const router = useRouter();
  const { selectPaymentMethod } = useConcessionPreview();
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);

  const units = map.units.filter(unit => selection.unitIds.includes(unit.id));
  const currentQuote = createBookingSummaryPreview(units, concessions?.catalog ?? [], concessions?.quantities ?? {}, context.holdHandoff?.holds.map(hold => hold.seatId));
  const reviewed = !!review && !!currentQuote && isReviewedSummaryCurrent(review, currentQuote);
  const validAt = (time: number) => reviewed && movie.id === showtime.movieId && cinema.id === showtime.cinemaId && !!createConcessionPreviewHandoff(selection, map, showtime, time, context.holdHandoff?.holds.map(hold => hold.seatId));
  const eligible = validAt(now);
  const method = availablePaymentMethod(data ?? [], selectedId);
  const seconds = Math.max(0, Math.ceil(((selection.expiresAt ?? now) - now) / 1000));
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const back = <Link href={BOOKING_SUMMARY_PREVIEW_PATH} className="inline-flex min-h-11 items-center text-accent">Về thông tin đặt vé</Link>;

  function chooseMethod(id: string, currentTime: number) {
    setNow(currentTime);

    if (validAt(currentTime) && availablePaymentMethod(data ?? [], id)) setSelectedId(id);
  }
  function continueToProcessing(currentTime: number) {
    setNow(currentTime);
    const selected = availablePaymentMethod(data ?? [], selectedId);
    if (!validAt(currentTime) || !selected || loading || error) return;
    selectPaymentMethod(selected);
    router.push(PAYMENT_PROCESSING_PREVIEW_PATH);
  }
  if (!reviewed || !review || !currentQuote) return <><MovieFeedback title="Kiểm tra tổng tiền mẫu đã thay đổi" message="Lựa chọn đã xác nhận không còn khớp với bản xem trước này. Quay về thông tin đặt vé trước khi tiếp tục." />{back}</>;
  const count = `${review.quote.seats.length} ghế · ${review.quote.guestCount} khách`;
  const money = formatConcessionPrice;

  return <>
    <nav aria-label="Tiến trình chọn vé" className="mb-6 flex flex-wrap items-center gap-3 font-heading text-xs uppercase tracking-wide text-muted"><Link href={BOOKING_SUMMARY_PREVIEW_PATH} className="inline-flex min-h-11 items-center text-accent">4. Thông tin đặt vé</Link><span aria-hidden="true">→</span><span aria-current="step" className="text-accent">5. Thanh toán</span></nav>
    <section aria-label="Suất chiếu đã chọn" className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-outline/30 bg-panel p-5"><div className="w-16 shrink-0"><MoviePoster url={movie.posterUrl} title={movie.title} /></div><div className="min-w-0 flex-1"><h2 className="break-words text-xl font-bold">{movie.title}</h2><p className="mt-2 text-sm text-muted">{cinema.name} · {showtime.hall.name}</p><p className="mt-2 text-sm text-accent">{formatShowtimeDate(showtimeDate(showtime.startsAt))} · {formatShowtimeTime(showtime.startsAt)} · Giờ Việt Nam</p><p className="mt-2 text-sm text-muted">{units.map(unit => `${unit.row}${unit.number}`).join(", ")} · {count}</p></div></section>
    <h1 className="text-3xl font-bold sm:text-4xl">Phương thức thanh toán</h1><p className="mt-3 text-muted">Chọn một phương thức mẫu khả dụng để xem bước tiếp theo.</p>
    <p className="my-6 rounded-lg border border-outline/40 bg-panel-low p-4 text-sm leading-6 text-muted">Chỉ là bản xem trước · Không liên hệ nhà cung cấp hay thu tiền. Tổng tiền là minh họa. Chưa tạo đơn đặt vé, giao dịch thanh toán, vé hay mã QR đặt vé.</p>
    {!eligible && <section role="alert" className="mb-6 rounded-xl border border-error bg-panel p-5"><h2 className="font-bold text-error">Bản xem trước hết hạn hoặc suất chiếu không khả dụng</h2><p className="mt-2 text-sm text-muted">Quay lại chọn ghế và chọn lại. Ghế trước đó chưa được đặt trong bản xem trước này.</p><Link href={seatHref} className="mt-2 inline-flex min-h-11 items-center text-accent">Quay lại chọn ghế</Link></section>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label="Phương thức thanh toán" className="min-w-0">
        {loading && <p role="status" className="rounded-xl bg-panel p-10 text-center text-muted">Đang tải phương thức thanh toán...</p>}
        {error && <MovieFeedback title="Không thể tải phương thức thanh toán" message={error.message} retry={retry} />}
        {data?.length === 0 && <MovieFeedback title="Chưa có phương thức thanh toán" message="Chưa có phương thức mẫu để chọn. Thử lại hoặc quay về thông tin đặt vé." retry={retry} />}
        {data && data.length > 0 && !data.some(item => item.available) && <p role="status" className="mb-4 rounded-lg bg-panel p-4 text-sm text-muted">Tất cả phương thức mẫu đều không khả dụng. Quay về thông tin đặt vé hoặc thử lại.</p>}
        {data && data.length > 0 && <fieldset className="space-y-4"><legend className="mb-4 font-heading text-lg font-semibold">Chọn phương thức thanh toán</legend>{data.map(item => <label key={item.id} className={`flex min-h-28 items-start gap-4 rounded-xl border p-5 transition-colors ${selectedId === item.id ? "border-action bg-panel-high ring-1 ring-action" : "border-outline/30 bg-panel"} ${item.available && eligible ? "cursor-pointer hover:bg-panel-hover" : "opacity-60"}`}><input type="radio" name="payment-method" value={item.id} checked={selectedId === item.id} disabled={!item.available || !eligible} aria-label={`${item.name} · ${item.available ? "Bản xem trước khả dụng" : "Bản xem trước không khả dụng"}`} onChange={() => chooseMethod(item.id, Date.now())} className="mt-1 h-5 w-5 shrink-0 accent-action" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="font-heading font-bold">{item.name}</span><span className="rounded bg-panel-low px-2 py-1 text-xs text-muted">{item.available ? "Chỉ xem trước" : "Không khả dụng"}</span></span><span className="mt-2 block text-sm leading-6 text-muted">{item.description}</span></span><span aria-hidden="true" className="hidden shrink-0 rounded-lg bg-panel-low px-3 py-2 font-heading text-sm font-semibold text-accent sm:block">{item.label}</span></label>)}</fieldset>}
        {data && data.length > 0 && !data.some(item => item.available) && <Button variant="secondary" onClick={retry} className="mt-4">Thử lại</Button>}
        <p className="mt-6 text-xs leading-6 text-muted">Dữ liệu mẫu minh họa cách chọn phương thức. Phương thức thực tế phụ thuộc cấu hình máy chủ sau này. Không yêu cầu đăng nhập nhà cung cấp, thông tin thẻ, số dư ví hay mã QR thanh toán tại đây.</p>
      </section>
      <aside aria-label="Tóm tắt thanh toán mẫu" className="rounded-2xl border border-outline/50 bg-panel p-5 sm:p-6 lg:sticky lg:top-24"><h2 className="text-xl font-bold">Thông tin thanh toán</h2><p className="mt-2 text-xs text-accent">SỐ TIỀN MINH HỌA · VND</p><div className="my-5 rounded-lg border border-outline/30 bg-panel-low p-4"><p className="text-sm text-muted">Đếm ngược giữ ghế — bản xem trước</p><p role="timer" aria-label="Thời gian xem trước còn lại" className="mt-2 font-heading text-2xl tabular-nums text-accent">{countdown}</p><p className="mt-2 text-xs text-muted">Quay lại ghế để xác nhận tình trạng giữ ghế hiện tại</p></div><p className="font-semibold">{count}</p><ul className="mt-3 space-y-2 text-sm text-muted">{review.quote.seats.map(line => <li key={line.unit.id}>{line.unit.row}{line.unit.number} · {line.unit.type === "COUPLE" ? "Ghế đôi, 2 khách, một ghế" : "Ghế thường, 1 khách"}</li>)}</ul><h3 className="mt-5 border-t border-outline/30 pt-4 font-semibold">Bắp nước</h3>{review.quote.concessions.length ? <ul className="mt-3 space-y-2 text-sm text-muted">{review.quote.concessions.map(line => <li key={line.item.id}>{line.item.name} × {line.quantity}</li>)}</ul> : <p className="mt-3 text-sm text-muted">Chưa chọn món đi kèm.</p>}<dl className="mt-5 space-y-4 border-t border-outline/30 pt-5 text-sm"><div className="flex justify-between gap-3"><dt>Tiền vé</dt><dd>{money(review.quote.seatAmount)}</dd></div><div className="flex justify-between gap-3"><dt>Tiền bắp nước</dt><dd>{money(review.quote.concessionAmount)}</dd></div><div className="flex justify-between gap-3"><dt>Giảm giá khuyến mãi{review.promotion && <span className="mt-1 block text-xs text-success">{review.promotion.code} đã áp dụng</span>}</dt><dd className="text-success">−{money(review.promotion?.discount ?? 0)}</dd></div><div className="flex justify-between gap-3 border-t border-outline/40 pt-5 text-lg font-bold"><dt>Tổng thanh toán mẫu</dt><dd className="font-heading tabular-nums text-accent">{money(review.total)}</dd></div></dl><p aria-live="polite" className="mt-5 text-sm text-muted">{method ? `Đã chọn: ${method.name} (bản xem trước)` : "Chọn phương thức khả dụng để tiếp tục."}</p><Button disabled={!eligible || !method || loading || !!error} onClick={() => continueToProcessing(Date.now())} className="mt-5 w-full">Tiếp tục xử lý thanh toán mẫu</Button><div className="mt-3 text-center text-sm">{back}</div><p className="mt-4 text-xs leading-6 text-muted">Đổi phương thức không gia hạn. Chưa khởi tạo thanh toán và vẫn có thể sửa lựa chọn.</p></aside>
    </div>
  </>;
}
