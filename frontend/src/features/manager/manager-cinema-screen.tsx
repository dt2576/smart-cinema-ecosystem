"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { clearFieldValidation, localizeInvalidField } from "@/components/ui/native-validation";
import { displayLabel } from "@/lib/display-labels";
import { useManager } from "@/features/manager/manager-shell";
import { getManagerCinema, getManagerCinemas, getManagerHall, getManagerHalls, saveManagerHall } from "@/features/manager/manager-api";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { OperationsCard, OperationsEmpty, OperationsFrame, OperationsState, OP_INPUT, OP_LINK, CommandFeedback, useOperationsCommand } from "@/features/manager/operations-ui";
import type { AdminHall, HallContent, PhysicalStatus } from "@/features/admin/admin-configuration.types";

export function ManagerCinemaList() {
  const { accessToken } = useManager();
  const load = useCallback((signal: AbortSignal) => getManagerCinemas(accessToken, signal), [accessToken]); const result = useMovieRequest(load);
  return <OperationsFrame title="Rạp được phân công">{result.loading || result.error ? <OperationsState {...result} /> : !result.data?.length ? <OperationsEmpty message="Chưa có rạp được phân công. Vui lòng liên hệ quản trị viên." /> : <div className="grid gap-5 lg:grid-cols-2">{result.data.map(c => <OperationsCard key={c.id}><StatusBadge>{displayLabel(c.status)}</StatusBadge><h2 className="text-2xl font-semibold">{c.name}</h2><p className="text-muted">{c.address}</p>{c.contact && <p>Liên hệ: {c.contact}</p>}{c.operatingInformation && <p>{c.operatingInformation}</p>}<Link className={OP_LINK} href={`/manager/cinemas/${c.id}`}>Xem chi tiết →</Link></OperationsCard>)}</div>}</OperationsFrame>;
}

export function ManagerCinemaDetail({ cinemaId }: { cinemaId: string }) {
  const { accessToken } = useManager(); const [editor, setEditor] = useState<string>();
  const load = useCallback(async (signal: AbortSignal) => { const [cinema, halls] = await Promise.all([getManagerCinema(accessToken, cinemaId, signal), getManagerHalls(accessToken, cinemaId, signal)]); return { cinema, halls }; }, [accessToken, cinemaId]);
  const result = useMovieRequest(load);
  return <OperationsFrame title="Quản lý rạp" back={{ href: "/manager/cinemas", label: "Rạp được phân công" }}>{result.loading || result.error ? <OperationsState {...result} /> : result.data && <>
    <OperationsCard><h2 className="text-2xl font-semibold">{result.data.cinema.name}</h2><StatusBadge>{displayLabel(result.data.cinema.status)}</StatusBadge><p>{result.data.cinema.address}</p>{result.data.cinema.contact && <p>Liên hệ: {result.data.cinema.contact}</p>}{result.data.cinema.operatingInformation && <p>{result.data.cinema.operatingInformation}</p>}<Link href={`/manager/cinemas/${cinemaId}/staff`} className={OP_LINK}>Nhân viên tại rạp</Link></OperationsCard>
    <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-2xl font-semibold">Danh sách phòng chiếu</h2><Button onClick={() => setEditor("new")}>Thêm phòng chiếu</Button></div>
    {!result.data.halls.length ? <OperationsEmpty message="Chưa có phòng chiếu." /> : result.data.halls.map(h => <OperationsCard key={h.id}><h3 className="text-xl font-semibold">{h.name}</h3><p>{h.capacity} khách · {h.type}</p><StatusBadge>{displayLabel(h.status)}</StatusBadge><p className="text-muted">{h.layoutInitialized ? "Đã khởi tạo sơ đồ ghế" : "Chưa có sơ đồ ghế"}</p><div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={() => setEditor(h.id)}>Sửa thông tin {h.name}</Button><Link href={`/manager/halls/${h.id}/seats`} className={OP_LINK}>Quản lý tình trạng ghế</Link></div></OperationsCard>)}
    {editor && <HallDialog key={editor} cinemaId={cinemaId} hallId={editor === "new" ? undefined : editor} onClose={() => setEditor(undefined)} done={() => { setEditor(undefined); result.retry(); }} />}
  </>}</OperationsFrame>;
}
function HallDialog({ cinemaId, hallId, onClose, done }: { cinemaId: string; hallId?: string; onClose: () => void; done: () => void }) {
  const { accessToken } = useManager(); const load = useCallback((signal: AbortSignal) => hallId ? getManagerHall(accessToken, hallId, signal) : Promise.resolve(undefined), [accessToken, hallId]); const result = useMovieRequest(load);
  return result.loading || result.error ? <Dialog title={hallId ? "Sửa phòng chiếu" : "Thêm phòng chiếu"} onClose={onClose}><OperationsState {...result} /></Dialog> : <HallForm cinemaId={cinemaId} initial={result.data} onClose={onClose} done={done} />;
}
function HallForm({ cinemaId, initial, onClose, done }: { cinemaId: string; initial?: AdminHall; onClose: () => void; done: () => void }) {
  const { accessToken } = useManager(); const command = useOperationsCommand();
  const [current, setCurrent] = useState(initial);
  const [value, setValue] = useState<HallContent>(initial ?? { name: "", capacity: 1, type: "", status: "ACTIVE" });
  const [validation, setValidation] = useState<string>();
  const read = async () => { if (current) { const h = await getManagerHall(accessToken, current.id); setCurrent(h); setValue(h); } else { await getManagerHalls(accessToken, cinemaId); done(); } };
  function submit(e: FormEvent) { e.preventDefault(); if (!value.name.trim() || !value.type.trim() || !Number.isInteger(value.capacity)) { setValidation("Nhập tên, loại phòng và sức chứa hợp lệ."); return; } setValidation(undefined); void command.run(() => saveManagerHall(accessToken, cinemaId, current?.id, value), done); }
  return <Dialog title={initial ? "Sửa phòng chiếu" : "Thêm phòng chiếu"} initialFocus="input:not(:disabled)" busy={command.busy} onClose={onClose}><form onSubmit={submit} onInvalidCapture={localizeInvalidField} onChangeCapture={clearFieldValidation} onInputCapture={clearFieldValidation} className="space-y-5 text-base"><fieldset disabled={command.blocked} className="space-y-4">
    <label className="block">Tên phòng chiếu<input autoFocus required maxLength={100} className={OP_INPUT} value={value.name} onChange={e => setValue({ ...value, name: e.target.value })} /></label>
    <label className="block">Loại phòng chiếu<input required maxLength={50} className={OP_INPUT} value={value.type} onChange={e => setValue({ ...value, type: e.target.value })} /></label>
    <label className="block">Sức chứa (số khách)<input type="number" required min={1} max={2147483647} step={1} disabled={current?.layoutInitialized} className={OP_INPUT} value={value.capacity || ""} onChange={e => setValue({ ...value, capacity: Number(e.target.value) })} /></label>
    {current?.layoutInitialized && <p className="text-muted">Sức chứa cố định sau khi có sơ đồ ghế.</p>}
    <label className="block">Trạng thái phòng chiếu<select aria-label="Trạng thái phòng chiếu" className={OP_INPUT} value={value.status} onChange={e => setValue({ ...value, status: e.target.value as PhysicalStatus })}>{["ACTIVE", "MAINTENANCE", "INACTIVE"].map(s => <option key={s} value={s}>{displayLabel(s)}</option>)}</select></label>
    <p className="text-muted">Đổi trạng thái không tự hủy suất chiếu hoặc hoàn tiền.</p><Button type="submit">Lưu phòng chiếu</Button>
  </fieldset>{validation && <p role="alert" className="text-error">{validation}</p>}<CommandFeedback command={command} read={read} /></form></Dialog>;
}

export function ManagerSeatChooser() {
  const { accessToken, cinemas } = useManager(); const [cinema, setCinema] = useState(cinemas[0]?.id ?? "");
  const load = useCallback((signal: AbortSignal) => cinema ? getManagerHalls(accessToken, cinema, signal) : Promise.resolve([]), [accessToken, cinema]); const result = useMovieRequest(load);
  return <OperationsFrame title="Quản lý tình trạng ghế"><label className="block max-w-lg">Rạp chiếu phim<select aria-label="Rạp chiếu phim" className={OP_INPUT} value={cinema} onChange={e => setCinema(e.target.value)}>{cinemas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{result.loading || result.error ? <OperationsState {...result} /> : !result.data?.length ? <OperationsEmpty message="Chưa có phòng chiếu để quản lý ghế." /> : result.data.map(h => <OperationsCard key={h.id}><h2 className="text-xl font-semibold">{h.name}</h2><p>{h.capacity} khách · {displayLabel(h.status)}</p><Link className={OP_LINK} href={`/manager/halls/${h.id}/seats`}>Quản lý tình trạng ghế</Link></OperationsCard>)}</OperationsFrame>;
}
