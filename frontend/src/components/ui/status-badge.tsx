import type { HTMLAttributes } from "react";

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "error";
};

export function StatusBadge({ tone = "neutral", className = "", ...props }: StatusBadgeProps) {
  const tones = { neutral: "border-accent/20 bg-accent/10 text-accent", success: "border-success/20 bg-success/10 text-success", error: "border-error/20 bg-error/10 text-error" };
  return <span {...props} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-heading text-xs font-semibold ${tones[tone]} ${className}`} />;
}
