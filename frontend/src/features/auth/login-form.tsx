"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type LoginErrors = {
  email?: string;
  password?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [status, setStatus] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const nextErrors: LoginErrors = {};

    if (!email) nextErrors.email = "Enter your email address.";
    else if (!EMAIL_PATTERN.test(email)) nextErrors.email = "Enter a valid email address.";
    if (!password) nextErrors.password = "Enter your password.";

    setErrors(nextErrors);
    setStatus(Object.keys(nextErrors).length === 0
      ? "Your details are ready. Account authentication will be available when the secure login service is connected."
      : "Check the highlighted fields and try again.");
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="block font-heading text-xs font-semibold uppercase tracking-wider text-muted">Email Address</label>
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
          <label htmlFor="password" className="font-heading text-xs font-semibold uppercase tracking-wider text-muted">Password</label>
          <span className="font-heading text-xs font-semibold text-accent" aria-disabled="true">Forgot password?</span>
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
            placeholder="Enter your password"
            className="h-12 w-full rounded-lg bg-panel-high px-4 pr-12 text-foreground outline-none transition focus:bg-panel-hover focus:ring-2 focus:ring-action aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-error"
          />
          <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-foreground">
            <Icon name={showPassword ? "eye-off" : "eye"} />
          </button>
        </div>
        {errors.password && <p id="password-error" className="text-sm text-error">{errors.password}</p>}
      </div>

      <label className="flex w-fit items-center gap-3 text-sm text-muted">
        <input name="rememberMe" type="checkbox" className="size-5 accent-action" />
        Remember me
      </label>

      <Button type="submit" className="w-full py-3 uppercase tracking-wider shadow-lg shadow-action/20">Sign In <Icon name="arrow" /></Button>
      {status && <p role="status" className="text-center text-sm leading-6 text-muted">{status}</p>}
    </form>
  );
}
