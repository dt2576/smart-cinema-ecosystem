"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { CinemaBrand, SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { StatusFeedback } from "@/components/ui/status-feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-context";
import { getAuthSessionSnapshot } from "@/features/auth/auth-storage";
import { getStaffAssignments, resolveStaffQr, getStaffBooking, checkInStaffTickets } from "@/features/staff/staff-api";
import { StaffWorkspaceController } from "@/features/staff/staff-workspace-controller";
import { StaffQrCamera } from "@/features/staff/staff-qr-camera";
import { StaffBookingPanel, StaffConfirmation } from "@/features/staff/staff-booking-panel";
import type { AuthSession } from "@/features/auth/auth.types";

export function StaffCheckInWorkspace() {
  const { session, isHydrated } = useAuth();
  if (!isHydrated) return <StaffAccess title="Đang kiểm tra phiên đăng nhập"><p role="status">Đang xác minh phiên đăng nhập…</p></StaffAccess>;
  if (!session) return <StaffAccess title="Cần đăng nhập"><p>Đăng nhập bằng tài khoản nhân viên để soát vé tại rạp.</p><Link href="/login?returnTo=%2Fstaff%2Fcheck-in" className="inline-flex min-h-control items-center text-accent underline">Đăng nhập nhân viên</Link></StaffAccess>;
  if (session.user.role !== "STAFF") return <StaffAccess title="Cần tài khoản nhân viên"><p>Tài khoản này không có quyền vận hành soát vé. Quản trị viên và quản lý không được kế thừa quyền soát vé.</p><Link href={session.user.role === "ADMIN" ? "/admin" : "/"} className="inline-flex min-h-control items-center text-accent underline">Quay về khu vực của bạn</Link></StaffAccess>;
  return <VerifiedStaffWorkspace key={`${session.user.id}:${session.accessToken}`} session={session} />;
}
function StaffAccess({ title, children }: { title: string; children: React.ReactNode }) {
  return <><SiteHeader /><main className="page-container page-content"><StatusFeedback headingLevel={1} title={title} message="Khu vực soát vé dành cho nhân viên được phân công." actions={<div className="space-y-4">{children}</div>} /></main></>;
}
function VerifiedStaffWorkspace({ session }: { session: AuthSession }) {
  const router = useRouter(), { clearSession, logoutSession } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [controller] = useState(() => {
    const token = session.accessToken;
    const current = () => { const owner = getAuthSessionSnapshot(); return owner?.accessToken === token && owner.user.id === session.user.id && owner.user.role === "STAFF"; };
    return new StaffWorkspaceController({ assignments: signal => getStaffAssignments(token, signal), resolve: (cinema, qr, signal) => resolveStaffQr(cinema, qr, token, signal), recover: (booking, cinema, signal, previous) => getStaffBooking(booking, cinema, token, signal, previous), checkIn: (booking, selected, signal) => checkInStaffTickets(booking, selected, token, signal) }, current, clearSession);
  });
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  useEffect(() => {
    // The workspace accepts no QR/navigation parameters or persistent operational state.
    if (window.location.search || window.location.hash) window.history.replaceState(window.history.state, "", "/staff/check-in");
    controller.start();
    const focus = () => controller.foreground(), visibility = () => { if (document.hidden) controller.suspend(); else controller.foreground(); }, hide = () => controller.suspend();
    window.addEventListener("focus", focus); document.addEventListener("visibilitychange", visibility); window.addEventListener("pagehide", hide);
    return () => { window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", hide); controller.destroy(); };
  }, [controller]);
  async function logout() { if (loggingOut) return; controller.destroy(); setLoggingOut(true); await logoutSession(); router.replace("/"); }
  const busy = state.assignmentLoading || ["resolving", "recovering", "submitting"].includes(state.operation);
  const throttled = state.retryAt > 0, locked = busy || state.operation !== "idle";
  return <div className="min-h-screen bg-background">
    <a href="#staff-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-action focus:p-3 focus:text-on-action">Chuyển đến nội dung soát vé</a>
    <header className="sticky top-0 z-40 border-b border-outline/40 bg-canvas/95 backdrop-blur-xl"><div className="page-container flex min-h-header flex-wrap items-center justify-between gap-3 py-3"><Link href="/staff/check-in" aria-label="Smart Cinema — Soát vé"><CinemaBrand /></Link><nav aria-label="Điều hướng nhân viên" className="flex flex-wrap items-center gap-3 text-sm"><span className="hidden max-w-48 truncate text-muted md:block">{session.user.fullName}</span><Link href="/movies" className="inline-flex min-h-control items-center rounded-control px-3 text-muted hover:bg-panel-high">Phim</Link><Button variant="secondary" disabled={loggingOut} onClick={() => void logout()}>Đăng xuất</Button></nav></div></header>
    <main id="staff-content" tabIndex={-1} className="page-container space-y-6 py-7 sm:py-10"><div><p className="font-heading text-xs font-semibold uppercase tracking-widest text-accent">Nhân viên · Quét mã QR</p><h1 className="mt-3 text-3xl font-bold sm:text-4xl">Soát vé tại rạp</h1><p className="mt-3 max-w-2xl text-body-sm leading-6 text-muted">Một mã QR cho một đơn đặt vé. Chọn và xác nhận từng vé đủ điều kiện; khách cùng đơn có thể vào rạp theo các lượt riêng.</p></div>
      {loggingOut ? <StatusFeedback role="status" message="Đang đăng xuất…" /> : <>
        <SurfaceCard padding="none" className="p-5 sm:p-6"><div className="flex flex-wrap items-end gap-4"><div className="min-w-0 flex-1"><label htmlFor="staff-cinema" className="mb-2 block font-heading text-sm font-semibold">Rạp đang làm việc</label><select id="staff-cinema" value={state.cinemaId} disabled={!state.assignments || state.assignmentLoading} onChange={event => controller.selectCinema(event.target.value)} className="form-input"><option value="">Chọn rạp được phân công</option>{state.assignments?.assignments.map(a => <option key={a.id} value={a.cinemaId}>{a.cinemaName}</option>)}</select>{state.cinemaId && <p className="mt-2 break-words text-body-sm text-muted">{state.assignments?.assignments.find(a => a.cinemaId === state.cinemaId)?.cinemaName}</p>}</div><Button variant="secondary" disabled={busy || throttled} onClick={() => void controller.loadAssignments()}>Kiểm tra phân công</Button></div></SurfaceCard>
        {state.notice && <StatusFeedback compact role={state.notice.tone === "error" ? "alert" : "status"} tone={state.notice.tone} message={state.notice.message} />}
        {throttled && <p role="status" className="text-body-sm text-muted">Máy chủ yêu cầu chờ {state.retrySeconds} giây trước khi kiểm tra lại.</p>}
        {state.assignmentLoading ? <div role="status" className="space-y-4"><p className="text-muted">Đang tải phân công rạp…</p><Skeleton className="h-48" /></div>
          : state.denied ? <StatusFeedback title="Chưa thể xác minh quyền soát vé" message="Cần tài khoản nhân viên đang hoạt động và phân công tại rạp. Kiểm tra lại phân công hoặc liên hệ quản trị viên." />
          : !state.assignments ? <StatusFeedback title="Chưa thể tải phân công" message="Kiểm tra lại phân công trước khi sử dụng camera hoặc xem vé." />
          : !state.assignments.assignments.length ? <StatusFeedback title="Chưa được phân công rạp" message="Bạn chưa có rạp đang được phân công. Liên hệ quản trị viên rồi kiểm tra lại." />
          : !state.cinemaId ? <StatusFeedback title="Chọn rạp để bắt đầu" message="Chọn rõ rạp đang làm việc trước khi quét hoặc nhập mã QR." />
          : <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <SurfaceCard padding="none" aria-label="Quét hoặc nhập mã QR" className="space-y-6 p-5 sm:p-7"><div><h2 className="text-heading-md font-bold">Quét mã QR đặt vé</h2><p className="mt-2 text-body-sm text-muted">Chỉ soát vé tại rạp đã chọn.</p></div>
              <StaffQrCamera key={state.cameraEpoch} disabled={busy || throttled || state.operation === "confirming"} onStart={() => controller.prepareScan()} onActive={value => controller.cameraActive(value)} onDecoded={text => controller.resolveCamera(text, state.cinemaId, state.cameraEpoch)} />
              <form noValidate onSubmit={event => { event.preventDefault(); void controller.resolve(); }} className="space-y-3 border-t border-outline/40 pt-5"><label htmlFor="staff-qr" className="block font-heading text-sm font-semibold">Nhập nội dung mã QR đặt vé</label><textarea id="staff-qr" name="booking-qr" rows={2} autoComplete="off" autoCapitalize="none" spellCheck={false} value={state.manualToken} disabled={busy || state.operation === "confirming"} onChange={event => controller.editManualToken(event.target.value)} onPaste={event => { event.preventDefault(); const input = event.currentTarget; controller.editManualToken(state.manualToken.slice(0, input.selectionStart ?? 0) + event.clipboardData.getData("text/plain") + state.manualToken.slice(input.selectionEnd ?? state.manualToken.length)); }} aria-describedby="staff-qr-help" className="form-input min-h-24 resize-y py-3" placeholder="Dán nguyên nội dung mã QR" /><p id="staff-qr-help" className="text-body-sm leading-6 text-muted">Giữ nguyên cả khoảng trắng trong mã. Nội dung được xóa khỏi ô nhập sau khi gửi.</p><Button type="submit" disabled={busy || throttled || state.operation === "confirming" || state.manualToken.length === 0} className="w-full">{state.operation === "resolving" ? "Đang kiểm tra mã QR…" : "Kiểm tra mã QR"}</Button></form>
            </SurfaceCard>
            <div className="min-w-0">{state.operation === "resolving" ? <StatusFeedback role="status" title="Đang kiểm tra mã QR" message="Đang tải trạng thái đặt vé và từng vé…" />
              : state.booking ? <><StaffBookingPanel booking={state.booking} selected={state.selected} locked={locked} busy={busy} throttled={throttled} onToggle={id => controller.toggleTicket(id)} onConfirm={() => controller.prepareConfirmation()} onRefresh={() => void controller.recover()} />{state.operation === "recovering" && <p role="status" className="mt-4 text-accent">Đang kiểm tra lại trạng thái vé…</p>}</>
              : <StatusFeedback title="Sẵn sàng kiểm tra đặt vé" message="Quét hoặc nhập mã QR để xem thông tin và trạng thái vé hiện tại. Sau khi tải lại trang, hãy quét lại mã để khôi phục thông tin." />}</div>
          </div>}
        {state.booking && ["confirming", "submitting"].includes(state.operation) && <StaffConfirmation booking={state.booking} selected={state.selected} submitting={state.operation === "submitting"} onCancel={() => controller.cancelConfirmation()} onConfirm={() => void controller.confirmCheckIn()} />}
      </>}
    </main>
  </div>;
}
