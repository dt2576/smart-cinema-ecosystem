import type { Metadata } from "next";
import Link from "next/link";
import { CinemaBrand } from "@/components/layout/site-header";
import { Icon } from "@/components/ui/icon";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In | Smart Cinema",
  description: "Sign in to your Smart Cinema account.",
};

const FOOTER_LINKS = ["Admissions Policy", "Age Ratings & ID", "Accessibility Standards", "Terms & Privacy"];

export default function LoginPage() {
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

        <section aria-labelledby="login-title" className="relative w-full max-w-[35rem] rounded-xl border-t border-action/40 bg-panel-low p-6 shadow-2xl shadow-black/30 sm:p-10">
          <div className="mb-8 text-center">
            <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-xl bg-panel-high text-accent"><Icon name="film" width={28} height={28} /></span>
            <h1 id="login-title" className="text-3xl font-bold tracking-tight">Welcome Back</h1>
            <p className="mt-2 text-muted">Sign in to continue to Smart Cinema.</p>
          </div>
          <LoginForm />
          <p className="mt-5 text-center text-sm text-muted">Don&apos;t have an account? <span className="font-semibold text-accent underline underline-offset-4">Create Account</span></p>
        </section>
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
