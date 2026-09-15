export type UserRole = "CUSTOMER" | "STAFF" | "MANAGER" | "ADMIN";

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
