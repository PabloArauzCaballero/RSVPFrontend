import { createWebSessionStore, type Role, type SessionStore } from "@rsvp/auth";

/**
 * Session at the app boundary. Production web keeps tokens in httpOnly cookies (no token in
 * JS, lane F05). Until Identity issues those cookies, local development can inject a bearer
 * token with EXPO_PUBLIC_DEV_ACCESS_TOKEN; it is ignored in production builds.
 */

const TOKEN_SEPARATOR = ".";
const PAYLOAD_PART = 1;
const ROLES: readonly Role[] = ["HOST", "PLANNER", "PROVIDER", "ADMIN", "GUEST"];

export interface SessionClaims {
  readonly userId: string | null;
  readonly roles: readonly Role[];
  readonly organizationIds: readonly string[];
}

const ANONYMOUS: SessionClaims = { userId: null, roles: [], organizationIds: [] };

function devToken(): string | null {
  const isDev = typeof __DEV__ === "undefined" ? process.env.NODE_ENV !== "production" : __DEV__;
  // Literal access on purpose: Expo inlines EXPO_PUBLIC_* variables only when written out in full.
  return isDev ? process.env.EXPO_PUBLIC_DEV_ACCESS_TOKEN ?? null : null;
}

const BASE64_BLOCK = 4;

function base64UrlDecode(value: string): string {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / BASE64_BLOCK) * BASE64_BLOCK, "=");
  return globalThis.atob(padded);
}

/** Reads claims for UI decisions only (what to show); the API enforces every rule itself. */
export function claimsOf(token: string | null): SessionClaims {
  const payload = token?.split(TOKEN_SEPARATOR)[PAYLOAD_PART];
  if (!payload) return ANONYMOUS;
  try {
    // The payload of a JWT is a JSON object; malformed tokens fall back to anonymous.
    const claims = JSON.parse(base64UrlDecode(payload)) as { sub?: unknown; roles?: unknown; organizationIds?: unknown };
    const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
    return {
      userId: typeof claims.sub === "string" ? claims.sub : null,
      roles: strings(claims.roles).filter((role): role is Role => (ROLES as readonly string[]).includes(role)),
      organizationIds: strings(claims.organizationIds)
    };
  } catch {
    return ANONYMOUS;
  }
}

export function createAppSessionStore(token: string | null = devToken()): SessionStore {
  if (!token) return createWebSessionStore();
  return {
    getSession: async () => null,
    getAccessToken: async () => token,
    getRefreshToken: async () => null,
    setSession: async () => undefined,
    setTokens: async () => undefined,
    clear: async () => undefined
  };
}

export const initialClaims = (): SessionClaims => claimsOf(devToken());
