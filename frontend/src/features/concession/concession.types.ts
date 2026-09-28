export type ConcessionCategory = "POPCORN" | "DRINK" | "COMBO";
export type ConcessionPreviewScenario = "default" | "empty" | "error" | "unavailable";
export interface ConcessionItem {
  id: string;
  name: string;
  description: string;
  category: ConcessionCategory;
  price: number;
  image: string;
  available: boolean;
}
export interface ConcessionService {
  list(signal: AbortSignal): Promise<ConcessionItem[]>;
}
export type ConcessionQuantities = Record<string, number>;
