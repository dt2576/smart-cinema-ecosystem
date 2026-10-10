import type { ReactNode } from "react";

type FormFieldProps = {
  inputId: string;
  label: string;
  children: ReactNode;
  error?: string;
  hint?: ReactNode;
  labelAside?: ReactNode;
};

// The caller retains the native input and its validation/event handlers.
// Use `${inputId}-error` / `${inputId}-help` for aria-describedby on that input.
export function FormField({ inputId, label, children, error, hint, labelAside }: FormFieldProps) {
  return <div className="min-w-0 space-y-2">
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={inputId} className="font-heading text-label font-semibold text-foreground">{label}</label>
      {labelAside}
    </div>
    {children}
    {error ? <p id={`${inputId}-error`} className="text-body-sm text-error">{error}</p>
      : hint && <p id={`${inputId}-help`} className="text-body-sm text-muted">{hint}</p>}
  </div>;
}
