import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "text";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-action text-on-action hover:bg-action-hover font-bold",
    secondary: "bg-panel-high text-foreground hover:bg-panel-hover",
    text: "text-accent hover:text-foreground",
  };
  return <button type="button" {...props} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-heading text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`} />;
}
