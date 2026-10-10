import type { ReactNode } from "react";
import { SurfaceCard } from "@/components/ui/surface-card";

type StatusFeedbackProps = {
  title?: string;
  message: string;
  tone?: "muted" | "error" | "success";
  role?: "status" | "alert";
  headingLevel?: 1 | 2;
  icon?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  className?: string;
};

// Messages/actions have already been selected by the feature; no raw error or
// domain status is interpreted here, and no request is initiated automatically.
export function StatusFeedback({ title, message, tone = "muted", role, headingLevel = 2, icon, actions, compact = false, className = "" }: StatusFeedbackProps) {
  const tones = { muted: "text-muted", error: "text-error", success: "text-success" };
  if (compact) return <p role={role} className={`text-body-sm ${tones[tone]} ${className}`}>{message}</p>;
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return <SurfaceCard tone="subtle" padding="none" role={role} aria-live={role ? undefined : "polite"} className={`px-6 py-12 text-center ${className}`}>
    {icon && <div aria-hidden="true" className="mb-4 flex justify-center text-accent">{icon}</div>}
    {title && <Heading className="text-heading-md font-semibold">{title}</Heading>}
    <p className={`mx-auto mt-3 max-w-lg text-body-sm ${tones[tone]}`}>{message}</p>
    {actions && <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>}
  </SurfaceCard>;
}
