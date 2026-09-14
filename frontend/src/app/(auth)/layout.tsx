import type { ReactNode } from "react";
import Link from "next/link";
import { CinemaBrand } from "@/components/layout/site-header";
import { Icon } from "@/components/ui/icon";

const FOOTER_LINKS = ["Admissions Policy", "Age Ratings & ID", "Accessibility Standards", "Terms & Privacy"];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-canvas">
      <header className="relative z-10 bg-canvas/85 shadow-md backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 lg:px-10">
          <Link href="/" aria-label="Smart Cinema home"><CinemaBrand /></Link>
          <div className="flex items-center gap-6">
            <span className="hidden font-heading text-xs font-semibold uppercase tracking-wider text-muted md:inline">Assistance &amp; Support</span>
            <span className="flex size-10 items-center justify-center rounded-full bg-accent text-on-action shadow-lg shadow-action/20"><Icon name="user" width={18} height={18} /></span>
          </div>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 py-14 sm:px-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[70%] w-[42rem] -translate-x-1/2 rotate-12 bg-linear-to-br from-transparent via-action/5 to-transparent" />
        </div>
        {children}
      </main>

      <footer className="relative z-10 bg-canvas py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-5 px-4 text-center md:flex-row md:text-left lg:px-10">
          <nav aria-label="Policy navigation" className="flex flex-wrap justify-center gap-x-7 gap-y-3 md:justify-start">
            {FOOTER_LINKS.map(label => <span key={label} className="font-heading text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>)}
          </nav>
          <p className="text-xs text-muted">© 2025 Smart Cinema Group Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
