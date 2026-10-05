import { isBookingId, validateBooking } from "@/features/booking/booking-api";
import type { Booking } from "@/features/booking/booking.types";
import type { ConcessionCategory } from "@/features/concession/concession.types";

export interface ConcessionCatalogItem {
  id: string; name: string; description: string | null;
  category: ConcessionCategory; sellingPrice: string; imageUrl: string | null;
}
export type ConcessionCommand = { operation: "ADD"; itemId: string; quantity: number }
  | { operation: "UPDATE"; lineId: string; quantity: number }
  | { operation: "REMOVE"; lineId: string };

export class ConcessionApiError extends Error {
  readonly status: number;
  readonly outcomeUncertain: boolean;
  constructor(status: number, outcomeUncertain = false) {
    super(status === 400 ? "Món hoặc số lượng không hợp lệ. Vui lòng kiểm tra lại."
      : status === 401 ? "Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại."
      : status === 403 ? "Cần tài khoản khách hàng đang hoạt động để chỉnh sửa bắp nước."
      : status === 404 ? "Đơn đặt vé hoặc món đã lưu không khả dụng cho tài khoản của bạn."
      : status === 409 ? "Chưa thể lưu bắp nước. Món có thể đã ngừng bán, đơn không còn cho phép chỉnh sửa hoặc số tiền vượt giới hạn. Dữ liệu đang được kiểm tra lại."
      : "Không thể kết nối hoặc xác nhận phản hồi bắp nước. Vui lòng tải lại dữ liệu từ máy chủ.");
    this.name = "ConcessionApiError"; this.status = status; this.outcomeUncertain = outcomeUncertain;
  }
}

export function parseConcessionQuantity(value: string): number | null {
  if (!/^[1-9][0-9]{0,9}$/.test(value)) return null;
  const quantity = Number(value);
  return quantity <= 2147483647 ? quantity : null;
}

export function validateConcessionCatalog(value: unknown): ConcessionCatalogItem[] {
  if (!Array.isArray(value) || value.some(item => !item || !isBookingId(item.id)
    || typeof item.name !== "string" || !item.name.trim()
    || !["POPCORN", "DRINK", "COMBO"].includes(item.category)
    || typeof item.sellingPrice !== "string" || !/^\d{1,15}\.\d{4}$/.test(item.sellingPrice)
    || (item.description !== null && typeof item.description !== "string")
    || (item.imageUrl !== null && typeof item.imageUrl !== "string"))
    || new Set(value.map(item => item.id)).size !== value.length) throw new ConcessionApiError(502);
  // The endpoint already filters ACTIVE items. It exposes no stock/status field.
  return value.map(({ id, name, description, category, sellingPrice, imageUrl }) => ({ id, name, description, category, sellingPrice, imageUrl }));
}

export async function getConcessionCatalog(signal: AbortSignal): Promise<ConcessionCatalogItem[]> {
  let response: Response;
  try { response = await fetch("/api/v1/concession-items", { signal, cache: "no-store", credentials: "omit", headers: { Accept: "application/json" } }); }
  catch (error) { if (signal.aborted) throw error; throw new ConcessionApiError(0); }
  if (!response.ok) throw new ConcessionApiError(response.status);
  try { return validateConcessionCatalog(await response.json()); }
  catch { throw new ConcessionApiError(502); }
}

export async function editBookingConcession(before: Booking, command: ConcessionCommand, token: string, signal: AbortSignal): Promise<Booking> {
  if (!isBookingId(before.id) || !(command.operation === "ADD" ? isBookingId(command.itemId) : isBookingId(command.lineId))
    || (command.operation !== "REMOVE" && (!Number.isInteger(command.quantity) || command.quantity < 1 || command.quantity > 2147483647))) throw new ConcessionApiError(400);
  if (!token) throw new ConcessionApiError(401);
  const path = `/api/v1/bookings/${before.id}/concessions${command.operation === "ADD" ? "" : `/${command.lineId}`}`;
  const body = command.operation === "ADD" ? { itemId: command.itemId, quantity: command.quantity } : command.operation === "UPDATE" ? { quantity: command.quantity } : undefined;
  let response: Response;
  try {
    response = await fetch(path, { method: command.operation === "ADD" ? "POST" : command.operation === "UPDATE" ? "PATCH" : "DELETE",
      signal, cache: "no-store", credentials: "omit", headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
  } catch (error) { if (signal.aborted) throw error; throw new ConcessionApiError(0, true); }
  if (!response.ok) throw new ConcessionApiError(response.status, response.status >= 500);
  try {
    const booking = validateBooking(await response.json());
    if (booking.id !== before.id || booking.showtimeId !== before.showtimeId || booking.createdAt !== before.createdAt
      || booking.expiresAt !== before.expiresAt || booking.seatAmount !== before.seatAmount
      || JSON.stringify(booking.seats) !== JSON.stringify(before.seats)) throw new Error("Invalid composition receipt");
    return booking;
  } catch { throw new ConcessionApiError(502, true); }
}
