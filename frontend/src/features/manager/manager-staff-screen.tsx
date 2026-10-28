"use client";

import { useCallback, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { useManager } from "@/features/manager/manager-shell";
import { getManagerCinema, getManagerStaff } from "@/features/manager/manager-api";
import { useMovieRequest } from "@/features/movie/use-movie-request";
import { staffDate } from "@/features/admin/admin-staff-service";
import { OperationsCard, OperationsEmpty, OperationsFrame, OperationsState, OP_INPUT } from "@/features/manager/operations-ui";

export function ManagerStaffScreen({ cinemaId }: { cinemaId?: string }) {
  const { accessToken, cinemas } = useManager(); const [selected, setSelected] = useState(cinemaId ?? cinemas[0]?.id ?? "");
  const load = useCallback(async (signal: AbortSignal) => { if (!selected) return null; const [cinema, staff] = await Promise.all([getManagerCinema(accessToken, selected, signal), getManagerStaff(accessToken, selected, signal)]); return { cinema, staff }; }, [accessToken, selected]); const result = useMovieRequest(load);
  return <OperationsFrame title="Nhân viên tại rạp"><StatusBadge>Chỉ xem</StatusBadge><label className="block max-w-xl">Rạp chiếu phim<select aria-label="Rạp chiếu phim" className={OP_INPUT} value={selected} onChange={e => setSelected(e.target.value)}><option value="">Chọn rạp</option>{cinemas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    {result.loading || result.error ? <OperationsState {...result} /> : !result.data?.staff.length ? <OperationsEmpty message="Chưa có nhân viên trong phân công hiện hành tại rạp này." /> : <><h2 className="text-2xl font-semibold">{result.data.cinema.name}</h2><div className="grid gap-4 lg:grid-cols-2">{result.data.staff.map(s => <OperationsCard key={s.id}><h3 className="text-xl font-semibold">{s.fullName}</h3><p>Mã nhân viên: {s.id}</p><p>{s.email}</p><p>{s.phone}</p><StatusBadge tone={s.status === "ACTIVE" ? "success" : "error"}>{s.status === "ACTIVE" ? "Tài khoản hoạt động" : "Tài khoản bị khóa"}</StatusBadge><p>Phân công từ: {staffDate(s.effectiveAt)}</p></OperationsCard>)}</div></>}
  </OperationsFrame>;
}
