"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AuthApiError, login } from "@/features/auth/auth-api";
import { useAuth } from "@/features/auth/auth-context";
import { customerLoginReturn } from "@/features/auth/auth-return";

type LoginErrors = {
  email?: string;
  password?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const { establishSession } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const nextErrors: LoginErrors = {};

    if (!email) nextErrors.email = "Nhập địa chỉ email của bạn.";
    else if (!EMAIL_PATTERN.test(email)) nextErrors.email = "Nhập địa chỉ email hợp lệ.";
    if (!password) nextErrors.password = "Nhập mật khẩu của bạn.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus("Kiểm tra các trường được đánh dấu và thử lại.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");
    try {
      const session = await login({ email, password });
      establishSession(session);
      const returnTo = customerLoginReturn(new URLSearchParams(window.location.search).get("returnTo"));
      router.replace(session.user.role === "CUSTOMER" && returnTo ? returnTo : session.user.role === "ADMIN" ? "/admin" : "/");
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrors({
          email: error.fieldErrors.email,
          password: error.fieldErrors.password,
        });
        setStatus(error.message);
      } else {
        setStatus("Đã xảy ra lỗi. Vui lòng thử lại.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} aria-busy={isSubmitting} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="block font-heading text-xs font-semibold uppercase tracking-wider text-muted">Địa chỉ email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          onChange={() => { if (errors.email) setErrors(current => ({ ...current, email: undefined })); setStatus(""); }}
          placeholder="name@example.com"
          className="h-12 w-full rounded-lg bg-panel-high px-4 text-foreground outline-none transition focus:bg-panel-hover focus:ring-2 focus:ring-action aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-error"
        />
        {errors.email && <p id="email-error" className="text-sm text-error">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="password" className="font-heading text-xs font-semibold uppercase tracking-wider text-muted">Mật khẩu</label>
          <span className="font-heading text-xs font-semibold text-accent" aria-disabled="true">Quên mật khẩu?</span>
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            onChange={() => { if (errors.password) setErrors(current => ({ ...current, password: undefined })); setStatus(""); }}
            placeholder="Nhập mật khẩu của bạn"
            className="h-12 w-full rounded-lg bg-panel-high px-4 pr-12 text-foreground outline-none transition focus:bg-panel-hover focus:ring-2 focus:ring-action aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-error"
          />
          <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-foreground">
            <Icon name={showPassword ? "eye-off" : "eye"} />
          </button>
        </div>
        {errors.password && <p id="password-error" className="text-sm text-error">{errors.password}</p>}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full py-3 uppercase tracking-wider shadow-lg shadow-action/20">{isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"} <Icon name="arrow" /></Button>
      {status && <p role="status" className="text-center text-sm leading-6 text-muted">{status}</p>}
    </form>
  );
}
