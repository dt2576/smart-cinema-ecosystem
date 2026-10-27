import test from "node:test";
import assert from "node:assert/strict";
import { AdminConcessionApiError, createAdminConcession, getAdminConcession, getAdminConcessions, setAdminConcessionStatus, updateAdminConcession, validateAdminConcession } from "@/features/admin/admin-concession-api";
import { concessionPrice, concessionPriceInput, filterConcessions, stripConcessionText, validateConcessionContent, type ConcessionContent } from "@/features/admin/admin-concession-service";

const ID = "9007199254740993";
const item = { id: ID, name: "Bắp phô mai", description: null, category: "POPCORN", sellingPrice: "55000.1234", imageUrl: null, status: "ACTIVE", createdAt: "2026-10-27T00:00:00Z", updatedAt: "2026-10-27T00:00:00.000001Z" };
const content: ConcessionContent = { name: item.name, description: null, category: "POPCORN", sellingPrice: "55000.1234" };
// HTTP fixtures only: production routes always read the actual backend.
const response = (v: unknown = item, status = 200) => Response.json(v, { status, headers: status === 201 ? { Location: `/api/v1/admin/concession-items/${ID}` } : {} });
test("Vietnamese prices preserve every significant digit without floating-point conversion", () => {
  assert.equal(concessionPrice("999999999999999.9999"), "999.999.999.999.999,9999 ₫");
  assert.equal(concessionPrice("0.0000"), "0 ₫"); assert.equal(concessionPrice("1.2340"), "1,234 ₫");
  assert.equal(concessionPriceInput(" 55000,1234 "), "55000.1234"); assert.equal(concessionPriceInput("0"), "0");
  for (const v of ["1.00001", "1000000000000000", "01", "-1", "NaN", "1e3", "55.000,5", "1,", ""]) assert.equal(concessionPriceInput(v), undefined);
});
test("content mirrors Unicode code-point and Java whitespace constraints", () => {
  assert.deepEqual(validateConcessionContent({ ...content, name: "😀".repeat(150) }), {});
  assert.ok(validateConcessionContent({ ...content, name: "😀".repeat(151) }).name);
  assert.ok(validateConcessionContent({ ...content, name: "\u2003" }).name);
  assert.equal(stripConcessionText("\u2003Bắp\u2003"), "Bắp");
  assert.ok(validateConcessionContent({ ...content, description: "\ud800" }).description);
  assert.ok(validateConcessionContent({ ...content, name: "a\0" }).name);
  assert.deepEqual(validateConcessionContent({ ...content, sellingPrice: "0", description: "x".repeat(2000) }), {});
});
test("local search/category filtering preserves server order and never changes source data", () => {
  const values = [validateAdminConcession(item), validateAdminConcession({ ...item, id: "2", name: "Nước", category: "DRINK" })];
  assert.equal(filterConcessions(values, "BẮP", "").length, 1);assert.equal(filterConcessions(values, "", "DRINK")[0].id, "2");assert.equal(values.length, 2);
});
test("typed receipts reject numeric IDs/prices, malformed amounts/status/time, mismatch and duplicate IDs", async () => {
  const good = validateAdminConcession({ ...item, private: "drop" });assert.equal(good.id, ID);assert.ok(!("private" in good));
  for (const patch of [{ id: 1 }, { id: "01" }, { sellingPrice: 55000 }, { sellingPrice: "1.23456" }, { sellingPrice: "01.0000" }, { sellingPrice: "1000000000000000.0000" }, { status: "DELETED" }, { createdAt: "2026-02-31T00:00:00Z" }, { updatedAt: "2020-01-01T00:00:00Z" }]) assert.throws(() => validateAdminConcession({ ...item, ...patch }), AdminConcessionApiError);
  assert.throws(() => validateAdminConcession(item, "3"), AdminConcessionApiError);
  const original = globalThis.fetch;try { globalThis.fetch = async () => Response.json([item, item]);await assert.rejects(getAdminConcessions("t"), AdminConcessionApiError); } finally { globalThis.fetch = original; }
});
test("list/detail use exact approved GET paths, Bearer, no-store and omitted cookies", async () => {
  const original = globalThis.fetch;const paths: string[] = [];
  try { globalThis.fetch = async (url, options) => { paths.push(String(url));assert.equal(options?.method, "GET");assert.equal(options?.cache, "no-store");assert.equal(options?.credentials, "omit");assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer t");return paths.length === 1 ? Response.json([item]) : response(); };
    await getAdminConcessions("t");await getAdminConcession("t", ID);assert.deepEqual(paths, ["/api/v1/admin/concession-items", `/api/v1/admin/concession-items/${ID}`]);
  } finally { globalThis.fetch = original; }
});
test("create sends only approved content and explicit status; exact receipt and Location required", async () => {
  const original = globalThis.fetch;try {
    globalThis.fetch = async (_url, options) => { assert.equal(options?.method, "POST");assert.deepEqual(JSON.parse(String(options?.body)), { ...content, status: "ACTIVE" });return response(item, 201); };
    assert.equal((await createAdminConcession("t", { ...content, name: ` ${content.name} ` }, "ACTIVE")).id, ID);
    globalThis.fetch = async () => Response.json(item, { status: 201 });await assert.rejects(createAdminConcession("t", content, "ACTIVE"), e => e instanceof AdminConcessionApiError && e.outcomeUncertain);
  } finally { globalThis.fetch = original; }
});
test("ordinary update never sends status, ID, image or timestamps", async () => {
  const original = globalThis.fetch;try {
    globalThis.fetch = async (_url, options) => { assert.deepEqual(JSON.parse(String(options?.body)), content);return response({ ...item, status: "INACTIVE", imageUrl: "/retained.png" }); };
    const result = await updateAdminConcession("t", ID, { ...content, status: "ACTIVE", imageUrl: "bad" } as ConcessionContent);assert.equal(result.status, "INACTIVE");assert.equal(result.imageUrl, "/retained.png");
  } finally { globalThis.fetch = original; }
});
test("status is a dedicated explicit PUT and requires matching server identity/outcome", async () => {
  const original = globalThis.fetch;try {
    globalThis.fetch = async (url, options) => { assert.equal(String(url), `/api/v1/admin/concession-items/${ID}/status`);assert.deepEqual(JSON.parse(String(options?.body)), { status: "INACTIVE" });return response({ ...item, status: "INACTIVE" }); };
    await setAdminConcessionStatus("t", ID, "INACTIVE");
    globalThis.fetch = async () => response();await assert.rejects(setAdminConcessionStatus("t", ID, "INACTIVE"), e => e instanceof AdminConcessionApiError && e.outcomeUncertain);
  } finally { globalThis.fetch = original; }
});
test("safe fixed messages handle all contract errors and Retry-After without echoing backend text", async () => {
  const original = globalThis.fetch;try {
    for (const status of [400, 401, 403, 404, 409, 429, 503]) {
      globalThis.fetch = async () => Response.json({ detail: "private SQL secret" }, { status, headers: { "Retry-After": "3" } });
      await assert.rejects(updateAdminConcession("t", ID, content), e => e instanceof AdminConcessionApiError && e.status === status && e.outcomeUncertain === (status >= 500) && e.retryAfter === 3 && !e.message.includes("secret"));
    }
  } finally { globalThis.fetch = original; }
});
test("lost write has uncertain outcome and is never automatically replayed", async () => {
  const original = globalThis.fetch;let calls = 0;try { globalThis.fetch = async () => { calls++;throw new Error("secret network details"); };
    await assert.rejects(createAdminConcession("t", content, "ACTIVE"), e => e instanceof AdminConcessionApiError && e.outcomeUncertain && !e.message.includes("secret"));assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});
test("malformed, mismatched and unexpected success responses never confirm a write", async () => {
  const original = globalThis.fetch;try {
    for (const value of [{ ...item, id: "9" }, { ...item, sellingPrice: "1.0000" }]) { globalThis.fetch = async () => response(value);await assert.rejects(updateAdminConcession("t", ID, content), e => e instanceof AdminConcessionApiError && e.outcomeUncertain); }
    globalThis.fetch = async () => new Response("not json", { status: 200 });await assert.rejects(updateAdminConcession("t", ID, content), e => e instanceof AdminConcessionApiError && e.outcomeUncertain);
  } finally { globalThis.fetch = original; }
});
test("invalid outbound identities and oversized UTF-8 transport are rejected before fetch", async () => {
  assert.throws(() => getAdminConcession("t", "01"), AdminConcessionApiError);
  assert.throws(() => createAdminConcession("t", { ...content, sellingPrice: "1e3" }, "ACTIVE"), AdminConcessionApiError);
  const original = globalThis.fetch; let fetched = false;
  try { globalThis.fetch = async () => { fetched = true;return response(item, 201); };await assert.rejects(createAdminConcession("t", { ...content, description: "é".repeat(600000) }, "ACTIVE"), AdminConcessionApiError);assert.equal(fetched, false); }
  finally { globalThis.fetch = original; }
});
