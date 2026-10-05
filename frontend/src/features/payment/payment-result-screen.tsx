"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MovieFeedback } from "@/features/movie/movie-feedback";
import { MoviePoster } from "@/features/movie/movie-poster";
import { createBookingSummaryPreview } from "@/features/booking/booking-summary-service";
import { PAYMENT_METHOD_PREVIEW_PATH, PAYMENT_PROCESSING_PREVIEW_PATH, useConcessionPreview, type ConcessionSeatContext } from "@/features/concession/concession-preview-provider";
import { formatConcessionPrice } from "@/features/concession/concession-service";
import { createConcessionPreviewHandoff } from "@/features/seat/seat-service";
import { formatShowtimeDate, formatShowtimeTime, showtimeDate } from "@/features/showtime/showtime-service";
import { isReviewedSummaryCurrent } from "@/features/payment/payment-method-service";
import { getPaymentResultPresentation } from "@/features/payment/payment-result-service";

export function PaymentResultScreen() {
  const { preview } = useConcessionPreview();
  if (!preview?.paymentResult || !preview.reviewedSummary || !preview.concessions || !preview.selectedPaymentMethod?.available) return <><MovieFeedback title="Hoàn tất xử lý mẫu trước" message="Chưa có kết quả mẫu. Tiếp tục qua phương thức và xử lý thanh toán. Tải lại hoặc rời bản xem trước sẽ xóa dữ liệu; giá trị URL không thể xác nhận thanh toán." /><Link href={preview ? PAYMENT_METHOD_PREVIEW_PATH : "/movies"} className="mt-6 inline-flex min-h-11 items-center text-accent">{preview ? "Về phương thức thanh toán" : "Xem danh sách phim"}</Link></>;
  return <ResultPreview context={preview} />;
}

function ResultPreview({ context }: { context: ConcessionSeatContext }) {
  const { movie, cinema, showtime, map, selection, concessions, reviewedSummary: review, selectedPaymentMethod: method, paymentResult: result, seatHref } = context;
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  const quote = createBookingSummaryPreview(map.units.filter(unit => selection.unitIds.includes(unit.id)), concessions?.catalog ?? [], concessions?.quantities ?? {}, context.holdHandoff?.holds.map(hold => hold.seatId));
  const presentation = result ? getPaymentResultPresentation(result) : null;
  const reviewed = !!review && !!quote && isReviewedSummaryCurrent(review, quote) && movie.id === showtime.movieId && cinema.id === showtime.cinemaId;
  const validAt = (time: number) => reviewed && !!method?.available && !!createConcessionPreviewHandoff(selection, map, showtime, time, context.holdHandoff?.holds.map(hold => hold.seatId));
  const eligible = validAt(now);

  function resume(path: typeof PAYMENT_METHOD_PREVIEW_PATH | typeof PAYMENT_PROCESSING_PREVIEW_PATH) {
    const time = Date.now();
    setNow(time);
    if (validAt(time)) router.push(path);
  }

  if (!reviewed || !review || !method || !presentation || !result) return <><MovieFeedback title="Kiểm tra thông tin thanh toán mẫu đã thay đổi" message="Kết quả mẫu không khớp với lựa chọn hợp lệ đã kiểm tra. Quay về phương thức thanh toán để kiểm tra lại." /><Link href={PAYMENT_METHOD_PREVIEW_PATH} className="mt-6 inline-flex min-h-11 items-center text-accent">Về phương thức thanh toán</Link></>;
  const money = formatConcessionPrice;
  const seconds = Math.max(0, Math.ceil(((selection.expiresAt ?? now) - now) / 1000));
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const count = `${review.quote.seats.length} ghế · ${review.quote.guestCount} khách`;
  const tone = presentation.tone === "success" ? "border-success/40 text-success" : presentation.tone === "error" ? "border-error/40 text-error" : "border-action/40 text-accent";

  return <>
    <nav aria-label="Tiến trình chọn vé" className="mb-6 flex flex-wrap items-center gap-3 font-heading text-xs uppercase tracking-wide text-muted"><span>5. Thanh toán</span><span aria-hidden="true">→</span><span aria-current="step" className="text-accent">Kết quả — bản xem trước</span></nav>
    <section aria-label="Kết quả thanh toán — bản xem trước" className={`mb-6 flex items-start gap-4 rounded-2xl border bg-panel p-5 sm:p-6 ${tone}`}>
      <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-current font-heading text-2xl">{result.outcome === "success" ? "✓" : result.outcome === "failed" ? "×" : "…"}</span>
      <div className="min-w-0"><p className="mb-2 text-xs font-semibold uppercase tracking-wide">Minh họa trên thiết bị · Chưa được máy chủ xác minh</p><h1 className="text-2xl font-bold text-foreground sm:text-3xl">{presentation.title}</h1><p role="status" className="mt-3 text-sm leading-6 text-muted">{presentation.message}</p></div>
    </section>
    {!eligible && <section role="alert" className="mb-6 rounded-xl border border-error bg-panel p-5"><h2 className="font-bold text-error">Bản xem trước hết hạn hoặc suất chiếu không khả dụng</h2><p className="mt-2 text-sm leading-6 text-muted">Kết quả mẫu này không giữ chỗ hay cho phép vào rạp. Không thể thử lại hoặc tiếp tục xử lý. Quay lại chọn ghế để bắt đầu bản xem trước mới.</p><Link href={seatHref} className="mt-2 inline-flex min-h-11 items-center text-accent">Quay lại chọn ghế</Link></section>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <section aria-label="Suất chiếu và lựa chọn đã kiểm tra" className="overflow-hidden rounded-2xl border border-outline/30 bg-panel">
          <div className="flex items-start gap-5 bg-panel-low p-5 sm:p-6"><div className="w-20 shrink-0 sm:w-28"><MoviePoster url={movie.posterUrl} title={movie.title} /></div><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-accent">Suất chiếu mẫu</p><h2 className="mt-2 break-words text-2xl font-bold sm:text-3xl">{movie.title}</h2><p className="mt-3 text-sm leading-6 text-muted">{cinema.name} · {showtime.hall.name}</p><p className="mt-2 text-sm text-accent">{formatShowtimeDate(showtimeDate(showtime.startsAt))} · {formatShowtimeTime(showtime.startsAt)} · Giờ Việt Nam</p></div></div>
          <div className="p-5 sm:p-6"><h3 className="font-heading text-lg font-semibold">Ghế đã chọn</h3><p className="mt-2 text-sm text-muted">{count}</p><ul className="mt-4 flex flex-wrap gap-3">{review.quote.seats.map(line => <li key={line.unit.id} className="rounded-lg border border-outline/40 bg-panel-low px-4 py-3"><span className="font-heading font-bold text-accent">{line.unit.row}{line.unit.number}</span><span className="mt-1 block text-xs text-muted">{line.unit.type === "COUPLE" ? "Ghế đôi, 2 khách, một ghế" : "Ghế thường, 1 khách"}</span></li>)}</ul><p className="mt-4 text-xs leading-6 text-muted">Ghế là lựa chọn mẫu, chưa phải vé đã phát hành. Ghế đôi vẫn không thể tách cho hai khách.</p>
            <h3 className="mt-6 border-t border-outline/30 pt-5 font-heading text-lg font-semibold">Bắp nước</h3>{review.quote.concessions.length ? <ul className="mt-3 space-y-3 text-sm text-muted">{review.quote.concessions.map(line => <li key={line.item.id}>{line.item.name} × {line.quantity}</li>)}</ul> : <p className="mt-3 text-sm text-muted">Chưa chọn món đi kèm.</p>}
            <div className="mt-6 rounded-xl border border-outline/30 bg-panel-low p-5"><h3 className="font-semibold">Chưa phát hành vé vào rạp</h3><p className="mt-2 text-sm leading-6 text-muted">Chưa có giao dịch thanh toán thật, mã đặt vé, vé hay mã QR đặt vé. Trang này không có giá trị vào rạp. Chỉ thanh toán được máy chủ xác minh sau này mới cho phép phát hành vé và mã QR đặt vé.</p></div>
          </div>
        </section>
        <div className="mt-5 flex flex-wrap gap-3">
          {result.outcome !== "success" && <Button disabled={!eligible} onClick={() => resume(PAYMENT_PROCESSING_PREVIEW_PATH)}>{presentation.resumeLabel}</Button>}
          {result.outcome === "failed" && <Button variant="secondary" disabled={!eligible} onClick={() => resume(PAYMENT_METHOD_PREVIEW_PATH)}>Về phương thức thanh toán</Button>}
          {result.outcome === "success" && <Link href="/movies" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-action px-5 py-3 font-heading text-sm font-bold text-on-action hover:bg-action-hover">Xem danh sách phim</Link>}
          <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-panel-high px-5 py-3 font-heading text-sm font-semibold hover:bg-panel-hover">Về trang chủ</Link>
        </div>
        <p className="mt-4 text-xs leading-6 text-muted">Chỉ là bản xem trước. Quay lại bước trước không tạo thanh toán hay gia hạn giữ ghế gốc.</p>
      </div>
      <aside aria-label="Tóm tắt kết quả thanh toán" className="rounded-2xl border border-outline/40 bg-panel p-5 sm:p-6 lg:sticky lg:top-24"><h2 className="font-heading text-xl font-bold">Thông tin thanh toán</h2><p className="mt-2 text-xs text-accent">SỐ TIỀN MINH HỌA · VND</p><dl className="mt-5 space-y-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt className="text-muted">Phương thức đã chọn</dt><dd className="font-semibold">{method.name} (bản xem trước)</dd></div><div className="flex justify-between gap-3 border-t border-outline/30 pt-4"><dt>Ghế · {count}</dt><dd className="shrink-0">{money(review.quote.seatAmount)}</dd></div></dl><ul className="mt-3 space-y-3 text-sm text-muted">{review.quote.seats.map(line => <li key={line.unit.id} className="flex justify-between gap-3"><span>{line.unit.row}{line.unit.number} · {line.unit.type === "COUPLE" ? "Ghế đôi" : "Thường"}</span><span className="shrink-0">{money(line.amount)}</span></li>)}</ul><dl className="mt-5 space-y-4 border-t border-outline/30 pt-4 text-sm"><div className="flex justify-between gap-3"><dt>Bắp nước</dt><dd>{money(review.quote.concessionAmount)}</dd></div></dl><ul className="mt-3 space-y-3 text-sm text-muted">{review.quote.concessions.map(line => <li key={line.item.id} className="flex justify-between gap-3"><span>{line.item.name} × {line.quantity}</span><span className="shrink-0">{money(line.amount)}</span></li>)}</ul><dl className="mt-5 space-y-4 border-t border-outline/30 pt-4 text-sm"><div className="flex justify-between gap-3"><dt>Giảm giá khuyến mãi{review.promotion && <span className="mt-1 block text-xs text-success">{review.promotion.code} đã áp dụng</span>}</dt><dd className="text-success">−{money(review.promotion?.discount ?? 0)}</dd></div><div className="flex flex-wrap justify-between gap-3 border-t border-outline/30 pt-4 text-lg font-bold"><dt>Tổng tiền mẫu</dt><dd className="font-heading tabular-nums text-accent">{money(review.total)}</dd></div></dl><p className="mt-3 text-xs text-muted">Không phải số tiền đã thanh toán hay biên nhận.</p><div className="mt-6 rounded-lg bg-panel-low p-4"><p className="text-xs text-muted">Đếm ngược theo hạn giữ ghế gốc — bản xem trước</p><p role="timer" aria-label="Thời gian xem trước còn lại" className="mt-2 font-heading text-2xl tabular-nums text-accent">{countdown}</p><p className="mt-2 text-xs text-muted">Quay lại ghế để xác nhận tình trạng giữ ghế hiện tại</p></div></aside>
    </div>
  </>;
}
