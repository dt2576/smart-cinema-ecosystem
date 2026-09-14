import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In | Smart Cinema",
  description: "Sign in to your Smart Cinema account.",
};

export default function LoginPage() {
  return (
    <section aria-labelledby="login-title" className="relative w-full max-w-[35rem] rounded-xl border-t border-action/40 bg-panel-low p-6 shadow-2xl shadow-black/30 sm:p-10">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-xl bg-panel-high text-accent"><Icon name="film" width={28} height={28} /></span>
        <h1 id="login-title" className="text-3xl font-bold tracking-tight">Welcome Back</h1>
        <p className="mt-2 text-muted">Sign in to continue to Smart Cinema.</p>
      </div>
      <LoginForm />
      <p className="mt-5 text-center text-sm text-muted">Don&apos;t have an account? <Link href="/register" className="font-semibold text-accent underline underline-offset-4 hover:text-foreground">Create Account</Link></p>
    </section>
  );
}
