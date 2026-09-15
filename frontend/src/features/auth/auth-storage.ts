import type { AuthSession } from "@/features/auth/auth.types";

const AUTH_SESSION_KEY = "smart-cinema.auth-session";
const listeners = new Set<() => void>();
let cachedSession: AuthSession | null = null;
let initialized = false;

export function getAuthSessionSnapshot(): AuthSession | null {
  if (!initialized) {
    cachedSession = readAuthSession();
    initialized = true;
  }
  return cachedSession;
}

export function subscribeToAuthSession(listener: () => void) {
  listeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== AUTH_SESSION_KEY) return;
    cachedSession = readAuthSession();
    initialized = true;
    listener();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function readAuthSession(): AuthSession | null {
  try {
    const storedValue = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!storedValue) return null;

    const session = JSON.parse(storedValue) as Partial<AuthSession>;
    if (!isAuthSession(session) || session.expiresAt <= Date.now()) {
      window.localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

export function saveAuthSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  cachedSession = session;
  initialized = true;
  listeners.forEach(listener => listener());
}

export function removeAuthSession() {
  window.localStorage.removeItem(AUTH_SESSION_KEY);
  cachedSession = null;
  initialized = true;
  listeners.forEach(listener => listener());
}

function isAuthSession(session: Partial<AuthSession>): session is AuthSession {
  return typeof session.accessToken === "string"
    && session.accessToken.length > 0
    && session.tokenType === "Bearer"
    && typeof session.expiresAt === "number"
    && typeof session.user?.id === "number"
    && typeof session.user.email === "string"
    && typeof session.user.fullName === "string"
    && typeof session.user.role === "string";
}
