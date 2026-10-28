"use client";

import { useCallback, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { clearFieldValidation, localizeInvalidField } from "@/components/ui/native-validation";
import { displayLabel } from "@/lib/display-labels";
import { useManager } from "@/features/manager/manager-shell";
import { getManagerHall, getManagerSeat, getManagerSeats, initializeManagerSeats, updateManagerSeat } from "@/features/manager/manager-api";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { layoutGuestCapacity, type AdminHall, type AdminSeat, type SeatContent, type SeatType, type PhysicalStatus } from "@/features/admin/admin-configuration.types";
import { OperationsCard, OperationsFrame, OperationsState, OP_INPUT, CommandFeedback, useOperationsCommand } from "@/features/manager/operations-ui";

export function ManagerSeatManagement({ hallId }: { hallId: string }) {
  const { accessToken } = useManager();
  const load = useCallback(async (signal: AbortSignal) => { const [hall, seats] = await Promise.all([getManagerHall(accessToken, hallId, signal), getManagerSeats(accessToken, hallId, signal)]); return { hall, seats }; }, [accessToken, hallId]); const result = useMovieRequest(load);
  return <OperationsFrame title="Quản lý tình trạng ghế" back={{ href: result.data ? `/manager/cinemas/${result.data.hall.cinemaId}` : "/manager/cinemas", label: "Quản lý rạp" }}>{result.loading || result.error ? <OperationsState {...result} /> : result.data && <SeatWorkspace key={hallId + ":" + result.data.seats.map(s => `${s.id}:${s.physicalStatus}`).join(",")} {...result.data} refresh={result.retry} />}</OperationsFrame>;
}
function SeatFields({ value, change, frozen = false, existing }: { value: SeatContent; change: (v: SeatContent) => void; frozen?: boolean; existing?: AdminSeat }) {
  const types: SeatType[] = existing ? existing.guestCapacity === 2 ? ["COUPLE"] : ["STANDARD", "VIP"] : ["STANDARD", "VIP", "COUPLE"];
  return <div className="grid gap-4 sm:grid-cols-2"><label>Hàng ghế<input required maxLength={20} disabled={frozen} className={OP_INPUT} value={value.row} onChange={e => change({ ...value, row: e.target.value })} /></label><label>Số ghế<input required maxLength={20} disabled={frozen} className={OP_INPUT} value={value.number} onChange={e => change({ ...value, number: e.target.value })} /></label><label>Loại ghế<select aria-label="Loại ghế" disabled={frozen} className={OP_INPUT} value={value.type} onChange={e => change({ ...value, type: e.target.value as SeatType })}>{types.map(s => <option key={s} value={s}>{displayLabel(s)}</option>)}</select></label><label>Trạng thái ghế<select aria-label="Trạng thái ghế" className={OP_INPUT} value={value.physicalStatus} onChange={e => change({ ...value, physicalStatus: e.target.value as PhysicalStatus })}>{["ACTIVE", "MAINTENANCE", "INACTIVE"].map(s => <option key={s} value={s}>{displayLabel(s)}</option>)}</select></label></div>;
}
function SeatWorkspace({ hall, seats, refresh }: { hall: AdminHall; seats: AdminSeat[]; refresh: () => void }) {
  const [selected, setSelected] = useState<string>();
  const rows = [...new Set(seats.map(s => s.row))];
  return <><OperationsCard><h2 className="text-2xl font-semibold">{hall.name}</h2><p>{hall.capacity} khách · {seats.length} ghế · {displayLabel(hall.status)}</p><p className="text-muted">Ghế đôi là một ghế dành cho hai khách.</p></OperationsCard>{!seats.length ? <InitializeLayout hall={hall} refresh={refresh} /> : <>
    <div className="flex flex-wrap gap-4 text-base"><span>□ Ghế thường</span><span className="text-accent">◇ Ghế VIP</span><span className="text-error">♡ Ghế đôi</span><span>Hoạt động / Bảo trì / Ngừng sử dụng</span></div>
    <OperationsCard><p className="mb-6 border-b-4 border-accent/70 pb-3 text-center font-heading text-accent">Màn hình chiếu</p><div aria-label="Sơ đồ ghế vận hành" className="space-y-5">{rows.map(row => <div key={row}><h3 className="mb-2 font-semibold">Hàng {row}</h3><div className="flex flex-wrap gap-2">{seats.filter(s => s.row === row).map(s => <button key={s.id} type="button" aria-pressed={selected === s.id} aria-label={`Ghế ${s.row}${s.number} · ${displayLabel(s.type)} · ${displayLabel(s.physicalStatus)}`} onClick={() => setSelected(s.id)} className={`min-h-14 min-w-14 max-w-full break-all rounded-control border-2 p-2 text-base aria-pressed:ring-2 aria-pressed:ring-accent ${s.type === "COUPLE" ? "min-w-24 text-error" : s.type === "VIP" ? "text-accent" : "text-foreground"} ${s.physicalStatus === "ACTIVE" ? "border-outline bg-panel-high" : "border-error/70 bg-error/10"}`}><span className="block font-semibold">{s.row}{s.number}</span><span className="block text-xs">{displayLabel(s.physicalStatus)}</span></button>)}</div></div>)}</div></OperationsCard>
    {selected && <SeatDetail key={selected} seatId={selected} hallId={hall.id} onClose={() => setSelected(undefined)} refresh={refresh} />}
  </>}</>;
}
function SeatDetail({ seatId, hallId, onClose, refresh }: { seatId: string; hallId: string; onClose: () => void; refresh: () => void }) {
  const { accessToken } = useManager(); const load = useCallback((signal: AbortSignal) => getManagerSeat(accessToken, seatId, hallId, signal), [accessToken, seatId, hallId]); const result = useMovieRequest(load);
  return result.loading || result.error ? <Dialog title="Chi tiết ghế" onClose={onClose}><OperationsState {...result} /></Dialog> : result.data && <SeatEdit initial={result.data} onClose={onClose} refresh={refresh} />;
}
function SeatEdit({ initial, onClose, refresh }: { initial: AdminSeat; onClose: () => void; refresh: () => void }) {
  const { accessToken } = useManager(); const [current, setCurrent] = useState(initial); const [value, setValue] = useState<SeatContent>(initial); const [confirm, setConfirm] = useState(false); const command = useOperationsCommand();
  const read = async () => { const saved = await getManagerSeat(accessToken, current.id, current.hallId); setCurrent(saved); setValue(saved); setConfirm(false); };
  function submit(e: FormEvent) { e.preventDefault(); setConfirm(true); }
  return <Dialog title={`Chi tiết ghế ${current.row}${current.number}`} busy={command.busy} onClose={onClose}><form onSubmit={submit} onInvalidCapture={localizeInvalidField} onChangeCapture={clearFieldValidation} onInputCapture={clearFieldValidation} className="space-y-5 text-base"><p>{displayLabel(current.type)} · {current.guestCapacity} khách</p>{!current.structureEditable && <p className="text-muted">Thông tin ghế đã cố định. Chỉ đổi được trạng thái.</p>}<fieldset disabled={command.blocked || confirm} className="space-y-5"><SeatFields value={value} change={setValue} frozen={!current.structureEditable} existing={current} /><Button type="submit">Lưu ghế</Button></fieldset>
    {confirm && <div className="space-y-4 rounded-control border border-accent/50 p-4"><p>Xác nhận cập nhật ghế {current.row}{current.number} sang trạng thái {displayLabel(value.physicalStatus)}?</p><div className="flex flex-wrap gap-3"><Button disabled={command.blocked} onClick={() => void command.run(() => updateManagerSeat(accessToken, current, value), () => { onClose(); refresh(); })}>Xác nhận thay đổi</Button><Button disabled={command.busy} variant="secondary" onClick={() => setConfirm(false)}>Quay lại chỉnh sửa</Button></div></div>}
    <CommandFeedback command={command} read={read} /></form></Dialog>;
}
function InitializeLayout({ hall, refresh }: { hall: AdminHall; refresh: () => void }) {
  const { accessToken } = useManager(); const command = useOperationsCommand();
  const [units, setUnits] = useState<SeatContent[]>([{ row: "A", number: "1", type: "STANDARD", physicalStatus: "ACTIVE" }]);
  const [confirm, setConfirm] = useState(false), [validation, setValidation] = useState<string>();
  const read = async () => { await getManagerSeats(accessToken, hall.id); refresh(); };
  function submit(e: FormEvent) { e.preventDefault(); if (layoutGuestCapacity(units) !== hall.capacity || units.some(s => !s.row.trim() || !s.number.trim()) || new Set(units.map(s => `${s.row.trim()}:${s.number.trim()}`)).size !== units.length) { setValidation("Kiểm tra nhãn ghế, ghế trùng và tổng số khách."); return; } setValidation(undefined); setConfirm(true); }
  return <OperationsCard><h2 className="text-xl font-semibold">Khởi tạo toàn bộ sơ đồ ghế</h2><p>Chưa có ghế. Nhập đủ sơ đồ một lần; không thể thêm hoặc xóa ghế sau khi lưu.</p><p>{units.length} ghế / {layoutGuestCapacity(units)} khách, cần đúng {hall.capacity} khách.</p><form onSubmit={submit} onInvalidCapture={localizeInvalidField} onInputCapture={clearFieldValidation} onChangeCapture={clearFieldValidation} className="space-y-5"><fieldset disabled={command.blocked || confirm} className="space-y-5">{units.map((s, i) => <div key={i} className="space-y-3 rounded-control border border-outline p-4"><h3>Ghế nháp {i + 1}</h3><SeatFields value={s} change={v => setUnits(units.map((a, n) => n === i ? v : a))} /><Button variant="secondary" disabled={units.length === 1} onClick={() => setUnits(units.filter((_, n) => n !== i))}>Bỏ ghế nháp {i + 1}</Button></div>)}<div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={() => setUnits([...units, { row: "A", number: String(units.length + 1), type: "STANDARD", physicalStatus: "ACTIVE" }])}>Thêm ghế nháp</Button><Button type="submit" disabled={layoutGuestCapacity(units) !== hall.capacity}>Khởi tạo sơ đồ</Button></div></fieldset>
    {confirm && <div className="space-y-3"><p>Xác nhận lưu toàn bộ {units.length} ghế cho phòng {hall.name}?</p><Button disabled={command.blocked} onClick={() => void command.run(() => initializeManagerSeats(accessToken, hall.id, units), refresh)}>Xác nhận khởi tạo</Button><Button variant="secondary" disabled={command.busy} onClick={() => setConfirm(false)}>Quay lại</Button></div>}{validation && <p role="alert" className="text-error">{validation}</p>}<CommandFeedback command={command} read={read} /></form></OperationsCard>;
}
