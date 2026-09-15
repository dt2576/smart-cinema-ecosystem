import assert from "node:assert/strict";
import test from "node:test";

const { renewAuthSession, revokeAuthSession } = await import("./auth-api" + ".ts") as typeof import("./auth-api");

test("token renewal sends the refresh credential and maps the rotated session", async () => {
  const originalFetch = globalThis.fetch;
  let requestedBody = "";
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "/api/v1/auth/token-renewals");
    assert.equal(init?.method, "POST");
    requestedBody = String(init?.body);
    return new Response(JSON.stringify({
      accessToken: "new-access",
      tokenType: "Bearer",
      expiresIn: 900,
      refreshToken: "new-refresh",
      refreshExpiresIn: 2_592_000,
      userId: 1,
      email: "customer@example.com",
      fullName: "Nguyen Van A",
      role: "CUSTOMER",
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const renewed = await renewAuthSession("old-refresh");
    assert.deepEqual(JSON.parse(requestedBody), { refreshToken: "old-refresh" });
    assert.equal(renewed.accessToken, "new-access");
    assert.equal(renewed.refreshToken, "new-refresh");
    assert.equal(renewed.user.role, "CUSTOMER");
    assert.ok(renewed.expiresAt > Date.now());
    assert.ok(renewed.refreshExpiresAt > renewed.expiresAt);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("logout submits the current refresh token with Bearer authentication", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "/api/v1/auth/token-revocations");
    assert.equal(init?.method, "POST");
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer current-access");
    assert.deepEqual(JSON.parse(String(init?.body)), { refreshToken: "current-refresh" });
    return new Response(null, { status: 204 });
  };

  try {
    await revokeAuthSession({
      accessToken: "current-access",
      tokenType: "Bearer",
      expiresAt: Date.now() + 900_000,
      refreshToken: "current-refresh",
      refreshExpiresAt: Date.now() + 2_592_000_000,
      user: { id: 1, email: "customer@example.com", fullName: "Nguyen Van A", role: "CUSTOMER" },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
