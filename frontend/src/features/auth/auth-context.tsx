"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { getAuthSessionSnapshot, removeAuthSession, saveAuthSession, subscribeToAuthSession } from "@/features/auth/auth-storage";
import type { AuthenticatedUser, AuthSession } from "@/features/auth/auth.types";

type AuthContextValue = {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  establishSession: (session: AuthSession) => void;
  clearSession: () => void;
  updateUserDisplayData: (user: Pick<AuthenticatedUser, "email" | "fullName" | "role">) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribeToAuthSession, getAuthSessionSnapshot, () => null);
  const isHydrated = useSyncExternalStore(() => () => undefined, () => true, () => false);

  useEffect(() => {
    if (!session) return;
    const timeout = window.setTimeout(removeAuthSession, Math.max(0, session.expiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [session]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    isAuthenticated: Boolean(session),
    isHydrated,
    establishSession(nextSession) {
      saveAuthSession(nextSession);
    },
    clearSession() {
      removeAuthSession();
    },
    updateUserDisplayData(user) {
      if (!session) return;
      saveAuthSession({ ...session, user: { ...session.user, ...user } });
    },
  }), [isHydrated, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
