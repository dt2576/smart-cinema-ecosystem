import type { Page, Route } from "@playwright/test";
import type { BookingPromotionSnapshot } from "@/features/booking/booking.types";
import type { BookingState, concessionFixture } from "./customer-concessions";

type Terms = BookingPromotionSnapshot & { active: boolean; from: string; until: string; used: number; limit: number | null };
const decimal = (value: bigint) => { const raw = value.toString().padStart(5, "0"); return raw.slice(0, -4) + "." + raw.slice(-4); };
const minor = (value: string) => BigInt(value.replace(".", ""));
export function promotionFixture() {
  const terms = (code: string, type: Terms["type"], value: string, changes: Partial<Terms> = {}): Terms => ({ id: "9223372036854775807", code, type, value, minimumOrderAmount: "0.0000", maxDiscountAmount: null, active: true, from: "2029-01-01T00:00:00Z", until: "2031-01-01T00:00:00Z", used: 0, limit: null, ...changes });
  const masters = Object.fromEntries([
    terms("FIXED", "FIXED_AMOUNT", "1.2345"), terms("PERCENT", "PERCENTAGE", "10.0000", { id: "9007199254740993" }),
    terms("CAPPED", "PERCENTAGE", "100.0000", { maxDiscountAmount: "9.7500" }), terms("ZERO", "PERCENTAGE", "0.0000"), terms("FULL", "FIXED_AMOUNT", "999999.0000"),
    terms("MINIMUM", "FIXED_AMOUNT", "10.0000", { minimumOrderAmount: "90030.0000" }), terms("INACTIVE", "FIXED_AMOUNT", "10.0000", { active: false }),
    terms("EXPIRED", "FIXED_AMOUNT", "10.0000", { until: "2030-01-01T02:00:00Z" }), terms("FUTURE", "FIXED_AMOUNT", "10.0000", { from: "2030-01-02T00:00:00Z" }),
    terms("EXHAUSTED", "FIXED_AMOUNT", "10.0000", { used: 1, limit: 1 }),
  ].map(terms => [terms.code, terms]));
  return { masters, requests: [] as { method: string; path: string; body: unknown; authorization: string | undefined }[],
    rejectNext: 0, outcome: "" as "" | "lost" | "malformed" | "service", delay: undefined as Promise<void> | undefined, beforeWrite: undefined as (() => void) | undefined };
}
export type PromotionFixture = ReturnType<typeof promotionFixture>;

// Isolated HTTP server simulator, never production code or proof of Neon rules/persistence.
// PostgreSQL regression independently proves these supported policies.
export async function mockCustomerPromotions(page: Page, bookings: BookingState, concessions: ReturnType<typeof concessionFixture>, state = promotionFixture()) {
  let now = "2030-01-01T02:00:00Z";
  const clock = async () => { try { now = await page.evaluate(() => new Date(Date.now()).toISOString()); } catch { /* Navigated/aborted document. */ } return now; };
  const unavailable = (route: Route) => route.fulfill({ status: 409, json: { title: "Promotion unavailable", detail: "private SQL policy details" } });
  const quote = (code: string, subtotal: string, time: string) => {
    const p = state.masters[code];
    if (!p || !p.active || Date.parse(time) < Date.parse(p.from) || Date.parse(time) >= Date.parse(p.until) || minor(subtotal) < minor(p.minimumOrderAmount) || (p.limit !== null && p.used >= p.limit)) return null;
    const base = minor(subtotal);
    let discount = p.type === "FIXED_AMOUNT" ? minor(p.value) : base * minor(p.value) / BigInt(1000000);
    if (p.type === "PERCENTAGE") { if (p.maxDiscountAmount !== null && minor(p.maxDiscountAmount) < discount) discount = minor(p.maxDiscountAmount); discount = discount / BigInt(10000) * BigInt(10000); }
    if (discount > base) discount = base;
    const { id, type, value, minimumOrderAmount, maxDiscountAmount } = p;
    return { promotion: { id, code: p.code, type, value, minimumOrderAmount, maxDiscountAmount }, discount: decimal(discount), finalAmount: decimal(base - discount) };
  };
  await page.route(/\/api\/v1\/bookings\/\d+\/promotion$/, async route => {
    const request = route.request(), method = request.method(), path = new URL(request.url()).pathname;
    const body = method === "DELETE" ? undefined : request.postDataJSON();
    state.requests.push({ method, path, body, authorization: request.headers().authorization });
    if (state.delay) await state.delay;
    state.beforeWrite?.();
    const time = await clock(), b = bookings.booking;
    if (request.headers().authorization !== "Bearer qa-access") return route.fulfill({ status: 401, json: {} });
    if (!b || b.id !== path.split("/")[4]) return route.fulfill({ status: 404, json: {} });
    if (state.rejectNext) { const status = state.rejectNext; state.rejectNext = 0; return route.fulfill({ status, json: { detail: "private SQL owner" } }); }
    if (b.status !== "PENDING" || b.paymentStartedAt !== null || Date.parse(time) >= Date.parse(b.expiresAt) || Date.parse(time) >= Date.parse(b.startsAt)) return route.fulfill({ status: 409, json: {} });
    if (method === "PUT") {
      const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
      if (!code || code.length > 50 || Object.keys(body).length !== 1) return route.fulfill({ status: 400, json: {} });
      const result = quote(code, b.subtotal, time); if (!result) return unavailable(route);
      Object.assign(b, result);
    } else Object.assign(b, { promotion: null, discount: "0.0000", finalAmount: b.subtotal });
    const outcome = state.outcome; state.outcome = "";
    if (outcome === "lost") return route.abort("failed");
    if (outcome === "service") return route.fulfill({ status: 503, json: { detail: "private SQL committed" } });
    return route.fulfill({ json: { ...b, serverTime: time, ...(outcome === "malformed" ? { expiresAt: "2030-01-01T02:30:00Z" } : {}) } });
  });
  // Independent new-test override preserves original Concession scenarios and helper byte-for-byte.
  await page.route(/\/api\/v1\/bookings\/\d+\/concessions(?:\/\d+)?$/, async route => {
    const request = route.request(), method = request.method(), path = new URL(request.url()).pathname, body = method === "DELETE" ? undefined : request.postDataJSON();
    concessions.requests.push({ method, path, body, authorization: request.headers().authorization });
    const time = await clock(), b = bookings.booking;
    if (!b || b.id !== path.split("/")[4]) return route.fulfill({ status: 404, json: {} });
    if (b.status !== "PENDING" || b.paymentStartedAt !== null || Date.parse(time) >= Date.parse(b.expiresAt)) return route.fulfill({ status: 409, json: {} });
    const lines = structuredClone(b.concessions);
    if (method === "POST") {
      const item = concessions.catalog.find(item => item.id === body.itemId); if (!item) return route.fulfill({ status: 409, json: {} });
      lines.push({ id: String(concessions.nextLine++), itemId: item.id, name: item.name, category: item.category, quantity: body.quantity, unitPrice: item.sellingPrice, totalPrice: "0.0000" });
    } else {
      const index = lines.findIndex(line => line.id === path.split("/").at(-1)); if (index === -1) return route.fulfill({ status: 404, json: {} });
      if (method === "DELETE") lines.splice(index, 1); else lines[index].quantity = body.quantity;
    }
    for (const line of lines) line.totalPrice = decimal(minor(line.unitPrice) * BigInt(line.quantity));
    const concessionAmount = decimal(lines.reduce((sum, line) => sum + minor(line.totalPrice), BigInt(0))), subtotal = decimal(minor(b.seatAmount) + minor(concessionAmount));
    const result = b.promotion ? quote(b.promotion.code, subtotal, time) : { promotion: null, discount: "0.0000", finalAmount: subtotal };
    if (!result) return unavailable(route); // Whole edit rolls back; no forced Promotion removal.
    Object.assign(b, { concessions: lines, concessionAmount, subtotal, ...result });
    return route.fulfill({ json: { ...b, serverTime: time } });
  });
  return state;
}
