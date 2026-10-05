import type { SeatHoldBatch } from "@/features/seat/seat-hold.types";

const MAX_ID = "9223372036854775807";
export function isSeatHoldId(id: unknown): id is string {
  return typeof id === "string" && /^[1-9][0-9]{0,18}$/.test(id) && (id.length < MAX_ID.length || id <= MAX_ID);
}
export class SeatHoldApiError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(status === 400 ? "Lựa chọn ghế không hợp lệ. Cập nhật sơ đồ và chọn lại."
      : status === 401 ? "Phiên đăng nhập đã kết thúc. Đăng nhập lại để quản lý ghế đang giữ."
      : status === 403 ? "Cần tài khoản khách hàng đang hoạt động để quản lý ghế đang giữ."
      : status === 404 ? "Lượt giữ ghế hoặc suất chiếu không còn khả dụng. Cập nhật để kiểm tra lựa chọn."
      : status === 409 ? "Lựa chọn ghế bị xung đột. Ghế có thể đang được giữ, không khả dụng, đã gắn với đơn đặt vé hoặc quá hạn đặt vé. Cập nhật và chọn lại."
      : "Không thể kết nối hoặc xác nhận dịch vụ ghế. Cập nhật trước khi thử lại.");
    this.name = "SeatHoldApiError";
    this.status = status;
  }
}
async function request(showtimeId: string, accessToken: string, signal: AbortSignal, method: "GET" | "POST" | "DELETE", holdId?: string, seatIds?: string[]): Promise<SeatHoldBatch | void> {
  if (!isSeatHoldId(showtimeId) || (holdId !== undefined && !isSeatHoldId(holdId)) || (seatIds && (!seatIds.length || !seatIds.every(isSeatHoldId) || new Set(seatIds).size !== seatIds.length))) throw new SeatHoldApiError(400);
  if (!accessToken) throw new SeatHoldApiError(401);
  let response: Response;
  try {
    response = await fetch(`/api/v1/showtimes/${showtimeId}/seat-holds${holdId ? `/${holdId}` : ""}`, {
      method, signal, cache: "no-store", credentials: "omit",
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}`, ...(seatIds ? { "Content-Type": "application/json" } : {}) },
      ...(seatIds ? { body: JSON.stringify({ seatIds }) } : {}),
    });
  } catch (error) { if (signal.aborted) throw error; throw new SeatHoldApiError(0); }
  // Never display arbitrary upstream/SQL details or infer ownership from public HELD.
  if (!response.ok) throw new SeatHoldApiError(response.status);
  if (method === "DELETE") { if (response.status !== 204) throw new SeatHoldApiError(502); return; }
  const batch: SeatHoldBatch = await response.json().catch(() => { throw new SeatHoldApiError(502); });
  if (!batch || !Number.isFinite(Date.parse(batch.serverTime)) || !Array.isArray(batch.holds)
    || batch.holds.some(hold => !hold || !isSeatHoldId(hold.id) || !isSeatHoldId(hold.seatId) || hold.showtimeId !== showtimeId || hold.status !== "ACTIVE"
      || !Number.isFinite(Date.parse(hold.createdAt)) || !(Date.parse(hold.expiresAt) > Date.parse(hold.createdAt)))
    || new Set(batch.holds.map(hold => hold.id)).size !== batch.holds.length
    || new Set(batch.holds.map(hold => hold.seatId)).size !== batch.holds.length) throw new SeatHoldApiError(502);
  if (seatIds && (batch.holds.length !== seatIds.length || batch.holds.some(hold => !seatIds.includes(hold.seatId)))) throw new SeatHoldApiError(502);
  return batch;
}
export async function getOwnedSeatHolds(showtimeId: string, token: string, signal: AbortSignal): Promise<SeatHoldBatch> {
  return (await request(showtimeId, token, signal, "GET"))!;
}
export async function acquireSeatHolds(showtimeId: string, seatIds: string[], token: string, signal: AbortSignal): Promise<SeatHoldBatch> {
  return (await request(showtimeId, token, signal, "POST", undefined, seatIds))!;
}
export async function releaseSeatHold(showtimeId: string, holdId: string, token: string, signal: AbortSignal): Promise<void> {
  await request(showtimeId, token, signal, "DELETE", holdId);
}
