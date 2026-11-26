import type { Role } from "../session/types.js";

export type RouteGroup = "auth" | "host" | "provider" | "admin" | "guest" | "account";
export const ROUTE_GROUPS: readonly RouteGroup[] = ["auth", "host", "provider", "admin", "guest", "account"];

/** Any account that is signed in, whatever its roles (or none): the (account) group, e.g. the partner request of DPA-10. */
const SIGNED_IN = "signed-in";

/**
 * Roles allowed per group. An empty list means the group is public (login, and guests who arrive by magic link without an account);
 * `SIGNED_IN` asks only for a session, so a user without PROVIDER (DPA-1) can still ask to become a partner.
 */
const access: Record<RouteGroup, readonly Role[] | typeof SIGNED_IN> = { auth: [], host: ["HOST", "PLANNER", "ADMIN"], provider: ["PROVIDER"], admin: ["ADMIN"], guest: [], account: SIGNED_IN };

const isPublic = (group: RouteGroup): boolean => { const allowed = access[group]; return allowed !== SIGNED_IN && allowed.length === 0; };

/** `roles` are those of a signed-in person (see decideRoute for the anonymous visitor). */
export function canAccessRoute(roles: readonly Role[], group: RouteGroup): boolean {
  const allowed = access[group];
  if (allowed === SIGNED_IN) return true;
  return allowed.length === 0 || allowed.some((role) => roles.includes(role));
}

export type GuardDecision =
  | { readonly type: "allow" }
  | { readonly type: "login" }
  | { readonly type: "forbidden"; readonly home: RouteGroup | null };

/** The group a signed-in person lands in, in priority order. */
export function homeGroupFor(roles: readonly Role[]): RouteGroup | null {
  const order: readonly RouteGroup[] = ["admin", "host", "provider"];
  return order.find((group) => canAccessRoute(roles, group)) ?? null;
}

/** `roles === null` means nobody is signed in. */
export function decideRoute(roles: readonly Role[] | null, group: RouteGroup): GuardDecision {
  if (isPublic(group)) return { type: "allow" };
  if (roles === null) return { type: "login" };
  return canAccessRoute(roles, group) ? { type: "allow" } : { type: "forbidden", home: homeGroupFor(roles) };
}

const SAFE_BASE = "https://app.invalid";

/** Only app-relative paths may be used as a post-login destination (no open redirect). */
export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  try { return new URL(value, SAFE_BASE).origin === SAFE_BASE ? value : null; } catch { return null; }
}
