import { createMemorySessionStore, createNativeSessionStore, createWebSessionStore, parseClaims, sessionFromTokens, type Role, type Session, type SessionStore } from "@rsvp/auth";
import { secureStorage } from "./secure-storage";

/**
 * Session at the app boundary. Native keeps tokens in the keychain/keystore (REQ-F05-02). Web
 * keeps only the access token in memory; the refresh token is an httpOnly cookie that Identity
 * sets (`IdentityClient` "cookie" transport, REQ-F05-02). In development a bearer token
 * can still be injected with EXPO_PUBLIC_DEV_ACCESS_TOKEN; it is ignored in production builds.
 */

export interface SessionClaims {
  readonly userId: string | null;
  readonly roles: readonly Role[];
  readonly organizationIds: readonly string[];
}

export const ANONYMOUS: SessionClaims = { userId: null, roles: [], organizationIds: [] };

function devToken(): string | null {
  const isDev = typeof __DEV__ === "undefined" ? process.env.NODE_ENV !== "production" : __DEV__;
  // Literal access on purpose: Expo inlines EXPO_PUBLIC_* variables only when written out in full.
  return isDev ? process.env.EXPO_PUBLIC_DEV_ACCESS_TOKEN ?? null : null;
}

/** Claims for UI decisions only (what to show); the API enforces every rule itself. */
export function claimsOf(source: string | Session | null): SessionClaims {
  if (source === null) return ANONYMOUS;
  const claims = typeof source === "string" ? parseClaims(source) : { sub: source.userId || null, roles: source.roles, organizationIds: source.organizationIds };
  return { userId: claims.sub, roles: claims.roles, organizationIds: claims.organizationIds };
}

export function createAppSessionStore(token: string | null = devToken()): SessionStore {
  if (token) return createMemorySessionStore(sessionFromTokens({ accessToken: token, refreshToken: "", expiresIn: 0 }));
  return secureStorage ? createNativeSessionStore(secureStorage) : createWebSessionStore();
}
