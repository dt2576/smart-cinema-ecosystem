"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ConfigurationIcon, configurationStyles as styles } from "@/features/admin/admin-configuration-ui";

const NAVIGATION = [
  ["/admin", "Tổng quan", "status"], ["/admin/reports", "Báo cáo", "status"],
  ["/admin/movies", "Phim", "cinema"], ["/admin/cinemas", "Rạp chiếu phim", "hall"],
  ["/admin/showtimes", "Suất chiếu", "cinema"], ["/admin/staff", "Nhân viên", "shield"],
  ["/admin/concession-items", "Bắp nước", "cinema"], ["/admin/promotions", "Khuyến mãi", "status"],
  ["/admin/managers", "Phân công Quản lý", "shield"],
] as const;

// Scoped visual shell: other ADMIN modules retain their existing presentation.
export function AdminConfigurationShell({ children, fullName, pathname, logout }: { children: ReactNode; fullName: string; pathname: string; logout: () => void }) {
  const [menu, setMenu] = useState(false);
  function navigation() {
    return <nav aria-label="Điều hướng quản trị" className={styles.navigation}>{NAVIGATION.map(([href, label, icon]) => <Link key={href} href={href} onClick={() => setMenu(false)} aria-current={href === "/admin/cinemas" ? "page" : undefined}><ConfigurationIcon name={icon} />{label}</Link>)}</nav>;
  }
  return <div className={styles.shell} data-route={pathname}>
    <a href="#admin-content" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-action focus:p-3 focus:text-on-action">Chuyển đến nội dung</a>
    <aside className={styles.sidebar}><Link href="/admin" className={styles.brand}><span><ConfigurationIcon name="cinema" /></span><span>SMART CINEMA<small>Quản trị hệ thống</small></span></Link><p className={styles.navCaption}>QUẢN LÝ RẠP CHIẾU</p>{navigation()}<div className={styles.sidebarFoot}><ConfigurationIcon name="shield" /><span>Không gian quản trị<small>Smart Cinema Ecosystem</small></span></div></aside>
    <div className={styles.shellBody}>
      <header className={styles.header}><div className={styles.headerContext}><Button className={styles.menuButton} variant="secondary" aria-label="Mở điều hướng quản trị" onClick={() => setMenu(true)}><ConfigurationIcon name="menu" /></Button><span><ConfigurationIcon name="shield" />Quản trị hệ thống</span></div><div className={styles.account}><span className={styles.accountName}>{fullName}</span><Link href="/">Trang khách hàng</Link><Button variant="secondary" onClick={logout}>Đăng xuất</Button></div></header>
      <main id="admin-content" tabIndex={-1} className={styles.main}>{children}</main>
    </div>
    {menu && <Dialog title="Điều hướng quản trị" onClose={() => setMenu(false)}>{navigation()}</Dialog>}
  </div>;
}
