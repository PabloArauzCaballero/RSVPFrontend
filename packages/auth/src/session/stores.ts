import type { Session, SessionStore } from "./types.js";

/** Platform adapters deliberately live at the app boundary: SecureStore on native, httpOnly cookies on web. */
export interface SecureKeyValueStore { getItemAsync(key: string): Promise<string | null>; setItemAsync(key: string, value: string): Promise<void>; deleteItemAsync(key: string): Promise<void>; }
export function createNativeSessionStore(storage: SecureKeyValueStore): SessionStore {
  const key = "rsvp.session";
  const read = async (): Promise<Session | null> => { const raw = await storage.getItemAsync(key); return raw ? JSON.parse(raw) as Session : null; };
  return { getSession: read, getAccessToken: async () => (await read())?.accessToken ?? null, getRefreshToken: async () => (await read())?.refreshToken ?? null, setSession: (session) => storage.setItemAsync(key, JSON.stringify(session)), setTokens: async (tokens) => { const old = await read(); if (old) await storage.setItemAsync(key, JSON.stringify({ ...old, ...tokens })); }, clear: () => storage.deleteItemAsync(key) };
}

/** Web tokens must remain server-managed by secure httpOnly cookies; no token is exposed to JS. */
export function createWebSessionStore(): SessionStore {
  return { getSession: async () => null, getAccessToken: async () => null, getRefreshToken: async () => null, setSession: async () => {}, setTokens: async () => {}, clear: async () => {} };
}
