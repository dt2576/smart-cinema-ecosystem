import { test } from "node:test";
import assert from "node:assert/strict";
import { StaffWorkspaceController, type StaffTransport } from "@/features/staff/staff-workspace-controller";
import { StaffApiError } from "@/features/staff/staff-api";
const { staffAssignmentsFixture, staffBookingFixture, staffCheckInFixture } = await import("../../../test/fixtures/staff-checkin" + ".ts") as typeof import("../../../test/fixtures/staff-checkin");

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
async function setup(multiple = false) {
  const calls: string[] = []; let owned = true, unauthorized = 0;
  const api: StaffTransport = {
    async assignments() { calls.push("assignments"); return staffAssignmentsFixture(multiple); },
    async resolve(cinema) { calls.push("resolve"); return staffBookingFixture(cinema); },
    async recover(_booking, cinema) { calls.push("recover"); return staffBookingFixture(cinema); },
    async checkIn(previous, selected) { calls.push("checkIn"); return staffCheckInFixture(previous, selected); },
  };
  const c = new StaffWorkspaceController(api, () => owned, () => { unauthorized++; }); c.start(); await tick();
  return { c, api, calls, loseOwner: () => { owned = false; }, unauthorized: () => unauthorized };
}
test("Staff mount only reads assignments; one Cinema defaults, several require choice", async () => {
  for (const multiple of [false, true]) { const s = await setup(multiple); assert.equal(s.c.getSnapshot().cinemaId, multiple ? "" : "71"); assert.deepEqual(s.calls, ["assignments"]); s.c.destroy(); }
});
test("Staff empty assignments cannot scan, resolve or issue commands", async () => {
  const s = await setup(); s.api.assignments = async () => ({ ...staffAssignmentsFixture(), assignments: [] }); await s.c.loadAssignments();
  assert.equal(s.c.getSnapshot().cinemaId, ""); assert.equal(s.c.prepareScan(), false); await s.c.resolve("opaque"); await s.c.confirmCheckIn(); assert.equal(s.calls.includes("resolve"), false); assert.equal(s.calls.includes("checkIn"), false); s.c.destroy();
});
test("Staff resolution is readonly and immediately erases manual QR", async () => {
  const s = await setup(); s.c.editManualToken("  opaque  "); const read = deferred<ReturnType<typeof staffBookingFixture>>(); s.api.resolve = async (_cinema, token) => { assert.equal(token, "  opaque  "); return read.promise; };
  const pending = s.c.resolve(); assert.equal(s.c.getSnapshot().manualToken, ""); assert.equal(s.c.getSnapshot().operation, "resolving"); assert.equal(s.c.getSnapshot().booking, null);
  read.resolve(staffBookingFixture()); await pending; assert.equal(s.c.getSnapshot().booking?.tickets[0].status, "VALID"); assert.equal(s.calls.includes("checkIn"), false); s.c.destroy();
});
test("Staff selection requires canCheckIn and whole COUPLE remains one ID", async () => {
  const s = await setup(); await s.c.resolve("opaque"); const b = s.c.getSnapshot().booking!;
  s.c.toggleTicket(b.tickets[1].id); assert.deepEqual(s.c.getSnapshot().selected, []); s.c.toggleTicket(b.tickets[2].id); assert.deepEqual(s.c.getSnapshot().selected, [b.tickets[2].id]); assert.equal(b.tickets[2].guestCount, 2); s.c.destroy();
});
test("Staff command requires confirmation and never mutates optimistically", async () => {
  const s = await setup(); await s.c.resolve("opaque"); const b = s.c.getSnapshot().booking!, id = b.tickets[2].id;
  s.c.toggleTicket(id); await s.c.confirmCheckIn(); assert.equal(s.calls.includes("checkIn"), false); s.c.prepareConfirmation();
  const response = deferred<ReturnType<typeof staffCheckInFixture>>(); let commands = 0; s.api.checkIn = async (_booking, selected) => { commands++; assert.deepEqual(selected, [id]); return response.promise; };
  const pending = s.c.confirmCheckIn(); await s.c.confirmCheckIn(); assert.equal(commands, 1); assert.equal(s.c.getSnapshot().booking?.tickets[2].status, "VALID"); assert.equal(s.c.getSnapshot().operation, "submitting");
  response.resolve(staffCheckInFixture(b, [id])); await pending; assert.equal(s.c.getSnapshot().booking?.tickets[2].status, "CHECKED_IN"); assert.deepEqual(s.c.getSnapshot().selected, []); assert.equal(s.c.getSnapshot().notice?.tone, "success"); s.c.destroy();
});
test("Staff confirmation cancellation sends no command", async () => {
  const s = await setup(); await s.c.resolve("opaque"); s.c.toggleTicket(s.c.getSnapshot().booking!.tickets[0].id); s.c.prepareConfirmation(); s.c.cancelConfirmation(); await s.c.confirmCheckIn(); assert.equal(s.calls.includes("checkIn"), false); s.c.destroy();
});
test("Staff uncertain and409 results lock selection until independent GET recovery", async () => {
  for (const status of [0, 409, 502, 503]) {
    const s = await setup(); await s.c.resolve("opaque"); const b = s.c.getSnapshot().booking!, id = b.tickets[2].id; s.c.toggleTicket(id); s.c.prepareConfirmation();
    let commands = 0; s.api.checkIn = async () => { commands++; throw new StaffApiError(status); }; await s.c.confirmCheckIn(); await s.c.confirmCheckIn();
    assert.equal(commands, 1); assert.equal(s.c.getSnapshot().operation, "review"); assert.deepEqual(s.c.getSnapshot().selected, []); s.c.toggleTicket(id); assert.deepEqual(s.c.getSnapshot().selected, []);
    s.api.recover = async () => staffCheckInFixture(b, [id]).booking; await s.c.recover(); assert.equal(s.c.getSnapshot().operation, "idle"); assert.equal(s.c.getSnapshot().booking?.tickets[2].status, "CHECKED_IN"); assert.notEqual(s.c.getSnapshot().notice?.tone, "success"); s.c.destroy();
  }
});
test("Staff known Booking recovery read failures retain only locked snapshot, never retry POST", async () => {
  const s = await setup(); await s.c.resolve("opaque"); s.api.recover = async () => { throw new StaffApiError(503); }; await s.c.recover(); assert.equal(s.c.getSnapshot().operation, "review"); assert.equal(s.calls.includes("checkIn"), false); s.c.destroy();
});
test("Staff403 wipes scope/Booking/input/selection and disables scanner", async () => {
  const s = await setup(); await s.c.resolve("opaque"); s.c.toggleTicket(s.c.getSnapshot().booking!.tickets[0].id); s.api.recover = async () => { throw new StaffApiError(403); }; await s.c.recover();
  assert.equal(s.c.getSnapshot().booking, null); assert.equal(s.c.getSnapshot().assignments, null); assert.equal(s.c.getSnapshot().cinemaId, ""); assert.deepEqual(s.c.getSnapshot().selected, []); assert.equal(s.c.prepareScan(), false); assert.equal(s.c.getSnapshot().denied, true); s.c.destroy();
});
test("Staff401 clears only the current owner's session", async () => {
  const s = await setup(); s.api.resolve = async () => { throw new StaffApiError(401); }; await s.c.resolve("opaque"); assert.equal(s.unauthorized(), 1); s.c.destroy();
  const next = await setup(); const response = deferred<ReturnType<typeof staffBookingFixture>>(); next.api.resolve = async () => response.promise; const pending = next.c.resolve("opaque"); next.loseOwner(); response.resolve(staffBookingFixture()); await pending; assert.equal(next.c.getSnapshot().booking, null); assert.equal(next.unauthorized(), 0); next.c.destroy();
});
test("Staff404 clears inaccessible Booking and selected Ticket details", async () => {
  const s = await setup(); await s.c.resolve("opaque"); s.api.recover = async () => { throw new StaffApiError(404); }; await s.c.recover(); assert.equal(s.c.getSnapshot().booking, null); assert.deepEqual(s.c.getSnapshot().selected, []); s.c.destroy();
});
test("Staff stale Cinema response cannot replace current scope or persist a QR", async () => {
  const s = await setup(true); s.c.selectCinema("71"); const response = deferred<ReturnType<typeof staffBookingFixture>>(); let signal: AbortSignal | undefined; s.api.resolve = async (_cinema, _qr, value) => { signal = value; return response.promise; };
  const pending = s.c.resolve("opaque"); s.c.selectCinema("72"); assert.equal(signal?.aborted, true); response.resolve(staffBookingFixture("71")); await pending; assert.equal(s.c.getSnapshot().cinemaId, "72"); assert.equal(s.c.getSnapshot().booking, null); assert.equal(s.c.getSnapshot().manualToken, ""); s.c.destroy();
});
test("Staff duplicate decode and stale camera epoch cannot make concurrent resolutions", async () => {
  const s = await setup(); const epoch = s.c.getSnapshot().cameraEpoch; let reads = 0; const response = deferred<ReturnType<typeof staffBookingFixture>>(); s.api.resolve = async () => { reads++; return response.promise; };
  s.c.resolveCamera("opaque", "71", epoch); s.c.resolveCamera("opaque", "71", epoch); assert.equal(reads, 1); response.resolve(staffBookingFixture()); await tick(); s.c.editManualToken("new input"); s.c.resolveCamera("old", "71", epoch); assert.equal(reads, 1); s.c.destroy();
});
test("Staff user/navigation cleanup aborts request and ignores late results", async () => {
  const s = await setup(); const response = deferred<ReturnType<typeof staffBookingFixture>>(); let signal: AbortSignal | undefined; s.api.resolve = async (_cinema, _qr, value) => { signal = value; return response.promise; };
  const pending = s.c.resolve("opaque"); s.c.destroy(); assert.equal(signal?.aborted, true); response.resolve(staffBookingFixture()); await pending; assert.equal(s.c.getSnapshot().booking, null); assert.equal(s.c.getSnapshot().manualToken, ""); assert.deepEqual(s.c.getSnapshot().selected, []);
});
test("Staff tab hiding erases operational state and foreground checks current assignments", async () => {
  const s = await setup(); await s.c.resolve("opaque"); s.c.toggleTicket(s.c.getSnapshot().booking!.tickets[0].id); s.c.suspend(); assert.equal(s.c.getSnapshot().booking, null); assert.deepEqual(s.c.getSnapshot().selected, []); s.c.foreground(); await tick(); assert.equal(s.c.getSnapshot().assignments?.assignments.length, 1); assert.equal(s.c.getSnapshot().booking, null); s.c.destroy();
});
test("Staff open-page revocation refresh drops previous scope", async () => {
  const s = await setup(); await s.c.resolve("opaque"); s.api.assignments = async () => ({ ...staffAssignmentsFixture(), assignments: [] }); await s.c.loadAssignments(); assert.equal(s.c.getSnapshot().booking, null); assert.equal(s.c.getSnapshot().cinemaId, ""); s.c.destroy();
});
test("Staff429 pauses explicit reads without automatic polling or command retries", async () => {
  const s = await setup(); let reads = 0; s.api.resolve = async () => { reads++; throw new StaffApiError(429, 60); }; await s.c.resolve("opaque"); await s.c.resolve("opaque"); s.c.foreground(); assert.equal(reads, 1); assert.ok(s.c.getSnapshot().retryAt > Date.now()); s.c.suspend(); assert.ok(s.c.getSnapshot().retryAt > Date.now()); s.c.destroy();
});
test("Staff explicit Cinema change while command is in flight discards late response", async () => {
  const s = await setup(true); s.c.selectCinema("71"); await s.c.resolve("opaque"); const old = s.c.getSnapshot().booking!, id = old.tickets[0].id, result = deferred<ReturnType<typeof staffCheckInFixture>>(); s.api.checkIn = async () => result.promise;
  s.c.toggleTicket(id); s.c.prepareConfirmation(); const pending = s.c.confirmCheckIn(); s.c.selectCinema("72"); result.resolve(staffCheckInFixture(old, [id])); await pending; assert.equal(s.c.getSnapshot().cinemaId, "72"); assert.equal(s.c.getSnapshot().booking, null); assert.equal(s.c.getSnapshot().notice, null); s.c.destroy();
});
