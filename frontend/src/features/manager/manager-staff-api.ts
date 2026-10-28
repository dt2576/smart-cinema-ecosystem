import type { StaffAssignment } from "@/features/admin/admin-staff.types";
import { isOperationId, operationInstant, operationsRequest, OperationsApiError, validateManager, type ManagerAccount } from "@/features/manager/manager-api";

export type ManagerStaffProfile = ManagerAccount;
export type ManagerStaffAssignment = StaffAssignment & { assignmentType: "STAFF" };
export type ManagerStaffMembership = { staff: ManagerStaffProfile; assignment: ManagerStaffAssignment };
export type ManagerStaffDetail = { staff: ManagerStaffProfile; assignments: ManagerStaffAssignment[] };
const invalid = (): never => { throw new OperationsApiError(502); };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
function id(value: string) { if (!isOperationId(value)) throw new OperationsApiError(400); return value; }
function base(cinemaId: string) { return `/manager/cinemas/${id(cinemaId)}`; }
function staffPath(cinemaId: string, staffId: string) { return `${base(cinemaId)}/staff/${id(staffId)}`; }
// Compare UTC instants without losing the backend's microsecond precision.
function instantKey(value: string) { return value.replace(/(?:\.0+)?Z$/, "Z").replace(/(\.\d*?)0+Z$/, "$1Z"); }
export function validateStaffAssignment(value: unknown, cinemaId: string, staffId?: string): ManagerStaffAssignment {
  if (!record(value) || !isOperationId(value.id) || !isOperationId(value.userId) || staffId && value.userId !== staffId
    || value.cinemaId !== cinemaId || typeof value.cinemaName !== "string" || !value.cinemaName.trim() || value.cinemaName.includes("\0")
    || value.assignmentType !== "STAFF" || !["ACTIVE", "INACTIVE"].includes(String(value.status)) || !operationInstant(value.effectiveAt)) return invalid();
  return { id: value.id, userId: value.userId, cinemaId, cinemaName: value.cinemaName, assignmentType: "STAFF", status: value.status, effectiveAt: value.effectiveAt } as ManagerStaffAssignment;
}
function ordered<T>(values: T[], identity: (value: T) => string): T[] {
  if (values.some((value, i) => i > 0 && BigInt(identity(values[i - 1])) >= BigInt(identity(value)))) return invalid();
  return values;
}
export function validateStaffMemberships(value: unknown, cinemaId: string): ManagerStaffMembership[] {
  if (!Array.isArray(value)) return invalid();
  const profiles = new Map<string, string>();
  return ordered(value.map(row => {
    if (!record(row)) return invalid();
    const staff = validateManager(row.staff), assignment = validateStaffAssignment(row.assignment, cinemaId, staff.id);
    const profile = JSON.stringify(staff);
    if (profiles.has(staff.id) && profiles.get(staff.id) !== profile) return invalid();
    profiles.set(staff.id, profile);
    return { staff, assignment };
  }), row => row.assignment.id);
}
export function validateStaffDetail(value: unknown, cinemaId: string, staffId: string): ManagerStaffDetail {
  if (!record(value) || !Array.isArray(value.assignments)) return invalid();
  const staff = validateManager(value.staff);
  if (staff.id !== staffId || !value.assignments.length) return invalid();
  return { staff, assignments: ordered(value.assignments.map(a => validateStaffAssignment(a, cinemaId, staffId)), a => a.id) };
}
export const getManagerStaffAssignments = (token: string, cinemaId: string, signal?: AbortSignal) => operationsRequest(`${base(cinemaId)}/staff-assignments`, token, value => validateStaffMemberships(value, cinemaId), "GET", undefined, signal);
export const getManagerStaffDetail = (token: string, cinemaId: string, staffId: string, signal?: AbortSignal) => operationsRequest(staffPath(cinemaId, staffId), token, value => validateStaffDetail(value, cinemaId, staffId), "GET", undefined, signal);
export function addManagerStaffAssignment(token: string, sourceCinemaId: string, staffId: string, cinemaId: string, effectiveAt: string) {
  id(cinemaId); if (!operationInstant(effectiveAt) || effectiveAt.startsWith("0000")) throw new OperationsApiError(400);
  return operationsRequest(`${staffPath(sourceCinemaId, staffId)}/cinema-assignments`, token, value => {
    const assignment = validateStaffAssignment(value, cinemaId, staffId);
    if (assignment.status !== "ACTIVE" || instantKey(assignment.effectiveAt) !== instantKey(effectiveAt)) return invalid();
    return assignment;
  }, "POST", { cinemaId, effectiveAt });
}
export function setManagerStaffAssignmentStatus(token: string, sourceCinemaId: string, staffId: string, previous: ManagerStaffAssignment, status: "ACTIVE" | "INACTIVE") {
  id(previous.id); if (previous.cinemaId !== sourceCinemaId || previous.userId !== staffId || !["ACTIVE", "INACTIVE"].includes(status)) throw new OperationsApiError(400);
  return operationsRequest(`${staffPath(sourceCinemaId, staffId)}/cinema-assignments/${previous.id}/status`, token, value => {
    const assignment = validateStaffAssignment(value, sourceCinemaId, staffId);
    if (assignment.id !== previous.id || assignment.status !== status || instantKey(assignment.effectiveAt) !== instantKey(previous.effectiveAt)) return invalid();
    return assignment;
  }, "PUT", { status });
}
