"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { clearAuthSessionAfterLogout, getAuthSessionSnapshot, removeAuthSession, saveAuthSession, subscribeToAuthSession } from "@/features/auth/auth-storage";
import { renewAuthSession, revokeAuthSession } from "@/features/auth/auth-api";
import type { AuthenticatedUser, AuthSession } from "@/features/auth/auth.types";

type AuthContextValue = {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  establishSession: (session: AuthSession) => void;
  clearSession: () => void;
  logoutSession: () => Promise<void>;
  updateUserDisplayData: (user: Pick<AuthenticatedUser, "email" | "fullName" | "role">) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const RENEWAL_LEAD_TIME_MS = 60_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const logoutInProgress = useRef(false);
  const session = useSyncExternalStore(subscribeToAuthSession, getAuthSessionSnapshot, () => null);
  const isHydrated = useSyncExternalStore(() => () => undefined, () => true, () => false);

  useEffect(() => {
    if (!session) return;
    const renew = async () => {
      if (logoutInProgress.current) return;
      try {
        saveAuthSession(await renewAuthSession(session.refreshToken));
      } catch {
        removeAuthSession();
      }
    };
    const timeout = window.setTimeout(
      () => void renew(),
      Math.max(0, session.expiresAt - Date.now() - RENEWAL_LEAD_TIME_MS),
    );
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
    async logoutSession() {
      if (logoutInProgress.current) return;
      logoutInProgress.current = true;
      const sessionToRevoke = getAuthSessionSnapshot();
      try {
        await clearAuthSessionAfterLogout(() => sessionToRevoke
          ? revokeAuthSession(sessionToRevoke)
          : Promise.resolve());
      } catch {
        // Local logout still succeeds when server revocation is unavailable.
      } finally {
        logoutInProgress.current = false;
      }
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
