"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/features/admin/admin-shell";
import { ConfigurationIcon, configurationStyles as styles } from "@/features/admin/admin-configuration-ui";

export function ConfigurationRequestState({ loading, error, retry }: { loading: boolean; error?: Error; retry: () => void }) {
  const { reportError } = useAdmin();
  if (loading) return <div className={styles.state} aria-busy="true"><p role="status">Đang tải cấu hình…</p><div aria-hidden="true" className={styles.skeleton} /><div aria-hidden="true" className={styles.skeleton} /></div>;
  return <div className={styles.state}><ConfigurationIcon name="status" /><p role="alert">{error?.message ?? "Không thể tải cấu hình."}</p><Button onClick={() => { reportError(error); retry(); }}>Thử lại</Button></div>;
}
export function ConfigurationField({ name, children }: { name: string; children: ReactNode }) { return <label className={styles.field}>{name}{children}</label>; }
export function ConfigurationFeedback({ error, saved }: { error?: string; saved?: boolean }) {
  return <div className={styles.feedback}>{error && <p role="alert">{error}</p>}{saved && <p role="status">Đã lưu cấu hình.</p>}</div>;
}
