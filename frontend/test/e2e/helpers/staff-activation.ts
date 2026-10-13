import type { Page } from "@playwright/test";

// HTTP fixtures only. No real invitations, credentials, mail or account mutation.
export async function mockStaffActivation(page: Page) {
  const state = {
    status: 204, lost: false, redirect: false, retryAfter: "60", delay: undefined as Promise<void> | undefined,
    requests: [] as { url: string; method: string; body: Record<string, unknown>; headers: Record<string, string> }[],
  };
  await page.route(/\/api\/v1\/staff\/password-setups(?:\?.*)?$/, async route => {
    const request = route.request();
    state.requests.push({ url: request.url(), method: request.method(), body: request.postDataJSON() as Record<string, unknown>, headers: request.headers() });
    if (state.delay) await state.delay;
    if (state.lost) return route.abort("failed");
    if (state.redirect) return route.fulfill({ status: 302, headers: { Location: "https://forbidden.example.test/" } });
    if (state.status === 204) return route.fulfill({ status: 204, headers: { "Cache-Control": "no-store" } });
    return route.fulfill({ status: state.status, headers: { "Cache-Control": "no-store", "Retry-After": state.retryAfter }, json: { detail: "private-account-token-password-sql", activated: true, status: 204 } });
  });
  return state;
}

export async function seedStaffActivationSession(page: Page, role: string) {
  await page.addInitScript(({ role }) => {
    localStorage.setItem("smart-cinema.auth-session", JSON.stringify({ accessToken: "qa-activation-current-access", tokenType: "Bearer", expiresAt: Date.now() + 3600000, refreshToken: "qa-activation-current-refresh", refreshExpiresAt: Date.now() + 86400000, user: { id: 37, email: "existing@example.test", fullName: "Tài khoản hiện có", role } }));
  }, { role });
}
