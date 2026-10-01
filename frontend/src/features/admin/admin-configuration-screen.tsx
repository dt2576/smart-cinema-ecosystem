"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/features/admin/admin-shell";
import { getAdminCinemas, getAdminCinema, getAdminHalls, getAdminHall, getAdminSeats, saveAdminCinema, saveAdminHall, initializeAdminSeats, updateAdminSeat } from "@/features/admin/admin-api";
import { layoutGuestCapacity, type AdminCinema, type AdminHall, type AdminSeat, type CinemaContent, type HallContent, type SeatContent, type SeatType, type PhysicalStatus, type CinemaStatus } from "@/features/admin/admin-configuration.types";
import { useMovieRequest } from "@/features/movie/use-movie-request";

const INPUT = "mt-1 w-full rounded-lg border border-outline/50 bg-panel px-3 py-2 text-foreground disabled:opacity-60";
const LINK = "text-accent underline underline-offset-4";
const PHYSICAL_STATUSES: PhysicalStatus[] = ["ACTIVE", "MAINTENANCE", "INACTIVE"];
const CINEMA_STATUSES: CinemaStatus[] = ["ACTIVE", "TEMPORARILY_CLOSED", "INACTIVE"];
const SEAT_TYPES: SeatType[] = ["STANDARD", "VIP", "COUPLE"];

function Frame({ title, children, back = "/admin/cinemas", backLabel = "Cinemas" }: { title: string; children: ReactNode; back?: string; backLabel?: string }) {
  return <section className="space-y-6"><Link href={back} className={LINK}>← {backLabel}</Link><h1 className="text-3xl font-bold">{title}</h1>{children}</section>;
}
function RequestState({ loading, error, retry }: { loading: boolean; error?: Error; retry: () => void }) {
  const { reportError } = useAdmin();
  if (loading) return <p role="status">Loading configuration…</p>;
  return <div className="space-y-3"><p role="alert">{error?.message ?? "Configuration unavailable."}</p><Button onClick={() => { reportError(error); retry(); }}>Retry</Button></div>;
}
function Field({ name, children }: { name: string; children: ReactNode }) { return <label className="block text-sm font-medium">{name}{children}</label>; }
function Feedback({ error, saved }: { error?: string; saved?: boolean }) {
  return <>{error && <p role="alert" className="text-error">{error}</p>}{saved && <p role="status" className="text-accent">Configuration saved.</p>}</>;
}

export function AdminCinemaList() {
  const { accessToken } = useAdmin();
  const load = useCallback((signal: AbortSignal) => getAdminCinemas(accessToken, signal), [accessToken]);
  const result = useMovieRequest(load);
  return <Frame title="Cinema management" back="/admin" backLabel="Admin"><Link href="/admin/cinemas/new" className={LINK}>Create Cinema</Link>
    {result.loading || result.error ? <RequestState {...result} /> : <div className="grid gap-4">{!result.data?.length && <p>No Cinemas yet.</p>}{result.data?.map(cinema => <article key={cinema.id} className="space-y-3 rounded-xl border border-outline/40 bg-panel p-5"><h2 className="text-xl font-semibold">{cinema.name}</h2><p className="text-muted">{cinema.address}</p><p>{cinema.status}</p><div className="flex gap-5"><Link href={`/admin/cinemas/${cinema.id}/edit`} className={LINK}>Edit Cinema</Link><Link href={`/admin/cinemas/${cinema.id}/halls`} className={LINK}>Manage Halls</Link></div></article>)}</div>}
  </Frame>;
}

export function AdminCinemaEditor({ cinemaId }: { cinemaId?: string }) {
  const { accessToken } = useAdmin();
  const load = useCallback((signal: AbortSignal) => cinemaId ? getAdminCinema(accessToken, cinemaId, signal) : Promise.resolve(null), [accessToken, cinemaId]);
  const result = useMovieRequest(load);
  return <Frame title={cinemaId ? "Edit Cinema" : "Create Cinema"}>{result.loading || result.error ? <RequestState {...result} /> : <CinemaForm key={cinemaId} initial={result.data ?? undefined} />}</Frame>;
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
    catch (cause) { reportError(cause); setError(cause instanceof Error ? cause.message : "Save failed."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="max-w-2xl space-y-5"><fieldset disabled={busy} className="space-y-5">
    <Field name="Cinema name"><input className={INPUT} required maxLength={150} value={value.name} onChange={event => setValue({ ...value, name: event.target.value })} /></Field>
    <Field name="Address"><textarea className={INPUT} required value={value.address} onChange={event => setValue({ ...value, address: event.target.value })} /></Field>
    <Field name="Contact"><input className={INPUT} maxLength={255} value={value.contact ?? ""} onChange={event => setValue({ ...value, contact: event.target.value || null })} /></Field>
    <Field name="Operating information"><textarea className={INPUT} value={value.operatingInformation ?? ""} onChange={event => setValue({ ...value, operatingInformation: event.target.value || null })} /></Field>
    <Field name="Cinema status"><select className={INPUT} value={value.status} onChange={event => setValue({ ...value, status: event.target.value as CinemaStatus })}>{CINEMA_STATUSES.map(status => <option key={status}>{status}</option>)}</select></Field>
    <Button type="submit">{busy ? "Saving…" : "Save Cinema"}</Button>
  </fieldset><Feedback error={error} saved={!!saved} />{saved && <Link className={LINK} href={`/admin/cinemas/${saved.id}/halls`}>Manage Halls</Link>}</form>;
}

export function AdminHallList({ cinemaId }: { cinemaId: string }) {
  const { accessToken } = useAdmin();
  const load = useCallback(async (signal: AbortSignal) => {
    const [cinema, halls] = await Promise.all([getAdminCinema(accessToken, cinemaId, signal), getAdminHalls(accessToken, cinemaId, signal)]); return { cinema, halls };
  }, [accessToken, cinemaId]);
  const result = useMovieRequest(load);
  return <Frame title={result.data ? `${result.data.cinema.name} — Halls` : "Hall management"}>
    {result.loading || result.error ? <RequestState {...result} /> : <><Link className={LINK} href={`/admin/cinemas/${cinemaId}/halls/new`}>Create Hall</Link><div className="grid gap-4">{!result.data?.halls.length && <p>No Halls yet.</p>}{result.data?.halls.map(hall => <article key={hall.id} className="space-y-3 rounded-xl border border-outline/40 bg-panel p-5"><h2 className="text-xl font-semibold">{hall.name}</h2><p>{hall.capacity} guests · {hall.type} · {hall.status}</p><p className="text-muted">{hall.layoutInitialized ? "Layout initialized" : "Layout not initialized"}</p><div className="flex gap-5"><Link className={LINK} href={`/admin/halls/${hall.id}/edit`}>Edit Hall</Link><Link className={LINK} href={`/admin/halls/${hall.id}/seats`}>Manage Seats</Link></div></article>)}</div></>}
  </Frame>;
}
export function AdminHallEditor({ hallId, cinemaId }: { hallId?: string; cinemaId?: string }) {
  const { accessToken } = useAdmin();
  const load = useCallback(async (signal: AbortSignal) => {
    const hall = hallId ? await getAdminHall(accessToken, hallId, signal) : undefined;
    const cinema = await getAdminCinema(accessToken, hall?.cinemaId ?? cinemaId ?? "", signal); return { hall, cinema };
  }, [accessToken, hallId, cinemaId]);
  const result = useMovieRequest(load);
  return <Frame title={hallId ? "Edit Hall" : "Create Hall"} back={result.data ? `/admin/cinemas/${result.data.cinema.id}/halls` : "/admin/cinemas"} backLabel="Halls">
    {result.loading || result.error ? <RequestState {...result} /> : result.data && <HallForm key={hallId} initial={result.data.hall} cinema={result.data.cinema} />}
  </Frame>;
}
function HallForm({ initial, cinema }: { initial?: AdminHall; cinema: AdminCinema }) {
  const { accessToken, reportError } = useAdmin();
  const [value, setValue] = useState<HallContent>(initial ?? { name: "", capacity: 1, type: "", status: "ACTIVE" });
  const [saved, setSaved] = useState<AdminHall>(); const [busy, setBusy] = useState(false); const [error, setError] = useState<string>();
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(undefined);
    try { setSaved(await saveAdminHall(accessToken, cinema.id, initial?.id ?? saved?.id, value)); }
    catch (cause) { reportError(cause); setError(cause instanceof Error ? cause.message : "Save failed."); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="max-w-2xl space-y-5"><p className="text-muted">Cinema: {cinema.name}. Hall membership is permanent.</p><fieldset disabled={busy} className="space-y-5">
    <Field name="Hall name"><input className={INPUT} required maxLength={100} value={value.name} onChange={event => setValue({ ...value, name: event.target.value })} /></Field>
    <Field name="Guest capacity"><input className={INPUT} type="number" min={1} max={2147483647} step={1} required disabled={initial?.layoutInitialized || saved?.layoutInitialized} value={value.capacity} onChange={event => setValue({ ...value, capacity: Number(event.target.value) })} /></Field>
    {initial?.layoutInitialized && <p className="text-muted">Initialized layout prevents capacity changes.</p>}
    <Field name="Hall type"><input className={INPUT} required maxLength={50} value={value.type} onChange={event => setValue({ ...value, type: event.target.value })} /></Field>
    <Field name="Hall status"><select className={INPUT} value={value.status} onChange={event => setValue({ ...value, status: event.target.value as PhysicalStatus })}>{PHYSICAL_STATUSES.map(status => <option key={status}>{status}</option>)}</select></Field>
    <Button type="submit">{busy ? "Saving…" : "Save Hall"}</Button>
  </fieldset><Feedback error={error} saved={!!saved} />{saved && <Link className={LINK} href={`/admin/halls/${saved.id}/seats`}>Manage Seats</Link>}</form>;
}

export function AdminSeatManagement({ hallId }: { hallId: string }) {
  const { accessToken } = useAdmin();
  const load = useCallback(async (signal: AbortSignal) => {
    const [hall, seats] = await Promise.all([getAdminHall(accessToken, hallId, signal), getAdminSeats(accessToken, hallId, signal)]); return { hall, seats };
  }, [accessToken, hallId]);
  const result = useMovieRequest(load);
  return <Frame title={result.data ? `${result.data.hall.name} — Seat Units` : "Seat management"} back={result.data ? `/admin/cinemas/${result.data.hall.cinemaId}/halls` : "/admin/cinemas"} backLabel="Halls">
    <p className="text-muted">STANDARD/VIP: one guest. COUPLE: one indivisible unit for two guests. Physical status is independent of Showtime availability.</p>
    {result.loading || result.error ? <RequestState {...result} /> : result.data && <SeatLayout key={hallId + ":" + result.data.seats.length} hall={result.data.hall} initial={result.data.seats} refresh={result.retry} />}
  </Frame>;
}
function SeatFields({ value, setValue, disabled = false }: { value: SeatContent; setValue: (value: SeatContent) => void; disabled?: boolean }) {
  return <div className="grid gap-3 sm:grid-cols-2"><Field name="Seat row"><input className={INPUT} required maxLength={20} disabled={disabled} value={value.row} onChange={event => setValue({ ...value, row: event.target.value })} /></Field>
    <Field name="Seat number"><input className={INPUT} required maxLength={20} disabled={disabled} value={value.number} onChange={event => setValue({ ...value, number: event.target.value })} /></Field>
    <Field name="Seat type"><select className={INPUT} disabled={disabled} value={value.type} onChange={event => setValue({ ...value, type: event.target.value as SeatType })}>{SEAT_TYPES.map(type => <option key={type}>{type}</option>)}</select></Field>
    <Field name="Physical status"><select className={INPUT} value={value.physicalStatus} onChange={event => setValue({ ...value, physicalStatus: event.target.value as PhysicalStatus })}>{PHYSICAL_STATUSES.map(status => <option key={status}>{status}</option>)}</select></Field></div>;
}
function SeatLayout({ hall, initial, refresh }: { hall: AdminHall; initial: AdminSeat[]; refresh: () => void }) {
  const { accessToken, reportError } = useAdmin();
  const [units, setUnits] = useState<SeatContent[]>([{ row: "A", number: "1", type: "STANDARD", physicalStatus: "ACTIVE" }]);
  const [selected, setSelected] = useState<AdminSeat>(); const [edit, setEdit] = useState<SeatContent>();
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string>();
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(undefined);
    try { if (selected && edit) await updateAdminSeat(accessToken, selected.id, { row: edit.row, number: edit.number, type: edit.type, physicalStatus: edit.physicalStatus }); else await initializeAdminSeats(accessToken, hall.id, units); refresh(); }
    catch (cause) { reportError(cause); setError(cause instanceof Error ? cause.message : "Save failed."); } finally { setBusy(false); }
  }
  if (!initial.length) return <form onSubmit={submit} className="space-y-5"><p role="status">Layout not initialized. Enter the entire layout before saving.</p><p>Hall capacity: {hall.capacity} guests. Layout: {layoutGuestCapacity(units)} guests across {units.length} units.</p>
    <fieldset disabled={busy} className="space-y-4">{units.map((unit, index) => <div key={index} className="space-y-3 rounded-xl border border-outline/40 bg-panel p-4"><h2>Unit {index + 1}</h2><SeatFields value={unit} setValue={value => setUnits(units.map((item, i) => i === index ? value : item))} /><Button type="button" variant="secondary" disabled={units.length === 1} onClick={() => setUnits(units.filter((_, i) => i !== index))}>Remove draft unit {index + 1}</Button></div>)}
      <Button type="button" variant="secondary" onClick={() => setUnits([...units, { row: "A", number: String(units.length + 1), type: "STANDARD", physicalStatus: "ACTIVE" }])}>Add draft unit</Button><div><Button type="submit" disabled={layoutGuestCapacity(units) !== hall.capacity}>Initialize complete layout</Button></div>
    </fieldset><Feedback error={error} /></form>;
  return <div className="space-y-5"><p role="status">Initialized layout: {initial.length} Seat Units, {layoutGuestCapacity(initial)} guests / Hall capacity {hall.capacity}.</p>
    <div aria-label="Seat Unit grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{initial.map(seat => <button key={seat.id} type="button" disabled={busy} aria-pressed={selected?.id === seat.id} className="rounded-lg border border-outline/40 bg-panel p-3 text-left focus-visible:outline-2 focus-visible:outline-accent aria-pressed:border-accent" onClick={() => { setSelected(seat); setEdit(seat); setError(undefined); }}><span className="block font-semibold">{seat.row}{seat.number}</span><span className="block text-sm">{seat.type} · {seat.guestCapacity} guests</span><span className="block text-xs text-muted">{seat.physicalStatus}</span></button>)}</div>
    {selected && edit && <form onSubmit={submit} className="max-w-2xl space-y-4 rounded-xl border border-outline/40 bg-panel p-5"><h2 className="text-xl font-semibold">Edit Seat Unit {selected.row}{selected.number}</h2><p className="text-muted">{selected.structureEditable ? "Identity changes must preserve guest capacity. Server validates all references." : "Referenced Seat: row, number and type are protected. Only physical status can change."}</p><fieldset disabled={busy} className="space-y-4"><SeatFields value={edit} setValue={setEdit} disabled={!selected.structureEditable} /><Button type="submit">Save Seat Unit</Button></fieldset></form>}<Feedback error={error} />
  </div>;
}
