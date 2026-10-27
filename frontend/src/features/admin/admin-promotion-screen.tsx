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
import { AdminPromotionApiError, createAdminPromotion, getAdminPromotion, getAdminPromotions, isPromotionId, setAdminPromotionStatus, updateAdminPromotion } from "@/features/admin/admin-promotion-api";
import { PROMOTION_BASE, PROMOTION_STATUSES, PROMOTION_TYPES, filterPromotions, promotionAmount, promotionAmountInput, promotionCode, promotionInputUtc, promotionDate, promotionDiscount, promotionDateInput, promotionUsage, validPromotionCode, validatePromotionContent, type AdminPromotion, type PromotionContent, type PromotionStatus, type PromotionType } from "@/features/admin/admin-promotion-service";
import { useAdminPromotionCommand } from "@/features/admin/use-admin-promotion-command";

const LINK = "inline-flex min-h-control items-center justify-center rounded-control px-3 py-2 font-semibold text-accent underline underline-offset-4";
const PRIMARY = "inline-flex min-h-control items-center justify-center rounded-control bg-action px-5 py-3 font-heading font-bold text-on-action hover:bg-action-hover";
const INPUT = "min-h-control w-full min-w-0 rounded-control border border-outline/50 bg-panel-high px-4 py-3 text-base aria-[invalid=true]:border-error read-only:text-muted read-only:bg-panel";
type Command = ReturnType<typeof useAdminPromotionCommand>;
function Heading({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="font-heading text-2xl font-bold md:text-[28px]">{title}</h1>{children}</div>;
}
function EnabledStatus({ status }: { status: PromotionStatus }) { return <span className={`font-medium ${status === "ACTIVE" ? "text-success" : "text-muted"}`}>{PROMOTION_STATUSES[status]}</span>; }
function Loading() { return <div role="status" className="space-y-4"><p>Đang tải khuyến mãi…</p><Skeleton className="h-24" /><Skeleton className="h-24" /></div>; }
function ReadError({ error, retry }: { error: Error; retry: () => void }) {
  const { reportError } = useAdmin();
  useEffect(() => { reportError(error); }, [error, reportError]);
  return <StatusFeedback title="Chưa mở được khuyến mãi" message={error instanceof AdminPromotionApiError ? error.message : "Vui lòng thử lại."} tone="error" role="alert" actions={<><Button onClick={retry}>Thử lại</Button><Link className={LINK} href={PROMOTION_BASE}>Quay lại danh sách</Link></>} />;
}
function Recovery({ command, refresh }: { command: Command; refresh: () => void }) {
  const { accessToken, reportError } = useAdmin();
  const [checked, setChecked] = useState(""), [checking, setChecking] = useState(false), [message, setMessage] = useState("");
  const [verified, setVerified] = useState<{ nonce: string; item: AdminPromotion }>();
  const hint = command.review;
  if (command.busy || !hint && !command.error && !command.wait) return null;
  async function check() {
    if (!hint || checking) return; setChecking(true); setMessage("");
    try {
      if (hint.promotionId) setVerified({ nonce: hint.nonce, item: await getAdminPromotion(accessToken, hint.promotionId) }); else await getAdminPromotions(accessToken);
      setChecked(hint.nonce);
    } catch (error) { reportError(error); setMessage(error instanceof AdminPromotionApiError ? error.message : "Chưa kiểm tra được khuyến mãi."); }
    finally { setChecking(false); }
  }
  return <SurfaceCard role="alert" className="space-y-3 border border-accent/30">
    <p>{hint ? "Chưa xác nhận được lần lưu trước. Hãy kiểm tra khuyến mãi trước khi tiếp tục." : command.error?.message}</p>
    {command.wait > 0 && <p>Vui lòng chờ {command.wait} giây.</p>}{message && <p className="text-error">{message}</p>}
    {hint && verified?.nonce === hint.nonce && <p>Thông tin hiện tại: {PROMOTION_STATUSES[verified.item.status]} · {promotionDiscount(verified.item)}</p>}
    {hint && <div className="flex flex-wrap gap-3"><Button variant="secondary" disabled={checking || command.busy} onClick={() => void check()}>{checking ? "Đang kiểm tra…" : "Kiểm tra lại"}</Button><Link className={LINK} href={hint.promotionId ? `${PROMOTION_BASE}/${hint.promotionId}` : PROMOTION_BASE}>Xem khuyến mãi đã lưu</Link>
      {checked === hint.nonce && <Button variant="secondary" onClick={() => { command.acknowledge(); refresh(); }}>Đã kiểm tra, tiếp tục</Button>}</div>}
  </SurfaceCard>;
}
function StatusDialog({ item, close, refresh }: { item: AdminPromotion; close: () => void; refresh: () => void }) {
  const { accessToken } = useAdmin(); const command = useAdminPromotionCommand(item.id);
  const disabling = item.status === "ACTIVE", action = disabling ? "Ngừng áp dụng" : "Bật lại", target = disabling ? "INACTIVE" : "ACTIVE";
  async function confirm() {
    await command.run(async () => {
      await setAdminPromotionStatus(accessToken, item.id, target);
      try { const actual = await getAdminPromotion(accessToken, item.id); if (actual.status !== target) throw new AdminPromotionApiError(409, true); return actual; }
      catch (error) { throw new AdminPromotionApiError(error instanceof AdminPromotionApiError ? error.status : 0, true); }
    }, () => { refresh(); close(); });
  }
  return <Dialog title={`${action} khuyến mãi?`} busy={command.busy} onClose={close}>
    <p>{disabling ? "Khách hàng sẽ không thể sử dụng mã này khi đặt vé." : "Mã sẽ có thể được sử dụng nếu còn hiệu lực và đáp ứng điều kiện."}</p>
    <div className="mt-5"><Recovery command={command} refresh={refresh} /></div>
    <div className="mt-6 flex flex-wrap justify-end gap-3"><Button variant="secondary" disabled={command.busy} onClick={close}>Hủy</Button><Button variant={disabling ? "secondary" : "primary"} className={disabling ? "border border-error/60 text-error" : ""} disabled={command.blocked} onClick={() => void confirm()}>{command.busy ? "Đang lưu…" : action}</Button></div>
  </Dialog>;
}
function RowActions({ item }: { item: AdminPromotion }) { return <div className="flex gap-2"><Link className={LINK} href={`${PROMOTION_BASE}/${item.id}`} aria-label={`Xem ${item.code}`}>Xem</Link><Link className={LINK} href={`${PROMOTION_BASE}/${item.id}/edit`} aria-label={`Sửa ${item.code}`}>Sửa</Link></div>; }
export function AdminPromotionList() {
  const { accessToken } = useAdmin(); const command = useAdminPromotionCommand();
  const load = useCallback((signal: AbortSignal) => getAdminPromotions(accessToken, signal), [accessToken]); const query = useMovieRequest(load);
  const [search, setSearch] = useState(""), [status, setStatus] = useState("");
  const items = filterPromotions(query.data ?? [], search, status);
  return <div className="space-y-6 text-base [&_button]:text-base [&_label]:text-base"><Heading title="Quản lý khuyến mãi"><Link className={PRIMARY} href={`${PROMOTION_BASE}/new`}>Thêm khuyến mãi</Link></Heading><Recovery command={command} refresh={query.retry} />
    <div className="flex flex-wrap items-end gap-4"><div className="min-w-0 flex-1 basis-64"><FormField inputId="promotion-search" label="Tìm mã khuyến mãi"><input id="promotion-search" type="search" className={INPUT} value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã khuyến mãi" /></FormField></div><FormField inputId="promotion-filter" label="Trạng thái"><select id="promotion-filter" className={INPUT} value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả</option>{Object.entries(PROMOTION_STATUSES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></FormField><Button variant="secondary" disabled={query.loading} onClick={query.retry}>Tải lại</Button></div>
    {query.loading ? <Loading /> : query.error ? <ReadError error={query.error} retry={query.retry} /> : !items.length ? <StatusFeedback title={query.data?.length ? "Không tìm thấy khuyến mãi" : "Chưa có khuyến mãi"} message={query.data?.length ? "Thử mã khác hoặc bỏ bộ lọc." : "Chọn Thêm khuyến mãi để bắt đầu."} actions={search || status ? <Button variant="secondary" onClick={() => { setSearch(""); setStatus(""); }}>Xóa bộ lọc</Button> : undefined} /> : <>
      <SurfaceCard as="div" padding="none" className="hidden xl:block"><table className="w-full table-fixed text-left"><caption className="sr-only">Danh sách khuyến mãi</caption><thead className="border-b border-outline/30 text-muted"><tr>{["Mã khuyến mãi", "Mức giảm", "Thời gian áp dụng", "Trạng thái", "Thao tác"].map((label, i) => <th scope="col" className={`px-4 py-4 font-medium ${i === 4 ? "w-40" : ""}`} key={label}>{label}</th>)}</tr></thead><tbody>{items.map(item => <tr className="border-b border-outline/20 last:border-0" key={item.id}><th scope="row" className="break-words px-4 py-4 font-semibold [overflow-wrap:anywhere]">{item.code}</th><td className="break-words px-4 py-4 tabular-nums">{promotionDiscount(item)}</td><td className="px-4 py-4"><span className="block">{promotionDate(item.validFrom)}</span><span className="block">đến {promotionDate(item.validUntil)}</span></td><td className="px-4 py-4"><EnabledStatus status={item.status} /></td><td className="px-3 py-4"><RowActions item={item} /></td></tr>)}</tbody></table></SurfaceCard>
      <div className="grid gap-4 xl:hidden">{items.map(item => <SurfaceCard as="div" key={item.id} className="space-y-4"><h2 className="break-words text-xl font-semibold [overflow-wrap:anywhere]">{item.code}</h2><dl className="grid grid-cols-2 gap-3"><div><dt className="text-muted">Mức giảm</dt><dd className="break-words font-semibold">{promotionDiscount(item)}</dd></div><div><dt className="text-muted">Trạng thái</dt><dd><EnabledStatus status={item.status} /></dd></div><div className="col-span-2"><dt className="text-muted">Thời gian áp dụng</dt><dd>{promotionDate(item.validFrom)}<br />đến {promotionDate(item.validUntil)}</dd></div></dl><RowActions item={item} /></SurfaceCard>)}</div>
    </>}
  </div>;
}
export function AdminPromotionDetail({ promotionId, edit = false }: { promotionId: string; edit?: boolean }) {
  const { accessToken } = useAdmin(); const command = useAdminPromotionCommand(promotionId);
  const load = useCallback(async (signal: AbortSignal) => getAdminPromotion(accessToken, promotionId, signal), [accessToken, promotionId]); const query = useMovieRequest(load);
  const [selected, setSelected] = useState<AdminPromotion | null>(null);
  if (!isPromotionId(promotionId)) return <StatusFeedback message="Không tìm thấy khuyến mãi." actions={<Link className={LINK} href={PROMOTION_BASE}>Quay lại danh sách</Link>} />;
  if (query.loading) return <Loading />; if (query.error) return <ReadError error={query.error} retry={query.retry} />;
  const item = query.data!; if (edit) return <AdminPromotionForm key={item.id} item={item} refresh={query.retry} />;
  const fields = [["Mã khuyến mãi", item.code], ["Loại giảm giá", PROMOTION_TYPES[item.discountType]], ["Mức giảm", promotionDiscount(item)],
    ...(item.maxDiscountAmount === null ? [] : [["Giảm tối đa", `${promotionAmount(item.maxDiscountAmount)} ₫`]]), ["Ngày và giờ bắt đầu", promotionDate(item.validFrom)], ["Ngày và giờ kết thúc", promotionDate(item.validUntil)],
    ["Giá trị đơn hàng tối thiểu", item.minimumOrderAmount === "0.0000" ? "Không yêu cầu" : `${promotionAmount(item.minimumOrderAmount)} ₫`], ["Giới hạn lượt sử dụng", item.usageLimit === null ? "Không giới hạn" : `${item.usageLimit} lượt`]];
  return <div className="space-y-6 text-base [&_button]:text-base [&_label]:text-base"><Heading title="Chi tiết khuyến mãi"><Link className={LINK} href={PROMOTION_BASE}>Quay lại</Link></Heading>{!selected && <Recovery command={command} refresh={query.retry} />}
    <SurfaceCard className="space-y-6"><dl className="grid gap-6 lg:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="mb-1 text-muted">{label}</dt><dd className="break-words font-semibold [overflow-wrap:anywhere]">{value}</dd></div>)}<div><dt className="mb-1 text-muted">Trạng thái hiện tại</dt><dd><EnabledStatus status={item.status} /></dd></div></dl>
      <div className="flex flex-wrap gap-3"><Link className={PRIMARY} href={`${PROMOTION_BASE}/${item.id}/edit`}>Sửa khuyến mãi</Link><Button variant="secondary" disabled={command.blocked} onClick={() => setSelected(item)}>{item.status === "ACTIVE" ? "Ngừng áp dụng" : "Bật lại"}</Button></div>
    </SurfaceCard>{selected && <StatusDialog item={selected} close={() => setSelected(null)} refresh={query.retry} />}</div>;
}
export function AdminPromotionForm({ item, refresh = () => {} }: { item?: AdminPromotion; refresh?: () => void }) {
  const { accessToken } = useAdmin(); const router = useRouter(); const command = useAdminPromotionCommand(item?.id);
  const [errors, setErrors] = useState<Record<string, string>>({}), [type, setType] = useState<PromotionType>(item?.discountType ?? "PERCENTAGE");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (command.blocked) return;
    const form = event.currentTarget, values = new FormData(form), text = (key: string) => String(values.get(key) ?? "");
    const usageLimit = promotionUsage(text("usageLimit"));
    const content: PromotionContent = { discountType: type, discountValue: promotionAmountInput(text("discountValue")) ?? "", validFrom: promotionInputUtc(text("validFrom"), item?.validFrom) ?? "", validUntil: promotionInputUtc(text("validUntil"), item?.validUntil) ?? "", minimumOrderAmount: promotionAmountInput(text("minimumOrderAmount")) ?? "", usageLimit: usageLimit ?? null, maxDiscountAmount: type === "PERCENTAGE" && text("maxDiscountAmount").trim() ? promotionAmountInput(text("maxDiscountAmount")) ?? "" : null };
    const next = validatePromotionContent(content), code = item?.code ?? promotionCode(text("code")), status = text("status") as PromotionStatus;
    if (usageLimit === undefined) next.usageLimit = "Nhập số lượt từ 1 đến 2147483647 hoặc để trống.";
    if (!validPromotionCode(code)) next.code = "Nhập mã khuyến mãi từ 1 đến 50 ký tự.";
    if (!item && !Object.hasOwn(PROMOTION_STATUSES, status)) next.status = "Chọn trạng thái ban đầu.";
    setErrors(next);
    if (Object.keys(next).length) { for (const field of Array.from(form.elements)) if ((field instanceof HTMLInputElement || field instanceof HTMLSelectElement) && next[field.name]) { field.focus(); break; } return; }
    await command.run(() => item ? updateAdminPromotion(accessToken, item.id, item.code, content) : createAdminPromotion(accessToken, code, content, status), saved => router.push(`${PROMOTION_BASE}/${saved.id}`));
  }
  const described = (key: string) => errors[key] ? `${key}-error` : undefined;
  function input(key: string, label: string, value: string, options: { optional?: boolean; date?: boolean; readOnly?: boolean; placeholder?: string } = {}) {
    return <FormField inputId={key} label={label} error={errors[key]} hint={options.readOnly ? "Không thể đổi mã." : undefined}><input id={key} name={key} className={INPUT} defaultValue={value} readOnly={options.readOnly} aria-readonly={options.readOnly || undefined} required={!options.optional} type="text" inputMode={!options.date && key !== "code" ? key === "usageLimit" ? "numeric" : "decimal" : undefined} placeholder={options.date ? "dd/mm/yyyy hh:mm" : options.placeholder} aria-invalid={!!errors[key]} aria-describedby={described(key) ?? (options.readOnly ? `${key}-help` : undefined)} /></FormField>;
  }
  return <div className="space-y-6 text-base [&_button]:text-base [&_label]:text-base"><Heading title={item ? "Sửa khuyến mãi" : "Thêm khuyến mãi"} /><Recovery command={command} refresh={refresh} />
    <form noValidate onSubmit={submit} onChange={event => { const target = event.target; if ((target instanceof HTMLInputElement || target instanceof HTMLSelectElement) && errors[target.name]) setErrors(current => { const next = { ...current }; delete next[target.name]; return next; }); }} aria-busy={command.busy}>
      <SurfaceCard className="space-y-6"><fieldset disabled={command.blocked} className="space-y-5"><legend className="sr-only">Thông tin khuyến mãi</legend>
        <div className="grid gap-5 lg:grid-cols-2">{input("code", "Mã khuyến mãi", item?.code ?? "", { readOnly: !!item })}<FormField inputId="discountType" label="Loại giảm giá" error={errors.discountType}><select id="discountType" name="discountType" className={INPUT} value={type} onChange={e => { setType(e.target.value as PromotionType); setErrors(current => { const next = { ...current }; delete next.discountValue; delete next.maxDiscountAmount; return next; }); }}>{Object.entries(PROMOTION_TYPES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></FormField>
          {input("discountValue", `Mức giảm (${type === "PERCENTAGE" ? "%" : "₫"})`, item?.discountValue.replace(".", ",") ?? "")}{type === "PERCENTAGE" && input("maxDiscountAmount", "Giảm tối đa (₫, không bắt buộc)", item?.maxDiscountAmount?.replace(".", ",") ?? "", { optional: true })}</div>
        <div><p className="mb-3 text-muted">Giờ Việt Nam</p><div className="grid gap-5 lg:grid-cols-2">{input("validFrom", "Ngày và giờ bắt đầu", item ? promotionDateInput(item.validFrom) : "", { date: true })}{input("validUntil", "Ngày và giờ kết thúc", item ? promotionDateInput(item.validUntil) : "", { date: true })}</div></div>
        <div className="grid gap-5 lg:grid-cols-2">{input("minimumOrderAmount", "Giá trị đơn hàng tối thiểu (₫)", item?.minimumOrderAmount.replace(".", ",") ?? "0")}{input("usageLimit", "Giới hạn lượt sử dụng (không bắt buộc)", item?.usageLimit?.toString() ?? "", { optional: true, placeholder: "Không giới hạn" })}</div>
        {!item && <FormField inputId="status" label="Trạng thái ban đầu" error={errors.status}><select id="status" name="status" className={INPUT} defaultValue="INACTIVE" required><option value="INACTIVE">Đã tắt</option><option value="ACTIVE">Đã bật</option></select></FormField>}
      </fieldset>{Object.keys(errors).length > 0 && <p role="alert" className="text-error">Vui lòng kiểm tra các trường được đánh dấu.</p>}
        <div className="flex flex-wrap justify-end gap-3"><Link className={LINK} href={item ? `${PROMOTION_BASE}/${item.id}` : PROMOTION_BASE} aria-disabled={command.busy} onClick={e => { if (command.busy) e.preventDefault(); }}>Hủy</Link><Button type="submit" disabled={command.blocked}>{command.busy ? "Đang lưu…" : item ? "Lưu thay đổi" : "Thêm khuyến mãi"}</Button></div>
      </SurfaceCard></form></div>;
}
