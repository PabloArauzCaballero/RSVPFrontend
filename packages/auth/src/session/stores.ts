import type { Session, SessionStore } from "./types.js";

/** Platform adapter at the app boundary: expo-secure-store on iOS and Android. */
export interface SecureKeyValueStore { getItemAsync(key: string): Promise<string | null>; setItemAsync(key: string, value: string): Promise<void>; deleteItemAsync(key: string): Promise<void>; }

const STORAGE_KEY = "rsvp.session";

function isSession(value: unknown): value is Session {
  const candidate = value as Partial<Session> | null;
  return typeof candidate === "object" && candidate !== null && typeof candidate.accessToken === "string" && typeof candidate.refreshToken === "string" && Array.isArray(candidate.roles);
}

function storeOver(read: () => Promise<Session | null>, write: (session: Session) => Promise<void>, remove: () => Promise<void>): SessionStore {
  return {
    getSession: read,
    getAccessToken: async () => (await read())?.accessToken ?? null,
    getRefreshToken: async () => (await read())?.refreshToken ?? null,
    setSession: write,
    setTokens: async (tokens) => { const current = await read(); if (current) await write({ ...current, ...tokens }); },
    clear: remove
  };
}

/** Tokens in the device keychain/keystore. A corrupt or foreign value reads as signed out instead of crashing the app. */
export function createNativeSessionStore(storage: SecureKeyValueStore): SessionStore {
  const read = async (): Promise<Session | null> => {
    const raw = await storage.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    try { const parsed: unknown = JSON.parse(raw); return isSession(parsed) ? parsed : null; } catch { return null; }
  };
  return storeOver(read, (session) => storage.setItemAsync(STORAGE_KEY, JSON.stringify(session)), () => storage.deleteItemAsync(STORAGE_KEY));
}

/** Tokens held in memory only: nothing is written where page scripts could read it. */
export function createMemorySessionStore(initial: Session | null = null): SessionStore {
  let current = initial;
  return storeOver(async () => current, async (session) => { current = session; }, async () => { current = null; });
}

/**
 * Web session. The intended design is an httpOnly cookie set by Identity (no token in JS), which
 * Identity does not issue yet (BLOCKED: backend). Until then the session lives in memory: it is
 * lost on reload and never touches localStorage.
 */
export function createWebSessionStore(): SessionStore { return createMemorySessionStore(); }
