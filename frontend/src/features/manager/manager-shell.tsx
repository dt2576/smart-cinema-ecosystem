"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { getManagerCinemas, OperationsApiError } from "@/features/manager/manager-api";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { OperationsState } from "@/features/manager/operations-ui";
import type { AdminCinema } from "@/features/admin/admin-configuration.types";

const ManagerContext = createContext<{ accessToken: string; cinemas: AdminCinema[] } | null>(null);
export function useManager() { const value = useContext(ManagerContext); if (!value) throw new Error("Manager scope must be verified."); return value; }
export function ManagerShell({ children }: { children: ReactNode }) {
  const { session, isHydrated, logoutSession } = useAuth(); const pathname = usePathname(); const token = session?.accessToken ?? "";
  const load = useCallback((signal: AbortSignal) => { void pathname; return token ? getManagerCinemas(token, signal) : Promise.resolve(null); }, [token, pathname]);
  const scope = useMovieRequest(load);
  const message = <main className="mx-auto max-w-xl space-y-5 px-5 py-16"><h1 className="text-3xl font-bold">Khu vực quản lý rạp</h1>
    {!isHydrated ? <p role="status">Đang kiểm tra phiên đăng nhập…</p> : !session ? <><p>Cần đăng nhập bằng tài khoản Quản lý.</p><Link className="inline-flex min-h-11 items-center text-accent underline" href={`/login?returnTo=${encodeURIComponent(pathname)}`}>Đăng nhập</Link></> : <><OperationsState {...scope} /><Button variant="secondary" onClick={() => void logoutSession()}>Đăng xuất</Button></>}
    <Link className="inline-flex min-h-11 items-center text-accent underline" href="/">Quay về Smart Cinema</Link></main>;
  if (!isHydrated || !session || scope.loading || scope.error || !scope.data) return message;
  // A successful scoped backend read is the authority; stored role is not authorization.
  const links = [["/manager/cinemas", "Rạp được phân công"], ["/manager/seats", "Quản lý tình trạng ghế"], ["/manager/showtimes", "Quản lý suất chiếu"], ["/manager/staff", "Nhân viên tại rạp"]];
  const staffRoute = pathname === "/manager/staff" || /^\/manager\/cinemas\/[^/]+\/staff(?:\/[^/]+)?$/.test(pathname);
  return <ManagerContext.Provider value={{ accessToken: token, cinemas: scope.data }}><div className="min-h-screen bg-canvas">
    <a href="#manager-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-action focus:p-4 focus:text-on-action">Chuyển đến nội dung</a>
    <header className="border-b border-outline/40 bg-panel-low px-4 py-4 sm:px-8"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3"><Link className="font-heading text-xl font-bold" href="/manager/cinemas">SMART CINEMA <span className="text-accent">Quản lý rạp</span></Link><div className="flex flex-wrap items-center gap-3"><span className="max-w-60 break-words">{session.user.fullName}</span><Button variant="secondary" onClick={() => void logoutSession()}>Đăng xuất</Button></div></div></header>
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[210px_minmax(0,1fr)] md:px-8 md:py-8"><nav aria-label="Điều hướng quản lý rạp" className="flex flex-wrap content-start gap-2 md:flex-col">{links.map(([href, label]) => <Link key={href} href={href} aria-current={(staffRoute ? href === "/manager/staff" : pathname.startsWith(href) || href === "/manager/cinemas" && pathname.startsWith("/manager/halls")) ? "page" : undefined} className="flex min-h-12 items-center rounded-control px-4 py-3 text-base font-semibold hover:bg-panel-high aria-[current=page]:bg-panel-high aria-[current=page]:text-accent">{label}</Link>)}</nav><main id="manager-content" tabIndex={-1} className="min-w-0">{children}</main></div>
  </div></ManagerContext.Provider>;
}
export function isScopeError(error: unknown) { return error instanceof OperationsApiError && [401, 403, 404].includes(error.status); }
