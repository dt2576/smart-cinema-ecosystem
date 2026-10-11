import type { Page } from "@playwright/test";
import { bookingFixture, historyFixture, ticketsFixture } from "../../fixtures/customer-entitlements";

// Backend HTTP fixtures only, not live provider or admission evidence.
export async function mockCustomerEntitlements(page: Page, seed = true) {
  if (seed) await page.addInitScript(() => {
    if (!localStorage.getItem("smart-cinema.auth-session")) localStorage.setItem("smart-cinema.auth-session", JSON.stringify({ accessToken: "qa-access", tokenType: "Bearer", expiresAt: Date.now() + 3600000, refreshToken: "qa-refresh", refreshExpiresAt: Date.now() + 86400000, user: { id: 1, email: "customer@example.test", fullName: "Khách hàng", role: "CUSTOMER" } }));
  });
  const booking = bookingFixture();
  const state = { booking, history: historyFixture(booking), entitlements: ticketsFixture(booking), historyError: 0, detailError: 0, ticketError: 0, delay: undefined as Promise<void> | undefined, requests: [] as { path: string; method: string; token: string }[] };
  await page.route(/\/api\/v1\/bookings(?:\?.*|\/\d+(?:\/tickets)?)?$/, async route => {
    const url = new URL(route.request().url()), token = route.request().headers().authorization;
    state.requests.push({ path: url.pathname + url.search, method: route.request().method(), token });
    if (state.delay) await state.delay;
    if (token !== "Bearer qa-access" || route.request().method() !== "GET") return route.fulfill({ status: 401, json: {} });
    if (url.pathname === "/api/v1/bookings") {
      if (state.historyError) return route.fulfill({ status: state.historyError, json: { detail: "private-token-sql" } });
      const pageIndex = Number(url.searchParams.get("page"));
      return route.fulfill({ json: { ...state.history, page: pageIndex, items: state.history.items.slice(pageIndex * 20, (pageIndex + 1) * 20) } });
    }
    if (!url.pathname.startsWith(`/api/v1/bookings/${state.booking.id}`)) return route.fulfill({ status: 404, json: {} });
    const isTickets = url.pathname.endsWith("/tickets"), error = isTickets ? state.ticketError : state.detailError;
    return error ? route.fulfill({ status: error, json: { detail: "private-token-sql" } }) : route.fulfill({ json: isTickets ? state.entitlements : state.booking });
  });
  return state;
}
