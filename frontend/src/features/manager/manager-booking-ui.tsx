"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OperationsApiError } from "@/features/manager/manager-api";
import styles from "@/features/manager/manager-booking.module.css";
export { styles as managerBookingStyles };

export function BookingIcon({ name }: { name: string }) {
  return <span aria-hidden="true" className={styles.icon}>{name}</span>;
}
export function BookingBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "pending" | "error" }) {
  return <span className={styles.badge} data-tone={tone}>{tone === "pending" || tone === "error" ? <BookingIcon name={tone === "pending" ? "schedule" : "close"} /> : tone === "success" ? <span aria-hidden="true" /> : null}<span className={styles.badgeLabel}>{children}</span></span>;
}
export function BookingPanel({ title, icon, extra, children }: { title: string; icon: string; extra?: ReactNode; children: ReactNode }) {
  return <section className={styles.panel}><div className={styles.panelTitle}><div><span className={styles.iconBox}><BookingIcon name={icon} /></span><h2>{title}</h2></div>{extra}</div>{children}</section>;
}
export function BookingReadState({ loading, error, retry }: { loading: boolean; error?: Error; retry: () => void }) {
  if (loading) return <div className={styles.loading} role="status"><p>Đang tải thông tin đặt vé…</p><Skeleton className="h-28 w-full" /><Skeleton className="h-60 w-full" /></div>;
  const status = error instanceof OperationsApiError ? error.status : 0;
  const message = status === 401 ? "Phiên đăng nhập đã kết thúc. Đăng nhập lại để tiếp tục."
    : status === 403 ? "Bạn chưa có quyền xem đặt vé tại các rạp được phân công."
    : status === 404 ? "Đơn đặt vé không khả dụng trong phạm vi được phân công."
    : status === 400 ? "Bộ lọc hoặc mã đặt vé chưa hợp lệ. Vui lòng kiểm tra lại."
    : status === 429 ? "Có nhiều yêu cầu. Vui lòng chờ rồi tải lại."
    : "Chưa tải được thông tin. Vui lòng kiểm tra lại sau.";
  return <div role="alert" className={styles.feedback}><BookingIcon name="confirmation_number" /><h2>Chưa tải được đặt vé</h2><p>{message}</p><Button variant="secondary" onClick={retry}>Tải lại thông tin</Button></div>;
}
