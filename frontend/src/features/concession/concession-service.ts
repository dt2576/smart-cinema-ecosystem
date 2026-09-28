import type { ConcessionItem, ConcessionPreviewScenario, ConcessionQuantities, ConcessionService } from "@/features/concession/concession.types";

// Sample selling prices in whole VND; this is not a Booking price snapshot.
const SAMPLE_ITEMS: ConcessionItem[] = [
  { id: "9007199254741001", name: "Movie Combo", description: "Popcorn and two refreshing drinks.", category: "COMBO", price: 120000, image: "combo", available: true },
  { id: "9007199254741002", name: "Classic Popcorn", description: "A classic companion for your movie.", category: "POPCORN", price: 55000, image: "popcorn", available: true },
  { id: "9007199254741003", name: "Caramel Popcorn", description: "Popcorn with a sweet caramel coating.", category: "POPCORN", price: 65000, image: "caramel", available: false },
  { id: "9007199254741004", name: "Cola", description: "A refreshing fizzy drink.", category: "DRINK", price: 35000, image: "cola", available: true },
  { id: "9007199254741005", name: "Lemon Lime", description: "Bright citrus refreshment.", category: "DRINK", price: 35000, image: "lemon-lime", available: true },
  { id: "9007199254741006", name: "Mineral Water", description: "Simple, refreshing bottled water.", category: "DRINK", price: 20000, image: "water", available: true },
];

export function parseConcessionPreviewScenario(value: string | null): ConcessionPreviewScenario {
  return value === "empty" || value === "error" || value === "unavailable" ? value : "default";
}

export function createMockConcessionService(scenario: ConcessionPreviewScenario = "default", delayMs = 350): ConcessionService {
  let failed = false;
  return { async list(signal) {
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
      const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
      const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, delayMs);
      signal.addEventListener("abort", abort, { once: true });
    });
    if (scenario === "error" && !failed) { failed = true; throw new Error("Please try loading the sample menu again."); }
    return scenario === "empty" ? [] : SAMPLE_ITEMS.map(item => ({ ...item, available: item.available && scenario !== "unavailable" }));
  } };
}

export function concessionSubtotal(items: ConcessionItem[], quantities: ConcessionQuantities): number | null {
  let total = 0;
  for (const [id, quantity] of Object.entries(quantities)) {
    const item = items.find(value => value.id === id && value.available);
    if (!item || !Number.isSafeInteger(quantity) || quantity <= 0 || !Number.isSafeInteger(item.price) || item.price < 0) return null;
    total += item.price * quantity;
    if (!Number.isSafeInteger(total)) return null;
  }
  return total;
}

export function changeConcessionQuantity(items: ConcessionItem[], quantities: ConcessionQuantities, id: string, delta: 1 | -1): ConcessionQuantities {
  if (!items.some(item => item.id === id && item.available)) return quantities;
  const next = { ...quantities };
  const quantity = (next[id] ?? 0) + delta;
  if (quantity <= 0) delete next[id]; else next[id] = quantity;
  return concessionSubtotal(items, next) === null ? quantities : next;
}

export function formatConcessionPrice(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}
