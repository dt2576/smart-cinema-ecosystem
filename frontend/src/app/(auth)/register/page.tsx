import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = {
  title: "Tạo tài khoản | Smart Cinema",
  description: "Tạo tài khoản khách hàng Smart Cinema.",
};

export default function RegisterPage() {
  return (
    <section aria-labelledby="register-title" className="relative w-full max-w-[35rem] rounded-xl border-t border-action/40 bg-panel-low p-6 shadow-2xl shadow-black/30 sm:p-10">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-xl bg-panel-high text-accent"><Icon name="film" width={28} height={28} /></span>
        <h1 id="register-title" className="text-3xl font-bold tracking-tight">Tạo tài khoản của bạn</h1>
        <p className="mx-auto mt-2 max-w-md leading-6 text-muted">Một tài khoản để đặt vé tại mọi rạp Smart Cinema.</p>
      </div>
      <RegisterForm />
      <p className="mt-7 text-center text-sm text-muted">Bạn đã có tài khoản? <Link href="/login" className="font-semibold text-accent underline underline-offset-4 hover:text-foreground">Đăng nhập</Link></p>
    </section>
  );
}
