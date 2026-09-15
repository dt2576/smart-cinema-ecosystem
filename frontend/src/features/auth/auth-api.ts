import type { AuthSession, CustomerProfile, LoginCredentials, RegistrationDetails, UpdateCustomerProfile, UserRole } from "@/features/auth/auth.types";

type ProblemDetail = {
  title?: string;
  detail?: string;
  errors?: Record<string, string>;
};

type LoginApiResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  userId: number;
  email: string;
  fullName: string;
  role: UserRole;
};

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

async function request<T>(path: string, options: { method?: "GET" | "POST" | "PATCH"; body?: unknown; accessToken?: string }): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
    });
  } catch {
    throw new AuthApiError("Unable to reach Smart Cinema. Check your connection and try again.", 0);
  }

  if (!response.ok) {
    const problem = await readProblemDetail(response);
    throw new AuthApiError(
      problem.detail ?? "Something went wrong. Please try again.",
      response.status,
      problem.errors,
    );
  }

  return response.json() as Promise<T>;
}

async function readProblemDetail(response: Response): Promise<Required<Pick<ProblemDetail, "errors">> & ProblemDetail> {
  try {
    const problem = await response.json() as ProblemDetail;
    return { ...problem, errors: problem.errors ?? {} };
  } catch {
    return { errors: {} };
  }
}

export async function registerCustomer(details: RegistrationDetails): Promise<void> {
  await request("/api/v1/users", { method: "POST", body: details });
}

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  const response = await request<LoginApiResponse>("/api/v1/auth/tokens", { method: "POST", body: credentials });
  return {
    accessToken: response.accessToken,
    tokenType: response.tokenType,
    expiresAt: Date.now() + response.expiresIn * 1000,
    user: {
      id: response.userId,
      email: response.email,
      fullName: response.fullName,
      role: response.role,
    },
  };
}

export function getCustomerProfile(accessToken: string): Promise<CustomerProfile> {
  return request("/api/v1/profile", { accessToken });
}

export function updateCustomerProfile(accessToken: string, details: UpdateCustomerProfile): Promise<CustomerProfile> {
  return request("/api/v1/profile", { method: "PATCH", body: details, accessToken });
}
