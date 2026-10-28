"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AdminCinema } from "@/features/admin/admin-configuration.types";
import { staffDate, staffEffectiveAtUtc } from "@/features/admin/admin-staff-service";
import { useManager } from "@/features/manager/manager-shell";
import { addManagerStaffAssignment, setManagerStaffAssignmentStatus, type ManagerStaffAssignment, type ManagerStaffProfile } from "@/features/manager/manager-staff-api";
import { staffAssignmentConflict, staffAssignmentState, STAFF_ASSIGNMENT_LABELS } from "@/features/manager/manager-staff-service";
import type { useManagerStaffCommand } from "@/features/manager/use-manager-staff-command";
import { OP_INPUT } from "@/features/manager/operations-ui";

export type StaffDialog = { kind: "add" } | { kind: "status"; assignment: ManagerStaffAssignment };
type Props = { dialog: StaffDialog; cinema: AdminCinema; staff: ManagerStaffProfile; assignments: ManagerStaffAssignment[]; command: ReturnType<typeof useManagerStaffCommand>; onClose: () => void; onSaved: (assignment: ManagerStaffAssignment) => void };
export function ManagerStaffDialog(props: Props) {
  return props.dialog.kind === "add" ? <AssignStaff {...props} /> : <ConfirmAssignment {...props} assignment={props.dialog.assignment} />;
}
function CommandMessage({ command }: Pick<Props, "command">) {
  return <div aria-live="polite" className="space-y-3">{command.error && <p role="alert" className="text-error">{command.error}</p>}{command.review && <p role="alert">Đóng hộp thoại để kiểm tra dữ liệu đã lưu trước khi tiếp tục.</p>}</div>;
}
function AssignStaff({ cinema, staff, command, onClose, onSaved }: Props) {
  const { accessToken, cinemas } = useManager();
  const [destination, setDestination] = useState(""), [local, setLocal] = useState("");
  const [errors, setErrors] = useState<{ destination?: string; local?: string }>({});
  const options = cinemas.filter(c => c.id !== cinema.id);
  function submit(event: FormEvent) {
    event.preventDefault(); const effectiveAt = staffEffectiveAtUtc(local);
    const next = { destination: !options.some(c => c.id === destination) ? "Chọn rạp được phân công." : undefined, local: !effectiveAt || effectiveAt.startsWith("0000") ? "Nhập ngày giờ hợp lệ theo giờ Việt Nam." : undefined };
    setErrors(next);
    if (next.destination || next.local) { document.getElementById(next.destination ? "manager-staff-destination" : "manager-staff-effective")?.focus(); return; }
    void command.run({ kind: "add", cinemaId: cinema.id, staffId: staff.id, destinationCinemaId: destination }, () => addManagerStaffAssignment(accessToken, cinema.id, staff.id, destination, effectiveAt!), onSaved);
  }
  return <Dialog title="Phân công nhân viên" busy={command.busy} onClose={onClose} initialFocus="#manager-staff-destination">
    <div className="mb-5 space-y-2 break-words rounded-control bg-panel-high p-4 [overflow-wrap:anywhere]"><p className="font-semibold">{staff.fullName}</p><p>Mã nhân viên: {staff.id}</p><p>Rạp nguồn: {cinema.name}</p></div>
    <form noValidate className="space-y-5" onSubmit={submit}><fieldset disabled={command.blocked} className="min-w-0 space-y-5">
      <FormField inputId="manager-staff-destination" label="Rạp nhận phân công *" error={errors.destination}><select id="manager-staff-destination" className={OP_INPUT} required value={destination} aria-invalid={!!errors.destination} aria-describedby={errors.destination ? "manager-staff-destination-error" : undefined} onChange={e => { setDestination(e.target.value); setErrors({ ...errors, destination: undefined }); }}><option value="">Chọn rạp</option>{options.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></FormField>
      {!options.length && <p role="status">Chưa có rạp khác trong phạm vi phân công hiện hành.</p>}
      <FormField inputId="manager-staff-effective" label="Bắt đầu hiệu lực (GMT+7) *" error={errors.local}><input id="manager-staff-effective" className={OP_INPUT} type="datetime-local" min="0001-01-01T00:00" max="9999-12-31T23:59" required value={local} aria-invalid={!!errors.local} aria-describedby={errors.local ? "manager-staff-effective-error" : undefined} onChange={e => { setLocal(e.target.value); setErrors({ ...errors, local: undefined }); }} /></FormField>
    </fieldset><p className="text-muted">Bổ sung phân công tại rạp nhận; các phân công hiện có được giữ nguyên.</p>
      <CommandMessage command={command} /><div className="flex flex-wrap justify-end gap-3"><Button variant="secondary" disabled={command.busy} onClick={onClose}>Hủy</Button><Button type="submit" disabled={command.blocked || !options.length}>{command.busy ? "Đang lưu…" : "Xác nhận phân công"}</Button></div>
    </form>
  </Dialog>;
}
function ConfirmAssignment({ cinema, staff, assignments, assignment, command, onClose, onSaved }: Props & { assignment: ManagerStaffAssignment }) {
  const { accessToken } = useManager();
  const [openedAt] = useState(Date.now);
  const deactivate = assignment.status === "ACTIVE", title = deactivate ? "Ngừng phân công" : "Kích hoạt lại phân công";
  const valid = assignment.userId === staff.id && assignment.cinemaId === cinema.id && !staffAssignmentConflict(assignment, assignments);
  function submit(event: FormEvent) {
    event.preventDefault(); if (!valid) return;
    void command.run({ kind: "status", cinemaId: cinema.id, staffId: staff.id, assignmentId: assignment.id }, () => setManagerStaffAssignmentStatus(accessToken, cinema.id, staff.id, assignment, deactivate ? "INACTIVE" : "ACTIVE"), onSaved);
  }
  return <Dialog title={title} busy={command.busy} onClose={onClose} initialFocus="#manager-staff-cancel"><form onSubmit={submit} className="space-y-5">
    <dl className="space-y-3 break-words rounded-control bg-panel-high p-4 [overflow-wrap:anywhere]"><div><dt className="text-muted">Nhân viên</dt><dd className="font-semibold">{staff.fullName} · {staff.id}</dd></div><div><dt className="text-muted">Rạp phân công</dt><dd>{assignment.cinemaName}</dd></div><div><dt className="text-muted">Mã phân công</dt><dd>{assignment.id}</dd></div><div><dt className="text-muted">Trạng thái hiện tại</dt><dd><StatusBadge>{STAFF_ASSIGNMENT_LABELS[staffAssignmentState(assignment, openedAt)]}</StatusBadge></dd></div><div><dt className="text-muted">Hiệu lực từ</dt><dd>{staffDate(assignment.effectiveAt)}</dd></div></dl>
    <p>{deactivate ? "Chỉ ngừng phân công này tại rạp đang xem. Tài khoản và phân công tại các rạp khác được giữ nguyên." : "Kích hoạt lại phân công này, giữ nguyên thời điểm hiệu lực gốc. Phân công trong tương lai vẫn phải chờ đến thời điểm đó."}</p>
    <CommandMessage command={command} /><div className="flex flex-wrap justify-end gap-3"><Button id="manager-staff-cancel" variant="secondary" disabled={command.busy} onClick={onClose}>Hủy</Button><Button type="submit" className={deactivate ? "!bg-error !text-canvas hover:!bg-error/90" : ""} disabled={command.blocked || !valid}>{command.busy ? "Đang lưu…" : deactivate ? "Xác nhận ngừng phân công" : "Xác nhận kích hoạt lại"}</Button></div>
  </form></Dialog>;
}
