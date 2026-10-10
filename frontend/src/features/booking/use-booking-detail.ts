"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookingApiError, getBooking } from "@/features/booking/booking-api";
import type { Booking } from "@/features/booking/booking.types";
import { editBookingPromotion, PromotionApiError, type PromotionCommand } from "@/features/promotion/promotion-api";
import { promotionEditability } from "@/features/promotion/promotion-service";
import { getOwnedPaymentAttempt, initiateBookingPayment, PaymentApiError, submitSandboxPayment } from "@/features/payment/payment-initiation-api";
import { paymentIneligibility, paymentMatchesBooking, sameBookingComposition, sameBookingOrigins } from "@/features/payment/payment-initiation-service";
import { readPaymentHint, savePaymentHint } from "@/features/payment/payment-initiation-storage";
import type { OwnedPaymentAttempt, PaymentInitiationReceipt, SandboxPaymentSubmission } from "@/features/payment/payment-initiation.types";
import { frozenBookingUnchanged, paymentStateCoherent, PAYMENT_STATUS_READ_INTERVAL, PAYMENT_STATUS_READ_LIMIT } from "@/features/payment/payment-status-service";
import { holdClock, projectedServerNow } from "@/features/seat/seat-hold-service";
import type { SeatHoldClock } from "@/features/seat/seat-hold.types";

export function useBookingDetail(id: string, token: string, expectedPaymentId?: string) {
  const [data, setData] = useState<{ booking: Booking; clock: SeatHoldClock }>();
  const dataRef = useRef<typeof data>(undefined);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const confirmedRef = useRef(false);
  const [error, setError] = useState<BookingApiError | PromotionApiError | PaymentApiError>();
  const [payment, setPayment] = useState<OwnedPaymentAttempt>();
  const paymentRef = useRef<OwnedPaymentAttempt | undefined>(undefined);
  const verifiedSuccessRef = useRef<OwnedPaymentAttempt | undefined>(undefined);
  const [paymentReceipt, setPaymentReceipt] = useState<PaymentInitiationReceipt>();
  const [hasPaymentIdentityHint, setHasPaymentIdentityHint] = useState(false);
  const receiptRef = useRef<PaymentInitiationReceipt | undefined>(undefined);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const paymentConfirmedRef = useRef(false);
  const [paymentReviewRequired, setPaymentReviewRequired] = useState(false);
  const paymentReviewRef = useRef(false);
  const [paymentNotice, setPaymentNotice] = useState("");
  const [providerExpiresAt, setProviderExpiresAt] = useState<string>();
  const [reviewRequired, setReviewRequired] = useState(false);
  const reviewRef = useRef(false);
  const [notice, setNotice] = useState("");
  const [tick, setTick] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const automaticReadBlocked = useRef(false);
  const expiryRead = useRef<string | null>(null);
  const accept = useCallback((booking: Booking, started: number) => {
    const received = performance.now(), next = { booking, clock: holdClock(booking.serverTime, started, received) };
    dataRef.current = next; setData(next); setTick(received); confirmedRef.current = true; setConfirmed(true);
  }, []);
  const read = useCallback(async (current: AbortController) => {
    const started = performance.now(); confirmedRef.current = false; setConfirmed(false);
    try {
      const booking = await getBooking(id, token, current.signal);
      if (!current.signal.aborted) {
        if (dataRef.current && !frozenBookingUnchanged(dataRef.current.booking, booking)) throw new PaymentApiError(502);
        accept(booking, started); return booking;
      }
    } catch (failure) {
      if (!current.signal.aborted) {
        const problem = failure instanceof BookingApiError ? failure : new BookingApiError(503);
        setError(problem);
        if ([401, 403, 404, 429].includes(problem.status)) automaticReadBlocked.current = true;
        if ([401, 403, 404].includes(problem.status)) { dataRef.current = undefined; setData(undefined); }
      }
    }
  }, [id, token, accept]);
  const requirePaymentReview = useCallback((required: boolean, paymentId?: string) => {
    paymentReviewRef.current = required; setPaymentReviewRequired(required);
    savePaymentHint({ bookingId: id, ...(paymentId ? { paymentId } : {}), reviewRequired: required }, id);
  }, [id]);
  const recoverPayment = useCallback(async (booking: Booking, current: AbortController) => {
    paymentConfirmedRef.current = false; setPaymentConfirmed(false);
    const hint = readPaymentHint(id);
    setHasPaymentIdentityHint(!!hint?.paymentId);
    if (expectedPaymentId && hint?.paymentId !== expectedPaymentId) {
      setError(new PaymentApiError(502)); return;
    }
    if (hint?.reviewRequired) { paymentReviewRef.current = true; setPaymentReviewRequired(true); }
    if (!hint?.paymentId) return;
    try {
      const attempt = await getOwnedPaymentAttempt(id, hint.paymentId, token, current.signal);
      if (current.signal.aborted) return;
      const previous = verifiedSuccessRef.current ?? paymentRef.current;
      paymentRef.current = attempt; setPayment(attempt);
      if (attempt.status === "SUCCESS") verifiedSuccessRef.current = attempt;
      if (!paymentStateCoherent(booking, attempt, previous)) {
        requirePaymentReview(true, hint.paymentId); setError(new PaymentApiError(502)); return;
      }
      if (receiptRef.current && !paymentMatchesBooking(booking, attempt, receiptRef.current)) {
        // Owned reads agree; discard inconsistent receipt metadata rather than
        // turning it into permanent authority over the recovered server state.
        receiptRef.current = undefined; setPaymentReceipt(undefined);
        requirePaymentReview(true, hint.paymentId); setError(new PaymentApiError(502));
      }
      paymentConfirmedRef.current = true; setPaymentConfirmed(true);
    } catch (failure) {
      if (!current.signal.aborted) {
        requirePaymentReview(true, hint.paymentId);
        const problem = failure instanceof PaymentApiError ? failure : new PaymentApiError(503);
        setError(problem);
        if ([401, 403, 404, 429].includes(problem.status)) automaticReadBlocked.current = true;
        if ([401, 403, 404].includes(problem.status)) { paymentRef.current = undefined; setPayment(undefined); receiptRef.current = undefined; setPaymentReceipt(undefined); }
      }
    }
  }, [id, token, expectedPaymentId, requirePaymentReview]);
  const refresh = useCallback(async (automatic = false) => {
    if (controller.current || (automatic && automaticReadBlocked.current)) return;
    if (!automatic) automaticReadBlocked.current = false;
    paymentConfirmedRef.current = false; setPaymentConfirmed(false);
    const current = new AbortController(); controller.current = current; setLoading(true); setError(undefined); setNotice("");
    const timeout = setTimeout(() => { current.abort(); automaticReadBlocked.current = true; setError(new PaymentApiError(503)); }, 30_000);
    try { const booking = await read(current); if (booking) await recoverPayment(booking, current); }
    finally { clearTimeout(timeout); if (controller.current === current) { controller.current = null; setLoading(false); } }
  }, [read, recoverPayment]);
  const mutatePromotion = useCallback(async (command: PromotionCommand) => {
    if (controller.current || !confirmedRef.current || reviewRef.current || paymentReviewRef.current || !dataRef.current) return;
    if (promotionEditability(dataRef.current.booking, projectedServerNow(dataRef.current.clock, performance.now()))) return;
    const current = new AbortController(); controller.current = current; setLoading(true); setError(undefined); setNotice("");
    try {
      // One gate for all reads/writes: no late Summary GET can overwrite a receipt.
      const before = await read(current);
      if (!before || current.signal.aborted || promotionEditability(before, projectedServerNow(dataRef.current!.clock, performance.now()))) return;
      confirmedRef.current = false; setConfirmed(false);
      const started = performance.now(), booking = await editBookingPromotion(before, command, token, current.signal);
      if (current.signal.aborted) return;
      accept(booking, started); setNotice(command.operation === "APPLY" ? "Đã lưu khuyến mãi vào đơn đặt vé." : "Đã xóa khuyến mãi khỏi đơn đặt vé.");
    } catch (failure) {
      if (current.signal.aborted) return;
      const problem = failure instanceof PromotionApiError ? failure : new PromotionApiError(503, true);
      setError(problem);
      if (problem.outcomeUncertain) { reviewRef.current = true; setReviewRequired(true); }
    } finally {
      // Even PUT/DELETE can recalculate changing terms. Never automatically replay.
      if (!current.signal.aborted) await read(current);
      if (controller.current === current) { controller.current = null; setLoading(false); }
    }
  }, [read, token, accept]);
  const mutatePayment = useCallback(async (operation: "INITIATE" | "SUBMIT") => {
    if (controller.current || !confirmedRef.current || reviewRef.current || paymentReviewRef.current || !dataRef.current) return;
    const reviewed = dataRef.current.booking;
    if (paymentIneligibility(reviewed, projectedServerNow(dataRef.current.clock, performance.now()), operation === "INITIATE")) return;
    if (operation === "SUBMIT" && (!paymentConfirmedRef.current || !paymentRef.current || !["INITIATED", "PENDING"].includes(paymentRef.current.status) || paymentRef.current.reconciliationRequired)) return;
    const current = new AbortController(); controller.current = current; setLoading(true); setError(undefined); setPaymentNotice("");
    let sent = false, submission: SandboxPaymentSubmission | undefined;
    const timeout = setTimeout(() => current.abort(), 30_000);
    try {
      const before = await read(current);
      if (!before || current.signal.aborted) return;
      if (!sameBookingOrigins(reviewed, before)) throw new PaymentApiError(502);
      if (!sameBookingComposition(reviewed, before)) {
        requirePaymentReview(true, paymentRef.current?.paymentId); setPaymentNotice("Đơn đã được cập nhật ở nơi khác. Xem lại thành phần và tổng tiền máy chủ trước khi tiếp tục."); return;
      }
      if (paymentIneligibility(before, projectedServerNow(dataRef.current!.clock, performance.now()), operation === "INITIATE")) return;
      if (operation === "INITIATE") {
        // Persist uncertainty before the write, including navigation/timeout interruption.
        requirePaymentReview(true); sent = true;
        const receipt = await initiateBookingPayment(before, token, current.signal);
        savePaymentHint({ bookingId: id, paymentId: receipt.id, reviewRequired: true }, id);
        if (current.signal.aborted) return;
        receiptRef.current = receipt; setPaymentReceipt(receipt);
        setPaymentNotice("Máy chủ đã nhận khởi tạo thanh toán. Chưa có xác nhận đã trả tiền.");
      } else {
        await recoverPayment(before, current);
        const attempt = paymentRef.current;
        if (!paymentConfirmedRef.current || !attempt || !["INITIATED", "PENDING"].includes(attempt.status) || attempt.reconciliationRequired || current.signal.aborted) return;
        requirePaymentReview(true, attempt.paymentId); sent = true;
        submission = await submitSandboxPayment(before, attempt.paymentId, token, current.signal);
        setProviderExpiresAt(submission.expiresAt);
        if (Date.parse(submission.expiresAt) <= projectedServerNow(dataRef.current!.clock, performance.now())) throw new PaymentApiError(409);
      }
    } catch (failure) {
      // The persisted hint survives unmount; no automatic write is ever scheduled.
      const problem = failure instanceof PaymentApiError ? failure : new PaymentApiError(0, sent);
      if (operation === "INITIATE" && sent && problem.paymentIdHint) savePaymentHint({ bookingId: id, paymentId: problem.paymentIdHint, reviewRequired: true }, id);
      if (controller.current === current) {
        setError(problem);
        if (!problem.outcomeUncertain && !current.signal.aborted && sent) {
          if (operation === "INITIATE") savePaymentHint(null, id);
          paymentReviewRef.current = false; setPaymentReviewRequired(false);
        }
      }
    } finally {
      clearTimeout(timeout);
      if (controller.current === current) {
        // A timed-out POST needs a separate read signal, never another POST.
        const recovery = current.signal.aborted ? new AbortController() : current;
        controller.current = recovery;
        const latest = await read(recovery);
        if (latest) {
          await recoverPayment(latest, recovery);
          if (sent && receiptRef.current && paymentConfirmedRef.current && sameBookingComposition(reviewed, latest) && operation === "INITIATE") requirePaymentReview(false, receiptRef.current.id);
          if (submission && paymentRef.current?.paymentId === submission.paymentId
            && Date.parse(submission.expiresAt) > projectedServerNow(dataRef.current!.clock, performance.now())
            && paymentConfirmedRef.current && paymentRef.current && ["INITIATED", "PENDING"].includes(paymentRef.current.status)
            && !paymentRef.current.reconciliationRequired && latest.status === "PENDING"
            && !paymentIneligibility(latest, projectedServerNow(dataRef.current!.clock, performance.now()), false)) {
            // Keep the review hint on departure: reopening is a separate explicit action.
            window.location.assign(submission.redirectUrl);
          }
        }
        if (controller.current === recovery) { controller.current = null; setLoading(false); }
      }
    }
  }, [read, recoverPayment, requirePaymentReview, id, token]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const activeRefresh = () => { if (document.visibilityState === "visible") void refresh(true); };
    let reads = 0;
    const poll = setInterval(() => {
      if (document.visibilityState !== "visible" || controller.current) return;
      if (automaticReadBlocked.current || (paymentConfirmedRef.current && paymentRef.current
        && ["SUCCESS", "FAILED", "CANCELLED"].includes(paymentRef.current.status) && !paymentRef.current.reconciliationRequired)) { clearInterval(poll); return; }
      if (++reads >= PAYMENT_STATUS_READ_LIMIT) clearInterval(poll);
      activeRefresh();
    }, PAYMENT_STATUS_READ_INTERVAL);
    const timer = setInterval(() => setTick(performance.now()), 1000);
    window.addEventListener("focus", activeRefresh); window.addEventListener("pageshow", activeRefresh);
    document.addEventListener("visibilitychange", activeRefresh);
    return () => { clearTimeout(initial); clearInterval(poll); clearInterval(timer); window.removeEventListener("focus", activeRefresh); window.removeEventListener("pageshow", activeRefresh); document.removeEventListener("visibilitychange", activeRefresh); controller.current?.abort(); controller.current = null; };
  }, [refresh]);
  const now = data ? projectedServerNow(data.clock, tick) : Infinity;
  useEffect(() => {
    if (data?.booking.status === "PENDING" && now >= Date.parse(data.booking.expiresAt) && !loading && expiryRead.current !== data.booking.expiresAt) {
      expiryRead.current = data.booking.expiresAt; void refresh(true);
    }
  }, [data, now, loading, refresh]);
  function acknowledgeReview() {
    if (controller.current || !confirmedRef.current) return;
    reviewRef.current = false; setReviewRequired(false); setError(undefined); setNotice("Đã xác nhận dữ liệu máy chủ. Thao tác tiếp theo chỉ được gửi khi bạn chọn.");
  }
  function acknowledgePaymentReview() {
    if (controller.current || !confirmedRef.current || !dataRef.current) return;
    if (dataRef.current.booking.paymentStartedAt !== null && !paymentConfirmedRef.current) return;
    requirePaymentReview(false, paymentRef.current?.paymentId); setError(undefined);
    setPaymentNotice("Đã xem dữ liệu máy chủ. Thao tác tiếp theo chỉ được gửi khi bạn chọn.");
  }
  return { booking: data?.booking, now, loading, confirmed, error, refresh, reviewRequired, notice, mutatePromotion, acknowledgeReview,
    payment, paymentReceipt, hasPaymentIdentityHint, paymentConfirmed, paymentReviewRequired, paymentNotice, providerExpiresAt, mutatePayment, acknowledgePaymentReview };
}
