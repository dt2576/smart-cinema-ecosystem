import type { AuthSession } from "@/features/auth/auth.types";

const AUTH_SESSION_KEY = "smart-cinema.auth-session";
const listeners = new Set<() => void>();
let cachedSession: AuthSession | null = null;
let cachedStorageValue: string | null | undefined;

export function getAuthSessionSnapshot(): AuthSession | null {
  const storageValue = window.localStorage.getItem(AUTH_SESSION_KEY);
  if (storageValue !== cachedStorageValue) {
    cachedSession = parseAuthSession(storageValue);
    cachedStorageValue = storageValue;
  }
  return cachedSession;
}

export function subscribeToAuthSession(listener: () => void) {
  listeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== AUTH_SESSION_KEY) return;
    cachedStorageValue = event.newValue;
    cachedSession = parseAuthSession(event.newValue);
    listener();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function parseAuthSession(storedValue: string | null): AuthSession | null {
  try {
    if (!storedValue) return null;

    const session = JSON.parse(storedValue) as Partial<AuthSession>;
    if (!isAuthSession(session) || session.refreshExpiresAt <= Date.now()) {
      window.localStorage.removeItem(AUTH_SESSION_KEY);
      cachedStorageValue = null;
      return null;
    }
    return session;
  } catch {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

export function saveAuthSession(session: AuthSession) {
  const storageValue = JSON.stringify(session);
  window.localStorage.setItem(AUTH_SESSION_KEY, storageValue);
  cachedStorageValue = storageValue;
  cachedSession = session;
  listeners.forEach(listener => listener());
}

export function removeAuthSession() {
  window.localStorage.removeItem(AUTH_SESSION_KEY);
  cachedStorageValue = null;
  cachedSession = null;
  listeners.forEach(listener => listener());
}

export async function clearAuthSessionAfterLogout(revoke: () => Promise<void>) {
  try {
    await revoke();
  } finally {
    removeAuthSession();
  }
}

function isAuthSession(session: Partial<AuthSession>): session is AuthSession {
  return typeof session.accessToken === "string"
    && session.accessToken.length > 0
    && session.tokenType === "Bearer"
    && typeof session.expiresAt === "number"
    && typeof session.refreshToken === "string"
    && session.refreshToken.length > 0
    && typeof session.refreshExpiresAt === "number"
    && typeof session.user?.id === "number"
    && typeof session.user.email === "string"
    && typeof session.user.fullName === "string"
    && typeof session.user.role === "string";
}
