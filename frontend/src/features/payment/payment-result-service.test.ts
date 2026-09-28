import assert from "node:assert/strict";
import test from "node:test";
import type { PaymentResultPreview } from "@/features/payment/payment-result.types";

const { createPaymentResultPreview, getPaymentResultPresentation } = await import("./payment-result-service" + ".ts") as typeof import("./payment-result-service");

test("only coherent completed local outcomes produce a Result handoff", () => {
  for (const outcome of ["success", "failed", "pending"] as const) assert.deepEqual(createPaymentResultPreview(outcome, outcome), { outcome, scenario: outcome });
  assert.deepEqual(createPaymentResultPreview("success", "error"), { outcome: "success", scenario: "error" });
  for (const outcome of [null, undefined, "PAID", "SUCCESS", "error", "processing", "verifying", {}, 1]) assert.equal(createPaymentResultPreview(outcome, "success"), null);
  assert.equal(createPaymentResultPreview("success", "pending"), null);
  assert.equal(createPaymentResultPreview("failed", "success"), null);
  assert.equal(createPaymentResultPreview("success", "provider-callback"), null);
});

test("result handling is pure and local; pending stays unresolved and success never claims paid issuance", () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Unexpected provider/backend call"); };
  try {
    const pending = Object.freeze({ outcome: "pending", scenario: "pending" } as const);
    const before = JSON.stringify(pending);
    for (let i = 0; i < 3; i++) {
      assert.equal(getPaymentResultPresentation(pending)?.tone, "pending");
      assert.match(getPaymentResultPresentation(pending)!.message, /neither success nor failure/);
    }
    assert.equal(JSON.stringify(pending), before);
    const success = getPaymentResultPresentation({ outcome: "success", scenario: "success" })!;
    assert.match(success.message, /not server-verified/);
    assert.match(success.message, /No Booking has been paid/);
    assert.equal(getPaymentResultPresentation({ outcome: "failed", scenario: "failed" })?.resumeLabel, "Retry processing preview");
    assert.equal(getPaymentResultPresentation({ outcome: "success", scenario: "pending" } as PaymentResultPreview), null);
  } finally { globalThis.fetch = original; }
});
