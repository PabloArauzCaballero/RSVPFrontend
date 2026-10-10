import type { Role } from "../session/types.js";

export type RouteGroup = "auth" | "host" | "provider" | "admin" | "guest";
const access: Record<RouteGroup, readonly Role[]> = { auth: [], host: ["HOST", "PLANNER"], provider: ["PROVIDER"], admin: ["ADMIN"], guest: ["GUEST"] };
export function canAccessRoute(roles: readonly Role[], group: RouteGroup): boolean { return group === "auth" || access[group].some((role) => roles.includes(role)); }
