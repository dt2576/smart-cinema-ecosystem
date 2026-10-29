"use client";

import { useCallback, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { clearFieldValidation, localizeInvalidField } from "@/components/ui/native-validation";
import { useAdmin } from "@/features/admin/admin-shell";
import { getAdminHall, getAdminSeats, initializeAdminSeats, updateAdminSeat } from "@/features/admin/admin-api";
import { layoutGuestCapacity, type AdminHall, type AdminSeat, type SeatContent, type SeatType, type PhysicalStatus } from "@/features/admin/admin-configuration.types";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { displayLabel } from "@/lib/display-labels";
import { ConfigurationFrame, ConfigurationStatus, ConfigurationIcon, configurationStyles as styles } from "@/features/admin/admin-configuration-ui";
import { ConfigurationRequestState, ConfigurationField as Field, ConfigurationFeedback as Feedback } from "@/features/admin/admin-configuration-feedback";
import { orderSeatRowForDisplay } from "@/features/admin/admin-seat-presentation";

export function AdminSeatManagement({ hallId }: { hallId: string }) {
  const { accessToken } = useAdmin();
  const load = useCallback(async (signal: AbortSignal) => {
    const [hall, seats] = await Promise.all([getAdminHall(accessToken, hallId, signal), getAdminSeats(accessToken, hallId, signal)]); return { hall, seats };
  }, [accessToken, hallId]);
  const result = useMovieRequest(load);
  return <ConfigurationFrame title="Quản lý tình trạng ghế" headingInContent={!!result.data?.seats.length} back={result.data ? `/admin/cinemas/${result.data.hall.cinemaId}/halls` : "/admin/cinemas"} backLabel="Phòng chiếu">
    {result.loading || result.error ? <ConfigurationRequestState {...result} /> : result.data && <SeatLayout key={hallId + ":" + result.data.seats.length} hall={result.data.hall} initial={result.data.seats} refresh={result.retry} />}
  </ConfigurationFrame>;
}

function SeatFields({ value, setValue, disabled = false }: { value: SeatContent; setValue: (value: SeatContent) => void; disabled?: boolean }) {
  return <div className={styles.seatFields}><Field name="Hàng ghế"><input className={styles.input} required maxLength={20} disabled={disabled} value={value.row} onChange={event => setValue({ ...value, row: event.target.value })} /></Field>
    <Field name="Số ghế"><input className={styles.input} required maxLength={20} disabled={disabled} value={value.number} onChange={event => setValue({ ...value, number: event.target.value })} /></Field>
    <Field name="Loại ghế"><select className={styles.input} disabled={disabled} value={value.type} onChange={event => setValue({ ...value, type: event.target.value as SeatType })}>{["STANDARD", "VIP", "COUPLE"].map(type => <option key={type} value={type}>{displayLabel(type)}</option>)}</select></Field>
    <Field name="Trạng thái vật lý"><select className={styles.input} value={value.physicalStatus} onChange={event => setValue({ ...value, physicalStatus: event.target.value as PhysicalStatus })}>{["ACTIVE", "MAINTENANCE", "INACTIVE"].map(status => <option key={status} value={status}>{displayLabel(status)}</option>)}</select></Field></div>;
}

function SeatLayout({ hall, initial, refresh }: { hall: AdminHall; initial: AdminSeat[]; refresh: () => void }) {
  const { accessToken, reportError } = useAdmin();
  const [units, setUnits] = useState<SeatContent[]>([{ row: "A", number: "1", type: "STANDARD", physicalStatus: "ACTIVE" }]);
  const [selected, setSelected] = useState<AdminSeat | undefined>(initial[0]);
  const [edit, setEdit] = useState<SeatContent | undefined>(initial[0]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string>();
  const seatButtons = useRef(new Map<string, HTMLButtonElement>());
  // Keep row membership/order; naturally order only unambiguous numeric labels.
  // Never synthesize coordinates, missing seats, aisles or split a COUPLE unit.
  const rows = new Map<string, AdminSeat[]>();
  for (const seat of initial) { const row = rows.get(seat.row) ?? []; row.push(seat); rows.set(seat.row, row); }
  for (const [row, seats] of rows) rows.set(row, orderSeatRowForDisplay(seats));
  function choose(seat: AdminSeat) { setSelected(seat); setEdit(seat); setError(undefined); }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, seat: AdminSeat) {
    if (busy || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const groups = [...rows.values()]; const rowIndex = groups.findIndex(row => row.some(s => s.id === seat.id));
    const row = groups[rowIndex]; const index = row.findIndex(s => s.id === seat.id);
    let next = seat;
    if (event.key === "Home") next = row[0];
    if (event.key === "End") next = row[row.length - 1];
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") next = row[Math.max(0, Math.min(row.length - 1, index + (event.key === "ArrowLeft" ? -1 : 1)))];
    if (event.key === "ArrowUp" || event.key === "ArrowDown") { const other = groups[Math.max(0, Math.min(groups.length - 1, rowIndex + (event.key === "ArrowUp" ? -1 : 1)))]; next = other[Math.min(index, other.length - 1)]; }
    choose(next); seatButtons.current.get(next.id)?.focus();
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(undefined);
    try {
      if (selected && edit) await updateAdminSeat(accessToken, selected.id, { row: edit.row, number: edit.number, type: edit.type, physicalStatus: edit.physicalStatus });
      else await initializeAdminSeats(accessToken, hall.id, units);
      refresh();
    } catch (cause) { reportError(cause); setError(cause instanceof Error ? cause.message : "Không thể lưu."); }
    finally { setBusy(false); }
  }
  if (!initial.length) return <div className={styles.drafts}><div className={styles.overview}><div><ConfigurationStatus status={hall.status} /><h2>{hall.name}</h2><p>{hall.type} · {hall.capacity} khách</p></div></div>
    <form onInvalidCapture={localizeInvalidField} onInputCapture={clearFieldValidation} onChangeCapture={clearFieldValidation} onSubmit={submit} className={styles.drafts} aria-busy={busy}>
      <p role="status">Chưa khởi tạo sơ đồ ghế. Nhập toàn bộ sơ đồ trước khi lưu.</p><p>Sức chứa phòng chiếu: {hall.capacity} khách. Sơ đồ: {layoutGuestCapacity(units)} khách trên {units.length} ghế.</p>
      <fieldset disabled={busy} className={styles.drafts}>{units.map((unit, index) => <div key={index} className={styles.draft}><h2>Ghế {index + 1}</h2><SeatFields value={unit} setValue={value => setUnits(units.map((item, i) => i === index ? value : item))} /><div><Button type="button" variant="secondary" disabled={units.length === 1} onClick={() => setUnits(units.filter((_, i) => i !== index))}>Xóa ghế nháp {index + 1}</Button></div></div>)}
        <div className={styles.actions}><Button type="button" variant="secondary" onClick={() => setUnits([...units, { row: "A", number: String(units.length + 1), type: "STANDARD", physicalStatus: "ACTIVE" }])}><ConfigurationIcon name="add" />Thêm ghế nháp</Button><Button type="submit" disabled={layoutGuestCapacity(units) !== hall.capacity}>Khởi tạo toàn bộ sơ đồ ghế</Button></div>
      </fieldset><Feedback error={error} />
    </form><p className={styles.subtle}>Ghế đôi là một ghế cho hai khách. Không thể thêm hoặc xóa ghế sau khi khởi tạo.</p>
  </div>;
  const active = initial.filter(s => s.physicalStatus === "ACTIVE").length;
  const maintenance = initial.filter(s => s.physicalStatus === "MAINTENANCE").length;
  return <>
    <div className={`${styles.overview} ${styles.seatOverview}`}><div><ConfigurationStatus status={hall.status} /><h1>Quản lý tình trạng ghế</h1><p>{hall.name} · {hall.type} · {hall.capacity} khách</p><p role="status">Sơ đồ đã khởi tạo: {initial.length} ghế, {layoutGuestCapacity(initial)} khách / sức chứa phòng chiếu {hall.capacity}.</p></div><div className={styles.metrics}><div className={styles.metric}><span>Hoạt động</span><strong>{active}</strong></div><div className={styles.metric}><span>Bảo trì</span><strong>{maintenance}</strong></div></div></div>
    <div className={styles.legend} aria-label="Chú thích ghế"><span><i aria-hidden="true" className={styles.swatch} />Ghế thường</span><span><i aria-hidden="true" data-type="VIP" className={styles.swatch} />Ghế VIP</span><span><i aria-hidden="true" data-type="COUPLE" className={styles.swatch} />Ghế đôi · 2 khách</span><span><i aria-hidden="true" data-type="MAINTENANCE" className={styles.swatch} />Bảo trì / Ngừng hoạt động</span></div>
    <div className={styles.seatWorkspace}>
      <div className={styles.seatCanvas}><div className={styles.screen}>MÀN HÌNH CHIẾU</div><div className={styles.seatScroll} role="region" aria-label="Lưới ghế"><div className={styles.seatRows}>{[...rows].map(([row, seats]) => <div key={row} className={styles.seatRow} data-seat-row={row}><span className={styles.rowLabel}>{row}</span>{seats.map(seat => <button key={seat.id} ref={node => { if (node) seatButtons.current.set(seat.id, node); else seatButtons.current.delete(seat.id); }} type="button" disabled={busy} tabIndex={selected?.id === seat.id ? 0 : -1} aria-pressed={selected?.id === seat.id} aria-label={`${seat.row}${seat.number} ${displayLabel(seat.type)} · ${seat.guestCapacity} khách ${displayLabel(seat.physicalStatus)}`} data-type={seat.type} data-status={seat.physicalStatus} className={styles.seatUnit} onKeyDown={event => navigate(event, seat)} onClick={() => choose(seat)}>{seat.number}{seat.physicalStatus !== "ACTIVE" && <span className={styles.seatMark} aria-hidden="true">{seat.physicalStatus === "MAINTENANCE" ? "×" : "—"}</span>}</button>)}</div>)}</div></div><p className={`${styles.subtle} mt-6`}>Chọn ghế để xem và chỉnh sửa. Dùng phím mũi tên để di chuyển giữa các ghế.</p></div>
      <aside className={styles.inspector} aria-label="Thông tin ghế"><h2><ConfigurationIcon name="seat" />Chi tiết &amp; tình trạng ghế</h2>
        {selected && edit && <><div className={styles.seatIdentity}><div><small>GHẾ ĐƯỢC CHỌN</small><strong>{selected.row}{selected.number}</strong></div><span>{displayLabel(selected.type)}<br />{selected.guestCapacity} khách</span></div><ConfigurationStatus status={selected.physicalStatus} />
          <form onInvalidCapture={localizeInvalidField} onInputCapture={clearFieldValidation} onChangeCapture={clearFieldValidation} onSubmit={submit} aria-busy={busy}><h3 className="sr-only">Chỉnh sửa ghế {selected.row}{selected.number}</h3><fieldset disabled={busy}><SeatFields value={edit} setValue={setEdit} disabled={!selected.structureEditable} /><p className={styles.subtle}>{selected.structureEditable ? "Thay đổi thông tin ghế phải giữ nguyên sức chứa. Máy chủ kiểm tra mọi dữ liệu tham chiếu." : "Ghế đã được sử dụng: không thể đổi hàng, số và loại ghế. Chỉ được đổi trạng thái vật lý."}</p><Button type="submit">{busy ? "Đang lưu…" : "Lưu ghế"}</Button></fieldset><Feedback error={error} /></form>
        </>}
        <p className={styles.subtle}>Trạng thái vật lý độc lập với tình trạng ghế theo suất chiếu. Ghế đôi là một ghế cho hai khách.</p>
      </aside>
    </div>
  </>;
}
