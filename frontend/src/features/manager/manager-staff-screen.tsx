"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { SurfaceCard } from "@/components/ui/surface-card";
import { staffDate } from "@/features/admin/admin-staff-service";
import { getManagerCinema, getManagerStaff, isOperationId } from "@/features/manager/manager-api";
import { useManager, isScopeError } from "@/features/manager/manager-shell";
import { getManagerStaffAssignments, getManagerStaffDetail, type ManagerStaffAssignment, type ManagerStaffProfile } from "@/features/manager/manager-staff-api";
import { filterStaffMemberships, managerStaffHref, staffAssignmentConflict, staffAssignmentState, STAFF_ASSIGNMENT_LABELS, type StaffAssignmentState } from "@/features/manager/manager-staff-service";
import { ManagerStaffDialog, type StaffDialog } from "@/features/manager/manager-staff-dialogs";
import { useManagerStaffCommand } from "@/features/manager/use-manager-staff-command";
import { OperationsCard, OperationsEmpty, OperationsFrame, OperationsState, OP_INPUT, OP_LINK } from "@/features/manager/operations-ui";
import { useMovieRequest } from "@/features/movie/use-movie-request";

function AccountBadge({ staff }: { staff: ManagerStaffProfile }) {
  return <StatusBadge tone={staff.status === "ACTIVE" ? "success" : "error"}>{staff.status === "ACTIVE" ? "Tài khoản hoạt động" : "Tài khoản bị khóa"}</StatusBadge>;
}
function AssignmentBadge({ assignment, receivedAt }: { assignment: ManagerStaffAssignment; receivedAt: number }) {
  const state = staffAssignmentState(assignment, receivedAt);
  return <StatusBadge tone={state === "current" ? "success" : "neutral"}>{STAFF_ASSIGNMENT_LABELS[state]}</StatusBadge>;
}
export function ManagerStaffScreen({ cinemaId }: { cinemaId?: string }) {
  const { accessToken, cinemas } = useManager();
  const router = useRouter(), selected = cinemaId ?? cinemas[0]?.id ?? "";
  return <OperationsFrame title="Nhân viên tại rạp">
    <label className="block max-w-xl font-semibold">Rạp chiếu phim<select aria-label="Rạp chiếu phim" className={OP_INPUT} value={selected} onChange={e => router.push(`/manager/cinemas/${e.target.value}/staff`)}>
      {!selected && <option value="">Chọn rạp</option>}{cinemas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select></label>
    {selected ? <StaffList key={`${accessToken}:${selected}`} cinemaId={selected} /> : <OperationsEmpty message="Chưa có rạp được phân công có hiệu lực." />}
  </OperationsFrame>;
}
function StaffList({ cinemaId }: { cinemaId: string }) {
  const { accessToken } = useManager();
  const load = useCallback(async (signal: AbortSignal) => {
    const [cinema, memberships, current] = await Promise.all([getManagerCinema(accessToken, cinemaId, signal), getManagerStaffAssignments(accessToken, cinemaId, signal), getManagerStaff(accessToken, cinemaId, signal)]);
    return { cinema, memberships, currentIds: new Set(current.map(s => s.assignmentId)), receivedAt: Date.now() };
  }, [accessToken, cinemaId]);
  const result = useMovieRequest(load), command = useManagerStaffCommand(() => {});
  const [query, setQuery] = useState(""), [state, setState] = useState<"all" | StaffAssignmentState>("all");
  const rows = result.data ? filterStaffMemberships(result.data.memberships, query, state, result.data.receivedAt, result.data.currentIds) : [];
  return <div className="space-y-5">
    {command.review && <OperationsCard><p>Cần kiểm tra thao tác phân công trước.</p><Link className={OP_LINK} href={managerStaffHref(command.review.cinemaId, command.review.staffId)}>Kiểm tra dữ liệu đã lưu</Link></OperationsCard>}
    {result.loading || result.error ? <OperationsState {...result} /> : result.data && <>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="min-w-0 break-words text-2xl font-semibold">{result.data.cinema.name}</h2><Button variant="secondary" onClick={result.retry}>Tải lại danh sách</Button></div>
      <SurfaceCard className="grid gap-4 sm:grid-cols-2"><label className="min-w-0 font-semibold">Tìm trong rạp<input type="search" className={OP_INPUT} value={query} onChange={e => setQuery(e.target.value)} placeholder="Tên, mã, email hoặc số điện thoại" /></label>
        <label className="min-w-0 font-semibold">Trạng thái phân công<select aria-label="Trạng thái phân công" className={OP_INPUT} value={state} onChange={e => setState(e.target.value as typeof state)}><option value="all">Tất cả phân công</option>{Object.entries(STAFF_ASSIGNMENT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></SurfaceCard>
      {!rows.length ? <OperationsEmpty message={result.data.memberships.length ? "Không có phân công phù hợp với bộ lọc." : "Chưa có nhân viên được phân công tại rạp này."} /> : <>
        <SurfaceCard padding="none" className="hidden overflow-hidden lg:block"><table className="w-full table-fixed text-left text-base"><caption className="p-5 text-left font-semibold">Danh sách phân công tại rạp</caption><thead className="bg-panel-high text-muted"><tr>{["Nhân viên", "Tài khoản", "Phân công", "Thao tác"].map(label => <th scope="col" key={label} className="p-4">{label}</th>)}</tr></thead><tbody>{rows.map(({ staff, assignment }) => <tr key={assignment.id} className="border-t border-outline/30 align-top">
          <td className="space-y-2 p-4 [overflow-wrap:anywhere]"><p className="font-semibold">{staff.fullName}</p><p className="text-muted">Mã nhân viên: {staff.id}</p><p>{staff.email}</p><p>{staff.phone}</p></td><td className="p-4"><AccountBadge staff={staff} /></td><td className="space-y-3 p-4 [overflow-wrap:anywhere]"><AssignmentBadge assignment={assignment} receivedAt={result.data!.receivedAt} /><p>Từ {staffDate(assignment.effectiveAt)}</p><p className="text-muted">Mã phân công: {assignment.id}</p></td><td className="p-4"><Link className={OP_LINK} href={managerStaffHref(cinemaId, staff.id)}>Xem chi tiết</Link></td>
        </tr>)}</tbody></table></SurfaceCard>
        <div className="grid gap-4 lg:hidden">{rows.map(({ staff, assignment }) => <OperationsCard key={assignment.id}><h3 className="text-xl font-semibold [overflow-wrap:anywhere]">{staff.fullName}</h3><p>Mã nhân viên: {staff.id}</p><p className="[overflow-wrap:anywhere]">{staff.email}</p><p>{staff.phone}</p><AccountBadge staff={staff} /><div><AssignmentBadge assignment={assignment} receivedAt={result.data!.receivedAt} /></div><p>Hiệu lực từ: {staffDate(assignment.effectiveAt)}</p><p className="text-muted">Mã phân công: {assignment.id}</p><Link className={OP_LINK} href={managerStaffHref(cinemaId, staff.id)}>Xem chi tiết</Link></OperationsCard>)}</div>
      </>}
      <p className="text-muted">Hiển thị {rows.length} phân công. Trạng thái theo lần tải gần nhất; giờ Việt Nam (GMT+7).</p>
    </>}
  </div>;
}

export function ManagerStaffDetailScreen({ cinemaId, staffId }: { cinemaId: string; staffId: string }) {
  const { accessToken } = useManager();
  if (!isOperationId(cinemaId) || !isOperationId(staffId)) return <OperationsFrame title="Chi tiết nhân viên" back={{ href: "/manager/staff", label: "Danh sách nhân viên" }}><OperationsEmpty message="Mã rạp hoặc nhân viên không hợp lệ. Chọn lại từ danh sách." /></OperationsFrame>;
  return <StaffDetail key={`${accessToken}:${cinemaId}:${staffId}`} cinemaId={cinemaId} staffId={staffId} />;
}
function StaffDetail({ cinemaId, staffId }: { cinemaId: string; staffId: string }) {
  const { accessToken } = useManager();
  const load = useCallback(async (signal: AbortSignal) => {
    const [cinema, detail] = await Promise.all([getManagerCinema(accessToken, cinemaId, signal), getManagerStaffDetail(accessToken, cinemaId, staffId, signal)]);
    return { cinema, ...detail, receivedAt: Date.now() };
  }, [accessToken, cinemaId, staffId]);
  const result = useMovieRequest(load);
  const command = useManagerStaffCommand(cause => { if (isScopeError(cause)) result.retry(); });
  const [dialog, setDialog] = useState<StaffDialog>(), [saved, setSaved] = useState("");
  const [destination, setDestination] = useState<string>(), [reviewSummary, setReviewSummary] = useState<{ assignments: ManagerStaffAssignment[]; receivedAt: number }>();
  const foreignReview = command.review && (command.review.cinemaId !== cinemaId || command.review.staffId !== staffId);
  async function checkReview() {
    setDialog(undefined); setSaved(""); setReviewSummary(undefined);
    await command.check(async hint => {
      const source = await getManagerStaffDetail(accessToken, hint.cinemaId, hint.staffId);
      const rows = hint.kind === "add" ? (await getManagerStaffAssignments(accessToken, hint.destinationCinemaId)).filter(row => row.staff.id === hint.staffId).map(row => row.assignment) : source.assignments;
      setReviewSummary({ assignments: rows, receivedAt: Date.now() }); result.retry();
    });
  }
  function success(assignment: ManagerStaffAssignment) {
    setSaved(dialog?.kind === "add" ? "Đã tạo phân công rạp." : assignment.status === "INACTIVE" ? "Đã ngừng phân công." : "Đã kích hoạt lại phân công.");
    setDestination(dialog?.kind === "add" && assignment.cinemaId !== cinemaId ? assignment.cinemaId : undefined);
    setDialog(undefined); result.retry();
  }
  return <OperationsFrame title="Chi tiết nhân viên" back={{ href: `/manager/cinemas/${cinemaId}/staff`, label: "Danh sách nhân viên" }}>
    {command.error && <p role="alert" className="text-error">{command.error}</p>}
    {saved && <p role="status" className="text-success">{saved}</p>}
    {destination && <Link className={OP_LINK} href={managerStaffHref(destination, staffId)}>Xem phân công tại rạp vừa thêm</Link>}
    {command.review && <OperationsCard><h2 className="text-xl font-semibold">Cần kiểm tra lại phân công</h2><p>Thao tác trước có thể đã được lưu. Kiểm tra dữ liệu trước khi tiếp tục.</p>
      {foreignReview ? <Link className={OP_LINK} href={managerStaffHref(command.review.cinemaId, command.review.staffId)}>Kiểm tra nhân viên của thao tác trước</Link> : <>
        {command.wait > 0 && <p>Vui lòng chờ {command.wait} giây.</p>}
        <div className="flex flex-wrap gap-3"><Button variant="secondary" disabled={command.busy || command.wait > 0} onClick={() => void checkReview()}>Kiểm tra dữ liệu đã lưu</Button><Button disabled={!command.checked || command.busy} onClick={command.acknowledge}>Đã kiểm tra, tiếp tục</Button></div>
        {command.checked && <div role="status" className="space-y-2"><p>Đã đọc lại dữ liệu từ máy chủ. Kiểm tra phân công trước khi gửi thao tác mới.</p>{reviewSummary?.assignments.length ? reviewSummary.assignments.map(a => <p key={a.id} className="[overflow-wrap:anywhere]">{a.cinemaName} · Mã phân công {a.id} · {STAFF_ASSIGNMENT_LABELS[staffAssignmentState(a, reviewSummary.receivedAt)]} · {staffDate(a.effectiveAt)}</p>) : <p>Chưa thấy phân công của nhân viên tại rạp nhận. Kết quả thao tác trước vẫn chưa chắc chắn.</p>}</div>}
      </>}</OperationsCard>}
    {result.loading || result.error ? <OperationsState {...result} /> : result.data && <>
      <div className="flex flex-wrap items-center justify-between gap-4"><p className="min-w-0 break-words text-xl font-semibold">{result.data.cinema.name}</p><Button disabled={command.blocked} onClick={() => { setSaved(""); setDialog({ kind: "add" }); }}>Phân công nhân viên</Button></div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"><OperationsCard><h2 className="text-2xl font-semibold [overflow-wrap:anywhere]">{result.data.staff.fullName}</h2><p>Mã nhân viên: {staffId}</p><AccountBadge staff={result.data.staff} /><dl className="space-y-4"><div><dt className="text-muted">Email</dt><dd className="[overflow-wrap:anywhere]">{result.data.staff.email}</dd></div><div><dt className="text-muted">Số điện thoại</dt><dd>{result.data.staff.phone}</dd></div></dl></OperationsCard>
        <div className="min-w-0 space-y-4"><h2 className="text-2xl font-semibold">Lịch sử phân công tại rạp</h2>{result.data.assignments.map(assignment => {
          const conflict = staffAssignmentConflict(assignment, result.data!.assignments);
          return <OperationsCard key={assignment.id}><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="min-w-0 break-words text-xl font-semibold">{assignment.cinemaName}</h3><AssignmentBadge assignment={assignment} receivedAt={result.data!.receivedAt} /></div><p>Mã phân công: {assignment.id}</p><p>Hiệu lực từ: {staffDate(assignment.effectiveAt)}</p>{conflict && <p className="text-muted">Đã có phân công đang hoạt động tại rạp này.</p>}<Button variant="secondary" disabled={command.blocked || conflict} className={assignment.status === "ACTIVE" ? "border-error/60 text-error" : ""} onClick={() => { setSaved(""); setDialog({ kind: "status", assignment }); }}>{assignment.status === "ACTIVE" ? "Ngừng phân công" : "Kích hoạt lại phân công"}</Button></OperationsCard>;
        })}<p className="text-muted">Lịch sử chỉ thuộc rạp đang xem. Kích hoạt lại giữ nguyên thời điểm hiệu lực gốc.</p></div>
      </div><Button variant="secondary" disabled={command.busy} onClick={() => { setDialog(undefined); result.retry(); }}>Tải lại thông tin</Button>
      {dialog && <ManagerStaffDialog dialog={dialog} cinema={result.data.cinema} staff={result.data.staff} assignments={result.data.assignments} command={command} onClose={() => setDialog(undefined)} onSaved={success} />}
    </>}
  </OperationsFrame>;
}
