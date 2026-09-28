import assert from "node:assert/strict";
import test from "node:test";
import type { SeatUnit } from "@/features/seat/seat.types";
import type { ConcessionItem } from "@/features/concession/concession.types";

const { createBookingSummaryPreview, createMockPromotionService, previewGrandTotal } = await import("./booking-summary-service" + ".ts") as typeof import("./booking-summary-service");
const units: SeatUnit[] = [
  { id: "9223372036854775806", hallId: "9007199254740993", showtimeId: "9007199254740994", row: "E", number: "1-2", column: 1, type: "COUPLE", availability: "AVAILABLE" },
  { id: "9223372036854775807", hallId: "9007199254740993", showtimeId: "9007199254740994", row: "A", number: "1", column: 1, type: "STANDARD", availability: "AVAILABLE" },
];
const item: ConcessionItem = { id: "9007199254741001", name: "Movie Combo", category: "COMBO", price: 120000, available: true, image: "combo", description: "Sample" };
const signal = () => new AbortController().signal;

test("summary prices whole Couple units, preserves identities and sums optional concessions", () => {
  const quote = createBookingSummaryPreview(units, [item], { [item.id]: 2 })!;
  assert.equal(quote.seats.length, 2);
  assert.equal(quote.guestCount, 3);
  assert.equal(quote.seats[0].unit.id, units[0].id);
  assert.equal(quote.seats[0].amount, 150000);
  assert.equal(quote.seatAmount, 240000);
  assert.equal(quote.concessionAmount, 240000);
  assert.equal(quote.subtotal, 480000);
  assert.equal(createBookingSummaryPreview(units, [], {})?.subtotal, 240000);
  assert.equal(previewGrandTotal(480000, 48000), 432000);
});

test("summary rejects invalid, duplicate, mixed or unavailable composition and unsafe money", () => {
  for (const seats of [[], [units[0], units[0]], [{ ...units[0], availability: "BOOKED" as const }], [units[0], { ...units[1], hallId: "other" }], [units[0], { ...units[1], showtimeId: "other" }]]) assert.equal(createBookingSummaryPreview(seats, [], {}), null);
  assert.equal(createBookingSummaryPreview(units, [item, item], {}), null);
  for (const quantity of [0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER]) assert.equal(createBookingSummaryPreview(units, [item], { [item.id]: quantity }), null);
  assert.equal(createBookingSummaryPreview(units, [item], { unknown: 1 }), null);
  assert.equal(createBookingSummaryPreview(units, [{ ...item, available: false }], { [item.id]: 1 }), null);
  assert.equal(createBookingSummaryPreview(units, [{ ...item, price: -1 }], { [item.id]: 1 }), null);
  for (const [subtotal, discount] of [[100, 101], [100, -1], [NaN, 0], [1.5, 0], [100, 0.5]]) assert.equal(previewGrandTotal(subtotal, discount), null);
});

test("local Promotion fixtures support applied, invalid, expired and ineligible outcomes", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Unexpected backend request"); };
  try {
    const service = createMockPromotionService(0);
    assert.deepEqual(await service.apply(" demo10 ", 360009, signal()), { outcome: "APPLIED", code: "DEMO10", baseAmount: 360009, discount: 36000 });
    for (const [code, outcome] of [["bad", "INVALID"], ["", "INVALID"], ["DEMOEXPIRED", "EXPIRED"], ["DEMOINELIGIBLE", "INELIGIBLE"]]) assert.equal((await service.apply(code, 240000, signal())).outcome, outcome);
    await assert.rejects(service.apply("DEMO10", -1, signal()), /amount is invalid/);
  } finally { globalThis.fetch = original; }
});

test("Promotion retry/cancellation does not mutate input amounts or consume an aborted failure", async () => {
  const service = createMockPromotionService(5);
  const controller = new AbortController();
  const pending = service.apply("DEMORETRY", 240000, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  await assert.rejects(service.apply("DEMORETRY", 240000, signal()), /could not load/);
  assert.deepEqual(await service.apply("DEMORETRY", 240000, signal()), { outcome: "APPLIED", code: "DEMORETRY", baseAmount: 240000, discount: 24000 });
  await assert.rejects(service.apply("DEMO10", 240000, controller.signal), { name: "AbortError" });
});
