import { test } from "node:test";
import assert from "node:assert/strict";
import { captureStaffInvitation, isStaffInvitationToken, parseStaffInvitationFragment, staffPasswordError, validateStaffPasswords, setupStaffPassword, StaffActivationApiError, staffActivationRetryAfter } from "@/features/staff/staff-activation-service";
const { STAFF_INVITATION_FIXTURE: TOKEN, STAFF_PASSWORD_FIXTURE: PASSWORD } = await import("../../../test/fixtures/staff-activation" + ".ts") as typeof import("../../../test/fixtures/staff-activation");

test("invitation validates all canonical32-byte endings and rejects altered encoding", () => {
  for (const ending of "AEIMQUYcgkosw048") assert.equal(isStaffInvitationToken("x".repeat(42) + ending), true);
  for (const value of ["x".repeat(42) + "B", TOKEN + "=", TOKEN.slice(1), TOKEN + "A", " " + TOKEN, TOKEN.toLowerCase(), "😀".repeat(43), null, 1]) assert.equal(isStaffInvitationToken(value), false);
});
test("fragment parser is exact: no decoding, duplicate, extra, query or external value", () => {
  assert.deepEqual(parseStaffInvitationFragment("#token=" + TOKEN), { kind: "ready", token: TOKEN });
  assert.deepEqual(parseStaffInvitationFragment(""), { kind: "missing" });
  for (const value of ["#", "#TOKEN=" + TOKEN, "?token=" + TOKEN, "#token=%41" + TOKEN.slice(1), "#token=" + TOKEN + "&token=" + TOKEN, "#token=" + TOKEN + "&next=https://evil.test", "#token=https://evil.test"]) assert.deepEqual(parseStaffInvitationFragment(value), { kind: "malformed" });
});
test("capture clears URL first, preserves only existing routing state, reads no query", () => {
  let cleared = false; const state = { __NA: true }; const location = { hash: "#token=" + TOKEN, get search(): never { throw new Error("must not read query"); } };
  const capture = captureStaffInvitation(location, { state, replaceState(data, unused, url) { assert.equal(data, state); assert.equal(unused, ""); assert.equal(url, "/staff/activate"); cleared = true; } });
  assert.equal(cleared, true); assert.deepEqual(capture, { kind: "ready", token: TOKEN });
});
test("password mirrors Java minimum, nonblank and well-formed UTF16 without new strength policy", () => {
  for (const value of ["12345678", "😀".repeat(4), "\u00a0".repeat(8), PASSWORD, "pass\u0000word"]) assert.equal(staffPasswordError(value), undefined);
  for (const value of ["", "1234567", " ".repeat(8), "\u2000".repeat(8), "password\uD800", "password\uDC00"]) assert.equal(typeof staffPasswordError(value), "string");
});
test("UTF8 limit is72 bytes, including composed, decomposed and astral passwords", () => {
  for (const value of ["a".repeat(72), "é".repeat(36), "e\u0301".repeat(24), "😀".repeat(18)]) assert.equal(staffPasswordError(value), undefined);
  for (const value of ["a".repeat(73), "é".repeat(37), "e\u0301".repeat(25), "😀".repeat(19)]) assert.match(staffPasswordError(value)!, /72 byte/);
});
test("confirmation is exact with no trimming or Unicode normalization", () => {
  assert.deepEqual(validateStaffPasswords(PASSWORD, PASSWORD), {});
  for (const confirmation of [PASSWORD.trim(), PASSWORD.normalize("NFC"), "", "different-password"]) assert.ok(validateStaffPasswords(PASSWORD, confirmation).confirmation);
});
test("public transport sends exact confidential POST and accepts204 only, no JSON read", async () => {
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++; assert.equal(url, "/api/v1/staff/password-setups"); assert.equal(options?.method, "POST"); assert.deepEqual(options?.headers, { "Content-Type": "application/json" });
    assert.equal(options?.credentials, "omit"); assert.equal(options?.cache, "no-store"); assert.equal(options?.redirect, "error"); assert.equal(options?.referrerPolicy, "no-referrer");
    assert.deepEqual(JSON.parse(String(options?.body)), { token: TOKEN, password: PASSWORD });
    const response = new Response(null, { status: 204 }); response.json = async () => { throw new Error("204 must not parse payload"); }; return response;
  };
  try { await setupStaffPassword(TOKEN, PASSWORD, new AbortController().signal); assert.equal(calls, 1); } finally { globalThis.fetch = original; }
});
test("invalid credentials and pre-aborted calls never send any request", async () => {
  const original = globalThis.fetch; let calls = 0; globalThis.fetch = async () => { calls++; return new Response(null, { status: 204 }); };
  try {
    await assert.rejects(setupStaffPassword("bad-token", PASSWORD, new AbortController().signal), StaffActivationApiError);
    await assert.rejects(setupStaffPassword(TOKEN, "short", new AbortController().signal), StaffActivationApiError);
    const stop = new AbortController(); stop.abort(); await assert.rejects(setupStaffPassword(TOKEN, PASSWORD, stop.signal), StaffActivationApiError); assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }
});
test("public4xx are generic and contain neither server detail nor account information", async () => {
  const original = globalThis.fetch;
  try { for (const status of [400, 401, 403, 404, 409, 422]) {
    globalThis.fetch = async () => Response.json({ detail: `private ${TOKEN} ${PASSWORD} sql` }, { status });
    await assert.rejects(setupStaffPassword(TOKEN, PASSWORD, new AbortController().signal), e => e instanceof StaffActivationApiError && e.outcome === "unavailable" && !e.message.includes(TOKEN) && !e.message.includes(PASSWORD) && !e.message.includes("sql"));
  } } finally { globalThis.fetch = original; }
});
test("429 respects safeRetryAfter without a timer request or retry", async () => {
  const original = globalThis.fetch; let calls = 0; globalThis.fetch = async () => { calls++; return Response.json({}, { status: 429, headers: { "Retry-After": "60" } }); };
  try { await assert.rejects(setupStaffPassword(TOKEN, PASSWORD, new AbortController().signal), e => e instanceof StaffActivationApiError && e.outcome === "throttled" && e.retryAfter === 60); assert.equal(calls, 1); } finally { globalThis.fetch = original; }
  assert.equal(staffActivationRetryAfter(null), 60); assert.equal(staffActivationRetryAfter("unsafe"), 60); assert.equal(staffActivationRetryAfter("999999"), 60);
  assert.equal(staffActivationRetryAfter("Thu, 01 Jan 2026 00:01:00 GMT", Date.parse("2026-01-01T00:00:00Z")), 60);
});
test("5xx, misleading2xx and transport errors cannot claim confirmed setup", async () => {
  const original = globalThis.fetch;
  try {
    for (const status of [200, 201, 202, 500, 502, 503]) { globalThis.fetch = async () => Response.json({ status: 204, activated: true }, { status }); await assert.rejects(setupStaffPassword(TOKEN, PASSWORD, new AbortController().signal), e => e instanceof StaffActivationApiError && e.outcome === "uncertain"); }
    globalThis.fetch = async () => { throw new Error(`private ${TOKEN} ${PASSWORD}`); }; await assert.rejects(setupStaffPassword(TOKEN, PASSWORD, new AbortController().signal), e => e instanceof StaffActivationApiError && e.outcome === "uncertain" && !e.message.includes(TOKEN));
  } finally { globalThis.fetch = original; }
});
test("finite transport deadline aborts once and keeps outcome uncertain", async context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const original = globalThis.fetch; let calls = 0, aborted = false;
  globalThis.fetch = async (_url, options) => { calls++; return new Promise<Response>((_resolve, reject) => options?.signal?.addEventListener("abort", () => { aborted = true; reject(new Error("private timeout")); })); };
  try { const pending = setupStaffPassword(TOKEN, PASSWORD, new AbortController().signal); const check = assert.rejects(pending, e => e instanceof StaffActivationApiError && e.outcome === "uncertain"); context.mock.timers.tick(15_000); await check; assert.equal(aborted, true); assert.equal(calls, 1); } finally { globalThis.fetch = original; context.mock.timers.reset(); }
});
