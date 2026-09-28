import assert from "node:assert/strict";
import test from "node:test";

const { createMockPaymentProcessingService } = await import("./payment-processing-service" + ".ts") as typeof import("./payment-processing-service");

test("processing preview phases and outcomes are local; pending never silently becomes success", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Unexpected network call"); };
  try {
    for (const scenario of ["success", "failed", "pending"] as const) {
      const service = createMockPaymentProcessingService(scenario, 0);
      const phases: string[] = [];
      assert.equal(await service.run(new AbortController().signal, phase => phases.push(phase)), scenario);
      assert.deepEqual(phases, ["processing", "verifying"]);
      if (scenario === "pending") assert.equal(await service.run(new AbortController().signal, () => {}), "pending");
    }
  } finally { globalThis.fetch = original; }
});

test("concurrent processing actions share one local run; cancellation prevents stale completion", async () => {
  const service = createMockPaymentProcessingService("success", 10);
  const controller = new AbortController();
  const phases: string[] = [];
  const first = service.run(controller.signal, phase => phases.push(phase));
  const duplicate = service.run(controller.signal, () => assert.fail("Duplicate phase callback"));
  assert.equal(first, duplicate);
  controller.abort();
  await assert.rejects(first, { name: "AbortError" });
  assert.deepEqual(phases, ["processing"]);
  await assert.rejects(service.run(controller.signal, () => assert.fail("Already aborted")), { name: "AbortError" });
  const duringVerification = new AbortController();
  await assert.rejects(service.run(duringVerification.signal, phase => { if (phase === "verifying") duringVerification.abort(); }), { name: "AbortError" });
  assert.equal(await service.run(new AbortController().signal, () => {}), "success");
});

test("retryable simulation errors can recover; cancelled runs do not consume the error fixture", async () => {
  const service = createMockPaymentProcessingService("error", 1);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(service.run(controller.signal, () => {}), { name: "AbortError" });
  await assert.rejects(service.run(new AbortController().signal, () => {}), /no payment was attempted/);
  assert.equal(await service.run(new AbortController().signal, () => {}), "success");
});
