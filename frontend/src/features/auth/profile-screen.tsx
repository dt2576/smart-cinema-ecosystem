"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
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

function labelEnum(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

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
      setError(caught instanceof AuthApiError ? caught.message : "Unable to load your profile.");
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
    if (!fullName) errors.fullName = "Full name is required.";
    else if (fullName.length > 150) errors.fullName = "Full name must be 150 characters or fewer.";
    if (!phone) errors.phone = "Phone number is required.";
    else if (!PHONE_PATTERN.test(phone.replace(/[ .-]/g, ""))) errors.phone = "Enter a valid Vietnamese phone number.";
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
      setSuccess("Your profile has been updated.");
    } catch (caught) {
      if (caught instanceof AuthApiError) {
        if (caught.status === 401) {
          handleUnauthorized();
          return;
        }
        setFieldErrors({ fullName: caught.fieldErrors.fullName, phone: caught.fieldErrors.phone });
        setError(caught.message);
      } else setError("Unable to save your profile.");
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
      <nav aria-label="Breadcrumb" className="mb-9 flex items-center gap-2 text-sm text-muted"><Link href="/" className="hover:text-accent">Home</Link><span aria-hidden="true">/</span><span>Account</span><span aria-hidden="true">/</span><span className="text-foreground">My Profile</span></nav>
      <p className="mb-3 font-heading text-xs font-bold uppercase tracking-[0.24em] text-accent">Identity &amp; governance</p>
      <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">My Profile</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted">Manage your personal identity and contact details, and review your account access status.</p>

      <section aria-label="Profile summary" className="mt-10 flex flex-col gap-5 rounded-2xl border border-outline/40 bg-panel p-6 shadow-2xl shadow-black/20 sm:flex-row sm:items-center sm:p-8">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-accent font-heading text-2xl font-bold text-on-action" aria-hidden="true">{initials(profile.fullName)}</div>
        <div className="min-w-0 flex-1"><h2 className="truncate text-2xl font-semibold text-white">{profile.fullName}</h2><p className="mt-1 truncate text-muted">{profile.email}</p><div className="mt-4 flex flex-wrap gap-2"><StatusBadge>{labelEnum(profile.role)}</StatusBadge><StatusBadge success={profile.status === "ACTIVE"}>{labelEnum(profile.status)}</StatusBadge></div></div>
        <div className="border-t border-outline/30 pt-5 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0"><p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Account access</p><p className="mt-2 flex items-center gap-2 font-heading font-semibold text-success"><span className="size-2 rounded-full bg-success" aria-hidden="true" />{profile.status === "ACTIVE" ? "Verified and active" : labelEnum(profile.status)}</p></div>
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-outline/40 bg-panel shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 border-b border-outline/30 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"><div><h2 className="text-2xl font-semibold text-white">Personal Information</h2><p className="mt-1 text-sm text-muted">Only your full name and phone number can be edited.</p></div>{!editing && <Button variant="secondary" onClick={() => { setEditing(true); setSuccess(""); }}><Icon name="user" />Edit profile</Button>}</div>
        <form onSubmit={saveProfile} noValidate className="p-6 sm:p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <ProfileField label="Full name" name="fullName" value={editing ? draft.fullName : profile.fullName} editable={editing} error={fieldErrors.fullName} onChange={value => setDraft(current => ({ ...current, fullName: value }))} autoComplete="name" />
            <ReadOnlyField label="Email address" value={profile.email} hint="Verified identity field" />
            <ProfileField label="Phone number" name="phone" value={editing ? draft.phone : profile.phone} editable={editing} error={fieldErrors.phone} onChange={value => setDraft(current => ({ ...current, phone: value }))} autoComplete="tel" />
            <ReadOnlyField label="Account role" value={labelEnum(profile.role)} hint="Managed by Smart Cinema" />
            <ReadOnlyField label="Account status" value={labelEnum(profile.status)} hint="Managed by Smart Cinema" />
          </div>
          <div aria-live="polite" className="mt-6 min-h-6">{error && <p role="alert" className="text-sm text-error">{error}</p>}{success && <p className="text-sm text-success">{success}</p>}</div>
          {editing && <div className="mt-4 flex flex-col-reverse gap-3 border-t border-outline/30 pt-6 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={cancelEditing} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button></div>}
        </form>
      </section>
      <section className="mt-8 rounded-2xl border border-outline/30 bg-panel-low p-6 sm:p-8"><h2 className="text-lg font-semibold text-white">Account information &amp; privacy</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Your role, status, and verified email are protected account fields. Contact Smart Cinema support if any protected information is incorrect.</p></section>
    </main>
  </ProfileShell>;
}

function ProfileShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[radial-gradient(circle_at_80%_10%,rgba(245,158,11,0.07),transparent_28%),linear-gradient(180deg,#0a0e16_0%,#0f131c_45%,#0a0e16_100%)]">
    <header className="fixed inset-x-0 top-0 z-40 border-b border-outline/20 bg-canvas/90 backdrop-blur-xl"><div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10"><Link href="/" aria-label="Smart Cinema home"><CinemaBrand /></Link><nav aria-label="Account navigation" className="flex items-center gap-4"><Link href="/" className="hidden text-sm text-muted hover:text-accent sm:block">Back to movies</Link><CustomerAccountMenu /></nav></div></header>
    {children}
    <footer className="border-t border-outline/20 bg-canvas px-4 py-8 text-center text-sm text-muted">© 2026 Smart Cinema. Premium cinema, thoughtfully delivered.</footer>
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
  return <main className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center px-4 pt-20"><p role="status" className="text-muted">Loading your profile…</p></main>;
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <main className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center px-4 pt-20 text-center"><h1 className="text-3xl text-white">We couldn’t load your profile</h1><p role="alert" className="mt-3 text-muted">{message}</p><Button className="mt-6" onClick={onRetry}>Try again</Button></main>;
}
