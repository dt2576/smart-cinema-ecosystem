"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { StatusFeedback } from "@/components/ui/status-feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingReadError } from "@/features/booking/booking-read-api";

export function OwnedBookingLoading() {
  return <div aria-busy="true"><p role="status" className="mb-5 text-muted">Đang tải thông tin đặt vé…</p><div className="grid gap-5">{[1, 2, 3].map(n => <Skeleton key={n} className="h-40 w-full rounded-card" />)}</div></div>;
}
export function OwnedBookingAccess({ returnTo }: { returnTo: string }) {
  return <StatusFeedback title="Đăng nhập để xem vé của bạn" message="Thông tin đặt vé và vé chỉ dành cho tài khoản khách hàng sở hữu đơn." actions={<Link href={`/login?${new URLSearchParams({ returnTo })}`} className="inline-flex min-h-11 items-center rounded-control bg-action px-5 font-semibold text-on-action">Đăng nhập</Link>} />;
}
export function OwnedBookingError({ error, retry, returnTo }: { error: BookingReadError; retry: () => void; returnTo: string }) {
  const { clearSession } = useAuth();
  return <StatusFeedback role="alert" tone="error" title={error.review ? "Cần kiểm tra lại thông tin vé" : error.status === 404 ? "Đơn đặt vé không khả dụng" : error.status === 403 ? "Cần quyền khách hàng" : "Không thể tải thông tin đặt vé"} message={error.message}
    actions={error.status === 401 ? <Link onClick={clearSession} href={`/login?${new URLSearchParams({ returnTo })}`} className="inline-flex min-h-11 items-center text-accent">Đăng nhập lại</Link> : ![400, 403, 404].includes(error.status) ? <Button variant="secondary" onClick={retry}>Kiểm tra lại trạng thái</Button> : <Link href="/my-bookings" className="inline-flex min-h-11 items-center text-accent">Về vé của tôi</Link>} />;
}
