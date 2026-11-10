import { homeGroupFor, safeReturnTo, canAccessRoute, type Role, type RouteGroup } from "@rsvp/auth";

/** Public URLs of the auth group and the landing page of every private group (expo-router groups are not part of the path). */
export const AUTH_ROUTES = { login: "/login", register: "/registro", recover: "/recuperar" } as const;
export const HOME_BY_GROUP: Readonly<Record<RouteGroup, string>> = { auth: AUTH_ROUTES.login, host: "/celebraciones", provider: "/portal", admin: "/admin", guest: "/invitacion" };

const ADMIN_PREFIX = "/admin";
const PROVIDER_PREFIX = "/portal";
/** `/c/{slug}/rsvp/{token}` is the canonical personal link; `/rsvp/{token}` the legacy one. */
const GUEST_PREFIXES = ["/invitacion", "/rsvp", "/c"] as const;
const AUTH_PATHS: readonly string[] = Object.values(AUTH_ROUTES);

function startsWithSegment(path: string, prefix: string): boolean { return path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`); }

/** Which route group serves a path. Host screens (celebraciones, editor, publicar…) are the default. */
export function groupOfPath(path: string): RouteGroup {
  if (AUTH_PATHS.some((candidate) => startsWithSegment(path, candidate))) return "auth";
  if (startsWithSegment(path, ADMIN_PREFIX)) return "admin";
  if (startsWithSegment(path, PROVIDER_PREFIX)) return "provider";
  // `/rsvp/reporte` is the host's report; every other `/rsvp/*` is a guest link.
  if (startsWithSegment(path, "/rsvp/reporte")) return "host";
  if (GUEST_PREFIXES.some((prefix) => startsWithSegment(path, prefix))) return "guest";
  return "host";
}

export function homeFor(roles: readonly Role[]): string | null {
  const group = homeGroupFor(roles);
  return group ? HOME_BY_GROUP[group] : null;
}

/** Where a person lands after signing in: the page they came from if their role may open it, otherwise their own space. */
export function destinationAfterSignIn(roles: readonly Role[], returnTo: string | null | undefined): string {
  const requested = safeReturnTo(returnTo);
  if (requested && groupOfPath(requested) !== "auth" && canAccessRoute(roles, groupOfPath(requested))) return requested;
  return homeFor(roles) ?? HOME_BY_GROUP.guest;
}

export function loginHref(returnTo: string | null): string {
  const safe = safeReturnTo(returnTo);
  return safe && groupOfPath(safe) !== "auth" ? `${AUTH_ROUTES.login}?returnTo=${encodeURIComponent(safe)}` : AUTH_ROUTES.login;
}
