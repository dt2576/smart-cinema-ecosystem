import { isStaffId } from "@/features/admin/admin-staff-api";

const KEY = "smart-cinema.admin-staff-review";
export type StaffReviewHint = { nonce: string; staffId?: string };
// A per-tab navigation/review hint only: never account/assignment status or PII.
export function readStaffReview(): StaffReviewHint | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    return value && typeof value.nonce === "string" && value.nonce.length <= 100 && (value.staffId === undefined || isStaffId(value.staffId))
      ? { nonce: value.nonce, ...(value.staffId ? { staffId: value.staffId } : {}) } : null;
  } catch { return null; }
}
export function writeStaffReview(hint: StaffReviewHint) { try { sessionStorage.setItem(KEY, JSON.stringify(hint)); } catch { /* In-memory review still works. */ } }
export function clearStaffReview(nonce: string) { try { if (readStaffReview()?.nonce === nonce) sessionStorage.removeItem(KEY); } catch { /* Never turn storage failure into success. */ } }
