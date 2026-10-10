import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "text";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-action text-on-action hover:bg-action-hover font-bold",
    secondary: "bg-panel-high text-foreground hover:bg-panel-hover",
    text: "text-accent hover:text-foreground",
  };
  return <button type="button" {...props} className={`inline-flex min-h-control items-center justify-center gap-2 rounded-control px-4 py-2.5 font-heading text-label font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`} />;
}
