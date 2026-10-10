"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { FormField } from "@/components/ui/form-field";
import { StatusFeedback } from "@/components/ui/status-feedback";
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
      <FormField inputId="email" label="Địa chỉ email" error={errors.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          onChange={() => { if (errors.email) setErrors(current => ({ ...current, email: undefined })); setStatus(""); }}
          placeholder="name@example.com"
          className="form-input"
        />
      </FormField>

      <FormField inputId="password" label="Mật khẩu" error={errors.password} labelAside={<span className="font-heading text-xs font-semibold text-accent" aria-disabled="true">Quên mật khẩu?</span>}>
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
            className="form-input pr-12"
          />
          <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-foreground">
            <Icon name={showPassword ? "eye-off" : "eye"} />
          </button>
        </div>
      </FormField>

      <Button type="submit" disabled={isSubmitting} className="w-full py-3 uppercase tracking-wider shadow-lg shadow-action/20">{isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"} <Icon name="arrow" /></Button>
      {status && <StatusFeedback compact role="status" tone="error" message={status} className="text-center" />}
    </form>
  );
}
