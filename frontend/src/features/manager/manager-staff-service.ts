import { isOperationId } from "@/features/manager/manager-api";
import type { ManagerStaffAssignment, ManagerStaffMembership } from "@/features/manager/manager-staff-api";

export type StaffAssignmentState = "current" | "future" | "inactive";
export const STAFF_ASSIGNMENT_LABELS: Record<StaffAssignmentState, string> = { current: "Đang hiệu lực", future: "Sắp có hiệu lực", inactive: "Đã ngừng phân công" };
export function staffAssignmentState(assignment: ManagerStaffAssignment, receivedAt: number): StaffAssignmentState {
  return assignment.status === "INACTIVE" ? "inactive" : Date.parse(assignment.effectiveAt) > receivedAt ? "future" : "current";
}
export function filterStaffMemberships(rows: ManagerStaffMembership[], query: string, state: "all" | StaffAssignmentState, receivedAt: number, currentIds: ReadonlySet<string>) {
  const term = query.trim().toLocaleLowerCase("vi-VN");
  return rows.filter(row => (state === "all" || state === "current" ? state === "all" || currentIds.has(row.assignment.id) : staffAssignmentState(row.assignment, receivedAt) === state)
    && [row.staff.id, row.staff.fullName, row.staff.email, row.staff.phone].some(value => value.toLocaleLowerCase("vi-VN").includes(term)));
}
export function staffAssignmentConflict(assignment: ManagerStaffAssignment, assignments: ManagerStaffAssignment[]) {
  return assignment.status === "INACTIVE" && assignments.some(other => other.id !== assignment.id && other.cinemaId === assignment.cinemaId && other.status === "ACTIVE");
}

// Per-tab navigation/review hints only. No PII, credentials, status authority or form contents.
export const MANAGER_STAFF_REVIEW_KEY = "smart-cinema.manager-staff-review";
export type ManagerStaffReview = { cinemaId: string; staffId: string } & ({ kind: "add"; destinationCinemaId: string } | { kind: "status"; assignmentId: string });
export function parseStaffReview(raw: string | null): ManagerStaffReview | null {
  if (raw === null) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || !isOperationId(v.cinemaId) || !isOperationId(v.staffId)) return null;
    if (v.kind === "add" && isOperationId(v.destinationCinemaId)) return { kind: "add", cinemaId: v.cinemaId, staffId: v.staffId, destinationCinemaId: v.destinationCinemaId };
    if (v.kind === "status" && isOperationId(v.assignmentId)) return { kind: "status", cinemaId: v.cinemaId, staffId: v.staffId, assignmentId: v.assignmentId };
  } catch { /* Untrusted storage never authorizes a command or server outcome. */ }
  return null;
}
export const managerStaffHref = (cinemaId: string, staffId: string) => `/manager/cinemas/${cinemaId}/staff/${staffId}`;
