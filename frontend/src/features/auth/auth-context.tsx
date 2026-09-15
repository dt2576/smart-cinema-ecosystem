"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { getAuthSessionSnapshot, removeAuthSession, saveAuthSession, subscribeToAuthSession } from "@/features/auth/auth-storage";
import type { AuthSession } from "@/features/auth/auth.types";

type AuthContextValue = {
  session: AuthSession | null;
  isAuthenticated: boolean;
  establishSession: (session: AuthSession) => void;
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribeToAuthSession, getAuthSessionSnapshot, () => null);

  useEffect(() => {
    if (!session) return;
    const timeout = window.setTimeout(removeAuthSession, Math.max(0, session.expiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [session]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    isAuthenticated: Boolean(session),
    establishSession(nextSession) {
      saveAuthSession(nextSession);
    },
    clearSession() {
      removeAuthSession();
    },
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
