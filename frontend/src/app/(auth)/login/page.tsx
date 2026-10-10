import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { LoginForm } from "@/features/auth/login-form";
import { SurfaceCard } from "@/components/ui/surface-card";

export const metadata: Metadata = {
  title: "Đăng nhập | Smart Cinema",
  description: "Đăng nhập vào tài khoản Smart Cinema của bạn.",
};

export default function LoginPage() {
  return (
    <SurfaceCard tone="subtle" padding="none" aria-labelledby="login-title" className="relative w-full max-w-[35rem] border-t-action/40 p-6 sm:p-10">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-xl bg-panel-high text-accent"><Icon name="film" width={28} height={28} /></span>
        <h1 id="login-title" className="text-3xl font-bold tracking-tight">Chào mừng bạn trở lại</h1>
        <p className="mt-2 text-muted">Đăng nhập để tiếp tục với Smart Cinema.</p>
      </div>
      <LoginForm />
      <p className="mt-5 text-center text-sm text-muted">Bạn chưa có tài khoản? <Link href="/register" className="font-semibold text-accent underline underline-offset-4 hover:text-foreground">Tạo tài khoản</Link></p>
    </SurfaceCard>
  );
}
