"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusFeedback } from "@/components/ui/status-feedback";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useAdmin } from "@/features/admin/admin-shell";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { AdminConcessionApiError, createAdminConcession, getAdminConcession, getAdminConcessions, isConcessionId, setAdminConcessionStatus, updateAdminConcession } from "@/features/admin/admin-concession-api";
import { CONCESSION_BASE, CONCESSION_CATEGORIES, CONCESSION_STATUSES, concessionPrice, concessionPriceInput, filterConcessions, stripConcessionText, validateConcessionContent, type AdminConcessionItem, type ConcessionCategory, type ConcessionContent, type ConcessionStatus } from "@/features/admin/admin-concession-service";
import { useAdminConcessionCommand } from "@/features/admin/use-admin-concession-command";

const LINK = "inline-flex min-h-control items-center justify-center rounded-control px-3 py-2 font-semibold text-accent underline underline-offset-4";
const PRIMARY = "inline-flex min-h-control items-center justify-center rounded-control bg-action px-5 py-3 font-heading font-bold text-on-action hover:bg-action-hover";
const INPUT = "min-h-control w-full rounded-control border border-outline/50 bg-panel-high px-4 py-3 text-base aria-[invalid=true]:border-error";
type Command = ReturnType<typeof useAdminConcessionCommand>;
function Heading({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-5"><h1 className="font-heading text-3xl font-bold sm:text-4xl">{title}</h1>{children}</div>;
}
function SellingStatus({ status }: { status: ConcessionStatus }) {
  return <span className={`font-medium ${status === "ACTIVE" ? "text-success" : "text-muted"}`}>{CONCESSION_STATUSES[status]}</span>;
}
function Loading() { return <div role="status" className="space-y-4"><p>Đang tải sản phẩm…</p><Skeleton className="h-24" /><Skeleton className="h-24" /></div>; }
function ReadError({ error, retry }: { error: Error; retry: () => void }) {
  const { reportError } = useAdmin();
  // Report authorization failures through the existing shell, without interpreting backend text.
  useEffect(() => { reportError(error); }, [error, reportError]);
  return <StatusFeedback title="Chưa mở được sản phẩm" message={error instanceof AdminConcessionApiError ? error.message : "Vui lòng thử lại."} tone="error" role="alert" actions={<><Button onClick={retry}>Thử lại</Button><Link className={LINK} href={CONCESSION_BASE}>Quay lại danh sách</Link></>} />;
}
function Recovery({ command, refresh }: { command: Command; refresh: () => void }) {
  const { accessToken, reportError } = useAdmin();
  const [checked, setChecked] = useState(""), [checking, setChecking] = useState(false), [message, setMessage] = useState("");
  const [verified, setVerified] = useState<{ nonce: string; item: AdminConcessionItem }>();
  const hint = command.review;
  if (command.busy || !hint && !command.error && !command.wait) return null;
  async function check() {
    if (!hint || checking) return; setChecking(true); setMessage("");
    try {
      if (hint.itemId) setVerified({ nonce: hint.nonce, item: await getAdminConcession(accessToken, hint.itemId) }); else await getAdminConcessions(accessToken);
      setChecked(hint.nonce);
    } catch (error) { reportError(error); setMessage(error instanceof AdminConcessionApiError ? error.message : "Chưa kiểm tra được sản phẩm."); }
    finally { setChecking(false); }
  }
  return <SurfaceCard role="alert" className="space-y-3 border border-accent/30">
    <p>{hint ? "Chưa xác nhận được lần lưu trước. Hãy kiểm tra sản phẩm trước khi tiếp tục." : command.error?.message}</p>
    {command.wait > 0 && <p>Vui lòng chờ {command.wait} giây.</p>}
    {message && <p className="text-error">{message}</p>}
    {hint && verified?.nonce === hint.nonce && <p>Thông tin hiện tại: {CONCESSION_STATUSES[verified.item.status]} · {concessionPrice(verified.item.sellingPrice)}</p>}
    {hint && <div className="flex flex-wrap gap-3"><Button variant="secondary" disabled={checking || command.busy} onClick={() => void check()}>{checking ? "Đang kiểm tra…" : "Kiểm tra lại"}</Button>
      <Link className={LINK} href={hint.itemId ? `${CONCESSION_BASE}/${hint.itemId}` : CONCESSION_BASE}>Xem sản phẩm đã lưu</Link>
      {checked === hint.nonce && <Button variant="secondary" onClick={() => { command.acknowledge(); refresh(); }}>Đã kiểm tra, tiếp tục</Button>}</div>}
  </SurfaceCard>;
}
function StatusDialog({ item, close, refresh }: { item: AdminConcessionItem; close: () => void; refresh: () => void }) {
  const { accessToken } = useAdmin(); const command = useAdminConcessionCommand(item.id);
  const action = item.status === "ACTIVE" ? "Ngừng bán" : "Bán lại";
  const target = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  async function confirm() {
    await command.run(async () => {
      await setAdminConcessionStatus(accessToken, item.id, target);
      try { const actual = await getAdminConcession(accessToken, item.id); if (actual.status !== target) throw new AdminConcessionApiError(409, true); return actual; }
      catch (error) { throw new AdminConcessionApiError(error instanceof AdminConcessionApiError ? error.status : 0, true); }
    }, () => { refresh(); close(); });
  }
  return <Dialog title={`${action} sản phẩm này?`} busy={command.busy} onClose={close}>
    <p className="mb-3 break-words font-semibold">{item.name}</p><p>{item.status === "ACTIVE" ? "Khách hàng sẽ không thể chọn sản phẩm này khi đặt vé." : "Khách hàng có thể chọn sản phẩm này khi đặt vé."}</p>
    <div className="mt-5"><Recovery command={command} refresh={refresh} /></div>
    <div className="mt-6 flex flex-wrap justify-end gap-3"><Button variant="secondary" disabled={command.busy} onClick={close}>Hủy</Button><Button disabled={command.blocked} onClick={() => void confirm()}>{command.busy ? "Đang lưu…" : action}</Button></div>
  </Dialog>;
}
function ItemActions({ item, disabled, onStatus }: { item: AdminConcessionItem; disabled: boolean; onStatus: (item: AdminConcessionItem) => void }) {
  return <div className="flex flex-wrap items-center gap-2"><Link className={LINK} href={`${CONCESSION_BASE}/${item.id}`} aria-label={`Xem ${item.name}`}>Xem</Link><Link className={LINK} href={`${CONCESSION_BASE}/${item.id}/edit`} aria-label={`Sửa ${item.name}`}>Sửa</Link><Button variant="secondary" disabled={disabled} onClick={() => onStatus(item)} aria-label={`${item.status === "ACTIVE" ? "Ngừng bán" : "Bán lại"} ${item.name}`}>{item.status === "ACTIVE" ? "Ngừng bán" : "Bán lại"}</Button></div>;
}
export function AdminConcessionList() {
  const { accessToken } = useAdmin();
  const load = useCallback((signal: AbortSignal) => getAdminConcessions(accessToken, signal), [accessToken]);
  const query = useMovieRequest(load); const command = useAdminConcessionCommand();
  const [search, setSearch] = useState(""), [category, setCategory] = useState(""), [requestedPage, setPage] = useState(0);
  const [selected, setSelected] = useState<AdminConcessionItem | null>(null);
  const filtered = filterConcessions(query.data ?? [], search, category), pages = Math.max(1, Math.ceil(filtered.length / 10));
  const page = Math.min(requestedPage, pages - 1), items = filtered.slice(page * 10, page * 10 + 10);
  return <div className="space-y-7"><Heading title="Quản lý bắp nước"><Link className={PRIMARY} href={`${CONCESSION_BASE}/new`}>Thêm sản phẩm</Link></Heading>
    {!selected && <Recovery command={command} refresh={query.retry} />}
    <SurfaceCard as="div" className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_200px_auto]">
      <FormField inputId="concession-search" label="Tìm sản phẩm"><input id="concession-search" type="search" value={search} placeholder="Nhập tên sản phẩm" onChange={e => { setSearch(e.target.value); setPage(0); }} className={INPUT} /></FormField>
      <FormField inputId="concession-category" label="Loại sản phẩm"><select id="concession-category" value={category} onChange={e => { setCategory(e.target.value); setPage(0); }} className={INPUT}><option value="">Tất cả</option>{Object.entries(CONCESSION_CATEGORIES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></FormField>
      <Button variant="secondary" className="self-end" disabled={query.loading} onClick={query.retry}>Tải lại</Button>
    </SurfaceCard>
    {query.loading ? <Loading /> : query.error ? <ReadError error={query.error} retry={query.retry} /> : !filtered.length ? <StatusFeedback title={query.data?.length ? "Không tìm thấy sản phẩm" : "Chưa có sản phẩm"} message={query.data?.length ? "Thử tên khác hoặc bỏ bộ lọc." : "Chọn Thêm sản phẩm để bắt đầu."} actions={search || category ? <Button variant="secondary" onClick={() => { setSearch(""); setCategory(""); setPage(0); }}>Xóa bộ lọc</Button> : undefined} /> : <>
      <SurfaceCard as="div" padding="none" className="hidden xl:block"><table className="w-full table-fixed text-left"><caption className="sr-only">Danh sách sản phẩm bắp nước</caption><thead className="border-b border-outline/30 text-muted"><tr>{["Sản phẩm", "Loại", "Giá bán", "Trạng thái", "Thao tác"].map((label, i) => <th key={label} scope="col" className={`px-4 py-4 font-medium ${i === 4 ? "w-[260px]" : ""}`}>{label}</th>)}</tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-b border-outline/20 last:border-0"><th scope="row" className="break-words px-4 py-5 font-semibold [overflow-wrap:anywhere]">{item.name}</th><td className="px-4 py-5">{CONCESSION_CATEGORIES[item.category]}</td><td className="break-words px-4 py-5 tabular-nums">{concessionPrice(item.sellingPrice)}</td><td className="px-4 py-5"><SellingStatus status={item.status} /></td><td className="px-3 py-5"><ItemActions item={item} disabled={command.blocked} onStatus={setSelected} /></td></tr>)}</tbody></table></SurfaceCard>
      <div className="grid gap-4 xl:hidden">{items.map(item => <SurfaceCard as="div" key={item.id} className="space-y-4"><h2 className="break-words text-xl font-semibold [overflow-wrap:anywhere]">{item.name}</h2><dl className="grid grid-cols-2 gap-4"><div><dt className="text-sm text-muted">Loại sản phẩm</dt><dd>{CONCESSION_CATEGORIES[item.category]}</dd></div><div><dt className="text-sm text-muted">Trạng thái</dt><dd><SellingStatus status={item.status} /></dd></div><div className="col-span-2"><dt className="text-sm text-muted">Giá bán</dt><dd className="break-words text-xl font-semibold tabular-nums text-accent">{concessionPrice(item.sellingPrice)}</dd></div></dl><ItemActions item={item} disabled={command.blocked} onStatus={setSelected} /></SurfaceCard>)}</div>
      {pages > 1 && <nav aria-label="Trang danh sách sản phẩm" className="flex flex-wrap items-center justify-between gap-4"><Button variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Trang trước</Button><span aria-live="polite">Trang {page + 1} / {pages}</span><Button variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Trang sau</Button></nav>}
    </>}
    {selected && <StatusDialog item={selected} close={() => setSelected(null)} refresh={query.retry} />}
  </div>;
}
export function AdminConcessionDetail({ itemId, edit = false }: { itemId: string; edit?: boolean }) {
  const { accessToken } = useAdmin();
  const load = useCallback(async (signal: AbortSignal) => getAdminConcession(accessToken, itemId, signal), [accessToken, itemId]);
  const query = useMovieRequest(load); const command = useAdminConcessionCommand(itemId);
  const [selected, setSelected] = useState<AdminConcessionItem | null>(null);
  if (!isConcessionId(itemId)) return <div className="space-y-5"><Heading title={edit ? "Sửa sản phẩm" : "Chi tiết sản phẩm"} /><StatusFeedback message="Không tìm thấy sản phẩm." actions={<Link className={LINK} href={CONCESSION_BASE}>Quay lại danh sách</Link>} /></div>;
  if (query.loading) return <Loading />;
  if (query.error) return <ReadError error={query.error} retry={query.retry} />;
  const item = query.data!;
  if (edit) return <AdminConcessionForm key={item.id} item={item} refresh={query.retry} />;
  return <div className="space-y-7"><Heading title="Chi tiết sản phẩm"><Link className={LINK} href={CONCESSION_BASE}>Quay lại</Link></Heading>{!selected && <Recovery command={command} refresh={query.retry} />}
    <SurfaceCard className="space-y-7"><h2 className="break-words text-2xl font-semibold [overflow-wrap:anywhere]">{item.name}</h2><dl className="grid gap-6 sm:grid-cols-2"><div><dt className="mb-1 text-muted">Loại sản phẩm</dt><dd>{CONCESSION_CATEGORIES[item.category]}</dd></div><div><dt className="mb-1 text-muted">Trạng thái bán hàng</dt><dd><SellingStatus status={item.status} /></dd></div><div className="sm:col-span-2"><dt className="mb-1 text-muted">Giá bán</dt><dd className="break-words text-3xl font-semibold tabular-nums text-accent">{concessionPrice(item.sellingPrice)}</dd></div><div className="sm:col-span-2"><dt className="mb-1 text-muted">Mô tả</dt><dd className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{item.description || "Chưa có mô tả."}</dd></div></dl>
      <div className="flex flex-wrap gap-3"><Link className={PRIMARY} href={`${CONCESSION_BASE}/${item.id}/edit`}>Sửa sản phẩm</Link><Button variant="secondary" disabled={command.blocked} onClick={() => setSelected(item)}>{item.status === "ACTIVE" ? "Ngừng bán" : "Bán lại"}</Button></div>
    </SurfaceCard>{selected && <StatusDialog item={selected} close={() => setSelected(null)} refresh={query.retry} />}</div>;
}
export function AdminConcessionForm({ item, refresh = () => {} }: { item?: AdminConcessionItem; refresh?: () => void }) {
  const { accessToken } = useAdmin(); const router = useRouter(); const command = useAdminConcessionCommand(item?.id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (command.blocked) return;
    const form = event.currentTarget, values = new FormData(form), text = (key: string) => String(values.get(key) ?? "");
    const content: ConcessionContent = { name: stripConcessionText(text("name")), category: text("category") as ConcessionCategory, sellingPrice: concessionPriceInput(text("sellingPrice")) ?? "", description: stripConcessionText(text("description")) || null };
    const next = validateConcessionContent(content); const status = text("status") as ConcessionStatus;
    if (!item && !Object.hasOwn(CONCESSION_STATUSES, status)) next.status = "Chọn trạng thái bán hàng.";
    setErrors(next);
    if (Object.keys(next).length) { const field = form.elements.namedItem(Object.keys(next)[0]); if (field instanceof HTMLElement) field.focus(); return; }
    await command.run(() => item ? updateAdminConcession(accessToken, item.id, content) : createAdminConcession(accessToken, content, status), saved => router.push(`${CONCESSION_BASE}/${saved.id}`));
  }
  const described = (field: string) => errors[field] ? `${field}-error` : undefined;
  return <div className="space-y-7"><Heading title={item ? "Sửa sản phẩm" : "Thêm sản phẩm"} /><Recovery command={command} refresh={refresh} />
    <form noValidate onSubmit={submit} onChange={event => { const target: EventTarget = event.target; if ((target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) && errors[target.name]) setErrors(current => { const next = { ...current }; delete next[target.name]; return next; }); }} aria-busy={command.busy}><SurfaceCard className="space-y-6"><fieldset disabled={command.blocked} className="space-y-6"><legend className="sr-only">Thông tin sản phẩm</legend>
      <FormField inputId="name" label="Tên sản phẩm" error={errors.name}><input id="name" name="name" required defaultValue={item?.name ?? ""} aria-invalid={!!errors.name} aria-describedby={described("name")} className={INPUT} /></FormField>
      <div className="grid gap-6 sm:grid-cols-2"><FormField inputId="category" label="Loại sản phẩm" error={errors.category}><select id="category" name="category" required defaultValue={item?.category ?? "POPCORN"} aria-invalid={!!errors.category} aria-describedby={described("category")} className={INPUT}>{Object.entries(CONCESSION_CATEGORIES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></FormField>
        <FormField inputId="sellingPrice" label="Giá bán (₫)" error={errors.sellingPrice} hint="Ví dụ: 55000 hoặc 55000,5"><input id="sellingPrice" name="sellingPrice" required type="text" inputMode="decimal" defaultValue={item?.sellingPrice.replace(".", ",") ?? ""} aria-invalid={!!errors.sellingPrice} aria-describedby={errors.sellingPrice ? described("sellingPrice") : "sellingPrice-help"} className={INPUT} /></FormField></div>
      <FormField inputId="description" label="Mô tả (không bắt buộc)" error={errors.description}><textarea id="description" name="description" rows={4} defaultValue={item?.description ?? ""} aria-invalid={!!errors.description} aria-describedby={described("description")} className={`${INPUT} resize-y`} /></FormField>
      {!item && <FormField inputId="status" label="Trạng thái bán hàng" error={errors.status}><select id="status" name="status" required defaultValue="ACTIVE" aria-invalid={!!errors.status} aria-describedby={described("status")} className={INPUT}>{Object.entries(CONCESSION_STATUSES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></FormField>}
    </fieldset>{Object.keys(errors).length > 0 && <p role="alert" className="text-error">Vui lòng kiểm tra các trường được đánh dấu.</p>}
      <div className="flex flex-wrap justify-end gap-3"><Link className={LINK} href={item ? `${CONCESSION_BASE}/${item.id}` : CONCESSION_BASE} aria-disabled={command.busy} onClick={e => { if (command.busy) e.preventDefault(); }}>Hủy</Link><Button type="submit" disabled={command.blocked}>{command.busy ? "Đang lưu…" : item ? "Lưu thay đổi" : "Thêm sản phẩm"}</Button></div>
    </SurfaceCard></form></div>;
}
