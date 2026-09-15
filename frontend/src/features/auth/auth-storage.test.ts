import assert from "node:assert/strict";
import test from "node:test";
import type { AuthSession } from "./auth.types";

const {
  getAuthSessionSnapshot,
  removeAuthSession,
  saveAuthSession,
  subscribeToAuthSession,
} = await import("./auth-storage" + ".ts") as typeof import("./auth-storage");

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const storage = new MemoryStorage();
const eventListeners = new Map<string, Set<(event: StorageEvent) => void>>();
Object.assign(globalThis, {
  window: {
    localStorage: storage,
    addEventListener(type: string, listener: (event: StorageEvent) => void) {
      const listeners = eventListeners.get(type) ?? new Set();
      listeners.add(listener);
      eventListeners.set(type, listeners);
    },
    removeEventListener(type: string, listener: (event: StorageEvent) => void) {
      eventListeners.get(type)?.delete(listener);
    },
  },
});

const session: AuthSession = {
  accessToken: "test-access-token",
  tokenType: "Bearer",
  expiresAt: Date.now() + 60_000,
  user: { id: 1, email: "customer@example.com", fullName: "Nguyen Van A", role: "CUSTOMER" },
};

test("logout clears the complete stored session and notifies AuthProvider subscribers", () => {
  let notifications = 0;
  const unsubscribe = subscribeToAuthSession(() => notifications += 1);

  saveAuthSession(session);
  assert.deepEqual(getAuthSessionSnapshot(), session);

  removeAuthSession();
  assert.equal(getAuthSessionSnapshot(), null);
  assert.equal(storage.getItem("smart-cinema.auth-session"), null);
  assert.equal(notifications, 2);
  unsubscribe();
});

test("a valid stored session is restored and an expired session is discarded", () => {
  storage.setItem("smart-cinema.auth-session", JSON.stringify(session));
  assert.deepEqual(getAuthSessionSnapshot(), session);

  storage.setItem("smart-cinema.auth-session", JSON.stringify({ ...session, expiresAt: Date.now() - 1 }));
  assert.equal(getAuthSessionSnapshot(), null);
  assert.equal(storage.getItem("smart-cinema.auth-session"), null);
});
