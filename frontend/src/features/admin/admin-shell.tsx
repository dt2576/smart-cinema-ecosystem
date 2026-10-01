"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { AdminApiError, getAdminIdentity } from "@/features/admin/admin-api";
import { useMovieRequest } from "@/features/movie/use-movie-request";

type AdminContextValue = { accessToken: string; reportError: (error: unknown) => void };
const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminShell({ children }: { children: ReactNode }) {
  const { session, isHydrated, logoutSession } = useAuth();
  const pathname = usePathname();
  const token = session?.accessToken ?? "";
  const [deniedToken, setDeniedToken] = useState<string | null>(null);
  // Check with the backend on every route/token change, never authorize from localStorage.role.
  const load = useCallback((signal: AbortSignal) => {
    void pathname;
    return token ? getAdminIdentity(token, signal) : Promise.resolve(null);
  }, [token, pathname]);
  const identity = useMovieRequest(load);
  const reportError = useCallback((error: unknown) => {
    if (error instanceof AdminApiError && (error.status === 401 || error.status === 403)) setDeniedToken(token);
  }, [token]);
  const denied = deniedToken === token || identity.error instanceof AdminApiError && [401, 403].includes(identity.error.status);

  if (!isHydrated || session && identity.loading) return <AdminAccessMessage title="Checking Admin access"><p role="status">Verifying your account…</p></AdminAccessMessage>;
  if (!session) return <AdminAccessMessage title="Sign in required"><p>Sign in with an Admin account to enter this area.</p><Link href="/login" className="text-accent underline">Sign in</Link></AdminAccessMessage>;
  if (denied) return <AdminAccessMessage title="Admin access denied"><p>An active Admin account is required. Your account cannot access Movie management.</p><Button onClick={() => void logoutSession()}>Sign out</Button></AdminAccessMessage>;
  if (identity.error || identity.data?.role !== "ADMIN") return <AdminAccessMessage title="Admin access could not be verified"><p role="alert">{identity.error?.message ?? "Please try again."}</p><Button onClick={identity.retry}>Retry access check</Button></AdminAccessMessage>;

  return <AdminContext.Provider value={{ accessToken: token, reportError }}>
    <div className="min-h-screen bg-canvas">
      <a href="#admin-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-action focus:p-3 focus:text-on-action">Skip to content</a>
      <header className="border-b border-outline/40 bg-panel-low px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <Link href="/admin" className="font-heading text-xl font-bold">Smart Cinema <span className="text-accent">Admin</span></Link>
          <div className="flex flex-wrap items-center gap-4 text-sm"><span>{identity.data.fullName}</span><Link href="/" className="text-muted hover:text-foreground">Customer site</Link><Button variant="secondary" onClick={() => void logoutSession()}>Sign out</Button></div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[180px_minmax(0,1fr)] md:px-8 md:py-8">
        <nav aria-label="Admin navigation" className="flex gap-2 md:flex-col">
          <Link href="/admin" aria-current={pathname === "/admin" ? "page" : undefined} className="rounded-lg px-4 py-3 text-sm font-semibold hover:bg-panel-high aria-[current=page]:bg-panel-high aria-[current=page]:text-accent">Home</Link>
          <Link href="/admin/movies" aria-current={pathname.startsWith("/admin/movies") ? "page" : undefined} className="rounded-lg px-4 py-3 text-sm font-semibold hover:bg-panel-high aria-[current=page]:bg-panel-high aria-[current=page]:text-accent">Movies</Link>
        </nav>
        <main id="admin-content" tabIndex={-1} className="min-w-0">{children}</main>
      </div>
    </div>
  </AdminContext.Provider>;
}

function AdminAccessMessage({ title, children }: { title: string; children: ReactNode }) {
  return <main className="mx-auto w-full max-w-xl space-y-5 px-6 py-20"><h1 className="text-3xl font-bold">{title}</h1><div className="space-y-4 text-muted">{children}</div><Link href="/" className="inline-block text-accent underline">Back to Smart Cinema</Link></main>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("Admin access must be verified before Movie management renders.");
  return context;
}
