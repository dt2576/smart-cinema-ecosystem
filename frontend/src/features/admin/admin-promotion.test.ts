import test from "node:test";
import assert from "node:assert/strict";
import { AdminPromotionApiError, createAdminPromotion, getAdminPromotion, getAdminPromotions, setAdminPromotionStatus, updateAdminPromotion, validateAdminPromotion } from "@/features/admin/admin-promotion-api";
import { filterPromotions, promotionAmount, promotionAmountInput, promotionCode, promotionDateInput, promotionInputUtc, promotionLocal, promotionUsage, promotionUtc, validPromotionCode, validatePromotionContent, type PromotionContent } from "@/features/admin/admin-promotion-service";

const ID = "9007199254740993";
const content: PromotionContent = { discountType: "PERCENTAGE", discountValue: "20.1234", validFrom: "2026-10-27T02:00:00.000001Z", validUntil: "2026-11-30T16:59:00.123456Z", minimumOrderAmount: "150000.0000", usageLimit: null, maxDiscountAmount: "50000.4321" };
const item = { ...content, id: ID, code: "XEMPHIM20", status: "ACTIVE" };
// Fixtures for API adapter verification; production never imports sample records.
const response = (v: unknown = item, status = 200) => Response.json(v, { status, headers: status === 201 ? { Location: `/api/v1/admin/promotions/${ID}` } : {} });

test("money preserves precision and never uses floating point", () => {
  assert.equal(promotionAmount("999999999999999.9999"), "999.999.999.999.999,9999");
  assert.equal(promotionAmountInput(" 1,0001 "), "1.0001");
  for (const v of ["01", "1e3", "-1", "1000000000000000", "0.00001", "1,2,3"]) assert.equal(promotionAmountInput(v), undefined);
});
test("promotion code mirrors Java strip and uppercase with immutable canonical output", () => {
  assert.equal(promotionCode("\u2003xemphim20\u2003"), "XEMPHIM20");
  for (const v of ["", "x", "X".repeat(51), "X\0", "\ud800"]) assert.equal(validPromotionCode(v), false);
  assert.equal(validPromotionCode("X".repeat(50)), true);
});
test("Vietnam local controls round trip all microseconds independent of browser timezone", () => {
  assert.equal(promotionLocal(content.validUntil), "2026-11-30T23:59:00.123456");
  assert.equal(promotionUtc(promotionLocal(content.validUntil)), content.validUntil);
  assert.equal(promotionDateInput(content.validUntil), "30/11/2026 23:59");
  assert.equal(promotionInputUtc("30/11/2026 23:59", content.validUntil), content.validUntil);
  assert.equal(promotionInputUtc("29/11/2026 23:59", content.validUntil), "2026-11-29T16:59:00Z");
  assert.equal(promotionInputUtc("30/11/2026 23:59:00.123456"), content.validUntil);
  for (const v of ["31/02/2026 09:00", "11/30/2026 09:00", "27/10/2026 24:00"]) assert.equal(promotionInputUtc(v), undefined);
  assert.equal(promotionUtc("2026-10-27T09:00"), "2026-10-27T02:00:00Z");
  for (const v of ["2026-02-31T09:00", "2026-10-27T24:00", "2026-10-27T09:00:00.1234567", "2026-10-27T09:00Z"]) assert.equal(promotionUtc(v), undefined);
});
test("term validation preserves exact window and optional constraints", () => {
  assert.deepEqual(validatePromotionContent(content), {});
  assert.deepEqual(validatePromotionContent({ ...content, validUntil: "2026-10-27T02:00:00.000002Z" }), {});
  assert.ok(validatePromotionContent({ ...content, validUntil: content.validFrom }).validUntil);
  assert.ok(validatePromotionContent({ ...content, discountValue: "100.0001" }).discountValue);
  assert.deepEqual(validatePromotionContent({ ...content, discountValue: "100.0000" }), {});
  assert.ok(validatePromotionContent({ ...content, discountType: "FIXED_AMOUNT" }).maxDiscountAmount);
  assert.deepEqual(validatePromotionContent({ ...content, discountType: "FIXED_AMOUNT", discountValue: "0", maxDiscountAmount: null }), {});
  assert.ok(validatePromotionContent({ ...content, minimumOrderAmount: "" }).minimumOrderAmount);
});
test("usage is a nullable positive int, never a used counter", () => {
  assert.equal(promotionUsage(""), null);assert.equal(promotionUsage("2147483647"), 2147483647);
  for (const v of ["0", "1.0", "01", "2147483648", "1e2", "-1"]) assert.equal(promotionUsage(v), undefined);
});
test("typed response rejects malformed identity, terms, windows and invented statuses", () => {
  const good = validateAdminPromotion({ ...item, internal: "discard" });assert.equal(good.id, ID);assert.equal("internal" in good, false);
  for (const patch of [{ id: 1 }, { id: "01" }, { id: "9223372036854775808" }, { discountValue: 20 }, { discountValue: "20" }, { status: "SCHEDULED" }, { discountType: "TICKET_ONLY" }, { minimumOrderAmount: null }, { usageLimit: "3" }, { validFrom: "2026-02-31T00:00:00Z" }]) assert.throws(() => validateAdminPromotion({ ...item, ...patch }), AdminPromotionApiError);
  assert.throws(() => validateAdminPromotion(item, "2"), AdminPromotionApiError);
});
test("local code/status filtering keeps source order and does not treat enabled as valid", () => {
  const values = [validateAdminPromotion(item), validateAdminPromotion({ ...item, id: "2", code: "EXPIRED", status: "INACTIVE" })];
  assert.equal(filterPromotions(values, "xemphim", "ACTIVE").length, 1);assert.equal(filterPromotions(values, "", "INACTIVE")[0].id, "2");assert.equal(values.length, 2);
});
test("reads use exact owned ADMIN paths Bearer, no-store, no cookies; duplicate IDs rejected", async () => {
  const original = globalThis.fetch;try {
    globalThis.fetch = async (url, options) => { assert.equal(options?.method, "GET");assert.equal(options?.cache, "no-store");assert.equal(options?.credentials, "omit");assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer t");return String(url).endsWith(ID) ? response() : response([item]); };
    assert.equal((await getAdminPromotion("t", ID)).id, ID);assert.equal((await getAdminPromotions("t")).length, 1);
    globalThis.fetch = async () => response([item, item]);await assert.rejects(getAdminPromotions("t"), AdminPromotionApiError);
  } finally { globalThis.fetch = original; }
});
test("create requires exact receipt and Location; no numeric IDs or accidental fields", async () => {
  const original = globalThis.fetch;try {
    globalThis.fetch = async (url, options) => { assert.equal(String(url), "/api/v1/admin/promotions");assert.deepEqual(JSON.parse(String(options?.body)), { code: "XEMPHIM20", ...content, status: "ACTIVE" });return response(item, 201); };
    await createAdminPromotion("t", " xemphim20 ", content, "ACTIVE");
    globalThis.fetch = async () => Response.json(item, { status: 201 });await assert.rejects(createAdminPromotion("t", item.code, content, "ACTIVE"), e => e instanceof AdminPromotionApiError && e.outcomeUncertain);
  } finally { globalThis.fetch = original; }
});
test("edit excludes code/status/metadata and compares microsecond receipts exactly", async () => {
  const original = globalThis.fetch;try {
    globalThis.fetch = async (_url, options) => { assert.deepEqual(JSON.parse(String(options?.body)), content);return response(); };
    await updateAdminPromotion("t", ID, item.code, { ...content, code: "BAD", status: "INACTIVE" } as PromotionContent);
    globalThis.fetch = async () => response({ ...item, validFrom: "2026-10-27T02:00:00.000002Z" });await assert.rejects(updateAdminPromotion("t", ID, item.code, content), e => e instanceof AdminPromotionApiError && e.outcomeUncertain);
  } finally { globalThis.fetch = original; }
});
test("status uses dedicated PUT and requires matching outcome and ID", async () => {
  const original = globalThis.fetch;try {
    globalThis.fetch = async (url, options) => { assert.equal(String(url), `/api/v1/admin/promotions/${ID}/status`);assert.deepEqual(JSON.parse(String(options?.body)), { status: "INACTIVE" });return response({ ...item, status: "INACTIVE" }); };
    await setAdminPromotionStatus("t", ID, "INACTIVE");globalThis.fetch = async () => response();await assert.rejects(setAdminPromotionStatus("t", ID, "INACTIVE"), e => e instanceof AdminPromotionApiError && e.outcomeUncertain);
  } finally { globalThis.fetch = original; }
});
test("safe errors and Retry-After never echo backend diagnostics", async () => {
  const original = globalThis.fetch;try {
    for (const status of [400, 401, 403, 404, 409, 429, 503]) {
      globalThis.fetch = async () => Response.json({ detail: "private SQL secrets" }, { status, headers: { "Retry-After": "2" } });
      await assert.rejects(getAdminPromotions("t"), e => e instanceof AdminPromotionApiError && !e.message.includes("private") && e.status === status && e.retryAfter === 2);
    }
  } finally { globalThis.fetch = original; }
});
test("lost/malformed writes are uncertain and never automatically replayed", async () => {
  const original = globalThis.fetch;let calls = 0;try {
    globalThis.fetch = async () => { calls++;throw new TypeError("lost"); };
    await assert.rejects(createAdminPromotion("t", item.code, content, "ACTIVE"), e => e instanceof AdminPromotionApiError && e.outcomeUncertain);assert.equal(calls, 1);
    globalThis.fetch = async () => response({ ...item, id: "2" });await assert.rejects(updateAdminPromotion("t", ID, item.code, content), e => e instanceof AdminPromotionApiError && e.outcomeUncertain);
  } finally { globalThis.fetch = original; }
});
test("invalid inputs fail locally before issuing HTTP", async () => {
  const original = globalThis.fetch;try {
    globalThis.fetch = async () => { throw new Error("must not send"); };
    assert.throws(() => createAdminPromotion("t", "", content, "ACTIVE"), AdminPromotionApiError);
    assert.throws(() => updateAdminPromotion("t", "01", item.code, content), AdminPromotionApiError);
    assert.throws(() => setAdminPromotionStatus("t", ID, "DRAFT" as never), AdminPromotionApiError);
  } finally { globalThis.fetch = original; }
});
