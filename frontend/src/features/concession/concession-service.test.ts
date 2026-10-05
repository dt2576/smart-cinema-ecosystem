import assert from "node:assert/strict";
import test from "node:test";

const { createMockConcessionService, concessionSubtotal, changeConcessionQuantity, parseConcessionPreviewScenario } = await import("./concession-service" + ".ts") as typeof import("./concession-service");
const signal = () => new AbortController().signal;

test("Concession adapter is local, isolated and limited to approved categories", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Unexpected endpoint"); };
  try {
    const service = createMockConcessionService("default", 0);
    const items = await service.list(signal());
    assert.deepEqual([...new Set(items.map(item => item.category))].sort(), ["COMBO", "DRINK", "POPCORN"]);
    assert.equal(new Set(items.map(item => item.id)).size, items.length);
    assert.ok(items.every(item => typeof item.id === "string" && Number.isSafeInteger(item.price) && item.price >= 0));
    items[0].price = -1;
    assert.equal((await service.list(signal()))[0].price, 120000);
  } finally { globalThis.fetch = original; }
});

test("optional add-ons, exact subtotal, zero removal and invalid quantities", async () => {
  const items = await createMockConcessionService("default", 0).list(signal());
  const [combo, popcorn, unavailable] = items;
  assert.equal(concessionSubtotal(items, {}), 0);
  const one = changeConcessionQuantity(items, {}, combo.id, 1);
  const both = changeConcessionQuantity(items, one, popcorn.id, 1);
  assert.equal(concessionSubtotal(items, both), 175000);
  assert.deepEqual(changeConcessionQuantity(items, one, combo.id, -1), {});
  assert.deepEqual(changeConcessionQuantity(items, {}, combo.id, -1), {});
  assert.equal(changeConcessionQuantity(items, both, unavailable.id, 1), both);
  assert.equal(changeConcessionQuantity(items, both, "unknown", 1), both);
  for (const quantity of [-1, 0, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) assert.equal(concessionSubtotal(items, { [combo.id]: quantity }), null);
  assert.equal(concessionSubtotal(items, { [unavailable.id]: 1 }), null);
  assert.equal(concessionSubtotal(items, { unknown: 1 }), null);
  assert.equal(concessionSubtotal(items.map(item => ({ ...item, available: false })), one), null);
});

test("Concession empty, unavailable, error retry and cancellation", async () => {
  assert.equal(parseConcessionPreviewScenario("invented"), "default");
  assert.deepEqual(await createMockConcessionService("empty", 0).list(signal()), []);
  assert.ok((await createMockConcessionService("unavailable", 0).list(signal())).every(item => !item.available));
  const service = createMockConcessionService("error", 5);
  const controller = new AbortController();
  const pending = service.list(controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  await assert.rejects(service.list(signal()), /thử tải lại/);
  assert.equal((await service.list(signal())).length, 6);
  await assert.rejects(service.list(controller.signal), { name: "AbortError" });
});
