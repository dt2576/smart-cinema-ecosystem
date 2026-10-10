import type { HTMLAttributes } from "react";

type SurfaceCardProps = HTMLAttributes<HTMLElement> & {
  as?: "section" | "div";
  tone?: "default" | "subtle";
  padding?: "default" | "none";
};

export function SurfaceCard({ as: Element = "section", tone = "default", padding = "default", className = "", ...props }: SurfaceCardProps) {
  return <Element {...props} className={`surface-card ${tone === "subtle" ? "bg-panel-low" : "bg-panel"} ${padding === "default" ? "p-6 sm:p-8" : ""} ${className}`} />;
}
