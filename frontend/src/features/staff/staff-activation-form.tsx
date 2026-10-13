"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatusFeedback } from "@/components/ui/status-feedback";
import { SurfaceCard } from "@/components/ui/surface-card";
import { getAuthSessionSnapshot, subscribeToAuthSession } from "@/features/auth/auth-storage";
import { StaffActivationController } from "@/features/staff/staff-activation-controller";
import { captureStaffInvitation, setupStaffPassword, STAFF_ACTIVATION_PATH } from "@/features/staff/staff-activation-service";

export function StaffActivationForm() {
  const [controller] = useState(() => new StaffActivationController(setupStaffPassword));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  const form = useRef<HTMLFormElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const [visible, setVisible] = useState({ password: false, confirmation: false });

  useLayoutEffect(() => {
    const capture = () => captureStaffInvitation(window.location, window.history);
    const detach = controller.attach(capture);
    const eraseFields = () => { form.current?.reset(); };
    const navigation = () => {
      // AuthLayout's fixed keyboard skip link changes the fragment but is not
      // a new invitation or route context. Keep the form and its credential.
      if (window.location.pathname === STAFF_ACTIVATION_PATH && window.location.hash === "#auth-content") {
        window.history.replaceState(window.history.state, "", STAFF_ACTIVATION_PATH);
        return;
      }
      eraseFields(); setVisible({ password: false, confirmation: false });
      if (window.location.pathname === STAFF_ACTIVATION_PATH) controller.navigate(capture);
      else controller.interrupt();
    };
    // Native fragment traversal can emit both popstate and hashchange. After
    // popstate has captured/scrubbed it, the empty duplicate must not reset it.
    const hashNavigation = () => { if (window.location.hash) navigation(); };
    const hide = () => { eraseFields(); controller.interrupt(); };
    const identity = () => {
      try { const session = getAuthSessionSnapshot(); return session ? `${session.user.id}:${session.user.role}` : "guest"; }
      catch { return "guest"; } // Public setup itself does not require stored auth.
    };
    let owner = identity();
    const unsubscribe = subscribeToAuthSession(() => {
      const next = identity();
      if (next !== owner) { owner = next; hide(); }
    });
    window.addEventListener("pagehide", hide); window.addEventListener("popstate", navigation); window.addEventListener("hashchange", hashNavigation);
    return () => {
      eraseFields(); detach(); unsubscribe();
      window.removeEventListener("pagehide", hide); window.removeEventListener("popstate", navigation); window.removeEventListener("hashchange", hashNavigation);
    };
  }, [controller]);

  useLayoutEffect(() => {
    if (!["preparing", "ready", "submitting"].includes(state.stage)) heading.current?.focus({ preventScroll: true });
  }, [state.stage]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    void controller.submit(String(values.get("password") ?? ""), String(values.get("confirmation") ?? ""));
    const current = controller.getSnapshot();
    if (current.stage === "submitting") {
      event.currentTarget.reset(); setVisible({ password: false, confirmation: false });
    } else {
      const first = current.errors.password ? "staff-new-password" : current.errors.confirmation ? "staff-confirm-password" : "";
      if (first) document.getElementById(first)?.focus();
    }
  }

  const showingForm = state.stage === "ready" || state.stage === "submitting";
  const submitting = state.stage === "submitting";
  const title = state.stage === "awaiting-admin" ? "Đã thiết lập mật khẩu"
    : state.stage === "uncertain" ? "Chưa thể xác nhận kết quả"
      : state.stage === "throttled" ? "Vui lòng chờ trước khi tiếp tục"
        : state.stage === "missing" ? "Cần liên kết lời mời"
          : state.stage === "malformed" ? "Liên kết lời mời chưa hợp lệ"
            : state.stage === "unavailable" ? "Chưa thể sử dụng lời mời"
              : state.stage === "interrupted" ? "Hãy mở lại lời mời"
                : "Thiết lập mật khẩu nhân viên";
  return <SurfaceCard tone="subtle" padding="none" aria-labelledby="staff-activation-title" className="relative w-full max-w-[35rem] border-t-action/40 p-6 sm:p-10">
    <div className="mb-7 text-center">
      <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-xl bg-panel-high text-accent"><Icon name="film" width={28} height={28} /></span>
      <p className="mb-3 font-heading text-xs font-semibold uppercase tracking-widest text-accent">Lời mời nhân viên · Smart Cinema</p>
      <h1 ref={heading} tabIndex={-1} id="staff-activation-title" className="break-words text-3xl font-bold tracking-tight">{title}</h1>
    </div>
    {state.stage === "preparing" ? <StatusFeedback compact role="status" message="Đang chuẩn bị liên kết lời mời…" />
      : state.stage === "awaiting-admin" ? <div className="space-y-5">
        <StatusFeedback compact role="status" tone="success" message="Mật khẩu đã được thiết lập thành công. Tài khoản nhân viên vẫn đang chờ quản trị viên kích hoạt." />
        <StatusBadge tone="neutral">Chờ quản trị viên kích hoạt</StatusBadge>
        <p className="text-body-sm leading-6 text-muted">Bạn chưa thể bắt đầu soát vé. Sau khi quản trị viên kích hoạt tài khoản, hãy dùng trang đăng nhập hiện có.</p>
      </div>
        : showingForm ? <div className="space-y-6">
          <p className="text-body-sm leading-6 text-muted">Tự thiết lập mật khẩu qua lời mời. Sau bước này, tài khoản vẫn cần quản trị viên kích hoạt trước khi bạn có thể đăng nhập và soát vé.</p>
          <form ref={form} method="post" noValidate onSubmit={submit} aria-busy={submitting} className="space-y-5">
            {(["password", "confirmation"] as const).map(field => {
              const id = field === "password" ? "staff-new-password" : "staff-confirm-password";
              const label = field === "password" ? "Mật khẩu mới" : "Xác nhận mật khẩu mới";
              const error = state.errors[field];
              return <FormField key={field} inputId={id} label={label} error={error} hint={field === "password" ? "Ít nhất 8 ký tự và tối đa 72 byte UTF-8. Chữ có dấu và emoji có thể chiếm nhiều byte." : undefined}>
                <div className="relative"><input id={id} name={field} type={visible[field] ? "text" : "password"} autoComplete="new-password" spellCheck={false} autoCapitalize="none" disabled={submitting} onChange={() => controller.edit(field)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : field === "password" ? `${id}-help` : undefined} className="form-input pr-14" />
                  <button type="button" disabled={submitting} aria-label={`${visible[field] ? "Ẩn" : "Hiện"} ${label.toLowerCase()}`} aria-pressed={visible[field]} aria-controls={id} onClick={() => setVisible(current => ({ ...current, [field]: !current[field] }))} className="absolute inset-y-0 right-0 flex min-h-control min-w-control items-center justify-center rounded-control px-3 text-muted hover:text-foreground disabled:opacity-50"><Icon name={visible[field] ? "eye-off" : "eye"} /></button>
                </div>
              </FormField>;
            })}
            {state.message && <StatusFeedback compact role="alert" tone="error" message={state.message} />}
            <Button type="submit" disabled={submitting} className="w-full">{submitting ? "Đang thiết lập mật khẩu…" : "Thiết lập mật khẩu"}</Button>
            {submitting && <StatusFeedback compact role="status" message="Đang chờ xác nhận từ máy chủ. Không gửi lại yêu cầu." />}
          </form>
          <p className="text-body-sm leading-6 text-muted">Liên kết đã được xóa khỏi thanh địa chỉ để bảo vệ lời mời. Nếu tải lại trang trước khi gửi, hãy mở lại liên kết còn hiệu lực trong email.</p>
        </div>
          : <div className="space-y-4">
            <StatusFeedback compact role="alert" tone="error" message={state.message || (state.stage === "missing" ? "Mở liên kết lời mời từ email để thiết lập mật khẩu. Sau khi tải lại trang, bạn cần mở lại liên kết còn hiệu lực." : state.stage === "malformed" ? "Liên kết lời mời không đúng định dạng. Mở nguyên liên kết trong email hoặc liên hệ quản trị viên để được hỗ trợ." : "Thông tin lời mời đã được xóa. Mở lại liên kết trong email để tiếp tục.")} />
            {state.stage === "throttled" && <p role="status" className="text-body-sm text-muted">Máy chủ yêu cầu chờ {state.retryAfter} giây trước khi mở lại lời mời. Trang này không tự gửi lại yêu cầu.</p>}
          </div>}
    <div className="mt-7 border-t border-outline/40 pt-5"><Link href="/login" className="inline-flex min-h-control w-full items-center justify-center rounded-control px-4 font-heading text-sm font-semibold text-accent underline underline-offset-4 hover:text-foreground">Đến trang đăng nhập</Link></div>
    <noscript><p className="mt-4 text-body-sm text-muted">Cần bật JavaScript để mở lời mời và thiết lập mật khẩu an toàn.</p></noscript>
  </SurfaceCard>;
}
