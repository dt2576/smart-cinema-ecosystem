import Link from "next/link";
import type { ReactNode } from "react";
import { displayLabel } from "@/lib/display-labels";
import styles from "@/features/admin/admin-configuration.module.css";

const PATHS = {
  cinema: "M3 4h18v16H3zM7 4v16M17 4v16M3 8h4m-4 8h4M17 8h4m-4 8h4",
  hall: "M4 21V3h13v18M2 21h20M8 7h5M8 11h5M8 15h5M17 10h3v11",
  seat: "M6 13V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8M4 10v7h16v-7M7 17v4m10-4v4M4 13h16",
  edit: "m15 3 6 6-11 11H4v-6zM13 5l6 6",
  add: "M12 5v14M5 12h14",
  back: "M19 12H5m6-6-6 6 6 6",
  shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6zM8 12l3 3 5-6",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  status: "M8 12l3 3 5-6M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  menu: "M4 6h16M4 12h16M4 18h16",
};
export function ConfigurationIcon({ name, className }: { name: keyof typeof PATHS; className?: string }) {
  return <svg aria-hidden="true" className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={PATHS[name]} /></svg>;
}
export function ConfigurationFrame({ title, children, back = "/admin/cinemas", backLabel = "Rạp chiếu phim", action, headingInContent = false }: { title: string; children: ReactNode; back?: string; backLabel?: string; action?: ReactNode; headingInContent?: boolean }) {
  return <section className={styles.workspace}>
    <nav aria-label="Đường dẫn" className={styles.breadcrumb}><Link href={back}><ConfigurationIcon name="back" />{backLabel}</Link><span aria-hidden="true">/</span><span>{title}</span></nav>
    {!headingInContent && <div className={styles.pageHeading}><h1>{title}</h1>{action}</div>}{children}
  </section>;
}
export function ConfigurationLink({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
  return <Link href={href} className={primary ? styles.primaryLink : styles.secondaryLink}>{children}</Link>;
}
export function ConfigurationStatus({ status }: { status: string }) {
  return <span className={styles.status} data-status={status}><span aria-hidden="true" />{displayLabel(status)}</span>;
}
export { styles as configurationStyles };
