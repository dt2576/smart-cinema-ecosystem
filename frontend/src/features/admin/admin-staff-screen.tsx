"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatusFeedback } from "@/components/ui/status-feedback";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin } from "@/features/admin/admin-shell";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { useAdminStaffCommand } from "@/features/admin/use-admin-staff-command";
import { AdminStaffApiError, getAdminStaff, getAdminStaffList, getAdminStaffAssignments, getStaffCinemaOptions, createAdminStaff, reissueAdminStaffInvitation, setAdminStaffStatus, addAdminStaffAssignment, setAdminStaffAssignmentStatus, isStaffId } from "@/features/admin/admin-staff-api";
import { canActivateStaff, canReissueStaff, staffDate, staffEffectiveAtUtc, STAFF_DELIVERY_LABELS, validateStaffContent } from "@/features/admin/admin-staff-service";
import type { StaffAccount, StaffAssignment, StaffContent } from "@/features/admin/admin-staff.types";
import type { StaffReviewHint } from "@/features/admin/admin-staff-review";

const LINK = "inline-flex min-h-control items-center text-accent underline underline-offset-4";
const DESTRUCTIVE = "!bg-error !text-canvas hover:!bg-error/90";

function AccountBadge({ account }: { account: StaffAccount }) { return <StatusBadge tone={account.status === "ACTIVE" ? "success" : "error"}>{account.status === "ACTIVE" ? "Đang hoạt động" : "Đã khóa"}</StatusBadge>; }
function Loading() { return <div role="status" className="space-y-4"><p>Đang tải thông tin nhân viên…</p><Skeleton className="h-24" /><Skeleton className="h-24" /></div>; }
function ReadError({ error, retry }: { error: Error; retry: () => void }) {
  const { reportError } = useAdmin();
  return <StatusFeedback title="Không thể tải thông tin" message={error instanceof AdminStaffApiError ? error.message : "Chưa thể kết nối máy chủ. Vui lòng thử lại."} tone="error" role="alert" actions={<Button onClick={() => { reportError(error); retry(); }}>Thử lại</Button>} />;
}
function CommandError({ command }: { command: ReturnType<typeof useAdminStaffCommand> }) {
  return command.error && <p role="alert" className="text-body-sm text-error">{command.error.message}{command.wait > 0 && ` Có thể thử lại sau ${command.wait} giây.`}</p>;
}
function Review({ hint, currentId, checked, canContinue, check, acknowledge }: { hint: StaffReviewHint; currentId?: string; checked: boolean; canContinue: boolean; check: () => void; acknowledge: () => void }) {
  const foreign = hint.staffId && hint.staffId !== currentId;
  return <SurfaceCard role="alert" className="space-y-4 border-accent/50">
    <h2 className="text-heading-md font-semibold">Cần kiểm tra lại trạng thái</h2>
    <p className="text-body-sm text-muted">{hint.staffId ? "Thao tác trước có thể đã được ghi nhận. Đọc lại tài khoản và phân công trước khi thực hiện thao tác mới." : "Chưa thể xác nhận tài khoản đã được tạo hay chưa. Kiểm tra các trang danh sách trước khi tạo lại; không có tra cứu trực tiếp theo email."}</p>
    <p className="text-body-sm text-muted">Đọc lại dữ liệu không khẳng định thao tác trước đã thất bại.</p>
    {foreign ? <Link className={LINK} href={`/admin/staff/${hint.staffId}`}>Kiểm tra nhân viên #{hint.staffId}</Link> : <div className="flex flex-wrap gap-3"><Button onClick={check} variant="secondary">Kiểm tra lại trạng thái</Button><Button disabled={!checked || !canContinue} onClick={acknowledge}>Đã kiểm tra, tiếp tục</Button></div>}
  </SurfaceCard>;
}
function Info({ label, children }: { label: string; children: ReactNode }) { return <div className="min-w-0 rounded-control bg-panel-high p-4"><dt className="mb-2 text-xs text-muted">{label}</dt><dd className="break-words font-semibold [overflow-wrap:anywhere]">{children}</dd></div>; }

export function AdminStaffList({ page }: { page: number }) {
  const { accessToken } = useAdmin();
  return <StaffList key={`${accessToken}:${page}`} page={page} />;
}
function StaffList({ page }: { page: number }) {
  const { accessToken } = useAdmin();
  const load = useCallback((signal: AbortSignal) => getAdminStaffList(accessToken, page, 20, signal), [accessToken, page]);
  const result = useMovieRequest(load);
  const command = useAdminStaffCommand();
  const [create, setCreate] = useState(false), [saved, setSaved] = useState<StaffAccount>();
  const [checked, setChecked] = useState(false);
  const refresh = () => { setChecked(false); result.retry(); };
  return <section className="min-w-0 space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-heading-lg font-semibold">Quản lý nhân viên</h1><p className="mt-2 text-body-sm text-muted">Tài khoản, lời mời và phân công rạp.</p></div><Button disabled={command.blocked} onClick={() => setCreate(true)}>+ Tạo nhân viên</Button></div>
    {command.review && <Review hint={command.review} checked={checked} canContinue={!result.loading && !!result.data && !result.error} check={() => { setChecked(true); result.retry(); }} acknowledge={command.acknowledge} />}
    {saved && <StatusFeedback role="status" compact tone="success" message={`Đã tạo tài khoản #${saved.id} ở trạng thái Đã khóa. Trạng thái gửi thư: ${STAFF_DELIVERY_LABELS[saved.deliveryStatus]}.`} />}
    {saved && <Link className={LINK} href={`/admin/staff/${saved.id}`}>Xem nhân viên vừa tạo</Link>}
    <CommandError command={command} />
    {result.loading ? <Loading /> : result.error ? <ReadError error={result.error} retry={refresh} /> : <>
      {!result.data?.length ? <StatusFeedback title="Chưa có nhân viên trên trang này" message="Tạo tài khoản nhân viên hoặc quay về trang trước." /> : <>
        <SurfaceCard padding="none" className="hidden overflow-hidden lg:block"><div className="overflow-x-auto" tabIndex={0} aria-label="Bảng danh sách nhân viên, có thể cuộn ngang"><table className="w-full text-left text-body-sm"><caption className="p-5 text-left font-heading font-semibold">Danh sách tài khoản · {result.data.length} nhân viên trên trang</caption><thead className="bg-panel-high text-muted"><tr>{["Nhân viên", "Trạng thái", "Mật khẩu", "Gửi thư mời", "Thao tác"].map(h => <th key={h} scope="col" className="px-5 py-4">{h}</th>)}</tr></thead><tbody>{result.data.map(a => <tr key={a.id} className="border-t border-outline/30"><td className="px-5 py-4"><span className="block break-words font-semibold [overflow-wrap:anywhere]">{a.fullName}</span><span className="block text-xs text-muted">#{a.id}</span><span className="mt-1 block break-all text-muted">{a.email}</span></td><td className="px-5 py-4"><AccountBadge account={a} /></td><td className="px-5 py-4">{a.passwordSetupCompleted ? "Đã thiết lập" : "Chưa thiết lập"}</td><td className="px-5 py-4">{STAFF_DELIVERY_LABELS[a.deliveryStatus]}</td><td className="px-5 py-4"><Link className={LINK} href={`/admin/staff/${a.id}`}>Xem chi tiết</Link></td></tr>)}</tbody></table></div></SurfaceCard>
        <div className="grid gap-4 lg:hidden">{result.data.map(a => <SurfaceCard key={a.id} className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="min-w-0 break-words font-semibold [overflow-wrap:anywhere]">{a.fullName}</h2><AccountBadge account={a} /></div><p className="text-xs text-muted">Mã nhân viên: {a.id}</p><p className="break-all text-body-sm">{a.email}</p><p className="text-body-sm">{a.passwordSetupCompleted ? "Đã thiết lập mật khẩu" : "Chưa thiết lập mật khẩu"}</p><p className="text-body-sm text-muted">{STAFF_DELIVERY_LABELS[a.deliveryStatus]}</p><Link className={LINK} href={`/admin/staff/${a.id}`}>Xem chi tiết</Link></SurfaceCard>)}</div>
      </>}
      <nav aria-label="Phân trang nhân viên" className="flex flex-wrap items-center justify-between gap-4"><span className="text-body-sm text-muted">Trang {page + 1}</span><div className="flex gap-3">{page > 0 && <Link className={LINK} href={`/admin/staff?page=${page - 1}`}>Trang trước</Link>}{result.data?.length === 20 && page < 2147483647 && <Link className={LINK} href={`/admin/staff?page=${page + 1}`}>Trang tiếp</Link>}<Button variant="secondary" onClick={refresh}>Tải lại danh sách</Button></div></nav>
    </>}
    {create && <CreateStaff command={command} onClose={() => setCreate(false)} onSaved={a => { setSaved(a); setCreate(false); refresh(); }} />}
  </section>;
}
function CreateStaff({ command, onClose, onSaved }: { command: ReturnType<typeof useAdminStaffCommand>; onClose: () => void; onSaved: (a: StaffAccount) => void }) {
  const { accessToken } = useAdmin();
  const [value, setValue] = useState<StaffContent>({ fullName: "", email: "", phone: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof StaffContent, string>>>({});
  function submit(e: FormEvent) { e.preventDefault(); const next = validateStaffContent(value); setErrors(next); if (Object.keys(next).length) { document.getElementById(`staff-${Object.keys(next)[0]}`)?.focus(); return; } void command.run(() => createAdminStaff(accessToken, value), onSaved); }
  return <Dialog title="Tạo tài khoản nhân viên" busy={command.busy} onClose={onClose}><p className="mb-5 text-body-sm text-muted">Tài khoản mới ở trạng thái Đã khóa. Nhân viên tự thiết lập mật khẩu qua thư mời, sau đó Admin mới có thể kích hoạt.</p>
    <form noValidate onSubmit={submit} className="space-y-5"><fieldset disabled={command.blocked} className="space-y-5">{([['fullName', 'Họ và tên', 'text', 150], ['email', 'Email', 'email', 254], ['phone', 'Số điện thoại', 'tel', 30]] as const).map(([key, label, type, maxLength]) => <FormField key={key} inputId={`staff-${key}`} label={`${label} *`} error={errors[key]} hint={key === "phone" ? "Ví dụ: 0912 345 678 hoặc +84912345678." : undefined}><input id={`staff-${key}`} name={key} className="form-input" type={type} required maxLength={maxLength} value={value[key]} autoComplete={key === "fullName" ? "name" : key === "phone" ? "tel" : "email"} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `staff-${key}-error` : key === "phone" ? "staff-phone-help" : undefined} onChange={e => { setValue({ ...value, [key]: e.target.value }); setErrors({ ...errors, [key]: undefined }); }} /></FormField>)}</fieldset>
      <CommandError command={command} />{command.review && <p role="alert" className="text-body-sm text-muted">Đóng hộp thoại và kiểm tra lại danh sách trước khi tiếp tục.</p>}
      <div className="flex flex-wrap justify-end gap-3"><Button variant="secondary" disabled={command.busy} onClick={onClose}>Hủy</Button><Button type="submit" disabled={command.blocked}>{command.busy ? "Đang tạo…" : "Tạo nhân viên"}</Button></div>
    </form></Dialog>;
}

type DetailDialog = { kind: "reissue" | "activate" | "block" } | { kind: "add" } | { kind: "deactivate" | "reactivate"; assignment: StaffAssignment };
export function AdminStaffDetail({ staffId }: { staffId: string }) {
  const { accessToken } = useAdmin();
  return isStaffId(staffId) ? <StaffDetail key={`${accessToken}:${staffId}`} staffId={staffId} /> : <StatusFeedback title="Mã nhân viên không hợp lệ" message="Quay về danh sách và chọn nhân viên." tone="error" actions={<Link className={LINK} href="/admin/staff">Danh sách nhân viên</Link>} />;
}
function StaffDetail({ staffId }: { staffId: string }) {
  const { accessToken } = useAdmin();
  const load = useCallback(async (signal: AbortSignal) => { const [account, assignments] = await Promise.all([getAdminStaff(accessToken, staffId, signal), getAdminStaffAssignments(accessToken, staffId, signal)]); return { account, assignments, receivedAt: Date.now() }; }, [accessToken, staffId]);
  const result = useMovieRequest(load), command = useAdminStaffCommand(staffId);
  const [dialog, setDialog] = useState<DetailDialog>(), [saved, setSaved] = useState("");
  const [checked, setChecked] = useState(false);
  const refresh = () => { setChecked(false); result.retry(); };
  const success = (message: string) => { setDialog(undefined); setSaved(message); refresh(); };
  return <section className="min-w-0 space-y-6"><Link href="/admin/staff" className={LINK}>← Danh sách nhân viên</Link>
    {command.review && <Review hint={command.review} currentId={staffId} checked={checked} canContinue={!result.loading && !!result.data && !result.error} check={() => { setChecked(true); result.retry(); }} acknowledge={command.acknowledge} />}
    {saved && <StatusFeedback message={saved} tone="success" role="status" compact />}
    <CommandError command={command} />
    {result.loading ? <Loading /> : result.error ? <ReadError error={result.error} retry={refresh} /> : result.data && <>
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h1 className="break-words text-heading-lg font-semibold">{result.data.account.fullName}</h1><p className="mt-2 text-body-sm text-muted">Nhân viên #{staffId}</p><div className="mt-3"><AccountBadge account={result.data.account} /></div></div><div className="flex flex-wrap gap-3"><Button variant="secondary" disabled={command.blocked || !canReissueStaff(result.data.account)} onClick={() => setDialog({ kind: "reissue" })}>Cấp lại lời mời</Button><Button disabled={command.blocked || !canActivateStaff(result.data.account)} onClick={() => setDialog({ kind: "activate" })}>Kích hoạt tài khoản</Button><Button className={DESTRUCTIVE} disabled={command.blocked || result.data.account.status !== "ACTIVE"} onClick={() => setDialog({ kind: "block" })}>Khóa tài khoản</Button></div></div>
      <div className="grid gap-5 xl:grid-cols-2"><SurfaceCard><h2 className="mb-5 text-heading-md font-semibold">Thông tin tài khoản</h2><dl className="grid gap-3 sm:grid-cols-2"><Info label="Mã nhân viên">{staffId}</Info><Info label="Họ và tên">{result.data.account.fullName}</Info><Info label="Email">{result.data.account.email}</Info><Info label="Số điện thoại">{result.data.account.phone}</Info><Info label="Trạng thái"><AccountBadge account={result.data.account} /></Info><Info label="Thiết lập mật khẩu">{result.data.account.passwordSetupCompleted ? "Đã thiết lập" : "Chưa thiết lập"}</Info></dl></SurfaceCard>
        <SurfaceCard><h2 className="mb-5 text-heading-md font-semibold">Thư mời thiết lập mật khẩu</h2><dl className="grid gap-3 sm:grid-cols-2"><Info label="Trạng thái gửi">{STAFF_DELIVERY_LABELS[result.data.account.deliveryStatus]}</Info><Info label="Số lần thử gửi thư">{result.data.account.deliveryAttempts}</Info><Info label="Thời hạn lời mời">{staffDate(result.data.account.invitationExpiresAt)}</Info></dl><p className="mt-4 text-body-sm text-muted">Máy chủ thư chấp nhận không đồng nghĩa thư đã đến hộp thư hoặc nhân viên đã đặt mật khẩu.</p>{!result.data.account.passwordSetupCompleted && <p className="mt-3 text-body-sm text-muted">Chỉ kích hoạt tài khoản sau khi nhân viên hoàn tất thiết lập mật khẩu.</p>}</SurfaceCard></div>
      <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-heading-md font-semibold">Phân công rạp chiếu</h2><Button disabled={command.blocked} onClick={() => setDialog({ kind: "add" })}>+ Thêm phân công</Button></div><p className="text-body-sm text-muted">Ngừng hoặc kích hoạt lại giữ nguyên thời điểm hiệu lực và lịch sử. Quyền thao tác được máy chủ kiểm tra theo tài khoản và phân công.</p>
      {!result.data.assignments.length ? <StatusFeedback title="Chưa có phân công rạp" message="Thêm rạp và thời điểm hiệu lực cho nhân viên." /> : <div className="grid gap-4">{result.data.assignments.map(a => {
        const conflict = result.data!.assignments.some(other => other.id !== a.id && other.assignmentType === "STAFF" && other.status === "ACTIVE" && other.cinemaId === a.cinemaId);
        return <SurfaceCard key={a.id} className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h3 className="break-words text-lg font-semibold">{a.cinemaName}</h3><p className="mt-1 break-all text-xs text-muted">Mã rạp {a.cinemaId} · Phân công {a.id}</p></div><div className="flex flex-wrap gap-2"><StatusBadge tone={a.status === "ACTIVE" ? "success" : "neutral"}>{a.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động"}</StatusBadge>{a.status === "ACTIVE" && Date.parse(a.effectiveAt) > result.data!.receivedAt && <StatusBadge>Hiệu lực từ ngày sắp tới</StatusBadge>}</div></div><p className="text-body-sm text-muted">Thời điểm hiệu lực gốc: {staffDate(a.effectiveAt)}</p>
          {a.assignmentType !== "STAFF" ? <p className="text-body-sm text-muted">Phân công này chỉ được xem trong trang quản lý nhân viên.</p> : <div className="flex flex-wrap items-center justify-end gap-3">{conflict && a.status === "INACTIVE" && <p className="text-body-sm text-muted">Đã có phân công đang hoạt động tại rạp này.</p>}<Button variant="secondary" disabled={command.blocked || a.status === "INACTIVE" && conflict} className={a.status === "ACTIVE" ? DESTRUCTIVE : ""} onClick={() => setDialog({ kind: a.status === "ACTIVE" ? "deactivate" : "reactivate", assignment: a })}>{a.status === "ACTIVE" ? "Ngừng phân công" : "Kích hoạt lại phân công"}</Button></div>}
        </SurfaceCard>;
      })}</div>}<Button variant="secondary" disabled={command.busy} onClick={refresh}>Tải lại thông tin</Button>
      {dialog && (dialog.kind === "add" ? <AddAssignment staffId={staffId} assignments={result.data.assignments} command={command} onClose={() => setDialog(undefined)} onSaved={() => success("Đã tạo phân công rạp.")} /> : <ConfirmStaffAction dialog={dialog} account={result.data.account} command={command} onClose={() => setDialog(undefined)} onSaved={success} />)}
    </>}
  </section>;
}
function ConfirmStaffAction({ dialog, account, command, onClose, onSaved }: { dialog: Exclude<DetailDialog, { kind: "add" }>; account: StaffAccount; command: ReturnType<typeof useAdminStaffCommand>; onClose: () => void; onSaved: (message: string) => void }) {
  const { accessToken } = useAdmin();
  const assignment = "assignment" in dialog ? dialog.assignment : undefined;
  const labels = { reissue: "Cấp lại lời mời", activate: "Kích hoạt tài khoản", block: "Khóa tài khoản", deactivate: "Ngừng phân công", reactivate: "Kích hoạt lại phân công" };
  const title = labels[dialog.kind];
  const allowed = dialog.kind === "reissue" ? canReissueStaff(account) : dialog.kind === "activate" ? canActivateStaff(account) : dialog.kind === "block" ? account.status === "ACTIVE" : assignment?.assignmentType === "STAFF";
  function submit(e: FormEvent) { e.preventDefault(); if (!allowed) return;
    void command.run(async () => {
      if (dialog.kind === "reissue") return reissueAdminStaffInvitation(accessToken, account.id);
      if (dialog.kind === "activate" || dialog.kind === "block") return setAdminStaffStatus(accessToken, account.id, dialog.kind === "activate" ? "ACTIVE" : "BLOCKED");
      return setAdminStaffAssignmentStatus(accessToken, account.id, assignment!, dialog.kind === "deactivate" ? "INACTIVE" : "ACTIVE");
    }, () => onSaved(dialog.kind === "reissue" ? "Đã phát hành lời mời mới. Kiểm tra trạng thái gửi thư trong thông tin tài khoản." : `Đã ${title.toLowerCase()}.`));
  }
  return <Dialog title={title} onClose={onClose} busy={command.busy}><form onSubmit={submit} className="space-y-5"><p className="break-words font-semibold">{account.fullName} · #{account.id}</p>
    <p className="text-body-sm text-muted">{dialog.kind === "reissue" ? "Liên kết cũ sẽ vô hiệu. Lời mời mới có hiệu lực 24 giờ kể từ lúc phát hành; không khẳng định thư đã đến hộp thư." : dialog.kind === "activate" ? "Nhân viên đã thiết lập mật khẩu. Kích hoạt cho phép đăng nhập; quyền làm việc phụ thuộc vào phân công hợp lệ." : dialog.kind === "block" ? "Nhân viên bị giới hạn truy cập và các lời mời chưa sử dụng bị thu hồi. Lịch sử phân công được giữ nguyên." : "Chỉ thay đổi trạng thái phân công tại rạp này; giữ nguyên tài khoản và lịch sử."}</p>
    {assignment && <div className="space-y-2 rounded-control bg-panel-high p-4"><p className="break-words font-semibold">{assignment.cinemaName}</p><p className="break-all text-xs text-muted">Phân công #{assignment.id}</p><p className="text-body-sm">Thời điểm hiệu lực gốc: {staffDate(assignment.effectiveAt)}</p></div>}
    <CommandError command={command} />{command.review && <p role="alert" className="text-body-sm text-muted">Đóng hộp thoại và đọc lại thông tin trước khi thực hiện thao tác mới.</p>}<div className="flex flex-wrap justify-end gap-3"><Button variant="secondary" disabled={command.busy} onClick={onClose}>Hủy</Button><Button type="submit" disabled={command.blocked || !allowed} className={dialog.kind === "block" || dialog.kind === "deactivate" ? DESTRUCTIVE : ""}>{command.busy ? "Đang xử lý…" : `Xác nhận ${title.toLowerCase()}`}</Button></div>
  </form></Dialog>;
}
function AddAssignment({ staffId, assignments, command, onClose, onSaved }: { staffId: string; assignments: StaffAssignment[]; command: ReturnType<typeof useAdminStaffCommand>; onClose: () => void; onSaved: () => void }) {
  const { accessToken } = useAdmin();
  const load = useCallback((signal: AbortSignal) => getStaffCinemaOptions(accessToken, signal), [accessToken]);
  const result = useMovieRequest(load);
  const [cinemaId, setCinemaId] = useState(""), [effective, setEffective] = useState(""), [errors, setErrors] = useState<{ cinema?: string; effective?: string }>({});
  function submit(e: FormEvent) { e.preventDefault(); const utc = staffEffectiveAtUtc(effective); const duplicate = assignments.some(a => a.assignmentType === "STAFF" && a.status === "ACTIVE" && a.cinemaId === cinemaId);
    const next = { cinema: !isStaffId(cinemaId) || !result.data?.some(c => c.id === cinemaId) ? "Chọn một rạp trong danh sách." : duplicate ? "Đã có phân công đang hoạt động tại rạp này." : undefined, effective: utc ? undefined : "Nhập thời điểm có hiệu lực hợp lệ." }; setErrors(next);
    if (next.cinema || next.effective) { document.getElementById(next.cinema ? "assignment-cinema" : "assignment-effective")?.focus(); return; }
    void command.run(() => addAdminStaffAssignment(accessToken, staffId, { cinemaId, effectiveAt: utc! }), onSaved);
  }
  return <Dialog title="Thêm phân công rạp" busy={command.busy} onClose={onClose}>{result.loading ? <Loading /> : result.error ? <ReadError error={result.error} retry={result.retry} /> : !result.data?.length ? <StatusFeedback message="Chưa có rạp trong danh mục. Vui lòng kiểm tra lại sau." /> : <form noValidate onSubmit={submit} className="space-y-5"><fieldset disabled={command.blocked} className="space-y-5"><FormField inputId="assignment-cinema" label="Rạp chiếu phim *" error={errors.cinema}><select id="assignment-cinema" className="form-input" required value={cinemaId} aria-invalid={!!errors.cinema} aria-describedby={errors.cinema ? "assignment-cinema-error" : undefined} onChange={e => { setCinemaId(e.target.value); setErrors({ ...errors, cinema: undefined }); }}><option value="">Chọn rạp chiếu phim</option>{result.data.map(c => <option key={c.id} value={c.id} disabled={assignments.some(a => a.assignmentType === "STAFF" && a.status === "ACTIVE" && a.cinemaId === c.id)}>{c.name}{c.status === "ACTIVE" ? "" : c.status === "INACTIVE" ? " — Ngừng hoạt động" : " — Tạm đóng cửa"}</option>)}</select></FormField>
      <FormField inputId="assignment-effective" label="Thời điểm có hiệu lực *" error={errors.effective} hint="Giờ Việt Nam (GMT+7). Mốc thời gian gốc được giữ nguyên khi đổi trạng thái phân công."><input id="assignment-effective" className="form-input" type="datetime-local" required value={effective} aria-invalid={!!errors.effective} aria-describedby={errors.effective ? "assignment-effective-error" : "assignment-effective-help"} onChange={e => { setEffective(e.target.value); setErrors({ ...errors, effective: undefined }); }} /></FormField></fieldset>
      <CommandError command={command} />{command.review && <p role="alert" className="text-body-sm text-muted">Đóng hộp thoại và kiểm tra lại phân công trước khi tiếp tục.</p>}<div className="flex flex-wrap justify-end gap-3"><Button variant="secondary" disabled={command.busy} onClick={onClose}>Hủy</Button><Button type="submit" disabled={command.blocked}>{command.busy ? "Đang lưu…" : "Xác nhận phân công"}</Button></div>
    </form>}</Dialog>;
}
