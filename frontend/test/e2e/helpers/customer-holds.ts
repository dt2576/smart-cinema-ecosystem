import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { mockDiscoveryReads } from "./customer-discovery";

type Hold = { id: string; showtimeId: string; seatId: string; status: "ACTIVE"; createdAt: string; expiresAt: string };
// HTTP contract simulator for isolated browser regression only. Live proof uses
// normal Customer JWTs and PostgreSQL, without any interception.
export async function mockCustomerHolds(page: Page, discovery: Awaited<ReturnType<typeof mockDiscoveryReads>>, authenticated = true) {
  const state = { holds: [] as Hold[], attachedHolds: [] as Hold[], otherSeats: [] as string[], posts: [] as string[][], deletes: [] as string[], failNext: 0, failRelease: false, lostResponse: false, closed: false, delay: undefined as Promise<void> | undefined };
  let lastTime = "2030-01-01T02:00:00Z";
  const time = async () => {
    // A focus refresh can be aborted by reload. Do not throw from the test
    // route handler when that old document has already been destroyed.
    try { lastTime = await page.evaluate(() => new Date(Date.now()).toISOString()); } catch { /* Aborted navigation request. */ }
    return lastTime;
  };
  if (authenticated) await page.addInitScript(() => {
    if (!sessionStorage.getItem("qa.disable-auto-login") && !localStorage.getItem("smart-cinema.auth-session")) localStorage.setItem("smart-cinema.auth-session", JSON.stringify({ accessToken: "qa-access", tokenType: "Bearer", expiresAt: Date.parse("2030-01-01T04:00:00Z"), refreshToken: "qa-refresh", refreshExpiresAt: Date.parse("2030-01-02T04:00:00Z"), user: { id: 1, email: "customer@example.test", fullName: "Customer", role: "CUSTOMER" } }));
  });
  discovery.setHoldOverlay(() => [...state.holds, ...state.attachedHolds].filter(hold => Date.parse(hold.expiresAt) > Date.parse(lastTime)).map(hold => hold.seatId).concat(state.otherSeats), time);
  await page.route(/\/api\/v1\/showtimes\/\d+\/seat-holds(?:\/\d+)?$/, async route => {
    const request = route.request(), method = request.method(), path = new URL(request.url()).pathname;
    const now = await time(); state.holds = state.holds.filter(hold => Date.parse(hold.expiresAt) > Date.parse(now));
    if (request.headers().authorization !== "Bearer qa-access") return route.fulfill({ status: 401, json: { detail: "Sign in required" } });
    if (method === "GET") return route.fulfill({ json: { serverTime: now, holds: state.closed ? [] : state.holds } });
    if (method === "DELETE") {
      const id = path.split("/").at(-1)!; state.deletes.push(id);
      if (state.attachedHolds.some(hold => hold.id === id)) return route.fulfill({ status: 409, json: { detail: "Attached Hold" } });
      if (state.failRelease) { state.failRelease = false; return route.fulfill({ status: 503, json: { detail: "Temporary release failure" } }); }
      state.holds = state.holds.filter(hold => hold.id !== id);
      return route.fulfill({ status: 204 });
    }
    const { seatIds } = request.postDataJSON(); state.posts.push(seatIds);
    if (state.delay) await state.delay;
    if (state.failNext) { const status = state.failNext; state.failNext = 0; return route.fulfill({ status, json: { detail: "private SQL must not reach the UI" } }); }
    if (state.closed || state.otherSeats.some(id => seatIds.includes(id)) || state.attachedHolds.some(hold => seatIds.includes(hold.seatId))) return route.fulfill({ status: 409, json: { detail: "Selection conflict" } });
    const existing = state.holds.filter(hold => seatIds.includes(hold.seatId));
    const deadline = new Date(Math.min(Date.parse(now) + 600000, ...existing.map(hold => Date.parse(hold.expiresAt)), Date.parse("2030-01-01T03:00:00Z"))).toISOString();
    for (const id of seatIds as string[]) if (!state.holds.some(hold => hold.seatId === id)) state.holds.push({ id: String(BigInt("9007199254750000") + BigInt(state.holds.length)), showtimeId: path.split("/")[4], seatId: id, status: "ACTIVE", createdAt: now, expiresAt: deadline });
    if (state.lostResponse) { state.lostResponse = false; return route.abort("failed"); }
    return route.fulfill({ json: { serverTime: now, holds: state.holds.filter(hold => seatIds.includes(hold.seatId)) } });
  });
  return state;
}
export async function confirmSelectedHolds(page: Page) {
  await page.getByRole("button", { name: "Hold selected Seats", exact: true }).click();
  await expect(page.getByRole("button", { name: "Create Booking & review", exact: true })).toBeEnabled();
}
