import { test } from "node:test";
import assert from "node:assert/strict";
import { StaffActivationController } from "@/features/staff/staff-activation-controller";
import { StaffActivationApiError } from "@/features/staff/staff-activation-service";
const { STAFF_INVITATION_FIXTURE: TOKEN, STAFF_REPLACEMENT_INVITATION_FIXTURE: NEXT, STAFF_PASSWORD_FIXTURE: PASSWORD } = await import("../../../test/fixtures/staff-activation" + ".ts") as typeof import("../../../test/fixtures/staff-activation");
function deferred() { let resolve!: () => void, reject!: (error: unknown) => void; const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function setup(transport?: (token: string, password: string, signal: AbortSignal) => Promise<void>) {
  const calls: { token: string; password: string; signal: AbortSignal }[] = [];
  const controller = new StaffActivationController(async (token, password, signal) => { calls.push({ token, password, signal }); if (transport) await transport(token, password, signal); });
  const detach = controller.attach(() => ({ kind: "ready", token: TOKEN })); return { controller, calls, detach };
}

test("capture enables form but never redeems or exposes a token in snapshot", () => {
  const s = setup(); assert.equal(s.calls.length, 0); assert.equal(s.controller.getSnapshot().stage, "ready"); assert.equal(JSON.stringify(s.controller.getSnapshot()).includes(TOKEN), false); assert.equal(JSON.stringify(s.controller).includes(TOKEN), false); s.detach();
});
test("missing and malformed credentials cannot submit", async () => {
  for (const kind of ["missing", "malformed"] as const) { const s = setup(); s.controller.navigate(() => ({ kind })); await s.controller.submit(PASSWORD, PASSWORD); assert.equal(s.calls.length, 0); assert.equal(s.controller.getSnapshot().stage, kind); s.detach(); }
});
test("validation is editable without consuming invitation or sending a request", async () => {
  const s = setup(); await s.controller.submit("short", "mismatch"); assert.ok(s.controller.getSnapshot().errors.password); s.controller.edit("password"); assert.equal(s.controller.getSnapshot().errors.password, undefined); assert.ok(s.controller.getSnapshot().errors.confirmation); assert.equal(s.calls.length, 0); await s.controller.submit(PASSWORD, PASSWORD); assert.equal(s.calls.length, 1); s.detach();
});
test("rapid confirmation is one pending operation, no optimistic activated state", async () => {
  const response = deferred(), s = setup(async () => response.promise); const first = s.controller.submit(PASSWORD, PASSWORD); await s.controller.submit(PASSWORD, PASSWORD);
  assert.equal(s.calls.length, 1); assert.equal(s.controller.getSnapshot().stage, "submitting"); assert.equal(s.controller.getSnapshot().message.includes("thành công"), false); response.resolve(); await first;
  assert.equal(s.controller.getSnapshot().stage, "awaiting-admin"); assert.deepEqual(s.controller.getSnapshot().errors, {}); await s.controller.submit(PASSWORD, PASSWORD); assert.equal(s.calls.length, 1); s.detach();
});
test("rejected, throttled and uncertain results never replay or retain usable credential", async () => {
  for (const outcome of ["unavailable", "throttled", "uncertain"] as const) {
    const s = setup(async () => { throw new StaffActivationApiError(outcome, 60); }); await s.controller.submit(PASSWORD, PASSWORD); assert.equal(s.controller.getSnapshot().stage, outcome); await s.controller.submit(PASSWORD, PASSWORD); assert.equal(s.calls.length, 1); assert.equal(JSON.stringify(s.controller.getSnapshot()).includes(TOKEN), false); s.detach();
  }
});
test("unclassified failures use fixed uncertainty, not secrets or fake failure", async () => {
  const s = setup(async () => { throw new Error(`${TOKEN} ${PASSWORD}`); }); await s.controller.submit(PASSWORD, PASSWORD); assert.equal(s.controller.getSnapshot().stage, "uncertain"); assert.equal(s.controller.getSnapshot().message.includes(TOKEN), false); s.detach();
});
test("new fragment context ignores old committed response and uses only new token", async () => {
  const old = deferred(), s = setup(async token => { if (token === TOKEN) await old.promise; }); const pending = s.controller.submit(PASSWORD, PASSWORD); s.controller.navigate(() => ({ kind: "ready", token: NEXT }));
  assert.equal(s.calls[0].signal.aborted, true); old.resolve(); await pending; assert.equal(s.controller.getSnapshot().stage, "ready"); await s.controller.submit(PASSWORD, PASSWORD); assert.equal(s.calls[1].token, NEXT); s.detach();
});
test("session/pagehide interruption aborts, clears fields and ignores late204", async () => {
  const response = deferred(), s = setup(async () => response.promise); const pending = s.controller.submit(PASSWORD, PASSWORD); s.controller.interrupt(); assert.equal(s.calls[0].signal.aborted, true); response.resolve(); await pending; assert.equal(s.controller.getSnapshot().stage, "uncertain"); await s.controller.submit(PASSWORD, PASSWORD); assert.equal(s.calls.length, 1); s.detach();
});
test("real disposal cancels immediately and clears invitation next microtask", async () => {
  const s = setup(); s.detach(); await Promise.resolve(); assert.equal(s.controller.getSnapshot().stage, "interrupted"); await s.controller.submit(PASSWORD, PASSWORD); assert.equal(s.calls.length, 0);
});
test("StrictMode synchronous reattachment preserves captured invitation, never recaptures", async () => {
  const s = setup(); s.detach(); const detach = s.controller.attach(() => { throw new Error("fragment already scrubbed"); }); await Promise.resolve(); assert.equal(s.controller.getSnapshot().stage, "ready"); await s.controller.submit(PASSWORD, PASSWORD); assert.equal(s.calls[0].token, TOKEN); detach();
});
test("refresh/back missing fragment cannot recreate an invitation or re-submit", async () => {
  const s = setup(); s.controller.navigate(() => ({ kind: "missing" })); await s.controller.submit(PASSWORD, PASSWORD); assert.equal(s.calls.length, 0); s.detach();
});
