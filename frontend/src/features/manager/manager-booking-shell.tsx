"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import { BookingIcon, managerBookingStyles as styles } from "@/features/manager/manager-booking-ui";

const links = [
  ["/manager/cinemas", "Rạp được phân công", "domain"],
  ["/manager/seats", "Quản lý tình trạng ghế", "event_seat"],
  ["/manager/showtimes", "Quản lý suất chiếu", "schedule"],
  ["/manager/bookings", "Quản lý đặt vé", "confirmation_number"],
  ["/manager/staff", "Nhân viên tại rạp", "badge"],
  ["/manager/dashboard", "Tổng quan", "theaters"],
  ["/manager/reports", "Báo cáo & Thống kê", "account_balance_wallet"],
] as const;
// Only Booking routes adopt this reference shell. Existing modules retain their layout.
export function ManagerBookingShell({ fullName, cinemas, logout, children }: { fullName: string; cinemas: { id: string; name: string }[]; logout: () => void; children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const navigation = <nav className={styles.navigation} aria-label="Điều hướng quản lý rạp">{links.map(([href, label, icon]) => <Link key={href} href={href} aria-current={href === "/manager/bookings" ? "page" : undefined} onClick={() => setMenu(false)}><BookingIcon name={icon} />{label}</Link>)}</nav>;
  return <div className={styles.shell}>
    <a href="#manager-content" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-action focus:p-3 focus:text-on-action">Chuyển đến nội dung</a>
    <aside className={styles.sidebar}><Link href="/manager/cinemas" className={styles.brand}><span><BookingIcon name="movie" /></span><div>SMART CINEMA<small>VẬN HÀNH RẠP</small></div></Link><p className={styles.navCaption}>QUẢN TRỊ VẬN HÀNH</p>{navigation}<div className={styles.sidebarFoot}><small>RẠP ĐƯỢC PHÂN CÔNG</small><strong>{cinemas.length === 1 ? cinemas[0].name : `${cinemas.length} rạp chiếu phim`}</strong></div></aside>
    <div className={styles.shellBody}><header className={styles.header}><div className={styles.headerContext}><button type="button" className={styles.menuButton} onClick={() => setMenu(true)} aria-label="Mở điều hướng quản lý rạp"><BookingIcon name="menu" /></button><BookingIcon name="tune" /><strong>Quản lý rạp</strong><span>·</span><span>Vận hành rạp</span></div><div className={styles.account}><div><strong>{fullName}</strong><small>Quản lý rạp</small></div><span className={styles.avatar}><BookingIcon name="person" /></span><button type="button" className={styles.logout} onClick={logout}>Đăng xuất</button></div></header><main id="manager-content" tabIndex={-1} className={styles.main}>{children}</main></div>
    {menu && <Dialog title="Điều hướng quản lý rạp" onClose={() => setMenu(false)}>{navigation}</Dialog>}
  </div>;
}
