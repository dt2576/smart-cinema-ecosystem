"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { CustomerAccountMenu, CustomerLogoutButton } from "@/features/auth/customer-account-menu";
import { useAuth } from "@/features/auth/auth-context";

export function CinemaBrand() {
  return <span className="flex items-center gap-2"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-panel-high text-accent"><Icon name="film" width={24} height={24} /></span><span className="font-heading text-sm font-semibold uppercase tracking-wide sm:text-lg">Smart Cinema</span></span>;
}

export function SiteHeader({ onPreview }: { onPreview?: (title: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const { isAuthenticated, isHydrated, session } = useAuth();
  const authenticatedUser = isHydrated && isAuthenticated ? session?.user : null;
  const customerLinksVisible = isHydrated && (!authenticatedUser || authenticatedUser.role === "CUSTOMER");
  const links = [{ label: "Phim", href: "/movies" }, ...(onPreview ? [{ label: "Suất chiếu" }, { label: "Rạp chiếu phim", href: "/#cinemas" }, { label: "Khuyến mãi", href: "/#promotions" }] : []), ...(customerLinksVisible ? [{ label: "Vé của tôi", href: "/my-bookings" }] : [])];
  const navigation = links.map(link => link.href
    ? <Link key={link.label} href={link.href} onClick={() => setMenuOpen(false)} aria-current={pathname === link.href || pathname.startsWith(`${link.href}/`) ? "page" : undefined} className={`rounded-lg px-4 py-3 font-heading text-sm hover:bg-panel-high ${pathname === link.href || pathname.startsWith(`${link.href}/`) ? "bg-panel-high text-accent" : "text-muted"}`}>{link.label}</Link>
    : <button key={link.label} onClick={() => { setMenuOpen(false); onPreview?.(link.label); }} className="rounded-lg px-4 py-3 text-left font-heading text-sm text-muted hover:bg-panel-high">{link.label}</button>);
  return <header onKeyDown={event => { if (event.key === "Escape" && menuOpen) { setMenuOpen(false); menuButton.current?.focus(); } }} className="fixed inset-x-0 top-0 z-40 border-b border-outline/20 bg-canvas/95 shadow-md backdrop-blur-xl">
    <div className="page-container flex h-header items-center justify-between gap-3">
      <Link href="/" aria-label="Trang chủ Smart Cinema" className="inline-flex min-h-control items-center"><CinemaBrand /></Link>
      <nav aria-label="Điều hướng chính" className="hidden items-center xl:flex">{navigation}</nav>
      <div className="flex items-center gap-3">
        {isHydrated && (authenticatedUser ? <CustomerAccountMenu /> : <Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-panel-high px-4 py-2.5 font-heading text-sm font-semibold text-foreground transition-colors hover:bg-panel-hover">Đăng nhập</Link>)}
        <Button ref={menuButton} variant="secondary" className="px-3 xl:hidden" aria-label={menuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"} aria-expanded={menuOpen} aria-controls={menuOpen ? "mobile-navigation" : undefined} onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? "close" : "menu"} /></Button>
      </div>
    </div>
    {menuOpen && <nav id="mobile-navigation" aria-label="Điều hướng trên điện thoại" className="absolute inset-x-0 top-full grid max-h-[calc(100dvh-5rem)] overflow-y-auto border-b border-outline/30 bg-canvas p-4 shadow-xl xl:hidden">{navigation}{authenticatedUser ? <>
      {authenticatedUser.role === "CUSTOMER" && <Link href="/profile" onClick={() => setMenuOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-control bg-panel-high px-4 py-2.5 font-heading text-sm font-semibold text-foreground hover:bg-panel-hover">Hồ sơ của tôi — {authenticatedUser.fullName}</Link>}
      {authenticatedUser.role === "ADMIN" && <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex min-h-11 items-center rounded-control px-4 font-heading text-sm font-semibold text-accent hover:bg-panel-high">Khu vực quản trị</Link>}
      <CustomerLogoutButton onLogout={() => setMenuOpen(false)} className="mt-2 min-h-11 rounded-control px-4 text-left font-heading text-sm font-semibold text-error hover:bg-panel-high" />
    </> : <Link href="/login" onClick={() => setMenuOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-control bg-panel-high px-4 py-2.5 font-heading text-sm font-semibold text-foreground hover:bg-panel-hover">Đăng nhập</Link>}</nav>}
  </header>;
}
