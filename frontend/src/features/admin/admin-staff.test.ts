import test from "node:test";
import assert from "node:assert/strict";
import { AdminStaffApiError, validateAdminStaff, validateAdminAssignment, getAdminStaffList, getAdminStaff, createAdminStaff, reissueAdminStaffInvitation, setAdminStaffStatus, getAdminStaffAssignments, addAdminStaffAssignment, setAdminStaffAssignmentStatus, getStaffCinemaOptions } from "@/features/admin/admin-staff-api";
import { validateStaffContent, staffEffectiveAtUtc, canActivateStaff, canReissueStaff, STAFF_DELIVERY_LABELS } from "@/features/admin/admin-staff-service";
import { clearStaffReview, readStaffReview, writeStaffReview } from "@/features/admin/admin-staff-review";

const ID = "9007199254740993", CINEMA = "9223372036854775807", ASSIGNMENT = "9007199254740994";
const account = { id: ID, fullName: "Nhân viên thử nghiệm", email: "staff@example.test", phone: "+84912345678", status: "BLOCKED" as const, passwordSetupCompleted: false, invitationExpiresAt: "2026-10-15T00:00:00.123456789Z", deliveryStatus: "QUEUED" as const, deliveryAttempts: 0 };
const assignment = { id: ASSIGNMENT, userId: ID, cinemaId: CINEMA, cinemaName: "Rạp thử nghiệm", assignmentType: "STAFF" as const, status: "ACTIVE" as const, effectiveAt: "2026-10-15T02:00:00Z" };
const rejected = (e: unknown): e is AdminStaffApiError => e instanceof AdminStaffApiError && e.status === 502;
test("Staff read preserves bigint strings and drops undisclosed data", () => {
  assert.deepEqual(validateAdminStaff({ ...account, password: "never-retain", token: "never-retain" }), account);
  assert.deepEqual(validateAdminAssignment({ ...assignment, secret: "never-retain" }, ID), assignment);
});
test("Staff read rejects invalid identity, inconsistent active account, enums and expiry", () => {
  for (const value of [{ ...account, id: Number(ID) }, { ...account, id: "01" }, { ...account, id: "9223372036854775808" }, { ...account, status: "ACTIVE" }, { ...account, status: "PENDING" }, { ...account, deliveryStatus: "DELIVERED" }, { ...account, deliveryAttempts: -1 }, { ...account, deliveryAttempts: 0.1 }, { ...account, invitationExpiresAt: "2026-02-31T00:00:00Z" }, { ...account, invitationExpiresAt: "2026-10-15T07:00:00+07:00" }]) assert.throws(() => validateAdminStaff(value), rejected);
  assert.throws(() => validateAdminStaff(account, "1"), rejected);
  assert.equal(validateAdminStaff({ ...account, invitationExpiresAt: null }).invitationExpiresAt, null);
});
test("all delivery statuses are distinct and localized without inbox guarantees", () => {
  for (const status of Object.keys(STAFF_DELIVERY_LABELS)) assert.equal(validateAdminStaff({ ...account, deliveryStatus: status }).deliveryStatus, status);
  assert.equal(new Set(Object.values(STAFF_DELIVERY_LABELS)).size, 7);
});
test("assignment parent, type and exact finite UTC date validate", () => {
  for (const value of [{ ...assignment, userId: "1" }, { ...assignment, cinemaId: 4 }, { ...assignment, id: "UUID" }, { ...assignment, status: "EXPIRED" }, { ...assignment, assignmentType: "CASHIER" }, { ...assignment, effectiveAt: "2026-02-31T00:00:00Z" }]) assert.throws(() => validateAdminAssignment(value, ID), rejected);
  assert.equal(validateAdminAssignment({ ...assignment, assignmentType: "MANAGER" }, ID).assignmentType, "MANAGER");
});
test("Vietnam phone validation matches backend formats and separators", () => {
  for (const phone of ["0912345678", "912345678", "+84912345678", "0123456789", "+84123456789", "0912 345 678", "(0912)-345-678"]) assert.deepEqual(validateStaffContent({ ...account, phone }), {});
  for (const phone of ["", "abc", "12345", "++84912345678", "+10912345678", "09123456789", "9".repeat(31)]) assert.ok(validateStaffContent({ ...account, phone }).phone);
});
test("name/email constraints do not require a company email or an Admin password", () => {
  assert.deepEqual(validateStaffContent({ fullName: "Staff", email: " person@gmail.com ", phone: "912345678" }), {});
  assert.ok(validateStaffContent({ ...account, fullName: " " }).fullName);
  assert.ok(validateStaffContent({ ...account, fullName: "x".repeat(151) }).fullName);
  assert.ok(validateStaffContent({ ...account, email: "x".repeat(254) + "@a.b" }).email);
});
test("account action gates require backend setup and status", () => {
  assert.equal(canReissueStaff(account), true); assert.equal(canActivateStaff(account), false);
  const complete = { ...account, passwordSetupCompleted: true };
  assert.equal(canActivateStaff(complete), true); assert.equal(canReissueStaff(complete), false);
  assert.equal(canActivateStaff({ ...complete, status: "ACTIVE" }), false);
});
test("Vietnam wall-time writes UTC independent of local browser timezone, including past and leap dates", () => {
  assert.equal(staffEffectiveAtUtc("2026-10-20T09:00"), "2026-10-20T02:00:00.000Z");
  assert.equal(staffEffectiveAtUtc("2024-02-29T00:00"), "2024-02-28T17:00:00.000Z");
  assert.equal(staffEffectiveAtUtc("2020-01-01T08:00:03"), "2020-01-01T01:00:03.000Z");
  for (const value of ["2026-02-29T00:00", "2026-04-31T12:00", "2026-01-01T24:01", "", "2026-01-01T12:00Z"]) assert.equal(staffEffectiveAtUtc(value), null);
});
test("all eight APIs use authenticated exact methods/bodies and validate command identity", async () => {
  const calls: { path: string; init: RequestInit }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const path = String(input); calls.push({ path, init: init! });
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    const isAssignment = path.includes("cinema-assignments");
    const value = isAssignment ? path.endsWith("/status") ? { ...assignment, status: body.status } : assignment : path.endsWith("/status") ? { ...account, status: body.status, passwordSetupCompleted: true } : account;
    return Response.json(init?.method === "GET" && (path.includes("?page=") || isAssignment) ? [value] : value, { status: init?.method === "POST" && !path.endsWith("invitations") ? 201 : 200 });
  };
  try {
    await getAdminStaffList("fixture-token", 0, 20); await getAdminStaff("fixture-token", ID); await createAdminStaff("fixture-token", account);
    await reissueAdminStaffInvitation("fixture-token", ID); await setAdminStaffStatus("fixture-token", ID, "ACTIVE");
    await getAdminStaffAssignments("fixture-token", ID); await addAdminStaffAssignment("fixture-token", ID, { cinemaId: CINEMA, effectiveAt: assignment.effectiveAt });
    await setAdminStaffAssignmentStatus("fixture-token", ID, assignment, "INACTIVE");
    assert.deepEqual(calls.map(c => c.path), ["/api/v1/admin/staff?page=0&size=20", `/api/v1/admin/staff/${ID}`, "/api/v1/admin/staff", `/api/v1/admin/staff/${ID}/invitations`, `/api/v1/admin/staff/${ID}/status`, `/api/v1/admin/staff/${ID}/cinema-assignments`, `/api/v1/admin/staff/${ID}/cinema-assignments`, `/api/v1/admin/staff/${ID}/cinema-assignments/${ASSIGNMENT}/status`]);
    assert.deepEqual(calls.map(c => c.init.method), ["GET", "GET", "POST", "POST", "PUT", "GET", "POST", "PUT"]);
    assert.equal(calls[3].init.body, "{}"); assert.equal(calls[7].init.body, '{"status":"INACTIVE"}');
    assert.deepEqual(JSON.parse(String(calls[2].init.body)), { fullName: account.fullName, email: account.email, phone: account.phone });
    for (const c of calls) { assert.equal(c.init.cache, "no-store"); assert.equal(c.init.credentials, "omit"); assert.equal((c.init.headers as Record<string, string>).Authorization, "Bearer fixture-token"); }
  } finally { globalThis.fetch = original; }
});
test("pagination/IDs validate before any request", () => {
  assert.throws(() => getAdminStaffList("t", -1)); assert.throws(() => getAdminStaffList("t", 0, 101)); assert.throws(() => getAdminStaff("t", "001"));
});
test("list order/duplicates and foreign assignment projections fail safe", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json([account, account]); await assert.rejects(getAdminStaffList("t"), rejected);
    globalThis.fetch = async () => Response.json([{ ...assignment, userId: "1" }]); await assert.rejects(getAdminStaffAssignments("t", ID), rejected);
  } finally { globalThis.fetch = original; }
});
test("unknown mutation result rejects malformed JSON, wrong identity and changed immutable time without leaking body", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("private mail diagnostics", { status: 201 });
    await assert.rejects(createAdminStaff("t", account), e => rejected(e) && e.outcomeUncertain && !e.message.includes("private"));
    globalThis.fetch = async () => Response.json({ ...assignment, effectiveAt: "2026-10-15T02:00:00.000000001Z" });
    await assert.rejects(setAdminStaffAssignmentStatus("t", ID, assignment, "ACTIVE"), e => rejected(e) && e.outcomeUncertain);
    globalThis.fetch = async () => Response.json({ ...account, id: "1" });
    await assert.rejects(reissueAdminStaffInvitation("t", ID), e => rejected(e) && e.outcomeUncertain);
  } finally { globalThis.fetch = original; }
});
test("safe status errors distinguish known rejections from uncertain writes and preserve Retry-After", async () => {
  const original = globalThis.fetch;
  try {
    for (const status of [400, 401, 403, 404, 409, 429, 503]) {
      globalThis.fetch = async () => new Response("secret diagnostic", { status, headers: { "Retry-After": "3600" } });
      await assert.rejects(reissueAdminStaffInvitation("t", ID), e => e instanceof AdminStaffApiError && e.status === status && e.outcomeUncertain === (status >= 500) && e.retryAfter === 3600 && !e.message.includes("secret"));
    }
    globalThis.fetch = async () => { throw new Error("private network detail"); };
    await assert.rejects(getAdminStaff("t", ID), e => e instanceof AdminStaffApiError && !e.outcomeUncertain);
    await assert.rejects(createAdminStaff("t", account), e => e instanceof AdminStaffApiError && e.outcomeUncertain);
  } finally { globalThis.fetch = original; }
});
test("Cinema selection reuses catalogue and permits inactive Cinema without inventing assignment policy", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async input => { assert.equal(String(input), "/api/v1/admin/cinemas"); return Response.json([{ id: CINEMA, name: "Rạp", status: "INACTIVE", private: "drop" }]); };
    assert.deepEqual(await getStaffCinemaOptions("t"), [{ id: CINEMA, name: "Rạp", status: "INACTIVE" }]);
  } finally { globalThis.fetch = original; }
});
test("review storage is an untrusted non-PII navigation hint; stale completion cannot clear a newer command", () => {
  const store = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) } });
  try {
    writeStaffReview({ nonce: "first", staffId: ID }); assert.deepEqual(readStaffReview(), { nonce: "first", staffId: ID });
    writeStaffReview({ nonce: "second" }); clearStaffReview("first"); assert.equal(readStaffReview()?.nonce, "second");
    clearStaffReview("second"); assert.equal(readStaffReview(), null);
    store.set("smart-cinema.admin-staff-review", JSON.stringify({ nonce: "forged", staffId: "../admin" })); assert.equal(readStaffReview(), null);
  } finally { if (previous) Object.defineProperty(globalThis, "sessionStorage", previous); else Reflect.deleteProperty(globalThis, "sessionStorage"); }
});
