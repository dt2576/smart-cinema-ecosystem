"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/features/booking/booking.types";
import { formatBookingAmount } from "@/features/booking/booking-service";
import type { PromotionCommand } from "@/features/promotion/promotion-api";
import { promotionEditability } from "@/features/promotion/promotion-service";

interface Props {
  booking: Booking; now: number; busy: boolean; confirmed: boolean; reviewRequired: boolean;
  notice: string; mutate: (command: PromotionCommand) => Promise<void>; acknowledgeReview: () => void;
}

export function OwnedPromotionPanel({ booking, now, busy, confirmed, reviewRequired, notice, mutate, acknowledgeReview }: Props) {
  const [code, setCode] = useState("");
  const [validation, setValidation] = useState("");
  const readOnlyReason = promotionEditability(booking, now);
  const disabled = busy || !confirmed || reviewRequired;
  return <section aria-label="Khuyến mãi đã lưu" className="rounded-2xl border border-outline/30 bg-panel p-5 sm:p-6">
    <h2 className="text-xl font-bold">Khuyến mãi</h2>
    {booking.promotion ? <div className="mt-3 text-sm">
      <p className="break-all font-semibold text-accent">Khuyến mãi đã áp dụng: {booking.promotion.code}</p>
      <p className="mt-2 break-all text-xs text-muted">Mã khuyến mãi đã lưu: {booking.promotion.id}</p>
      <p className="mt-2">Giảm giá đã lưu: <span className="break-all font-heading tabular-nums">{formatBookingAmount(booking.discount)}</span></p>
      <p className="mt-2 text-xs leading-6 text-muted">Thông tin và số tiền từ đơn đã lưu. Mã này chưa được bảo đảm đủ điều kiện cho lần chỉnh sửa tiếp theo.</p>
    </div> : <p className="mt-3 text-sm text-muted">Chưa áp dụng khuyến mãi.</p>}
    {reviewRequired && <div role="alert" className="mt-4 rounded-lg border border-outline bg-panel-low p-4 text-sm">
      <p>Chưa xác định kết quả thao tác khuyến mãi. Có thể máy chủ đã lưu. Hãy xem mã, bắp nước và tổng tiền vừa đọc trước khi tiếp tục; không tự gửi lại thao tác.</p>
      <Button variant="secondary" disabled={busy || !confirmed} onClick={acknowledgeReview} className="mt-3 w-full">Đã xem dữ liệu máy chủ, tiếp tục chỉnh sửa</Button>
    </div>}
    {readOnlyReason ? <p className="mt-4 text-sm text-muted">{readOnlyReason}</p> : <>
      <form noValidate className="mt-5" onSubmit={event => {
        event.preventDefault();
        if (disabled) return;
        if (!code.trim()) { setValidation("Vui lòng nhập mã khuyến mãi."); return; }
        setValidation(""); void mutate({ operation: "APPLY", code });
      }}>
        <label htmlFor="owned-promotion-code" className="text-sm font-semibold">Mã khuyến mãi</label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input id="owned-promotion-code" value={code} onChange={event => { setCode(event.target.value); setValidation(""); }} disabled={disabled}
            autoComplete="off" spellCheck={false} aria-invalid={!!validation} aria-describedby={`owned-promotion-help${validation ? " owned-promotion-error" : ""}`}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-outline bg-panel-low px-4 text-foreground disabled:opacity-50" />
          <Button type="submit" disabled={disabled}>Áp dụng khuyến mãi</Button>
        </div>
        <p id="owned-promotion-help" className="mt-2 text-xs leading-6 text-muted">Nhập mã bạn có. Máy chủ chuẩn hóa mã và kiểm tra hiệu lực, điều kiện áp dụng. Mỗi đơn chỉ lưu một khuyến mãi; mã mới sẽ thay thế mã đã lưu nếu được chấp nhận.</p>
        {validation && <p id="owned-promotion-error" role="alert" className="mt-2 text-sm text-error">{validation}</p>}
      </form>
      {booking.promotion && <Button variant="secondary" disabled={disabled} onClick={() => void mutate({ operation: "REMOVE" })} className="mt-4">Xóa khuyến mãi</Button>}
      {!confirmed && !busy && <p className="mt-3 text-sm text-muted">Cần cập nhật đơn đặt vé thành công trước khi thay đổi khuyến mãi.</p>}
    </>}
    {notice && <p role="status" className="mt-4 text-sm text-accent">{notice}</p>}
    <p className="mt-4 text-xs leading-6 text-muted">Thêm, thay thế hoặc xóa mã không gia hạn đặt vé. Khi sửa bắp nước, máy chủ kiểm tra lại khuyến mãi; mã không còn hợp lệ có thể khiến thao tác bị từ chối. Bạn có thể xóa hoặc thay mã tại đây khi đơn còn cho phép chỉnh sửa.</p>
  </section>;
}
