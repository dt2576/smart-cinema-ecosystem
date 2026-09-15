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

    if (!fullName) nextErrors.fullName = "Enter your full name.";
    if (!email) nextErrors.email = "Enter your email address.";
    else if (!EMAIL_PATTERN.test(email)) nextErrors.email = "Enter a valid email address.";
    if (!phone) nextErrors.phone = "Enter your phone number.";
    else if (!VIETNAM_PHONE_PATTERN.test(phone)) nextErrors.phone = "Enter a valid Vietnamese phone number.";
    if (!password) nextErrors.password = "Enter a password.";
    else if (password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (!confirmPassword) nextErrors.confirmPassword = "Confirm your password.";
    else if (password !== confirmPassword) nextErrors.confirmPassword = "Passwords do not match.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus("Check the highlighted fields and try again.");
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
        setStatus(error.status === 409 ? "An account with this email already exists. Sign in or use another email." : error.message);
        if (error.status === 409) setErrors({ email: "This email is already registered." });
      } else {
        setStatus("Something went wrong. Please try again.");
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
        <input id={field} name={field} type={visible ? "text" : "password"} autoComplete={autoComplete} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? errorId : field === "password" ? "password-help" : undefined} onChange={() => clearFieldError(field)} placeholder="Enter your password" className={`${INPUT_CLASS_NAME} pr-12`} />
        <button type="button" onClick={() => setVisiblePasswords(current => ({ ...current, [field]: !visible }))} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={visible} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-foreground"><Icon name={visible ? "eye-off" : "eye"} /></button>
      </div>
      {field === "password" && !errors.password && <p id="password-help" className="flex items-center gap-2 text-xs text-muted"><span className="text-accent">◆</span>Use at least 8 characters.</p>}
      {errors[field] && <p id={errorId} className="text-sm text-error">{errors[field]}</p>}
    </div>;
  }

  return (
    <form noValidate onSubmit={handleSubmit} aria-busy={isSubmitting} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="fullName" className="block font-heading text-sm font-semibold text-foreground">Full Name</label>
        <input id="fullName" name="fullName" type="text" autoComplete="name" aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? "fullName-error" : undefined} onChange={() => clearFieldError("fullName")} placeholder="Nguyen Van A" className={INPUT_CLASS_NAME} />
        {errors.fullName && <p id="fullName-error" className="text-sm text-error">{errors.fullName}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="registerEmail" className="block font-heading text-sm font-semibold text-foreground">Email Address</label>
        <input id="registerEmail" name="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "registerEmail-error" : undefined} onChange={() => clearFieldError("email")} placeholder="name@example.com" className={INPUT_CLASS_NAME} />
        {errors.email && <p id="registerEmail-error" className="text-sm text-error">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="block font-heading text-sm font-semibold text-foreground">Phone Number</label>
        <div className="relative">
          <span aria-hidden="true" className="absolute inset-y-1.5 left-1.5 flex items-center rounded-md bg-panel-hover px-2 font-heading text-xs font-semibold text-accent">VN +84</span>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "phone-error" : undefined} onChange={() => clearFieldError("phone")} placeholder="0912 345 678" className={`${INPUT_CLASS_NAME} pl-24`} />
        </div>
        {errors.phone && <p id="phone-error" className="text-sm text-error">{errors.phone}</p>}
      </div>

      {renderPasswordField({ field: "password", label: "Password", autoComplete: "new-password" })}
      {renderPasswordField({ field: "confirmPassword", label: "Confirm Password", autoComplete: "new-password" })}

      <Button type="submit" disabled={isSubmitting} className="w-full py-3 uppercase tracking-wider shadow-lg shadow-action/20">{isSubmitting ? "Creating Account..." : "Create Account"} <Icon name="arrow" /></Button>
      {status && <p role="status" className="text-center text-sm leading-6 text-muted">{status}</p>}
    </form>
  );
}
