import assert from "node:assert/strict";
import test from "node:test";
import type { BookingSummaryPreview } from "@/features/booking/booking-summary.types";
import type { ReviewedSummaryPreview } from "@/features/payment/payment-method.types";

const { createMockPaymentMethodService, parsePaymentMethodScenario, availablePaymentMethod, isReviewedSummaryCurrent } = await import("./payment-method-service" + ".ts") as typeof import("./payment-method-service");
const signal = () => new AbortController().signal;

test("Payment methods are independent local fixtures; only one known available identity can be selected", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Unexpected provider/backend call"); };
  try {
    const service = createMockPaymentMethodService("default", 0);
    const methods = await service.list(signal());
    assert.equal(methods.length, 3);
    assert.equal(new Set(methods.map(method => method.id)).size, 3);
    assert.equal(availablePaymentMethod(methods, methods[0].id)?.name, "VNPay");
    assert.equal(availablePaymentMethod(methods, methods[1].id)?.name, "MoMo");
    for (const id of [null, "unknown", methods[2].id]) assert.equal(availablePaymentMethod(methods, id), null);
    assert.equal(availablePaymentMethod([methods[0], methods[0]], methods[0].id), null);
    methods[0].available = false;
    assert.equal(availablePaymentMethod(methods, methods[0].id), null);
    assert.equal((await service.list(signal()))[0].available, true);
  } finally { globalThis.fetch = original; }
});

test("Payment method empty/unavailable/error/retry fixtures preserve cancellation semantics", async () => {
  assert.equal(parsePaymentMethodScenario("invented"), "default");
  assert.deepEqual(await createMockPaymentMethodService("empty", 0).list(signal()), []);
  assert.ok((await createMockPaymentMethodService("unavailable", 0).list(signal())).every(method => !method.available));
  const service = createMockPaymentMethodService("error", 5);
  const controller = new AbortController();
  const request = service.list(controller.signal);
  controller.abort();
  await assert.rejects(request, { name: "AbortError" });
  await assert.rejects(service.list(signal()), /Không thể tải/);
  assert.equal((await service.list(signal())).length, 3);
  await assert.rejects(service.list(controller.signal), { name: "AbortError" });
});

test("reviewed totals retain whole Seat identities and reject stale composition or inconsistent Promotion amounts", () => {
  const quote: BookingSummaryPreview = {
    seats: [{ unit: { id: "9223372036854775807", hallId: "9007199254740993", showtimeId: "9007199254740994", row: "E", number: "1-2", column: 1, type: "COUPLE", availability: "AVAILABLE" }, amount: 150000 }],
    concessions: [], guestCount: 2, seatAmount: 150000, concessionAmount: 0, subtotal: 150000,
  };
  const review: ReviewedSummaryPreview = { quote, promotion: { outcome: "APPLIED", code: "DEMO10", baseAmount: 150000, discount: 15000 }, total: 135000 };
  assert.equal(isReviewedSummaryCurrent(review, structuredClone(quote)), true);
  assert.equal(isReviewedSummaryCurrent({ quote, promotion: null, total: 150000 }, quote), true);
  assert.equal(isReviewedSummaryCurrent(review, { ...quote, guestCount: 1 }), false);
  assert.equal(isReviewedSummaryCurrent(review, { ...quote, subtotal: 180000 }), false);
  const changedUnit = structuredClone(quote);
  changedUnit.seats[0].unit.id = "9223372036854775806";
  assert.equal(isReviewedSummaryCurrent(review, changedUnit), false);
  for (const total of [0, NaN, -1, 135000.5]) assert.equal(isReviewedSummaryCurrent({ ...review, total }, quote), false);
  for (const discount of [-1, 150001, 0.5, Infinity]) assert.equal(isReviewedSummaryCurrent({ ...review, promotion: { ...review.promotion!, discount } }, quote), false);
  assert.equal(isReviewedSummaryCurrent({ ...review, promotion: { ...review.promotion!, baseAmount: 1 } }, quote), false);
});
