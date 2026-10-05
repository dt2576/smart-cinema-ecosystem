"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MovieFeedback } from "@/features/movie/movie-feedback";
import { MoviePoster } from "@/features/movie/movie-poster";
import { createBookingSummaryPreview } from "@/features/booking/booking-summary-service";
import { PAYMENT_METHOD_PREVIEW_PATH, PAYMENT_PROCESSING_PREVIEW_PATH, PAYMENT_RESULT_PREVIEW_PATH, useConcessionPreview, type ConcessionSeatContext } from "@/features/concession/concession-preview-provider";
import { formatConcessionPrice } from "@/features/concession/concession-service";
import { createConcessionPreviewHandoff } from "@/features/seat/seat-service";
import { formatShowtimeDate, formatShowtimeTime, showtimeDate } from "@/features/showtime/showtime-service";
import { isReviewedSummaryCurrent } from "@/features/payment/payment-method-service";
import { createPaymentResultPreview } from "@/features/payment/payment-result-service";
import { createMockPaymentProcessingService } from "@/features/payment/payment-processing-service";
import type { PaymentProcessingPhase, PaymentProcessingScenario, PaymentPreviewOutcome } from "@/features/payment/payment-processing.types";

const OUTCOME_LABELS: Record<PaymentPreviewOutcome, string> = {
  success: "Mẫu thành công", failed: "Mẫu thất bại", pending: "Mẫu chờ xử lý",
};

export function PaymentProcessingScreen() {
  const { preview } = useConcessionPreview();
  if (!preview?.reviewedSummary || !preview.concessions || !preview.selectedPaymentMethod?.available) return <><MovieFeedback title="Chọn phương thức thanh toán trước" message="Tiếp tục từ phương thức thanh toán mẫu đã kiểm tra. Tải lại hoặc rời quy trình sẽ xóa dữ liệu trên thiết bị; giá trị URL không thể tạo thanh toán." /><Link href={preview ? PAYMENT_METHOD_PREVIEW_PATH : "/movies"} className="mt-6 inline-flex min-h-11 items-center text-accent">{preview ? "Về phương thức thanh toán" : "Xem danh sách phim"}</Link></>;
  return <ProcessingPreview context={preview} />;
}

function ProcessingPreview({ context }: { context: ConcessionSeatContext }) {
  const { movie, cinema, showtime, map, selection, concessions, reviewedSummary: review, selectedPaymentMethod: method, seatHref } = context;
  const pathname = usePathname();
  const router = useRouter();
  const { recordPaymentResult } = useConcessionPreview();
  const [scenario, setScenario] = useState<PaymentProcessingScenario>(context.paymentResult?.scenario ?? "success");
  const service = useMemo(() => createMockPaymentProcessingService(scenario), [scenario]);
  const [phase, setPhase] = useState<PaymentProcessingPhase | "ready" | "error" | PaymentPreviewOutcome>(context.paymentResult?.outcome ?? "ready");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const active = useRef<AbortController | null>(null);
  const quote = useMemo(() => createBookingSummaryPreview(map.units.filter(unit => selection.unitIds.includes(unit.id)), concessions?.catalog ?? [], concessions?.quantities ?? {}, context.holdHandoff?.holds.map(hold => hold.seatId)), [map, selection, concessions, context.holdHandoff]);
  const validAt = useCallback((time: number) => !!review && !!quote && isReviewedSummaryCurrent(review, quote) && !!method?.available && movie.id === showtime.movieId && cinema.id === showtime.cinemaId && !!createConcessionPreviewHandoff(selection, map, showtime, time, context.holdHandoff?.holds.map(hold => hold.seatId)), [review, quote, method, movie.id, cinema.id, selection, map, showtime, context.holdHandoff]);
  const eligible = pathname === PAYMENT_PROCESSING_PREVIEW_PATH && validAt(now);
  const busy = phase === "processing" || phase === "verifying";
  const outcome = phase === "success" || phase === "failed" || phase === "pending" ? phase : null;

  useEffect(() => {
    const refresh = () => {
      const time = Date.now();
      setNow(time);
      if (!validAt(time)) active.current?.abort();
    };
    const timer = setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); active.current?.abort(); active.current = null; };
  }, [validAt, pathname]);

  async function runPreview() {
    const time = Date.now();
    setNow(time);
    if (active.current || !validAt(time) || pathname !== PAYMENT_PROCESSING_PREVIEW_PATH) return;
    const controller = new AbortController();
    active.current = controller;
    setError(null);
    recordPaymentResult(null);
    try {
      const result = await service.run(controller.signal, setPhase);
      if (active.current === controller && !controller.signal.aborted) {
        const completedAt = Date.now();
        setNow(completedAt);
        if (validAt(completedAt)) setPhase(result);
      }
    } catch (failure) {
      if (active.current === controller && !controller.signal.aborted) {
        setError(failure instanceof Error ? failure.message : "Không thể hoàn tất bản xem trước. Vui lòng thử lại.");
        setPhase("error");
      }
    } finally {
      if (active.current === controller) active.current = null;
    }
  }

  function viewResult() {
    const time = Date.now();
    setNow(time);
    const result = createPaymentResultPreview(outcome, scenario);
    if (!validAt(time) || !result || active.current) return;
    recordPaymentResult(result);
    router.push(PAYMENT_RESULT_PREVIEW_PATH);
  }

  if (!review || !quote || !isReviewedSummaryCurrent(review, quote) || !method) return <><MovieFeedback title="Kiểm tra dữ liệu mẫu đã thay đổi" message="Quay về phương thức thanh toán và kiểm tra lựa chọn hiện tại trước khi tiếp tục." /><Link href={PAYMENT_METHOD_PREVIEW_PATH} className="inline-flex min-h-11 items-center text-accent">Về phương thức thanh toán</Link></>;
  const seconds = Math.max(0, Math.ceil(((selection.expiresAt ?? now) - now) / 1000));
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const money = formatConcessionPrice;
  const count = `${review.quote.seats.length} ghế · ${review.quote.guestCount} khách`;
  const status = !eligible ? "Bản xem trước hết hạn hoặc suất chiếu không khả dụng" : phase === "ready" ? "Sẵn sàng xem xử lý mẫu" : phase === "processing" ? "Đang xử lý mẫu..." : phase === "verifying" ? "Đang xác minh mẫu..." : phase === "error" ? "Không thể hoàn tất bản xem trước" : OUTCOME_LABELS[phase];

  return <>
    <nav aria-label="Tiến trình chọn vé" className="mb-6 flex flex-wrap items-center gap-3 font-heading text-xs uppercase tracking-wide text-muted"><Link href={PAYMENT_METHOD_PREVIEW_PATH} className="inline-flex min-h-11 items-center text-accent">5. Phương thức thanh toán</Link><span aria-hidden="true">→</span><span aria-current="step" className="text-accent">Xử lý — bản xem trước</span></nav>
    <section aria-label="Suất chiếu đã chọn" className="mb-8 flex flex-wrap items-center gap-4 rounded-xl border border-outline/30 bg-panel p-5"><div className="w-14 shrink-0"><MoviePoster url={movie.posterUrl} title={movie.title} /></div><div className="min-w-0 flex-1 basis-40"><h2 className="break-words text-xl font-bold">{movie.title}</h2><p className="mt-2 text-sm text-muted">{cinema.name} · {showtime.hall.name}</p><p className="mt-2 text-sm text-accent">{formatShowtimeDate(showtimeDate(showtime.startsAt))} · {formatShowtimeTime(showtime.startsAt)} · Giờ Việt Nam</p></div><div className="w-full rounded-lg bg-panel-low p-3 sm:w-auto"><p className="text-xs text-muted">Đếm ngược giữ ghế mẫu</p><p role="timer" aria-label="Thời gian xem trước còn lại" className="mt-1 font-heading text-xl tabular-nums text-accent">{countdown}</p><p className="mt-1 text-xs text-muted">Quay lại ghế để xác nhận tình trạng giữ ghế hiện tại</p></div></section>
    <section aria-label="Xử lý thanh toán — bản xem trước" className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-outline/30 border-t-action bg-panel p-5 shadow-xl sm:p-8">
      <div aria-hidden="true" className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 font-heading text-2xl ${eligible && busy ? "border-outline border-t-action motion-safe:animate-spin" : eligible && outcome === "success" ? "border-success text-success" : "border-action text-accent"}`}>{busy && eligible ? "" : outcome === "success" && eligible ? "✓" : "···"}</div>
      <h1 className="text-center text-2xl font-bold sm:text-3xl">Xử lý thanh toán</h1>
      <p role="status" aria-live="polite" className="mt-4 text-center font-heading text-lg text-accent">{status}</p>
      <p className="mt-3 text-center text-sm leading-6 text-muted">Chỉ mô phỏng trên thiết bị. Không liên hệ nhà cung cấp hay thu tiền; thành công chưa được máy chủ xác minh.</p>
      {!eligible && <div role="alert" className="mt-5 rounded-lg border border-error p-4"><p className="text-error">Không thể tiếp tục bản xem trước này.</p><p className="mt-2 text-sm text-muted">Quay lại chọn ghế để bắt đầu bản xem trước mới. Kết quả mô phỏng đến muộn không thể khôi phục ghế hết hạn.</p><Link href={seatHref} className="mt-2 inline-flex min-h-11 items-center text-accent">Quay lại chọn ghế</Link></div>}
      {eligible && error && <p role="alert" className="mt-5 rounded-lg border border-error p-4 text-sm text-error">{error}</p>}
      {eligible && outcome === "pending" && <p className="mt-4 text-sm leading-6 text-muted">Bản xem trước chưa có kết quả cuối cùng. Chờ xử lý không có nghĩa là thành công hay thất bại. Kiểm tra lại sẽ tiếp tục cùng mô phỏng này.</p>}
      {eligible && outcome === "failed" && <p className="mt-4 text-sm text-muted">Đây là thất bại mô phỏng. Chưa thanh toán đơn đặt vé hay phát hành vé.</p>}
      <section aria-label="Thông tin thanh toán đã kiểm tra" className="mt-6 rounded-xl bg-panel-low p-4 sm:p-5">
        <div className="flex flex-wrap justify-between gap-4"><div><p className="text-xs uppercase tracking-wide text-muted">Phương thức đã chọn</p><p className="mt-2 font-heading font-bold">{method.name} (bản xem trước)</p></div><div><p className="text-xs uppercase tracking-wide text-muted">Tổng tiền mẫu · VND</p><p className="mt-2 font-heading text-2xl font-bold tabular-nums text-accent">{money(review.total)}</p></div></div>
        <p className="mt-4 text-xs text-muted">CHỈ MINH HỌA · Chưa có mã đặt vé hay thanh toán</p>
        <div className="mt-5 border-t border-outline/30 pt-4"><h2 className="font-semibold">{count}</h2><ul className="mt-2 space-y-2 text-sm text-muted">{review.quote.seats.map(line => <li key={line.unit.id}>{line.unit.row}{line.unit.number} · {line.unit.type === "COUPLE" ? "Ghế đôi, 2 khách, một ghế" : "Ghế thường, 1 khách"}</li>)}</ul><h3 className="mt-4 font-semibold">Bắp nước</h3>{review.quote.concessions.length ? <ul className="mt-2 space-y-2 text-sm text-muted">{review.quote.concessions.map(line => <li key={line.item.id}>{line.item.name} × {line.quantity}</li>)}</ul> : <p className="mt-2 text-sm text-muted">Chưa chọn món đi kèm.</p>}</div>
        <dl className="mt-4 space-y-3 border-t border-outline/30 pt-4 text-sm"><div className="flex justify-between gap-3"><dt>Tiền vé</dt><dd>{money(review.quote.seatAmount)}</dd></div><div className="flex justify-between gap-3"><dt>Tiền bắp nước</dt><dd>{money(review.quote.concessionAmount)}</dd></div><div className="flex justify-between gap-3"><dt>Giảm giá khuyến mãi{review.promotion && <span className="block text-xs text-success">{review.promotion.code} đã áp dụng</span>}</dt><dd className="text-success">−{money(review.promotion?.discount ?? 0)}</dd></div></dl>
      </section>
      <div className="mt-6"><label htmlFor="processing-scenario" className="block text-sm font-semibold">Kết quả mô phỏng</label><select id="processing-scenario" value={scenario} disabled={busy || !eligible} onChange={event => { setScenario(event.target.value as PaymentProcessingScenario); setPhase("ready"); setError(null); recordPaymentResult(null); }} className="mt-2 min-h-11 w-full rounded-lg border border-outline bg-panel-low px-3 text-sm disabled:opacity-50"><option value="success">Mẫu thành công</option><option value="failed">Mẫu thất bại</option><option value="pending">Mẫu chờ xử lý</option><option value="error">Mẫu lỗi có thể thử lại</option></select><p className="mt-2 text-xs leading-6 text-muted">Các điều khiển mẫu chỉ thay đổi hiển thị. Không thể xác nhận thanh toán thật.</p></div>
      <div className="mt-5 space-y-3">
        {(phase === "ready" || busy || phase === "error" || phase === "failed" || phase === "pending") && <Button className="w-full" disabled={!eligible || busy} onClick={runPreview}>{busy ? "Bản xem trước đang chạy..." : phase === "error" ? "Thử lại bản xem trước" : phase === "failed" ? "Thử lại xử lý mẫu" : phase === "pending" ? "Kiểm tra lại bản xem trước" : "Bắt đầu xử lý mẫu"}</Button>}
        {outcome && <Button className="w-full" disabled={!eligible || busy} onClick={viewResult}>Tiếp tục xem kết quả thanh toán mẫu</Button>}
        <Link href={PAYMENT_METHOD_PREVIEW_PATH} className="flex min-h-11 items-center justify-center text-sm text-accent">Về phương thức thanh toán</Link>
      </div>
      <p className="mt-4 text-center text-xs leading-6 text-muted">Hạn gốc không được gia hạn. Mô phỏng không khóa nội dung đơn. Việc khóa thật diễn ra đồng thời khi khởi tạo thanh toán thật lần đầu.</p>
    </section>
  </>;
}
