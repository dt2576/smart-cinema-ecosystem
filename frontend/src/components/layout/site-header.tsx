"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { CustomerAccountMenu, CustomerLogoutButton } from "@/features/auth/customer-account-menu";
import { useAuth } from "@/features/auth/auth-context";

export function CinemaBrand() {
  return <span className="flex items-center gap-2"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-panel-high text-accent"><Icon name="film" width={24} height={24} /></span><span className="font-heading text-sm font-semibold uppercase tracking-wide sm:text-lg">Smart Cinema</span></span>;
}

export function SiteHeader({ onPreview }: { onPreview: (title: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, isHydrated, session } = useAuth();
  const authenticatedUser = isHydrated && isAuthenticated ? session?.user : null;
  const links = [{ label: "Movies", href: "#now-showing" }, { label: "Showtimes" }, { label: "Cinemas", href: "#cinemas" }, { label: "Promotions", href: "#promotions" }, { label: "My Bookings" }];
  const navigation = links.map(link => link.href
    ? <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)} className={`rounded-lg px-4 py-3 font-heading text-sm hover:bg-panel-high ${link.label === "Movies" ? "bg-panel-high text-accent" : "text-muted"}`}>{link.label}</a>
    : <button key={link.label} onClick={() => { setMenuOpen(false); onPreview(link.label); }} className="rounded-lg px-4 py-3 text-left font-heading text-sm text-muted hover:bg-panel-high">{link.label}</button>);
  return <header className="fixed inset-x-0 top-0 z-40 bg-canvas/85 shadow-md backdrop-blur-xl">
    <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 lg:px-10">
      <a href="#home" aria-label="Smart Cinema home"><CinemaBrand /></a>
      <nav aria-label="Main navigation" className="hidden items-center xl:flex">{navigation}</nav>
      <div className="flex items-center gap-3">
        {isHydrated && (authenticatedUser ? <CustomerAccountMenu /> : <><Link href="/login" className="hidden min-h-11 items-center justify-center rounded-lg bg-panel-high px-4 py-2.5 font-heading text-sm font-semibold text-foreground transition-colors hover:bg-panel-hover sm:inline-flex">Sign In</Link><button aria-label="Your account" onClick={() => onPreview("Your account")} className="flex size-11 items-center justify-center rounded-full text-accent"><span className="flex size-8 items-center justify-center rounded-full bg-accent text-on-action"><Icon name="user" width={18} height={18} /></span></button></>)}
        <Button variant="secondary" className="px-3 xl:hidden" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? "close" : "menu"} /></Button>
      </div>
    </div>
    {menuOpen && <nav id="mobile-navigation" aria-label="Mobile navigation" className="grid border-t border-outline/30 px-4 pb-4 xl:hidden">{navigation}{authenticatedUser ? <><Link href="/profile" onClick={() => setMenuOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-panel-high px-4 py-2.5 font-heading text-sm font-semibold text-foreground transition-colors hover:bg-panel-hover">My Profile — {authenticatedUser.fullName}</Link><CustomerLogoutButton onLogout={() => setMenuOpen(false)} className="mt-2 min-h-11 rounded-lg px-4 text-left font-heading text-sm font-semibold text-error hover:bg-panel-high" /></> : <Link href="/login" onClick={() => setMenuOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-panel-high px-4 py-2.5 font-heading text-sm font-semibold text-foreground transition-colors hover:bg-panel-hover">Sign In</Link>}</nav>}
  </header>;
}
