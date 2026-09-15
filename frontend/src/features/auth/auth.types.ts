export type UserRole = "CUSTOMER" | "STAFF" | "MANAGER" | "ADMIN";
export type AccountStatus = "ACTIVE" | "BLOCKED";

export type AuthenticatedUser = {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
};

export type AuthSession = {
  accessToken: string;
  tokenType: "Bearer";
  expiresAt: number;
  user: AuthenticatedUser;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegistrationDetails = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

export type CustomerProfile = {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: AccountStatus;
};

export type UpdateCustomerProfile = Pick<CustomerProfile, "fullName" | "phone">;
