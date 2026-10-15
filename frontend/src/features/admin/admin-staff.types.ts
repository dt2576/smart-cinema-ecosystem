export type StaffAccountStatus = "ACTIVE" | "BLOCKED";
export type InvitationDeliveryStatus = "NONE" | "QUEUED" | "LEASED" | "SENT" | "FAILED" | "EXPIRED" | "REVOKED";
export type StaffAccount = {
  id: string; fullName: string; email: string; phone: string; status: StaffAccountStatus;
  passwordSetupCompleted: boolean; invitationExpiresAt: string | null;
  deliveryStatus: InvitationDeliveryStatus; deliveryAttempts: number;
};
export type StaffContent = Pick<StaffAccount, "fullName" | "email" | "phone">;
export type StaffAssignment = {
  id: string; userId: string; cinemaId: string; cinemaName: string;
  assignmentType: "STAFF" | "MANAGER"; status: "ACTIVE" | "INACTIVE"; effectiveAt: string;
};
export type AssignmentContent = Pick<StaffAssignment, "cinemaId" | "effectiveAt">;
