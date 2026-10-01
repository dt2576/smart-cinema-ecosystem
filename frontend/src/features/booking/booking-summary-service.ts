import type { BookingSummaryPreview, PromotionPreviewService } from "@/features/booking/booking-summary.types";
import type { ConcessionItem, ConcessionQuantities } from "@/features/concession/concession.types";
import type { SeatUnit } from "@/features/seat/seat.types";

// UI fixtures only, not a pricing policy. COUPLE has its own whole-unit price.
export const PREVIEW_SEAT_PRICES: Record<Exclude<SeatUnit["type"], "VIP">, number> = { STANDARD: 90000, COUPLE: 150000 };

export function createBookingSummaryPreview(units: SeatUnit[], catalog: ConcessionItem[], quantities: ConcessionQuantities): BookingSummaryPreview | null {
  if (!units.length || new Set(units.map(unit => unit.id)).size !== units.length || new Set(catalog.map(item => item.id)).size !== catalog.length) return null;
  if (units.some(unit => unit.availability !== "AVAILABLE" || unit.hallId !== units[0].hallId || unit.showtimeId !== units[0].showtimeId || !Object.hasOwn(PREVIEW_SEAT_PRICES, unit.type))) return null;
  // Unknown fixture pricing (including VIP) is rejected above; never invent a rate.
  const seats = units.map(unit => ({ unit, amount: PREVIEW_SEAT_PRICES[unit.type as keyof typeof PREVIEW_SEAT_PRICES] }));
  const concessions: BookingSummaryPreview["concessions"] = [];
  for (const [id, quantity] of Object.entries(quantities)) {
    const item = catalog.find(candidate => candidate.id === id && candidate.available);
    if (!item || !["POPCORN", "DRINK", "COMBO"].includes(item.category) || !Number.isSafeInteger(quantity) || quantity <= 0 || !Number.isSafeInteger(item.price) || item.price < 0) return null;
    const amount = quantity * item.price;
    if (!Number.isSafeInteger(amount)) return null;
    concessions.push({ item, quantity, amount });
  }
  const seatAmount = seats.reduce((total, line) => total + line.amount, 0);
  const concessionAmount = concessions.reduce((total, line) => total + line.amount, 0);
  const subtotal = seatAmount + concessionAmount;
  if (!Number.isSafeInteger(subtotal)) return null;
  return { seats, concessions, seatAmount, concessionAmount, subtotal, guestCount: units.reduce((count, unit) => count + (unit.type === "COUPLE" ? 2 : 1), 0) };
}

export function normalizePreviewCode(code: string): string { return code.trim().toUpperCase(); }

export function createMockPromotionService(delayMs = 350): PromotionPreviewService {
  let failed = false;
  return { async apply(input, baseAmount, signal) {
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
      const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
      const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, delayMs);
      signal.addEventListener("abort", abort, { once: true });
    });
    if (!Number.isSafeInteger(baseAmount) || baseAmount < 0) throw new Error("Preview amount is invalid. Return to Concessions to review your selection.");
    const code = normalizePreviewCode(input);
    if (code === "DEMORETRY" && !failed) { failed = true; throw new Error("The Promotion preview could not load. Retry or remove the code to continue."); }
    if (code === "DEMOEXPIRED") return { outcome: "EXPIRED", code, message: "This sample Promotion has expired. No discount applied." };
    if (code === "DEMOINELIGIBLE") return { outcome: "INELIGIBLE", code, message: "This selection is not eligible for the sample Promotion. No discount applied." };
    if (code !== "DEMO10" && code !== "DEMORETRY") return { outcome: "INVALID", code, message: "Invalid sample Promotion code. No discount applied." };
    // Demo rule only: 10% of Seat + Concession subtotal, rounded down to whole VND.
    return { outcome: "APPLIED", code, baseAmount, discount: Math.floor(baseAmount / 10) };
  } };
}

export function previewGrandTotal(subtotal: number, discount: number): number | null {
  if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(discount) || subtotal < 0 || discount < 0 || discount > subtotal) return null;
  return subtotal - discount;
}
