import type { Page } from "@playwright/test";
import type { ConcessionCatalogItem } from "@/features/concession/concession-api";
import type { mockCustomerBookings } from "./customer-bookings";

export const POPCORN_ID = "9223372036854775807", DRINK_ID = "9007199254740993", ZERO_ID = "9007199254740994";
export type BookingState = Awaited<ReturnType<typeof mockCustomerBookings>>;
export function concessionFixture() {
  return {
    catalog: [
      { id: POPCORN_ID, name: "Bắp rang thật", description: "Thông tin từ catalog.", category: "POPCORN", sellingPrice: "10.1234", imageUrl: null },
      { id: DRINK_ID, name: "Nước uống", description: null, category: "DRINK", sellingPrice: "0.0001", imageUrl: null },
      { id: ZERO_ID, name: "Món giá không", description: null, category: "COMBO", sellingPrice: "0.0000", imageUrl: null },
    ] as ConcessionCatalogItem[],
    requests: [] as { method: string; path: string; body: unknown; authorization: string | undefined }[],
    catalogReads: 0, catalogError: 0, rejectNext: 0, lostResponse: false, invalidReceipt: false,
    delay: undefined as Promise<void> | undefined, beforeWrite: undefined as (() => void) | undefined,
    nextLine: BigInt("9007199254780001"),
  };
}
// HTTP fixtures for browser regression, never proof of Neon persistence.
export async function mockCustomerConcessions(page: Page, bookings: BookingState, state = concessionFixture()) {
  let now = "2030-01-01T02:00:00Z";
  const clock = async () => { try { now = await page.evaluate(() => new Date(Date.now()).toISOString()); } catch { /* Document navigated. */ } return now; };
  await page.route(/\/api\/v1\/concession-items$/, async route => {
    state.catalogReads++;
    if (state.catalogError) return route.fulfill({ status: state.catalogError, json: { detail: "private SQL catalog" } });
    return route.fulfill({ json: state.catalog });
  });
  await page.route(/\/api\/v1\/bookings\/\d+$/, async route => {
    if (route.request().method() !== "GET") return route.fallback();
    bookings.reads++;
    const currentTime = await clock();
    if (route.request().headers().authorization !== "Bearer qa-access") return route.fulfill({ status: 401, json: {} });
    if (bookings.readError) return route.fulfill({ status: bookings.readError, json: { detail: "private SQL owner" } });
    if (!bookings.booking || !route.request().url().endsWith(`/${bookings.booking.id}`)) return route.fulfill({ status: 404, json: {} });
    if (bookings.booking.status === "PENDING" && Date.parse(currentTime) >= Date.parse(bookings.booking.expiresAt)) bookings.booking.status = "EXPIRED";
    return route.fulfill({ json: { ...bookings.booking, serverTime: currentTime } });
  });
  await page.route(/\/api\/v1\/bookings\/\d+\/concessions(?:\/\d+)?$/, async route => {
    const request = route.request(), method = request.method(), path = new URL(request.url()).pathname;
    const body = method === "DELETE" ? undefined : request.postDataJSON();
    state.requests.push({ method, path, body, authorization: request.headers().authorization });
    if (state.delay) await state.delay;
    state.beforeWrite?.();
    const currentTime = await clock(), b = bookings.booking;
    if (request.headers().authorization !== "Bearer qa-access") return route.fulfill({ status: 401, json: {} });
    if (!b || path.split("/")[4] !== b.id) return route.fulfill({ status: 404, json: {} });
    if (state.rejectNext) { const status = state.rejectNext; state.rejectNext = 0; return route.fulfill({ status, json: { detail: "private SQL owner" } }); }
    if (b.status !== "PENDING" || b.paymentStartedAt !== null || Date.parse(b.expiresAt) <= Date.parse(currentTime)) return route.fulfill({ status: 409, json: {} });
    const lines = structuredClone(b.concessions);
    if (method === "POST") {
      const item = state.catalog.find(item => item.id === body.itemId);
      if (!item) return route.fulfill({ status: 409, json: {} });
      lines.push({ id: String(state.nextLine++), itemId: item.id, name: item.name, category: item.category, quantity: body.quantity, unitPrice: item.sellingPrice, totalPrice: "0.0000" });
    } else {
      const index = lines.findIndex(line => line.id === path.split("/").at(-1));
      if (index === -1) return route.fulfill({ status: 404, json: {} });
      if (method === "DELETE") lines.splice(index, 1); else lines[index].quantity = body.quantity;
    }
    const decimal = (value: bigint) => { const raw = value.toString().padStart(5, "0"); return raw.slice(0, -4) + "." + raw.slice(-4); };
    for (const line of lines) line.totalPrice = decimal(BigInt(line.unitPrice.replace(".", "")) * BigInt(line.quantity));
    const concessionAmount = lines.reduce((sum, line) => sum + BigInt(line.totalPrice.replace(".", "")), BigInt(0));
    const subtotal = BigInt(b.seatAmount.replace(".", "")) + concessionAmount;
    Object.assign(b, { concessions: lines, concessionAmount: decimal(concessionAmount), subtotal: decimal(subtotal), finalAmount: decimal(subtotal - BigInt(b.discount.replace(".", ""))) });
    if (state.lostResponse) { state.lostResponse = false; return route.abort("failed"); }
    return route.fulfill({ json: { ...b, serverTime: currentTime, ...(state.invalidReceipt ? { expiresAt: "2030-01-01T02:30:00Z" } : {}) } });
  });
  return state;
}
