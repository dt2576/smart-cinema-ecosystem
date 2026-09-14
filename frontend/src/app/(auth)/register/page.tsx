import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = {
  title: "Create Account | Smart Cinema",
  description: "Create your Smart Cinema customer account.",
};

export default function RegisterPage() {
  return (
    <section aria-labelledby="register-title" className="relative w-full max-w-[35rem] rounded-xl border-t border-action/40 bg-panel-low p-6 shadow-2xl shadow-black/30 sm:p-10">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-xl bg-panel-high text-accent"><Icon name="film" width={28} height={28} /></span>
        <h1 id="register-title" className="text-3xl font-bold tracking-tight">Create Your Account</h1>
        <p className="mx-auto mt-2 max-w-md leading-6 text-muted">Create one account to book tickets across all Smart Cinema locations.</p>
      </div>
      <RegisterForm />
      <p className="mt-7 text-center text-sm text-muted">Already have an account? <Link href="/login" className="font-semibold text-accent underline underline-offset-4 hover:text-foreground">Sign In</Link></p>
    </section>
  );
}
