import assert from "node:assert/strict";
import { test } from "node:test";
import * as api from "@/features/manager/manager-staff-api";
import { OperationsApiError } from "@/features/manager/manager-api";
import { filterStaffMemberships, parseStaffReview, staffAssignmentConflict, staffAssignmentState } from "@/features/manager/manager-staff-service";
import { managerLoginReturn } from "@/features/manager/manager-navigation";

// HTTP DTO fixtures only. They do not establish real identities, scope or DB state.
const profile = { id: "9007199254740993", fullName: "Nhân viên QA", email: "staff@example.test", phone: "+84910000000", status: "BLOCKED" };
const assignment: api.ManagerStaffAssignment = { id: "9223372036854775807", userId: profile.id, cinemaId: "11", cinemaName: "Rạp QA", assignmentType: "STAFF", status: "ACTIVE", effectiveAt: "2035-10-28T03:00:00.123456Z" };
const member = { staff: profile, assignment };
async function fixture<T>(body: unknown, run: (calls: { path: string; init: RequestInit }[]) => Promise<T>, status = 200) {
  const original = globalThis.fetch, calls: { path: string; init: RequestInit }[] = [];
  globalThis.fetch = async (path, init) => { calls.push({ path: String(path), init: init! }); return new Response(JSON.stringify(body), { status }); };
  try { return await run(calls); } finally { globalThis.fetch = original; }
}
test("scoped collection/detail retain exact bigint IDs and project only minimal Staff profile", async () => {
  await fixture([{ ...member, staff: { ...profile, ciphertext: "must-discard" } }], async calls => {
    const signal = new AbortController().signal, result = await api.getManagerStaffAssignments("fixture", "11", signal);
    assert.equal(result[0].staff.id, profile.id); assert.equal(result[0].assignment.id, assignment.id); assert.deepEqual(Object.keys(result[0].staff), ["id", "fullName", "email", "phone", "status"]);
    assert.equal(calls[0].path, "/api/v1/manager/cinemas/11/staff-assignments"); assert.equal(calls[0].init.signal, signal); assert.equal(calls[0].init.cache, "no-store"); assert.equal(calls[0].init.credentials, "omit"); assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer fixture"); assert.equal(calls[0].init.body, undefined);
  });
  await fixture({ staff: profile, assignments: [assignment] }, async calls => { await api.getManagerStaffDetail("t", "11", profile.id); assert.equal(calls[0].path, `/api/v1/manager/cinemas/11/staff/${profile.id}`); });
});
test("collection rejects foreign Cinema, Staff mismatch, role, numeric IDs, unsupported state and invalid dates", () => {
  for (const value of [{ cinemaId: "12" }, { userId: "1" }, { assignmentType: "MANAGER" }, { id: 1 }, { status: "ENDED" }, { effectiveAt: "2035-02-30T00:00:00Z" }, { effectiveAt: "2035-01-01T00:00:00.1234567Z" }]) assert.throws(() => api.validateStaffMemberships([{ staff: profile, assignment: { ...assignment, ...value } }], "11"), OperationsApiError);
  assert.throws(() => api.validateStaffMemberships([member, member], "11"));
  assert.throws(() => api.validateStaffMemberships([member, { staff: { ...profile, fullName: "Different" }, assignment: { ...assignment, id: "2" } }], "11"));
});
test("detail rejects wrong Staff, empty identity history, foreign or duplicate assignments", () => {
  for (const value of [{ staff: { ...profile, id: "12" }, assignments: [assignment] }, { staff: profile, assignments: [] }, { staff: profile, assignments: [{ ...assignment, cinemaId: "12" }] }, { staff: profile, assignments: [assignment, assignment] }]) assert.throws(() => api.validateStaffDetail(value, "11", profile.id));
});
test("POST grants through source with exact destination/UTC body and verifies receipt", async () => {
  const target = { ...assignment, cinemaId: "12" };
  await fixture(target, async calls => {
    await api.addManagerStaffAssignment("t", "11", profile.id, "12", target.effectiveAt);
    assert.equal(calls[0].path, `/api/v1/manager/cinemas/11/staff/${profile.id}/cinema-assignments`); assert.equal(calls[0].init.method, "POST"); assert.deepEqual(JSON.parse(String(calls[0].init.body)), { cinemaId: "12", effectiveAt: target.effectiveAt });
  }, 201);
  await fixture(target, () => assert.rejects(api.addManagerStaffAssignment("t", "11", profile.id, "11", target.effectiveAt), (e: unknown) => e instanceof OperationsApiError && e.outcomeUncertain), 201);
});
test("PUT targets only exact Cinema/Staff/assignment and never resends effectiveAt or reasons", async () => {
  await fixture({ ...assignment, status: "INACTIVE" }, async calls => {
    await api.setManagerStaffAssignmentStatus("t", "11", profile.id, assignment, "INACTIVE");
    assert.equal(calls[0].path, `/api/v1/manager/cinemas/11/staff/${profile.id}/cinema-assignments/${assignment.id}/status`); assert.equal(calls[0].init.method, "PUT"); assert.deepEqual(JSON.parse(String(calls[0].init.body)), { status: "INACTIVE" });
  });
  assert.throws(() => api.setManagerStaffAssignmentStatus("t", "12", profile.id, assignment, "INACTIVE"));
  assert.throws(() => api.setManagerStaffAssignmentStatus("t", "11", "1", assignment, "ACTIVE"));
});
test("microsecond changes, mismatched IDs and account identity cannot become a successful write receipt", async () => {
  for (const value of [{ id: "12" }, { userId: "12" }, { effectiveAt: "2035-10-28T03:00:00.123457Z" }, { status: "INACTIVE" }]) await fixture({ ...assignment, ...value }, () => assert.rejects(api.setManagerStaffAssignmentStatus("t", "11", profile.id, assignment, "ACTIVE"), (e: unknown) => e instanceof OperationsApiError && e.outcomeUncertain));
});
test("IDs and invalid UTC instants fail before fetching", () => {
  for (const id of ["0", "01", "-1", "1e2", "9223372036854775808"]) assert.throws(() => api.getManagerStaffDetail("t", "11", id));
  for (const instant of ["", "0000-01-01T00:00:00Z", "2035-02-30T00:00:00Z", "2035-01-01T10:00"]) assert.throws(() => api.addManagerStaffAssignment("t", "11", profile.id, "12", instant));
});
for (const status of [400, 401, 403, 404, 409, 429, 503]) test(`Staff ${status} is sanitized and mutations are never automatically replayed`, async () => {
  await fixture({ detail: "private SQL token ciphertext" }, async calls => {
    await assert.rejects(api.setManagerStaffAssignmentStatus("t", "11", profile.id, assignment, "INACTIVE"), (e: unknown) => e instanceof OperationsApiError && e.status === status && !e.message.includes("SQL") && e.outcomeUncertain === (status >= 500)); assert.equal(calls.length, 1);
  }, status);
});
test("network failure and malformed response remain uncertain and never become a local assignment state", async () => {
  const original = globalThis.fetch; globalThis.fetch = async () => { throw new Error("private-network"); };
  try { await assert.rejects(api.addManagerStaffAssignment("t", "11", profile.id, "12", assignment.effectiveAt), (e: unknown) => e instanceof OperationsApiError && e.outcomeUncertain); } finally { globalThis.fetch = original; }
  await fixture({}, () => assert.rejects(api.getManagerStaffDetail("t", "11", profile.id), OperationsApiError));
});
test("current/future/inactive presentation and scoped search respect loaded server data", () => {
  const before = Date.parse("2030-01-01T00:00:00Z"), after = Date.parse("2040-01-01T00:00:00Z");
  assert.equal(staffAssignmentState(assignment, before), "future"); assert.equal(staffAssignmentState(assignment, after), "current"); assert.equal(staffAssignmentState({ ...assignment, status: "INACTIVE" }, after), "inactive");
  const row = { staff: profile as api.ManagerStaffProfile, assignment };
  assert.equal(filterStaffMemberships([row], "NHÂN VIÊN", "future", before, new Set()).length, 1); assert.equal(filterStaffMemberships([row], "", "current", after, new Set()).length, 0);
  assert.equal(filterStaffMemberships([row], "+8491", "current", after, new Set([assignment.id])).length, 1);
  assert.equal(filterStaffMemberships([row], "foreign", "all", after, new Set()).length, 0);
});
test("reactivation conflicts include future ACTIVE assignments and preserve immutable old identity", () => {
  const old = { ...assignment, id: "1", status: "INACTIVE" as const }; assert.equal(staffAssignmentConflict(old, [old, assignment]), true);
  assert.equal(staffAssignmentConflict(old, [old, { ...assignment, cinemaId: "12" }]), false);
});
test("review hints contain only canonical navigation IDs; forged states and PII are discarded", () => {
  assert.deepEqual(parseStaffReview(JSON.stringify({ kind: "add", cinemaId: "11", staffId: profile.id, destinationCinemaId: "12", status: "ACTIVE", password: "discard" })), { kind: "add", cinemaId: "11", staffId: profile.id, destinationCinemaId: "12" });
  assert.deepEqual(parseStaffReview(JSON.stringify({ kind: "status", cinemaId: "11", staffId: profile.id, assignmentId: assignment.id })), { kind: "status", cinemaId: "11", staffId: profile.id, assignmentId: assignment.id });
  for (const raw of [null, "bad-json", "{}", '{"kind":"status","cinemaId":11}', '{"kind":"add","cinemaId":"01","staffId":"1","destinationCinemaId":"2"}']) assert.equal(parseStaffReview(raw), null);
});
test("new detail login resume accepts only exact same-origin routes with two canonical IDs", () => {
  assert.equal(managerLoginReturn(`/manager/cinemas/11/staff/${profile.id}`), `/manager/cinemas/11/staff/${profile.id}`);
  for (const value of ["/manager/cinemas/11/staff/01", "/manager/cinemas/11/staff/9223372036854775808", "/manager/cinemas/11/staff/2?next=//evil", "//evil/manager/cinemas/11/staff/2", "/manager/cinemas/11/staff/2/edit"]) assert.equal(managerLoginReturn(value), null);
});
