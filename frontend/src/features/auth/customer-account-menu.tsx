"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";

export function CustomerAccountMenu() {
  const router = useRouter();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const { session, logoutSession } = useAuth();
  const user = session?.user;

  if (!user) return null;

  async function logout() {
    menuRef.current?.removeAttribute("open");
    await logoutSession();
    router.replace("/");
  }

  return <details ref={menuRef} className="relative">
    <summary className="flex min-h-11 list-none items-center gap-2 rounded-lg bg-panel-high px-2 font-heading text-sm font-semibold text-foreground transition-colors hover:bg-panel-hover [&::-webkit-details-marker]:hidden">
      <span className="hidden max-w-40 truncate pl-2 sm:block">{user.fullName}</span>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-on-action" aria-hidden="true">{getInitials(user.fullName)}</span>
      <span className="sr-only">Open account menu</span>
    </summary>
    <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-52 overflow-hidden rounded-lg border border-outline/40 bg-panel p-2 shadow-2xl shadow-black/40">
      <p className="truncate px-3 py-2 text-xs text-muted sm:hidden">{user.fullName}</p>
      <Link href="/profile" onClick={() => menuRef.current?.removeAttribute("open")} className="flex min-h-11 items-center rounded-md px-3 font-heading text-sm font-semibold text-foreground hover:bg-panel-high">My Profile</Link>
      <button type="button" onClick={() => void logout()} className="flex min-h-11 w-full items-center rounded-md px-3 text-left font-heading text-sm font-semibold text-error hover:bg-panel-high">Logout</button>
    </div>
  </details>;
}

export function CustomerLogoutButton({ onLogout, className = "" }: { onLogout?: () => void; className?: string }) {
  const router = useRouter();
  const { logoutSession } = useAuth();

  async function logout() {
    await logoutSession();
    onLogout?.();
    router.replace("/");
  }

  return <button type="button" onClick={() => void logout()} className={className}>Logout</button>;
}

function getInitials(fullName: string) {
  return fullName.trim().split(/\s+/).slice(-2).map(part => part[0]).join("").toUpperCase() || "SC";
}
