"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { displayLabel } from "@/lib/display-labels";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CinemaBrand } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AuthApiError, getCustomerProfile, updateCustomerProfile } from "@/features/auth/auth-api";
import { CustomerAccountMenu } from "@/features/auth/customer-account-menu";
import { useAuth } from "@/features/auth/auth-context";
import type { CustomerProfile } from "@/features/auth/auth.types";

type EditableField = "fullName" | "phone";
type FieldErrors = Partial<Record<EditableField, string>>;

const PHONE_PATTERN = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;



function initials(fullName: string) {
  return fullName.trim().split(/\s+/).slice(-2).map(part => part[0]).join("").toUpperCase() || "SC";
}

export function ProfileScreen() {
  const router = useRouter();
  const { session, isHydrated, clearSession, updateUserDisplayData } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [draft, setDraft] = useState({ fullName: "", phone: "" });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleUnauthorized = useCallback(() => {
    clearSession();
    router.replace("/login");
  }, [clearSession, router]);

  const loadProfile = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const loaded = await getCustomerProfile(session.accessToken);
      setProfile(loaded);
      setDraft({ fullName: loaded.fullName, phone: loaded.phone });
    } catch (caught) {
      if (caught instanceof AuthApiError && caught.status === 401) {
        handleUnauthorized();
        return;
      }
      setError(caught instanceof AuthApiError ? caught.message : "Không thể tải hồ sơ của bạn.");
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized, session]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (session.expiresAt <= Date.now()) return;
    const timeout = window.setTimeout(() => void loadProfile(), 0);
    return () => window.clearTimeout(timeout);
  }, [isHydrated, loadProfile, router, session]);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    const fullName = draft.fullName.trim();
    const phone = draft.phone.trim();
    if (!fullName) errors.fullName = "Họ tên không được để trống.";
    else if (fullName.length > 150) errors.fullName = "Họ tên không được quá 150 ký tự.";
    if (!phone) errors.phone = "Số điện thoại không được để trống.";
    else if (!PHONE_PATTERN.test(phone.replace(/[ .-]/g, ""))) errors.phone = "Nhập số điện thoại Việt Nam hợp lệ.";
    return errors;
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !profile) return;
    const errors = validate();
    setFieldErrors(errors);
    setError("");
    setSuccess("");
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      const updated = await updateCustomerProfile(session.accessToken, {
        fullName: draft.fullName.trim(),
        phone: draft.phone.trim(),
      });
      setProfile(updated);
      setDraft({ fullName: updated.fullName, phone: updated.phone });
      updateUserDisplayData({ fullName: updated.fullName, email: updated.email, role: updated.role });
      setEditing(false);
      setSuccess("Đã cập nhật hồ sơ của bạn.");
    } catch (caught) {
      if (caught instanceof AuthApiError) {
        if (caught.status === 401) {
          handleUnauthorized();
          return;
        }
        setFieldErrors({ fullName: caught.fieldErrors.fullName, phone: caught.fieldErrors.phone });
        setError(caught.message);
      } else setError("Không thể lưu hồ sơ của bạn.");
    } finally {
      setSaving(false);
    }
  }

  function cancelEditing() {
    if (!profile) return;
    setDraft({ fullName: profile.fullName, phone: profile.phone });
    setFieldErrors({});
    setError("");
    setEditing(false);
  }

  if (!isHydrated || (loading && !profile)) return <ProfileShell><LoadingProfile /></ProfileShell>;
  if (!profile) return <ProfileShell><LoadError message={error} onRetry={() => void loadProfile()} /></ProfileShell>;

  return <ProfileShell>
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-28 sm:px-6 lg:px-10 lg:pt-32">
      <nav aria-label="Đường dẫn điều hướng" className="mb-9 flex items-center gap-2 text-sm text-muted"><Link href="/" className="hover:text-accent">Trang chủ</Link><span aria-hidden="true">/</span><span>Tài khoản</span><span aria-hidden="true">/</span><span className="text-foreground">Hồ sơ của tôi</span></nav>
      <p className="mb-3 font-heading text-xs font-bold uppercase tracking-[0.24em] text-accent">Thông tin &amp; quyền truy cập</p>
      <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Hồ sơ của tôi</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted">Quản lý thông tin cá nhân, thông tin liên hệ và xem trạng thái truy cập tài khoản.</p>

      <section aria-label="Tóm tắt hồ sơ" className="mt-10 flex flex-col gap-5 rounded-2xl border border-outline/40 bg-panel p-6 shadow-2xl shadow-black/20 sm:flex-row sm:items-center sm:p-8">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-accent font-heading text-2xl font-bold text-on-action" aria-hidden="true">{initials(profile.fullName)}</div>
        <div className="min-w-0 flex-1"><h2 className="truncate text-2xl font-semibold text-white">{profile.fullName}</h2><p className="mt-1 truncate text-muted">{profile.email}</p><div className="mt-4 flex flex-wrap gap-2"><StatusBadge>{displayLabel(profile.role)}</StatusBadge><StatusBadge success={profile.status === "ACTIVE"}>{displayLabel(profile.status)}</StatusBadge></div></div>
        <div className="border-t border-outline/30 pt-5 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0"><p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Quyền truy cập tài khoản</p><p className="mt-2 flex items-center gap-2 font-heading font-semibold text-success"><span className="size-2 rounded-full bg-success" aria-hidden="true" />{displayLabel(profile.status)}</p></div>
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-outline/40 bg-panel shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 border-b border-outline/30 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"><div><h2 className="text-2xl font-semibold text-white">Thông tin cá nhân</h2><p className="mt-1 text-sm text-muted">Chỉ có thể chỉnh sửa họ tên và số điện thoại.</p></div>{!editing && <Button variant="secondary" onClick={() => { setEditing(true); setSuccess(""); }}><Icon name="user" />Chỉnh sửa hồ sơ</Button>}</div>
        <form onSubmit={saveProfile} noValidate className="p-6 sm:p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <ProfileField label="Họ tên" name="fullName" value={editing ? draft.fullName : profile.fullName} editable={editing} error={fieldErrors.fullName} onChange={value => setDraft(current => ({ ...current, fullName: value }))} autoComplete="name" />
            <ReadOnlyField label="Địa chỉ email" value={profile.email} hint="Thông tin tài khoản được bảo vệ" />
            <ProfileField label="Số điện thoại" name="phone" value={editing ? draft.phone : profile.phone} editable={editing} error={fieldErrors.phone} onChange={value => setDraft(current => ({ ...current, phone: value }))} autoComplete="tel" />
            <ReadOnlyField label="Vai trò tài khoản" value={displayLabel(profile.role)} hint="Do Smart Cinema quản lý" />
            <ReadOnlyField label="Trạng thái tài khoản" value={displayLabel(profile.status)} hint="Do Smart Cinema quản lý" />
          </div>
          <div aria-live="polite" className="mt-6 min-h-6">{error && <p role="alert" className="text-sm text-error">{error}</p>}{success && <p className="text-sm text-success">{success}</p>}</div>
          {editing && <div className="mt-4 flex flex-col-reverse gap-3 border-t border-outline/30 pt-6 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={cancelEditing} disabled={saving}>Hủy</Button><Button type="submit" disabled={saving}>{saving ? "Đang lưu…" : "Lưu thay đổi"}</Button></div>}
        </form>
      </section>
      <section className="mt-8 rounded-2xl border border-outline/30 bg-panel-low p-6 sm:p-8"><h2 className="text-lg font-semibold text-white">Thông tin tài khoản &amp; quyền riêng tư</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Vai trò, trạng thái và email là các trường được bảo vệ. Liên hệ hỗ trợ Smart Cinema nếu thông tin này không chính xác.</p></section>
    </main>
  </ProfileShell>;
}

function ProfileShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-linear-to-b from-canvas via-background to-canvas">
    <header className="fixed inset-x-0 top-0 z-40 border-b border-outline/20 bg-canvas/90 backdrop-blur-xl"><div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10"><Link href="/" aria-label="Trang chủ Smart Cinema"><CinemaBrand /></Link><nav aria-label="Điều hướng tài khoản" className="flex items-center gap-4"><Link href="/movies" className="hidden min-h-11 items-center text-sm text-muted hover:text-accent sm:inline-flex">Về danh sách phim</Link><CustomerAccountMenu /></nav></div></header>
    {children}
    <footer className="border-t border-outline/20 bg-canvas px-4 py-8 text-center text-sm text-muted">© 2026 Smart Cinema. Trải nghiệm điện ảnh cao cấp, chăm chút từng chi tiết.</footer>
  </div>;
}

function ProfileField({ label, name, value, editable, error, onChange, autoComplete }: { label: string; name: EditableField; value: string; editable: boolean; error?: string; onChange: (value: string) => void; autoComplete: string }) {
  const errorId = `${name}-error`;
  return <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-muted">{label}</span><input name={name} value={value} onChange={event => onChange(event.target.value)} readOnly={!editable} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} autoComplete={autoComplete} className={`min-h-12 w-full rounded-lg border bg-panel-high px-4 text-foreground transition-colors ${editable ? "border-outline focus:border-action" : "cursor-default border-transparent text-muted"}`} />{error && <span id={errorId} className="mt-2 block text-sm text-error">{error}</span>}</label>;
}

function ReadOnlyField({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-muted">{label}</span><span className="relative block"><input value={value} readOnly aria-readonly="true" className="min-h-12 w-full cursor-default rounded-lg border border-transparent bg-panel-high px-4 pr-12 text-muted" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-accent" aria-hidden="true">✓</span></span><span className="mt-2 block text-xs text-muted">{hint}</span></label>;
}

function StatusBadge({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${success ? "bg-success/10 text-success" : "bg-accent/10 text-accent"}`}>{children}</span>;
}

function LoadingProfile() {
  return <main className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center px-4 pt-20"><p role="status" className="text-muted">Đang tải hồ sơ của bạn…</p></main>;
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <main className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center px-4 pt-20 text-center"><h1 className="text-3xl text-white">Không thể tải hồ sơ của bạn</h1><p role="alert" className="mt-3 text-muted">{message}</p><Button className="mt-6" onClick={onRetry}>Thử lại</Button></main>;
}
