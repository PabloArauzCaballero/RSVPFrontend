import type { TokenPair } from "@rsvp/api-client";
import { ROLES, type Role, type Session } from "./types.js";

const PAYLOAD_PART = 1;
const BASE64_BLOCK = 4;
const MS_PER_SECOND = 1000;
/** A token that expires within this window is treated as expired, so a request never leaves with a dying token. */
export const EXPIRY_SKEW_SECONDS = 30;

export interface AccessTokenClaims { readonly sub: string | null; readonly roles: Role[]; readonly organizationIds: string[]; readonly exp: number | null; }

const EMPTY: AccessTokenClaims = { sub: null, roles: [], organizationIds: [], exp: null };

function decodeBase64Url(value: string): string {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / BASE64_BLOCK) * BASE64_BLOCK, "=");
  const binary = globalThis.atob(padded);
  // JWT payloads are UTF-8: decode the bytes, not the Latin-1 string atob returns.
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

/** Reads the claims of an access token for UI decisions only; the API validates the signature and enforces every rule. */
export function parseClaims(accessToken: string | null): AccessTokenClaims {
  const payload = accessToken?.split(".")[PAYLOAD_PART];
  if (!payload) return EMPTY;
  try {
    const claims = JSON.parse(decodeBase64Url(payload)) as { sub?: unknown; roles?: unknown; organizationIds?: unknown; exp?: unknown };
    return {
      sub: typeof claims.sub === "string" ? claims.sub : null,
      roles: strings(claims.roles).filter((role): role is Role => (ROLES as readonly string[]).includes(role)),
      organizationIds: strings(claims.organizationIds),
      exp: typeof claims.exp === "number" ? claims.exp : null
    };
  } catch {
    return EMPTY;
  }
}

export function sessionFromTokens(tokens: TokenPair): Session {
  const claims = parseClaims(tokens.accessToken);
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken ?? "", expiresIn: tokens.expiresIn, userId: claims.sub ?? "", roles: claims.roles, organizationIds: claims.organizationIds };
}

export function isExpired(accessToken: string | null, nowMs: number = Date.now()): boolean {
  const { exp } = parseClaims(accessToken);
  if (exp === null) return true;
  return exp * MS_PER_SECOND - EXPIRY_SKEW_SECONDS * MS_PER_SECOND <= nowMs;
}
