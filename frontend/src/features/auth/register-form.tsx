"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AuthApiError, registerCustomer } from "@/features/auth/auth-api";

type RegisterField = "fullName" | "email" | "phone" | "password" | "confirmPassword";
type RegisterErrors = Partial<Record<RegisterField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VIETNAM_PHONE_PATTERN = /^(?:0\d{9}|\d{9}|\+84\d{9})$/;

const INPUT_CLASS_NAME = "h-12 w-full rounded-lg bg-panel-high px-4 text-foreground outline-none transition focus:bg-panel-hover focus:ring-2 focus:ring-action aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-error";

export function RegisterForm() {
  const router = useRouter();
  const [visiblePasswords, setVisiblePasswords] = useState({ password: false, confirmPassword: false });
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function clearFieldError(field: RegisterField) {
    if (errors[field]) setErrors(current => ({ ...current, [field]: undefined }));
    setStatus("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").replace(/[\s()-]/g, "");
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const nextErrors: RegisterErrors = {};

    if (!fullName) nextErrors.fullName = "Nhập họ tên của bạn.";
    if (!email) nextErrors.email = "Nhập địa chỉ email của bạn.";
    else if (!EMAIL_PATTERN.test(email)) nextErrors.email = "Nhập địa chỉ email hợp lệ.";
    if (!phone) nextErrors.phone = "Nhập số điện thoại của bạn.";
    else if (!VIETNAM_PHONE_PATTERN.test(phone)) nextErrors.phone = "Nhập số điện thoại Việt Nam hợp lệ.";
    if (!password) nextErrors.password = "Nhập mật khẩu.";
    else if (password.length < 8) nextErrors.password = "Sử dụng ít nhất 8 ký tự.";
    if (!confirmPassword) nextErrors.confirmPassword = "Xác nhận mật khẩu của bạn.";
    else if (password !== confirmPassword) nextErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus("Kiểm tra các trường được đánh dấu và thử lại.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");
    try {
      await registerCustomer({ fullName, email, phone, password });
      router.push("/login");
    } catch (error) {
      if (error instanceof AuthApiError) {
        const backendErrors = error.fieldErrors as RegisterErrors;
        setErrors(backendErrors);
        setStatus(error.status === 409 ? "Email này đã có tài khoản. Đăng nhập hoặc dùng email khác." : error.message);
        if (error.status === 409) setErrors({ email: "Email này đã được đăng ký." });
      } else {
        setStatus("Đã xảy ra lỗi. Vui lòng thử lại.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderPasswordField({ field, label, autoComplete }: { field: "password" | "confirmPassword"; label: string; autoComplete: string }) {
    const visible = visiblePasswords[field];
    const errorId = `${field}-error`;
    return <div className="space-y-2">
      <label htmlFor={field} className="block font-heading text-sm font-semibold text-foreground">{label}</label>
      <div className="relative">
        <input id={field} name={field} type={visible ? "text" : "password"} autoComplete={autoComplete} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? errorId : field === "password" ? "password-help" : undefined} onChange={() => clearFieldError(field)} placeholder="Nhập mật khẩu của bạn" className={`${INPUT_CLASS_NAME} pr-12`} />
        <button type="button" onClick={() => setVisiblePasswords(current => ({ ...current, [field]: !visible }))} aria-label={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`} aria-pressed={visible} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-foreground"><Icon name={visible ? "eye-off" : "eye"} /></button>
      </div>
      {field === "password" && !errors.password && <p id="password-help" className="flex items-center gap-2 text-xs text-muted"><span className="text-accent">◆</span>Sử dụng ít nhất 8 ký tự.</p>}
      {errors[field] && <p id={errorId} className="text-sm text-error">{errors[field]}</p>}
    </div>;
  }

  return (
    <form noValidate onSubmit={handleSubmit} aria-busy={isSubmitting} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="fullName" className="block font-heading text-sm font-semibold text-foreground">Họ tên</label>
        <input id="fullName" name="fullName" type="text" autoComplete="name" aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? "fullName-error" : undefined} onChange={() => clearFieldError("fullName")} placeholder="Nguyễn Văn A" className={INPUT_CLASS_NAME} />
        {errors.fullName && <p id="fullName-error" className="text-sm text-error">{errors.fullName}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="registerEmail" className="block font-heading text-sm font-semibold text-foreground">Địa chỉ email</label>
        <input id="registerEmail" name="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "registerEmail-error" : undefined} onChange={() => clearFieldError("email")} placeholder="name@example.com" className={INPUT_CLASS_NAME} />
        {errors.email && <p id="registerEmail-error" className="text-sm text-error">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="block font-heading text-sm font-semibold text-foreground">Số điện thoại</label>
        <div className="relative">
          <span aria-hidden="true" className="absolute inset-y-1.5 left-1.5 flex items-center rounded-md bg-panel-hover px-2 font-heading text-xs font-semibold text-accent">VN +84</span>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "phone-error" : undefined} onChange={() => clearFieldError("phone")} placeholder="0912 345 678" className={`${INPUT_CLASS_NAME} pl-24`} />
        </div>
        {errors.phone && <p id="phone-error" className="text-sm text-error">{errors.phone}</p>}
      </div>

      {renderPasswordField({ field: "password", label: "Mật khẩu", autoComplete: "new-password" })}
      {renderPasswordField({ field: "confirmPassword", label: "Xác nhận mật khẩu", autoComplete: "new-password" })}

      <Button type="submit" disabled={isSubmitting} className="w-full py-3 uppercase tracking-wider shadow-lg shadow-action/20">{isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"} <Icon name="arrow" /></Button>
      {status && <p role="status" className="text-center text-sm leading-6 text-muted">{status}</p>}
    </form>
  );
}
