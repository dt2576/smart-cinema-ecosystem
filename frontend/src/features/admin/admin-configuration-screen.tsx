"use client";

import { localizeInvalidField, clearFieldValidation } from "@/components/ui/native-validation";
import { useCallback, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/features/admin/admin-shell";
import { getAdminCinemas, getAdminCinema, getAdminHalls, getAdminHall, saveAdminCinema, saveAdminHall } from "@/features/admin/admin-api";
import type { AdminCinema, AdminHall, CinemaContent, HallContent, PhysicalStatus, CinemaStatus } from "@/features/admin/admin-configuration.types";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { displayLabel } from "@/lib/display-labels";
import { ConfigurationFrame as Frame, ConfigurationLink, ConfigurationStatus, ConfigurationIcon, configurationStyles as styles } from "@/features/admin/admin-configuration-ui";
import { ConfigurationRequestState, ConfigurationField, ConfigurationFeedback } from "@/features/admin/admin-configuration-feedback";

export { AdminSeatManagement } from "@/features/admin/admin-seat-management";
const PHYSICAL_STATUSES: PhysicalStatus[] = ["ACTIVE", "MAINTENANCE", "INACTIVE"];
const CINEMA_STATUSES: CinemaStatus[] = ["ACTIVE", "TEMPORARILY_CLOSED", "INACTIVE"];

export function AdminCinemaList() {
  const { accessToken } = useAdmin();
  const load = useCallback((signal: AbortSignal) => getAdminCinemas(accessToken, signal), [accessToken]);
  const result = useMovieRequest(load);
  return <Frame title="Quản lý rạp chiếu phim" back="/admin" backLabel="Quản trị" action={<ConfigurationLink primary href="/admin/cinemas/new"><ConfigurationIcon name="add" />Thêm rạp</ConfigurationLink>}>
    {result.loading || result.error ? <ConfigurationRequestState {...result} /> : <>
      <div className={styles.metrics}><div className={styles.metric}><span>Rạp chiếu phim</span><strong>{result.data?.length ?? 0}</strong></div><div className={styles.metric}><span>Đang hoạt động</span><strong>{result.data?.filter(c => c.status === "ACTIVE").length ?? 0}</strong></div></div>
      <div className={styles.list}>{!result.data?.length && <div className={styles.state}><ConfigurationIcon name="cinema" /><p>Chưa có rạp chiếu phim.</p></div>}{result.data?.map(cinema => <article key={cinema.id} className={styles.listRow}><div className={styles.rowInfo}><ConfigurationIcon name="cinema" /><div><h2>{cinema.name}</h2><p>{cinema.address}</p>{cinema.contact && <p>{cinema.contact}</p>}<ConfigurationStatus status={cinema.status} /></div></div><div className={styles.actions}><ConfigurationLink href={`/admin/cinemas/${cinema.id}/edit`}><ConfigurationIcon name="edit" />Chỉnh sửa rạp</ConfigurationLink><ConfigurationLink href={`/admin/cinemas/${cinema.id}/halls`}><ConfigurationIcon name="hall" />Quản lý phòng chiếu<ConfigurationIcon name="arrow" /></ConfigurationLink></div></article>)}</div>
    </>}
  </Frame>;
}

export function AdminCinemaEditor({ cinemaId }: { cinemaId?: string }) {
  const { accessToken } = useAdmin();
  const load = useCallback((signal: AbortSignal) => cinemaId ? getAdminCinema(accessToken, cinemaId, signal) : Promise.resolve(null), [accessToken, cinemaId]);
  const result = useMovieRequest(load);
  return <Frame title={cinemaId ? "Chỉnh sửa rạp" : "Thêm rạp"}>{result.loading || result.error ? <ConfigurationRequestState {...result} /> : <CinemaForm key={cinemaId} initial={result.data ?? undefined} />}</Frame>;
}
function CinemaForm({ initial }: { initial?: AdminCinema }) {
  const { accessToken, reportError } = useAdmin();
  const [value, setValue] = useState<CinemaContent>(initial ?? { name: "", address: "", contact: null, operatingInformation: null, status: "ACTIVE" });
  const [saved, setSaved] = useState<AdminCinema>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(undefined);
    try { setSaved(await saveAdminCinema(accessToken, initial?.id ?? saved?.id, value)); }
    catch (cause) { reportError(cause); setError(cause instanceof Error ? cause.message : "Không thể lưu."); }
    finally { setBusy(false); }
  }
  return <form onInvalidCapture={localizeInvalidField} onInputCapture={clearFieldValidation} onChangeCapture={clearFieldValidation} onSubmit={submit} className={styles.form} aria-busy={busy}><fieldset disabled={busy}>
    <ConfigurationField name="Tên rạp"><input className={styles.input} required maxLength={150} value={value.name} onChange={event => setValue({ ...value, name: event.target.value })} /></ConfigurationField>
    <ConfigurationField name="Địa chỉ"><textarea className={styles.input} required value={value.address} onChange={event => setValue({ ...value, address: event.target.value })} /></ConfigurationField>
    <ConfigurationField name="Thông tin liên hệ"><input className={styles.input} maxLength={255} value={value.contact ?? ""} onChange={event => setValue({ ...value, contact: event.target.value || null })} /></ConfigurationField>
    <ConfigurationField name="Thông tin hoạt động"><textarea className={styles.input} value={value.operatingInformation ?? ""} onChange={event => setValue({ ...value, operatingInformation: event.target.value || null })} /></ConfigurationField>
    <ConfigurationField name="Trạng thái rạp"><select className={styles.input} value={value.status} onChange={event => setValue({ ...value, status: event.target.value as CinemaStatus })}>{CINEMA_STATUSES.map(status => <option key={status} value={status}>{displayLabel(status)}</option>)}</select></ConfigurationField>
    <div><Button type="submit">{busy ? "Đang lưu…" : "Lưu rạp"}</Button></div>
  </fieldset><ConfigurationFeedback error={error} saved={!!saved} />{saved && <ConfigurationLink href={`/admin/cinemas/${saved.id}/halls`}>Quản lý phòng chiếu</ConfigurationLink>}</form>;
}

export function AdminHallList({ cinemaId }: { cinemaId: string }) {
  const { accessToken } = useAdmin();
  const load = useCallback(async (signal: AbortSignal) => {
    const [cinema, halls] = await Promise.all([getAdminCinema(accessToken, cinemaId, signal), getAdminHalls(accessToken, cinemaId, signal)]); return { cinema, halls };
  }, [accessToken, cinemaId]);
  const result = useMovieRequest(load);
  return <Frame title={result.data ? `${result.data.cinema.name} — Phòng chiếu` : "Quản lý phòng chiếu"} headingInContent={!!result.data}>
    {result.loading || result.error ? <ConfigurationRequestState {...result} /> : result.data && <>
      <div className={styles.overview}><div><ConfigurationStatus status={result.data.cinema.status} /><h1>{result.data.cinema.name}</h1><p>{result.data.cinema.address}</p><div className={styles.overviewMeta}>{result.data.cinema.contact && <p>{result.data.cinema.contact}</p>}{result.data.cinema.operatingInformation && <p>{result.data.cinema.operatingInformation}</p>}</div></div><div className={styles.metrics}><div className={styles.metric}><span>Phòng chiếu</span><strong>{result.data.halls.length}</strong></div><div className={styles.metric}><span>Tổng sức chứa · khách</span><strong>{result.data.halls.reduce((sum, h) => sum + h.capacity, 0)}</strong></div></div></div>
      <div className={styles.sectionHeading}><h2>Danh sách phòng chiếu</h2><ConfigurationLink primary href={`/admin/cinemas/${cinemaId}/halls/new`}><ConfigurationIcon name="add" />Thêm phòng chiếu</ConfigurationLink></div>
      <div className={styles.list}>{!result.data.halls.length && <div className={styles.state}><ConfigurationIcon name="hall" /><p>Chưa có phòng chiếu.</p></div>}{result.data.halls.map(hall => <article key={hall.id} className={styles.listRow}><div className={styles.rowInfo}><ConfigurationIcon name="hall" /><div><h2>{hall.name}</h2><p>{hall.capacity} khách · {hall.type}</p><ConfigurationStatus status={hall.status} /><p>{hall.layoutInitialized ? "Đã khởi tạo sơ đồ ghế" : "Chưa khởi tạo sơ đồ ghế"}</p></div></div><div className={styles.actions}><ConfigurationLink href={`/admin/halls/${hall.id}/edit`}><ConfigurationIcon name="edit" />Chỉnh sửa phòng chiếu</ConfigurationLink><ConfigurationLink href={`/admin/halls/${hall.id}/seats`}><ConfigurationIcon name="seat" />Quản lý ghế<ConfigurationIcon name="arrow" /></ConfigurationLink></div></article>)}</div>
    </>}
  </Frame>;
}
export function AdminHallEditor({ hallId, cinemaId }: { hallId?: string; cinemaId?: string }) {
  const { accessToken } = useAdmin();
  const load = useCallback(async (signal: AbortSignal) => {
    const hall = hallId ? await getAdminHall(accessToken, hallId, signal) : undefined;
    const cinema = await getAdminCinema(accessToken, hall?.cinemaId ?? cinemaId ?? "", signal); return { hall, cinema };
  }, [accessToken, hallId, cinemaId]);
  const result = useMovieRequest(load);
  return <Frame title={hallId ? "Chỉnh sửa phòng chiếu" : "Thêm phòng chiếu"} back={result.data ? `/admin/cinemas/${result.data.cinema.id}/halls` : "/admin/cinemas"} backLabel="Phòng chiếu">
    {result.loading || result.error ? <ConfigurationRequestState {...result} /> : result.data && <HallForm key={hallId} initial={result.data.hall} cinema={result.data.cinema} />}
  </Frame>;
}
function HallForm({ initial, cinema }: { initial?: AdminHall; cinema: AdminCinema }) {
  const { accessToken, reportError } = useAdmin();
  const [value, setValue] = useState<HallContent>(initial ?? { name: "", capacity: 1, type: "", status: "ACTIVE" });
  const [saved, setSaved] = useState<AdminHall>(); const [busy, setBusy] = useState(false); const [error, setError] = useState<string>();
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(undefined);
    try { setSaved(await saveAdminHall(accessToken, cinema.id, initial?.id ?? saved?.id, value)); }
    catch (cause) { reportError(cause); setError(cause instanceof Error ? cause.message : "Không thể lưu."); } finally { setBusy(false); }
  }
  return <form onInvalidCapture={localizeInvalidField} onInputCapture={clearFieldValidation} onChangeCapture={clearFieldValidation} onSubmit={submit} className={styles.form} aria-busy={busy}><p className={`${styles.subtle} mb-5`}>Rạp: {cinema.name}. Không thể chuyển phòng chiếu sang rạp khác.</p><fieldset disabled={busy}>
    <ConfigurationField name="Tên phòng chiếu"><input className={styles.input} required maxLength={100} value={value.name} onChange={event => setValue({ ...value, name: event.target.value })} /></ConfigurationField>
    <ConfigurationField name="Sức chứa (số khách)"><input className={styles.input} type="number" min={1} max={2147483647} step={1} required disabled={initial?.layoutInitialized || saved?.layoutInitialized} value={value.capacity} onChange={event => setValue({ ...value, capacity: Number(event.target.value) })} /></ConfigurationField>
    {initial?.layoutInitialized && <p className={styles.subtle}>Không thể thay đổi sức chứa sau khi khởi tạo sơ đồ ghế.</p>}
    <ConfigurationField name="Loại phòng chiếu"><input className={styles.input} required maxLength={50} value={value.type} onChange={event => setValue({ ...value, type: event.target.value })} /></ConfigurationField>
    <ConfigurationField name="Trạng thái phòng chiếu"><select className={styles.input} value={value.status} onChange={event => setValue({ ...value, status: event.target.value as PhysicalStatus })}>{PHYSICAL_STATUSES.map(status => <option key={status} value={status}>{displayLabel(status)}</option>)}</select></ConfigurationField>
    <div><Button type="submit">{busy ? "Đang lưu…" : "Lưu phòng chiếu"}</Button></div>
  </fieldset><ConfigurationFeedback error={error} saved={!!saved} />{saved && <ConfigurationLink href={`/admin/halls/${saved.id}/seats`}>Quản lý ghế</ConfigurationLink>}</form>;
}
