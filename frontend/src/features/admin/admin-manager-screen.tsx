"use client";

import { useCallback, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { clearFieldValidation, localizeInvalidField } from "@/components/ui/native-validation";
import { useAdmin } from "@/features/admin/admin-shell";
import { staffDate, staffEffectiveAtUtc } from "@/features/admin/admin-staff-service";
import { addManagerAssignment, getManagerAccounts, getManagerAssignments, getManagerCinemaOptions, setManagerAssignmentStatus, type ManagerAccount, type ManagerAssignment } from "@/features/manager/manager-api";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { OperationsCard, OperationsEmpty, OperationsFrame, OperationsState, OP_INPUT, CommandFeedback, useOperationsCommand } from "@/features/manager/operations-ui";

export function AdminManagerScreen() {
  const { accessToken } = useAdmin(); const [selected, setSelected] = useState("");
  const load = useCallback((signal: AbortSignal) => getManagerAccounts(accessToken, signal), [accessToken]); const result = useMovieRequest(load);
  return <OperationsFrame title="Phân công Quản lý">{result.loading || result.error ? <OperationsState {...result} /> : !result.data?.length ? <OperationsEmpty message="Chưa có tài khoản Quản lý." /> : <>
    <label className="block max-w-2xl">Tài khoản Quản lý<select aria-label="Tài khoản Quản lý" className={OP_INPUT} value={selected} onChange={e => setSelected(e.target.value)}><option value="">Chọn tài khoản</option>{result.data.map(m => <option key={m.id} value={m.id}>{m.fullName} · {m.email} · {m.id}</option>)}</select></label>
    {result.data.find(m => m.id === selected) ? <ManagerAssignments key={selected} manager={result.data.find(m => m.id === selected)!} /> : <div className="grid gap-4 lg:grid-cols-2">{result.data.map(m => <OperationsCard key={m.id}><h2 className="text-xl font-semibold">{m.fullName}</h2><p>{m.email}</p><p>{m.phone} · Mã: {m.id}</p><StatusBadge tone={m.status === "ACTIVE" ? "success" : "error"}>{m.status === "ACTIVE" ? "Tài khoản hoạt động" : "Tài khoản bị khóa"}</StatusBadge><div><Button variant="secondary" onClick={() => setSelected(m.id)}>Xem phân công {m.fullName}</Button></div></OperationsCard>)}</div>}
  </>}</OperationsFrame>;
}
function ManagerAssignments({ manager }: { manager: ManagerAccount }) {
  const { accessToken, reportError } = useAdmin(); const command = useOperationsCommand(reportError);
  const [dialog, setDialog] = useState<"create" | ManagerAssignment>(); const [cinema, setCinema] = useState(""), [local, setLocal] = useState(""); const [validation, setValidation] = useState<string>();
  const load = useCallback(async (signal: AbortSignal) => { const [assignments, cinemas] = await Promise.all([getManagerAssignments(accessToken, manager.id, signal), getManagerCinemaOptions(accessToken, signal)]); return { assignments, cinemas, checkedAt: Date.now() }; }, [accessToken, manager.id]); const result = useMovieRequest(load);
  async function read() { await getManagerAssignments(accessToken, manager.id); result.retry(); }
  function submit(e: FormEvent) { e.preventDefault(); const effectiveAt = staffEffectiveAtUtc(local); if (!effectiveAt || !cinema) { setValidation("Chọn rạp và ngày giờ hợp lệ (GMT+7)."); return; } setValidation(undefined); void command.run(() => addManagerAssignment(accessToken, manager.id, cinema, effectiveAt), () => { setDialog(undefined); result.retry(); }); }
  return <div className="space-y-5"><OperationsCard><h2 className="text-2xl font-semibold">{manager.fullName}</h2><p>{manager.email} · {manager.phone}</p><StatusBadge>{manager.status === "ACTIVE" ? "Tài khoản hoạt động" : "Tài khoản bị khóa"}</StatusBadge>{manager.status === "BLOCKED" && <p className="text-muted">Phân công không tự mở khóa tài khoản.</p>}</OperationsCard>
    <CommandFeedback command={command} read={read} />
    {result.loading || result.error ? <OperationsState {...result} /> : result.data && <><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-2xl font-semibold">Lịch sử phân công</h2><Button disabled={command.blocked} onClick={() => { setValidation(undefined); setCinema(""); setLocal(""); setDialog("create"); }}>Thêm phân công rạp</Button></div>
      {!result.data.assignments.length ? <OperationsEmpty message="Chưa có phân công rạp." /> : result.data.assignments.map(a => <OperationsCard key={a.id}><h3 className="text-xl font-semibold">{a.cinemaName}</h3><StatusBadge tone={a.status === "ACTIVE" ? "success" : "neutral"}>{a.status === "INACTIVE" ? "Đã ngừng phân công" : Date.parse(a.effectiveAt) > result.data!.checkedAt ? "Sẽ có hiệu lực" : "Phân công đang hiệu lực"}</StatusBadge><p>Bắt đầu: {staffDate(a.effectiveAt)}</p><p className="text-muted">Mốc bắt đầu cố định · Mã phân công {a.id}</p><Button variant="secondary" disabled={command.blocked} onClick={() => setDialog(a)}>{a.status === "ACTIVE" ? "Ngừng phân công" : "Khôi phục phân công"}</Button></OperationsCard>)}
    </>}
    {dialog && <Dialog title={dialog === "create" ? "Thêm phân công rạp" : dialog.status === "ACTIVE" ? "Ngừng phân công" : "Khôi phục phân công"} busy={command.busy} onClose={() => setDialog(undefined)}>
      {dialog === "create" ? <form onSubmit={submit} onInvalidCapture={localizeInvalidField} onChangeCapture={clearFieldValidation} onInputCapture={clearFieldValidation} className="space-y-5 text-base"><fieldset disabled={command.blocked} className="space-y-5"><label className="block">Rạp chiếu phim<select aria-label="Rạp chiếu phim" autoFocus required className={OP_INPUT} value={cinema} onChange={e => setCinema(e.target.value)}><option value="">Chọn rạp</option>{result.data?.cinemas.map(c => <option key={c.id} value={c.id} disabled={result.data?.assignments.some(a => a.cinemaId === c.id && a.status === "ACTIVE")}>{c.name}</option>)}</select></label><label className="block">Bắt đầu phân công (GMT+7)<input required type="datetime-local" className={OP_INPUT} value={local} onChange={e => setLocal(e.target.value)} /></label><p className="text-muted">Phân công trong tương lai chỉ có hiệu lực từ mốc này. Không thể sửa mốc sau khi lưu.</p><Button type="submit">Xác nhận phân công</Button></fieldset>{validation && <p role="alert" className="text-error">{validation}</p>}</form> : <div className="space-y-5"><p>{dialog.status === "ACTIVE" ? "Ngừng quyền quản lý" : "Khôi phục phân công"} tại {dialog.cinemaName} cho {manager.fullName}?</p><p>Giữ nguyên lịch sử và mốc bắt đầu {staffDate(dialog.effectiveAt)}.</p><Button disabled={command.blocked} onClick={() => void command.run(() => setManagerAssignmentStatus(accessToken, dialog, dialog.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"), () => { setDialog(undefined); result.retry(); })}>Xác nhận thay đổi</Button></div>}
      <CommandFeedback command={command} read={async () => { await read(); setDialog(undefined); }} />
    </Dialog>}
  </div>;
}
