"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import { BookingIcon, managerBookingStyles as shell } from "@/features/manager/manager-booking-ui";
import styles from "@/features/manager/manager-report.module.css";

export const MANAGER_REPORT_LINKS = [["/manager/dashboard", "Tổng quan"], ["/manager/reports", "Báo cáo & Thống kê"]] as const;
const links = [["/manager/cinemas", "Rạp được phân công"], ["/manager/seats", "Quản lý tình trạng ghế"], ["/manager/showtimes", "Quản lý suất chiếu"], ["/manager/bookings", "Quản lý đặt vé"], ["/manager/staff", "Nhân viên tại rạp"], ...MANAGER_REPORT_LINKS];
export function ManagerReportShell({ pathname, fullName, cinemas, logout, children }: { pathname: string; fullName: string; cinemas: { id: string; name: string }[]; logout: () => void; children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const navigation = <nav className={`${shell.navigation} ${styles.navigation}`} aria-label="Điều hướng quản lý rạp">{links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setMenu(false)}>{label}</Link>)}</nav>;
  return <div className={`${shell.shell} ${styles.shell}`}>
    <a href="#manager-content" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-action focus:p-3 focus:text-on-action">Chuyển đến nội dung</a>
    <aside className={shell.sidebar}><Link href="/manager/cinemas" className={shell.brand}><span><BookingIcon name="movie" /></span><div>SMART CINEMA<small>VẬN HÀNH RẠP</small></div></Link><p className={shell.navCaption}>ĐIỀU HÀNH RẠP CHIẾU</p>{navigation}<div className={shell.sidebarFoot}><small>RẠP ĐƯỢC PHÂN CÔNG</small><strong>{cinemas.length === 1 ? cinemas[0].name : `${cinemas.length} rạp chiếu phim`}</strong></div></aside>
    <div className={shell.shellBody}><header className={shell.header}><div className={shell.headerContext}><button type="button" className={shell.menuButton} onClick={() => setMenu(true)} aria-label="Mở điều hướng quản lý rạp"><BookingIcon name="menu" /></button><BookingIcon name="tune" /><strong>Quản lý rạp</strong><span>·</span><span>Vận hành rạp</span></div><div className={shell.account}><div><strong>{fullName}</strong><small>Quản lý rạp</small></div><span className={shell.avatar}><BookingIcon name="person" /></span><button type="button" className={shell.logout} onClick={logout}>Đăng xuất</button></div></header><main id="manager-content" tabIndex={-1} className={styles.main}>{children}</main></div>
    {menu && <Dialog title="Điều hướng quản lý rạp" onClose={() => setMenu(false)}>{navigation}</Dialog>}
  </div>;
}
